// Ferrous Arena build: src/* -> arena.body.html (artifact source), ferrous-arena.html (standalone), test-local.html
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'src');
const css=fs.readFileSync(path.join(SRC,'styles.css'),'utf8');
const markup=fs.readFileSync(path.join(SRC,'markup.html'),'utf8');
const js=fs.readdirSync(SRC).filter(f=>/^\d\d[a-z]?-.*\.js$/.test(f)).sort()
  .map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
const THREE_CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const body='<title>Ferrous Arena</title>\n<style>\n'+css+'</style>\n\n'+markup+'\n<script src="'+THREE_CDN+'"></script>\n<script>\n(function(){\n"use strict";\n'+js+'})();\n</script>\n';
fs.writeFileSync(path.join(__dirname,'arena.body.html'),body);
const head='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'+
 '<style>html,body{margin:0;height:100%;background:#07090d;color-scheme:dark}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
const out=head+body+'\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname,'ferrous-arena.html'),out);
fs.writeFileSync(path.join(__dirname,'test-local.html'),out.replace(THREE_CDN,'./node_modules/three/build/three.min.js'));

/* ---- docs/ : the GitHub Pages site (PWA) ---- */
const crypto=require('crypto');
const buildId=crypto.createHash('sha1').update(body).digest('hex').slice(0,10);
const DOCS=path.join(__dirname,'docs'); fs.mkdirSync(DOCS,{recursive:true});
const pwaHead='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'+
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'+
 '<meta name="theme-color" content="#07090d">\n'+
 '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'+
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Ferrous">\n'+
 '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" href="icon-192.png">\n'+
 '<style>html,body{margin:0;height:100%;background:#07090d;color-scheme:dark;overscroll-behavior:none}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
const swReg='<script>if("serviceWorker" in navigator){addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{});});}</script>\n';
fs.writeFileSync(path.join(DOCS,'index.html'),pwaHead+body+swReg+'\n</body>\n</html>\n');
const SITE=path.join(__dirname,'site');
for(const f of fs.readdirSync(SITE)){
  let data=fs.readFileSync(path.join(SITE,f));
  if(f==='sw.js')data=Buffer.from(data.toString().replace('__BUILD__',buildId));
  fs.writeFileSync(path.join(DOCS,f),data);
}
fs.writeFileSync(path.join(DOCS,'.nojekyll'),'');
console.log('docs/ site built, sw version '+buildId);
try{ new Function(js); }catch(e){ console.error('SYNTAX ERROR in bundle:',e.message); process.exit(1); }
console.log('built: '+body.split('\n').length+' lines, '+(body.length/1024).toFixed(0)+' KB');
