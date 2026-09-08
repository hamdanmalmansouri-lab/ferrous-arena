/* World-space retarget of Universal Animation Library clips (UE-mannequin rig) onto the Quaternius modular-human rig.
   Both rigs bind in a T-pose facing +Z at ~1.85 m, so per-bone world-rotation deltas from the bind pose transfer directly:
     Rw_target(t) = (Rw_source(t) · Rw_source_bind⁻¹) · Rw_target_bind,   local = Rw_parent_target(t)⁻¹ · Rw_target(t)
   Hip translation deltas are scaled by the height ratio. Feet on the human rig are IK-style bones under Root, so they get
   world-placed translation + rotation. Used by pack-quaternius.js; returns nothing, adds animations to `human`. */
const {mat4,vec3,quat}=require('gl-matrix');
const MAP={pelvis:'Body',spine_01:'Abdomen',spine_02:'Torso',spine_03:'Chest',neck_01:'Neck',Head:'Head',
  clavicle_l:'Shoulder.L',upperarm_l:'UpperArm.L',lowerarm_l:'LowerArm.L',hand_l:'Wrist.L',
  clavicle_r:'Shoulder.R',upperarm_r:'UpperArm.R',lowerarm_r:'LowerArm.R',hand_r:'Wrist.R',
  thigh_l:'UpperLeg.L',calf_l:'LowerLeg.L',foot_l:'Foot.L',thigh_r:'UpperLeg.R',calf_r:'LowerLeg.R',foot_r:'Foot.R'};
const TRANS={pelvis:1,foot_l:1,foot_r:1};   // source bones whose world translation is transferred
function rig(doc){
  const nodes={}, parent={};
  for(const n of doc.getRoot().listNodes()){ nodes[n.getName()]=n; for(const c of n.listChildren())parent[c.getName()]=n.getName(); }
  /* bind world matrices: joints from the skin's inverse bind matrices, everything else from the rest hierarchy */
  const bindW={}; const skin=doc.getRoot().listSkins()[0]; const ibm=skin.getInverseBindMatrices();
  skin.listJoints().forEach((j,i)=>{ const m=new Array(16); ibm.getElement(i,m); bindW[j.getName()]=mat4.invert(mat4.create(),m); });
  const restW=nm=>{ const n=nodes[nm]; const l=mat4.fromRotationTranslationScale(mat4.create(),n.getRotation(),n.getTranslation(),n.getScale()); const p=parent[nm]; return p?mat4.multiply(mat4.create(),restW(p),l):l; };
  for(const nm in nodes)if(!bindW[nm])bindW[nm]=restW(nm);
  return {nodes:nodes,parent:parent,bindW:bindW};
}
function rotOf(m){ return quat.normalize(quat.create(),mat4.getRotation(quat.create(),m)); }
function posOf(m){ return [m[12],m[13],m[14]]; }
/* channel sampler for the source clip */
function sampler(anim){
  const per={};
  for(const ch of anim.listChannels()){ const n=ch.getTargetNode(); if(!n)continue; const s=ch.getSampler(); const inp=s.getInput(), out=s.getOutput();
    const times=[]; for(let i=0;i<inp.getCount();i++)times.push(inp.getScalar(i));
    const size=out.getElementSize(); const vals=[]; for(let i=0;i<out.getCount();i++){ const v=new Array(size); out.getElement(i,v); vals.push(v); }
    (per[n.getName()]=per[n.getName()]||{})[ch.getTargetPath()]={times:times,vals:vals}; }
  const lerpAt=(tr,t,isQ)=>{ const T=tr.times; if(t<=T[0])return tr.vals[0]; if(t>=T[T.length-1])return tr.vals[T.length-1];
    let i=1; while(T[i]<t)i++; const k=(t-T[i-1])/(T[i]-T[i-1]); const a=tr.vals[i-1], b=tr.vals[i];
    if(isQ)return Array.from(quat.slerp(quat.create(),a,b,k)); return a.map((v,j)=>v+(b[j]-v)*k); };
  return {duration:Math.max(...Object.values(per).flatMap(p=>Object.values(p).map(tr=>tr.times[tr.times.length-1]))),
    local:(rigS,nm,t)=>{ const n=rigS.nodes[nm]; const p=per[nm]||{};
      const T=p.translation?lerpAt(p.translation,t):n.getTranslation(), R=p.rotation?lerpAt(p.rotation,t,true):n.getRotation(), S=p.scale?lerpAt(p.scale,t):n.getScale();
      return mat4.fromRotationTranslationScale(mat4.create(),R,T,S); }};
}
function retargetClip(human,ual,srcName,dstName,opts){
  opts=opts||{}; const rs=rig(ual), rt=rig(human); const anim=ual.getRoot().listAnimations().find(a=>a.getName()===srcName); if(!anim)throw new Error('no clip '+srcName);
  const S=sampler(anim); const fps=30; const t0=opts.from||0, t1=opts.to||S.duration; const n=Math.max(2,Math.round((t1-t0)*fps)+1);
  const heightRatio=opts.heightRatio||1;
  /* source world matrices at t (memo per frame) */
  const srcWorld=(t,cache)=>nm=>{ if(cache[nm])return cache[nm]; const l=S.local(rs,nm,t); const p=rs.parent[nm]; const w=p?mat4.multiply(mat4.create(),srcWorld(t,cache)(p),l):l; return cache[nm]=w; };
  const order=[]; (function walk(nm){ order.push(nm); for(const c of rt.nodes[nm].listChildren())walk(c.getName()); })(Object.keys(rt.nodes).find(nm=>!rt.parent[nm]));
  const inv=Object.fromEntries(Object.entries(MAP).map(([s,d])=>[d,s]));
  const tracks={};   // dst node -> {rotation:[], translation:[]}
  const times=[];
  for(let f=0;f<n;f++){ const t=t0+(t1-t0)*f/(n-1); times.push(t-t0); const cache={}; const sw=srcWorld(t,cache); const tw={};
    for(const nm of order){ const src=inv[nm]; const p=rt.parent[nm]; const pw=p?tw[p]:mat4.create();
      let w;
      if(src){ const d=quat.multiply(quat.create(),rotOf(sw(src)),quat.invert(quat.create(),rotOf(rs.bindW[src])));
        const R=quat.multiply(quat.create(),d,rotOf(rt.bindW[nm]));
        let P=posOf(rt.bindW[nm]);
        if(TRANS[src]){ const ds=vec3.sub(vec3.create(),posOf(sw(src)),posOf(rs.bindW[src])); P=vec3.scaleAndAdd(vec3.create(),P,ds,heightRatio); }
        else { /* keep the bone attached: bind offset from the parent, rotated by the parent's current rotation */
          const off=vec3.sub(vec3.create(),posOf(rt.bindW[nm]),posOf(rt.bindW[p])); const pr=rotOf(pw), pb=quat.invert(quat.create(),rotOf(rt.bindW[p]));
          P=vec3.add(vec3.create(),posOf(pw),vec3.transformQuat(vec3.create(),off,quat.multiply(quat.create(),pr,pb))); }
        w=mat4.fromRotationTranslation(mat4.create(),R,P);
        const local=mat4.multiply(mat4.create(),mat4.invert(mat4.create(),pw),w);
        const tr=tracks[nm]=tracks[nm]||{rotation:[],translation:[]}; tr.rotation.push(Array.from(rotOf(local))); tr.translation.push(posOf(local)); }
      else { /* unmapped (Root, armature, fingers, PT): rest local under the animated parent */
        const nd=rt.nodes[nm]; const l=mat4.fromRotationTranslationScale(mat4.create(),nd.getRotation(),nd.getTranslation(),nd.getScale()); w=mat4.multiply(mat4.create(),pw,l); }
      tw[nm]=w; } }
  /* write the clip */
  const buffer=human.getRoot().listBuffers()[0]; const out=human.createAnimation(dstName);
  const inputAcc=human.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
  for(const nm in tracks){ const node=rt.nodes[nm]; const tr=tracks[nm];
    const rot=human.createAccessor().setType('VEC4').setArray(new Float32Array(tr.rotation.flat())).setBuffer(buffer);
    const s1=human.createAnimationSampler().setInput(inputAcc).setOutput(rot); out.addSampler(s1).addChannel(human.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(s1));
    if(TRANS[inv[nm]]){ const tra=human.createAccessor().setType('VEC3').setArray(new Float32Array(tr.translation.flat())).setBuffer(buffer);
      const s2=human.createAnimationSampler().setInput(inputAcc).setOutput(tra); out.addSampler(s2).addChannel(human.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(s2)); } }
  return out;
}
module.exports={retargetClip:retargetClip};
