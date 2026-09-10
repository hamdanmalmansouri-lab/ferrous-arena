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

/* light rig — one key (sun, shadows), one rim, one hemisphere; per-map values come through setTheme() -> applyRig() */
const hemi=new THREE.HemisphereLight(0x8fb4ff,0x0d1119,0.34); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xdce9ff,0.78);
sun.position.set(24,38,16); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
const sc=sun.shadow.camera; sc.left=-46;sc.right=46;sc.top=46;sc.bottom=-46;sc.near=1;sc.far=110;
sun.shadow.bias=-0.0009;
scene.add(sun);
const rim=new THREE.DirectionalLight(0x4a7bff,.26); rim.position.set(-20,12,-24); scene.add(rim);
const RIG_DEFAULT={sunColor:0xdce9ff,sunIntensity:0.78,sunDir:[24,38,16],rimColor:0x4a7bff,rimIntensity:0.26,rimDir:[-20,12,-24],
  hemiSky:0x8fb4ff,hemiGround:0x0d1119,hemiIntensity:0.34,exposure:1.05,fogColor:0x070b12,fogFar:64,key:1};
let currentRig=RIG_DEFAULT;
function applyRig(r){
  currentRig=r;
  const key=r.key===undefined?1:r.key;   // per-map light multiplier (calibrated so the floor lands at ~10 % screen luminance)
  sun.color.set(r.sunColor); sun.intensity=r.sunIntensity*key; sun.position.set(r.sunDir[0],r.sunDir[1],r.sunDir[2]);
  rim.color.set(r.rimColor); rim.intensity=r.rimIntensity*key; rim.position.set(r.rimDir[0],r.rimDir[1],r.rimDir[2]);
  hemi.color.set(r.hemiSky); hemi.groundColor.set(r.hemiGround); hemi.intensity=r.hemiIntensity*key;
  renderer.toneMappingExposure=r.exposure;
  scene.fog.color.set(r.fogColor); scene.background.set(r.fogColor); scene.fog.far=Math.min(r.fogFar,Q.cfg.fog+20);
}

function applyQuality(tier){
  Q.tier=tier; Q.cfg=TIERS[tier]; const c=Q.cfg;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,c.pr));
  renderer.shadowMap.enabled=c.shadow; renderer.shadowMap.type=c.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
  renderer.shadowMap.needsUpdate=true;
  sun.castShadow=c.shadow;
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; }
  sun.shadow.mapSize.set(c.shadowSize,c.shadowSize);
  scene.fog.far=Math.min(currentRig.fogFar,c.fog+20);
  scene.traverse(o=>{ if(o.userData.rim)o.visible=tier!=='low'; if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true; });
  resize();
}
function setQuality(choice){ /* 'auto' | tier */
  save.set('quality',choice);
  if(choice==='auto'){ Q.auto=true; applyQuality(detectTier()); Q.probe={t:0,frames:0,done:false}; }
  else { Q.auto=false; applyQuality(choice); }
}
