/* v1: persistent National Dex automatic audit console. */
(() => {
  "use strict";
  const API = "/api/audit";
  const TOKEN_KEY = "pokemon-champions-audit-token";
  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let health = null;
  let job = null;
  let results = [];
  let notice = "";
  let timer = null;
  let busy = false;

  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const app = () => window.PokemonChampions2D;
  const $ = selector => document.querySelector(selector);

  async function request(path, options) {
    const opts = options || {};
    const headers = { "Content-Type":"application/json", ...(opts.headers || {}) };
    if (token) headers["x-audit-token"] = token;
    const response = await fetch(API + path, {
      ...opts, headers, cache:"no-store"
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || ("HTTP " + response.status));
    return body;
  }

  function installNav() {
    const sidebar = document.querySelector(".sidebar");
    const after = sidebar?.querySelector("[data-gen9-page]");
    if (sidebar && after && !sidebar.querySelector("[data-audit-page]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-item";
      button.dataset.auditPage = "true";
      button.innerHTML = "<span>⌁</span><b>自動検証AI</b><small>AUTO AUDIT</small>";
      after.insertAdjacentElement("afterend", button);
    }
    const mobile = document.querySelector(".mobile-nav");
    if (mobile && !mobile.querySelector("[data-audit-page]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.auditPage = "true";
      button.innerHTML = "<span>⌁</span><small>自動検証</small>";
      mobile.appendChild(button);
    }
    document.querySelectorAll("[data-audit-page]").forEach(button => {
      if (button.dataset.auditBound === "true") return;
      button.dataset.auditBound = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        open();
      });
    });
  }

  function open() {
    installNav();
    const main = $("#main");
    if (!main) return;
    if (app()?.state) app().state.page = "audit-lab";
    document.querySelectorAll("[data-page],[data-gen9-page],[data-audit-page]").forEach(x => x.classList.remove("active"));
    document.querySelectorAll("[data-audit-page]").forEach(x => x.classList.add("active"));
    main.innerHTML = render();
    main.focus?.({ preventScroll:true });
    void refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (app()?.state?.page === "audit-lab") void refresh();
    }, 3000);
  }

  function statusLabel(value) {
    return ({
      running:"実行中", paused:"一時停止", completed:"完了",
      cancelled:"停止", pending:"待機中", done:"完了", error:"エラー"
    })[value] || value || "不明";
  }

  function verdictLabel(row) {
    if (row.ai_status === "reviewing") return "AI判定中";
    if (row.ai_status === "error") return "AI判定エラー";
    if (row.ai_status !== "reviewed") return health?.aiReady ? "AI待ち" : "AI未設定";
    const verdict = row.ai_review?.verdict;
    if (verdict === "normal") return "正常候補";
    if (verdict === "possible_issue") return "要確認";
    return "判定不能";
  }

  function renderLogin() {
    const db = health?.databaseReady ? "接続済み" : "未接続";
    const ai = health?.aiReady ? "接続済み" : "未設定";
    return '<section class="audit-shell"><header class="audit-header"><div><small>POKÉMON SHOWDOWN · NATIONAL DEX</small><h1>全自動検証ラボ</h1><p>全ポケモン・技・特性・持ち物を実際のバトルで検証し、結果をサーバーに保存します。</p></div><span class="audit-chip">AUTO AUDIT</span></header>' +
      '<div class="audit-grid"><section class="audit-card"><h2>管理者ログイン</h2><p>検証を開始・停止するには管理者パスワードが必要です。</p><label for="audit-password">管理者パスワード</label><input id="audit-password" type="password" autocomplete="current-password" placeholder="Renderに設定したAUDIT_ADMIN_TOKEN"><button class="audit-primary" data-audit-action="login" ' + (!health?.adminConfigured ? "disabled" : "") + '>ログイン</button>' +
      (!health?.adminConfigured ? '<p class="audit-warn">Renderの環境変数にAUDIT_ADMIN_TOKENが設定されていません。</p>' : "") +
      '<p class="audit-message">' + esc(notice) + '</p></section><section class="audit-card"><h2>接続状況</h2><div class="audit-stat"><span>保存データベース</span><b>' + db + '</b></div><div class="audit-stat"><span>AI判定エンジン</span><b>' + ai + '</b></div><div class="audit-stat"><span>検証元</span><b>Pokémon Showdown</b></div>' +
      (!health?.databaseReady ? '<p class="audit-warn">Renderの環境変数DATABASE_URLをPostgresのInternal Database URLに設定すると、進捗が再起動後も残ります。</p>' : "") +
      (!health?.aiReady ? '<p class="audit-muted">AI判定にはOPENAI_API_KEYが必要です。未設定の間も実際の検証とログ保存は進みますが、AIの結論は出しません。</p>' : "") +
      '</section></div><p class="audit-footnote">検証は1件ずつ進みます。誤った結果を正常と決めつけず、条件不足は「判定不能」として記録します。</p></section>';
  }

  function renderDashboard() {
    if (!job) {
      return '<div class="audit-card audit-empty"><h2>検証データはまだありません</h2><p>最初は空の状態から、Showdownの全国図鑑データを使って検証キューを作ります。</p><button class="audit-primary" data-audit-action="start" ' + (busy || !health?.databaseReady ? "disabled" : "") + '>全自動検証を開始</button><p class="audit-muted">対象：全ポケモン、全技、特性、持ち物。各テストは検証専用バトルで実行します。</p></div>';
    }
    const completed = Number(job.completed || 0);
    const failed = Number(job.failed || 0);
    const total = Number(job.total || 0);
    const percent = total ? Math.min(100, Math.round((completed + failed) / total * 100)) : 0;
    let actions = "";
    if (job.status === "running") {
      actions = '<button class="audit-secondary" data-audit-action="pause">一時停止</button><button class="audit-danger" data-audit-action="cancel">停止</button>';
    } else if (job.status === "paused") {
      actions = '<button class="audit-primary" data-audit-action="resume">続きから再開</button><button class="audit-danger" data-audit-action="cancel">停止</button>';
    } else if (job.status === "completed" || job.status === "cancelled") {
      actions = '<button class="audit-primary" data-audit-action="start">新しい検証を開始</button>';
    }
    const aiState = health?.aiReady ? "AI接続済み" : "AIキー未設定（検証ログのみ保存）";
    const list = results.map(row => {
      const payload = row.payload || {};
      const title = payload.speciesName || payload.moveName || payload.abilityName || payload.itemName || row.case_key;
      const detail = [payload.moveName, payload.abilityName, payload.itemName].filter(Boolean).join(" · ");
      const reason = row.ai_review?.reason || row.error || (row.result?.moveWasUsed ? "技の使用ログを確認" : "実行結果を確認中");
      const fix = row.ai_review?.suggestedFix ? '<p class="audit-fix"><b>AI修正案：</b>' + esc(row.ai_review.suggestedFix) + '</p>' : "";
      return '<article class="audit-result"><div><b>' + esc(title) + '</b><small>' + esc(row.kind) + (detail ? " · " + esc(detail) : "") + '</small></div><span class="audit-pill ' + (row.ai_review?.verdict === "possible_issue" ? "issue" : "") + '">' + esc(verdictLabel(row)) + '</span><p>' + esc(reason) + '</p>' + fix + '</article>';
    }).join("");
    return '<section class="audit-card"><div class="audit-job-head"><div><small>検証ジョブ</small><h2>' + esc(statusLabel(job.status)) + '</h2></div><span class="audit-chip">' + percent + '%</span></div>' +
      '<div class="audit-progress"><i style="width:' + percent + '%"></i></div>' +
      '<div class="audit-counts"><div><b>' + completed + '</b><small>検証済み</small></div><div><b>' + Number(job.pending || 0) + '</b><small>未処理</small></div><div><b>' + failed + '</b><small>実行エラー</small></div><div><b>' + Number(job.issues || 0) + '</b><small>要確認</small></div><div><b>' + Number(job.ai_reviewed || 0) + '</b><small>AI判定済み</small></div></div>' +
      '<p class="audit-muted">' + esc(aiState) + ' · ジョブID ' + esc(job.id) + '</p><div class="audit-actions">' + actions +
      '<button class="audit-secondary" data-audit-action="refresh">更新</button><button class="audit-secondary" data-audit-action="export">結果を書き出す</button></div></section>' +
      '<section class="audit-card"><div class="audit-list-head"><h2>検証記録</h2><small>先頭25件</small></div>' + (list || '<p class="audit-muted">検証結果はまだありません。</p>') + '</section>';
  }

  function render() {
    return '<section class="audit-shell"><header class="audit-header"><div><small>POKÉMON SHOWDOWN · NATIONAL DEX</small><h1>全自動検証ラボ</h1><p>検証はサーバー側で実行し、途中経過も結果もPostgresに保存します。</p></div><span class="audit-chip">AUTO AUDIT</span></header>' +
      (token ? renderDashboard() : renderLogin()) +
      '<p class="audit-footnote">安全のため、AIは診断・修正案を作成します。バトル本体のコードをAIが無断で書き換えることはありません。</p></section>';
  }

  async function refresh() {
    if (!$("#main") || app()?.state?.page !== "audit-lab") return;
    try {
      health = await fetch(API + "/health", { cache:"no-store" }).then(r => r.json());
      if (token) {
        const latest = await request("/jobs/latest");
        job = latest.job;
        if (job) {
          const body = await request("/jobs/" + encodeURIComponent(job.id) + "/results?limit=25&offset=0");
          results = body.results || [];
        } else results = [];
      }
      const main = $("#main");
      if (main) main.innerHTML = render();
    } catch (error) {
      notice = error.message || String(error);
      const main = $("#main");
      if (main) main.innerHTML = render();
    }
  }

  async function act(action) {
    if (busy) return;
    busy = true;
    notice = "";
    try {
      if (action === "login") {
        const password = $("#audit-password")?.value || "";
        await fetch(API + "/session", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ token:password })
        }).then(async response => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "ログインできませんでした。");
          return data;
        });
        token = password;
        sessionStorage.setItem(TOKEN_KEY, token);
      } else if (action === "start") {
        const data = await request("/jobs", { method:"POST", body:"{}" });
        job = data.job;
      } else if (["pause","resume","cancel"].includes(action) && job) {
        const data = await request("/jobs/" + encodeURIComponent(job.id) + "/" + action, { method:"POST", body:"{}" });
        job = data.job;
      } else if (action === "export" && job) {
        const data = await request("/jobs/" + encodeURIComponent(job.id) + "/export");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pokemon-audit-" + job.id + ".json";
        a.click();
        URL.revokeObjectURL(url);
      }
      await refresh();
    } catch (error) {
      notice = error.message || String(error);
      if (action === "login") {
        const main = $("#main");
        if (main) main.innerHTML = render();
        const message = document.createElement("p");
        message.className = "audit-warn";
        message.textContent = notice;
        main?.querySelector(".audit-card")?.appendChild(message);
      } else {
        const main = $("#main");
        if (main) main.innerHTML = render();
      }
    } finally {
      busy = false;
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-audit-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.auditAction;
    if (action === "refresh") void refresh();
    else void act(action);
  }, true);

  const style = document.createElement("style");
  style.textContent = ".audit-shell{max-width:1160px;margin:0 auto;padding:clamp(14px,2vw,24px);color:#eef2ff}.audit-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.audit-header small,.audit-job-head small{font-size:10px;letter-spacing:.16em;color:#9aabd5;font-weight:900}.audit-header h1{font-size:clamp(25px,4vw,34px);margin:7px 0}.audit-header p,.audit-card p{font-size:12px;line-height:1.7;color:#aebbd9}.audit-chip{display:inline-flex;align-items:center;border:1px solid #8298df66;background:#6278c51c;border-radius:999px;padding:8px 12px;font-size:10px;font-weight:900;white-space:nowrap}.audit-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.audit-card{background:linear-gradient(145deg,#202a4a,#151c34);border:1px solid #8497d13b;border-radius:16px;padding:18px;margin:0 0 14px;min-width:0}.audit-card h2{font-size:16px;margin:0 0 10px}.audit-card label{display:block;color:#b5c2df;font-size:11px;margin:14px 0 6px}.audit-card input{width:100%;box-sizing:border-box;padding:12px;border-radius:9px;border:1px solid #8294d15a;background:#10172b;color:#fff}.audit-primary,.audit-secondary,.audit-danger{border:0;border-radius:9px;padding:11px 15px;font-weight:800;font-size:12px;cursor:pointer;margin:8px 7px 0 0}.audit-primary{background:#677de0;color:#fff}.audit-secondary{background:#526284;color:#fff}.audit-danger{background:#854c60;color:#fff}.audit-primary:disabled{opacity:.45;cursor:not-allowed}.audit-stat{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff10;font-size:12px}.audit-stat span{color:#aebbd9}.audit-stat b{color:#f1f4ff}.audit-warn{color:#ffd28b!important;background:#735b2526;padding:10px;border-radius:8px}.audit-muted,.audit-footnote{font-size:11px;color:#91a1c4!important;line-height:1.65}.audit-message{color:#ffd28b!important}.audit-footnote{margin:14px 4px}.audit-empty{text-align:center;padding:34px 18px}.audit-empty h2{font-size:20px}.audit-job-head{display:flex;align-items:center;justify-content:space-between}.audit-job-head h2{margin-top:4px}.audit-progress{height:12px;background:#0c1326;border-radius:20px;overflow:hidden;margin:14px 0}.audit-progress i{display:block;height:100%;background:linear-gradient(90deg,#637de5,#5bb7cc);border-radius:20px;transition:width .3s}.audit-counts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.audit-counts>div{background:#ffffff09;padding:12px 8px;border-radius:9px;text-align:center}.audit-counts b{display:block;font-size:20px;font-variant-numeric:tabular-nums}.audit-counts small{font-size:10px;color:#aab9da}.audit-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}.audit-list-head{display:flex;align-items:center;justify-content:space-between}.audit-list-head small{color:#9caed3}.audit-result{display:grid;grid-template-columns:1fr auto;gap:5px 10px;padding:12px 0;border-top:1px solid #ffffff12}.audit-result>div b{display:block;font-size:12px}.audit-result>div small{font-size:10px;color:#9eaed0}.audit-result>p,.audit-result>.audit-fix{grid-column:1/-1;margin:0;font-size:11px;line-height:1.55;color:#b7c3dc}.audit-pill{font-size:10px;padding:5px 8px;border-radius:20px;background:#5a719d33;color:#c2d2f3;white-space:nowrap}.audit-pill.issue{background:#82495c55;color:#ffd2df}.audit-fix{color:#f5cf92!important}@media(max-width:760px){.audit-grid{grid-template-columns:1fr}.audit-counts{grid-template-columns:repeat(3,minmax(0,1fr))}.audit-header{flex-direction:column}}";
  document.head.appendChild(style);
  installNav();
  window.addEventListener("load", installNav);
  const observer = new MutationObserver(installNav);
  observer.observe(document.body, { childList:true, subtree:true });
})();
