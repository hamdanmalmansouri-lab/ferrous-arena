/* Packs the Quaternius CC0 sets (Ultimate Modular Men/Women, Sci-Fi Guns, Animated Mech Pack — Leela, Sci-Fi Essentials Kit) into src/06-assets.js.
   node tools/pack-quaternius.js <Assets dir>
   Per model: drop the PBR texture set (normal / ORM), keep only the clips we use (renamed to one shared vocabulary),
   resample + quantize + prune with gltf-transform, write a GLB and base64 it. Per textured pack a downscaled base-colour
   JPEG (and the tiny emissive map) is emitted once and re-attached by loadModels(). Mechs are flat-coloured (no maps). */
const fs=require('fs'),path=require('path');
const {NodeIO,getBounds}=require('@gltf-transform/core');
const {ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const {prune,dedup,resample,quantize,weld}=require('@gltf-transform/functions');
const sharp=require('sharp');
const {retargetClip}=require('./retarget');
const ROOT=process.argv[2]||path.join(__dirname,'..','Assets');
const MECH=path.join(ROOT,'drive-download-20260907T112124Z-1-001','Flat Colors','glTF');
const KIT=path.join(ROOT,'Sci-Fi Essentials Kit[Standard]');
const FEM=path.join(ROOT,'modular females','Individual Characters','glTF');
const MALE=path.join(ROOT,'Modular male','Individual Characters','glTF');
const GUNS=path.join(ROOT,'sci-fi guns','Guns','glTF');
const UAL=path.join(ROOT,'Universal Animation Library[Standard]','Universal Animation Library[Standard]','Unreal-Godot','UAL1_Standard.glb');
/* Universal Animation Library clips retargeted onto the human rig (see tools/retarget.js): jump start / loop / land */
const UAL_CLIPS={Jump_Start:'jumpstart',Jump_Loop:'jumploop',Jump_Land:'jumpland'};
const OUT=path.join(__dirname,'..','src','06-assets.js');

/* clip vocabulary used by the game: idle walk run shoot jump die hit attack charge emote */
const MECH_CLIPS={Idle:'idle',Walk_Holding:'walk',Run_Holding:'run',Shoot:'shoot',Jump:'jump',Death:'die',HitRecieve_1:'hit',Hello:'emote'};   // operatives never melee: no Punch
/* Ultimate Modular Women / Men: one rig, 24 clips; the Pistol placeholder mesh is stripped (weapons mount on Wrist.R) */
const HUMAN_CLIPS={Idle_Gun:'idle',Idle_Gun_Pointing:'aim',Idle_Gun_Shoot:'shoot',Run_Shoot:'runshoot',Run:'run',Walk:'walk',Run_Left:'runL',Run_Right:'runR',Run_Back:'runB',
  Death:'die',HitRecieve:'hit',Wave:'emote',Roll:'roll'};
const LEELA_CLIPS={Idle:'idle',Walk:'walk',Run:'run',Jump:'jump',Death:'die',HitRecieve_1:'hit',Kick:'attack',Hello:'emote'};
const DRONE_CLIPS={Idle:'idle',Attack:'shoot',Charging:'charge',Hit:'hit',BackFlip:'die'};
const QUAD_CLIPS={Idle:'idle',Walk:'walk',Run:'run',Attack:'attack',Charge:'charge',Hit:'hit',TurnOff:'die'};
const PICK={
  /* id: {file, pack, clips, height (m, the game rescales to this)} */
  human_swat:  {file:path.join(MALE,'Swat.gltf'),      pack:'human', clips:HUMAN_CLIPS, height:1.82, drop:['Pistol'], bakeFingers:true, ual:UAL_CLIPS},
  human_scifi: {file:path.join(FEM,'SciFi.gltf'),      pack:'human', clips:HUMAN_CLIPS, height:1.76, drop:['Pistol'], bakeFingers:true, ual:UAL_CLIPS},
  human_space: {file:path.join(MALE,'Spacesuit.gltf'), pack:'human', clips:HUMAN_CLIPS, height:1.9,  drop:['Pistol'], bakeFingers:true, ual:UAL_CLIPS},
  mech_leela: {file:path.join(MECH,'Leela.gltf'),  pack:'mech',   clips:LEELA_CLIPS, height:1.6},
  enemy_drone:{file:path.join(KIT,'glTF','Enemy_EyeDrone.gltf'), pack:'enemies', clips:DRONE_CLIPS, height:1.1},
  enemy_quad: {file:path.join(KIT,'glTF','Enemy_QuadShell.gltf'),pack:'enemies', clips:QUAD_CLIPS,  height:1.15},
  gun_ar:     {file:path.join(GUNS,'AR_2.gltf'),      pack:'sfguns', gun:true},
  gun_sniper: {file:path.join(GUNS,'Sniper_3.gltf'),  pack:'sfguns', gun:true},
  gun_cannon: {file:path.join(GUNS,'Grenade_2.gltf'), pack:'sfguns', gun:true},
  crate:      {file:path.join(KIT,'glTF','Prop_Crate.gltf'),      pack:'crates'},
  healthpack: {file:path.join(KIT,'glTF','Prop_HealthPack.gltf'), pack:'props2'},
  module:     {file:path.join(KIT,'glTF','Prop_Ammo_Small.gltf'), pack:'props2'}
};
const MAPS={ /* pack: [baseColor, emissive?, size] */
  enemies:[path.join(KIT,'Textures','T_Enemies_BaseColor.png'),path.join(KIT,'Textures','T_Enemies_Emissive.png'),1024],
  crates:[path.join(KIT,'Textures','T_Props_Crates_BaseColor.png'),null,512],
  props2:[path.join(KIT,'Textures','T_Props_Batch2_BaseColor.png'),path.join(KIT,'Textures','T_Props_Batch2_Emissive.png'),512]
};

/* read a .gltf whose textures may be missing: strip images/textures from the JSON first, load only the .bin */
function loadDoc(io,file){
  const json=JSON.parse(fs.readFileSync(file,'utf8'));
  delete json.images; delete json.textures; delete json.samplers;
  (json.materials||[]).forEach(m=>{ const p=m.pbrMetallicRoughness||{}; delete p.baseColorTexture; delete p.metallicRoughnessTexture; delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; m.extras=Object.assign(m.extras||{},{packmap:true}); });
  const resources={};
  (json.buffers||[]).forEach(b=>{ if(b.uri&&!b.uri.startsWith('data:'))resources[b.uri]=fs.readFileSync(path.join(path.dirname(file),b.uri)); });
  return io.readJSON({json:json,resources:resources});
}
(async()=>{
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const out={models:{},maps:{},meta:{}}; let total=0;
  const ualDoc=fs.existsSync(UAL)?await io.read(UAL):null;
  for(const id in PICK){
    const rec=PICK[id]; const doc=await loadDoc(io,rec.file); const root=doc.getRoot();
    const before=fs.statSync(rec.file).size;
    /* placeholder props baked into the character (the modular packs carry a Pistol mesh in the hand) */
    if(rec.drop)for(const n of root.listNodes())if(rec.drop.indexOf(n.getName())>=0){ const m=n.getMesh(); n.setMesh(null); if(m)m.dispose(); }
    /* guns: find the barrel end — the thin end of the long axis (compare the cross-section of the two extremes) */
    let barrel=null;
    if(rec.gun){ const pts=[]; for(const n of root.listNodes()){ const m=n.getMesh(); if(!m)continue; const wm=n.getWorldMatrix();
        for(const pr of m.listPrimitives()){ const pos=pr.getAttribute('POSITION'); const v=[0,0,0]; for(let i=0;i<pos.getCount();i++){ pos.getElement(i,v);
          const x=wm[0]*v[0]+wm[4]*v[1]+wm[8]*v[2]+wm[12], y=wm[1]*v[0]+wm[5]*v[1]+wm[9]*v[2]+wm[13], z=wm[2]*v[0]+wm[6]*v[1]+wm[10]*v[2]+wm[14]; pts.push([x,y,z]); } } }
      const mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity]; pts.forEach(p=>p.forEach((c,i)=>{ if(c<mn[i])mn[i]=c; if(c>mx[i])mx[i]=c; }));
      const ext=mx.map((v,i)=>v-mn[i]); const ax=ext.indexOf(Math.max(...ext)); const other=[0,1,2].filter(i=>i!==ax);
      const cross=side=>{ let lo=Infinity,hi=-Infinity; const cut=side>0?mx[ax]-ext[ax]*0.12:mn[ax]+ext[ax]*0.12;
        pts.forEach(p=>{ if(side>0?p[ax]>cut:p[ax]<cut){ const y=p[other[0]]; if(y<lo)lo=y; if(y>hi)hi=y; } }); return hi-lo; };
      barrel={axis:'xyz'[ax],sign:cross(1)<cross(-1)?1:-1}; }
    /* clips: keep + rename */
    for(const a of root.listAnimations()){ const nm=rec.clips&&rec.clips[a.getName()]; if(nm)a.setName(nm); else a.dispose(); }
    if(rec.ual&&ualDoc)for(const src in rec.ual)retargetClip(doc,ualDoc,src,rec.ual[src],{});
    /* fingers: bake the gun-grip pose ('aim', first key) into the finger bones' rest transform and drop every finger channel —
       40 finger bones × 13 clips were ~55 % of a human's file, for motion nobody sees behind a rifle */
    if(rec.bakeFingers){ const isF=n=>/^(Index|Middle|Ring|Pinky|Thumb)\d/.test(n.getName()); const aim=root.listAnimations().find(a=>a.getName()==='aim');
      if(aim)for(const ch of aim.listChannels()){ const n=ch.getTargetNode(); if(!n||!isF(n))continue; const out=ch.getSampler().getOutput(); const v=new Array(out.getElementSize()).fill(0); out.getElement(0,v);
        const p=ch.getTargetPath(); if(p==='translation')n.setTranslation(v); else if(p==='rotation')n.setRotation(v); else if(p==='scale')n.setScale(v); }
      for(const a of root.listAnimations())for(const ch of a.listChannels()){ const n=ch.getTargetNode(); if(n&&isF(n)){ const sm=ch.getSampler(); ch.dispose(); if(sm&&sm.listParents().length<=1)sm.dispose(); } } }
    /* bounds before quantization (skinned meshes bake the dequantize transform into their bind matrices, so the
       geometry box the game would measure is meaningless) */
    const scene=root.listScenes()[0]; const bb=getBounds(scene); const rawH=bb.max[1]-bb.min[1];
    /* flat mechs: materials keep their colour factors; kit models get the pack map back at load time */
    await doc.transform(dedup(),weld(),resample({tolerance:2e-3}),quantize({quantizePosition:14,quantizeNormal:8,quantizeTexcoord:12,quantizeColor:8,quantizeGeneric:12}),dedup(),prune());
    const glb=await io.writeBinary(doc);
    const buf=Buffer.from(glb.buffer,glb.byteOffset,glb.byteLength);
    out.models[id]={pack:rec.pack,b64:buf.toString('base64'),height:rec.height||0,raw:{h:+rawH.toFixed(4),minY:+bb.min[1].toFixed(4),min:bb.min.map(v=>+v.toFixed(4)),max:bb.max.map(v=>+v.toFixed(4)),size:bb.max.map((v,i)=>+(v-bb.min[i]).toFixed(4)),barrel:barrel}};
    const clips=root.listAnimations().map(a=>a.getName());
    out.meta[id]={clips:clips,tris:root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?p.getIndices().getCount()/3:0),0),0)};
    total+=buf.length; console.log(id.padEnd(13),(before/1024).toFixed(0).padStart(5)+'KB ->',(buf.length/1024).toFixed(0).padStart(4)+'KB','tris',out.meta[id].tris,barrel?'barrel '+barrel.sign+barrel.axis:'','clips',clips.join(','));
  }
  for(const pack in MAPS){
    const [color,emis,size]=MAPS[pack]; const rec={};
    const c=await sharp(color).resize(size,size,{kernel:'lanczos3'}).jpeg({quality:82,mozjpeg:true}).toBuffer();
    rec.map='data:image/jpeg;base64,'+c.toString('base64'); total+=c.length;
    if(emis){ const e=await sharp(emis).resize(256,256).png({compressionLevel:9,palette:true}).toBuffer(); rec.emissive='data:image/png;base64,'+e.toString('base64'); total+=e.length; }
    out.maps[pack]=rec; console.log('map',pack.padEnd(8),size+'px',(c.length/1024).toFixed(0)+'KB',emis?'+ emissive':'');
  }
  fs.writeFileSync(OUT,'/* ============================ packed assets (Quaternius, CC0) ============================ */\n/* generated by tools/pack-quaternius.js — do not edit */\nconst ASSET_DATA='+JSON.stringify(out)+';\n');
  console.log('total binary',(total/1024).toFixed(0),'KB ->',OUT,(fs.statSync(OUT).size/1024).toFixed(0),'KB');
})().catch(e=>{ console.error(e); process.exit(1); });
