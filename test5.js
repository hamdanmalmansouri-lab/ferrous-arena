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
  let r = await page.evaluate(() => ({ ok: __ARENA__.MODELS.ok, items: Object.keys(__ARENA__.MODELS.items).length, clips: __ARENA__.MODELS.clips.length, menu: document.getElementById('card').textContent.includes('Settings') }));
  console.log('models:', JSON.stringify(r));
  // settings screen
  await page.click('#goSettings'); await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ sliders: document.querySelectorAll('.set input').length, touchVal: document.getElementById('sTouch').value }));
  console.log('settings:', JSON.stringify(r));
  await page.evaluate(() => { const el = document.getElementById('sMouse'); el.value = 2; el.dispatchEvent(new Event('input')); });
  r = await page.evaluate(() => ({ mouse: __ARENA__.SETTINGS.mouseSens, saved: localStorage.getItem('fa2.mouseSens') }));
  console.log('slider->setting:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-settings.png' });
  await page.click('#back'); await page.waitForTimeout(200);
  // run with model enemies, death animation
  await page.evaluate(() => { __ARENA__.forceStart('run'); __ARENA__.state.startDelay = 0.01; __ARENA__.player.hp = 9999; __ARENA__.run.stats.maxHp = 9999; });
  await page.waitForTimeout(2500);
  r = await page.evaluate(() => ({ enemies: __ARENA__.enemies.length, animated: __ARENA__.enemies.filter(e => e.animator).length, states: __ARENA__.enemies.map(e => e.animator && e.animator.current), avatarAnim: !!__ARENA__.avatar.getObjectByName('gun') }));
  console.log('run enemies:', JSON.stringify(r));
  await page.evaluate(() => { const A = __ARENA__; A.state.spawnQueue = 0; A.enemies.forEach((e, i) => { e.speed = 0; e.cd = 999; e.group.position.copy(A.player.pos).add(new THREE.Vector3(-2 + i * 1.2, 0, -4)); }); A.player.yaw = 0; A.player.pitch = 0.05; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot-m-enemies.png' });
  // kill one via damage -> corpse plays 'die'
  const cr = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; e.hp = 1; const p = A.player; p.pos.copy(e.group.position).add(new THREE.Vector3(-1.05, 0, 5)); A.keys.mouse = true; return A.enemies.length; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  r = await page.evaluate(() => ({ before: 0, enemies: __ARENA__.enemies.length, kills: __ARENA__.state.kills }));
  console.log('kill:', JSON.stringify(r), 'was', cr);
  await page.evaluate(() => { __ARENA__.toggleDebug(); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { const ri = __ARENA__.renderer.info.render; return { calls: ri.calls, tris: ri.triangles, enemies: __ARENA__.enemies.length }; });
  console.log('perf:', JSON.stringify(r));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
