# Ferrous Arena — Project Handoff

**Status:** playable v2.3 (roadmap phases 1, 2a/2b, 4 — performance, touch/gamepad, PWA, pathfinding + stages), verified error-free in
headless Chromium including touch emulation and per-map navigation traces. Desktop measured at a steady 120 fps on an RTX 5090 at High tier.
**Deliverables:** `ferrous-arena.html` (standalone, open and play) and `docs/` (GitHub Pages PWA for phones).
**Live copy:** published as a private Claude artifact (same URL since v1).

---

## 1. What this is

A third-person **roguelite wave shooter** in the spirit of Risk of Rain, running entirely in a browser tab.
Three.js r128 (global `THREE`, non-module build) from cdnjs; everything else is inline in one IIFE.
No assets: procedural geometry, WebAudio-synthesised sound, canvas-generated sky and text labels.

**Flow:** Main menu → Lobby (pick an operative, warm up on the range) → Deploy → waves of robots →
supply crate with an item after every wave → **Warden boss every 5 waves** (3 items on kill) → **stage portal** → new map with a
modifier and a stronger Warden pattern → … → death → stats (seed shown, replayable) → redeploy.

**Controls (desktop):** WASD move, mouse look (pointer lock), LMB hold to fire, **Q / RMB ability**, R reload, **E interact**,
Shift sprint, Space jump, **1/2/3 swap operative in the lobby**, Esc / Tab menu, ` performance overlay.
**Touch:** left half drag = floating joystick (push far = sprint), right half drag = look, FIRE / ability / JUMP / R buttons,
interact pill, pause button. Aim assist on by default, optional auto-fire (menu toggles).
**Gamepad:** left stick move, right stick look, RT fire, LB/LT ability, X reload, A jump, Y/B interact, Start pause.

---

## 2. Content

### Operatives (`CHARS[]`)
| Operative | Role | HP | Speed | Weapon | Ability (Q) |
|---|---|---|---|---|---|
| Vanguard | Assault | 110 | 6.2 | Rifle, 17 dmg, 30 mag, 2.6× head | **Overdrive** — +60% fire rate, +20% dmg for 4s (12s cd) |
| Ranger | Marksman | 85 | 7.0 | Marksman rifle, 46 dmg, 10 mag, 3× head | **Blink** — teleport 8m in movement dir, 0.5s i-frames (6s cd) |
| Bulwark | Heavy | 170 | 5.2 | Scatter cannon, 8×9 dmg, 6 shells, 2× head | **Barrier** — 80-pt shield for 5s (15s cd) |

Base numbers live in `CHARS[i].base`; every derived stat is computed in `computeStats()`.

### Items (`ITEMS[]`) — all stack, all pure stat modifiers
| Code | Item | Effect per stack |
|---|---|---|
| SY | Stim Syringe | +12% fire rate |
| HP | Hardened Plating | +20 max HP |
| SV | Servo Legs | +10% move/sprint speed |
| FL | Focus Lens | +10% crit chance (crit = 2× dmg; base 5%) |
| TR | Tungsten Rounds | +10% damage |
| XM | Extended Mag | +25% magazine |
| QL | Quick Loader | −15% reload time (multiplicative) |
| RG | Regen Module | +1.2 HP/s |
| AC | Ability Capacitor | −12% ability cooldown (multiplicative) |
| VC | Vampiric Coil | +3% lifesteal |

**Sources:** supply crate after each wave clear (1 item, 5–10 m from the player on open ground), 6% drop from any normal
kill (gold octahedron), 3 drops from a Warden. 16% of kills drop a repair kit (+28% max HP).

### Enemies
- **Rusher** (chaser, red) — melee. **Lancer** (shooter, purple) — holds 7–12 m, strafes, fires on LOS.
- **Warden** (boss, gold, 2.3× scale) — `hp = (700 + wave*140) * (1 + wave*0.035)`; melee inside 3.2 m,
  12-projectile radial burst every 2.6 s, 40% chance instead to charge (3.4× speed for 1.3 s). Boss bar under the top HUD.
- **Dummy** (grey) — practice-range only, wanders, never attacks, respawns 2 s after death.
- Scaling: `hp = (34 + wave*9) * (1 + wave*0.035)`, speed `+min(wave*0.16, 2)`; boss waves spawn half the normal count.

### Maps and stages (`19-world`, `19b-maps`)
`clearWorld()` empties the `world` group and every registry, then a builder repopulates `boxes[]`, `colliderMeshes[]`,
`interactables[]`, `spinners[]`, `targets[]`, `mapData` and ends with `finalizeWorld()` (geometry merge + **nav grid bake**).
- **Lobby** — three pods (walk up + E, or 1/2/3, or Tab roster), green portal → range, blue portal → deploy.
- **Range** — plate targets, 3 dummies, DPS panel, yellow portal back. No player damage.
- **Run stages** (`MAPS[]`): **Foundry** (warm arena, cover + pillars) · **Relay Station** (two 3 m platforms with stairs, a solid bridge, railings) ·
  **Frost Array** (36 m open field, pillars, dense fog, ice patches = 2.2 accel) · **Reactor Core** (tiered walkways round a core that fires an
  expanding shockwave every 20 s — jump it or take 14+wave×0.6). Stage 1 is always Foundry; the rest are shuffled from the run seed.
- **Stage flow:** Warden death → `bossDefeated()` spawns a portal (interactable) and pauses the wave loop → E → fade → `buildStage(n+1)` →
  banner with map name + modifier → wave counter continues. Modifiers (`MODS[]`, from stage 2): Lancer Sweep, Swift Rushers, Bounty (2 items
  per crate), No Repairs, Low Gravity. Warden Mk.N gains a pattern per stage: Mk2 summons Rushers, Mk3 triple burst, Mk4 shield phase at 50%.
- **Navigation** (`21b-nav`): 1 m grid; per cell a ground height (top of the solid stack under the centre) and an open flag (nothing taller than
  0.42 m within 0.45 m). Neighbours connect when heights differ ≤ 0.42, so 0.3 m stair steps and platform tops work. A* with a binary heap, ≤ 2500
  expansions, diagonal corner-cut prevention; per-enemy path cached ~0.5 s, string-pulled up to 12 cells; straight-line steering inside 3 m.
  Enemies follow `navHeightAt()` so they climb stairs. The grid is 2.5D: nothing can be walked both on and under (hence the solid bridge).

---

## 3. Files

| File | Role |
|---|---|
| `src/*.js`, `src/styles.css`, `src/markup.html` | **The source.** One file per section, numbered in load order (`23b-`, `34b-` slot between sections). Edit these. |
| `build.js` | `node build.js` → the HTML files below **and `docs/`**, then syntax-checks the bundle. |
| `arena.body.html` | Generated. The **artifact-publish source** (no doctype/head/body — the Artifact tool adds them). |
| `ferrous-arena.html` | Generated. **Standalone deliverable** — open it in a browser. No service worker. |
| `docs/` | Generated. **GitHub Pages site / PWA**: `index.html` (standalone + manifest link + SW registration + iOS metas), `manifest.webmanifest`, `sw.js` (cache version = bundle hash), icons, `.nojekyll`. |
| `site/` | Hand-maintained PWA assets copied into `docs/` by the build (manifest, `sw.js` template, PNG icons). |
| `test-local.html` | Generated. cdnjs script rewritten to `./node_modules/three/build/three.min.js` for headless tests. |
| `test.js` … `test4.js` | Playwright harnesses (desktop flow · aimed fire/crate/barrier · touch emulation · nav + stages). |
| `README.md` | Player-facing readme + GitHub Pages / install steps. |
| `ROADMAP.md` | Phased plan; tick items there as they ship. |

### Build rule
Never hand-edit the generated HTML. `node build.js` after any change in `src/` or `site/`, run the tests, then republish
`arena.body.html` to the existing artifact URL (pass it as `url`) and `git push` for the Pages site.

---

## 4. Code map (`src/`)

| File | Contents |
|---|---|
| `00-prelude` | THREE presence check |
| `11-constants`, `12-data-characters`, `13-data-items` | tuning constants, `CHARS[]` (abilities carry a `short` touch label), `ITEMS[]` |
| `14-dom`, `15-persistence` | cached element handles (HUD + touch layer); `save.get/set` (localStorage `fa2.*`, try/catch) |
| `16-audio` | `blip`, `noise`, `SFX`, single `master` GainNode |
| `17-quality-tiers` | `TIERS` (high/medium/low: pixel ratio, shadows, fx density, fog, stars, AA), `detectTier()`, `IS_COARSE`, `Q` |
| `18-renderer-scene` | renderer, lights, sky; `applyQuality(tier)`, `setQuality('auto'|tier)` |
| `19-world` | `mergeGeos()`, `stdMat()` cache, `addBlock()` queues boxes → `finalizeWorld()` emits one mesh per material **and calls `navBuild()`**; `addFloor/addWalls/makeLabel/addPortal/clearWorld`; `buildLobby/buildRange`, `addTarget` |
| `19b-maps` | `mapData`, `buildFoundry/buildRelay/buildFrost/buildReactor`, `MAPS[]`, `MODS[]`, `mulberry32`, `makeRunOrder(seed)`, `stageMap()`, `stageMod()` |
| `20-player` | `player`, `run`, `computeStats()`, `buildAvatarModel(ch)`, `rebuildAvatar()` |
| `21-enemies` | `MAT_HIDDEN`, `basicMat()` cache, shared limb geometries, `enemyGeo(type)`, `makeEnemy` (adds `speedMul`, path fields), `removeEnemy`, `spawnDummy` |
| `21b-nav` | `navBuild`, `navCell/navHeightAt/navOpenAt/navCentre/navNearestOpen`, `navPath` (A*), `navClear` (Bresenham), `navSteer(e,target,out,dt)` |
| `22-effects` | **pools**: `TRACER_POOL` (48, geometry rewritten in place), `SPARK_POOL` (240, fade by scale, count × `Q.cfg.fx`), `PROJ_POOL` (160, no lights — `glowSprite()`), `dropPickup` |
| `23-state` | `state` (`mode` ∈ menu/lobby/range/run), `rangeStats`, `keys` |
| `23b-input-state` | `TOUCH` detection (`?touch=1/0` override), `inp` (merged per-step input), `readInput()`, `pollGamepad()`, `aimAssist()`, `autoFireCheck()`, `doInteract()`, `pauseGame()`, `haptic()` |
| `24-math-helpers` | scratch vectors (`_v1.._v3`, `_fwd`, `_camF`…), `forwardInto(out,…)`, `resolveXZ`, `supportHeight`, `lineOfSight` |
| `25-hud-helpers` | `syncHUD` (ability, boss bar, touch button, stage), `syncCompass` (crates/items/boss/portal bearings), `syncItems`, `syncRange`, `setMode` |
| `26-items`, `27-characters` | `giveItem(id)`, `selectChar(i, inLobby)` |
| `28-waves` | `startWave` (boss on multiples of `BOSS_EVERY`, `e.mk = stage`), `spawnOne` (nav-snapped, Lancer share + swift mod), `waveCleared` (crate, bounty), **`bossDefeated`, `buildStage`, `nextStage`** |
| `29-shooting` | `tryFire` (pellet loop, crit, range targets), `dealDamage`, `killEnemy`, `startReload` |
| `30-abilities`, `31-damage` | `useAbility` (Blink uses `inp`), `hurtPlayer` (shield, i-frames, haptic) |
| `32-loop` | `update(dt)` at a **fixed 60 Hz step**; order: input → timers → movement (ice, low-grav) → regen → avatar → camera → spinners/targets → interactables (run: portal) → enemies (`approach()` = straight inside 3 m else `navSteer`; ground-following; boss patterns by `mk`) → waves (paused while the portal is open) → reactor pulse → projectiles → pickups → fx; `perf`, auto-tier probe, debug overlay |
| `33-mode-transitions` | `resetPlayerFor`, `goLobby/goRange`, `goRun(seed?)` (seed from arg / `?seed=` / clock → `run.order`, `buildStage(1)`), `resumePlay()`, `enterPlay()` |
| `34-input` | keyboard/mouse/pointer-lock; unlocking pauses (run/range) or opens the roster (lobby) |
| `34b-touch` | pointer-event joystick (floating, 50 px radius), look-drag, held buttons with pointer capture, `syncTouchHUD()`; iOS scroll/zoom suppression |
| `35-screens`, `36-boot` | `showMenu` (quality + touch toggles), `showCodex`, `showLobbyPanel`, `showPause`, `gameOver`; `window.__ARENA__` |

### Three things worth understanding before editing

**Aiming.** The camera sits behind and 0.72 m right of the player; the crosshair line is the camera's centre ray, so
`tryFire()` uses `ray.setFromCamera({x:0,y:0})`. **When scripting an aim test, put the target on `player.x + 0.72`.**

**Input flow.** Keyboard writes `keys`, touch writes `touch`, the gamepad is polled into `pad`; `readInput()` merges them into
`inp` at the top of every step and the loop/abilities/shooting read only `inp`. Look is a delta, so each source applies it to
`player.yaw/pitch` directly. `#touch` sits above the canvas, is hidden whenever `#screen` is visible, and only shows when `TOUCH`.
`@media (pointer:coarse)` re-lays the HUD (vitals/ammo top, ability panel replaced by the touch button, safe-area insets).

**No dynamic lights.** three.js recompiles every material's shader whenever the number of lights changes. Lights are static per
map (portal/pod lights in the lobby, muzzle flash on the avatar); everything transient glows with an additive sprite.

---

## 5. Tuning surface

- Operative feel: `CHARS[i].base` and `.ability`. Item strength: the multipliers inside `computeStats()`.
- Drop rates: `killEnemy` (`r<0.06` item, `r<0.22` heal). Crate distance: `waveCleared`.
- Difficulty: `makeEnemy` hp/speed lines, `startWave` counts, `spawnOne` shooter share, boss timers in the boss branch of `update`.
- Wave break `state.waveBreak=4.5`; first-wave delay `state.startDelay=3` in `goRun`, 3.5 after a portal. Alive cap 16 in the spawn block (summons up to 20).
- Nav: `NAV_STEP`, `NAV_RADIUS`, repath interval in `navSteer`, `maxExpand` 2500. Stage: `MODS[]` effects in `spawnOne`/`killEnemy`/`dropPickup`/movement; boss patterns in the boss branch; reactor `period` in `buildReactor`.
- Touch: `touch.sens` (look), `STICK_R`, aim-assist cone `bestAng=0.07` and pull `7 / 3` in `aimAssist`. Gamepad curve in `pollGamepad`.
- Quality: `TIERS` table; probe thresholds in `frame()`.
- Camera/FOV: `dist=5.15`, offset `0.72`, FOV 66.

---

## 6. Verifying a change

cdnjs is blocked from the sandbox egress, so test through `test-local.html`.

```bash
npm install three@0.128.0 playwright --no-audit --no-fund
node build.js
node test.js    # menu, lobby E/1-2-3 select, range portal, blink, run, all 10 items, wave 5 boss, boss loot, draw-call count, death
node test2.js   # aimed fire on the range, chaser damage, barrier, wave clear -> crate -> pickup -> next wave
node test3.js   # touch: layer on, lobby without pointer lock, joystick moves, look-drag, FIRE/ability/pause buttons, aim assist drift
node test4.js   # stages: nav grid per map, 3 Rushers close on the player on every map (incl. Relay platform top), portal -> next stage, Mk2 summons, reactor pulse
```

Launch flags: `--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`. Simulation is fixed-step, so results are
deterministic per step; headless frames are slow (~0.5 s) so each frame advances up to 8 steps (0.13 s sim).
PWA check: `cd docs && python3 -m http.server 8765`, load `http://localhost:8765/`, confirm `navigator.serviceWorker.getRegistration()`
is active and `caches.keys()` lists `ferrous-<hash>` (three.js itself won't load in the sandbox; it will on a real host).

`window.__ARENA__` exposes `{state, player, run, enemies, keys, camera, CHARS, ITEMS, computeStats, selectChar, giveItem,
useAbility, goLobby, goRange, goRun, startWave, pickups, targets, interactables, perf, Q, setQuality, renderer, toggleDebug,
inp, touch, pad, TOUCH, nav, MAPS, buildStage, nextStage, mapData, stageMap, navPath, navNearestOpen, bossDefeated, forceStart(mode)}`.
`forceStart('lobby'|'range'|'run')` bypasses pointer lock. `buildStage(n)` swaps the map without touching `state.stage`.

Acceptance bar: `ERRORS: none` in all three, range `hits > 0`, player HP drops on chaser contact, a crate appears after a wave clear,
`state.boss` is set on wave 5 and `pickups` gains 3 items when it dies, `perf` reports ≤ 140 draw calls at the alive cap,
touch joystick moves the player and aim assist drifts yaw toward an off-centre target, and in `test4.js` every map's enemy
distances fall over ~10 s with at least one enemy reaching `y=3` on Relay.

Measured: ~105–135 draw calls / ~3.5k triangles with 16 enemies (v2 was ~330 calls). Desktop: 120 fps at High on an RTX 5090.

---

## 7. Known limitations / suggested next work

Roughly in value order (details in `ROADMAP.md`):

1. **Procedural box models / sine-wave animation** — phases 3 and 5.
2. **Nav is 2.5D** — no overhangs/bridges you can walk under; enemies occasionally jostle each other off a stair for a moment (separation force).
3. **Stage count is unbounded but only 4 maps** — stage 5 wraps to the shuffled order; more builders slot straight into `MAPS[]`.
4. **Store wrappers not started** (2c): Capacitor project, Play/TestFlight builds — needs developer accounts and a Mac for iOS.
5. **Phone verification pending** — touch was verified with Chromium touch emulation; a real Android/iOS pass is the phase 2 acceptance.
6. **Alive cap still 16** — batching leaves headroom; profile on a phone before raising it.

---

## 8. Constraints to respect

- Single file, no build step for the deliverable. Three r128 non-module. CDN allowlist for the artifact: scripts only from
  cdnjs / jsdelivr-npm / tailwind / jquery; no external images or fetches (so `docs/` extras never go into `arena.body.html`).
- Dark-only look is deliberate; `body` paints its background explicitly.
- Keep `arena.body.html` free of doctype/html/head/body tags — the Artifact tool supplies the skeleton.
- No dynamic lights on transient objects (§4). Add lights only in map builders.
- Loop code reads `inp`, never `keys`/`touch`/`pad` directly.
- Every map builder must end with `finalizeWorld()` (it bakes the nav grid) and must not leave anything the enemies need to walk under.
