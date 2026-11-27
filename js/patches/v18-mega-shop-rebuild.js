/* v18.0 compatibility: add search reset to the authoritative v17.8 Mega Stone shop.
 * Catalog construction, rendering, and purchases are intentionally not reimplemented here.
 */
(()=>{
 'use strict';
 const previousRenderShop=renderShop;
 renderShop=function(){
  const html=String(previousRenderShop.apply(this,arguments)||'');
  const clearButton='<button type="button" class="btn btn-ghost" data-action="clear-mega-shop-search">検索解除</button>';
  return html.replace(/(<div class="search-row">[\\s\\S]*?)(<\\/div>)(\\s*<div class="shop-grid)/, '$1'+clearButton+'$2$3');
 };
 const previousHandleAction=handleAction;
 handleAction=async function(action,el){
  if(action==='clear-mega-shop-search'){
   state.shopSearch='';
   renderPage();
   return;
  }
  return previousHandleAction.apply(this,arguments);
 };
 // Entering the shop starts with an unfiltered catalog.
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('[data-page="shop"]'))state.shopSearch='';
 },true);
 window.PokemonChampions2DData=window.PokemonChampions2DData||{};
 window.PokemonChampions2DData.auditMegaShop=()=>({
  catalogCount:MEGA_STONES.length,
  uniqueIds:new Set(MEGA_STONES.map(x=>itemSlug(x.id))).size,
  hasGarchomp:MEGA_STONES.some(x=>x.id==='garchompite'),
  hasCharizardX:MEGA_STONES.some(x=>x.id==='charizarditex'),
  hasVenusaur:MEGA_STONES.some(x=>x.id==='venusaurite'),
  search:state.shopSearch||'',
  vp:Math.max(0,Math.floor(Number(state.vp)||0)),
  items:MEGA_STONES.reduce((n,x)=>n+Math.max(0,Math.floor(Number(state.items?.[x.id])||0)),0)
 });
})();
