/* v26: make Protosynthesis / Quark Drive activation visible and preserve Booster Energy under active weather/terrain. */
(() => {
  "use strict";

  const W = window;
  const state = () => W.PokemonChampions2D?.state || W.state || null;
  const slug = (value) => String(value ?? "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const statNames = {
    atk: "こうげき",
    def: "ぼうぎょ",
    spa: "とくこう",
    spd: "とくぼう",
    spe: "すばやさ"
  };

  function abilityId(mon) {
    const raw = mon?.abilityId || "";
    return slug(typeof W.v21CanonAbilityId === "function" ? W.v21CanonAbilityId(raw) : raw);
  }

  function itemId(mon) {
    const raw = mon?.heldItem || "";
    return slug(typeof W.itemSlug === "function" ? W.itemSlug(raw) : raw);
  }

  function fieldActive(mon, battle) {
    const ability = abilityId(mon);
    return (ability === "quarkdrive" && battle?.terrain === "electric") ||
      (ability === "protosynthesis" && battle?.weather === "sun");
  }

  function abilitySuppressed(mon, battle) {
    if (!mon || Number(mon._abilityDisabledTurns || 0) > 0) return true;
    const all = [
      ...(battle?.playerActive || []).map((index) => battle?.playerTeam?.[index]),
      ...(battle?.enemyActive || []).map((index) => battle?.enemyTeam?.[index])
    ].filter(Boolean);
    return all.some((other) => other.uid !== mon.uid &&
      abilityId(other) === "neutralizinggas" &&
      Number(other._abilityDisabledTurns || 0) <= 0);
  }

  function currentParadoxMode(mon, battle) {
    if (!mon || abilitySuppressed(mon, battle)) return null;
    if (mon._paradoxActiveByItem) return "booster";
    if (fieldActive(mon, battle)) return "field";
    return null;
  }

  function announceParadox(mon, battle) {
    if (!mon || !battle) return;
    const mode = currentParadoxMode(mon, battle);
    if (!mode) {
      mon._v26ParadoxPopupMode = null;
      return;
    }

    const stat = mon._paradoxStat;
    if (!stat || !statNames[stat]) return;
    if (mon._v26ParadoxPopupMode === mode) return;
    mon._v26ParadoxPopupMode = mode;

    const name = typeof W.abilityName === "function"
      ? W.abilityName(mon.abilityId)
      : (abilityId(mon) === "quarkdrive" ? "クォークチャージ" : "こだいかっせい");
    const multiplier = stat === "spe" ? "1.5倍" : "1.3倍";
    const source = mode === "booster" ? "ブーストエナジー" : "天候・フィールド";
    if (typeof W.battleLog === "function") {
      W.battleLog(mon.name + "の「" + name + "」！ " + source + "で" +
        statNames[stat] + "が" + multiplier + "になった！");
    }
  }

  function activeParadoxMons(battle) {
    if (!battle) return [];
    return [
      ...(battle.playerActive || []).map((index) => battle.playerTeam?.[index]),
      ...(battle.enemyActive || []).map((index) => battle.enemyTeam?.[index])
    ].filter((mon) => mon && !mon.fainted && mon.hp > 0 &&
      ["quarkdrive", "protosynthesis"].includes(abilityId(mon)));
  }

  function recalculateParadoxActivations(battle) {
    if (!battle || typeof W.currentStat !== "function") return;
    for (const mon of activeParadoxMons(battle)) {
      try {
        // A stat read runs the existing shared Quark Drive / Protosynthesis modifier.
        // The modifier chooses the highest non-HP stat and applies the multiplier.
        W.currentStat(mon, "atk");
        announceParadox(mon, battle);
      } catch (error) {
        console.warn("[v26 paradox activation]", mon.name, error);
      }
    }
  }

  // If the Paradox ability is already activated by Electric Terrain / sun,
  // Booster Energy must remain held rather than being consumed as a second source.
  const originalCurrentStat = W.currentStat;
  if (typeof originalCurrentStat === "function") {
    W.currentStat = function(mon, key) {
      const battle = state()?.battle;
      const oldItem = mon?.heldItem;
      const maskBooster = !!mon && itemId(mon) === "boosterenergy" &&
        fieldActive(mon, battle);
      let result;
      if (maskBooster) mon.heldItem = "";
      try {
        result = originalCurrentStat.apply(this, arguments);
      } finally {
        if (maskBooster) mon.heldItem = oldItem;
      }
      if (mon && battle) announceParadox(mon, battle);
      return result;
    };
  }

  const originalEntryEffects = W.triggerEntryEffects;
  if (typeof originalEntryEffects === "function") {
    W.triggerEntryEffects = function(entering, foes, battle) {
      const result = originalEntryEffects.apply(this, arguments);
      const currentBattle = battle || state()?.battle;
      if (currentBattle) {
        // Also refresh active partners: entry abilities can create the terrain/weather.
        recalculateParadoxActivations(currentBattle);
      }
      return result;
    };
  }

  const originalApplyTerrain = W.applyTerrain;
  if (typeof originalApplyTerrain === "function") {
    W.applyTerrain = function(terrain, battle) {
      const result = originalApplyTerrain.apply(this, arguments);
      recalculateParadoxActivations(battle || state()?.battle);
      return result;
    };
  }

  const originalApplyWeather = W.applyWeather;
  if (typeof originalApplyWeather === "function") {
    W.applyWeather = function(weather, battle) {
      const result = originalApplyWeather.apply(this, arguments);
      recalculateParadoxActivations(battle || state()?.battle);
      return result;
    };
  }

  // Put the boosted stat and multiplier directly under the Pokémon's ability in battle HUD.
  const originalBattleRenderer = W.renderBattlePage;
  if (typeof originalBattleRenderer === "function") {
    W.renderBattlePage = function() {
      let html = originalBattleRenderer.apply(this, arguments);
      const battle = state()?.battle;
      if (!battle) return html;

      for (const mon of activeParadoxMons(battle)) {
        const mode = currentParadoxMode(mon, battle);
        const stat = mon._paradoxStat;
        if (!mode || !stat || !statNames[stat]) continue;
        const name = typeof W.abilityName === "function"
          ? W.abilityName(mon.abilityId)
          : (abilityId(mon) === "quarkdrive" ? "クォークチャージ" : "こだいかっせい");
        const needle = '<span class="ability-mini">特性：' + escapeHtml(name) + "</span>";
        const multiplier = stat === "spe" ? "×1.5" : "×1.3";
        const indicator = '<span class="v26-paradox-indicator">強化中：' +
          statNames[stat] + " " + multiplier + "</span>";
        html = html.replace(needle, needle + indicator);
      }
      return html;
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  const style = document.createElement("style");
  style.textContent = [
    ".v26-paradox-indicator{display:inline-flex;align-items:center;margin-left:7px;padding:2px 7px;border:1px solid #a2c9ff66;border-radius:999px;background:#6699ff20;color:#d9e8ff;font-size:10px;font-weight:800;white-space:nowrap}",
    ".v26-paradox-indicator::before{content:'✦';margin-right:4px;color:#a9c7ff}"
  ].join("");
  document.head.appendChild(style);

  const current = state();
  if (current) {
    current.v26ParadoxAudit = {
      version: "v26",
      quarkDriveDataPresent: !!current.data?.dexById?.["iron-moth"],
      boosterEnergyItemAvailableInTraining: true,
      activationHook: typeof W.triggerEntryEffects === "function" &&
        typeof W.currentStat === "function",
      battleHudIndicator: typeof W.renderBattlePage === "function",
      note: "Battle-browser verification is still required."
    };
  }
  console.info("[v26] Paradox ability activation, visible stat boost, and terrain/Booster Energy precedence loaded.");

  W.PokemonChampions2D && (W.PokemonChampions2D.v26ParadoxAudit = current?.v26ParadoxAudit || null);
})();
