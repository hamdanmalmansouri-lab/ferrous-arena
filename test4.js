const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { __ARENA__.selectChar(0); __ARENA__.forceStart('run'); });
  await page.waitForTimeout(300);
  let r = await page.evaluate(() => ({ map: __ARENA__.state.mapId, order: __ARENA__.run.order, nav: { w: __ARENA__.nav.w, open: Array.from(__ARENA__.nav.open).filter(v => v).length, ready: __ARENA__.nav.ready } }));
  console.log('run start:', JSON.stringify(r));

  // ---- nav trace on every map: enemy behind cover must close distance; on relay, player stands on the platform ----
  for (let stage = 1; stage <= 4; stage++) {
    const info = await page.evaluate((stage) => {
      const A = __ARENA__; A.buildStage(stage); A.state.stage = stage; A.state.startDelay = 0; A.state.spawnQueue = 0; A.state.wave = 3;
      const m = A.state.mapId; const p = A.player;
      // player placement: relay -> on platform top; reactor -> outer tier; others -> centre-ish behind cover
      if (m === 'relay') { p.pos.set(16, 3, 0); } else if (m === 'reactor') { p.pos.set(0, 0, 24); } else if (m === 'foundry') { p.pos.set(0, 0, 3); } else { p.pos.set(0, 0, 0); }
      p.vel.set(0,0,0);
      // spawn 3 chasers on the far side with a wall between
      A.state.wave = 3; for (let i = 0; i < 3; i++) { A.state.spawnQueue = 1; }
      return { map: m, open: Array.from(A.nav.open).filter(v => v).length, hAtPlatform: A.nav.height[A.navNearestOpen(16, 0)], pathLen: (A.navPath(A.navNearestOpen(-20, -20), A.navNearestOpen(p.pos.x, p.pos.z), 4000) || []).length };
    }, stage);
    // force-spawn three enemies at far positions
    await page.evaluate(() => { const A = __ARENA__; A.state.spawnQueue = 3; });
    await page.waitForTimeout(1500);
    const d0 = await page.evaluate(() => __ARENA__.enemies.map(e => +e.group.position.distanceTo(__ARENA__.player.pos).toFixed(1)));
    await page.waitForTimeout(9000);
    const d1 = await page.evaluate(() => ({ d: __ARENA__.enemies.map(e => +e.group.position.distanceTo(__ARENA__.player.pos).toFixed(1)), y: __ARENA__.enemies.map(e => +e.group.position.y.toFixed(1)), hp: Math.round(__ARENA__.player.hp), q: __ARENA__.nav.queries }));
    console.log('stage', stage, JSON.stringify(info), 'dist', JSON.stringify(d0), '->', JSON.stringify(d1));
    await page.screenshot({ path: 'shot-stage' + stage + '.png' });
  }

  // ---- portal flow: kill a boss -> portal -> next stage ----
  await page.evaluate(() => { const A = __ARENA__; A.buildStage(1); A.state.stage = 1; A.state.startDelay = 999; A.state.spawnQueue = 0; A.player.hp = 9999; A.run.stats.maxHp = 9999;
    for (const e of [...A.enemies]) { e.hp = 1; } A.bossDefeated(new THREE.Vector3(4, 0, 4)); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ portalOpen: __ARENA__.state.portalOpen, inter: __ARENA__.interactables.map(i => i.label), compass: document.getElementById('compass').innerHTML.length > 0 }));
  console.log('portal:', JSON.stringify(r));
  await page.evaluate(() => { __ARENA__.player.pos.set(4, 0, 5); });
  await page.waitForTimeout(400);
  await page.keyboard.press('e');
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ stage: __ARENA__.state.stage, map: __ARENA__.state.mapId, mod: __ARENA__.state.mod && __ARENA__.state.mod.id, portalOpen: __ARENA__.state.portalOpen, banner: document.getElementById('bnT').textContent + ' / ' + document.getElementById('bnS').textContent, fade: document.getElementById('fade').className }));
  console.log('after portal:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-stage-transition.png' });
  // boss Mk.2 summon check
  await page.evaluate(() => { const A = __ARENA__; A.state.spawnQueue = 0; for (const e of [...A.enemies]) { e.speed = 0; } A.startWave(10); A.state.spawnQueue = 0; A.state.boss.summonT = 0.2; A.state.boss.speed = 0; A.state.boss.cd2 = 999; });
  await page.waitForTimeout(7000);
  r = await page.evaluate(() => ({ boss: document.getElementById('bossName').textContent, mk: __ARENA__.state.boss && __ARENA__.state.boss.mk, enemies: __ARENA__.enemies.length }));
  console.log('boss mk2:', JSON.stringify(r));
  // reactor pulse
  await page.evaluate(() => { const A = __ARENA__; A.buildStage(A.run.order.maps.indexOf('reactor') + 1); A.state.startDelay = 999; A.state.spawnQueue = 0; A.player.pos.set(0, 0, 12); A.player.hp = 500; A.run.stats.maxHp = 500; A.mapData.pulse.t = 0.2; });
  await page.waitForTimeout(3500);
  r = await page.evaluate(() => ({ map: __ARENA__.state.mapId, hp: Math.round(__ARENA__.player.hp), pulse: __ARENA__.mapData.pulse && { active: __ARENA__.mapData.pulse.active, r: +__ARENA__.mapData.pulse.r.toFixed(1), hit: __ARENA__.mapData.pulse.hit } }));
  console.log('reactor pulse:', JSON.stringify(r));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
