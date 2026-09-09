// Ferrous Arena BETA build: src/* -> docs/beta/ (GitHub Pages subfolder)
// Same bundle as build.js, with one swap applied at build time so src/ stays untouched
// and the live build at docs/index.html is unaffected.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'src');
const css=fs.readFileSync(path.join(SRC,'styles.css'),'utf8');
const markup=fs.readFileSync(path.join(SRC,'markup.html'),'utf8');
let js=fs.readdirSync(SRC).filter(f=>/^\d\d[a-z]?-.*\.js$/.test(f)).sort()
  .map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');

/* ---- beta-only swaps ------------------------------------------------------ */
// Re-add entries here to ship a character swap in the beta build only, e.g.
//   ["bulwark:'human_space'", "bulwark:'custom_bulwark'"]
// Requires the matching PICK entry in tools/pack-quaternius.js.
const SWAPS=[];
for(const [from,to] of SWAPS){
  if(!js.includes(from)){ console.error('BETA SWAP NOT FOUND: '+from); process.exit(1); }
  js=js.split(from).join(to);
  console.log('beta swap: '+from+'  ->  '+to);
}

const THREE_CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const body='<title>Ferrous Arena (beta)</title>\n<style>\n'+css+'</style>\n\n'+markup+
  '\n<script src="'+THREE_CDN+'"></script>\n<script>\n(function(){\n"use strict";\n'+js+'})();\n</script>\n';

try{ new Function(js); }catch(e){ console.error('SYNTAX ERROR in beta bundle:',e.message); process.exit(1); }

const buildId=crypto.createHash('sha1').update(body).digest('hex').slice(0,10);
const BETA=path.join(ROOT,'docs','beta'); fs.mkdirSync(BETA,{recursive:true});
const pwaHead='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'+
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'+
 '<meta name="theme-color" content="#07090d">\n'+
 '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'+
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'+
 '<meta name="apple-mobile-web-app-title" content="Ferrous beta">\n'+
 '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'+
 '<link rel="icon" href="icon-192.png">\n'+
 '<style>html,body{margin:0;height:100%;background:#07090d;color-scheme:dark;overscroll-behavior:none}'+
 'img{max-width:100%}[hidden]{display:none!important}'+
 '#betaTag{position:fixed;left:8px;top:8px;z-index:99999;font:600 11px/1 system-ui,sans-serif;'+
 'letter-spacing:.12em;color:#ff9e3d;background:rgba(7,9,13,.72);border:1px solid #ff9e3d55;'+
 'padding:5px 8px;border-radius:4px;pointer-events:none}</style>\n</head>\n<body>\n'+
 '<div id="betaTag">BETA '+buildId+'</div>\n';
const swReg='<script>if("serviceWorker" in navigator){addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{});});}</script>\n';
fs.writeFileSync(path.join(BETA,'index.html'),pwaHead+body+swReg+'\n</body>\n</html>\n');

const SITE=path.join(ROOT,'site');
for(const f of fs.readdirSync(SITE)){
  let data=fs.readFileSync(path.join(SITE,f));
  if(f==='sw.js')data=Buffer.from(data.toString().replace('__BUILD__','beta-'+buildId));
  if(f==='manifest.webmanifest'){
    try{
      const m=JSON.parse(data.toString());
      m.name=(m.name||'Ferrous Arena')+' (beta)'; m.short_name='Ferrous beta';
      m.start_url='./'; m.scope='./';
      data=Buffer.from(JSON.stringify(m,null,2));
    }catch(e){ console.warn('manifest not JSON, copied as-is'); }
  }
  fs.writeFileSync(path.join(BETA,f),data);
}
console.log('docs/beta/ built, sw version beta-'+buildId);
console.log('bundle: '+body.split('\n').length+' lines, '+(body.length/1024).toFixed(0)+' KB');
if(body.length>8*1024*1024) console.warn('WARNING: bundle over 8 MB');
