/* ============================ audio ============================ */
let AC=null, master=null;
function audio(){ if(!AC){ try{AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=(typeof SETTINGS!=='undefined')?SETTINGS.volume:0.9; master.connect(AC.destination);}catch(e){} }
  if(AC&&AC.state==='suspended')AC.resume(); return AC; }
function blip(o){
  const ac=audio(); if(!ac)return;
  const t=ac.currentTime, g=ac.createGain(), osc=ac.createOscillator();
  osc.type=o.type||'sine'; osc.frequency.setValueAtTime(o.f0,t);
  if(o.f1)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f1),t+o.d);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(o.v||.2,t+0.006);
  g.gain.exponentialRampToValueAtTime(0.0001,t+o.d);
  osc.connect(g); g.connect(master); osc.start(t); osc.stop(t+o.d+.02);
}
let noiseBuf=null;
function noise(dur,vol,freq,q){
  const ac=audio(); if(!ac)return;
  if(!noiseBuf){ noiseBuf=ac.createBuffer(1,ac.sampleRate*0.5,ac.sampleRate);
    const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
  const t=ac.currentTime,src=ac.createBufferSource(); src.buffer=noiseBuf;
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq||900; bp.Q.value=q||1;
  const g=ac.createGain();
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t+dur+.02);
}
const SFX={
  shot(){ noise(.13,.28,1500,.7); blip({type:'square',f0:180,f1:50,d:.11,v:.22}); },
  shotHeavy(){ noise(.22,.4,700,.6); blip({type:'sawtooth',f0:120,f1:35,d:.24,v:.3}); },
  shotSnipe(){ noise(.18,.34,2400,.9); blip({type:'square',f0:320,f1:60,d:.2,v:.26}); },
  hit(){ blip({type:'square',f0:1400,f1:900,d:.05,v:.14}); },
  head(){ blip({type:'square',f0:2200,f1:1200,d:.07,v:.18}); },
  crit(){ blip({type:'triangle',f0:1800,f1:2600,d:.09,v:.16}); },
  kill(){ noise(.3,.3,320,.6); blip({type:'sawtooth',f0:220,f1:40,d:.32,v:.2}); },
  bossKill(){ noise(.9,.5,180,.5); blip({type:'sawtooth',f0:160,f1:30,d:1.1,v:.3}); after(0.3,()=>blip({type:'sine',f0:520,f1:1040,d:.5,v:.2})); },
  hurt(){ noise(.2,.32,260,.8); blip({type:'sine',f0:150,f1:70,d:.2,v:.24}); },
  reload(){ blip({type:'square',f0:420,f1:300,d:.07,v:.12}); after(0.82,()=>blip({type:'square',f0:620,f1:800,d:.08,v:.12})); },
  empty(){ blip({type:'square',f0:200,f1:150,d:.04,v:.1}); },
  wave(){ blip({type:'sawtooth',f0:120,f1:340,d:.5,v:.16}); },
  boss(){ blip({type:'sawtooth',f0:70,f1:180,d:1.2,v:.3}); after(0.4,()=>noise(.6,.4,200,.4)); },
  pick(){ blip({type:'sine',f0:660,f1:1320,d:.16,v:.16}); },
  item(){ blip({type:'sine',f0:520,f1:1040,d:.18,v:.18}); after(0.12,()=>blip({type:'sine',f0:780,f1:1560,d:.22,v:.16})); },
  ability(){ blip({type:'triangle',f0:300,f1:900,d:.3,v:.2}); noise(.25,.2,1200,.8); },
  blink(){ noise(.15,.3,3000,.5); blip({type:'sine',f0:900,f1:300,d:.18,v:.2}); },
  ui(){ blip({type:'sine',f0:500,f1:700,d:.07,v:.1}); },
  portal(){ blip({type:'sine',f0:200,f1:800,d:.6,v:.18}); noise(.5,.2,600,.6); },
  over(){ blip({type:'sawtooth',f0:300,f1:45,d:1.1,v:.24}); }
};
