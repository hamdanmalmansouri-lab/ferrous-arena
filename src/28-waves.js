/* ============================ waves ============================ */
function startWave(nw){
  state.wave=nw; state.waveT=0;
  const boss=nw%BOSS_EVERY===0;
  const base=Math.min(4+Math.round(nw*2.2),34);
  state.spawnQueue=boss?Math.round(base*0.5):base;
  if(boss){
    SFX.boss(); showBanner('Wave '+nw,'Warden inbound',true);
    const e=makeEnemy('boss',nw);
    let a=Math.random()*Math.PI*2;
    e.group.position.set(Math.cos(a)*(ARENA-6),0,Math.sin(a)*(ARENA-6));
    if(nav.ready){ const k=navNearestOpen(e.group.position.x,e.group.position.z); if(k>=0)navCentre(k,e.group.position); }
    e.group.scale.setScalar(.2); e.spawnT=1.2; state.boss=e; e.mk=state.stage; e.summonT=6; e.burstLeft=0; e.shieldT=0; e.shieldUsed=false;
    const pats=[]; if(e.mk>=2)pats.push('summons'); if(e.mk>=3)pats.push('triple burst'); if(e.mk>=4)pats.push('shield phase');
    bossName.textContent='Warden Mk.'+e.mk+(pats.length?' — '+pats.join(', '):'');
  }else{ SFX.wave(); showBanner('Wave '+nw,'Incoming'); }
  if(state.wave>state.best){ state.best=state.wave; save.set('best',state.best); }
  syncHUD();
}
function spawnOne(){
  const shooterChance=(state.wave<2?0:Math.min(.15+state.wave*.05,.45))+(state.mods.lancers?0.25:0);
  const type=Math.random()<shooterChance?'shooter':'chaser';
  let x,z,tries=0;
  do{
    const a=Math.random()*Math.PI*2, r=ARENA-4-Math.random()*6;
    x=Math.cos(a)*r; z=Math.sin(a)*r; tries++;
  }while(tries<25 && (Math.hypot(x-player.pos.x,z-player.pos.z)<14));
  const e=makeEnemy(type,state.wave);
  if(nav.ready){ const k=navNearestOpen(x,z); if(k>=0){ navCentre(k,e.group.position); } else e.group.position.set(x,0,z); }
  else e.group.position.set(x,0,z);
  if(e.type==='chaser'&&state.mods.swift)e.speedMul=1.25;
  e.group.scale.setScalar(.2);
  e.spawnT=0.45;
  state.spawnQueue--;
}
function waveCleared(){
  respawnBarrels();
  const bonus=250+state.wave*60;
  state.score+=bonus;
  say('Wave '+state.wave+' cleared <b>+'+bonus+'</b>');
  /* supply crate near the player */
  let best=null,bd=0;
  for(let k=0;k<12;k++){
    const a=Math.random()*Math.PI*2, r=5+Math.random()*5;
    const p=new THREE.Vector3(player.pos.x+Math.cos(a)*r,0,player.pos.z+Math.sin(a)*r);
    p.x=Math.max(-ARENA+2,Math.min(ARENA-2,p.x)); p.z=Math.max(-ARENA+2,Math.min(ARENA-2,p.z));
    const blocked=resolveXZ(p.clone(),0.9,0,1.8);
    const d=p.distanceTo(player.pos);
    if(!blocked&&d>bd){best=p;bd=d;}
  }
  if(best)dropPickup(best,'crate');
  say('Supply crate dropped <b>'+(state.mods.bounty?'2 items':'1 item')+'</b>','item');
}

/* ---- stage flow ---- */
function bossDefeated(pos){
  state.portalOpen=true;
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.16,10,40),basicMat(0x4ea8ff)); ring.position.y=2; g.add(ring);
  const core=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),new THREE.MeshBasicMaterial({color:0x4ea8ff,transparent:true,opacity:.2,side:THREE.DoubleSide})); core.position.y=2; g.add(core);
  const gl=glowSprite(0x4ea8ff,7); gl.position.y=2; g.add(gl);
  const lab=makeLabel('STAGE PORTAL','#4ea8ff',.8); lab.position.y=4.2; g.add(lab);
  let p=pos.clone(); if(nav.ready){ const k=navNearestOpen(p.x,p.z); if(k>=0)navCentre(k,p); }
  g.position.set(p.x,p.y,p.z); scene.add(g); state.portal=g;
  spinners.push({obj:ring,speed:1.2,axis:'y'});
  interactables.push({pos:p.clone(),r:2.4,label:'Enter stage portal',action:nextStage});
  showBanner('Warden down','Stage portal open — clear the rest or move on',true);
}
function buildStage(stage){
  clearWorld(); if(state.portal){ scene.remove(state.portal); state.portal=null; }
  const m=stageMap(stage); state.mapId=m.id; m.build(); spawnFabricator(m.spawn);
  const mod=stageMod(stage); state.mod=mod; state.mods={}; if(mod)state.mods[mod.id]=true;
  state.portalOpen=false; state.boss=null; state.spawnQueue=0; state.waveBreak=0;
  resetPlayerFor('run',m.spawn); player.hp=Math.max(player.hp,run.stats.maxHp*0.6);
  if(stage>state.bestStage){ state.bestStage=stage; save.set('bestStage',stage); }
  return m;
}
let stageFadeT=0;
function nextStage(){
  if(!state.portalOpen||stageFadeT>0)return;
  SFX.portal(); state.portalOpen=false; stageFadeT=1.0; fadeEl.classList.add('on');
  after(0.5,()=>{
    const hpKeep=player.hp; const m=buildStage(state.stage+1); state.stage++; player.hp=Math.max(hpKeep,player.hp);
    state.startDelay=6; state.stageBanner=true;   // the long breath after a Warden
    showBanner(m.name,'Stage '+state.stage+' · '+m.sub+(state.mod?' · '+state.mod.name+': '+state.mod.desc:''),true);
    fadeEl.classList.remove('on'); syncHUD();
  });
  after(1.1,()=>{ stageFadeT=0; });
}
