/* ============================ items ============================ */
function giveItem(id){
  const it=ITEM_BY_ID[id]||ITEMS[Math.floor(Math.random()*ITEMS.length)];
  const before=run.stats.maxHp;
  run.items[it.id]=n(it.id)+1; run.itemsTaken++;
  computeStats();
  if(run.stats.maxHp>before)player.hp+=run.stats.maxHp-before;
  if(player.mag>run.stats.mag)player.mag=run.stats.mag;
  SFX.item(); say('<b>'+it.name+'</b> &middot; '+it.desc,'item');
  showBanner(it.name,it.desc,true);
  syncItems(); syncHUD();
}
function randomItemId(){ return ITEMS[Math.floor(Math.random()*ITEMS.length)].id; }
