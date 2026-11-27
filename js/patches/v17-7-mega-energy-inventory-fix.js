/* v17.7 compatibility: remove the obsolete global Mega Energy consumable.
 * Species-specific Mega Stones and their inventory transactions are owned by v17.8.
 */
(()=>{
 'use strict';
 const index=Array.isArray(CARE_ITEMS)?CARE_ITEMS.findIndex(item=>item?.id==='megaenergy'):-1;
 if(index>=0)CARE_ITEMS.splice(index,1);
})();
