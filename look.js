// visual check: portraits of the operatives (idle / firing / aiming), enemies, the Warden, the lobby, and every run map
// from the gameplay camera and with the camera tilted to the sky band. Prints the player-vs-floor luminance separation per map.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let sharp = null; try { sharp = require('sharp'); } catch (e) {}
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(400);
  const shot = async (name, setup, wait) => {
    await page.evaluate(setup); await page.waitForTimeout(wait || 700);
    await page.evaluate(() => { const A = __ARENA__; A.state.running = false; const c = A.camera; const p = A.player.pos;
      c.position.set(p.x + 2.6, p.y + 1.6, p.z + 2.6); c.lookAt(p.x, p.y + 1.0, p.z); });
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'look-' + name + '.png' });
  };
  // operatives: idle, run+fire, aim
  for (const [i, nm] of [[0, 'vanguard'], [1, 'ranger'], [2, 'bulwark']]) {
    await shot(nm, () => { const A = __ARENA__; A.selectChar(0); A.forceStart('run'); A.state.startDelay = 999; A.player.yaw = 0; });
    await page.evaluate(i => { __ARENA__.selectChar(i); __ARENA__.state.running = true; }, i);
    await shot(nm + '-idle', () => {}, 900);
    await page.evaluate(() => { __ARENA__.state.running = true; __ARENA__.keys.mouse = true; __ARENA__.keys.w = true; });
    await shot(nm + '-runfire', () => {}, 500);
    await page.evaluate(() => { __ARENA__.keys.mouse = false; __ARENA__.keys.w = false; __ARENA__.state.running = true; __ARENA__.keys.aim = true; });
    await shot(nm + '-aim', () => {}, 900);
    await page.evaluate(() => { __ARENA__.keys.aim = false; });
  }
  // enemies: one of each in front of the player
  await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.state.startDelay = 0.01; });
  await page.waitForTimeout(1200);
  await shot('enemies', () => { const A = __ARENA__; A.state.spawnQueue = 0;
    const p = A.player.pos; A.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.group.position.set(p.x - 1.5 + i * 1.5, 0, p.z - 2.5); }); }, 800);
  await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.state.wave = 4; A.enemies.slice().forEach(e => { e.hp = 0; e.dead = true; A.enemies.splice(A.enemies.indexOf(e), 1); }); A.startWave(5); });
  await page.waitForTimeout(2500);
  await shot('warden', () => { const A = __ARENA__; A.state.spawnQueue = 0; const p = A.player.pos; A.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.cd2 = 999; e.group.position.set(p.x + (e.type === 'boss' ? 0 : -2.5 + i), 0, p.z - (e.type === 'boss' ? 4 : 2)); }); }, 800);
  // lobby
  await page.evaluate(() => { __ARENA__.state.running = true; __ARENA__.forceStart('lobby'); __ARENA__.player.pos.set(0, 0, -4); __ARENA__.player.yaw = 0; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'look-lobby.png' });
  // maps: gameplay camera at the spawn, then tilted up to the sky band; measure the operative vs the floor beside them
  const sep = [];
  await page.evaluate(() => { __ARENA__.forceStart('run'); __ARENA__.state.startDelay = 999; });
  for (let stage = 1; stage <= 4; stage++) {
    const id = await page.evaluate(stage => { const A = __ARENA__; A.buildStage(stage); A.state.stage = stage; A.state.startDelay = 999; A.state.spawnQueue = 0; A.state.running = true;
      const m = A.stageMap(stage); A.player.pos.copy(m.spawn); A.player.yaw = 0; A.player.pitch = -0.06; A.player.orbit = 0; A.player.vel.set(0, 0, 0); return m.id; }, stage);
    await page.waitForTimeout(900);
    const px = await page.evaluate(() => { const A = __ARENA__; A.state.running = false; const pr = v => { if (!v) return null; const q = v.clone().project(A.camera); return q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1 ? { x: (q.x + 1) / 2 * 1280, y: (1 - q.y) / 2 * 720 } : null; };
      const cp = A.calPoints(); const op = A.player.pos.clone(); op.y += 1.0; return { op: pr(op), floor: pr(cp.floor), cover: pr(cp.cover), wall: pr(cp.wall) }; });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.getElementById('hud').style.opacity = 0; });
    await page.screenshot({ path: 'look-map-' + id + '.png' });
    await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.player.pitch = 0.28; });
    await page.waitForTimeout(400);
    await page.evaluate(() => { __ARENA__.state.running = false; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'look-sky-' + id + '.png' });
    await page.evaluate(() => { document.getElementById('hud').style.opacity = ''; });
    if (sharp) {
      const img = sharp('look-map-' + id + '.png');
      const lum = async (x, y, w, h) => { const { data, info } = await img.clone().extract({ left: Math.max(0, Math.round(x - w / 2)), top: Math.max(0, Math.round(y - h / 2)), width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
        let s = 0; for (let i = 0; i < data.length; i += info.channels) s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; return s / (data.length / info.channels) / 255; };
      const m = async (pt, w, h) => pt ? +(await lum(pt.x, pt.y, w, h)).toFixed(3) : null;
      const op = await m(px.op, 22, 60), fl = await m(px.floor, 30, 16), cv = await m(px.cover, 14, 14), wl = await m(px.wall, 14, 14);
      sep.push({ map: id, operative: op, floor: fl, cover: cv, wall: wl, contrast: op !== null && fl !== null ? +Math.abs(op - fl).toFixed(3) : null });
    }
  }
  console.log('ladder (mean sRGB luminance from the gameplay camera; targets floor .10 cover .21 wall .32 operative .45-.60):', JSON.stringify(sep));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
