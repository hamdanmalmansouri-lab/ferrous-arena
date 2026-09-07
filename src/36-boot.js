/* ============================ boot ============================ */
resize(); showMenu(); syncHUD();
requestAnimationFrame(frame);
window.__ARENA__={state:state,player:player,run:run,enemies:enemies,keys:keys,camera:camera,CHARS:CHARS,ITEMS:ITEMS,
  computeStats:computeStats,selectChar:selectChar,giveItem:giveItem,useAbility:useAbility,goLobby:goLobby,goRange:goRange,goRun:goRun,
  startWave:startWave,pickups:pickups,targets:targets,interactables:interactables,perf:perf,Q:Q,setQuality:setQuality,renderer:renderer,toggleDebug:toggleDebug,inp:inp,touch:touch,pad:pad,TOUCH:TOUCH,
  forceStart:function(mode){ audio(); (mode==='lobby'?goLobby:mode==='range'?goRange:goRun)(); state.running=true; hud.classList.add('on'); screenEl.classList.add('hide'); }};
