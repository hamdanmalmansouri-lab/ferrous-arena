/* ============================ input state (keyboard / touch / gamepad merge) ============================ */
/* Every source writes into its own record; readInput() merges them into `inp` once per simulation step.
   Look (yaw/pitch) is applied directly by each source because it is a delta, not a state. */
const TOUCH=(function(){
  const q=location.search; if(/[?&]touch=0/.test(q))return false; if(/[?&]touch=1/.test(q))return true;
  if(IS_COARSE)return true;
  const pts=navigator.maxTouchPoints||0, fine=!!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
  return pts>0&&!fine;
})();
const inp={f:0,r:0,fire:false,sprint:false,jump:false,moving:false};
const touch={active:false,move:{x:0,y:0,len:0},fire:false,jump:false,stickId:null,lookId:null,lookX:0,lookY:0,
             assist:true,autoFire:false,sens:0.0045};
const pad={connected:false,prev:[],fire:false,f:0,r:0,sprint:false,jump:false};
const SETTINGS={touchSens:save.get('touchSens',1.0),mouseSens:save.get('mouseSens',1.0),padSens:save.get('padSens',1.0),
  volume:save.get('volume',0.9),invertY:save.get('invertY',false),shake:save.get('shake',true)!==false,overlay:false};
const TOUCH_SENS_BASE=0.0085, MOUSE_SENS_BASE=0.0022, PAD_SENS_BASE=2.8;
function applySettings(){ touch.sens=TOUCH_SENS_BASE*SETTINGS.touchSens; if(master)master.gain.value=SETTINGS.volume; }
const AUTO_FIRE=save.get('autofire',false), AIM_ASSIST=save.get('aimassist',true);
touch.autoFire=!!AUTO_FIRE; touch.assist=AIM_ASSIST!==false; applySettings();

function readInput(){
  inp.f=(keys.w?1:0)-(keys.s?1:0); inp.r=(keys.d?1:0)-(keys.a?1:0);
  inp.fire=!!keys.mouse; inp.sprint=!!(keys.shift&&keys.w); inp.jump=!!keys.space;
  if(TOUCH&&touch.active){
    if(touch.move.len>0.08){ inp.f=touch.move.y; inp.r=touch.move.x; inp.sprint=touch.move.len>0.85&&touch.move.y>0.4; }
    inp.fire=inp.fire||touch.fire; inp.jump=inp.jump||touch.jump;
  }
  if(pad.connected){
    if(Math.hypot(pad.f,pad.r)>0.18){ inp.f=pad.f; inp.r=pad.r; inp.sprint=pad.sprint; }
    inp.fire=inp.fire||pad.fire; inp.jump=inp.jump||pad.jump;
  }
  const m=Math.hypot(inp.f,inp.r); if(m>1){inp.f/=m;inp.r/=m;}
  inp.moving=m>0.05;
  return inp;
}

/* ---- gamepad (polled once per step) ---- */
const PAD_DEAD=0.18;
function pollGamepad(dt){
  const gps=navigator.getGamepads?navigator.getGamepads():null; if(!gps)return;
  let gp=null; for(let i=0;i<gps.length;i++){ if(gps[i]&&gps[i].connected){gp=gps[i];break;} }
  if(!gp){ pad.connected=false; pad.fire=false; pad.f=pad.r=0; pad.jump=false; return; }
  pad.connected=true;
  const ax=gp.axes, b=gp.buttons;
  const lx=ax[0]||0, ly=ax[1]||0, rx=ax[2]||0, ry=ax[3]||0;
  const lm=Math.hypot(lx,ly);
  if(lm>PAD_DEAD){ const k=(lm-PAD_DEAD)/(1-PAD_DEAD)/lm; pad.f=-ly*k; pad.r=lx*k; pad.sprint=lm>0.92; } else { pad.f=pad.r=0; pad.sprint=false; }
  const rm=Math.hypot(rx,ry);
  if(rm>PAD_DEAD&&state.running){ const k=(rm-PAD_DEAD)/(1-PAD_DEAD); const curve=k*k*PAD_SENS_BASE*SETTINGS.padSens;
    player.yaw-=rx/rm*curve*dt; player.pitch-=ry/rm*curve*0.7*dt*(SETTINGS.invertY?-1:1); player.pitch=Math.max(-0.95,Math.min(0.72,player.pitch)); }
  const pressed=i=>!!(b[i]&&(b[i].pressed||b[i].value>0.5));
  const edge=i=>{ const now=pressed(i), was=!!pad.prev[i]; pad.prev[i]=now; return now&&!was; };
  pad.fire=pressed(7);                              // RT
  pad.jump=pressed(0);                              // A / Cross
  if(state.running){
    if(edge(4)||edge(6))useAbility();               // LB / LT
    if(edge(2))startReload();                       // X / Square
    if(edge(3)||edge(1))doInteract();               // Y / B
    if(edge(9))pauseGame();                         // Start
  }else{ edge(4);edge(6);edge(2);edge(3);edge(1); if(edge(9)||edge(0)){ const go=document.getElementById('go'); if(go)go.click(); } }
}

/* ---- touch aim assist: nudge the camera toward the nearest enemy hit box close to the crosshair ---- */
const _assistDir=new THREE.Vector3(), _assistTo=new THREE.Vector3();
function aimAssist(dt){
  if(!TOUCH||!touch.assist||state.mode==='lobby')return;
  forwardInto(_assistDir,player.yaw,player.pitch);
  let best=null,bestAng=0.07;                        // ~4 degrees
  for(let i=0;i<enemies.length;i++){
    const e=enemies[i]; if(e.dead)continue;
    _assistTo.copy(e.group.position); _assistTo.y+=1.1*e.size; _assistTo.sub(camera.position);
    const d=_assistTo.length(); if(d>40||d<1.5)continue;
    _assistTo.multiplyScalar(1/d);
    const ang=Math.acos(Math.max(-1,Math.min(1,_assistTo.dot(_assistDir))));
    if(ang<bestAng){ bestAng=ang; best=_assistTo.clone(); }
  }
  if(!best)return;
  const ty=Math.atan2(-best.x,-best.z), tp=Math.asin(Math.max(-1,Math.min(1,best.y)));
  let dy=ty-player.yaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy));
  const k=Math.min(1,(inp.fire?7:3)*dt);
  player.yaw+=dy*k; player.pitch+=(tp-player.pitch)*k;
}
let autoFireTick=0;
function autoFireCheck(){
  if(!TOUCH||!touch.autoFire||state.mode==='lobby'||!state.running)return false;
  autoFireTick=(autoFireTick+1)%4; if(autoFireTick)return inp._auto||false;
  ray.setFromCamera({x:0,y:0},camera); ray.far=60;
  const h=ray.intersectObjects(enemyHitMeshes,false); ray.far=Infinity;
  inp._auto=h.length>0&&h[0].object.userData.enemy&&!h[0].object.userData.enemy.dead;
  return inp._auto;
}
function doInteract(){ if(nearInteract){ const a=nearInteract.action; nearInteract=null; a(); } }
function pauseGame(){ if(!state.running)return; if(pointerLocked){ document.exitPointerLock(); return; } state.running=false; state.mode==='lobby'?showLobbyPanel():showPause(); }
function haptic(ms){ if(TOUCH&&navigator.vibrate){ try{navigator.vibrate(ms);}catch(e){} } }
