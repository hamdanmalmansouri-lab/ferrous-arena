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

/* tracers: fixed pool of lines, geometry rewritten in place */
const TRACER_POOL=[]; const TRACER_MAX=48;
(function(){ for(let i=0;i<TRACER_MAX;i++){
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xbfe0ff,transparent:true,opacity:.9}));
  line.visible=false; line.frustumCulled=false; scene.add(line); TRACER_POOL.push(line);
} })();
function tracer(a,b){
  let line=null; for(const l of TRACER_POOL){ if(!l.visible){line=l;break;} }
  if(!line){ const t=tracers.shift(); if(!t)return; line=t.line; }
  const p=line.geometry.attributes.position.array; p[0]=a.x;p[1]=a.y;p[2]=a.z;p[3]=b.x;p[4]=b.y;p[5]=b.z;
  line.geometry.attributes.position.needsUpdate=true; line.visible=true; line.material.opacity=.9;
  tracers.push({line:line,t:0.09});
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
    const oct=new THREE.Mesh(new THREE.OctahedronGeometry(.36,0),basicMat(0xffd166));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.04,6,24),basicMat(0xffd166));
    ring.rotation.x=Math.PI/2; g.add(oct,ring,glowSprite(0xffd166,2.6));
  }else if(kind==='crate'){
    const box=new THREE.Mesh(new THREE.BoxGeometry(1,.8,1),stdMat(0x2c3745,.6,.4));
    const trim=new THREE.Mesh(new THREE.BoxGeometry(1.06,.16,1.06),basicMat(0xffd166));
    box.castShadow=true; const gl=glowSprite(0xffd166,3.2); gl.position.y=.6; g.add(box,trim,gl);
  }else{
    const a=new THREE.Mesh(new THREE.BoxGeometry(.46,.15,.15),basicMat(0x3ddc84));
    const b=new THREE.Mesh(new THREE.BoxGeometry(.15,.46,.15),basicMat(0x3ddc84));
    g.add(a,b,glowSprite(0x3ddc84,1.6));
  }
  g.position.set(pos.x,.9,pos.z); scene.add(g);
  pickups.push({g:g,t:kind==='crate'?9999:40,kind:kind});
}
