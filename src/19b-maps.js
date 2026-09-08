/* ============================ run maps (stage registry) ============================ */
/* Each builder sets ARENA, paints the floor/fog, lays out blocks with addBlock(), fills `mapData` with anything the
   loop needs (ice patches, the reactor pulse) and ends with finalizeWorld(), which merges geometry and bakes the nav grid. */
const mapData={ice:[],pulse:null,spawnRing:0};
function setTheme(fog,far){ scene.fog.color.set(fog); scene.background.set(fog); scene.fog.far=Math.min(far,Q.cfg.fog+20); }
function resetMapData(){ mapData.ice.length=0; mapData.pulse=null; mapData.spawnRing=0; }
/* set dressing helper: [id,x,z,rotDeg,height,solid,y] rows; explosive barrels as [x,z] pairs. Skipped when the models failed to parse. */
function dress(props,barrelsAt){ if(!MODELS.ok)return; props.forEach(p=>addProp(p[0],p[1],p[2],p[3],p[4],p[5]!==false,p[6]||0)); (barrelsAt||[]).forEach(b=>addBarrel(b[0],b[1])); }

/* ---- 1. Foundry — the original arena, retuned warm ---- */
function buildFoundry(){
  ARENA=34; resetMapData();
  addFloor(ARENA,0x1a1410,0x8a4a1e);
  addWalls(ARENA,0x2e2620);
  const COVER=[
    [0,0,7,2.2,7],[0,0,-7,2.2,7],[13,0,13,2.6,5],[-13,0,13,2.6,5],[13,0,-13,2.6,5],[-13,0,-13,2.6,5],
    [20,0,0,1.4,10],[-20,0,0,1.4,10],[0,0,20,10,1.4],[0,0,-20,10,1.4],
    [8,0,24,3.4,4],[-8,0,-24,3.4,4],[24,0,-9,4,3.4],[-24,0,9,4,3.4],
    [26,0,26,2,2],[-26,0,26,2,2],[26,0,-26,2,2],[-26,0,-26,2,2]
  ];
  COVER.forEach((c,i)=>{ const w=(i%3===0)?3.2:2.4;
    addBlock(c[0],c[1],c[2],(c[3]>4?c[3]:w),c[3]>4?2.2:c[3],(c[4]>4?c[4]:w),i%2?0x3a2f28:0x2c2622); });
  [[16,0,-22],[-16,0,22],[22,0,16],[-22,0,-16]].forEach(p=>{
    addBlock(p[0],0,p[2],2.2,4.6,2.2,0x33282a);
    const ring=new THREE.Mesh(new THREE.BoxGeometry(2.35,.16,2.35),basicMat(0xff8a3d)); ring.position.set(p[0],4.2,p[2]); world.add(ring);
    const gl=glowSprite(0xff8a3d,5); gl.position.set(p[0],4.3,p[2]); world.add(gl);
  });
  /* stores along the walls, fuel barrels by the cover, a locker row at the spawn side */
  dress([['crate_large',-30,-4,90,1.4],['crate_large',30,4,90,1.4],['crate_large',-4,-30.5,0,1.4],['crate_large',4,30.5,0,1.4],['crate_large',29.5,-16,90,1.4],
    ['crate_tarp',-27,29,15,1.5],['crate_tarp',27,-29,-20,1.5],['shelves',-31.6,20,90,2.3],['shelves',31.6,-20,-90,2.3],
    ['locker',-3.3,32.5,0,2.3],['locker',-2.2,32.5,0,2.3],['locker',-1.1,32.5,0,2.3],['locker',1.1,32.5,0,2.3],['locker',2.2,32.5,0,2.3],['locker',3.3,32.5,0,2.3],
    ['barrel2',2.4,9.8,0,.8],['barrel2',-2.8,-9.6,30,.8],['barrel2',14.8,16,0,.8],['barrel2',-14.8,-16.2,50,.8],['barrel2',-21.6,-3,0,.8],['barrel2',21.7,3.2,0,.8],
    ['desk',-24,-30,0,.9],['crate_tarp',24,30,180,1.5]],
    [[7,12],[-7,-12],[17.5,5],[-17.5,-5],[11,-19],[-11,19],[25,21],[-25,-21]]);
  setTheme(0x0b0806,64);
  finalizeWorld();
}

/* ---- 2. Relay Station — two raised platforms, stairs, a catwalk between ---- */
function buildRelay(){
  ARENA=34; resetMapData();
  addFloor(ARENA,0x121a24,0x39628f);
  addWalls(ARENA,0x28323f);
  for(const sx of[-1,1]){
    const px=sx*16;
    addBlock(px,0,0,10,3,10,0x2a3442);                              // platform
    for(let k=0;k<10;k++)addBlock(px,0,5.6+k*1.2,4,0.3*(10-k),1.2,k%2?0x33404f:0x2c3745);   // stairs (south side, rising toward the platform)
    for(let k=0;k<10;k++)addBlock(px,0,-5.6-k*1.2,4,0.3*(10-k),1.2,k%2?0x33404f:0x2c3745);  // stairs (north side)
    for(const sz of[-1,1])for(const ox of[-3.5,3.5])addBlock(px+ox,3,sz*4.6,3,0.9,0.4,0x3a86ff,.4); // railings beside the stair mouths
    const lab=makeLabel(sx<0?'RELAY A':'RELAY B','#8fa2bd',.7); lab.position.set(px,5.2,0); world.add(lab);
  }
  addBlock(0,0,0,22,3,3,0x2f3c4c);                                  // bridge between the platforms (solid: the nav grid is 2.5D)
  [[0,0,20,6,1.2,2],[0,0,-20,6,1.2,2],[-26,0,18,2.4,2.2,2.4],[26,0,-18,2.4,2.2,2.4],[-26,0,-18,2.4,2.2,2.4],[26,0,18,2.4,2.2,2.4],
   [0,0,10,2.4,1.0,2.4],[0,0,-10,2.4,1.0,2.4],[-8,0,26,4,2.2,1.4],[8,0,-26,4,2.2,1.4]].forEach((c,i)=>addBlock(c[0],c[1],c[2],c[3],c[4],c[5],i%2?0x33404f:0x2c3745));
  [[28,0,0],[-28,0,0]].forEach(p=>{ addBlock(p[0],0,p[2],2,4.6,2,0x2a3442);
    const gl=glowSprite(0x4ea8ff,5); gl.position.set(p[0],4.4,p[2]); world.add(gl); });
  /* relay dishes and consoles on the platform tops, stores at the wall bays */
  dress([['dish',-16,-2.6,0,4.6,true,3],['dish',16,-2.6,180,4.6,true,3],['desk',-16,2.8,180,.9,true,3],['desk',16,2.8,0,.9,true,3],
    ['locker',-32.5,-8,90,2.3],['locker',-32.5,-6.9,90,2.3],['locker',-32.5,-5.8,90,2.3],['locker',32.5,8,-90,2.3],['locker',32.5,6.9,-90,2.3],['locker',32.5,5.8,-90,2.3],
    ['crate_large',-8,31,0,1.4],['crate_large',8,-31,0,1.4],['crate_tarp',26,26,30,1.5],['crate_tarp',-26,-26,-30,1.5],['crate_tarp',0,-30,0,1.5],
    ['barrel2',-14,12.6,0,.8],['barrel2',13.2,-12.6,20,.8],['barrel2',22.2,-2.6,0,.8],['barrel2',-22.2,2.6,0,.8]],
    [[0,14],[0,-14],[22,10],[-22,-10],[10,-24],[-10,24]]);
  setTheme(0x070b12,64);
  finalizeWorld();
}

/* ---- 3. Frost Array — open ground, sparse pillars, dense fog, ice patches ---- */
function buildFrost(){
  ARENA=36; resetMapData();
  addFloor(ARENA,0x1c2a36,0x6fb7d6);
  addWalls(ARENA,0x25323d);
  const P=[[10,4],[-10,-4],[4,-14],[-4,14],[20,12],[-20,-12],[16,-20],[-16,20],[26,-2],[-26,2],[0,26],[0,-26]];
  P.forEach((p,i)=>{ addBlock(p[0],0,p[1],2,4.6+(i%3),2,0x2a3b48); const gl=glowSprite(0xbfe8ff,4); gl.position.set(p[0],5.4+(i%3),p[1]); world.add(gl); });
  [[6,0,-6,4,1.0,1.4],[-6,0,6,4,1.0,1.4],[22,0,22,1.4,1.0,5],[-22,0,-22,1.4,1.0,5],[24,0,-24,4,1.0,1.4],[-24,0,24,4,1.0,1.4]].forEach(c=>addBlock(c[0],c[1],c[2],c[3],c[4],c[5],0x33465a));
  const ICE=[[0,0,6],[14,-10,4.5],[-14,10,4.5],[-12,-16,4],[12,16,4],[24,8,3.5],[-24,-8,3.5]];
  ICE.forEach(c=>{
    const m=new THREE.Mesh(new THREE.CircleGeometry(c[2],28),new THREE.MeshBasicMaterial({color:0x8fd3ff,transparent:true,opacity:.22,depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.position.set(c[0],0.02,c[1]); world.add(m);
    const rim=new THREE.Mesh(new THREE.RingGeometry(c[2]-.12,c[2],40),new THREE.MeshBasicMaterial({color:0xbfe8ff,transparent:true,opacity:.5,depthWrite:false}));
    rim.rotation.x=-Math.PI/2; rim.position.set(c[0],0.03,c[1]); world.add(rim);
    mapData.ice.push({x:c[0],z:c[1],r:c[2]});
  });
  /* the array: dish clusters in the fog, tarped supply drops, fuel on the paths */
  dress([['dish',28,-14,20,5.2],['dish',-28,14,200,5.2],['dish',12,29,0,5.2],['dish',-12,-29,180,5.2],['dish',31,30,45,4.6],['dish',-31,-30,225,4.6],
    ['crate_tarp',8,-9,10,1.5],['crate_tarp',-8,9,-10,1.5],['crate_tarp',24,-25,0,1.5],['crate_large',-30,0,90,1.4],['crate_large',30,0,90,1.4],['crate_tarp',0,-31,0,1.5],
    ['barrel2',20.5,13,0,.8],['barrel2',-20.5,-13,0,.8],['barrel2',5.2,-15.2,0,.8]],
    [[18,2],[-18,-2],[2,-18],[-2,18],[27,20],[-27,-20]]);
  setTheme(0x0c141c,40);
  finalizeWorld();
}

/* ---- 4. Reactor Core — concentric tiers around a core that pulses a shockwave ---- */
function buildReactor(){
  ARENA=30; resetMapData();
  addFloor(ARENA,0x161218,0x9b4dff);
  addWalls(ARENA,0x2a2032);
  addBlock(0,0,0,6,5,6,0x2a2030);                                     // core housing
  const core=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,5.2,24),new THREE.MeshBasicMaterial({color:0x9b4dff,transparent:true,opacity:.35}));
  core.position.set(0,2.6,0); world.add(core);
  const coreGlow=glowSprite(0xb07bff,10); coreGlow.position.set(0,3,0); world.add(coreGlow);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.25,10,48),new THREE.MeshBasicMaterial({color:0xd8b4ff,transparent:true,opacity:.85}));
  ring.rotation.x=Math.PI/2; ring.position.set(0,.5,0); ring.visible=false; world.add(ring);
  /* tier walkways: square rings of low slabs (steppable) */
  [[12,0.3],[20,0.6]].forEach(t=>{ const r=t[0],h=t[1];
    addBlock(0,0, r,r*2+2,h,2,0x2c2436); addBlock(0,0,-r,r*2+2,h,2,0x2c2436);
    addBlock( r,0,0,2,h,r*2+2,0x2c2436); addBlock(-r,0,0,2,h,r*2+2,0x2c2436); });
  [[12,12],[-12,12],[12,-12],[-12,-12]].forEach(p=>{ addBlock(p[0],0,p[1],2,3.2,2,0x3a2c4a); });
  [[20,0],[-20,0],[0,20],[0,-20]].forEach(p=>{ addBlock(p[0],0,p[1],3,1.6,3,0x35283f); const gl=glowSprite(0x9b4dff,4); gl.position.set(p[0],2.2,p[1]); world.add(gl); });
  [[24,24],[-24,24],[24,-24],[-24,-24]].forEach(p=>addBlock(p[0],0,p[1],2.4,2.2,2.4,0x2c2436));
  mapData.pulse={t:16,period:20,ring:ring,glow:coreGlow,r:0,active:false,hit:false,warned:false};
  /* control stations at the tier corners, lockers along the walls, coolant barrels on the walkways */
  dress([['desk',12,14.5,180,.9,true,.3],['desk',-12,-14.5,0,.9,true,.3],['locker',-28.6,4,90,2.3],['locker',-28.6,5.1,90,2.3],['locker',-28.6,6.2,90,2.3],['locker',28.6,-4,-90,2.3],['locker',28.6,-5.1,-90,2.3],['locker',28.6,-6.2,-90,2.3],
    ['crate_tarp',0,-27.5,0,1.5],['crate_large',-8,28.5,0,1.4],['crate_tarp',27,27,0,1.5],['shelves',-27.5,-27,45,2.3],
    ['barrel2',14.2,-14.2,0,.8,true,.3],['barrel2',-14.2,14.2,0,.8,true,.3],['barrel2',22.5,2.5,0,.8,true,.6]],
    [[16,5],[-16,-5],[5,-16],[-5,16],[24,-9],[-24,9]]);
  setTheme(0x0a0710,56);
  finalizeWorld();
}

const MAPS=[
  {id:'foundry',name:'Foundry',sub:'Steel and heat',build:buildFoundry,spawn:new THREE.Vector3(0,0,16)},
  {id:'relay',name:'Relay Station',sub:'Take the high ground',build:buildRelay,spawn:new THREE.Vector3(0,0,16)},
  {id:'frost',name:'Frost Array',sub:'Long sightlines, no footing',build:buildFrost,spawn:new THREE.Vector3(0,0,20)},
  {id:'reactor',name:'Reactor Core',sub:'Jump the pulse',build:buildReactor,spawn:new THREE.Vector3(0,0,25)}
];
const MAP_BY_ID={}; MAPS.forEach(m=>MAP_BY_ID[m.id]=m);

/* stage modifiers — one per stage from stage 2 */
const MODS=[
  {id:'lancers', name:'Lancer Sweep',  desc:'Far more Lancers'},
  {id:'swift',   name:'Swift Rushers', desc:'Rushers move 25% faster'},
  {id:'bounty',  name:'Bounty',        desc:'Supply crates hold two items'},
  {id:'norepair',name:'No Repairs',    desc:'Repair kits never drop'},
  {id:'lowgrav', name:'Low Gravity',   desc:'Higher jumps, longer falls'}
];

/* seeded RNG so a run's map order can be replayed (?seed=...) */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function makeRunOrder(seed){
  const rng=mulberry32(seed); const rest=MAPS.slice(1).map(m=>m.id);
  for(let i=rest.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=rest[i]; rest[i]=rest[j]; rest[j]=t; }
  const mods=MODS.map(m=>m.id); for(let i=mods.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=mods[i]; mods[i]=mods[j]; mods[j]=t; }
  return {maps:['foundry'].concat(rest),mods:mods};
}
function stageMap(stage){ return MAP_BY_ID[run.order.maps[(stage-1)%run.order.maps.length]]; }
function stageMod(stage){ return stage<2?null:MODS.find(m=>m.id===run.order.mods[(stage-2)%run.order.mods.length]); }
