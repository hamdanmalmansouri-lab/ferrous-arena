// v3.0 Phase 7 gate: six operatives playable, the unlock ladder, the two passives and three new abilities fire, and sustained body DPS
// on the range within +-15 % of the roster mean.
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
  const simWait = async (secs) => { const t0 = await page.evaluate(() => __ARENA__.state.t); await page.waitForFunction(t => __ARENA__.state.t - t >= 0, t0 + secs, { timeout: 120000, polling: 100 }); };
  let r;
  r = await page.evaluate(() => { const A = __ARENA__; localStorage.clear(); const st = A.CHARS.map(c => A.unlocked(c)); A.selectChar(1, true); const sel = A.run.charIdx;
    localStorage.setItem('fa2.best', '5'); const afterWave5 = A.unlocked(A.CHAR_BY_ID.ranger); localStorage.setItem('fa2.best', '10'); const afterWave10 = A.unlocked(A.CHAR_BY_ID.bulwark);
    localStorage.setItem('fa2.bestStage', '4'); const sable = A.unlocked(A.CHAR_BY_ID.sable); localStorage.setItem('fa2.wardensRun', '3'); const ember = A.unlocked(A.CHAR_BY_ID.ember);
    localStorage.setItem('fa2.meltdownBest', JSON.stringify({ vanguard: 100 })); const arc = A.unlocked(A.CHAR_BY_ID.arclight);
    localStorage.clear(); localStorage.setItem('fa2.trials', JSON.stringify({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 })); const viaMarks = A.CHARS.map(c => A.unlocked(c));
    return { fresh: st, selectLockedStays: sel, afterWave5, afterWave10, sable, ember, arc, viaMarks }; });
  if (JSON.stringify(r.fresh) !== '[true,false,false,false,false,false]' || r.selectLockedStays !== 0 || !r.afterWave5 || !r.afterWave10 || !r.sable || !r.ember || !r.arc || r.viaMarks.some(v => !v)) errors.push('UNLOCK ladder wrong: ' + JSON.stringify(r));
  console.log('unlocks:', JSON.stringify(r));
  await page.evaluate(() => { localStorage.clear(); __ARENA__.forceStart('lobby'); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ pods: __ARENA__.podDisplays.length, lockedLabels: __ARENA__.interactables.filter(i => /Locked/.test(i.label)).length }));
  if (r.pods !== 6 || r.lockedLabels !== 5) errors.push('LOBBY pods / locked labels wrong: ' + JSON.stringify(r));
  console.log('lobby:', JSON.stringify(r));
  await page.evaluate(() => { localStorage.setItem('fa2.trials', JSON.stringify({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 })); });
  const setup = (id) => page.evaluate(id => { const A = __ARENA__; const i = A.CHARS.findIndex(c => c.id === id); A.selectChar(i, false); A.forceStart('run'); A.state.startDelay = 999; A.state.spawnQueue = 0; A.player.hp = 9999; A.run.stats.maxHp = 9999; A.state.ascFired = {}; A.state.evoFired = {};
    const p = A.player; p.pos.set(10, 0, 10); p.yaw = 0; p.pitch = -0.02; p.orbit = 0; p.vel.set(0, 0, 0); return A.CHARS[A.run.charIdx].id; }, id);
  const spawn = (x, z, hp) => page.evaluate(([x, z, hp]) => { const A = __ARENA__; const e = A.makeEnemy('chaser', 3); e.group.position.set(x, 0, z); e.speed = 0; e.cd = 999; e.spawnT = 0; e.group.scale.setScalar(1); if (hp) e.hp = hp; return e.hp; }, [x, z, hp]);
  const P = {};
  P.ranger = await setup('ranger'); await spawn(11.05, 4, 1000);
  P.mark = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; A.dealDamage(e, 10, e.group.position.clone().setY(1.8), true, false); const hp1 = e.hp; A.dealDamage(e, 10, e.group.position.clone().setY(1), false, false); return { markT: +e.markT.toFixed(2), second: +(hp1 - e.hp).toFixed(2), fired: A.state.ascFired.mark || 0 }; });
  if (P.mark.markT <= 0 || Math.abs(P.mark.second - 12.5) > 0.01) errors.push('MARK passive wrong: ' + JSON.stringify(P.mark));
  P.bulwark = await setup('bulwark');
  P.braced = await page.evaluate(() => { const A = __ARENA__; A.player.grounded = true; A.player.fireCd = 0.5; A.player.iframes = 0; const hp0 = A.player.hp; A.hurtPlayer(100); return { taken: +(hp0 - A.player.hp).toFixed(1), fired: A.state.ascFired.braced || 0 }; });
  if (Math.abs(P.braced.taken - 75) > 0.5) errors.push('BRACED passive wrong: ' + JSON.stringify(P.braced));
  P.sable = await setup('sable'); await spawn(12, 5, 1000);
  await page.evaluate(() => { __ARENA__.useAbility(); }); await simWait(1.4);
  P.snare = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; return { snare: !!A.state.snare, dist: +e.group.position.distanceTo(A.state.snare ? A.state.snare.pos : A.player.pos).toFixed(2), slowT: +e.slowT.toFixed(2), fired: A.state.ascFired.snare || 0 }; });
  if (!P.snare.fired || P.snare.dist > 1.2 || P.snare.slowT <= 0) errors.push('SNARE did not pull / slow: ' + JSON.stringify(P.snare));
  P.ember = await setup('ember'); await spawn(11.05, 5, 1000);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; }); await simWait(0.6); await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  P.burn = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; return { burnT: +e.burnT.toFixed(2), hp: +e.hp.toFixed(1), fired: A.state.ascFired.burn || 0 }; });
  await simWait(1.0);
  P.burn.hpAfterTick = await page.evaluate(() => +__ARENA__.enemies[0].hp.toFixed(1));
  await page.evaluate(() => { __ARENA__.useAbility(); });
  P.backdraft = await page.evaluate(() => { const A = __ARENA__; return { hp: +A.enemies[0].hp.toFixed(1), fired: A.state.ascFired.backdraft || 0 }; });
  if (P.burn.burnT <= 0 || P.burn.hpAfterTick >= P.burn.hp) errors.push('BURN did not apply / tick: ' + JSON.stringify(P.burn));
  if (!P.backdraft.fired || P.backdraft.hp > P.burn.hpAfterTick * 0.62) errors.push('BACKDRAFT did not detonate: ' + JSON.stringify(P));
  P.arclight = await setup('arclight'); await spawn(11.05, 4, 1000);
  await page.evaluate(() => { __ARENA__.useAbility(); }); await simWait(1.5);
  P.sentry = await page.evaluate(() => { const A = __ARENA__; return { sentry: !!A.state.sentry, hp: +A.enemies[0].hp.toFixed(1), fired: A.state.ascFired.sentry || 0 }; });
  if (!P.sentry.sentry || !P.sentry.fired || P.sentry.hp >= 1000) errors.push('SENTRY did not fire: ' + JSON.stringify(P.sentry));
  await page.evaluate(() => { const A = __ARENA__; A.state.acc.shots = 0; A.keys.mouse = true; }); await simWait(1.0);
  P.semi = await page.evaluate(() => { const A = __ARENA__; A.keys.mouse = false; return { shotsWhileHeld: A.state.acc.shots }; });
  if (P.semi.shotsWhileHeld !== 1) errors.push('CARBINE is not semi-auto: ' + JSON.stringify(P.semi));
  console.log('passives + abilities:', JSON.stringify(P));
  const dps = {};
  for (const id of ['vanguard', 'ranger', 'bulwark', 'sable', 'ember', 'arclight']) {
    await page.evaluate(id => { const A = __ARENA__; const i = A.CHARS.findIndex(c => c.id === id); A.selectChar(i, false); A.goRange(); A.state.running = true; A.enemies.slice().forEach(e => A.removeEnemy(e));
      const p = A.player; p.pos.set(-1.05, 0, 0); p.yaw = 0; p.pitch = -0.085; p.orbit = 0; const e = A.makeEnemy('dummy', 0); e.group.position.set(0, 0, -6); e.speed = 0; e.spawnT = 0; e.group.scale.setScalar(1); e.hp = 1e6; e.maxHp = 1e6; e.wanderT = 1e9; e.wander.set(0, 0, 0); A.player.mag = A.run.stats.mag; A.player.reloading = 0; A.run.stats.crit = 0; }, id);   // body DPS: no crit variance
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => { __ARENA__.keys.mouse = true; return __ARENA__.state.t; });
    await page.evaluate(() => { const c = __ARENA__.CHARS[__ARENA__.run.charIdx]; if (c.weapon === 'carbine') { c._w = c.weapon; c.weapon = 'rifle'; } });   // measure the semi-auto at its maximum press rate
    await page.waitForFunction(t => { __ARENA__.player.recoil = 0; return __ARENA__.state.t - t >= 16; }, t0, { timeout: 150000, polling: 50 });
    await page.evaluate(() => { const c = __ARENA__.CHARS[__ARENA__.run.charIdx]; if (c._w) { c.weapon = c._w; delete c._w; } });
    dps[id] = await page.evaluate(t0 => { const A = __ARENA__; A.keys.mouse = false; const e = A.enemies[0]; return +((1e6 - e.hp) / (A.state.t - t0)).toFixed(1); }, t0);
  }
  const vals = Object.values(dps), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const spread = Object.fromEntries(Object.entries(dps).map(([k, v]) => [k, +((v / mean - 1) * 100).toFixed(1) + '%']));
  console.log('sustained body dps (16 s, range dummy, crit off):', JSON.stringify(dps), 'mean', mean.toFixed(1), 'deviation', JSON.stringify(spread));
  for (const [k, v] of Object.entries(dps)) if (Math.abs(v / mean - 1) > 0.15) errors.push('DPS out of band: ' + k + ' ' + v + ' vs mean ' + mean.toFixed(1));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
