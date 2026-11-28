'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/patches/v35-forced-turn-flow.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.doesNotThrow(() => new Function(appSource), 'app.js should parse after forced-turn integration');
const scheduled = [];
const logs = [];
let currentBattle = null;
let executed = [];
let originalExecuteActionCalls = 0;
let clickedSlot = null;
const window = {
  PokemonChampions2DBattleRuntime: { getBattle: () => currentBattle },
  battleLog(message) { logs.push(message); },
  executeTurn(actions) { executed.push(actions); },
  executeAction() { originalExecuteActionCalls++; },
  canMove() { return true; },
  renderBattlePage() {
    return '<button class="btn btn-cyan btn-sm" data-action="active-slot" data-slot="0">味方1</button>' +
      '<div class="battle-moves"><button>わざ</button></div>';
  },
  document: {
    querySelector(selector) {
      const match = selector.match(/data-slot="(\d+)"/);
      return {
        click() { clickedSlot = match ? Number(match[1]) : null; }
      };
    }
  }
};

function makeMon(uid, extras) {
  return Object.assign({
    uid,
    name: uid,
    hp: 100,
    maxhp: 100,
    fainted: false,
    moves: [{ id: 'tackle', pp: 10 }],
    volatile: {},
    status: null,
    statusTurns: 0
  }, extras || {});
}

const timers = [];
vm.runInNewContext(source, {
  window,
  setTimeout(callback) { timers.push(callback); return timers.length; },
  Math: Object.assign(Object.create(Math), { random: () => 0.1 }),
  Number,
  String,
  Object,
  Array,
  WeakMap,
  Promise,
  console
}, { filename: 'v35-forced-turn-flow.js' });

function flushTimers() {
  while (timers.length) timers.shift()();
}

function makeBattle(mode, mons) {
  return {
    mode,
    turn: 1,
    turnBusy: false,
    result: null,
    introActive: false,
    playerTeam: mons,
    playerActive: mons.map((_, index) => index),
    enemyTeam: [],
    enemyActive: [],
    pending: {}
  };
}

// Single: a charged move is hidden and automatically submitted.
const charged = makeMon('charged', { _chargingMove: 'solarbeam' });
currentBattle = makeBattle('singles', [charged]);
executed = [];
const chargedHtml = window.renderBattlePage();
assert.ok(chargedHtml.includes('チャージ中'), 'charge status should replace move buttons');
assert.ok(!chargedHtml.includes('<button>わざ</button>'), 'move buttons should be hidden while charging');
flushTimers();
assert.equal(executed.length, 1, 'charge continuation should run automatically');
assert.equal(executed[0][0].moveId, 'solarbeam', 'stored charge move should be submitted');

// Single: sleep is checked once, shown as locked, then the action is skipped without rechecking.
const asleep = makeMon('asleep', { status: 'slp', statusTurns: 0 });
currentBattle = makeBattle('singles', [asleep]);
executed = [];
logs.length = 0;
const sleepHtml = window.renderBattlePage();
assert.ok(sleepHtml.includes('眠っていて動けません'), 'sleep should show a forced-turn message');
assert.equal(asleep.statusTurns, 1, 'sleep counter should advance once in preflight');
flushTimers();
assert.equal(executed.length, 1, 'sleep turn should advance automatically');
assert.equal(executed[0][0]._autoSkipTurn, true, 'status-locked action should bypass the attack animation');
window.executeAction(executed[0][0], currentBattle);
assert.equal(originalExecuteActionCalls, 0, 'immobilized turn should not execute a selected move');
assert.ok(logs.some(message => message.includes('眠っていて動けない')), 'sleep skip should be logged once');

// Recharge: the move panel is hidden and the existing engine recharge path ends the turn.
const recharging = makeMon('recharging', { _rechargePending: true });
currentBattle = makeBattle('singles', [recharging]);
executed.length = 0;
const rechargeHtml = window.renderBattlePage();
assert.ok(rechargeHtml.includes('反動で動けません'), 'recharge should show a forced-turn message');
flushTimers();
assert.equal(executed.length, 1, 'recharge turn should advance automatically');
assert.equal(executed[0][0]._autoSkipTurn, false, 'the engine recharge flag should handle the skip itself');

// Flinch: the volatile is consumed once and the turn is marked for an animation-free skip.
const flinching = makeMon('flinching', { volatile: { flinch: true } });
currentBattle = makeBattle('singles', [flinching]);
executed.length = 0;
const flinchHtml = window.renderBattlePage();
assert.ok(flinchHtml.includes('ひるんで動けません'), 'flinch should show a forced-turn message');
assert.equal(flinching.volatile.flinch, false, 'flinch should be consumed during preflight');
flushTimers();
assert.equal(executed[0][0]._autoSkipTurn, true, 'flinch skip should bypass animations');

// Waking this turn is cached so canMove does not do a second sleep roll.
const waking = makeMon('waking', { status: 'slp', statusTurns: 2 });
currentBattle = makeBattle('singles', [waking]);
logs.length = 0;
const wakingHtml = window.renderBattlePage();
assert.ok(wakingHtml.includes('<div class="battle-moves">'), 'wake-up turn should allow move selection');
assert.equal(waking.status, null, 'sleep should be cleared during preflight');
assert.equal(window.canMove(waking), true, 'cached wake result should be returned');
assert.equal(logs.filter(message => message.includes('目を覚ました')).length, 1, 'wake message should appear once');

// Doubles: one immobilized Pokémon is submitted automatically and UI moves to the other slot.
const paralyzed = makeMon('paralyzed', { status: 'par', statusTurns: 0 });
const healthy = makeMon('healthy');
currentBattle = makeBattle('doubles', [paralyzed, healthy]);
currentBattle.playerActive = [0, 1];
currentBattle.pending = {};
clickedSlot = null;
const doubleHtml = window.renderBattlePage();
assert.ok(doubleHtml.includes('まひして動けません'), 'selected immobilized slot should show forced state');
assert.ok(currentBattle.pending[0], 'immobilized ally should be placed in pending actions');
assert.equal(currentBattle.pending[0]._autoSkipTurn, true, 'locked ally action should be marked as an automatic skip');
flushTimers();
assert.equal(clickedSlot, 1, 'selection should move to the available ally');

// Doubles: if every active Pokémon is locked, the whole turn completes automatically.
const sleeping = makeMon('sleeping', { status: 'slp', statusTurns: 0 });
const frozen = makeMon('frozen', { status: 'slp', statusTurns: 0 });
currentBattle = makeBattle('doubles', [sleeping, frozen]);
currentBattle.playerActive = [0, 1];
currentBattle.pending = {};
executed = [];
window.renderBattlePage();
flushTimers();
assert.equal(executed.length, 1, 'all forced double actions should auto-resolve');
assert.equal(executed[0].length, 2, 'both forced actions should be submitted together');

console.log('Forced turn flow tests passed.');
