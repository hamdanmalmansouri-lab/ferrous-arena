/* ============================ HUD helpers ============================ */
function say(txt,cls){
  const s=document.createElement('span'); s.innerHTML=txt; if(cls)s.className=cls; feed.appendChild(s);
  setTimeout(()=>s.remove(),3000);
  while(feed.children.length>2)feed.firstChild.remove();   // two lines, bottom-centre
}
function showBanner(t,s,gold){ bnT.textContent=t; bnS.textContent=s; banner.classList.toggle('gold',!!gold);
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); }
function popHit(kill,crit){
  hitmark.classList.toggle('kill',!!kill); hitmark.classList.toggle('crit',!!crit&&!kill);
  hitmark.classList.remove('pop'); void hitmark.offsetWidth; hitmark.classList.add('pop');
}
function syncItems(){
  let h='';
  ITEMS.forEach(it=>{ const c=n(it.id); if(c>0){ const ev=run.evos[it.id]?EVOS[it.id]:null;
    h+='<div class="it t-'+(ev?'legendary evo':it.tier)+'" title="'+(ev?ev.name+': '+ev.desc:it.name+' ('+it.tier+'): '+it.desc)+'" style="color:'+it.color+';border-color:'+(ev?TIER_CSS.legendary:TIER_CSS[it.tier])+'">'+it.code+(ev?'<u>&#9733;</u>':'')+'<small>'+c+'</small></div>'; } });
  itemsEl.innerHTML=h;
}
function syncHUD(){
  const s=run.stats;
  uiWave.textContent=Math.max(1,state.wave);
  uiLeft.textContent=enemies.length; uiQueue.textContent=state.spawnQueue>0?' +'+state.spawnQueue:''; uiScrap.textContent=state.scrap;
  const nb=state.wave>0?(BOSS_EVERY-(state.wave%BOSS_EVERY))%BOSS_EVERY:BOSS_EVERY;
  uiBossIn.textContent=state.boss?'NOW':(nb===0?BOSS_EVERY:nb);
  const hp=Math.max(0,Math.round(player.hp));
  uiHp.textContent=hp; uiMaxHp.textContent=Math.round(s.maxHp);
  hpfill.style.width=(hp/s.maxHp*100)+'%'; hpfill.classList.toggle('low',hp/s.maxHp<=.35);
  shfill.style.width=Math.min(100,player.shield/s.maxHp*100)+'%';
  lowvig.style.opacity=(state.mode==='run'&&hp/s.maxHp<=.35)?(1-hp/s.maxHp/.35)*0.85:0;
  uiMag.textContent=player.mag;
  uiMag.classList.toggle('empty',player.mag===0);
  uiAmmoLbl.textContent=player.reloading>0?'Reloading':('/ '+s.mag+(CH().id==='bulwark'?' shells':' mag'));
  uiChar.textContent=CH().name; lbChar.textContent=CH().name+' — '+CH().role;
  /* ability */
  const ab=CH().ability;
  abName.textContent=ab.name;
  if(player.abActive>0){ abKey.className='key active'; abFill.style.height='100%'; abState.textContent='Active '+player.abActive.toFixed(1)+'s'; }
  else if(player.abCd>0){ abKey.className='key'; abFill.style.height=((1-player.abCd/(ab.cd*s.cdMult))*100)+'%'; abState.textContent=player.abCd.toFixed(1)+'s'; }
  else { abKey.className='key ready'; abFill.style.height='100%'; abState.textContent=player.abStock>1?'Ready x'+player.abStock:'Ready'; }
  if(player.abCd>0&&player.abStock>0&&player.abActive<=0){ abKey.className='key ready'; abState.textContent='x'+player.abStock+' \u00b7 '+player.abCd.toFixed(1)+'s'; }
  syncTouchHUD(); syncCompass();
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

/* compass strip: relative bearing of crates, items, the boss and an open portal */
function syncCompass(){
  if(state.mode!=='run'){ compassEl.innerHTML=''; return; }
  let html='';
  const mark=(x,z,cls,glyph)=>{ const ang=Math.atan2(-(x-player.pos.x),-(z-player.pos.z)); let rel=ang-player.yaw; rel=Math.atan2(Math.sin(rel),Math.cos(rel));
    if(Math.abs(rel)>1.7)return; const pct=50+rel/1.7*50; const d=Math.hypot(x-player.pos.x,z-player.pos.z);
    html+='<i class="'+cls+'" style="left:'+pct.toFixed(1)+'%">'+glyph+'<b>'+Math.round(d)+'</b></i>'; };
  for(const p of pickups){ if(p.kind==='crate')mark(p.g.position.x,p.g.position.z,'crate','&#9632;'); else if(p.kind==='item')mark(p.g.position.x,p.g.position.z,'item','&#9670;'); }
  if(state.boss&&!state.boss.dead)mark(state.boss.group.position.x,state.boss.group.position.z,'boss','&#9650;');
  if(state.portalOpen&&state.portal)mark(state.portal.position.x,state.portal.position.z,'portal','&#9679;');
  if(state.fab)mark(state.fab.pos.x,state.fab.pos.z,'fab','&#9635;');
  compassEl.innerHTML=html;
}