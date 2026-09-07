/* ============================ abilities ============================ */
function useAbility(){
  if(!state.running||state.mode==='lobby'||player.abCd>0||player.abActive>0)return;
  const ab=CH().ability, s=run.stats;
  player.abCd=ab.cd*s.cdMult;
  if(CH().id==='vanguard'){ player.abActive=ab.dur; SFX.ability(); say('<b>Overdrive</b> engaged'); }
  else if(CH().id==='bulwark'){ player.abActive=ab.dur; player.shield=80; shieldMesh.visible=true; SFX.ability(); say('<b>Barrier</b> up'); }
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
    player.pos.copy(p); player.iframes=0.5; SFX.blink();
    spark(player.pos.clone().setY(1),0x3ddc84,14);
  }
  syncHUD();
}
