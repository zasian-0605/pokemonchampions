"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const WORKER_BUNDLE = path.join(ROOT, "js", "gen9-local-engine.worker.js");
const WORKER_UI = path.join(ROOT, "js", "patches", "v27-gen9-battle-ui.js");

function validTeam() {
  return [{
    name: "Browser Worker Test",
    species: "snorlax",
    level: 100,
    ability: "thickfat",
    item: "leftovers",
    nature: "Careful",
    teraType: "Normal",
    ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    evs: { hp:252, atk:0, def:0, spa:0, spd:4, spe:252 },
    moves: ["body-slam", "earthquake", "curse", "rest"]
  }];
}

async function testBrowserWorkerCpuBattle() {
  assert.ok(fs.existsSync(WORKER_BUNDLE), "postinstall should create the browser Worker bundle");
  const source = fs.readFileSync(WORKER_BUNDLE, "utf8");
  assert.ok(source.length > 100000, "browser Worker bundle should contain the Showdown simulator");

  let messageHandler = null;
  let nextId = 0;
  const pending = new Map();
  const self = {
    addEventListener(type, handler) {
      if (type === "message") messageHandler = handler;
    },
    postMessage(message) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.ok) waiter.resolve(message.result);
      else waiter.reject(new Error(message.error || "Worker returned an unknown error"));
    }
  };

  const context = {
    self,
    crypto: webcrypto,
    console,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    performance
  };
  vm.runInNewContext(source, context, { filename: "gen9-local-engine.worker.js", timeout: 30000 });
  assert.equal(typeof messageHandler, "function", "Worker message handler should be registered");

  function call(type, payload = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Worker command timed out: " + type));
      }, 45000);
      pending.set(id, { resolve, reject, timer });
      messageHandler({ data: { id, type, ...payload } });
    });
  }

  const started = await call("start", {
    playerTeam: validTeam(),
    playerName: "Worker Smoke Test"
  });
  assert.ok(started.battleId, "CPU battle should return a battle ID");
  assert.ok(started.request, "CPU battle should return the first player request");
  assert.ok(started.request.active?.[0]?.moves?.length, "CPU battle should expose selectable moves");
  assert.equal(started.format, "gen9nationaldexag");

  const next = await call("action", {
    action: { moveIndex: 0 },
    cursor: started.logCursor || 0
  });
  assert.ok(next.request || next.done, "the Worker should resolve at least one battle turn");
  assert.ok(next.logs.length > 0 || next.done, "the battle turn should produce a log or finish");

  const mechanics = await call("diagnose", { playerTeam: validTeam() });
  assert.equal(mechanics.ok, true, "the local Showdown mechanics audit should complete");
  const dreamAudit = mechanics.mechanicsAudit?.dreamEater || {};
  assert.equal(dreamAudit.available, true, "Showdown should expose Dream Eater's immunity rule");
  assert.equal(dreamAudit.awakeRejected, true, "Dream Eater should fail against an awake target");
  assert.equal(dreamAudit.asleepAllowed, true, "Dream Eater should work against a sleeping target");
  assert.equal(dreamAudit.comatoseAllowed, true, "Comatose should count as asleep for Dream Eater");
  assert.equal(
    mechanics.mechanicsAudit?.availableSvAbilities,
    mechanics.mechanicsAudit?.totalCheckedSvAbilities,
    "the bundled Showdown simulator should expose all sampled SV ability event hooks"
  );

  await call("stop");
}

async function testWorkerFailureDoesNotSwitchEngines() {
  const source = fs.readFileSync(WORKER_UI, "utf8");
  const handlers = [];
  const workerInstances = [];
  const toasts = [];
  const owned = {
    uid: "fallback-test-mon",
    name: "Snorlax",
    speciesId: "snorlax",
    level: 50,
    moves: ["body-slam"],
    abilityId: "thickfat",
    heldItem: "leftovers",
    nature: "わんぱく",
    ivs: {},
    evs: {}
  };
  const state = { page: "home", team: [owned.uid], owned: [owned] };
  const main = { innerHTML: "", focus() {} };
  const document = {
    currentScript: { src: "https://example.test/js/patches/v27-gen9-battle-ui.js?v=33.0.0" },
    baseURI: "https://example.test/index.html",
    head: { appendChild() {} },
    getElementById(id) { return id === "main" ? main : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { textContent: "", appendChild() {} }; },
    addEventListener(type, handler) { if (type === "click") handlers.push(handler); }
  };
  class FailingWorker {
    constructor(url) {
      this.url = url;
      this.terminated = false;
      workerInstances.push(this);
      setTimeout(() => this.onerror?.({ message: "simulated Worker/MessagePort failure" }), 0);
    }
    postMessage() {}
    terminate() { this.terminated = true; }
  }

  const window = {
    PokemonChampions2D: {
      state,
      getMove(id) { return { showdownId: id }; }
    },
    setPage(page) { state.page = page; },
    toast(message, kind) { toasts.push({ message, kind }); }
  };
  const context = {
    window,
    document,
    Worker: FailingWorker,
    URL,
    WebSocket: { OPEN: 1 },
    location: { protocol: "https:", host: "example.test" },
    fetch: () => Promise.resolve({ ok: false }),
    setTimeout,
    clearTimeout,
    console
  };
  vm.runInNewContext(source, context, { filename: "v27-gen9-battle-ui.js", timeout: 10000 });

  const api = window.PokemonChampions2DGen9;
  assert.equal(api.version, "33.0.0", "the updated Gen 9 UI should be loaded");
  api.open();
  const clickHandler = handlers.find(Boolean);
  assert.equal(typeof clickHandler, "function", "the UI click handler should be installed");
  const button = { dataset: { g9: "start" } };
  const event = {
    target: {
      closest(selector) {
        return selector === "[data-g9]" ? button : null;
      }
    },
    preventDefault() {},
    stopImmediatePropagation() {}
  };
  clickHandler(event);

  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(state.page, "gen9-battle", "Worker startup failure should keep the player on the Showdown page");
  assert.deepEqual(state.team, [owned.uid], "the selected team should be preserved");
  assert.ok(workerInstances.length > 0, "the test should instantiate the Worker");
  assert.ok(workerInstances[0].url.includes("/js/gen9-local-engine.worker.js?v=33.0.0"),
    "the Worker URL should resolve from the patch script path");
  assert.ok(workerInstances[0].terminated, "the failed Worker should be terminated");
  assert.equal(toasts.length, 0, "Showdown startup failure must not silently switch battle engines");
  assert.ok(main.innerHTML.includes("独自エンジンには自動で切り替えていません"),
    "the player should see that Showdown did not start and that no fallback was performed");
}

async function main() {
  await testBrowserWorkerCpuBattle();
  console.log("PASS: browser-local Showdown Worker starts a CPU battle and resolves a turn.");
  await testWorkerFailureDoesNotSwitchEngines();
  console.log("PASS: Worker startup failure stays on the Showdown page and does not silently switch engines.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
