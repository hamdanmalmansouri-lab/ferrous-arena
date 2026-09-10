const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(400);
  await page.evaluate(() => { __ARENA__.selectChar(0); __ARENA__.forceStart('range'); });
  await page.waitForTimeout(400);
  // put the camera line (x = player.x + 0.72) through the centre plate at (0,-14)
  await page.evaluate(() => { const p = __ARENA__.player; p.pos.set(-0.72, 0, 0); p.yaw = 0; p.pitch = 0.01; __ARENA__.keys.mouse = true; });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  let r = await page.evaluate(() => ({ hits: document.getElementById('rgHits').textContent, targets: document.getElementById('rgTargets').textContent, dps: document.getElementById('rgDps').textContent, shots: __ARENA__.state.acc.shots, plateDown: __ARENA__.targets[2].down > 0 }));
  console.log('range aimed:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-range2.png' });

  // run: spawn a chaser next to the player, expect damage; then clear wave -> crate
  await page.evaluate(() => { __ARENA__.forceStart('run'); __ARENA__.state.startDelay = 0.01; });
  await page.waitForTimeout(2500);
  r = await page.evaluate(() => { const e = __ARENA__.enemies[0]; if (e) e.group.position.copy(__ARENA__.player.pos).add(new THREE.Vector3(1.5, 0, 0)); return { wave: __ARENA__.state.wave, enemies: __ARENA__.enemies.length, q: __ARENA__.state.spawnQueue }; });
  console.log('wave1:', JSON.stringify(r));
  await page.waitForTimeout(3000);
  r = await page.evaluate(() => ({ hp: Math.round(__ARENA__.player.hp), max: __ARENA__.run.stats.maxHp }));
  console.log('after chaser contact:', JSON.stringify(r));
  // barrier test with bulwark
  await page.evaluate(() => { __ARENA__.selectChar(2); __ARENA__.useAbility(); });
  await page.waitForTimeout(100);
  r = await page.evaluate(() => ({ shield: __ARENA__.player.shield, active: +__ARENA__.player.abActive.toFixed(1) }));
  console.log('barrier:', JSON.stringify(r));
  // clear the wave
  await page.evaluate(() => { __ARENA__.state.spawnQueue = 0; for (const e of [...__ARENA__.enemies]) e.hp = -1; });
  // enemies with hp<=0 only die via dealDamage; force via shooting is fiddly -> emulate by removing
  await page.evaluate(() => { for (const e of [...__ARENA__.enemies]) { e.hp = 1; } __ARENA__.player.pos.set(0,0,16); });
  // shoot them: place each enemy in front of the camera line in turn
  for (let k = 0; k < 20; k++) {
    const left = await page.evaluate(() => {
      const e = __ARENA__.enemies[0]; if (!e) return 0;
      const p = __ARENA__.player; e.group.position.set(p.pos.x + 0.72, 0, p.pos.z - 6); p.yaw = 0; p.pitch = 0.02;
      __ARENA__.keys.mouse = true; return __ARENA__.enemies.length;
    });
    if (!left) break;
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ enemies: __ARENA__.enemies.length, kills: __ARENA__.state.kills, crate: __ARENA__.pickups.filter(p => p.kind === 'crate').length, wave: __ARENA__.state.wave, brk: +__ARENA__.state.waveBreak.toFixed(1) }));
  console.log('wave cleared:', JSON.stringify(r));
  // walk to the crate
  await page.evaluate(() => { const c = __ARENA__.pickups.find(p => p.kind === 'crate'); if (c) __ARENA__.player.pos.set(c.g.position.x, 0, c.g.position.z); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ offer: !!__ARENA__.state.offer, opts: document.querySelectorAll('#card .opt').length, paused: !__ARENA__.state.running }));
  console.log('crate offer:', JSON.stringify(r));
  if (!r.offer || r.opts !== 3 || !r.paused) errors.push('CRATE did not open a 3-item offer: ' + JSON.stringify(r));
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ items: __ARENA__.run.itemsTaken, crateLeft: __ARENA__.pickups.filter(p => p.kind === 'crate').length, chips: document.querySelectorAll('#items .it').length, running: __ARENA__.state.running }));
  console.log('crate pickup:', JSON.stringify(r));
  await page.waitForTimeout(6000);
  r = await page.evaluate(() => ({ wave: __ARENA__.state.wave, enemies: __ARENA__.enemies.length }));
  console.log('next wave:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-run2.png' });
  // pause screen -> lobby
  await page.evaluate(() => { __ARENA__.state.running = false; });
  await page.keyboard.press('Tab');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
