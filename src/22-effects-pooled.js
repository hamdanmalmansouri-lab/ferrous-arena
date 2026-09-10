/* ============================ effects (pooled) ============================ */
/* soft radial glow sprite — replaces dynamic PointLights (each light add/remove recompiles every shader) */
const GLOW_TEX=(function(){
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d');
  const g=c.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,255,255,.45)'); g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g; c.fillRect(0,0,64,64); return new THREE.CanvasTexture(cv);
})();
const GLOW_CACHE={};
function glowSprite(color,size){
  const m=GLOW_CACHE[color]||(GLOW_CACHE[color]=new THREE.SpriteMaterial({map:GLOW_TEX,color:color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const s=new THREE.Sprite(m); s.scale.set(size,size,1); return s;
}

/* tracers: fixed pool of thin additive cylinders (WebGL ignores line widths), width + colour per weapon, fade by width */
const TRACER_POOL=[]; const TRACER_MAX=48;
const TRACER_GEO=new THREE.CylinderGeometry(1,1,1,5,1,true); TRACER_GEO.translate(0,0.5,0);   // unit tube from y=0 to y=1
const TRACER_MATS={};
function tracerMat(color){ return TRACER_MATS[color]||(TRACER_MATS[color]=new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false})); }
(function(){ for(let i=0;i<TRACER_MAX;i++){ const m=new THREE.Mesh(TRACER_GEO,tracerMat(0xbfe0ff)); m.visible=false; m.frustumCulled=false; scene.add(m); TRACER_POOL.push(m); } })();
const _trD=new THREE.Vector3();
function tracer(a,b,width,color){
  let m=null; for(const l of TRACER_POOL){ if(!l.visible){m=l;break;} }
  if(!m){ const t=tracers.shift(); if(!t)return; m=t.line; }
  const w=width||0.035; _trD.copy(b).sub(a); const len=_trD.length(); if(len<1e-3)return; _trD.multiplyScalar(1/len);
  m.position.copy(a); m.quaternion.setFromUnitVectors(UP,_trD); m.scale.set(w,len,w); m.material=tracerMat(color||0xbfe0ff); m.visible=true;
  tracers.push({line:m,t:0.09,w:w});
}
/* ---- damage numbers: 24 pooled canvas sprites (white / gold crit / red headshot), rise and fade over 0.7 s ---- */
const DMG_MAX=24, DMG_POOL=[], dmgNums=[]; let dmgCursor=0;
(function(){ for(let i=0;i<DMG_MAX;i++){ const cv=document.createElement('canvas'); cv.width=128; cv.height=64; const tex=new THREE.CanvasTexture(cv);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false})); sp.scale.set(1.1,0.55,1); sp.visible=false; sp.renderOrder=5; scene.add(sp);
  DMG_POOL.push({sp:sp,cv:cv,ctx:cv.getContext('2d'),tex:tex,t:0,vy:0}); } })();
function dmgNumber(pos,value,kind){
  const d=DMG_POOL[dmgCursor]; dmgCursor=(dmgCursor+1)%DMG_MAX;
  if(d.sp.visible){ const k=dmgNums.indexOf(d); if(k>=0)dmgNums.splice(k,1); }
  const ctx=d.ctx; ctx.clearRect(0,0,128,64); ctx.font=(kind==='crit'?'800 42px':'700 36px')+' Inter, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=7; ctx.strokeStyle='rgba(0,0,0,.85)'; ctx.fillStyle=kind==='crit'?'#ffd166':kind==='head'?'#ff5a4d':'#f2f6ff';
  const txt=String(Math.max(1,Math.round(value))); ctx.strokeText(txt,64,34); ctx.fillText(txt,64,34); d.tex.needsUpdate=true;
  d.sp.position.copy(pos); d.sp.position.x+=(Math.random()-.5)*0.5; d.sp.position.y+=0.35; d.sp.material.opacity=1; d.sp.visible=true; d.t=0.7; d.vy=1.5;
  const s=kind==='crit'?1.45:kind==='head'?1.2:1; d.sp.scale.set(1.1*s,0.55*s,1);
  dmgNums.push(d);
}
function tickDmgNumbers(dt){
  for(let i=dmgNums.length-1;i>=0;i--){ const d=dmgNums[i]; d.t-=dt; d.sp.position.y+=d.vy*dt; d.vy=Math.max(0.3,d.vy-2.4*dt);
    d.sp.material.opacity=Math.min(1,d.t/0.3); if(d.t<=0){ d.sp.visible=false; dmgNums.splice(i,1); } }
}

/* ---- impact decals: pooled scorch planes on world hits, oriented to the surface, fade over 8 s ---- */
const DECAL_MAX=32, DECAL_POOL=[], decals=[]; let decalCursor=0;
const DECAL_TEX=(function(){ const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'); const g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(8,6,4,.85)'); g.addColorStop(.45,'rgba(10,8,6,.55)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,64,64); return new THREE.CanvasTexture(cv); })();
(function(){ const geo=new THREE.PlaneGeometry(1,1); for(let i=0;i<DECAL_MAX;i++){ const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:DECAL_TEX,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  m.visible=false; m.frustumCulled=false; m.renderOrder=1; scene.add(m); DECAL_POOL.push(m); } })();
const _dN=new THREE.Vector3();
function decal(point,normal){
  const m=DECAL_POOL[decalCursor]; decalCursor=(decalCursor+1)%DECAL_MAX;
  if(m.visible){ const k=decals.findIndex(d=>d.m===m); if(k>=0)decals.splice(k,1); }
  const s=0.28+Math.random()*0.14; m.scale.set(s,s,1); m.position.copy(point).addScaledVector(normal,0.012);
  m.lookAt(_dN.copy(point).add(normal)); m.rotateZ(Math.random()*6.28); m.material.opacity=1; m.visible=true;
  decals.push({m:m,t:8});
}
function tickDecals(dt){ for(let i=decals.length-1;i>=0;i--){ const d=decals[i]; d.t-=dt; if(d.t<2)d.m.material.opacity=d.t/2; if(d.t<=0){ d.m.visible=false; decals.splice(i,1); } } }
/* surface normal of the last rayWorld hit (box face nearest the point, or the floor) */
function worldHitNormal(point,out){
  const b=rayWorldHit>=0?boxes[rayWorldHit]:null; if(!b){ return out.set(0,1,0); }
  const dx0=Math.abs(point.x-b.min.x),dx1=Math.abs(point.x-b.max.x),dy0=Math.abs(point.y-b.min.y),dy1=Math.abs(point.y-b.max.y),dz0=Math.abs(point.z-b.min.z),dz1=Math.abs(point.z-b.max.z);
  const m=Math.min(dx0,dx1,dy0,dy1,dz0,dz1);
  return m===dx0?out.set(-1,0,0):m===dx1?out.set(1,0,0):m===dy0?out.set(0,-1,0):m===dy1?out.set(0,1,0):m===dz0?out.set(0,0,-1):out.set(0,0,1);
}

/* sparks: pool of tiny meshes with shared per-colour materials; fade by scale */
const SPARK_GEO=new THREE.SphereGeometry(.055,5,4);
const SPARK_POOL=[]; const SPARK_MAX=240;
(function(){ for(let i=0;i<SPARK_MAX;i++){ const m=new THREE.Mesh(SPARK_GEO,basicMat(0xffffff)); m.visible=false; m.frustumCulled=false; scene.add(m); SPARK_POOL.push(m); } })();
let sparkCursor=0;
function spark(pos,color,n){
  const count=Math.max(1,Math.round((n||7)*Q.cfg.fx));
  for(let i=0;i<count;i++){
    const m=SPARK_POOL[sparkCursor]; sparkCursor=(sparkCursor+1)%SPARK_MAX;
    if(m.visible){ const k=sparks.findIndex(s=>s.m===m); if(k>=0)sparks.splice(k,1); }
    m.material=basicMat(color); m.position.copy(pos); m.scale.setScalar(1); m.visible=true;
    sparks.push({m:m,v:new THREE.Vector3((Math.random()-.5)*7,Math.random()*5+1,(Math.random()-.5)*7),t:.55});
  }
}

/* projectiles: pooled spheres + glow sprite, no lights */
const PROJ_POOL=[]; const PROJ_MAX=160;
const PROJ_GEO_S=new THREE.SphereGeometry(.14,8,6), PROJ_GEO_B=new THREE.SphereGeometry(.26,8,6);
(function(){ for(let i=0;i<PROJ_MAX;i++){ const m=new THREE.Mesh(PROJ_GEO_S,basicMat(0xff86f0)); const gl=glowSprite(0xff86f0,1.4); gl.name='glow'; m.add(gl); m.visible=false; m.frustumCulled=false; scene.add(m); PROJ_POOL.push(m); } })();
function shootProjectile(from,dir,speed,dmg,color,big){
  let m=null; for(const p of PROJ_POOL){ if(!p.visible){m=p;break;} }
  if(!m)return;
  m.geometry=big?PROJ_GEO_B:PROJ_GEO_S; m.material=basicMat(color||0xff86f0);
  const gl=m.getObjectByName('glow'); gl.material=GLOW_CACHE[color||0xff86f0]||glowSprite(color||0xff86f0,1).material; gl.scale.set(big?2.4:1.4,big?2.4:1.4,1);
  m.position.copy(from); m.visible=true;
  projectiles.push({m:m,v:dir.clone().multiplyScalar(speed||24),t:5,dmg:dmg});
}
function releaseProjectile(p){ p.m.visible=false; }

function dropPickup(pos,kind){
  const g=new THREE.Group();
  if(kind==='item'){
    const m=MODELS.ok?spawnProp('module'):null;
    if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=.7/Math.max(sz.x,sz.y,sz.z); m.scale.setScalar(k); m.position.y=-(b.min.y+b.max.y)/2*k; g.add(m); }
    else { const oct=new THREE.Mesh(new THREE.OctahedronGeometry(.36,0),basicMat(0xffd166)); g.add(oct); }
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.04,6,24),basicMat(0xffd166));
    ring.rotation.x=Math.PI/2; g.add(ring,glowSprite(0xffd166,2.6));
  }else if(kind==='crate'){
    const m=MODELS.ok?spawnProp('crate'):null;
    if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=1.1/Math.max(sz.x,sz.z); m.scale.setScalar(k); m.position.y=-b.min.y*k-.4; g.add(m); }
    else { const box=new THREE.Mesh(new THREE.BoxGeometry(1,.8,1),stdMat(0x2c3745,.6,.4)); box.castShadow=true; g.add(box); }
    const trim=new THREE.Mesh(new THREE.TorusGeometry(.75,.05,6,24),basicMat(0xffd166)); trim.rotation.x=Math.PI/2; trim.position.y=-.35;
    const gl=glowSprite(0xffd166,3.2); gl.position.y=.6; g.add(trim,gl);
  }else{
    const m=MODELS.ok?spawnProp('healthpack'):null;
    if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=.6/Math.max(sz.x,sz.y,sz.z); m.scale.setScalar(k); m.position.y=-(b.min.y+b.max.y)/2*k; g.add(m); }
    else { const a=new THREE.Mesh(new THREE.BoxGeometry(.46,.15,.15),basicMat(0x3ddc84)); const b=new THREE.Mesh(new THREE.BoxGeometry(.15,.46,.15),basicMat(0x3ddc84)); g.add(a,b); }
    g.add(glowSprite(0x3ddc84,1.6));
  }
  g.position.set(pos.x,.9,pos.z); scene.add(g);
  pickups.push({g:g,t:kind==='crate'?9999:40,kind:kind,items:(kind==='crate'&&state.mods.bounty)?2:1});
}
