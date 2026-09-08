/* ============================ shooting ============================ */
function dealDamage(e,dmg,point,head,crit){
  if(e.shieldT>0){ spark(point,0x6fe3ff,4); SFX.hit(); popHit(false,false); return; }
  e.hp-=dmg; e.hurt=.14;
  if(e.type==='boss'&&e.mk>=4&&!e.shieldUsed&&e.hp<e.maxHp*0.5){ e.shieldUsed=true; e.shieldT=3.5; say('<b>Warden</b> raises a shield','item'); }
  if(state.mode==='range'){ rangeStats.dmgLog.push({t:state.t,v:dmg}); rangeStats.hits++; }
  if(run.stats.lifesteal>0&&state.mode==='run'){ player.hp=Math.min(run.stats.maxHp,player.hp+dmg*run.stats.lifesteal); }
  spark(point,crit?0xffd166:head?0xffe08a:0xff6a4d,head||crit?11:6);
  if(crit)SFX.crit(); else if(head)SFX.head(); else SFX.hit();
  if(e.hp<=0){ killEnemy(e,head); popHit(true); } else popHit(false,crit);
}
function tryFire(){
  if(!state.running||player.reloading>0||state.mode==='lobby')return;
  if(player.fireCd>0)return;
  const s=run.stats;
  if(player.mag<=0){ SFX.empty(); player.fireCd=.25; startReload(); return; }
  const od=(CH().id==='vanguard'&&player.abActive>0);
  player.mag--; player.fireCd=s.fireT/(od?1.6:1); state.acc.shots++;
  if(CH().id==='bulwark')SFX.shotHeavy(); else if(CH().id==='ranger')SFX.shotSnipe(); else SFX.shot();
  player.recoil=Math.min(player.recoil+s.recoil,0.16); player.aimT=2.5; player.kick=Math.min(1,player.kick*0.5+(CH().id==='bulwark'?1:CH().id==='ranger'?0.85:0.6));
  flash.intensity=3.2; flashMesh.material.opacity=.9;
  crossEl.classList.add('wide'); clearTimeout(crossEl._t);
  crossEl._t=setTimeout(()=>crossEl.classList.remove('wide'),110);

  const muzzle=new THREE.Vector3(); flashMesh.getWorldPosition(muzzle);
  const baseSpread=(s.spread+(inp.sprint?0.01:0)+(player.vel.lengthSq()>2?0.004:0))*(1-0.4*player.aimK);   // aiming tightens the cone
  const targetsAll=enemyHitMeshes.concat(targetHitMeshes,colliderMeshes);
  let anyHit=false;
  for(let p=0;p<s.pellets;p++){
    ray.setFromCamera({x:0,y:0},camera);
    const dir=ray.ray.direction.clone();
    dir.x+=(Math.random()-.5)*baseSpread*2; dir.y+=(Math.random()-.5)*baseSpread*2; dir.z+=(Math.random()-.5)*baseSpread*2;
    dir.normalize();
    const origin=ray.ray.origin.clone();
    ray.set(origin,dir);
    const hits=ray.intersectObjects(targetsAll,false);
    let endPoint=origin.clone().add(dir.clone().multiplyScalar(120));
    if(hits.length){
      const h=hits[0]; endPoint=h.point.clone();
      const e=h.object.userData.enemy, tg=h.object.userData.target;
      if(e&&!e.dead){
        anyHit=true;
        const head=h.object.userData.head, crit=Math.random()<s.crit;
        const dmg=s.dmg*(head?s.headMult:1)*(crit?2:1)*(od?1.2:1);
        dealDamage(e,dmg,h.point,head,crit);
      }else if(tg&&tg.down<=0){
        anyHit=true; rangeStats.hits++; rangeStats.targets++;
        rangeStats.dmgLog.push({t:state.t,v:s.dmg*(Math.random()<s.crit?2:1)});
        tg.down=2.2; spark(h.point,0xffd166,8); SFX.head(); popHit(false,true);
      }else spark(h.point,0x9fb4cc,3);
    }
    if(p<4)tracer(muzzle,endPoint);
  }
  if(anyHit)state.acc.hits++;
  if(player.mag===0)startReload();
  syncHUD();
}
function killEnemy(e,head){
  e.dead=true;
  if(e.type==='dummy'){
    spark(e.group.position.clone().setY(1.1),0x9fb4cc,12); SFX.kill();
    removeEnemy(e,true); setTimeout(()=>{ if(state.mode==='range')spawnDummy(); },2000); return;
  }
  const pts=(e.type==='boss'?1500:e.type==='shooter'?170:110)*(head?2:1);
  state.score+=pts; state.kills++; haptic(e.type==='boss'?[60,40,120]:18);
  if(e.type==='boss'){
    SFX.bossKill(); spark(e.group.position.clone().setY(1.5),0xffd166,40); shakeCam(1,0);
    say('<b>WARDEN DESTROYED</b> +'+pts,'item'); showBanner('Warden down','Bonus loot',true);
    for(let k=0;k<3;k++){ const a=Math.random()*Math.PI*2; dropPickup(e.group.position.clone().add(new THREE.Vector3(Math.cos(a)*1.5,0,Math.sin(a)*1.5)),'item'); }
    state.boss=null; bossDefeated(e.group.position.clone());
  }else{
    SFX.kill();
    spark(e.group.position.clone().setY(1.1),e.type==='shooter'?0xd07bff:0xff7a4d,16);
    say((head?'<b>HEADSHOT</b> ':'')+ENEMY_NAME[e.type]+' down <b>+'+pts+'</b>');
    const r=Math.random();
    if(r<0.06)dropPickup(e.group.position,'item'); else if(r<0.22&&!state.mods.norepair)dropPickup(e.group.position,'heal');
  }
  removeEnemy(e,true);
  syncHUD();
}
function startReload(){
  if(player.reloading>0||player.mag===run.stats.mag)return;
  player.reloading=run.stats.reloadT; SFX.reload();
  reloadbar.classList.add('on');
}
