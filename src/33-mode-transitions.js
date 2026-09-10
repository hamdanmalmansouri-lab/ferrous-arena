/* ============================ mode transitions ============================ */
function resetPlayerFor(mode,pos){
  player.pos.copy(pos); player.vel.set(0,0,0); player.yaw=0; player.pitch=-0.06; player.orbit=0; player.aimK=0;
  player.hp=run.stats.maxHp; player.mag=run.stats.mag; player.reloading=0; player.recoil=0; player.lastHurt=99;
  player.alive=true; player.abCd=0; player.abActive=0; player.abStock=run.stats.abStock||1; player.shield=0; player.iframes=0; shieldMesh.visible=false; avatar.visible=true;
  reloadbar.classList.remove('on');
}
function clearTimers(){ timers.length=0; stageFadeT=0; fadeEl.classList.remove('on'); if(state.snare){ scene.remove(state.snare.g); state.snare=null; } if(state.sentry){ scene.remove(state.sentry.g); state.sentry=null; } state.wardensRun=0; if(state.md&&state.md.extract){ scene.remove(state.md.extract.g); state.md.extract=null; } }   // also drops a leftover extraction pad
function goLobby(){
  clearTimers(); state.offer=null; state.fab=null; run.kind='endless'; state.md=null; state.trial=null; state.won=false; hud.dataset.kind='';
  if(state.portal){ scene.remove(state.portal); state.portal=null; } state.portalOpen=false;
  clearWorld(); buildLobby(); setMode('lobby');
  resetPlayerFor('lobby',new THREE.Vector3(0,0,6));
  player.yaw=Math.PI; /* face the pods */
  state.boss=null; state.over=false; avatar.visible=true;
  SFX.portal(); syncHUD();
}
function goRange(){
  clearTimers(); state.offer=null; state.fab=null; run.kind='endless'; state.md=null; state.trial=null; state.won=false; hud.dataset.kind='';
  if(state.portal){ scene.remove(state.portal); state.portal=null; } state.portalOpen=false;
  clearWorld(); buildRange(); setMode('range');
  run.items={}; computeStats(); syncItems();
  resetPlayerFor('range',new THREE.Vector3(0,0,14));
  rangeStats.hits=0; rangeStats.targets=0; rangeStats.dmgLog=[];
  state.boss=null; SFX.portal(); showBanner('Practice range','Fire at will'); syncHUD();
}
function goRun(seed,kind,trialId){
  clearTimers();
  run.kind=kind||'endless'; run.trial=run.kind==='trial'?(TRIAL_BY_ID[trialId]||TRIALS[0]):null;
  const qs=/[?&]seed=(\d+)/.exec(location.search);
  state.seed=seed||(qs?parseInt(qs[1]):(Date.now()%1e9));
  if(run.kind==='trial'){ if(run.trial.char){ const ci=CHARS.findIndex(c=>c.id===run.trial.char); if(ci>=0)selectChar(ci,false); } run.order={maps:[run.trial.map],mods:[]}; }
  else if(run.kind==='meltdown')run.order={maps:[MAPS[Math.floor((state.seed/7)%MAPS.length)].id],mods:[]};
  else run.order=makeRunOrder(state.seed);
  state.md=run.kind==='meltdown'?newMeltdown():null; state.trial=run.kind==='trial'?newTrial(run.trial):null; state.won=false;
  run.items={}; run.itemsTaken=0; run.evos={}; run.asc=null; computeStats(); syncItems();
  state.cores=0; state.evoFired={}; state.ascFired={}; player.adrenal=0; player.adrenalT=0; player.kineticT=0; player.hemoT=0; player.siegeT=0; player.freeAmmoT=0; player.shotIdx=0; player.naniteFired=false;
  state.score=0; state.kills=0; state.over=false; state.waveBreak=0; state.t=0; state.wave=0;
  state.acc.shots=0; state.acc.hits=0; state.spawnQueue=0; state.boss=null; state.startDelay=3; state.stage=1; state.scrap=0; state.offer=null; state.waveT=0;
  if(state.portal){ scene.remove(state.portal); state.portal=null; }
  setMode('run'); hud.dataset.kind=run.kind; buildStage(1); player.hp=run.stats.maxHp;
  if(run.kind==='meltdown'){ state.startDelay=999; spawnTerminal(); if(mapData.pulse)mapData.pulse.period=24; SFX.portal(); showBanner('Meltdown Protocol',stageMap(1).name+' · extract at 100%',true); }
  else if(run.kind==='trial'){ state.startDelay=999; state.wave=3; run.items={}; computeStats(); syncItems(); if(mapData.pulse&&run.trial.pulsePeriod){ mapData.pulse.period=run.trial.pulsePeriod; mapData.pulse.t=6; } SFX.portal(); showBanner(run.trial.name,run.trial.desc); }
  else { SFX.portal(); showBanner(CH().name+' deployed','Stage 1 · '+stageMap(1).name); }
  syncHUD();
}
function resumePlay(){ state.running=true; hud.classList.add('on'); screenEl.classList.add('hide'); last=performance.now(); acc=0; }
function enterPlay(){ audio(); if(TOUCH){ resumePlay(); return; } canvas.requestPointerLock(); }
