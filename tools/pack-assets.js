/* Packs selected Kenney GLBs into src/06-assets.js as base64, stripping the embedded colormap from each file and
   emitting one shared PNG per pack instead (every file in a pack embeds the same 512x512 colormap). */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const SRC=process.argv[2]||'/tmp/kenney/3d';
const OUT=path.join(__dirname,'..','src','06-assets.js');
const PICK={
  /* id : [pack, file] */
  char_vanguard:['mini-characters','character-male-c.glb'],
  char_ranger:['mini-characters','character-female-e.glb'],
  char_bulwark:['mini-characters','character-male-f.glb'],
  enemy_rusher:['mini-characters','character-male-b.glb'],
  enemy_lancer:['mini-characters','character-female-a.glb'],
  enemy_warden:['mini-characters','character-male-d.glb'],
  dummy:['mini-characters','character-female-d.glb'],
  gun_vanguard:['blaster','blaster-b.glb'],
  gun_ranger:['blaster','blaster-e.glb'],
  gun_bulwark:['blaster','blaster-o.glb'],
  gun_lancer:['blaster','blaster-d.glb'],
  target:['blaster','target-large.glb'],
  crate:['blaster','crate-medium.glb']
};
const KEEP_CLIPS=['idle','walk','sprint','jump','fall','die','holding-right','holding-right-shoot','attack-melee-right','static'];
function stripGLB(buf,keepAnims){
  const jsonLen=buf.readUInt32LE(12); const json=JSON.parse(buf.slice(20,20+jsonLen).toString());
  const binOff=20+jsonLen+8; const binLen=buf.readUInt32LE(20+jsonLen); const bin=buf.slice(binOff,binOff+binLen);
  /* prune animations, then drop accessors only they referenced */
  const anims=(json.animations||[]).filter(a=>keepAnims&&KEEP_CLIPS.indexOf(a.name)>=0);
  const usedAcc=new Set();
  (json.meshes||[]).forEach(m=>m.primitives.forEach(p=>{ Object.values(p.attributes).forEach(a=>usedAcc.add(a)); if(p.indices!==undefined)usedAcc.add(p.indices); (p.targets||[]).forEach(t=>Object.values(t).forEach(a=>usedAcc.add(a))); }));
  (json.skins||[]).forEach(s=>{ if(s.inverseBindMatrices!==undefined)usedAcc.add(s.inverseBindMatrices); });
  anims.forEach(a=>a.samplers.forEach(s=>{ usedAcc.add(s.input); usedAcc.add(s.output); }));
  const accMap=new Map(); const newAcc=[]; (json.accessors||[]).forEach((a,i)=>{ if(usedAcc.has(i)){ accMap.set(i,newAcc.length); newAcc.push(a); } });
  json.accessors=newAcc;
  (json.meshes||[]).forEach(m=>m.primitives.forEach(p=>{ for(const k in p.attributes)p.attributes[k]=accMap.get(p.attributes[k]); if(p.indices!==undefined)p.indices=accMap.get(p.indices); (p.targets||[]).forEach(t=>{ for(const k in t)t[k]=accMap.get(t[k]); }); }));
  (json.skins||[]).forEach(s=>{ if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices=accMap.get(s.inverseBindMatrices); });
  anims.forEach(a=>a.samplers.forEach(s=>{ s.input=accMap.get(s.input); s.output=accMap.get(s.output); }));
  if(anims.length)json.animations=anims; else delete json.animations;
  const usedViews=new Set(newAcc.map(a=>a.bufferView).filter(v=>v!==undefined));
  const imgViews=new Set(json.bufferViews.map((v,i)=>i).filter(i=>!usedViews.has(i)));
  const views=json.bufferViews; const parts=[]; let off=0; const remap=new Map();
  views.forEach((v,i)=>{ if(imgViews.has(i)){ remap.set(i,-1); return; }
    const chunk=bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength); const pad=(4-(off%4))%4; if(pad){ parts.push(Buffer.alloc(pad)); off+=pad; }
    remap.set(i,parts.length); parts.push(chunk); const nv=Object.assign({},v,{byteOffset:off}); views[i]=nv; off+=v.byteLength; });
  const newViews=[]; const idx=new Map(); views.forEach((v,i)=>{ if(remap.get(i)===-1)return; idx.set(i,newViews.length); newViews.push(v); });
  json.bufferViews=newViews;
  (json.accessors||[]).forEach(a=>{ if(a.bufferView!==undefined)a.bufferView=idx.get(a.bufferView); });
  delete json.images; delete json.textures; delete json.samplers;
  (json.materials||[]).forEach(m=>{ if(m.pbrMetallicRoughness)delete m.pbrMetallicRoughness.baseColorTexture; m.extras=Object.assign(m.extras||{},{colormap:true}); });
  const newBin=Buffer.concat(parts); const binPad=(4-(newBin.length%4))%4; const binOut=Buffer.concat([newBin,Buffer.alloc(binPad)]);
  json.buffers=[{byteLength:binOut.length}];
  let js=Buffer.from(JSON.stringify(json)); const jp=(4-(js.length%4))%4; if(jp)js=Buffer.concat([js,Buffer.alloc(jp,0x20)]);
  const head=Buffer.alloc(12); head.write('glTF',0); head.writeUInt32LE(2,4); head.writeUInt32LE(12+8+js.length+8+binOut.length,8);
  const jh=Buffer.alloc(8); jh.writeUInt32LE(js.length,0); jh.write('JSON',4);
  const bh=Buffer.alloc(8); bh.writeUInt32LE(binOut.length,0); bh.write('BIN\0',4);
  return Buffer.concat([head,jh,js,bh,binOut]);
}
const out={models:{},maps:{}}; let total=0;
for(const id in PICK){ const [pack,file]=PICK[id]; const raw=fs.readFileSync(path.join(SRC,pack,file)); const s=stripGLB(raw,id==='char_vanguard');
  out.models[id]={pack:pack,b64:s.toString('base64')}; total+=s.length; console.log(id.padEnd(14),file.padEnd(24),(raw.length/1024).toFixed(0)+'KB ->',(s.length/1024).toFixed(0)+'KB'); }
for(const pack of new Set(Object.values(PICK).map(p=>p[0]))){ const png=fs.readFileSync(path.join(SRC,pack,'Textures','colormap.png')); out.maps[pack]='data:image/png;base64,'+png.toString('base64'); total+=png.length; console.log('colormap',pack,(png.length/1024).toFixed(0)+'KB'); }
fs.writeFileSync(OUT,'/* ============================ packed assets (Kenney, CC0) ============================ */\n/* generated by tools/pack-assets.js — do not edit */\nconst ASSET_DATA='+JSON.stringify(out)+';\n');
console.log('total raw',(total/1024).toFixed(0),'KB  ->',OUT,(fs.statSync(OUT).size/1024).toFixed(0),'KB');
