// visual check: portraits of the operatives, a Rusher, the drone and the Warden from a fixed camera
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
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
  // operatives, standing guard + firing
  for (const [i, nm] of [[0, 'vanguard'], [1, 'ranger'], [2, 'bulwark']]) {
    await shot(nm, () => { const A = __ARENA__; A.selectChar(0); A.forceStart('run'); A.state.startDelay = 999; A.player.yaw = 0; });
    await page.evaluate(i => { __ARENA__.selectChar(i); __ARENA__.state.running = true; }, i);
    await shot(nm + '-idle', () => {}, 900);
    await page.evaluate(() => { __ARENA__.state.running = true; __ARENA__.keys.mouse = true; __ARENA__.keys.w = true; });
    await shot(nm + '-runfire', () => {}, 500);
    await page.evaluate(() => { __ARENA__.keys.mouse = false; __ARENA__.keys.w = false; });
  }
  // enemies: place one of each in front of the player
  await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.state.startDelay = 0.01; });
  await page.waitForTimeout(1200);
  await shot('enemies', () => { const A = __ARENA__; A.state.spawnQueue = 0; A.enemies.forEach(e => A.enemies.length && 0);
    const p = A.player.pos; A.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.group.position.set(p.x - 1.5 + i * 1.5, 0, p.z - 2.5); }); }, 800);
  await page.evaluate(() => { const A = __ARENA__; A.state.running = true; A.state.wave = 4; A.enemies.slice().forEach(e => { e.hp = 0; e.dead = true; A.enemies.splice(A.enemies.indexOf(e), 1); A.renderer; }); A.startWave(5); });
  await page.waitForTimeout(2500);
  await shot('warden', () => { const A = __ARENA__; A.state.spawnQueue = 0; const p = A.player.pos; A.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.cd2 = 999; e.group.position.set(p.x + (e.type === 'boss' ? 0 : -2.5 + i), 0, p.z - (e.type === 'boss' ? 4 : 2)); }); }, 800);
  // lobby
  await page.evaluate(() => { __ARENA__.state.running = true; __ARENA__.forceStart('lobby'); __ARENA__.player.pos.set(0, 0, -4); __ARENA__.player.yaw = 0; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'look-lobby.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
