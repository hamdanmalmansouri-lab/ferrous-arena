/* ============================ data: items ============================ */
/* tier drives the offer roll (TIER_W), the codex grouping and the HUD chip border (TIER_CSS) */
const ITEMS=[
  {id:'syringe',  name:'Stim Syringe',     code:'SY',color:'#4ea8ff',tier:'common',   desc:'+12% fire rate'},
  {id:'plating',  name:'Hardened Plating', code:'HP',color:'#3ddc84',tier:'common',   desc:'+20 max health'},
  {id:'servo',    name:'Servo Legs',       code:'SV',color:'#8fd3ff',tier:'common',   desc:'+10% move speed'},
  {id:'lens',     name:'Focus Lens',       code:'FL',color:'#ffd166',tier:'rare',     desc:'+10% crit chance (2× dmg)'},
  {id:'rounds',   name:'Tungsten Rounds',  code:'TR',color:'#ff9e3d',tier:'common',   desc:'+10% damage'},
  {id:'extmag',   name:'Extended Mag',     code:'XM',color:'#c9a0ff',tier:'common',   desc:'+25% magazine size'},
  {id:'loader',   name:'Quick Loader',     code:'QL',color:'#ffc247',tier:'common',   desc:'-15% reload time'},
  {id:'regen',    name:'Regen Module',     code:'RG',color:'#7ef0a8',tier:'rare',     desc:'+1.2 HP/s regeneration'},
  {id:'capacitor',name:'Ability Capacitor',code:'AC',color:'#6fe3ff',tier:'rare',     desc:'-12% ability cooldown'},
  {id:'coil',     name:'Vampiric Coil',    code:'VC',color:'#ff6a8a',tier:'rare',     desc:'+3% lifesteal'},
  {id:'reactor',  name:'Reactor Heart',    code:'RH',color:'#ff7a9a',tier:'legendary',desc:'+35 max health and +1 HP/s'},
  {id:'overclock',name:'Overclock Chip',   code:'OC',color:'#ffd166',tier:'legendary',desc:'+15% fire rate and +8% damage'}
];
const ITEM_BY_ID={}; ITEMS.forEach(it=>ITEM_BY_ID[it.id]=it);
const TIER_ORDER=['common','rare','legendary'];
const TIER_W={common:70,rare:25,legendary:5};
const TIER_CSS={common:'#8fa2bd',rare:'#4ea8ff',legendary:'#ffd166'};
/* ---- evolutions: fuse an item at FUSE_STACKS with a Forge Core (Wardens drop one). Hooks live in tryFire / dealDamage / killEnemy / update. ---- */
const FUSE_STACKS=5;
const EVOS={
  syringe:   {id:'adrenal',    name:'Adrenal Cascade',desc:'Kills grant +30% fire rate for 3 s, stacking up to x3'},
  plating:   {id:'weave',      name:'Ablative Weave', desc:'Overshield worth 25% of max health; refills after 8 s without damage'},
  servo:     {id:'kinetic',    name:'Kinetic Drive',  desc:'+40% damage for 2 s after a sprint'},
  lens:      {id:'fracture',   name:'Fracture Optic', desc:'Crits ricochet to a second enemy within 8 m for 60%'},
  rounds:    {id:'railcore',   name:'Railcore',       desc:'Every 6th shot pierces for 250%'},
  extmag:    {id:'beltfeed',   name:'Belt Feed',      desc:'+50% damage from the last 25% of the magazine'},
  loader:    {id:'hotswap',    name:'Hot Swap',       desc:'1.5 s of free ammo after every reload'},
  regen:     {id:'nanite',     name:'Nanite Bloom',   desc:'A 3 m regen aura that never stops in combat; overheal becomes shield'},
  capacitor: {id:'overcharge', name:'Overcharge Cell',desc:'A second ability charge'},
  coil:      {id:'hemolattice',name:'Hemolattice',    desc:'Lifesteal counts overkill; kills grant +8% speed for 2 s'}
};
const EVO_BY_ID={}; for(const k in EVOS)EVO_BY_ID[EVOS[k].id]=k;
/* ---- ascensions: one permanent ability mutation per operative, chosen at stage 3, kept for the run only ---- */
const ASCENSIONS={
  vanguard:[{id:'siege',      name:'Siege Mode',  desc:'Standing still for 0.5 s: +35% damage and half the spread'},
            {id:'warcry',     name:'Warcry',      desc:'Overdrive also cuts incoming damage by 30% and heals 15% of max health over its duration'}],
  ranger:  [{id:'ghost',      name:'Ghost Step',  desc:'Blink grants 1.2 s of invulnerability, finishes the reload and cools down 40% faster'},
            {id:'executioner',name:'Executioner', desc:'Headshots deal +50% and kill any non-Warden under 35% health outright'}],
  bulwark: [{id:'bastion',    name:'Bastion',     desc:'Barrier absorbs 100% of max health but slows you by 30% while it holds'},
            {id:'riot',       name:'Riot Charge', desc:'Raising Barrier knocks enemies within 4 m back and stuns them for 1.5 s'}]
};
