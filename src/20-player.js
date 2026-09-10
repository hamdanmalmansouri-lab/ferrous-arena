/* ============================ player ============================ */
const player={
  pos:new THREE.Vector3(0,0,16), vel:new THREE.Vector3(), grounded:true,
  hp:100, shield:0, yaw:0, pitch:-0.06, mag:30, reloading:0, fireCd:0,
  lastHurt:99, recoil:0, kick:0, flinch:0, hitT:0, rollT:0, aimT:0, airT:0, landT:0, orbit:0, free:false, aimK:0, alive:true, abCd:0, abActive:0, iframes:0, crossT:0, dmgT:0, lead:0,
  adrenal:0, adrenalT:0, kineticT:0, sprintT:0, hemoT:0, siegeT:0, freeAmmoT:0, shotIdx:0, abStock:1, naniteFired:false
};
const run={charIdx:save.get('char',0)|0, items:{}, itemsTaken:0, stats:null, order:null, evos:{}, asc:null, kind:'endless', trial:null};
function evo(itemId){ return !!run.evos[itemId]; }
function asc(id){ return run.asc===id; }
function fired(id){ const t=id in EVO_BY_ID?state.evoFired:state.ascFired; t[id]=(t[id]||0)+1; }   // harness evidence that an evolution / ascension did something
if(run.charIdx<0||run.charIdx>=CHARS.length)run.charIdx=0;
function CH(){ return CHARS[run.charIdx]; }
function n(id){ return run.items[id]||0; }
function computeStats(){
  const b=CH().base;
  const s={
    maxHp: b.hp+20*n('plating')+35*n('reactor'),
    speed: b.speed*(1+0.10*n('servo')),
    sprint: b.sprint*(1+0.10*n('servo')),
    dmg: b.dmg*(1+0.10*n('rounds')+0.08*n('overclock')),
    fireT: b.fireT/(1+0.12*n('syringe')+0.15*n('overclock')),
    mag: Math.round(b.mag*(1+0.25*n('extmag'))),
    reloadT: b.reloadT*Math.pow(0.85,n('loader')),
    crit: Math.min(1,0.05+0.10*n('lens')),
    regen: 1.2*n('regen')+1*n('reactor'),
    cdMult: Math.max(0.45,Math.pow(0.88,n('capacitor'))),
    lifesteal: 0.03*n('coil'),
    abStock: evo('capacitor')?2:1,   // Overcharge Cell: a second ability charge
    pellets:b.pellets, spread:b.spread, headMult:b.headMult, recoil:b.recoil
  };
  run.stats=s; return s;
}
computeStats();

/* avatar: rebuilt on character select */
/* per-weapon fire effects: muzzle sprite kind, tracer width + colour, flash scale */
const WEAPON_FX={
  vanguard:{flash:'star', size:0.9, tracer:0.035,color:0xbfe0ff},
  ranger:  {flash:'lance',size:1.6, tracer:0.06, color:0x9fffd0},
  bulwark: {flash:'bloom',size:1.4, tracer:0.022,color:0xffb27a}
};
const FLASH_TEX={};
function flashTex(kind){
  if(FLASH_TEX[kind])return FLASH_TEX[kind];
  const cv=document.createElement('canvas'); cv.width=cv.height=128; const c=cv.getContext('2d'); c.clearRect(0,0,128,128);
  const core=(r,a0)=>{ const g=c.createRadialGradient(64,64,0,64,64,r); g.addColorStop(0,'rgba(255,255,255,'+a0+')'); g.addColorStop(.3,'rgba(255,230,180,'+(a0*.7)+')'); g.addColorStop(1,'rgba(255,170,80,0)'); c.fillStyle=g; c.fillRect(0,0,128,128); };
  if(kind==='star'){ core(28,1); c.strokeStyle='rgba(255,235,200,.9)'; c.lineWidth=3; for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4, L=k%2?58:40; c.beginPath(); c.moveTo(64-Math.cos(a)*L,64-Math.sin(a)*L); c.lineTo(64+Math.cos(a)*L,64+Math.sin(a)*L); c.stroke(); } }
  else if(kind==='lance'){ const g=c.createLinearGradient(0,64,128,64); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.5,'rgba(220,255,240,1)'); g.addColorStop(1,'rgba(160,255,210,0)'); c.fillStyle=g; c.fillRect(0,56,128,16); core(22,.9); }
  else { core(62,1); }
  const t=new THREE.CanvasTexture(cv); return FLASH_TEX[kind]=t;
}


const avatar=new THREE.Group(); scene.add(avatar);
let gun=null, flash=null, flashMesh=null, flashMat=null;
/* glTF character + weapon; falls back to the procedural box model when models are unavailable */
/* weapon mount in the right palm bone's space (metres, before the rig scale is divided out); tuned per mech in MOUNTS */
const GUN_MOUNT={bone:'WristR',pos:[0,0,0],rot:[0,0,0],scale:0.5};   // Wrist.R (GLTFLoader strips the dot); the Sci-Fi Guns pack is modelled at ~2x the humans' scale
/* per character overrides: pos = grip offset in the palm bone (metres, before the rig scale), rot = extra Euler (rad) after alignGun */
const MOUNTS={   // back = metres along the barrel toward the shooter, up = metres along the gun's +Y (both in gun space, after alignGun)
  vanguard:{pos:[0,0,0],rot:[0,0,0],back:0.04,up:-0.01},
  ranger:  {pos:[0,0,0],rot:[0,0,0],back:0.30,up:-0.02},
  bulwark: {pos:[0,0,0],rot:[0,0,0],back:0.02,up:0}
};
/* Vanguard palette: dark navy instead of near-black, emissive visor and a chest stripe in the accent blue */
const VANGUARD_NAVY=0x1c2a4a, VANGUARD_ACCENT=0x4ea8ff;
function applyVanguardPalette(c){
  c.group.traverse(o=>{ if(!o.isMesh||o.userData.rim)return; const m=o.material;
    if(m.name==='Swat'){ m.color.set(VANGUARD_NAVY); charBoost(m); }
    else if(m.name==='Swat_Black'){ m.color.set(0x0c1424); charBoost(m); }
    else if(m.name==='Visor'){ m.color.set(VANGUARD_ACCENT); m.emissive.set(VANGUARD_ACCENT); m.emissiveIntensity=1.2; } });
  const chest=c.bones.Chest||c.bones.Torso; if(!chest)return;
  c.group.updateMatrixWorld(true);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.035,0.03),new THREE.MeshBasicMaterial({color:VANGUARD_ACCENT}));
  const wp=new THREE.Vector3(0,1.31,0.2); chest.worldToLocal(wp); stripe.position.copy(wp);
  const q=new THREE.Quaternion(); chest.getWorldQuaternion(q); stripe.quaternion.copy(q.invert());
  chest.add(stripe);
}
const CHAR_MODEL={vanguard:'human_swat',ranger:'human_scifi',bulwark:'human_space'};
const GUN_MODEL={vanguard:'gun_ar',ranger:'gun_sniper',bulwark:'gun_cannon'};
const AIM_BONES=['Chest','Torso','torso'];   // first present bone gets the aim pitch + flinch
function buildAvatarModel(ch){
  if(MODELS.ok&&MODELS.items[CHAR_MODEL[ch.id]]){
    const c=spawnCharacter(CHAR_MODEL[ch.id]);
    if(ch.id==='vanguard')applyVanguardPalette(c);   // the other outfits keep their own palette
    addRim(c.group,ch.color); c.group.rotation.y=MODEL_YAW;
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
  if(mt.rot&&(mt.rot[0]||mt.rot[1]||mt.rot[2]))gunObj.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(mt.rot[0],mt.rot[1],mt.rot[2])));   // hand-tuned grip correction
  if(mt.back||mt.up){ const bv=new THREE.Vector3(); bv[ax.axis]=ax.sign; bv.applyQuaternion(gunObj.quaternion); gunObj.position.addScaledVector(bv,-(mt.back||0)/c.scale);
    const uv=new THREE.Vector3(0,1,0).applyQuaternion(gunObj.quaternion); gunObj.position.addScaledVector(uv,(mt.up||0)/c.scale); }
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
  /* per-weapon muzzle flash: rifle star / sniper lance / cannon bloom — a sprite (star, bloom) or two crossed planes along the barrel (lance) */
  const fx=WEAPON_FX[CH().id]||WEAPON_FX.vanguard;
  flashMat=fx.flash==='lance'
    ?new THREE.MeshBasicMaterial({map:flashTex('lance'),color:0xd0ffe8,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})
    :new THREE.SpriteMaterial({map:flashTex(fx.flash),color:fx.flash==='bloom'?0xffc080:0xffd9a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  if(fx.flash==='lance'){ flashMesh=new THREE.Group(); const ax=gun&&gun.userData.kick?gun.userData.kick.axis:GUN_AXIS;
    for(let k=0;k<2;k++){ const pl=new THREE.Mesh(new THREE.PlaneGeometry(fx.size,fx.size*0.32),flashMat); if(k)pl.rotation.x=Math.PI/2;   // long axis of the plane = X: point it down the barrel
      const wrap=new THREE.Object3D(); wrap.add(pl); if(ax.axis==='z')wrap.rotation.y=Math.PI/2; pl.position.x=(ax.sign>0?1:-1)*fx.size*0.45*(ax.axis==='x'?1:0); flashMesh.add(wrap); } }
  else { flashMesh=new THREE.Sprite(flashMat); flashMesh.scale.set(fx.size,fx.size,1); }
  flashMesh.renderOrder=3;
  const muz=avatar.getObjectByName('muzzle');
  if(muz){ muz.add(flashMesh); flashMesh.position.set(0,0,0); }
  else { flashMesh.position.set(m.userData.tw*.61,1.28,m.userData.muzzleZ); avatar.add(flashMesh); }
  if(muz){ const ws=new THREE.Vector3(); muz.getWorldScale(ws); const inv=1/Math.max(1e-4,ws.x); if(flashMesh.isSprite)flashMesh.scale.set(fx.size*inv,fx.size*inv,1); else flashMesh.scale.setScalar(inv); }   // the mount carries the gun scale: cancel it so the flash is sized in metres
  if(avatarAnim)avatarAnim.play('idle',0);
  shieldMesh.visible=false; avatar.add(shieldMesh);
  auraRing.visible=false; avatar.add(auraRing);
}
const auraRing=new THREE.Mesh(new THREE.RingGeometry(2.7,3,48),new THREE.MeshBasicMaterial({color:0x7ef0a8,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false})); auraRing.rotation.x=-Math.PI/2; auraRing.position.y=0.04;   // Nanite Bloom aura
const shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(1.25,20,14),new THREE.MeshBasicMaterial({color:0x6fe3ff,transparent:true,opacity:.22,wireframe:true}));
shieldMesh.position.y=1.05;
rebuildAvatar();
