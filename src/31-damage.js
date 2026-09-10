/* ============================ damage ============================ */
/* camera shake request: amplitude 0..1, attenuated by distance from the player (0 = on the player) */
function shakeCam(amp,dist){ const k=dist>0?Math.max(0,1-dist/22):1; state.shake=Math.min(1,Math.max(state.shake,amp*k)); }
function hurtPlayer(amount){
  if(!state.running||state.mode!=='run'||player.iframes>0)return;
  if(asc('warcry')&&player.abActive>0)amount*=0.7;   // Warcry
  if(CH().id==='bulwark'&&player.grounded&&(inp.fire||player.fireCd>0.02)){ amount*=0.75; fired('braced'); }   // Bulwark's Braced
  if(run.kind==='meltdown')amount*=1+MELTDOWN.shardEnemyDmg*heldShards();   // held Core Shards: enemies hit harder
  if(player.shield>0){ const a=Math.min(player.shield,amount); player.shield-=a; amount-=a; spark(player.pos.clone().setY(1.2),0x6fe3ff,5); if(player.shield<=0){shieldMesh.visible=false;} }
  if(amount<=0){ syncHUD(); return; }
  player.hp-=amount; player.lastHurt=0; player.flinch=1; player.hitT=0.45; shakeCam(Math.min(0.5,0.2+amount/60),0);
  dmgEl.style.opacity=Math.min(.9,0.35+amount/40); player.dmgT=0.13;
  SFX.hurt(); haptic(35);
  player.iframes=0.35;   // no chain hits: three Rushers can't stun-lock a full-health operative
  if(player.hp<=0){ player.hp=0; gameOver(); }
  syncHUD();
}
