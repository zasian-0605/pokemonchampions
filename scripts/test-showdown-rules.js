"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "js/patches/v37-showdown-rules.js"),
  "utf8"
);

let originalCalls = 0;
const logs = [];
const window = {
  abilityTriggerOnMove() {
    originalCalls++;
    return false;
  },
  battleLog(message) {
    logs.push(message);
  }
};

vm.runInNewContext(source, {
  window,
  console,
  String,
  Number,
  Object
}, { filename: "v37-showdown-rules.js" });

const rules = window.PokemonChampions2DShowdownRules;
assert.equal(rules.version, 37);
assert.equal(rules.isDreamEater({ id: "dream-eater" }), true);
assert.equal(rules.isDreamEater({ apiId: 138 }), true);
assert.equal(rules.isDreamEater({ jpName: "ゆめくい" }), true);

const actor = { name: "ムウマージ" };
const dreamEater = { id: "dreameater", apiId: 138, jpName: "ゆめくい" };
const awake = { name: "相手", status: null, abilityId: "levitate" };
const asleep = { name: "相手", status: "slp", abilityId: "levitate" };
const comatose = { name: "ネッコアラ", status: null, abilityId: "comatose" };

assert.equal(window.abilityTriggerOnMove(actor, awake, dreamEater, {}), true,
  "Dream Eater should be intercepted when the target is awake");
assert.equal(originalCalls, 0,
  "an awake target must not reach the normal move-hit/ability path");
assert.ok(logs.some(message => message.includes("眠っていない")),
  "the player should receive a clear failure message");

assert.equal(window.abilityTriggerOnMove(actor, asleep, dreamEater, {}), false,
  "Dream Eater should continue through the real battle effects when the target sleeps");
assert.equal(originalCalls, 1);

assert.equal(window.abilityTriggerOnMove(actor, comatose, dreamEater, {}), false,
  "Comatose is treated as asleep for Dream Eater");
assert.equal(originalCalls, 2);

const ordinaryMove = { id: "psychic" };
assert.equal(window.abilityTriggerOnMove(actor, awake, ordinaryMove, {}), false,
  "ordinary moves must remain unchanged");
assert.equal(originalCalls, 3);

const audit = rules.audit();
assert.equal(audit.version, 37);
assert.equal(audit.dreamEaterHook, true);
assert.equal(audit.asleepTargetAllowed, true);
assert.equal(audit.awakeTargetBlocked, true);
assert.equal(audit.comatoseTargetAllowed, true);

console.log("Showdown rules regression tests passed.");
