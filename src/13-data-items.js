/* ============================ data: items ============================ */
const ITEMS=[
  {id:'syringe',  name:'Stim Syringe',     code:'SY',color:'#4ea8ff',desc:'+12% fire rate'},
  {id:'plating',  name:'Hardened Plating', code:'HP',color:'#3ddc84',desc:'+20 max health'},
  {id:'servo',    name:'Servo Legs',       code:'SV',color:'#8fd3ff',desc:'+10% move speed'},
  {id:'lens',     name:'Focus Lens',       code:'FL',color:'#ffd166',desc:'+10% crit chance (2× dmg)'},
  {id:'rounds',   name:'Tungsten Rounds',  code:'TR',color:'#ff9e3d',desc:'+10% damage'},
  {id:'extmag',   name:'Extended Mag',     code:'XM',color:'#c9a0ff',desc:'+25% magazine size'},
  {id:'loader',   name:'Quick Loader',     code:'QL',color:'#ffc247',desc:'-15% reload time'},
  {id:'regen',    name:'Regen Module',     code:'RG',color:'#7ef0a8',desc:'+1.2 HP/s regeneration'},
  {id:'capacitor',name:'Ability Capacitor',code:'AC',color:'#6fe3ff',desc:'-12% ability cooldown'},
  {id:'coil',     name:'Vampiric Coil',    code:'VC',color:'#ff6a8a',desc:'+3% lifesteal'}
];
const ITEM_BY_ID={}; ITEMS.forEach(it=>ITEM_BY_ID[it.id]=it);
