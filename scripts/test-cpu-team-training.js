'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/patches/v32-cpu-team-training.js'), 'utf8');
const moves = {
  closecombat: { id: 'closecombat', category: 'Physical', basePower: 120 },
  thunderbolt: { id: 'thunderbolt', category: 'Special', basePower: 90 }
};
let introCalled = false;
const window = {
  PokemonChampions2DCPU: { getDifficulty: () => 'normal' },
  beginBattleIntro(battle) { introCalled = true; return battle; },
  getMove(id) { return moves[id] || null; },
  resolvedMovePowerV2(move) { return Number(move.basePower || 0); },
  calcStats(mon) {
    return {
      hp: 100 + Math.floor(Number(mon.evs.hp || 0) / 4),
      atk: 80 + Math.floor(Number(mon.evs.atk || 0) / 4),
      def: 70 + Math.floor(Number(mon.evs.def || 0) / 4),
      spa: 80 + Math.floor(Number(mon.evs.spa || 0) / 4),
      spd: 70 + Math.floor(Number(mon.evs.spd || 0) / 4),
      spe: 90 + Math.floor(Number(mon.evs.spe || 0) / 4)
    };
  }
};
vm.runInNewContext(source, { window }, { filename: 'v32-cpu-team-training.js' });

const api = window.PokemonChampions2DCPU;
assert.ok(api && typeof api.tuneCpuTeam === 'function', 'team training API must be exposed');

function makeMon() {
  return {
    uid: 'cpu-1',
    level: 50,
    hp: 100,
    maxhp: 100,
    stats: { hp: 100, atk: 80, def: 70, spa: 80, spd: 70, spe: 90 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: [{ id: 'closecombat', pp: 5 }, { id: 'thunderbolt', pp: 10 }],
    heldItem: ''
  };
}

const normalMon = makeMon();
const normalBattle = { mode: 'singles', enemyTeam: [normalMon], playerTeam: [makeMon()] };
assert.equal(api.tuneCpuTeam(normalBattle, 'normal'), 1);
assert.deepEqual(JSON.parse(JSON.stringify(normalMon.evs)), { hp: 128, atk: 128, def: 0, spa: 0, spd: 0, spe: 252 });
assert.equal(normalMon.nature, 'ようき');
assert.equal(normalMon.heldItem, '');
assert.equal(normalMon.maxhp, 132);

const hardMon = makeMon();
assert.equal(api.tuneCpuMon(hardMon, 'hard'), true);
assert.equal(hardMon.evs.atk, 252);
assert.equal(hardMon.evs.spe, 252);
assert.equal(hardMon.evs.hp, 4);
assert.equal(hardMon.heldItem, 'lifeorb');
assert.equal(hardMon._cpuDifficulty, 'hard');

const expertMon = makeMon();
assert.equal(api.tuneCpuMon(expertMon, 'expert'), true);
assert.equal(expertMon.stats.atk, Math.floor((80 + 63) * 1.05));
assert.equal(expertMon.stats.hp, Math.floor((100 + 1) * 1.05));
assert.equal(expertMon._cpuTraining.expertStatMultiplier, 1.05);

const easyMon = makeMon();
const beforeEasyStats = JSON.stringify(easyMon.stats);
assert.equal(api.tuneCpuMon(easyMon, 'easy'), false);
assert.equal(JSON.stringify(easyMon.stats), beforeEasyStats);
assert.equal(easyMon.heldItem, '');

const raidMon = makeMon();
assert.equal(api.tuneCpuTeam({ mode: 'raid', enemyTeam: [raidMon] }, 'expert'), 0);
assert.equal(raidMon.heldItem, '');

introCalled = false;
const introBattle = { mode: 'singles', enemyTeam: [makeMon()] };
window.beginBattleIntro(introBattle);
assert.equal(introCalled, true, 'original battle intro must still run');
assert.equal(introBattle.enemyTeam[0]._cpuDifficulty, 'normal');

console.log('CPU team training tests passed.');
