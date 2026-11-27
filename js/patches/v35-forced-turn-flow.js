(function installForcedTurnFlow() {
  'use strict';

  const runtime = window.PokemonChampions2DBattleRuntime;
  if (!runtime || typeof runtime.getBattle !== 'function') {
    console.error('[CPU turn flow] Battle runtime bridge is unavailable.');
    return;
  }

  const scheduledTurns = new WeakMap();
  const scheduledSelections = new WeakMap();

  function battleNow() {
    return runtime.getBattle() || null;
  }

  function log(message) {
    if (typeof window.battleLog === 'function') window.battleLog(message);
  }

  function activePlayerMonsters(battle) {
    return (battle.playerActive || []).map((index, slot) => ({
      slot: slot,
      mon: battle.playerTeam && battle.playerTeam[index]
    })).filter(entry => entry.mon && !entry.mon.fainted && Number(entry.mon.hp || 0) > 0);
  }

  function prepareTurn(mon, battle) {
    if (!mon || !battle) return null;
    const turn = Number(battle.turn || 0);
    const existing = mon._turnPreflight;
    if (existing && existing.turn === turn) return existing;

    if (mon._rechargePending) {
      return (mon._turnPreflight = {
        turn: turn,
        kind: 'recharge',
        canAct: false,
        consumed: false,
        reason: 'recharge'
      });
    }

    if (mon._chargingMove) {
      return (mon._turnPreflight = {
        turn: turn,
        kind: 'charge',
        canAct: true,
        consumed: false,
        reason: 'charge'
      });
    }

    const result = {
      turn: turn,
      kind: 'status',
      canAct: true,
      consumed: false,
      reason: null
    };

    const status = mon.status;
    if (status === 'slp') {
      mon.statusTurns = Number(mon.statusTurns || 0) + 1;
      if (mon.statusTurns >= 3) {
        mon.status = null;
        result.reason = 'wake';
      } else {
        result.canAct = false;
        result.reason = 'sleep';
      }
    } else if (status === 'frz') {
      mon.statusTurns = Number(mon.statusTurns || 0) + 1;
      if (mon.statusTurns >= 3 || Math.random() < 0.2) {
        mon.status = null;
        result.reason = 'thaw';
      } else {
        result.canAct = false;
        result.reason = 'freeze';
      }
    } else if (status === 'par' && Math.random() < 0.25) {
      result.canAct = false;
      result.reason = 'paralysis';
    } else if (mon.volatile && mon.volatile.flinch) {
      mon.volatile.flinch = false;
      result.canAct = false;
      result.reason = 'flinch';
    }

    mon._turnPreflight = result;
    return result;
  }

  function reasonMessage(mon, reason) {
    const name = mon && mon.name || 'ポケモン';
    switch (reason) {
      case 'sleep': return name + 'は ぐうぐう眠っていて動けない！';
      case 'freeze': return name + 'は 凍りついて動けない！';
      case 'paralysis': return name + 'は まひして動けない！';
      case 'flinch': return name + 'は ひるんで動けない！';
      case 'wake': return name + 'は 目を覚ました！';
      case 'thaw': return name + 'の こおりが溶けた！';
      case 'recharge': return name + 'は反動で動けない！';
      default: return name + 'はこのターン行動できない！';
    }
  }

  function consumePreflight(mon, battle) {
    const cached = mon && mon._turnPreflight;
    if (!cached || cached.turn !== Number(battle && battle.turn || 0) ||
        cached.kind !== 'status' || cached.consumed) return null;
    cached.consumed = true;
    return cached;
  }

  const originalCanMove = window.canMove;
  if (typeof originalCanMove === 'function') {
    window.canMove = function canMoveUsingTurnPreflight(mon) {
      const battle = battleNow();
      const cached = consumePreflight(mon, battle);
      if (cached) {
        if (cached.reason === 'wake' || cached.reason === 'thaw') {
          log(reasonMessage(mon, cached.reason));
        }
        return cached.canAct;
      }
      return originalCanMove.apply(this, arguments);
    };
  }

  const originalExecuteAction = window.executeAction;
  if (typeof originalExecuteAction === 'function') {
    window.executeAction = function executeActionRespectingForcedSkip(action, battle) {
      const actualBattle = battle || battleNow();
      const team = action && action.side === 'enemy'
        ? actualBattle && actualBattle.enemyTeam
        : actualBattle && actualBattle.playerTeam;
      const mon = team && team.find(member => member && member.uid === action.actorUid);
      const cached = mon && mon._turnPreflight;
      if (mon && actualBattle && action.switchTo == null && cached &&
          cached.turn === Number(actualBattle.turn || 0) &&
          cached.kind === 'status' && !cached.canAct && !cached.consumed) {
        cached.consumed = true;
        log(reasonMessage(mon, cached.reason));
        return;
      }
      return originalExecuteAction.apply(this, arguments);
    };
  }

  function lockLabel(mon, state) {
    if (!mon || !state) return '';
    if (state.kind === 'charge') {
      return 'チャージ中：技の選択は不要です。次の攻撃を自動で行います。';
    }
    if (state.kind === 'recharge') {
      return '反動で動けません。このターンは自動で終了します。';
    }
    if (!state.canAct) {
      const messages = {
        sleep: '眠っていて動けません。このターンは自動で終了します。',
        freeze: '凍りついて動けません。このターンは自動で終了します。',
        paralysis: 'まひして動けません。このターンは自動で終了します。',
        flinch: 'ひるんで動けません。このターンは自動で終了します。'
      };
      return messages[state.reason] || 'このターンは行動できません。自動で終了します。';
    }
    return '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function selectedSlotFromHtml(html) {
    const match = String(html).match(/class="btn btn-cyan btn-sm" data-action="active-slot" data-slot="(\d+)"/);
    return match ? Number(match[1]) : 0;
  }

  function statusPanel(label) {
    return '<div class="battle-forced-action" role="status" ' +
      'style="display:flex;align-items:center;justify-content:center;min-height:132px;padding:22px 18px;' +
      'border:1px solid rgba(125,170,220,.38);border-radius:16px;' +
      'background:linear-gradient(135deg,rgba(45,67,105,.34),rgba(20,28,49,.72));' +
      'color:#eaf2ff;text-align:center;font-weight:700;line-height:1.8;">' +
      '<span><span style="display:block;font-size:12px;letter-spacing:.12em;opacity:.72;margin-bottom:7px;">FORCED TURN</span>' +
      escapeHtml(label) + '</span></div>';
  }

  function pendingActionFor(mon, slot) {
    return {
      actorUid: mon.uid,
      moveId: mon._chargingMove || null,
      targetUid: null,
      slot: slot
    };
  }

  function allPendingActions(battle) {
    return (battle.playerActive || []).map((index, slot) => {
      const mon = battle.playerTeam && battle.playerTeam[index];
      if (!mon || mon.fainted || Number(mon.hp || 0) <= 0) return null;
      return battle.pending && battle.pending[slot] || null;
    }).filter(Boolean);
  }

  function scheduleSingle(battle, mon, turn, kind) {
    const key = String(turn) + ':' + String(mon.uid) + ':' + kind;
    if (scheduledTurns.get(battle) === key) return;
    scheduledTurns.set(battle, key);
    setTimeout(function () {
      if (battleNow() !== battle || battle.turnBusy || battle.result ||
          Number(battle.turn || 0) !== turn) return;
      if (typeof window.executeTurn === 'function') {
        Promise.resolve(window.executeTurn([pendingActionFor(mon, 0)]))
          .catch(error => console.error('[CPU turn flow] Could not auto-resolve forced turn:', error));
      }
    }, 0);
  }

  function scheduleDoubleCompletion(battle, turn, actions) {
    const key = String(turn) + ':double:' +
      (battle.playerActive || []).map((_, slot) => battle.pending && battle.pending[slot] ? '1' : '0').join('');
    if (scheduledTurns.get(battle) === key) return;
    scheduledTurns.set(battle, key);
    setTimeout(function () {
      if (battleNow() !== battle || battle.turnBusy || battle.result ||
          Number(battle.turn || 0) !== turn) return;
      if (typeof window.executeTurn === 'function') {
        Promise.resolve(window.executeTurn(actions))
          .catch(error => console.error('[CPU turn flow] Could not auto-resolve double forced turn:', error));
      }
    }, 0);
  }

  function scheduleNextDoubleSelection(battle, turn, slot) {
    const key = String(turn) + ':select:' + String(slot);
    if (scheduledSelections.get(battle) === key) return;
    scheduledSelections.set(battle, key);
    setTimeout(function () {
      if (battleNow() !== battle || battle.turnBusy || battle.result ||
          Number(battle.turn || 0) !== turn) return;
      const button = window.document &&
        window.document.querySelector('#main [data-action="active-slot"][data-slot="' + slot + '"]');
      if (button && typeof button.click === 'function') button.click();
    }, 0);
  }

  const originalRenderBattlePage = window.renderBattlePage;
  if (typeof originalRenderBattlePage === 'function') {
    window.renderBattlePage = function renderBattlePageWithForcedTurnFlow() {
      let html = originalRenderBattlePage.apply(this, arguments);
      const battle = battleNow();
      if (typeof html !== 'string' || !battle || battle.result ||
          battle.turnBusy || battle.introActive) return html;

      const entries = activePlayerMonsters(battle);
      if (!entries.length) return html;

      const isDouble = battle.mode === 'doubles';
      const turn = Number(battle.turn || 0);
      let forcedCount = 0;
      let unlockedSlots = [];

      for (const entry of entries) {
        const state = prepareTurn(entry.mon, battle);
        if (state && (state.kind === 'charge' || state.kind === 'recharge' ||
            (state.kind === 'status' && !state.canAct))) {
          forcedCount++;
          if (isDouble) {
            battle.pending = battle.pending || {};
            if (!battle.pending[entry.slot]) {
              battle.pending[entry.slot] = pendingActionFor(entry.mon, entry.slot);
            }
          }
        } else if (isDouble && !(battle.pending && battle.pending[entry.slot])) {
          unlockedSlots.push(entry.slot);
        }
      }

      const selectedSlot = selectedSlotFromHtml(html);
      const selectedEntry = entries.find(entry => entry.slot === selectedSlot);
      const selectedState = selectedEntry && selectedEntry.mon._turnPreflight;
      const label = selectedEntry && lockLabel(selectedEntry.mon, selectedState);

      if (label) {
        html = html.replace(/<div class="battle-moves">[\s\S]*?<\/div>/,
          statusPanel(label));
      }

      if (!forcedCount) return html;

      if (!isDouble) {
        const entry = entries[0];
        scheduleSingle(battle, entry.mon, turn, entry.mon._turnPreflight.kind);
        return html;
      }

      if (unlockedSlots.length === 0) {
        scheduleDoubleCompletion(battle, turn, allPendingActions(battle));
        return html;
      }

      if (selectedEntry && selectedState &&
          (selectedState.kind === 'charge' || selectedState.kind === 'recharge' ||
            (selectedState.kind === 'status' && !selectedState.canAct))) {
        scheduleNextDoubleSelection(battle, turn, unlockedSlots[0]);
      }

      return html;
    };
  }

  window.PokemonChampions2DForcedTurnFlow = {
    version: 1,
    prepareTurn: prepareTurn,
    lockLabel: lockLabel,
    reasonMessage: reasonMessage
  };
})();