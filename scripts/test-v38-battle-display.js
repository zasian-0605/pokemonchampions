"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const patchPath = path.join(root, "js/patches/v38-battle-display-fixes.js");
const cssPath = path.join(root, "css/battle-ui-v38.css");
const indexPath = path.join(root, "index.html");
const patch = fs.readFileSync(patchPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
assert.doesNotThrow(() => new Function(patch), "v38 patch must parse");
assert.match(index, /battle-ui-v38\.css/);
assert.match(index, /v38-battle-display-fixes\.js/);
assert.match(css, /\.battle-mon\.enemy img/);
assert.match(css, /\.battle-mon\.player img/);
assert.match(css, /\.v38-energy-preview img/);

class FakeNode {
  constructor(tag, nodeType = 1, value = "") {
    this.nodeType = nodeType;
    this.tagName = nodeType === 1 ? tag.toUpperCase() : undefined;
    this.nodeValue = nodeType === 1 ? null : value;
    this.attributes = [];
    this.childNodes = [];
    this.parentNode = null;
    this.dataset = {};
  }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[i + 1] || null;
  }
  setAttribute(name, value) {
    const old = this.attributes.find((x) => x.name === name);
    if (old) old.value = String(value);
    else this.attributes.push({ name, value: String(value) });
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(value);
    }
  }
  getAttribute(name) { return this.attributes.find((x) => x.name === name)?.value ?? null; }
  removeAttribute(name) {
    this.attributes = this.attributes.filter((x) => x.name !== name);
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[key];
    }
  }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    this.childNodes.push(node); node.parentNode = this; return node;
  }
  insertBefore(node, reference) {
    if (node.parentNode) node.parentNode.removeChild(node);
    const i = reference ? this.childNodes.indexOf(reference) : -1;
    if (i < 0) this.childNodes.push(node); else this.childNodes.splice(i, 0, node);
    node.parentNode = this; return node;
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) this.childNodes.splice(i, 1);
    node.parentNode = null; return node;
  }
  replaceChild(next, previous) {
    const i = this.childNodes.indexOf(previous);
    if (next.parentNode) next.parentNode.removeChild(next);
    if (i >= 0) { this.childNodes[i] = next; next.parentNode = this; }
    previous.parentNode = null; return previous;
  }
  cloneNode(deep) {
    const copy = new FakeNode(this.tagName || "#text", this.nodeType, this.nodeValue || "");
    copy.attributes = this.attributes.map((x) => ({ ...x }));
    copy.dataset = { ...this.dataset };
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }
}

function element(tag, attrs = {}, children = []) {
  const node = new FakeNode(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.appendChild(child);
  return node;
}
function textNode(value) { return new FakeNode("#text", 3, value); }

const main = element("main");
const oldSprite = element("img", {
  "data-sprite-key": "charizard|back|normal|animated",
  src: "https://sprites.example/charizard-old.gif",
  alt: "リザードン"
});
const oldWrapper = element("div", { class: "battle-mon player" }, [oldSprite]);
const oldLog = element("p", {}, [textNode("前のログ")]);
main.appendChild(oldWrapper);
main.appendChild(oldLog);

const nextMain = element("fragment");
const freshSprite = element("img", {
  "data-sprite-key": "charizard|back|normal|animated",
  src: "https://sprites.example/charizard-new.gif",
  alt: "リザードン"
});
const freshWrapper = element("div", { class: "battle-mon player active-turn" }, [freshSprite]);
const freshLog = element("p", {}, [textNode("攻撃した！")]);
nextMain.appendChild(freshWrapper);
nextMain.appendChild(freshLog);

const document = {
  getElementById() { return main; },
  querySelector() { return main; },
  createElement() { return { content: element("fragment"), set innerHTML(_) {} }; },
  documentElement: { style: {} }
};
const state = { page: "battle", battle: { turnBusy: true } };
const W = {
  document,
  scrollY: 120,
  state,
  MEGA_STONES: [{ id: "charizarditex", meta: { base: "charizard", forme: "Mega-X" } }],
  itemSlug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]/g, ""); },
  findMegaForm() { return { id: "charizardmegax" }; },
  speciesIcon(form) {
    return '<img data-sprite-key="' + form.id + '|front|normal|static" src="https://sprites.example/charizard-mega.png" alt="メガリザードンX">';
  },
  renderBattlePage() { return ""; },
  updateTop() {},
  bindPageEvents() {},
  scrollTo() {},
  renderPage() { throw new Error("original renderer should not replace a mounted battlefield"); },
  renderShop() {
    return '<div class="shop-grid"><article class="shop-card v30-item-card" data-category="mega" data-search="charizard">' +
      '<div class="section-kicker">MEGA ENERGY</div><h3>リザードンナイトX</h3>' +
      '<button data-action="v30-buy-item" data-item="charizarditex">購入する</button></article></div>';
  }
};
const fakeWindow = W;
const context = {
  window: fakeWindow, document, console, Array, Map, Set, Number, String, Object, Promise, Math
};
vm.runInNewContext(patch, context, { filename: "v38-battle-display-fixes.js" });

const api = W.PokemonChampions2DBattleDisplay;
assert.equal(api.version, 38);
api.morphChildren(main, nextMain);
assert.equal(main.firstChild, oldWrapper, "battle mon wrapper should remain mounted");
assert.equal(oldWrapper.firstChild, oldSprite, "same Pokemon sprite node must be reused");
assert.equal(oldSprite.getAttribute("src"), "https://sprites.example/charizard-old.gif",
  "stable sprite source must not be rewritten during a battle rerender");
assert.equal(oldLog.firstChild.nodeValue, "攻撃した！", "battle log text should still update");
assert.ok(oldWrapper.getAttribute("class").includes("active-turn"), "battle classes should still update");

const shop = W.renderShop();
assert.match(shop, /v38-energy-preview/);
assert.match(shop, /charizardmegax\|front\|normal\|static/);
assert.match(shop, /MEGA X ENERGY/);
assert.equal(api.audit().spriteStableBattleRender, true);
assert.equal(api.audit().megaEnergyArtwork, true);
console.log("v38 battle display tests passed.");
