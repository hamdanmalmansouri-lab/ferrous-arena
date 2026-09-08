/* ============================ boot ============================ */
resize(); syncHUD();
card.className='card'; card.innerHTML='<h1>Ferrous <span>Arena</span></h1><div class="tag">Loading models</div><div id="ldbar" style="height:6px;margin-top:22px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden"><div id="ldfill" style="height:100%;width:0;background:var(--accent);transition:width .15s"></div></div>';
requestAnimationFrame(frame);
loadModels(p=>{ const f=document.getElementById('ldfill'); if(f)f.style.width=(p*100).toFixed(0)+'%'; }).then(()=>{ rebuildAvatar(); showMenu(); });
window.__ARENA__={applyLook:applyLook,camYaw:camYaw,state:state,player:player,run:run,enemies:enemies,keys:keys,camera:camera,CHARS:CHARS,ITEMS:ITEMS,
  computeStats:computeStats,selectChar:selectChar,giveItem:giveItem,useAbility:useAbility,goLobby:goLobby,goRange:goRange,goRun:goRun,
  startWave:startWave,pickups:pickups,targets:targets,interactables:interactables,perf:perf,Q:Q,setQuality:setQuality,renderer:renderer,toggleDebug:toggleDebug,inp:inp,touch:touch,pad:pad,TOUCH:TOUCH,nav:nav,MAPS:MAPS,buildStage:buildStage,nextStage:nextStage,mapData:mapData,stageMap:stageMap,navPath:navPath,navNearestOpen:navNearestOpen,bossDefeated:bossDefeated,MODELS:MODELS,SETTINGS:SETTINGS,showSettings:showSettings,spawnCharacter:spawnCharacter,GUN_MOUNT:GUN_MOUNT,avatar:avatar,podDisplays:podDisplays,makeEnemy:makeEnemy,avatarAnim:function(){return avatarAnim;},corpses:corpses,
  forceStart:function(mode){ audio(); (mode==='lobby'?goLobby:mode==='range'?goRange:goRun)(); state.running=true; hud.classList.add('on'); screenEl.classList.add('hide'); }};
