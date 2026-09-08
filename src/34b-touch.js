/* ============================ touch controls ============================ */
const STICK_R=50;
let stickOX=0,stickOY=0;
if(TOUCH){
  touchEl.classList.add('on'); touch.active=true;
  const press=(el,down,up)=>{
    el.addEventListener('pointerdown',e=>{ e.preventDefault(); audio(); el.classList.add('held'); try{el.setPointerCapture(e.pointerId);}catch(x){} down&&down(e); });
    const rel=e=>{ el.classList.remove('held'); up&&up(e); };
    el.addEventListener('pointerup',rel); el.addEventListener('pointercancel',rel); el.addEventListener('lostpointercapture',rel);
  };
  press(tFire,()=>{touch.fire=true;},()=>{touch.fire=false;});
  press(tJump,()=>{touch.jump=true;},()=>{touch.jump=false;});
  press(tAbil,()=>{ if(state.running)useAbility(); });
  press(tReload,()=>{ if(state.running)startReload(); });
  press(tInteract,()=>{ if(state.running)doInteract(); });
  press(tPause,()=>{ pauseGame(); });

  zoneL.addEventListener('pointerdown',e=>{
    e.preventDefault(); audio();
    if(touch.stickId!==null)return;
    touch.stickId=e.pointerId; stickOX=e.clientX; stickOY=e.clientY;
    stickEl.style.left=stickOX+'px'; stickEl.style.top=stickOY+'px'; stickEl.classList.add('on');
    stickEl.firstElementChild.style.transform='translate(0,0)';
    touch.move.x=touch.move.y=touch.move.len=0;
  });
  zoneR.addEventListener('pointerdown',e=>{
    e.preventDefault(); audio();
    if(touch.lookId!==null)return;
    touch.lookId=e.pointerId; touch.lookX=e.clientX; touch.lookY=e.clientY;
  });
  addEventListener('pointermove',e=>{
    if(e.pointerId===touch.stickId){
      let dx=e.clientX-stickOX, dy=e.clientY-stickOY; const len=Math.hypot(dx,dy);
      const r=Math.min(1,len/STICK_R); if(len>STICK_R){ dx*=STICK_R/len; dy*=STICK_R/len; }
      touch.move.x=dx/STICK_R; touch.move.y=-dy/STICK_R; touch.move.len=r;
      stickEl.firstElementChild.style.transform='translate('+dx+'px,'+dy+'px)';
    }else if(e.pointerId===touch.lookId&&state.running){
      const dx=e.clientX-touch.lookX, dy=e.clientY-touch.lookY; touch.lookX=e.clientX; touch.lookY=e.clientY;
      applyLook(dx*touch.sens,dy*touch.sens*0.85);
    }
  },{passive:true});
  const endPtr=e=>{
    if(e.pointerId===touch.stickId){ touch.stickId=null; touch.move.x=touch.move.y=touch.move.len=0; stickEl.classList.remove('on'); }
    if(e.pointerId===touch.lookId)touch.lookId=null;
  };
  addEventListener('pointerup',endPtr); addEventListener('pointercancel',endPtr);
  addEventListener('blur',()=>{ touch.stickId=touch.lookId=null; touch.fire=touch.jump=false; touch.move.len=0; stickEl.classList.remove('on'); });
  /* iOS: block the page from scrolling/zooming under the game */
  document.addEventListener('touchmove',e=>{ if(e.target.closest&&e.target.closest('#screen'))return; e.preventDefault(); },{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());
}
function syncTouchHUD(){
  if(!TOUCH)return;
  const ab=CH().ability, s=run.stats;
  tAbilTxt.innerHTML=ab.short+'<small>'+(player.abActive>0?player.abActive.toFixed(1)+'s':player.abCd>0?player.abCd.toFixed(1)+'s':'ready')+'</small>';
  tAbil.className='tbtn'+(player.abActive>0?' active':player.abCd>0?'':' ready');
  tAbil.firstElementChild.style.height=player.abActive>0?'100%':player.abCd>0?((1-player.abCd/(ab.cd*s.cdMult))*100)+'%':'100%';
}
