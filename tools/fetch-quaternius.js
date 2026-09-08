/* Downloads the Quaternius CC0 packs that tools/pack-quaternius.js reads into ./Assets (git-ignored, ~310 MB).
   node tools/fetch-quaternius.js [Assets dir]
   Four packs are public Google Drive folders (walked through the embedded folder view; only the glTF subfolders the packer
   needs are fetched); the Sci-Fi Essentials Kit and the Universal Animation Library are free itch.io downloads
   (the "No thanks, just take me to the downloads" flow: download_url -> download page -> file/<upload id> -> signed URL).
   Needs Node 18+ (fetch) and PowerShell (Expand-Archive) on Windows or `unzip` elsewhere. Re-runnable: existing files are kept. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'..','Assets'));
const DRIVE=[   /* [root folder id, path inside it, destination under Assets] */
  ['1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX',['Individual Characters','glTF'],'Modular male/Individual Characters/glTF'],            // Ultimate Modular Men
  ['1720N9IGyQHXYvtvZJzazhxtTTlz-y2Vf',['Individual Characters','glTF'],'modular females/Individual Characters/glTF'],         // Ultimate Modular Women
  ['1P5j8xZyIEmZGHjGYmIgYCev9SVmB-IHC',['Guns','glTF'],'sci-fi guns/Guns/glTF'],                                                // Sci-Fi Modular Gun Pack
  ['1sueV_4CGMpZC8y30mWfgKK9UaT3mkHBX',['Flat Colors','glTF'],'drive-download-20260907T112124Z-1-001/Flat Colors/glTF']];    // Animated Mech Pack
const ITCH=[   /* [game slug, upload name suffix, folder the zip extracts to (checked to skip), destination folder] */
  ['sci-fi-essentials-kit','[Standard].zip','glTF','Sci-Fi Essentials Kit[Standard]'],
  ['universal-animation-library','[Standard].zip','Universal Animation Library[Standard]','Universal Animation Library[Standard]']];
const UA={'User-Agent':'Mozilla/5.0 ferrous-arena asset fetch'};
async function text(u,o){ const r=await fetch(u,Object.assign({headers:UA},o)); if(!r.ok)throw new Error(r.status+' '+u); return r.text(); }
async function save(u,dest,o){ const r=await fetch(u,Object.assign({headers:UA},o)); if(!r.ok)throw new Error(r.status+' '+u);
  fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,Buffer.from(await r.arrayBuffer())); return fs.statSync(dest).size; }
/* ---- Google Drive ---- */
async function list(id){ const h=await text('https://drive.google.com/embeddedfolderview?id='+id+'#list'); const out=[];
  const re=/<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?flip-entry-title">([^<]+)/g; let m;
  while((m=re.exec(h)))out.push({id:m[1],name:m[3].replace(/&amp;/g,'&'),folder:/\/folders\//.test(m[2])}); return out; }
async function walk(id,dest){ for(const e of await list(id)){ const p=path.join(dest,e.name);
  if(e.folder){ await walk(e.id,p); continue; } if(fs.existsSync(p)&&fs.statSync(p).size>0)continue;
  const sz=await save('https://drive.usercontent.google.com/download?id='+e.id+'&export=download&confirm=t',p);
  if(sz<4000&&/<html/i.test(fs.readFileSync(p,'utf8')))throw new Error('Drive returned a page instead of '+e.name); console.log('  ',e.name,(sz/1024).toFixed(0)+'KB'); } }
/* ---- itch.io ---- */
async function itch(slug,suffix,dest){
  const jar={}; const cookie=()=>Object.entries(jar).map(([k,v])=>k+'='+v).join('; ');
  const grab=r=>{ for(const c of (r.headers.getSetCookie?r.headers.getSetCookie():[]))jar[c.split('=')[0]]=c.split(';')[0].split('=').slice(1).join('='); };
  const req=async(u,o)=>{ const r=await fetch(u,Object.assign({headers:Object.assign({Cookie:cookie()},UA,o&&o.headers||{})},o||{})); grab(r); return r; };
  const page=await(await req('https://quaternius.itch.io/'+slug+'/purchase')).text(); const csrf=(page.match(/csrf_token" value="([^"]+)"/)||[])[1];
  const form=new URLSearchParams({csrf_token:csrf});
  const {url}=await(await req('https://quaternius.itch.io/'+slug+'/download_url',{method:'POST',body:form})).json();
  const dl=(await(await req(url)).text()).replace(/\n/g,' ');
  const uid=(dl.match(new RegExp('data-upload_id="(\d+)"[^§]{0,900}?'+suffix.replace(/[\[\]().]/g,'\$&')))||[])[1]; if(!uid)throw new Error('no upload '+suffix+' on '+slug);
  const f=await(await req('https://quaternius.itch.io/'+slug+'/file/'+uid+'?source=game_download&as_props=1',{method:'POST',body:form,headers:{Referer:url,'X-Requested-With':'XMLHttpRequest'}})).json();
  if(!f.url)throw new Error('itch: '+JSON.stringify(f)); const zip=dest+'.zip'; const sz=await save(f.url,zip); console.log('  ',path.basename(zip),(sz/1048576).toFixed(0)+'MB');
  return zip; }
function unzip(zip,dest){ fs.mkdirSync(dest,{recursive:true});
  if(process.platform==='win32')execFileSync('powershell',['-NoProfile','-Command','Expand-Archive -Path "'+zip+'" -DestinationPath "'+dest+'" -Force'],{stdio:'inherit'});
  else execFileSync('unzip',['-qo',zip,'-d',dest],{stdio:'inherit'}); fs.unlinkSync(zip); }
(async()=>{
  for(const [root,sub,dest] of DRIVE){ let id=root;
    for(const nm of sub){ const e=(await list(id)).find(x=>x.folder&&x.name===nm); if(!e)throw new Error('folder '+nm+' missing under '+id); id=e.id; }
    console.log('==',dest); await walk(id,path.join(ROOT,dest)); }
  for(const [slug,suffix,inner,dest] of ITCH){ const out=path.join(ROOT,dest); if(fs.existsSync(path.join(out,inner))){ console.log('==',dest,'(present)'); continue; }
    console.log('==',dest); const zip=await itch(slug,suffix,path.join(ROOT,dest)); const tmp=path.join(ROOT,'_'+slug); unzip(zip,tmp);
    /* the UAL zip wraps its content in a same-named folder; the kit zip is flat */
    const wrapped=path.join(tmp,path.basename(dest)); fs.renameSync(fs.existsSync(wrapped)?wrapped:tmp,out); if(fs.existsSync(tmp))fs.rmSync(tmp,{recursive:true,force:true}); }
  console.log('done ->',ROOT);
})().catch(e=>{ console.error(e.message||e); process.exit(1); });
