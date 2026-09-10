/* ============================ waves ============================ */
function startWave(nw){
  state.wave=nw; state.waveT=0;
  const boss=nw%BOSS_EVERY===0;
  const base=Math.min(4+Math.round(nw*2.2),34);
  state.spawnQueue=boss?Math.round(base*0.5):base;
  if(boss){ showBanner('Wave '+nw,'Warden inbound',true); spawnWarden(nw,state.stage); }
  else{ SFX.wave(); showBanner('Wave '+nw,'Incoming'); }
  if(state.wave>state.best){ state.best=state.wave; save.set('best',state.best); }
  syncHUD();
}
function spawnWarden(nw,mk){
  SFX.boss();
  const e=makeEnemy('boss',nw);
  let a=Math.random()*Math.PI*2;
  e.group.position.set(Math.cos(a)*(ARENA-6),0,Math.sin(a)*(ARENA-6));
  if(nav.ready){ const k=navNearestOpen(e.group.position.x,e.group.position.z); if(k>=0)navCentre(k,e.group.position); }
  e.group.scale.setScalar(.2); e.spawnT=1.2; state.boss=e; e.mk=mk; e.summonT=6; e.burstLeft=0; e.shieldT=0; e.shieldUsed=false;
  const pats=[]; if(e.mk>=2)pats.push('summons'); if(e.mk>=3)pats.push('triple burst'); if(e.mk>=4)pats.push('shield phase');
  bossName.textContent='Warden Mk.'+e.mk+(pats.length?' — '+pats.join(', '):'');
  return e;
}
/* one spawn at the arena edge, away from the player, nav-snapped; `type` chaser | shooter | elite */
function spawnAt(type,wave){
  let x,z,tries=0;
  do{ const a=Math.random()*Math.PI*2, r=ARENA-4-Math.random()*6; x=Math.cos(a)*r; z=Math.sin(a)*r; tries++; }while(tries<25&&(Math.hypot(x-player.pos.x,z-player.pos.z)<14));
  const e=makeEnemy(type==='elite'?'chaser':type,wave,{elite:type==='elite'});
  if(nav.ready){ const k=navNearestOpen(x,z); if(k>=0){ navCentre(k,e.group.position); } else e.group.position.set(x,0,z); } else e.group.position.set(x,0,z);
  if(e.type==='chaser'&&state.mods.swift)e.speedMul=1.25;
  e.group.scale.setScalar(.2*e.size); e.spawnT=0.45; return e;
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
  const m=stageMap(stage); state.mapId=m.id; m.build(); if(run.kind!=='trial')spawnFabricator(m.spawn);
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
    if(state.stage===3&&!run.asc)after(1.3,()=>offerAscension());   // stage 3: choose the ascension
    showBanner(m.name,'Stage '+state.stage+' · '+m.sub+(state.mod?' · '+state.mod.name+': '+state.mod.desc:''),true);
    fadeEl.classList.remove('on'); syncHUD();
  });
  after(1.1,()=>{ stageFadeT=0; });
}

/* ============================ Meltdown Protocol ============================ */
function newMeltdown(){ return {credits:0,elapsed:0,charge:0,spawnT:0,wardens:[false,false,false],held:0,banked:0,extract:null,extractT:0,dump:false,closed:false,openedAt:0,term:null}; }
function meltdownTick(dt){
  const md=state.md; if(!md||state.won)return;
  md.elapsed+=dt; md.charge=Math.min(1,md.elapsed/MELTDOWN.duration);
  state.wave=1+Math.floor(md.elapsed/60*2.2);   // enemy scaling follows the clock: ~wave 25 at 11 minutes
  md.credits+=MELTDOWN.creditRate(md.elapsed/60)*dt;   // credits bank while the field is clear
  MELTDOWN.wardenAt.forEach((th,i)=>{ if(!md.wardens[i]&&md.charge>=th&&enemies.length<20){ md.wardens[i]=true; showBanner('Warden Mk.'+(i+1),'Reactor at '+Math.round(th*100)+'%',true); spawnWarden(state.wave,i+1); } });
  /* the Director: spend credits on cards, respecting the alive cap; the extraction window dumps the budget as fast as the cap allows */
  md.spawnT-=dt;
  if(md.spawnT<=0&&enemies.length<MELTDOWN.aliveCap){
    const c=MELTDOWN.cards; let pick=null;
    if(md.credits>=c.elite&&Math.random()<(md.dump?0.5:0.22))pick='elite';
    else if(md.credits>=c.shooter&&Math.random()<0.4)pick='shooter';
    else if(md.credits>=c.chaser)pick='chaser';
    if(pick){ md.credits-=c[pick]; spawnAt(pick,state.wave); md.spawnT=md.dump?MELTDOWN.dumpCadence:MELTDOWN.cadence; }
    else md.spawnT=0.2;
  }
  if(md.charge>=1&&!md.extract&&!md.closed)openExtraction();
  if(md.extract){
    md.extractT-=dt; md.extract.ring.rotation.y+=dt*1.5;
    if(Math.hypot(player.pos.x-md.extract.pos.x,player.pos.z-md.extract.pos.z)<2.2&&Math.abs(player.pos.y-md.extract.pos.y)<1.5){ extracted(); return; }
    if(md.extractT<=0){ scene.remove(md.extract.g); md.extract=null; md.closed=true; md.dump=false; showBanner('Window closed','The pad is gone. Hold out.',false); say('Extraction window <b>closed</b>','warn'); }
  }
}
function openExtraction(){
  const md=state.md; let p=null;
  for(let k=0;k<80;k++){ const x=(Math.random()*2-1)*(ARENA-5), z=(Math.random()*2-1)*(ARENA-5); const c=navNearestOpen(x,z); if(c<0)continue; const q=navCentre(c,new THREE.Vector3()); if(Math.hypot(q.x-player.pos.x,q.z-player.pos.z)<15)continue; p=q; break; }
  if(!p)p=navCentre(navNearestOpen(0,0),new THREE.Vector3());
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.4,.3,32),new THREE.MeshStandardMaterial({color:0x1a2230,roughness:.5,metalness:.6,emissive:0x2ecc71,emissiveIntensity:.5})); base.position.y=.15; g.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.0,.12,10,48),basicMat(0x3ddc84)); ring.rotation.x=Math.PI/2; ring.position.y=.4; g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,14,24,1,true),new THREE.MeshBasicMaterial({color:0x3ddc84,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false})); beam.position.y=7; g.add(beam);
  const gl=glowSprite(0x3ddc84,8); gl.position.y=2; g.add(gl);
  const lab=makeLabel('EXTRACTION','#3ddc84',.9); lab.position.y=4.6; g.add(lab);
  g.position.copy(p); scene.add(g);
  md.extract={pos:p.clone(),g:g,ring:ring}; md.extractT=MELTDOWN.extractWindow; md.dump=true; md.openedAt=md.elapsed;
  SFX.portal(); showBanner('Extraction open','Reach the pad within 90 s — the Director is dumping its budget',true); say('<b>Extraction pad</b> open','item'); syncHUD();
}
/* Core Shards: every Warden drops one; hold it (+20 % item drops, +12 % enemy damage each, cap 5) or bank it at the terminal */
function heldShards(){ return state.md?Math.min(MELTDOWN.shardHoldCap,state.md.held):0; }
function addShard(){ const md=state.md; if(!md)return; md.held++; SFX.item(); say('<b>Core Shard</b> recovered &middot; holding '+md.held,'item'); showBanner('Core Shard','Bank it at the terminal, or hold it for the bonus',true); syncHUD(); }
function bankShards(){ const md=state.md; if(!md||md.held<=0){ say('No shards to bank','warn'); return; } md.banked+=md.held; say('Banked <b>'+md.held+'</b> shard'+(md.held===1?'':'s')+' &middot; score locked','item'); md.held=0; SFX.item(); syncHUD(); }
function spawnTerminal(){
  let p=null; for(let k=0;k<60;k++){ const x=(Math.random()*2-1)*(ARENA-5), z=(Math.random()*2-1)*(ARENA-5); const c=navNearestOpen(x,z); if(c<0)continue; const q=navCentre(c,new THREE.Vector3());
    if(Math.hypot(q.x-player.pos.x,q.z-player.pos.z)<8)continue; let clear=true; for(const it of interactables)if(Math.hypot(it.pos.x-q.x,it.pos.z-q.z)<5)clear=false; if(!clear)continue; p=q; break; }
  if(!p)return;
  const g=new THREE.Group(); const m=MODELS.ok?spawnProp('locker'):null;
  if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=2.0/Math.max(sz.y,0.01); m.scale.setScalar(k); m.position.y=-b.min.y*k; g.add(m); }
  else { const box=new THREE.Mesh(new THREE.BoxGeometry(1,2,.6),stdMat(0x2c3745,.6,.4)); box.position.y=1; g.add(box); }
  const gl=glowSprite(0x6fe3ff,4); gl.position.y=2.2; g.add(gl); const lab=makeLabel('SHARD TERMINAL','#6fe3ff',.7); lab.position.y=3.1; g.add(lab);
  g.position.copy(p); world.add(g);
  interactables.push({pos:p.clone(),r:2.4,label:'Bank Core Shards',action:bankShards}); state.md.term=p.clone();
}
/* scoring: banked x1000 + held x2500 (extraction only) + kills + time bonus (up to 1000 for a fast extraction) */
function meltdownScore(extractedNow){
  const md=state.md; const timeBonus=extractedNow?Math.round(1000*Math.max(0,1-(md.elapsed-md.openedAt)/MELTDOWN.extractWindow)):0;
  return {banked:md.banked*1000,held:extractedNow?md.held*2500:0,kills:state.kills,time:timeBonus,total:md.banked*1000+(extractedNow?md.held*2500:0)+state.kills+timeBonus};
}
function extracted(){
  const md=state.md; state.won=true; state.running=false; player.alive=true;
  const sc=meltdownScore(true); state.score=sc.total;
  const best=save.get('meltdownBest',{}); const cid=CH().id; const prev=best[cid]||0; if(sc.total>prev){ best[cid]=sc.total; save.set('meltdownBest',best); }
  const code=encodeScoreCode({mode:MODE_IDS.meltdown,char:run.charIdx,seed:state.seed,score:sc.total,detail:(md.banked<<8)|(Math.min(15,md.held)<<4)|Math.min(15,state.kills>>6)});
  if(document.pointerLockElement)document.exitPointerLock(); SFX.bossKill();
  showExtracted(sc,prev,code);
}

/* ============================ Trials ============================ */
function newTrial(def){ return {def:def,t:def.time,prog:0,spawnT:0,credits:0,pulseOn:false,done:false,failed:false}; }
function trialTick(dt){
  const tr=state.trial; if(!tr||tr.done)return;
  tr.t-=dt;
  const g=tr.def.goal;
  if(g.kind==='pulses'&&mapData.pulse){ const pu=mapData.pulse; if(pu.active&&!tr.pulseOn)tr.pulseOn=true; if(!pu.active&&tr.pulseOn){ tr.pulseOn=false; if(pu.hit)return trialEnd(false,'Caught by the shockwave'); tr.prog++; } }
  if(g.n!==undefined&&tr.prog>=g.n)return trialEnd(true);
  if(tr.t<=0)return trialEnd(g.kind==='survive');
  tr.credits+=tr.def.rate*dt; tr.spawnT-=dt;
  if(tr.spawnT<=0&&enemies.length<12&&tr.credits>=MELTDOWN.cards.chaser){
    let r=Math.random(), type='chaser'; for(const k in tr.def.types){ r-=tr.def.types[k]; if(r<=0){ type=k; break; } }
    if(type==='shooter'&&tr.credits<MELTDOWN.cards.shooter)type='chaser';
    tr.credits-=MELTDOWN.cards[type]; spawnAt(type,state.wave); tr.spawnT=0.35;
  }
}
function trialProgress(kind,e,head){
  const tr=state.trial; if(!tr||tr.done)return; const g=tr.def.goal;
  if(g.kind==='kills'&&kind==='kill')tr.prog++;
  else if(g.kind==='headshots'&&kind==='kill'&&head)tr.prog++;
  else if(g.kind==='barrelKills'&&kind==='kill'&&state.barrelKill)tr.prog++;
  else if(g.kind==='highKills'&&kind==='kill'&&player.pos.y>=2.5)tr.prog++;
}
function trialEnd(ok,why){
  const tr=state.trial; if(!tr||tr.done)return; tr.done=true; tr.failed=!ok; state.running=false;
  if(ok){ const marks=save.get('trials',{}); marks[tr.def.id]=true; save.set('trials',marks); SFX.bossKill(); } else SFX.over();
  if(document.pointerLockElement)document.exitPointerLock();
  showTrialEnd(ok,why);
}
function trialMarks(){ return Object.keys(save.get('trials',{})).length; }
