/* Direct upstream-data retrieval test.
 * Fetches the project's prepared PokeAPI/Showdown metadata from GitHub Raw.
 * The main Pokédex, move catalogue, and learnsets remain bundled offline.
 */
(() => {
  "use strict";

  const REMOTE_URL = "https://raw.githubusercontent.com/zasian-0605/pokemonchampions/main/js/upstream-mechanics.js";
  const ASSIGNMENT = "window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS =";
  const statusNode = document.getElementById("upstream-fetch-status");

  function setStatus(message) {
    if (statusNode) statusNode.textContent = message;
  }

  function parseSource(sourceText) {
    const assignmentAt = sourceText.indexOf(ASSIGNMENT);
    if (assignmentAt < 0) throw new Error("metadata assignment not found");
    const jsonStart = sourceText.indexOf("{", assignmentAt + ASSIGNMENT.length);
    const jsonEnd = sourceText.lastIndexOf("};");
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error("metadata JSON block not found");
    const data = JSON.parse(sourceText.slice(jsonStart, jsonEnd + 1));
    if (!data.movesByApiId || !data.abilitiesById) {
      throw new Error("metadata does not contain move/ability indexes");
    }
    return data;
  }

  async function fetchRemote() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(REMOTE_URL, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("GitHub Raw HTTP " + response.status);
      return parseSource(await response.text());
    } finally {
      clearTimeout(timeout);
    }
  }

  function loadBundledFallback() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./js/upstream-mechanics.js", document.baseURI).href;
      script.onload = () => {
        const data = window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS;
        if (!data || !data.movesByApiId || !data.abilitiesById) {
          reject(new Error("bundled metadata is incomplete"));
          return;
        }
        resolve(data);
      };
      script.onerror = () => reject(new Error("bundled metadata could not be loaded"));
      document.head.appendChild(script);
    });
  }

  window.POKEMON_CHAMPIONS_UPSTREAM_READY = (async () => {
    setStatus("GitHub Rawから技・特性データを直接取得中…");
    try {
      const data = await fetchRemote();
      window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = data;
      window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "github-raw";
      const moves = data.audit?.pokeApiMoveRows ?? Object.keys(data.movesByApiId).length;
      const abilities = data.audit?.pokeApiAbilityRows ?? Object.keys(data.abilitiesById).length;
      setStatus("GitHub直接取得成功：技 " + moves + "件・特性 " + abilities + "件");
      return { source: "github-raw", moves, abilities };
    } catch (remoteError) {
      console.warn("[data] GitHub Raw retrieval failed; using bundled fallback.", remoteError);
      try {
        const data = await loadBundledFallback();
        window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = data;
        window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "local-fallback";
        const moves = data.audit?.pokeApiMoveRows ?? Object.keys(data.movesByApiId).length;
        const abilities = data.audit?.pokeApiAbilityRows ?? Object.keys(data.abilitiesById).length;
        setStatus("GitHub取得不可：同梱データに切替（技 " + moves + "件・特性 " + abilities + "件）");
        return { source: "local-fallback", moves, abilities, error: String(remoteError) };
      } catch (fallbackError) {
        window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = null;
        window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "unavailable";
        setStatus("補助データ取得失敗：内蔵ゲームデータのみで起動します");
        return {
          source: "unavailable",
          error: String(remoteError),
          fallbackError: String(fallbackError)
        };
      }
    }
  })();
})();
