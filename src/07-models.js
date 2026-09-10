/* ============================ models (packed glTF) ============================ */
/* ASSET_DATA (06-assets.js, from tools/pack-quaternius.js) holds base64 GLBs: Quaternius Animated Mech Pack (flat colours, each mech
   carries its own clips) and Sci-Fi Essentials Kit enemies / guns / props (textured: the pack's base-colour + emissive maps are
   emitted once per pack and re-attached here). Clip vocabulary shared by every rig: idle walk run shoot jump die hit attack charge emote. */
const MODELS={ready:false,ok:false,items:{},clips:[],textures:{},error:null};   // clips: the operative rig's clip list (for the harness)
function b64ToBuf(b64){ const s=atob(b64), a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i); return a.buffer; }
function loadModels(onProgress){
  return new Promise(resolve=>{
    if(!window.THREE||!THREE.GLTFLoader||typeof ASSET_DATA==='undefined'){ MODELS.ready=true; MODELS.ok=false; resolve(false); return; }
    /* shared pack maps (base colour + emissive) */
    const texPromises=[];
    const loadTex=(pack,key,src,srgb)=>texPromises.push(new Promise(res=>{
      const img=new Image(); img.onload=()=>{ const t=new THREE.Texture(img); t.flipY=false; if(srgb)t.encoding=THREE.sRGBEncoding; t.anisotropy=4; t.needsUpdate=true; (MODELS.textures[pack]=MODELS.textures[pack]||{})[key]=t; res(); };
      img.onerror=()=>res(); img.src=src; }));
    for(const key in ASSET_DATA.maps){ const m=ASSET_DATA.maps[key]; if(m.map)loadTex(key,'map',m.map,true); if(m.emissive)loadTex(key,'emissive',m.emissive,true); }   // keyed by base-colour file (materials name theirs in extras.packmap)
    Promise.all(texPromises).then(()=>{
      const loader=new THREE.GLTFLoader(); const ids=Object.keys(ASSET_DATA.models); let done=0;
      const next=()=>{
        if(done>=ids.length){ MODELS.ready=true; MODELS.ok=Object.keys(MODELS.items).length>0; MODELS.clips=(MODELS.items.human_swat||{animations:[]}).animations; resolve(MODELS.ok); return; }
        const id=ids[done], rec=ASSET_DATA.models[id];
        loader.parse(b64ToBuf(rec.b64),'',gltf=>{
          const root=gltf.scene; let textured=false;
          root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; o.frustumCulled=false;
            const m=o.material; if(m){ const tex=(m.userData&&MODELS.textures[m.userData.packmap])||{}; if(tex.map){ textured=true; m.map=tex.map; if(tex.emissive){ m.emissiveMap=tex.emissive; m.emissive.set(0xffffff); } }
              m.roughness=0.8; m.metalness=0.15; m.needsUpdate=true; } } });
          MODELS.items[id]={root:root,animations:gltf.animations||[],pack:rec.pack,height:rec.height||0,raw:rec.raw||null,textured:textured};
          done++; if(onProgress)onProgress(done/ids.length); setTimeout(next,0);
        },err=>{ MODELS.error=err&&err.message||String(err); done++; setTimeout(next,0); });
      };
      next();
    });
  });
}
/* bounds helper: height of a model's scene (for scale normalisation) */
function modelHeight(root){ const b=new THREE.Box3().setFromObject(root); return b.max.y-b.min.y; }
/* instantiate a character (skinned) with an optional tint, scaled to the model's packed height. Returns {group, animator, bones, scale}.
   Tint: flat mechs recolour their 'Main' material; textured kit models glow with the tint through their emissive map. */
function spawnCharacter(id,tint){
  const rec=MODELS.items[id]; if(!rec)return null;
  const inst=THREE.SkeletonUtils.clone(rec.root);
  const h=(rec.raw&&rec.raw.h)||modelHeight(rec.root)||1; const s=(rec.height||CHAR_HEIGHT)/h; inst.scale.setScalar(s);
  if(rec.raw)inst.position.y=-rec.raw.minY*s;   // feet on the floor
  const bones={};
  inst.traverse(o=>{ if(o.isBone||o.type==='Bone')bones[o.name]=o; if(o.isMesh){ o.material=o.material.clone(); o.castShadow=true;
    if(tint!==undefined){ if(rec.textured){ o.material.emissive.set(tint); o.material.emissiveIntensity=1.6; o.material.color.set(tint).lerp(new THREE.Color(0xffffff),0.55); }   // coloured cast on the dark metal + glow
      else if(o.material.name==='Main')o.material.color.set(tint); }
    if(!rec.textured)charBoost(o.material,tint!==undefined?CHAR_BOOST.enemy:CHAR_BOOST.k); } });
  const animator=makeAnimator(inst,rec.animations);
  return {group:inst,animator:animator,bones:bones,scale:s,height:rec.height||CHAR_HEIGHT};
}
/* value ladder: flat-coloured characters get a self-light (emissive = albedo x CHAR_BOOST) so they sit above the world in the
   ladder — the floor reads ~10 % on screen, operatives and enemies ~45-60 % — independent of how dark a map is lit */
const CHAR_BOOST={k:1.64,enemy:0.5};   // k solved by the calibration pass (Vanguard torso ~0.52 sRGB on Foundry); enemies carry a saturated tint, so less
function charBoost(m,k){ if(!m.emissive)return; m.emissive.copy(m.color); m.emissiveIntensity=k===undefined?CHAR_BOOST.k:k; }
/* a static prop (weapon, crate, target) */
function spawnProp(id,tint){
  const rec=MODELS.items[id]; if(!rec)return null;
  const inst=rec.root.clone(true);
  const hasMain=(()=>{ let f=false; inst.traverse(o=>{ if(o.isMesh&&o.material.name==='Main')f=true; }); return f; })();
  inst.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); if(tint!==undefined&&(!hasMain||o.material.name==='Main'))o.material.color.set(tint); o.castShadow=true; } });   // flat props with a 'Main' accent recolour only that
  return inst;
}
/* Procedural rotation on top of the mixer pose. The mixer only rewrites a bone when its blended value changes, so a
   naive `bone.rotation.x += a` every step would accumulate on a held pose. Keep the last mixer-written pose as a base:
   if the bone still holds what we wrote last step, the mixer left it alone and the base stands; otherwise adopt the new pose. */
function poseOffset(bone,axis,angle){
  const ud=bone.userData;
  if(!ud.pq){ ud.pq=new THREE.Quaternion(); ud.baseQ=new THREE.Quaternion().copy(bone.quaternion); }
  else if(!bone.quaternion.equals(ud.pq))ud.baseQ.copy(bone.quaternion);
  bone.quaternion.copy(ud.baseQ); if(angle)bone.rotation[axis]+=angle; ud.pq.copy(bone.quaternion);
}
/* ---- clip layering: every clip is split into a lower-body half (root, legs) and an upper-body half
   (everything else) so locomotion and aim/fire can run at the same time on one rig ---- */
const LOWER_RE=/Leg|Foot|Pole|Thigh|Shin|Toe|Hips|Piston|^PT[LR]$|^Body$|^Root$|^root$/;   // hips/root carry the bob, so they belong to locomotion
const isLowerBone=n=>LOWER_RE.test(n);
const SPLIT_CACHE={};
function splitClip(clip,part){
  const key=clip.uuid+'@'+part; if(SPLIT_CACHE[key])return SPLIT_CACHE[key];
  const tracks=clip.tracks.filter(t=>isLowerBone(THREE.PropertyBinding.parseTrackName(t.name).nodeName)===(part==='lower'));
  const c=tracks.length?new THREE.AnimationClip(clip.name+'@'+part,clip.duration,tracks):null;
  return SPLIT_CACHE[key]=c;
}
/* animation state machine over an AnimationMixer.
   play(name,…)             → whole-body clip (jump, fall, die, sprint for Rushers)
   layer(lower,upper,…)     → lower-body locomotion (or null = legs at rest) + upper-body aim/fire/attack at the same time
   Both crossfade; switching between the two modes fades the other slots out. `current` is a readable label. */
function makeAnimator(root,clips){
  const mixer=new THREE.AnimationMixer(root); const actions={}, lowers={}, uppers={};
  clips.forEach(c=>{ actions[c.name]=mixer.clipAction(c);
    const lo=splitClip(c,'lower'), up=splitClip(c,'upper');
    if(lo)lowers[c.name]=mixer.clipAction(lo); if(up)uppers[c.name]=mixer.clipAction(up); });
  const slot={full:null,lower:null,upper:null};      // action currently owning each slot
  const name={full:null,lower:null,upper:null};
  function start(a,fade,once,ts){ a.reset(); a.enabled=true; a.timeScale=ts===undefined?1:ts; a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,Infinity); a.clampWhenFinished=!!once; a.fadeIn(fade).play(); }
  function drop(k,fade){ if(slot[k]){ slot[k].fadeOut(fade); slot[k]=null; name[k]=null; } }
  function set(k,table,nm,fade,once,ts){
    const a=nm?table[nm]:null;
    if(a&&slot[k]===a&&(!once||a.isRunning()||a.paused)){ a.timeScale=ts===undefined?1:ts; return true; }   // a one-shot plays to its end, then holds its last pose
    if(!a&&!nm){ drop(k,fade); return true; }
    if(!a)return false;
    drop(k,fade); start(a,fade,once,ts); slot[k]=a; name[k]=nm; return true;
  }
  const A={mixer:mixer,actions:actions,current:null,once:false,onceSlot:null,
    play:function(nm,fade,once,timeScale){
      fade=fade===undefined?0.15:fade;
      if(!actions[nm])return false;
      drop('lower',fade); drop('upper',fade);
      const ok=set('full',actions,nm,fade,once,timeScale);
      A.current=nm; A.once=!!once; A.onceSlot=once?'full':null; return ok;
    },
    layer:function(lo,up,fade,onceUp,tsLo,tsUp){
      fade=fade===undefined?0.15:fade;
      drop('full',fade);
      const a=set('lower',lowers,lo,fade,false,tsLo), b=set('upper',uppers,up,fade,onceUp,tsUp);
      A.current=(lo||'-')+'|'+(up||'-'); A.once=!!onceUp; A.onceSlot=onceUp?'upper':null; return a&&b;
    },
    finished:function(){ const a=A.onceSlot&&slot[A.onceSlot]; return !!(a&&A.once&&(!a.isRunning()||a.time>=a.getClip().duration-0.001)); },
    update:function(dt){ mixer.update(dt); }
  };
  return A;
}
/* ---- rim pass: an inflated back-face shell in additive blend, so every character carries a coloured edge light that
   separates it from the floor. Skinned meshes: the shell is made by scaling the bind matrix (the clone's own transform
   cancels out in 'attached' bind mode), so it follows the animation exactly; plain meshes get a scaled sibling. Off on the
   low tier (applyQuality toggles `userData.rim` visibility). ---- */
const RIM_SCALE=1.03, _rimM=new THREE.Matrix4();
function geoCentre(geo){
  if(geo.userData.centre)return geo.userData.centre;
  const P=geo.attributes.position; let mn=[Infinity,Infinity,Infinity], mx=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<P.count;i++)for(let k=0;k<3;k++){ const v=attrAt(P,i,k); if(v<mn[k])mn[k]=v; if(v>mx[k])mx[k]=v; }
  return geo.userData.centre=new THREE.Vector3((mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2);
}
function addRim(group,color){
  const mk=sk=>new THREE.MeshBasicMaterial({color:color,side:THREE.BackSide,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false,skinning:sk});   // r128: skinning is a material flag
  const matS=mk(true), matM=mk(false);
  const list=[]; group.traverse(o=>{ if(o.isMesh&&!o.userData.rim&&o.material!==MAT_HIDDEN&&o.geometry.attributes.position)list.push(o); });
  for(const o of list){
    const c=geoCentre(o.geometry);
    const r=o.clone(); r.material=o.isSkinnedMesh?matS:matM; r.userData.rim=true; r.castShadow=false; r.receiveShadow=false; r.frustumCulled=false; r.renderOrder=1; r.visible=Q.tier!=='low';
    _rimM.makeTranslation(c.x,c.y,c.z).multiply(new THREE.Matrix4().makeScale(RIM_SCALE,RIM_SCALE,RIM_SCALE)).multiply(new THREE.Matrix4().makeTranslation(-c.x,-c.y,-c.z));
    if(o.isSkinnedMesh){ r.bindMatrix.multiply(_rimM); o.parent.add(r); }
    else { const w=new THREE.Object3D(); w.userData.rim=true; w.matrixAutoUpdate=false; w.matrix.copy(o.matrix).multiply(_rimM).multiply(new THREE.Matrix4().copy(o.matrix).invert()); w.matrixAutoUpdate=false; w.add(r); o.parent.add(w); }
  }
  return group;
}
