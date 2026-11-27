'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const patch = fs.readFileSync(path.join(root, 'js/patches/v31-cpu-difficulty.js'), 'utf8');
const listeners = {};
const storage = new Map();
const moves = {
  fireblast: { id: 'fireblast', type: 'Fire', category: 'Special', basePower: 110, accuracy: 85, priority: 0 },
  waterpulse: { id: 'waterpulse', type: 'Water', category: 'Special', basePower: 60, accuracy: 100, priority: 0 }
};

const window = {
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  document: {
    addEventListener(type, callback) { listeners[type] = callback; }
  },
  getMove(id) { return moves[id] || null; },
  isMoveClassifiedDamageV2(move) { return !!move && move.category !== 'Status' && Number(move.basePower) > 0; },
  resolvedMovePowerV2(move) { return Number(move.basePower || 0); },
  resolveMoveTypePower(move) { return { type: move.type, power: Number(move.basePower || 0) }; },
  monSpecies(mon) { return { types: mon.types || [] }; },
  typeMult(type, species) {
    const types = species && species.types || [];
    let mult = 1;
    for (const defendingType of types) {
      if (type === 'Fire' && defendingType === 'Grass') mult *= 2;
      if (type === 'Water' && defendingType === 'Grass') mult *= 0.5;
    }
    return mult;
  },
  currentStat(mon, key) { return Number(mon.stats && mon.stats[key] || 1); },
  chooseEnemyAction() { return { actorUid: 'enemy-1', moveId: 'baseline' }; },
  renderBattlePage() { return '<div class="grid two-col"><button data-action="battle-mode">Start</button></div>'; },
  beginBattleIntro(battle) { return battle; },
  toast() {}
};

vm.runInNewContext(patch, { window, Math, Set, Number, String, Object, Array });

const api = window.PokemonChampions2DCPU;
assert.ok(api, 'CPU difficulty API must be installed');
assert.equal(api.normalizeDifficulty('HARD'), 'hard');
assert.equal(api.normalizeDifficulty('unknown'), 'normal');
assert.equal(api.getDifficulty(), 'normal');

const selectHtml = window.renderBattlePage();
assert.ok(selectHtml.includes('id="cpu-difficulty"'), 'battle setup must show the difficulty selector');
assert.ok(selectHtml.includes('value="expert"'), 'battle setup must offer Expert difficulty');

listeners.change({ target: { id: 'cpu-difficulty', value: 'hard' } });
assert.equal(api.getDifficulty(), 'hard');
assert.equal(storage.get('pokemon-champions-cpu-difficulty'), 'hard');

const battle = { enemyTeam: [{ uid: 'enemy-1' }] };
window.beginBattleIntro(battle);
assert.equal(battle.enemyTeam[0]._cpuDifficulty, 'hard', 'selected difficulty must be attached to CPU battle members');

const enemy = {
  uid: 'enemy-1',
  level: 50,
  types: ['Water'],
  stats: { atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
  moves: [{ id: 'waterpulse', pp: 10 }, { id: 'fireblast', pp: 5 }]
};
const target = {
  uid: 'player-1',
  hp: 100,
  maxhp: 100,
  types: ['Grass'],
  stats: { atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }
};
const chosen = window.chooseEnemyAction(enemy, target);
assert.equal(chosen.moveId, 'fireblast', 'hard CPU must prefer the super-effective move over the resisted move');

enemy._cpuDifficulty = 'easy';
assert.equal(window.chooseEnemyAction(enemy, target).moveId, 'baseline',
  'easy CPU must retain the original relaxed move selection');

const score = api.estimateDamageScore({
  level: 50, power: 100, attack: 100, defense: 100,
  effectiveness: 0, stab: 1, accuracy: 100, targetHp: 50
}, 'expert');
assert.equal(score, 0, 'immune moves must receive no damage score');

console.log('CPU difficulty tests passed.');
