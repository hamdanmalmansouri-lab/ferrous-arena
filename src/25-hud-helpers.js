/* ============================ HUD helpers ============================ */
function say(txt,cls){
  const s=document.createElement('span'); s.innerHTML=txt; if(cls)s.className=cls; feed.appendChild(s);
  setTimeout(()=>s.remove(),3000);
  while(feed.children.length>5)feed.firstChild.remove();
}
function showBanner(t,s,gold){ bnT.textContent=t; bnS.textContent=s; banner.classList.toggle('gold',!!gold);
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); }
function popHit(kill,crit){
  hitmark.classList.toggle('kill',!!kill); hitmark.classList.toggle('crit',!!crit&&!kill);
  hitmark.classList.remove('pop'); void hitmark.offsetWidth; hitmark.classList.add('pop');
}
function syncItems(){
  let h='';
  ITEMS.forEach(it=>{ const c=n(it.id); if(c>0)h+='<div class="it" title="'+it.name+': '+it.desc+'" style="color:'+it.color+';border-color:'+it.color+'55">'+it.code+'<small>'+c+'</small></div>'; });
  itemsEl.innerHTML=h;
}
function syncHUD(){
  const s=run.stats;
  uiWave.textContent=state.wave;
  uiLeft.textContent=enemies.length+state.spawnQueue;
  uiScore.textContent=state.score.toLocaleString();
  uiKills.textContent=state.kills;
  const nb=state.wave>0?(BOSS_EVERY-(state.wave%BOSS_EVERY))%BOSS_EVERY:BOSS_EVERY;
  uiBossIn.textContent=state.boss?'NOW':(nb===0?BOSS_EVERY:nb);
  const hp=Math.max(0,Math.round(player.hp));
  uiHp.textContent=hp; uiMaxHp.textContent=Math.round(s.maxHp);
  hpfill.style.width=(hp/s.maxHp*100)+'%'; hpfill.classList.toggle('low',hp/s.maxHp<=.35);
  shfill.style.width=Math.min(100,player.shield/s.maxHp*100)+'%';
  lowvig.style.opacity=(state.mode==='run'&&hp/s.maxHp<=.35)?(1-hp/s.maxHp/.35)*0.85:0;
  uiMag.textContent=player.mag;
  uiMag.classList.toggle('empty',player.mag===0);
  uiAmmoLbl.textContent=player.reloading>0?'Reloading':(player.mag+' / '+s.mag+(CH().id==='bulwark'?' shells':' mag'));
  uiChar.textContent=CH().name; lbChar.textContent=CH().name+' — '+CH().role;
  /* ability */
  const ab=CH().ability;
  abName.textContent=ab.name;
  if(player.abActive>0){ abKey.className='key active'; abFill.style.height='100%'; abState.textContent='Active '+player.abActive.toFixed(1)+'s'; }
  else if(player.abCd>0){ abKey.className='key'; abFill.style.height=((1-player.abCd/(ab.cd*s.cdMult))*100)+'%'; abState.textContent=player.abCd.toFixed(1)+'s'; }
  else { abKey.className='key ready'; abFill.style.height='100%'; abState.textContent='Ready'; }
  syncTouchHUD();
  /* boss */
  if(state.boss&&!state.boss.dead){ bossbar.classList.add('on'); const pc=Math.max(0,state.boss.hp/state.boss.maxHp*100); bossFill.style.width=pc+'%'; bossHpEl.textContent=Math.ceil(pc)+'%'; }
  else bossbar.classList.remove('on');
}
function syncRange(){
  const now=state.t; rangeStats.dmgLog=rangeStats.dmgLog.filter(d=>now-d.t<3);
  const dps=rangeStats.dmgLog.reduce((a,d)=>a+d.v,0)/3;
  rgDps.textContent=Math.round(dps); rgHits.textContent=rangeStats.hits; rgTargets.textContent=rangeStats.targets;
}
function setMode(m){
  state.mode=m; hud.dataset.mode=m;
  rangeEl.classList.toggle('on',m==='range');
  lobbytag.classList.toggle('on',m==='lobby');
  promptEl.classList.remove('on');
}
