/* ============================ state ============================ */
const state={mode:'menu',running:false,over:false,wave:0,score:0,kills:0,spawnQueue:0,waveBreak:0,t:0,acc:{shots:0,hits:0},
             boss:null,best:save.get('best',0)|0,startDelay:0,shake:0,
             stage:1,mapId:'foundry',mods:{},mod:null,portalOpen:false,portal:null,seed:0,bestStage:save.get('bestStage',0)|0,
             scrap:0,offer:null,fab:null,waveT:0,forced:false,hitStop:0,impactFrames:0,cores:0,evoFired:{},ascFired:{}};
const rangeStats={hits:0,targets:0,dmgLog:[]};
const keys={};
let pointerLocked=false, spawnTimer=0, nearInteract=null;
