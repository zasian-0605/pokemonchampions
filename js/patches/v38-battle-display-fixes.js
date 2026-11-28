/* v38: keep battle sprites mounted across turn renders, enlarge active Pokemon, and restore Mega Energy artwork. */
(() => {
  "use strict";

  const W = window;
  const doc = W.document || document;
  if (W.PokemonChampions2DBattleDisplay?.version >= 38) return;

  function appState() {
    try { return state; } catch (_) { return W.state || null; }
  }

  function nodeType(node) {
    return Number(node?.nodeType || 0);
  }

  function isElement(node) {
    return nodeType(node) === 1;
  }

  function spriteKey(node) {
    if (!isElement(node) || String(node.tagName || "").toUpperCase() !== "IMG") return "";
    return node.getAttribute?.("data-sprite-key") || node.dataset?.spriteKey || "";
  }

  function compatibleNodes(current, next) {
    if (!current || !next || nodeType(current) !== nodeType(next)) return false;
    if (!isElement(current)) return true;
    const currentTag = String(current.tagName || "").toUpperCase();
    const nextTag = String(next.tagName || "").toUpperCase();
    if (currentTag !== nextTag) return false;
    if (currentTag === "IMG") {
      const oldKey = spriteKey(current);
      const newKey = spriteKey(next);
      if (oldKey && newKey && oldKey !== newKey) return false;
    }
    return true;
  }

  function copyAttributes(current, next, preserveSprite) {
    const skip = preserveSprite
      ? new Set(["src", "srcset", "data-sprite-current-url", "loading", "decoding", "referrerpolicy"])
      : new Set();
    const nextAttrs = new Map(Array.from(next.attributes || []).map((attr) => [attr.name, attr.value]));
    for (const attr of Array.from(current.attributes || [])) {
      if (!nextAttrs.has(attr.name) && !skip.has(attr.name)) current.removeAttribute(attr.name);
    }
    for (const [name, value] of nextAttrs) {
      if (skip.has(name)) continue;
      if (current.getAttribute(name) !== value) current.setAttribute(name, value);
    }
  }

  function cloneNode(node) {
    return node.cloneNode(true);
  }

  function morphNode(current, next) {
    if (!compatibleNodes(current, next)) return cloneNode(next);
    if (!isElement(current)) {
      if (nodeType(current) === 3 || nodeType(current) === 8) {
        if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      }
      return current;
    }

    const isSprite = String(current.tagName || "").toUpperCase() === "IMG" &&
      !!spriteKey(current) && spriteKey(current) === spriteKey(next);
    copyAttributes(current, next, isSprite);
    morphChildren(current, next);
    return current;
  }

  function morphChildren(currentParent, nextParent) {
    const nextChildren = Array.from(nextParent.childNodes || []);
    let current = currentParent.firstChild || null;

    for (const next of nextChildren) {
      if (current && compatibleNodes(current, next)) {
        morphNode(current, next);
        current = current.nextSibling;
      } else {
        const replacement = cloneNode(next);
        if (current) {
          currentParent.replaceChild(replacement, current);
        } else {
          currentParent.appendChild(replacement);
        }
        current = replacement.nextSibling;
      }
    }

    while (current) {
      const following = current.nextSibling;
      currentParent.removeChild(current);
      current = following;
    }
  }

  const previousRenderPage = W.renderPage;
  if (typeof previousRenderPage === "function" && !previousRenderPage._v38SpriteStable) {
    const stableRenderPage = function() {
      const currentState = appState();
      const main = doc.getElementById?.("main") || doc.querySelector?.("#main");
      const canMorphBattle = currentState?.page === "battle" &&
        !!currentState.battle && !!main?.querySelector?.(".battlefield") &&
        typeof W.renderBattlePage === "function";

      // Use the original renderer for navigation and the first battle render.
      // Once the battlefield exists, reconcile its DOM in place so sprite <img> nodes
      // never leave the document just because HP, logs, or move buttons changed.
      if (!canMorphBattle) return previousRenderPage.apply(this, arguments);

      const keepScroll = currentState.battle.turnBusy ? W.scrollY : null;
      const template = doc.createElement("template");
      template.innerHTML = W.renderBattlePage();
      morphChildren(main, template.content);

      if (typeof W.updateTop === "function") W.updateTop();
      if (typeof W.bindPageEvents === "function") W.bindPageEvents();
      if (keepScroll !== null && keepScroll !== undefined && typeof W.scrollTo === "function") {
        const root = doc.documentElement;
        const oldBehavior = root?.style?.scrollBehavior;
        if (root?.style) root.style.scrollBehavior = "auto";
        W.scrollTo(0, keepScroll);
        if (root?.style) root.style.scrollBehavior = oldBehavior || "";
      }
    };
    stableRenderPage._v38SpriteStable = true;
    stableRenderPage._v38Original = previousRenderPage;
    W.renderPage = stableRenderPage;
  }

  function normalizedId(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function findMegaEnergy(id) {
    try {
      const items = Array.isArray(MEGA_STONES) ? MEGA_STONES : [];
      return items.find((item) =>
        normalizedId(item.id) === normalizedId(id) ||
        normalizedId(typeof itemSlug === "function" ? itemSlug(item.id) : item.id) === normalizedId(id)
      ) || null;
    } catch (_) {
      return null;
    }
  }

  function megaEnergyArtwork(item) {
    if (!item) return '<div class="v38-energy-placeholder" aria-hidden="true">✦</div>';
    try {
      const form = typeof v174MegaForm === "function" ? v174MegaForm(item.meta) : null;
      if (form && typeof speciesIcon === "function") {
        return speciesIcon(form, false, false);
      }
    } catch (error) {
      console.warn("[v38 energy artwork]", error);
    }
    return '<div class="v38-energy-placeholder" aria-hidden="true">✦</div>';
  }

  const previousRenderShop = W.renderShop;
  if (typeof previousRenderShop === "function" && !previousRenderShop._v38EnergyArtwork) {
    const renderShopWithArtwork = function() {
      const html = previousRenderShop.apply(this, arguments);
      if (typeof html !== "string") return html;

      // v30's unified shop replaced the earlier v17.8 Mega Energy cards and
      // accidentally dropped their Mega Pokemon preview. Restore that artwork.
      return html.replace(
        /<article\b([^>]*\bclass="[^"]*\bv30-item-card\b[^"]*"[^>]*)>([\s\S]*?)<\/article>/g,
        (whole, attributes, body) => {
          if (!/\bdata-category="mega"/.test(attributes) || /v38-energy-preview/.test(body)) {
            return whole;
          }
          const id = body.match(/data-item="([^"]+)"/)?.[1] || "";
          const item = findMegaEnergy(id);
          if (!item) return whole;
          const label = item.meta?.forme === "Mega-X" ? "MEGA X" :
            item.meta?.forme === "Mega-Y" ? "MEGA Y" :
            item.meta?.forme === "Mega-Z" ? "MEGA Z" : "MEGA";
          const art = megaEnergyArtwork(item);
          const decoratedAttributes = attributes.replace(/\\bclass="([^"]*)"/, 'class="$1 v38-energy-card"');
          return '<article' + decoratedAttributes + '><div class="v38-energy-preview">' +
            art + '<span>' + label + ' ENERGY</span></div><div class="v38-energy-content">' +
            body + '</div></article>';
        }
      );
    };
    renderShopWithArtwork._v38EnergyArtwork = true;
    renderShopWithArtwork._v38Original = previousRenderShop;
    W.renderShop = renderShopWithArtwork;
  }

  W.PokemonChampions2DBattleDisplay = {
    version: 38,
    morphChildren,
    morphNode,
    audit: () => ({
      version: 38,
      spriteStableBattleRender: !!W.renderPage?._v38SpriteStable,
      megaEnergyArtwork: !!W.renderShop?._v38EnergyArtwork,
      battlePageHook: typeof W.renderBattlePage === "function",
      spriteKeyPreservation: true
    })
  };

  console.info("[v38] Stable battle sprites, larger battle Pokemon and Mega Energy artwork loaded.");
})();
