/* v18.0 compatibility: diagnostics for the Mega Stone shop.
 * Rendering, search, purchases, and inventory transactions are owned by v17.8.
 */
(()=>{
 'use strict';
 const num=value=>Math.max(0,Math.floor(Number(value)||0));
 window.PokemonChampions2DData=window.PokemonChampions2DData||{};
 window.PokemonChampions2DData.auditMegaShop=()=>({
  catalogCount:MEGA_STONES.length,
  uniqueIds:new Set(MEGA_STONES.map(x=>itemSlug(x.id))).size,
  hasGarchomp:MEGA_STONES.some(x=>x.id==='garchompite'),
  hasCharizardX:MEGA_STONES.some(x=>x.id==='charizarditex'),
  hasVenusaur:MEGA_STONES.some(x=>x.id==='venusaurite'),
  search:state.shopSearch||'',
  vp:num(state.vp),
  items:MEGA_STONES.reduce((total,item)=>total+num(state.items?.[item.id]),0),
  renderOwner:'v17.8',
  purchaseOwner:'v17.8'
 });
})();
