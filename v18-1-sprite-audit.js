/* v18.1 Sprite audit: checks every species' front/back animated sprite URLs in the user's browser. */
(()=>{
 'use strict';
 if(window.__spriteAuditV181)return;window.__spriteAuditV181=true;
 const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isGif=u=>/\.gif(?:$|[?#])/i.test(u||'');
 const probe=(url,timeout=4000)=>new Promise(resolve=>{
  if(!url)return resolve(false);
  const im=new Image();let done=false;
  const finish=ok=>{if(done)return;done=true;im.onload=im.onerror=null;clearTimeout(timer);resolve(!!ok&&im.naturalWidth>0&&im.naturalHeight>0);};
  const timer=setTimeout(()=>finish(false),timeout);
  im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=url;
 });
 const candidates=(p,back,animated)=>{
  try{return [...new Set(spriteUrlCandidates(p,back,animated)||[])];}catch(_){return [];}
 };
 async function checkDirection(p,back){
  const anim=candidates(p,back,true).filter(isGif);
  let gifUrl='';
  for(const u of anim.slice(0,4)){if(await probe(u)){gifUrl=u;break;}}
  const still=candidates(p,back,false);
  let stillUrl='';
  if(!gifUrl){for(const u of still.slice(0,4)){if(await probe(u)){stillUrl=u;break;}}}
  return {animated:!!gifUrl,static:!!stillUrl,url:gifUrl||stillUrl||'',gifCandidates:anim.length};
 }
 const species=()=>Array.isArray(state?.data?.dex)?state.data.dex:[];
 let running=false,cancelled=false,latest=[];
 const renderResults=(rows)=>{
  const missing=rows.filter(x=>!x.front.animated&&!x.back.animated);
  const partial=rows.filter(x=>x.front.animated!==x.back.animated);
  const broken=rows.filter(x=>!x.front.animated&&!x.back.animated&&!x.front.static&&!x.back.static);
  const body=missing.map(x=>`<tr><td>${escHtml(x.jpName||x.name)}</td><td>${escHtml(x.name)}</td><td>${x.front.static?'静止画あり':'画像なし'}</td><td>${x.back.static?'静止画あり':'画像なし'}</td></tr>`).join('');
  const table=missing.length?`<div style="overflow:auto;max-height:420px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px">ポケモン</th><th style="text-align:left;padding:8px">ID</th><th style="padding:8px">前向き</th><th style="padding:8px">後ろ向き</th></tr></thead><tbody>${body}</tbody></table></div>`:'<p>全ポケモンに少なくとも片面のGIF候補が見つかったよ。</p>';
  const summary=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><span class="pill">検査 ${rows.length}匹</span><span class="pill">GIFなし両面 ${missing.length}匹</span><span class="pill">片面のみ ${partial.length}匹</span><span class="pill">画像なし両面 ${broken.length}匹</span></div>`;
  return `<div>${summary}<p class="muted tiny">「GIFあり」はGIF形式の画像URLが読み込めたという判定。複数フレームかどうかまではブラウザの画像読み込みだけでは保証できないよ。</p>${table}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-secondary" data-sprite-audit-csv>CSVを書き出す</button><button class="btn btn-ghost" data-sprite-audit-close>閉じる</button></div></div>`;
 };
 function csv(rows){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const lines=[['名前','ID','前GIF','後GIF','前静止画','後静止画','前URL','後URL'],...rows.map(x=>[x.jpName||x.name,x.id,x.front.animated?'あり':'なし',x.back.animated?'あり':'なし',x.front.static?'あり':'なし',x.back.static?'あり':'なし',x.front.url,x.back.url])];const blob=new Blob(['\ufeff'+lines.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pokemon_sprite_audit.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 async function run(){if(running)return;const dex=species();if(!dex.length){toast('図鑑データがまだ読み込まれていません。','warn');return;}running=true;cancelled=false;latest=[];const panel=document.querySelector('#sprite-audit-panel'),progress=panel?.querySelector('[data-sprite-audit-progress]'),out=panel?.querySelector('[data-sprite-audit-output]');if(!panel)return;
  panel.querySelector('[data-sprite-audit-start]')?.setAttribute('disabled','disabled');const total=dex.length*2;let done=0;const jobs=[];
  for(const p of dex){for(const back of [false,true])jobs.push({p,back});}
  let cursor=0;const worker=async()=>{while(!cancelled){const i=cursor++;if(i>=jobs.length)return;const j=jobs[i];const res=await checkDirection(j.p,j.back);const row=latest.find(x=>x.id===j.p.id)||{id:j.p.id,name:j.p.name,jpName:j.p.jpName||j.p.displayName,front:null,back:null};row[j.back?'back':'front']=res;if(!latest.includes(row))latest.push(row);done++;if(progress)progress.textContent=`画像を確認中… ${done}/${total} (${Math.floor(done/total*100)}%)`;if(done%10===0&&out)out.textContent=`GIFなし候補を集計中… ${latest.filter(x=>x.front&&!x.front.animated&&x.back&&!x.back.animated).length}匹`;
  }};
  await Promise.all(Array.from({length:16},worker));
  latest.sort((a,b)=>String(a.jpName||a.name).localeCompare(String(b.jpName||b.name),'ja'));
  if(out)out.innerHTML=renderResults(latest);if(progress)progress.textContent=cancelled?`中断：${done}/${total}方向を確認`:`完了：${dex.length}匹・${total}方向を確認`;
  panel.querySelector('[data-sprite-audit-start]')?.removeAttribute('disabled');running=false;
 }
 const prev=renderSettings;
 renderSettings=function(){let html=prev.apply(this,arguments);const panel=`<section class="panel" id="sprite-audit-panel" style="margin-top:18px"><div class="panel-head"><h2>🖼️ ポケモン画像診断（全図鑑）</h2><span class="pill">v18.1</span></div><div class="panel-body"><p class="muted small">全ポケモンの前向き・後ろ向き画像を実際に読み込み、GIFが見つからないポケモンを一覧にするよ。ネット接続が必要。</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn btn-primary" data-sprite-audit-start>全1,025匹を検査</button><span class="tiny muted" data-sprite-audit-progress>未検査</span></div><div class="tiny muted" data-sprite-audit-output style="margin-top:12px">検査開始ボタンを押してね。</div></div></section>`;return html.includes('id="sprite-audit-panel"')?html:html+panel;};
 document.addEventListener('click',e=>{if(e.target.closest('[data-sprite-audit-start]')){run();}if(e.target.closest('[data-sprite-audit-csv]'))csv(latest);if(e.target.closest('[data-sprite-audit-close]')){const p=document.querySelector('#sprite-audit-panel');if(p)p.querySelector('[data-sprite-audit-output]').textContent='検査結果を閉じたよ。';}});
 window.PokemonChampions2DData=window.PokemonChampions2DData||{};window.PokemonChampions2DData.runSpriteAudit=run;
})();
