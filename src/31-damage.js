/* ============================ damage ============================ */
function hurtPlayer(amount){
  if(!state.running||state.mode!=='run'||player.iframes>0)return;
  if(player.shield>0){ const a=Math.min(player.shield,amount); player.shield-=a; amount-=a; spark(player.pos.clone().setY(1.2),0x6fe3ff,5); if(player.shield<=0){shieldMesh.visible=false;} }
  if(amount<=0){ syncHUD(); return; }
  player.hp-=amount; player.lastHurt=0;
  dmgEl.style.opacity=Math.min(.9,0.35+amount/40);
  setTimeout(()=>{dmgEl.style.opacity=0;},130);
  SFX.hurt(); haptic(35);
  if(player.hp<=0){ player.hp=0; gameOver(); }
  syncHUD();
}
