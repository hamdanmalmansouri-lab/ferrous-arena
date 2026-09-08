/* ============================ player ============================ */
const player={
  pos:new THREE.Vector3(0,0,16), vel:new THREE.Vector3(), grounded:true,
  hp:100, shield:0, yaw:0, pitch:-0.06, mag:30, reloading:0, fireCd:0,
  lastHurt:99, recoil:0, kick:0, flinch:0, hitT:0, rollT:0, aimT:0, airT:0, landT:0, orbit:0, free:false, aimK:0, alive:true, abCd:0, abActive:0, iframes:0
};
const run={charIdx:save.get('char',0)|0, items:{}, itemsTaken:0, stats:null, order:null};
if(run.charIdx<0||run.charIdx>=CHARS.length)run.charIdx=0;
function CH(){ return CHARS[run.charIdx]; }
function n(id){ return run.items[id]||0; }
function computeStats(){
  const b=CH().base;
  const s={
    maxHp: b.hp+20*n('plating'),
    speed: b.speed*(1+0.10*n('servo')),
    sprint: b.sprint*(1+0.10*n('servo')),
    dmg: b.dmg*(1+0.10*n('rounds')),
    fireT: b.fireT/(1+0.12*n('syringe')),
    mag: Math.round(b.mag*(1+0.25*n('extmag'))),
    reloadT: b.reloadT*Math.pow(0.85,n('loader')),
    crit: Math.min(1,0.05+0.10*n('lens')),
    regen: 1.2*n('regen'),
    cdMult: Math.pow(0.88,n('capacitor')),
    lifesteal: 0.03*n('coil'),
    pellets:b.pellets, spread:b.spread, headMult:b.headMult, recoil:b.recoil
  };
  run.stats=s; return s;
}
computeStats();

/* avatar: rebuilt on character select */
const avatar=new THREE.Group(); scene.add(avatar);
let gun=null, flash=null, flashMesh=null;
/* glTF character + weapon; falls back to the procedural box model when models are unavailable */
/* weapon mount in the right palm bone's space (metres, before the rig scale is divided out); tuned per mech in MOUNTS */
const GUN_MOUNT={bone:'WristR',pos:[0,0,0],rot:[0,0,0],scale:0.5};   // Wrist.R (GLTFLoader strips the dot); the Sci-Fi Guns pack is modelled at ~2x the humans' scale
const MOUNTS={};   // per character id overrides: {bone,pos,rot,scale}
const CHAR_MODEL={vanguard:'human_swat',ranger:'human_scifi',bulwark:'human_space'};
const GUN_MODEL={vanguard:'gun_ar',ranger:'gun_sniper',bulwark:'gun_cannon'};
const AIM_BONES=['Chest','Torso','torso'];   // first present bone gets the aim pitch + flinch
function buildAvatarModel(ch){
  if(MODELS.ok&&MODELS.items[CHAR_MODEL[ch.id]]){
    const c=spawnCharacter(CHAR_MODEL[ch.id]); c.group.rotation.y=MODEL_YAW;   // outfits keep their own palette
    const g=new THREE.Group(); g.add(c.group);
    const gunObj=new THREE.Group(); gunObj.name='gun';
    const gunModel=spawnProp(GUN_MODEL[ch.id],ch.color); const gunAxis=gunBarrel(GUN_MODEL[ch.id]);
    /* gun models point their barrel along GUN_AXIS; measure the bounds while the model is still detached (identity space) */
    const muzzle=new THREE.Object3D(); muzzle.name='muzzle';
    if(gunModel){ const b=new THREE.Box3().setFromObject(gunModel); const sz=b.getSize(new THREE.Vector3()); const ctr=b.getCenter(new THREE.Vector3());
      muzzle.position.copy(ctr); muzzle.position[gunAxis.axis]=gunAxis.sign>0?b.max[gunAxis.axis]:b.min[gunAxis.axis];
      gunObj.userData.kick={obj:gunModel,len:sz[gunAxis.axis]||1,axis:gunAxis};   // recoil target: the gun mesh inside its mount
      gunObj.add(gunModel); }
    const mt=Object.assign({},GUN_MOUNT,MOUNTS[ch.id]||{}); const arm=c.bones[mt.bone];
    if(arm){ gunObj.scale.setScalar(mt.scale/c.scale); arm.add(gunObj); alignGun(gunObj,arm,c,mt,gunAxis); }
    else { gunObj.position.set(.3,1.2,-.2); g.add(gunObj); }
    (gunModel||gunObj).add(muzzle);
    g.userData.animator=c.animator; g.userData.bones=c.bones; g.userData.model=true; g.userData.tw=.72; g.userData.muzzleZ=-1.1;
    return g;
  }
  return buildAvatarProcedural(ch);
}
function buildAvatarProcedural(ch){
  const g=new THREE.Group();
  const suit=new THREE.MeshStandardMaterial({color:ch.color,roughness:.5,metalness:.35});
  const dark=new THREE.MeshStandardMaterial({color:0x1a2230,roughness:.7,metalness:.3});
  const heavy=ch.id==='bulwark', light=ch.id==='ranger';
  const tw=heavy?.9:light?.62:.72;
  const torso=new THREE.Mesh(new THREE.BoxGeometry(tw,.86,heavy?.52:.42),suit); torso.position.y=1.14; g.add(torso);
  const hips=new THREE.Mesh(new THREE.BoxGeometry(tw*.86,.34,.4),dark); hips.position.y=.62; g.add(hips);
  const head=new THREE.Mesh(new THREE.SphereGeometry(heavy?.27:.24,18,14),dark); head.position.y=1.76; g.add(head);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.3,.11,.06),new THREE.MeshBasicMaterial({color:ch.color})); visor.position.set(0,1.78,-.22); g.add(visor);
  if(heavy){ for(const s of[-1,1]){ const pad=new THREE.Mesh(new THREE.BoxGeometry(.3,.22,.5),suit); pad.position.set(s*.58,1.5,0); g.add(pad);} }
  if(light){ const scope=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.3),dark); scope.position.set(.18,1.9,0); g.add(scope); }
  for(const s of[-1,1]){ const leg=new THREE.Mesh(new THREE.BoxGeometry(.24,.66,.26),dark); leg.position.set(s*.18,.3,0); g.add(leg); }
  const armL=new THREE.Mesh(new THREE.BoxGeometry(.19,.6,.19),suit); armL.position.set(-tw*.64,1.16,-.08); g.add(armL);
  const armR=new THREE.Mesh(new THREE.BoxGeometry(.19,.52,.19),suit); armR.position.set(tw*.61,1.2,-.2); armR.rotation.x=-1.15; g.add(armR);
  /* weapon */
  const gn=new THREE.Group();
  const gm=new THREE.MeshStandardMaterial({color:0x161c26,roughness:.5,metalness:.7});
  const bl=heavy?.7:light?1.15:.86, bw=heavy?.2:.14;
  const body=new THREE.Mesh(new THREE.BoxGeometry(bw,heavy?.22:.17,bl),gm); body.position.z=-bl*.33; gn.add(body);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(heavy?.07:.045,heavy?.07:.045,light?.7:.5,10),new THREE.MeshStandardMaterial({color:0x0e1218,roughness:.35,metalness:.9}));
  barrel.rotation.x=Math.PI/2; barrel.position.z=-(bl*.66+(light?.35:.25)); gn.add(barrel);
  const magm=new THREE.Mesh(new THREE.BoxGeometry(.11,heavy?.2:.3,.16),new THREE.MeshStandardMaterial({color:0x223049,roughness:.5,metalness:.5})); magm.position.set(0,-.2,-.2); gn.add(magm);
  const glow=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.3),new THREE.MeshBasicMaterial({color:ch.color})); glow.position.set(0,.1,-.4); gn.add(glow);
  gn.position.set(tw*.61,1.28,-.1); gn.name='gun'; g.add(gn);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.muzzleZ=-(bl*.66+(light?.7:.5))-.1; g.userData.tw=tw;
  return g;
}
/* Orient a weapon in a palm bone so its barrel (GUN_AXIS) points down the character's forward while the rig holds its
   'shoot' pose, and its top faces up. Sampled once at build time, so any rig / any gun works without hand-tuned angles. */
const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion(),_m4=new THREE.Matrix4();
function gunBarrel(id){ const r=MODELS.items[id]; return (r&&r.raw&&r.raw.barrel)||GUN_AXIS; }   // packer-detected barrel axis, else the default
function alignGun(gunObj,palm,c,mt,ax){
  ax=ax||GUN_AXIS; const an=c.animator, shoot=an.actions.aim||an.actions.shoot;
  if(shoot){ an.mixer.stopAllAction(); shoot.reset().play(); an.mixer.update(0.15); }   // a few frames into the shot pose
  c.group.updateMatrixWorld(true);
  palm.getWorldQuaternion(_qa); c.group.getWorldQuaternion(_qb);      // palm relative to the character root (which faces +Z in model space)
  const rel=_qb.invert().multiply(_qa);                                //  = inv(root) * palm
  /* target basis in root space: the barrel axis maps to +Z (model forward), gun +Y to up, the third axis follows */
  const fwd=new THREE.Vector3(0,0,1), up=new THREE.Vector3(0,1,0);
  let tx,ty=up.clone(),tz;
  if(ax.axis==='x'){ tx=fwd.clone().multiplyScalar(ax.sign); tz=new THREE.Vector3().crossVectors(tx,ty); }
  else { tz=fwd.clone().multiplyScalar(ax.sign); tx=new THREE.Vector3().crossVectors(ty,tz); }
  _m4.makeBasis(tx,ty,tz); const qTarget=new THREE.Quaternion().setFromRotationMatrix(_m4);
  gunObj.quaternion.copy(rel.invert().multiply(qTarget));              // local = inv(rel) * target
  gunObj.position.fromArray(mt.pos).divideScalar(c.scale);
  if(shoot){ an.mixer.stopAllAction(); }
}
/* rig facing: yaw applied to every character instance so the model looks down the game's -Z; GUN_AXIS: the kit guns' barrel direction in model space */
const MODEL_YAW=Math.PI; const GUN_AXIS={axis:'x',sign:-1};
let avatarAnim=null, avatarBones=null, avatarAimBone=null;
function rebuildAvatar(){
  while(avatar.children.length)avatar.remove(avatar.children[0]);
  const m=buildAvatarModel(CH()); while(m.children.length){ avatar.add(m.children[0]); }
  gun=avatar.getObjectByName('gun'); avatarAnim=m.userData.animator||null; avatarBones=m.userData.bones||null;
  avatarAimBone=null; if(avatarBones)for(const b of AIM_BONES)if(avatarBones[b]){ avatarAimBone=avatarBones[b]; break; }
  flash=new THREE.PointLight(0xffd08a,0,7,2); flash.position.set(0,1.3,-1.1); avatar.add(flash);
  flashMesh=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0}));
  const muz=avatar.getObjectByName('muzzle');
  if(muz){ muz.add(flashMesh); flashMesh.position.set(0,0,0); }
  else { flashMesh.position.set(m.userData.tw*.61,1.28,m.userData.muzzleZ); avatar.add(flashMesh); }
  if(avatarAnim)avatarAnim.play('idle',0);
  shieldMesh.visible=false; avatar.add(shieldMesh);
}
const shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(1.25,20,14),new THREE.MeshBasicMaterial({color:0x6fe3ff,transparent:true,opacity:.22,wireframe:true}));
shieldMesh.position.y=1.05;
rebuildAvatar();
