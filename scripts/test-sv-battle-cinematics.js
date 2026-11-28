"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "js/patches/v36-sv-battle-cinematics.js"),
  "utf8"
);
assert.doesNotThrow(() => new Function(source), "v36 patch must parse");

const classNames = new Set();
const field = {
  classList: {
    add(...names) { names.forEach((name) => classNames.add(name)); },
    remove(...names) { names.forEach((name) => classNames.delete(name)); },
    contains(name) { return classNames.has(name); }
  },
  querySelector() { return null; },
  appendChild() {},
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 300 }; },
  offsetWidth: 400
};
const appendedStyles = [];
const document = {
  head: { appendChild(node) { appendedStyles.push(node); } },
  createElement(tag) {
    return {
      tagName: tag,
      className: "",
      style: { setProperty() {} },
      setAttribute() {},
      appendChild() {},
      remove() {},
      classList: { add() {}, remove() {} }
    };
  },
  querySelector(selector) {
    if (selector === ".battlefield") return field;
    return null;
  }
};

const mon = {
  uid: "player-1", name: "テスト",
  hp: 100, maxhp: 100, fainted: false,
  abilityId: "drizzle",
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 }
};
const foe = {
  uid: "enemy-1", name: "相手",
  hp: 100, maxhp: 100, fainted: false,
  abilityId: "clearbody",
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 }
};
const battle = {
  turn: 2,
  weather: null,
  weatherTurns: 0,
  playerTeam: [mon],
  playerActive: [0],
  enemyTeam: [foe],
  enemyActive: [0],
  log: []
};

const callDelays = [];
const W = {
  document,
  setTimeout(callback, ms) {
    callDelays.push(ms);
    callback();
    return callDelays.length;
  },
  matchMedia() { return { matches: false }; },
  PokemonChampions2DBattleRuntime: { getBattle: () => battle },
  renderBattlePage() {
    return '<div class="battlefield weather-clear"><div class="battle-stars"></div>' +
      '<div class="combat-info player slot-0"><div class="hp-track"><i style="width:100%"></i></div></div></div>';
  },
  applyBoosts(target, boosts) {
    for (const [stat, amount] of Object.entries(boosts || {})) {
      target.stages[stat] = Math.max(-6, Math.min(6, target.stages[stat] + amount));
    }
  },
  triggerEntryEffects(entering, foes, current) {
    for (const active of entering || []) {
      if (active.abilityId === "drizzle") {
        current.weather = "rain";
        current.weatherTurns = 5;
      }
    }
  },
  applyWeather(weather, current) {
    current.weather = weather;
    current.weatherTurns = 5;
  },
  applyTerrain() {},
  beginBattleIntro() { return "intro"; },
  battleCinematicPause(ms) {
    callDelays.push(ms);
    return Promise.resolve(ms);
  },
  executeAction() { foe.stages.atk = -1; },
  executeTurn() { return Promise.resolve("turn"); },
  setBattleCamera() {},
  clearBattleCamera() {},
  animateCinematicProjectile() { return Promise.resolve("projectile"); },
  animateCinematicPulse() { return Promise.resolve("pulse"); }
};

vm.runInNewContext(source, {
  window: W,
  document,
  setTimeout: W.setTimeout,
  Promise,
  Map,
  Set,
  Number,
  String,
  Object,
  Array,
  Math,
  console
}, { filename: "v36-sv-battle-cinematics.js" });

assert.equal(W.PokemonChampions2DSVCinematics.version, 36);
assert.equal(appendedStyles.length, 1, "cinematic CSS should be injected");

const initialHtml = W.renderBattlePage();
assert.ok(initialHtml.includes('class="v36-weather-layer"'),
  "weather layer should be inserted into the battlefield");
mon.hp = 62;
const damagedHtml = W.renderBattlePage();
assert.ok(damagedHtml.includes('data-v36-hp-motion="drain"'),
  "HP decrease should receive a drain animation");
assert.ok(damagedHtml.includes("--v36-hp-from:100.00%"),
  "HP animation should remember the previous HP ratio");
assert.ok(damagedHtml.includes("--v36-hp-to:62.00%"),
  "HP animation should target the real current HP ratio");

W.applyBoosts(mon, { atk: 2 }, "つるぎのまい");
assert.equal(mon.stages.atk, 2, "boost wrapper must preserve the real stat-stage update");
assert.equal(battle._v36PendingStatEvents.length, 1);
assert.equal(battle._v36PendingStatEvents[0].delta, 2);
assert.equal(battle._v36PendingStatEvents[0].stat, "atk");

W.executeAction({}, battle);
assert.ok(battle._v36PendingStatEvents.some((event) =>
  event.uid === "enemy-1" && event.stat === "atk" && event.delta === -1
), "direct stat changes made by battle effects should also be shown");

W.triggerEntryEffects([mon], [], battle);
assert.equal(battle.weather, "rain", "entry ability must still set the actual weather");
assert.equal(battle.weatherTurns, 5, "weather duration must remain five turns");
assert.ok(battle._v36EntryRunning || battle._v36EntryTasks.length >= 1, "weather start should be queued as a cinematic");

W.setBattleCamera("player", 0, "かみなり", "テスト が技を放つ！");
assert.ok(classNames.has("v36-camera-attacker"), "attacker camera should apply its close-up class");
W.setBattleCamera("enemy", 0, "HIT!", "相手に命中！");
assert.ok(classNames.has("v36-camera-defender"), "defender camera should apply its close-up class");
W.clearBattleCamera();
assert.ok(!classNames.has("v36-camera-attacker") && !classNames.has("v36-camera-defender"),
  "camera classes should clear after an action");

(async () => {
  await W.battleCinematicPause(100);
  assert.ok(callDelays.includes(122), "normal cinematic pauses should be paced more slowly");
  const result = await W.executeTurn([]);
  assert.equal(result, "turn", "turn execution should remain connected");
  console.log("SV battle cinematics tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});