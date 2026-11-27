(function installCpuSwitchingPatch() {
  'use strict';

  const api = window.PokemonChampions2DCPU;
  if (!api || typeof api.getDifficulty !== 'function' || typeof api.scoreCandidate !== 'function') return;

  const battleByMon = new WeakMap();

  function bestMoveValue(actor, defender) {
    let best = { score: 0, effectiveness: 1 };
    for (const slot of Array.isArray(actor && actor.moves) ? actor.moves : []) {
      if (!slot || Number(slot.pp ?? 1) <= 0) continue;
      try {
        const result = api.scoreCandidate(actor, defender, slot, 'easy');
        if (result && Number(result.score) > best.score) {
          best = {
            score: Number(result.score),
            effectiveness: Number(result.effectiveness ?? 1)
          };
        }
      } catch (_) {
        // A missing move record should not prevent the CPU from choosing a normal action.
      }
    }
    return best;
  }

  function chooseSwitch(mon, target, battle) {
    const difficulty = String(mon && mon._cpuDifficulty || api.getDifficulty()).toLowerCase();
    if (!['hard', 'expert'].includes(difficulty)) return null;
    if (!battle || battle.mode === 'raid' || battle.result || mon.volatile?.trapped ||
        mon.volatile?.meanlook || mon.volatile?.ingrain) return null;

    const team = battle.enemyTeam || [];
    const active = Array.isArray(battle.enemyActive) ? battle.enemyActive : [];
    const currentIndex = team.findIndex(member => member && member.uid === mon.uid);
    if (currentIndex < 0 || !active.includes(currentIndex)) return null;

    if (battle._cpuSwitchReservationTurn !== battle.turn) {
      battle._cpuSwitchReservationTurn = battle.turn;
      battle._cpuSwitchReservations = [];
    }
    const reserved = new Set(battle._cpuSwitchReservations || []);
    const currentIncoming = bestMoveValue(target, mon);
    const currentOutgoing = bestMoveValue(mon, target);
    const currentRisk = currentIncoming.score / Math.max(1, Number(mon.hp || 1));
    const pressured = currentRisk >= 0.22 || currentIncoming.effectiveness >= 2;
    if (!pressured) return null;

    const currentUtility = currentOutgoing.score / Math.max(1, Number(target.hp || 1)) - currentRisk;
    let bestChoice = null;

    for (let index = 0; index < team.length; index++) {
      if (active.includes(index) || reserved.has(index)) continue;
      const candidate = team[index];
      if (!candidate || candidate.fainted || Number(candidate.hp || 0) <= 0 ||
          Number(candidate.maxhp || 1) <= 0) continue;
      if (Number(candidate.hp) / Number(candidate.maxhp) < 0.3) continue;

      const incoming = bestMoveValue(target, candidate);
      const outgoing = bestMoveValue(candidate, target);
      const risk = incoming.score / Math.max(1, Number(candidate.hp || 1));
      const utility = outgoing.score / Math.max(1, Number(target.hp || 1)) - risk;

      // Switch only when the incoming threat drops clearly and the replacement can still fight back.
      if (risk > currentRisk * 0.7) continue;
      if (outgoing.score < Math.max(currentOutgoing.score * 0.7, Number(target.hp || 1) * 0.12)) continue;
      if (utility <= currentUtility + 0.15) continue;

      if (!bestChoice || utility > bestChoice.utility) {
        bestChoice = { index, utility };
      }
    }

    if (!bestChoice) return null;
    battle._cpuSwitchReservations.push(bestChoice.index);
    return {
      actorUid: mon.uid,
      moveId: null,
      targetUid: null,
      switchTo: bestChoice.index
    };
  }

  const previousBeginBattleIntro = window.beginBattleIntro;
  if (typeof previousBeginBattleIntro === 'function') {
    window.beginBattleIntro = function beginBattleIntroRegisteringCpuTeam(battle) {
      if (battle && battle.mode !== 'raid' && Array.isArray(battle.enemyTeam)) {
        for (const mon of battle.enemyTeam) {
          if (mon && typeof mon === 'object') battleByMon.set(mon, battle);
        }
      }
      return previousBeginBattleIntro.apply(this, arguments);
    };
  }

  const previousChooseEnemyAction = window.chooseEnemyAction;
  if (typeof previousChooseEnemyAction === 'function') {
    window.chooseEnemyAction = function chooseEnemyActionWithSwitching(mon, target) {
      const battle = mon && battleByMon.get(mon);
      const switchAction = chooseSwitch(mon, target, battle);
      if (switchAction) return switchAction;
      return previousChooseEnemyAction.apply(this, arguments);
    };
  }

  window.PokemonChampions2DCPU = Object.assign({}, api, {
    bestMoveValue: bestMoveValue,
    chooseSwitch: chooseSwitch
  });
})();