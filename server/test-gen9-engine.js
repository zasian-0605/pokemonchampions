"use strict";

const assert = require("node:assert/strict");
const { Gen9BattleService, FORMAT_ID } = require("./gen9-engine");

async function main() {
  const service = new Gen9BattleService();
  const catalog = service.catalog();
  assert.ok(catalog.moves.length > 500);
  assert.ok(catalog.abilities.some(item => item.id === "quarkdrive"));
  assert.ok(catalog.items.some(item => item.id === "boosterenergy"));

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

  const teraAudit = await service.runAuditCase({
    speciesId: "mew",
    speciesName: "Mew",
    moveId: "tackle",
    abilityId: "synchronize",
    itemId: "lifeorb",
    teraType: "Fire",
    terastallize: true,
    targetSpeciesId: "chansey"
  });
  assert.equal(teraAudit.moveWasUsed, true, "audit case should execute the selected move");
  assert.equal(teraAudit.teraApplied, true, "audit case should actually Terastallize");
  assert.equal(teraAudit.actualTeraType, "Fire");
  assert.equal(teraAudit.heldItem, "lifeorb");

  const { AutoAuditLab } = require("./auto-audit");
  const auditLab = new AutoAuditLab({ battleService: service });
  const auditHealth = auditLab.health();
  assert.equal(auditHealth.mode, "memory-only");
  assert.equal(auditHealth.databaseRequired, false);
  assert.equal(auditHealth.adminRequired, false);
  assert.equal(auditHealth.counts.teraOptions, 20);
  assert.equal(
    auditHealth.counts.matrixCases,
    auditHealth.counts.species * auditHealth.counts.moves * 20 * (auditHealth.counts.items + 1)
  );
  const auditJob = auditLab.createJob();
  assert.equal(auditJob.status, "running");
  assert.equal(auditJob.total, auditHealth.counts.totalCases);
  auditLab.job.status = "cancelled";

  const online = await service.createBattle({
    kind: "online",
    player1Name: "Player A",
    player2Name: "Player B",
    playerTeam: [{
      name: "Iron Moth A",
      species: "ironmoth",
      level: 50,
      abilityId: "quarkdrive",
      heldItem: "boosterenergy",
      nature: "ひかえめ",
      moves: ["fierydance", "sludgewave", "energyball", "uturn"]
    }],
    opponentTeam: [{
      name: "Iron Moth B",
      species: "ironmoth",
      level: 50,
      abilityId: "quarkdrive",
      heldItem: "boosterenergy",
      nature: "ひかえめ",
      moves: ["fierydance", "sludgewave", "energyball", "uturn"]
    }]
  });
  const onlineSession = service.get(online.battleId, online.token, "p1");
  const p2 = service.snapshot(onlineSession, "p2", 0);
  assert.ok(p2.token);
  assert.notEqual(online.token, p2.token, "each online player must have a different session token");
  assert.ok(online.request?.active?.[0]?.moves?.length);
  assert.ok(p2.request?.active?.[0]?.moves?.length);

  service.validateAction(online.battleId, online.token, "p1", { moveIndex:0 });
  service.validateAction(online.battleId, p2.token, "p2", { moveIndex:0 });
  const onlineNext = await service.submitOnlineTurn(
    online.battleId,
    online.token,
    p2.token,
    { p1:{ moveIndex:0 }, p2:{ moveIndex:0 } },
    online.logCursor || 0,
    p2.logCursor || 0
  );
  assert.ok(onlineNext.p1.request || onlineNext.p1.done);
  assert.ok(onlineNext.p2.request || onlineNext.p2.done);
  assert.equal(onlineNext.p1.token, online.token);
  assert.equal(onlineNext.p2.token, p2.token);
  assert.equal(service.destroy(online.battleId), true);

  console.log("Generation 9 Showdown CPU and online integration smoke tests passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
