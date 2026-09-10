/* ============================ characters ============================ */
function selectChar(i,inLobby){
  if(i<0||i>=CHARS.length)return;
  if(!unlocked(CHARS[i])&&!state.devUnlock){ if(inLobby){ SFX.empty(); say('<b>'+CHARS[i].name+'</b> locked &middot; '+CHARS[i].unlock.label,'warn'); } return; }
  run.charIdx=i; save.set('char',i);
  computeStats(); rebuildAvatar();
  player.hp=run.stats.maxHp; player.mag=run.stats.mag; player.abCd=0; player.abActive=0; player.abStock=run.stats.abStock||1; player.shield=0;
  if(inLobby){ SFX.ui(); say('Operative: <b>'+CH().name+'</b>'); updatePodRings(true); }
  syncHUD();
}
