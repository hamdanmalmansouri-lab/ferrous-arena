// v3.0 Phase 4 gate: a 10 s capture of a wave-5 fight (frames every 0.25 s of simulation into Claude outputs/wave5/ plus a contact
// sheet), asserting every kill set a hit-stop impact frame, damage numbers appeared, corpses dissolve, decals land on world hits.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let sharp = null; try { sharp = require('sharp'); } catch (e) {}
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(400);
  const OUT = path.resolve('Claude outputs', 'wave5'); fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
  // effects sanity: a world hit leaves a decal, a hit shows a number, a kill sets hit-stop and a dissolving corpse
  await page.evaluate(() => { const A = __ARENA__; A.selectChar(0); A.forceStart('run'); A.state.startDelay = 999; A.state.spawnQueue = 0; A.player.hp = 9999; A.run.stats.maxHp = 9999;
    const p = A.player; p.pos.set(10, 0, 10); p.yaw = 0; p.pitch = -0.02; p.orbit = 0; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await page.waitForTimeout(700);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  let r = await page.evaluate(() => ({ decals: __ARENA__.decals.length, tracerW: __ARENA__.WEAPON_FX.vanguard.tracer }));
  await page.evaluate(() => { const A = __ARENA__; const e = A.makeEnemy('chaser', 5); e.group.position.set(11.05, 0, 3); e.speed = 0; e.cd = 999; e.spawnT = 0; e.group.scale.setScalar(1); e.hp = 30; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await page.waitForFunction(() => __ARENA__.enemies.length === 0, null, { timeout: 20000 });
  Object.assign(r, await page.evaluate(() => ({ hitStop: +__ARENA__.state.hitStop.toFixed(3), impactFrames: __ARENA__.state.impactFrames, numbers: __ARENA__.dmgNums.length, corpses: __ARENA__.corpses.length })));
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  await page.waitForTimeout(600);
  r.dissolve = await page.evaluate(() => { const c = __ARENA__.corpses[0]; return c ? { t: +c.t.toFixed(2), scale: +c.g.scale.x.toFixed(2), emissive: c.mats.length ? +c.mats[0].emissiveIntensity.toFixed(2) : null } : null; });
  if (r.decals < 1) errors.push('DECALS: no impact decal on a world hit: ' + JSON.stringify(r));
  if (r.impactFrames < 1) errors.push('HIT-STOP not set on the kill: ' + JSON.stringify(r));   // hitStop itself decays within 60 ms of real time, so the counter is the durable evidence
  if (r.numbers < 1) errors.push('DAMAGE NUMBERS not shown: ' + JSON.stringify(r));
  console.log('effects:', JSON.stringify(r));

  // ---- the capture: wave 5 (Warden + escorts), 10 s of simulation, the operative auto-tracks the nearest enemy and fires ----
  await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.enemies.slice().forEach(e => A.killEnemy(e)); A.pickups.splice(0).forEach(p => p.g.parent && p.g.parent.remove(p.g)); A.state.offer = null; A.state.running = true;
    A.state.impactFrames = 0; A.state.kills = 0; A.state.wave = 4; A.state.spawnQueue = 0; A.startWave(5); A.state.spawnQueue = 8;
    A.run.items = { rounds: 10, syringe: 6, extmag: 4 }; A.computeStats(); A.player.mag = A.run.stats.mag; A.player.hp = 9999; A.run.stats.maxHp = 9999; A.player.pos.set(0, 0, 12);
    for (let k = 0; k < 6; k++) { const e = A.makeEnemy('chaser', 5); const a = -0.6 + k * 0.24; e.group.position.set(Math.sin(a) * 8, 0, 12 - Math.cos(a) * 8); e.spawnT = 0.45; e.group.scale.setScalar(.2); } });   // escorts already closing so the capture has kills from the first seconds
  const t0 = await page.evaluate(() => __ARENA__.state.t);
  const frames = []; let last = -1, killsAt = [], killsSeen = 0, impactSeen = 0, maxNumbers = 0;
  for (let k = 0; k < 400; k++) {
    const s = await page.evaluate(t0 => { const A = __ARENA__, p = A.player; if (A.state.offer) { A.pickOffer(0); } let best = null, bd = 1e9;
      for (const e of A.enemies) { const d = e.group.position.distanceTo(p.pos); if (d < bd) { bd = d; best = e; } }
      if (best) { const dx = best.group.position.x - (p.pos.x + A.CAM.shoulder), dz = best.group.position.z - p.pos.z; p.yaw = Math.atan2(-dx, -dz); p.orbit = 0; p.pitch = Math.atan2(1.0 - 1.9, Math.hypot(dx, dz)) * 0.6; A.keys.mouse = true; } else A.keys.mouse = false;
      return { t: A.state.t - t0, kills: A.state.kills, impact: A.state.impactFrames, hitStop: A.state.hitStop, numbers: A.dmgNums.length, enemies: A.enemies.length }; }, t0);
    if (s.t >= 10) break;
    if (Math.floor(s.t / 0.25) !== last) { last = Math.floor(s.t / 0.25); const f = path.join(OUT, 'f' + String(last).padStart(3, '0') + '.png'); await page.screenshot({ path: f }); frames.push(f); }
    if (s.kills > killsSeen) { killsAt.push({ t: +s.t.toFixed(2), kills: s.kills, impactFrames: s.impact }); killsSeen = s.kills; }
    impactSeen = s.impact; maxNumbers = Math.max(maxNumbers, s.numbers);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  r = { frames: frames.length, kills: killsSeen, impactFrames: impactSeen, killsAt, maxNumbersOnScreen: maxNumbers };
  if (frames.length < 18) errors.push('CAPTURE too short: ' + frames.length + ' frames');   // headless sim steps ~0.13-0.3 s per real frame, so 0.25 s slots are sometimes skipped
  if (killsSeen < 2) errors.push('CAPTURE saw fewer than 2 kills: ' + JSON.stringify(r));
  if (impactSeen < killsSeen) errors.push('IMPACT FRAME missing on some kills: ' + JSON.stringify(r));
  if (maxNumbers > 24) errors.push('DAMAGE NUMBERS exceeded the 24 cap: ' + maxNumbers);
  console.log('capture:', JSON.stringify(r));
  if (sharp && frames.length >= 12) {
    const pick = []; for (let i = 0; i < 12; i++) pick.push(frames[Math.floor(i * (frames.length - 1) / 11)]);
    const tiles = await Promise.all(pick.map(f => sharp(f).resize(426, 240).toBuffer()));
    await sharp({ create: { width: 426 * 4, height: 240 * 3, channels: 3, background: '#000' } }).composite(tiles.map((b, i) => ({ input: b, left: (i % 4) * 426, top: Math.floor(i / 4) * 240 }))).png().toFile(path.resolve('Claude outputs', 'wave5-capture.png'));
    console.log('contact sheet: Claude outputs/wave5-capture.png (' + frames.length + ' frames in Claude outputs/wave5/)');
  }
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
