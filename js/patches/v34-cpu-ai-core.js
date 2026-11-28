(function installCpuAiCore() {
  'use strict';

  const runtime = window.PokemonChampions2DBattleRuntime;
  if (!runtime || typeof runtime.getMove !== 'function' ||
      typeof runtime.calcStats !== 'function' ||
      typeof runtime.resolveContextMoveData !== 'function') {
    console.error('[CPU AI] Battle runtime bridge is unavailable; CPU enhancements were not installed.');
    return;
  }

  const STORAGE_KEY = 'pokemon-champions-cpu-difficulty';
  const LEVELS = new Set(['easy', 'normal', 'hard', 'expert']);
  const CHARGE_API_FALLBACK = new Set([13, 19, 76, 91, 130, 143, 291, 340, 467, 566, 601, 669, 800]);
  let selectedDifficulty = 'normal';
  let currentBattle = null;
  const battleByMon = new WeakMap();

  function normalizeDifficulty(value) {
    const key = String(value || '').trim().toLowerCase();
    return LEVELS.has(key) ? key : 'normal';
  }

  function readDifficulty() {
    try {
      return normalizeDifficulty(window.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return 'normal';
    }
  }

  function setDifficulty(value) {
    selectedDifficulty = normalizeDifficulty(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, selectedDifficulty);
    } catch (_) {
      // Keep the selection for this page even when storage is unavailable.
    }
    return selectedDifficulty;
  }

  selectedDifficulty = readDifficulty();

  function idOf(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function itemId(mon) {
    const value = String(mon && mon.heldItem || '').trim();
    const aliases = {
      'いのちのたま': 'lifeorb',
      'こだわりハチマキ': 'choiceband',
      'こだわりメガネ': 'choicespecs',
      'パワフルハーブ': 'powerherb',
      'なし': ''
    };
    return aliases[value] || idOf(value);
  }

  function abilityId(mon) {
    return idOf(mon && (mon.abilityId || mon.ability));
  }

  function getBattle(battle) {
    return battle || currentBattle || runtime.getBattle() || {
      weather: null,
      terrain: null,
      sideConditions: {},
      playerTeam: [],
      enemyTeam: []
    };
  }

  function getMoveForSlot(slot) {
    if (!slot) return null;
    return runtime.getMove(slot.id || slot.moveId || slot.name);
  }

  function getStat(mon, key) {
    if (!mon) return 1;
    if (typeof runtime.currentStat === 'function') {
      const value = Number(runtime.currentStat(mon, key));
      if (Number.isFinite(value) && value > 0) return value;
    }
    const value = Number(mon.stats && mon.stats[key]);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function resolveMoveData(move, actor, target, battle) {
    const result = runtime.resolveContextMoveData(move, actor, target, getBattle(battle));
    const fallback = typeof window.resolveMoveTypePower === 'function'
      ? window.resolveMoveTypePower(move, getBattle(battle).weather)
      : { type: move.type || 'Normal', power: Number(move.basePower || 0) };
    return {
      type: result && result.type || fallback.type || move.type || 'Normal',
      power: Math.max(0, Number(result && result.power != null ? result.power : fallback.power || 0))
    };
  }

  function accuracyFor(move, actor, target, battle) {
    if (typeof runtime.getEffectiveAccuracy === 'function') {
      const result = Number(runtime.getEffectiveAccuracy(move, actor, target, getBattle(battle)));
      if (Number.isFinite(result)) return Math.max(0, Math.min(100, result));
    }
    if (move.accuracy === true || move.accuracy == null) return 100;
    return Math.max(0, Math.min(100, Number(move.accuracy) || 0));
  }

  function chargeInfo(move, actor, battle) {
    const b = getBattle(battle);
    const isCharge = typeof runtime.isChargeMove === 'function'
      ? !!runtime.isChargeMove(move)
      : CHARGE_API_FALLBACK.has(Number(move.apiId || 0));
    if (!isCharge || (actor && actor._chargingMove === move.id)) {
      return { isCharge: isCharge, skipped: true, factor: 1 };
    }
    const skipped = typeof runtime.skipsCharge === 'function'
      ? !!runtime.skipsCharge(move, actor, b)
      : itemId(actor) === 'powerherb' ||
        (Number(move.apiId || 0) === 76 && b.weather === 'sun');
    if (skipped) return { isCharge: true, skipped: true, factor: 1 };
    const semiInvulnerable = typeof runtime.isSemiInvulnerableChargeMove === 'function'
      ? !!runtime.isSemiInvulnerableChargeMove(move)
      : false;
    return {
      isCharge: true,
      skipped: false,
      semiInvulnerable: semiInvulnerable,
      factor: semiInvulnerable ? 0.68 : 0.5
    };
  }

  function moveIsUsable(actor, slot, move) {
    if (!actor || !slot || !move || Number(slot.pp) <= 0) return false;
    const volatile = actor.volatile || {};
    if (volatile.disabledMove === move.id && Number(volatile.disableTurns || 0) > 0) return false;
    if (volatile.torment && actor.lastMoveId === move.id) return false;
    if (Number(volatile.encoreTurns || 0) > 0 &&
        volatile.encoreMove && volatile.encoreMove !== move.id) return false;
    if (Number(volatile.tauntTurns || 0) > 0 && move.category === 'Status') return false;
    if (itemId(actor) === 'assaultvest' && move.category === 'Status') return false;
    if (actor._chargingMove && actor._chargingMove !== move.id) return false;
    return true;
  }

  function estimateMove(actor, target, slot, difficulty, battle) {
    const move = getMoveForSlot(slot);
    if (!move || !moveIsUsable(actor, slot, move) ||
        (move.category !== 'Physical' && move.category !== 'Special')) return null;

    const b = getBattle(battle);
    const resolved = resolveMoveData(move, actor, target, b);
    const type = resolved.type;
    const power = resolved.power;
    if (!(power > 0)) return null;

    let attackKey = move.overrideOffensiveStat ||
      (move.id === 'bodypress' ? 'def' : (move.category === 'Physical' ? 'atk' : 'spa'));
    let defenseKey = move.overrideDefensiveStat ||
      (move.defensiveCategory === 'Physical' ? 'def' :
        move.defensiveCategory === 'Special' ? 'spd' :
          (move.category === 'Physical' ? 'def' : 'spd'));
    if (['psyshock', 'psystrike', 'secretsword'].includes(move.id) && !move.overrideDefensiveStat) {
      defenseKey = 'def';
    }

    const offensiveMon = move.overrideOffensivePokemon === 'target' ? target : actor;
    const defensiveMon = move.overrideDefensivePokemon === 'source' ? actor : target;
    let attack = getStat(offensiveMon, attackKey);
    const defense = Math.max(1, getStat(defensiveMon, defenseKey));
    if (move.id === 'foulplay') attack = getStat(target, 'atk');

    const level = Math.max(1, Number(offensiveMon && offensiveMon.level || actor.level || 50));
    const base = Math.floor(
      Math.floor((Math.floor((2 * level) / 5) + 2) * power * attack / defense) / 50
    ) + 2;

    const sourceSpecies = runtime.monSpecies(offensiveMon);
    const targetSpecies = runtime.monSpecies(defensiveMon);
    const sourceTypes = offensiveMon.types || sourceSpecies && sourceSpecies.types || [];
    const stab = move.forceSTAB || sourceTypes.includes(type)
      ? (abilityId(actor) === 'adaptability' ? 2 : 1.5)
      : 1;

    const effectiveness = typeof runtime.typeMult === 'function'
      ? Number(runtime.typeMult(type, targetSpecies, defensiveMon))
      : 1;
    if (!(effectiveness > 0)) {
      return { id: move.id, score: 0, damage: 0, effectiveness: 0, accuracy: 0, power: power };
    }

    let weatherMultiplier = 1;
    if (b.weather === 'rain') {
      if (type === 'Water') weatherMultiplier = 1.5;
      if (type === 'Fire') weatherMultiplier = 0.5;
    } else if (b.weather === 'sun') {
      if (type === 'Fire') weatherMultiplier = 1.5;
      if (type === 'Water') weatherMultiplier = 0.5;
    }

    let abilityMultiplier = 1;
    const ownAbility = abilityId(actor);
    const targetAbility = abilityId(target);
    if (ownAbility === 'technician' && power <= 60) abilityMultiplier *= 1.5;
    if (ownAbility === 'sheerforce' && (move.secondaries && move.secondaries.length || move.secondary)) abilityMultiplier *= 1.3;
    if (ownAbility === 'reckless' && (move.recoil || ['doubleedge', 'flareblitz', 'bravebird', 'wildcharge', 'headsmash'].includes(move.id))) abilityMultiplier *= 1.2;
    if (ownAbility === 'ironfist' && move.flags && move.flags.punch) abilityMultiplier *= 1.2;
    if (ownAbility === 'strongjaw' && move.flags && move.flags.bite) abilityMultiplier *= 1.5;
    if (ownAbility === 'toughclaws' && move.flags && move.flags.contact) abilityMultiplier *= 1.3;
    if (ownAbility === 'flashfire' && actor.volatile && actor.volatile.flashFire && type === 'Fire') abilityMultiplier *= 1.5;
    if (ownAbility === 'solarpower' && b.weather === 'sun' && move.category === 'Special') abilityMultiplier *= 1.5;
    if (targetAbility === 'thickfat' && (type === 'Fire' || type === 'Ice')) abilityMultiplier *= 0.5;
    if (targetAbility === 'heatproof' && type === 'Fire') abilityMultiplier *= 0.5;
    if (targetAbility === 'fluffy' && move.flags && move.flags.contact) abilityMultiplier *= 0.5;
    if (targetAbility === 'fluffy' && type === 'Fire') abilityMultiplier *= 2;
    if (targetAbility === 'waterbubble' && type === 'Fire') abilityMultiplier *= 0.5;

    const held = itemId(actor);
    let itemMultiplier = 1;
    if (held === 'choiceband' && move.category === 'Physical') itemMultiplier *= 1.5;
    if (held === 'choicespecs' && move.category === 'Special') itemMultiplier *= 1.5;
    if (held === 'lifeorb') itemMultiplier *= 1.3;

    let screenMultiplier = 1;
    const targetSide = (b.playerTeam || []).some(mon => mon && mon.uid === target.uid) ? 'player' : 'enemy';
    const screens = b.sideConditions && b.sideConditions[targetSide];
    if (screens) {
      if (move.category === 'Physical' && Number(screens.reflect || 0) > 0) screenMultiplier *= 0.5;
      if (move.category === 'Special' && Number(screens.lightscreen || 0) > 0) screenMultiplier *= 0.5;
      if (Number(screens.auroraveil || 0) > 0) screenMultiplier *= 0.5;
    }

    const burnMultiplier = move.category === 'Physical' && actor.status === 'brn' && ownAbility !== 'guts' ? 0.5 : 1;
    let hitCount = 1;
    if (Array.isArray(move.multihit)) {
      hitCount = (Number(move.multihit[0] || 2) + Number(move.multihit[1] || move.multihit[0] || 2)) / 2;
    } else if (Number(move.multihit) > 0) {
      hitCount = Number(move.multihit);
    }

    const accuracy = accuracyFor(move, actor, target, b);
    const expectedDamage = Math.max(0, base * stab * effectiveness * weatherMultiplier *
      abilityMultiplier * itemMultiplier * screenMultiplier * burnMultiplier * hitCount *
      (accuracy / 100));

    const charge = chargeInfo(move, actor, b);
    let score = expectedDamage * charge.factor;
    if (Array.isArray(move.recoil) && Number(move.recoil[1]) > 0) {
      score *= Math.max(0.55, 1 - (Number(move.recoil[0] || 1) / Number(move.recoil[1])) * 0.35);
    }
    if (Array.isArray(move.drain) && Number(move.drain[1]) > 0) {
      score *= 1 + Math.min(0.2, Number(move.drain[0] || 1) / Number(move.drain[1]) * 0.2);
    }
    if ((difficulty === 'hard' || difficulty === 'expert') &&
        Number(target.hp) > 0 && expectedDamage * charge.factor >= Number(target.hp)) {
      score += 120 + Number(target.hp) * 0.5;
    }
    if (Number(move.priority || 0) > 0) score += Number(move.priority) * 2;

    return {
      id: move.id,
      score: score,
      damage: expectedDamage * charge.factor,
      rawDamage: expectedDamage,
      effectiveness: effectiveness,
      accuracy: accuracy,
      power: power,
      category: move.category,
      charge: charge
    };
  }

  function scoreCandidate(mon, target, slot, difficulty, battle) {
    return estimateMove(mon, target, slot, normalizeDifficulty(difficulty), battle);
  }

  function offensiveProfile(mon, battle) {
    const b = getBattle(battle);
    const moves = Array.isArray(mon && mon.moves) ? mon.moves : [];
    const targets = (b.playerTeam || []).filter(target =>
      target && !target.fainted && Number(target.hp || 0) > 0
    );
    const totals = { atk: 0, spa: 0 };
    let physicalMoves = 0;
    let specialMoves = 0;

    if (targets.length) {
      for (const target of targets) {
        let bestPhysical = 0;
        let bestSpecial = 0;
        for (const slot of moves) {
          const move = getMoveForSlot(slot);
          if (!move) continue;
          const result = estimateMove(mon, target, slot, 'normal', b);
          if (!result) continue;
          if (move.category === 'Physical') {
            physicalMoves++;
            bestPhysical = Math.max(bestPhysical, result.damage);
          } else if (move.category === 'Special') {
            specialMoves++;
            bestSpecial = Math.max(bestSpecial, result.damage);
          }
        }
        totals.atk += bestPhysical;
        totals.spa += bestSpecial;
      }
      totals.atk /= targets.length;
      totals.spa /= targets.length;
    } else {
      for (const slot of moves) {
        const move = getMoveForSlot(slot);
        if (!move || (move.category !== 'Physical' && move.category !== 'Special')) continue;
        const power = Number(move.basePower || 0) * (move.accuracy === true || move.accuracy == null ? 1 : Number(move.accuracy) / 100);
        if (move.category === 'Physical') {
          physicalMoves++;
          totals.atk += power * Number(mon.stats && mon.stats.atk || 1);
        } else {
          specialMoves++;
          totals.spa += power * Number(mon.stats && mon.stats.spa || 1);
        }
      }
    }

    if (!physicalMoves && !specialMoves) {
      const atk = Number(mon.stats && mon.stats.atk || 1);
      const spa = Number(mon.stats && mon.stats.spa || 1);
      return atk >= spa
        ? { key: 'atk', nature: 'いじっぱり', physical: true, score: atk }
        : { key: 'spa', nature: 'ひかえめ', physical: false, score: spa };
    }

    const atkStat = Number(mon.stats && mon.stats.atk || 1);
    const spaStat = Number(mon.stats && mon.stats.spa || 1);
    const atkScore = totals.atk * (physicalMoves ? 1 : 0) + (physicalMoves ? atkStat * 0.01 : 0);
    const spaScore = totals.spa * (specialMoves ? 1 : 0) + (specialMoves ? spaStat * 0.01 : 0);
    return atkScore >= spaScore
      ? { key: 'atk', nature: 'いじっぱり', physical: true, score: atkScore }
      : { key: 'spa', nature: 'ひかえめ', physical: false, score: spaScore };
  }

  function tuneCpuMon(mon, difficulty, battle) {
    const level = normalizeDifficulty(difficulty);
    if (!mon || level === 'easy' || typeof runtime.calcStats !== 'function') return false;

    const profile = offensiveProfile(mon, battle);
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    if (level === 'normal') {
      evs.hp = 128;
      evs[profile.key] = 128;
      evs.spe = 252;
    } else {
      evs.hp = 4;
      evs[profile.key] = 252;
      evs.spe = 252;
    }

    const oldMaxHp = Number(mon.maxhp || mon.stats && mon.stats.hp || 1);
    const hpRatio = oldMaxHp > 0
      ? Math.max(0, Math.min(1, Number(mon.hp || oldMaxHp) / oldMaxHp))
      : 1;

    mon.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    mon.evs = evs;
    mon.nature = profile.nature;
    if (level !== 'normal' && !itemId(mon)) mon.heldItem = 'lifeorb';

    const calculated = runtime.calcStats(mon);
    if (!calculated || typeof calculated !== 'object') return false;
    const stats = Object.assign({}, calculated);
    if (level === 'expert') {
      ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(key => {
        stats[key] = Math.max(1, Math.floor(Number(stats[key] || 1) * 1.05));
      });
    }

    mon.stats = stats;
    mon.maxhp = Math.max(1, Number(stats.hp || 1));
    mon.hp = Math.max(1, Math.min(mon.maxhp, Math.round(mon.maxhp * hpRatio)));
    mon._cpuDifficulty = level;
    mon._cpuTraining = {
      offense: profile.key,
      offenseScore: profile.score,
      nature: profile.nature,
      evs: Object.assign({}, evs),
      heldItem: mon.heldItem || '',
      expertStatMultiplier: level === 'expert' ? 1.05 : 1
    };
    return true;
  }

  function tuneCpuTeam(battle, difficulty) {
    if (!battle || battle.mode === 'raid' || !Array.isArray(battle.enemyTeam)) return 0;
    const level = normalizeDifficulty(difficulty || selectedDifficulty);
    let changed = 0;
    for (const mon of battle.enemyTeam) {
      if (!mon || typeof mon !== 'object') continue;
      mon._cpuDifficulty = level;
      if (tuneCpuMon(mon, level, battle)) changed++;
    }
    return changed;
  }

  function bestMoveValue(actor, targets, battle) {
    const list = Array.isArray(targets) ? targets : [targets];
    let best = { score: 0, damage: 0, effectiveness: 1 };
    for (const target of list) {
      if (!target || target.fainted || Number(target.hp || 0) <= 0) continue;
      for (const slot of Array.isArray(actor && actor.moves) ? actor.moves : []) {
        const result = estimateMove(actor, target, slot, 'hard', battle);
        if (result && result.damage > best.damage) {
          best = {
            score: result.score,
            damage: result.damage,
            effectiveness: result.effectiveness
          };
        }
      }
    }
    return best;
  }

  function chooseSwitch(mon, target, battle) {
    const difficulty = normalizeDifficulty(mon && mon._cpuDifficulty || selectedDifficulty);
    const b = getBattle(battle || battleByMon.get(mon));
    if (!['hard', 'expert'].includes(difficulty) || !b ||
        b.mode === 'raid' || b.result || mon._rechargePending) return null;

    const volatile = mon.volatile || {};
    if (volatile.trapped || volatile.meanlook || volatile.ingrain) return null;
    const team = b.enemyTeam || [];
    const active = Array.isArray(b.enemyActive) ? b.enemyActive : [];
    const currentIndex = team.findIndex(member => member && member.uid === mon.uid);
    if (currentIndex < 0 || !active.includes(currentIndex)) return null;

    const playerTargets = (b.playerActive || []).map(index => b.playerTeam && b.playerTeam[index])
      .filter(member => member && !member.fainted && Number(member.hp || 0) > 0);
    if (!playerTargets.length) return null;

    if (b._cpuSwitchReservationTurn !== b.turn) {
      b._cpuSwitchReservationTurn = b.turn;
      b._cpuSwitchReservations = [];
    }
    const reserved = new Set(b._cpuSwitchReservations || []);
    // One voluntary switch at most per turn. Record only switches that really execute.
    if (reserved.size > 0) return null;

    const history = Array.isArray(b._cpuSwitchHistory) ? b._cpuSwitchHistory : [];
    const lastSwitch = history.length ? history[history.length - 1] : null;
    let actualIncoming = { damage: 0, effectiveness: 1 };
    for (const attacker of playerTargets) {
      const threat = bestMoveValue(attacker, [mon], b);
      if (threat.damage > actualIncoming.damage) actualIncoming = threat;
    }
    const currentOutgoing = bestMoveValue(mon, playerTargets, b);
    const currentRisk = actualIncoming.damage / Math.max(1, Number(mon.hp || 1));
    const emergency = currentRisk >= 0.95 ||
      (Number(mon.hp || 0) / Math.max(1, Number(mon.maxhp || 1)) <= 0.2 && currentRisk >= 0.6);

    // Do not abandon a live knockout opportunity just to rotate the team.
    const canKnockOutNow = playerTargets.some(member =>
      currentOutgoing.damage >= Number(member.hp || 1) * 0.98
    );
    if (canKnockOutNow) return null;

    // Require a real defensive problem, not a merely imperfect matchup.
    const dangerThreshold = actualIncoming.effectiveness >= 2 ? 0.35 : 0.55;
    if (!emergency && currentRisk < dangerThreshold) return null;

    // Cool down proactive switches and prevent the immediate A -> B -> A bounce.
    if (lastSwitch) {
      const turnsSinceSwitch = Number(b.turn || 0) - Number(lastSwitch.turn || 0);
      if (!emergency && turnsSinceSwitch < 3) return null;
    }

    const targetHp = playerTargets.reduce((sum, member) => sum + Number(member.hp || 1), 0) / playerTargets.length;
    const currentUtility = currentOutgoing.damage / Math.max(1, targetHp) - currentRisk;
    let bestChoice = null;

    for (let index = 0; index < team.length; index++) {
      if (active.includes(index) || reserved.has(index)) continue;
      const candidate = team[index];
      if (!candidate || candidate.fainted || Number(candidate.hp || 0) <= 0 ||
          Number(candidate.maxhp || 1) <= 0) continue;
      if (Number(candidate.hp) / Number(candidate.maxhp) < 0.35) continue;
      if (lastSwitch &&
          lastSwitch.toUid === mon.uid &&
          lastSwitch.fromUid === candidate.uid &&
          Number(b.turn || 0) - Number(lastSwitch.turn || 0) < 4) continue;

      let candidateIncoming = { damage: 0, effectiveness: 1 };
      for (const attacker of playerTargets) {
        const threat = bestMoveValue(attacker, [candidate], b);
        if (threat.damage > candidateIncoming.damage) candidateIncoming = threat;
      }
      const outgoing = bestMoveValue(candidate, playerTargets, b);
      const risk = candidateIncoming.damage / Math.max(1, Number(candidate.hp || 1));
      const utility = outgoing.damage / Math.max(1, targetHp) - risk;

      if (risk > Math.min(0.6, currentRisk * 0.65)) continue;
      if (outgoing.damage < Math.max(currentOutgoing.damage * 0.8, targetHp * 0.12)) continue;
      if (utility <= currentUtility + 0.18) continue;
      if (!bestChoice || utility > bestChoice.utility) bestChoice = { index: index, utility: utility };
    }

    if (!bestChoice) return null;
    b._cpuSwitchReservations.push(bestChoice.index);
    return {
      actorUid: mon.uid,
      moveId: null,
      targetUid: null,
      switchTo: bestChoice.index
    };
  }

  function chooseEnemyActionWithDifficulty(mon, target) {
    const difficulty = normalizeDifficulty(mon && mon._cpuDifficulty || selectedDifficulty);
    if (difficulty === 'easy') return originalChooseEnemyAction.apply(this, arguments);

    const battle = battleByMon.get(mon) || currentBattle || getBattle();
    if (mon && mon._chargingMove) {
      return {
        actorUid: mon.uid,
        moveId: mon._chargingMove,
        targetUid: target && target.uid
      };
    }

    const switchAction = chooseSwitch(mon, target, battle);
    if (switchAction) return switchAction;

    const candidates = (mon && mon.moves || []).filter(slot => {
      const move = getMoveForSlot(slot);
      return moveIsUsable(mon, slot, move);
    });
    const ranked = candidates.map(slot =>
      estimateMove(mon, target, slot, difficulty, battle)
    ).filter(result => result && result.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) return originalChooseEnemyAction.apply(this, arguments);
    let selected = ranked[0];
    if (difficulty === 'normal' && ranked.length > 1 && Math.random() < 0.2) {
      selected = ranked[1];
    }
    return {
      actorUid: mon.uid,
      moveId: selected.id,
      targetUid: target && target.uid
    };
  }

  const originalExecuteActionForSwitchHistory = window.executeAction;
  if (typeof originalExecuteActionForSwitchHistory === 'function') {
    window.executeAction = function recordActualCpuSwitch(action, battle) {
      const actualBattle = getBattle(battle);
      const side = action && action.side || 'player';
      const slot = Number(action && action.slot || 0);
      const team = side === 'enemy' ? actualBattle && actualBattle.enemyTeam : null;
      const active = side === 'enemy' ? actualBattle && actualBattle.enemyActive : null;
      const beforeIndex = Array.isArray(active) ? active[slot] : -1;
      const beforeMon = Array.isArray(team) ? team[beforeIndex] : null;
      const result = originalExecuteActionForSwitchHistory.apply(this, arguments);
      if (side === 'enemy' && action && action.switchTo != null &&
          Array.isArray(team) && Array.isArray(active)) {
        const afterMon = team[active[slot]];
        if (beforeMon && afterMon && beforeMon.uid !== afterMon.uid) {
          actualBattle._cpuSwitchHistory = Array.isArray(actualBattle._cpuSwitchHistory)
            ? actualBattle._cpuSwitchHistory : [];
          actualBattle._cpuSwitchHistory.push({
            turn: Number(actualBattle.turn || 0),
            slot,
            fromUid: beforeMon.uid,
            toUid: afterMon.uid
          });
          if (actualBattle._cpuSwitchHistory.length > 12) {
            actualBattle._cpuSwitchHistory.splice(0, actualBattle._cpuSwitchHistory.length - 12);
          }
        }
      }
      return result;
    };
  }

  const originalChooseEnemyAction = window.chooseEnemyAction;
  if (typeof originalChooseEnemyAction === 'function') {
    window.chooseEnemyAction = chooseEnemyActionWithDifficulty;
  }

  const originalBeginBattleIntro = window.beginBattleIntro;
  if (typeof originalBeginBattleIntro === 'function') {
    window.beginBattleIntro = function beginBattleIntroWithCpuAi(battle) {
      currentBattle = battle || null;
      if (battle && Array.isArray(battle.enemyTeam)) {
        battle.enemyTeam.forEach(mon => {
          if (!mon) return;
          battleByMon.set(mon, battle);
          mon._cpuDifficulty = selectedDifficulty;
        });
        tuneCpuTeam(battle, selectedDifficulty);
      }
      return originalBeginBattleIntro.apply(this, arguments);
    };
  }

  const originalRenderBattlePage = window.renderBattlePage;
  if (typeof originalRenderBattlePage === 'function') {
    window.renderBattlePage = function renderBattlePageWithCpuDifficulty() {
      const html = originalRenderBattlePage.apply(this, arguments);
      if (typeof html !== 'string' ||
          !html.includes('data-action="battle-mode"') ||
          !html.includes('<div class="grid two-col">') ||
          html.includes('id="cpu-difficulty"')) return html;

      const labels = {
        easy: 'かんたん',
        normal: 'ふつう',
        hard: 'むずかしい',
        expert: 'エキスパート'
      };
      const options = ['easy', 'normal', 'hard', 'expert'].map(level =>
        '<option value="' + level + '"' +
        (selectedDifficulty === level ? ' selected' : '') + '>' +
        labels[level] + '</option>'
      ).join('');
      const panel = '<section class="setting-card" style="grid-column:1/-1;margin-bottom:14px">' +
        '<div class="section-kicker">CPU DIFFICULTY</div>' +
        '<label for="cpu-difficulty"><b>CPUの難易度</b></label>' +
        '<select id="cpu-difficulty" class="field" style="max-width:320px;margin-top:8px">' +
        options + '</select>' +
        '<p class="tiny muted" style="margin-bottom:0">難易度はこのブラウザに保存され、次のCPU対戦から反映されます。</p>' +
        '</section>';
      return html.replace('<div class="grid two-col">', panel + '<div class="grid two-col">');
    };
  }

  if (window.document && typeof window.document.addEventListener === 'function') {
    window.document.addEventListener('change', function (event) {
      const target = event && event.target;
      if (!target || target.id !== 'cpu-difficulty') return;
      setDifficulty(target.value);
      const showToast = runtime.toast || window.toast;
      if (typeof showToast === 'function') {
        const labels = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい', expert: 'エキスパート' };
        showToast('CPUの難易度を「' + labels[selectedDifficulty] + '」に設定しました。', 'good');
      }
    }, true);
  }

  window.PokemonChampions2DCPU = {
    version: 2,
    getDifficulty: function () { return selectedDifficulty; },
    setDifficulty: setDifficulty,
    normalizeDifficulty: normalizeDifficulty,
    estimateMove: estimateMove,
    scoreCandidate: scoreCandidate,
    offensiveProfile: offensiveProfile,
    tuneCpuMon: tuneCpuMon,
    tuneCpuTeam: tuneCpuTeam,
    bestMoveValue: bestMoveValue,
    chooseSwitch: chooseSwitch,
    getCurrentBattle: function () { return currentBattle; }
  };
})();