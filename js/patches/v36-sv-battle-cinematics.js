/* v36: SV-style paced battle cinematics, entry weather and stat feedback. */
(() => {
  "use strict";

  const W = window;
  const R = W.PokemonChampions2DBattleRuntime || {};
  const currentBattle = () => R.getBattle?.() || W.PokemonChampions2D?.state?.battle || W.state?.battle || null;
  const doc = W.document || document;
  const timers = W.setTimeout ? W.setTimeout.bind(W) : setTimeout;
  const reducedMotion = () => !!(W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const delay = (ms) => new Promise((resolve) => timers(resolve, reducedMotion() ? Math.min(35, ms) : ms));
  const STAT_NAMES = {
    atk: "こうげき", def: "ぼうぎょ", spa: "とくこう", spd: "とくぼう",
    spe: "すばやさ", accuracy: "命中率", evasion: "回避率"
  };
  const WEATHER_NAMES = {
    rain: "雨", sun: "強い日差し", sand: "砂あらし", snow: "雪"
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function activeEntries(battle) {
    if (!battle) return [];
    const entries = [];
    for (const side of ["player", "enemy"]) {
      const team = side === "player" ? battle.playerTeam : battle.enemyTeam;
      const active = side === "player" ? battle.playerActive : battle.enemyActive;
      (active || []).forEach((index, slot) => {
        const mon = team?.[index];
        if (mon && !mon.fainted && Number(mon.hp) > 0) entries.push({ side, slot, mon });
      });
    }
    return entries;
  }

  function queueEntryTask(battle, task) {
    if (!battle || typeof task !== "function") return;
    battle._v36EntryTasks = battle._v36EntryTasks || [];
    battle._v36EntryTasks.push(task);
    startEntryQueue(battle);
  }

  function startEntryQueue(battle) {
    if (!battle || battle._v36EntryRunning || battle._v36DeferEntryUntilIntro) return;
    if (!battle._v36EntryTasks?.length) return;
    battle._v36EntryRunning = true;
    const run = async () => {
      try {
        while (battle._v36EntryTasks?.length) {
          const task = battle._v36EntryTasks.shift();
          try { await task(); }
          catch (error) { console.warn("[v36 entry cinematic]", error); }
        }
      } finally {
        battle._v36EntryRunning = false;
        battle._v36EntryCinematicPromise = null;
        if (battle._v36EntryTasks?.length && !battle._v36DeferEntryUntilIntro) startEntryQueue(battle);
      }
    };
    battle._v36EntryCinematicPromise = run();
  }

  function ensureWeatherLayer() {
    const field = doc.querySelector?.(".battlefield");
    if (!field || field.querySelector?.(".v36-weather-layer")) return;
    const layer = doc.createElement("div");
    layer.className = "v36-weather-layer";
    layer.setAttribute("aria-hidden", "true");
    field.appendChild(layer);
  }

  function showWeatherIntro(battle, weather, sourceName) {
    const field = doc.querySelector?.(".battlefield");
    if (!field) return;
    ensureWeatherLayer();
    field.classList.remove("v36-weather-enter");
    void field.offsetWidth;
    field.classList.add("v36-weather-enter");
    let banner = field.querySelector?.(".v36-weather-banner");
    if (!banner) {
      banner = doc.createElement("div");
      banner.className = "v36-weather-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      field.appendChild(banner);
    }
    const weatherLabel = WEATHER_NAMES[weather] || "天候";
    banner.innerHTML = '<span>WEATHER EFFECT</span><b>' + escapeHtml(weatherLabel) +
      (weather === "rain" ? "が 降り始めた！" : weather === "sun" ? "になった！" : "が 広がった！") +
      '</b><small>' + escapeHtml(sourceName || "天候が変化した") + "</small>";
    banner.classList.remove("is-visible");
    void banner.offsetWidth;
    banner.classList.add("is-visible");
    return delay(5000).then(() => {
      field.classList.remove("v36-weather-enter");
      banner.classList.remove("is-visible");
      timers(() => banner?.remove(), 420);
    });
  }

  function showStatVisual(event) {
    const field = doc.querySelector?.(".battlefield");
    const fx = doc.querySelector?.("#battle-fx");
    if (!field || !fx || !event) return Promise.resolve();
    const side = event.side || "player";
    const slot = Number(event.slot || 0);
    const monNode = doc.querySelector?.("#mon-" + side + "-" + slot);
    if (!monNode) return Promise.resolve();
    const fr = field.getBoundingClientRect();
    const mr = monNode.getBoundingClientRect();
    const node = doc.createElement("div");
    const positive = Number(event.delta || 0) > 0;
    node.className = "v36-stat-float " + (positive ? "is-up" : "is-down");
    node.style.left = (mr.left + mr.width * 0.5 - fr.left) + "px";
    node.style.top = (mr.top + mr.height * 0.32 - fr.top) + "px";
    const heading = doc.createElement("b");
    heading.textContent = event.title || (event.stat ? STAT_NAMES[event.stat] || event.stat : "能力");
    const detail = doc.createElement("span");
    detail.textContent = event.detail || ((positive ? "↑ " : "↓ ") +
      (Math.abs(Number(event.delta || 0)) >= 2 ? "ぐーんと" : "") +
      (positive ? "上昇" : "下降"));
    node.appendChild(heading);
    node.appendChild(detail);
    fx.appendChild(node);
    const duration = reducedMotion() ? 90 : Number(event.duration || 1250);
    if (typeof node.animate === "function") {
      const animation = node.animate([
        { opacity: 0, transform: "translate(-50%, 18px) scale(.78)" },
        { opacity: 1, offset: 0.18, transform: "translate(-50%, 0) scale(1.04)" },
        { opacity: 1, offset: 0.72, transform: "translate(-50%, -18px) scale(1)" },
        { opacity: 0, transform: "translate(-50%, -40px) scale(.92)" }
      ], { duration, easing: "cubic-bezier(.18,.72,.18,1)", fill: "forwards" });
      return animation.finished.catch(() => {}).then(() => node.remove());
    }
    return new Promise((resolve) => timers(() => { node.remove(); resolve(); }, duration));
  }

  function recordBoostChanges(target, before, sourceName, battle) {
    if (!battle || !target) return;
    const side = (battle.playerTeam || []).some((mon) => mon?.uid === target.uid) ? "player" : "enemy";
    const team = side === "player" ? battle.playerTeam : battle.enemyTeam;
    const active = side === "player" ? battle.playerActive : battle.enemyActive;
    const index = team.findIndex((mon) => mon?.uid === target.uid);
    const slot = (active || []).indexOf(index);
    if (slot < 0) return;
    for (const [stat, value] of Object.entries(target.stages || {})) {
      const delta = Number(value || 0) - Number(before?.[stat] || 0);
      if (!delta) continue;
      battle._v36PendingStatEvents = battle._v36PendingStatEvents || [];
      battle._v36PendingStatEvents.push({
        side, slot, stat, delta,
        title: STAT_NAMES[stat] || stat,
        detail: (delta > 0 ? "↑ " : "↓ ") + (Math.abs(delta) >= 2 ? "ぐーんと" : "") +
          (delta > 0 ? "上がった！" : "下がった！"),
        source: sourceName || ""
      });
    }
  }

  async function flushPendingStatVisuals(battle) {
    if (!battle || battle._v36FlushingStats || !battle._v36PendingStatEvents?.length) return;
    battle._v36FlushingStats = true;
    try {
      while (battle._v36PendingStatEvents?.length) {
        await showStatVisual(battle._v36PendingStatEvents.shift());
      }
    } finally {
      battle._v36FlushingStats = false;
    }
  }

  function queueParadoxVisuals(battle) {
    for (const { mon, side, slot } of activeEntries(battle)) {
      const ability = String(mon.abilityId || "").toLowerCase().replace(/[^a-z]/g, "");
      if (ability !== "quarkdrive" && ability !== "protosynthesis") continue;
      const mode = mon._v26ParadoxPopupMode || null;
      if (!mode || !mon._paradoxStat || mon._v36LastParadoxMode === mode) continue;
      mon._v36LastParadoxMode = mode;
      const stat = mon._paradoxStat;
      const multiplier = stat === "spe" ? "×1.5" : "×1.3";
      const label = ability === "quarkdrive" ? "クォークチャージ" : "こだいかっせい";
      queueEntryTask(battle, async () => {
        await delay(650);
        await showStatVisual({
          side, slot, stat, delta: 1, title: label,
          detail: (STAT_NAMES[stat] || stat) + " " + multiplier + " 強化！",
          duration: 1500
        });
      });
    }
  }

  function queueWeatherVisual(battle, weather, sourceName) {
    if (!battle || !weather) return;
    queueEntryTask(battle, async () => {
      // The ability popup has its own presentation. Leave a clear beat after it.
      await delay(1850);
      await showWeatherIntro(battle, weather, sourceName);
    });
  }

  function updateBattleHtml(html, battle) {
    if (typeof html !== "string" || !battle) return html;
    if (!html.includes('class="battlefield')) return html;
    if (!html.includes('class="v36-weather-layer"')) {
      html = html.replace('<div class="battle-stars"></div>',
        '<div class="battle-stars"></div><div class="v36-weather-layer" aria-hidden="true"></div>');
    }

    const active = activeEntries(battle);
    const currentUids = new Set();
    battle._v36HpSnapshot = battle._v36HpSnapshot || new Map();
    for (const entry of active) {
      const { side, slot, mon } = entry;
      const uid = String(mon.uid || (side + "-" + slot));
      currentUids.add(uid);
      const maxHp = Math.max(1, Number(mon.maxhp || mon.stats?.hp || 1));
      const percent = Math.max(0, Math.min(100, Number(mon.hp || 0) / maxHp * 100));
      const previous = battle._v36HpSnapshot.get(uid);
      if (previous && Math.abs(previous.percent - percent) > 0.05) {
        const motion = percent < previous.percent ? "drain" : "recover";
        const pattern = new RegExp('(<div class="combat-info ' + side + ' slot-' + slot + '"[^>]*)(>)');
        html = html.replace(pattern, (match, opening, close) => {
          const extraStyle = "--v36-hp-from:" + previous.percent.toFixed(2) +
            "%;--v36-hp-to:" + percent.toFixed(2) + "%;";
          if (/\sstyle="/.test(opening)) {
            opening = opening.replace(/\sstyle="([^"]*)"/, (styleMatch, styleText) =>
              ' style="' + styleText + ";" + extraStyle + '"');
          } else {
            opening += ' style="' + extraStyle + '"';
          }
          return opening + ' data-v36-hp-motion="' + motion + '"' + close;
        });
      }
      battle._v36HpSnapshot.set(uid, { percent, side, slot });
    }
    for (const uid of [...battle._v36HpSnapshot.keys()]) {
      if (!currentUids.has(uid)) battle._v36HpSnapshot.delete(uid);
    }
    return html;
  }

  function wrap(name, factory) {
    const original = W[name];
    if (typeof original !== "function" || original._v36Wrapped) return;
    const replacement = factory(original);
    replacement._v36Wrapped = true;
    replacement._v36Original = original;
    W[name] = replacement;
  }

  wrap("renderBattlePage", (original) => function() {
    const html = original.apply(this, arguments);
    return updateBattleHtml(html, currentBattle());
  });

  wrap("applyBoosts", (original) => function(target, boosts, sourceName) {
    const battle = currentBattle();
    const before = { ...(target?.stages || {}) };
    const result = original.apply(this, arguments);
    recordBoostChanges(target, before, sourceName, battle);
    return result;
  });

  wrap("triggerEntryEffects", (original) => function(entering, foes, battleArg) {
    const battle = battleArg || currentBattle();
    const previousWeather = battle?.weather || null;
    const result = original.apply(this, arguments);
    if (!battle) return result;
    const nextWeather = battle.weather || null;
    if (nextWeather && nextWeather !== previousWeather) {
      const source = (entering || []).find((mon) => mon &&
        ["drizzle", "drought", "sandstream", "snowwarning"].includes(
          String(mon.abilityId || "").toLowerCase().replace(/[^a-z]/g, "")
        ));
      queueWeatherVisual(battle, nextWeather, source?.name || "特性が発動した");
    }
    queueParadoxVisuals(battle);
    return result;
  });

  wrap("applyWeather", (original) => function(weather, battleArg) {
    const battle = battleArg || currentBattle();
    const previous = battle?.weather || null;
    const result = original.apply(this, arguments);
    if (battle && battle.weather && battle.weather !== previous) {
      queueWeatherVisual(battle, battle.weather, "技・特性による天候変化");
      queueParadoxVisuals(battle);
    }
    return result;
  });

  wrap("applyTerrain", (original) => function(terrain, battleArg) {
    const result = original.apply(this, arguments);
    queueParadoxVisuals(battleArg || currentBattle());
    return result;
  });

  wrap("beginBattleIntro", (original) => function(battle) {
    const current = battle || currentBattle();
    if (current) {
      current._v36IntroStarted = true;
      current._v36DeferEntryUntilIntro = true;
    }
    const result = original.apply(this, arguments);
    if (current) {
      const wait = reducedMotion() ? 100 : 8050;
      timers(() => {
        current._v36DeferEntryUntilIntro = false;
        startEntryQueue(current);
      }, wait);
    }
    return result;
  });

  wrap("battleCinematicPause", (original) => async function(ms) {
    const battle = currentBattle();
    if (battle?._v36EntryCinematicPromise) {
      await battle._v36EntryCinematicPromise.catch(() => {});
    }
    await flushPendingStatVisuals(battle);
    const duration = reducedMotion() ? ms : Math.round(Math.max(0, Number(ms) || 0) * 1.22);
    return original.call(this, duration);
  });

  wrap("executeTurn", (original) => async function(actions) {
    const battle = currentBattle();
    if (battle?._v36EntryCinematicPromise) {
      await battle._v36EntryCinematicPromise.catch(() => {});
    }
    return original.apply(this, arguments);
  });

  wrap("setBattleCamera", (original) => function(side, slot, title, subtitle) {
    const result = original.apply(this, arguments);
    const field = doc.querySelector?.(".battlefield");
    if (field) {
      field.classList.remove("v36-camera-attacker", "v36-camera-defender");
      const label = String(title || "");
      const detail = String(subtitle || "");
      if (detail.includes("が技を放つ") || label === "BATTLE") {
        field.classList.add("v36-camera-attacker");
      } else if (/HIT|MISS|BLOCKED|EFFECT|IMPACT|CRITICAL|SUPER EFFECTIVE|NOT VERY EFFECTIVE/.test(label)) {
        field.classList.add("v36-camera-defender");
      } else {
        field.classList.add("v36-camera-attacker");
      }
    }
    return result;
  });

  wrap("clearBattleCamera", (original) => function() {
    const field = doc.querySelector?.(".battlefield");
    field?.classList.remove("v36-camera-attacker", "v36-camera-defender");
    return original.apply(this, arguments);
  });

  wrap("animateCinematicProjectile", (original) => async function() {
    const battle = currentBattle();
    await flushPendingStatVisuals(battle);
    const result = await original.apply(this, arguments);
    if (!reducedMotion()) await delay(260);
    return result;
  });

  wrap("animateCinematicPulse", (original) => async function() {
    const battle = currentBattle();
    await flushPendingStatVisuals(battle);
    const result = await original.apply(this, arguments);
    if (!reducedMotion()) await delay(180);
    return result;
  });

  const style = doc.createElement("style");
  style.textContent = [
    ".battlefield{--v36-weather-warm:transparent}",
    ".v36-weather-layer{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .55s ease}",
    ".weather-rain .v36-weather-layer,.weather-sun .v36-weather-layer,.weather-sand .v36-weather-layer,.weather-snow .v36-weather-layer{opacity:.4}",
    ".weather-rain.v36-weather-enter .v36-weather-layer{opacity:.92}",
    ".weather-rain .v36-weather-layer:before,.weather-rain .v36-weather-layer:after{content:'';position:absolute;inset:-35%;background:repeating-linear-gradient(105deg,transparent 0 13px,#d9f7ff9c 14px 15px,transparent 16px 27px);transform:rotate(0deg);animation:v36RainFall .62s linear infinite}",
    ".weather-rain .v36-weather-layer:after{opacity:.42;background-size:25px 37px;animation-duration:.9s;animation-delay:-.3s}",
    ".weather-rain.v36-weather-enter .v36-weather-layer:before{background-image:repeating-linear-gradient(105deg,transparent 0 8px,#e9fbffbb 9px 10px,transparent 11px 19px);animation-duration:.38s}",
    ".weather-sun .v36-weather-layer{background:radial-gradient(ellipse at 68% 8%,#fff3ae8a,transparent 53%),linear-gradient(180deg,#ffe79c24,transparent 63%)}",
    ".weather-sun .v36-weather-layer:before{content:'';position:absolute;inset:-35%;background:repeating-conic-gradient(from -12deg at 68% 5%,#fff4bd24 0deg 5deg,transparent 5deg 17deg);animation:v36SunGlow 7s ease-in-out infinite alternate}",
    ".weather-sun.v36-weather-enter .v36-weather-layer{opacity:1;filter:brightness(1.35)}",
    ".weather-sand .v36-weather-layer:before{content:'';position:absolute;inset:-10%;background:repeating-linear-gradient(8deg,transparent 0 17px,#e9c48743 18px 20px,transparent 21px 39px);animation:v36SandSweep 1.8s linear infinite}",
    ".weather-snow .v36-weather-layer:before,.weather-snow .v36-weather-layer:after{content:'';position:absolute;inset:-20%;background-image:radial-gradient(circle,#fff 0 1.4px,transparent 2px),radial-gradient(circle,#d8efff 0 1px,transparent 1.8px);background-size:47px 53px,79px 91px;background-position:0 0,21px 17px;animation:v36SnowFall 4s linear infinite}",
    ".weather-snow .v36-weather-layer:after{opacity:.55;background-size:31px 37px,67px 72px;animation-duration:6s}",
    ".v36-weather-banner{position:absolute;z-index:30;top:16%;left:50%;width:min(440px,88%);padding:15px 20px;text-align:center;border:1px solid #dff6ff70;border-radius:15px;background:linear-gradient(120deg,#0a1427ed,#17284aeb);box-shadow:0 12px 45px #0009,0 0 30px #c9efff25;backdrop-filter:blur(9px);opacity:0;transform:translate(-50%,-12px) scale(.94);pointer-events:none;transition:opacity .32s,transform .42s cubic-bezier(.18,.7,.2,1)}",
    ".v36-weather-banner.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}",
    ".v36-weather-banner>span{display:block;color:#a9eaff;font:800 9px 'Barlow Condensed',sans-serif;letter-spacing:.22em;margin-bottom:4px}",
    ".v36-weather-banner>b{display:block;color:#fff;font-size:clamp(17px,3.5vw,25px);font-weight:900;text-shadow:0 0 18px #d7f6ff77}",
    ".v36-weather-banner>small{display:block;margin-top:5px;color:#c8d6f0;font-size:10px}",
    ".v36-stat-float{position:absolute;z-index:24;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:120px;padding:8px 13px;border-radius:12px;background:#091327eF;border:1px solid currentColor;box-shadow:0 8px 24px #0009;pointer-events:none;white-space:nowrap;transform:translate(-50%,0)}",
    ".v36-stat-float b{font-size:13px;font-weight:900}.v36-stat-float span{font-size:11px;font-weight:800}",
    ".v36-stat-float.is-up{color:#ffb174;text-shadow:0 0 13px #ff734c70}.v36-stat-float.is-down{color:#86caff;text-shadow:0 0 13px #55aaff80}",
    ".v36-stat-float.is-up:before{content:'▲';color:#ff8659}.v36-stat-float.is-down:before{content:'▼';color:#63b9ff}",
    ".combat-info[data-v36-hp-motion='drain'] .hp-track i{animation:v36HpDrain 1.35s cubic-bezier(.18,.68,.2,1) both}",
    ".combat-info[data-v36-hp-motion='recover'] .hp-track i{animation:v36HpRecover 1.25s cubic-bezier(.18,.68,.2,1) both}",
    "@keyframes v36HpDrain{from{width:var(--v36-hp-from)}to{width:var(--v36-hp-to)}}",
    "@keyframes v36HpRecover{from{width:var(--v36-hp-from)}to{width:var(--v36-hp-to)}}",
    ".battlefield.v36-camera-attacker .battle-mon.cine-selected{z-index:16;transform:translate(6%,-3%) scale(1.62);filter:drop-shadow(0 0 28px #78eaff88) drop-shadow(0 16px 9px #000a);transition:transform .48s cubic-bezier(.18,.72,.18,1),filter .35s}",
    ".battlefield.v36-camera-defender .battle-mon.cine-selected{z-index:16;transform:translate(-5%,2%) scale(1.58);filter:drop-shadow(0 0 30px #ffb0d888) drop-shadow(0 16px 9px #000a);transition:transform .48s cubic-bezier(.18,.72,.18,1),filter .35s}",
    ".battlefield.v36-camera-attacker .battle-mon:not(.cine-selected),.battlefield.v36-camera-defender .battle-mon:not(.cine-selected){opacity:.12;filter:brightness(.38) blur(1.4px);transition:opacity .35s,filter .35s}",
    ".battlefield.v36-camera-attacker .battle-platform:not(.player),.battlefield.v36-camera-defender .battle-platform:not(.enemy){opacity:.18}",
    "#v25-ability-popup{min-width:min(320px,90vw);padding:15px 20px;border-color:#b9eaff99;box-shadow:0 12px 38px #000a,0 0 32px #79dfff35}",
    "#v25-ability-popup .v25-ability-name{font-size:20px}#v25-ability-popup .v25-ability-label{font-size:14px}",
    ".v26-paradox-indicator{border-color:#ffbc7188!important;background:#ff9b4324!important;color:#ffe0ae!important;animation:v36ParadoxPulse 1.3s ease-in-out infinite alternate}",
    "@keyframes v36RainFall{from{transform:translate3d(-2%, -5%, 0)}to{transform:translate3d(5%, 18%, 0)}}",
    "@keyframes v36SnowFall{from{transform:translate3d(0,-10%,0)}to{transform:translate3d(2%,12%,0)}}",
    "@keyframes v36SandSweep{from{transform:translateX(-5%)}to{transform:translateX(5%)}}",
    "@keyframes v36SunGlow{from{opacity:.5;transform:scale(.96)}to{opacity:1;transform:scale(1.05)}}",
    "@keyframes v36ParadoxPulse{from{box-shadow:0 0 0 #ffbb7100}to{box-shadow:0 0 13px #ffbb7144}}",
    "@media(max-width:700px){.battlefield.v36-camera-attacker .battle-mon.cine-selected{transform:translate(5%,-1%) scale(1.34)}.battlefield.v36-camera-defender .battle-mon.cine-selected{transform:translate(-4%,1%) scale(1.32)}.v36-weather-banner{top:20%;padding:12px 14px}.v36-stat-float{min-width:108px;padding:7px 10px}}",
    "@media(prefers-reduced-motion:reduce){.v36-weather-layer,.v36-weather-banner,.v36-stat-float,.combat-info[data-v36-hp-motion] .hp-track i{animation:none!important;transition:none!important}}"
  ].join("\n");
  doc.head?.appendChild(style);

  const battle = currentBattle();
  if (battle) {
    battle._v36HpSnapshot = battle._v36HpSnapshot || new Map();
  }

  W.PokemonChampions2DSVCinematics = {
    version: 36,
    queueEntryTask,
    startEntryQueue,
    flushPendingStatVisuals,
    showWeatherIntro,
    showStatVisual,
    audit: () => ({
      version: 36,
      renderHook: typeof W.renderBattlePage === "function",
      entryHook: typeof W.triggerEntryEffects === "function",
      boostHook: typeof W.applyBoosts === "function",
      cameraHook: typeof W.setBattleCamera === "function",
      hpAnimation: true,
      weatherLayers: true,
      note: "Battle browser verification is still required."
    })
  };
  console.info("[v36] SV-style battle cinematics and weather/stat visuals loaded.");
})();