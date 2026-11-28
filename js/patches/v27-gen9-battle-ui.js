/* v33: Keep Showdown, resolve worker URLs relative to this script, and fall back to the built-in battle. */
(() => {
  "use strict";
  const W=window, APP=()=>W.PokemonChampions2D, S=()=>APP()?.state;
  const PATCH_SCRIPT_URL=document.currentScript?.src||document.baseURI;
  const GEN9_WORKER_URL=new URL("../gen9-local-engine.worker.js?v=39.0.0",PATCH_SCRIPT_URL).href;
  const statusJa={brn:"やけど",par:"まひ",slp:"ねむり",frz:"こおり",psn:"どく",tox:"もうどく"};
  let session=null, team=[], busy=false, errorText="", gimmick="", onlineSocket=null, onlineRoomCode="", onlineStatus="", waitingForOpponent=false, opponentName="CPU", diagnosticBusy=false, diagnosticReport="", randomSearching=false, onlineMode="private";
  let previewOrder=[], previewEndsAt=0, previewInterval=null, onlineTeamOrder=null, onlineOutgoingPending=false;
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const idOf=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  let localWorker=null, localWorkerSequence=0;
  const localWorkerPending=new Map();
  function rejectLocalWorkerPending(error){
    for(const [id,pending] of localWorkerPending){
      clearTimeout(pending.timer);
      pending.reject(error);
      localWorkerPending.delete(id);
    }
  }
  function getLocalWorker(){
    if(localWorker)return localWorker;
    if(typeof Worker!=="function")throw new Error("このブラウザはローカル対戦Workerに対応していません。");
    const worker=new Worker(GEN9_WORKER_URL);
    worker.onmessage=event=>{
      const message=event.data||{};
      const pending=localWorkerPending.get(message.id);
      if(!pending)return;
      clearTimeout(pending.timer);
      localWorkerPending.delete(message.id);
      if(message.ok)pending.resolve(message.result);
      else pending.reject(new Error(message.error||"ローカル対戦エンジンでエラーが発生しました。"));
    };
    worker.onerror=event=>{
      const error=new Error("ローカル対戦エンジンを読み込めませんでした。"+(event?.message?" "+event.message:""));
      rejectLocalWorkerPending(error);
      if(localWorker===worker)localWorker=null;
      worker.terminate();
    };
    worker.onmessageerror=()=>{
      const error=new Error("ローカル対戦エンジンとのメッセージ通信に失敗しました。");
      rejectLocalWorkerPending(error);
      if(localWorker===worker)localWorker=null;
      worker.terminate();
    };
    localWorker=worker;
    return worker;
  }
  function localEngineCall(type,payload,timeoutMs=90000){
    const worker=getLocalWorker();
    const id=++localWorkerSequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        localWorkerPending.delete(id);
        reject(new Error("ローカル対戦エンジンが"+Math.round(timeoutMs/1000)+"秒以内に応答しませんでした。"));
      },timeoutMs);
      localWorkerPending.set(id,{resolve,reject,timer});
      try{worker.postMessage({id,type,...(payload||{})});}
      catch(error){
        clearTimeout(timer);
        localWorkerPending.delete(id);
        reject(error);
      }
    });
  }
  function stopLocalWorker(){
    const worker=localWorker;
    localWorker=null;
    if(worker)worker.terminate();
    rejectLocalWorkerPending(new Error("ローカル対戦を終了しました。"));
  }
  function switchToStandardBattle(message){
    const app=APP(),s=S();
    if(!app||!s)return false;
    const chosen=selectedOwned();
    if(chosen.length)s.team=chosen.map(mon=>mon.uid).filter(Boolean);
    if(onlineSocket){
      try{
        if(onlineSocket.readyState===WebSocket.OPEN){
          onlineSocket.send(JSON.stringify({type:randomSearching?"random-match-cancel":"leave-gen9-room"}));
        }
      }catch(_){}
      try{onlineSocket.close();}catch(_){}
      onlineSocket=null;
    }
    randomSearching=false;
    waitingForOpponent=false;
    onlineRoomCode="";
    onlineStatus="";
    stopLocalWorker();
    session=null;
    team=[];
    busy=false;
    gimmick="";
    errorText="";
    document.querySelectorAll("[data-gen9-page]").forEach(button=>button.classList.remove("active"));
    try{
      if(typeof W.setPage==="function")W.setPage("battle");
      else{s.page="battle";if(typeof W.renderPage==="function")W.renderPage();}
    }catch(_){
      s.page="battle";
      try{W.renderPage?.();}catch(__){}
    }
    if(s.page!=="battle")return false;
    if(typeof W.toast==="function")W.toast(message||"通常バトルへ切り替えました。","warn");
    return true;
  }
  function shouldFallbackToStandardBattle(error){
    const message=String(error?.message||error||"");
    if(/プレイヤーチーム検証で失敗/.test(message))return false;
    return /(Worker|MessagePort|unreachable|ローカル対戦エンジン|Showdown対戦開始|CPUランダムチーム生成|応答しません|タイムアウト)/i.test(message);
  }
  function selectedOwned(){
    const s=S(); if(!s)return [];
    const ids=Array.isArray(s.team)?s.team:[];
    let chosen=ids.map(id=>(s.owned||[]).find(m=>m.uid===id)).filter(Boolean);
    if(!chosen.length)chosen=(s.owned||[]).slice(0,6);
    return chosen.slice(0,6);
  }
  function buildTeam(){
    return selectedOwned().map(m=>({
      uid:m.uid,name:m.name,nickname:m.name,species:m.speciesId||m.formId,speciesId:m.speciesId||m.formId,
      level:Number(m.level||50),
      moves:(m.moves||[]).slice(0,4).map(value=>{
        const key=typeof value==="string"?value:(value?.id||value?.name||"");
        const record=APP()?.getMove?.(key)||(typeof value==="object"?value:null);
        return String(record?.showdownId||record?.showdownID||record?.showdownMoveId||key||"").trim();
      }).filter(Boolean),
      abilityId:m.abilityId||"",heldItem:m.heldItem||"",nature:m.nature||"まじめ",ivs:m.ivs||{},evs:m.evs||{},
      shiny:!!m.shiny,teraType:m.teraType||""
    }));
  }
  function open(){
    const main=document.getElementById("main"),s=S();if(!main||!s)return;
    s.page="gen9-battle";
    document.querySelectorAll("[data-page]").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll("[data-gen9-page]").forEach(x=>x.classList.add("active"));
    main.innerHTML=render();
    main.focus?.({preventScroll:true});
  }
  function jpMove(move){
    const x=APP()?.getMove?.(move?.id||move?.move);
    return x?.jpName||x?.name||move?.move||move?.id||"不明";
  }
  function nameOf(v){return String(v||"ポケモン").split(":").pop().trim()||"ポケモン";}
  function hpOf(value){
    const x=String(value||"").split(" ")[0];
    if(/fnt/i.test(x))return {pct:0,text:"ひんし"};
    const p=x.split("/").map(Number);
    if(p.length===2&&p[1]>0&&p.every(Number.isFinite))return {pct:Math.max(0,Math.min(100,p[0]/p[1]*100)),text:x};
    return {pct:100,text:x||"HP不明"};
  }
  function logText(line){
    const f=String(line||"").split("|"),tag=f[1],n=nameOf(f[2]);
    const stats={atk:"攻撃",def:"防御",spa:"特攻",spd:"特防",spe:"素早さ",accuracy:"命中",evasion:"回避"};
    if(tag==="turn")return "ターン "+f[2];
    if(tag==="move")return n+" は「"+jpMove({id:idOf(f[3]),move:f[3]})+"」を使った！";
    if(["switch","drag","replace"].includes(tag))return n+" が場に出た！";
    if(tag==="faint")return n+" はたおれた！";
    if(tag==="-damage")return n+" のHPが減った（"+hpOf(f[3]).text+"）";
    if(tag==="-heal")return n+" のHPが回復した（"+hpOf(f[3]).text+"）";
    if(tag==="-status")return n+" は"+(statusJa[f[3]]||f[3])+"状態になった！";
    if(tag==="-curestatus")return n+" の"+(statusJa[f[3]]||f[3])+"が治った！";
    if(tag==="-boost"||tag==="-unboost"){
      const amount=Math.max(1,Number(f[4])||1);
      const detail=amount>=2?"ぐーんと":"";
      return n+" の"+(stats[f[3]]||f[3])+(tag==="-boost"?"が"+detail+"上がった！":"が"+detail+"下がった！");
    }
    if(tag==="-ability"){
      const id=idOf(f[3]);
      const names=APP()?.state?.data?.abilityNames;
      const localName=names&&typeof names.get==="function"?(names.get(id)||""):"";
      return n+" の特性「"+(localName||f[3]||"不明")+"」が発動した！";
    }
    if(tag==="-crit")return "急所に当たった！";
    if(tag==="-supereffective")return "効果はばつぐんだ！";
    if(tag==="-resisted")return "効果はいまひとつのようだ…";
    if(tag==="-immune")return n+" には効果がないようだ…";
    if(tag==="-miss")return "しかし攻撃は外れた！";
    if(tag==="-fail")return "しかしうまく決まらなかった！";
    if(tag==="-weather"){
      const weatherNames={
        raindance:"雨",sunnyday:"晴れ",desolateland:"おおひでり",
        primordialsea:"おおあめ",sandstorm:"砂あらし",hail:"あられ",snowscape:"雪"
      };
      return "天候が変化した："+(weatherNames[idOf(f[2])]||f[2]);
    }
    if(tag==="-terastallize")return n+" は"+f[3]+"タイプにテラスタルした！";
    if(tag==="-activate"){
      const raw=String(f[3]||"効果");
      const abilityMatch=raw.match(/^ability:\s*(.+)$/i);
      const names=APP()?.state?.data?.abilityNames;
      const abilityId=abilityMatch?idOf(abilityMatch[1]):"";
      const localName=abilityId&&names&&typeof names.get==="function"?(names.get(abilityId)||""):"";
      return n+" の効果が発動！ "+(localName||raw.replace(/^ability:\s*/i,""));
    }
    if(tag==="cant")return n+" は行動できなかった。";
    if(tag==="win")return f[2]+" の勝利！";
    if(tag==="tie")return "引き分け！";
    if(tag==="-sidestart"||tag==="-fieldstart"){
      const fieldNames={
        electricterrain:"エレキフィールド",grassyterrain:"グラスフィールド",
        psychicterrain:"サイコフィールド",mistyterrain:"ミストフィールド",
        trickroom:"トリックルーム",tailwind:"おいかぜ",
        reflect:"リフレクター",lightscreen:"ひかりのかべ",auroraveil:"オーロラベール"
      };
      const raw=String(f[3]||f[2]||"");
      const fieldId=idOf(raw.replace(/^(move|ability):\s*/i,""));
      return "場に効果が発生："+(fieldNames[fieldId]||raw);
    }
    if(tag==="-sideend"||tag==="-fieldend")return "場の効果が終了："+(f[3]||f[2]);
    return "";
  }
  function renderSwitches(request){
    return (request?.side?.pokemon||[]).map((p,i)=>{
      const h=hpOf(p.condition),blocked=p.active||/fnt/i.test(p.condition||"");
      const title=team[i]?.name||nameOf(p.ident);
      return '<button class="g9-switch" data-g9="switch" data-index="'+i+'" '+(blocked||busy||waitingForOpponent?"disabled":"")+'><span class="g9-switch-art">'+previewArt(p,"player",i)+'</span><b>'+esc(title)+'</b><span>'+esc(h.text)+'</span><i><em style="width:'+h.pct+'%"></em></i><small>'+(p.active?"場に出ている":blocked?"ひんし":"交代する")+'</small></button>';
    }).join("");
  }
  function renderOnlinePanel(){
    const code=onlineRoomCode ? '<div class="g9-room-code"><small>ルームコード</small><b>'+esc(onlineRoomCode)+'</b></div>' : "";
    const status=onlineStatus ? '<p class="g9-online-status">'+esc(onlineStatus)+'</p>' : "";
    const disabled=busy ? "disabled" : "";
    const randomAction=randomSearching
      ? '<button class="g9-secondary" data-g9="random-cancel">検索をキャンセル</button>'
      : '<button class="g9-primary" data-g9="random-match" '+disabled+'>ランダムマッチを探す</button>';
    return `<section class="g9-card g9-online"><h2>オンライン対戦</h2>
      <p>対戦ルールはCPU戦と同じ全国図鑑シングル。オンライン通信では両方のプレイヤーの行動をサーバーで処理します。</p>
      ${status}
      <div class="g9-match-mode"><h3>ランダムマッチ</h3><p>検索を始めると、同じく参加待ちのプレイヤーと自動でマッチングします。</p>${randomAction}</div>
      <div class="g9-match-mode"><h3>プライベートマッチ</h3><p>ルームコードを共有して、対戦する相手を指定します。</p>
        <div class="g9-online-row"><button class="g9-primary" data-g9="create-room" ${disabled}>プライベートルームを作成</button></div>
        ${code}
        <div class="g9-online-row"><input id="g9-room-code" maxlength="6" placeholder="6文字のルームコード" value=""><button class="g9-secondary" data-g9="join-room" ${disabled}>コードで参加</button></div>
      </div>
    </section>`;
  }
  async function runDiagnostic(){
    if(diagnosticBusy)return;
    diagnosticBusy=true;
    diagnosticReport="ブラウザ内Showdownエンジンを確認中…";
    repaint();
    const lines=[],started=Date.now();
    const check=(name,ok,detail)=>lines.push((ok?"OK":"NG")+"｜"+name+"："+String(detail||"").slice(0,700));
    try{
      check("画面・実行環境",!!S()&&S()?.page==="gen9-battle","page="+(S()?.page||"不明")+" / browser="+navigator.userAgent);
      check("ローカル実行方式",typeof Worker==="function","CPU対戦計算はブラウザ内Workerで実行");
      const playerTeam=buildTeam();
      check("チーム人数",playerTeam.length>=1&&playerTeam.length<=6,playerTeam.length+"匹（1〜6匹が必要）");
      if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
      check("ポケモン識別子",playerTeam.every(mon=>!!(mon.speciesId||mon.species)),
        playerTeam.map(mon=>(mon.name||"?")+"="+(mon.speciesId||mon.species||"未設定")).join(" / "));
      check("技設定",playerTeam.every(mon=>Array.isArray(mon.moves)&&mon.moves.length>0),
        playerTeam.map(mon=>(mon.name||"?")+":"+mon.moves.length+"技").join(" / "));
      check("レベル値",playerTeam.every(mon=>Number.isInteger(mon.level)&&mon.level>=1&&mon.level<=100),
        playerTeam.map(mon=>(mon.name||"?")+" Lv."+mon.level).join(" / "));
      check("持ち物・特性データ",true,
        playerTeam.map(mon=>(mon.name||"?")+" / 特性="+(mon.abilityId||"自動")+" / 持ち物="+(mon.heldItem||"なし")).join(" ; "));
      diagnosticReport=lines.join("\n")+"\n\n端末内のShowdownでチーム検証・CPU生成・対戦開始テスト中…";
      repaint();
      const result=await localEngineCall("diagnose",{playerTeam});
      check("Showdownシミュレーター",result.ok===true,result.engine);
      check("National Dex AG形式",result.format==="gen9nationaldexag",result.formatName+" / "+result.format);
      check("内蔵図鑑・技・特性・持ち物",!!result.counts,
        "ポケモン "+result.counts.species+"・技 "+result.counts.moves+"・特性 "+result.counts.abilities+"・持ち物 "+result.counts.items);
      check("CPUランダムチーム",result.opponentTeamSize===6,result.opponentTeamSize+"匹を端末内で生成");
      check("初期対戦リクエスト",result.initialRequestReady,"プレイヤー・CPU双方の行動選択を取得");
      check("対戦計算はオフライン",true,"技・特性・ダメージ・ターン処理はブラウザ内Showdown Workerで実行");
      const audit=result.mechanicsAudit||{};
      const dream=audit.dreamEater||{};
      check("夢喰い：起きている相手には失敗",dream.awakeRejected===true,
        "Showdownの技データによる睡眠条件");
      check("夢喰い：ねむり・ぜったいねむり",dream.asleepAllowed===true&&dream.comatoseAllowed===true,
        "ねむり状態とComatoseの例外");
      const abilities=audit.svAbilityHooks||[];
      check("SV特性フック",abilities.length>0&&audit.availableSvAbilities===audit.totalCheckedSvAbilities,
        (audit.availableSvAbilities||0)+"/"+(audit.totalCheckedSvAbilities||0)+"種類の代表的なSV特性イベントを確認");
      for(const ability of abilities){
        check("特性："+ability.id,ability.complete===true,
          (ability.availableHooks||[]).join(", ")+" / 必要："+(ability.requiredHooks||[]).join(", "));
      }
      diagnosticReport=lines.join("\n")+"\n\n診断完了："+(Date.now()-started)+"ms";
    }catch(error){
      check("ローカルエンジン",false,error?.message||String(error));
      diagnosticReport=lines.join("\n")+"\n\n診断停止："+(error?.message||String(error))+"\n所要時間："+(Date.now()-started)+"ms";
    }finally{
      diagnosticBusy=false;
      repaint();
    }
  }

  function stopPreviewClock(){
    if(previewInterval){clearInterval(previewInterval);previewInterval=null;}
    previewEndsAt=0;
  }
  function startPreviewClock(){
    stopPreviewClock();
    previewEndsAt=Date.now()+120000;
    previewInterval=setInterval(()=>{
      if(!session?.request?.teamPreview){stopPreviewClock();return;}
      if(Date.now()>=previewEndsAt){
        const order=previewOrder.slice();
        stopPreviewClock();
        void act({teamOrder:order});
      }else repaint();
    },1000);
  }
  function findRequestSpecies(entry){
    const label=String(entry?.details||entry?.ident||"ポケモン").split(",")[0].split(":").pop().trim();
    const key=idOf(label);
    const app=APP();
    return app?.findSpecies?.(key)||app?.state?.data?.dexById?.[key]||{id:key,name:label,jpName:label,displayName:label};
  }
  function previewArt(entry,side,index){
    const member=side==="player"?(team[index]||null):findRequestSpecies(entry);
    return APP()?.speciesIcon?.(member||findRequestSpecies(entry),side==="player",true)||'<span class="g9-no-sprite">?</span>';
  }
  function renderPreviewCard(entry,side,index,position){
    const member=side==="player"?(team[index]||null):findRequestSpecies(entry);
    const title=member?.name||nameOf(entry?.ident||entry?.details);
    const controls=side==="player"
      ? '<span class="g9-order-controls"><button data-g9="team-up" data-index="'+position+'" '+(busy||waitingForOpponent||position===0?"disabled":"")+' aria-label="上へ">↑</button><button data-g9="team-down" data-index="'+position+'" '+(busy||waitingForOpponent||position===previewOrder.length-1?"disabled":"")+' aria-label="下へ">↓</button></span>'
      : '<span class="g9-order-fixed">'+(session?.kind==="online"?"VS PLAYER":"CPU READY")+'</span>';
    const level=member?.level||String(entry?.details||"").match(/L(\d+)/)?.[1]||"50";
    return '<article class="g9-preview-mon '+side+'"><span class="g9-preview-number">'+(position+1)+'</span><div class="g9-preview-art">'+previewArt(entry,side,index)+'</div><b>'+esc(title)+'</b><small>Lv.'+esc(level)+'</small>'+controls+'</article>';
  }
  function renderTeamPreview(req){
    const own=req.side?.pokemon||[];
    const foe=session?.opponentRequest?.side?.pokemon||[];
    if(previewOrder.length!==own.length)previewOrder=own.map((_,i)=>i);
    const seconds=Math.max(0,Math.ceil((previewEndsAt-Date.now())/1000));
    const clock=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
    const ownCards=previewOrder.map((originalIndex,position)=>renderPreviewCard(own[originalIndex],"player",originalIndex,position)).join("");
    const foeCards=foe.map((entry,i)=>renderPreviewCard(entry,"enemy",i,i)).join("");
    const online=session?.kind==="online";
    const readyLabel=online?(waitingForOpponent?"選出を送信済み · 相手の確定を待っています":"相手の選出を待っています"):"CPU：準備OK";
    const readyHtml=online?'<div class="g9-preview-ready">'+esc(readyLabel)+'</div>':'<div class="g9-preview-ready">✓ CPU 準備OK</div>';
    const readyButton=waitingForOpponent?"送信済み · 相手待ち":busy?"選出を確定中…":"準備OK！ 対戦開始";
    return '<section class="g9 g9-preview"><header><div><small>NATIONAL DEX · TEAM PREVIEW</small><h1>対戦前の見せ合い</h1><p>お互いのチームを確認して、こちらの先発と控えの順番を決めよう。</p></div><b class="g9-badge">120 SEC</b></header><div class="g9-preview-clock"><span>対戦開始まで</span><strong>'+clock+'</strong><small>'+esc(readyLabel)+'</small></div><div class="g9-preview-columns"><section class="g9-card"><div class="g9-preview-heading"><h2>YOUR TEAM</h2><b>'+own.length+'体</b></div><p>↑ ↓ で順番を変更。いちばん上が先発ポケモン。</p><div class="g9-preview-team">'+ownCards+'</div><button class="g9-primary" data-g9="team-ready" '+(busy||waitingForOpponent?"disabled":"")+'>'+readyButton+'</button></section><section class="g9-card"><div class="g9-preview-heading"><h2>'+(online?esc(opponentName):"OPPONENT TEAM")+'</h2><b>'+foe.length+'体</b></div><p>'+(online?"相手も6体を確認して、先発と控えの順番を選んでいます。":"CPUは先に準備OK。相手の技・持ち物は対戦開始まで非公開。")+'</p><div class="g9-preview-team">'+foeCards+'</div>'+readyHtml+'</section></div><p class="g9-preview-note">120秒で自動確定します。準備OKを押すと、その時点の順番で対戦が始まります。</p></section>';
  }
  function activeIndex(request){
    return (request?.side?.pokemon||[]).findIndex(mon=>!!mon.active);
  }
  async function animateSwitchOut(side){
    const source=document.querySelector(".g9-active-sprite."+side+" img");
    if(!source)return;
    const rect=source.getBoundingClientRect();
    source.style.opacity="0";
    const clone=source.cloneNode(true);
    clone.style.cssText="position:fixed;z-index:100000;pointer-events:none;margin:0;left:"+rect.left+"px;top:"+rect.top+"px;width:"+rect.width+"px;height:"+rect.height+"px;object-fit:contain;";
    document.body.appendChild(clone);
    const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const dx=side==="player"?-Math.max(100,window.innerWidth*.32):Math.max(100,window.innerWidth*.32);
    const dy=side==="player"?Math.max(70,window.innerHeight*.16):-Math.max(70,window.innerHeight*.16);
    try{
      if(!reduce&&clone.animate)await clone.animate([
        {transform:"translate(0,0) scale(1) rotate(0)",filter:"hue-rotate(0deg) saturate(1)",clipPath:"inset(0% round 8%)",opacity:1},
        {offset:.45,transform:"translate(0,0) scale(.62,.8) rotate(180deg)",filter:"hue-rotate(190deg) saturate(2.5)",clipPath:"inset(0% round 50%)",opacity:1},
        {transform:"translate("+dx+"px,"+dy+"px) scale(.08) rotate(620deg)",filter:"hue-rotate(360deg) saturate(2.8) brightness(1.4)",clipPath:"inset(0% round 50%)",opacity:0}
      ],{duration:680,easing:"cubic-bezier(.18,.72,.18,1)",fill:"forwards"}).finished.catch(()=>{});
      else await new Promise(resolve=>setTimeout(resolve,80));
    }finally{clone.remove();}
  }
  async function animateSwitchIn(side){
    const target=document.querySelector(".g9-active-sprite."+side+" img");
    if(!target)return;
    const rect=target.getBoundingClientRect();
    const ball=document.createElement("div");
    ball.className="g9-switch-ball "+side;
    const startX=side==="player"?-34:window.innerWidth+34;
    const startY=side==="player"?window.innerHeight-48:24;
    ball.style.left=startX+"px";
    ball.style.top=startY+"px";
    document.body.appendChild(ball);
    const endX=rect.left+rect.width/2,endY=rect.top+rect.height/2;
    const dx=endX-startX,dy=endY-startY;
    const priorOpacity=target.style.opacity;
    target.style.opacity="0";
    try{
      if(ball.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){
        await ball.animate([{transform:"translate(0,0) rotate(0) scale(.55)"},{transform:"translate("+dx+"px,"+dy+"px) rotate(620deg) scale(1)"}],{duration:620,easing:"cubic-bezier(.15,.75,.2,1)",fill:"forwards"}).finished.catch(()=>{});
        await ball.animate([{transform:"translate("+dx+"px,"+dy+"px) scale(1)",opacity:1},{transform:"translate("+dx+"px,"+dy+"px) scale(1.65)",opacity:0}],{duration:220,fill:"forwards"}).finished.catch(()=>{});
      }else await new Promise(resolve=>setTimeout(resolve,80));
    }finally{
      ball.remove();
      target.style.opacity=priorOpacity||"1";
      target.animate?.([{opacity:0,transform:"scale(.65)"},{opacity:1,transform:"scale(1)"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});
    }
  }
  function renderActiveSprite(entry,side,index){
    if(!entry)return "";
    return '<div class="g9-active-sprite '+side+'">'+previewArt(entry,side,index)+'</div>';
  }

  function render(){
    if(!session){
      const roster=buildTeam();
      const items=roster.map((m,i)=>'<div class="g9-team"><span>'+(i+1)+'</span><b>'+esc(m.name||m.species)+'</b><small>Lv.'+m.level+' · '+m.moves.length+'技</small></div>').join("");
      return '<section class="g9"><header><div><small>LOCAL SHOWDOWN ENGINE · NATIONAL DEX</small><h1>全世代バトル</h1><p>第1〜9世代のデータを内蔵したShowdownエンジンがブラウザ内で動作します。CPU戦の対戦計算にサーバーAPIは使いません。</p></div><b class="g9-badge">GEN 1–9</b></header><div class="g9-columns"><section class="g9-card"><h2>自分のチーム</h2><p>編成画面で選んだチームを使います。未選択ならボックスの先頭から最大6匹です。</p><div class="g9-roster">'+(items||"ポケモンをスカウトしてください。")+'</div><button class="g9-primary" data-g9="start" '+(!roster.length||busy?"disabled":"")+'>'+(busy?"準備中…":"全世代CPU対戦を開始")+'</button><p>CPUチーム生成・技や特性の効果判定・ダメージ計算は端末内で実行します。オンライン対戦のみ相手との同期にWebSocketを使用します。</p></section><section class="g9-card"><h2>対戦ルール</h2><div class="g9-spec"><span>図鑑</span><b>第1〜9世代（National Dex）</b></div><div class="g9-spec"><span>形式</span><b>シングル 6対6</b></div><div class="g9-spec"><span>ルール</span><b>Gen 9 National Dex AG</b></div><div class="g9-spec"><span>ギミック</span><b>メガシンカ・テラスタル</b></div><p>大会向けの使用制限を外した全国図鑑ルールです。ダイマックスも同じ試合に混ぜるにはShowdown本体の追加改造が必要です。</p></section></div><button class="g9-secondary" data-g9="diagnose" '+(diagnosticBusy?"disabled":"")+'>'+(diagnosticBusy?"診断中…":"不具合を診断する")+'</button>'+(diagnosticReport?'<pre class="g9-diagnostic">'+esc(diagnosticReport)+'</pre>':"")+'<button class="g9-secondary" data-g9="standard-battle">別ルールの独自バトルへ切り替える</button><p class="g9-online-status">通常はオフラインShowdownエンジンを使います。独自バトルへの切り替えは、このボタンを押した場合だけ行います。</p>'+renderOnlinePanel()+(errorText?'<div class="g9-error">'+esc(errorText)+'</div>':"")+'</section>';
    }
    const req=session.request||{};
    if(req.teamPreview)return renderTeamPreview(req);
    const active=req.active?.[0]||{},list=req.side?.pokemon||[];
    const currentActiveIndex=list.findIndex(x=>x.active),mon=currentActiveIndex>=0?list[currentActiveIndex]:null;
    const opponentList=session.opponentRequest?.side?.pokemon||[];
    const opponentActiveIndex=activeIndex(session.opponentRequest);
    const opponentActive=opponentActiveIndex>=0?opponentList[opponentActiveIndex]:null;
    const monName=mon?(team[currentActiveIndex]?.name||nameOf(mon.ident)):"交代を選択";
    const hp=hpOf(mon?.condition),forced=Array.isArray(req.forceSwitch)&&req.forceSwitch.some(Boolean);
    const moves=(active.moves||[]).map((m,i)=>{
      const record=APP()?.getMove?.(m.id),type=record?.type||"",cat=record?.category||"";
      return '<button class="g9-move" data-g9="move" data-index="'+i+'" '+(m.disabled||busy||waitingForOpponent?"disabled":"")+'><span><b>'+esc(jpMove(m))+'</b><small>'+esc(type)+' · '+esc(cat)+'</small></span><strong>'+esc((m.pp??"?")+"/"+(m.maxpp??"?"))+'</strong></button>';
    }).join("");
    const gimmickOptions=[];
    if(active.canMegaEvo)gimmickOptions.push(["mega","メガシンカ"]);
    if(active.canTerastallize)gimmickOptions.push(["terastallize","テラスタル"]);
    const gimmickButtons=gimmickOptions.map(([mode,label])=>{
      const selected=gimmick===mode ? "selected" : "";
      const disabled=(busy||waitingForOpponent) ? "disabled" : "";
      return '<button type="button" class="g9-gimmick '+selected+'" data-g9="gimmick" data-mode="'+mode+'" '+disabled+'>'+label+'</button>';
    }).join("");
    const gimmickPanel=gimmickButtons ? '<div class="g9-gimmicks"><b>このターンのバトルギミック</b><div>'+gimmickButtons+'</div><small>1ターンに選べるギミックは1つです。選択を解除すると通常の技になります。</small></div>' : "";
    const logs=(session.logs||[]).map(logText).filter(Boolean).slice(-32).map(x=>"<p>"+esc(x)+"</p>").join("");
    let result="対戦終了";
    if(session.winner==="tie")result="引き分け";
    else if(session.winner===session.playerName||session.winner==="プレイヤー"||session.winner==="Player 1")result="勝利！";
    else result="敗北…";
    const done=session.done;
    return '<section class="g9"><header><div><small>NATIONAL DEX · TURN '+(session.turn||"")+'</small><h1>全世代バトル</h1><p>'+(done?"対戦終了":(waitingForOpponent?"相手の行動待ち":"Showdownエンジンが行動を判定中"))+'</p></div><b class="g9-badge">'+(done?"RESULT":"BATTLE")+'</b></header><div class="g9-columns"><section class="g9-card g9-arena"><div class="g9-arena-side player"><small>PLAYER</small>'+renderActiveSprite(list[currentActiveIndex],"player",currentActiveIndex)+'<h2>'+esc(monName)+'</h2><div class="g9-hp"><i style="width:'+hp.pct+'%"></i></div><p>'+esc(hp.text)+(mon?.status?" · "+esc(statusJa[mon.status]||mon.status):"")+'</p></div><div class="g9-versus">⚔</div><div class="g9-arena-side enemy"><small>OPPONENT</small>'+renderActiveSprite(opponentActive,"enemy",opponentActiveIndex)+'<b>'+esc(opponentActive?nameOf(opponentActive.ident||opponentActive.details):opponentName)+'</b><p>Showdownバトル</p></div></section><section class="g9-card g9-controls">'+(done?'<div class="g9-result"><h2>'+result+'</h2><button class="g9-primary" data-g9="new">もう一度対戦</button><button class="g9-secondary" data-g9="leave">終了して戻る</button></div>':'<div><h2>'+(forced?"交代してください":esc(monName)+" の行動")+'</h2><p>'+(forced?"ひんしになったため、交代が必要です。":"技を選択してください。")+'</p>'+(forced?"":'<div class="g9-moves">'+(moves||"使用できる技がありません。")+'</div>')+gimmickPanel+'</div><div class="g9-switch-area"><b>交代</b><div class="g9-switches">'+renderSwitches(req)+'</div></div>'+(busy?'<p class="g9-busy">Showdownがターンを処理中…</p>':"")+'<button class="g9-secondary" data-g9="forfeit" '+(busy?"disabled":"")+' >降参する</button><button class="g9-secondary" data-g9="leave" '+(busy?"disabled":"")+' >対戦を終了</button>')+'</section></div><section class="g9-card g9-logs"><h2>バトルログ</h2><div>'+(logs||"<p>バトルログを待っています…</p>")+'</div></section>'+(errorText?'<div class="g9-error">'+esc(errorText)+'</div>':"")+'</section>';
  }
  function repaint(){const main=document.getElementById("main");if(main&&S()?.page==="gen9-battle")main.innerHTML=render();}
  function connectOnline(){
    if(onlineSocket&&onlineSocket.readyState===WebSocket.OPEN)return Promise.resolve(onlineSocket);
    return new Promise((resolve,reject)=>{
      const proto=location.protocol==="https:"?"wss:":"ws:";
      const socket=new WebSocket(proto+"//"+location.host+"/ws");
      onlineSocket=socket;
      let settled=false;
      socket.addEventListener("open",()=>{settled=true;resolve(socket);},{once:true});
      socket.addEventListener("error",()=>{
        if(!settled){settled=true;reject(new Error("オンラインサーバーに接続できませんでした。"));}
      });
      socket.addEventListener("message",event=>{
        let msg;try{msg=JSON.parse(event.data);}catch(_){return;}
        if(msg.type==="gen9-random-queued"){
          randomSearching=true;busy=false;onlineMode="random";
          onlineStatus="ランダムマッチの相手を探しています。画面を開いたまま待ってね。";
          repaint();return;
        }
        if(msg.type==="gen9-random-cancelled"){
          randomSearching=false;busy=false;onlineStatus="ランダムマッチの検索を終了しました。";
          repaint();return;
        }
        if(msg.type==="gen9-room-created"){
          onlineRoomCode=msg.roomCode;randomSearching=false;onlineMode="private";
          onlineStatus="プライベートルームを作成しました。ルームコードを共有してください。";
          busy=false;repaint();return;
        }
        if(msg.type==="gen9-match-ready"){
          onlineRoomCode=msg.roomCode;
          randomSearching=false;onlineMode=msg.matchType||onlineMode;
          opponentName=msg.opponent||"対戦相手";
          session={...msg.snapshot,kind:"online",side:msg.side,playerName:msg.playerName||"プレイヤー",opponentName};
          team=selectedOwned();waitingForOpponent=false;busy=false;gimmick="";
          onlineOutgoingPending=false;onlineTeamOrder=null;
          onlineStatus="オンライン対戦中";
          if(session.request?.teamPreview){previewOrder=(session.request.side?.pokemon||[]).map((_,index)=>index);startPreviewClock();}
          repaint();return;
        }
        if(msg.type==="gen9-action-accepted"){
          busy=false;waitingForOpponent=true;
          onlineStatus="相手の行動を待っています…";
          repaint();return;
        }
        if(msg.type==="gen9-battle-update"&&msg.snapshot){
          const snap=msg.snapshot;
          const oldPlayer=activeIndex(session?.request),oldEnemy=activeIndex(session?.opponentRequest);
          const newPlayer=activeIndex(snap.request),newEnemy=activeIndex(snap.opponentRequest);
          const playerChanged=newPlayer>=0&&oldPlayer!==newPlayer;
          const enemyChanged=newEnemy>=0&&oldEnemy!==newEnemy;
          if(playerChanged&&oldPlayer>=0&&!onlineOutgoingPending)await animateSwitchOut("player");
          if(enemyChanged&&oldEnemy>=0)await animateSwitchOut("enemy");
          stopPreviewClock();
          if(onlineTeamOrder&&team.length)team=onlineTeamOrder.map(index=>team[index]).filter(Boolean);
          onlineTeamOrder=null;onlineOutgoingPending=false;
          session={...session,...snap,kind:"online",logs:[...(session?.logs||[]),...(snap.logs||[])]};
          busy=false;waitingForOpponent=false;gimmick="";
          onlineStatus=session.done?"対戦終了":"オンライン対戦中";
          repaint();
          if(playerChanged)await animateSwitchIn("player");
          if(enemyChanged)await animateSwitchIn("enemy");
          return;
        }
        if(msg.type==="gen9-forfeit-win"&&session){
          session={...session,done:true,winner:session.playerName};
          busy=false;waitingForOpponent=false;onlineStatus="相手が降参しました。";
          repaint();return;
        }
        if(msg.type==="gen9-forfeit-lost"&&session){
          session={...session,done:true,winner:"opponent"};
          busy=false;waitingForOpponent=false;onlineStatus="降参しました。";
          repaint();return;
        }
        if(msg.type==="gen9-peer-left"){
          if(session){session={...session,done:true,winner:session.playerName};}
          busy=false;waitingForOpponent=false;
          onlineStatus="相手が退出しました。";
          repaint();return;
        }
        if(msg.type==="gen9-room-error"||msg.type==="error"){
          errorText=msg.message||"オンライン対戦でエラーが発生しました。";
          busy=false;waitingForOpponent=false;repaint();return;
        }
      });
      socket.addEventListener("close",()=>{
        if(onlineSocket===socket){
          onlineStatus="オンライン接続が切れました。";
          if(session?.kind==="online"&&!session.done)errorText="接続が切れたため、対戦を続けられません。";
          busy=false;waitingForOpponent=false;repaint();
        }
      });
    });
  }
  async function startRandomMatch(){
    const playerTeam=buildTeam();
    if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
    if(playerTeam.some(m=>!m.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
    team=selectedOwned();busy=true;errorText="";randomSearching=false;onlineMode="random";
    onlineStatus="ランダムマッチに接続しています…";repaint();
    try{
      const socket=await connectOnline();
      socket.send(JSON.stringify({type:"random-match-join",playerName:"プレイヤー",team:playerTeam}));
      randomSearching=true;busy=false;
      onlineStatus="マッチング中…";repaint();
    }catch(e){
      randomSearching=false;busy=false;
      errorText=e.message||String(e);
      onlineStatus="ランダムマッチに接続できませんでした。";
      repaint();
      throw e;
    }
  }
  function cancelRandomMatch(){
    if(onlineSocket&&onlineSocket.readyState===WebSocket.OPEN){
      try{onlineSocket.send(JSON.stringify({type:"random-match-cancel"}));}
      catch(e){errorText=e.message||String(e);}
    }
    randomSearching=false;busy=false;
    onlineStatus="検索をキャンセルしました。";
    repaint();
  }
  async function createOnlineRoom(){
    const playerTeam=buildTeam();
    if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
    if(playerTeam.some(m=>!m.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
    team=selectedOwned();busy=true;errorText="";randomSearching=false;onlineMode="private";onlineStatus="接続しています…";repaint();
    try{
      const socket=await connectOnline();
      socket.send(JSON.stringify({type:"create-gen9-room",playerName:"プレイヤー",team:playerTeam}));
      onlineStatus="ルームを作成しています…";
    }catch(e){errorText=e.message||String(e);busy=false;}
    repaint();
  }
  async function joinOnlineRoom(){
    const playerTeam=buildTeam();
    if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
    if(playerTeam.some(m=>!m.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
    const code=document.getElementById("g9-room-code")?.value?.trim().toUpperCase()||"";
    if(!/^[A-Z0-9]{6}$/.test(code))throw new Error("6文字のルームコードを入力してください。");
    team=selectedOwned();busy=true;errorText="";randomSearching=false;onlineMode="private";onlineStatus="ルームに参加しています…";repaint();
    try{
      const socket=await connectOnline();
      socket.send(JSON.stringify({type:"join-gen9-room",roomCode:code,playerName:"プレイヤー",team:playerTeam}));
    }catch(e){errorText=e.message||String(e);busy=false;repaint();}
  }
  async function start(){
    stopPreviewClock();
    errorText="";
    try{
      const playerTeam=buildTeam();
      if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
      if(playerTeam.some(mon=>!mon.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
      team=selectedOwned();
      busy=true;
      repaint();
      const result=await localEngineCall("start",{playerTeam,playerName:"プレイヤー"},45000);
      session={...result,logs:result.logs||[],kind:"cpu",playerName:"プレイヤー"};
      opponentName="CPU";
      gimmick="";
      if(session.request?.teamPreview){
        previewOrder=(session.request.side?.pokemon||[]).map((_,index)=>index);
        startPreviewClock();
      }
    }catch(error){
      const message=error?.message||String(error);
      if(shouldFallbackToStandardBattle(error)){
        errorText="Showdownのローカルエンジンを起動できませんでした。独自エンジンには自動で切り替えていません。\n"+message+"\n『不具合を診断する』で原因を確認してください。";
        diagnosticReport="Showdownの起動に失敗しました。通常バトル（独自エンジン）へ勝手に切り替えないようにしています。診断結果を確認してください。";
      }else{
        errorText=message;
        diagnosticReport="ローカルCPU対戦の開始に失敗しました。『不具合を診断する』でブラウザ内エンジンを確認できます。";
      }
    }finally{
      busy=false;
      repaint();
    }
  }
  async function act(action){
    if(!session||busy||waitingForOpponent||session.done)return;
    const isTeamChoice=Array.isArray(action?.teamOrder);
    const previousPlayer=activeIndex(session.request);
    const previousEnemy=activeIndex(session.opponentRequest);
    const ownSwitch=action?.switchTo!=null;
    if(isTeamChoice)stopPreviewClock();
    if(isTeamChoice&&session.kind==="online")onlineTeamOrder=action.teamOrder.slice();
    busy=true;
    errorText="";
    repaint();
    if(ownSwitch){await animateSwitchOut("player");if(session.kind==="online")onlineOutgoingPending=true;}
    if(session.kind==="online"){
      try{
        if(!onlineSocket||onlineSocket.readyState!==WebSocket.OPEN)throw new Error("オンライン接続が切れています。");
        onlineSocket.send(JSON.stringify({type:"gen9-action",action}));
        return;
      }catch(error){
        errorText=error.message||String(error);
        busy=false;
        repaint();
        return;
      }
    }
    try{
      const result=await localEngineCall("action",{action,cursor:session.logCursor||0});
      const nextPlayer=activeIndex(result.request);
      const nextEnemy=activeIndex(result.opponentRequest);
      const playerChanged=nextPlayer>=0&&previousPlayer!==nextPlayer;
      const enemyChanged=nextEnemy>=0&&previousEnemy!==nextEnemy;
      if(session.kind!=="online"&&!ownSwitch&&enemyChanged)await animateSwitchOut("enemy");
      if(isTeamChoice)team=(action.teamOrder||[]).map(index=>team[index]).filter(Boolean);
      session={...session,...result,kind:session.kind||"cpu",logs:[...(session.logs||[]),...(result.logs||[])]};
      gimmick="";
      repaint();
      if(session.kind!=="online"&&playerChanged)await animateSwitchIn("player");
      if(session.kind!=="online"&&enemyChanged)await animateSwitchIn("enemy");
    }catch(error){
      errorText=error?.message||String(error);
    }finally{
      busy=false;
      repaint();
    }
  }
  async function leave(){
    stopPreviewClock();
    if(onlineSocket){
      if(onlineSocket.readyState===WebSocket.OPEN){
        try{onlineSocket.send(JSON.stringify({type:"leave-gen9-room"}));}catch(_){}
        try{onlineSocket.close();}catch(_){}
      }
      onlineSocket=null;
    }else if(session?.kind!=="online"&&session){
      try{await localEngineCall("stop");}catch(_){}
    }
    if(session?.kind!=="online")stopLocalWorker();
    session=null;
    team=[];
    busy=false;
    gimmick="";
    waitingForOpponent=false;
    onlineRoomCode="";
    onlineStatus="";
    errorText="";
    randomSearching=false;
    onlineMode="private";
    open();
  }
  function installNav(){
    const sidebar=document.querySelector(".sidebar"),battle=sidebar?.querySelector('[data-page="battle"]');
    if(sidebar&&!sidebar.querySelector("[data-gen9-page]")&&battle){
      const b=document.createElement("button");b.type="button";b.className="nav-item";b.dataset.gen9Page="true";
      b.innerHTML="<span>⚔</span><b>全世代対戦</b><small>NATIONAL DEX</small>";
      battle.insertAdjacentElement("afterend",b);
    }
    const mobile=document.querySelector(".mobile-nav");
    if(mobile&&!mobile.querySelector("[data-gen9-page]")){
      const b=document.createElement("button");b.type="button";b.dataset.gen9Page="true";
      b.innerHTML="<span>⚔</span><small>全世代</small>";mobile.appendChild(b);
    }
    // Bind each navigation button directly. Do not rely only on delegated document clicks:
    // the base app and other patches also delegate navigation events.
    document.querySelectorAll("[data-gen9-page]").forEach(button=>{
      if(button.dataset.g9NavBound==="true")return;
      button.dataset.g9NavBound="true";
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        open();
      });
    });
  }
  const css=document.createElement("style");
  css.textContent=".g9{max-width:1160px;margin:auto;padding:clamp(12px,2vw,24px);color:#eef2ff}.g9 header{display:flex;justify-content:space-between;gap:15px;margin-bottom:18px}.g9 header small{font-size:10px;letter-spacing:.15em;color:#a4b3dc;font-weight:900}.g9 h1{font-size:clamp(25px,4vw,34px);margin:7px 0}.g9 header p,.g9-card>p,.g9-card p{font-size:11px;color:#acb9d8;line-height:1.65}.g9-badge{height:max-content;border:1px solid #899ef066;background:#6c80d322;padding:8px 12px;border-radius:30px;font-size:11px}.g9-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.g9-card{border:1px solid #8294d13d;border-radius:15px;padding:16px;background:linear-gradient(145deg,#202a4a,#141b32);min-width:0}.g9-card h2{font-size:15px;margin:0 0 9px}.g9-roster{display:grid;gap:7px;margin:14px 0}.g9-team{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:8px;background:#ffffff0b;border-radius:8px;padding:9px;font-size:12px}.g9-team span,.g9-team small{color:#aab8d7;font-size:10px}.g9-primary,.g9-secondary{border:0;border-radius:10px;padding:11px 13px;font-weight:900;cursor:pointer}.g9-primary{background:linear-gradient(110deg,#5e75e8,#899bff);color:white;width:100%;margin:8px 0}.g9-secondary{background:#303c61;color:#e7edff;border:1px solid #8596d94a;margin-top:10px}.g9 button:disabled{opacity:.42;cursor:not-allowed}.g9-spec{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid #ffffff12;font-size:12px}.g9-spec span{color:#aab8d7}.g9-arena{min-height:300px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(ellipse at 50% 45%,#355174,#17213e 70%)}.g9-arena small,.g9-opponent small{font-size:9px;letter-spacing:.16em;color:#afc0e9}.g9-arena h2{font-size:18px;margin:6px 0}.g9-hp{height:9px;background:#ffffff22;border-radius:20px;overflow:hidden;max-width:320px}.g9-hp i{display:block;height:100%;background:linear-gradient(90deg,#54dba2,#d7df7d)}.g9-arena p,.g9-opponent p{font-size:11px;color:#cad6f1}.g9-versus{text-align:center;font-size:56px;color:#b5cdf477}.g9-opponent{display:flex;flex-direction:column;align-items:flex-end;gap:5px}.g9-opponent b{font-size:17px}.g9-controls>div:first-child>p{color:#aeb9d6;font-size:11px}.g9-moves{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.g9-move{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:65px;text-align:left;padding:10px;border:1px solid #8498df55;border-radius:9px;background:#293555;color:#f2f5ff;cursor:pointer}.g9-move span{display:flex;flex-direction:column;gap:5px}.g9-move b{font-size:12px}.g9-move small,.g9-move strong{font-size:10px;color:#b7c5e8}.g9-tera{display:flex;gap:7px;align-items:center;font-size:11px;margin:10px 0}.g9-switch-area{margin-top:16px}.g9-switch-area>b{font-size:12px}.g9-switches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}.g9-switch{display:flex;flex-direction:column;gap:5px;text-align:left;min-width:0;background:#171f3b;border:1px solid #8092d044;border-radius:9px;padding:8px;color:#f0f3ff}.g9-switch b{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.g9-switch span,.g9-switch small{font-size:9px;color:#abb8d5}.g9-switch i{height:5px;border-radius:9px;background:#ffffff22;overflow:hidden}.g9-switch em{display:block;height:100%;background:#62d2a1}.g9-busy{color:#d1ddff!important}.g9-logs{margin-top:13px}.g9-logs>div{max-height:245px;overflow:auto;display:flex;flex-direction:column;gap:4px}.g9-logs p{margin:0;background:#ffffff09;border-radius:7px;padding:7px;font-size:11px;color:#dce5ff}.g9-result{text-align:center;padding:25px 5px}.g9-result h2{font-size:30px}.g9-error{margin-top:12px;padding:12px;border-radius:10px;background:#8e39411c;border:1px solid #e88b9b66;color:#ffdbe3;font-size:12px;white-space:pre-wrap}@media(max-width:760px){.g9-columns{grid-template-columns:1fr}.g9-switches{grid-template-columns:repeat(2,minmax(0,1fr))}.g9-arena{min-height:240px}}";
  css.textContent += ".g9-diagnostic{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;padding:12px;border-radius:9px;background:#0c1428;color:#e4edff;border:1px solid #8294d155;font-size:11px;line-height:1.8}";
  css.textContent += ".g9-preview-clock{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0;padding:13px;border:1px solid #91a8f066;border-radius:14px;background:linear-gradient(110deg,#26395b,#171f3c)}.g9-preview-clock>span{font-size:12px;color:#c4d1ee}.g9-preview-clock>strong{font-size:30px;letter-spacing:.08em;color:#fff;font-variant-numeric:tabular-nums}.g9-preview-clock>small{color:#83e9b8;font-weight:900}.g9-preview-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.g9-preview-heading{display:flex;justify-content:space-between;align-items:center}.g9-preview-heading h2{margin:0}.g9-preview-heading b{font-size:11px;color:#bfcaf0}.g9-preview-team{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.g9-preview-mon{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;padding:9px 5px;border:1px solid #8fa5e344;border-radius:10px;background:#0e1830;text-align:center}.g9-preview-mon b{font-size:11px;overflow-wrap:anywhere}.g9-preview-mon small{font-size:10px;color:#b4c3e4}.g9-preview-number{position:absolute;left:6px;top:5px;font-size:10px;color:#8fa7ff;font-weight:900}.g9-preview-art{width:100%;height:82px;display:flex;align-items:center;justify-content:center}.g9-preview-art img{max-width:100%;max-height:82px;object-fit:contain}.g9-order-controls{display:flex;gap:7px}.g9-order-controls button{width:27px;height:25px;border:1px solid #7e93d866;border-radius:7px;background:#34466f;color:#fff;font-weight:900}.g9-order-controls button:disabled{opacity:.25}.g9-order-fixed{font-size:8px;color:#79e7b3;font-weight:900}.g9-preview-ready{padding:12px;border-radius:9px;background:#174c3a66;color:#8df2bd;font-weight:900;text-align:center}.g9-preview-note{font-size:11px;text-align:center;color:#adbce0}.g9-active-sprite{height:112px;display:flex;align-items:center;justify-content:center;margin:8px 0}.g9-active-sprite img{max-height:112px;max-width:min(190px,100%);object-fit:contain;transition:opacity .15s}.g9-arena-side{display:flex;flex-direction:column;min-width:0}.g9-arena-side.enemy{align-items:flex-end}.g9-arena-side.player{align-items:flex-start}.g9-switch-art{height:38px;display:flex;align-items:center;justify-content:center}.g9-switch-art img{max-width:42px;max-height:38px;object-fit:contain}.g9-switch-ball{position:fixed;z-index:100001;width:32px;height:32px;border:2px solid #26324d;border-radius:50%;background:linear-gradient(#f04b62 0 48%,#18243c 49% 54%,#eef4ff 55% 100%);box-shadow:0 0 16px #fff8;pointer-events:none}.g9-switch-ball:after{content:\" \";position:absolute;left:10px;top:10px;width:9px;height:9px;border:2px solid #26324d;border-radius:50%;background:#fff}.g9-preview .g9-primary{margin-top:6px}@media(max-width:760px){.g9-preview-columns{grid-template-columns:1fr}.g9-preview-team{grid-template-columns:repeat(2,minmax(0,1fr))}.g9-preview-clock{flex-wrap:wrap}.g9-active-sprite{height:86px}.g9-active-sprite img{max-height:86px}}";
  // Keep move names and PP readable while the turn is resolving; disabled state still blocks input.
  css.textContent += ".g9 .g9-move:disabled{opacity:1!important;filter:saturate(.62) brightness(.94);cursor:not-allowed}.g9 .g9-move:disabled b{color:#f2f5ff}.g9 .g9-move:disabled small,.g9 .g9-move:disabled strong{color:#c4d0ed}";
  document.head.appendChild(css);
  const onlineCss=document.createElement("style");
  onlineCss.textContent=".g9-online{margin-top:13px}.g9-match-mode{border-top:1px solid #ffffff18;padding-top:12px;margin-top:13px}.g9-match-mode h3{font-size:13px;margin:0 0 5px}.g9-match-mode p{font-size:11px;color:#acb9d8;line-height:1.6}.g9-online-row{display:flex;gap:8px;align-items:center;margin-top:9px}.g9-online-row .g9-primary,.g9-online-row .g9-secondary{margin:0;width:auto}.g9-online-row input{flex:1;min-width:0;border:1px solid #8395d65c;border-radius:9px;padding:11px;background:#10182f;color:#eef2ff;text-transform:uppercase}.g9-room-code{display:flex;align-items:center;gap:12px;background:#ffffff0b;border:1px dashed #8598df66;border-radius:10px;padding:10px 12px;margin:10px 0}.g9-room-code b{font-size:25px;letter-spacing:.18em;color:#fff}.g9-room-code small,.g9-online-status{font-size:11px;color:#b9c8ef}.g9-online-status{margin:8px 0}";
document.head.appendChild(onlineCss);
  const gimmickCss=document.createElement("style");
  gimmickCss.textContent=".g9-gimmicks{display:grid;gap:7px;margin:10px 0}.g9-gimmicks>b{font-size:11px}.g9-gimmicks>div{display:flex;flex-wrap:wrap;gap:7px}.g9-gimmick{border:1px solid #91a6ed66;background:#1a2542;color:#eaf0ff;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:800;cursor:pointer}.g9-gimmick.selected{background:#5268c7;border-color:#c3d0ff;box-shadow:0 0 0 2px #9aabff33}.g9-gimmick:disabled{opacity:.45;cursor:not-allowed}.g9-gimmicks small{font-size:10px;color:#aebbd8}";
  document.head.appendChild(gimmickCss);
  document.addEventListener("click",event=>{
    const nav=event.target.closest("[data-gen9-page]");
    if(nav&&nav.dataset.g9NavBound!=="true"){event.preventDefault();event.stopImmediatePropagation();open();return;}
    const b=event.target.closest("[data-g9]");if(!b)return;
    const kind=b.dataset.g9;
    if(kind==="gimmick"){const mode=b.dataset.mode||"";gimmick=gimmick===mode?"":mode;repaint();return;}
    if(kind==="team-up"||kind==="team-down"){
      const index=Number(b.dataset.index),next=index+(kind==="team-up"?-1:1);
      if(Number.isInteger(index)&&next>=0&&next<previewOrder.length){
        [previewOrder[index],previewOrder[next]]=[previewOrder[next],previewOrder[index]];
        repaint();
      }
      return;
    }
    if(kind==="team-ready"){void act({teamOrder:previewOrder.slice()});return;}
    if(kind==="diagnose"){void runDiagnostic();return;}
    if(kind==="standard-battle"){event.preventDefault();event.stopImmediatePropagation();switchToStandardBattle("ホームの通常バトルへ移動しました。全世代Showdown対戦はそのまま残っています。");return;}
    event.preventDefault();event.stopImmediatePropagation();
    if(kind==="start"||(kind==="new"&&session?.kind!=="online"))void start();
    else if(kind==="new"&&session?.kind==="online")void leave();
    else if(kind==="random-match")void startRandomMatch().catch(e=>{errorText=e.message||String(e);busy=false;repaint();});
    else if(kind==="random-cancel")cancelRandomMatch();
    else if(kind==="create-room")void createOnlineRoom().catch(e=>{errorText=e.message||String(e);busy=false;repaint();});
    else if(kind==="join-room")void joinOnlineRoom().catch(e=>{errorText=e.message||String(e);busy=false;repaint();});
    else if(kind==="leave")void leave();
    else if(kind==="forfeit"){
      if(session?.kind==="online"&&onlineSocket?.readyState===WebSocket.OPEN)onlineSocket.send(JSON.stringify({type:"gen9-forfeit"}));
      else void leave();
    }
    else if(kind==="move")void act({moveIndex:Number(b.dataset.index),gimmick});
    else if(kind==="switch")void act({switchTo:Number(b.dataset.index)});
  },true);
  installNav();
  fetch("./data/showdown-catalog.json",{cache:"force-cache"})
    .then(response=>{
      if(!response.ok)throw new Error("ローカルShowdownカタログを読み込めません。");
      return response.json();
    })
    .then(catalog=>{
      const data=S()?.data;
      if(!data||!Array.isArray(catalog.items))return;
      const itemsById=Object.fromEntries(catalog.items.filter(item=>item?.id&&item?.name).map(item=>[item.id,item]));
      data.showdownCatalog={itemsById,items:catalog.items};
      data.itemsById=itemsById;
      data.itemsList=catalog.items;
      data.itemsSource="local-showdown-data";
      if(data.upstreamMechanics&&typeof data.upstreamMechanics==="object"){
        data.upstreamMechanics.itemsById=itemsById;
      }
      const status=document.getElementById("upstream-fetch-status");
      if(status&&!status.textContent.includes("持ち物")){
        status.textContent+=" · 内蔵Showdown持ち物 "+catalog.items.length+"件";
      }
      console.info("[v31] Local Showdown item catalog loaded:",catalog.items.length);
    }).catch(error=>console.warn("[v31] Local Showdown catalog unavailable:",error));
  W.PokemonChampions2DGen9={version:"33.0.1",format:"gen9nationaldexag",engine:"@pkmn/sim browser worker",cpu:"local",online:"server WebSocket",dex:"National Dex",mechanics:["Mega Evolution","Terastallization"],open,createOnlineRoom,joinOnlineRoom,switchToStandardBattle};
console.info("[v33.1] Disabled move buttons stay readable during turn resolution.");
})();
