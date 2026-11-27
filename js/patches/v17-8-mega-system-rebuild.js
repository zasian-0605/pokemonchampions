/* v17.8: rebuild Mega Evolution around one authoritative, transactional held-energy flow. */
(function(){
 'use strict';
 const V178_VERSION=2;
 const V178_IDS=new Set((MEGA_STONES||[]).map(x=>itemSlug(x.id)));
 const V178_num=v=>Math.max(0,Math.floor(Number(v)||0));
 const V178_isEnergy=v=>V178_IDS.has(itemSlug(v||'')) && !!V174_MEGA_BY_STONE[itemSlug(v||'')];
 const V178_meta=v=>V174_MEGA_BY_STONE[itemSlug(v||'')]||null;
 const V178_prevInitialize=initializeSave;
 const V178_prevRenderTraining=renderTraining;
 const V178_prevRenderBattle=renderBattlePage;
 const V178_prevHandle=handleAction;

 function V178_resetLegacyInventory(force=false){
  state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
  const ver=V178_num(state.items.__megaEnergyInventoryVersion);
  if(!force&&ver>=V178_VERSION)return false;
  // v18.2: never erase player inventory or equipped items during upgrade/import.
  state.items.__megaEnergyInventoryVersion=V178_VERSION;
  saveLocal();
  return true;
 }
 initializeSave=function(){
  const r=V178_prevInitialize.apply(this,arguments);
  V178_resetLegacyInventory(false);
  return r;
 };

 function V178_speciesIdentity(mon){
  const id=String(mon?._preMegaSpeciesId||mon?.baseSpeciesId||mon?.speciesId||'');
  const base=state.data?.dexById?.[id]||state.data?.dex?.find(p=>p.id===id)||monSpecies(mon);
  return slug(base?.baseSpecies||base?.id||base?.name||id);
 }
 findMegaForm=function(mon){
  if(!mon)return null;
  const meta=V178_meta(mon.heldItem);
  if(!meta)return null;
  const identity=V178_speciesIdentity(mon);
  if(identity!==slug(meta.base))return null;
  return v174MegaForm(meta);
 };

 function V178_setHeld(mon,newValue,save=true){
  if(!mon)return {ok:false,reason:'no-pokemon'};
  const oldId=itemSlug(mon.heldItem||''),newId=itemSlug(newValue||'');
  if(oldId===newId)return {ok:true,changed:false};
  state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
  if(V178_isEnergy(newId)&&V178_num(state.items[newId])<1)return {ok:false,reason:'not-owned'};
  if(V178_isEnergy(newId))state.items[newId]=V178_num(state.items[newId])-1;
  if(V178_isEnergy(oldId))state.items[oldId]=V178_num(state.items[oldId])+1;
  mon.heldItem=newValue||'';
  if(save)saveLocal();
  return {ok:true,changed:true,oldId,newId};
 }

 megaEvolve=function(mon,side='player'){
  const b=state.battle;
  if(!mon||mon.fainted||Number(mon.hp)<=0||mon.megaUsed)return false;
  if(mon.terastallized){if(side==='player')toast('テラスタル中はメガシンカできません。','warn');return false;}
  if(side==='player'&&b?.megaUsedBySide?.player){toast('このバトルでは、すでにメガシンカを使用しています。','warn');return false;}
  const meta=V178_meta(mon.heldItem);
  const mega=findMegaForm(mon);
  if(!meta||!mega){if(side==='player')toast('対応する専用メガエナジーを購入して持ち物に装備してください。','warn');return false;}
  const oldSpeciesId=mon._preMegaSpeciesId||mon.baseSpeciesId||mon.speciesId;
  const oldMax=Math.max(1,Number(mon.maxhp)||1);
  const oldHp=Math.max(1,Number(mon.hp)||1);
  const hpRatio=Math.min(1,oldHp/oldMax);
  mon._preMegaSpeciesId=oldSpeciesId;
  mon.baseSpeciesId=oldSpeciesId;
  mon.speciesId=mega.id;
  mon.formId=mega.id;
  mon.megaFormId=mega.id;
  mon.name=getPokeName(mega);
  mon.types=[...(mega.types||[])];
  mon.abilityId=Object.values(mega.abilities||{})[0]||mon.abilityId;
  mon.stats=calcStats(mon);
  mon.maxhp=Math.max(1,Number(mon.stats?.hp)||oldMax);
  mon.hp=Math.max(1,Math.min(mon.maxhp,Math.round(mon.maxhp*hpRatio)));
  mon.megaUsed=true;
  mon.megaActive=true;
  if(side==='player'&&b){b.megaUsedBySide=b.megaUsedBySide||{player:false,enemy:false};b.megaUsedBySide.player=true;}
  battleLog(`${mon.name}にメガシンカした！`);
  if(side==='player')saveLocal();
  return true;
 };

 renderTraining=function(){
  let html=V178_prevRenderTraining();
  const mon=(state.owned||[]).find(m=>m.uid===state.selectedOwned)||(state.owned||[])[0];
  if(!mon)return html;
  const identity=V178_speciesIdentity(mon),current=itemSlug(mon.heldItem||'');
  const options=(MEGA_STONES||[]).filter(it=>{
   const meta=it.meta||V174_MEGA_BY_STONE[it.id];
   return meta&&slug(meta.base)===identity&&(V178_num(state.items?.[it.id])>0||current===itemSlug(it.id));
  }).map(it=>`<option value="${esc(it.id)}" ${current===itemSlug(it.id)?'selected':''}>${esc(it.name)}（バッグ ${V178_num(state.items?.[it.id])}個）</option>`).join('');
  const select=html.match(/(<select id="held-item"[^>]*>)([\s\S]*?)(<\/select>)/);
  if(select){
   const clean=select[2].replace(/<option\b[^>]*value="([^"]+)"[^>]*>[\s\S]*?<\/option>/g,(m,id)=>V178_isEnergy(id)?'':m);
   html=html.replace(select[0],select[1]+clean+options+select[3]);
  }
  html=html.replace('for="held-item">持ち物','for="held-item">持ち物（購入した専用メガエナジーのみ表示）');
  return html;
 };

 // Capture select changes before the legacy training handler runs. This is the only inventory transaction path.
 document.addEventListener('change',function(e){
  const el=e.target;
  if(!el||el.id!=='held-item')return;
  const mon=(state.owned||[]).find(m=>m.uid===state.selectedOwned);
  if(!mon)return;
  const result=V178_setHeld(mon,el.value,true);
  if(!result.ok){e.stopImmediatePropagation();toast('その専用メガエナジーは未購入です。ショップで購入してください。','warn');renderPage();}
  else if(result.changed){toast(V178_isEnergy(result.newId)?'専用メガエナジーを装備しました。':(V178_isEnergy(result.oldId)?'専用メガエナジーをバッグに戻しました。':'持ち物を変更しました。'),'good');}
 },true);

 renderShop=function(){
  const q=searchKey(state.shopSearch||'');
  const list=MEGA_STONES.filter(x=>!q||searchKey(x.name).includes(q)||searchKey(x.id).includes(q)||searchKey(x.meta?.base||'').includes(q));
  const total=list.reduce((n,x)=>n+V178_num(state.items?.[x.id]),0);
  const cards=list.map(item=>{
   const stock=V178_num(state.items?.[item.id]);
   const form=v174MegaForm(item.meta);
   return `<section class="shop-card mega-stone-card"><div class="mega-shop-sprite">${speciesIcon(form,false,false)}<span class="pill">${item.meta.forme==='Mega-X'?'MEGA X':item.meta.forme==='Mega-Y'?'MEGA Y':item.meta.forme==='Mega-Z'?'MEGA Z':'MEGA'}</span></div><div><div class="section-kicker">MEGA ENERGY · ${item.meta.base.toUpperCase()}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small class="shop-stock">バッグ所持：${stock}個</small></div><div class="shop-price">${item.price} VP</div><button class="btn ${stock?'btn-secondary':'btn-primary'} shop-buy" data-action="buy-item" data-item="${esc(item.id)}" ${Number(state.vp||0)<Number(item.price||500)?'disabled':''}>${Number(state.vp||0)<Number(item.price||500)?'VP不足':'購入する'}</button></section>`;
  }).join('');
  return `${pageHeader('MEGA ENERGY SHOP','メガエナジーショップ','ポケモンごとの専用メガエナジーをVPで購入します。購入後、トレーニング画面で対応するポケモンに装備してください。','<button class="btn btn-ghost" data-page="training">持ち物を装備</button>')}<div class="stats-strip">${statTile('VP',Number(state.vp||0).toLocaleString(),'所持ポイント')}${statTile('バッグ所持数',total,'購入済み・未装備の専用エナジー')}${statTile('対応フォーム',MEGA_STONES.length,'購入可能な専用エナジー')}</div><div class="search-row"><input id="shop-search" class="field search-field" placeholder="ポケモン名・エナジー名で検索" value="${esc(state.shopSearch||'')}"><span class="pill">${list.length}種類</span></div><div class="shop-grid mega-shop-grid">${cards||'<p class="empty-state">該当するエナジーがありません。</p>'}</div>`;
 };

 handleAction=async function(action,el){
  if(action==='buy-item'){
   const item=MEGA_STONES.find(x=>itemSlug(x.id)===itemSlug(el?.dataset?.item));
   if(!item){toast('専用メガエナジーが見つかりません。','bad');return;}
   const price=Number(item.price||500);
   if(V178_num(state.vp)<price){toast('VPが足りません。','bad');return;}
   state.vp=V178_num(state.vp)-price;
   state.items=state.items||{};
   state.items[item.id]=V178_num(state.items[item.id])+1;
   saveLocal();toast(`${item.name}を購入しました。トレーニングで装備できます。`,'good');renderPage();return;
  }
  if(action==='toggle-mega'){
   const b=state.battle;
   if(!b||b.result||b.turnBusy)return;
   const slot=Math.max(0,Number(state.selectedActiveSlot||0));
   const index=b.playerActive?.[slot];
   const mon=b.playerTeam?.[index];
   if(!mon||mon.fainted||mon.hp<=0){toast('場にいるポケモンを選択してください。','warn');return;}
   if(!findMegaForm(mon)){toast('このポケモン専用のメガエナジーを購入して持ち物に装備してください。','warn');return;}
   if(b.megaUsedBySide?.player||mon.megaUsed){toast('このバトルではメガシンカを使用済みです。','warn');return;}
   if(mon.terastallized){toast('テラスタル中はメガシンカできません。','warn');return;}
   const oldName=mon.name;
   if(!megaEvolve(mon,'player'))return;
   b.megaUsedBySide=b.megaUsedBySide||{player:false,enemy:false};b.megaUsedBySide.player=true;
   b.megaPendingSlots=[];
   saveLocal();renderPage();
   const node=document.getElementById(`mon-player-${slot}`),field=document.querySelector('.battlefield');
   if(node)node.classList.add('mega-active');
   if(field&&node){
    const overlay=document.createElement('div');overlay.className='mega-energy-burst';
    const r=node.getBoundingClientRect(),fr=field.getBoundingClientRect();overlay.style.left=`${r.left+r.width/2-fr.left}px`;overlay.style.top=`${r.top+r.height/2-fr.top}px`;
    for(let i=0;i<24;i++){const p=document.createElement('i');p.style.setProperty('--a',`${i*15}deg`);p.style.setProperty('--d',`${60+Math.random()*100}px`);p.style.setProperty('--delay',`${Math.random()*.12}s`);overlay.appendChild(p);}field.appendChild(overlay);setTimeout(()=>overlay.remove(),850);
   }
   toast(`${oldName}がメガシンカした！`,'good');return;
  }
  if(action==='save-training'){
   const mon=(state.owned||[]).find(m=>m.uid===el?.dataset?.uid);
   const value=$('#held-item')?.value||'';
   if(mon){const result=V178_setHeld(mon,value,true);if(!result.ok){toast('未購入のメガエナジーは装備できません。','warn');renderPage();return;}}
  }
  const result=await V178_prevHandle(action,el);
  if(action==='import-save-confirm')V178_resetLegacyInventory(true);
  return result;
 };

 renderBattlePage=function(){
  let html=V178_prevRenderBattle();const b=state.battle;
  if(!b||typeof html!=='string')return html;
  const slot=Math.max(0,Number(state.selectedActiveSlot||0));
  const mon=b.playerTeam?.[b.playerActive?.[slot]];
  const form=mon&&!mon.fainted?findMegaForm(mon):null;
  const reason=!mon||mon.fainted||mon.hp<=0?'場にポケモンがいません':b.result?'対戦終了':b.turnBusy?'行動処理中':b.megaUsedBySide?.player||mon?.megaUsed?'このバトルでは使用済み':mon?.terastallized?'テラスタル中':!form?'専用メガエナジー未装備':'';
  const heldMegaItem=MEGA_STONES.find(it=>itemSlug(it.id)===itemSlug(mon?.heldItem||''));
  const label=mon?.megaActive?'✓ メガシンカ済み':form?`✦ メガシンカ（${esc(heldMegaItem?.name||'専用メガストーン')}）`:'✦ メガシンカ';
  const button=`<button type="button" class="btn btn-primary mega-energy-action" data-action="toggle-mega" ${reason?'disabled title="'+esc(reason)+'"':''}>${label}</button>`;
  if(/<button\b(?=[^>]*data-action="toggle-mega")[^>]*>[\s\S]*?<\/button>/.test(html))html=html.replace(/<button\b(?=[^>]*data-action="toggle-mega")[^>]*>[\s\S]*?<\/button>/,button);
  else html=html.replace('<div class="battle-moves">',`<div class="mega-energy-direct-action">${button}</div><div class="battle-moves">`);
  return html;
 };

 function V178_audit(){
  const ids=MEGA_STONES.map(x=>itemSlug(x.id));
  const equipped=(state.owned||[]).filter(m=>V178_isEnergy(m.heldItem)).map(m=>({name:m.name,item:m.heldItem,compatible:!!findMegaForm(m)}));
  return {version:'17.8.0',formCount:V174_MEGA_FORM_DATA.length,stoneCount:MEGA_STONES.length,uniqueEnergyIds:new Set(ids).size,missingFormMappings:MEGA_STONES.filter(x=>!V174_MEGA_BY_STONE[itemSlug(x.id)]).map(x=>x.id),bagStock:MEGA_STONES.reduce((n,x)=>n+V178_num(state.items?.[x.id]),0),equipped,globalEnergyStock:V178_num(state.items?.megaenergy),migrationVersion:V178_num(state.items?.__megaEnergyInventoryVersion)};
 }
 function V178_tests(){
  const checks=[];const t=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
  t('90フォームとエナジーIDが一対一',()=>MEGA_STONES.length===V174_MEGA_FORM_DATA.length&&new Set(MEGA_STONES.map(x=>itemSlug(x.id))).size===MEGA_STONES.length&&MEGA_STONES.every(x=>V174_MEGA_BY_STONE[itemSlug(x.id)]));
  t('リザードンX/Yを別フォームとして識別',()=>findMegaForm({speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditex'})?.id==='charizardmegax'&&findMegaForm({speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditey'})?.id==='charizardmegay');
  t('別種族のエナジーを拒否',()=>!findMegaForm({speciesId:'blastoise',baseSpeciesId:'blastoise',heldItem:'charizarditex'}));
  const oldItems=state.items,oldOwned=state.owned,oldBattle=state.battle;
  t('購入品を1個だけ装備してバッグから減算',()=>{const id=MEGA_STONES[0].id,m={speciesId:MEGA_STONES[0].meta.base.toLowerCase(),baseSpeciesId:MEGA_STONES[0].meta.base.toLowerCase(),heldItem:''};state.items={[id]:1};const r=V178_setHeld(m,id,false);const ok=r.ok&&m.heldItem===id&&state.items[id]===0;state.items=oldItems;return ok;});
  t('未購入エナジーを装備できない',()=>{const id=MEGA_STONES[0].id,m={heldItem:''};state.items={[id]:0};const r=V178_setHeld(m,id,false);const ok=!r.ok&&!m.heldItem;state.items=oldItems;return ok;});
  t('装備解除でバッグに1個返却',()=>{const id=MEGA_STONES[0].id,m={heldItem:id};state.items={};const r=V178_setHeld(m,'',false);const ok=r.ok&&m.heldItem===''&&state.items[id]===1;state.items=oldItems;return ok;});
  t('メガ進化後も専用エナジーを保持',()=>{const meta=V174_MEGA_BY_STONE['charizarditex'];const m={uid:'v178-test',speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditex',level:50,hp:100,maxhp:100,stats:{hp:150},ivs:{},evs:{},nature:'まじめ',moves:[]};state.battle={log:[],megaUsedBySide:{player:false}};const ok=megaEvolve(m,'enemy')&&m.speciesId==='charizardmegax'&&m.heldItem==='charizarditex'&&m.megaActive;state.battle=oldBattle;return ok;});
  t('1バトル1回の制限',()=>{const m={speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditex',megaUsed:false,terastallized:false,hp:1,maxhp:1};state.battle={log:[],megaUsedBySide:{player:true}};const ok=!megaEvolve(m,'player');state.battle=oldBattle;return ok;});
  t('安全な移行で既存在庫・装備・VPを維持',()=>{const saveItems=state.items,saveOwned=state.owned,saveVp=state.vp;state.items={charizarditex:99,megaenergy:20,potion:3,__megaEnergyInventoryVersion:1};state.owned=[{heldItem:'charizarditex'}];state.vp=1234;V178_resetLegacyInventory(true);const ok=state.items.charizarditex===99&&state.items.megaenergy===20&&state.items.potion===3&&state.items.__megaEnergyInventoryVersion===V178_VERSION&&state.owned[0].heldItem==='charizarditex'&&state.vp===1234;state.items=saveItems;state.owned=saveOwned;state.vp=saveVp;return ok;});
  t('装備中のポケモンにはバトル画面のメガボタンを表示',()=>{const saveBattle=state.battle,saveOwned=state.owned,saveSlot=state.selectedActiveSlot;const m={uid:'v178-ui',speciesId:'charizard',baseSpeciesId:'charizard',heldItem:'charizarditex',hp:100,maxhp:100};state.owned=[m];state.battle={result:null,turnBusy:false,playerTeam:[m],playerActive:[0],megaUsedBySide:{player:false}};state.selectedActiveSlot=0;const html=renderBattlePage();const ok=html.includes('data-action=\"toggle-mega\"')&&html.includes('メガシンカ（');state.battle=saveBattle;state.owned=saveOwned;state.selectedActiveSlot=saveSlot;return ok;});
  state.items=oldItems;state.owned=oldOwned;state.battle=oldBattle;
  return {passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
 }
 Object.assign(window.PokemonChampions2DData||{}, {version:'17.8.0',auditMegaEnergy:V178_audit,testMegaEnergy:V178_tests,migrateMegaInventory:()=>V178_resetLegacyInventory(true)});
})();
