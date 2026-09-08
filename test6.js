// Phase 5 animation layers: lower/upper split, recoil kick, hit flinch, camera shake, animation LOD, pod emote + head look
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: require('./tools/pw-browser').chromiumPath(), args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('test-local.html'));
  await page.waitForFunction(() => window.__ARENA__ && __ARENA__.MODELS.ready, { timeout: 90000 }); await page.waitForTimeout(600);
  // menu backdrop: pods idle, heads track the orbiting camera
  let r = await page.evaluate(() => ({ pods: __ARENA__.podDisplays.length, anims: __ARENA__.podDisplays.filter(p => p.anim).length, heads: __ARENA__.podDisplays.filter(p => p.head).length, state: __ARENA__.podDisplays[0].anim.current }));
  console.log('menu pods:', JSON.stringify(r));
  // lobby: select a pod -> one-shot emote, then back to idle
  await page.evaluate(() => { __ARENA__.forceStart('lobby'); __ARENA__.selectChar(1, true); });
  await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ during: __ARENA__.podDisplays[1].anim.current, once: __ARENA__.podDisplays[1].anim.once }));
  await page.waitForTimeout(9000);   // headless frames advance ~0.13 s of sim each; the wave is 1.9 s
  r.after = await page.evaluate(() => __ARENA__.podDisplays[1].anim.current);
  console.log('pod emote:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-lobby.png' });
  // run: walk + fire => layered state; recoil kick on the gun; jump => full-body clip
  await page.evaluate(() => { const A = __ARENA__; A.selectChar(0); A.forceStart('run'); A.state.startDelay = 999; A.player.hp = 9999; A.run.stats.maxHp = 9999; });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ idle: __ARENA__.avatarAnim().current }));
  await page.evaluate(() => { __ARENA__.keys.w = true; });
  await page.waitForTimeout(500);
  r.walk = await page.evaluate(() => __ARENA__.avatarAnim().current);
  await page.evaluate(() => { __ARENA__.keys.mouse = true; });
  await page.waitForTimeout(250);
  r.walkFire = await page.evaluate(() => ({ st: __ARENA__.avatarAnim().current, kick: __ARENA__.player.kick, gunRot: __ARENA__.avatar.getObjectByName('gun').userData.kick.obj.rotation.x }));
  await page.screenshot({ path: 'shot-walkfire.png' });
  await page.evaluate(() => { __ARENA__.keys.mouse = false; __ARENA__.keys.w = false; });
  await page.waitForTimeout(700);
  r.kickDecayed = await page.evaluate(() => __ARENA__.player.kick);
  await page.evaluate(() => { __ARENA__.keys.space = true; });
  await page.waitForTimeout(120);
  r.jump = await page.evaluate(() => __ARENA__.avatarAnim().current);
  await page.evaluate(() => { __ARENA__.keys.space = false; });
  await page.evaluate(() => { __ARENA__.keys.a = true; });
  await page.waitForTimeout(1500);   // let the jump land first (headless sim runs ~0.13 s per frame)
  r.strafe = await page.evaluate(() => __ARENA__.avatarAnim().current);
  await page.evaluate(() => { __ARENA__.keys.a = false; __ARENA__.keys.s = true; });
  await page.waitForTimeout(400);
  r.back = await page.evaluate(() => __ARENA__.avatarAnim().current);
  await page.evaluate(() => { __ARENA__.keys.s = false; __ARENA__.selectChar(1); __ARENA__.useAbility(); });
  await page.waitForTimeout(120);
  r.blink = await page.evaluate(() => __ARENA__.avatarAnim().current);
  await page.evaluate(() => { __ARENA__.selectChar(0); __ARENA__.player.rollT = 0; __ARENA__.player.hitT = 0.45; });
  await page.waitForTimeout(120);
  r.hit = await page.evaluate(() => __ARENA__.avatarAnim().current);
  console.log('avatar layers:', JSON.stringify(r));
  // reload: upper-body 'reload' layer over the locomotion half while player.reloading>0 (clip comes from the UAL repack; reported as absent otherwise)
  // without the packed clip (Assets/ not on this machine), shim one from a renamed clone of `hit` so the layer logic is still exercised
  const shim = await page.evaluate(() => { const A = __ARENA__; if (A.avatarAnim().actions.reload) return false; const rec = A.MODELS.items.human_swat; const c = rec.animations.find(x => x.name === 'hit').clone(); c.name = 'reload'; rec.animations.push(c); A.selectChar(0); return true; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const A = __ARENA__; A.player.hitT = 0; A.player.mag = 0; A.keys.w = true; A.keys.mouse = true; });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { const A = __ARENA__, an = A.avatarAnim(); return { hasClip: !!an.actions.reload, reloading: +A.player.reloading.toFixed(2), state: an.current, once: an.once }; }); r.shim = shim;
  await page.evaluate(() => { __ARENA__.keys.w = false; __ARENA__.keys.mouse = false; });
  await page.waitForTimeout(3500);   // reloadT is ≤ 2.6 s; headless sim runs ~0.13 s per frame
  r.after = await page.evaluate(() => ({ reloading: +__ARENA__.player.reloading.toFixed(2), state: __ARENA__.avatarAnim().current }));
  if (r.hasClip && !/\|reload$/.test(r.state)) errors.push('RELOAD layer not active while reloading: ' + r.state);
  if (r.hasClip && /reload/.test(r.after.state)) errors.push('RELOAD layer still active after the reload: ' + r.after.state);
  if (shim) r.note = 'packed reload clip absent - layer verified with a shim; repack with Pistol_Reload in UAL_CLIPS';
  console.log('reload layer:', JSON.stringify(r));
  // free look + aim: idle mouse orbits the camera (yaw untouched), an action snaps yaw to the camera; RMB pulls the camera in
  r = await page.evaluate(() => { const A = __ARENA__, p = A.player; p.orbit = 0; p.yaw = 0; return { free: p.free }; });
  await page.evaluate(() => { __ARENA__.applyLook(1.0, 0); });
  await page.waitForTimeout(150);
  Object.assign(r, await page.evaluate(() => { const p = __ARENA__.player; return { orbit: +p.orbit.toFixed(2), yaw: +p.yaw.toFixed(2), camYaw: +__ARENA__.camYaw().toFixed(2), reticleDim: document.getElementById('cross').classList.contains('free') }; }));
  await page.evaluate(() => { __ARENA__.keys.w = true; });
  await page.waitForTimeout(150);
  Object.assign(r, await page.evaluate(() => { const p = __ARENA__.player; return { orbitAfterMove: +p.orbit.toFixed(2), yawAfterMove: +p.yaw.toFixed(2) }; }));
  await page.evaluate(() => { __ARENA__.keys.w = false; __ARENA__.keys.aim = true; });
  await page.waitForTimeout(600);
  Object.assign(r, await page.evaluate(() => ({ aimK: +__ARENA__.player.aimK.toFixed(2), fov: +__ARENA__.camera.fov.toFixed(1), aimState: __ARENA__.avatarAnim().current })));
  await page.evaluate(() => { __ARENA__.keys.aim = false; });
  await page.waitForTimeout(600);
  r.fovReleased = +await page.evaluate(() => __ARENA__.camera.fov.toFixed(1));
  if (!r.free || r.orbit !== -1 || r.yaw !== 0) errors.push('FREELOOK orbit did not take the look delta: ' + JSON.stringify(r));
  if (r.orbitAfterMove !== 0 || r.yawAfterMove !== -1) errors.push('FREELOOK yaw did not snap to the camera on move: ' + JSON.stringify(r));
  if (r.aimK < 0.9 || r.fov > 52 || !/aim$/.test(r.aimState) || r.fovReleased < 65) errors.push('AIM camera/pose wrong: ' + JSON.stringify(r));
  console.log('free look + aim:', JSON.stringify(r));
  // enemies: rusher attack layered over sprint, hit flinch, shake on hurt, LOD for far enemies
  await page.evaluate(() => { const A = __ARENA__; A.state.startDelay = 0.01; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const A = __ARENA__; A.state.spawnQueue = 0; A.enemies.forEach((e, i) => { e.cd = 0; e.group.position.copy(A.player.pos).add(new THREE.Vector3(0, 0, -1.4)); }); });
  await page.waitForTimeout(150);
  r = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies.find(x => x.attackT > 0) || A.enemies[0]; return { type: e.type, attackT: +e.attackT.toFixed(2), state: e.animator.current, once: e.animator.once, hp: A.player.hp, shake: +A.state.shake.toFixed(2), flinch: +A.player.flinch.toFixed(2) }; });
  console.log('rusher attack:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-attack.png' });
  r = await page.evaluate(() => { const A = __ARENA__; const e = A.enemies[0]; A.enemies.forEach(x => { x.cd = 999; x.speed = 0; }); const t0 = e.bones.flinch.rotation.x; e.hurt = 0.14; return { torsoBefore: +t0.toFixed(3) }; });
  await page.waitForTimeout(60);
  r.torsoDuringFlinch = await page.evaluate(() => +__ARENA__.enemies[0].bones.flinch.rotation.x.toFixed(3));
  await page.waitForTimeout(400);
  r.torsoAfter = await page.evaluate(() => +__ARENA__.enemies[0].bones.flinch.rotation.x.toFixed(3));
  console.log('enemy flinch:', JSON.stringify(r));
  await page.evaluate(() => { const A = __ARENA__; A.enemies.forEach((e, i) => { e.group.position.copy(A.player.pos).add(new THREE.Vector3(0, 0, -30)); }); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ lod: __ARENA__.perf.animLod, enemies: __ARENA__.enemies.length }));
  console.log('animation lod (far):', JSON.stringify(r));
  await page.evaluate(() => { __ARENA__.state.shake = 1; });
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ shakeAfter: +__ARENA__.state.shake.toFixed(2) }));
  console.log('shake decays:', JSON.stringify(r));
  await page.evaluate(() => { __ARENA__.toggleDebug(); }); await page.waitForTimeout(400);
  r = await page.evaluate(() => document.getElementById('dbgTxt').textContent.split('\n').pop());
  console.log('debug anim line:', r);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
