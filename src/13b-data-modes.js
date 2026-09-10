/* ============================ data: game modes ============================ */
/* Meltdown Protocol: no waves. A Director spends credits on cards while a reactor charges over 11 minutes; Wardens at 25 / 55 / 85 %;
   each drops a Core Shard (bank it at a terminal or hold it for risk + reward); at 100 % an extraction pad opens for 90 s. */
const MELTDOWN={
  duration:660, extractWindow:90, aliveCap:16, dumpCadence:0.15, cadence:0.4,
  cards:{chaser:12,shooter:20,elite:55,boss:240},
  wardenAt:[0.25,0.55,0.85],
  shardHoldCap:5, shardDrop:0.20, shardEnemyDmg:0.12,
  creditRate:m=>8+1.6*m   // credits per second at m elapsed minutes
};
/* Trials: six fixed 60-90 s challenges on the existing maps with a restricted loadout (fixed operative where given, no items, no drops).
   Completing one earns a Trial Mark (persisted in fa2.trials) - the unlock currency for the later roster. */
const TRIALS=[
  {id:'sprint',    name:'Foundry Sprint',    map:'foundry',char:'vanguard',time:60,goal:{kind:'kills',n:20},      rate:26,types:{chaser:1},          desc:'Vanguard, rifle only: drop 20 Rushers in 60 s'},
  {id:'marksman',  name:'Relay Marksman',    map:'relay',  char:'ranger',  time:75,goal:{kind:'headshots',n:10},  rate:18,types:{chaser:.5,shooter:.5},desc:'Ranger: 10 headshot kills in 75 s'},
  {id:'holdout',   name:'Frost Holdout',     map:'frost',  char:'bulwark', time:90,goal:{kind:'survive'},         rate:22,types:{chaser:.7,shooter:.3},desc:'Bulwark: survive 90 s of constant pressure'},
  {id:'pulse',     name:'Reactor Dodge',     map:'reactor',char:null,      time:60,goal:{kind:'pulses',n:3},      rate:6, types:{chaser:1},pulsePeriod:15,desc:'Jump three shockwaves without being caught, in 60 s'},
  {id:'demolition',name:'Foundry Demolition',map:'foundry',char:null,      time:60,goal:{kind:'barrelKills',n:12},rate:28,types:{chaser:1},          desc:'Kill 12 enemies with barrel explosions in 60 s'},
  {id:'highground',name:'Relay High Ground', map:'relay',  char:null,      time:75,goal:{kind:'highKills',n:15},  rate:22,types:{chaser:.8,shooter:.2},desc:'Kill 15 enemies while standing on a platform top, in 75 s'}
];
const TRIAL_BY_ID={}; TRIALS.forEach(t=>TRIAL_BY_ID[t.id]=t);
/* score code: one shared encoder for Meltdown scores and (later) Daily runs. base32 without I/L/O/U, 2-digit checksum, groups of 5. */
const SC_ALPHA='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function scEnc(v,digits){ let t=''; v=Math.max(0,Math.floor(v)); for(let i=0;i<digits;i++){ t=SC_ALPHA[v%32]+t; v=Math.floor(v/32); } return t; }
function scChk(body){ let c=0; for(let i=0;i<body.length;i++)c=(c*31+body.charCodeAt(i))%1024; return c; }
function encodeScoreCode(o){   // {mode:0-15, char:0-15, seed:<2^30, score:<2^30, detail:<2^20}
  const body=scEnc(((o.mode&15)<<4)|(o.char&15),2)+scEnc(o.seed>>>0,6)+scEnc(Math.min(1073741823,o.score),6)+scEnc(Math.min(1048575,o.detail||0),4);
  return (body+scEnc(scChk(body),2)).replace(/(.{5})(?=.)/g,'$1-');
}
function decodeScoreCode(code){
  const s=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/I/g,'1').replace(/L/g,'1').replace(/O/g,'0').replace(/U/g,'V');
  if(s.length!==20)return null; const body=s.slice(0,18); const dec=(str)=>{ let v=0; for(const ch of str){ const k=SC_ALPHA.indexOf(ch); if(k<0)return -1; v=v*32+k; } return v; };
  if(dec(s.slice(18))!==scChk(body))return null; const mc=dec(body.slice(0,2)); if(mc<0)return null;
  return {mode:mc>>4,char:mc&15,seed:dec(body.slice(2,8)),score:dec(body.slice(8,14)),detail:dec(body.slice(14,18))};
}
const MODE_IDS={endless:0,meltdown:1,trial:2,daily:3};
