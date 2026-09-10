/* ============================ abilities ============================ */
/* one charge normally; the Overcharge Cell evolution gives two (run.stats.abStock). A charge refills when abCd runs out. */
function useAbility(){
  if(!state.running||state.mode==='lobby'||player.abActive>0||player.abStock<=0)return;
  const ab=CH().ability, s=run.stats, maxStock=s.abStock||1;
  player.abStock--;
  if(player.abCd>0&&maxStock>1)fired('overcharge');                        // the second charge, used while the first still cools
  if(player.abCd<=0)player.abCd=ab.cd*s.cdMult*(CH().id==='ranger'&&asc('ghost')?0.6:1);
  if(CH().id==='vanguard'){ player.abActive=ab.dur; SFX.ability(); say('<b>Overdrive</b> engaged'+(asc('warcry')?' &middot; Warcry':'')); if(asc('warcry'))fired('warcry'); }
  else if(CH().id==='bulwark'){
    player.abActive=ab.dur; player.shield=run.stats.maxHp*(asc('bastion')?1.0:0.45); shieldMesh.visible=true; SFX.ability(); say('<b>Barrier</b> up');
    if(asc('bastion'))fired('bastion');
    if(asc('riot')){ let nHit=0; for(const e of enemies){ if(e.dead||e.type==='dummy')continue; const d=e.group.position.distanceTo(player.pos); if(d<4){ const dir=e.group.position.clone().sub(player.pos).setY(0).normalize(); e.group.position.addScaledVector(dir,3); resolveXZ(e.group.position,0.5*e.size,e.group.position.y,1.8); e.stun=1.5; e.hurt=.14; nHit++; } }
      if(nHit){ fired('riot'); shakeCam(0.5,0); spark(player.pos.clone().setY(1),0x6fe3ff,18); say('<b>Riot Charge</b> stunned '+nHit,'item'); } }
  }
  else if(CH().id==='sable'){   // Snare Charge: a thrown puck, arms in 0.4 s, then pulls + slows for 2.5 s
    const fwd=forwardVec(player.yaw,0); fwd.y=0; fwd.normalize(); const p=player.pos.clone().addScaledVector(fwd,5); p.y=navHeightAt(p.x,p.z)+0.05;
    if(state.snare)scene.remove(state.snare.g);
    const g=new THREE.Group(); const disc=new THREE.Mesh(new THREE.CylinderGeometry(.35,.4,.12,16),new THREE.MeshStandardMaterial({color:0x2a1a4a,emissive:0x8a5cff,emissiveIntensity:1.4})); disc.position.y=.06; g.add(disc);
    const ring=new THREE.Mesh(new THREE.RingGeometry(4.7,5,48),new THREE.MeshBasicMaterial({color:0x8a5cff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.y=.08; g.add(ring);
    g.add(glowSprite(0x8a5cff,2)); g.position.copy(p); scene.add(g);
    state.snare={g:g,ring:ring,pos:p,arm:0.4,life:2.5}; SFX.ability(); say('<b>Snare Charge</b> thrown');
  }
  else if(CH().id==='ember'){   // Backdraft: ignite a 60-degree cone out to 8 m; every burning enemy in it detonates for 40 % of remaining health
    const fwd=forwardVec(player.yaw,0); fwd.y=0; fwd.normalize(); let n=0;
    for(const e of enemies.slice()){ if(e.dead||e.type==='dummy')continue; const d=e.group.position.clone().sub(player.pos).setY(0); const dist=d.length(); if(dist>8)continue; d.multiplyScalar(1/Math.max(1e-4,dist)); if(d.dot(fwd)<0.5)continue;
      const wasBurning=e.burnT>0; e.burnT=3; e.burnTick=0.5; n++; const pt=e.group.position.clone().setY(1.1); spark(pt,0xff7a3d,10);
      if(wasBurning){ dealDamage(e,Math.max(1,e.hp*0.4),pt,false,true,true); fired('backdraft'); } }
    SFX.ability(); noise(.4,.5,320,.5); shakeCam(0.5,0); say('<b>Backdraft</b> &middot; '+n+' ignited','item');
  }
  else if(CH().id==='arclight'){   // Deploy Sentry: one drone at a time, 20 s, 14 dps at the nearest target with line of sight
    if(state.sentry)scene.remove(state.sentry.g);
    const fwd=forwardVec(player.yaw,0); fwd.y=0; fwd.normalize(); const p=player.pos.clone().addScaledVector(fwd,1.6); p.y=navHeightAt(p.x,p.z);
    const c=MODELS.ok?spawnCharacter('enemy_drone',0x4ea8ff):null; const g=new THREE.Group();
    if(c){ c.group.rotation.y=MODEL_YAW; c.group.position.y=1.4; addRim(c.group,0x6fe3ff); g.add(c.group); c.animator.play('idle',0); g.userData.anim=c.animator; }
    else { const m=new THREE.Mesh(new THREE.OctahedronGeometry(.4,0),new THREE.MeshStandardMaterial({color:0x2ad4ff,emissive:0x2ad4ff,emissiveIntensity:1})); m.position.y=1.4; g.add(m); }
    g.add(glowSprite(0x6fe3ff,2.2)); g.position.copy(p); scene.add(g);
    state.sentry={g:g,pos:p,life:ab.dur,acc:0,tick:0}; player.abActive=ab.dur; SFX.ability(); say('<b>Sentry</b> deployed');
  }
  else if(CH().id==='ranger'){
    const fwd=forwardVec(player.yaw,0); fwd.y=0; fwd.normalize();
    const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
    const d=new THREE.Vector3();
    d.addScaledVector(fwd,inp.f).addScaledVector(right,inp.r);
    if(d.lengthSq()<0.01)d.copy(fwd); d.normalize();
    spark(player.pos.clone().setY(1),0x3ddc84,14);
    const p=player.pos.clone();
    for(let k=0;k<16;k++){ const q=p.clone().add(d.clone().multiplyScalar(0.5)); if(resolveXZ(q,PLAYER_R,player.pos.y,1.8))break; p.copy(q); }
    p.x=Math.max(-ARENA+1,Math.min(ARENA-1,p.x)); p.z=Math.max(-ARENA+1,Math.min(ARENA-1,p.z));
    player.pos.copy(p); player.iframes=asc('ghost')?1.2:0.5; player.rollT=0.5; SFX.blink();
    if(asc('ghost')){ fired('ghost'); player.reloading=0; reloadbar.classList.remove('on'); player.mag=run.stats.mag; }
    spark(player.pos.clone().setY(1),0x3ddc84,14);
  }
  syncHUD();
}
