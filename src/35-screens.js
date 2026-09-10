/* ============================ screens ============================ */
function showScreen(html,wide){ card.className='card'+(wide?' wide':''); card.innerHTML=html; screenEl.classList.remove('hide'); }
function controlsHTML(){
  if(TOUCH)return '<p class="note" style="text-align:left;margin-top:18px">Left half of the screen: drag to move (push far to sprint). Right half: drag to look. '+
    'Hold <b>FIRE</b>; tap the ability, jump and reload buttons. Walk up to pods and portals in the lobby and tap the prompt. A controller works too.</p>';
  return '<div class="keys">'+
   '<div><span>Move</span><b><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></b></div>'+
   '<div><span>Look / aim</span><b>Mouse</b></div>'+
   '<div><span>Fire</span><b>Left click (hold)</b></div>'+
   '<div><span>Aim / free look</span><b>Right click / idle mouse</b></div>'+
   '<div><span>Ability</span><b><kbd>Q</kbd></b></div>'+
   '<div><span>Reload</span><b><kbd>R</kbd></b></div>'+
   '<div><span>Interact</span><b><kbd>E</kbd></b></div>'+
   '<div><span>Sprint / Jump</span><b><kbd>Shift</kbd> <kbd>Space</kbd></b></div>'+
   '<div><span>Menu</span><b><kbd>Esc</kbd> / <kbd>Tab</kbd></b></div>'+
   '</div>';
}
function charCardsHTML(){
  return '<div class="chars">'+CHARS.map((c,i)=>{
    const b=c.base;
    const lk=!unlocked(c);
    return '<div class="ch'+(i===run.charIdx?' sel':'')+(lk?' locked':'')+'" data-i="'+i+'"><div class="sw" style="background:'+(lk?'#3a4250':c.css)+'"></div>'+(lk?'<div class="lock">Locked &middot; '+c.unlock.label+'</div>':'')+
      '<h3>'+c.name+'</h3><div class="r">'+c.role+'</div><p>'+c.desc+'</p>'+
      '<div class="st"><span>Health <b>'+b.hp+'</b></span><span>Speed <b>'+b.speed+'</b></span><span>Damage <b>'+b.dmg+(b.pellets>1?'×'+b.pellets:'')+'</b></span><span>Mag <b>'+b.mag+'</b></span></div>'+
      '<p style="margin-top:10px"><b style="color:'+c.css+'">'+c.ability.name+'</b> — '+c.ability.desc+(c.passive?'<br><b style="color:var(--dim)">'+c.passive.name+'</b> — '+c.passive.desc:'')+'</p></div>';
  }).join('')+'</div>';
}
function bindCharCards(){ card.querySelectorAll('.ch').forEach(el=>{ el.onclick=()=>{ if(!unlocked(CHARS[parseInt(el.dataset.i)])){ SFX.empty(); return; } selectChar(parseInt(el.dataset.i),false); card.querySelectorAll('.ch').forEach(x=>x.classList.toggle('sel',x===el)); updatePodRings(); SFX.ui(); }; }); }

function showMenu(){
  state.mode='menu'; state.running=false; hud.classList.remove('on');
  if(document.pointerLockElement)document.exitPointerLock();
  clearWorld(); buildLobby(); avatar.visible=false;
  showScreen(
   '<h1>Ferrous <span>Arena</span></h1>'+
   '<div class="tag">Roguelite wave shooter &middot; best wave '+state.best+' &middot; best stage '+state.bestStage+(function(){ const b=save.get('meltdownBest',{}); const m=Math.max(0,...Object.values(b)); return m?' &middot; best meltdown '+m.toLocaleString():''; })()+'</div>'+
   controlsHTML()+
   '<button id="goLobby">Enter Lobby</button>'+
   '<div class="btns"><button class="ghost" id="goQuick">Quick deploy as '+CH().name+'</button><button class="ghost" id="goMelt" style="border-color:rgba(255,106,213,.5)">Meltdown Protocol</button></div>'+
   '<div class="btns"><button class="ghost" id="goTrials">Trials ('+trialMarks()+' / '+TRIALS.length+')</button><button class="ghost" id="goItems">Item codex</button></div>'+
   '<button class="ghost" id="goSettings">Settings</button>'+
   '<p class="note">Pick an operative in the lobby, warm up on the range, then deploy. A Warden boss arrives every '+BOSS_EVERY+' waves. Quality: '+(Q.auto?'auto ('+Q.tier+')':Q.tier)+'.</p>');
  $('goLobby').onclick=()=>{ goLobby(); enterPlay(); };
  $('goQuick').onclick=()=>{ goRun(); enterPlay(); };
  $('goMelt').onclick=()=>{ goRun(null,'meltdown'); enterPlay(); };
  $('goTrials').onclick=showTrials;
  $('goItems').onclick=showCodex;
  $('goSettings').onclick=()=>showSettings(showMenu);
}
function showSettings(back){
  const row=(id,label,val,min,max,step,fmt)=>'<div class="set"><span>'+label+'</span><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"><b id="'+id+'V">'+fmt(val)+'</b></div>';
  const pct=v=>Math.round(v*100)+'%', mult=v=>(+v).toFixed(2)+'×';
  showScreen('<h1>Settings</h1><div class="tag">Saved on this device</div>'+
    '<div class="seg"><span>Quality</span>'+['auto','high','medium','low'].map(q=>'<button data-q="'+q+'" class="'+((Q.auto?'auto':Q.tier)===q?'on':'')+'">'+q[0].toUpperCase()+q.slice(1)+(q==='auto'?' ('+Q.tier+')':'')+'</button>').join('')+'</div>'+
    '<div class="sets">'+
    row('sTouch','Touch look sensitivity',SETTINGS.touchSens,0.4,3,0.05,mult)+
    row('sMouse','Mouse sensitivity',SETTINGS.mouseSens,0.3,3,0.05,mult)+
    row('sPad','Controller sensitivity',SETTINGS.padSens,0.3,3,0.05,mult)+
    row('sVol','Volume',SETTINGS.volume,0,1,0.05,pct)+
    '</div>'+
    '<div class="seg"><span>Toggles</span><button data-t="invert" class="'+(SETTINGS.invertY?'on':'')+'">Invert Y</button>'+
    (TOUCH?'<button data-t="assist" class="'+(touch.assist?'on':'')+'">Aim assist</button><button data-t="auto" class="'+(touch.autoFire?'on':'')+'">Auto-fire</button>':'')+
    '<button data-t="shake" class="'+(SETTINGS.shake?'on':'')+'">Screen shake</button>'+
    '<button data-t="overlay" class="'+(dbgOn?'on':'')+'">FPS overlay</button></div>'+
    '<button id="back">Back</button>');
  card.querySelectorAll('.seg button[data-q]').forEach(b=>{ b.onclick=()=>{ setQuality(b.dataset.q); SFX.ui(); showSettings(back); }; });
  const bind=(id,key,fmt)=>{ const el=$(id); el.oninput=()=>{ SETTINGS[key]=parseFloat(el.value); $(id+'V').textContent=fmt(el.value); save.set(key,SETTINGS[key]); applySettings(); }; };
  bind('sTouch','touchSens',mult); bind('sMouse','mouseSens',mult); bind('sPad','padSens',mult); bind('sVol','volume',pct);
  $('sVol').onchange=()=>{ SFX.ui(); };
  card.querySelectorAll('.seg button[data-t]').forEach(b=>{ b.onclick=()=>{ const k=b.dataset.t;
    if(k==='invert'){ SETTINGS.invertY=!SETTINGS.invertY; save.set('invertY',SETTINGS.invertY); }
    else if(k==='assist'){ touch.assist=!touch.assist; save.set('aimassist',touch.assist); }
    else if(k==='auto'){ touch.autoFire=!touch.autoFire; save.set('autofire',touch.autoFire); }
    else if(k==='shake'){ SETTINGS.shake=!SETTINGS.shake; save.set('shake',SETTINGS.shake); }
    else if(k==='overlay'){ toggleDebug(); }
    SFX.ui(); showSettings(back); }; });
  $('back').onclick=back;
}
function showCodex(){
  const group=t=>'<div class="tierhead" style="color:'+TIER_CSS[t]+'">'+tierLabel(t)+' &middot; '+TIER_W[t]+'%</div><div class="itemlist">'+
    ITEMS.filter(it=>it.tier===t).map(it=>'<div><b style="color:'+it.color+'">'+it.code+'</b> &nbsp;<b>'+it.name+'</b> — '+it.desc+'</div>').join('')+'</div>';
  showScreen('<h1>Item <span>Codex</span></h1><div class="tag">Every item is a pick of one from three &middot; crates, drops, Wardens, the Fabricator</div>'+
    group('legendary')+group('rare')+group('common')+
    '<div class="tierhead" style="color:var(--gold)">Evolutions &middot; fuse an item at '+FUSE_STACKS+' stacks with a Forge Core (Wardens drop one)</div><div class="itemlist">'+
    ITEMS.filter(it=>EVOS[it.id]).map(it=>'<div><b style="color:'+it.color+'">'+it.code+'</b> &nbsp;<b>'+EVOS[it.id].name+'</b> — '+EVOS[it.id].desc+'</div>').join('')+'</div>'+
    '<div class="tierhead" style="color:var(--accent)">Ascensions &middot; one permanent mutation at stage 3, per run</div><div class="itemlist">'+
    CHARS.map(c=>ASCENSIONS[c.id]?ASCENSIONS[c.id].map(a=>'<div><b style="color:'+c.css+'">'+c.name+'</b> &nbsp;<b>'+a.name+'</b> — '+a.desc+'</div>').join(''):'').join('')+'</div>'+
    '<button class="ghost" id="back">Back</button>');
  $('back').onclick=showMenu;
}
function showLobbyPanel(){
  showScreen('<h1>Operative <span>Roster</span></h1><div class="tag">Click to select &middot; walk to a pod and press E in the lobby</div>'+
    charCardsHTML()+
    '<div class="btns"><button id="res">Back to lobby</button><button id="rng" class="ghost">Shooting range</button>'+
    '<button id="dep">Deploy &middot; Endless</button><button id="depM" style="background:linear-gradient(180deg,#ff8ae0,#c93fb0);color:#2a0620">Deploy &middot; Meltdown</button>'+
    '<button id="trials" class="ghost">Trials ('+trialMarks()+' / '+TRIALS.length+')</button><button id="menu" class="ghost">Main menu</button></div>',true);
  bindCharCards();
  $('res').onclick=enterPlay;
  $('rng').onclick=()=>{ goRange(); enterPlay(); };
  $('dep').onclick=()=>{ goRun(); enterPlay(); };
  $('depM').onclick=()=>{ goRun(null,'meltdown'); enterPlay(); };
  $('trials').onclick=showTrials;
  $('menu').onclick=showMenu;
}
function inventoryHTML(){
  const list=ITEMS.filter(it=>n(it.id)>0);
  if(!list.length)return '<p class="note">No items collected.</p>';
  return '<div class="inv">'+list.map(it=>'<span style="border-color:'+it.color+'55"><b>'+n(it.id)+'×</b> '+it.name+'</span>').join('')+'</div>';
}
function showPause(){
  const acc=state.acc.shots?Math.round(state.acc.hits/state.acc.shots*100):0;
  const isRun=state.mode==='run';
  showScreen(
   '<h1>Paused</h1><div class="tag">'+(isRun?'Systems holding':'Practice range')+'</div>'+
   (isRun?'<div class="tag" style="margin-top:10px">Stage '+state.stage+' · '+stageMap(state.stage).name+(state.mod?' · '+state.mod.name+' — '+state.mod.desc:'')+' · seed '+state.seed+'</div>'+
   '<div class="stats"><div><div class="k">Wave</div><div class="v">'+state.wave+'</div></div>'+
   '<div><div class="k">Stage</div><div class="v">'+state.stage+'</div></div>'+
   '<div><div class="k">Score</div><div class="v">'+state.score.toLocaleString()+'</div></div>'+
   '<div><div class="k">Kills</div><div class="v">'+state.kills+'</div></div>'+
   '<div><div class="k">Accuracy</div><div class="v">'+acc+'%</div></div>'+
   '<div><div class="k">Scrap</div><div class="v">'+state.scrap+'</div></div></div>'+inventoryHTML():controlsHTML())+
   '<button id="go">Resume</button>'+
   '<div class="btns"><button id="lob" class="ghost">'+(isRun?'Abandon run &middot; lobby':'Return to lobby')+'</button><button id="menu" class="ghost">Main menu</button></div>'+
   '<button id="settings" class="ghost">Settings</button>');
  $('go').onclick=enterPlay; $('settings').onclick=()=>showSettings(showPause);
  $('lob').onclick=()=>{ goLobby(); enterPlay(); };
  $('menu').onclick=showMenu;
}
function gameOver(){
  if(run.kind==='trial'){ state.running=false; state.over=true; player.alive=false; trialEnd(false,'Systems down'); return; }
  if(run.kind==='meltdown'){ const sc=meltdownScore(false); state.score=sc.total; const best=save.get('meltdownBest',{}); if(sc.total>(best[CH().id]||0)){ best[CH().id]=sc.total; save.set('meltdownBest',best); } }
  state.running=false; state.over=true; player.alive=false;
  if(document.pointerLockElement)document.exitPointerLock(); SFX.over();
  const acc=state.acc.shots?Math.round(state.acc.hits/state.acc.shots*100):0;
  showScreen(
   '<h1>Systems <span style="color:var(--hot)">Down</span></h1>'+
   '<div class="tag">'+(run.kind==='meltdown'?CH().name+' fell at '+Math.floor(state.md.charge*100)+'% reactor charge on '+stageMap(1).name+' &middot; '+state.md.banked+' shard'+(state.md.banked===1?'':'s')+' banked':CH().name+' fell on wave '+state.wave+', stage '+state.stage+' ('+stageMap(state.stage).name+') &middot; best wave '+state.best)+' &middot; seed '+state.seed+'</div>'+
   '<div class="stats"><div><div class="k">Score</div><div class="v">'+state.score.toLocaleString()+'</div></div>'+
   '<div><div class="k">Kills</div><div class="v">'+state.kills+'</div></div>'+
   '<div><div class="k">Wave</div><div class="v">'+state.wave+'</div></div>'+
   '<div><div class="k">Stage</div><div class="v">'+state.stage+'</div></div>'+
   '<div><div class="k">Accuracy</div><div class="v">'+acc+'%</div></div>'+
   '<div><div class="k">Items</div><div class="v">'+run.itemsTaken+'</div></div></div>'+inventoryHTML()+
   (run.kind==='meltdown'?scoreCodeHTML(encodeScoreCode({mode:MODE_IDS.meltdown,char:run.charIdx,seed:state.seed,score:state.score,detail:state.md.banked<<8})):'')+
   '<button id="go">Redeploy as '+CH().name+(run.kind==='meltdown'?' &middot; Meltdown':'')+'</button>'+
   '<div class="btns"><button id="same" class="ghost">Replay this seed</button><button id="lob" class="ghost">Return to lobby</button></div>'+
   '<button id="menu" class="ghost">Main menu</button>');
  hud.classList.remove('on'); bindCode();
  $('go').onclick=()=>{ goRun(null,run.kind); enterPlay(); };
  $('same').onclick=()=>{ goRun(state.seed,run.kind); enterPlay(); };
  $('lob').onclick=()=>{ goLobby(); enterPlay(); };
  $('menu').onclick=showMenu;
}
/* ---- Meltdown: extraction (the win screen), score code, trials list + result ---- */
function scoreCodeHTML(code){ return '<div class="code"><span class="k">Score code</span><b id="scCode">'+code+'</b><button class="ghost" id="scCopy">Copy</button></div>'; }
function bindCode(){ const b=$('scCopy'); if(!b)return; b.onclick=()=>{ const t=$('scCode').textContent; try{ navigator.clipboard.writeText(t); b.textContent='Copied'; }catch(e){ b.textContent=t; } SFX.ui(); }; }
function showExtracted(sc,prev,code){
  hud.classList.remove('on');
  showScreen('<h1>Extracted <span style="color:var(--good)">&#10003;</span></h1>'+
    '<div class="tag">'+CH().name+' reached the pad on '+stageMap(1).name+' &middot; '+(sc.total>prev?'new best':'best '+prev.toLocaleString())+' &middot; seed '+state.seed+'</div>'+
    '<div class="stats"><div><div class="k">Score</div><div class="v">'+sc.total.toLocaleString()+'</div></div>'+
    '<div><div class="k">Banked shards</div><div class="v">'+state.md.banked+' <small style="font-size:11px;color:var(--dim)">+'+sc.banked+'</small></div></div>'+
    '<div><div class="k">Held shards</div><div class="v">'+state.md.held+' <small style="font-size:11px;color:var(--dim)">+'+sc.held+'</small></div></div>'+
    '<div><div class="k">Kills</div><div class="v">'+state.kills+'</div></div>'+
    '<div><div class="k">Time bonus</div><div class="v">'+sc.time+'</div></div>'+
    '<div><div class="k">Items</div><div class="v">'+run.itemsTaken+(state.md.banked?' <small style="font-size:11px;color:var(--gold)">+1 banked</small>':'')+'</div></div></div>'+
    inventoryHTML()+scoreCodeHTML(code)+
    '<button id="go">Run it again &middot; Meltdown</button>'+
    '<div class="btns"><button id="lob" class="ghost">Return to lobby</button><button id="menu" class="ghost">Main menu</button></div>');
  bindCode();
  $('go').onclick=()=>{ goRun(null,'meltdown'); enterPlay(); };
  $('lob').onclick=()=>{ goLobby(); enterPlay(); };
  $('menu').onclick=showMenu;
}
function showTrials(){
  const marks=save.get('trials',{});
  showScreen('<h1>Trials</h1><div class="tag">Six timed challenges &middot; restricted loadouts &middot; '+trialMarks()+' of '+TRIALS.length+' marks</div>'+
    '<div class="trials">'+TRIALS.map(t=>'<button data-t="'+t.id+'" class="'+(marks[t.id]?'done':'')+'"><span>'+t.name+' <small>&middot; '+MAP_BY_ID[t.map].name+' &middot; '+t.time+' s'+(t.char?' &middot; '+CHARS.find(c=>c.id===t.char).name:'')+'</small></span><small>'+t.desc+'</small>'+(marks[t.id]?'<i>&#10003; mark earned</i>':'')+'</button>').join('')+'</div>'+
    '<button class="ghost" id="back">Back</button>',true);
  card.querySelectorAll('.trials button').forEach(b=>{ b.onclick=()=>{ goRun(null,'trial',b.dataset.t); enterPlay(); }; });
  $('back').onclick=state.mode==='lobby'?showLobbyPanel:showMenu;
}
function showTrialEnd(ok,why){
  const tr=state.trial, g=tr.def.goal; hud.classList.remove('on');
  showScreen('<h1>'+(ok?'Trial <span style="color:var(--good)">complete</span>':'Trial <span style="color:var(--hot)">failed</span>')+'</h1>'+
    '<div class="tag">'+tr.def.name+' &middot; '+(ok?'Trial Mark earned ('+trialMarks()+' / '+TRIALS.length+')':(why||'Time ran out'))+'</div>'+
    '<div class="stats"><div><div class="k">Goal</div><div class="v">'+(g.n!==undefined?tr.prog+' / '+g.n:(ok?'Survived':'Fell'))+'</div></div>'+
    '<div><div class="k">Time left</div><div class="v">'+Math.max(0,Math.ceil(tr.t))+' s</div></div>'+
    '<div><div class="k">Kills</div><div class="v">'+state.kills+'</div></div></div>'+
    '<button id="retry">'+(ok?'Run it again':'Retry')+'</button>'+
    '<div class="btns"><button id="list" class="ghost">All trials</button><button id="lob" class="ghost">Return to lobby</button></div>');
  $('retry').onclick=()=>{ goRun(null,'trial',tr.def.id); enterPlay(); };
  $('list').onclick=showTrials;
  $('lob').onclick=()=>{ goLobby(); enterPlay(); };
}
