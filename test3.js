const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html') + '?touch=1');
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(400);
  let r = await page.evaluate(() => ({ touch: __ARENA__.TOUCH, layerOn: document.getElementById('touch').classList.contains('on'), tier: __ARENA__.Q.tier, menuHasTouchRow: !!document.querySelector('.seg button[data-t]') }));
  console.log('touch boot:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-touch-menu.png' });
  // tap Enter Lobby (no pointer lock on touch)
  await page.tap('#goLobby');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ running: __ARENA__.state.running, mode: __ARENA__.state.mode, locked: !!document.pointerLockElement, touchVisible: getComputedStyle(document.getElementById('touch')).display }));
  console.log('lobby via tap:', JSON.stringify(r));
  // joystick: synthetic pointer events on the left zone, push forward
  const pe = (type, target, id, x, y) => page.evaluate(([type, target, id, x, y]) => {
    const el = target ? document.getElementById(target) : window;
    el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
  }, [type, target, id, x, y]);
  const before = await page.evaluate(() => __ARENA__.player.pos.clone().toArray());
  await pe('pointerdown', 'zoneL', 1, 150, 300);
  await pe('pointermove', null, 1, 150, 240);
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ move: __ARENA__.touch.move, inp: { f: __ARENA__.inp.f, r: __ARENA__.inp.r, sprint: __ARENA__.inp.sprint }, stickOn: document.getElementById('stick').classList.contains('on') }));
  console.log('joystick:', JSON.stringify(r));
  await pe('pointerup', null, 1, 150, 240);
  const after = await page.evaluate(() => __ARENA__.player.pos.clone().toArray());
  console.log('moved:', before.map(v => +v.toFixed(2)), '->', after.map(v => +v.toFixed(2)));
  // look drag on right zone
  const yaw0 = await page.evaluate(() => __ARENA__.player.yaw);
  await pe('pointerdown', 'zoneR', 2, 700, 200);
  await pe('pointermove', null, 2, 600, 200);
  await pe('pointerup', null, 2, 600, 200);
  const yaw1 = await page.evaluate(() => __ARENA__.player.yaw);
  console.log('look drag yaw:', yaw0.toFixed(3), '->', yaw1.toFixed(3));
  // go to range and hold FIRE
  await page.evaluate(() => __ARENA__.goRange());
  await page.waitForTimeout(300);
  await page.evaluate(() => { const p = __ARENA__.player; p.pos.set(-0.72, 0, 0); p.yaw = 0; p.pitch = 0.01; });
  await pe('pointerdown', 'tFire', 3, 830, 300);
  await page.waitForTimeout(1500);
  await pe('pointerup', 'tFire', 3, 830, 300);
  r = await page.evaluate(() => ({ shots: __ARENA__.state.acc.shots, fireFlag: __ARENA__.touch.fire, hits: document.getElementById('rgHits').textContent }));
  console.log('touch fire:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-touch-range.png' });
  // ability + pause buttons
  await pe('pointerdown', 'tAbil', 4, 760, 380); await pe('pointerup', 'tAbil', 4, 760, 380);
  r = await page.evaluate(() => ({ abCd: +__ARENA__.player.abCd.toFixed(1), abTxt: document.getElementById('tAbilTxt').textContent }));
  console.log('touch ability:', JSON.stringify(r));
  await pe('pointerdown', 'tPause', 5, 870, 30); await pe('pointerup', 'tPause', 5, 870, 30);
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ running: __ARENA__.state.running, card: document.getElementById('card').textContent.slice(0, 20), touchHidden: getComputedStyle(document.getElementById('touch')).display }));
  console.log('touch pause:', JSON.stringify(r));
  await page.tap('#go');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ running: __ARENA__.state.running }));
  console.log('resume:', JSON.stringify(r));
  // aim assist: spawn an enemy slightly off-crosshair in a run and check yaw drifts toward it while firing
  await page.evaluate(() => { __ARENA__.goRun(); __ARENA__.state.startDelay = 0.01; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const st = __ARENA__.state; st.spawnQueue = 0; const p = __ARENA__.player; p.pos.set(0, 0, 10); p.yaw = 0; p.pitch = 0;
    __ARENA__.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.group.position.set(i === 0 ? 1.4 : 30, 0, i === 0 ? 0 : 30); }); });
  await page.waitForTimeout(100);
  const y0 = await page.evaluate(() => __ARENA__.player.yaw);
  await pe('pointerdown', 'tFire', 6, 830, 300);
  await page.waitForTimeout(1200);
  await pe('pointerup', 'tFire', 6, 830, 300);
  const y1 = await page.evaluate(() => __ARENA__.player.yaw);
  console.log('aim assist yaw:', y0.toFixed(3), '->', y1.toFixed(3), '(expect negative drift toward +x target)');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
