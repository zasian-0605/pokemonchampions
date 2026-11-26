/* v2: full Cartesian audit UI. No database, admin password, or AI API key. */
(() => {
  "use strict";

  const API = "/api/audit";
  const state = { health:null, job:null, results:[], notice:"", busy:false, timer:null };
  const app = () => window.PokemonChampions2D;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const fmt = value => Number(value || 0).toLocaleString("ja-JP");

  function duration(ms) {
    if (!Number.isFinite(Number(ms)) || ms < 0) return "計測中";
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days) return days + "日 " + hours + "時間";
    if (hours) return hours + "時間 " + minutes + "分";
    if (minutes) return minutes + "分 " + (seconds % 60) + "秒";
    return seconds + "秒";
  }

  async function request(path, options) {
    const response = await fetch(API + path, {
      cache:"no-store",
      headers:{ "Content-Type":"application/json", ...(options?.headers || {}) },
      ...(options || {})
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
      button.innerHTML = "<span>⌁</span><b>全通り自動検証</b><small>EXHAUSTIVE AUDIT</small>";
      after.insertAdjacentElement("afterend", button);
    }
    const mobile = document.querySelector(".mobile-nav");
    if (mobile && !mobile.querySelector("[data-audit-page]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.auditPage = "true";
      button.innerHTML = "<span>⌁</span><small>全通り検証</small>";
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

  function renderSetup() {
    const counts = state.health?.counts || {};
    const total = Number(counts.totalCases || 0);
    return '<section class="audit-card audit-setup">' +
      '<h2>検査する範囲</h2>' +
      '<p>ポケモン・技・テラスタル・持ち物の全組み合わせを、Showdownの実際のバトル処理で1件ずつ試します。</p>' +
      '<div class="audit-count-grid">' +
      '<div><b>' + fmt(counts.species) + '</b><small>ポケモン</small></div>' +
      '<div><b>' + fmt(counts.moves) + '</b><small>技</small></div>' +
      '<div><b>' + fmt(counts.teraOptions) + '</b><small>テラスタル状態</small></div>' +
      '<div><b>' + fmt(counts.itemOptionsPerTest) + '</b><small>持ち物の選択肢</small></div>' +
      '</div>' +
      '<div class="audit-formula"><span>全組み合わせ</span><b>' + fmt(counts.matrixCases) + '</b>' +
      '<small>＋ 特性ごとの個別検査 ' + fmt(counts.abilityCases) + ' 件</small></div>' +
      '<p class="audit-muted">テラスタル状態は「なし」＋全19タイプ（ステラを含む）。持ち物は「なし」＋図鑑に登録された全アイテム。</p>' +
      '<button class="audit-primary" data-exhaustive-action="start" ' + (state.busy || !total ? "disabled" : "") + '>全通り検査を開始</button>' +
      '<p class="audit-warn">組み合わせ数は非常に大きく、完了まで長期間かかる可能性があります。開始後も一時停止・再開・停止ができます。</p>' +
      '</section>';
  }

  function renderJob() {
    const job = state.job;
    if (!job) return renderSetup();
    const running = job.status === "running";
    const paused = job.status === "paused";
    const status = ({running:"実行中",paused:"一時停止",completed:"全件完了",cancelled:"停止"})[job.status] || job.status;
    const actions = running
      ? '<button class="audit-secondary" data-exhaustive-action="pause">一時停止</button><button class="audit-danger" data-exhaustive-action="cancel">停止</button>'
      : paused
        ? '<button class="audit-primary" data-exhaustive-action="resume">続きから再開</button><button class="audit-danger" data-exhaustive-action="cancel">停止</button>'
        : '<button class="audit-primary" data-exhaustive-action="start">新しい検査を開始</button>';
    const percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
    const last = job.lastCase
      ? esc(job.lastCase.case_key) + " · " + esc(job.lastCase.status)
      : "まだ検査を開始していません";
    const rows = state.results.slice(-24).reverse().map(row => {
      const payload = row.payload || {};
      const tera = payload.terastallize ? "テラスタル " + payload.teraType : "テラスタルなし";
      const item = payload.itemName || "持ち物なし";
      const name = payload.speciesName || payload.abilityName || row.case_key;
      const move = payload.moveName || "";
      const result = row.status === "verified" ? "技の使用を確認"
        : row.status === "unverified" ? "ログ上で未確認" : "実行エラー";
      return '<article class="audit-result"><div><b>' + esc(name) + '</b><small>' +
        esc(move) + ' · ' + esc(tera) + ' · ' + esc(item) + '</small></div>' +
        '<span class="audit-pill ' + (row.status === "verified" ? "ok" : "issue") + '">' +
        esc(result) + '</span>' +
        '<p>' + esc(row.error || (row.result?.error || (row.result?.logs || []).slice(0,3).join(" / "))) + '</p></article>';
    }).join("");
    return '<section class="audit-card">' +
      '<div class="audit-job-head"><div><small>全通り検査ジョブ</small><h2>' + esc(status) + '</h2></div>' +
      '<span class="audit-chip">' + percent.toFixed(5) + '%</span></div>' +
      '<div class="audit-progress"><i style="width:' + percent + '%"></i></div>' +
      '<div class="audit-count-grid audit-progress-counts">' +
      '<div><b>' + fmt(job.completed) + '</b><small>検査済み</small></div>' +
      '<div><b>' + fmt(job.pending) + '</b><small>残り</small></div>' +
      '<div><b>' + fmt(job.verified) + '</b><small>技の使用を確認</small></div>' +
      '<div><b>' + fmt(job.unverified) + '</b><small>ログ上で未確認</small></div>' +
      '<div><b>' + fmt(job.failed) + '</b><small>実行エラー</small></div></div>' +
      '<div class="audit-meta"><span>経過時間：' + duration(job.elapsedMs) + '</span>' +
      '<span>平均：' + (job.averageMs ? job.averageMs.toFixed(1) + " ms / 件" : "計測中") + '</span>' +
      '<span>残り予測：' + (job.estimatedRemainingMs == null ? "計測中" : duration(job.estimatedRemainingMs)) + '</span></div>' +
      '<p class="audit-muted">最後の検査：' + last + '</p>' +
      '<div class="audit-actions">' + actions +
      '<button class="audit-secondary" data-exhaustive-action="refresh">更新</button>' +
      '<button class="audit-secondary" data-exhaustive-action="export">JSONを書き出す</button></div>' +
      '<p class="audit-warn">検査結果はサーバーのメモリ内だけに保持します。Renderの再起動・再デプロイで進捗は消えます。ブラウザを閉じてもサーバーが稼働していれば検査は続きます。</p>' +
      '</section>' +
      '<section class="audit-card"><div class="audit-list-head"><h2>直近の検査結果</h2><small>最大200件を一時保持</small></div>' +
      (rows || '<p class="audit-muted">検査記録はまだありません。</p>') + '</section>';
  }

  function render() {
    const counts = state.health?.counts || {};
    return '<section class="audit-shell"><header class="audit-header"><div>' +
      '<small>POKÉMON SHOWDOWN · NATIONAL DEX · FULL MATRIX</small>' +
      '<h1>全通り自動検証ラボ</h1>' +
      '<p>テラスタルなしを含む全状態・全持ち物を組み合わせて、技の実行ログを確認します。</p>' +
      '</div><span class="audit-chip">MEMORY ONLY</span></header>' +
      (state.job ? renderJob() : renderSetup()) +
      '<p class="audit-footnote">「技の使用を確認」は技が実際にログへ出たという意味です。ダメージや持ち物の効果が全状況で正しいと保証する判定ではありません。JSONには集計と直近サンプルを出力します。</p>' +
      (state.notice ? '<p class="audit-warn">' + esc(state.notice) + '</p>' : '') +
      '</section>';
  }

  async function refresh() {
    if (app()?.state?.page !== "audit-lab") return;
    try {
      const [health, latest] = await Promise.all([
        request("/health"),
        request("/jobs/latest")
      ]);
      state.health = health;
      state.job = latest.job;
      if (state.job) {
        const body = await request("/jobs/" + encodeURIComponent(state.job.id) + "/results?limit=30");
        state.results = body.results || [];
      } else state.results = [];
      state.notice = "";
    } catch (error) {
      state.notice = error.message || String(error);
    }
    const main = $("#main");
    if (main && app()?.state?.page === "audit-lab") main.innerHTML = render();
  }

  async function act(action) {
    if (state.busy) return;
    state.busy = true;
    state.notice = "";
    try {
      if (action === "start") {
        const data = await request("/jobs", { method:"POST", body:"{}" });
        state.job = data.job;
      } else if (["pause","resume","cancel"].includes(action) && state.job) {
        const data = await request("/jobs/" + encodeURIComponent(state.job.id) + "/" + action, {
          method:"POST", body:"{}"
        });
        state.job = data.job;
      } else if (action === "export" && state.job) {
        const data = await request("/jobs/" + encodeURIComponent(state.job.id) + "/export");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = "pokemon-audit-" + state.job.id + ".json";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      await refresh();
    } catch (error) {
      state.notice = error.message || String(error);
      const main = $("#main");
      if (main) main.innerHTML = render();
    } finally {
      state.busy = false;
    }
  }

  function open() {
    installNav();
    const main = $("#main");
    if (!main) return;
    if (app()?.state) app().state.page = "audit-lab";
    document.querySelectorAll("[data-page],[data-gen9-page],[data-audit-page]").forEach(node => node.classList.remove("active"));
    document.querySelectorAll("[data-audit-page]").forEach(node => node.classList.add("active"));
    main.innerHTML = render();
    main.focus?.({ preventScroll:true });
    void refresh();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (app()?.state?.page === "audit-lab") void refresh();
    }, 1800);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-exhaustive-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.exhaustiveAction;
    if (action === "refresh") void refresh();
    else void act(action);
  }, true);

  const style = document.createElement("style");
  style.textContent = [
    ".audit-shell{max-width:1160px;margin:0 auto;padding:clamp(14px,2vw,24px);color:#eef2ff}",
    ".audit-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}",
    ".audit-header small,.audit-job-head small{font-size:10px;letter-spacing:.16em;color:#9aabd5;font-weight:900}",
    ".audit-header h1{font-size:clamp(25px,4vw,34px);margin:7px 0}",
    ".audit-header p,.audit-card p{font-size:12px;line-height:1.7;color:#aebbd9}",
    ".audit-chip{display:inline-flex;border:1px solid #8298df66;background:#6278c51c;border-radius:999px;padding:8px 12px;font-size:10px;font-weight:900;white-space:nowrap}",
    ".audit-card{background:linear-gradient(145deg,#202a4a,#151c34);border:1px solid #8497d13b;border-radius:16px;padding:18px;margin:0 0 14px;min-width:0}",
    ".audit-card h2{font-size:16px;margin:0 0 10px}",
    ".audit-count-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:16px 0}",
    ".audit-count-grid>div{background:#10172b;border:1px solid #8294d12b;border-radius:10px;padding:12px;min-width:0}",
    ".audit-count-grid b{display:block;font-size:clamp(18px,2.5vw,25px);overflow-wrap:anywhere}",
    ".audit-count-grid small{display:block;color:#aebbd9;font-size:10px;margin-top:4px}",
    ".audit-formula{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#10172b;border-radius:10px;padding:14px;margin:12px 0}",
    ".audit-formula b{font-size:clamp(20px,3vw,28px);color:#dfe7ff}",
    ".audit-formula small{color:#aebbd9}",
    ".audit-primary,.audit-secondary,.audit-danger{border:0;border-radius:9px;padding:11px 15px;font-weight:800;font-size:12px;cursor:pointer;margin:8px 7px 0 0}",
    ".audit-primary{background:#677de0;color:#fff}.audit-secondary{background:#526284;color:#fff}.audit-danger{background:#854c60;color:#fff}",
    ".audit-primary:disabled{opacity:.45;cursor:not-allowed}",
    ".audit-muted,.audit-footnote{color:#aebbd9;font-size:11px;line-height:1.7}",
    ".audit-warn{color:#ffd28b!important;background:#735b2526;padding:10px;border-radius:8px;font-size:11px;line-height:1.6}",
    ".audit-job-head{display:flex;justify-content:space-between;align-items:center;gap:12px}",
    ".audit-job-head h2{font-size:20px;margin:5px 0}",
    ".audit-progress{height:9px;background:#0d1426;border-radius:99px;overflow:hidden;margin:14px 0}",
    ".audit-progress i{display:block;height:100%;background:#778ded;border-radius:99px;transition:width .2s}",
    ".audit-progress-counts{grid-template-columns:repeat(auto-fit,minmax(100px,1fr))}",
    ".audit-meta{display:flex;flex-wrap:wrap;gap:8px 18px;color:#b9c5e2;font-size:11px;margin:12px 0}",
    ".audit-actions{display:flex;flex-wrap:wrap;align-items:center;margin-top:8px}",
    ".audit-list-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}",
    ".audit-list-head h2{margin:0}.audit-list-head small{font-size:10px;color:#aebbd9}",
    ".audit-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px;padding:12px 0;border-top:1px solid #ffffff12}",
    ".audit-result b{font-size:12px}.audit-result small{display:block;color:#9eadcf;font-size:10px;margin-top:4px;overflow-wrap:anywhere}",
    ".audit-result p{grid-column:1/-1;margin:0;font-size:10px;overflow-wrap:anywhere}",
    ".audit-pill{align-self:start;border-radius:99px;background:#6c4b5d;padding:5px 8px;font-size:9px;white-space:nowrap}",
    ".audit-pill.ok{background:#315c52}.audit-footnote{margin-top:14px}",
    "@media(max-width:700px){.audit-header{display:block}.audit-chip{margin-top:8px}.audit-result{grid-template-columns:1fr}.audit-pill{justify-self:start}.audit-meta{display:grid}}"
  ].join("");
  document.head.appendChild(style);
  installNav();
})();