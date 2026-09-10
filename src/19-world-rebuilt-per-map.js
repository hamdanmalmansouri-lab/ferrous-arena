/* ============================ world (rebuilt per map) ============================ */
const world=new THREE.Group(); scene.add(world);
let ARENA=34;                    // half-extent of the current map
const boxes=[];                  // {min,max}
const colliderMeshes=[];         // meshes for raycasts
const interactables=[];          // {pos,r,label,action}
const spinners=[];               // {obj,speed}
const targets=[];                // practice-range targets
let targetHitMeshes=[];
let hitListVer=0;                // bumped whenever enemyHitMeshes / targetHitMeshes change; tryFire rebuilds its cast list lazily

/* attribute read that honours KHR_mesh_quantization storage (normalized ints; r128's getX() does not denormalize) and interleaved buffers (gltf-transform interleaves vertex data) */
function attrAt(a,i,k){ const A=a.isInterleavedBufferAttribute?a.data.array:a.array; const v=a.isInterleavedBufferAttribute?A[i*a.data.stride+a.offset+k]:A[i*a.itemSize+k]; if(!a.normalized)return v;
  return A instanceof Int8Array?Math.max(v/127,-1):A instanceof Uint8Array?v/255:A instanceof Int16Array?Math.max(v/32767,-1):A instanceof Uint16Array?v/65535:v; }
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
    const P=g.attributes.position, N=g.attributes.normal, U=g.attributes.uv||null;
    for(let i=0;i<n;i++){
      v.set(attrAt(P,i,0),attrAt(P,i,1),attrAt(P,i,2)).applyMatrix4(m); pos[(vo+i)*3]=v.x; pos[(vo+i)*3+1]=v.y; pos[(vo+i)*3+2]=v.z;
      v.set(attrAt(N,i,0),attrAt(N,i,1),attrAt(N,i,2)).applyMatrix3(nm).normalize(); nor[(vo+i)*3]=v.x; nor[(vo+i)*3+1]=v.y; nor[(vo+i)*3+2]=v.z;
      if(U){ uv[(vo+i)*2]=attrAt(U,i,0); uv[(vo+i)*2+1]=attrAt(U,i,1); }
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
/* decor block: merged like addBlock but with no collision box (backdrops, corridor frames) */
function addDecor(x,y,z,w,h,d,color,rough){
  const r=rough===undefined?.85:rough, key=color+'|'+r;
  const mtx=new THREE.Matrix4().compose(new THREE.Vector3(x,y+h/2,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));
  (pendingBlocks[key]||(pendingBlocks[key]=[])).push({geo:BOX_GEO,matrix:mtx});
}
/* ---- kit props as set dressing: merged into one mesh per texture sheet (no per-prop draw calls), optional collision ----
   addProp(id, x, z, rotDeg, height, solid, y): scaled so the model's raw height hits `height`, feet at y (default 0). */
let pendingProps={};                    // material key -> {mat, parts}
const PROP_MATS={};
const _pm=new THREE.Matrix4(), _pq=new THREE.Quaternion();
function addProp(id,x,z,rotDeg,height,solid,y){
  const rec=MODELS.items[id]; if(!rec||!rec.raw)return null;
  const raw=rec.raw, s=height/raw.h, y0=y||0, rot=(rotDeg||0)*Math.PI/180;
  const base=new THREE.Matrix4().compose(new THREE.Vector3(x,y0-raw.minY*s,z),_pq.setFromAxisAngle(UP,rot),new THREE.Vector3(s,s,s));
  rec.root.updateMatrixWorld(true);
  rec.root.traverse(o=>{ if(!o.isMesh||!o.geometry.attributes.normal)return;
    const m=o.material, key=(m.map?m.map.uuid:'flat:'+m.color.getHex())+(m.emissiveMap?'+e':'');
    if(!PROP_MATS[key]){ const pm=new THREE.MeshStandardMaterial({map:m.map||null,color:m.map?0xffffff:m.color.getHex(),roughness:.8,metalness:.15});
      if(m.emissiveMap){ pm.emissiveMap=m.emissiveMap; pm.emissive.set(0xffffff); } PROP_MATS[key]=pm; }
    (pendingProps[key]||(pendingProps[key]={mat:PROP_MATS[key],parts:[]})).parts.push({geo:o.geometry,matrix:_pm.copy(base).multiply(o.matrixWorld).clone()}); });
  if(solid){ /* AABB of the rotated raw box */
    const c=Math.abs(Math.cos(rot)), sn=Math.abs(Math.sin(rot)); const hx=(raw.size[0]*c+raw.size[2]*sn)/2*s, hz=(raw.size[0]*sn+raw.size[2]*c)/2*s;
    const mx=(raw.min[0]+raw.max[0])/2*s, mz=(raw.min[2]+raw.max[2])/2*s;
    const cx=x+mx*Math.cos(rot)+mz*Math.sin(rot), cz=z-mx*Math.sin(rot)+mz*Math.cos(rot);
    boxes.push({min:new THREE.Vector3(cx-hx,y0,cz-hz),max:new THREE.Vector3(cx+hx,y0+height,cz+hz)}); }
  return {x:x,z:z,h:height};
}
/* one mesh per material for everything queued by addBlock() / addProp() */
function finalizeWorld(){
  for(const key in pendingBlocks){
    const [color,r]=key.split('|');
    const m=new THREE.Mesh(mergeGeos(pendingBlocks[key]),stdMat(parseInt(color),parseFloat(r),.18));
    m.castShadow=true; m.receiveShadow=true; world.add(m); colliderMeshes.push(m);
  }
  for(const key in pendingProps){ const p=pendingProps[key]; const m=new THREE.Mesh(mergeGeos(p.parts),p.mat);
    m.castShadow=true; m.receiveShadow=true; world.add(m); colliderMeshes.push(m); }
  pendingBlocks={}; pendingProps={};
  navBuild();
}
/* ---- explosive barrels: shoot one to blow it (AoE on enemies and the player, chains to neighbours); rebuilt on wave clear ---- */
const barrels=[];
function addBarrel(x,z){
  const m=MODELS.ok?spawnProp('barrel1'):null; const g=new THREE.Group();
  let h=1.1, r=.4;
  if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=h/sz.y; m.scale.setScalar(k); m.position.y=-b.min.y*k; r=Math.max(sz.x,sz.z)*k/2; g.add(m); }
  else { const c=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,h,12),stdMat(0x7a2a1e,.6,.3)); c.position.y=h/2; c.castShadow=true; g.add(c); }
  const gl=glowSprite(0xff5a4d,1.8); gl.position.y=h*.6; g.add(gl);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(r*2.2,h,r*2.2),MAT_HIDDEN); hit.position.y=h/2; g.add(hit);
  g.position.set(x,0,z); world.add(g);
  const box={min:new THREE.Vector3(x-r,0,z-r),max:new THREE.Vector3(x+r,h,z+r)}; boxes.push(box);
  const b={x:x,z:z,g:g,hit:hit,box:box,dead:false,spawnT:0}; hit.userData.barrel=b; targetHitMeshes.push(hit); hitListVer++; barrels.push(b); return b;
}
function explodeBarrel(b){
  if(b.dead)return; b.dead=true;
  const p=new THREE.Vector3(b.x,.7,b.z);
  world.remove(b.g); const bi=boxes.indexOf(b.box); if(bi>=0)boxes.splice(bi,1); const hi=targetHitMeshes.indexOf(b.hit); if(hi>=0)targetHitMeshes.splice(hi,1); hitListVer++;
  spark(p,0xff8a3d,22); spark(p,0xffd166,10); spark(p,0x444444,8);
  noise(.55,.7,140,.6); blip({type:'sawtooth',f0:160,f1:40,d:.35,v:.25});
  const dp=Math.hypot(player.pos.x-b.x,player.pos.z-b.z); shakeCam(0.9,dp);
  if(state.mode==='run'&&dp<3.4)hurtPlayer(Math.round(16+state.wave*0.5));
  const dmg=70+state.wave*4; let n=0;
  for(const e of enemies.slice()){ if(e.dead)continue; const d=Math.hypot(e.group.position.x-b.x,e.group.position.z-b.z); const R=4.8*e.size;
    if(d<R){ dealDamage(e,dmg*(1-0.6*d/R),e.group.position.clone().setY(1),false,false); n++; } }
  if(n)say('Barrel took out <b>'+n+'</b>','item');
  for(const o of barrels)if(!o.dead&&Math.hypot(o.x-b.x,o.z-b.z)<3.6)explodeBarrel(o);   // chain reaction
}
function respawnBarrels(){ for(const b of barrels.slice())if(b.dead){ barrels.splice(barrels.indexOf(b),1); const nb=addBarrel(b.x,b.z); nb.g.scale.setScalar(.01); nb.spawnT=.5; } }
function addFloor(half,color,gridColor){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(half*2,half*2),
    new THREE.MeshStandardMaterial({color:color,roughness:.96,metalness:.04}));
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; world.add(floor);
  const grid=new THREE.GridHelper(half*2,half,gridColor,0x223044);
  grid.material.opacity=.2; grid.material.transparent=true; grid.position.y=0.012; world.add(grid);   // kept faint so the floor rung of the value ladder stays readable
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
  while(world.children.length){ const o=world.children.pop(); world.remove(o); if(colliderMeshes.indexOf(o)>=0&&o.geometry)o.geometry.dispose();
    if(o.userData.disposable){ if(o.geometry)o.geometry.dispose(); if(o.material){ if(o.material.map)o.material.map.dispose(); o.material.dispose(); } } }
  pendingBlocks={}; pendingProps={}; barrels.length=0;
  boxes.length=0; colliderMeshes.length=0; interactables.length=0; spinners.length=0;
  targets.length=0; targetHitMeshes=[]; hitListVer++;
  for(let i=enemies.length-1;i>=0;i--)removeEnemy(enemies[i]);
  corpses.forEach(c=>scene.remove(c.g)); corpses.length=0; podDisplays.length=0;
  projectiles.forEach(p=>releaseProjectile(p)); projectiles.length=0;
  pickups.forEach(p=>scene.remove(p.g)); pickups.length=0;
  sparks.forEach(s=>{s.m.visible=false;}); sparks.length=0;
  tracers.forEach(t=>{t.line.visible=false;}); tracers.length=0;
  decals.forEach(d=>{d.m.visible=false;}); decals.length=0; dmgNums.forEach(d=>{d.sp.visible=false;}); dmgNums.length=0;
  feed.innerHTML='';
}

/* ---- sky: gradient dome + stars + one unlit silhouette band, rebuilt per map (lives in `world`) ---- */
const SKY_R=150, SIL_R=140;
const SKY_DEFAULT=[[0,'#03040a'],[.55,'#0a1220'],[.8,'#16263c'],[1,'#20344f']];
function buildSky(stops,starCount,silhouette,silColor){
  const cv=document.createElement('canvas'); cv.width=4; cv.height=256; const ctx=cv.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,256); stops.forEach(s=>g.addColorStop(s[0],s[1])); ctx.fillStyle=g; ctx.fillRect(0,0,4,256);
  const tex=new THREE.CanvasTexture(cv);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(SKY_R,24,16),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false,depthWrite:false}));
  sky.renderOrder=-3; sky.userData.disposable=true; world.add(sky);
  const count=Math.round(starCount*Q.cfg.stars/420);
  if(count>0){
    const pts=new Float32Array(count*3);
    for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, e=Math.random()*0.62+0.05, r=SKY_R-8; pts[i*3]=Math.cos(a)*Math.cos(e)*r; pts[i*3+1]=Math.sin(e)*r; pts[i*3+2]=Math.sin(a)*Math.cos(e)*r; }
    const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pts,3));
    const st=new THREE.Points(pg,new THREE.PointsMaterial({color:0x9fc2ff,size:.72,sizeAttenuation:true,transparent:true,opacity:.75,fog:false,depthWrite:false}));
    st.renderOrder=-2; st.userData.disposable=true; world.add(st);
  }
  if(silhouette)world.add(buildSilhouette(silhouette,silColor||0x000000));
}
/* one low-poly extruded strip at SIL_R: a height profile per kind (stacks / masts / ridge / towers), seeded so it never changes */
function buildSilhouette(kind,color){
  const N=256, rng=mulberry32({stacks:11,masts:23,ridge:37,towers:53}[kind]||7), h=new Float32Array(N);
  const base=kind==='ridge'?6:kind==='masts'?2.5:4; for(let i=0;i<N;i++)h[i]=base;
  const add=(c,w,ht)=>{ for(let k=-w;k<=w;k++){ const i=((c+k)%N+N)%N; if(ht>h[i])h[i]=ht; } };
  if(kind==='stacks'){ for(let k=0;k<26;k++)add(Math.floor(rng()*N),1+Math.floor(rng()*5),8+rng()*16); for(let k=0;k<9;k++)add(Math.floor(rng()*N),0,26+rng()*16); }
  else if(kind==='masts'){ for(let k=0;k<14;k++){ const c=Math.floor(rng()*N); add(c,0,24+rng()*22); add(c,2,6+rng()*4); } for(let k=0;k<10;k++)add(Math.floor(rng()*N),2+Math.floor(rng()*3),5+rng()*6); }
  else if(kind==='ridge'){ for(let i=0;i<N;i++){ const a=i/N*Math.PI*2; h[i]=9+5*Math.sin(a*3+1)+3.5*Math.sin(a*7+2)+2*Math.sin(a*13+.5)+1.2*Math.sin(a*29); } }
  else { for(let k=0;k<9;k++)add(Math.floor(rng()*N),3+Math.floor(rng()*6),18+rng()*18); for(let k=0;k<5;k++)add(Math.floor(rng()*N),1,34+rng()*10); }
  const pos=new Float32Array((N+1)*6), idx=[];
  for(let i=0;i<=N;i++){ const a=i/N*Math.PI*2, j=i%N, x=Math.cos(a)*SIL_R, z=Math.sin(a)*SIL_R; pos[i*6]=x; pos[i*6+1]=-6; pos[i*6+2]=z; pos[i*6+3]=x; pos[i*6+4]=h[j]; pos[i*6+5]=z; }
  for(let i=0;i<N;i++){ const a=i*2,b=i*2+1,c=(i+1)*2,d=(i+1)*2+1; idx.push(a,b,c,b,d,c); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setIndex(idx);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:color,fog:false,side:THREE.DoubleSide,depthWrite:false}));
  m.renderOrder=-1; m.frustumCulled=false; m.userData.disposable=true; return m;
}

/* ---- map: lobby ---- */
const podDisplays=[];
function buildLobby(){
  ARENA=16;
  const L=LADDER.lobby; addFloor(ARENA,L.floor,0x2f4f7a);
  /* three walls; the back opens onto a receding hangar corridor (a backdrop with depth and a vanishing point), closed by an invisible collider */
  const WH=6,T=1.2,half=ARENA;
  addBlock(0,0,half,half*2+T*2,WH,T,L.wall); addBlock(half,0,0,T,WH,half*2+T*2,L.wall); addBlock(-half,0,0,T,WH,half*2+T*2,L.wall);
  boxes.push({min:new THREE.Vector3(-half-T,0,-half-T/2),max:new THREE.Vector3(half+T,WH,-half+T/2)});
  buildLobbyBackdrop();
  setTheme({fogColor:0x090c14,fogFar:90}); buildSky(SKY_DEFAULT,420,null);
  /* character pods along the back, each with its own three-point rig and an in-world stat card */
  podDisplays.length=0;
  CHARS.forEach((ch,i)=>{
    const x=(i-1)*6.5, z=-10;
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,.5,28),new THREE.MeshStandardMaterial({color:0x1c2430,roughness:.55,metalness:.5}));
    ped.position.set(x,.25,z); ped.castShadow=true; ped.receiveShadow=true; world.add(ped);
    boxes.push({min:new THREE.Vector3(x-1.5,0,z-1.5),max:new THREE.Vector3(x+1.5,.5,z+1.5)});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.75,.07,8,40),new THREE.MeshBasicMaterial({color:ch.color}));
    ring.rotation.x=Math.PI/2; ring.position.set(x,.52,z); world.add(ring);
    const disp=buildAvatarModel(ch); disp.position.set(x,.5,z); disp.rotation.y=Math.PI; world.add(disp);   // faces the spawn; the selected pod turns slowly
    const spin={obj:disp,speed:0,axis:'y'}; spinners.push(spin);
    if(disp.userData.animator)disp.userData.animator.play('idle',0);
    const key=new THREE.PointLight(0xfff1dc,1.3,8,2); key.position.set(x+1.2,3.6,z+2.4); world.add(key);          // warm key, front-high
    const rimL=new THREE.PointLight(ch.color,1.8,7,2); rimL.position.set(x-0.6,3.0,z-1.9); world.add(rimL);        // accent rim, behind
    if(Q.tier!=='low'){ const fill=new THREE.PointLight(0x8fb4ff,0.55,9,2); fill.position.set(x-2.2,1.6,z+1.6); world.add(fill); }   // soft cool fill
    const lab=makeLabel(ch.name.toUpperCase(),ch.css,.8); lab.position.set(x,3.4,z); world.add(lab);
    const card=makeCard(ch); card.position.set(x+2.9,1.55,z+0.4); card.rotation.y=-0.5; world.add(card);   // every card to the right of its pod, angled toward the spawn
    podDisplays.push({ring:ring,idx:i,obj:disp,spin:spin,anim:disp.userData.animator||null,head:disp.userData.bones?(disp.userData.bones.Head||disp.userData.bones.head||null):null});
    interactables.push({pos:new THREE.Vector3(x,0,z),r:2.6,label:'Select '+ch.name,action:()=>selectChar(i,true)});
  });
  /* extruded, bevelled title over the corridor mouth */
  const title=buildTitle('FERROUS ARENA'); title.position.set(0,5.4,-15.2); world.add(title);
  /* portals */
  addPortal(-11,3,0x3ddc84,'Shooting Range',()=>goRange());
  addPortal( 11,3,0x4ea8ff,'Deploy',()=>goRun());
  /* set dressing: lockers and shelves along the side walls, a desk by the range portal, crates by the deploy portal */
  if(MODELS.ok){ for(let i=0;i<4;i++){ addProp('locker',-15,-8+i*1.1,90,2.3,true); addProp('locker',15,-8+i*1.1,-90,2.3,true); }
    addProp('shelves',-14.9,4,90,2.3,true); addProp('desk',-11,-4,0,.9,true); addProp('crate_large',12,-6,90,1.4,true); addProp('crate_tarp',13,10,20,1.5,true); addProp('crate_tarp',-8,12.5,160,1.4,true); addProp('barrel2',9,12.5,0,.8,true); addProp('barrel2',10,13.4,40,.8,true); }
  else [[-13,-12],[13,-12],[-5,11],[6,12],[0,13.5]].forEach((p,i)=>addBlock(p[0],0,p[1],1.6,1.2+(i%2)*.6,1.6,i%2?L.coverA:L.coverB));
  finalizeWorld(); updatePodRings();
}
/* hangar corridor behind the pods: six shrinking frames with a lit lintel line, a narrowing floor and a glow at the vanishing point */
function buildLobbyBackdrop(){
  const frames=[[-16.6,26,9],[-21,21,7.6],[-27,16.5,6.2],[-34,12.5,5],[-42,9,3.8],[-51,6,2.7]];
  frames.forEach((f,i)=>{ const z=f[0],w=f[1],h=f[2],t=0.5,dark=i%2?0x0d121a:0x111925;
    addDecor(0,h,z,w,t,t,dark); addDecor(0,0,z,w,t,t,dark); addDecor(-w/2,0,z,t,h+t,t,dark); addDecor(w/2,0,z,t,h+t,t,dark);
    const strip=new THREE.Mesh(new THREE.BoxGeometry(w-0.8,0.07,0.07),basicMat(i%2?0x1d3f6b:0x4ea8ff)); strip.position.set(0,h-0.32,z+t/2+0.05); world.add(strip);
    const gl=glowSprite(0x4ea8ff,1.2+(5-i)*0.45); gl.position.set(0,h*0.55,z); world.add(gl); });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-13,0.01,-16,13,0.01,-16,3,0.01,-60,-3,0.01,-60]),3)); g.setIndex([0,2,1,0,3,2]); g.computeVertexNormals();
  const floor=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x0b0f16,roughness:.95,side:THREE.DoubleSide})); floor.receiveShadow=true; floor.userData.disposable=true; world.add(floor);
  const end=glowSprite(0x4ea8ff,7); end.position.set(0,2.2,-60); world.add(end);
}
/* title: canvas text sampled into an extruded cell grid (the body) with a smaller emissive cap per cell (the bevel), each merged into one mesh */
function buildTitle(text){
  const cv=document.createElement('canvas'); cv.width=640; cv.height=96; const c=cv.getContext('2d');
  c.font='900 78px Inter, system-ui, sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#fff'; c.fillText(text,320,48);
  const d=c.getImageData(0,0,640,96).data, STEP=5, CELL=0.09, body=[], face=[];
  for(let y=0;y<96;y+=STEP)for(let x=0;x<640;x+=STEP){ if(d[(y*640+x)*4+3]<128)continue;
    const wx=(x/STEP-64+0.5)*CELL, wy=-(y/STEP-9.6+0.5)*CELL;
    body.push({geo:BOX_GEO,matrix:new THREE.Matrix4().compose(new THREE.Vector3(wx,wy,-0.17),new THREE.Quaternion(),new THREE.Vector3(CELL,CELL,0.34))});
    face.push({geo:BOX_GEO,matrix:new THREE.Matrix4().compose(new THREE.Vector3(wx,wy,0.03),new THREE.Quaternion(),new THREE.Vector3(CELL*0.7,CELL*0.7,0.06))}); }
  const g=new THREE.Group();
  if(body.length){ const bm=new THREE.Mesh(mergeGeos(body),new THREE.MeshStandardMaterial({color:0x1a2a44,roughness:.45,metalness:.6})); bm.castShadow=true; bm.userData.disposable=true; g.add(bm);
    const fm=new THREE.Mesh(mergeGeos(face),new THREE.MeshStandardMaterial({color:0x2a5fa0,emissive:0x4ea8ff,emissiveIntensity:1.1,roughness:.4})); fm.userData.disposable=true; g.add(fm); }
  return g;
}
/* in-world stat + ability card: an unlit canvas plane */
function makeCard(ch){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=352; const c=cv.getContext('2d');
  const rr=(x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
  rr(2,2,508,348,26); c.fillStyle='rgba(10,13,20,.86)'; c.fill(); c.lineWidth=3; c.strokeStyle='rgba(120,160,220,.4)'; c.stroke();
  c.textAlign='left'; c.textBaseline='alphabetic';
  c.fillStyle=ch.css; c.font='800 46px Inter, system-ui, sans-serif'; c.fillText(ch.name.toUpperCase(),30,64);
  c.fillStyle='#8fa2bd'; c.font='600 22px Inter, system-ui, sans-serif'; c.fillText(ch.role.toUpperCase(),30,98);
  const b=ch.base, cols=[['HEALTH',b.hp],['SPEED',b.speed],['DAMAGE',b.dmg+(b.pellets>1?'x'+b.pellets:'')],['MAG',b.mag]];
  cols.forEach((k,i)=>{ const x=30+i*118; c.fillStyle='#8fa2bd'; c.font='600 17px Inter, system-ui, sans-serif'; c.fillText(k[0],x,146); c.fillStyle='#e8eef8'; c.font='700 34px Inter, system-ui, sans-serif'; c.fillText(String(k[1]),x,184); });
  c.fillStyle=ch.css; c.font='700 27px Inter, system-ui, sans-serif'; c.fillText(ch.ability.name+'  \u00b7  Q',30,246);
  c.fillStyle='#c9d4e6'; c.font='400 21px Inter, system-ui, sans-serif';
  const words=ch.ability.desc.split(' '); let line='', y=282; for(const w of words){ const t=line?line+' '+w:w; if(c.measureText(t).width>452){ c.fillText(line,30,y); y+=28; line=w; } else line=t; } if(line)c.fillText(line,30,y);
  const tex=new THREE.CanvasTexture(cv);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.79),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  m.userData.disposable=true; return m;
}
function updatePodRings(emote){
  podDisplays.forEach(p=>{ const sel=p.idx===run.charIdx; p.ring.material.color.set(sel?0xffffff:CHARS[p.idx].color); p.ring.scale.setScalar(sel?1.15:1);
    if(p.spin){ p.spin.speed=sel?0.35:0; if(!sel)p.obj.rotation.y=Math.PI; }   // slow turntable on the selected operative, the others face the spawn
    if(emote&&p.anim&&sel)p.anim.play('emote',0.1,true,1); });   // 'Hello' wave on select
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
  const L=LADDER.range; addFloor(ARENA,L.floor,0x2f7a5a);
  addWalls(ARENA,L.wall);
  setTheme({fogColor:0x070d0b}); buildSky(SKY_DEFAULT,420,null);
  /* firing line */
  addBlock(0,0,10,14,1.1,.8,L.cover);
  /* targets on the far wall at varying distance */
  const plates=[[-9,-6],[-4.5,-10],[0,-14],[4.5,-10],[9,-6],[-12,-16],[12,-16]];
  plates.forEach(p=>addTarget(p[0],p[1],false));
  addTarget(-6,-18,true); addTarget(6,-18,true);
  /* cover to practise peeking, barrels to practise blowing up */
  addBlock(-14,0,-2,2.2,2.2,2.2,L.coverA); addBlock(14,0,-2,2.2,2.2,2.2,L.coverA);
  if(MODELS.ok){ addBarrel(-9,-11); addBarrel(9,-11); addProp('crate_large',-17,6,90,1.4,true); addProp('crate_large',17,6,90,1.4,true); addProp('shelves',-19.5,-8,90,2.3,true); addProp('desk',18,12,180,.9,true); addProp('barrel2',-16,14,0,.8,true); }
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
    hit.userData.target=t; targets.push(t); targetHitMeshes.push(hit); hitListVer++; return;
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
  hit.userData.target=t; targets.push(t); targetHitMeshes.push(hit); hitListVer++;
}
