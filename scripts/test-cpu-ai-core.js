'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/patches/v34-cpu-ai-core.js'), 'utf8');
const listeners = {};
const storage = new Map();
const moves = {
  fireblast: { id: 'fireblast', type: 'Fire', category: 'Special', basePower: 110, accuracy: 85, apiId: 0 },
  waterpulse: { id: 'waterpulse', type: 'Water', category: 'Special', basePower: 60, accuracy: 100, apiId: 0 },
  thunderbolt: { id: 'thunderbolt', type: 'Electric', category: 'Special', basePower: 90, accuracy: 100, apiId: 0 },
  closecombat: { id: 'closecombat', type: 'Fighting', category: 'Physical', basePower: 120, accuracy: 100, apiId: 0 },
  leafblade: { id: 'leafblade', type: 'Grass', category: 'Physical', basePower: 90, accuracy: 100, apiId: 0 },
  solarbeam: { id: 'solarbeam', type: 'Grass', category: 'Special', basePower: 120, accuracy: 100, apiId: 76 }
};
const typeChart = {
  Fire: { Grass: 2, Water: 0.5, Rock: 0.5 },
  Water: { Fire: 2, Grass: 0.5, Rock: 2 },
  Electric: { Water: 2, Ground: 0 },
  Fighting: { Rock: 2, Ghost: 0 },
  Grass: { Water: 2, Rock: 2, Fire: 0.5 }
};

const runtime = {
  getMove(id) { return moves[String(id || '').toLowerCase()] || null; },
  calcStats(mon) {
    const ev = mon.evs || {};
    return {
      hp: 100 + Math.floor(Number(ev.hp || 0) / 4),
      atk: 80 + Math.floor(Number(ev.atk || 0) / 4),
      def: 70 + Math.floor(Number(ev.def || 0) / 4),
      spa: 80 + Math.floor(Number(ev.spa || 0) / 4),
      spd: 70 + Math.floor(Number(ev.spd || 0) / 4),
      spe: 90 + Math.floor(Number(ev.spe || 0) / 4)
    };
  },
  monSpecies(mon) { return { types: mon && mon.types || [] }; },
  currentStat(mon, key) { return Number(mon && mon.stats && mon.stats[key] || 1); },
  typeMult(type, species, target) {
    if ((type === 'Ground' && target && target.abilityId === 'levitate') ||
        (type === 'Water' && target && target.abilityId === 'waterabsorb')) return 0;
    let result = 1;
    for (const defendingType of species && species.types || []) {
      const mult = typeChart[type] && typeChart[type][defendingType];
      if (mult === 0) return 0;
      if (mult) result *= mult;
    }
    return result;
  },
  resolveContextMoveData(move, actor, target, battle) {
    let power = Number(move.basePower || 0);
    if (move.id === 'solarbeam' && ['rain', 'sand', 'snow'].includes(battle && battle.weather)) power = Math.floor(power / 2);
    return { type: move.type, power };
  },
  getEffectiveAccuracy(move) {
    return move.accuracy === true || move.accuracy == null ? 100 : Number(move.accuracy);
  },
  isChargeMove(move) { return Number(move.apiId) === 76; },
  isSemiInvulnerableChargeMove() { return false; },
  skipsCharge(move, actor, battle) {
    return String(actor && actor.heldItem || '') === 'powerherb' ||
      (Number(move.apiId) === 76 && battle && battle.weather === 'sun');
  },
  getBattle() { return currentBattle; }
};

let currentBattle = null;
let baselineCalls = 0;
const window = {
  PokemonChampions2DBattleRuntime: runtime,
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  document: {
    addEventListener(type, callback) { listeners[type] = callback; }
  },
  resolveMoveTypePower(move) { return { type: move.type, power: move.basePower }; },
  chooseEnemyAction() {
    baselineCalls++;
    return { actorUid: 'enemy-1', moveId: 'baseline' };
  },
  executeAction(action, battleArg) {
    if (action && action.side === 'enemy' && action.switchTo != null) {
      battleArg.enemyActive[action.slot || 0] = action.switchTo;
    }
  },
  renderBattlePage() {
    return '<div class="grid two-col"><button data-action="battle-mode">Start</button></div>';
  },
  beginBattleIntro(battle) { currentBattle = battle; return battle; },
  toast() {}
};

vm.runInNewContext(source, {
  window,
  Math,
  Set,
  Number,
  String,
  Object,
  Array,
  Map,
  WeakMap,
  console
}, { filename: 'v34-cpu-ai-core.js' });

const api = window.PokemonChampions2DCPU;
assert.ok(api, 'unified CPU AI API must be installed');
assert.equal(api.version, 2);
assert.equal(api.getDifficulty(), 'normal');
assert.ok(window.renderBattlePage().includes('id="cpu-difficulty"'), 'difficulty selector should be displayed');

listeners.change({ target: { id: 'cpu-difficulty', value: 'hard' } });
assert.equal(api.getDifficulty(), 'hard');
assert.equal(storage.get('pokemon-champions-cpu-difficulty'), 'hard');

function makeMon(uid, types, stats, moveIds, extra) {
  return Object.assign({
    uid,
    name: uid,
    level: 50,
    types,
    stats: Object.assign({ hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }, stats || {}),
    hp: 100,
    maxhp: 100,
    moves: (moveIds || []).map(id => ({ id, pp: 10 })),
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    heldItem: '',
    volatile: {},
    status: null
  }, extra || {});
}

const enemy = makeMon('enemy-1', ['Fire'], { atk: 100, spa: 100 }, ['fireblast', 'waterpulse']);
const player = makeMon('player-1', ['Grass'], {}, ['waterpulse']);
const battle = {
  mode: 'singles',
  turn: 1,
  enemyTeam: [enemy],
  enemyActive: [0],
  playerTeam: [player],
  playerActive: [0],
  sideConditions: {}
};
window.beginBattleIntro(battle);

const selected = window.chooseEnemyAction(enemy, player);
assert.equal(selected.moveId, 'fireblast',
  'hard CPU should score actual damage: accuracy, STAB, typing and stats beat raw move power');

enemy.moves = [{ id: 'solarbeam', pp: 10 }, { id: 'thunderbolt', pp: 10 }];
enemy.types = ['Grass'];
player.types = ['Water'];
battle.weather = 'rain';
const rainyScores = api.scoreCandidate(enemy, player, enemy.moves[0], 'hard', battle);
const electricScores = api.scoreCandidate(enemy, player, enemy.moves[1], 'hard', battle);
assert.ok(rainyScores.damage < electricScores.damage,
  'Solar Beam in rain should be penalized for reduced power and its charge turn');
battle.weather = 'sun';
const sunnyScores = api.scoreCandidate(enemy, player, enemy.moves[0], 'hard', battle);
assert.ok(sunnyScores.damage > rainyScores.damage,
  'sunlight should remove Solar Beam charge penalty and restore its power');

const specialMon = makeMon('special-mon', ['Electric'], { atk: 70, spa: 150 }, ['thunderbolt', 'closecombat']);
const specialProfile = api.offensiveProfile(specialMon, {
  playerTeam: [makeMon('water-target', ['Water'], {}, [])],
  weather: null,
  sideConditions: {}
});
assert.equal(specialProfile.key, 'spa', 'offensive training should choose the stronger special damage profile');
api.tuneCpuMon(specialMon, 'hard', {
  playerTeam: [makeMon('water-target', ['Water'], {}, [])],
  weather: null,
  sideConditions: {}
});
assert.equal(specialMon.evs.spa, 252);
assert.equal(specialMon.evs.atk, 0);
assert.equal(specialMon.nature, 'ひかえめ');
assert.equal(specialMon.heldItem, 'lifeorb');

const physicalMon = makeMon('physical-mon', ['Fighting'], { atk: 160, spa: 60 }, ['closecombat']);
const physicalProfile = api.offensiveProfile(physicalMon, {
  playerTeam: [makeMon('rock-target', ['Rock'], {}, [])],
  weather: null,
  sideConditions: {}
});
assert.equal(physicalProfile.key, 'atk', 'physical damage profile should select Attack');
api.tuneCpuMon(physicalMon, 'expert', {
  playerTeam: [makeMon('rock-target', ['Rock'], {}, [])],
  weather: null,
  sideConditions: {}
});
assert.equal(physicalMon.evs.atk, 252);
assert.equal(physicalMon.nature, 'いじっぱり');
assert.equal(physicalMon._cpuTraining.expertStatMultiplier, 1.05);

const easyMon = makeMon('easy-mon', ['Fire'], {}, ['fireblast', 'waterpulse'], { _cpuDifficulty: 'easy' });
api.setDifficulty('easy');
assert.equal(window.chooseEnemyAction(easyMon, player).moveId, 'baseline',
  'easy CPU should keep baseline action selection');
assert.ok(baselineCalls > 0);


const switchFire = makeMon('switch-fire', ['Fire'], { atk: 110, spa: 110 }, ['fireblast']);
const switchWater = makeMon('switch-water', ['Water'], { atk: 100, spa: 110 }, ['waterpulse']);
const switchRock = makeMon('switch-rock', ['Rock'], { atk: 100, spa: 100 }, ['waterpulse']);
switchFire._cpuDifficulty = 'hard';
const switchBattle = {
  mode: 'singles',
  turn: 4,
  result: null,
  enemyTeam: [switchFire, switchWater],
  enemyActive: [0],
  playerTeam: [switchRock],
  playerActive: [0],
  sideConditions: {},
  weather: null
};
const switchAction = api.chooseSwitch(switchFire, switchRock, switchBattle);
assert.equal(switchAction && switchAction.switchTo, 1,
  'hard CPU should switch to a healthier matchup that resists the incoming Water attack');
switchFire.volatile.trapped = true;
assert.equal(api.chooseSwitch(switchFire, switchRock, switchBattle), null,
  'CPU must not switch when trapped');
switchFire.volatile.trapped = false;

// Record the switch only when the action actually executes, then verify the
// proactive-switch cooldown and the A -> B -> A bounce guard.
window.executeAction(Object.assign({}, switchAction, { side: 'enemy', slot: 0 }), switchBattle);
assert.equal(switchBattle.enemyActive[0], 1);
assert.equal(switchBattle._cpuSwitchHistory.length, 1);
assert.equal(switchBattle._cpuSwitchHistory[0].fromUid, 'switch-fire');
assert.equal(switchBattle._cpuSwitchHistory[0].toUid, 'switch-water');

switchRock.types = ['Grass'];
switchRock.moves = [{ id: 'leafblade', pp: 10 }];
switchBattle.turn = 5;
assert.equal(api.chooseSwitch(switchWater, switchRock, switchBattle), null,
  'CPU should not make another proactive switch immediately after switching');
switchBattle.turn = 7;
assert.equal(api.chooseSwitch(switchWater, switchRock, switchBattle), null,
  'CPU should not immediately switch back to the Pokémon it just withdrew');

console.log('CPU AI core tests passed.');
