"use strict";

const assert = require("node:assert/strict");
const { Gen9BattleService, FORMAT_ID } = require("./gen9-engine");

async function main() {
  const service = new Gen9BattleService();

  const first = await service.createBattle({
    playerName: "Gen9 Test",
    playerTeam: [{
      name: "Iron Moth",
      species: "ironmoth",
      level: 50,
      abilityId: "quarkdrive",
      heldItem: "boosterenergy",
      nature: "ひかえめ",
      ivs: { hp:31, atk:0, def:31, spa:31, spd:31, spe:31 },
      evs: { hp:4, atk:0, def:0, spa:252, spd:0, spe:252 },
      moves: ["fierydance", "sludgewave", "energyball", "uturn"]
    }]
  });

  assert.equal(first.format, FORMAT_ID);
  assert.ok(first.battleId);
  assert.ok(first.token);
  assert.ok(first.request);
  assert.ok(Array.isArray(first.request.active));
  assert.ok(first.request.active[0]?.moves?.length);

  const session = service.get(first.battleId, first.token);
  assert.equal(session.teams.p1[0].species, "Iron Moth");
  assert.equal(session.teams.p1[0].ability, "Quark Drive");
  assert.equal(session.teams.p1[0].item, "Booster Energy");

  const startLog = session.logs.join("\n");
  assert.ok(
    startLog.includes("Quark Drive") || startLog.includes("Booster Energy"),
    "Paradox ability or Booster Energy should appear in Showdown's entry log"
  );

  const next = await service.submitCpuAction(first.battleId, first.token, {
    moveIndex: 0
  }, first.logCursor || 0);

  assert.ok(next.request || next.done);
  assert.ok(next.logs.length > 0 || next.done);
  assert.equal(next.format, FORMAT_ID);

  assert.throws(
    () => service.get(first.battleId, "wrong-token"),
    /認証情報/
  );

  assert.equal(service.destroy(first.battleId), true);
  assert.equal(service.destroy(first.battleId), false);

  console.log("Generation 9 Showdown integration smoke test passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
