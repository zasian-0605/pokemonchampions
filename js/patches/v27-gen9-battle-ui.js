/* v28: National Dex battles on the server-side Pokémon Showdown simulator. */
(() => {
  "use strict";
  const W=window, APP=()=>W.PokemonChampions2D, S=()=>APP()?.state, API="/api/gen9";
  const statusJa={brn:"やけど",par:"まひ",slp:"ねむり",frz:"こおり",psn:"どく",tox:"もうどく"};
  let session=null, team=[], busy=false, errorText="", gimmick="", onlineSocket=null, onlineRoomCode="", onlineStatus="", waitingForOpponent=false, opponentName="CPU", diagnosticBusy=false, diagnosticReport="";
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const idOf=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  async function api(path,options){
    const r=await fetch(API+path,{...(options||{}),headers:{"Content-Type":"application/json",...((options||{}).headers||{})},cache:"no-store"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||"対戦サーバーとの通信に失敗しました。");
    return data;
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
      level:Number(m.level||50),moves:(m.moves||[]).slice(0,4).map(x=>typeof x==="string"?x:x?.id).filter(Boolean),
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
    if(tag==="-boost"||tag==="-unboost")return n+" の"+(stats[f[3]]||f[3])+(tag==="-boost"?"が上がった！":"が下がった！");
    if(tag==="-crit")return "急所に当たった！";
    if(tag==="-supereffective")return "効果はばつぐんだ！";
    if(tag==="-resisted")return "効果はいまひとつのようだ…";
    if(tag==="-immune")return n+" には効果がないようだ…";
    if(tag==="-miss")return "しかし攻撃は外れた！";
    if(tag==="-fail")return "しかしうまく決まらなかった！";
    if(tag==="-weather")return "天候が変化した："+f[2];
    if(tag==="-terastallize")return n+" は"+f[3]+"タイプにテラスタルした！";
    if(tag==="-activate")return n+" の効果が発動！ "+(f[3]||"");
    if(tag==="cant")return n+" は行動できなかった。";
    if(tag==="win")return f[2]+" の勝利！";
    if(tag==="tie")return "引き分け！";
    if(tag==="-sidestart"||tag==="-fieldstart")return "場に効果が発生："+(f[3]||f[2]);
    if(tag==="-sideend"||tag==="-fieldend")return "場の効果が終了："+(f[3]||f[2]);
    return "";
  }
  function renderSwitches(request){
    return (request?.side?.pokemon||[]).map((p,i)=>{
      const h=hpOf(p.condition),blocked=p.active||/fnt/i.test(p.condition||"");
      const title=team[i]?.name||nameOf(p.ident);
      return '<button class="g9-switch" data-g9="switch" data-index="'+i+'" '+(blocked||busy||waitingForOpponent?"disabled":"")+'><b>'+esc(title)+'</b><span>'+esc(h.text)+'</span><i><em style="width:'+h.pct+'%"></em></i><small>'+(p.active?"場に出ている":blocked?"ひんし":"交代する")+'</small></button>';
    }).join("");
  }
  function renderOnlinePanel(){
    const code=onlineRoomCode ? '<div class="g9-room-code"><small>ルームコード</small><b>'+esc(onlineRoomCode)+'</b></div>' : "";
    const status=onlineStatus ? '<p class="g9-online-status">'+esc(onlineStatus)+'</p>' : "";
    const disabled=busy ? "disabled" : "";
    return `<section class="g9-card g9-online"><h2>オンライン対戦（全世代）</h2><p>ルームコードを共有して、別のプレイヤーと全国図鑑ルールのシングル対戦をします。両方のプレイヤーが行動を選ぶとターンが進みます。</p>${status}${code}<div class="g9-online-row"><button class="g9-primary" data-g9="create-room" ${disabled}>ルームを作成</button></div><div class="g9-online-row"><input id="g9-room-code" maxlength="6" placeholder="6文字のルームコード" value=""><button class="g9-secondary" data-g9="join-room" ${disabled}>ルームに参加</button></div></section>`;
  }
  async function runDiagnostic(){
    if(diagnosticBusy)return;
    diagnosticBusy=true;diagnosticReport="診断を開始します…";repaint();
    const lines=[];
    const check=(name,ok,detail)=>lines.push((ok?"OK":"NG")+"｜"+name+"："+detail);
    try{
      const healthResponse=await fetch(API+"/health",{cache:"no-store"});
      const health=await healthResponse.json().catch(()=>({}));
      check("対戦サーバー",healthResponse.ok&&health.ok===true,healthResponse.ok?(health.engine||"応答あり"):"HTTP "+healthResponse.status+" "+(health.error||"応答エラー"));
      if(!healthResponse.ok||!health.ok)throw new Error("対戦サーバーのヘルスチェックに失敗しました。");
      const catalogResponse=await fetch(API+"/catalog",{cache:"no-store"});
      const catalog=await catalogResponse.json().catch(()=>({}));
      check("技・特性・持ち物データ",catalogResponse.ok&&Array.isArray(catalog.moves)&&Array.isArray(catalog.abilities)&&Array.isArray(catalog.items),catalogResponse.ok?("技 "+(catalog.counts?.moves??catalog.moves?.length??0)+" / 特性 "+(catalog.counts?.abilities??catalog.abilities?.length??0)+" / 持ち物 "+(catalog.counts?.items??catalog.items?.length??0)):"HTTP "+catalogResponse.status+" "+(catalog.error||"取得失敗"));
      if(!catalogResponse.ok)throw new Error("カタログ取得に失敗しました。");
      const playerTeam=buildTeam();
      check("チーム編成",playerTeam.length>0&&playerTeam.length<=6,playerTeam.length+"匹");
      if(!playerTeam.length)throw new Error("ポケモンが選ばれていません。");
      const noMoves=playerTeam.filter(m=>!m.moves?.length);
      check("技設定",noMoves.length===0,noMoves.length?noMoves.map(m=>m.name||m.species).join("、")+" に技がありません":"全員に技あり");
      if(noMoves.length)throw new Error("技を覚えていないポケモンがいます。");
      diagnosticReport=lines.join("\n")+"\n\n対戦開始テスト中…";repaint();
      const battleResponse=await fetch(API+"/battles",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({playerTeam,playerName:"診断テスト"})});
      const battle=await battleResponse.json().catch(()=>({}));
      if(!battleResponse.ok){check("対戦開始テスト",false,"HTTP "+battleResponse.status+"："+(battle.error||battle.message||"詳細不明"));throw new Error("対戦開始テストが失敗しました。");}
      check("対戦開始テスト",true,"Showdownが対戦を作成できました");
      if(battle.battleId&&battle.token){try{await fetch(API+"/battles/"+encodeURIComponent(battle.battleId)+"?token="+encodeURIComponent(battle.token),{method:"DELETE",cache:"no-store"});check("テスト対戦の後片付け",true,"テスト用対戦を終了しました");}catch(_){check("テスト対戦の後片付け",false,"自動終了できませんでした");}}
      diagnosticReport=lines.join("\n")+"\n\n診断結果：対戦開始まで正常です。";
    }catch(e){diagnosticReport=lines.join("\n")+"\n\n診断停止："+(e?.message||String(e));}
    finally{diagnosticBusy=false;repaint();}
  }
  function render(){
    if(!session){
      const roster=buildTeam();
      const items=roster.map((m,i)=>'<div class="g9-team"><span>'+(i+1)+'</span><b>'+esc(m.name||m.species)+'</b><small>Lv.'+m.level+' · '+m.moves.length+'技</small></div>').join("");
      return '<section class="g9"><header><div><small>SHOWDOWN SIMULATOR · NATIONAL DEX</small><h1>全世代バトル</h1><p>第1〜9世代のポケモン・技・特性・持ち物に対応。メガシンカとテラスタルはShowdownで処理します。ダイマックスは第8世代専用のため、この試合形式では未対応です。</p></div><b class="g9-badge">GEN 1–9</b></header><div class="g9-columns"><section class="g9-card"><h2>自分のチーム</h2><p>編成画面で選んだチームを使います。未選択ならボックスの先頭から最大6匹です。</p><div class="g9-roster">'+(items||"ポケモンをスカウトしてください。")+'</div><button class="g9-primary" data-g9="start" '+(!roster.length||busy?"disabled":"")+'>'+(busy?"準備中…":"全世代CPU対戦を開始")+'</button><p>CPUはShowdownの第9世代ランダムチーム生成機能を使用します。プレイヤーは全国図鑑のポケモンを選んで対戦できます。</p></section><section class="g9-card"><h2>対戦ルール</h2><div class="g9-spec"><span>図鑑</span><b>第1〜9世代（National Dex）</b></div><div class="g9-spec"><span>形式</span><b>シングル 6対6</b></div><div class="g9-spec"><span>ルール</span><b>Gen 9 National Dex AG</b></div><div class="g9-spec"><span>ギミック</span><b>メガシンカ・テラスタル</b></div><p>大会向けの使用制限を外した全国図鑑ルールです。ダイマックスも同じ試合に混ぜるにはShowdown本体の追加改造が必要です。</p></section></div><button class="g9-secondary" data-g9="diagnose" '+(diagnosticBusy?"disabled":"")+'>'+(diagnosticBusy?"診断中…":"不具合を診断する")+'</button>'+(diagnosticReport?'<pre class="g9-diagnostic">'+esc(diagnosticReport)+'</pre>':"")+renderOnlinePanel()+(errorText?'<div class="g9-error">'+esc(errorText)+'</div>':"")+'</section>';
    }
    const req=session.request||{},active=req.active?.[0]||{},list=req.side?.pokemon||[];
    const activeIndex=list.findIndex(x=>x.active),mon=activeIndex>=0?list[activeIndex]:null;
    const monName=mon?(team[activeIndex]?.name||nameOf(mon.ident)):"交代を選択";
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
    return '<section class="g9"><header><div><small>NATIONAL DEX · TURN '+(session.turn||"")+'</small><h1>全世代バトル</h1><p>'+(done?"対戦終了":(waitingForOpponent?"相手の行動待ち":"Showdownエンジンが行動を判定中"))+'</p></div><b class="g9-badge">'+(done?"RESULT":"BATTLE")+'</b></header><div class="g9-columns"><section class="g9-card g9-arena"><div><small>PLAYER</small><h2>'+esc(monName)+'</h2><div class="g9-hp"><i style="width:'+hp.pct+'%"></i></div><p>'+esc(hp.text)+(mon?.status?" · "+esc(statusJa[mon.status]||mon.status):"")+'</p></div><div class="g9-versus">⚔</div><div class="g9-opponent"><small>OPPONENT</small><b>'+esc(opponentName)+'</b><p>Showdownバトル</p></div></section><section class="g9-card g9-controls">'+(done?'<div class="g9-result"><h2>'+result+'</h2><button class="g9-primary" data-g9="new">もう一度対戦</button><button class="g9-secondary" data-g9="leave">終了して戻る</button></div>':'<div><h2>'+(forced?"交代してください":esc(monName)+" の行動")+'</h2><p>'+(forced?"ひんしになったため、交代が必要です。":"技を選択してください。")+'</p>'+(forced?"":'<div class="g9-moves">'+(moves||"使用できる技がありません。")+'</div>')+gimmickPanel+'</div><div class="g9-switch-area"><b>交代</b><div class="g9-switches">'+renderSwitches(req)+'</div></div>'+(busy?'<p class="g9-busy">Showdownがターンを処理中…</p>':"")+'<button class="g9-secondary" data-g9="forfeit" '+(busy?"disabled":"")+' >降参する</button><button class="g9-secondary" data-g9="leave" '+(busy?"disabled":"")+' >対戦を終了</button>')+'</section></div><section class="g9-card g9-logs"><h2>バトルログ</h2><div>'+(logs||"<p>バトルログを待っています…</p>")+'</div></section>'+(errorText?'<div class="g9-error">'+esc(errorText)+'</div>':"")+'</section>';
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
        if(msg.type==="gen9-room-created"){
          onlineRoomCode=msg.roomCode;
          onlineStatus="相手の参加を待っています。ルームコードを共有してください。";
          busy=false;repaint();return;
        }
        if(msg.type==="gen9-match-ready"){
          onlineRoomCode=msg.roomCode;
          opponentName=msg.opponent||"対戦相手";
          session={...msg.snapshot,kind:"online",side:msg.side,playerName:msg.playerName||"プレイヤー",opponentName};
          team=selectedOwned();waitingForOpponent=false;busy=false;gimmick="";
          onlineStatus="オンライン対戦中";
          repaint();return;
        }
        if(msg.type==="gen9-action-accepted"){
          busy=false;waitingForOpponent=true;
          onlineStatus="相手の行動を待っています…";
          repaint();return;
        }
        if(msg.type==="gen9-battle-update"&&msg.snapshot){
          const snap=msg.snapshot;
          session={...session,...snap,kind:"online",logs:[...(session?.logs||[]),...(snap.logs||[])]};
          busy=false;waitingForOpponent=false;gimmick="";
          onlineStatus=session.done?"対戦終了":"オンライン対戦中";
          repaint();return;
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
  async function createOnlineRoom(){
    const playerTeam=buildTeam();
    if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
    if(playerTeam.some(m=>!m.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
    team=selectedOwned();busy=true;errorText="";onlineStatus="接続しています…";repaint();
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
    team=selectedOwned();busy=true;errorText="";onlineStatus="ルームに参加しています…";repaint();
    try{
      const socket=await connectOnline();
      socket.send(JSON.stringify({type:"join-gen9-room",roomCode:code,playerName:"プレイヤー",team:playerTeam}));
    }catch(e){errorText=e.message||String(e);busy=false;repaint();}
  }
  async function start(){
    errorText="";
    try{
      const playerTeam=buildTeam();
      if(!playerTeam.length)throw new Error("先にポケモンをスカウトしてください。");
      if(playerTeam.some(m=>!m.moves.length))throw new Error("技を覚えていないポケモンがいます。先に技を設定してください。");
      team=selectedOwned();busy=true;repaint();
      const x=await api("/battles",{method:"POST",body:JSON.stringify({playerTeam,playerName:"プレイヤー"})});
      session={...x,logs:x.logs||[],playerName:"プレイヤー"};gimmick="";
    }catch(e){errorText=e.message||String(e);}
    finally{busy=false;repaint();}
  }
  async function act(action){
    if(!session||busy||waitingForOpponent||session.done)return;
    busy=true;errorText="";repaint();
    if(session.kind==="online"){
      try{
        if(!onlineSocket||onlineSocket.readyState!==WebSocket.OPEN)throw new Error("オンライン接続が切れています。");
        onlineSocket.send(JSON.stringify({type:"gen9-action",action}));
        return;
      }catch(e){errorText=e.message||String(e);busy=false;repaint();return;}
    }
    try{
      const x=await api("/battles/"+encodeURIComponent(session.battleId)+"/action",{method:"POST",body:JSON.stringify({token:session.token,action,cursor:session.logCursor||0})});
      session={...session,...x,logs:[...(session.logs||[]),...(x.logs||[])]};gimmick="";
    }catch(e){errorText=e.message||String(e);}
    finally{busy=false;repaint();}
  }
  async function leave(){
    if(onlineSocket){
      if(onlineSocket.readyState===WebSocket.OPEN){
        try{onlineSocket.send(JSON.stringify({type:"leave-gen9-room"}));}catch(_){}
        try{onlineSocket.close();}catch(_){}
      }
      onlineSocket=null;
    }else if(session?.kind!=="online"&&session){
      try{await api("/battles/"+encodeURIComponent(session.battleId)+"?token="+encodeURIComponent(session.token),{method:"DELETE"});}catch(_){}
    }
    session=null;team=[];busy=false;gimmick="";waitingForOpponent=false;onlineRoomCode="";onlineStatus="";errorText="";open();
  }
  function installNav(){
    if(document.querySelector("[data-gen9-page]"))return;
    const sidebar=document.querySelector(".sidebar"),battle=sidebar?.querySelector('[data-page="battle"]');
    if(sidebar&&battle){const b=document.createElement("button");b.type="button";b.className="nav-item";b.dataset.gen9Page="true";b.innerHTML="<span>⚔</span><b>全世代対戦</b><small>NATIONAL DEX</small>";battle.insertAdjacentElement("afterend",b);}
    const mobile=document.querySelector(".mobile-nav");
    if(mobile){const b=document.createElement("button");b.type="button";b.dataset.gen9Page="true";b.innerHTML="<span>⚔</span><small>全世代</small>";mobile.appendChild(b);}
  }
  const css=document.createElement("style");
  css.textContent=".g9{max-width:1160px;margin:auto;padding:clamp(12px,2vw,24px);color:#eef2ff}.g9 header{display:flex;justify-content:space-between;gap:15px;margin-bottom:18px}.g9 header small{font-size:10px;letter-spacing:.15em;color:#a4b3dc;font-weight:900}.g9 h1{font-size:clamp(25px,4vw,34px);margin:7px 0}.g9 header p,.g9-card>p,.g9-card p{font-size:11px;color:#acb9d8;line-height:1.65}.g9-badge{height:max-content;border:1px solid #899ef066;background:#6c80d322;padding:8px 12px;border-radius:30px;font-size:11px}.g9-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.g9-card{border:1px solid #8294d13d;border-radius:15px;padding:16px;background:linear-gradient(145deg,#202a4a,#141b32);min-width:0}.g9-card h2{font-size:15px;margin:0 0 9px}.g9-roster{display:grid;gap:7px;margin:14px 0}.g9-team{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:8px;background:#ffffff0b;border-radius:8px;padding:9px;font-size:12px}.g9-team span,.g9-team small{color:#aab8d7;font-size:10px}.g9-primary,.g9-secondary{border:0;border-radius:10px;padding:11px 13px;font-weight:900;cursor:pointer}.g9-primary{background:linear-gradient(110deg,#5e75e8,#899bff);color:white;width:100%;margin:8px 0}.g9-secondary{background:#303c61;color:#e7edff;border:1px solid #8596d94a;margin-top:10px}.g9 button:disabled{opacity:.42;cursor:not-allowed}.g9-spec{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid #ffffff12;font-size:12px}.g9-spec span{color:#aab8d7}.g9-arena{min-height:300px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(ellipse at 50% 45%,#355174,#17213e 70%)}.g9-arena small,.g9-opponent small{font-size:9px;letter-spacing:.16em;color:#afc0e9}.g9-arena h2{font-size:18px;margin:6px 0}.g9-hp{height:9px;background:#ffffff22;border-radius:20px;overflow:hidden;max-width:320px}.g9-hp i{display:block;height:100%;background:linear-gradient(90deg,#54dba2,#d7df7d)}.g9-arena p,.g9-opponent p{font-size:11px;color:#cad6f1}.g9-versus{text-align:center;font-size:56px;color:#b5cdf477}.g9-opponent{display:flex;flex-direction:column;align-items:flex-end;gap:5px}.g9-opponent b{font-size:17px}.g9-controls>div:first-child>p{color:#aeb9d6;font-size:11px}.g9-moves{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.g9-move{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:65px;text-align:left;padding:10px;border:1px solid #8498df55;border-radius:9px;background:#293555;color:#f2f5ff;cursor:pointer}.g9-move span{display:flex;flex-direction:column;gap:5px}.g9-move b{font-size:12px}.g9-move small,.g9-move strong{font-size:10px;color:#b7c5e8}.g9-tera{display:flex;gap:7px;align-items:center;font-size:11px;margin:10px 0}.g9-switch-area{margin-top:16px}.g9-switch-area>b{font-size:12px}.g9-switches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}.g9-switch{display:flex;flex-direction:column;gap:5px;text-align:left;min-width:0;background:#171f3b;border:1px solid #8092d044;border-radius:9px;padding:8px;color:#f0f3ff}.g9-switch b{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.g9-switch span,.g9-switch small{font-size:9px;color:#abb8d5}.g9-switch i{height:5px;border-radius:9px;background:#ffffff22;overflow:hidden}.g9-switch em{display:block;height:100%;background:#62d2a1}.g9-busy{color:#d1ddff!important}.g9-logs{margin-top:13px}.g9-logs>div{max-height:245px;overflow:auto;display:flex;flex-direction:column;gap:4px}.g9-logs p{margin:0;background:#ffffff09;border-radius:7px;padding:7px;font-size:11px;color:#dce5ff}.g9-result{text-align:center;padding:25px 5px}.g9-result h2{font-size:30px}.g9-error{margin-top:12px;padding:12px;border-radius:10px;background:#8e39411c;border:1px solid #e88b9b66;color:#ffdbe3;font-size:12px;white-space:pre-wrap}@media(max-width:760px){.g9-columns{grid-template-columns:1fr}.g9-switches{grid-template-columns:repeat(2,minmax(0,1fr))}.g9-arena{min-height:240px}}";
  css.textContent += ".g9-diagnostic{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;padding:12px;border-radius:9px;background:#0c1428;color:#e4edff;border:1px solid #8294d155;font-size:11px;line-height:1.8}";
  document.head.appendChild(css);
  const onlineCss=document.createElement("style");
  onlineCss.textContent=".g9-online{margin-top:13px}.g9-online-row{display:flex;gap:8px;align-items:center;margin-top:9px}.g9-online-row .g9-primary,.g9-online-row .g9-secondary{margin:0;width:auto}.g9-online-row input{flex:1;min-width:0;border:1px solid #8395d65c;border-radius:9px;padding:11px;background:#10182f;color:#eef2ff;text-transform:uppercase}.g9-room-code{display:flex;align-items:center;gap:12px;background:#ffffff0b;border:1px dashed #8598df66;border-radius:10px;padding:10px 12px;margin:10px 0}.g9-room-code b{font-size:25px;letter-spacing:.18em;color:#fff}.g9-room-code small,.g9-online-status{font-size:11px;color:#b9c8ef}.g9-online-status{margin:8px 0}";
document.head.appendChild(onlineCss);
  const gimmickCss=document.createElement("style");
  gimmickCss.textContent=".g9-gimmicks{display:grid;gap:7px;margin:10px 0}.g9-gimmicks>b{font-size:11px}.g9-gimmicks>div{display:flex;flex-wrap:wrap;gap:7px}.g9-gimmick{border:1px solid #91a6ed66;background:#1a2542;color:#eaf0ff;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:800;cursor:pointer}.g9-gimmick.selected{background:#5268c7;border-color:#c3d0ff;box-shadow:0 0 0 2px #9aabff33}.g9-gimmick:disabled{opacity:.45;cursor:not-allowed}.g9-gimmicks small{font-size:10px;color:#aebbd8}";
  document.head.appendChild(gimmickCss);
  document.addEventListener("click",event=>{
    const nav=event.target.closest("[data-gen9-page]");
    if(nav){event.preventDefault();event.stopImmediatePropagation();open();return;}
    const b=event.target.closest("[data-g9]");if(!b)return;
    const kind=b.dataset.g9;
    if(kind==="gimmick"){const mode=b.dataset.mode||"";gimmick=gimmick===mode?"":mode;repaint();return;}
    if(kind==="diagnose"){void runDiagnostic();return;}
    event.preventDefault();event.stopImmediatePropagation();
    if(kind==="start"||(kind==="new"&&session?.kind!=="online"))void start();
    else if(kind==="new"&&session?.kind==="online")void leave();
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
  api("/health").then(data=>console.info("[v28] National Dex battle server ready",data)).catch(e=>console.warn("[v28] National Dex battle server unavailable",e));
  api("/catalog").then(catalog=>{
    const data=S()?.data;
    if(!data||!Array.isArray(catalog.items))return;
    const itemsById=Object.fromEntries(catalog.items.filter(item=>item?.id&&item?.name).map(item=>[item.id,item]));
    data.showdownCatalog={itemsById,items:catalog.items};
    data.itemsById=itemsById;
    data.itemsList=catalog.items;
    data.itemsSource="pokemon-showdown-server";
    if(data.upstreamMechanics&&typeof data.upstreamMechanics==="object"){
      data.upstreamMechanics.itemsById=itemsById;
    }
    const status=document.getElementById("upstream-fetch-status");
    if(status&&!status.textContent.includes("持ち物")){
      status.textContent += " · Showdown持ち物 "+catalog.items.length+"件";
    }
    console.info("[v27] Showdown item catalog loaded:",catalog.items.length);
  }).catch(error=>console.warn("[v27] Showdown item catalog unavailable:",error));
W.PokemonChampions2DGen9={version:"28.0.0",format:"gen9nationaldexag",engine:"pokemon-showdown",dex:"National Dex",mechanics:["Mega Evolution","Terastallization"],open,createOnlineRoom,joinOnlineRoom};
console.info("[v28] National Dex battle UI bridge loaded.");
})();
