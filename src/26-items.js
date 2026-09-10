/* ============================ items: give, offers, scrap, Fabricator ============================ */
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
/* ---- rarity roll: a tier by weight (70/25/5), then a random item of that tier. `minTier` raises the floor (Fabricator rare offer). ---- */
function rollTier(minTier){
  const min=TIER_ORDER.indexOf(minTier||'common'), pool=TIER_ORDER.slice(min<0?0:min);
  let tot=0; for(const t of pool)tot+=TIER_W[t]; let r=Math.random()*tot;
  for(const t of pool){ r-=TIER_W[t]; if(r<=0)return t; } return pool[pool.length-1];
}
function rollOffer(minTier,count){
  const out=[]; let guard=0;
  while(out.length<(count||3)&&guard++<80){ const tier=rollTier(minTier); const pool=ITEMS.filter(it=>it.tier===tier&&out.indexOf(it.id)<0); if(!pool.length)continue; out.push(pool[Math.floor(Math.random()*pool.length)].id); }
  return out;
}
/* ---- offers: every item the player receives is a choice of one out of three; the simulation pauses behind the card.
   Desktop: 1 / 2 / 3 (pointer lock is kept, so the hotkeys are the input; Esc re-renders the card with clickable options).
   Touch: three large tap targets. Gamepad: D-pad / left stick + A (pollOfferPad, driven from frame()). ---- */
function queueOffer(count,minTier,title){
  const o=state.offer;
  if(o&&o.stage==='pick'){ o.left+=count; showOffer(); return; }   // a second pickup while a card is up: one more choice after this one
  state.offer={stage:'pick',left:count,minTier:minTier||'common',items:rollOffer(minTier),sel:0,title:title||'Supply'};
  state.running=false; renderOffer();
}
function renderOffer(){ const o=state.offer; if(!o)return; if(o.stage==='fab')showFab(); else if(o.stage==='scrapPick')showScrapPick(); else showOffer(); }
function tierLabel(t){ return t.charAt(0).toUpperCase()+t.slice(1); }
function optHTML(it,i,sel,extra){ const c=n(it.id);
  return '<button class="opt t-'+it.tier+(sel?' sel':'')+'" data-i="'+i+'"><span class="tier">'+tierLabel(it.tier)+'</span><b class="code" style="color:'+it.color+'">'+it.code+'</b>'+
    '<h3>'+it.name+'</h3><p>'+it.desc+'</p><small>'+(extra||(c>0?'held &times;'+c:'new'))+'</small><kbd>'+(i+1)+'</kbd></button>'; }
function showOffer(){ const o=state.offer;
  showScreen('<h1>'+o.title+' <span>Drop</span></h1><div class="tag">Choose one'+(o.left>1?' &middot; '+(o.left-1)+' more after this':'')+(TOUCH?' &middot; tap a card':' &middot; press 1 / 2 / 3')+'</div>'+
    '<div class="offer">'+o.items.map((id,i)=>optHTML(ITEM_BY_ID[id],i,i===o.sel)).join('')+'</div>',true);
  card.querySelectorAll('.opt').forEach(el=>{ el.onclick=()=>pickOffer(parseInt(el.dataset.i)); });
}
function pickOffer(i){ const o=state.offer; if(!o||o.stage!=='pick')return; const id=o.items[i]; if(!id)return;
  giveItem(id); o.left--;
  if(o.left>0){ o.items=rollOffer(o.minTier); o.sel=0; showOffer(); return; }
  closeOffer(); }
function closeOffer(){ state.offer=null; if(TOUCH||pointerLocked||state.forced)resumePlay(); else enterPlay(); }
function offerMove(d){ const o=state.offer; if(!o)return; const nOpt=o.stage==='fab'?FAB_OPTS.length:o.items.length; o.sel=(o.sel+d+nOpt)%nOpt; SFX.ui(); renderOffer(); }
function offerConfirm(){ const o=state.offer; if(!o)return; if(o.stage==='pick')pickOffer(o.sel); else if(o.stage==='scrapPick')scrapPick(o.sel); else fabBuy(o.sel); }
function offerKey(i){ const o=state.offer; if(!o)return; if(o.stage==='pick')pickOffer(i); else if(o.stage==='scrapPick')scrapPick(i); else fabBuy(i); }

/* ---- scrap: credited straight to the counter on every kill (no pickup to chase) ---- */
const SCRAP_VALUE={chaser:3,shooter:5,elite:12,boss:60};
function addScrap(amount,pos){ if(amount<=0)return; state.scrap+=amount; if(pos)spark(pos,0xffc247,3); }

/* ---- Fabricator: one per stage at a random open cell away from the spawn; E opens a paused card ---- */
const FAB_OPTS=[
  {id:'offer', cost:60, name:'Item offer',        desc:'Three candidates, pick one'},
  {id:'rare',  cost:120,name:'Rare offer',        desc:'Three rare-or-better candidates'},
  {id:'reroll',cost:200,name:'Reroll a held item',desc:'Scrap one stack of an item you hold, choose a replacement'}
];
function spawnFabricator(spawn){
  state.fab=null; if(!nav.ready)return;
  const cands=[];
  for(let k=0;k<60;k++){ const x=(Math.random()*2-1)*(ARENA-5), z=(Math.random()*2-1)*(ARENA-5); const c=navNearestOpen(x,z); if(c<0)continue; navCentre(c,_v1);
    if(Math.hypot(_v1.x-spawn.x,_v1.z-spawn.z)<10)continue;
    let clear=true; for(const it of interactables)if(Math.hypot(it.pos.x-_v1.x,it.pos.z-_v1.z)<4)clear=false;
    if(clear)cands.push(c); }
  if(!cands.length)return;
  const p=navCentre(cands[Math.floor(Math.random()*cands.length)],new THREE.Vector3());
  const g=new THREE.Group();
  const m=MODELS.ok?spawnProp('desk'):null;
  if(m){ const b=new THREE.Box3().setFromObject(m); const sz=b.getSize(new THREE.Vector3()); const k=1.0/Math.max(sz.y,0.01); m.scale.setScalar(k); m.position.y=-b.min.y*k; g.add(m); }
  else { const box=new THREE.Mesh(new THREE.BoxGeometry(1.6,1,.8),stdMat(0x2c3745,.6,.4)); box.position.y=.5; box.castShadow=true; g.add(box); }
  const gl=glowSprite(0xffc247,4); gl.position.y=1.5; g.add(gl);
  const lab=makeLabel('FABRICATOR','#ffc247',.7); lab.position.y=2.6; g.add(lab);
  g.position.copy(p); world.add(g);
  interactables.push({pos:p.clone(),r:2.4,label:'Fabricator 00b7 60 / 120 / 200 scrap',action:openFabricator});
  state.fab={pos:p.clone(),g:g};
}
function openFabricator(){ if(state.offer||state.mode!=='run')return; state.offer={stage:'fab',sel:0,items:[]}; state.running=false; showFab(); }
function showFab(){ const o=state.offer;
  showScreen('<h1>Fabricator</h1><div class="tag">Scrap <b style="color:var(--warn)">'+state.scrap+'</b>'+(TOUCH?'':' &middot; 1 / 2 / 3 &middot; Esc to leave')+'</div>'+
    '<div class="offer fab">'+FAB_OPTS.map((f,i)=>'<button class="opt'+(i===o.sel?' sel':'')+(state.scrap<f.cost?' off':'')+'" data-i="'+i+'"><span class="tier">'+f.cost+' scrap</span><h3>'+f.name+'</h3><p>'+f.desc+'</p><kbd>'+(i+1)+'</kbd></button>').join('')+'</div>'+
    '<button class="ghost" id="fabLeave">Leave</button>',true);
  card.querySelectorAll('.opt').forEach(el=>{ el.onclick=()=>fabBuy(parseInt(el.dataset.i)); });
  $('fabLeave').onclick=closeOffer;
}
function fabBuy(i){ const o=state.offer; if(!o||o.stage!=='fab')return; const f=FAB_OPTS[i]; if(!f)return;
  if(state.scrap<f.cost){ SFX.empty(); return; }
  if(f.id==='reroll'){ const held=ITEMS.filter(it=>n(it.id)>0); if(!held.length){ SFX.empty(); say('Nothing to reroll'); return; }
    state.scrap-=f.cost; state.offer={stage:'scrapPick',sel:0,items:held.map(it=>it.id),left:0}; showScrapPick(); return; }
  state.scrap-=f.cost; SFX.item(); state.offer=null; queueOffer(1,f.id==='rare'?'rare':'common','Fabricator'); syncHUD();
}
function showScrapPick(){ const o=state.offer;
  showScreen('<h1>Scrap an <span>Item</span></h1><div class="tag">One stack is consumed; a new offer follows'+(TOUCH?'':' &middot; 1 &ndash; 9')+'</div>'+
    '<div class="offer many">'+o.items.map((id,i)=>optHTML(ITEM_BY_ID[id],i,i===o.sel,'held &times;'+n(id))).join('')+'</div>',true);
  card.querySelectorAll('.opt').forEach(el=>{ el.onclick=()=>scrapPick(parseInt(el.dataset.i)); });
}
function scrapPick(i){ const o=state.offer; if(!o||o.stage!=='scrapPick')return; const id=o.items[i]; if(!id)return; removeItemStack(id); state.offer=null; queueOffer(1,'common','Fabricator'); }
function removeItemStack(id){
  const before=run.stats.maxHp; run.items[id]=Math.max(0,n(id)-1); if(!run.items[id])delete run.items[id];
  computeStats(); if(run.stats.maxHp<before)player.hp=Math.min(player.hp,run.stats.maxHp); if(player.mag>run.stats.mag)player.mag=run.stats.mag;
  say('Scrapped <b>'+ITEM_BY_ID[id].name+'</b>'); syncItems(); syncHUD();
}
