/* ============================ waves ============================ */
function startWave(nw){
  state.wave=nw;
  const boss=nw%BOSS_EVERY===0;
  const base=Math.min(4+Math.round(nw*2.2),34);
  state.spawnQueue=boss?Math.round(base*0.5):base;
  if(boss){
    SFX.boss(); showBanner('Wave '+nw,'Warden inbound',true);
    const e=makeEnemy('boss',nw);
    let a=Math.random()*Math.PI*2;
    e.group.position.set(Math.cos(a)*(ARENA-6),0,Math.sin(a)*(ARENA-6));
    e.group.scale.setScalar(.2); e.spawnT=1.2; state.boss=e;
    bossName.textContent='Warden Mk.'+(nw/BOSS_EVERY);
  }else{ SFX.wave(); showBanner('Wave '+nw,'Incoming'); }
  if(state.wave>state.best){ state.best=state.wave; save.set('best',state.best); }
  syncHUD();
}
function spawnOne(){
  const shooterChance=state.wave<2?0:Math.min(.15+state.wave*.05,.45);
  const type=Math.random()<shooterChance?'shooter':'chaser';
  let x,z,tries=0;
  do{
    const a=Math.random()*Math.PI*2, r=ARENA-4-Math.random()*6;
    x=Math.cos(a)*r; z=Math.sin(a)*r; tries++;
  }while(tries<25 && (Math.hypot(x-player.pos.x,z-player.pos.z)<14));
  const e=makeEnemy(type,state.wave);
  e.group.position.set(x,0,z);
  e.group.scale.setScalar(.2);
  e.spawnT=0.45;
  state.spawnQueue--;
}
function waveCleared(){
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
  say('Supply crate dropped <b>1 item</b>','item');
}
