/* ============================ player ============================ */
const player={
  pos:new THREE.Vector3(0,0,16), vel:new THREE.Vector3(), grounded:true,
  hp:100, shield:0, yaw:0, pitch:-0.06, mag:30, reloading:0, fireCd:0,
  lastHurt:99, recoil:0, alive:true, abCd:0, abActive:0, iframes:0
};
const run={charIdx:save.get('char',0)|0, items:{}, itemsTaken:0, stats:null};
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
function buildAvatarModel(ch){
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
function rebuildAvatar(){
  while(avatar.children.length)avatar.remove(avatar.children[0]);
  const m=buildAvatarModel(CH()); while(m.children.length){ avatar.add(m.children[0]); }
  gun=avatar.getObjectByName('gun');
  flash=new THREE.PointLight(0xffd08a,0,7,2); flash.position.set(0,1.3,-1.1); avatar.add(flash);
  flashMesh=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0}));
  flashMesh.position.set(m.userData.tw*.61,1.28,m.userData.muzzleZ); avatar.add(flashMesh);
  shieldMesh.visible=false; avatar.add(shieldMesh);
}
const shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(1.25,20,14),new THREE.MeshBasicMaterial({color:0x6fe3ff,transparent:true,opacity:.22,wireframe:true}));
shieldMesh.position.y=1.05;
rebuildAvatar();
