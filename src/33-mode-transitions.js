/* ============================ mode transitions ============================ */
function resetPlayerFor(mode,pos){
  player.pos.copy(pos); player.vel.set(0,0,0); player.yaw=0; player.pitch=-0.06; player.orbit=0; player.aimK=0;
  player.hp=run.stats.maxHp; player.mag=run.stats.mag; player.reloading=0; player.recoil=0; player.lastHurt=99;
  player.alive=true; player.abCd=0; player.abActive=0; player.shield=0; player.iframes=0; shieldMesh.visible=false; avatar.visible=true;
  reloadbar.classList.remove('on');
}
function goLobby(){
  if(state.portal){ scene.remove(state.portal); state.portal=null; } state.portalOpen=false;
  clearWorld(); buildLobby(); setMode('lobby');
  resetPlayerFor('lobby',new THREE.Vector3(0,0,6));
  player.yaw=Math.PI; /* face the pods */
  state.boss=null; state.over=false; avatar.visible=true;
  SFX.portal(); syncHUD();
}
function goRange(){
  if(state.portal){ scene.remove(state.portal); state.portal=null; } state.portalOpen=false;
  clearWorld(); buildRange(); setMode('range');
  run.items={}; computeStats(); syncItems();
  resetPlayerFor('range',new THREE.Vector3(0,0,14));
  rangeStats.hits=0; rangeStats.targets=0; rangeStats.dmgLog=[];
  state.boss=null; SFX.portal(); showBanner('Practice range','Fire at will'); syncHUD();
}
function goRun(seed){
  const qs=/[?&]seed=(\d+)/.exec(location.search);
  state.seed=seed||(qs?parseInt(qs[1]):(Date.now()%1e9));
  run.order=makeRunOrder(state.seed);
  run.items={}; run.itemsTaken=0; computeStats(); syncItems();
  state.score=0; state.kills=0; state.over=false; state.waveBreak=0; state.t=0; state.wave=0;
  state.acc.shots=0; state.acc.hits=0; state.spawnQueue=0; state.boss=null; state.startDelay=3; state.stage=1;
  if(state.portal){ scene.remove(state.portal); state.portal=null; }
  setMode('run'); buildStage(1); player.hp=run.stats.maxHp;
  SFX.portal(); showBanner(CH().name+' deployed','Stage 1 · '+stageMap(1).name); syncHUD();
}
function resumePlay(){ state.running=true; hud.classList.add('on'); screenEl.classList.add('hide'); last=performance.now(); acc=0; }
function enterPlay(){ audio(); if(TOUCH){ resumePlay(); return; } canvas.requestPointerLock(); }
