/* ============================ renderer / scene ============================ */
const renderer=new THREE.WebGLRenderer({canvas,antialias:Q.cfg.aa,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,Q.cfg.pr));
renderer.shadowMap.enabled=Q.cfg.shadow; renderer.shadowMap.type=Q.cfg.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x070b12);
scene.fog=new THREE.Fog(0x070b12,20,64);
const camera=new THREE.PerspectiveCamera(66,1,0.1,300);

scene.add(new THREE.HemisphereLight(0x8fb4ff,0x0d1119,0.34));
const sun=new THREE.DirectionalLight(0xdce9ff,0.78);
sun.position.set(24,38,16); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
const sc=sun.shadow.camera; sc.left=-46;sc.right=46;sc.top=46;sc.bottom=-46;sc.near=1;sc.far=110;
sun.shadow.bias=-0.0009;
scene.add(sun);
const rim=new THREE.DirectionalLight(0x4a7bff,.26); rim.position.set(-20,12,-24); scene.add(rim);

function applyQuality(tier){
  Q.tier=tier; Q.cfg=TIERS[tier]; const c=Q.cfg;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,c.pr));
  renderer.shadowMap.enabled=c.shadow; renderer.shadowMap.type=c.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
  renderer.shadowMap.needsUpdate=true;
  sun.castShadow=c.shadow;
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; }
  sun.shadow.mapSize.set(c.shadowSize,c.shadowSize);
  scene.fog.far=c.fog;
  scene.traverse(o=>{ if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true; });
  resize();
}
function setQuality(choice){ /* 'auto' | tier */
  save.set('quality',choice);
  if(choice==='auto'){ Q.auto=true; applyQuality(detectTier()); Q.probe={t:0,frames:0,done:false}; }
  else { Q.auto=false; applyQuality(choice); }
}

/* gradient sky dome */
(function(){
  const cv=document.createElement('canvas'); cv.width=4; cv.height=256;
  const g=cv.getContext('2d').createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#03040a'); g.addColorStop(.55,'#0a1220'); g.addColorStop(.8,'#16263c'); g.addColorStop(1,'#20344f');
  const ctx=cv.getContext('2d'); ctx.fillStyle=g; ctx.fillRect(0,0,4,256);
  const tex=new THREE.CanvasTexture(cv);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(150,24,16),
    new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false,depthWrite:false}));
  scene.add(sky);
  const pts=[]; for(let i=0;i<Q.cfg.stars;i++){
    const a=Math.random()*Math.PI*2, e=Math.random()*0.62+0.03, r=140;
    pts.push(new THREE.Vector3(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r));
  }
  const pg=new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x9fc2ff,size:.72,sizeAttenuation:true,transparent:true,opacity:.75,fog:false})));
})();
