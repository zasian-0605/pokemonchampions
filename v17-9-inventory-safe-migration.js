/* v17.9 compatibility: keep legitimate saved inventory; only mark the migration version. */
(()=>{
 'use strict';
 const START_INV_VERSION=1;
 const prevInitialize=initializeSave;
 initializeSave=function(){
  const result=prevInitialize.apply(this,arguments);
  state.items=state.items&&typeof state.items==='object'&&!Array.isArray(state.items)?state.items:{};
  if(Number(state.items.__startingInventoryVersion||0)<START_INV_VERSION){
   state.items.__startingInventoryVersion=START_INV_VERSION;
   saveLocal();
  }
  if(!state.dexResearch||typeof state.dexResearch!=='object'||Array.isArray(state.dexResearch))state.dexResearch={};
  return result;
 };
})();
