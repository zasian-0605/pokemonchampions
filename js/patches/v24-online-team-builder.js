/* v24: Showdown items, beginner-friendly IV/nature UI, team builder, and casual online rooms. */
(() => {
  "use strict";
  const W = window;
  const S = () => W.state;
  const main = () => document.getElementById("main");
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const slug = (v) => String(v || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const STAT_KEYS = ["hp","atk","def","spa","spd","spe"];
  const STAT_NAMES = {hp:"HP",atk:"こうげき",def:"ぼうぎょ",spa:"とくこう",spd:"とくぼう",spe:"すばやさ"};
  const NATURES = {
    "いじっぱり":["atk","spa","物理技の威力を伸ばす性格。こうげきが上がり、とくこうが下がる。"],
    "ひかえめ":["spa","atk","特殊技の威力を伸ばす性格。とくこうが上がり、こうげきが下がる。"],
    "ようき":["spe","spa","先に動きやすくする性格。すばやさが上がり、とくこうが下がる。"],
    "おくびょう":["spe","atk","先に動きやすくする性格。すばやさが上がり、こうげきが下がる。"],
    "ずぶとい":["def","atk","物理攻撃を受けやすくする性格。ぼうぎょが上がり、こうげきが下がる。"],
    "おだやか":["spd","atk","特殊攻撃を受けやすくする性格。とくぼうが上がり、こうげきが下がる。"],
    "しんちょう":["spd","spa","特殊攻撃を受けやすくする性格。とくぼうが上がり、とくこうが下がる。"],
    "ゆうかん":["atk","spe","こうげきを伸ばす性格。こうげきが上がり、すばやさが下がる。"],
    "れいせい":["spa","spe","とくこうを伸ばす性格。とくこうが上がり、すばやさが下がる。"],
    "わんぱく":["def","spa","物理攻撃を受けやすくする性格。ぼうぎょが上がり、とくこうが下がる。"],
    "のんき":["def","spe","物理攻撃を受けやすくする性格。ぼうぎょが上がり、すばやさが下がる。"],
    "なまいき":["spd","spe","特殊攻撃を受けやすくする性格。とくぼうが上がり、すばやさが下がる。"],
    "むじゃき":["spe","spd","先に動きやすくする性格。すばやさが上がり、とくぼうが下がる。"],
    "せっかち":["spe","def","先に動きやすくする性格。すばやさが上がり、ぼうぎょが下がる。"],
    "さみしがり":["atk","def","こうげきを伸ばす性格。こうげきが上がり、ぼうぎょが下がる。"],
    "やんちゃ":["atk","spd","こうげきを伸ばす性格。こうげきが上がり、とくぼうが下がる。"],
    "おっとり":["spa","def","とくこうを伸ばす性格。とくこうが上がり、ぼうぎょが下がる。"],
    "うっかりや":["spa","spd","とくこうを伸ばす性格。とくこうが上がり、とくぼうが下がる。"],
    "おとなしい":["spd","def","とくぼうを伸ばす性格。とくぼうが上がり、ぼうぎょが下がる。"],
    "きまぐれ":[null,null,"能力の上昇・低下がない性格。"],
    "まじめ":[null,null,"能力の上昇・低下がない性格。"],
    "てれや":[null,null,"能力の上昇・低下がない性格。"],
    "すなお":[null,null,"能力の上昇・低下がない性格。"],
    "がんばりや":[null,null,"能力の上昇・低下がない性格。"]
  };
  function toast(message, kind) {
    if (typeof W.toast === "function") W.toast(message, kind || "good");
    else console.info("[Pokémon Champions]", message);
  }
  function render() {
    if (typeof W.renderPage === "function") W.renderPage();
  }
  function save() {
    if (typeof W.saveLocal === "function") W.saveLocal();
  }
  function goPage(page) {
    if (typeof W.setPage === "function") W.setPage(page);
    else { S().page = page; render(); }
    document.querySelectorAll("[data-v24-page]").forEach((el) => {
      el.classList.toggle("active", el.dataset.v24Page === page);
    });
  }
  function ownedTeam() {
    const s = S();
    return (s.team || []).map((uid) => (s.owned || []).find((m) => m.uid === uid)).filter(Boolean).slice(0,6);
  }
  function getItem(itemId) {
    return S()?.data?.itemsById?.[slug(itemId)] || S()?.data?.upstreamMechanics?.itemsById?.[slug(itemId)] || null;
  }
  function itemName(itemId) {
    if (!itemId) return "なし";
    const record = getItem(itemId);
    const local = {
      choicescarf:"こだわりスカーフ",choiceband:"こだわりハチマキ",choicespecs:"こだわりメガネ",
      lifeorb:"いのちのたま",focussash:"きあいのタスキ",leftovers:"たべのこし",
      sitrusberry:"オボンのみ",rockyhelmet:"ゴツゴツメット",assaultvest:"とつげきチョッキ",
      heavydutyboots:"あつぞこブーツ",blacksludge:"くろいヘドロ",eviolite:"しんかのきせき",
      weaknesspolicy:"じゃくてんほけん",boosterenergy:"ブーストエナジー",airballoon:"ふうせん",
      expertbelt:"たつじんのおび",clearamulet:"クリアチャーム",covertcloak:"おんみつマント",
      boots:"あつぞこブーツ",lumberry:"ラムのみ"
    };
    return local[slug(itemId)] || record?.name || String(itemId);
  }
  function natureDescription(nature) {
    const entry = NATURES[nature] || [null,null,"能力の上昇・低下がない性格。"];
    if (!entry[0]) return entry[2];
    return entry[2] + "（" + STAT_NAMES[entry[0]] + "が約1.1倍、" + STAT_NAMES[entry[1]] + "が約0.9倍）";
  }
  function calcCurrentStats(mon) {
    if (typeof W.calcStats === "function") return W.calcStats(mon);
    return {};
  }
  function calcNeutralBaseline(mon) {
    const baseline = Object.assign({}, mon, {
      nature:"まじめ",
      ivs:Object.fromEntries(STAT_KEYS.map((k) => [k,0])),
      evs:Object.fromEntries(STAT_KEYS.map((k) => [k,0])),
      hyperTrained:{}
    });
    return calcCurrentStats(baseline);
  }
  function ivMarkup(mon) {
    const stats = calcCurrentStats(mon), baseline = calcNeutralBaseline(mon);
    return '<section class="v24-iv-panel"><div class="v24-panel-heading"><div><span class="v24-kicker">INDIVIDUAL VALUES</span><h3>個体値を調整</h3><p>各能力は0〜31。数値を上げると、下の実数値もすぐに変わるよ。</p></div><span class="v24-pill">最大31</span></div>' +
      '<div class="v24-iv-grid">' + STAT_KEYS.map((k) => {
        const val = Number(mon.ivs?.[k] ?? 31);
        return '<label class="v24-iv-row"><span>' + STAT_NAMES[k] + '</span><input type="range" min="0" max="31" step="1" data-v24-iv="' + k + '" value="' + val + '"><b data-v24-iv-value="' + k + '">' + val + '</b></label>';
      }).join("") + '</div><div class="v24-stat-preview"><div class="v24-preview-title">現在の実数値（Lv.' + Number(mon.level || 50) + '）</div>' +
      STAT_KEYS.map((k) => '<div class="v24-stat-line" data-v24-stat-line="' + k + '"><span>' + STAT_NAMES[k] + '</span><b data-v24-stat-value="' + k + '">' + Number(stats[k] || 0) + '</b><small data-v24-stat-delta="' + k + '">+' + Math.max(0,Number(stats[k]||0)-Number(baseline[k]||0)) + '（個体値・努力値分）</small><i><em data-v24-stat-bar="' + k + '" style="width:' + Math.min(100,Number(stats[k]||0)/255*100) + '%"></em></i></div>').join("") +
      '</div><p class="v24-help-note">個体値31はその能力の素質が最大という意味。HPや攻撃などの実数値は、レベル・種族値・個体値・努力値・性格を合わせて計算されるよ。</p></section>';
  }
  function addTrainingEnhancements(html, mon) {
    if (!mon) return html;
    const ivSection = ivMarkup(mon);
    const evAnchor = '<div class="section-kicker">EFFORT VALUES / 努力値 (合計510)</div>';
    if (html.includes(evAnchor)) html = html.replace(evAnchor, ivSection + evAnchor);
    const natureAnchor = '</select><label class="small muted" for="ability-select">';
    const natureNote = '</select><div class="v24-nature-note"><b>この性格の効果</b><p>' +
      esc(natureDescription(mon.nature || "まじめ")) + '</p></div><label class="small muted" for="ability-select">';
    if (html.includes(natureAnchor)) html = html.replace(natureAnchor, natureNote);

    const itemSelect = html.match(/<select id="held-item"[\s\S]*?<\/select>/);
    if (itemSelect) {
      const optionBlock = itemSelect[0].replace(/^<select[^>]*>/,"").replace(/<\/select>$/,"");
      const tmp = document.createElement("select");
      tmp.innerHTML = optionBlock;
      const itemOptions = new Map();
      Array.from(tmp.options).forEach((o) => itemOptions.set(o.value, o.textContent.trim()));
      const remote = S().data?.itemsList || [];
      for (const item of remote) {
        if (!item || !item.id || !item.name) continue;
        if (item.isNonstandard && item.id !== slug(mon.heldItem)) continue;
        if (!itemOptions.has(item.id)) itemOptions.set(item.id, item.name);
      }
      const current = slug(mon.heldItem || "");
      const sorted = Array.from(itemOptions.entries()).sort((a,b) => {
        if (a[0] === current) return -1;
        if (b[0] === current) return 1;
        return a[1].localeCompare(b[1],"ja");
      });
      const options = sorted.map(([id,label]) => '<option value="' + esc(id) + '"' + (id === current ? ' selected' : '') + '>' + esc(label) + '</option>').join("");
      const record = getItem(current);
      const description = record?.shortDesc || record?.desc || "Showdownの持ち物データを参照。効果処理はゲーム内で対応している効果から順次接続しています。";
      const newBlock = '<div class="v24-item-picker"><label class="small muted" for="v24-item-search">持ち物を検索（Showdown）</label><input class="field" id="v24-item-search" type="search" placeholder="例：こだわりスカーフ / leftovers"><label class="small muted" for="held-item">持ち物</label><select id="held-item" class="field" style="width:100%;margin-top:6px">' + options + '</select><p class="v24-item-desc">' + esc(description) + '</p><small class="v24-help-note">持ち物の名前・説明データはShowdownから取得。すべての持ち物効果が完全に再現されているわけではありません。</small></div>';
      html = html.replace(itemSelect[0], newBlock);
    }
    return html;
  }

  const originalRenderTraining = W.renderTraining;
  if (typeof originalRenderTraining === "function") {
    W.renderTraining = function() {
      const html = originalRenderTraining();
      const mon = (S().owned || []).find((m) => m.uid === S().selectedOwned) || S().owned?.[0];
      return addTrainingEnhancements(html, mon);
    };
  }

  function updateTrainingPreview() {
    const s = S();
    const mon = (s.owned || []).find((m) => m.uid === s.selectedOwned) || s.owned?.[0];
    if (!mon) return;
    const stats = calcCurrentStats(mon), baseline = calcNeutralBaseline(mon);
    const panel = main();
    if (!panel) return;
    STAT_KEYS.forEach((k) => {
      const value = panel.querySelector('[data-v24-stat-value="' + k + '"]');
      const delta = panel.querySelector('[data-v24-stat-delta="' + k + '"]');
      const bar = panel.querySelector('[data-v24-stat-bar="' + k + '"]');
      const inputValue = panel.querySelector('[data-v24-iv-value="' + k + '"]');
      const input = panel.querySelector('[data-v24-iv="' + k + '"]');
      const actual = Number(stats[k] || 0);
      if (value) value.textContent = actual;
      if (delta) delta.textContent = (actual - Number(baseline[k] || 0) >= 0 ? "+" : "") + (actual - Number(baseline[k] || 0)) + "（個体値・努力値分）";
      if (bar) bar.style.width = Math.min(100, actual / 255 * 100) + "%";
      if (input && inputValue) inputValue.textContent = input.value;
      const oldRows = panel.querySelectorAll(".stat-list .stat-row");
      const index = STAT_KEYS.indexOf(k);
      if (oldRows[index]) {
        const b = oldRows[index].querySelector("b");
        const i = oldRows[index].querySelector(".stat-bar i");
        if (b) b.textContent = actual;
        if (i) i.style.width = Math.min(100,actual/255*100) + "%";
      }
    });
    const nature = panel.querySelector("#nature-select");
    const note = panel.querySelector(".v24-nature-note p");
    if (nature && note) note.textContent = natureDescription(nature.value);
  }

  function addNavigation() {
    const side = document.querySelector(".sidebar");
    if (side && !side.querySelector('[data-v24-page="team-builder"]')) {
      const b = document.createElement("button");
      b.className = "nav-item";
      b.dataset.v24Page = "team-builder";
      b.innerHTML = '<span>⇄</span><b>チーム編成</b><small>TEAM BUILDER</small>';
      side.insertBefore(b, side.querySelector(".sidebar-bottom"));
    }
    if (side && !side.querySelector('[data-v24-page="online"]')) {
      const b = document.createElement("button");
      b.className = "nav-item";
      b.dataset.v24Page = "online";
      b.innerHTML = '<span>◎</span><b>オンライン対戦</b><small>ONLINE ROOM</small>';
      side.insertBefore(b, side.querySelector(".sidebar-bottom"));
    }
    const mobile = document.querySelector(".mobile-nav");
    if (mobile && !mobile.querySelector('[data-v24-page="team-builder"]')) {
      const b = document.createElement("button");
      b.dataset.v24Page = "team-builder";
      b.innerHTML = '<span>⇄</span><small>編成</small>';
      mobile.appendChild(b);
    }
    if (mobile && !mobile.querySelector('[data-v24-page="online"]')) {
      const b = document.createElement("button");
      b.dataset.v24Page = "online";
      b.innerHTML = '<span>◎</span><small>オンライン</small>';
      mobile.appendChild(b);
    }
  }

  function rosterCard(mon) {
    const s = S(), teamIds = s.team || [], inTeam = teamIds.includes(mon.uid);
    const sp = typeof W.monSpecies === "function" ? W.monSpecies(mon) : null;
    const icon = typeof W.speciesIcon === "function" ? W.speciesIcon(mon) : "";
    const ab = typeof W.abilityName === "function" ? W.abilityName(mon.abilityId) : (mon.abilityId || "");
    const item = itemName(mon.heldItem);
    return '<article class="v24-roster-card" data-v24-drag-uid="' + esc(mon.uid) + '" data-v24-roster-name="' + esc((mon.name || "") + " " + (sp?.name || "")).toLowerCase() + '" draggable="true">' +
      '<div class="v24-mon-art">' + icon + '</div><div class="v24-mon-copy"><b>' + esc(mon.name || sp?.jpName || sp?.name || "ポケモン") + '</b><small>Lv.' + Number(mon.level || 50) + ' · ' + (mon.shiny ? "✦ 色違い" : "通常") + '</small><small>特性：' + esc(ab) + '</small><small>持ち物：' + esc(item) + '</small></div>' +
      '<div class="v24-card-actions"><button data-v24-action="team-toggle" data-uid="' + esc(mon.uid) + '">' + (inTeam ? "チームから外す" : "＋ 編成に追加") + '</button><button data-v24-action="team-train" data-uid="' + esc(mon.uid) + '">育成</button></div></article>';
  }
  function teamSlot(mon, index) {
    if (!mon) return '<div class="v24-team-slot empty" data-v24-slot="' + index + '"><span class="v24-slot-num">' + (index + 1) + '</span><b>空き枠</b><small>ここへ長押し移動</small></div>';
    const icon = typeof W.speciesIcon === "function" ? W.speciesIcon(mon) : "";
    return '<article class="v24-team-slot" data-v24-slot="' + index + '" data-v24-drag-uid="' + esc(mon.uid) + '" data-v24-source-team="1" draggable="true"><span class="v24-slot-num">' + (index + 1) + '</span><div class="v24-slot-art">' + icon + '</div><b>' + esc(mon.name) + '</b><small>Lv.' + Number(mon.level || 50) + '</small><div class="v24-slot-actions"><button data-v24-action="team-move" data-index="' + index + '" data-dir="-1" ' + (index === 0 ? "disabled" : "") + '>←</button><button data-v24-action="team-move" data-index="' + index + '" data-dir="1" ' + (index === 5 || index >= S().team.length - 1 ? "disabled" : "") + '>→</button><button data-v24-action="team-toggle" data-uid="' + esc(mon.uid) + '">外す</button></div></article>';
  }
  function renderTeamBuilder() {
    const s = S();
    const team = ownedTeam();
    const cards = (s.owned || []).map(rosterCard).join("");
    return '<div class="v24-page">' +
      '<header class="v24-page-head"><div><span class="v24-kicker">TEAM BUILDER</span><h1>バトルチーム編成</h1><p>ボックスのポケモンを6枠に並べよう。PCならドラッグ、スマホ・タブレットなら長押しして移動できるよ。</p></div><span class="v24-pill">' + team.length + ' / 6匹</span></header>' +
      '<section class="v24-team-panel"><div class="v24-panel-heading"><div><span class="v24-kicker">YOUR BATTLE TEAM</span><h2>対戦に出す6匹</h2></div><button class="v24-secondary-btn" data-v24-action="team-clear">全員外す</button></div><div class="v24-team-row">' + Array.from({length:6},(_,i)=>teamSlot(team[i] || null,i)).join("") + '</div><p class="v24-help-note">順番もそのまま保存されるよ。6匹がそろったらオンライン対戦にも使える。</p><div class="v24-action-row"><button class="v24-primary-btn" data-v24-page="training">個体値・性格・技を調整</button><button class="v24-primary-btn" data-v24-page="online">オンライン対戦へ</button></div></section>' +
      '<section class="v24-roster-panel"><div class="v24-panel-heading"><div><span class="v24-kicker">POKÉMON BOX</span><h2>ボックスの個体</h2><p>' + (s.owned || []).length + '匹から選べるよ。重複した個体も別々に管理するよ。</p></div><input class="field v24-roster-search" id="v24-roster-search" type="search" placeholder="ポケモン名で検索"></div>' +
      '<div class="v24-roster-grid">' + (cards || '<p class="v24-help-note">まだポケモンがいません。スカウトで仲間を増やそう。</p>') + '</div></section></div>';
  }

  function defaultOnlineUrl() {
    const s = S();
    if (s.online?.url) return s.online.url;
    try {
      const saved = localStorage.getItem("pokemon-champions-online-url");
      if (saved) return saved;
    } catch (_) {}
    return location.protocol + "//" + location.host + "/ws";
  }
  function renderOnlinePage() {
    const o = S().online || {};
    const status = o.status || "offline";
    const active = ["waiting","matched","in-battle"].includes(status);
    const room = o.roomCode || "";
    const match = o.match;
    const otherName = match?.opponentName || "";
    const detail = status === "waiting" ? "ルームを作成したよ。相手にルームコードを伝えてね。" :
      status === "matched" ? "相手と接続したよ。バトルを準備中…" :
      status === "in-battle" ? "通信中。自分の技を決めると相手にも届くよ。" :
      status === "error" ? (o.error || "接続できませんでした。") : "ルームコードで友達と対戦できます。";
    return '<div class="v24-page"><header class="v24-page-head"><div><span class="v24-kicker">ONLINE BATTLE</span><h1>オンライン対戦</h1><p>ルームコードで友達とシングル対戦。ゲームのルール処理はホスト側で進め、結果を相手に同期するカジュアル対戦です。</p></div><span class="v24-pill">CASUAL ROOM</span></header>' +
      '<section class="v24-online-panel"><div class="v24-panel-heading"><div><span class="v24-kicker">ROOM CONNECTION</span><h2>ルームに接続</h2></div><span class="v24-status ' + esc(status) + '">' + esc(status.toUpperCase()) + '</span></div>' +
      '<label>通信サーバーURL</label><input id="v24-server-url" class="field" type="url" value="' + esc(o.url || defaultOnlineUrl()) + '" placeholder="wss://your-service.onrender.com/ws">' +
      '<label>トレーナー名</label><input id="v24-player-name" class="field" maxlength="18" value="' + esc(o.playerName || "トレーナー") + '" placeholder="トレーナー名">' +
      '<div class="v24-action-row"><button class="v24-primary-btn" data-v24-action="online-create" ' + (active ? "disabled" : "") + '>ルームを作る</button></div>' +
      '<div class="v24-join-row"><input id="v24-room-code" class="field" maxlength="6" autocomplete="off" value="' + esc(room) + '" placeholder="6文字のルームコード"><button class="v24-secondary-btn" data-v24-action="online-join" ' + (active ? "disabled" : "") + '>コードで参加</button></div>' +
      '<div class="v24-room-status"><b>' + esc(detail) + '</b>' + (room ? '<div class="v24-room-code">ROOM　' + esc(room) + '<button data-v24-action="online-copy-code">コードをコピー</button></div>' : '') +
      (otherName ? '<p>対戦相手：' + esc(otherName) + '</p>' : '') +
      (active ? '<button class="v24-secondary-btn" data-v24-action="online-leave">接続を終了</button>' : '') +
      '</div></section><section class="v24-online-panel"><h2>対戦の準備</h2><p>チーム編成で6匹を決めてからルームを作ってね。ルームコードを知っている人だけが参加できるよ。</p><div class="v24-action-row"><button class="v24-primary-btn" data-v24-page="team-builder">6匹を編成する</button><button class="v24-secondary-btn" data-v24-page="training">個体値・技を調整する</button></div></section>' +
      '<p class="v24-help-note">現在はルームコード式のカジュアル対戦。ランクマッチ、アカウント認証、不正対策のある公式サーバーではありません。ホスト側のブラウザがターンを計算する方式なので、ホストが切断すると対戦も終了します。</p></div>';
  }

  const originalRenderPage = W.renderPage;
  W.renderPage = function() {
    const page = S()?.page;
    if (page === "team-builder") {
      const root = main();
      if (root) { root.innerHTML = renderTeamBuilder(); if (typeof W.updateTop === "function") W.updateTop(); }
      return;
    }
    if (page === "online") {
      const root = main();
      if (root) { root.innerHTML = renderOnlinePage(); if (typeof W.updateTop === "function") W.updateTop(); }
      return;
    }
    return originalRenderPage();
  };

  function setTeamSlot(uid, index) {
    const s = S();
    if (!uid || !s.owned.some((m) => m.uid === uid)) return;
    const ids = (s.team || []).filter((x) => s.owned.some((m) => m.uid === x));
    const from = ids.indexOf(uid);
    const targetIndex = Math.max(0, Math.min(5, Number(index) || 0));
    if (from >= 0) {
      if (from === targetIndex) return;
      if (targetIndex >= ids.length) {
        ids.splice(from,1); ids.push(uid);
      } else {
        const other = ids[targetIndex];
        ids[targetIndex] = uid;
        ids[from] = other;
      }
    } else if (ids.length < 6) {
      if (targetIndex >= ids.length) ids.push(uid);
      else ids.splice(targetIndex,0,uid);
    } else if (targetIndex < 6) {
      ids[targetIndex] = uid;
    }
    s.team = ids.slice(0,6);
    save(); render();
  }
  function teamToggle(uid) {
    const s = S(), ids = s.team || [];
    const at = ids.indexOf(uid);
    if (at >= 0) ids.splice(at,1);
    else if (ids.length < 6 && s.owned.some((m) => m.uid === uid)) ids.push(uid);
    else { toast("チームは6匹まで。先に1匹外してね。","warn"); return; }
    s.team = ids; save(); render();
  }
  function moveTeamIndex(index, dir) {
    const ids = (S().team || []).slice();
    const next = index + dir;
    if (next < 0 || next >= ids.length) return;
    const temp = ids[index]; ids[index] = ids[next]; ids[next] = temp;
    S().team = ids; save(); render();
  }
  function handleTeamAction(action, el) {
    const uid = el.dataset.uid;
    if (action === "team-toggle") return teamToggle(uid);
    if (action === "team-clear") { S().team = []; save(); render(); return; }
    if (action === "team-move") return moveTeamIndex(Number(el.dataset.index),Number(el.dataset.dir));
    if (action === "team-train") { S().selectedOwned = uid; goPage("training"); return; }
    if (action === "team-select") { S().selectedOwned = uid; goPage("box"); return; }
  }

  let pressState = null;
  let pressTimer = null;
  let dragging = null;
  function clearPointerDrag() {
    clearTimeout(pressTimer); pressTimer = null;
    document.querySelectorAll(".v24-drop-target").forEach((el) => el.classList.remove("v24-drop-target"));
    document.querySelectorAll(".v24-dragging").forEach((el) => el.classList.remove("v24-dragging"));
    pressState = null; dragging = null;
  }
  document.addEventListener("pointerdown", (event) => {
    const source = event.target.closest("[data-v24-drag-uid]");
    if (!source || !["team-builder"].includes(S()?.page)) return;
    pressState = {
      uid:source.dataset.v24DragUid,
      team:source.dataset.v24SourceTeam === "1",
      x:event.clientX,y:event.clientY,source
    };
    pressTimer = setTimeout(() => {
      if (!pressState) return;
      dragging = {uid:pressState.uid,team:pressState.team};
      pressState.source.classList.add("v24-dragging");
      document.body.classList.add("v24-has-drag");
      toast("移動先のチーム枠に運んでね。");
    },360);
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (pressState && !dragging) {
      const distance = Math.hypot(event.clientX-pressState.x,event.clientY-pressState.y);
      if (distance > 12) { clearTimeout(pressTimer); pressTimer = null; }
    }
    if (!dragging) return;
    document.querySelectorAll(".v24-drop-target").forEach((el) => el.classList.remove("v24-drop-target"));
    const target = document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-v24-slot]");
    if (target) target.classList.add("v24-drop-target");
  }, true);
  document.addEventListener("pointerup", (event) => {
    if (dragging) {
      const target = document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-v24-slot]");
      if (target) setTeamSlot(dragging.uid,Number(target.dataset.v24Slot));
      document.body.classList.remove("v24-has-drag");
      clearPointerDrag();
    } else {
      clearTimeout(pressTimer); pressTimer = null; pressState = null;
    }
  }, true);
  document.addEventListener("pointercancel", clearPointerDrag, true);

  document.addEventListener("dragstart", (event) => {
    const source = event.target.closest("[data-v24-drag-uid]");
    if (!source || !event.dataTransfer) return;
    event.dataTransfer.setData("text/plain",source.dataset.v24DragUid);
    event.dataTransfer.effectAllowed = "move";
  });
  document.addEventListener("dragover", (event) => {
    const target = event.target.closest("[data-v24-slot]");
    if (target) { event.preventDefault(); target.classList.add("v24-drop-target"); }
  });
  document.addEventListener("dragleave", (event) => {
    const target = event.target.closest("[data-v24-slot]");
    if (target) target.classList.remove("v24-drop-target");
  });
  document.addEventListener("drop", (event) => {
    const target = event.target.closest("[data-v24-slot]");
    if (!target || !event.dataTransfer) return;
    event.preventDefault();
    const uid = event.dataTransfer.getData("text/plain");
    if (uid) setTeamSlot(uid,Number(target.dataset.v24Slot));
  });

  const ONLINE_URL_KEY = "pokemon-champions-online-url";
  function getWsUrl() {
    let url = document.getElementById("v24-server-url")?.value.trim() || S().online?.url || defaultOnlineUrl();
    if (url.startsWith("https://")) url = "wss://" + url.slice(8);
    else if (url.startsWith("http://")) url = "ws://" + url.slice(7);
    if (!/^wss?:\/\//i.test(url)) throw new Error("通信サーバーURLは https:// または wss:// から始めてね。");
    if (!/\/ws(?:\?.*)?$/i.test(url)) url = url.replace(/\/+$/,"") + "/ws";
    return url;
  }
  function teamPayload() {
    const s = S(), ids = s.team || [];
    const team = ids.map((uid) => (s.owned || []).find((m) => m.uid === uid)).filter(Boolean);
    if (team.length !== 6) throw new Error("オンライン対戦には、先に6匹のチーム編成が必要だよ。");
    return team.map((m) => ({
      uid:String(m.uid),
      speciesId:String(m.speciesId),
      name:String(m.name || "").slice(0,40),
      level:Math.max(1,Math.min(100,Number(m.level || 50))),
      shiny:!!m.shiny,
      mark:m.mark ? String(m.mark).slice(0,40) : null,
      nature:String(m.nature || "まじめ"),
      ivs:Object.fromEntries(STAT_KEYS.map((k) => [k,Math.max(0,Math.min(31,Number(m.ivs?.[k] ?? 31)))])),
      evs:Object.fromEntries(STAT_KEYS.map((k) => [k,Math.max(0,Math.min(252,Number(m.evs?.[k] || 0)))])),
      abilityId:String(m.abilityId || ""),
      heldItem:String(m.heldItem || ""),
      teraType:String(m.teraType || ""),
      moves:(m.moves || []).slice(0,4).map((move) => ({id:String(typeof move === "string" ? move : move.id)}))
    }));
  }
  function sendSocket(payload) {
    const socket = S().online?.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }
  function setOnlineStatus(status, details) {
    const s = S();
    s.online = s.online || {};
    s.online.status = status;
    if (details) Object.assign(s.online,details);
    render();
  }
  function showOnlineError(message) {
    setOnlineStatus("error",{error:String(message || "通信エラー")});
    toast(String(message || "通信エラー"),"bad");
  }
  function connectAndSend(kind) {
    const s = S();
    let team;
    try { team = teamPayload(); }
    catch (error) { toast(error.message,"warn"); goPage("team-builder"); return; }
    let url;
    try { url = getWsUrl(); }
    catch (error) { toast(error.message,"warn"); return; }
    const name = (document.getElementById("v24-player-name")?.value || "トレーナー").trim().slice(0,18) || "トレーナー";
    const code = (document.getElementById("v24-room-code")?.value || "").trim().toUpperCase();
    if (kind === "join-room" && !/^[A-Z0-9]{6}$/.test(code)) { toast("6文字のルームコードを入力してね。","warn"); return; }
    try { localStorage.setItem(ONLINE_URL_KEY,url); } catch (_) {}
    s.online = {status:"connecting",url,playerName:name,roomCode:code,socket:null,waiting:false};
    render();
    let socket;
    try { socket = new WebSocket(url); }
    catch (error) { showOnlineError(error.message); return; }
    s.online.socket = socket;
    socket.addEventListener("open",() => {
      s.online.status = "connecting";
      socket.send(JSON.stringify({type:kind,roomCode:code,playerName:name,team}));
      render();
    });
    socket.addEventListener("message",(event) => {
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      handleOnlineMessage(message);
    });
    socket.addEventListener("error",() => showOnlineError("通信サーバーに接続できません。URLとRenderの起動状態を確認してね。"));
    socket.addEventListener("close",() => {
      if (S().online && !["ended","offline"].includes(S().online.status)) {
        S().online.status = "disconnected";
        S().online.waiting = false;
        render();
      }
    });
  }
  function teamFromPayload(records) {
    const s = S();
    return (records || []).map((record) => {
      const species = s.data.dexById?.[record.speciesId];
      if (!species) throw new Error("相手のポケモン「" + record.speciesId + "」がこの図鑑にありません。");
      const moves = (record.moves || []).map((m) => m.id).filter((id) => typeof W.getMove(id) === "object");
      const mon = W.makeOwned(species,{
        level:record.level,shiny:record.shiny,mark:record.mark,nature:record.nature,
        ivs:record.ivs,evs:record.evs,abilityId:record.abilityId,
        heldItem:record.heldItem,moves:moves
      });
      mon.uid = String(record.uid);
      mon.name = record.name || mon.name;
      mon.teraType = record.teraType || mon.teraType;
      mon.moves = moves.map((id) => ({id,pp:W.getMove(id)?.pp || 10}));
      return W.buildBattleMon(mon,true);
    });
  }
  function startOnlineBattle(message) {
    const s = S();
    const players = message.players || [];
    const me = players.find((p) => p.id === s.online.playerId);
    const opponent = players.find((p) => p.id !== s.online.playerId);
    if (!me || !opponent) throw new Error("対戦相手のチーム情報を受け取れませんでした。");
    const localTeam = (s.team || []).map((uid) => s.owned.find((m) => m.uid === uid)).filter(Boolean);
    if (localTeam.length !== 6) throw new Error("チームが6匹そろっていません。");
    const playerTeam = localTeam.map((m) => W.buildBattleMon(m,true));
    const enemyTeam = teamFromPayload(opponent.team);
    s.online.isHost = message.hostId === s.online.playerId;
    s.online.match = {opponentName:opponent.name,opponentId:opponent.id};
    s.online.status = "in-battle";
    s.online.waiting = false;
    s.battle = {
      mode:"online",turn:1,playerTeam,enemyTeam,playerActive:[0],enemyActive:[0],
      weather:null,weatherTurns:0,terrain:null,terrainTurns:0,
      sideConditions:{player:{},enemy:{}},log:["オンライン対戦開始！ " + opponent.name + "が現れた！"],
      result:null,pending:{},megaPendingSlots:[],megaUsedBySide:{player:false,enemy:false},
      lastDamage:null,turnBusy:false
    };
    s.page = "battle";
    s.selectedActiveSlot = 0;
    s.selectedMove = null;
    s.selectedTargetUid = enemyTeam[0]?.uid || null;
    if (s.online.isHost && typeof W.triggerEntryEffects === "function") {
      W.triggerEntryEffects(playerTeam.slice(0,1),enemyTeam.slice(0,1),s.battle);
      sendSnapshot();
    }
    goPage("battle");
  }
  function invertBattle(hostBattle) {
    const b = JSON.parse(JSON.stringify(hostBattle));
    const oldPlayer = b.playerTeam, oldEnemy = b.enemyTeam;
    b.playerTeam = oldEnemy;
    b.enemyTeam = oldPlayer;
    const oldActive = b.playerActive;
    b.playerActive = b.enemyActive;
    b.enemyActive = oldActive;
    if (b.sideConditions) b.sideConditions = {player:b.sideConditions.enemy || {},enemy:b.sideConditions.player || {}};
    if (b.megaUsedBySide) b.megaUsedBySide = {player:!!b.megaUsedBySide.enemy,enemy:!!b.megaUsedBySide.player};
    if (b.result === "win") b.result = "lose";
    else if (b.result === "lose") b.result = "win";
    b.turnBusy = false;
    b.pending = {};
    b.megaPendingSlots = [];
    return b;
  }
  function sendSnapshot() {
    const s = S();
    if (!s.online?.isHost || !s.battle || s.battle.mode !== "online") return;
    sendSocket({type:"battle-snapshot",roomCode:s.online.roomCode,turn:s.battle.turn,battle:s.battle});
  }
  async function resolveOnlineTurn(message) {
    const s = S();
    if (!s.online?.isHost || !s.battle || s.battle.turnBusy) return;
    const actions = (message.actions || []).map((entry) => ({
      ...entry.action,
      side:entry.playerId === s.online.playerId ? "player" : "enemy"
    }));
    if (actions.length !== 2) return;
    s.online.waiting = false;
    s.battle.turnBusy = false;
    try {
      await W.executeTurn(actions);
      sendSnapshot();
    } catch (error) {
      console.error("[online turn]",error);
      showOnlineError("ターンの処理中にエラーが起きました: " + error.message);
    }
  }
  function handleOnlineMessage(message) {
    const s = S();
    s.online = s.online || {};
    switch (message.type) {
      case "room-created":
      case "room-joined":
        s.online.playerId = message.playerId;
        s.online.roomCode = message.roomCode;
        s.online.isHost = message.type === "room-created";
        s.online.status = "waiting";
        s.online.error = "";
        toast(message.type === "room-created" ? "ルームを作ったよ。コードを相手に伝えてね。" : "ルームに参加したよ。相手が準備できるまで待ってね。","good");
        render();
        break;
      case "match-ready":
        try { startOnlineBattle(message); }
        catch (error) { showOnlineError(error.message); }
        break;
      case "turn-actions":
        if (s.online.isHost) resolveOnlineTurn(message);
        break;
      case "battle-snapshot":
        if (!s.online.isHost && message.battle) {
          s.battle = invertBattle(message.battle);
          s.online.status = "in-battle";
          s.online.waiting = false;
          s.page = "battle";
          render();
        }
        break;
      case "peer-left":
        s.online.status = "disconnected";
        s.online.waiting = false;
        toast("相手がルームから退出したよ。","warn");
        render();
        break;
      case "forfeit":
        if (s.battle?.mode === "online" && !s.battle.result) {
          s.battle.result = "win";
          s.battle.log.push("相手が対戦を終了したため勝利！");
          s.online.status = "ended";
          render();
        }
        break;
      case "error":
        showOnlineError(message.message || "サーバーからエラーが返されました。");
        break;
      case "pong":
        break;
      default:
        break;
    }
  }
  function submitOnlineAction(action) {
    const s = S();
    if (!s.online || !s.battle || s.battle.mode !== "online" || s.online.waiting) return;
    const payload = {
      type:"turn-action",roomCode:s.online.roomCode,turn:s.battle.turn,action
    };
    if (!sendSocket(payload)) { toast("通信が切れています。オンライン画面で再接続してね。","bad"); return; }
    s.online.waiting = true;
    s.battle.turnBusy = true;
    render();
  }
  function submitSelectedMove() {
    const s = S(), b = s.battle;
    if (!b || b.result || s.online?.waiting) return;
    const slot = 0, mon = b.playerTeam[b.playerActive[slot]];
    const move = W.getMove(s.selectedMove);
    if (!mon || mon.fainted || !move) { toast("先に技を選んでね。","warn"); return; }
    const moveSlot = (mon.moves || []).find((m) => m.id === move.id);
    if (!moveSlot || moveSlot.pp <= 0) { toast("その技はPPがありません。","warn"); return; }
    const target = b.enemyTeam[b.enemyActive[0]];
    submitOnlineAction({
      actorUid:mon.uid,moveId:move.id,targetUid:s.selectedTargetUid || target?.uid,
      slot,mega:!!b.megaPendingSlots?.includes(slot)
    });
  }
  function submitSwitch(index, slot) {
    const s = S(), b = s.battle;
    if (!b || b.result || s.online?.waiting) return;
    const current = b.playerTeam[b.playerActive[slot || 0]];
    const targetIndex = Number(index);
    if (!current || !b.playerTeam[targetIndex] || b.playerTeam[targetIndex].fainted || b.playerActive.includes(targetIndex)) {
      toast("そのポケモンには交代できません。","warn"); return;
    }
    submitOnlineAction({actorUid:current.uid,moveId:null,targetUid:null,slot:slot || 0,switchTo:targetIndex});
    const modal = document.getElementById("modal-root");
    if (modal) modal.innerHTML = "";
  }
  function leaveOnline(forfeit) {
    const s = S();
    if (forfeit && s.battle?.mode === "online" && !s.battle.result) {
      sendSocket({type:"forfeit",roomCode:s.online?.roomCode});
    } else {
      sendSocket({type:"leave-room",roomCode:s.online?.roomCode});
    }
    try { s.online?.socket?.close(); } catch (_) {}
    s.online = {status:"offline"};
    s.battle = null;
    s.selectedMove = null;
    goPage("online");
  }

  const originalBattleRenderer = W.renderBattlePage;
  if (typeof originalBattleRenderer === "function") {
    W.renderBattlePage = function() {
      let html = originalBattleRenderer();
      const b = S().battle;
      if (b?.mode === "online") {
        const stateText = S().online?.waiting ? "相手の行動を待っています…" : "オンライン対戦中";
        const banner = '<div class="v24-online-battle-banner"><b>' + esc(stateText) + '</b><span>TURN ' + Number(b.turn || 1) + '</span><button data-v24-action="online-forfeit">対戦を終了</button></div>';
        html = html.replace('<div class="battle-shell',banner + '<div class="battle-shell');
      }
      return html;
    };
  }

  document.addEventListener("click",(event) => {
    const pageButton = event.target.closest("[data-v24-page]");
    if (pageButton) {
      event.preventDefault(); event.stopImmediatePropagation();
      goPage(pageButton.dataset.v24Page);
      return;
    }
    const actionButton = event.target.closest("[data-v24-action]");
    if (actionButton) {
      event.preventDefault(); event.stopImmediatePropagation();
      const action = actionButton.dataset.v24Action;
      if (action === "team-train" || action === "team-toggle" || action === "team-clear" || action === "team-move") {
        handleTeamAction(action,actionButton); return;
      }
      if (action === "team-select") { handleTeamAction(action,actionButton); return; }
      if (action === "online-create") { connectAndSend("create-room"); return; }
      if (action === "online-join") { connectAndSend("join-room"); return; }
      if (action === "online-copy-code") {
        const code = S().online?.roomCode || "";
        if (code && navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(() => toast("ルームコードをコピーしたよ。","good"));
        else toast("ルームコード：" + code);
        return;
      }
      if (action === "online-leave") { leaveOnline(false); return; }
      if (action === "online-forfeit") { leaveOnline(true); return; }
    }

    const coreButton = event.target.closest("[data-action]");
    if (coreButton && S().battle?.mode === "online") {
      const coreAction = coreButton.dataset.action;
      if (coreAction === "confirm-move") {
        event.preventDefault(); event.stopImmediatePropagation(); submitSelectedMove(); return;
      }
      if (coreAction === "switch-to") {
        event.preventDefault(); event.stopImmediatePropagation();
        submitSwitch(coreButton.dataset.index,coreButton.dataset.slot);
        return;
      }
      if (coreAction === "end-battle") {
        event.preventDefault(); event.stopImmediatePropagation(); leaveOnline(true); return;
      }
      if (coreAction === "execute-double") {
        event.preventDefault(); event.stopImmediatePropagation();
        toast("オンライン版は現在シングルバトルです。","warn");
      }
    }
  },true);

  document.addEventListener("input",(event) => {
    const target = event.target;
    if (target.id === "v24-roster-search") {
      const query = target.value.toLowerCase();
      main()?.querySelectorAll("[data-v24-roster-name]").forEach((card) => {
        card.style.display = card.dataset.v24RosterName.includes(query) ? "" : "none";
      });
    }
    if (target.id === "v24-item-search") {
      const query = target.value.toLowerCase();
      const select = document.getElementById("held-item");
      if (select) Array.from(select.options).forEach((option) => {
        option.hidden = !!query && !option.textContent.toLowerCase().includes(query) && !option.value.toLowerCase().includes(query);
      });
    }
    if (target.matches("[data-v24-iv]")) {
      const mon = (S().owned || []).find((m) => m.uid === S().selectedOwned) || S().owned?.[0];
      if (!mon) return;
      const key = target.dataset.v24Iv;
      mon.ivs = mon.ivs || {};
      mon.ivs[key] = Math.max(0,Math.min(31,Number(target.value)));
      const label = main()?.querySelector('[data-v24-iv-value="' + key + '"]');
      if (label) label.textContent = target.value;
      updateTrainingPreview();
    }
    if (target.matches("[data-ev]")) updateTrainingPreview();
  });
  document.addEventListener("change",(event) => {
    if (event.target.matches("[data-v24-iv]")) save();
  });

  addNavigation();
  const onlineCssHint = document.createElement("style");
  onlineCssHint.textContent = ".v24-page{max-width:1320px;margin:0 auto}.v24-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:10px 0 20px}.v24-page-head h1{margin:5px 0;font-size:clamp(24px,3vw,34px)}.v24-page-head p{margin:5px 0;color:var(--muted,#9aa5c6);line-height:1.7}.v24-kicker{font-size:10px;font-weight:800;letter-spacing:.18em;color:#8da4ff}.v24-pill{border:1px solid #6074bc55;background:#657bbd18;color:#bfcaff;border-radius:30px;padding:7px 12px;white-space:nowrap;font-size:12px}.v24-team-panel,.v24-roster-panel,.v24-online-panel,.v24-iv-panel{background:var(--panel,#171a33);border:1px solid #8997d526;border-radius:18px;padding:18px;margin:14px 0}.v24-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.v24-panel-heading h2,.v24-online-panel h2{margin:4px 0}.v24-panel-heading p,.v24-online-panel p{font-size:13px;color:var(--muted,#a6b0cc);margin:4px 0}.v24-team-row{display:grid;grid-template-columns:repeat(6,minmax(118px,1fr));gap:10px;overflow-x:auto;padding:4px 2px 10px}.v24-team-slot{min-width:118px;min-height:190px;border:1px solid #7b8ed64a;border-radius:14px;padding:10px;background:#202747;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;text-align:center;touch-action:pan-y;user-select:none}.v24-team-slot.empty{justify-content:center;border-style:dashed;background:#131a31;color:#94a0c6}.v24-slot-num{align-self:flex-start;color:#91a3ed;font-size:11px;font-weight:800}.v24-slot-art{height:74px;display:flex;align-items:center;justify-content:center}.v24-slot-art img{max-width:72px;max-height:72px;object-fit:contain}.v24-team-slot>b{font-size:12px}.v24-team-slot>small{font-size:11px;color:#aeb8d5}.v24-slot-actions{display:flex;gap:4px;margin-top:auto}.v24-slot-actions button,.v24-card-actions button,.v24-secondary-btn,.v24-primary-btn,.v24-room-code button,.v24-online-battle-banner button{border:1px solid #7187c45c;border-radius:9px;padding:7px 9px;background:#2b365d;color:#edf1ff;font-weight:700;font-size:11px;cursor:pointer}.v24-primary-btn{background:#667eea;color:white;border:0;padding:10px 14px;font-size:13px}.v24-roster-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.v24-roster-card{display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center;border:1px solid #7587c13a;border-radius:13px;background:#1a203c;padding:10px;touch-action:pan-y;user-select:none}.v24-mon-art{height:66px;display:flex;align-items:center;justify-content:center}.v24-mon-art img{max-height:65px;max-width:65px;object-fit:contain}.v24-mon-copy{display:flex;flex-direction:column;gap:4px;min-width:0}.v24-mon-copy b{font-size:13px}.v24-mon-copy small{font-size:10px;color:#aeb9d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v24-card-actions{display:flex;grid-column:1/-1;gap:6px}.v24-card-actions button{flex:1}.v24-roster-search{max-width:250px}.v24-action-row,.v24-join-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}.v24-online-panel label{display:block;font-size:12px;color:#aeb9d6;margin:12px 0 5px}.v24-online-panel input{width:100%}.v24-join-row input{flex:1;min-width:150px}.v24-room-status{border:1px solid #8da3f033;background:#10182f;border-radius:13px;padding:14px;margin-top:15px;color:#c7d2f3}.v24-room-code{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:900;letter-spacing:.18em;margin-top:12px}.v24-status{font-size:10px;font-weight:900;border-radius:30px;padding:6px 10px;background:#27334f;color:#b6c5ff}.v24-status.error,.v24-status.disconnected{background:#552a3b;color:#ffd7e4}.v24-online-battle-banner{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#1c2850;border:1px solid #8298ef55;padding:10px 14px;margin:10px 0;border-radius:12px;color:#dce5ff}.v24-help-note,.v24-item-desc{display:block;color:#aab5d3;font-size:11px;line-height:1.7;margin:10px 0}.v24-dragging{opacity:.55;outline:2px dashed #8da4ff}.v24-drop-target{outline:2px solid #b3c0ff;background:#394c82!important}.v24-has-drag{cursor:grabbing}.v24-iv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.v24-iv-row{display:grid;grid-template-columns:80px 1fr 28px;align-items:center;gap:8px;border-radius:10px;background:#202746;padding:9px;font-size:12px}.v24-iv-row input{width:100%;accent-color:#8498ff}.v24-iv-row b{font-variant-numeric:tabular-nums}.v24-stat-preview{margin-top:14px;border:1px solid #7188cf30;border-radius:12px;padding:12px}.v24-preview-title{font-size:12px;font-weight:800;margin-bottom:9px}.v24-stat-line{display:grid;grid-template-columns:88px 42px 1fr;gap:8px;align-items:center;margin:7px 0;font-size:11px}.v24-stat-line b{font-size:13px}.v24-stat-line small{color:#9eacd1}.v24-stat-line i{grid-column:1/-1;height:5px;border-radius:9px;background:#ffffff12;overflow:hidden}.v24-stat-line em{display:block;height:100%;background:#7f95ef;border-radius:9px}.v24-nature-note{border:1px solid #8398e033;background:#7b91e012;border-radius:10px;padding:10px;margin:8px 0 12px}.v24-nature-note b{font-size:11px}.v24-nature-note p{font-size:12px;color:#bbc7e3;margin:4px 0 0}.v24-item-picker{margin-top:8px}.v24-item-picker input{width:100%;margin:6px 0}.v24-item-picker select{max-height:190px}.v24-online-panel .v24-action-row{margin-top:10px}@media(max-width:900px){.v24-team-row{grid-template-columns:repeat(6,128px)}.v24-page-head{align-items:flex-start}.v24-roster-search{max-width:100%}}@media(max-width:600px){.v24-iv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v24-page-head{flex-direction:column}.v24-page-head h1{font-size:24px}.v24-roster-grid{grid-template-columns:1fr}.v24-online-battle-banner{flex-wrap:wrap}}";
  document.head.appendChild(onlineCssHint);
  console.info("[v24] team builder, Showdown item UI, and casual online rooms loaded.");
})();