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
    return '<div class="ch'+(i===run.charIdx?' sel':'')+'" data-i="'+i+'"><div class="sw" style="background:'+c.css+'"></div>'+
      '<h3>'+c.name+'</h3><div class="r">'+c.role+'</div><p>'+c.desc+'</p>'+
      '<div class="st"><span>Health <b>'+b.hp+'</b></span><span>Speed <b>'+b.speed+'</b></span><span>Damage <b>'+b.dmg+(b.pellets>1?'×'+b.pellets:'')+'</b></span><span>Mag <b>'+b.mag+'</b></span></div>'+
      '<p style="margin-top:10px"><b style="color:'+c.css+'">'+c.ability.name+'</b> — '+c.ability.desc+'</p></div>';
  }).join('')+'</div>';
}
function bindCharCards(){ card.querySelectorAll('.ch').forEach(el=>{ el.onclick=()=>{ selectChar(parseInt(el.dataset.i),false); card.querySelectorAll('.ch').forEach(x=>x.classList.toggle('sel',x===el)); updatePodRings(); SFX.ui(); }; }); }

function showMenu(){
  state.mode='menu'; state.running=false; hud.classList.remove('on');
  if(document.pointerLockElement)document.exitPointerLock();
  clearWorld(); buildLobby(); avatar.visible=false;
  showScreen(
   '<h1>Ferrous <span>Arena</span></h1>'+
   '<div class="tag">Roguelite wave shooter &middot; best wave '+state.best+' &middot; best stage '+state.bestStage+'</div>'+
   controlsHTML()+
   '<button id="goLobby">Enter Lobby</button>'+
   '<div class="btns"><button class="ghost" id="goQuick">Quick deploy as '+CH().name+'</button><button class="ghost" id="goItems">Item codex</button></div>'+
   '<button class="ghost" id="goSettings">Settings</button>'+
   '<p class="note">Pick an operative in the lobby, warm up on the range, then deploy. A Warden boss arrives every '+BOSS_EVERY+' waves. Quality: '+(Q.auto?'auto ('+Q.tier+')':Q.tier)+'.</p>');
  $('goLobby').onclick=()=>{ goLobby(); enterPlay(); };
  $('goQuick').onclick=()=>{ goRun(); enterPlay(); };
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
    '<button id="dep">Deploy now</button><button id="menu" class="ghost">Main menu</button></div>',true);
  bindCharCards();
  $('res').onclick=enterPlay;
  $('rng').onclick=()=>{ goRange(); enterPlay(); };
  $('dep').onclick=()=>{ goRun(); enterPlay(); };
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
  state.running=false; state.over=true; player.alive=false;
  if(document.pointerLockElement)document.exitPointerLock(); SFX.over();
  const acc=state.acc.shots?Math.round(state.acc.hits/state.acc.shots*100):0;
  showScreen(
   '<h1>Systems <span style="color:var(--hot)">Down</span></h1>'+
   '<div class="tag">'+CH().name+' fell on wave '+state.wave+', stage '+state.stage+' ('+stageMap(state.stage).name+') &middot; best wave '+state.best+' &middot; seed '+state.seed+'</div>'+
   '<div class="stats"><div><div class="k">Score</div><div class="v">'+state.score.toLocaleString()+'</div></div>'+
   '<div><div class="k">Kills</div><div class="v">'+state.kills+'</div></div>'+
   '<div><div class="k">Wave</div><div class="v">'+state.wave+'</div></div>'+
   '<div><div class="k">Stage</div><div class="v">'+state.stage+'</div></div>'+
   '<div><div class="k">Accuracy</div><div class="v">'+acc+'%</div></div>'+
   '<div><div class="k">Items</div><div class="v">'+run.itemsTaken+'</div></div></div>'+inventoryHTML()+
   '<button id="go">Redeploy as '+CH().name+'</button>'+
   '<div class="btns"><button id="same" class="ghost">Replay this seed</button><button id="lob" class="ghost">Return to lobby</button></div>'+
   '<button id="menu" class="ghost">Main menu</button>');
  hud.classList.remove('on');
  $('go').onclick=()=>{ goRun(); enterPlay(); };
  $('same').onclick=()=>{ goRun(state.seed); enterPlay(); };
  $('lob').onclick=()=>{ goLobby(); enterPlay(); };
  $('menu').onclick=showMenu;
}
