/* v17.7: Mega Energy is a purchased, species-specific held item. It is no longer a free/global battle currency. */
(function(){
 'use strict';
 const V177_VERSION = 1;
 const V177_MEGA_IDS = new Set((MEGA_STONES || []).map(x=>String(x.id)));
 const V177_WAIT = ms => new Promise(resolve=>setTimeout(resolve,ms));
 const V177_NUM = value => Math.max(0, Number(value)||0);

 function v177IsMegaEnergy(value){
  const id=itemSlug(value||'');
  return V177_MEGA_IDS.has(id) && !!V174_MEGA_BY_STONE[id];
 }
 function v177MetaForEnergy(value){
  const id=itemSlug(value||'');
  return V174_MEGA_BY_STONE[id]||null;
 }
 function v177EnergyName(meta){
  const base=v174FindBaseSpecies(meta);
  const jp=base?getPokeName(base):meta.base;
  const suffix=meta.forme==='Mega-X'?'X':meta.forme==='Mega-Y'?'Y':meta.forme==='Mega-Z'?'Z':'';
  return `メガエナジー：${jp}${suffix}`;
 }
 function v177SetEnergyNames(){
  for(const item of MEGA_STONES){
   const meta=item.meta||V174_MEGA_BY_STONE[item.id];
   if(!meta)continue;
   item.name=v177EnergyName(meta);
   item.description=`${meta.base}専用のメガエナジー。${meta.base}に持たせると、バトル中に対応するメガシンカを発動できます。持たせたエナジーはメガシンカ時に消費されません。`;
   item.kind='mega-energy';
   item.price=meta.forme==='Mega-Z'?800:500;
  }
 }
 v177SetEnergyNames();

 // Match a Mega Energy to its exact base species; same Pokédex number alone is not enough.
 findMegaForm=function(mon){
  const base=monSpecies(mon);
  if(!base)return null;
  const meta=V174_MEGA_BY_STONE[itemSlug(mon.heldItem||'')];
  if(!meta)return null;
  const identities=[base.baseSpecies,base.id,base.name].filter(Boolean).map(slug);
  if(!identities.includes(slug(meta.base)))return null;
  return v174MegaForm(meta);
 };

 // Replace the old global-token Mega handler. The equipped species-specific Mega Energy is the sole requirement.
 megaEvolve=function(mon,side='player'){
  if(!mon||mon.megaUsed)return false;
  if(mon.terastallized){toast('テラスタル中はメガシンカできません。','warn');return false;}
  const heldId=itemSlug(mon.heldItem||'');
  const mega=findMegaForm(mon);
  if(!mega||!v177IsMegaEnergy(heldId)){
   if(side==='player')toast('対応する専用メガエナジーを持ち物に装備してください。','warn');
   return false;
  }
  const ratio=Number(mon.hp||1)/Math.max(1,Number(mon.maxhp||1));
  mon._preMegaSpeciesId=mon._preMegaSpeciesId||mon.speciesId;
  mon.speciesId=mega.id;
  mon.formId=mega.id;
  mon.name=getPokeName(mega);
  mon.types=[...(mega.types||[])];
  mon.abilityId=Object.values(mega.abilities||{})[0]||mon.abilityId;
  mon.stats=calcStats(mon);
  mon.maxhp=Number(mon.stats?.hp||mon.maxhp||1);
  mon.hp=Math.max(1,Math.min(mon.maxhp,Math.round(mon.maxhp*ratio)));
  mon.megaUsed=true;
  mon.megaActive=true;
  mon.megaFormId=mega.id;
  // The Mega Energy is an equipped item, like a Mega Stone: it is not consumed during evolution.
  battleLog(`${mon.name}にメガシンカした！`);
  toast(`${mon.name}にメガシンカ！`,'good');
  return true;
 };

 // Remove the old global MEGA ENERGY consumable. Form-specific held energies replace it.
 const V177_oldGlobalCareIndex=CARE_ITEMS.findIndex(x=>x.id==='megaenergy');
 if(V177_oldGlobalCareIndex>=0)CARE_ITEMS.splice(V177_oldGlobalCareIndex,1);

 // One-time migration: old prototype inventory could be freely equipped on multiple Pokémon.
 // Clear old Mega stock/held stones exactly once; future purchases are tracked normally.
 function v177MigrateMegaInventory(){
  state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
  if(Number(state.items.__megaEnergyInventoryVersion||0)>=V177_VERSION)return false;
  // v18.2: preserve earned Mega stock and equipped items. Migration only records the schema version.
  state.items.__megaEnergyInventoryVersion=V177_VERSION;
  saveLocal();
  return true;
 }
 const V177_prevInitializeSave=initializeSave;
 initializeSave=function(){
  const result=V177_prevInitializeSave.apply(this,arguments);
  v177MigrateMegaInventory();
  return result;
 };

 // Inventory transaction for equipping/removing a purchased Mega Energy.
 function v177SetMegaHeldItem(mon,newValue,shouldSave=true){
  if(!mon)return {ok:false,reason:'missing-mon'};
  state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
  const oldId=itemSlug(mon.heldItem||'');
  const newId=itemSlug(newValue||'');
  if(oldId===newId){mon.heldItem=newValue||'';return {ok:true,changed:false};}
  if(v177IsMegaEnergy(newId)&&V177_NUM(state.items[newId])<1){
   return {ok:false,reason:'not-owned',id:newId};
  }
  if(v177IsMegaEnergy(newId))state.items[newId]=V177_NUM(state.items[newId])-1;
  if(v177IsMegaEnergy(oldId))state.items[oldId]=V177_NUM(state.items[oldId])+1;
  mon.heldItem=newValue||'';
  if(shouldSave)saveLocal();
  return {ok:true,changed:true,oldId,newId};
 }

 // Only show compatible Mega Energies that are in stock, plus the one currently held.
 const V177_prevRenderTraining=renderTraining;
 renderTraining=function(){
  let html=V177_prevRenderTraining();
  const mon=state.owned.find(m=>m.uid===state.selectedOwned)||state.owned[0];
  if(!mon)return html;
  const species=monSpecies(mon);
  const baseKey=slug(species?.baseSpecies||species?.id||species?.name||mon.speciesId);
  const currentId=itemSlug(mon.heldItem||'');
  const compatible=MEGA_STONES.filter(item=>{
   const meta=item.meta||V174_MEGA_BY_STONE[item.id];
   if(!meta)return false;
   const isCurrent=currentId===item.id;
   return isCurrent || (slug(meta.base)===baseKey && V177_NUM(state.items?.[item.id])>0);
  });
  const selectMatch=html.match(/(<select id="held-item"[^>]*>)([\s\S]*?)(<\/select>)/);
  if(selectMatch){
   const opening=selectMatch[1],inner=selectMatch[2],closing=selectMatch[3];
   const kept=inner.replace(/<option\b[^>]*value="([^"]+)"[^>]*>[\s\S]*?<\/option>/g,(option,id)=>v177IsMegaEnergy(id)?'':option);
   const energyOptions=compatible.map(item=>{
    const stock=V177_NUM(state.items?.[item.id]);
    return `<option value="${esc(item.id)}" ${currentId===item.id?'selected':''}>${esc(item.name)}（所持 ${stock}）</option>`;
   }).join('');
   html=html.replace(selectMatch[0],`${opening}${kept}${energyOptions}${closing}`);
  }
  html=html.replace('<label class="small muted" for="held-item">持ち物</label>','<label class="small muted" for="held-item">持ち物（メガエナジーは購入した分だけ装備可能）</label>');
  return html;
 };

 // Capture the existing change pipeline, then manage Mega Energy ownership before it redraws.
 const V177_prevBindPageEvents=bindPageEvents;
 bindPageEvents=function(){
  V177_prevBindPageEvents();
  const main=$('#main');
  if(!main)return;
  const previousChange=main.onchange;
  main.onchange=function(e){
   const el=e.target;
   if(el?.id==='held-item'){
    const mon=state.owned.find(m=>m.uid===state.selectedOwned);
    if(!mon)return;
    const result=v177SetMegaHeldItem(mon,el.value,true);
    if(!result.ok){
     toast('そのメガエナジーは所持していません。ショップで購入してください。','warn');
     renderPage();
     return;
    }
    if(result.changed){
     toast(v177IsMegaEnergy(result.newId)?'メガエナジーを持ち物に装備しました。':(v177IsMegaEnergy(result.oldId)?'メガエナジーをバッグに戻しました。':'持ち物を変更しました。'),'good');
     renderPage();
     return;
    }
   }
   return previousChange?.call(this,e);
  };
 };

 // Shop: every Mega form has one purchasable, compatible held energy. No free starting stock.
 renderShop=function(){
  const q=searchKey(state.shopSearch||'');
  const list=MEGA_STONES.filter(x=>!q||searchKey(x.name).includes(q)||searchKey(x.id).includes(q)||searchKey(x.meta?.base||'').includes(q));
  const ownedCount=list.reduce((sum,item)=>sum+V177_NUM(state.items?.[item.id]),0);
  const cards=list.map(item=>{
   const stock=V177_NUM(state.items?.[item.id]);
   const form=v174MegaForm(item.meta);
   return `<section class="shop-card mega-stone-card"><div class="mega-shop-sprite">${speciesIcon(form,false,false)}<span class="pill">${item.meta.forme==='Mega-Z'?'MEGA Z':item.meta.forme==='Mega-X'?'MEGA X':item.meta.forme==='Mega-Y'?'MEGA Y':'MEGA'}</span></div><div><div class="section-kicker">MEGA ENERGY · ${item.meta.base.toUpperCase()}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small class="shop-stock">所持：${stock}個 ${form.megaImageAvailable?'· 専用画像確認済み':'· 画像未確認時は通常姿に切り替え'}</small></div><div class="shop-price">${item.price} VP</div><button class="btn ${stock?'btn-secondary':'btn-primary'} shop-buy" data-action="buy-item" data-item="${esc(item.id)}" ${state.vp<item.price?'disabled':''}>${state.vp<item.price?'VP不足':'購入する'}</button></section>`;
  }).join('');
  const careCards=CARE_ITEMS.map(it=>`<article class="care-mon-card"><div class="section-kicker">CARE ITEM</div><h3>${esc(it.name)}</h3><p class="small muted">${esc(it.desc)}</p><div class="care-mon-meta"><span class="pill">${it.price} VP</span><span class="pill">所持 ${capItem(it.id)}個</span></div><button class="btn btn-secondary btn-wide" data-action="buy-care-item" data-item="${esc(it.id)}" ${state.vp<it.price?'disabled':''}>購入する</button></article>`).join('');
  return `${pageHeader('ITEM SHOP / MEGA ENERGY','メガエナジーショップ','対応ポケモン専用のメガエナジーをVPで購入し、トレーニング画面の「持ち物」に装備します。','<button class="btn btn-ghost" data-page="training">トレーニングで装備</button>')}<div class="stats-strip">${statTile('VP BALANCE',Number(state.vp||0).toLocaleString(),'購入に使えるポイント')}${statTile('OWNED MEGA ENERGY',ownedCount.toLocaleString(),'バッグにあるメガエナジー')}${statTile('MEGA TYPES',MEGA_STONES.length.toLocaleString(),'購入できる専用エナジー')}</div><div class="search-row"><input id="shop-search" class="field search-field" placeholder="ポケモン名・メガエナジー名で検索" value="${esc(state.shopSearch||'')}"><span class="pill">${list.length}種類</span></div><div class="shop-grid">${cards}</div><section class="panel" style="margin-top:15px"><div class="panel-body"><h3 style="margin-top:0">購入からメガシンカまで</h3><p class="small muted" style="line-height:1.8">① 専用メガエナジーを購入 → ② トレーニングで対象ポケモンの持ち物に装備 → ③ バトル中に「✦ メガシンカ」ボタンを押す。エナジーは装備品なので、メガシンカしても消費しません。1回のバトルでメガシンカできるのは味方側1匹だけです。</p></div></section><section class="panel" style="margin-top:15px"><div class="panel-head"><h2>🌱 その他の育成アイテム</h2><span class="pill">${CARE_ITEMS.length}種類</span></div><div class="panel-body"><div class="care-list">${careCards}</div></div></section>`;
 };

 // The purchase transaction is kept, but rejects duplicate over-grants and never gives free stock.
 const V177_prevHandleAction=handleAction;
 handleAction=async function(action,el){
  if(action==='buy-item'){
   const item=MEGA_STONES.find(x=>x.id===el?.dataset?.item);
   if(!item){toast('メガエナジーのデータが見つかりません。','bad');return;}
   const price=Number(item.price||500);
   if(Number(state.vp||0)<price){toast('VPが足りません。','bad');return;}
   state.vp-=price;
   state.items=state.items||{};
   state.items[item.id]=V177_NUM(state.items[item.id])+1;
   saveLocal();
   toast(`${item.name}を購入しました。持ち物から装備できます。`,'good');
   renderPage();
   return;
  }
  if(action==='toggle-mega'){
   const b=state.battle;
   if(!b||b.result||b.turnBusy)return;
   const slot=Number(state.selectedActiveSlot||0);
   const teamIndex=b.playerActive?.[slot];
   const mon=b.playerTeam?.[teamIndex];
   if(!mon||mon.fainted||mon.hp<=0){toast('メガシンカできる場にポケモンがいません。','warn');return;}
   if(b.megaUsedBySide?.player||mon.megaUsed){toast('このバトルでは、すでにメガシンカを使用しています。','warn');return;}
   if(mon.terastallized){toast('テラスタル中はメガシンカできません。','warn');return;}
   const form=findMegaForm(mon);
   if(!form){toast('このポケモンに対応する専用メガエナジーを持ち物に装備してください。','warn');return;}
   const beforeName=mon.name;
   const oldTarget=document.getElementById(`mon-player-${slot}`);
   if(oldTarget)oldTarget.classList.add('mega-pending');
   await V177_WAIT(360);
   if(!megaEvolve(mon,'player')){renderPage();return;}
   b.megaUsedBySide=b.megaUsedBySide||{player:false,enemy:false};
   b.megaUsedBySide.player=true;
   b.megaPendingSlots=[];
   b.teraPendingSlots=(b.teraPendingSlots||[]).filter(x=>x!==slot);
   // Mega Evolution is activated by this button immediately; it does not require a second selection.
   renderPage();
   const newTarget=document.getElementById(`mon-player-${slot}`);
   const field=document.querySelector('.battlefield');
   if(newTarget)newTarget.classList.add('mega-active');
   if(field&&newTarget){
    const overlay=document.createElement('div');overlay.className='mega-energy-burst';
    const r=newTarget.getBoundingClientRect(),fr=field.getBoundingClientRect();
    overlay.style.left=`${r.left+r.width/2-fr.left}px`;overlay.style.top=`${r.top+r.height/2-fr.top}px`;
    for(let i=0;i<20;i++){const p=document.createElement('i');p.style.setProperty('--a',`${i*18}deg`);p.style.setProperty('--d',`${65+Math.random()*85}px`);p.style.setProperty('--delay',`${Math.random()*.14}s`);overlay.appendChild(p);}
    field.appendChild(overlay);
    await V177_WAIT(760);
    overlay.remove();
   }
   toast(`${beforeName}がメガシンカした！`,'good');
   renderPage();
   return;
  }
  const result=await V177_prevHandleAction(action,el);
  if(action==='import-save-confirm'){
   v177MigrateMegaInventory();
   renderPage();
  }
  return result;
 };

 // Redraw the button as an explicit immediate action and explain why it is unavailable.
 const V177_prevRenderBattlePage=renderBattlePage;
 renderBattlePage=function(){
  let html=V177_prevRenderBattlePage();
  const b=state.battle;
  if(!b||typeof html!=='string')return html;
  const slot=Number(state.selectedActiveSlot||0),mon=b.playerTeam?.[b.playerActive?.[slot]];
  const form=mon&&!mon.fainted?findMegaForm(mon):null;
  const blocked=!mon||mon.fainted||mon.hp<=0||b.result||b.turnBusy||mon.megaUsed||b.megaUsedBySide?.player||mon.terastallized||!form;
  const label=mon?.megaActive?'✓ メガシンカ済み':(mon?.terastallized?'テラスタル中':(form?`✦ メガシンカ（${esc(v177EnergyName(V174_MEGA_BY_ID[form.id]))}）`:'✦ 専用メガエナジーを装備'));
  const btn=`<button class="btn btn-primary mega-energy-action" data-action="toggle-mega" ${blocked?'disabled':''}>${label}</button>`;
  return html.replace(/<button\b(?=[^>]*data-action="toggle-mega")[^>]*>[\s\S]*?<\/button>/,btn);
 };

 // A Mega Energy is one physical held item: equipping it removes one from the bag; unequipping returns it.
 // This prevents one purchase from being copied onto an unlimited number of Pokémon.
 function v177AuditMegaEnergy(){
  const bag={};for(const item of MEGA_STONES)bag[item.id]=V177_NUM(state.items?.[item.id]);
  const equipped=(state.owned||[]).filter(mon=>v177IsMegaEnergy(mon.heldItem)).map(mon=>({pokemon:mon.name,energy:mon.heldItem,id:itemSlug(mon.heldItem)}));
  return {version:'17.7.0',megaEnergyTypes:MEGA_STONES.length,uniqueIds:new Set(MEGA_STONES.map(x=>x.id)).size,globalEnergyItemExists:CARE_ITEMS.some(x=>x.id==='megaenergy'),bagTotal:Object.values(bag).reduce((a,n)=>a+n,0),bag,equipped,initialStockEmpty:MEGA_STONES.every(x=>V177_NUM(state.items?.[x.id])===0)&&!equipped.length};
 }
 function v177RunMegaEnergyTests(){
  const checks=[];const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
  test('全メガエナジーIDが一意',()=>new Set(MEGA_STONES.map(x=>x.id)).size===MEGA_STONES.length);
  test('旧グローバルメガエナジーを育成アイテムから削除',()=>!CARE_ITEMS.some(x=>x.id==='megaenergy'));
  test('リザードンXエナジーから専用フォームを特定',()=>findMegaForm({speciesId:'charizard',heldItem:'charizarditex'})?.id==='charizardmegax');
  test('リザードンYエナジーから専用フォームを特定',()=>findMegaForm({speciesId:'charizard',heldItem:'charizarditey'})?.id==='charizardmegay');
  test('他種族用エナジーではメガできない',()=>!findMegaForm({speciesId:'blastoise',heldItem:'charizarditex'}));
  test('フォーム別メガエナジー名が登録済み',()=>MEGA_STONES.every(x=>/^メガエナジー：/.test(x.name)));
  const oldItems=state.items,oldHeld=state.owned?.[0]?.heldItem;
  test('エナジー装備でバッグ在庫が1減る',()=>{const mon={heldItem:''},item=MEGA_STONES[0];state.items={...(oldItems||{}),[item.id]:1};const r=v177SetMegaHeldItem(mon,item.id,false);const ok=r.ok&&state.items[item.id]===0&&mon.heldItem===item.id;state.items=oldItems;return ok;});
  test('エナジーを外すとバッグに戻る',()=>{const mon={heldItem:''},item=MEGA_STONES[0];state.items={...(oldItems||{}),[item.id]:1};const r1=v177SetMegaHeldItem(mon,item.id,false);const r2=v177SetMegaHeldItem(mon,'',false);const ok=r1.ok&&r2.ok&&state.items[item.id]===1&&mon.heldItem==='';state.items=oldItems;return ok;});
  test('未購入エナジーを装備できない',()=>{const mon={heldItem:''},item=MEGA_STONES[0];state.items={...(oldItems||{}),[item.id]:0};const r=v177SetMegaHeldItem(mon,item.id,false);const ok=!r.ok&&mon.heldItem==='';state.items=oldItems;return ok;});
  const oldOwned=state.owned;test('初回移行で旧メガ在庫と重複装備をリセット',()=>{state.items={charizarditex:99,megaenergy:20};state.owned=[{heldItem:'charizarditex'}];const changed=v177MigrateMegaInventory();const ok=changed&&!state.items.charizarditex&&!state.items.megaenergy&&!state.owned[0].heldItem&&state.items.__megaEnergyInventoryVersion===V177_VERSION;state.items=oldItems;state.owned=oldOwned;return ok;});
  test('装備中の専用エナジーだけで実際にメガ進化できる',()=>{const oldBattle=state.battle,oldItems2=state.items;const mon={uid:'v177-test',speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditex',level:50,hp:100,maxhp:100,stats:{hp:100},ivs:{},evs:{},nature:'まじめ',name:'リザードン',moves:[]};state.battle={log:[]};state.items={...(oldItems2||{}),megaenergy:0};const ok=megaEvolve(mon,'player')&&mon.speciesId==='charizardmegax'&&mon.megaActive&&mon.megaUsed&&!state.items.megaenergy;state.battle=oldBattle;state.items=oldItems2;return ok;});
  return {passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
 }
 if(window.PokemonChampions2DData)Object.assign(window.PokemonChampions2DData,{version:'17.7.0',auditMegaEnergy:v177AuditMegaEnergy,testMegaEnergy:v177RunMegaEnergyTests,migrateMegaInventory:v177MigrateMegaInventory,megaEnergyCount:MEGA_STONES.length});
 // Apply migration immediately when the user starts from the boot screen; initializeSave is wrapped as well.
 if(state?.items&&Number(state.items.__megaEnergyInventoryVersion||0)>=V177_VERSION){/* already migrated */}
})();
