/* ============================ quality tiers ============================ */
const TIERS={
  high:  {pr:2,   shadow:true, shadowSize:2048, soft:true,  fx:1,   fog:64, stars:420, aa:true},
  medium:{pr:1.5, shadow:true, shadowSize:1024, soft:false, fx:.7,  fog:56, stars:260, aa:true},
  low:   {pr:1,   shadow:false,shadowSize:512,  soft:false, fx:.45, fog:44, stars:120, aa:false}
};
const IS_COARSE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
function detectTier(){
  const cores=navigator.hardwareConcurrency||4, mem=navigator.deviceMemory||4;
  if(IS_COARSE)return (cores>=8&&mem>=6)?'medium':'low';
  return (cores>=8)?'high':'medium';
}
const Q={tier:null, auto:true, cfg:null, probe:{t:0,frames:0,done:false}};
(function(){ const o=save.get('quality','auto'); if(o!=='auto'&&TIERS[o]){Q.auto=false;Q.tier=o;} else Q.tier=detectTier(); Q.cfg=TIERS[Q.tier]; })();
