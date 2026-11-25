(()=>{
 'use strict';
 const V182_VERSION='18.2.0';
 const asObject=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const safeNum=v=>Math.max(0,Math.floor(Number(v)||0));
 const allDex=()=>Array.isArray(state?.data?.dex)?state.data.dex:[];
 const baseIdOfMon=mon=>{
  const id=String(mon?._preMegaSpeciesId||mon?.baseSpeciesId||mon?.speciesId||'');
  const sp=state.data?.dexById?.[id]||state.data?.dex?.find(p=>p.id===id)||null;
  return String(sp?.baseSpecies||sp?.id||id).toLowerCase();
 };
 function researchBook(){state.dexResearch=asObject(state.dexResearch);return state.dexResearch;}
 function recordResearch(id,kind){
  id=String(id||'').toLowerCase();if(!id||!state.data?.dexById?.[id])return false;
  const book=researchBook(),row=book[id]&&typeof book[id]==='object'?book[id]:(book[id]={});
  if(row[kind])return false;
  row[kind]=true;row.updatedAt=Date.now();
  saveLocal();return true;
 }
 function ownedSet(){return new Set((state.owned||[]).map(baseIdOfMon).filter(Boolean));}
 function getResearchCounts(){
  const dex=allDex(),book=researchBook(),owned=ownedSet();let observed=0,battled=0,complete=0,ownedCount=0;
  for(const p of dex){const r=book[p.id]||{};const o=owned.has(String(p.baseSpecies||p.id).toLowerCase());if(r.observed)observed++;if(r.battle) battedFix();if(o)ownedCount++;if(r.observed&&r.battle&&o)complete++;}
  function battedFix(){battled++;}
  return {total:dex.length,observed,battled,owned:ownedCount,complete};
 }
 function isOwned(id,set){return set.has(String(id||'').toLowerCase());}
 function statusMark(ok,label){return `<span class="dex-research-mark ${ok?'done':''}">${ok?'✓ '+label:'未'+label}</span>`;}
 function renderResearchPanel(){
  const dex=allDex(),book=researchBook(),owned=ownedSet(),counts=getResearchCounts();
  const query=String(state.dexResearchSearch||'').trim().toLowerCase();
  const filter=state.dexResearchFilter||'all';
  let list=dex.filter(p=>{
   const r=book[p.id]||{},o=isOwned(p.baseSpecies||p.id,owned),isComplete=!!(r.observed&&r.battle&&o);
   if(filter==='incomplete'&&isComplete)return false;
   if(filter==='unobserved'&&r.observed)return false;
   if(filter==='unbattled'&&r.battle)return false;
   if(filter==='owned'&&!o)return false;
   if(filter==='complete'&&!isComplete)return false;
   if(query&&!`${p.num} ${p.id} ${p.name} ${p.jpName||''} ${p.displayName||''}`.toLowerCase().includes(query))return false;
   return true;
  });
  const limit=Math.min(dex.length,Math.max(24,safeNum(state.dexResearchLimit||30)));
  const rows=list.slice(0,limit).map(p=>{
   const r=book[p.id]||{},o=isOwned(p.baseSpecies||p.id,owned);
   return `<tr><td>#${String(p.num).padStart(4,'0')}</td><td><button class="dex-research-row" data-action="select-dex" data-id="${esc(p.id)}">${esc(getPokeName(p))}</button></td><td>${statusMark(!!r.observed,'観察')}</td><td>${statusMark(!!r.battle,'対戦')}</td><td>${statusMark(o,'所持')}</td></tr>`;
  }).join('');
  const pct=counts.total?Math.round(counts.complete/counts.total*100):0;
  return `<section class="dex-research-panel" id="national-dex-research"><div class="dex-research-head"><div><div class="section-kicker">NATIONAL DEX FIELD RESEARCH · v18.2</div><h2>全国図鑑調査</h2><p>1,025種を対象に、観察・バトル・所持の記録を個別に保存します。</p></div><span class="pill">${counts.total.toLocaleString()} 種</span></div><div class="dex-research-body"><div class="dex-research-stats"><div class="dex-research-stat"><small>調査完了（3項目）</small><b>${counts.complete.toLocaleString()} / ${counts.total.toLocaleString()}</b></div><div class="dex-research-stat"><small>観察した種類</small><b>${counts.observed.toLocaleString()}</b></div><div class="dex-research-stat"><small>バトル記録がある種類</small><b>${counts.battled.toLocaleString()}</b></div><div class="dex-research-stat"><small>所持している種類</small><b>${counts.owned.toLocaleString()}</b></div></div><div class="dex-research-progress"><i style="width:${pct}%"></i></div><div class="tiny muted">完全調査の進捗：${pct}%（観察・バトル・所持の3項目すべてを達成）</div><div class="dex-research-tools"><input id="dex-research-search" class="field" placeholder="図鑑番号・ポケモン名で調査対象を検索" value="${esc(state.dexResearchSearch||'')}"><select id="dex-research-filter" class="field"><option value="all" ${filter==='all'?'selected':''}>すべて</option><option value="incomplete" ${filter==='incomplete'?'selected':''}>調査未完了</option><option value="unobserved" ${filter==='unobserved'?'selected':''}>未観察</option><option value="unbattled" ${filter==='unbattled'?'selected':''}>未バトル</option><option value="owned" ${filter==='owned'?'selected':''}>所持中</option><option value="complete" ${filter==='complete'?'selected':''}>完全調査済み</option></select></div><div class="dex-research-table"><table><thead><tr><th>番号</th><th>ポケモン（選択で詳細表示・観察記録）</th><th>観察</th><th>対戦</th><th>所持</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">該当するポケモンがありません。</td></tr>'}</tbody></table></div><div class="dex-research-actions"><button class="btn btn-secondary btn-sm" data-dex-research-more ${list.length<=limit?'disabled':''}>さらに表示（${Math.max(0,list.length-limit)}種）</button><button class="btn btn-ghost btn-sm" data-dex-research-csv>調査記録をCSV保存</button><section class="panel" id="sprite-audit-panel" style="margin-top:12px"><div class="panel-head"><h3>🖼️ 全国図鑑画像診断</h3><span class="pill">1,025種</span></div><div class="panel-body"><p class="tiny muted">前向き・後ろ向きのGIF候補を読み込み、静止画のみ・画像なしのポケモンを一覧にします。ネット接続が必要です。</p><div class="form-row"><button class="btn btn-secondary btn-sm" data-sprite-audit-start>全1,025匹を検査</button><span class="tiny muted" data-sprite-audit-progress>未検査</span></div><div class="tiny muted" data-sprite-audit-output style="margin-top:10px">検査開始ボタンを押してください。</div></div></section></div><p class="dex-research-note">観察：この調査リストまたは通常の図鑑カードから詳細を開くと記録。対戦：バトル画面に登場したポケモンを記録。所持：ボックス内のポケモンから自動判定。記録はセーブ・バックアップJSONに保存されます。</p></div></section>`;
 }
 const previousRenderDex=renderDex;
 renderDex=function(){
  const selected=state.data?.dexById?.[state.selectedDex];
  if(selected)recordResearch(selected.id,'observed');
  const html=previousRenderDex.apply(this,arguments);
  const panel=renderResearchPanel();
  return String(html).replace('<div class="search-row">',panel+'<div class="search-row">');
 };
 const previousRenderBattle=renderBattlePage;
 renderBattlePage=function(){
  const b=state.battle;
  if(b){let changed=false;for(const [side,team,active] of [['player',b.playerTeam,b.playerActive],['enemy',b.enemyTeam,b.enemyActive]]){for(const idx of Array.isArray(active)?active:[]){const mon=team?.[idx];if(mon){const id=baseIdOfMon(mon);if(recordResearch(id,'battle'))changed=true;}}} }
  return previousRenderBattle.apply(this,arguments);
 };
 // National Dex controls are delegated once and survive every rerender.
 if(!window.__v182DexResearchEvents){
  window.__v182DexResearchEvents=true;
  document.addEventListener('input',e=>{if(e.target?.id==='dex-research-search'){state.dexResearchSearch=e.target.value;state.dexResearchLimit=30;refreshWithFocus('dex-research-search');}},true);
  document.addEventListener('change',e=>{if(e.target?.id==='dex-research-filter'){state.dexResearchFilter=e.target.value;state.dexResearchLimit=30;renderPage();}},true);
  document.addEventListener('click',e=>{
   if(e.target.closest('[data-dex-research-more]')){state.dexResearchLimit=Math.min(allDex().length,safeNum(state.dexResearchLimit||30)+30);renderPage();}
   if(e.target.closest('[data-dex-research-csv]')){
    const dex=allDex(),book=researchBook(),owned=ownedSet();const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const data=[['図鑑番号','ID','日本語名','観察','バトル','所持','完全調査'],...dex.map(p=>{const r=book[p.id]||{},o=isOwned(p.baseSpecies||p.id,owned);return [p.num,p.id,getPokeName(p),!!r.observed,!!r.battle,o,!!(r.observed&&r.battle&&o)];})];
    const blob=new Blob(['\ufeff'+data.map(row=>row.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='national_dex_research_v18_2.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
   }
  });
 }
 // Show the same working image audit inside the National Dex, not only Settings.
 const previousRenderSettings=renderSettings;
 renderSettings=function(){
  const html=previousRenderSettings.apply(this,arguments);
  const audit=window.PokemonChampions2DData?.auditMegaShop?.()||{};
  const counts=getResearchCounts();
  const panel=`<section class="setting-card" style="grid-column:1/-1;margin-top:12px"><div class="section-kicker">V18.2 INTEGRATION AUDIT</div><h3>機能接続チェック</h3><p>本体との接続状態と、図鑑・ショップの実データ件数を確認できます。</p><div class="settings-grid"><div><b>全国図鑑</b><p>${counts.total}種 / 調査済み ${counts.complete}種</p></div><div><b>メガストーン</b><p>${audit.catalogCount||MEGA_STONES.length}種類 / ID重複なしを検査</p></div><div><b>技・特性データ</b><p>${Object.keys(state.data?.movesById||{}).length}技 / ${(state.data?.abilitiesList||[]).length}特性</p></div><div><b>画像診断</b><p>全国図鑑内の「全ポケモンの画像を検査」から実行できます。</p></div></div><div class="form-row"><button class="btn btn-secondary" data-v182-run-tests>統合テストを実行</button><button class="btn btn-ghost" data-page="dex">全国図鑑調査を開く</button></div><div id="v182-test-output" class="tiny muted" style="margin-top:10px">まだテストを実行していません。</div></section>`;
  return html+panel;
 };
 function runTests(){
  const checks=[];const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
  test('core bridge exposes state and render functions',()=>!!state&&typeof renderPage==='function'&&typeof renderDex==='function'&&typeof renderShop==='function'&&typeof handleAction==='function');
  test('Mega Stone catalog is one-to-one with Mega form data',()=>MEGA_STONES.length===V174_MEGA_FORM_DATA.length&&new Set(MEGA_STONES.map(x=>itemSlug(x.id))).size===MEGA_STONES.length);
  test('shop renders more than the old two Garchomp entries',()=>{const oldSearch=state.shopSearch;state.shopSearch='';try{const html=renderShop();return MEGA_STONES.length>2&&html.includes('リザードンナイトX')&&html.includes('ガブリアスナイト')&&html.includes(`${MEGA_STONES.length}種類`);}finally{state.shopSearch=oldSearch;}});
  test('National Dex research panel is in Dex page',()=>renderDex().includes('id="national-dex-research"')&&renderDex().includes('data-dex-research-csv'));
  test('Dex research ledger is available and persistent save function is connected',()=>!!researchBook()&&typeof saveLocal==='function');
  test('research records are included in save, load, export and import',()=>saveLocal.toString().includes('dexResearch')&&(loadLocal.toString().includes('dexResearch')||(typeof V19_prevLoadLocal==='function'&&V19_prevLoadLocal.toString().includes('dexResearch')))&&exportSave.toString().includes('dexResearch')&&readImportFile.toString().includes('importedDexResearch'));
  test('sprite audit function is connected to the shared Dex audit panel',()=>typeof window.PokemonChampions2DData?.runSpriteAudit==='function');
  test('legacy inventory migrations are non-destructive',()=>{const save=state.items,saveFn=saveLocal;let oldRaw=null;try{oldRaw=localStorage.getItem('pokemon-champions-2d-save');}catch(_){}state.items={evolutionstone:1,charizarditex:2,megaenergy:5};const before={...state.items};try{saveLocal=()=>true;if(typeof window.PokemonChampions2DData?.migrateMegaInventory==='function')window.PokemonChampions2DData.migrateMegaInventory();return Object.keys(before).every(k=>state.items[k]===before[k]||k.startsWith('__'));}finally{state.items=save;saveLocal=saveFn;try{if(oldRaw===null)localStorage.removeItem('pokemon-champions-2d-save');else localStorage.setItem('pokemon-champions-2d-save',oldRaw);}catch(_){}}});
  return {version:V182_VERSION,passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
 }
 window.PokemonChampions2DData=window.PokemonChampions2DData||{};
 Object.assign(window.PokemonChampions2DData,{version:V182_VERSION,recordDexResearch:recordResearch,auditDexResearch:getResearchCounts,runV182Tests:runTests,testMegaEnergy:runTests,testIntegration:runTests});
 document.addEventListener('click',e=>{if(e.target.closest('[data-v182-run-tests]')){const r=runTests(),out=document.querySelector('#v182-test-output');if(out)out.textContent=`統合テスト ${r.passed}/${r.total} 成功 · `+r.checks.filter(x=>!x.passed).map(x=>x.name+(x.error?': '+x.error:'')).join(' / ');}},true);
})();
