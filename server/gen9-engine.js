"use strict";

const crypto = require("node:crypto");
const Sim = require("pokemon-showdown");

const FORMAT_ID = "gen9nationaldexag";
const MAX_SESSIONS = 200;
const SESSION_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const NATURES_JA_TO_EN = {
  "いじっぱり":"Adamant", "ひかえめ":"Modest", "ようき":"Jolly",
  "おくびょう":"Timid", "ずぶとい":"Bold", "おだやか":"Calm",
  "しんちょう":"Careful", "ゆうかん":"Brave", "れいせい":"Quiet",
  "わんぱく":"Impish", "のんき":"Relaxed", "なまいき":"Sassy",
  "むじゃき":"Naive", "せっかち":"Hasty", "さみしがり":"Lonely",
  "やんちゃ":"Naughty", "おっとり":"Mild", "うっかりや":"Rash",
  "おとなしい":"Gentle", "きまぐれ":"Quirky", "まじめ":"Serious",
  "てれや":"Bashful", "すなお":"Docile", "がんばりや":"Hardy"
};
const JP_ITEM_ALIASES = {
  "こだわりハチマキ":"choiceband", "こだわりメガネ":"choicespecs",
  "こだわりスカーフ":"choicescarf", "いのちのたま":"lifeorb",
  "きあいのタスキ":"focussash", "たべのこし":"leftovers",
  "オボンのみ":"sitrusberry", "ゴツゴツメット":"rockyhelmet",
  "とつげきチョッキ":"assaultvest", "あつぞこブーツ":"heavydutyboots",
  "ブーツ":"heavydutyboots", "ブーストエナジー":"boosterenergy",
  "ラムのみ":"lumberry", "きせきのタネ":"miracleseed",
  "メンタルハーブ":"mentalherb", "じゃくてんほけん":"weaknesspolicy"
};

function toID(value) {
  return String(value == null ? "" : value).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function boundedInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}
function cleanStats(source, max, defaultValue) {
  const input = source && typeof source === "object" ? source : {};
  const result = {};
  for (const key of STAT_KEYS) result[key] = boundedInt(input[key], 0, max, defaultValue);
  return result;
}
function resolveEntry(table, value) {
  if (!value) return null;
  const entry = table.get(String(value));
  return entry && entry.exists ? entry : null;
}
function normalizePokemon(raw, index) {
  if (!raw || typeof raw !== "object") throw new Error("ポケモン " + (index + 1) + " のデータが不正です。");

  const speciesInput = raw.species || raw.speciesId || raw.formId || raw.name;
  const species = resolveEntry(Sim.Dex.species, speciesInput);
  if (!species) {
    throw new Error("「" + String(speciesInput || "不明") + "」はShowdownの全国図鑑に存在しません。");
  }

  const rawMoves = Array.isArray(raw.moves) ? raw.moves : [];
  const moves = [];
  for (const value of rawMoves) {
    const moveInput = typeof value === "string" ? value : value?.id || value?.name;
    const move = resolveEntry(Sim.Dex.moves, moveInput);
    if (!move) continue;
    if (!moves.includes(move.name)) moves.push(move.name);
    if (moves.length === 4) break;
  }
  if (!moves.length) throw new Error(species.name + " に有効な技が設定されていません。");

  const abilityInput = raw.ability || raw.abilityId;
  let ability = resolveEntry(Sim.Dex.abilities, abilityInput);
  if (!ability || !Object.values(species.abilities || {}).some(
    value => toID(value) === ability.id
  )) {
    const defaultAbility = Object.values(species.abilities || {})[0];
    ability = resolveEntry(Sim.Dex.abilities, defaultAbility);
  }
  if (!ability) throw new Error(species.name + " の特性を判定できません。");

  const rawItem = raw.item || raw.heldItem || "";
  const itemInput = JP_ITEM_ALIASES[rawItem] || rawItem;
  const item = rawItem ? resolveEntry(Sim.Dex.items, itemInput) : null;
  if (rawItem && !item) {
    throw new Error("持ち物「" + String(rawItem) + "」はShowdownのアイテムデータにありません。");
  }

  const natureInput = NATURES_JA_TO_EN[raw.nature] || raw.nature || "Serious";
  const nature = resolveEntry(Sim.Dex.natures, natureInput) || Sim.Dex.natures.get("Serious");
  const ivs = cleanStats(raw.ivs, 31, 31);
  const evs = cleanStats(raw.evs, 252, 0);
  const evTotal = Object.values(evs).reduce((sum, n) => sum + n, 0);
  if (evTotal > 510) throw new Error(species.name + " の努力値合計が510を超えています。");

  const allowedTera = new Set([
    "Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground",
    "Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy","Stellar"
  ]);
  const requestedTera = String(raw.teraType || species.types?.[0] || "Normal");
  const teraType = allowedTera.has(requestedTera) ? requestedTera : (species.types?.[0] || "Normal");

  return {
    name: String(raw.nickname || raw.name || species.name).slice(0, 18),
    species: species.name,
    item: item?.name || "",
    ability: ability.name,
    moves,
    nature: nature.name,
    gender: ["M", "F"].includes(raw.gender) ? raw.gender : "",
    evs,
    ivs,
    level: boundedInt(raw.level, 1, 100, 50),
    shiny: !!raw.shiny,
    teraType
  };
}
function normalizeTeam(input, skipValidation = false) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 6) {
    throw new Error("チームは1〜6匹で編成してください。");
  }
  const team = input.map(normalizePokemon);
  if (!skipValidation) {
    const errors = new Sim.TeamValidator(FORMAT_ID).validateTeam(team);
    if (errors?.length) throw new Error("全国図鑑ルールで使えない設定があります:\n" + errors.join("\n"));
  }
  return team;
}
function makeCatalog() {
  const mapEntries = (table, pick) => table.all().filter(entry => entry && entry.exists && entry.name)
    .map(pick);
  const moves = mapEntries(Sim.Dex.moves, move => ({
    id: move.id, name: move.name, type: move.type, category: move.category,
    basePower: move.basePower, accuracy: move.accuracy === true ? true : move.accuracy,
    pp: move.pp, priority: move.priority, target: move.target,
    shortDesc: move.shortDesc || ""
  }));
  const abilities = mapEntries(Sim.Dex.abilities, item => ({
    id: item.id, name: item.name, shortDesc: item.shortDesc || "", desc: item.desc || ""
  }));
  const items = mapEntries(Sim.Dex.items, item => ({
    id: item.id, name: item.name, shortDesc: item.shortDesc || "", desc: item.desc || ""
  }));
  const species = mapEntries(Sim.Dex.species, item => ({
    id: item.id, name: item.name, types: item.types || [], baseStats: item.baseStats || {},
    abilities: item.abilities || {}, isNonstandard: item.isNonstandard || null
  }));
  return {
    source: "pokemon-showdown",
    format: FORMAT_ID,
    generation: 9,
    generationRange: "1-9",
    dex: "National Dex",
    mechanics: { megaEvolution: true, dynamax: false, terastallization: true },
    counts: { moves: moves.length, abilities: abilities.length, items: items.length, species: species.length },
    moves, abilities, items, species
  };
}
let cachedCatalog = null;

class Gen9BattleService {
  constructor() {
    this.sessions = new Map();
  }

  catalog() {
    if (!cachedCatalog) cachedCatalog = makeCatalog();
    return cachedCatalog;
  }

  async createBattle(options = {}) {
    if (this.sessions.size >= MAX_SESSIONS) this.removeExpired();
    if (this.sessions.size >= MAX_SESSIONS) throw new Error("対戦サーバーが混み合っています。");

    const skipValidation = options.skipValidation === true;
    const team1 = normalizeTeam(options.playerTeam, skipValidation);
    const team2 = options.opponentTeam ? normalizeTeam(options.opponentTeam, skipValidation) : Sim.Teams.getGenerator("gen9randombattle").getTeam();
    if (!skipValidation) {
      const opponentValidation = new Sim.TeamValidator(FORMAT_ID).validateTeam(team2);
      if (opponentValidation?.length) throw new Error("CPUチーム生成に失敗しました: " + opponentValidation.join("\n"));
    }
    const stream = new Sim.BattleStream({ keepAlive: true });
    const session = {
      id: crypto.randomBytes(18).toString("hex"),
      tokens: { p1: crypto.randomBytes(24).toString("hex"), p2: crypto.randomBytes(24).toString("hex") },
      kind: options.kind === "online" ? "online" : "cpu",
      stream,
      requests: { p1: null, p2: null },
      requestVersion: { p1: 0, p2: 0 },
      logs: [],
      done: false,
      winner: null,
      error: null,
      waiters: new Set(),
      createdAt: Date.now(),
      lastActive: Date.now(),
      teams: { p1: team1, p2: team2 },
      playerNames: { p1: String(options.player1Name || "Player 1"), p2: String(options.player2Name || "CPU") }
    };
    this.sessions.set(session.id, session);
    this.consume(session);

    try {
      await stream.write('>start {"formatid":"' + FORMAT_ID + '"}');
      await stream.write(">player p1 " + JSON.stringify({ name: session.playerNames.p1, team: team1 }));
      await stream.write(">player p2 " + JSON.stringify({ name: session.playerNames.p2, team: team2 }));
      await this.waitFor(session, () =>
        !!session.requests.p1 && !!session.requests.p2, REQUEST_TIMEOUT_MS
      );

      if (session.requests.p1?.teamPreview || session.requests.p2?.teamPreview) {
        const order = team1.map((_, index) => index + 1).join("");
        await stream.write(">p1 team " + order);
        await stream.write(">p2 team " + team2.map((_, index) => index + 1).join(""));
        await this.waitFor(session, () =>
          !!session.requests.p1 && !!session.requests.p2 &&
          !session.requests.p1.teamPreview && !session.requests.p2.teamPreview,
          REQUEST_TIMEOUT_MS
        );
      }
      session.lastActive = Date.now();
      return this.snapshot(session, "p1", 0);
    } catch (error) {
      this.destroy(session.id);
      throw error;
    }
  }

  async runAuditCase(payload = {}) {
    const speciesId = String(payload.speciesId || "mew");
    const moveId = String(payload.moveId || "tackle");
    const abilityId = String(payload.abilityId || "");
    const itemId = String(payload.itemId || "");
    const targetSpeciesId = String(payload.targetSpeciesId || "chansey");
    const wantsTera = payload.terastallize === true;
    const requestedTeraType = payload.teraType ? String(payload.teraType) : null;
    const playerMon = {
      species: speciesId,
      name: String(payload.speciesName || speciesId),
      moves: [moveId],
      ability: abilityId,
      item: itemId,
      level: 100,
      nature: "Serious",
      teraType: requestedTeraType || undefined,
      ivs: {hp:31,atk:31,def:31,spa:31,spd:31,spe:31},
      evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}
    };
    const targetMon = {
      species: targetSpeciesId,
      name: "検証用ターゲット",
      moves: ["splash"],
      ability: targetSpeciesId === "chansey" ? "naturalcure" : "",
      level: 100,
      nature: "Serious",
      ivs: {hp:31,atk:31,def:31,spa:31,spd:31,spe:31},
      evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}
    };
    const initial = await this.createBattle({
      playerTeam: [playerMon],
      opponentTeam: [targetMon],
      player1Name: "自動検証",
      player2Name: "検証用ターゲット",
      kind: "cpu",
      skipValidation: true
    });
    const session = this.sessions.get(initial.battleId);
    if (!session) throw new Error("検証用バトルセッションを作成できませんでした。");
    try {
      const initialDiagnostic = {
        done: session.done,
        logCount: session.logs.length,
        initialLogs: session.logs.slice(-30),
        p1Request: session.requests.p1,
        p2Request: session.requests.p2
      };
      const p1Request = session.requests.p1;
      const p2Request = session.requests.p2;
      const p1Moves = p1Request?.active?.[0]?.moves || [];
      if (!p1Moves.length) throw new Error("Showdownから技の選択画面が返りませんでした。");
      const moveIndex = p1Moves.findIndex(move =>
        toID(move.id || move.move) === toID(moveId)
      );
      if (moveIndex < 0) {
        throw new Error("指定した技がShowdownの行動候補にありません: " + moveId);
      }
      if (p1Moves[moveIndex].disabled) {
        throw new Error("指定した技がこの条件では使用不可です: " + moveId);
      }
      const active = p1Request?.active?.[0] || {};
      if (wantsTera && !active.canTerastallize) {
        throw new Error("このバトル状態ではテラスタルを発動できません。");
      }

      const from = session.logs.length;
      const p1Version = session.requestVersion.p1;
      const cpuChoice = this.chooseCpuAction(p2Request);
      const playerChoice = ">p1 move " + (moveIndex + 1) + (wantsTera ? " terastallize" : "");
      await session.stream.write(playerChoice);
      if (cpuChoice) await session.stream.write(">p2 " + cpuChoice);
      await this.waitFor(session, () =>
        session.done || session.requestVersion.p1 > p1Version,
        REQUEST_TIMEOUT_MS
      );

      const logs = session.logs.slice(from).slice(0, 100);
      const moveWasUsed = logs.some(line => {
        const parts = String(line).split("|");
        return parts[1] === "move" && toID(parts[3]) === toID(moveId);
      });
      const teraLine = logs.find(line => String(line).startsWith("|-terastallize|p1a"));
      const teraApplied = !!teraLine;
      const actualTeraType = teraLine ? String(teraLine).split("|")[3] || null : null;
      const itemActivationLines = logs.filter(line =>
        String(line).startsWith("|-item|") ||
        String(line).startsWith("|-enditem|") ||
        String(line).startsWith("|-activate|")
      );
      const p1After = session.requests.p1?.side?.pokemon?.[0]?.condition || null;
      const p2After = session.requests.p2?.side?.pokemon?.[0]?.condition || null;
      return {
        accepted: moveWasUsed && !session.error && (!wantsTera || teraApplied),
        moveWasUsed,
        moveId,
        initialDiagnostic,
        requestedTeraType,
        teraExpected: wantsTera,
        teraApplied,
        actualTeraType,
        heldItem: itemId || null,
        itemActivationLines,
        before: {
          attacker: p1Request?.side?.pokemon?.[0]?.condition || null,
          target: p2Request?.side?.pokemon?.[0]?.condition || null
        },
        after: { attacker: p1After, target: p2After },
        logs,
        error: session.error || null,
        battleEnded: !!session.done
      };
    } finally {
      this.destroy(session.id);
    }
  }
  consume(session) {
    (async () => {
      try {
        for await (const outputValue of session.stream) {
          const output = String(outputValue || "");
          if (output.startsWith("update\n")) {
            const rawLines = output.slice(7).split("\n");
            const lines = [];
            for (let i = 0; i < rawLines.length; i++) {
              const line = rawLines[i];
              if (line.startsWith("|split|")) {
                i++;
                if (i + 1 < rawLines.length) {
                  const publicLine = rawLines[++i];
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
                session.winner = line.slice(5).trim();
              } else if (line.startsWith("|tie")) {
                session.done = true;
                session.winner = "tie";
              }
            }
          } else if (output.startsWith("sideupdate\n")) {
            const body = output.slice(11);
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
                    } catch (error) {
                      session.error = "Showdownの行動リクエストを読み取れませんでした。";
                    }
                  } else if (line.startsWith("|error|")) {
                    session.error = line.slice(7);
                  }
                }
              }
            }
          } else if (output.startsWith("end\n")) {
            session.done = true;
          }
          session.lastActive = Date.now();
          this.notify(session);
        }
      } catch (error) {
        session.error = error?.message || String(error);
        session.done = true;
        this.notify(session);
      }
    })();
  }

  notify(session) {
    for (const check of [...session.waiters]) {
      try { check(); } catch (_) {}
    }
  }

  waitFor(session, predicate, timeoutMs = REQUEST_TIMEOUT_MS) {
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
      const timer = setTimeout(() => finish(new Error("バトル処理がタイムアウトしました。もう一度お試しください。")), timeoutMs);
      session.waiters.add(check);
      check();
    });
  }

  get(id, token, side = "p1") {
    const session = this.sessions.get(String(id || ""));
    if (!session || session.tokens?.[side] !== String(token || "")) throw new Error("対戦セッションが見つからないか、認証情報が違います。");
    session.lastActive = Date.now();
    return session;
  }

  snapshot(sessionOrId, side = "p1", from = 0) {
    const session = typeof sessionOrId === "string" ? this.sessions.get(sessionOrId) : sessionOrId;
    if (!session) throw new Error("対戦セッションが見つかりません。");
    const cursor = boundedInt(from, 0, session.logs.length, 0);
    return {
      battleId: session.id,
      token: session.tokens[side],
      format: FORMAT_ID,
      turn: Number(session.requests[side]?.rqid || 0),
      request: session.requests[side],
      logs: session.logs.slice(cursor),
      logCursor: session.logs.length,
      done: session.done,
      winner: session.winner,
      error: session.error
    };
  }

  buildChoice(session, side, action) {
    const request = session.requests[side];
    if (!request || request.wait) throw new Error("現在は行動を選べません。");
    if (request.teamPreview) throw new Error("チーム選出が終わっていません。");

    if (request.forceSwitch?.some(Boolean)) {
      const index = Number(action?.switchTo);
      if (!Number.isInteger(index) || index < 0 || index >= request.side?.pokemon?.length) {
        throw new Error("交代先が不正です。");
      }
      const entry = request.side.pokemon[index];
      if (!entry || entry.active || /fnt/i.test(entry.condition || "")) {
        throw new Error("そのポケモンには交代できません。");
      }
      return "switch " + (index + 1);
    }

    if (action?.switchTo != null) {
      const index = Number(action.switchTo);
      if (!Number.isInteger(index) || index < 0 || index >= request.side?.pokemon?.length) {
        throw new Error("交代先が不正です。");
      }
      const entry = request.side.pokemon[index];
      if (!entry || entry.active || /fnt/i.test(entry.condition || "")) {
        throw new Error("そのポケモンには交代できません。");
      }
      return "switch " + (index + 1);
    }

    const active = request.active?.[0];
    const moves = active?.moves || [];
    let moveIndex = Number(action?.moveIndex);
    if (action?.moveId) {
      const wanted = toID(action.moveId);
      moveIndex = moves.findIndex(move => toID(move.id || move.move) === wanted);
    }
    if (!Number.isInteger(moveIndex) || moveIndex < 0 || moveIndex >= moves.length) {
      throw new Error("技の選択が不正です。");
    }
    if (moves[moveIndex].disabled) throw new Error("その技は現在使用できません。");
    const gimmick = String(action?.gimmick || (action?.terastallize ? "terastallize" : action?.mega ? "mega" : ""));
    let gimmickCommand = "";
    if (gimmick === "mega") {
      if (!active?.canMegaEvo) throw new Error("このポケモンはメガシンカできません。対応するメガストーンを確認してください。");
      gimmickCommand = " mega";
    } else if (gimmick === "terastallize") {
      if (!active?.canTerastallize) throw new Error("このポケモンはテラスタルできません。");
      gimmickCommand = " terastallize";
    } else if (gimmick) {
      throw new Error("選択したバトルギミックが不正です。");
    }
    return "move " + (moveIndex + 1) + gimmickCommand;
  }

  chooseCpuAction(request) {
    if (!request || request.wait) return null;
    if (request.teamPreview) return "team 123456".slice(0, 5 + Math.min(6, request.maxTeamSize || 6));
    if (request.forceSwitch?.some(Boolean)) {
      const bench = (request.side?.pokemon || []).findIndex(mon => !mon.active && !/fnt/i.test(mon.condition || ""));
      return bench >= 0 ? "switch " + (bench + 1) : null;
    }
    const moves = request.active?.[0]?.moves || [];
    const candidates = moves.map((move, index) => ({
      move, index,
      power: Sim.Dex.moves.get(move.id || move.move).basePower || 0
    })).filter(row => !row.move.disabled);
    if (!candidates.length) return "move 1";
    candidates.sort((a, b) => b.power - a.power);
    const shortlist = candidates.slice(0, Math.min(3, candidates.length));
    const picked = shortlist[crypto.randomInt(0, shortlist.length)];
    const active = request.active?.[0] || {};
    let gimmick = "";
    if (active.canMegaEvo && Math.random() < 0.25) gimmick = " mega";
    else if (active.canTerastallize && Math.random() < 0.35) gimmick = " terastallize";
    return "move " + (picked.index + 1) + gimmick;
  }

  async submitCpuAction(id, token, action, from = 0) {
    const session = this.get(id, token);
    if (session.kind !== "cpu") throw new Error("この対戦はCPU戦ではありません。");
    if (session.done) return this.snapshot(session, "p1", from);
    const p1Version = session.requestVersion.p1;
    const playerChoice = this.buildChoice(session, "p1", action);
    const cpuChoice = this.chooseCpuAction(session.requests.p2);
    await session.stream.write(">p1 " + playerChoice);
    if (cpuChoice) await session.stream.write(">p2 " + cpuChoice);
    await this.waitFor(session, () =>
      session.done || (session.requestVersion.p1 > p1Version && !!session.requests.p1 && !session.requests.p1.wait),
      REQUEST_TIMEOUT_MS
    );
    session.lastActive = Date.now();
    return this.snapshot(session, "p1", from);
  }

  validateAction(id, token, side, action) {
    const session = this.get(id, token, side);
    if (session.kind !== "online") throw new Error("この対戦はオンライン対戦ではありません。");
    return this.buildChoice(session, side, action);
  }

  async submitOnlineTurn(id, p1Token, p2Token, actions, fromP1 = 0, fromP2 = 0) {
    const session = this.get(id, p1Token, "p1");
    this.get(id, p2Token, "p2");
    if (session.kind !== "online") throw new Error("この対戦はオンライン対戦ではありません。");
    if (session.done) return {
      p1: this.snapshot(session, "p1", fromP1),
      p2: this.snapshot(session, "p2", fromP2)
    };
    const p1Version = session.requestVersion.p1;
    const p2Version = session.requestVersion.p2;
    const p1Choice = this.buildChoice(session, "p1", actions.p1);
    const p2Choice = this.buildChoice(session, "p2", actions.p2);
    await session.stream.write(">p1 " + p1Choice);
    await session.stream.write(">p2 " + p2Choice);
    await this.waitFor(session, () =>
      session.done || (
        session.requestVersion.p1 > p1Version &&
        session.requestVersion.p2 > p2Version &&
        !!session.requests.p1 && !!session.requests.p2 &&
        !session.requests.p1.wait && !session.requests.p2.wait
      ),
      REQUEST_TIMEOUT_MS
    );
    session.lastActive = Date.now();
    return {
      p1: this.snapshot(session, "p1", fromP1),
      p2: this.snapshot(session, "p2", fromP2)
    };
  }

  destroy(id) {
    const session = this.sessions.get(String(id || ""));
    if (!session) return false;
    this.sessions.delete(session.id);
    try { session.stream.writeEnd(); } catch (_) {}
    try { session.stream.destroy?.(); } catch (_) {}
    return true;
  }

  removeExpired() {
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (now - session.lastActive > SESSION_TTL_MS || session.done && now - session.lastActive > 5 * 60 * 1000) {
        this.destroy(session.id);
      }
    }
  }
}

module.exports = { Gen9BattleService, FORMAT_ID };
