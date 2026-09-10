/* ============================ math helpers ============================ */
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3();
const _fwd=new THREE.Vector3(),_right=new THREE.Vector3(),_wish=new THREE.Vector3(),_camF=new THREE.Vector3(),_camR=new THREE.Vector3(),_pivot=new THREE.Vector3(),_look=new THREE.Vector3();
const UP=new THREE.Vector3(0,1,0);
function forwardVec(yaw,pitch){
  return new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
}
function forwardInto(out,yaw,pitch){
  return out.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
}
function resolveXZ(pos,radius,footY,height){
  let hit=false;
  for(let i=0;i<boxes.length;i++){
    const b=boxes[i];
    if(b.max.y<=footY+0.35) continue;
    if(b.min.y>=footY+height) continue;
    const cx=Math.max(b.min.x,Math.min(pos.x,b.max.x));
    const cz=Math.max(b.min.z,Math.min(pos.z,b.max.z));
    const dx=pos.x-cx, dz=pos.z-cz;
    const d2=dx*dx+dz*dz;
    if(d2<radius*radius){
      hit=true;
      if(d2>1e-6){ const d=Math.sqrt(d2); pos.x=cx+dx/d*radius; pos.z=cz+dz/d*radius; }
      else{
        const px=Math.min(pos.x-b.min.x,b.max.x-pos.x), pz=Math.min(pos.z-b.min.z,b.max.z-pos.z);
        if(px<pz) pos.x += (pos.x-(b.min.x+b.max.x)/2)>0?px+radius:-(px+radius);
        else      pos.z += (pos.z-(b.min.z+b.max.z)/2)>0?pz+radius:-(pz+radius);
      }
    }
  }
  return hit;
}
function supportHeight(pos,radius){
  let h=0;
  for(let i=0;i<boxes.length;i++){
    const b=boxes[i];
    if(pos.x>b.min.x-radius&&pos.x<b.max.x+radius&&pos.z>b.min.z-radius&&pos.z<b.max.z+radius)
      if(b.max.y>h&&b.min.y<=pos.y+0.35)h=b.max.y;
  }
  return h;
}
const ray=new THREE.Raycaster();
/* ray vs AABB slab test. Returns the entry distance, or a negative number when the box is behind the origin or contains it
   (a gun poking through the wall the player is hugging should not block its own shot); -1 when missed. */
function rayAABB(o,d,b,tFar){
  let t0=-Infinity, t1=tFar, a, c, s;
  if(Math.abs(d.x)<1e-9){ if(o.x<b.min.x||o.x>b.max.x)return -1; } else { a=(b.min.x-o.x)/d.x; c=(b.max.x-o.x)/d.x; if(a>c){s=a;a=c;c=s;} if(a>t0)t0=a; if(c<t1)t1=c; if(t0>t1)return -1; }
  if(Math.abs(d.y)<1e-9){ if(o.y<b.min.y||o.y>b.max.y)return -1; } else { a=(b.min.y-o.y)/d.y; c=(b.max.y-o.y)/d.y; if(a>c){s=a;a=c;c=s;} if(a>t0)t0=a; if(c<t1)t1=c; if(t0>t1)return -1; }
  if(Math.abs(d.z)<1e-9){ if(o.z<b.min.z||o.z>b.max.z)return -1; } else { a=(b.min.z-o.z)/d.z; c=(b.max.z-o.z)/d.z; if(a>c){s=a;a=c;c=s;} if(a>t0)t0=a; if(c<t1)t1=c; if(t0>t1)return -1; }
  return t0;
}
/* nearest world hit (boxes[] + the y=0 floor) along a ray, ignoring anything nearer than tNear. Returns the distance or -1. */
function rayWorld(o,d,tFar,tNear){
  let best=tFar; tNear=tNear>0?tNear:0;
  for(let i=0;i<boxes.length;i++){ const t=rayAABB(o,d,boxes[i],best); if(t>=tNear&&t<best)best=t; }
  if(d.y<-1e-6){ const t=-o.y/d.y; if(t>=tNear&&t<best)best=t; }
  return best<tFar?best:-1;
}
const _los=new THREE.Vector3();
function lineOfSight(from,to){
  const dir=_los.copy(to).sub(from); const dist=dir.length(); if(dist<1e-4)return true; dir.multiplyScalar(1/dist);
  return rayWorld(from,dir,dist,0)<0;
}
