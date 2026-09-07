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
function lineOfSight(from,to){
  const dir=_v1.copy(to).sub(from); const dist=dir.length(); dir.normalize();
  ray.set(from,dir); ray.far=dist;
  const hits=ray.intersectObjects(colliderMeshes,false);
  ray.far=Infinity;
  return hits.length===0;
}
