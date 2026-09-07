/* ============================ navigation (grid + A*) ============================ */
/* A 1 m grid baked from boxes[] after each map builds. Every cell stores its ground height (top of whatever the
   cell centre stands on) and whether an obstacle taller than a step blocks it. Neighbours are traversable when
   both are open and their heights differ by at most NAV_STEP, so stairs (0.3 m steps) and platforms just work. */
const NAV_CELL=1, NAV_STEP=0.42, NAV_RADIUS=0.45;
const nav={w:0,h:0,ox:0,oz:0,open:null,height:null,ready:false,queries:0};
function navBuild(){
  const half=ARENA, w=Math.ceil(half*2/NAV_CELL), h=w;
  nav.w=w; nav.h=h; nav.ox=-half; nav.oz=-half;
  nav.open=new Uint8Array(w*h); nav.height=new Float32Array(w*h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const cx=nav.ox+(i+.5)*NAV_CELL, cz=nav.oz+(j+.5)*NAV_CELL, k=j*w+i;
    /* pass 1: support height = top of the solid stack under the cell centre (boxes resting on the ground or on each
       other, lowest first). A box floating above head height is a ceiling; one floating lower than that blocks. */
    let hgt=0, blocked=false; const under=[];
    for(let b=0;b<boxes.length;b++){ const bx=boxes[b];
      if(cx>=bx.min.x&&cx<=bx.max.x&&cz>=bx.min.z&&cz<=bx.max.z)under.push(bx); }
    under.sort((a,b)=>a.min.y-b.min.y);
    for(const bx of under){ if(bx.min.y<=hgt+NAV_STEP){ if(bx.max.y>hgt)hgt=bx.max.y; } else if(bx.min.y<hgt+1.7)blocked=true; }
    /* pass 2: any box within the enemy radius that rises more than a step above that ground blocks the cell */
    for(let b=0;b<boxes.length&&!blocked;b++){ const bx=boxes[b];
      if(cx+NAV_RADIUS<bx.min.x||cx-NAV_RADIUS>bx.max.x||cz+NAV_RADIUS<bx.min.z||cz-NAV_RADIUS>bx.max.z)continue;
      if(bx.max.y>hgt+NAV_STEP&&bx.min.y<hgt+1.7)blocked=true;
    }
    nav.height[k]=hgt; nav.open[k]=blocked?0:1;
  }
  nav.ready=true; nav.queries=0;
}
function navCell(x,z){ const i=Math.floor((x-nav.ox)/NAV_CELL), j=Math.floor((z-nav.oz)/NAV_CELL);
  return (i<0||j<0||i>=nav.w||j>=nav.h)?-1:j*nav.w+i; }
function navHeightAt(x,z){ const k=navCell(x,z); return k<0?0:nav.height[k]; }
function navOpenAt(x,z){ const k=navCell(x,z); return k>=0&&nav.open[k]===1; }
function navCentre(k,out){ out.x=nav.ox+((k%nav.w)+.5)*NAV_CELL; out.y=nav.height[k]; out.z=nav.oz+(Math.floor(k/nav.w)+.5)*NAV_CELL; return out; }
function navStep(a,b){ return nav.open[b]===1&&Math.abs(nav.height[a]-nav.height[b])<=NAV_STEP; }
/* nearest open cell to a point (spiral search, radius ≤ 4) */
function navNearestOpen(x,z){
  const k=navCell(x,z); if(k>=0&&nav.open[k])return k;
  const ci=Math.floor((x-nav.ox)/NAV_CELL), cj=Math.floor((z-nav.oz)/NAV_CELL);
  for(let r=1;r<=4;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
    if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
    const i=ci+di,j=cj+dj; if(i<0||j<0||i>=nav.w||j>=nav.h)continue;
    const q=j*nav.w+i; if(nav.open[q])return q;
  }
  return -1;
}
/* binary heap on f */
const _heap=[]; const _g=new Float32Array(1), _NB=[1,-1,0,0,1,1,-1,-1], _NBJ=[0,0,1,-1,1,-1,1,-1];
let navG=null, navFrom=null, navClosed=null, navStamp=1;
function navPath(fromK,toK,maxExpand){
  if(fromK<0||toK<0)return null;
  if(fromK===toK)return [toK];
  const n=nav.w*nav.h;
  if(!navG||navG.length!==n){ navG=new Float32Array(n); navFrom=new Int32Array(n); navClosed=new Uint32Array(n); navStamp=1; }
  navStamp++; if(navStamp>4e9){ navClosed.fill(0); navStamp=1; }
  const w=nav.w, tx=toK%w, tz=Math.floor(toK/w);
  const hfn=k=>{ const dx=Math.abs(k%w-tx), dz=Math.abs(Math.floor(k/w)-tz); return Math.max(dx,dz)+0.41*Math.min(dx,dz); };
  _heap.length=0; const push=(k,f)=>{ _heap.push({k:k,f:f}); let i=_heap.length-1; while(i>0){ const p=(i-1)>>1; if(_heap[p].f<=_heap[i].f)break; const t=_heap[p];_heap[p]=_heap[i];_heap[i]=t;i=p; } };
  const pop=()=>{ const top=_heap[0], last=_heap.pop(); if(_heap.length){ _heap[0]=last; let i=0; for(;;){ const l=i*2+1,r=l+1; let m=i; if(l<_heap.length&&_heap[l].f<_heap[m].f)m=l; if(r<_heap.length&&_heap[r].f<_heap[m].f)m=r; if(m===i)break; const t=_heap[m];_heap[m]=_heap[i];_heap[i]=t;i=m; } } return top; };
  navG[fromK]=0; navFrom[fromK]=-1; push(fromK,hfn(fromK));
  const seen=new Map(); seen.set(fromK,0);
  let expanded=0, best=fromK, bestH=hfn(fromK);
  while(_heap.length){
    const cur=pop(); const k=cur.k;
    if(navClosed[k]===navStamp)continue; navClosed[k]=navStamp;
    if(k===toK){ best=k; break; }
    const hk=hfn(k); if(hk<bestH){bestH=hk;best=k;}
    if(++expanded>maxExpand)break;
    const i=k%w, j=Math.floor(k/w), gk=seen.get(k);
    for(let d=0;d<8;d++){
      const ni=i+_NB[d], nj=j+_NBJ[d]; if(ni<0||nj<0||ni>=w||nj>=nav.h)continue;
      const nk=nj*w+ni; if(navClosed[nk]===navStamp||!navStep(k,nk))continue;
      if(d>=4){ /* diagonal: both orthogonal neighbours must be passable (no corner cutting) */
        if(!navStep(k,j*w+ni)||!navStep(k,nj*w+i))continue; }
      const ng=gk+(d>=4?1.414:1)+Math.abs(nav.height[nk]-nav.height[k])*2;
      const old=seen.get(nk); if(old!==undefined&&old<=ng)continue;
      seen.set(nk,ng); navFrom[nk]=k; push(nk,ng+hfn(nk));
    }
  }
  nav.queries++;
  const path=[]; let k=best; while(k!==-1&&path.length<600){ path.push(k); k=navFrom[k]; if(k===fromK){ path.push(k); break; } }
  path.reverse(); return path.length>1?path:null;
}
/* grid line-of-walk test between two cells (Bresenham); used for string-pulling */
function navClear(aK,bK){
  const w=nav.w; let x0=aK%w, y0=Math.floor(aK/w); const x1=bK%w, y1=Math.floor(bK/w);
  const dx=Math.abs(x1-x0), dy=Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1; let err=dx-dy, prev=aK;
  for(let guard=0;guard<200;guard++){
    const k=y0*w+x0; if(k!==prev&&!navStep(prev,k))return false; prev=k;
    if(x0===x1&&y0===y1)return true;
    const e2=2*err; if(e2>-dy){ err-=dy; x0+=sx; } if(e2<dx){ err+=dx; y0+=sy; }
  }
  return false;
}
/* per-enemy path following. Writes the desired horizontal direction into `out`; returns false when no path exists. */
const _navTmp=new THREE.Vector3();
function navSteer(e,targetPos,out,dt){
  if(!nav.ready)return false;
  const g=e.group.position;
  e.navT=(e.navT||0)-dt;
  const fromK=navNearestOpen(g.x,g.z), toK=navNearestOpen(targetPos.x,targetPos.z);
  if(e.navT<=0||!e.path||e.navGoal!==toK){
    e.navT=0.45+Math.random()*0.25; e.navGoal=toK; e.path=navPath(fromK,toK,2500); e.pathI=1;
    if(e.path){ /* string-pull: jump ahead to the furthest cell reachable in a straight line (bounded) */
      let far=1; for(let q=2;q<e.path.length&&q<=12;q++){ if(navClear(fromK,e.path[q]))far=q; else break; } e.pathI=far; }
  }
  if(!e.path||e.pathI>=e.path.length)return false;
  navCentre(e.path[e.pathI],_navTmp);
  let dx=_navTmp.x-g.x, dz=_navTmp.z-g.z; let d=Math.hypot(dx,dz);
  if(d<0.35&&e.pathI<e.path.length-1){ e.pathI++; navCentre(e.path[e.pathI],_navTmp); dx=_navTmp.x-g.x; dz=_navTmp.z-g.z; d=Math.hypot(dx,dz); }
  if(d<1e-4)return false;
  out.set(dx/d,0,dz/d); return true;
}
