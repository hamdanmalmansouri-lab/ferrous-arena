/* ============================ data: characters ============================ */
const CHARS=[
  {id:'vanguard',name:'Vanguard',role:'Assault',color:0x2e6fd0,css:'#4ea8ff',
   desc:'Balanced rifleman. Steady full-auto rifle, reliable in every situation.',
   base:{hp:110,speed:6.2,sprint:9.4,dmg:17,fireT:0.098,mag:30,reloadT:1.15,pellets:1,spread:0.005,headMult:2.6,recoil:0.028},
   ability:{name:'Overdrive',short:'BOOST',cd:12,dur:4,desc:'+60% fire rate and +20% damage for 4s'}},
  {id:'ranger',name:'Ranger',role:'Marksman',color:0x2ec98a,css:'#3ddc84',
   desc:'Light frame, heavy marksman rifle. Rewards precision — headshots hit for 3×.',
   base:{hp:85,speed:7.0,sprint:10.4,dmg:46,fireT:0.40,mag:10,reloadT:1.5,pellets:1,spread:0.0015,headMult:3.0,recoil:0.07},
   ability:{name:'Blink',short:'BLINK',cd:6,dur:0,desc:'Teleport 8m in your movement direction, brief invulnerability'}},
  {id:'bulwark',name:'Bulwark',role:'Heavy',color:0xe07b2a,css:'#ff9e3d',
   desc:'Armored heavy with a scatter cannon. Slow, but nothing survives up close.',
   base:{hp:170,speed:5.2,sprint:7.8,dmg:9,fireT:0.62,mag:6,reloadT:1.9,pellets:8,spread:0.055,headMult:2.0,recoil:0.09},
   ability:{name:'Barrier',short:'SHIELD',cd:15,dur:5,desc:'Energy shield that absorbs 80 damage for 5s'}}
];
