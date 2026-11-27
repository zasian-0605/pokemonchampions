import {Battle, Dex, TeamValidator, Teams, toID} from "@pkmn/sim";
import {TeamGenerators} from "@pkmn/randoms";

const FORMAT_ID = "gen9nationaldexag";
const REQUEST_TIMEOUT_MS = 15000;
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const NATURES_JA_TO_EN = {
  "いじっぱり":"Adamant","ひかえめ":"Modest","ようき":"Jolly","おくびょう":"Timid",
  "ずぶとい":"Bold","おだやか":"Calm","しんちょう":"Careful","ゆうかん":"Brave",
  "れいせい":"Quiet","わんぱく":"Impish","のんき":"Relaxed","なまいき":"Sassy",
  "むじゃき":"Naive","せっかち":"Hasty","さみしがり":"Lonely","やんちゃ":"Naughty",
  "おっとり":"Mild","うっかりや":"Rash","おとなしい":"Gentle","きまぐれ":"Quirky",
  "まじめ":"Serious","てれや":"Bashful","すなお":"Docile","がんばりや":"Hardy"
};
const TERA_TYPES_JA_TO_EN = {
  "ノーマル":"Normal","ほのお":"Fire","みず":"Water","でんき":"Electric","くさ":"Grass",
  "こおり":"Ice","かくとう":"Fighting","どく":"Poison","じめん":"Ground","ひこう":"Flying",
  "エスパー":"Psychic","むし":"Bug","いわ":"Rock","ゴースト":"Ghost","ドラゴン":"Dragon",
  "あく":"Dark","はがね":"Steel","フェアリー":"Fairy","ステラ":"Stellar"
};
const JP_ITEM_ALIASES = {
  "こだわりハチマキ":"choiceband","こだわりメガネ":"choicespecs","こだわりスカーフ":"choicescarf",
  "いのちのたま":"lifeorb","きあいのタスキ":"focussash","たべのこし":"leftovers",
  "オボンのみ":"sitrusberry","ゴツゴツメット":"rockyhelmet","とつげきチョッキ":"assaultvest",
  "あつぞこブーツ":"heavydutyboots","ブーツ":"heavydutyboots","ブーストエナジー":"boosterenergy",
  "ラムのみ":"lumberry","きせきのタネ":"miracleseed","メンタルハーブ":"mentalherb",
  "じゃくてんほけん":"weaknesspolicy"
};

Dex.formats.extend([{
  name:"[Gen 9] National Dex AG",
  mod:"gen9",
  searchShow:false,
  ruleset:["Standard AG","NatDex Mod"]
}]);
Teams.setGeneratorFactory(TeamGenerators);

let currentSession = null;

function randomId() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

function resolveEntry(table, value) {
  if (value == null || value === "") return null;
  const entry = table.get(String(value));
  return entry && entry.exists ? entry : null;
}

function cleanStats(source, max, defaultValue, speciesName, label) {
  const input = source == null ? {} : source;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error(speciesName + " の" + label + "データが不正です。");
  }
  const result = {};
  for (const key of STAT_KEYS) {
    const raw = input[key];
    if (raw == null || raw === "") {
      result[key] = defaultValue;
      continue;
    }
    const number = Number(raw);
    if (typeof raw === "boolean" || !Number.isInteger(number) || number < 0 || number > max) {
      throw new Error(speciesName + " の" + label + "（" + key + "）は0〜" + max + "の整数にしてください。");
    }
    result[key] = number;
  }
  return result;
}

function normalizePokemon(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("ポケモン " + (index + 1) + " のデータが不正です。");
  }

  const speciesInput = raw.species || raw.speciesId || raw.formId || raw.name;
  const species = resolveEntry(Dex.species, speciesInput);
  if (!species) {
    throw new Error("「" + String(speciesInput || "不明") + "」はShowdownの全国図鑑に存在しません。");
  }

  const rawMoves = raw.moves == null ? [] : raw.moves;
  if (!Array.isArray(rawMoves)) throw new Error(species.name + " の技データが配列ではありません。");
  if (rawMoves.length > 4) throw new Error(species.name + " の技は4つまで設定できます。");
  const moves = [];
  const seenMoves = new Set();
  for (const value of rawMoves) {
    const moveInput = typeof value === "string" ? value.trim() : value?.id || value?.name;
    const move = resolveEntry(Dex.moves, moveInput);
    if (!move) throw new Error(species.name + " の技「" + String(moveInput || "不明") + "」はShowdownのデータにありません。");
    if (seenMoves.has(move.id)) throw new Error(species.name + " に同じ技「" + move.name + "」が重複しています。");
    seenMoves.add(move.id);
    moves.push(move.name);
  }
  if (!moves.length) throw new Error(species.name + " に有効な技が設定されていません。");

  const rawAbility = raw.ability || raw.abilityId || "";
  const abilityInput = typeof rawAbility === "object" ? rawAbility.id || rawAbility.name : rawAbility;
  let ability = abilityInput ? resolveEntry(Dex.abilities, abilityInput) : null;
  if (abilityInput && !ability) throw new Error(species.name + " の特性「" + String(abilityInput) + "」が見つかりません。");
  const speciesAbilities = Object.values(species.abilities || {});
  if (ability && !speciesAbilities.some(value => toID(value) === ability.id)) {
    throw new Error(species.name + " は特性「" + ability.name + "」を使用できません。");
  }
  if (!ability) ability = resolveEntry(Dex.abilities, speciesAbilities[0]);
  if (!ability) throw new Error(species.name + " の特性を判定できません。");

  const rawItem = raw.item || raw.heldItem || "";
  const itemInput = JP_ITEM_ALIASES[rawItem] || rawItem;
  const item = rawItem ? resolveEntry(Dex.items, itemInput) : null;
  if (rawItem && !item) throw new Error("持ち物「" + rawItem + "」が見つかりません。");

  const rawNature = raw.nature == null || raw.nature === "" ? "Serious" : raw.nature;
  const nature = resolveEntry(Dex.natures, NATURES_JA_TO_EN[rawNature] || rawNature);
  if (!nature) throw new Error(species.name + " の性格「" + String(rawNature) + "」が正しくありません。");

  const ivs = cleanStats(raw.ivs, 31, 31, species.name, "個体値");
  const evs = cleanStats(raw.evs, 252, 0, species.name, "努力値");
  const evTotal = Object.values(evs).reduce((sum, value) => sum + value, 0);
  if (evTotal > 510) throw new Error(species.name + " の努力値合計が510を超えています。");
  if (evTotal === 0) evs.hp = 1;

  const allowedTera = [
    "Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying",
    "Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy","Stellar"
  ];
  const hasRequestedTera = raw.teraType != null && String(raw.teraType).trim() !== "";
  const teraInputRaw = hasRequestedTera ? String(raw.teraType).trim() : (species.types?.[0] || "Normal");
  const teraInput = TERA_TYPES_JA_TO_EN[teraInputRaw] || teraInputRaw;
  const teraType = allowedTera.find(type => type.toLowerCase() === teraInput.toLowerCase());
  if (hasRequestedTera && !teraType) throw new Error(species.name + " のテラスタイプ「" + teraInput + "」が不正です。");

  const rawLevel = raw.level == null || raw.level === "" ? 50 : Number(raw.level);
  if (typeof raw.level === "boolean" || !Number.isInteger(rawLevel) || rawLevel < 1 || rawLevel > 100) {
    throw new Error(species.name + " のレベルは1〜100の整数にしてください。");
  }

  return {
    name:String(raw.nickname || raw.name || species.name).slice(0, 18),
    species:species.name,
    item:item?.name || "",
    ability:ability.name,
    moves,
    nature:nature.name,
    gender:["M", "F"].includes(raw.gender) ? raw.gender : "",
    evs,
    ivs,
    level:rawLevel,
    shiny:!!raw.shiny,
    teraType:teraType || species.types?.[0] || "Normal"
  };
}

function normalizeTeam(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 6) {
    throw new Error("チームは1〜6匹で編成してください。");
  }
  const team = input.map(normalizePokemon);
  const errors = new TeamValidator(FORMAT_ID).validateTeam(team);
  if (errors?.length) throw new Error("全国図鑑ルールで使えない設定があります:\n" + errors.join("\n"));
  return team;
}

function notify(session) {
  for (const check of [...session.waiters]) {
    try { check(); } catch (_) {}
  }
}

function waitFor(session, predicate, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (session.error) return Promise.reject(new Error(session.error));
  if (predicate()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      session.waiters.delete(check);
      error ? reject(error) : resolve();
    };
    const check = () => {
      if (session.error) return finish(new Error(session.error));
      if (predicate()) return finish();
    };
    const timer = setTimeout(() => finish(new Error("バトル処理がタイムアウトしました。")), timeoutMs);
    session.waiters.add(check);
    check();
  });
}

function receiveBattleMessage(session, type, data) {
  const body = Array.isArray(data) ? data.join("\n") : String(data == null ? "" : data);

  if (type === "update") {
    const rawLines = body.split("\n");
    const lines = [];
    for (let index = 0; index < rawLines.length; index++) {
      const line = rawLines[index];
      if (line.startsWith("|split|")) {
        index++;
        if (index + 1 < rawLines.length) {
          const publicLine = rawLines[++index];
          if (publicLine.startsWith("|")) lines.push(publicLine);
        }
        continue;
      }
      if (line.startsWith("|")) lines.push(line);
    }
    session.logs.push(...lines);
    if (session.logs.length > 600) session.logs.splice(0, session.logs.length - 600);
    for (const line of lines) {
      if (line.startsWith("|win|")) {
        session.done = true;
        session.winner = line.split("|")[2] || "";
      } else if (line.startsWith("|tie")) {
        session.done = true;
        session.winner = "tie";
      }
    }
  } else if (type === "sideupdate") {
    const splitAt = body.indexOf("\n");
    if (splitAt >= 0) {
      const side = body.slice(0, splitAt).trim();
      const payload = body.slice(splitAt + 1);
      if (side === "p1" || side === "p2") {
        for (const line of payload.split("\n")) {
          if (line.startsWith("|request|")) {
            try {
              session.requests[side] = JSON.parse(line.slice(9));
              session.requestVersion[side]++;
            } catch (_) {
              session.error = "Showdownの行動リクエストを読み取れませんでした。";
            }
          } else if (line.startsWith("|error|")) {
            session.error = line.slice(7);
          }
        }
      }
    }
  } else if (type === "end") {
    try {
      const result = JSON.parse(body);
      session.done = true;
      session.winner = result.winner || null;
    } catch (_) {
      session.done = true;
    }
  }

  session.lastActive = Date.now();
  notify(session);
}


function snapshot(session, cursor = 0) {
  const start = Math.max(0, Math.min(session.logs.length, Math.floor(Number(cursor) || 0)));
  return {
    battleId:session.id,
    token:session.token,
    format:FORMAT_ID,
    turn:Number(session.requests.p1?.rqid || 0),
    request:session.requests.p1,
    logs:session.logs.slice(start),
    logCursor:session.logs.length,
    done:session.done,
    winner:session.winner,
    error:session.error
  };
}

async function createSession(playerTeam, opponentTeam, playerName, opponentName) {
  const session = {
    id:randomId(),
    token:randomId(),
    battle:null,
    requests:{p1:null,p2:null},
    requestVersion:{p1:0,p2:0},
    logs:[],
    done:false,
    winner:null,
    error:null,
    waiters:new Set(),
    createdAt:Date.now(),
    lastActive:Date.now(),
    phase:"Showdownエンジン初期化",
    playerName:String(playerName || "プレイヤー"),
    opponentName:String(opponentName || "CPU")
  };

  try {
    session.battle = new Battle({
      formatid:FORMAT_ID,
      send:(type, data) => receiveBattleMessage(session, type, data)
    });

    // Flush the initial Showdown log before registering the two players.
    session.battle.sendUpdates();

    session.phase = "プレイヤーチーム登録";
    session.battle.setPlayer("p1", {name:session.playerName, team:playerTeam});
    session.battle.sendUpdates();

    session.phase = "CPUチーム登録・対戦開始";
    session.battle.setPlayer("p2", {name:session.opponentName, team:opponentTeam});
    session.battle.sendUpdates();

    session.phase = "初期行動リクエスト取得";
    await waitFor(session, () => !!session.requests.p1 && !!session.requests.p2);

    if (session.requests.p1?.teamPreview || session.requests.p2?.teamPreview) {
      session.phase = "チーム選出";
      session.battle.choose("p1", "team " + playerTeam.map((_, index) => index + 1).join(""));
      session.battle.choose("p2", "team " + opponentTeam.map((_, index) => index + 1).join(""));
      session.battle.sendUpdates();
      await waitFor(session, () =>
        !!session.requests.p1 && !!session.requests.p2 &&
        !session.requests.p1.teamPreview && !session.requests.p2.teamPreview
      );
    }

    session.phase = "対戦準備完了";
    session.lastActive = Date.now();
    return session;
  } catch (error) {
    const message = error?.message || String(error);
    const phase = session.phase;
    destroySession(session);
    throw new Error(phase + "で失敗: " + message);
  }
}


function destroySession(session) {
  if (!session) return;
  if (!session.error && !session.done) session.error = "このバトルセッションは終了しました。";
  notify(session);
  try { session.battle?.destroy(); } catch (_) {}
  session.battle = null;
}


function buildChoice(session, action) {
  const request = session.requests.p1;
  if (!request || request.wait) throw new Error("現在は行動を選べません。");
  if (request.teamPreview) throw new Error("チーム選出が終わっていません。");

  if (request.forceSwitch?.some(Boolean)) {
    const index = Number(action?.switchTo);
    if (!Number.isInteger(index) || index < 0 || index >= request.side?.pokemon?.length) {
      throw new Error("交代先が不正です。");
    }
    const entry = request.side.pokemon[index];
    if (!entry || entry.active || /fnt/i.test(entry.condition || "")) throw new Error("そのポケモンには交代できません。");
    return "switch " + (index + 1);
  }

  if (action?.switchTo != null) {
    const index = Number(action.switchTo);
    if (!Number.isInteger(index) || index < 0 || index >= request.side?.pokemon?.length) {
      throw new Error("交代先が不正です。");
    }
    const entry = request.side.pokemon[index];
    if (!entry || entry.active || /fnt/i.test(entry.condition || "")) throw new Error("そのポケモンには交代できません。");
    return "switch " + (index + 1);
  }

  const moves = request.active?.[0]?.moves || [];
  let moveIndex = Number(action?.moveIndex);
  if (action?.moveId) {
    const wanted = toID(action.moveId);
    moveIndex = moves.findIndex(move => toID(move.id || move.move) === wanted);
  }
  if (!Number.isInteger(moveIndex) || moveIndex < 0 || moveIndex >= moves.length) throw new Error("技の選択が不正です。");
  if (moves[moveIndex].disabled) throw new Error("その技は現在使用できません。");

  const active = request.active?.[0] || {};
  const gimmick = String(action?.gimmick || (action?.terastallize ? "terastallize" : action?.mega ? "mega" : ""));
  let suffix = "";
  if (gimmick === "mega") {
    if (!active.canMegaEvo) throw new Error("このポケモンはメガシンカできません。");
    suffix = " mega";
  } else if (gimmick === "terastallize") {
    if (!active.canTerastallize) throw new Error("このポケモンはテラスタルできません。");
    suffix = " terastallize";
  } else if (gimmick) {
    throw new Error("選択したバトルギミックが不正です。");
  }
  return "move " + (moveIndex + 1) + suffix;
}

function chooseCpuAction(request) {
  if (!request || request.wait) return null;
  if (request.teamPreview) {
    const count = Math.min(6, Math.max(1, Number(request.maxTeamSize) || 6));
    return "team " + Array.from({length:count}, (_, index) => index + 1).join("");
  }
  if (request.forceSwitch?.some(Boolean)) {
    const bench = (request.side?.pokemon || []).findIndex(mon => !mon.active && !/fnt/i.test(mon.condition || ""));
    return bench >= 0 ? "switch " + (bench + 1) : null;
  }
  const moves = request.active?.[0]?.moves || [];
  const candidates = moves.map((move, index) => ({
    move,
    index,
    power:Dex.moves.get(move.id || move.move).basePower || 0
  })).filter(row => !row.move.disabled);
  if (!candidates.length) return "move 1";
  candidates.sort((a, b) => b.power - a.power);
  const shortlist = candidates.slice(0, Math.min(3, candidates.length));
  const picked = shortlist[Math.floor(Math.random() * shortlist.length)];
  const active = request.active?.[0] || {};
  let suffix = "";
  if (active.canMegaEvo && Math.random() < 0.25) suffix = " mega";
  else if (active.canTerastallize && Math.random() < 0.35) suffix = " terastallize";
  return "move " + (picked.index + 1) + suffix;
}

async function startBattle(payload) {
  if (currentSession) {
    destroySession(currentSession);
    currentSession = null;
  }
  let phase = "プレイヤーチーム検証";
  try {
    const playerTeam = normalizeTeam(payload.playerTeam);
    phase = "CPUランダムチーム生成";
    const opponentTeam = Teams.generate("gen9randombattle");
    if (!Array.isArray(opponentTeam) || opponentTeam.length !== 6) {
      throw new Error("CPUチームを生成できませんでした。");
    }
    phase = "Showdown対戦開始";
    const session = await createSession(playerTeam, opponentTeam, payload.playerName || "プレイヤー", "CPU");
    currentSession = session;
    return snapshot(session);
  } catch (error) {
    throw new Error(phase + "で失敗: " + (error?.message || String(error)));
  }
}


async function submitAction(payload) {
  const session = currentSession;
  if (!session) throw new Error("対戦セッションがありません。");
  if (session.done) return snapshot(session, payload.cursor);
  const p1Version = session.requestVersion.p1;
  const playerChoice = buildChoice(session, payload.action || {});
  const cpuChoice = chooseCpuAction(session.requests.p2);
  session.phase = "ターン処理";
  session.battle.choose("p1", playerChoice);
  if (cpuChoice) session.battle.choose("p2", cpuChoice);
  session.battle.sendUpdates();
  await waitFor(session, () =>
    session.done || (
      session.requestVersion.p1 > p1Version &&
      !!session.requests.p1 &&
      !session.requests.p1.wait
    )
  );
  session.lastActive = Date.now();
  return snapshot(session, payload.cursor);
}


function getCounts() {
  const count = table => table.all().filter(item => item && item.exists).length;
  return {
    species:count(Dex.species),
    moves:count(Dex.moves),
    abilities:count(Dex.abilities),
    items:count(Dex.items)
  };
}

async function diagnose(payload) {
  let phase = "プレイヤーチーム検証";
  let temp = null;
  try {
    const playerTeam = normalizeTeam(payload.playerTeam);
    phase = "CPUランダムチーム生成";
    const opponentTeam = Teams.generate("gen9randombattle");
    if (!Array.isArray(opponentTeam) || opponentTeam.length !== 6) {
      throw new Error("CPUチームを生成できませんでした。");
    }
    phase = "Showdown Battleインスタンス作成";
    temp = await createSession(playerTeam, opponentTeam, "診断テスト", "CPU");
    const result = {
      ok:true,
      engine:"@pkmn/sim Battle API（ブラウザWorker内の直接実行）",
      format:FORMAT_ID,
      formatName:Dex.formats.get(FORMAT_ID).name,
      counts:getCounts(),
      opponentTeamSize:opponentTeam.length,
      initialRequestReady:!!temp.requests.p1 && !!temp.requests.p2 &&
        !temp.requests.p1.teamPreview && !temp.requests.p2.teamPreview
    };
    destroySession(temp);
    return result;
  } catch (error) {
    if (temp) destroySession(temp);
    throw new Error(phase + "で失敗: " + (error?.message || String(error)));
  }
}


async function dispatch(type, payload) {
  if (type === "start") return startBattle(payload || {});
  if (type === "action") return submitAction(payload || {});
  if (type === "diagnose") return diagnose(payload || {});
  if (type === "stop") {
    if (currentSession) destroySession(currentSession);
    currentSession = null;
    return {ok:true};
  }
  throw new Error("未対応のローカル対戦コマンドです。");
}

self.addEventListener("message", event => {
  const message = event.data || {};
  const id = message.id;
  Promise.resolve()
    .then(() => dispatch(message.type, message))
    .then(result => self.postMessage({id,ok:true,result}))
    .catch(error => self.postMessage({
      id,
      ok:false,
      error:error?.message || String(error)
    }));
});
