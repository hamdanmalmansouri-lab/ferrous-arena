// v3.0 Phase 1 gate: muzzle-origin fire (back to cover), i-frames + melee tokens, omni sprint, lifesteal clamp, CDR floor,
// barrier scaling, gameplay timers, hostiles readout, and the PWA loading with the network disabled.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(400);
  const clearField = () => page.evaluate(() => { const A = __ARENA__; A.enemies.slice().forEach(e => A.killEnemy(e)); A.pickups.splice(0).forEach(p => p.g.parent && p.g.parent.remove(p.g)); A.state.offer = null; A.state.over = false; A.state.running = true; });
  const simWait = async (secs) => { const t0 = await page.evaluate(() => __ARENA__.state.t); await page.waitForFunction(t => __ARENA__.state.t - t >= 0, t0 + secs, { timeout: 60000, polling: 100 }); };
  let r;

  // ---- 1. back to a low wall: the camera sits behind the cover, the crosshair ray clips its top, the shot must still hit the enemy in front ----
  await page.evaluate(() => { const A = __ARENA__; A.selectChar(0); A.forceStart('run'); A.state.startDelay = 999; A.state.spawnQueue = 0; });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { const A = __ARENA__, p = A.player;
    p.pos.set(17.5, 0, 0); p.yaw = Math.PI / 2; p.pitch = -0.12; p.orbit = 0; p.vel.set(0, 0, 0);   // facing -x, the 1.4 m Foundry wall at x=20 is behind
    const e = A.makeEnemy('chaser', 1); e.group.position.set(12, 0, -1.05); e.speed = 0; e.cd = 999; e.spawnT = 0; e.group.scale.setScalar(1);
    return { hp0: e.hp }; });
  await page.waitForTimeout(300);
  r.cam = await page.evaluate(() => __ARENA__.camera.position.toArray().map(v => +v.toFixed(2)));
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await simWait(1.0);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  Object.assign(r, await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; return { hp1: e ? +e.hp.toFixed(1) : -1, dead: !e, shots: A.state.acc.shots, hits: A.state.acc.hits }; }));
  if (!(r.dead || r.hp1 < r.hp0)) errors.push('BACK-TO-COVER shot did not reach the enemy: ' + JSON.stringify(r));
  console.log('back-to-cover shot:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-backwall.png' });

  // enemy behind the player (between the camera and the operative) must not eat a forward shot
  await clearField();
  r = await page.evaluate(() => { const A = __ARENA__, p = A.player; A.state.kills = 0;
    p.pos.set(10, 0, 10); p.yaw = 0; p.pitch = -0.02; p.orbit = 0; p.vel.set(0, 0, 0);   // x=10 lane: no Foundry cover between z=12 and z=3
    const back = A.makeEnemy('chaser', 1); back.group.position.set(11.05, 0, 12.4); back.speed = 0; back.cd = 999; back.spawnT = 0; back.group.scale.setScalar(1);   // 2.4 m behind, on the camera line
    const front = A.makeEnemy('chaser', 1); front.group.position.set(11.05, 0, 3); front.speed = 0; front.cd = 999; front.spawnT = 0; front.group.scale.setScalar(1);
    return { backHp: back.hp, frontHp: front.hp }; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await simWait(0.6);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  Object.assign(r, await page.evaluate(() => { const A = __ARENA__; const b = A.enemies.find(e => e.group.position.z > 11), f = A.enemies.find(e => e.group.position.z < 5); return { backHp1: b ? +b.hp.toFixed(1) : -1, frontHp1: f ? +f.hp.toFixed(1) : -1 }; }));
  if (r.backHp1 >= 0 && r.backHp1 < r.backHp - 0.01) errors.push('ENEMY BEHIND the player ate a forward shot: ' + JSON.stringify(r));
  if (!(r.frontHp1 < 0 || r.frontHp1 < r.frontHp - 0.01)) errors.push('ENEMY IN FRONT was not hit while one stood behind: ' + JSON.stringify(r));
  console.log('behind vs front:', JSON.stringify(r));

  // ---- 2. three Rushers in melee: a full-health Vanguard must survive more than 4 s; a 4th Rusher gets no token and orbits ----
  await clearField();
  r = await page.evaluate(() => { const A = __ARENA__, p = A.player;
    A.selectChar(0); A.player.hp = A.run.stats.maxHp; A.state.wave = 1; p.pos.set(0, 0, 10); p.vel.set(0, 0, 0);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const e = A.makeEnemy('chaser', 1); e.group.position.set(p.pos.x + Math.cos(a) * 1.5, 0, p.pos.z + Math.sin(a) * 1.5); e.spawnT = 0; e.group.scale.setScalar(1); e.cd = 0; }
    return { hp0: A.player.hp, t0: A.state.t }; });
  await simWait(4.0);
  Object.assign(r, await page.evaluate(() => { const A = __ARENA__; return { hp4s: +A.player.hp.toFixed(1), t: +(A.state.t).toFixed(2), tokens: A.enemies.filter(e => e.token).length, enemies: A.enemies.length, over: A.state.over,
    dists: A.enemies.map(e => +e.group.position.distanceTo(A.player.pos).toFixed(1)) }; }));
  if (r.hp4s <= 0 || r.over) errors.push('THREE RUSHERS chain-killed a full-health Vanguard inside 4 s: ' + JSON.stringify(r));
  if (r.tokens > 3) errors.push('MELEE TOKENS exceeded 3: ' + JSON.stringify(r));
  console.log('rusher gate:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-rushers.png' });
  await clearField(); await page.evaluate(() => { __ARENA__.player.hp = __ARENA__.run.stats.maxHp; });

  // ---- 3. omnidirectional sprint at 0.8x ----
  await page.evaluate(() => { const A = __ARENA__, p = A.player; p.pos.set(0, 0, 0); p.yaw = 0; p.vel.set(0, 0, 0); A.keys.shift = true; A.keys.a = true; });
  await simWait(1.2);
  r = await page.evaluate(() => { const A = __ARENA__; return { sprint: A.inp.sprint, speed: +Math.hypot(A.player.vel.x, A.player.vel.z).toFixed(2), want: +(A.run.stats.sprint * 0.8).toFixed(2), anim: A.avatarAnim().current }; });
  await page.evaluate(() => { __ARENA__.keys.shift = false; __ARENA__.keys.a = false; });
  if (!r.sprint || Math.abs(r.speed - r.want) > 0.6) errors.push('OMNI SPRINT speed wrong: ' + JSON.stringify(r));
  console.log('omni sprint:', JSON.stringify(r));

  // ---- 4. lifesteal overkill clamp, CDR floor, barrier scaling ----
  r = await page.evaluate(() => { const A = __ARENA__; A.run.items = { coil: 1, capacitor: 30 }; A.computeStats();
    const e = A.makeEnemy('chaser', 1); e.group.position.set(5, 0, -5); e.hp = 4; A.player.hp = 50;
    A.dealDamage(e, 200, e.group.position.clone().setY(1), false, false);
    const heal = +(A.player.hp - 50).toFixed(3); const cd = A.run.stats.cdMult;
    A.run.items = {}; A.computeStats(); A.selectChar(2); A.useAbility(); const shield = A.player.shield; A.selectChar(0);
    return { heal, cd, shield, maxHpBulwark: A.CHARS[2].base.hp }; });
  if (Math.abs(r.heal - 0.12) > 0.01) errors.push('LIFESTEAL counted overkill: ' + JSON.stringify(r));
  if (r.cd !== 0.45) errors.push('CDR floor missing: ' + JSON.stringify(r));
  if (Math.abs(r.shield - r.maxHpBulwark * 0.45) > 0.01) errors.push('BARRIER not 45% of max HP: ' + JSON.stringify(r));
  console.log('lifesteal / cdr / barrier:', JSON.stringify(r));

  // ---- 5. timers: dummy respawn goes through timers[], hostiles readout split ----
  await page.evaluate(() => { __ARENA__.goRange(); __ARENA__.state.running = true; });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { const A = __ARENA__; const d = A.enemies.find(e => e.type === 'dummy'); A.killEnemy(d); return { timers: A.timers.length, dummies: A.enemies.length }; });
  await simWait(2.5);
  r.after = await page.evaluate(() => ({ timers: __ARENA__.timers.length, dummies: __ARENA__.enemies.length }));
  if (r.timers < 1 || r.after.dummies !== 3) errors.push('TIMER dummy respawn failed: ' + JSON.stringify(r));
  r.hud = await page.evaluate(() => ({ left: document.getElementById('uiLeft').textContent, queue: document.getElementById('uiQueue').textContent }));
  console.log('timers + hud:', JSON.stringify(r));

  // ---- 6. PWA offline: serve docs/ over http, let the service worker precache, then reload with the network disabled ----
  const DOCS = path.resolve('docs');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
  const server = http.createServer((req, res) => { let f = path.join(DOCS, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith(path.sep) || f === DOCS) f = path.join(DOCS, 'index.html');
    fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data); }); });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port, url = 'http://127.0.0.1:' + port + '/';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errors.push('PWA PAGEERROR ' + e.message));
  await p2.goto(url);
  await p2.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 });
  await p2.waitForFunction(async () => { const reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.active) return false; const ks = await caches.keys(); if (!ks.length) return false; const c = await caches.open(ks[0]); return !!(await c.match('./three.min.js')) && !!(await c.match('./index.html')); }, null, { timeout: 30000 });
  r = await p2.evaluate(async () => ({ caches: await caches.keys(), swActive: !!(await navigator.serviceWorker.getRegistration()).active }));
  await ctx.setOffline(true);
  await p2.reload({ waitUntil: 'load' });
  await p2.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 });
  r.offline = await p2.evaluate(() => ({ three: !!window.THREE && THREE.REVISION, models: __ARENA__.MODELS.ok, menu: document.getElementById('card').textContent.includes('Enter Lobby') }));
  if (!r.offline.three || !r.offline.menu) errors.push('PWA did not boot offline: ' + JSON.stringify(r));
  console.log('pwa offline:', JSON.stringify(r));
  await ctx.close(); server.close();

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
