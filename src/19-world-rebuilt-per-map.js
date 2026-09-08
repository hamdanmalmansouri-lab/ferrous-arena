/* ============================ world (rebuilt per map) ============================ */
const world=new THREE.Group(); scene.add(world);
let ARENA=34;                    // half-extent of the current map
const boxes=[];                  // {min,max}
const colliderMeshes=[];         // meshes for raycasts
const interactables=[];          // {pos,r,label,action}
const spinners=[];               // {obj,speed}
const targets=[];                // practice-range targets
let targetHitMeshes=[];

/* merge a list of {geo, matrix} into one indexed BufferGeometry (position/normal/uv) */
function mergeGeos(parts){
  let vc=0, ic=0;
  for(const p of parts){ vc+=p.geo.attributes.position.count; ic+=p.geo.index?p.geo.index.count:p.geo.attributes.position.count; }
  const pos=new Float32Array(vc*3), nor=new Float32Array(vc*3), uv=new Float32Array(vc*2);
  const idx=vc>65535?new Uint32Array(ic):new Uint16Array(ic);
  let vo=0, io=0; const nm=new THREE.Matrix3(), v=new THREE.Vector3();
  for(const p of parts){
    const g=p.geo, m=p.matrix, n=g.attributes.position.count;
    nm.getNormalMatrix(m);
    const P=g.attributes.position.array, N=g.attributes.normal.array, U=g.attributes.uv?g.attributes.uv.array:null;
    for(let i=0;i<n;i++){
      v.set(P[i*3],P[i*3+1],P[i*3+2]).applyMatrix4(m); pos[(vo+i)*3]=v.x; pos[(vo+i)*3+1]=v.y; pos[(vo+i)*3+2]=v.z;
      v.set(N[i*3],N[i*3+1],N[i*3+2]).applyMatrix3(nm).normalize(); nor[(vo+i)*3]=v.x; nor[(vo+i)*3+1]=v.y; nor[(vo+i)*3+2]=v.z;
      if(U){ uv[(vo+i)*2]=U[i*2]; uv[(vo+i)*2+1]=U[i*2+1]; }
    }
    if(g.index){ const I=g.index.array; for(let i=0;i<I.length;i++)idx[io+i]=I[i]+vo; io+=I.length; }
    else { for(let i=0;i<n;i++)idx[io+i]=vo+i; io+=n; }
    vo+=n;
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  out.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  out.setIndex(new THREE.BufferAttribute(idx,1));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}
const MAT_CACHE={};
function stdMat(color,rough,metal){
  const k=color+'|'+rough+'|'+metal;
  return MAT_CACHE[k]||(MAT_CACHE[k]=new THREE.MeshStandardMaterial({color:color,roughness:rough,metalness:metal}));
}
const BOX_GEO=new THREE.BoxGeometry(1,1,1);
let pendingBlocks={};                   // material key -> [{geo,matrix}] awaiting finalizeWorld()
function addBlock(x,y,z,w,h,d,color,rough){
  const r=rough===undefined?.85:rough, key=color+'|'+r;
  const mtx=new THREE.Matrix4().compose(new THREE.Vector3(x,y+h/2,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));
  (pendingBlocks[key]||(pendingBlocks[key]=[])).push({geo:BOX_GEO,matrix:mtx});
  boxes.push({min:new THREE.Vector3(x-w/2,y,z-d/2),max:new THREE.Vector3(x+w/2,y+h,z+d/2)});
  return null;
}
/* one mesh per material for everything queued by addBlock() */
function finalizeWorld(){
  for(const key in pendingBlocks){
    const [color,r]=key.split('|');
    const m=new THREE.Mesh(mergeGeos(pendingBlocks[key]),stdMat(parseInt(color),parseFloat(r),.18));
    m.castShadow=true; m.receiveShadow=true; world.add(m); colliderMeshes.push(m);
  }
  pendingBlocks={};
  navBuild();
}
function addFloor(half,color,gridColor){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(half*2,half*2),
    new THREE.MeshStandardMaterial({color:color,roughness:.96,metalness:.04}));
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; world.add(floor);
  const grid=new THREE.GridHelper(half*2,half,gridColor,0x223044);
  grid.material.opacity=.45; grid.material.transparent=true; grid.position.y=0.012; world.add(grid);
}
function addWalls(half,color){
  const WH=6, T=1.2;
  addBlock(0,0, half, half*2+T*2, WH, T, color);
  addBlock(0,0,-half, half*2+T*2, WH, T, color);
  addBlock( half,0,0, T, WH, half*2+T*2, color);
  addBlock(-half,0,0, T, WH, half*2+T*2, color);
}
function makeLabel(text,color,scale){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=128;
  const ctx=cv.getContext('2d');
  ctx.font='700 56px Inter, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=14;
  ctx.fillStyle=color||'#e8eef8'; ctx.fillText(text,256,64);
  const tex=new THREE.CanvasTexture(cv);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  const s=scale||1; sp.scale.set(4*s,1*s,1); return sp;
}
function addPortal(x,z,color,label,action){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,.14,10,40),new THREE.MeshBasicMaterial({color:color}));
  ring.position.set(x,2,z); world.add(ring); spinners.push({obj:ring,speed:.8,axis:'y'});
  const core=new THREE.Mesh(new THREE.CircleGeometry(1.45,32),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:.18,side:THREE.DoubleSide}));
  core.position.set(x,2,z); world.add(core); spinners.push({obj:core,speed:.8,axis:'y'});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.3,.25,28),new THREE.MeshStandardMaterial({color:0x1a2230,roughness:.6,metalness:.5}));
  base.position.set(x,.125,z); base.receiveShadow=true; world.add(base);
  const l=new THREE.PointLight(color,1.4,9,2); l.position.set(x,2.2,z); world.add(l);
  const lab=makeLabel(label,'#'+('000000'+color.toString(16)).slice(-6),.9); lab.position.set(x,4.2,z); world.add(lab);
  interactables.push({pos:new THREE.Vector3(x,0,z),r:2.3,label:label,action:action});
}
function clearWorld(){
  while(world.children.length){ const o=world.children.pop(); world.remove(o); if(colliderMeshes.indexOf(o)>=0&&o.geometry)o.geometry.dispose(); }
  pendingBlocks={};
  boxes.length=0; colliderMeshes.length=0; interactables.length=0; spinners.length=0;
  targets.length=0; targetHitMeshes=[];
  for(let i=enemies.length-1;i>=0;i--)removeEnemy(enemies[i]);
  corpses.forEach(c=>scene.remove(c.g)); corpses.length=0; podDisplays.length=0;
  projectiles.forEach(p=>releaseProjectile(p)); projectiles.length=0;
  pickups.forEach(p=>scene.remove(p.g)); pickups.length=0;
  sparks.forEach(s=>{s.m.visible=false;}); sparks.length=0;
  tracers.forEach(t=>{t.line.visible=false;}); tracers.length=0;
  feed.innerHTML='';
}

/* ---- map: lobby ---- */
const podDisplays=[];
function buildLobby(){
  ARENA=16;
  addFloor(ARENA,0x151b24,0x2f4f7a);
  addWalls(ARENA,0x232c38);
  scene.fog.color.set(0x090c14); scene.background.set(0x090c14);
  /* character pods along the back wall */
  podDisplays.length=0;
  CHARS.forEach((ch,i)=>{
    const x=(i-1)*6.5, z=-10;
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,.5,28),new THREE.MeshStandardMaterial({color:0x1c2430,roughness:.55,metalness:.5}));
    ped.position.set(x,.25,z); ped.castShadow=true; ped.receiveShadow=true; world.add(ped);
    boxes.push({min:new THREE.Vector3(x-1.5,0,z-1.5),max:new THREE.Vector3(x+1.5,.5,z+1.5)});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.75,.07,8,40),new THREE.MeshBasicMaterial({color:ch.color}));
    ring.rotation.x=Math.PI/2; ring.position.set(x,.52,z); world.add(ring);
    const disp=buildAvatarModel(ch); disp.position.set(x,.5,z); world.add(disp); spinners.push({obj:disp,speed:.5,axis:'y'});
    if(disp.userData.animator)disp.userData.animator.play('idle',0);
    const l=new THREE.PointLight(ch.color,1.2,8,2); l.position.set(x,3.2,z); world.add(l);
    const lab=makeLabel(ch.name.toUpperCase(),ch.css,.8); lab.position.set(x,3.4,z); world.add(lab);
    const sub=makeLabel(ch.role,'#8fa2bd',.5); sub.position.set(x,2.85,z); world.add(sub);
    podDisplays.push({ring:ring,idx:i,obj:disp,anim:disp.userData.animator||null,head:disp.userData.bones?(disp.userData.bones.Head||disp.userData.bones.head||null):null});
    interactables.push({pos:new THREE.Vector3(x,0,z),r:2.6,label:'Select '+ch.name,action:()=>selectChar(i,true)});
  });
  /* back wall panel */
  addBlock(0,0,-14.5,22,4.5,.6,0x1e2733);
  const title=makeLabel('FERROUS ARENA','#4ea8ff',1.6); title.position.set(0,5.4,-14); world.add(title);
  /* portals */
  addPortal(-11,3,0x3ddc84,'Shooting Range',()=>goRange());
  addPortal( 11,3,0x4ea8ff,'Deploy',()=>goRun());
  /* decoration crates */
  [[-13,-12],[13,-12],[-5,11],[6,12],[0,13.5]].forEach((p,i)=>addBlock(p[0],0,p[1],1.6,1.2+(i%2)*.6,1.6,i%2?0x33404f:0x2c3745));
  finalizeWorld(); updatePodRings();
}
function updatePodRings(emote){
  podDisplays.forEach(p=>{ p.ring.material.color.set(p.idx===run.charIdx?0xffffff:CHARS[p.idx].color); p.ring.scale.setScalar(p.idx===run.charIdx?1.15:1);
    if(emote&&p.anim&&p.idx===run.charIdx)p.anim.play('emote',0.1,true,1); });   // 'Hello' wave on select
}
/* lobby pods: advance idle/emote, return to idle after a one-shot, and turn each head toward the viewer */
const _podV=new THREE.Vector3();
function tickPods(dt,eye){
  for(const p of podDisplays){
    if(!p.anim)continue;
    p.anim.update(dt); if(p.anim.once&&p.anim.finished())p.anim.play('idle',0.25);
    if(p.head){ p.obj.getWorldPosition(_podV); const want=Math.atan2(eye.x-_podV.x,eye.z-_podV.z);
      let d=want-(p.obj.rotation.y+Math.PI); d=Math.atan2(Math.sin(d),Math.cos(d));
      poseOffset(p.head,'y',Math.abs(d)<1.5?Math.max(-0.9,Math.min(0.9,d)):0); }
  }
}

/* ---- map: practice range ---- */
function buildRange(){
  ARENA=22;
  addFloor(ARENA,0x121a17,0x2f7a5a);
  addWalls(ARENA,0x22302a);
  scene.fog.color.set(0x070d0b); scene.background.set(0x070d0b);
  /* firing line */
  addBlock(0,0,10,14,1.1,.8,0x2c3745);
  /* targets on the far wall at varying distance */
  const plates=[[-9,-6],[-4.5,-10],[0,-14],[4.5,-10],[9,-6],[-12,-16],[12,-16]];
  plates.forEach(p=>addTarget(p[0],p[1],false));
  addTarget(-6,-18,true); addTarget(6,-18,true);
  /* cover to practise peeking */
  addBlock(-14,0,-2,2.2,2.2,2.2,0x33404f); addBlock(14,0,-2,2.2,2.2,2.2,0x33404f);
  addPortal(0,18,0xffc247,'Return to Lobby',()=>goLobby());
  /* dummies */
  for(let i=0;i<3;i++)spawnDummy();
  const lab=makeLabel('TARGETS RESET AUTOMATICALLY','#8fa2bd',.6); lab.position.set(0,4.5,-20); world.add(lab);
  finalizeWorld();
}
function addTarget(x,z,moving){
  const g=new THREE.Group();
  if(MODELS.ok&&MODELS.items.target){
    const plate=new THREE.Group(); const m=spawnProp('target'); const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3());
    const k=1.9/Math.max(sz.y,0.01); m.scale.setScalar(k); m.position.y=-b.min.y*k; plate.add(m);
    const hit=new THREE.Mesh(new THREE.BoxGeometry(sz.x*k,sz.y*k,Math.max(.25,sz.z*k)),MAT_HIDDEN); hit.position.y=sz.y*k/2; plate.add(hit);
    g.add(plate); g.position.set(x,0,z); g.rotation.y=Math.PI; world.add(g);
    const t={g:g,plate:plate,hit:hit,down:0,moving:moving,x0:x,ph:Math.random()*6};
    hit.userData.target=t; targets.push(t); targetHitMeshes.push(hit); return;
  }
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.2,8),new THREE.MeshStandardMaterial({color:0x2a3442,metalness:.6,roughness:.5}));
  pole.position.y=.6; g.add(pole);
  const plate=new THREE.Group(); plate.position.y=1.2;
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.08,24),new THREE.MeshStandardMaterial({color:0xe8eef8,roughness:.5}));
  disc.rotation.x=Math.PI/2; disc.position.y=.55; plate.add(disc);
  const r1=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.09,24),new THREE.MeshStandardMaterial({color:0xff5a4d,roughness:.5}));
  r1.rotation.x=Math.PI/2; r1.position.y=.55; plate.add(r1);
  const r2=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.1,24),new THREE.MeshStandardMaterial({color:0xffd166,roughness:.5}));
  r2.rotation.x=Math.PI/2; r2.position.y=.55; plate.add(r2);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.15,.2),MAT_HIDDEN);
  hit.position.y=.55; plate.add(hit);
  g.add(plate); g.position.set(x,0,z); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); world.add(g);
  const t={g:g,plate:plate,hit:hit,down:0,moving:moving,x0:x,ph:Math.random()*6};
  hit.userData.target=t; targets.push(t); targetHitMeshes.push(hit);
}
