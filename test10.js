// v3.0 Phase 5 gate: Forge Core -> fusion card, every evolution fires, every ascension fires, codex lists them.
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
  const simWait = async (secs) => { const t0 = await page.evaluate(() => __ARENA__.state.t); await page.waitForFunction(t => __ARENA__.state.t - t >= 0, t0 + secs, { timeout: 60000, polling: 100 }); };
  const reset = (charIdx) => page.evaluate(ci => { const A = __ARENA__; A.selectChar(ci); A.forceStart('run'); A.state.startDelay = 999; A.state.spawnQueue = 0; A.state.offer = null;
    A.run.evos = {}; A.run.asc = null; A.run.items = {}; A.computeStats(); A.player.hp = A.run.stats.maxHp; A.player.mag = A.run.stats.mag; A.player.abStock = 1; A.player.abCd = 0; A.player.abActive = 0;
    const p = A.player; p.pos.set(10, 0, 10); p.yaw = 0; p.pitch = -0.02; p.orbit = 0; p.vel.set(0, 0, 0); }, charIdx);
  const spawn = (x, z, hp) => page.evaluate(([x, z, hp]) => { const A = __ARENA__; const e = A.makeEnemy('chaser', 3); e.group.position.set(x, 0, z); e.speed = 0; e.cd = 999; e.spawnT = 0; e.group.scale.setScalar(1); if (hp) e.hp = hp; return e.hp; }, [x, z, hp]);
  const fired = () => page.evaluate(() => ({ evo: Object.assign({}, __ARENA__.state.evoFired), asc: Object.assign({}, __ARENA__.state.ascFired) }));
  const results = {};

  // ---- Forge Core -> fusion card -> evolution ----
  await reset(0);
  let r = await page.evaluate(() => { const A = __ARENA__; A.run.items = { syringe: 5, rounds: 2 }; A.computeStats(); A.addCore(); const ok = A.openForge(); return { cores: A.state.cores, card: ok, stage: A.state.offer && A.state.offer.stage, eligible: A.forgeEligible(), opts: document.querySelectorAll('#card .opt').length }; });
  await page.keyboard.press('1'); await page.waitForTimeout(200);
  Object.assign(r, await page.evaluate(() => ({ fused: Object.assign({}, __ARENA__.run.evos), coresAfter: __ARENA__.state.cores, running: __ARENA__.state.running, chipStar: !!document.querySelector('#items .it.evo') })));
  if (!r.card || r.stage !== 'forge' || r.opts !== 1 || !r.fused.syringe || r.coresAfter !== 0 || !r.running) errors.push('FORGE flow wrong: ' + JSON.stringify(r));
  console.log('forge:', JSON.stringify(r));

  await page.evaluate(() => { __ARENA__.state.evoFired = {}; __ARENA__.state.ascFired = {}; });
  // ---- evolutions, one by one (the fired counters accumulate across scenarios) ----
  const evoOn = (id, extra) => page.evaluate(([id, extra]) => { const A = __ARENA__; A.run.evos = {}; A.run.evos[id] = true; A.run.items = Object.assign({ [id]: 5 }, extra || {}); A.computeStats(); A.player.hp = A.run.stats.maxHp; A.player.mag = A.run.stats.mag; A.player.shield = 0; A.player.abStock = A.run.stats.abStock; A.player.abCd = 0; A.player.abActive = 0; }, [id, extra]);
  const clear = () => page.evaluate(() => { const A = __ARENA__; A.enemies.slice().forEach(e => A.removeEnemy(e)); A.pickups.splice(0).forEach(p => p.g.parent && p.g.parent.remove(p.g)); A.state.offer = null; A.state.running = true; A.player.pos.set(10, 0, 10); A.player.yaw = 0; A.player.pitch = -0.02; A.player.orbit = 0; A.keys.mouse = false; A.keys.shift = false; A.keys.w = false; });
  const shootUntil = async (cond, secs) => { await page.evaluate(() => { __ARENA__.keys.mouse = true; }); const t0 = await page.evaluate(() => __ARENA__.state.t); await page.waitForFunction(([c, t0, s]) => { __ARENA__.player.recoil = 0; return eval(c) || __ARENA__.state.t - t0 > s; }, [cond, t0, secs || 4], { timeout: 60000, polling: 60 }); /* recoil would walk sustained fire over the target */ await page.evaluate(() => { __ARENA__.keys.mouse = false; }); };

  await clear(); await evoOn('syringe'); await spawn(11.05, 4, 5); await shootUntil('__ARENA__.enemies.length===0');
  results.adrenal = await page.evaluate(() => ({ stacks: __ARENA__.player.adrenal, t: +__ARENA__.player.adrenalT.toFixed(2) }));
  await clear(); await evoOn('plating'); await page.evaluate(() => { __ARENA__.player.lastHurt = 9; }); await simWait(0.3);
  results.weave = await page.evaluate(() => ({ shield: +__ARENA__.player.shield.toFixed(1), want: +(__ARENA__.run.stats.maxHp * 0.25).toFixed(1) }));
  await clear(); await evoOn('servo'); await page.evaluate(() => { __ARENA__.keys.shift = true; __ARENA__.keys.w = true; }); await simWait(0.8); await page.evaluate(() => { __ARENA__.keys.shift = false; __ARENA__.keys.w = false; }); await simWait(0.2);
  results.kinetic = await page.evaluate(() => ({ kineticT: +__ARENA__.player.kineticT.toFixed(2) }));
  await spawn(11.05, 4, 1000); await page.evaluate(() => { __ARENA__.player.pos.set(10, 0, 10); __ARENA__.player.yaw = 0; }); await shootUntil('__ARENA__.state.evoFired.kinetic>0', 2);
  await clear(); await evoOn('lens', { lens: 10 }); await spawn(11.05, 3, 1000); const hp2 = await spawn(14, 3, 1000); await shootUntil('__ARENA__.state.evoFired.fracture>0', 3);
  results.fracture = await page.evaluate(hp2 => ({ second: +(__ARENA__.enemies.find(e => e.group.position.x > 13).hp).toFixed(1), was: hp2 }), hp2);
  // a pierce continues along the bullet line (muzzle -> aim point), which sits ~0.35 m right of the camera axis: warm up one shot so the
  // rig is in its firing pose, then put the second target on that line 4 m behind the first
  await clear(); await evoOn('rounds'); await spawn(11.05, 5, 1000); await shootUntil('__ARENA__.state.acc.shots>0', 1);
  // the bullet line rises from the muzzle to a chest-height aim point, so a Warden (2.3x hit box) stands in for a far target 8.5 m down that line
  const hpFar = await page.evaluate(() => { const A = __ARENA__; const s = A.state.lastShot; const x = s.o[0] + s.d[0] * 8.5, z = s.o[2] + s.d[2] * 8.5; const e = A.makeEnemy('boss', 1); e.group.position.set(x, 0, z); e.speed = 0; e.cd = 999; e.cd2 = 999; e.spawnT = 0; e.group.scale.setScalar(e.size); e.hp = 5000; return e.hp; });
  await page.evaluate(() => { __ARENA__.player.shotIdx = 0; }); await shootUntil('__ARENA__.state.evoFired.railcore>0', 3);
  results.railcore = await page.evaluate(hpFar => ({ far: +(__ARENA__.enemies.find(e => e.type === 'boss').hp).toFixed(1), was: hpFar, shots: __ARENA__.player.shotIdx }), hpFar);
  await clear(); await evoOn('extmag'); await spawn(11.05, 4, 1000); await page.evaluate(() => { __ARENA__.player.mag = 2; }); await shootUntil('__ARENA__.state.evoFired.beltfeed>0', 2);
  await clear(); await evoOn('loader'); await page.evaluate(() => { __ARENA__.player.mag = 0; __ARENA__.keys.mouse = true; }); await simWait(1.6); await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  results.hotswap = await page.evaluate(() => ({ freeAmmoT: +__ARENA__.player.freeAmmoT.toFixed(2), mag: __ARENA__.player.mag, magMax: __ARENA__.run.stats.mag }));
  await clear(); await evoOn('regen'); await page.evaluate(() => { __ARENA__.player.hp = __ARENA__.run.stats.maxHp; __ARENA__.player.lastHurt = 0; __ARENA__.player.naniteFired = false; }); await simWait(1.0);
  results.nanite = await page.evaluate(() => ({ shield: +__ARENA__.player.shield.toFixed(2), aura: __ARENA__.avatar.children.some(c => c.visible && c.geometry && c.geometry.type === 'RingGeometry') }));
  await clear(); await evoOn('capacitor'); results.overcharge = await page.evaluate(() => { const A = __ARENA__; A.useAbility(); const after1 = { stock: A.player.abStock, cd: +A.player.abCd.toFixed(1) }; A.player.abActive = 0; A.useAbility(); return { after1, after2: { stock: A.player.abStock, cd: +A.player.abCd.toFixed(1) } }; });
  await clear(); await evoOn('coil'); results.hemolattice = await page.evaluate(() => { const A = __ARENA__; const e = A.makeEnemy('chaser', 3); e.group.position.set(14, 0, 4); e.hp = 4; A.player.hp = 50; A.dealDamage(e, 200, e.group.position.clone().setY(1), false, false); return { heal: +(A.player.hp - 50).toFixed(2), want: +(200 * A.run.stats.lifesteal).toFixed(2), hemoT: +A.player.hemoT.toFixed(2) }; });
  results.evoFired = (await fired()).evo;
  console.log('evolutions:', JSON.stringify(results));
  for (const id of ['adrenal','weave','kinetic','fracture','railcore','beltfeed','hotswap','nanite','overcharge','hemolattice']) if (!results.evoFired[id]) errors.push('EVOLUTION never fired: ' + id);
  if (results.fracture.second >= results.fracture.was) errors.push('FRACTURE ricochet did no damage: ' + JSON.stringify(results.fracture));
  if (results.railcore.far >= results.railcore.was) errors.push('RAILCORE pierce did no damage: ' + JSON.stringify(results.railcore));
  if (Math.abs(results.hemolattice.heal - results.hemolattice.want) > 0.05) errors.push('HEMOLATTICE lifesteal wrong: ' + JSON.stringify(results.hemolattice));
  if (results.overcharge.after2.stock !== 0 || results.overcharge.after1.stock !== 1) errors.push('OVERCHARGE stock wrong: ' + JSON.stringify(results.overcharge));

  // ---- ascensions ----
  const ascOn = (ci, id) => page.evaluate(([ci, id]) => { const A = __ARENA__; A.selectChar(ci); A.run.evos = {}; A.run.items = {}; A.computeStats(); A.run.asc = id; A.player.hp = A.run.stats.maxHp; A.player.mag = A.run.stats.mag; A.player.abStock = 1; A.player.abCd = 0; A.player.abActive = 0; A.player.shield = 0; A.player.pos.set(10, 0, 10); A.player.yaw = 0; A.player.pitch = -0.02; A.player.orbit = 0; }, [ci, id]);
  const A2 = {};
  await clear(); await page.evaluate(() => { __ARENA__.selectChar(0); __ARENA__.run.asc = null; });
  A2.card = await page.evaluate(() => { const A = __ARENA__; const ok = A.offerAscension(); return { ok, stage: A.state.offer && A.state.offer.stage, opts: document.querySelectorAll('#card .opt').length }; });
  await page.keyboard.press('2'); await page.waitForTimeout(200);
  A2.picked = await page.evaluate(() => ({ asc: __ARENA__.run.asc, running: __ARENA__.state.running }));
  if (!A2.card.ok || A2.card.opts !== 2 || A2.picked.asc !== 'warcry' || !A2.picked.running) errors.push('ASCENSION card flow wrong: ' + JSON.stringify(A2));
  await clear(); await ascOn(0, 'siege'); await spawn(11.05, 4, 1000); await simWait(0.7); await shootUntil('__ARENA__.state.ascFired.siege>0', 2);
  await clear(); await ascOn(0, 'warcry'); A2.warcry = await page.evaluate(() => { const A = __ARENA__; A.useAbility(); const hp0 = A.player.hp; A.player.iframes = 0; A.hurtPlayer(50); return { taken: +(hp0 - A.player.hp).toFixed(1) }; });
  await clear(); await ascOn(1, 'ghost'); A2.ghost = await page.evaluate(() => { const A = __ARENA__; A.player.mag = 2; A.useAbility(); return { iframes: +A.player.iframes.toFixed(2), mag: A.player.mag, cd: +A.player.abCd.toFixed(2), cdBase: +(A.CHARS[1].ability.cd * A.run.stats.cdMult).toFixed(2) }; });
  await clear(); await ascOn(1, 'executioner'); A2.executioner = await page.evaluate(() => { const A = __ARENA__; const e = A.makeEnemy('chaser', 3); e.group.position.set(14, 0, 4); e.hp = e.maxHp * 0.2; A.dealDamage(e, 1, e.group.position.clone().setY(1.8), true, false); return { dead: !!e.dead }; });
  await clear(); await ascOn(2, 'bastion'); await page.evaluate(() => { __ARENA__.useAbility(); __ARENA__.keys.w = true; }); await simWait(1.0);
  A2.bastion = await page.evaluate(() => { const A = __ARENA__; A.keys.w = false; return { shield: +A.player.shield.toFixed(0), maxHp: A.run.stats.maxHp, speed: +Math.hypot(A.player.vel.x, A.player.vel.z).toFixed(2), base: A.run.stats.speed }; });
  await clear(); await ascOn(2, 'riot'); await spawn(11.5, 8.5, 1000); A2.riot = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; const d0 = e.group.position.distanceTo(A.player.pos); A.useAbility(); return { before: +d0.toFixed(2), after: +e.group.position.distanceTo(A.player.pos).toFixed(2), stun: +e.stun.toFixed(2) }; });
  A2.ascFired = (await fired()).asc;
  console.log('ascensions:', JSON.stringify(A2));
  for (const id of ['siege','warcry','ghost','executioner','bastion','riot']) if (!A2.ascFired[id]) errors.push('ASCENSION never fired: ' + id);
  if (A2.warcry.taken > 36) errors.push('WARCRY did not reduce damage: ' + JSON.stringify(A2.warcry));
  if (A2.ghost.iframes < 1.1 || A2.ghost.mag !== 10) errors.push('GHOST STEP wrong: ' + JSON.stringify(A2.ghost));
  if (!A2.executioner.dead) errors.push('EXECUTIONER did not finish the enemy');
  if (A2.bastion.shield !== A2.bastion.maxHp || A2.bastion.speed > A2.bastion.base * 0.8) errors.push('BASTION wrong: ' + JSON.stringify(A2.bastion));
  if (A2.riot.after <= A2.riot.before + 1 || A2.riot.stun <= 0) errors.push('RIOT CHARGE wrong: ' + JSON.stringify(A2.riot));

  await page.evaluate(() => { __ARENA__.state.running = false; __ARENA__.showCodex(); });
  const codex = await page.evaluate(() => document.getElementById('card').textContent);
  if (!/Adrenal Cascade/.test(codex) || !/Riot Charge/.test(codex)) errors.push('CODEX missing evolutions / ascensions');
  console.log('codex ok:', /Adrenal Cascade/.test(codex) && /Riot Charge/.test(codex));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
