/* ============================ models (packed glTF) ============================ */
/* ASSET_DATA (06-assets.js) holds base64 GLBs with their colormap stripped; every pack shares one colormap texture.
   All Mini Characters share a rig, so only `char_vanguard` carries animation clips — they drive every character. */
const MODELS={ready:false,ok:false,items:{},clips:[],textures:{},error:null};
const CHAR_HEIGHT=1.75;              // metres; characters are scaled so the model bounds hit this
function b64ToBuf(b64){ const s=atob(b64), a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i); return a.buffer; }
function loadModels(onProgress){
  return new Promise(resolve=>{
    if(!window.THREE||!THREE.GLTFLoader||typeof ASSET_DATA==='undefined'){ MODELS.ready=true; MODELS.ok=false; resolve(false); return; }
    /* shared colormaps */
    const texPromises=Object.keys(ASSET_DATA.maps).map(pack=>new Promise(res=>{
      const img=new Image(); img.onload=()=>{ const t=new THREE.Texture(img); t.flipY=false; t.encoding=THREE.sRGBEncoding; t.magFilter=THREE.NearestFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.needsUpdate=true; MODELS.textures[pack]=t; res(); };
      img.onerror=()=>res(); img.src=ASSET_DATA.maps[pack]; }));
    Promise.all(texPromises).then(()=>{
      const loader=new THREE.GLTFLoader(); const ids=Object.keys(ASSET_DATA.models); let done=0;
      const next=()=>{
        if(done>=ids.length){ MODELS.ready=true; MODELS.ok=Object.keys(MODELS.items).length>0; resolve(MODELS.ok); return; }
        const id=ids[done], rec=ASSET_DATA.models[id];
        loader.parse(b64ToBuf(rec.b64),'',gltf=>{
          const root=gltf.scene; const tex=MODELS.textures[rec.pack];
          root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; o.frustumCulled=false;
            const m=o.material; if(m){ if(tex)m.map=tex; m.roughness=0.85; m.metalness=0.05; m.needsUpdate=true; } } });
          MODELS.items[id]={root:root,animations:gltf.animations||[],pack:rec.pack};
          if(gltf.animations&&gltf.animations.length)MODELS.clips=gltf.animations;
          done++; if(onProgress)onProgress(done/ids.length); setTimeout(next,0);
        },err=>{ MODELS.error=err&&err.message||String(err); done++; setTimeout(next,0); });
      };
      next();
    });
  });
}
/* bounds helper: height of a model's scene (for scale normalisation) */
function modelHeight(root){ const b=new THREE.Box3().setFromObject(root); return b.max.y-b.min.y; }
/* instantiate a character (skinned) with an optional tint, scaled to CHAR_HEIGHT. Returns {group, animator, bones} */
function spawnCharacter(id,tint){
  const rec=MODELS.items[id]; if(!rec)return null;
  const inst=THREE.SkeletonUtils.clone(rec.root);
  const h=modelHeight(rec.root)||1; const s=CHAR_HEIGHT/h; inst.scale.setScalar(s);
  const bones={};
  inst.traverse(o=>{ if(o.isBone||o.type==='Bone')bones[o.name]=o; if(o.isMesh){ o.material=o.material.clone(); if(tint!==undefined)o.material.color.set(tint); o.castShadow=true; } });
  const animator=makeAnimator(inst,MODELS.clips);
  return {group:inst,animator:animator,bones:bones,scale:s};
}
/* a static prop (weapon, crate, target) */
function spawnProp(id,tint){
  const rec=MODELS.items[id]; if(!rec)return null;
  const inst=rec.root.clone(true);
  inst.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); if(tint!==undefined)o.material.color.set(tint); o.castShadow=true; } });
  return inst;
}
/* tiny animation state machine over an AnimationMixer */
function makeAnimator(root,clips){
  const mixer=new THREE.AnimationMixer(root); const actions={};
  clips.forEach(c=>{ actions[c.name]=mixer.clipAction(c); });
  const A={mixer:mixer,actions:actions,current:null,once:false,
    play:function(name,fade,once,timeScale){
      const a=actions[name]; if(!a)return false;
      if(A.current===name&&!once){ a.timeScale=timeScale||1; return true; }
      if(A.current&&actions[A.current]!==a)actions[A.current].fadeOut(fade===undefined?0.15:fade);
      a.reset(); a.enabled=true; a.timeScale=timeScale||1;
      a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,Infinity); a.clampWhenFinished=!!once;
      a.fadeIn(fade===undefined?0.15:fade); a.play(); A.current=name; A.once=!!once; return true;
    },
    finished:function(){ const a=A.current&&actions[A.current]; return !!(a&&A.once&&(!a.isRunning()||a.time>=a.getClip().duration-0.001)); },
    update:function(dt){ mixer.update(dt); }
  };
  return A;
}
