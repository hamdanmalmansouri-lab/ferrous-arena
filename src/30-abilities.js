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
