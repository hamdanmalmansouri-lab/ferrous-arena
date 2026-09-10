/* ============================ run maps (stage registry) ============================ */
/* Each builder sets ARENA, paints the floor/fog, lays out blocks with addBlock(), fills `mapData` with anything the
   loop needs (ice patches, the reactor pulse) and ends with finalizeWorld(), which merges geometry and bakes the nav grid. */
const mapData={ice:[],pulse:null,spawnRing:0};
/* per-map light rig (merged over RIG_DEFAULT) — see applyRig() in 18-renderer-scene */
function setTheme(rig){ applyRig(Object.assign({},RIG_DEFAULT,rig)); }
const RIGS={
  foundry:{sunColor:0xffb27a,sunIntensity:0.95,sunDir:[30,14,18],rimColor:0x3a6fd0,rimIntensity:0.45,rimDir:[-20,10,-24],hemiSky:0x2e4a7a,hemiGround:0x2a1408,hemiIntensity:0.4,exposure:1.0,fogColor:0x1a0d08,fogFar:64,key:0.452},   // warm sodium key from low on the right, cold blue fill
  relay:  {sunColor:0xdce9ff,sunIntensity:0.85,sunDir:[26,30,18],rimColor:0x4a7bff,rimIntensity:0.25,rimDir:[-20,12,-24],hemiSky:0x8fb4ff,hemiGround:0x0d1119,hemiIntensity:0.36,exposure:1.05,fogColor:0x0a1220,fogFar:64,key:0.269},  // neutral cool, high key
  frost:  {sunColor:0xe8f0ff,sunIntensity:0.45,sunDir:[14,30,10],rimColor:0xbfd4ff,rimIntensity:0.15,rimDir:[-20,12,-24],hemiSky:0xcfdcea,hemiGround:0x8a96a2,hemiIntensity:0.75,exposure:1.1,fogColor:0x3b4754,fogFar:40,key:0.23},    // flat white overcast, low contrast, heavy fog
  reactor:{sunColor:0x6a4d9b,sunIntensity:0.3,sunDir:[-14,22,26],rimColor:0xff3dc8,rimIntensity:0.8,rimDir:[-20,6,-24],hemiSky:0x1a1024,hemiGround:0x050308,hemiIntensity:0.3,exposure:0.9,fogColor:0x0a0710,fogFar:56,key:1.26}      // near-black ambient, magenta rim from low
};
/* surface albedos per map: floor 0.9 % linear everywhere, cover / walls per map (5-11 % / 5-17.5 %) solved from a screenshot pass so the
   gameplay view reads floor ~10 %, cover ~15-21 %, walls up to ~32 % sRGB (walls beyond 30 m read as fog). The rig `key` (light
   multiplier, calibrated) lands the floor; keys: Foundry 0.45, Relay 0.27, Frost 0.23, Reactor 1.26. */
const LADDER={
  lobby:  {floor:0x131821,cover:0x2d3949,coverA:0x313d4b,coverB:0x2b3543,wall:0x425165},
  range:  {floor:0x121917,cover:0x2e3948,coverA:0x313d4b,coverB:0x2a3643,wall:0x3e554b},
  foundry:{floor:0x1d1712,cover:0x4e4037,coverA:0x52443a,coverB:0x453c37,wall:0x847162},
  relay:  {floor:0x111822,cover:0x4a596f,coverA:0x4d5f74,coverB:0x445468,wall:0x617691},
  frost:  {floor:0x0f1921,cover:0x35485d,coverA:0x384d5e,coverB:0x314357,wall:0x5c778e},
  reactor:{floor:0x1b161d,cover:0x655171,coverA:0x6b5385,coverB:0x5b4d6d,wall:0x493955}
};
const SKIES={
  foundry:[[0,'#06040a'],[.5,'#1a0e0c'],[.8,'#4a2410'],[1,'#8a4a1e']],
  relay:  [[0,'#02030a'],[.55,'#0a1220'],[.8,'#16263c'],[1,'#26405f']],
  frost:  [[0,'#5a6a7c'],[.5,'#7c8c9c'],[.85,'#9aa8b6'],[1,'#b4bfc9']],
  reactor:[[0,'#010102'],[.6,'#05030a'],[.85,'#160a26'],[1,'#2a0f3a']]
};
function resetMapData(){ mapData.ice.length=0; mapData.pulse=null; mapData.spawnRing=0; }
/* set dressing helper: [id,x,z,rotDeg,height,solid,y] rows; explosive barrels as [x,z] pairs. Skipped when the models failed to parse. */
function dress(props,barrelsAt){ if(!MODELS.ok)return; props.forEach(p=>addProp(p[0],p[1],p[2],p[3],p[4],p[5]!==false,p[6]||0)); (barrelsAt||[]).forEach(b=>addBarrel(b[0],b[1])); }

/* ---- 1. Foundry — the original arena, retuned warm ---- */
function buildFoundry(){
  ARENA=34; resetMapData();
  const L=LADDER.foundry; addFloor(ARENA,L.floor,0x8a4a1e);
  addWalls(ARENA,L.wall);
  const COVER=[
    [0,0,7,2.2,7],[0,0,-7,2.2,7],[13,0,13,2.6,5],[-13,0,13,2.6,5],[13,0,-13,2.6,5],[-13,0,-13,2.6,5],
    [20,0,0,1.4,10],[-20,0,0,1.4,10],[0,0,20,10,1.4],[0,0,-20,10,1.4],
    [8,0,24,3.4,4],[-8,0,-24,3.4,4],[24,0,-9,4,3.4],[-24,0,9,4,3.4],
    [26,0,26,2,2],[-26,0,26,2,2],[26,0,-26,2,2],[-26,0,-26,2,2]
  ];
  COVER.forEach((c,i)=>{ const w=(i%3===0)?3.2:2.4;
    addBlock(c[0],c[1],c[2],(c[3]>4?c[3]:w),c[3]>4?2.2:c[3],(c[4]>4?c[4]:w),i%2?L.coverA:L.coverB); });
  [[16,0,-22],[-16,0,22],[22,0,16],[-22,0,-16]].forEach(p=>{
    addBlock(p[0],0,p[2],2.2,4.6,2.2,L.coverA);
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
  setTheme(RIGS.foundry); buildSky(SKIES.foundry,0,'stacks',0x080503);
  finalizeWorld();
}

/* ---- 2. Relay Station — two raised platforms, stairs, a catwalk between ---- */
function buildRelay(){
  ARENA=34; resetMapData();
  const L=LADDER.relay; addFloor(ARENA,L.floor,0x39628f);
  addWalls(ARENA,L.wall);
  for(const sx of[-1,1]){
    const px=sx*16;
    addBlock(px,0,0,10,3,10,L.cover);                              // platform
    for(let k=0;k<10;k++)addBlock(px,0,5.6+k*1.2,4,0.3*(10-k),1.2,k%2?L.coverA:L.coverB);   // stairs (south side, rising toward the platform)
    for(let k=0;k<10;k++)addBlock(px,0,-5.6-k*1.2,4,0.3*(10-k),1.2,k%2?L.coverA:L.coverB);  // stairs (north side)
    for(const sz of[-1,1])for(const ox of[-3.5,3.5])addBlock(px+ox,3,sz*4.6,3,0.9,0.4,0x3a86ff,.4); // railings beside the stair mouths
    const lab=makeLabel(sx<0?'RELAY A':'RELAY B','#8fa2bd',.7); lab.position.set(px,5.2,0); world.add(lab);
  }
  addBlock(0,0,0,22,3,3,L.cover);                                  // bridge between the platforms (solid: the nav grid is 2.5D)
  [[0,0,20,6,1.2,2],[0,0,-20,6,1.2,2],[-26,0,18,2.4,2.2,2.4],[26,0,-18,2.4,2.2,2.4],[-26,0,-18,2.4,2.2,2.4],[26,0,18,2.4,2.2,2.4],
   [0,0,10,2.4,1.0,2.4],[0,0,-10,2.4,1.0,2.4],[-8,0,26,4,2.2,1.4],[8,0,-26,4,2.2,1.4]].forEach((c,i)=>addBlock(c[0],c[1],c[2],c[3],c[4],c[5],i%2?L.coverA:L.coverB));
  [[28,0,0],[-28,0,0]].forEach(p=>{ addBlock(p[0],0,p[2],2,4.6,2,L.coverA);
    const gl=glowSprite(0x4ea8ff,5); gl.position.set(p[0],4.4,p[2]); world.add(gl); });
  /* relay dishes and consoles on the platform tops, stores at the wall bays */
  dress([['dish',-16,-2.6,0,4.6,true,3],['dish',16,-2.6,180,4.6,true,3],['desk',-16,2.8,180,.9,true,3],['desk',16,2.8,0,.9,true,3],
    ['locker',-32.5,-8,90,2.3],['locker',-32.5,-6.9,90,2.3],['locker',-32.5,-5.8,90,2.3],['locker',32.5,8,-90,2.3],['locker',32.5,6.9,-90,2.3],['locker',32.5,5.8,-90,2.3],
    ['crate_large',-8,31,0,1.4],['crate_large',8,-31,0,1.4],['crate_tarp',26,26,30,1.5],['crate_tarp',-26,-26,-30,1.5],['crate_tarp',0,-30,0,1.5],
    ['barrel2',-14,12.6,0,.8],['barrel2',13.2,-12.6,20,.8],['barrel2',22.2,-2.6,0,.8],['barrel2',-22.2,2.6,0,.8]],
    [[0,14],[0,-14],[22,10],[-22,-10],[10,-24],[-10,24]]);
  setTheme(RIGS.relay); buildSky(SKIES.relay,420,'masts',0x050810);
  finalizeWorld();
}

/* ---- 3. Frost Array — open ground, sparse pillars, dense fog, ice patches ---- */
function buildFrost(){
  ARENA=36; resetMapData();
  const L=LADDER.frost; addFloor(ARENA,L.floor,0x6fb7d6);
  addWalls(ARENA,L.wall);
  const P=[[10,4],[-10,-4],[4,-14],[-4,14],[20,12],[-20,-12],[16,-20],[-16,20],[26,-2],[-26,2],[0,26],[0,-26]];
  P.forEach((p,i)=>{ addBlock(p[0],0,p[1],2,4.6+(i%3),2,L.coverA); const gl=glowSprite(0xbfe8ff,4); gl.position.set(p[0],5.4+(i%3),p[1]); world.add(gl); });
  [[6,0,-6,4,1.0,1.4],[-6,0,6,4,1.0,1.4],[22,0,22,1.4,1.0,5],[-22,0,-22,1.4,1.0,5],[24,0,-24,4,1.0,1.4],[-24,0,24,4,1.0,1.4]].forEach(c=>addBlock(c[0],c[1],c[2],c[3],c[4],c[5],L.cover));
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
  setTheme(RIGS.frost); buildSky(SKIES.frost,0,'ridge',0x2c3a48);
  finalizeWorld();
}

/* ---- 4. Reactor Core — concentric tiers around a core that pulses a shockwave ---- */
function buildReactor(){
  ARENA=30; resetMapData();
  const L=LADDER.reactor; addFloor(ARENA,L.floor,0x9b4dff);
  addWalls(ARENA,L.wall);
  addBlock(0,0,0,6,5,6,L.cover);                                     // core housing
  const core=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,5.2,24),new THREE.MeshBasicMaterial({color:0x9b4dff,transparent:true,opacity:.35}));
  core.position.set(0,2.6,0); world.add(core);
  const coreGlow=glowSprite(0xb07bff,10); coreGlow.position.set(0,3,0); world.add(coreGlow);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.25,10,48),new THREE.MeshBasicMaterial({color:0xd8b4ff,transparent:true,opacity:.85}));
  ring.rotation.x=Math.PI/2; ring.position.set(0,.5,0); ring.visible=false; world.add(ring);
  /* tier walkways: square rings of low slabs (steppable) */
  [[12,0.3],[20,0.6]].forEach(t=>{ const r=t[0],h=t[1];
    addBlock(0,0, r,r*2+2,h,2,L.coverB); addBlock(0,0,-r,r*2+2,h,2,L.coverB);
    addBlock( r,0,0,2,h,r*2+2,L.coverB); addBlock(-r,0,0,2,h,r*2+2,L.coverB); });
  [[12,12],[-12,12],[12,-12],[-12,-12]].forEach(p=>{ addBlock(p[0],0,p[1],2,3.2,2,L.coverA); });
  [[20,0],[-20,0],[0,20],[0,-20]].forEach(p=>{ addBlock(p[0],0,p[1],3,1.6,3,L.coverA); const gl=glowSprite(0x9b4dff,4); gl.position.set(p[0],2.2,p[1]); world.add(gl); });
  [[24,24],[-24,24],[24,-24],[-24,-24]].forEach(p=>addBlock(p[0],0,p[1],2.4,2.2,2.4,L.coverB));
  mapData.pulse={t:16,period:20,ring:ring,glow:coreGlow,r:0,active:false,hit:false,warned:false};
  /* control stations at the tier corners, lockers along the walls, coolant barrels on the walkways */
  dress([['desk',12,14.5,180,.9,true,.3],['desk',-12,-14.5,0,.9,true,.3],['locker',-28.6,4,90,2.3],['locker',-28.6,5.1,90,2.3],['locker',-28.6,6.2,90,2.3],['locker',28.6,-4,-90,2.3],['locker',28.6,-5.1,-90,2.3],['locker',28.6,-6.2,-90,2.3],
    ['crate_tarp',0,-27.5,0,1.5],['crate_large',-8,28.5,0,1.4],['crate_tarp',27,27,0,1.5],['shelves',-27.5,-27,45,2.3],
    ['barrel2',14.2,-14.2,0,.8,true,.3],['barrel2',-14.2,14.2,0,.8,true,.3],['barrel2',22.5,2.5,0,.8,true,.6]],
    [[16,5],[-16,-5],[5,-16],[-5,16],[24,-9],[-24,9]]);
  setTheme(RIGS.reactor); buildSky(SKIES.reactor,0,'towers',0x040208);
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
