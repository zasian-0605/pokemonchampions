/* v39: timed team preview, forced replacement choice, and trainer-free Pokeball switch cinematics. */
(() => {
  "use strict";
  const W=window;
  const APP=()=>W.PokemonChampions2D;
  const S=()=>APP()?.state;
  const doc=W.document||document;
  const reduceMotion=()=>!!W.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const pause=ms=>new Promise(resolve=>W.setTimeout(resolve,reduceMotion()?Math.min(35,ms):ms));
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const originalStart=W.startBattle;
  const originalTrigger=W.triggerEntryEffects;
  const originalIntro=W.beginBattleIntro;
  const originalRender=W.renderBattlePage;
  const originalProcessEndTurn=W.processEndTurn;
  const originalHandleAction=W.handleAction;
  let suppressStartEntry=false;

  function sprite(mon,back){
    return APP()?.speciesIcon?.(mon,!!back,true)||'<span class="v39-no-sprite">?</span>';
  }
  function activeLiving(team,active){
    return (active||[]).map(index=>team?.[index]).filter(mon=>mon&&!mon.fainted&&Number(mon.hp)>0);
  }
  function rosterCard(mon,index,side,position,controls){
    const pct=mon?.maxhp>0?Math.max(0,Math.min(100,Number(mon.hp||0)/Number(mon.maxhp)*100)):100;
    const hp=mon?Math.max(0,Number(mon.hp||0))+"/"+Math.max(1,Number(mon.maxhp||1)):"";
    const label=mon?.name||"ポケモン";
    return '<article class="v39-roster-card '+side+'"><span class="v39-roster-order">'+(position+1)+'</span><div class="v39-roster-art">'+sprite(mon,side==="player")+'</div><b>'+esc(label)+'</b><small>Lv.'+esc(mon?.level||50)+' · HP '+hp+'</small>'+controls+'</article>';
  }
  function teamPreviewHTML(b){
    const order=b._v39PreviewOrder||b.playerTeam.map((_,i)=>i);
    const remain=Math.max(0,Math.ceil((Number(b._v39PreviewEndsAt||Date.now())-Date.now())/1000));
    const clock=String(Math.floor(remain/60)).padStart(2,"0")+":"+String(remain%60).padStart(2,"0");
    const own=b.playerTeam.map((mon,position)=>{
      const index=order[position];
      const controls='<div class="v39-order-controls"><button data-action="v39-preview-up" data-index="'+position+'" '+(position===0?"disabled":"")+' aria-label="上へ">↑</button><button data-action="v39-preview-down" data-index="'+position+'" '+(position===order.length-1?"disabled":"")+' aria-label="下へ">↓</button></div>';
      return rosterCard(b.playerTeam[index],index,"player",position,controls);
    }).join("");
    const foes=b.enemyTeam.map((mon,index)=>rosterCard(mon,index,"enemy",index,'<span class="v39-ready-chip">CPU READY</span>')).join("");
    return '<section class="battle-shell v39-preview-shell"><section class="v39-preview-screen"><header><small>POKÉMON CHAMPIONS · TEAM PREVIEW</small><h1>対戦前の見せ合い</h1><p>お互いの6体を確認して、自分の先発と控えの順番を決めよう。</p></header><div class="v39-preview-clock"><span>対戦開始まで</span><strong>'+clock+'</strong><small>CPU：準備OK</small></div><div class="v39-preview-columns"><section class="v39-preview-panel"><div class="v39-preview-heading"><h2>YOUR TEAM</h2><b>'+b.playerTeam.length+'体</b></div><p>↑ ↓ で順番を変更。いちばん上が先発。</p><div class="v39-roster-grid">'+own+'</div><button class="v39-ready-button" data-action="v39-preview-ready">準備OK！ 対戦開始</button></section><section class="v39-preview-panel"><div class="v39-preview-heading"><h2>OPPONENT TEAM</h2><b>'+b.enemyTeam.length+'体</b></div><p>CPUは準備OK。相手の技・持ち物は非公開。</p><div class="v39-roster-grid">'+foes+'</div><div class="v39-cpu-ready">✓ CPU 準備OK</div></section></div><p class="v39-preview-foot">120秒で自動確定。準備OKを押すと、その時点の順番で対戦が始まります。</p></section></section>';
  }
  function forcedSwitchHTML(b){
    const slots=Array.isArray(b._v39ForcedSwitchSlots)?b._v39ForcedSwitchSlots:[];
    if(!slots.length||b.result)return "";
    const slot=slots[0];
    const choices=b.playerTeam.map((mon,index)=>{
      const disabled=!mon||mon.fainted||Number(mon.hp)<=0||(b.playerActive||[]).includes(index);
      const pct=mon?.maxhp>0?Math.max(0,Math.min(100,Number(mon.hp||0)/Number(mon.maxhp)*100)):0;
      const label=mon?.name||"ポケモン";
      return '<button class="v39-forced-card" data-action="v39-forced-switch" data-index="'+index+'" '+(disabled?"disabled":"")+'><span class="v39-forced-art">'+sprite(mon,true)+'</span><b>'+esc(label)+'</b><small>Lv.'+esc(mon?.level||50)+' · HP '+Math.max(0,Number(mon?.hp||0))+'/'+Math.max(1,Number(mon?.maxhp||1))+'</small><i><em style="width:'+pct+'%"></em></i><strong>'+(disabled?(mon?.fainted||Number(mon?.hp)<=0?"ひんし":"場に出ている"):"このポケモンに交代")+'</strong></button>';
    }).join("");
    return '<div class="v39-forced-backdrop" role="dialog" aria-modal="true"><section class="v39-forced-dialog"><small>FORCED SWITCH · '+(slots.length)+'匹の交代待ち</small><h2>次のポケモンを選んで！</h2><p>味方'+(slot+1)+'番目のポケモンが戦闘不能になったよ。出したいポケモンを選択してね。</p><div class="v39-forced-grid">'+choices+'</div></section></div>';
  }
  function repaintBattle(){
    const main=doc.getElementById("main");
    if(main&&S()?.page==="battle")main.innerHTML=W.renderBattlePage();
  }
  function stopPreviewTimer(b){
    if(b?._v39PreviewTimer){W.clearInterval(b._v39PreviewTimer);b._v39PreviewTimer=null;}
  }
  function beginPreviewTimer(b){
    stopPreviewTimer(b);
    b._v39PreviewTimer=W.setInterval(()=>{
      if(S()?.battle!==b||!b._v39TeamPreviewActive){stopPreviewTimer(b);return;}
      if(Date.now()>=b._v39PreviewEndsAt){void confirmPreview(b,true);return;}
      repaintBattle();
    },1000);
  }
  function confirmPreview(b,automatic=false){
    if(!b||S()?.battle!==b||!b._v39TeamPreviewActive)return;
    stopPreviewTimer(b);
    const order=Array.isArray(b._v39PreviewOrder)?b._v39PreviewOrder.slice():b.playerTeam.map((_,i)=>i);
    if(order.length!==b.playerTeam.length||new Set(order).size!==order.length||order.some(i=>!Number.isInteger(i)||i<0||i>=b.playerTeam.length)){
      order.splice(0,order.length,...b.playerTeam.map((_,i)=>i));
    }
    b.playerTeam=order.map(index=>b.playerTeam[index]);
    b._v39TeamPreviewActive=false;
    b.playerActive=b.mode==="doubles"?[0,1]:[0];
    b.enemyActive=b.mode==="doubles"?[0,1]:[0];
    const state=S();
    if(state){
      state.team=b.playerTeam.map(mon=>mon.uid).filter(Boolean);
      if(typeof W.saveLocal==="function")W.saveLocal();
    }
    const player=activeLiving(b.playerTeam,b.playerActive);
    const enemy=activeLiving(b.enemyTeam,b.enemyActive);
    originalTrigger?.(player,enemy,b);
    if(automatic&&typeof W.toast==="function")W.toast("時間切れのため、現在の順番で選出を確定しました。","warn");
    originalIntro?.(b);
    W.setPage?.("battle");
  }
  function animateSpriteOut(side,slot){
    const field=doc.querySelector(".battlefield");
    const source=doc.querySelector("#mon-"+side+"-"+slot+" img");
    if(!field||!source)return Promise.resolve();
    const rect=source.getBoundingClientRect(),fr=field.getBoundingClientRect();
    source.style.opacity="0";
    const clone=source.cloneNode(true);
    clone.className=(clone.className||"")+" v39-outgoing-sprite";
    clone.style.cssText="position:absolute;z-index:1000;pointer-events:none;margin:0;left:"+(rect.left-fr.left)+"px;top:"+(rect.top-fr.top)+"px;width:"+rect.width+"px;height:"+rect.height+"px;max-width:none;max-height:none;object-fit:contain;";
    field.appendChild(clone);
    const dx=side==="player"?-Math.max(90,fr.width*.34):Math.max(90,fr.width*.34);
    const dy=side==="player"?Math.max(70,fr.height*.22):-Math.max(70,fr.height*.22);
    const finish=()=>clone.remove();
    if(reduceMotion()||!clone.animate){finish();return Promise.resolve();}
    return clone.animate([
      {transform:"translate(0,0) scale(1) rotate(0)",filter:"hue-rotate(0deg) saturate(1)",clipPath:"inset(0% round 8%)",opacity:1},
      {offset:.42,transform:"translate(0,0) scale(.62,.8) rotate(180deg)",filter:"hue-rotate(190deg) saturate(2.6)",clipPath:"inset(0% round 50%)",opacity:1},
      {transform:"translate("+dx+"px,"+dy+"px) scale(.08) rotate(640deg)",filter:"hue-rotate(360deg) saturate(3) brightness(1.35)",clipPath:"inset(0% round 50%)",opacity:0}
    ],{duration:720,easing:"cubic-bezier(.18,.72,.18,1)",fill:"forwards"}).finished.catch(()=>{}).then(finish);
  }
  function animateBallIn(side,slot){
    const field=doc.querySelector(".battlefield");
    const target=doc.querySelector("#mon-"+side+"-"+slot+" img");
    if(!field||!target)return Promise.resolve();
    const fr=field.getBoundingClientRect(),tr=target.getBoundingClientRect();
    const ball=doc.createElement("div");
    ball.className="v39-pokeball "+(side==="player"?"player":"enemy");
    const startX=side==="player"?12:fr.width-42;
    const startY=side==="player"?fr.height-48:8;
    const endX=tr.left+tr.width/2-fr.left-16,endY=tr.top+tr.height/2-fr.top-16;
    ball.style.left=startX+"px";ball.style.top=startY+"px";
    field.appendChild(ball);
    const oldOpacity=target.style.opacity;
    target.style.opacity="0";
    const reveal=()=>{
      ball.remove();
      target.style.opacity="1";
      target.animate?.([{opacity:0,transform:"scale(.55)"},{opacity:1,transform:"scale(1)"}],{duration:310,easing:"cubic-bezier(.2,.8,.2,1)"});
    };
    if(reduceMotion()||!ball.animate){reveal();return Promise.resolve();}
    return ball.animate([
      {transform:"translate(0,0) rotate(0deg) scale(.56)"},
      {transform:"translate("+(endX-startX)+"px,"+(endY-startY)+"px) rotate(620deg) scale(1)"}
    ],{duration:630,easing:"cubic-bezier(.15,.75,.2,1)",fill:"forwards"}).finished.catch(()=>{}).then(()=>new Promise(resolve=>{
      const pop=ball.animate([{transform:"translate("+(endX-startX)+"px,"+(endY-startY)+"px) scale(1)",opacity:1},{transform:"translate("+(endX-startX)+"px,"+(endY-startY)+"px) scale(1.75)",opacity:0}],{duration:220,fill:"forwards"});
      pop.finished.catch(()=>{}).finally(()=>{reveal();resolve();});
    }));
  }
  function sideForAction(action){return action?.side==="enemy"?"enemy":"player";}
  async function beforeSwitch(action,battle){
    const side=sideForAction(action),slot=Number(action?.slot||0);
    await animateSpriteOut(side,slot);
  }
  async function afterSwitch(action,battle){
    const side=sideForAction(action),slot=Number(action?.slot||0);
    await animateBallIn(side,slot);
  }
  async function afterEndTurn(battle){
    const queued=Array.isArray(battle?._v39EnemyEntryQueue)?battle._v39EnemyEntryQueue.splice(0):[];
    for(const slot of queued)await animateBallIn("enemy",slot);
  }
  W.PokemonChampions2DSwitchCinematics={version:39,beforeSwitch,afterSwitch,afterEndTurn,animateSpriteOut,animateBallIn};

  W.triggerEntryEffects=function(entering,foes,battle){
    if(suppressStartEntry)return;
    if(battle?._v39SuppressPlayerEntryEffects&&Array.isArray(entering)&&entering.length&&entering.every(mon=>(battle.playerTeam||[]).some(player=>player?.uid===mon?.uid)))return;
    return originalTrigger?.(entering,foes,battle);
  };
  W.beginBattleIntro=function(battle){
    if(suppressStartEntry){if(battle)battle._v39IntroPending=true;return;}
    return originalIntro?.(battle);
  };
  W.startBattle=function(mode){
    if(mode==="raid")return originalStart?.(mode);
    suppressStartEntry=true;
    try{originalStart?.(mode);}finally{suppressStartEntry=false;}
    const battle=S()?.battle;
    if(!battle||battle.mode==="raid"||battle.result)return;
    battle._v39TeamPreviewActive=true;
    battle._v39PreviewOrder=battle.playerTeam.map((_,index)=>index);
    battle._v39PreviewEndsAt=Date.now()+120000;
    beginPreviewTimer(battle);
    W.setPage?.("battle");
  };
  W.processEndTurn=function(battle){
    if(!battle||!originalProcessEndTurn)return originalProcessEndTurn?.(battle);
    const playerBefore=[...(battle.playerActive||[])];
    const enemyBefore=[...(battle.enemyActive||[])];
    const forceSlots=[];
    for(let slot=0;slot<playerBefore.length;slot++){
      const oldIndex=playerBefore[slot],oldMon=battle.playerTeam?.[oldIndex];
      if(oldMon&&(oldMon.fainted||Number(oldMon.hp)<=0)){
        const hasBench=(battle.playerTeam||[]).some((mon,index)=>index!==oldIndex&&!mon.fainted&&Number(mon.hp)>0&&!playerBefore.includes(index));
        if(hasBench)forceSlots.push(slot);
      }
    }
    battle._v39SuppressPlayerEntryEffects=forceSlots.length>0;
    let result;
    try{result=originalProcessEndTurn(battle);}
    finally{battle._v39SuppressPlayerEntryEffects=false;}
    for(const slot of forceSlots){
      battle.playerActive[slot]=-1;
    }
    if(forceSlots.length){
      battle._v39ForcedSwitchSlots=Array.from(new Set([...(battle._v39ForcedSwitchSlots||[]),...forceSlots])).sort((a,b)=>a-b);
    }
    const enemyChanges=[];
    for(let slot=0;slot<enemyBefore.length;slot++){
      const oldIndex=enemyBefore[slot],nextIndex=battle.enemyActive?.[slot];
      if(nextIndex!=null&&nextIndex>=0&&nextIndex!==oldIndex&&battle.enemyTeam?.[nextIndex]&&!battle.enemyTeam[nextIndex].fainted)enemyChanges.push(slot);
    }
    if(enemyChanges.length)battle._v39EnemyEntryQueue=Array.from(new Set([...(battle._v39EnemyEntryQueue||[]),...enemyChanges]));
    return result;
  };
  W.renderBattlePage=function(){
    const battle=S()?.battle;
    if(battle?._v39TeamPreviewActive)return teamPreviewHTML(battle);
    const html=originalRender?.()||"";
    return battle?._v39ForcedSwitchSlots?.length?html+forcedSwitchHTML(battle):html;
  };
  W.handleAction=async function(action,element){
    const battle=S()?.battle;
    if(action==="v39-preview-up"||action==="v39-preview-down"){
      if(!battle?._v39TeamPreviewActive)return;
      const index=Number(element?.dataset?.index),next=index+(action==="v39-preview-up"?-1:1);
      const order=battle._v39PreviewOrder||[];
      if(Number.isInteger(index)&&next>=0&&next<order.length){
        [order[index],order[next]]=[order[next],order[index]];
        repaintBattle();
      }
      return;
    }
    if(action==="v39-preview-ready"){
      confirmPreview(battle,false);
      return;
    }
    if(action==="v39-forced-switch"){
      if(!battle||battle.result||!battle._v39ForcedSwitchSlots?.length)return;
      const index=Number(element?.dataset?.index),slot=battle._v39ForcedSwitchSlots[0],next=battle.playerTeam?.[index];
      if(!Number.isInteger(index)||!next||next.fainted||Number(next.hp)<=0||(battle.playerActive||[]).includes(index)){
        W.toast?.("そのポケモンには交代できません。","warn");return;
      }
      battle.playerActive[slot]=index;
      battle._v39ForcedSwitchSlots.shift();
      originalTrigger?.([next],activeLiving(battle.enemyTeam,battle.enemyActive),battle);
      if(next.fainted||Number(next.hp)<=0){
        battle.playerActive[slot]=-1;
        battle._v39ForcedSwitchSlots.unshift(slot);
      }else{
        battle._v39PendingBallSlots=battle._v39PendingBallSlots||[];
        battle._v39PendingBallSlots.push(slot);
      }
      const state=S();
      if(state)state.selectedActiveSlot=slot;
      if(typeof W.saveLocal==="function")W.saveLocal();
      repaintBattle();
      if(!battle._v39ForcedSwitchSlots.length){
        const arrivals=(battle._v39PendingBallSlots||[]).splice(0);
        for(const arrivalSlot of arrivals)await animateBallIn("player",arrivalSlot);
      }
      if(battle.playerTeam.every(mon=>mon.fainted||Number(mon.hp)<=0)){
        battle.result="lose";
        W.battleLog?.("味方のポケモンが全員倒れた……");
        repaintBattle();
      }
      return;
    }
    return originalHandleAction?.(action,element);
  };

  const style=doc.createElement("style");
  style.textContent=[
    ".v39-preview-shell{max-width:1200px;margin:auto}",
    ".v39-preview-screen{padding:clamp(13px,2.5vw,26px);color:#eef3ff}",
    ".v39-preview-screen>header{text-align:center;margin-bottom:12px}",
    ".v39-preview-screen>header small{font-size:10px;letter-spacing:.18em;color:#aabbe7;font-weight:900}",
    ".v39-preview-screen>header h1{font-size:clamp(23px,4vw,34px);margin:7px 0}",
    ".v39-preview-screen>header p,.v39-preview-panel>p,.v39-preview-foot{font-size:11px;color:#b6c4e4;line-height:1.6}",
    ".v39-preview-clock{display:flex;justify-content:center;align-items:center;gap:16px;padding:12px;margin:12px auto 16px;border:1px solid #a2b7ff55;border-radius:14px;background:linear-gradient(110deg,#293a60,#151c34);width:min(520px,100%)}",
    ".v39-preview-clock span{font-size:12px;color:#c2d0f0}.v39-preview-clock strong{font-size:30px;letter-spacing:.1em;font-variant-numeric:tabular-nums}.v39-preview-clock small{font-size:11px;color:#80e6b5;font-weight:900}",
    ".v39-preview-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}",
    ".v39-preview-panel{min-width:0;padding:14px;border:1px solid #8a9ed84a;border-radius:14px;background:linear-gradient(145deg,#202a49,#141a30)}",
    ".v39-preview-heading{display:flex;justify-content:space-between;align-items:center}.v39-preview-heading h2{margin:0;font-size:14px}.v39-preview-heading b{font-size:11px;color:#b5c5ec}",
    ".v39-roster-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}",
    ".v39-roster-card{position:relative;display:flex;min-width:0;flex-direction:column;align-items:center;gap:5px;padding:9px 5px;border:1px solid #8095d344;border-radius:10px;background:#0e1730;text-align:center}",
    ".v39-roster-art{height:78px;width:100%;display:flex;align-items:center;justify-content:center}.v39-roster-art img{max-width:100%;max-height:78px;object-fit:contain}",
    ".v39-roster-card>b{font-size:11px;overflow-wrap:anywhere}.v39-roster-card>small{font-size:9px;color:#b1c1e4}",
    ".v39-roster-order{position:absolute;top:5px;left:7px;color:#a9bcff;font-size:10px;font-weight:900}",
    ".v39-order-controls{display:flex;gap:6px}.v39-order-controls button{width:27px;height:24px;border:1px solid #8297dc66;border-radius:7px;background:#30436e;color:white;font-weight:900}.v39-order-controls button:disabled{opacity:.25}",
    ".v39-ready-chip,.v39-cpu-ready{font-size:9px;color:#83edb8;font-weight:900}.v39-cpu-ready{padding:10px;border-radius:8px;background:#174c3a66;text-align:center}",
    ".v39-ready-button{width:100%;border:0;border-radius:10px;padding:13px;background:linear-gradient(110deg,#5474e8,#8294f8);color:white;font-weight:900;cursor:pointer}",
    ".v39-preview-foot{text-align:center;margin:12px 0 0}",
    ".v39-forced-backdrop{position:fixed;inset:0;z-index:100000;background:#080d1deF;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:12px}",
    ".v39-forced-dialog{width:min(920px,100%);max-height:94vh;overflow:auto;padding:clamp(14px,2.4vw,24px);border:1px solid #a2b8ff66;border-radius:18px;background:linear-gradient(145deg,#263457,#11182c);box-shadow:0 20px 90px #000c;color:#f3f6ff}",
    ".v39-forced-dialog>small{font-size:10px;letter-spacing:.16em;color:#a9baff;font-weight:900}.v39-forced-dialog h2{font-size:clamp(21px,3vw,29px);margin:8px 0}.v39-forced-dialog p{font-size:12px;color:#c2cee9}",
    ".v39-forced-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}",
    ".v39-forced-card{display:flex;min-width:0;flex-direction:column;align-items:center;gap:6px;padding:11px 6px;border:1px solid #879ce055;border-radius:12px;background:#111c35;color:#f2f5ff}.v39-forced-card:disabled{opacity:.35;filter:grayscale(.8)}",
    ".v39-forced-art{height:76px;display:flex;align-items:center;justify-content:center}.v39-forced-art img{max-width:100%;max-height:76px;object-fit:contain}.v39-forced-card b{font-size:12px}.v39-forced-card small{font-size:10px;color:#b6c5e5}.v39-forced-card i{width:90%;height:6px;background:#ffffff20;border-radius:10px;overflow:hidden}.v39-forced-card i em{display:block;height:100%;background:#68d9a9}.v39-forced-card strong{font-size:10px;color:#a9c0ff}",
    ".v39-pokeball{position:absolute;z-index:1001;width:32px;height:32px;border:2px solid #26324d;border-radius:50%;background:linear-gradient(#ed4b61 0 47%,#17233c 48% 55%,#f5f7ff 56% 100%);box-shadow:0 0 16px #d7f4ff99;pointer-events:none}",
    ".v39-pokeball:after{content:'';position:absolute;left:9px;top:9px;width:10px;height:10px;border:2px solid #26324d;border-radius:50%;background:#fff}",
    ".v39-outgoing-sprite{will-change:transform,filter,clip-path,opacity}",
    "@media(max-width:760px){.v39-preview-columns{grid-template-columns:1fr}.v39-roster-grid,.v39-forced-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v39-preview-clock{flex-wrap:wrap;gap:9px}.v39-roster-art{height:65px}.v39-roster-art img{max-height:65px}}"
  ].join("\n");
  doc.head?.appendChild(style);
  console.info("[v39] 120-second team preview, six-mon forced replacement, and trainer-free switch cinematics loaded.");
})();