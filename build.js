// Ferrous Arena build: src/* -> arena.body.html (artifact source), ferrous-arena.html (standalone), test-local.html, docs/ (PWA)
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SRC=path.join(__dirname,'src'), SITE=path.join(__dirname,'site'), DOCS=path.join(__dirname,'docs');
const css=fs.readFileSync(path.join(SRC,'styles.css'),'utf8');
const markup=fs.readFileSync(path.join(SRC,'markup.html'),'utf8');
const js=fs.readdirSync(SRC).filter(f=>/^\d\d[a-z]?-.*\.js$/.test(f)).sort()
  .map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');

/* syntax-check the bundle BEFORE anything is written, so a broken edit never overwrites a good build */
try{ new Function(js); }catch(e){ console.error('SYNTAX ERROR in bundle:',e.message); process.exit(1); }

/* vendored three.js r128: copied into site/ so it deploys to docs/ same-origin (precached by the SW, no CDN at runtime) */
const THREE_SRC=path.join(__dirname,'node_modules','three','build','three.min.js');
const threeMin=fs.readFileSync(THREE_SRC,'utf8');
const threeSite=path.join(SITE,'three.min.js');
if(!fs.existsSync(threeSite)||fs.readFileSync(threeSite,'utf8')!==threeMin)fs.writeFileSync(threeSite,threeMin);
const THREE_CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';   // artifact only: it cannot load same-origin files and cdnjs is on its allowlist

const bodyWith=threeTag=>'<style>\n'+css+'</style>\n\n'+markup+'\n'+threeTag+'\n<script>\n(function(){\n"use strict";\n'+js+'})();\n</script>\n';
const artifactBody='<title>Ferrous Arena</title>\n'+bodyWith('<script src="'+THREE_CDN+'"></script>');   // the Artifact tool supplies doctype/head/body and reads <title> from the file
const standaloneBody=bodyWith('<script>\n'+threeMin+'\n</script>');                                   // one file, works from disk with no network
const siteBody=bodyWith('<script src="three.min.js"></script>');

const headTop='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Ferrous Arena</title>\n';
const head=headTop+'<meta name="viewport" content="width=device-width,initial-scale=1">\n'+
 '<style>html,body{margin:0;height:100%;background:#07090d;color-scheme:dark}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
const standalone=head+standaloneBody+'\n</body>\n</html>\n';

/* ---- docs/ : the GitHub Pages site (PWA) ---- */
const buildId=crypto.createHash('sha1').update(siteBody+threeMin.length).digest('hex').slice(0,10);
const pwaHead=headTop+'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'+
 '<meta name="theme-color" content="#07090d">\n'+
 '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'+
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Ferrous">\n'+
 '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" href="icon-192.png">\n'+
 '<style>html,body{margin:0;height:100%;background:#07090d;color-scheme:dark;overscroll-behavior:none}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
const swReg='<script>if("serviceWorker" in navigator){addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(e=>console.warn("service worker registration failed",e));});}</script>\n';

/* everything is validated above; now write */
fs.writeFileSync(path.join(__dirname,'arena.body.html'),artifactBody);
fs.writeFileSync(path.join(__dirname,'ferrous-arena.html'),standalone);
fs.writeFileSync(path.join(__dirname,'test-local.html'),standalone);
fs.mkdirSync(DOCS,{recursive:true});
fs.writeFileSync(path.join(DOCS,'index.html'),pwaHead+siteBody+swReg+'\n</body>\n</html>\n');
for(const f of fs.readdirSync(SITE)){
  let data=fs.readFileSync(path.join(SITE,f));
  if(f==='sw.js')data=Buffer.from(data.toString().replace('__BUILD__',buildId));
  fs.writeFileSync(path.join(DOCS,f),data);
}
fs.writeFileSync(path.join(DOCS,'.nojekyll'),'');
console.log('docs/ site built, sw version '+buildId);
console.log('built: '+siteBody.split('\n').length+' lines, bundle '+(siteBody.length/1024).toFixed(0)+' KB (standalone with three.js inlined '+(standalone.length/1024).toFixed(0)+' KB)');
