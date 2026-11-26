/* Direct retrieval test: move/ability reference data from Pokémon Showdown.
 * The embedded Pokédex, move catalogue, learnsets, Japanese text, and battle
 * formulas remain untouched. Remote records are stored separately as reference metadata.
 */
(() => {
  "use strict";

  const SHOWDOWN_MOVES_URL = "https://play.pokemonshowdown.com/data/moves.json";
  const SHOWDOWN_ABILITIES_URL = "https://play.pokemonshowdown.com/data/abilities.js";
  const SHOWDOWN_ITEMS_URL = "https://play.pokemonshowdown.com/data/items.js";
  const statusNode = document.getElementById("upstream-fetch-status");
  const REQUEST_TIMEOUT_MS = 15000;

  function setStatus(message) {
    if (statusNode) statusNode.textContent = message;
  }

  function toId(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  async function fetchMoves() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(SHOWDOWN_MOVES_URL, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error("Showdown moves.json HTTP " + response.status);
      }

      const raw = await response.json();
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Showdown move data has an unexpected format");
      }

      const movesById = {};
      for (const [key, value] of Object.entries(raw)) {
        const id = toId(key);
        if (!id || !value || typeof value !== "object") continue;
        movesById[id] = { ...value, id };
      }

      const count = Object.keys(movesById).length;
      if (count < 600) {
        throw new Error("Showdown move data is incomplete (" + count + " entries)");
      }
      return movesById;
    } finally {
      clearTimeout(timeout);
    }
  }

  function loadShowdownGlobalScript(exportName, sourceUrl) {
    return new Promise((resolve, reject) => {
      const previousExports = window.exports;
      const previousValue = window[exportName];
      const script = document.createElement("script");
      let finished = false;

      function restoreGlobals() {
        if (typeof previousExports === "undefined") delete window.exports;
        else window.exports = previousExports;
        if (typeof previousValue === "undefined") delete window[exportName];
        else window[exportName] = previousValue;
      }

      function finish(error, value) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        script.onload = null;
        script.onerror = null;
        script.remove();
        restoreGlobals();
        if (error) reject(error);
        else resolve(value);
      }

      const timeout = setTimeout(() => {
        finish(new Error("Showdown " + exportName + " timed out"));
      }, REQUEST_TIMEOUT_MS);

      // Generated Showdown data scripts assign their export to exports.<name>.
      window.exports = window;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = sourceUrl + "?cacheBust=" + Date.now();
      script.onload = () => {
        const value = window[exportName];
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          finish(new Error("Showdown " + exportName + " was not exported"));
          return;
        }
        finish(null, value);
      };
      script.onerror = () => finish(new Error("Could not load " + sourceUrl));
      document.head.appendChild(script);
    });
  }

  function loadAbilitiesScript() {
    return loadShowdownGlobalScript("BattleAbilities", SHOWDOWN_ABILITIES_URL);
  }

  function loadItemsScript() {
    return loadShowdownGlobalScript("BattleItems", SHOWDOWN_ITEMS_URL);
  }

  function copyStaticData(value, path, callbackPaths, seen) {
    if (typeof value === "function") {
      callbackPaths.push(path || "(root)");
      return undefined;
    }
    if (value === null || typeof value === "string" ||
        typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (typeof value !== "object") return undefined;
    if (seen.has(value)) return undefined;
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        copyStaticData(item, path + "[" + index + "]", callbackPaths, seen)
      ).filter(item => item !== undefined);
    }

    const output = {};
    for (const [key, child] of Object.entries(value)) {
      const copied = copyStaticData(
        child,
        path ? path + "." + key : key,
        callbackPaths,
        seen
      );
      if (copied !== undefined) output[key] = copied;
    }
    return output;
  }

  function normalizeItems(raw) {
    const itemsById = {};
    let itemCallbackCount = 0;

    for (const [key, record] of Object.entries(raw)) {
      const id = toId(key);
      if (!id || !record || typeof record !== "object") continue;
      const callbackPaths = [];
      const staticData = copyStaticData(record, "", callbackPaths, new WeakSet());
      itemCallbackCount += callbackPaths.length;
      itemsById[id] = { id, ...staticData, callbackPaths };
    }

    const count = Object.keys(itemsById).length;
    if (count < 100) {
      throw new Error("Showdown item data is incomplete (" + count + " entries)");
    }
    return { itemsById, itemCallbackCount };
  }

  function normalizeAbilities(raw) {
    const abilitiesById = {};
    let callbackCount = 0;

    for (const [key, record] of Object.entries(raw)) {
      const id = toId(key);
      if (!id || !record || typeof record !== "object") continue;

      const callbackPaths = [];
      const staticData = copyStaticData(record, "", callbackPaths, new WeakSet());
      callbackCount += callbackPaths.length;
      abilitiesById[id] = {
        id,
        ...staticData,
        callbackPaths
      };
    }

    const count = Object.keys(abilitiesById).length;
    if (count < 200) {
      throw new Error("Showdown ability data is incomplete (" + count + " entries)");
    }
    return { abilitiesById, callbackCount };
  }

  async function fetchShowdownData() {
    // The generated ability/item scripts both write through the temporary window.exports
    // bridge, so load those two scripts sequentially to avoid racing over that global.
    const movesPromise = fetchMoves();
    const rawAbilities = await loadAbilitiesScript();
    const rawItems = await loadItemsScript();
    const movesById = await movesPromise;
    const { abilitiesById, callbackCount } = normalizeAbilities(rawAbilities);
    const { itemsById, itemCallbackCount } = normalizeItems(rawItems);

    return {
      schemaVersion: "2.0.0",
      source: "pokemon-showdown",
      fetchedAt: new Date().toISOString(),
      sources: {
        moves: SHOWDOWN_MOVES_URL,
        abilities: SHOWDOWN_ABILITIES_URL
      },
      audit: {
        moveCount: Object.keys(movesById).length,
        abilityCount: Object.keys(abilitiesById).length,
        itemCount: Object.keys(itemsById).length,
        abilityCallbackPaths: callbackCount,
        itemCallbackPaths: itemCallbackCount,
        callbacksExecuted: 0
      },
      movesById,
      abilitiesById,
      itemsById
    };
  }

  function loadBundledFallback() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./js/upstream-mechanics.js", document.baseURI).href;
      script.onload = () => {
        const data = window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS;
        if (!data || !data.abilitiesById ||
            (!data.movesById && !data.movesByApiId)) {
          reject(new Error("bundled fallback metadata is incomplete"));
          return;
        }
        resolve(data);
      };
      script.onerror = () => reject(new Error("bundled metadata could not be loaded"));
      document.head.appendChild(script);
    });
  }

  window.POKEMON_CHAMPIONS_UPSTREAM_READY = (async () => {
    setStatus("Pokémon Showdownから技・特性データを取得中…");
    try {
      const data = await fetchShowdownData();
      window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = data;
      window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "pokemon-showdown-live";
      setStatus(
        "Showdown取得成功：技 " + data.audit.moveCount +
        "件・特性 " + data.audit.abilityCount + "件・持ち物 " + data.audit.itemCount + "件"
      );
      return {
        source: "pokemon-showdown-live",
        moves: data.audit.moveCount,
        abilities: data.audit.abilityCount
      };
    } catch (remoteError) {
      console.warn("[data] Pokémon Showdown retrieval failed; trying bundled fallback.", remoteError);
      try {
        const data = await loadBundledFallback();
        window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS = data;
        window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE = "local-fallback";
        const moves = data.audit?.pokeApiMoveRows ??
          Object.keys(data.movesById || data.movesByApiId || {}).length;
        const abilities = data.audit?.pokeApiAbilityRows ??
          Object.keys(data.abilitiesById || {}).length;
        const items = Object.keys(data.itemsById || {}).length;
        setStatus(
          "Showdown取得不可：同梱補助データに切替（技 " +
          moves + "件・特性 " + abilities + "件）"
        );
        return { source: "local-fallback", moves, abilities, items, error: String(remoteError) };
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
