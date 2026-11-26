"use strict";

const crypto = require("node:crypto");

const REVIEW_BATCH_SIZE = 10;
const WORK_INTERVAL_MS = 1200;
const MOVE_SKIP_WORDS = ["2ターン", "ためて", "反動で", "自分もひんし", "次のターン"];

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
    req.on("data", chunk => {
      size += chunk.length;
      if (size > (maxBytes || 256 * 1024)) {
        reject(new Error("リクエストが大きすぎます。"));
        req.destroy();
      } else body += chunk.toString("utf8");
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (_) { reject(new Error("JSON形式が正しくありません。")); }
    });
    req.on("error", reject);
  });
}
function pickSpeciesMove(species, moves) {
  const types = new Set((species.types || []).map(String));
  const candidates = moves.filter(move =>
    types.has(move.type) &&
    move.category !== "Status" &&
    Number(move.basePower) >= 35 &&
    Number(move.basePower) <= 95 &&
    !MOVE_SKIP_WORDS.some(word => String(move.shortDesc || "").includes(word))
  );
  const usable = candidates.length ? candidates : moves.filter(move =>
    move.category !== "Status" && Number(move.basePower) > 0
  );
  if (!usable.length) return moves.find(move => move.id === "tackle") || moves[0] || null;
  const seed = [...String(species.id || species.name || "")].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return usable[seed % usable.length];
}
function firstAbility(species) {
  const values = Object.values(species.abilities || {});
  return values.length ? idOf(values[0]) : "";
}
function buildCases(catalog) {
  const cases = [];
  const species = (catalog.species || []).filter(x => x && x.id);
  const moves = (catalog.moves || []).filter(x => x && x.id);
  const abilities = (catalog.abilities || []).filter(x => x && x.id);
  const items = (catalog.items || []).filter(x => x && x.id);
  const abilityOwners = new Map();

  for (const mon of species) {
    for (const value of Object.values(mon.abilities || {})) {
      const abilityId = idOf(value);
      if (abilityId && !abilityOwners.has(abilityId)) abilityOwners.set(abilityId, mon);
    }
  }

  for (const mon of species) {
    const move = pickSpeciesMove(mon, moves);
    if (!move) continue;
    cases.push({
      case_key: "species:" + mon.id,
      kind: "species",
      payload: {
        kind: "species", speciesId: mon.id, speciesName: mon.name,
        moveId: move.id, moveName: move.name, abilityId: firstAbility(mon),
        targetSpeciesId: "chansey"
      }
    });
  }
  for (const move of moves) {
    cases.push({
      case_key: "move:" + move.id,
      kind: "move",
      payload: {
        kind: "move", speciesId: "mew", speciesName: "ミュウ（共通検証役）",
        moveId: move.id, moveName: move.name, abilityId: "synchronize",
        targetSpeciesId: "chansey",
        moveMeta: {
          type: move.type, category: move.category, basePower: move.basePower,
          accuracy: move.accuracy, shortDesc: move.shortDesc || ""
        }
      }
    });
  }
  for (const ability of abilities) {
    const owner = abilityOwners.get(ability.id);
    if (!owner) continue;
    const move = moves.find(x => x.id === "tackle") || moves[0];
    if (!move) continue;
    cases.push({
      case_key: "ability:" + ability.id,
      kind: "ability",
      payload: {
        kind: "ability", speciesId: owner.id, speciesName: owner.name,
        moveId: move.id, moveName: move.name, abilityId: ability.id,
        abilityName: ability.name, targetSpeciesId: "chansey"
      }
    });
  }
  for (const item of items) {
    const move = moves.find(x => x.id === "tackle") || moves[0];
    if (!move) continue;
    cases.push({
      case_key: "item:" + item.id,
      kind: "item",
      payload: {
        kind: "item", speciesId: "mew", speciesName: "ミュウ（共通検証役）",
        moveId: move.id, moveName: move.name, abilityId: "synchronize",
        itemId: item.id, itemName: item.name, targetSpeciesId: "chansey"
      }
    });
  }
  return cases;
}

class AutoAuditLab {
  constructor(options) {
    this.battles = options.battleService;
    this.pool = null;
    this.ready = false;
    this.timer = null;
    this.runningCase = false;
    this.runningReview = false;
    this.adminToken = process.env.AUDIT_ADMIN_TOKEN || "";
  }

  async init() {
    if (!process.env.DATABASE_URL) {
      console.warn("[audit-lab] DATABASE_URL is not configured; audit endpoints are disabled.");
      return false;
    }
    const { Pool } = require("pg");
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
    });
    await this.pool.query("CREATE TABLE IF NOT EXISTS auto_audit_jobs (" +
      "id uuid PRIMARY KEY, status text NOT NULL, total integer NOT NULL DEFAULT 0, " +
      "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), " +
      "config jsonb NOT NULL DEFAULT '{}'::jsonb)");
    await this.pool.query("CREATE TABLE IF NOT EXISTS auto_audit_cases (" +
      "id bigserial PRIMARY KEY, job_id uuid NOT NULL REFERENCES auto_audit_jobs(id) ON DELETE CASCADE, " +
      "case_key text NOT NULL, kind text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', " +
      "result jsonb, ai_status text NOT NULL DEFAULT 'pending', ai_review jsonb, error text, " +
      "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), " +
      "UNIQUE(job_id, case_key))");
    await this.pool.query("CREATE INDEX IF NOT EXISTS auto_audit_cases_queue_idx ON auto_audit_cases(job_id, status, id)");
    await this.pool.query("CREATE INDEX IF NOT EXISTS auto_audit_cases_ai_idx ON auto_audit_cases(job_id, ai_status, id)");
    await this.pool.query("UPDATE auto_audit_cases SET status='pending', updated_at=now() WHERE status='running'");
    await this.pool.query("UPDATE auto_audit_cases SET ai_status='pending', updated_at=now() WHERE ai_status='reviewing'");
    await this.pool.query("UPDATE auto_audit_jobs SET status='running', updated_at=now() WHERE status='running'");
    this.ready = true;
    this.startWorker();
    console.log("[audit-lab] persistent audit storage is ready.");
    return true;
  }

  startWorker() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.processOne().catch(error => console.error("[audit-lab] worker error:", error?.message || error));
      void this.reviewOneBatch().catch(error => console.error("[audit-lab] AI review error:", error?.message || error));
    }, WORK_INTERVAL_MS);
    this.timer.unref?.();
  }

  validToken(value) {
    if (!this.adminToken || typeof value !== "string") return false;
    const a = Buffer.from(this.adminToken);
    const b = Buffer.from(value);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async createJob() {
    if (!this.ready) throw new Error("保存用データベースが未接続です。RenderのDATABASE_URLを設定してください。");
    const active = await this.pool.query("SELECT id FROM auto_audit_jobs WHERE status IN ('running','paused') LIMIT 1");
    if (active.rowCount) throw new Error("進行中または一時停止中の検証があります。先に再開または停止してください。");
    const cases = buildCases(this.battles.catalog());
    if (!cases.length) throw new Error("検証対象のデータを作成できませんでした。");
    const id = crypto.randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO auto_audit_jobs(id,status,total,config) VALUES($1,'running',$2,$3::jsonb)",
        [id, cases.length, JSON.stringify({ generationRange: "1-9", createdFrom: "Showdown National Dex catalog" })]);
      await client.query(
        "INSERT INTO auto_audit_cases(job_id,case_key,kind,payload) " +
        "SELECT $1, item->>'case_key', item->>'kind', item->'payload' " +
        "FROM jsonb_array_elements($2::jsonb) AS entries(item)",
        [id, JSON.stringify(cases)]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.getJob(id);
  }

  async getJob(id) {
    const result = await this.pool.query(
      "SELECT j.id,j.status,j.total,j.created_at,j.updated_at," +
      "count(c.id) FILTER (WHERE c.status='done')::int AS completed," +
      "count(c.id) FILTER (WHERE c.status='pending')::int AS pending," +
      "count(c.id) FILTER (WHERE c.status='error')::int AS failed," +
      "count(c.id) FILTER (WHERE c.ai_status='reviewed')::int AS ai_reviewed," +
      "count(c.id) FILTER (WHERE c.ai_status='pending' AND c.status='done')::int AS ai_pending," +
      "count(c.id) FILTER (WHERE c.ai_review->>'verdict'='possible_issue')::int AS issues " +
      "FROM auto_audit_jobs j LEFT JOIN auto_audit_cases c ON c.job_id=j.id " +
      "WHERE j.id=$1 GROUP BY j.id", [id]);
    return result.rows[0] || null;
  }

  async latestJob() {
    const result = await this.pool.query("SELECT id FROM auto_audit_jobs ORDER BY created_at DESC LIMIT 1");
    return result.rowCount ? this.getJob(result.rows[0].id) : null;
  }

  async processOne() {
    if (!this.ready || this.runningCase) return;
    this.runningCase = true;
    let client;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const pick = await client.query(
        "SELECT c.id,c.job_id,c.kind,c.payload FROM auto_audit_cases c " +
        "JOIN auto_audit_jobs j ON j.id=c.job_id " +
        "WHERE c.status='pending' AND j.status='running' " +
        "ORDER BY j.created_at,c.id FOR UPDATE OF c SKIP LOCKED LIMIT 1"
      );
      if (!pick.rowCount) {
        await client.query(
          "UPDATE auto_audit_jobs j SET status='completed',updated_at=now() " +
          "WHERE j.status='running' AND NOT EXISTS " +
          "(SELECT 1 FROM auto_audit_cases c WHERE c.job_id=j.id AND c.status IN ('pending','running'))"
        );
        await client.query("COMMIT");
        return;
      }
      const row = pick.rows[0];
      await client.query("UPDATE auto_audit_cases SET status='running',updated_at=now() WHERE id=$1", [row.id]);
      await client.query("COMMIT");
      client.release();
      client = null;

      let result;
      let status = "done";
      let errorText = null;
      try {
        result = await this.battles.runAuditCase(row.payload);
      } catch (error) {
        status = "error";
        errorText = String(error?.message || error).slice(0, 1200);
        result = { accepted: false, logs: [], error: errorText };
      }
      await this.pool.query(
        "UPDATE auto_audit_cases SET status=$2,result=$3::jsonb,error=$4,updated_at=now() WHERE id=$1",
        [row.id, status, JSON.stringify(result), errorText]
      );
      await this.pool.query("UPDATE auto_audit_jobs SET updated_at=now() WHERE id=$1", [row.job_id]);
    } finally {
      if (client) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        client.release();
      }
      this.runningCase = false;
    }
  }

  async reviewOneBatch() {
    if (!this.ready || this.runningReview || !process.env.OPENAI_API_KEY) return;
    this.runningReview = true;
    try {
      const batch = await this.pool.query(
        "SELECT id,job_id,kind,payload,result FROM auto_audit_cases " +
        "WHERE status IN ('done','error') AND ai_status='pending' " +
        "ORDER BY id LIMIT $1", [REVIEW_BATCH_SIZE]
      );
      if (!batch.rowCount) return;
      const ids = batch.rows.map(row => row.id);
      await this.pool.query("UPDATE auto_audit_cases SET ai_status='reviewing' WHERE id=ANY($1::bigint[])", [ids]);
      try {
        const reviews = await this.askAi(batch.rows);
        const byId = new Map(reviews.map(item => [Number(item.caseId), item]));
        for (const row of batch.rows) {
          const review = byId.get(Number(row.id)) || {
            verdict: "unverified", confidence: 0,
            reason: "AIの返答にこの検証項目が含まれていません。",
            suggestedFix: "", safeAutoFix: "none", sourceId: "", targetId: ""
          };
          const clean = {
            verdict: ["normal", "possible_issue", "unverified"].includes(review.verdict) ? review.verdict : "unverified",
            confidence: Math.max(0, Math.min(1, Number(review.confidence) || 0)),
            reason: String(review.reason || "").slice(0, 1200),
            suggestedFix: String(review.suggestedFix || "").slice(0, 1200),
            safeAutoFix: "none"
          };
          await this.pool.query(
            "UPDATE auto_audit_cases SET ai_status='reviewed',ai_review=$2::jsonb,updated_at=now() WHERE id=$1",
            [row.id, JSON.stringify(clean)]
          );
        }
      } catch (error) {
        await this.pool.query(
          "UPDATE auto_audit_cases SET ai_status='error',error=COALESCE(error,'') || $2,updated_at=now() WHERE id=ANY($1::bigint[])",
          [ids, " / AI判定: " + String(error?.message || error).slice(0, 500)]
        );
      }
    } finally {
      this.runningReview = false;
    }
  }

  async askAi(rows) {
    const cases = rows.map(row => ({
      caseId: Number(row.id),
      kind: row.kind,
      target: row.payload,
      observed: row.result
    }));
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        reviews: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              caseId: { type: "integer" },
              verdict: { type: "string", enum: ["normal", "possible_issue", "unverified"] },
              confidence: { type: "number" },
              reason: { type: "string" },
              suggestedFix: { type: "string" }
            },
            required: ["caseId", "verdict", "confidence", "reason", "suggestedFix"]
          }
        }
      },
      required: ["reviews"]
    };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions:
          "あなたはポケモンバトルシミュレーターの検証監査AIです。" +
          "各ケースについて、技・特性・持ち物の説明、Showdownの実際のログ、処理後の状態を比較してください。" +
          "ログに出なかった効果を勝手に成功扱いしないでください。条件不足、乱数、対象の耐性、技の仕様で判定できない場合はunverifiedにしてください。" +
          "possible_issueは、観測結果が説明と明確に矛盾する場合だけです。コードを書き換えず、suggestedFixには原因候補と安全な修正方針だけを書いてください。" +
          "AIの推測とシミュレーターが確定した事実を区別してください。",
        input: JSON.stringify(cases),
        text: {
          format: {
            type: "json_schema",
            name: "pokemon_audit_reviews",
            strict: true,
            schema
          }
        },
        max_output_tokens: 4000
      }),
      signal: AbortSignal.timeout(60000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error("OpenAI API HTTP " + response.status + ": " +
        String(body?.error?.message || JSON.stringify(body)).slice(0, 500));
    }
    const textOut = (body.output || []).flatMap(item => item.content || [])
      .filter(item => item.type === "output_text").map(item => item.text).join("");
    if (!textOut) throw new Error("AIのJSON応答が空でした。");
    const parsed = JSON.parse(textOut);
    return Array.isArray(parsed.reviews) ? parsed.reviews : [];
  }

  async handle(req, res, url) {
    const pathname = url.pathname;
    if (req.method === "GET" && pathname === "/api/audit/health") {
      return json(res, 200, {
        ok: true, databaseReady: this.ready,
        aiReady: !!process.env.OPENAI_API_KEY,
        adminConfigured: !!this.adminToken,
        aiModel: process.env.OPENAI_MODEL || "gpt-5.5"
      });
    }
    let body = {};
    if (req.method === "POST") {
      try { body = await readBody(req); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === "POST" && pathname === "/api/audit/session") {
      if (!this.validToken(body.token)) return json(res, 401, { error: "管理者パスワードが違うか、RenderにAUDIT_ADMIN_TOKENが設定されていません。" });
      return json(res, 200, { ok: true });
    }
    const token = req.headers["x-audit-token"];
    if (!this.validToken(token)) return json(res, 401, { error: "管理者ログインが必要です。" });
    if (!this.ready) return json(res, 503, { error: "DATABASE_URLが未設定です。保存用Postgresを接続してください。" });

    try {
      if (req.method === "POST" && pathname === "/api/audit/jobs") {
        return json(res, 201, { job: await this.createJob() });
      }
      if (req.method === "GET" && pathname === "/api/audit/jobs/latest") {
        return json(res, 200, { job: await this.latestJob() });
      }
      const jobMatch = pathname.match(/^\/api\/audit\/jobs\/([a-f0-9-]+)$/);
      if (req.method === "GET" && jobMatch) {
        const job = await this.getJob(jobMatch[1]);
        return job ? json(res, 200, { job }) : json(res, 404, { error: "検証ジョブが見つかりません。" });
      }
      const actionMatch = pathname.match(/^\/api\/audit\/jobs\/([a-f0-9-]+)\/(pause|resume|cancel|results|export)$/);
      if (actionMatch) {
        const id = actionMatch[1], action = actionMatch[2];
        if (action === "pause" && req.method === "POST") {
          await this.pool.query("UPDATE auto_audit_jobs SET status='paused',updated_at=now() WHERE id=$1 AND status='running'", [id]);
          return json(res, 200, { job: await this.getJob(id) });
        }
        if (action === "resume" && req.method === "POST") {
          await this.pool.query("UPDATE auto_audit_jobs SET status='running',updated_at=now() WHERE id=$1 AND status='paused'", [id]);
          return json(res, 200, { job: await this.getJob(id) });
        }
        if (action === "cancel" && req.method === "POST") {
          await this.pool.query("UPDATE auto_audit_jobs SET status='cancelled',updated_at=now() WHERE id=$1 AND status IN ('running','paused')", [id]);
          await this.pool.query("UPDATE auto_audit_cases SET status='cancelled',updated_at=now() WHERE job_id=$1 AND status='pending'", [id]);
          return json(res, 200, { job: await this.getJob(id) });
        }
        if (action === "results" && req.method === "GET") {
          const limit = safeInt(url.searchParams.get("limit"), 1, 100, 25);
          const offset = safeInt(url.searchParams.get("offset"), 0, 10000000, 0);
          const rows = await this.pool.query(
            "SELECT id,case_key,kind,status,payload,result,ai_status,ai_review,error,updated_at " +
            "FROM auto_audit_cases WHERE job_id=$1 ORDER BY id LIMIT $2 OFFSET $3",
            [id, limit, offset]
          );
          return json(res, 200, { results: rows.rows });
        }
        if (action === "export" && req.method === "GET") {
          const job = await this.getJob(id);
          if (!job) return json(res, 404, { error: "検証ジョブが見つかりません。" });
          const rows = await this.pool.query(
            "SELECT case_key,kind,status,payload,result,ai_status,ai_review,error,updated_at " +
            "FROM auto_audit_cases WHERE job_id=$1 ORDER BY id LIMIT 10000", [id]
          );
          return json(res, 200, { exportedAt: new Date().toISOString(), job, results: rows.rows });
        }
      }
      return json(res, 404, { error: "Audit API endpoint not found." });
    } catch (error) {
      console.error("[audit-lab] request failed:", error?.message || error);
      return json(res, 500, { error: error?.message || "検証APIでエラーが発生しました。" });
    }
  }
}

module.exports = { AutoAuditLab };
