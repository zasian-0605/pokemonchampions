"use strict";

const crypto = require("node:crypto");

const WORK_INTERVAL_MS = 80;
const MAX_RESULT_SAMPLES = 200;
const TERA_OPTIONS = [
  null, "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy", "Stellar"
];

function idOf(value) {
  return String(value || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}
function safeInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}
function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(body));
}
async function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    let tooLarge = false;
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on("data", chunk => {
      size += chunk.length;
      if (size > (maxBytes || 64 * 1024)) {
        tooLarge = true;
        body = "";
        return;
      }
      if (!tooLarge) body += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (tooLarge) {
        fail(new Error("リクエストが大きすぎます。"));
        return;
      }
      try {
        if (settled) return;
        settled = true;
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        fail(new Error("JSON形式が正しくありません。"));
      }
    });
    req.on("error", fail);
    req.on("aborted", () => fail(new Error("リクエストが途中で中断されました。")));
  });
}

function makePlan(catalog) {
  const species = (catalog.species || []).filter(row => row && row.id && row.name);
  const moves = (catalog.moves || []).filter(row => row && row.id && row.name);
  const items = (catalog.items || []).filter(row => row && row.id && row.name);
  const abilityCases = [];

  for (const mon of species) {
    for (const [slot, value] of Object.entries(mon.abilities || {})) {
      const abilityId = idOf(value);
      if (!abilityId) continue;
      abilityCases.push({
        speciesId: mon.id,
        speciesName: mon.name,
        abilityId,
        abilityName: String(value),
        slot
      });
    }
  }

  const testMove = moves.find(move => move.id === "tackle") ||
    moves.find(move => move.category !== "Status" && Number(move.basePower) > 0) ||
    moves[0] || null;
  const itemChoices = items.length + 1;
  const matrixTotal = species.length * moves.length * TERA_OPTIONS.length * itemChoices;
  return {
    species,
    moves,
    items,
    abilityCases,
    testMove,
    itemChoices,
    matrixTotal,
    total: matrixTotal + abilityCases.length,
    counts: {
      species: species.length,
      moves: moves.length,
      items: items.length,
      abilities: abilityCases.length,
      teraOptions: TERA_OPTIONS.length,
      itemOptionsPerTest: itemChoices
    }
  };
}

function payloadAt(plan, cursor) {
  if (cursor < plan.matrixTotal) {
    let value = cursor;
    const itemIndex = value % plan.itemChoices;
    value = Math.floor(value / plan.itemChoices);
    const teraIndex = value % TERA_OPTIONS.length;
    value = Math.floor(value / TERA_OPTIONS.length);
    const moveIndex = value % plan.moves.length;
    const speciesIndex = Math.floor(value / plan.moves.length);

    const mon = plan.species[speciesIndex];
    const move = plan.moves[moveIndex];
    const item = itemIndex === 0 ? null : plan.items[itemIndex - 1];
    const teraType = TERA_OPTIONS[teraIndex];
    const abilityName = Object.values(mon.abilities || {})[0] || "";
    return {
      case_key: "matrix:" + mon.id + ":" + move.id + ":" +
        (teraType || "no-tera") + ":" + (item?.id || "no-item"),
      kind: "pokemon-move-tera-item",
      payload: {
        suite: "full-matrix",
        speciesId: mon.id,
        speciesName: mon.name,
        moveId: move.id,
        moveName: move.name,
        abilityId: idOf(abilityName),
        itemId: item?.id || "",
        itemName: item?.name || "持ち物なし",
        teraType,
        terastallize: teraType !== null,
        targetSpeciesId: "chansey"
      }
    };
  }

  const ability = plan.abilityCases[cursor - plan.matrixTotal];
  const move = plan.testMove;
  if (!ability || !move) return null;
  return {
    case_key: "ability:" + ability.speciesId + ":" + ability.abilityId + ":" + ability.slot,
    kind: "species-ability",
    payload: {
      suite: "ability-check",
      speciesId: ability.speciesId,
      speciesName: ability.speciesName,
      moveId: move.id,
      moveName: move.name,
      abilityId: ability.abilityId,
      abilityName: ability.abilityName,
      itemId: "",
      teraType: null,
      terastallize: false,
      targetSpeciesId: "chansey"
    }
  };
}

class AutoAuditLab {
  constructor(options) {
    this.battles = options.battleService;
    this.plan = null;
    this.job = null;
    this.timer = null;
    this.busy = false;
  }

  async init() {
    this.startWorker();
    console.log("[audit-lab] memory-only exhaustive audit is ready.");
    return true;
  }

  startWorker() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.processOne().catch(error =>
        console.error("[audit-lab] worker error:", error?.message || error)
      );
    }, WORK_INTERVAL_MS);
    this.timer.unref?.();
  }

  health() {
    const catalog = this.battles.catalog();
    const plan = makePlan(catalog);
    return {
      ok: true,
      mode: "memory-only",
      databaseRequired: false,
      adminRequired: false,
      aiRequired: false,
      teraOptions: TERA_OPTIONS,
      counts: {
        ...plan.counts,
        matrixCases: plan.matrixTotal,
        abilityCases: plan.abilityCases.length,
        totalCases: plan.total
      }
    };
  }

  createJob() {
    if (this.job && ["running", "paused"].includes(this.job.status)) {
      throw new Error("検証がすでに進行中または一時停止中です。");
    }
    this.plan = makePlan(this.battles.catalog());
    if (!this.plan.species.length || !this.plan.moves.length || !this.plan.total) {
      throw new Error("検証対象のポケモン・技データを読み込めませんでした。");
    }
    const now = new Date().toISOString();
    this.job = {
      id: crypto.randomUUID(),
      status: "running",
      createdAt: now,
      startedAt: now,
      finishedAt: null,
      total: this.plan.total,
      matrixTotal: this.plan.matrixTotal,
      abilityTotal: this.plan.abilityCases.length,
      cursor: 0,
      completed: 0,
      verified: 0,
      unverified: 0,
      failed: 0,
      counts: this.plan.counts,
      durationMs: 0,
      lastCase: null,
      results: []
    };
    return this.snapshot();
  }

  snapshot() {
    if (!this.job) return null;
    const job = this.job;
    const remaining = Math.max(0, job.total - job.completed);
    const elapsedMs = job.startedAt ? Math.max(0, Date.now() - Date.parse(job.startedAt)) : 0;
    const averageMs = job.completed ? job.durationMs / job.completed : 0;
    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      total: job.total,
      matrixTotal: job.matrixTotal,
      abilityTotal: job.abilityTotal,
      completed: job.completed,
      verified: job.verified,
      unverified: job.unverified,
      failed: job.failed,
      pending: remaining,
      percent: job.total ? Math.min(100, job.completed / job.total * 100) : 0,
      counts: job.counts,
      elapsedMs,
      averageMs,
      estimatedRemainingMs: averageMs ? remaining * averageMs : null,
      lastCase: job.lastCase,
      storedResultSamples: job.results.length,
      resultSampleLimit: MAX_RESULT_SAMPLES
    };
  }

  async processOne() {
    if (this.busy || !this.job || this.job.status !== "running") return;
    const job = this.job;
    const plan = this.plan;
    if (!plan || job.completed >= job.total) {
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
      return;
    }
    this.busy = true;
    const index = job.cursor;
    const entry = payloadAt(plan, index);
    if (!entry) {
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
      this.busy = false;
      return;
    }
    job.cursor++;
    const started = Date.now();
    let record;
    try {
      const result = await this.battles.runAuditCase(entry.payload);
      const teraExpected = entry.payload.terastallize === true;
      const passed = result.moveWasUsed && (!teraExpected || result.teraApplied);
      if (passed) job.verified++;
      else job.unverified++;
      record = {
        index: index + 1,
        case_key: entry.case_key,
        kind: entry.kind,
        status: passed ? "verified" : "unverified",
        payload: entry.payload,
        result: {
          accepted: result.accepted,
          moveWasUsed: result.moveWasUsed,
          teraExpected,
          teraApplied: result.teraApplied,
          requestedTeraType: result.requestedTeraType,
          actualTeraType: result.actualTeraType,
          heldItem: result.heldItem,
          itemActivationLines: result.itemActivationLines || [],
          before: result.before,
          after: result.after,
          logs: (result.logs || []).slice(0, 36),
          error: result.error || null
        }
      };
    } catch (error) {
      job.failed++;
      record = {
        index: index + 1,
        case_key: entry.case_key,
        kind: entry.kind,
        status: "error",
        payload: entry.payload,
        error: String(error?.message || error).slice(0, 1000)
      };
    } finally {
      const duration = Date.now() - started;
      job.durationMs += duration;
      job.completed++;
      job.lastCase = {
        index: index + 1,
        case_key: entry.case_key,
        status: record?.status || "error"
      };
      if (record) {
        job.results.push(record);
        if (job.results.length > MAX_RESULT_SAMPLES) job.results.shift();
      }
      if (job.completed >= job.total && job.status === "running") {
        job.status = "completed";
        job.finishedAt = new Date().toISOString();
      }
      this.busy = false;
    }
  }

  getReport() {
    if (!this.job) return null;
    return {
      exportedAt: new Date().toISOString(),
      mode: "memory-only",
      note: "サーバーに永続保存していません。以下の検査記録はメモリ内に保持された直近サンプルです。全件ログではありません。",
      job: this.snapshot(),
      coverage: {
        species: this.plan?.counts.species || 0,
        moves: this.plan?.counts.moves || 0,
        teraOptions: TERA_OPTIONS,
        itemOptions: this.plan?.counts.itemOptionsPerTest || 0,
        matrixCases: this.job.matrixTotal,
        abilityCases: this.job.abilityTotal
      },
      resultSamples: this.job.results,
      resultSamplesTruncated: this.job.completed > this.job.results.length
    };
  }

  async handle(req, res, url) {
    const pathname = url.pathname;
    if (req.method === "GET" && pathname === "/api/audit/health") {
      return json(res, 200, this.health());
    }
    if (req.method === "POST" && pathname === "/api/audit/jobs") {
      try {
        await readBody(req);
        return json(res, 201, { job: this.createJob() });
      } catch (error) {
        return json(res, 400, { error: error?.message || "検証を開始できませんでした。" });
      }
    }
    if (req.method === "GET" && pathname === "/api/audit/jobs/latest") {
      return json(res, 200, { job: this.snapshot() });
    }

    const match = pathname.match(/^\/api\/audit\/jobs\/([a-f0-9-]+)(?:\/(pause|resume|cancel|results|export))?$/);
    if (!match) return json(res, 404, { error: "Audit API endpoint not found." });
    if (!this.job || match[1] !== this.job.id) {
      return json(res, 404, { error: "検証ジョブが見つかりません。" });
    }
    const action = match[2] || "";
    if (action === "pause" && req.method === "POST") {
      if (this.job.status === "running") this.job.status = "paused";
      return json(res, 200, { job: this.snapshot() });
    }
    if (action === "resume" && req.method === "POST") {
      if (this.job.status === "paused") this.job.status = "running";
      return json(res, 200, { job: this.snapshot() });
    }
    if (action === "cancel" && req.method === "POST") {
      if (["running", "paused"].includes(this.job.status)) {
        this.job.status = "cancelled";
        this.job.finishedAt = new Date().toISOString();
      }
      return json(res, 200, { job: this.snapshot() });
    }
    if (action === "results" && req.method === "GET") {
      const limit = safeInt(url.searchParams.get("limit"), 1, 100, 30);
      return json(res, 200, {
        results: this.job.results.slice(-limit),
        storedResultSamples: this.job.results.length,
        resultSampleLimit: MAX_RESULT_SAMPLES
      });
    }
    if (action === "export" && req.method === "GET") {
      return json(res, 200, this.getReport());
    }
    if (!action && req.method === "GET") return json(res, 200, { job: this.snapshot() });
    return json(res, 405, { error: "Method Not Allowed" });
  }
}

module.exports = { AutoAuditLab };