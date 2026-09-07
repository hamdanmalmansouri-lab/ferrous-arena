const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForTimeout(1500);
  const has = await page.evaluate(() => !!window.__ARENA__);
  console.log('game object:', has);
  console.log('menu card text:', (await page.textContent('#card')).slice(0, 80).replace(/\s+/g, ' '));
  await page.screenshot({ path: 'shot-menu.png' });

  // ---- lobby ----
  await page.evaluate(() => __ARENA__.forceStart('lobby'));
  await page.waitForTimeout(500);
  let r = await page.evaluate(() => ({ mode: __ARENA__.state.mode, inter: __ARENA__.interactables.map(i => i.label), char: __ARENA__.CHARS[__ARENA__.run.charIdx].name }));
  console.log('lobby:', JSON.stringify(r));
  // walk toward pod 3 (x=6.5,z=-10). player at (0,0,6) facing yaw=PI (looking -z? yaw=PI => forward = (0,0,+1)). set pos directly.
  await page.evaluate(() => { __ARENA__.player.pos.set(6.5, 0, -7.5); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => document.getElementById('promptTxt').textContent);
  console.log('prompt near pod 3:', r);
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  r = await page.evaluate(() => __ARENA__.CHARS[__ARENA__.run.charIdx].name);
  console.log('selected via E:', r);
  await page.keyboard.press('2');
  await page.waitForTimeout(100);
  r = await page.evaluate(() => __ARENA__.CHARS[__ARENA__.run.charIdx].name);
  console.log('selected via key 2:', r);
  await page.screenshot({ path: 'shot-lobby.png' });

  // ---- range via portal ----
  await page.evaluate(() => { __ARENA__.player.pos.set(-11, 0, 3); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => document.getElementById('promptTxt').textContent);
  console.log('prompt near range portal:', r);
  await page.keyboard.press('e');
  await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ mode: __ARENA__.state.mode, targets: __ARENA__.targets.length, dummies: __ARENA__.enemies.length }));
  console.log('range:', JSON.stringify(r));
  // aim at the centre target at (0,-14): stand at (0,0,0), yaw 0 looks -z. plate at y ~1.75
  await page.evaluate(() => { const p = __ARENA__.player; p.pos.set(0, 0, 0); p.yaw = 0; p.pitch = 0.0; __ARENA__.keys.mouse = true; });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  r = await page.evaluate(() => ({ hits: document.getElementById('rgHits').textContent, targets: document.getElementById('rgTargets').textContent, dps: document.getElementById('rgDps').textContent, shots: __ARENA__.state.acc.shots }));
  console.log('range fire:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-range.png' });
  // ability in range (Ranger blink)
  r = await page.evaluate(() => { const b = __ARENA__.player.pos.clone(); __ARENA__.useAbility(); return { before: [b.x, b.z], after: [__ARENA__.player.pos.x, __ARENA__.player.pos.z], cd: __ARENA__.player.abCd }; });
  console.log('blink:', JSON.stringify(r));

  // ---- run ----
  await page.evaluate(() => __ARENA__.forceStart('run'));
  await page.waitForTimeout(4500);
  r = await page.evaluate(() => ({ mode: __ARENA__.state.mode, wave: __ARENA__.state.wave, enemies: __ARENA__.enemies.length, hp: __ARENA__.player.hp }));
  console.log('run started:', JSON.stringify(r));
  // items
  r = await page.evaluate(() => { const s0 = { ...__ARENA__.run.stats }; __ARENA__.ITEMS.forEach(it => __ARENA__.giveItem(it.id)); const s1 = __ARENA__.run.stats; return { maxHp: [s0.maxHp, s1.maxHp], fireT: [s0.fireT, +s1.fireT.toFixed(4)], mag: [s0.mag, s1.mag], crit: s1.crit, chips: document.querySelectorAll('#items .it').length }; });
  console.log('items:', JSON.stringify(r));
  // wait for damage
  await page.waitForTimeout(12000);
  r = await page.evaluate(() => ({ hp: Math.round(__ARENA__.player.hp), wave: __ARENA__.state.wave, enemies: __ARENA__.enemies.length, kills: __ARENA__.state.kills }));
  console.log('after 12s:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-run.png' });

  // ---- boss wave ----
  await page.evaluate(() => { for (const e of [...__ARENA__.enemies]) { e.hp = 0; } __ARENA__.state.spawnQueue = 0; __ARENA__.player.hp = 9999; __ARENA__.run.stats.maxHp = 9999; __ARENA__.startWave(5); });
  await page.waitForTimeout(3000);
  r = await page.evaluate(() => ({ wave: __ARENA__.state.wave, boss: !!__ARENA__.state.boss, bossHp: __ARENA__.state.boss && Math.round(__ARENA__.state.boss.hp), bar: document.getElementById('bossbar').className, name: document.getElementById('bossName').textContent, projectiles: document.querySelectorAll('canvas').length }));
  console.log('boss wave:', JSON.stringify(r));
  await page.waitForTimeout(6000);
  r = await page.evaluate(() => ({ bossPos: __ARENA__.state.boss && __ARENA__.state.boss.group.position.toArray().map(v => +v.toFixed(1)), hp: Math.round(__ARENA__.player.hp), bossScale: __ARENA__.state.boss && +__ARENA__.state.boss.group.scale.x.toFixed(2) }));
  console.log('boss after 6s:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-boss.png' });
  // kill boss -> loot
  r = await page.evaluate(() => { const b = __ARENA__.state.boss; const before = __ARENA__.pickups.length; b.hp = 0; /* trigger via dealDamage path */ return before; });
  await page.evaluate(() => { const b = __ARENA__.enemies.find(e => e.type === 'boss'); __ARENA__.enemies.forEach(e => { if (e !== b) { e.speed = 0; e.cd = 999; e.group.position.set(30, 0, 30); } }); if (b) { b.speed = 0; b.charge = 0; b.cd2 = 999; b.hp = 40; const p = __ARENA__.player; p.pos.copy(b.group.position).add(new THREE.Vector3(-0.72, 0, 5)); p.yaw = 0; p.pitch = 0.05; p.vel.set(0,0,0); } });
  await page.waitForTimeout(200);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await page.waitForTimeout(2500);
  r = await page.evaluate(() => { const b = __ARENA__.enemies.find(e => e.type === 'boss'); const p = __ARENA__.player; return { shots: __ARENA__.state.acc.shots, hits: __ARENA__.state.acc.hits, mag: p.mag, rel: p.reloading, bossHp: b && b.hp, bossPos: b && b.group.position.toArray().map(v=>+v.toFixed(1)), ppos: p.pos.toArray().map(v=>+v.toFixed(1)), cam: __ARENA__.camera.position.toArray().map(v=>+v.toFixed(1)), yaw: p.yaw, pitch: p.pitch, running: __ARENA__.state.running, mode: __ARENA__.state.mode, over: __ARENA__.state.over }; });
  console.log('boss dbg:', JSON.stringify(r));
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  r = await page.evaluate(() => ({ boss: !!__ARENA__.state.boss, itemPickups: __ARENA__.pickups.filter(p => p.kind === 'item').length, score: __ARENA__.state.score }));
  console.log('boss killed:', JSON.stringify(r));

  // ---- perf: 30 enemies, count draw calls ----
  r = await page.evaluate(() => { for (let i = 0; i < 30; i++) __ARENA__.startWave; __ARENA__.state.spawnQueue = 0; const st = __ARENA__.state; st.wave = 3; for (let i = 0; i < 30; i++) { __ARENA__.enemies.length; } return 0; });
  await page.evaluate(() => { const st = __ARENA__.state; st.spawnQueue = 30; });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { for (const e of __ARENA__.enemies) e.speed = 0; });
  await page.waitForTimeout(600);
  r = await page.evaluate(() => { const ri = __ARENA__.renderer.info.render; return { enemies: __ARENA__.enemies.length, calls: ri.calls, tris: ri.triangles, tier: __ARENA__.Q.tier, geometries: __ARENA__.renderer.info.memory.geometries }; });
  console.log('perf 30 enemies:', JSON.stringify(r));
  await page.evaluate(() => __ARENA__.toggleDebug());
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-perf.png' });

  // ---- death ----
  await page.evaluate(() => { __ARENA__.run.stats.maxHp = 100; __ARENA__.player.hp = 1; });
  await page.waitForTimeout(6000);
  r = await page.evaluate(() => ({ over: __ARENA__.state.over, card: document.getElementById('card').textContent.slice(0, 60).replace(/\s+/g, ' ') }));
  console.log('death:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-death.png' });

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
