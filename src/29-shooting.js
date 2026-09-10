/* ============================ shooting ============================ */
function dealDamage(e,dmg,point,head,crit){
  if(e.shieldT>0){ spark(point,0x6fe3ff,4); SFX.hit(); popHit(false,false); return; }
  const healBase=Math.min(dmg,Math.max(0,e.hp));   // lifesteal never counts overkill
  e.hp-=dmg; e.hurt=.14;
  if(e.type==='boss'&&e.mk>=4&&!e.shieldUsed&&e.hp<e.maxHp*0.5){ e.shieldUsed=true; e.shieldT=3.5; say('<b>Warden</b> raises a shield','item'); }
  if(state.mode==='range'){ rangeStats.dmgLog.push({t:state.t,v:dmg}); rangeStats.hits++; }
  if(run.stats.lifesteal>0&&state.mode==='run'){ player.hp=Math.min(run.stats.maxHp,player.hp+healBase*run.stats.lifesteal); }
  spark(point,crit?0xffd166:head?0xffe08a:0xff6a4d,head||crit?11:6);
  if(crit)SFX.crit(); else if(head)SFX.head(); else SFX.hit();
  if(e.hp<=0){ killEnemy(e,head); popHit(true); } else popHit(false,crit);
}
/* cast list: enemy hit boxes + range plates / barrels, rebuilt only when one of those lists changes (hitListVer).
   The map itself is resolved with rayWorld() (slab test over boxes[]) instead of raycasting the merged meshes. */
let hitListBuilt=-1; const hitList=[];
function getHitList(){ if(hitListBuilt!==hitListVer){ hitList.length=0; for(let i=0;i<enemyHitMeshes.length;i++)hitList.push(enemyHitMeshes[i]); for(let i=0;i<targetHitMeshes.length;i++)hitList.push(targetHitMeshes[i]); hitListBuilt=hitListVer; } return hitList; }
/* nearest thing along a ray. Hit boxes whose centre projects nearer than `near` are skipped (and so is world geometry
   nearer than max(0,near)). Fills the scratch record {t, obj, world, point}; obj null + world false = nothing within maxT. */
const _shot={t:0,obj:null,world:false,point:new THREE.Vector3()};
const _aim=new THREE.Vector3(),_mz=new THREE.Vector3(),_sdir=new THREE.Vector3(),_so=new THREE.Vector3();
function castShot(origin,dir,maxT,near){
  ray.set(origin,dir); ray.far=maxT;
  const hits=ray.intersectObjects(getHitList(),false); ray.far=Infinity;
  let t=maxT, obj=null;
  for(let i=0;i<hits.length;i++){ const h=hits[i]; _v2.setFromMatrixPosition(h.object.matrixWorld).sub(origin); if(_v2.dot(dir)>=near){ t=h.distance; obj=h.object; break; } }
  const wt=rayWorld(origin,dir,t,near); _shot.world=wt>=0; if(wt>=0){ t=wt; obj=null; }
  _shot.t=t; _shot.obj=obj; _shot.point.copy(origin).addScaledVector(dir,t); return _shot;
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
  crossEl.classList.add('wide'); player.crossT=0.11;

  const muzzle=_mz; flashMesh.getWorldPosition(muzzle);
  const baseSpread=(s.spread+(inp.sprint?0.01:0)+(player.vel.lengthSq()>2?0.004:0))*(1-0.4*player.aimK);   // aiming tightens the cone
  let pelletHits=0;
  for(let p=0;p<s.pellets;p++){
    /* 1. aim: the camera ray through the screen centre (+ spread) finds what the crosshair is on, ignoring anything
          whose centre sits behind the muzzle plane (an enemy or wall behind the player can't eat a forward shot) */
    ray.setFromCamera({x:0,y:0},camera);
    const dir=_sdir.copy(ray.ray.direction), origin=_so.copy(ray.ray.origin);
    dir.x+=(Math.random()-.5)*baseSpread*2; dir.y+=(Math.random()-.5)*baseSpread*2; dir.z+=(Math.random()-.5)*baseSpread*2;
    dir.normalize();
    const tMuzzle=_v1.copy(muzzle).sub(origin).dot(dir);
    const a=castShot(origin,dir,120,tMuzzle-0.6); _aim.copy(a.point);
    /* 2. hit: from the muzzle to that aim point, so cover between the gun and the target blocks the shot */
    dir.copy(_aim).sub(muzzle); const len=dir.length(); if(len<1e-3)continue; dir.multiplyScalar(1/len);
    const h=castShot(muzzle,dir,len+0.05,-2);
    const endPoint=h.point;
    if(h.obj){
      const e=h.obj.userData.enemy, tg=h.obj.userData.target, bar=h.obj.userData.barrel;
      if(bar){ pelletHits++; explodeBarrel(bar); }
      else if(e&&!e.dead){
        pelletHits++;
        const head=h.obj.userData.head, crit=Math.random()<s.crit;
        const dmg=s.dmg*(head?s.headMult:1)*(crit?2:1)*(od?1.2:1);
        dealDamage(e,dmg,endPoint,head,crit);
      }else if(tg&&tg.down<=0){
        pelletHits++; rangeStats.hits++; rangeStats.targets++;
        rangeStats.dmgLog.push({t:state.t,v:s.dmg*(Math.random()<s.crit?2:1)});
        tg.down=2.2; spark(endPoint,0xffd166,8); SFX.head(); popHit(false,true);
      }else spark(endPoint,0x9fb4cc,3);
    }else if(h.world)spark(endPoint,0x9fb4cc,3);
    if(p<4)tracer(muzzle,endPoint);
  }
  state.acc.shots+=s.pellets-1; state.acc.hits+=pelletHits;   // accuracy counts every pellet (shots++ above counted the trigger pull)
  if(player.mag===0)startReload();
  syncHUD();
}
function killEnemy(e,head){
  e.dead=true;
  if(e.type==='dummy'){
    spark(e.group.position.clone().setY(1.1),0x9fb4cc,12); SFX.kill();
    removeEnemy(e,true); after(2,()=>{ if(state.mode==='range')spawnDummy(); }); return;
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
