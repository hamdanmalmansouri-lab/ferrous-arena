/* ============================ enemies ============================ */
const enemies=[], projectiles=[], tracers=[], pickups=[], sparks=[];
const enemyHitMeshes=[];
const MAT_CHASER=new THREE.MeshStandardMaterial({color:0xc0392b,roughness:.6,metalness:.4});
const MAT_SHOOT =new THREE.MeshStandardMaterial({color:0x8e44ad,roughness:.55,metalness:.5});
const MAT_BOSS  =new THREE.MeshStandardMaterial({color:0xd98a2b,roughness:.45,metalness:.6});
const MAT_DUMMY =new THREE.MeshStandardMaterial({color:0x5c6b7a,roughness:.7,metalness:.3});
const MAT_METAL =new THREE.MeshStandardMaterial({color:0x1c222b,roughness:.65,metalness:.6});
const ENEMY_NAME={chaser:'Rusher',shooter:'Lancer',boss:'Warden',dummy:'Dummy'};

const MAT_HIDDEN=new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide});   // double-sided so a shot cast from inside a hit box still registers
const BASIC_CACHE={};
function basicMat(color){ return BASIC_CACHE[color]||(BASIC_CACHE[color]=new THREE.MeshBasicMaterial({color:color})); }
const GEO_LEG=new THREE.BoxGeometry(.2,.6,.22), GEO_ARM=new THREE.BoxGeometry(.17,.62,.17), GEO_EYE=new THREE.BoxGeometry(.26,.07,.05);
const GEO_BODYHIT=new THREE.BoxGeometry(.95,1.35,.75), GEO_HEADHIT=new THREE.BoxGeometry(.52,.5,.52);
const ENEMY_GEO={};   // type -> {torso, metal} merged static parts (built once)
function boxPart(w,h,d,x,y,z){ return {geo:new THREE.BoxGeometry(w,h,d),matrix:new THREE.Matrix4().makeTranslation(x,y,z)}; }
function enemyGeo(type){
  if(ENEMY_GEO[type])return ENEMY_GEO[type];
  const metal=[boxPart(.4,.36,.4,0,1.78,0),boxPart(.6,.32,.44,0,.55,0)];
  if(type==='boss'){ metal.push(boxPart(.36,.26,.6,-.6,1.55,0),boxPart(.36,.26,.6,.6,1.55,0)); }
  const g={torso:mergeGeos([boxPart(.78,.9,.5,0,1.1,0)]),metal:mergeGeos(metal)};
  return ENEMY_GEO[type]=g;
}
const ENEMY_MODEL={chaser:'mech_leela',shooter:'enemy_drone',boss:'enemy_quad',dummy:'mech_leela'};
const ENEMY_TINT={chaser:0xd8352a,shooter:0xc06cff,boss:0xffb52e,dummy:0x6b7b8c};
const HOVER_Y={shooter:1.25};                       // the Lancer drone floats
const FLINCH_BONES=['Chest','Torso','Root','Body'];
const corpses=[];
function makeEnemy(type,wave){
  const g=new THREE.Group();
  let animator=null, bones=null, model=null, modelScale=1;
  if(MODELS.ok&&MODELS.items[ENEMY_MODEL[type]]){
    const c=spawnCharacter(ENEMY_MODEL[type],ENEMY_TINT[type]); addRim(c.group,ENEMY_TINT[type]); c.group.rotation.y=MODEL_YAW; g.add(c.group); animator=c.animator; bones=c.bones; model=c.group; modelScale=c.scale;
    if(HOVER_Y[type])c.group.position.y=HOVER_Y[type];
    bones.flinch=null; for(const b of FLINCH_BONES)if(bones[b]){ bones.flinch=bones[b]; break; }
  } else buildEnemyProcedural(g,type);
  return finishEnemy(g,type,wave,animator,bones,model,modelScale);
}
function buildEnemyProcedural(g,type){
  const mat=type==='shooter'?MAT_SHOOT:type==='boss'?MAT_BOSS:type==='dummy'?MAT_DUMMY:MAT_CHASER;
  const eg=enemyGeo(type);
  const torso=new THREE.Mesh(eg.torso,mat); g.add(torso);
  const metal=new THREE.Mesh(eg.metal,MAT_METAL); g.add(metal);
  const eye=new THREE.Mesh(GEO_EYE,basicMat(type==='shooter'?0xff7bf0:type==='boss'?0xffd166:type==='dummy'?0x9fb4cc:0xff5a3c));
  eye.position.set(0,1.8,-.21); g.add(eye);
  for(const s of[-1,1]){
    const leg=new THREE.Mesh(GEO_LEG,MAT_METAL);
    leg.position.set(s*.17,.3,0); g.add(leg); leg.userData.leg=s;
    const arm=new THREE.Mesh(GEO_ARM,mat);
    arm.position.set(s*.5,1.1,type==='shooter'?-.12:-.05); g.add(arm); arm.userData.arm=s;
  }
  if(type==='boss'){
    const crest=new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.5),basicMat(0xffd166)); crest.position.set(0,2.1,0); g.add(crest);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
}
function finishEnemy(g,type,wave,animator,bones,model,modelScale){
  const bodyHit=new THREE.Mesh(GEO_BODYHIT,MAT_HIDDEN);
  bodyHit.position.y=1.02; g.add(bodyHit);
  const headHit=new THREE.Mesh(GEO_HEADHIT,MAT_HIDDEN);
  headHit.position.y=1.79; g.add(headHit);

  const scale=wave>0?(1+wave*0.018):1;   // v3: flatter curve — item choice + scrap carry the power instead of raw HP
  let hp=(34+wave*8)*scale, speed=(type==='shooter'?2.9:4.05)+Math.min(wave*0.16,2.0);
  if(type==='boss'){ hp=(700+wave*140)*scale; speed=3.4+Math.min(wave*0.05,1.2); }
  if(type==='dummy'){ hp=260; speed=1.4; }
  const e={
    group:g, type:type, hp:hp, maxHp:hp, speed:speed, size:type==='boss'?2.3:1,
    cd:type==='shooter'?1.2+Math.random():0.6, cd2:3.5, charge:0, dead:false, hurt:0, strafe:Math.random()<.5?1:-1,
    strafeT:1+Math.random()*2, bob:Math.random()*6, ref:{legs:[],arms:[]}, spawnT:0, wander:new THREE.Vector3(), wanderT:0,
    speedMul:1, path:null, pathI:0, navT:Math.random()*0.4, navGoal:-1,
    animator:animator, bones:bones, model:model||null, modelScale:modelScale||1, token:false, attackT:0, shootT:0, animAcc:0, hitBoxes:[bodyHit,headHit]
  };
  g.children.forEach(c=>{ if(c.userData.leg)e.ref.legs.push(c); if(c.userData.arm)e.ref.arms.push(c); });
  bodyHit.userData.enemy=e; bodyHit.userData.head=false;
  headHit.userData.enemy=e; headHit.userData.head=true;
  enemyHitMeshes.push(bodyHit,headHit); hitListVer++;
  scene.add(g); enemies.push(e);
  return e;
}
function removeEnemy(e,keepCorpse){
  if(keepCorpse&&e.animator&&e.animator.actions.die){ e.hitBoxes.forEach(h=>e.group.remove(h)); e.animator.play('die',0.08,true); corpses.push({g:e.group,an:e.animator,t:Math.min(2.6,e.animator.actions.die.getClip().duration+0.4)}); }
  else scene.remove(e.group);
  for(let i=enemyHitMeshes.length-1;i>=0;i--)
    if(enemyHitMeshes[i].userData.enemy===e)enemyHitMeshes.splice(i,1);
  hitListVer++;
  const i=enemies.indexOf(e); if(i>=0)enemies.splice(i,1);
}
function spawnDummy(){
  const e=makeEnemy('dummy',0);
  e.group.position.set((Math.random()-.5)*16,0,-4-Math.random()*6);
  e.spawnT=0.45; e.group.scale.setScalar(.2);
}
