/* Local-only legacy metadata loader.
 * Gen 9 battles use the server-side pokemon-showdown package and the committed
 * data/showdown-catalog.json snapshot. This loader only attaches the bundled
 * supplemental metadata used by the older browser-side prototype.
 */
(() => {
  "use strict";

  const statusNode = document.getElementById("upstream-fetch-status");

  function setStatus(message) {
    if (statusNode) statusNode.textContent = message;
  }

  function loadBundledFallback() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./js/upstream-mechanics.js", document.baseURI).href;
      script.onload = () => {
        const data = window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS;
        if (!data || !data.abilitiesById ||
            (!data.movesById && !data.movesByApiId)) {
          reject(new Error("同梱補助データの形式が正しくありません。"));
          return;
        }
        resolve(data);
      };
      script.onerror = () => reject(new Error("同梱補助データを読み込めませんでした。"));
      document.head.appendChild(script);
    });
  }

  window.POKEMON_CHAMPIONS_UPSTREAM_READY = (async () => {
    setStatus("GitHubに保存された補助データを読み込み中…");
    try {
      const data = await loadBundledFallback();
      window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = data;
      window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "local-bundled";
      const moves = data.audit?.pokeApiMoveRows ??
        Object.keys(data.movesById || data.movesByApiId || {}).length;
      const abilities = data.audit?.pokeApiAbilityRows ??
        Object.keys(data.abilitiesById || {}).length;
      setStatus("同梱データ読み込み成功：技 " + moves + "件・特性 " + abilities + "件");
      return { source: "local-bundled", moves, abilities };
    } catch (error) {
      window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = null;
      window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "unavailable";
      setStatus("補助データを読み込めませんでした。内蔵ゲームデータで起動します。");
      console.error("[data] bundled supplemental metadata failed:", error);
      return { source: "unavailable", error: String(error) };
    }
  })();
})();
