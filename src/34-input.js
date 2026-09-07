/* ============================ input ============================ */
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}
addEventListener('resize',resize);

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup')keys.w=true;
  if(k==='s'||k==='arrowdown')keys.s=true;
  if(k==='a'||k==='arrowleft')keys.a=true;
  if(k==='d'||k==='arrowright')keys.d=true;
  if(k==='shift')keys.shift=true;
  if(k===' '){keys.space=true;e.preventDefault();}
  if(k==='`'||k==='~')toggleDebug();
  if(!state.running)return;
  if(k==='r')startReload();
  if(k==='q')useAbility();
  if(k==='e')doInteract();
  if(state.mode==='lobby'&&(k==='1'||k==='2'||k==='3'))selectChar(parseInt(k)-1,true);
  if(k==='tab'){ e.preventDefault(); pauseGame(); }
  if(k==='p')pauseGame();
});
addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup')keys.w=false;
  if(k==='s'||k==='arrowdown')keys.s=false;
  if(k==='a'||k==='arrowleft')keys.a=false;
  if(k==='d'||k==='arrowright')keys.d=false;
  if(k==='shift')keys.shift=false;
  if(k===' ')keys.space=false;
});
addEventListener('mousedown',e=>{ if(!pointerLocked)return; if(e.button===0)keys.mouse=true; if(e.button===2)useAbility(); });
addEventListener('mouseup',e=>{ if(e.button===0)keys.mouse=false; });
addEventListener('contextmenu',e=>{ if(pointerLocked)e.preventDefault(); });
addEventListener('blur',()=>{ keys.w=keys.a=keys.s=keys.d=keys.shift=keys.mouse=keys.space=false; });

addEventListener('mousemove',e=>{
  if(!pointerLocked)return;
  const SENS=MOUSE_SENS_BASE*SETTINGS.mouseSens;
  player.yaw-=e.movementX*SENS;
  player.pitch-=e.movementY*SENS*(SETTINGS.invertY?-1:1);
  player.pitch=Math.max(-0.95,Math.min(0.72,player.pitch));
});
document.addEventListener('pointerlockchange',()=>{
  pointerLocked=(document.pointerLockElement===canvas);
  if(pointerLocked){
    if(!state.over&&state.mode!=='menu')resumePlay();
  }else{
    keys.mouse=false;
    if(state.running&&!state.over){ state.running=false; if(state.mode==='lobby')showLobbyPanel(); else showPause(); }
  }
});
