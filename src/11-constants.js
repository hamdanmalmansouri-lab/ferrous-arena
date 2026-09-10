/* ============================ constants ============================ */
const PLAYER_R=0.42, EYE=1.62, GRAV=22, JUMP=7.6;
const REGEN_DELAY=5, REGEN_RATE=4;
const BOSS_EVERY=5;
const MELEE_TOKENS=3;             // chasers allowed in the attack state at once; the rest orbit
/* gameplay timers: ticked from update(dt) so they pause with the simulation (never setTimeout for gameplay) */
const timers=[];
function after(t,fn){ timers.push({t:t,fn:fn}); }
function tickTimers(dt){ for(let i=timers.length-1;i>=0;i--){ const tm=timers[i]; if(!tm)continue; tm.t-=dt; if(tm.t<=0){ timers.splice(i,1); tm.fn(); } } }
