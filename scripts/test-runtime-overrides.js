'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('js/app.js');

// Run the exact field-timer helpers extracted from the browser runtime.
const helperStart = app.indexOf('const V170_TIMED_FIELD_KEYS=');
const helperEnd = app.indexOf('function v170SetStages', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'field timer helpers must exist');
const helperSource = app.slice(helperStart, helperEnd);
const timerResult = vm.runInNewContext(
  helperSource + '\nv170RunFieldTimerTests();',
  {},
  { filename: 'app-field-timer-helpers.js' }
);
assert.equal(timerResult.passed, timerResult.total, 'all field timer unit tests must pass');
assert.equal(timerResult.total, 4, 'the field timer test set must remain complete');

// A normal completed action sequence must reach end-of-turn resolution exactly once.
const turnStart = app.indexOf('async function executeTurn(actions){');
const turnEnd = app.indexOf('\nfunction findMegaForm', turnStart);
assert.ok(turnStart >= 0 && turnEnd > turnStart, 'base executeTurn must exist');
const baseTurn = app.slice(turnStart, turnEnd);
assert.equal((baseTurn.match(/processEndTurn\(b\)/g) || []).length, 1,
  'base executeTurn must call processEndTurn exactly once');

// The v16.10 timer wrapper must delegate to its predecessor once and own the countdown.
const wrapperStart = app.indexOf('const __v170ProcessEndTurn=processEndTurn;');
const wrapperEnd = app.indexOf('// Mutable battle types now participate', wrapperStart);
assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart, 'base end-turn timer wrapper must exist');
const timerWrapper = app.slice(wrapperStart, wrapperEnd);
assert.equal((timerWrapper.match(/__v170ProcessEndTurn\(b\)/g) || []).length, 1,
  'v16.10 end-turn wrapper must call its predecessor exactly once');
assert.equal((timerWrapper.match(/v170AdvanceFieldTimers\(b\)/g) || []).length, 1,
  'all timed field effects must advance in one place');
assert.ok(!/b\.trickRoomTurns\s*--/.test(app),
  'Trick Room must not have a second inline decrement path');

// The legacy metadata bridge must not toggle a canonical pseudo-weather move a second time.
assert.ok(app.includes("const legacyPseudoApiIds=new Set([433,356,472,478]);"));
assert.ok(app.includes("if(pseudo&&!legacyPseudoNames.has(id)&&!legacyPseudoApiIds.has(moveApi)){"),
  'canonical Trick Room / Gravity / Wonder Room / Magic Room effects must be excluded from generic handling');

// Mega Stone shop operations now have one owner (v17.8), with v17.7/v18 only compatibility or diagnostics.
const v177 = read('js/patches/v17-7-mega-energy-inventory-fix.js');
const v178 = read('js/patches/v17-8-mega-system-rebuild.js');
const v180 = read('js/patches/v18-mega-shop-rebuild.js');
for (const name of ['findMegaForm', 'megaEvolve', 'initializeSave', 'renderTraining', 'renderShop', 'handleAction', 'renderBattlePage']) {
  assert.ok(!new RegExp('\\b' + name + '\\s*=\\s*(?:async\\s*)?function').test(v177),
    'v17.7 must not override ' + name);
}
assert.equal((v178.match(/renderShop=function/g) || []).length, 1, 'v17.8 must own one Mega shop renderer');
assert.equal((v178.match(/handleAction=async function/g) || []).length, 1, 'v17.8 must own one Mega action handler');
assert.ok(v178.includes('data-action="clear-mega-shop-search"'), 'shop search reset must be in the owning renderer');
assert.ok(v178.includes("if(action==='clear-mega-shop-search')"), 'shop search reset must be handled by the owning action handler');
assert.ok(!/renderShop\s*=\s*function|handleAction\s*=\s*async\s*function/.test(v180),
  'v18.0 must not add a second Mega shop or purchase override');
assert.ok(v180.includes('auditMegaShop'), 'v18.0 shop diagnostics must remain available');

// The unified item catalogue must expose only owned items, canonicalize duplicates and preserve Mega Stone form checks.
const itemPatch = read('js/patches/v30-item-inventory.js');
const itemNames = JSON.parse(read('data/item-names-ja.json'));
const page = read('index.html');
assert.equal(itemNames.choicespecs, 'こだわりメガネ', 'Choice Specs must have its official Japanese name');
assert.equal(itemNames.miracleberry, 'きせきのみ', 'legacy Berry names must use Japanese localization');
assert.equal(itemNames.polkadotbow, 'みずたまリボン', 'legacy held item names must use the official Japanese localization');
assert.equal(itemNames.stick, 'ながねぎ', 'Stick must use its official Japanese name');
assert.ok(page.indexOf('js/item-names-ja.js') < page.indexOf('js/patches/v30-item-inventory.js'),
  'Japanese item names must load before the inventory patch');
assert.ok(itemPatch.includes("num(stock[it.id])") && itemPatch.includes("n<1&&current!==it.id"),
  'unowned generic items must not appear in the training selector');
assert.ok(itemPatch.includes("W.findMegaForm?.({...mon,heldItem:it.id})"),
  'Mega Stone options must be restricted to matching Mega forms');
assert.ok(itemPatch.includes("function transferHeldStock(stock,oldId,newId)") &&
  itemPatch.includes("function undoReturnedMegaStone(stock,oldId,newId)"),
  'ordinary held items and Mega Stones must use the centralized stock transfer helpers');
const itemHelperStart = itemPatch.indexOf('function transferHeldStock');
const itemHelperEnd = itemPatch.indexOf('function optionsFor', itemHelperStart);
assert.ok(itemHelperStart >= 0 && itemHelperEnd > itemHelperStart, 'item stock transfer helpers must be extractable');
const helperContext = { num: value => Math.max(0,Math.floor(Number(value)||0)), megaMap: () => new Map([['charizarditex',{}]]) };
const stockHelpers = vm.runInNewContext(itemPatch.slice(itemHelperStart,itemHelperEnd) + String.fromCharCode(10) +
  '({transferHeldStock,undoReturnedMegaStone})', helperContext);
const sampleStock = {choicespecs:1,lifeorb:1,charizarditex:0};
stockHelpers.transferHeldStock(sampleStock,'choicespecs','lifeorb');
assert.equal(sampleStock.choicespecs,2);
assert.equal(sampleStock.lifeorb,0);
stockHelpers.transferHeldStock(sampleStock,'charizarditex','choicespecs');
assert.equal(sampleStock.charizarditex,0);
assert.equal(sampleStock.choicespecs,1);
sampleStock.charizarditex=1;
stockHelpers.undoReturnedMegaStone(sampleStock,'charizarditex','choicespecs');
assert.equal(sampleStock.charizarditex,0);
assert.ok(itemPatch.includes("new Map()") && itemPatch.includes("function catalogue()"),
  'the shop must use one deduplicated item catalogue');
assert.ok(itemPatch.includes('data-action="v30-buy-item"'),
  'the unified shop must provide a purchase action');
assert.ok(itemPatch.includes("if(id==='vilevial')return false"), 'unsupported custom item must not enter the official held-item shop');

// Parse every browser patch without executing it; this catches syntax errors outside app.js too.
const patchDir = path.join(root, 'js', 'patches');
const patchFiles = fs.readdirSync(patchDir).filter((name) => name.endsWith('.js')).sort();
for (const name of patchFiles) {
  const source = fs.readFileSync(path.join(patchDir, name), 'utf8');
  new vm.Script(source, { filename: path.join('js', 'patches', name) });
}

console.log('Runtime override audit passed.');
console.log('Field timer tests: ' + timerResult.passed + '/' + timerResult.total);
console.log('Browser patch syntax checks: ' + patchFiles.length + '/' + patchFiles.length);
console.log('End-of-turn and Mega shop ownership checks: passed');
