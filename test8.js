// v3.0 Phase 2 gate: every item is chosen (offer card, 1/2/3), rarity tiers, scrap + Fabricator (offer / rare / reroll),
// the damage curve (wave-25 Rusher vs wave-10 with the expected item count), variable wave break.
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
  let r;

  // ---- damage curve: shots to kill a Rusher per wave, assuming the expected item count (1/wave + 3 per Warden) with 30% damage picks ----
  r = await page.evaluate(() => { const A = __ARENA__; A.selectChar(0); const out = [];
    for (const w of [1, 5, 10, 15, 20, 25, 30]) { const items = w + 3 * Math.floor(w / 5); const rounds = Math.round(items * 0.3);
      A.run.items = { rounds }; A.computeStats(); const e = A.makeEnemy('chaser', w); const hp = e.hp; A.enemies.splice(A.enemies.indexOf(e), 1); e.group.parent && e.group.parent.remove(e.group);
      out.push({ w, hp: +hp.toFixed(0), rounds, shots: Math.ceil(hp / A.run.stats.dmg), melee: +(9 + Math.min(w, 22) * 0.5).toFixed(1) }); }
    A.run.items = {}; A.computeStats(); return out; });
  console.log('damage curve:', JSON.stringify(r));
  const s10 = r.find(x => x.w === 10).shots, s25 = r.find(x => x.w === 25).shots;
  if (s25 > s10 * 1.8 || s25 > 12) errors.push('DAMAGE CURVE: wave-25 Rusher takes ' + s25 + ' shots vs ' + s10 + ' at wave 10');
  if (r.find(x => x.w === 30).melee !== 20) errors.push('MELEE damage not capped at wave 22: ' + JSON.stringify(r));

  // ---- item choice: a crate opens a 3-card offer, the sim pauses, key 2 gives exactly the second candidate ----
  await page.evaluate(() => { const A = __ARENA__; A.forceStart('run'); A.state.startDelay = 999; A.state.spawnQueue = 0; A.player.hp = 9999; A.run.stats.maxHp = 9999; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __ARENA__.waveCleared(); const c = __ARENA__.pickups.find(p => p.kind === 'crate'); __ARENA__.player.pos.set(c.g.position.x, 0, c.g.position.z); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => { const A = __ARENA__; const o = A.state.offer; return { offer: !!o, stage: o && o.stage, items: o && o.items.slice(), tiers: o && o.items.map(id => A.ITEMS.find(i => i.id === id).tier), opts: document.querySelectorAll('#card .opt').length, paused: !A.state.running, taken: A.run.itemsTaken }; });
  if (!r.offer || r.opts !== 3 || !r.paused || r.taken !== 0) errors.push('OFFER card missing or auto-rolled: ' + JSON.stringify(r));
  await page.keyboard.press('2');
  await page.waitForTimeout(250);
  Object.assign(r, await page.evaluate(() => { const A = __ARENA__; return { picked: Object.keys(A.run.items), taken: A.run.itemsTaken, running: A.state.running, offerGone: !A.state.offer, hudChips: document.querySelectorAll('#items .it').length }; }));
  if (!r.running || !r.offerGone || r.taken !== 1 || r.picked[0] !== r.items[1]) errors.push('OFFER pick did not give the chosen item / resume: ' + JSON.stringify(r));
  console.log('offer:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-offer.png' });

  // ---- bounty crate = two consecutive picks; Fabricator / tier roll ----
  await page.evaluate(() => { const A = __ARENA__; A.state.mods.bounty = true; A.waveCleared(); const c = A.pickups.find(p => p.kind === 'crate'); A.player.pos.set(c.g.position.x, 0, c.g.position.z); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ left: __ARENA__.state.offer && __ARENA__.state.offer.left }));
  await page.keyboard.press('1'); await page.waitForTimeout(150);
  r.afterFirst = await page.evaluate(() => ({ offer: !!__ARENA__.state.offer, left: __ARENA__.state.offer && __ARENA__.state.offer.left, taken: __ARENA__.run.itemsTaken }));
  await page.keyboard.press('3'); await page.waitForTimeout(250);
  r.afterSecond = await page.evaluate(() => ({ offer: !!__ARENA__.state.offer, taken: __ARENA__.run.itemsTaken, running: __ARENA__.state.running }));
  if (r.left !== 2 || !r.afterFirst.offer || r.afterFirst.left !== 1 || r.afterSecond.taken !== 3 || !r.afterSecond.running) errors.push('BOUNTY crate did not give two picks: ' + JSON.stringify(r));
  console.log('bounty:', JSON.stringify(r));
  r = await page.evaluate(() => { const A = __ARENA__; const N = 3000, c = { common: 0, rare: 0, legendary: 0 }; for (let k = 0; k < N; k++) { for (const id of A.rollOffer('common')) c[A.ITEMS.find(i => i.id === id).tier]++; } const tot = c.common + c.rare + c.legendary; return { common: +(c.common / tot * 100).toFixed(1), rare: +(c.rare / tot * 100).toFixed(1), legendary: +(c.legendary / tot * 100).toFixed(1), rareFloor: A.rollOffer('rare').every(id => A.ITEMS.find(i => i.id === id).tier !== 'common') }; });
  if (Math.abs(r.common - 70) > 4 || Math.abs(r.rare - 25) > 4 || Math.abs(r.legendary - 5) > 2 || !r.rareFloor) errors.push('TIER weights off: ' + JSON.stringify(r));
  console.log('tier roll %:', JSON.stringify(r));

  // ---- scrap: kills credit scrap; Fabricator spends it (60 offer / 120 rare / 200 reroll) ----
  r = await page.evaluate(() => { const A = __ARENA__; A.state.scrap = 0; for (let k = 0; k < 2; k++) { const e = A.makeEnemy('chaser', 3); A.killEnemy(e); } const s = A.makeEnemy('shooter', 3); A.killEnemy(s); return { scrap: A.state.scrap, hud: document.getElementById('uiScrap').textContent, fab: !!A.state.fab, fabDist: A.state.fab && +Math.hypot(A.state.fab.pos.x, A.state.fab.pos.z).toFixed(1) }; });
  if (r.scrap !== 11 || !r.fab) errors.push('SCRAP credit / Fabricator spawn wrong: ' + JSON.stringify(r));
  await page.evaluate(() => { const A = __ARENA__; A.player.pos.set(A.state.fab.pos.x, A.state.fab.pos.y, A.state.fab.pos.z + 1); });
  await page.waitForTimeout(300);
  r.prompt = await page.evaluate(() => document.getElementById('promptTxt').textContent);
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  r.fabCard = await page.evaluate(() => ({ stage: __ARENA__.state.offer && __ARENA__.state.offer.stage, paused: !__ARENA__.state.running }));
  await page.keyboard.press('2'); await page.waitForTimeout(150);   // 120 scrap, cannot afford with 11
  r.tooPoor = await page.evaluate(() => ({ stage: __ARENA__.state.offer && __ARENA__.state.offer.stage, scrap: __ARENA__.state.scrap }));
  await page.evaluate(() => { __ARENA__.state.scrap = 130; });
  await page.keyboard.press('2'); await page.waitForTimeout(200);
  r.rareOffer = await page.evaluate(() => { const A = __ARENA__, o = A.state.offer; return { stage: o && o.stage, scrap: A.state.scrap, tiers: o && o.items.map(id => A.ITEMS.find(i => i.id === id).tier) }; });
  await page.keyboard.press('1'); await page.waitForTimeout(200);
  r.afterRare = await page.evaluate(() => ({ taken: __ARENA__.run.itemsTaken, running: __ARENA__.state.running }));
  if (r.fabCard.stage !== 'fab' || r.tooPoor.stage !== 'fab' || r.tooPoor.scrap !== 11 || r.rareOffer.stage !== 'pick' || r.rareOffer.scrap !== 10 || r.rareOffer.tiers.some(t => t === 'common') || !r.afterRare.running) errors.push('FABRICATOR rare offer flow wrong: ' + JSON.stringify(r));
  // reroll: scrap a held stack, then a fresh offer
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  await page.evaluate(() => { __ARENA__.state.scrap = 250; });
  const heldBefore = await page.evaluate(() => Object.assign({}, __ARENA__.run.items));
  await page.keyboard.press('3'); await page.waitForTimeout(200);
  r.reroll = await page.evaluate(() => ({ stage: __ARENA__.state.offer && __ARENA__.state.offer.stage, n: __ARENA__.state.offer && __ARENA__.state.offer.items.length, scrap: __ARENA__.state.scrap }));
  await page.keyboard.press('1'); await page.waitForTimeout(200);
  r.rerollOffer = await page.evaluate(() => ({ stage: __ARENA__.state.offer && __ARENA__.state.offer.stage, held: Object.assign({}, __ARENA__.run.items) }));
  await page.keyboard.press('1'); await page.waitForTimeout(200);
  r.rerollDone = await page.evaluate(() => ({ running: __ARENA__.state.running, taken: __ARENA__.run.itemsTaken }));
  const sumBefore = Object.values(heldBefore).reduce((a, b) => a + b, 0), sumMid = Object.values(r.rerollOffer.held).reduce((a, b) => a + b, 0);
  if (r.reroll.stage !== 'scrapPick' || r.reroll.scrap !== 50 || r.rerollOffer.stage !== 'pick' || sumMid !== sumBefore - 1 || !r.rerollDone.running) errors.push('FABRICATOR reroll flow wrong: ' + JSON.stringify(r));
  console.log('scrap + fabricator:', JSON.stringify(r));
  await page.screenshot({ path: 'shot-fab.png' });

  // ---- pacing: fast clear -> 2.5 s break, slow clear -> 4.5 s ----
  r = await page.evaluate(() => { const A = __ARENA__; A.enemies.slice().forEach(e => A.killEnemy(e)); A.pickups.slice().forEach(p => { A.pickups.splice(A.pickups.indexOf(p), 1); p.g.parent && p.g.parent.remove(p.g); });
    A.state.startDelay = 0; A.state.spawnQueue = 0; A.state.waveBreak = 0; A.state.waveT = 5; A.state.portalOpen = false; return A.state.waveT; });
  await simWait(0.3);
  r = { fast: await page.evaluate(() => +__ARENA__.state.waveBreak.toFixed(1)) };
  await page.evaluate(() => { const A = __ARENA__; A.state.offer = null; A.state.running = true; A.state.startDelay = 999; A.enemies.slice().forEach(e => A.killEnemy(e)); A.state.spawnQueue = 0; A.state.waveBreak = 0; A.state.waveT = 30; A.state.startDelay = 0; });
  await simWait(0.3);
  r.slow = await page.evaluate(() => +__ARENA__.state.waveBreak.toFixed(1));
  if (!(r.fast > 1.8 && r.fast <= 2.5) || !(r.slow > 3.8 && r.slow <= 4.5)) errors.push('WAVE BREAK not variable: ' + JSON.stringify(r));
  console.log('wave break:', JSON.stringify(r));

  // ---- live check at wave 25: expected items, a wave-25 Rusher in front dies within a few seconds of fire ----
  await page.evaluate(() => { const A = __ARENA__; A.state.offer = null; A.state.running = true; A.state.startDelay = 999; A.state.spawnQueue = 0; A.state.waveBreak = 0; A.enemies.slice().forEach(e => A.killEnemy(e)); A.pickups.length = 0;
    A.state.wave = 25; A.run.items = { rounds: 12, syringe: 8, plating: 8, extmag: 4, lens: 4 }; A.computeStats(); A.player.hp = A.run.stats.maxHp; A.player.mag = A.run.stats.mag;
    const p = A.player; p.pos.set(10, 0, 10); p.yaw = 0; p.pitch = 0.02; p.orbit = 0; p.vel.set(0, 0, 0);
    const e = A.makeEnemy('chaser', 25); e.group.position.set(10.72, 0, 3); e.speed = 0; e.cd = 999; e.spawnT = 0; e.group.scale.setScalar(1); });
  await page.waitForTimeout(300);
  const t0 = await page.evaluate(() => { __ARENA__.keys.mouse = true; return __ARENA__.state.t; });
  await page.waitForFunction(t => __ARENA__.enemies.length === 0 || __ARENA__.state.t - t > 6, t0, { timeout: 60000, polling: 100 });
  r = await page.evaluate(t => ({ ttk: +(__ARENA__.state.t - t).toFixed(2), dead: __ARENA__.enemies.length === 0, hp25: +__ARENA__.run.stats.dmg.toFixed(1) }), t0);
  await page.evaluate(() => { __ARENA__.keys.mouse = false; });
  if (!r.dead || r.ttk > 4) errors.push('WAVE-25 Rusher is a sponge: ' + JSON.stringify(r));
  console.log('wave 25 live ttk:', JSON.stringify(r));

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
