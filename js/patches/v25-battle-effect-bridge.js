/* v25: connect explicit move-effect records to battle execution and show ability activations. */
(() => {
  "use strict";

  const W = window;
  const API = W.PokemonChampions2D;
  const getState = () => API?.state || W.state || null;
  const slug = (value) => String(value ?? "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function battleLog(message) {
    if (typeof W.battleLog === "function") W.battleLog(message);
  }

  function statTarget(actor, target, effect) {
    return effect?.target === "self" ? actor : target;
  }

  function sameObject(a, b) {
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function mirroredByShowdownFields(move, effect) {
    const isSelf = effect.target === "self";
    const secondaries = [
      ...(Array.isArray(move.secondaries) ? move.secondaries : []),
      ...(move.secondary ? [move.secondary] : [])
    ];
    if (effect.type === "status") {
      if (isSelf && move.self?.status === effect.status) return true;
      if (!isSelf && move.status === effect.status) return true;
      return secondaries.some((part) =>
        part.status === effect.status && (!!part.self === isSelf));
    }
    if (effect.type === "volatile") {
      if (isSelf && move.self?.volatileStatus === effect.volatileStatus) return true;
      if (!isSelf && move.volatileStatus === effect.volatileStatus) return true;
      return secondaries.some((part) =>
        part.volatileStatus === effect.volatileStatus && (!!part.self === isSelf));
    }
    if (effect.type === "boost") {
      if (isSelf && (sameObject(move.self?.boosts, effect.boosts) ||
          sameObject(move.selfBoost?.boosts, effect.boosts))) return true;
      if (!isSelf && sameObject(move.boosts, effect.boosts)) return true;
      return secondaries.some((part) =>
        sameObject(part.boosts, effect.boosts) && (!!part.self === isSelf));
    }
    if (effect.type === "heal") {
      return isSelf && Array.isArray(move.heal) &&
        Number(move.heal[0]) === Number(effect.fraction) &&
        Number(move.heal[1]) === Number(effect.denominator);
    }
    if (effect.type === "weather") return move.weather === effect.weather;
    if (effect.type === "terrain") return move.terrain === effect.terrain;
    if (effect.type === "drain") return !!move.drain;
    if (effect.type === "recoil") return !!move.recoil;
    if (effect.type === "protect") return ["protect", "detect", "kingsshield", "spikyshield", "banefulbunker"].includes(slug(move.id));
    return false;
  }

  function sideOf(mon, battle) {
    if (!mon || !battle) return null;
    return (battle.playerTeam || []).some((entry) => entry?.uid === mon.uid) ? "player" : "enemy";
  }

  function forceSwitch(target, battle) {
    const side = sideOf(target, battle);
    if (!side) return false;
    const team = side === "player" ? battle.playerTeam : battle.enemyTeam;
    const active = side === "player" ? battle.playerActive : battle.enemyActive;
    const oldIndex = team.findIndex((mon) => mon?.uid === target.uid);
    const slot = active.indexOf(oldIndex);
    if (slot < 0) return false;
    const nextIndex = team.findIndex((mon, index) =>
      index !== oldIndex && mon && !mon.fainted && mon.hp > 0 && !active.includes(index));
    if (nextIndex < 0) return false;
    active[slot] = nextIndex;
    const next = team[nextIndex];
    battleLog(target.name + "は交代させられた！");
    if (typeof W.triggerEntryEffects === "function") {
      const opponents = side === "player"
        ? (battle.enemyActive || []).map((index) => battle.enemyTeam[index]).filter(Boolean)
        : (battle.playerActive || []).map((index) => battle.playerTeam[index]).filter(Boolean);
      W.triggerEntryEffects([next], opponents, battle);
    }
    return true;
  }

  function runExplicitMoveEffects(actor, target, move, battle) {
    if (!move || !Array.isArray(move.effects) || move._canonicalEffectsExplicit !== true) return;
    const state = getState();
    const abilityId = slug(actor?.abilityId);
    for (const raw of move.effects) {
      if (!raw || typeof raw !== "object" || mirroredByShowdownFields(move, raw)) continue;
      const effect = raw;
      const chance = Math.max(0, Math.min(100,
        Number(effect.chance ?? 100) * (abilityId === "serenegrace" && effect.target !== "self" ? 2 : 1)));
      if (chance < 100 && Math.random() * 100 >= chance) continue;
      const recipient = statTarget(actor, target, effect);
      switch (effect.type) {
        case "status":
          if (recipient && effect.status && typeof W.setStatus === "function") {
            W.setStatus(recipient, effect.status, W.getMoveName?.(move) || move.name || move.id);
          }
          break;
        case "volatile":
          if (recipient && effect.volatileStatus) {
            recipient.volatile = recipient.volatile || {};
            recipient.volatile[effect.volatileStatus] = true;
            battleLog(recipient.name + "に" + effect.volatileStatus + "の効果！");
          }
          break;
        case "boost":
          if (recipient && effect.boosts && typeof W.applyBoosts === "function") {
            W.applyBoosts(recipient, effect.boosts, W.getMoveName?.(move) || move.name || move.id);
          }
          break;
        case "heal":
          if (recipient) {
            const denominator = Math.max(1, Number(effect.denominator || 1));
            const numerator = Number(effect.fraction ?? effect.numerator ?? 1);
            const before = Number(recipient.hp || 0);
            const amount = Math.max(1, Math.floor(Number(recipient.maxhp || 1) * numerator / denominator));
            recipient.hp = Math.min(recipient.maxhp, before + amount);
            if (recipient.hp > before) battleLog(recipient.name + "はHPを" + (recipient.hp - before) + "回復した！");
          }
          break;
        case "drain":
        case "recoil": {
          const fraction = Number(effect.fraction ??
            (Number(effect.numerator || 0) / Math.max(1, Number(effect.denominator || 1))));
          const dealt = Number(actor?._lastMoveDamage || 0);
          if (actor && dealt > 0 && fraction > 0) {
            const amount = Math.max(1, Math.floor(dealt * fraction));
            if (effect.type === "drain") {
              const before = actor.hp;
              actor.hp = Math.min(actor.maxhp, actor.hp + amount);
              if (actor.hp > before) battleLog(actor.name + "はHPを" + (actor.hp - before) + "回復した！");
            } else {
              actor.hp = Math.max(0, actor.hp - amount);
              if (actor.hp <= 0) actor.fainted = true;
              battleLog(actor.name + "は反動で" + amount + "ダメージを受けた！");
            }
          }
          break;
        }
        case "weather":
          if (effect.weather && typeof W.applyWeather === "function") W.applyWeather(effect.weather, battle);
          break;
        case "terrain":
          if (effect.terrain && typeof W.applyTerrain === "function") W.applyTerrain(effect.terrain, battle);
          break;
        case "protect":
          if (actor) {
            actor.volatile = actor.volatile || {};
            actor.volatile.protected = true;
            battleLog(actor.name + "は身を守った！");
          }
          break;
        case "remove_status":
          if (recipient) {
            recipient.status = null;
            recipient.statusTurns = 0;
          }
          break;
        case "clear_boosts":
          if (recipient) {
            recipient.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
          }
          break;
        case "force_switch":
          if (recipient && recipient !== actor) forceSwitch(recipient, battle);
          break;
        case "type_change":
          if (recipient && Array.isArray(effect.types) && effect.types.length) {
            recipient.types = effect.types.slice();
            battleLog(recipient.name + "のタイプが変わった！");
          }
          break;
        case "field_condition": {
          const condition = String(effect.condition || effect.id || "");
          if (battle && condition) {
            const side = effect.target === "self" ? sideOf(actor, battle) : sideOf(target, battle);
            battle.sideConditions = battle.sideConditions || { player: {}, enemy: {} };
            if (side) {
              battle.sideConditions[side] = battle.sideConditions[side] || {};
              battle.sideConditions[side][condition] = effect.turns > 0
                ? Number(effect.turns)
                : (effect.value ?? true);
            }
          }
          break;
        }
        case "multi_hit":
        case "fixed_damage":
        case "ohko":
        case "custom":
        default:
          // These are handled before damage, require a dedicated mechanic, or have no safe generic rule.
          break;
      }
    }
    if (state) {
      state.v25BattleEffectBridge = {
        connected: true,
        lastMove: String(move.id || move.name || ""),
        explicitEffectCount: move.effects.length,
        timestamp: Date.now()
      };
    }
  }

  const originalApplyMoveExtras = W.applyMoveExtras;
  if (typeof originalApplyMoveExtras === "function") {
    W.applyMoveExtras = function(actor, target, move, battle) {
      const result = originalApplyMoveExtras.apply(this, arguments);
      try {
        runExplicitMoveEffects(actor, target, move, battle || getState()?.battle);
      } catch (error) {
        console.error("[v25 move-effect bridge]", error);
      }
      return result;
    };
  }

  // Explicit pre-damage effects are projected onto the existing battle engine fields.
  const originalExecuteAction = W.executeAction;
  if (typeof originalExecuteAction === "function") {
    W.executeAction = function(action, battle) {
      const move = W.getMove?.(action?.moveId);
      if (!move || move._canonicalEffectsExplicit !== true || !Array.isArray(move.effects)) {
        return originalExecuteAction.apply(this, arguments);
      }
      const changed = [];
      const setTemporary = (key, value) => {
        changed.push([key, Object.prototype.hasOwnProperty.call(move, key), move[key]]);
        move[key] = value;
      };
      for (const effect of move.effects) {
        if (!effect || typeof effect !== "object") continue;
        if (effect.type === "fixed_damage" && effect.value != null && move.damage == null) {
          setTemporary("damage", effect.value);
        } else if (effect.type === "ohko" && !move.ohko) {
          setTemporary("ohko", true);
        } else if (effect.type === "multi_hit" && !move.multihit) {
          const min = Math.max(1, Number(effect.min || effect.value || 2));
          const max = Math.max(min, Number(effect.max || min));
          setTemporary("multihit", min === max ? min : [min, max]);
        }
      }
      try {
        return originalExecuteAction.apply(this, arguments);
      } finally {
        for (let i = changed.length - 1; i >= 0; i--) {
          const [key, existed, previous] = changed[i];
          if (existed) move[key] = previous;
          else delete move[key];
        }
      }
    };
  }

  // Ability activation popup: the battle engine already resolves ability effects.
  // This connects its activation log to a visual notice with the Pokémon sprite and name.
  const style = document.createElement("style");
  style.textContent = [
    ".v25-ability-popup{position:fixed;z-index:10050;left:50%;bottom:clamp(105px,16vh,190px);transform:translate(-50%,18px) scale(.97);opacity:0;pointer-events:none;display:flex;align-items:center;gap:14px;min-width:min(330px,calc(100vw - 28px));max-width:min(460px,calc(100vw - 28px));padding:12px 18px;border:1px solid #9ab4ff88;border-radius:18px;background:linear-gradient(135deg,#17254cee,#10162cf5);box-shadow:0 16px 55px #0009;color:#f3f6ff;backdrop-filter:blur(12px);transition:opacity .22s ease,transform .22s ease}",
    ".v25-ability-popup.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}",
    ".v25-ability-face{width:68px;height:68px;flex:0 0 68px;display:grid;place-items:center;border-radius:16px;background:#91aaff22;border:1px solid #aabaff44;overflow:hidden}",
    ".v25-ability-face img{width:64px;height:64px;object-fit:contain;image-rendering:auto}",
    ".v25-ability-copy{display:flex;flex-direction:column;gap:4px;min-width:0}",
    ".v25-ability-kicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:#9eb6ff}",
    ".v25-ability-name{font-size:17px;font-weight:900;line-height:1.25;overflow-wrap:anywhere}",
    ".v25-ability-label{font-size:13px;color:#d6e0ff;font-weight:700}",
    "@media(prefers-reduced-motion:reduce){.v25-ability-popup{transition:none}}"
  ].join("");
  document.head.appendChild(style);

  const abilityQueue = [];
  let abilityPopupBusy = false;

  function queueAbilityPopup(mon, label) {
    if (!mon || !label || typeof W.speciesIcon !== "function") return;
    abilityQueue.push({ mon, label });
    if (!abilityPopupBusy) showNextAbilityPopup();
  }

  function showNextAbilityPopup() {
    const item = abilityQueue.shift();
    if (!item) {
      abilityPopupBusy = false;
      return;
    }
    abilityPopupBusy = true;
    let popup = document.getElementById("v25-ability-popup");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "v25-ability-popup";
      popup.className = "v25-ability-popup";
      popup.setAttribute("role", "status");
      popup.setAttribute("aria-live", "polite");
      document.body.appendChild(popup);
    }
    let sprite = "";
    try { sprite = W.speciesIcon(item.mon, false, false); } catch (_) {}
    popup.innerHTML =
      '<div class="v25-ability-face">' + sprite + "</div>" +
      '<div class="v25-ability-copy"><span class="v25-ability-kicker">ABILITY ACTIVATED</span>' +
      '<b class="v25-ability-name">' + escapeHtml(item.mon.name || "ポケモン") + "</b>" +
      '<span class="v25-ability-label">特性：' + escapeHtml(item.label) + "</span></div>";
    popup.classList.remove("is-visible");
    void popup.offsetWidth;
    popup.classList.add("is-visible");
    window.setTimeout(() => {
      popup.classList.remove("is-visible");
      window.setTimeout(showNextAbilityPopup, 260);
    }, 1750);
  }

  function findAbilityActivation(message) {
    const state = getState();
    const battle = state?.battle;
    if (!battle || typeof message !== "string" || !message) return null;
    const roster = [...(battle.playerTeam || []), ...(battle.enemyTeam || [])];
    for (const mon of roster) {
      if (!mon || !mon.name || !mon.abilityId || slug(mon.abilityId) === "none") continue;
      const key = slug(mon.abilityId);
      const localName = typeof W.abilityName === "function" ? W.abilityName(mon.abilityId) : "";
      const remote = state?.data?.upstreamMechanics?.abilitiesById?.[key];
      const labels = [localName, remote?.name, mon.abilityName]
        .filter((value) => typeof value === "string" && value.trim().length > 1);
      if (!message.includes(String(mon.name))) continue;
      const label = labels.find((value) => message.includes(value));
      if (label) return { mon, label: localName || label };
    }
    return null;
  }

  const originalBattleLog = W.battleLog;
  if (typeof originalBattleLog === "function") {
    W.battleLog = function(message) {
      const result = originalBattleLog.apply(this, arguments);
      try {
        const activation = findAbilityActivation(String(message ?? ""));
        if (activation) queueAbilityPopup(activation.mon, activation.label);
      } catch (error) {
        console.warn("[v25 ability popup]", error);
      }
      return result;
    };
  }

  const state = getState();
  if (state) {
    const moves = Object.values(state.data?.movesById || state.data?.moves || {});
    state.v25BattleEffectBridgeAudit = {
      version: "v25",
      moveRecords: moves.length,
      explicitEffectMoves: moves.filter((move) =>
        move?._canonicalEffectsExplicit === true && Array.isArray(move.effects) && move.effects.length
      ).length,
      connected: typeof W.applyMoveExtras === "function",
      abilityPopupConnected: typeof W.battleLog === "function" && typeof W.speciesIcon === "function"
    };
  }
  console.info("[v25] move-effect execution bridge and ability activation popup loaded.");
})();
