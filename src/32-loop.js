/* ============================ loop ============================ */
let last=performance.now();
function update(dt){
  state.t+=dt;
  const s=run.stats, mode=state.mode;

  /* ---- timers ---- */
  tickTimers(dt);
  if(player.crossT>0){ player.crossT-=dt; if(player.crossT<=0)crossEl.classList.remove('wide'); }
  if(player.dmgT>0){ player.dmgT-=dt; if(player.dmgT<=0)dmgEl.style.opacity=0; }
  if(player.fireCd>0)player.fireCd-=dt;
  if(player.iframes>0)player.iframes-=dt;
  player.recoil=Math.max(0,player.recoil-dt*0.32);
  if(player.abCd>0){ player.abCd-=dt; if(player.abCd<0)player.abCd=0; }
  if(player.abActive>0){ player.abActive-=dt; if(player.abActive<=0){ player.abActive=0; if(CH().id==='bulwark'){player.shield=0; shieldMesh.visible=false;} } }
  if(player.reloading>0){
    player.reloading-=dt;
    reloadfill.style.width=(1-player.reloading/s.reloadT)*100+'%';
    if(player.reloading<=0){ player.mag=s.mag; reloadbar.classList.remove('on'); reloadfill.style.width='0%'; }
  }
  pollGamepad(dt); readInput();
  /* free look: idle = the mouse orbits the camera round the character; any action turns the character to face the camera */
  const acting=inp.moving||inp.fire||inp.aim||inp.jump||(inp._auto&&touch.autoFire);
  if(acting&&player.orbit!==0){ player.yaw+=player.orbit; player.orbit=0; }
  player.free=!acting&&mode!=='menu';
  player.aimK+=((inp.aim&&mode!=='lobby'?1:0)-player.aimK)*Math.min(1,dt*12);   // RMB aim: camera pulls in, FOV narrows, gun stays up
  if(inp.aim)player.aimT=Math.max(player.aimT,0.3);
  if(TOUCH&&(inp.fire||autoFireCheck()))aimAssist(dt);
  if(inp.fire||(inp._auto&&touch.autoFire))tryFire();

  /* ---- movement ---- */
  const fwd=forwardInto(_fwd,player.yaw,0); fwd.y=0; fwd.normalize();
  const right=_right.crossVectors(fwd,UP).normalize();
  const wish=_wish.set(0,0,0).addScaledVector(fwd,inp.f).addScaledVector(right,inp.r);
  const moving=inp.moving;
  const spd=inp.sprint?(inp.f>0.5?s.sprint:s.sprint*0.8):s.speed;   // omnidirectional sprint: full speed forward, 80% sideways / back
  const target=wish.multiplyScalar(spd);
  let accel=player.grounded?14:5;
  if(player.grounded&&mapData.ice.length){ for(const ic of mapData.ice){ if(Math.hypot(player.pos.x-ic.x,player.pos.z-ic.z)<ic.r){ accel=2.2; break; } } }
  player.vel.x+=(target.x-player.vel.x)*Math.min(1,accel*dt);
  player.vel.z+=(target.z-player.vel.z)*Math.min(1,accel*dt);
  player.vel.y-=(state.mods.lowgrav?GRAV*0.45:GRAV)*dt;
  if(inp.jump&&player.grounded){ player.vel.y=JUMP; player.grounded=false; blip({type:'sine',f0:300,f1:520,d:.09,v:.08}); }
  player.pos.x+=player.vel.x*dt; player.pos.z+=player.vel.z*dt;
  resolveXZ(player.pos,PLAYER_R,player.pos.y,1.8);
  player.pos.y+=player.vel.y*dt;
  const ground=supportHeight(player.pos,PLAYER_R*0.9);
  if(player.pos.y<=ground){ player.pos.y=ground; player.vel.y=0; if(!player.grounded&&player.airT>0.2)player.landT=0.55; player.grounded=true; player.airT=0; }
  else { player.grounded=false; player.airT+=dt; }
  player.pos.x=Math.max(-ARENA+1,Math.min(ARENA-1,player.pos.x));
  player.pos.z=Math.max(-ARENA+1,Math.min(ARENA-1,player.pos.z));

  /* ---- regen ---- */
  player.lastHurt+=dt;
  if(player.hp>0&&player.hp<s.maxHp){
    let r=s.regen; if(player.lastHurt>REGEN_DELAY)r+=REGEN_RATE;
    if(r>0){ player.hp=Math.min(s.maxHp,player.hp+r*dt); }
  }

  /* ---- avatar ---- */
  avatar.position.copy(player.pos);
  avatar.rotation.y=player.yaw;
  player.kick=Math.max(0,player.kick-dt*7); player.flinch=Math.max(0,player.flinch-dt*8);
  player.hitT=Math.max(0,player.hitT-dt); player.rollT=Math.max(0,player.rollT-dt); player.aimT=Math.max(0,player.aimT-dt); player.landT=Math.max(0,player.landT-dt);
  if(avatarAnim){
    avatarAnim.update(dt);
    const reloadAct=player.reloading>0?avatarAnim.actions.reload:null;                       // UAL Pistol_Reload retargeted onto the rig (absent until repacked)
    const firing=!reloadAct&&(inp.fire||player.fireCd>0.02||(inp._auto&&touch.autoFire));
    const sprinting=inp.sprint&&moving;
    /* locomotion clip from the body-relative move vector: strafes and back-pedal have their own clips */
    const lat=Math.abs(inp.r)>Math.abs(inp.f)*1.2;
    const loco=!moving?'idle':lat?(inp.r>0?'runR':'runL'):inp.f<0?'runB':sprinting?'run':'walk';
    const tsLo=!moving?1:loco==='walk'?Math.min(1.9,Math.max(.8,s.speed/3.6)):Math.min(1.8,Math.max(.8,(sprinting?s.sprint:s.speed)/6.5));
    if(player.rollT>0)avatarAnim.play('roll',0.06,true,1.4);                                   // Blink
    else if(!player.grounded&&avatarAnim.actions.jumploop){ if(player.airT<0.32&&player.vel.y>0)avatarAnim.play('jumpstart',0.05,true,2.4); else avatarAnim.play('jumploop',0.15,false,1); }   // UAL jump: take-off, then the airborne loop
    else if(!player.grounded)avatarAnim.layer(null,'aim',0.12,false,1,0.02);                   // rigs without a jump clip: legs at rest, gun up
    else if(reloadAct)avatarAnim.layer(loco,'reload',0.08,true,tsLo,reloadAct.getClip().duration/Math.max(0.3,s.reloadT));   // reload on the upper body, stretched to the reload time; legs keep moving
    else if(player.landT>0&&!moving&&!firing&&avatarAnim.actions.jumpland)avatarAnim.play('jumpland',0.05,true,1.8);   // landing recovery, interrupted by any input
    else if(player.hitT>0&&!firing)avatarAnim.layer(loco,'hit',0.06,true,tsLo,1.2);            // hit reaction on the upper body
    else if(firing&&moving&&loco==='walk'||firing&&moving&&loco==='run')avatarAnim.play('runshoot',0.08,false,tsLo);   // dedicated run-and-gun clip
    else if(firing&&moving)avatarAnim.layer(loco,'shoot',0.08,false,tsLo,1);                   // strafing / backing while firing
    else if(firing)avatarAnim.play('shoot',0.08,false,1);
    else if(moving&&inp.aim)avatarAnim.layer(loco,'aim',0.12,false,tsLo,0.02);                // walking while aiming: gun stays up
    else if(moving)avatarAnim.play(loco,0.12,false,tsLo);
    else if(player.aimT>0)avatarAnim.layer('idle','aim',0.15,false,1,0.02);                    // recently fired: stay on target (aim clip crawling — timeScale 0 stops the mixer writing it)
    else avatarAnim.play('idle',0.2,false,1);                                                  // Idle_Gun: weapon lowered
    /* procedural layers on top of the mixer: aim pitch + hit flinch on the chest, recoil kick on the weapon */
    if(avatarAimBone)poseOffset(avatarAimBone,'x',-(player.pitch*0.45+player.flinch*0.35));
    if(gun&&gun.userData.kick){ const k=gun.userData.kick, ax=k.axis||GUN_AXIS;   // kick: pitch the barrel up and push the gun back along its own barrel axis
      k.obj.rotation[ax.axis==='x'?'z':'x']=player.kick*0.35*(ax.axis==='x'?ax.sign:-ax.sign); k.obj.position[ax.axis]=-ax.sign*player.kick*0.12*k.len; }
  }else{
    const bobAmt=moving?Math.sin(state.t*(inp.sprint?16:11))*0.055:0;
    avatar.position.y+=bobAmt*(player.grounded?1:0);
    gun.rotation.x=-player.pitch*0.55-player.kick*0.3;
  }
  for(let i=corpses.length-1;i>=0;i--){ const c=corpses[i]; c.an.update(dt); c.t-=dt; if(c.t<0.35)c.g.position.y-=dt*2.5; if(c.t<=0){ scene.remove(c.g); corpses.splice(i,1); } }
  tickPods(dt,camera.position);
  flash.intensity*=Math.pow(0.0006,dt);
  flashMesh.material.opacity*=Math.pow(0.0002,dt);
  if(shieldMesh.visible){ shieldMesh.rotation.y+=dt*1.5; shieldMesh.material.opacity=.18+Math.sin(state.t*8)*.06; }

  /* ---- camera ---- */
  const camF=forwardInto(_camF,camYaw(),player.pitch+player.recoil);
  const camR=_camR.crossVectors(camF,UP).normalize();
  const pivot=_pivot.copy(player.pos); pivot.y+=EYE; pivot.addScaledVector(camR,0.72+0.16*player.aimK);
  let dist=5.15-1.95*player.aimK;
  const fov=66-16*player.aimK; if(Math.abs(camera.fov-fov)>0.01){ camera.fov=fov; camera.updateProjectionMatrix(); }
  crossEl.classList.toggle('free',player.orbit!==0);
  const camHit=rayWorld(pivot,_v1.copy(camF).negate(),dist+0.4,0);   // slab test against boxes[] (no mesh raycast per step)
  if(camHit>=0)dist=Math.max(1.1,camHit-0.35);
  camera.position.copy(pivot).addScaledVector(camF,-dist);
  camera.position.y=Math.max(0.5,camera.position.y);
  camera.lookAt(_look.copy(pivot).addScaledVector(camF,12));
  if(state.shake>0){ state.shake=Math.max(0,state.shake-dt*3); if(SETTINGS.shake){ const a=state.shake*state.shake;
    camera.position.addScaledVector(camR,Math.sin(state.t*57)*a*0.14).addScaledVector(UP,Math.sin(state.t*43+1.3)*a*0.10); } }

  /* ---- world spinners / targets ---- */
  spinners.forEach(sp=>{ sp.obj.rotation.y+=sp.speed*dt; });
  for(const b of barrels)if(b.spawnT>0){ b.spawnT-=dt; b.g.scale.setScalar(Math.min(1,1-b.spawnT/.5)+.01); }
  for(const tg of targets){
    if(tg.down>0){ tg.down-=dt; tg.plate.rotation.x=Math.min(Math.PI/2,tg.plate.rotation.x+dt*7); if(tg.down<=0)tg.plate.rotation.x=0; }
    if(tg.moving)tg.g.position.x=tg.x0+Math.sin(state.t*1.1+tg.ph)*4;
  }

  /* ---- interactables ---- */
  nearInteract=null;
  if(mode==='lobby'||mode==='range'||(mode==='run'&&state.portalOpen)){
    let bd=99;
    for(const it of interactables){ const d=Math.hypot(it.pos.x-player.pos.x,it.pos.z-player.pos.z); if(d<it.r&&d<bd){bd=d;nearInteract=it;} }
    if(nearInteract){ promptTxt.textContent=nearInteract.label; promptEl.classList.add('on'); if(TOUCH){ tInteractTxt.textContent=nearInteract.label; tInteract.classList.add('on'); } }
    else { promptEl.classList.remove('on'); if(TOUCH)tInteract.classList.remove('on'); }
  }

  /* ---- enemies ---- */
  let meleeHeld=0; for(let i=0;i<enemies.length;i++)if(enemies[i].token)meleeHeld++;
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i], g=e.group;
    if(e.spawnT>0){ e.spawnT-=dt; const k=1-Math.max(0,e.spawnT)/(e.type==='boss'?1.2:0.45); g.scale.setScalar((0.2+0.8*k)*e.size); }
    const toP=_v1.copy(player.pos).sub(g.position); toP.y=0;
    const distP=toP.length(); toP.normalize();
    if(e.type!=='dummy')g.rotation.y=Math.atan2(-toP.x,-toP.z);

    let mv=_v2.set(0,0,0);
    /* pathed approach direction: straight line when close, otherwise A* over the nav grid */
    const dy=Math.abs(player.pos.y-g.position.y);
    const approach=(minD)=>{ if(distP<=minD&&dy<1.2)return false; if(distP<3&&dy<1.2){ mv.copy(toP); return true; }
      if(navSteer(e,player.pos,_v3,dt)){ mv.copy(_v3); return true; } mv.copy(toP); return true; };
    if(e.type==='chaser'){
      /* melee tokens: at most MELEE_TOKENS chasers press the attack at once; the rest orbit at 2.5–4 m until one frees */
      if(e.token){ if(distP>7){ e.token=false; meleeHeld--; } }
      else if(distP<5&&dy<1.2&&meleeHeld<MELEE_TOKENS){ e.token=true; meleeHeld++; }
      if(e.token||distP>5||dy>=1.2){ if(approach(1.35))mv.multiplyScalar(e.speed*e.speedMul); }
      else{
        e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1.5+Math.random()*2; }
        const sp=e.speed*e.speedMul; mv.set(-toP.z,0,toP.x).multiplyScalar(e.strafe*sp*0.7);
        if(distP<2.5)mv.addScaledVector(toP,-sp*0.8); else if(distP>4)mv.addScaledVector(toP,sp*0.6);
        if(!navOpenAt(g.position.x+mv.x*0.4,g.position.z+mv.z*0.4))mv.set(0,0,0);
      }
    }else if(e.type==='shooter'){
      e.strafeT-=dt;
      if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1.2+Math.random()*1.8; }
      if(distP>12||dy>1.2){ if(approach(0))mv.multiplyScalar(e.speed); }
      else{
        const side=_v3.set(-toP.z,0,toP.x).multiplyScalar(e.strafe);
        if(distP<7)mv.copy(toP).multiplyScalar(-e.speed*.8);
        mv.add(side.multiplyScalar(e.speed*.6));
        /* don't strafe off a ledge or into a wall */
        if(!navOpenAt(g.position.x+mv.x*0.4,g.position.z+mv.z*0.4))mv.set(0,0,0);
      }
    }else if(e.type==='boss'){
      if(e.charge>0){ e.charge-=dt; mv.copy(e.chargeDir).multiplyScalar(e.speed*3.4); }
      else if(approach(2.6))mv.multiplyScalar(e.speed);
    }else if(e.type==='dummy'){
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderT=2+Math.random()*3; const a=Math.random()*Math.PI*2; e.wander.set(Math.cos(a),0,Math.sin(a)); }
      mv.copy(e.wander).multiplyScalar(e.speed); g.rotation.y=Math.atan2(-e.wander.x,-e.wander.z);
      if(g.position.z>6)e.wander.z=-Math.abs(e.wander.z);
    }
    for(let j=0;j<enemies.length;j++){
      if(j===i)continue;
      const o=enemies[j], d=g.position.distanceTo(o.group.position);
      if(d<1.25*Math.max(e.size,o.size)&&d>0.01){
        mv.add(_v3.copy(g.position).sub(o.group.position).setY(0).normalize().multiplyScalar(e.speed*0.9));
      }
    }
    g.position.x+=mv.x*dt; g.position.z+=mv.z*dt;
    resolveXZ(g.position,0.5*e.size,g.position.y,1.8);
    g.position.x=Math.max(-ARENA+1,Math.min(ARENA-1,g.position.x));
    g.position.z=Math.max(-ARENA+1,Math.min(ARENA-1,g.position.z));
    /* follow the ground (stairs, platforms) */
    if(nav.ready){ const gh=navHeightAt(g.position.x,g.position.z); const d=gh-g.position.y;
      g.position.y+= (d>0?Math.min(d,8*dt):Math.max(d,-14*dt)); }
    if(e.type==='shooter'&&e.animator)e.group.children[0].position.y=HOVER_Y.shooter+Math.sin(state.t*2.2+e.bob)*0.12;   // hover bob

    if(e.animator){
      /* animation LOD: far enemies (25 m, 14 m on the low tier) step their mixer at 15 Hz */
      if(distP>(Q.tier==='low'?14:25)){ e.animAcc+=dt; if(e.animAcc>=1/15){ e.animator.update(e.animAcc); e.animAcc=0; } perf.animLod++; }
      else e.animator.update(dt);
      if(e.attackT>0)e.attackT-=dt; if(e.shootT>0)e.shootT-=dt;
      const mvn=mv.lengthSq()>0.2;
      const loco=!mvn?null:(e.type==='chaser'||(e.type==='boss'&&e.charge>0))?'run':'walk';
      const tsLo=loco==='run'?Math.max(.8,e.speed*e.speedMul/8):loco==='walk'?(e.type==='dummy'?.6:Math.max(.6,e.speed/5)):1;
      if(e.type==='shooter'){ e.animator.play(e.shootT>0?'shoot':'idle',0.1,e.shootT>0,1); }   // drone: hover idle, shoot one-shot
      else if(e.type==='boss'&&e.charge>0)e.animator.play('charge',0.1,false,1);
      else if(e.attackT>0)e.animator.play('attack',0.08,true,1.2);                              // Leela kick / QuadShell bite
      else e.animator.play(loco||'idle',0.12,false,tsLo);
      if(e.bones&&e.bones.flinch)poseOffset(e.bones.flinch,'x',e.hurt>0?-e.hurt*3:0);         // 120 ms hit flinch
    }else{
      e.bob+=dt*(mv.lengthSq()>0.2?9:2);
      e.ref.legs.forEach(l=>{ l.rotation.x=Math.sin(e.bob+(l.userData.leg>0?0:Math.PI))*0.55; });
      e.ref.arms.forEach(a=>{ a.rotation.x=e.type==='shooter'?-1.2:Math.sin(e.bob+(a.userData.arm>0?Math.PI:0))*0.4-0.15; });
    }

    /* hurt pop on the model child only — the hit boxes on the group keep their size */
    if(e.hurt>0){ e.hurt-=dt; if(e.model)e.model.scale.setScalar(e.modelScale*(1+e.hurt*0.2)); }
    else if(e.model&&e.model.scale.x!==e.modelScale)e.model.scale.setScalar(e.modelScale);
    if(e.spawnT<=0&&!(e.shieldT>0))g.scale.setScalar(e.size);

    /* attacks (only in a real run) */
    if(mode!=='run')continue;
    e.cd-=dt;
    if(e.type==='chaser'){
      if(e.token&&distP<1.9&&dy<1.6&&e.cd<=0){ e.cd=0.92; e.attackT=0.55; hurtPlayer(9+state.wave*0.5); g.position.add(toP.clone().multiplyScalar(-0.25)); }
    }else if(e.type==='shooter'){
      const muzzle=g.position.clone(); muzzle.y+=1.35;
      if(distP<26&&e.cd<=0&&lineOfSight(muzzle,player.pos.clone().add(new THREE.Vector3(0,1.2,0)))){
        e.cd=1.7+Math.random()*0.7; e.shootT=0.5;
        const aim=player.pos.clone().add(new THREE.Vector3(0,1.15,0)).sub(muzzle).normalize();
        aim.x+=(Math.random()-.5)*0.07; aim.y+=(Math.random()-.5)*0.05;
        shootProjectile(muzzle,aim.normalize(),24,8+state.wave*0.4,0xff86f0,false);
        blip({type:'square',f0:900,f1:400,d:.12,v:.1});
      }
    }else if(e.type==='boss'&&e.spawnT<=0){
      if(e.shieldT>0){ e.shieldT-=dt; g.scale.setScalar(e.size*(1+Math.sin(state.t*20)*0.04)); if(e.shieldT<=0)say('Shield down'); }
      if(distP<3.2&&dy<2&&e.cd<=0){ e.cd=1.0; e.attackT=0.6; hurtPlayer(22+state.wave*0.8); }
      const burst=()=>{ const m=g.position.clone(); m.y+=1.6; const cnt=12;
        for(let k=0;k<cnt;k++){ const a=k/cnt*Math.PI*2+state.t; shootProjectile(m,new THREE.Vector3(Math.cos(a),-0.05,Math.sin(a)),13,12+state.wave*0.6,0xffb347,true); }
        blip({type:'square',f0:400,f1:160,d:.3,v:.16}); shakeCam(0.55,distP); };
      if(e.burstLeft>0){ e.burstT-=dt; if(e.burstT<=0){ burst(); e.burstLeft--; e.burstT=0.38; } }
      e.cd2-=dt;
      if(e.cd2<=0){
        if(e.charge<=0&&Math.random()<0.4&&distP>6){ e.charge=1.3; e.chargeDir=toP.clone(); e.cd2=4.5; blip({type:'sawtooth',f0:90,f1:260,d:.5,v:.22}); shakeCam(0.7,distP); }
        else{ e.cd2=2.6; burst(); if(e.mk>=3){ e.burstLeft=2; e.burstT=0.38; e.cd2=4; } }
      }
      /* Mk.2+: summon Rushers */
      if(e.mk>=2){ e.summonT-=dt; if(e.summonT<=0){ e.summonT=9; let n=0;
        for(let k=0;k<3&&enemies.length<20;k++){ const a=k/3*Math.PI*2; const r=makeEnemy('chaser',state.wave); r.group.position.copy(g.position).add(new THREE.Vector3(Math.cos(a)*2.2,0,Math.sin(a)*2.2)); r.spawnT=0.45; r.group.scale.setScalar(.2); n++; }
        if(n){ say('<b>Warden</b> summons reinforcements'); spark(g.position.clone().setY(2),0xffd166,14); } } }
    }
  }

  /* ---- waves ---- */
  if(mode==='run'){
    if(state.startDelay>0){ state.startDelay-=dt; if(state.startDelay<=0){ startWave(1); spawnTimer=0.5; } }
    else if(state.spawnQueue>0){
      spawnTimer-=dt;
      if(spawnTimer<=0&&enemies.length<16){ spawnOne(); spawnTimer=0.35; syncHUD(); }
    }else if(enemies.length===0&&!state.portalOpen){
      if(state.waveBreak===0){ waveCleared(); state.waveBreak=4.5; }
      state.waveBreak-=dt;
      if(state.waveBreak<=0){ state.waveBreak=0; startWave(state.wave+1); spawnTimer=0.6; }
    }
    /* reactor pulse */
    const pu=mapData.pulse;
    if(pu){
      pu.t-=dt;
      if(!pu.warned&&pu.t<=2.2){ pu.warned=true; showBanner('Shockwave','Jump when the ring reaches you'); blip({type:'sawtooth',f0:80,f1:400,d:1.2,v:.2}); }
      pu.glow.scale.setScalar(10+(pu.t<2.2?Math.sin(state.t*30)*3+3:0));
      if(pu.t<=0&&!pu.active){ pu.active=true; pu.hit=false; pu.r=3; pu.ring.visible=true; noise(.6,.4,300,.5); }
      if(pu.active){
        pu.r+=13*dt; pu.ring.scale.set(pu.r,pu.r,1);
        const d=Math.hypot(player.pos.x,player.pos.z);
        if(!pu.hit&&Math.abs(d-pu.r)<0.8){ pu.hit=true; if(player.pos.y-navHeightAt(player.pos.x,player.pos.z)<0.5){ hurtPlayer(14+state.wave*0.6); say('Caught by the <b>shockwave</b>'); shakeCam(0.8,0); } }
        if(pu.r>ARENA*1.45){ pu.active=false; pu.ring.visible=false; pu.t=pu.period; pu.warned=false; }
      }
    }
  }
  if(mode==='range')syncRange();

  /* ---- projectiles ---- */
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    p.m.position.add(_v1.copy(p.v).multiplyScalar(dt));
    p.t-=dt;
    let dead=p.t<=0;
    if(!dead){
      const dx=p.m.position.x-player.pos.x, dy=p.m.position.y-(player.pos.y+1.0), dz=p.m.position.z-player.pos.z;
      if(dx*dx+dy*dy+dz*dz<0.6){ hurtPlayer(p.dmg); dead=true; spark(p.m.position,0xff86f0,6); }
    }
    if(!dead){
      for(let b=0;b<boxes.length;b++){
        const bx=boxes[b], q=p.m.position;
        if(q.x>bx.min.x&&q.x<bx.max.x&&q.y>bx.min.y&&q.y<bx.max.y&&q.z>bx.min.z&&q.z<bx.max.z){ dead=true; spark(q,0xff86f0,4); break; }
      }
      if(p.m.position.y<0.05){dead=true; spark(p.m.position,0xff86f0,3);}
    }
    if(dead){ releaseProjectile(p); projectiles.splice(i,1); }
  }

  /* ---- pickups ---- */
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];
    p.g.rotation.y+=dt*(p.kind==='crate'?.8:2.2); p.g.position.y=(p.kind==='crate'?.4:.85)+Math.sin(state.t*3+i)*0.12;
    p.t-=dt;
    if(p.g.position.distanceTo(player.pos.clone().setY(p.g.position.y))<1.35){
      if(p.kind==='heal'){ player.hp=Math.min(s.maxHp,player.hp+Math.round(s.maxHp*.28)); SFX.pick(); say('Repair kit <b>+'+Math.round(s.maxHp*.28)+'</b>'); }
      else { for(let q=0;q<(p.items||1);q++)giveItem(randomItemId()); }
      scene.remove(p.g); pickups.splice(i,1); syncHUD(); continue;
    }
    if(p.t<=0){ scene.remove(p.g); pickups.splice(i,1); }
  }

  /* ---- fx ---- */
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i]; t.t-=dt; t.line.material.opacity=Math.max(0,t.t/0.09)*0.9;
    if(t.t<=0){ t.line.visible=false; tracers.splice(i,1); }
  }
  for(let i=sparks.length-1;i>=0;i--){
    const sp=sparks[i]; sp.t-=dt;
    sp.v.y-=18*dt; sp.m.position.add(_v1.copy(sp.v).multiplyScalar(dt));
    sp.m.scale.setScalar(Math.max(0.05,sp.t/0.55));
    if(sp.t<=0||sp.m.position.y<0){ sp.m.visible=false; sparks.splice(i,1); }
  }
  hudTick+=dt; if(hudTick>0.1){ hudTick=0; syncHUD(); }
}
let hudTick=0;

/* fixed-step simulation: gameplay is identical at 30 and 144 fps */
const STEP=1/60; let acc=0;
const perf={fps:0,ms:0,frames:0,t:0,hist:new Float32Array(90),hi:0,animLod:0};
const dbgEl=$('dbg'),dbgTxt=$('dbgTxt'),dbgC=$('dbgC');
let dbgOn=false, dbgTick=0;
function frame(now){
  requestAnimationFrame(frame);
  const raw=(now-last)/1000; last=now;
  const dt=Math.min(0.25,raw);
  perf.animLod=0;
  if(state.running){
    acc+=dt; let steps=0;
    while(acc>=STEP&&steps<8){ update(STEP); acc-=STEP; steps++; }
    if(steps===8)acc=0;                  // tab was hidden: drop the backlog instead of spiralling
  }else if(state.mode==='menu'){ /* idle orbit for the menu backdrop */
    const t=now/1000; camera.position.set(Math.sin(t*.12)*14,5+Math.sin(t*.3)*.6,Math.cos(t*.12)*14);
    camera.lookAt(0,1.5,-4); spinners.forEach(sp=>{ sp.obj.rotation.y+=sp.speed*dt; }); tickPods(dt,camera.position);
  }
  renderer.render(scene,camera);
  /* perf sampling + auto-tier probe */
  perf.frames++; perf.t+=raw; perf.hist[perf.hi]=raw*1000; perf.hi=(perf.hi+1)%perf.hist.length;
  if(perf.t>=0.5){ perf.fps=perf.frames/perf.t; perf.ms=perf.t/perf.frames*1000; perf.frames=0; perf.t=0; }
  if(Q.auto&&!Q.probe.done){ Q.probe.t+=raw; Q.probe.frames++;
    if(Q.probe.t>3){ Q.probe.done=true; const avg=Q.probe.t/Q.probe.frames*1000;
      if(avg>26&&Q.tier==='high')applyQuality('medium'); else if(avg>34&&Q.tier==='medium')applyQuality('low'); } }
  if(dbgOn){ dbgTick+=raw; if(dbgTick>0.25){ dbgTick=0; drawDebug(); } }
}
function drawDebug(){
  const ri=renderer.info.render, m=renderer.info.memory;
  dbgTxt.textContent=
    'fps '+perf.fps.toFixed(0).padStart(3)+'  '+perf.ms.toFixed(1)+' ms   tier '+Q.tier+(Q.auto?' (auto)':'')+'\n'+
    'calls '+ri.calls+'  tris '+(ri.triangles/1000).toFixed(1)+'k  geo '+m.geometries+'  tex '+m.textures+'\n'+
    'enemies '+enemies.length+'  proj '+projectiles.length+'  sparks '+sparks.length+'  tracers '+tracers.length+'\n'+
    'mode '+state.mode+'  wave '+state.wave+'  pr '+renderer.getPixelRatio().toFixed(2)+'  shadows '+(renderer.shadowMap.enabled?'on':'off')+'\n'+
    'input '+(TOUCH?'touch ':'')+(pad.connected?'pad ':'')+'kbm  move '+inp.f.toFixed(2)+','+inp.r.toFixed(2)+(inp.fire?' FIRE':'')+'\n'+
    'anim '+(avatarAnim?avatarAnim.current:'-')+'  mixers '+enemies.reduce((n,e)=>n+(e.animator?1:0),0)+' (lod '+perf.animLod+')  corpses '+corpses.length+'  shake '+state.shake.toFixed(2)+'  kick '+player.kick.toFixed(2);
  const c=dbgC.getContext('2d'); c.clearRect(0,0,180,36);
  c.fillStyle='rgba(78,168,255,.8)';
  for(let i=0;i<perf.hist.length;i++){ const v=perf.hist[(perf.hi+i)%perf.hist.length]; const h=Math.min(36,v/50*36); c.fillRect(i*2,36-h,2,h); }
  c.fillStyle='rgba(255,90,77,.6)'; c.fillRect(0,36-16.7/50*36,180,1);
}
function toggleDebug(){ dbgOn=!dbgOn; dbgEl.classList.toggle('on',dbgOn); }
