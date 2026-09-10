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
