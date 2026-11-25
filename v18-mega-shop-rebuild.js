/* v18.0: rebuild the Mega Stone shop catalog and purchase transaction. */
(()=>{
 'use strict';
 const rows=Array.isArray(V174_MEGA_FORM_DATA)?V174_MEGA_FORM_DATA:[];
 if(rows.length){
  const catalog=rows.map(meta=>{
   const base=v174FindBaseSpecies(meta);
   const jp=base?getPokeName(base):meta.base;
   const suffix=meta.forme==='Mega-X'?'X':meta.forme==='Mega-Y'?'Y':meta.forme==='Mega-Z'?'Z':'';
   return {id:itemSlug(meta.stoneId),name:`${jp}ナイト${suffix}`,price:suffix==='Z'?800:500,
    description:`${jp}に持たせると、バトル中に対応するメガ${jp}へメガシンカできます。`,meta,kind:'mega-stone'};
  });
  MEGA_STONES.splice(0,MEGA_STONES.length,...catalog);
 }
 const V180_num=v=>Math.max(0,Math.floor(Number(v)||0));
 const V180_prevHandle=handleAction;
 const V180_prevRender=renderShop;
 renderShop=function(){
  const q=searchKey(state.shopSearch||'');
  const list=MEGA_STONES.filter(x=>!q||searchKey(x.name).includes(q)||searchKey(x.id).includes(q)||searchKey(x.meta?.base||'').includes(q));
  const owned=list.reduce((n,x)=>n+V180_num(state.items?.[x.id]),0);
  const cards=list.map(item=>{
   const stock=V180_num(state.items?.[item.id]);
   const form=v174MegaForm(item.meta);
   const price=V180_num(item.price)||500;
   const enough=V180_num(state.vp)>=price;
   return `<section class="shop-card mega-stone-card"><div class="mega-shop-sprite">${speciesIcon(form,false,false)}<span class="pill">${item.meta.forme==='Mega-X'?'MEGA X':item.meta.forme==='Mega-Y'?'MEGA Y':item.meta.forme==='Mega-Z'?'MEGA Z':'MEGA'}</span></div><div><div class="section-kicker">MEGA STONE · ${esc(item.meta.base.toUpperCase())}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small class="shop-stock">所持数：${stock}個</small></div><div class="shop-price">${price} VP</div><button type="button" class="btn ${stock?'btn-secondary':'btn-primary'} shop-buy" data-action="buy-item" data-item="${esc(item.id)}" ${enough?'':'disabled'}>${enough?'購入する':'VP不足'}</button></section>`;
  }).join('');
  return `${pageHeader('MEGA STONE SHOP','メガストーンショップ','ポケモンごとのメガストーンを購入できます。購入後、トレーニング画面で対応するポケモンに持たせてください。','<button class="btn btn-ghost" data-page="training">持ち物を装備</button>')}<div class="stats-strip">${statTile('VP',V180_num(state.vp).toLocaleString(),'所持ポイント')}${statTile('所持数',owned,'表示中のストーン')}${statTile('全種類',MEGA_STONES.length,'購入可能なフォーム')}</div><div class="search-row"><input id="shop-search" class="field search-field" placeholder="ポケモン名・ナイト名で検索" value="${esc(state.shopSearch||'')}"><button type="button" class="btn btn-ghost" data-action="clear-mega-shop-search">検索解除</button><span class="pill">${list.length}種類</span></div><div class="shop-grid mega-shop-grid">${cards||'<p class="empty-state">該当するメガストーンがありません。検索を解除してください。</p>'}</div><section class="panel" style="margin-top:15px"><div class="panel-body"><h3>使い方</h3><p class="small muted">① 対応するナイトを購入 → ② トレーニングで対象ポケモンに装備 → ③ バトル中にメガシンカ。購入したナイトは装備しても消費されません。</p></div></section>`;
 };
 handleAction=async function(action,el){
  if(action==='clear-mega-shop-search'){state.shopSearch='';renderPage();return;}
  if(action==='buy-item'){
   const id=itemSlug(el?.dataset?.item||'');
   const item=MEGA_STONES.find(x=>itemSlug(x.id)===id);
   if(!item){toast('このメガストーンのデータが見つかりません。','bad');return;}
   const price=V180_num(item.price)||500;
   if(V180_num(state.vp)<price){toast(`VPが足りません（必要：${price} VP）。`,'warn');return;}
   state.vp=V180_num(state.vp)-price;
   state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
   state.items[item.id]=V180_num(state.items[item.id])+1;
   saveLocal();
   toast(`${item.name}を購入しました！`,'good');
   renderPage();
   return;
  }
  return V180_prevHandle(action,el);
 };
 // Do not leave a previous Garchomp-only search active when entering the shop.
 document.addEventListener('click',e=>{
  const p=e.target.closest('[data-page="shop"]');
  if(p)state.shopSearch='';
 },true);
 window.PokemonChampions2DData=window.PokemonChampions2DData||{};
 window.PokemonChampions2DData.auditMegaShop=()=>({catalogCount:MEGA_STONES.length,uniqueIds:new Set(MEGA_STONES.map(x=>itemSlug(x.id))).size,hasGarchomp:MEGA_STONES.some(x=>x.id==='garchompite'),hasCharizardX:MEGA_STONES.some(x=>x.id==='charizarditex'),hasVenusaur:MEGA_STONES.some(x=>x.id==='venusaurite'),search:state.shopSearch||'',vp:V180_num(state.vp),items:MEGA_STONES.reduce((n,x)=>n+V180_num(state.items?.[x.id]),0)});
})();
