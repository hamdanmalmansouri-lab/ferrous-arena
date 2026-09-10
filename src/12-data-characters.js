/* ============================ data: characters ============================ */
/* weapon: rifle (full auto) | marksman | scatter | smg | flame (12 m falloff, applies Burn) | carbine (semi-auto). passive: see dealDamage / hurtPlayer.
   unlock: {kind:'always'|'wave'|'stage'|'wardens'|'extract', n, marks} — marks = Trial Marks that unlock it instead. */
const CHARS=[
  {id:'vanguard',name:'Vanguard',role:'Assault',color:0x2e6fd0,css:'#4ea8ff',weapon:'rifle',
   desc:'Balanced rifleman. Steady full-auto rifle, reliable in every situation.',
   base:{hp:110,speed:6.2,sprint:9.4,dmg:14,fireT:0.098,mag:30,reloadT:1.15,pellets:1,spread:0.005,headMult:2.6,recoil:0.028},
   ability:{name:'Overdrive',short:'BOOST',cd:12,dur:4,desc:'+60% fire rate and +20% damage for 4s'},
   unlock:{kind:'always',label:'Available from the start'}},
  {id:'ranger',name:'Ranger',role:'Marksman',color:0x2ec98a,css:'#3ddc84',weapon:'marksman',
   desc:'Light frame, heavy marksman rifle. Rewards precision — headshots hit for 3× and Mark the target.',
   base:{hp:85,speed:7.0,sprint:10.4,dmg:50,fireT:0.40,mag:10,reloadT:1.5,pellets:1,spread:0.0015,headMult:3.0,recoil:0.07},
   ability:{name:'Blink',short:'BLINK',cd:6,dur:0,desc:'Teleport 8m in your movement direction, brief invulnerability'},
   passive:{name:'Mark',desc:'Headshots mark the target for 4 s; marked enemies take +25% from every source'},
   unlock:{kind:'wave',n:5,marks:1,label:'Reach wave 5 (or 1 Trial Mark)'}},
  {id:'bulwark',name:'Bulwark',role:'Heavy',color:0xe07b2a,css:'#ff9e3d',weapon:'scatter',
   desc:'Armored heavy with a scatter cannon. Slow, but nothing survives up close.',
   base:{hp:170,speed:5.2,sprint:7.8,dmg:10,fireT:0.62,mag:6,reloadT:1.9,pellets:8,spread:0.055,headMult:2.0,recoil:0.09},
   ability:{name:'Barrier',short:'SHIELD',cd:15,dur:5,desc:'Energy shield that absorbs 45% of max health for 5s'},
   passive:{name:'Braced',desc:'25% damage reduction while grounded and firing'},
   unlock:{kind:'wave',n:10,marks:2,label:'Reach wave 10 (or 2 Trial Marks)'}},
  {id:'sable',name:'Sable',role:'Saboteur',color:0x8a5cff,css:'#b48cff',weapon:'smg',
   desc:'Fast and low. A quiet SMG and a snare puck that drags a crowd into one place.',
   base:{hp:95,speed:6.8,sprint:10.0,dmg:9,fireT:0.065,mag:40,reloadT:1.35,pellets:1,spread:0.012,headMult:2.2,recoil:0.02},
   ability:{name:'Snare Charge',short:'SNARE',cd:8,dur:0,desc:'Throw a puck; it arms in 0.4s, then pulls enemies within 5m and slows them 60% for 2.5s'},
   unlock:{kind:'stage',n:4,marks:3,label:'Clear stage 3 (or 3 Trial Marks)'}},
  {id:'ember',name:'Ember',role:'Incendiary',color:0xff5a2a,css:'#ff7a3d',weapon:'flame',
   desc:'A flame projector with a 12m reach. Everything it touches burns; Backdraft sets the fire off.',
   base:{hp:120,speed:5.9,sprint:8.8,dmg:6.5,fireT:0.045,mag:90,reloadT:2.2,pellets:1,spread:0.03,headMult:1.0,recoil:0.01},
   ability:{name:'Backdraft',short:'FLARE',cd:14,dur:0,desc:'Ignite a cone in front of you; every burn in it detonates for 40% of remaining health'},
   unlock:{kind:'wardens',n:3,marks:4,label:'Destroy three Wardens in one run (or 4 Trial Marks)'}},
  {id:'arclight',name:'Arclight',role:'Technician',color:0x2ad4ff,css:'#6fe3ff',weapon:'carbine',
   desc:'A precise semi-auto carbine and a sentry drone that holds a lane for 20s.',
   base:{hp:100,speed:6.4,sprint:9.2,dmg:28,fireT:0.22,mag:18,reloadT:1.6,pellets:1,spread:0.004,headMult:2.4,recoil:0.04},
   ability:{name:'Deploy Sentry',short:'SENTRY',cd:20,dur:20,desc:'A sentry drone (20s, one at a time) fires at the nearest target for 14 dps'},
   unlock:{kind:'extract',n:1,marks:6,label:'Extract from Meltdown once (or 6 Trial Marks)'}}
];
const CHAR_BY_ID={}; CHARS.forEach(c=>CHAR_BY_ID[c.id]=c);
function unlocked(ch){
  const u=ch.unlock; if(!u||u.kind==='always')return true;
  if(u.marks&&trialMarks()>=u.marks)return true;
  if(u.kind==='wave')return (save.get('best',0)|0)>=u.n;
  if(u.kind==='stage')return (save.get('bestStage',0)|0)>=u.n;
  if(u.kind==='wardens')return (save.get('wardensRun',0)|0)>=u.n;
  if(u.kind==='extract')return Object.keys(save.get('meltdownBest',{})).length>0;
  return false;
}
