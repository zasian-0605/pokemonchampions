'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/patches/v33-cpu-switching.js'), 'utf8');
const moves = {
  waterpulse: { id: 'waterpulse', type: 'Water', basePower: 100 },
  fireblast: { id: 'fireblast', type: 'Fire', basePower: 80 },
  leafblade: { id: 'leafblade', type: 'Grass', basePower: 120 }
};
const effectiveness = {
  Water: { Fire: 2, Grass: 0.5, Rock: 2 },
  Fire: { Rock: 0.5, Grass: 2 },
  Grass: { Rock: 2, Fire: 0.5 }
};
const window = {
  PokemonChampions2DCPU: {
    getDifficulty: () => 'hard',
    scoreCandidate(actor, defender, slot) {
      const move = moves[slot.id];
      if (!move) return { score: 0, effectiveness: 1 };
      let mult = 1;
      for (const type of defender.types || []) mult *= effectiveness[move.type]?.[type] || 1;
      const stab = (actor.types || []).includes(move.type) ? 1.5 : 1;
      return { score: move.basePower * mult * stab, effectiveness: mult };
    }
  },
  beginBattleIntro(battle) { return battle; },
  chooseEnemyAction() { return { actorUid: 'cpu-fire', moveId: 'fireblast' }; }
};
vm.runInNewContext(source, { window }, { filename: 'v33-cpu-switching.js' });

const cpuFire = {
  uid: 'cpu-fire', types: ['Fire'], hp: 100, maxhp: 100,
  moves: [{ id: 'fireblast', pp: 5 }], volatile: {}, _cpuDifficulty: 'hard'
};
const cpuGrass = {
  uid: 'cpu-grass', types: ['Grass'], hp: 100, maxhp: 100,
  moves: [{ id: 'leafblade', pp: 5 }], volatile: {}, _cpuDifficulty: 'hard'
};
const playerRock = {
  uid: 'player-rock', types: ['Rock'], hp: 100, maxhp: 100,
  moves: [{ id: 'waterpulse', pp: 10 }], volatile: {}
};
const battle = {
  mode: 'singles', turn: 1, result: null,
  enemyTeam: [cpuFire, cpuGrass], enemyActive: [0],
  playerTeam: [playerRock], playerActive: [0]
};

window.beginBattleIntro(battle);
const action = window.chooseEnemyAction(cpuFire, playerRock);
assert.equal(action.switchTo, 1, 'hard CPU should switch from a dangerous matchup to a safer counter');
assert.equal(action.actorUid, 'cpu-fire');
assert.deepEqual(JSON.parse(JSON.stringify(battle._cpuSwitchReservations)), [1]);

const repeated = window.chooseEnemyAction(cpuFire, playerRock);
assert.equal(repeated.moveId, 'fireblast', 'the same replacement must not be reserved twice in one turn');

const easyBattle = {
  mode: 'singles', turn: 1, enemyTeam: [cpuFire, cpuGrass], enemyActive: [0],
  playerTeam: [playerRock], playerActive: [0]
};
cpuFire._cpuDifficulty = 'easy';
window.beginBattleIntro(easyBattle);
assert.equal(window.chooseEnemyAction(cpuFire, playerRock).switchTo, undefined,
  'easy CPU must not use tactical switching');

cpuFire._cpuDifficulty = 'hard';
cpuFire.volatile.trapped = true;
const trappedBattle = {
  mode: 'singles', turn: 2, enemyTeam: [cpuFire, cpuGrass], enemyActive: [0],
  playerTeam: [playerRock], playerActive: [0]
};
window.beginBattleIntro(trappedBattle);
assert.equal(window.chooseEnemyAction(cpuFire, playerRock).switchTo, undefined,
  'trapped CPU must not switch');

console.log('CPU switching tests passed.');
