/* Chromium for the Playwright harnesses. Order: PW_CHROMIUM env var, the sandbox path, the newest headless shell already in
   Playwright's cache (its version pin often can't be downloaded here), else undefined (= Playwright's own pick). */
const fs=require('fs'),path=require('path'),os=require('os');
function chromiumPath(){
  if(process.env.PW_CHROMIUM)return process.env.PW_CHROMIUM;
  if(fs.existsSync('/opt/pw-browsers/chromium'))return '/opt/pw-browsers/chromium';
  const cache=process.env.PLAYWRIGHT_BROWSERS_PATH||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA||'','ms-playwright'):process.platform==='darwin'?path.join(os.homedir(),'Library','Caches','ms-playwright'):path.join(os.homedir(),'.cache','ms-playwright'));
  try{
    const dirs=fs.readdirSync(cache).filter(d=>/^chromium_headless_shell-\d+$/.test(d)).sort((a,b)=>+b.split('-')[1]-+a.split('-')[1]);
    for(const d of dirs){ const sub=fs.readdirSync(path.join(cache,d)).find(s=>s.startsWith('chrome-headless-shell'));
      if(!sub)continue; const exe=path.join(cache,d,sub,process.platform==='win32'?'chrome-headless-shell.exe':'chrome-headless-shell');
      if(fs.existsSync(exe))return exe; }
  }catch(e){}
  return undefined;
}
module.exports={chromiumPath:chromiumPath};
