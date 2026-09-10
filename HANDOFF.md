# Ferrous Arena — Project Handoff

**Status:** v3.0.0-p3 — the v3.0 "Meltdown" pass is in progress (phases 1 correctness, 2 roguelite loop, 3 art foundation shipped; phases 2–7 in `MASTER-ROADMAP.md` V3 table). Base: playable v2.8 (roadmap phases 1, 2a/2b, 4, 3, 5 — performance, touch/gamepad, PWA, pathfinding + stages,
Quaternius modular-human operatives + Sci-Fi Guns, mech/kit enemies, layered skeletal animation with strafes, roll, hit reactions + procedural recoil/flinch/shake, settings screen), verified error-free in headless Chromium (six suites). Desktop measured at a steady 120 fps on an RTX 5090 at High tier.
**Deliverables:** `ferrous-arena.html` (standalone, open and play) and `docs/` (GitHub Pages PWA for phones).
**Live copy:** published as a private Claude artifact (same URL since v1).

---

## 1. What this is

A third-person **roguelite wave shooter** in the spirit of Risk of Rain, running entirely in a browser tab.
Three.js r128 (global `THREE`, non-module build) **vendored**: `site/three.min.js` → `docs/` same-origin (service-worker precached) and inlined into the standalone `ferrous-arena.html`; only the artifact body still references cdnjs (it cannot load same-origin files). Everything else is inline in one IIFE.
Operatives (Ultimate Modular Men/Women), weapons (Sci-Fi Guns), enemies (Animated Mech Pack, Sci-Fi Essentials Kit), crates and pickups are Quaternius CC0 glTF models packed into the file (`ATTRIBUTION.md`); everything else is procedural
geometry, WebAudio-synthesised sound and canvas-generated labels. If the packed models fail to parse the game falls back to the v2 box models.

**Flow:** Main menu → Lobby (pick an operative, warm up on the range) → Deploy → waves of robots →
supply crate after every wave → an **offer card** (pick 1 of 3, paused) → **Warden boss every 5 waves** (3 offers on kill) → **stage portal** → new map with a
modifier and a stronger Warden pattern → … → death → stats (seed shown, replayable) → redeploy.

**Controls (desktop):** WASD move, mouse look (pointer lock), LMB hold to fire, **RMB aim** (camera in, FOV 66→50, spread ×0.6), **Q ability**, R reload,
**free look** (mouse orbits the camera round the operative while idle; moving / firing / aiming turns the operative to the camera), **E interact**,
Shift sprint (any direction; 0.8× speed unless moving forward), Space jump, **1/2/3 swap operative in the lobby**, Esc / Tab menu, ` performance overlay.
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
| Bulwark | Heavy | 170 | 5.2 | Scatter cannon, 8×9 dmg, 6 shells, 2× head | **Barrier** — shield worth 45 % of max HP for 5s (15s cd) |

Base numbers live in `CHARS[i].base`; every derived stat is computed in `computeStats()`.

### Items (`ITEMS[]`) — all stack, all pure stat modifiers, each with a `tier` (common 70 % / rare 25 % / legendary 5 %)
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
| VC | Vampiric Coil | +3% lifesteal (rare) |
| RH | Reactor Heart | +35 max HP and +1 HP/s (legendary) |
| OC | Overclock Chip | +15% fire rate and +8% damage (legendary) |

FL / RG / AC / VC are rare, the rest common.

**Sources:** supply crate after each wave clear (5–10 m from the player on open ground; 2 picks under Bounty), 6% drop from any normal
kill (gold octahedron), 3 drops from a Warden, the Fabricator. **Every source opens an offer** (`queueOffer(count,minTier)` → `state.offer`, sim paused, `pickOffer(i)` → `giveItem`) — nothing is auto-rolled. 16% of kills drop a repair kit (+28% max HP).
**Scrap:** `SCRAP_VALUE` per kill (Rusher 3, Lancer 5, Elite 12, Warden 60) → `state.scrap`, shown next to the score. **Fabricator** (`spawnFabricator`, one per stage ≥ 10 m from the spawn, on the compass): `FAB_OPTS` 60 = offer, 120 = rare-or-better offer, 200 = scrap a held stack (`removeItemStack`) then a fresh offer.

### Enemies
- **Rusher** (chaser, red) — melee. At most `MELEE_TOKENS` (3) Rushers hold an attack token at once; the others orbit at 2.5–4 m until one frees (token released beyond 7 m or on death). **Lancer** (shooter, purple) — holds 7–12 m, strafes, fires on LOS (slab test, `lineOfSight`). Every hit on the player grants 0.35 s of i-frames (`hurtPlayer`).
- **Warden** (boss, gold, 2.3× scale) — `hp = (700 + wave*140) * (1 + wave*0.035)`; melee inside 3.2 m,
  12-projectile radial burst every 2.6 s, 40% chance instead to charge (3.4× speed for 1.3 s). Boss bar under the top HUD.
- **Dummy** (grey) — practice-range only, wanders, never attacks, respawns 2 s after death.
- Scaling: `hp = (34 + wave*8) * (1 + wave*0.018)`, speed `+min(wave*0.16, 2)`; melee / projectile damage grows with `min(wave, 22)`; boss waves spawn half the normal count.

### Models and animation (`05-gltfloader`, `06-assets`, `07-models`)
- **Cast:** Vanguard = Modular Men **Swat** + `AR_2`, Ranger = Modular Women **SciFi** (blue hair) + `Sniper_3`, Bulwark = Modular Men **Spacesuit** + `Grenade_2`
  (Sci-Fi Guns pack; each gun's `Main` accent material is tinted to the operative colour, outfits keep their own palette); Rusher and dummy = Leela
  (Animated Mech Pack, red / grey); Lancer = Sci-Fi Kit EyeDrone (hovers at `HOVER_Y` 1.25 m, purple glow); Warden = QuadShell (gold glow, `size` 2.3);
  crate = Prop_Crate, repair kit = Prop_HealthPack, item module = Prop_Ammo_Small. Range targets are procedural plates.
- `tools/fetch-quaternius.js` downloads the six packs into `Assets/` (not in git, ~310 MB: four public Google Drive folders + two free itch.io zips, ~5 min).
- `tools/pack-quaternius.js <Assets dir>` (gltf-transform + sharp) reads the packs from `Assets/`, keeps only the clips in each model's
  clip map **renamed to one vocabulary — `idle walk run shoot jump die hit attack charge emote`** — strips the PBR texture set, resamples + quantizes,
  stores the pre-quantization bounds (`raw.h/minY/min/max/size`, needed because skinned quantized meshes bake the dequantize transform into their
  bind matrices), the target `height`, and for guns the detected **barrel axis** (`raw.barrel = {axis,sign}`: the thin end of the long axis), and writes
  `src/06-assets.js` (`ASSET_DATA.models/maps/meta`, ~5.0 MB). Humans: the placeholder `Pistol` mesh is dropped (`drop`) and the 40 finger bones get the
  gun-grip pose of the `aim` clip baked into their rest transform while every finger channel is removed (`bakeFingers` — halves the file). Per textured pack one base-colour JPEG
  (512–1024 px) + one 256 px emissive PNG are emitted and re-attached by `loadModels()` to materials flagged `extras.packmap`.
- `loadModels()` runs at boot behind a progress bar (`GLTFLoader.parse` per model). `spawnCharacter(id,tint)` → `SkeletonUtils.clone`, scaled so the
  raw height hits the packed `height`, feet at y=0, per-instance material clone; tint = `Main` colour on flat mechs, emissive glow + 55 % colour cast on
  textured kit models. `spawnProp(id)` for static props. `makeAnimator(root, rec.animations)` — each model carries its own clips.
- **Rig facts:** Quaternius rigs face **+Z** (game forward is −Z → `MODEL_YAW=π` on every instance). GLTFLoader strips dots from node names
  (`Wrist.R` → `WristR`). Human bones: `Root → Body → Hips → Abdomen → Torso → Chest → Neck → Head`, `Shoulder/UpperArm/LowerArm/Wrist.L/R` + fingers,
  `UpperLeg/LowerLeg/Foot/PT.L/R`. Human clips (13): `idle` (Idle_Gun, weapon lowered) `aim` (Idle_Gun_Pointing) `shoot` (Idle_Gun_Shoot)
  `runshoot` (Run_Shoot) `run` `walk` `runL/runR/runB` (strafes, back-pedal) `roll` `hit` `die` `emote` (Wave), plus `jumpstart / jumploop / jumpland`
  + `reload` (Pistol_Reload)
  **retargeted from the Universal Animation Library** (`tools/retarget.js`: both rigs bind in a T-pose facing +Z at ~1.85 m, so per-bone world-rotation
  deltas from the bind pose (`inverseBindMatrices`) transfer directly; pelvis → `Body` with translation, feet → the IK-style `Foot.L/R` bones under `Root`
  with world placement; sampled at 30 fps; `MAP` in that file is the bone table). Sci-Fi Guns lie along X with the
  barrel at +X and are modelled at ~2× human scale (`GUN_MOUNT.scale` 0.5). The weapon is mounted in `WristR` and oriented at build time by
  `alignGun()`: it samples the rig's `aim` pose and solves the palm-space quaternion that puts the barrel (per-gun `raw.barrel`) on the character's +Z
  with the gun's +Y up — any rig / any gun without hand-tuned angles (`MOUNTS[charId]` can still override bone / offset / scale). The `muzzle`
  Object3D sits at the barrel end of the gun bounds (measured before mounting) and carries the flash mesh; tracers start there.
- **Aim / flinch bones:** `AIM_BONES` picks `Chest` (fallback `Torso`) for the player's aim pitch; enemies use the first of `FLINCH_BONES`
  (`Chest, Torso, Root, Body`) as `bones.flinch`. Both go through `poseOffset(bone,axis,angle)` — see Layers.
- **Layers.** `splitClip(clip,'lower'|'upper')` masks each clip by bone name: `LOWER_RE` (`Leg|Foot|Pole|Thigh|Shin|Toe|Hips|Piston|^Body$|^Root$`) is
  locomotion, everything else is the upper body (cached per clip). The animator has three
  slots: `play(name,fade,once,ts)` owns the whole body (jump, fall, die, sprint/walk/idle for Rushers, Warden, dummies) and
  `layer(lower,upper,fade,onceUpper,tsLower,tsUpper)` runs a locomotion half (or `null` = legs at rest) under an aim/fire/attack half.
  Switching modes fades the other slots out. `animator.current` reads `"walk|shoot"` or `"jump"`. A one-shot in any slot plays to its end and holds
  its last pose even if the same request is repeated each step. **Never use `timeScale` 0** — `isRunning()` is false and the mixer stops writing it; use 0.02.
- States: player → `roll` one-shot (Blink) / airborne = `jumpstart` one-shot at 2.4× for the first 0.32 s while rising, then `jumploop` / on touchdown after
  ≥ 0.2 s of air `jumpland` one-shot at 1.8× (`player.landT` 0.55 s, dropped by any move/fire input) / `hit` one-shot on the upper body while `player.hitT` (not firing) /
  reloading (`player.reloading>0`, clip present) = locomotion legs + `reload` one-shot on the upper body, `timeScale` = clip length / `reloadT` so it spans the reload /
  firing + moving forward = `runshoot` / firing + strafing or backing = `runL|runR|runB` + `shoot` / firing standing = `shoot` / moving = `walk`
  (`run` when sprinting, strafe clips by `inp.r` vs `inp.f`) / standing within 2.5 s of a shot (`player.aimT`) = `idle` legs + `aim` at 0.02× /
  else `idle`.
  Lancer drone → `idle` hover (+ sine bob), `shoot` one-shot; Rusher / dummy (Leela) → `run|walk|idle` full, `attack` (kick) one-shot;
  Warden (QuadShell) → `charge` while charging, `attack` one-shot, `run|walk|idle`. Death: `removeEnemy(e,true)` plays `die` and parks the group in
  `corpses[]` for the clip length + 0.4 s (max 2.6 s, sinks at the end).
- **Procedural layers (after the mixer update):** the aim bone gets the pitch and the hit flinch (`player.flinch`, `e.hurt` — 120 ms) via
  `poseOffset()` — the mixer only rewrites a bone when its blended value *changes*, so a held pose plus a naive `rotation.x -= a` per step accumulates;
  `poseOffset` keeps the last mixer-written quaternion as the base and re-applies the offset from there;
  the gun mesh inside its mount gets the recoil kick (`player.kick` → `gun.userData.kick.obj` rotation + push-back scaled by gun length);
  `state.shake` (via `shakeCam(amp,dist)`) offsets the camera after `lookAt` unless `SETTINGS.shake` is off.
- **Animation LOD:** an enemy farther than 25 m (14 m on low) accumulates `e.animAcc` and steps its mixer at 15 Hz; `perf.animLod` counts them per frame.
  Death: `removeEnemy(e,true)` strips the hit boxes, plays `die` once and parks the group in `corpses[]` for 1.4 s (sinks at the end).
- Lobby pods (`podDisplays[]`: ring, obj, anim, head) run `idle` through `tickPods(dt,eye)`, which also returns a finished one-shot to idle and turns each
  head bone toward `eye` (±0.9 rad, ignored when the viewer is behind). `updatePodRings(true)` plays the `jump` emote on the selected pod.

### Set dressing and barrels (`19-world`, `19b-maps`)
- **Kit props** (`barrel1/2, crate_large, crate_tarp, locker, shelves, dish, desk`, Sci-Fi Essentials Kit) are placed with `addProp(id,x,z,rotDeg,height,solid,y)`:
  the model's meshes are transformed and queued per *texture sheet*, and `finalizeWorld()` merges them into one mesh per sheet next to the block
  meshes, so a map's 20–30 props cost ~5 draw calls. `solid` pushes a rotated-AABB collision box (the nav bake then treats it as cover).
  `mergeGeos()` reads attributes through `attrAt()` because packed geometry is quantized *and* interleaved (`InterleavedBufferAttribute`).
  Map builders call `dress(rows, barrelPairs)`. Skinned props (the kit's animated Chest) can't be merged — leave them out.
- **Texture sheets** are keyed by the base-colour file each material references (`extras.packmap`, set by the packer); `loadModels()` attaches
  `MODELS.textures[key]` per material. The packer must run `prune({keepAttributes:true})` — without it the texcoords are dropped as unused and
  every kit model renders black (that was the case up to v2.7.2).
- **Explosive barrels** (`addBarrel(x,z)`, red glow, `targetHitMeshes` entry with `userData.barrel`): a hit calls `explodeBarrel()` → 70+4·wave
  damage falling to 40 % at 4.8 m on enemies, 16+wave/2 on the player inside 3.4 m, chain reaction inside 3.6 m, camera shake, sparks.
  `respawnBarrels()` rebuilds spent ones on every wave clear (0.5 s grow-in). Every run map has 6–8; the range has 2.

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
| `build.js` | `node build.js` → syntax-checks the bundle **first**, refreshes `site/three.min.js` from `node_modules`, then writes the HTML files below **and `docs/`**. |
| `arena.body.html` | Generated. The **artifact-publish source** (no doctype/head/body — the Artifact tool adds them). |
| `ferrous-arena.html` | Generated (git-ignored). **Standalone deliverable** — open it in a browser; three.js inlined, no network, no service worker. |
| `docs/` | Generated. **GitHub Pages site / PWA**: `index.html` (standalone + manifest link + SW registration + iOS metas), `manifest.webmanifest`, `sw.js` (cache version = bundle hash), icons, `.nojekyll`. |
| `site/` | PWA assets copied into `docs/` by the build (manifest, `sw.js` template with `./three.min.js` in its precache list, PNG icons, vendored `three.min.js`). |
| `test-local.html` | Generated (git-ignored). Identical to the standalone; the headless harnesses load it from `file://`. |
| `test.js` … `test7.js` | Playwright harnesses (desktop flow · aimed fire/crate/barrier · touch emulation · nav + stages · models/settings/death anim · animation layers/recoil/flinch/shake/LOD/pod emote · **v3 gates: back-to-cover shot, enemy-behind, three-Rusher survival, melee tokens, omni sprint, lifesteal/CDR/barrier, timers, offline PWA**). All wait for `MODELS.ready`. |
| `tools/pack-quaternius.js`, `tools/retarget.js`, `ATTRIBUTION.md` | asset packer (needs `Assets/` with the Quaternius packs; `npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions sharp gl-matrix`) and licences. `tools/pack-assets.js` is the retired Kenney packer. |
| `README.md` | Player-facing readme + GitHub Pages / install steps. |
| `ROADMAP.md` | Phase history; tick items there as they ship. |
| `MASTER-ROADMAP.md` | **The backlog**: tagged tasks per sector (GP / MAP / ANIM / SFX / ART / UI / PERF / MOB / TOOL) with size, files touched and acceptance, plus the parallel-session protocol. |

### Build rule
Never hand-edit the generated HTML. `node build.js` after any change in `src/` or `site/`, run the tests, then republish
`arena.body.html` to the existing artifact URL (pass it as `url`) and `git push` for the Pages site.

---

## 4. Code map (`src/`)

| File | Contents |
|---|---|
| `00-prelude` | THREE presence check |
| `05-gltfloader`, `06-assets`, `07-models` | inlined GLTFLoader + SkeletonUtils; packed `ASSET_DATA`; `loadModels`, `spawnCharacter` (+ `charBoost` self-light on flat models), `spawnProp`, **`addRim(group,color)`**, `splitClip`, `makeAnimator` (`play` / `layer` / `finished`) |
| `11-constants`, `12-data-characters`, `13-data-items` | tuning constants, `MELEE_TOKENS`, **`timers[]` + `after(t,fn)` + `tickTimers(dt)`** (every gameplay delay goes through these, never `setTimeout`), `CHARS[]` (abilities carry a `short` touch label), `ITEMS[]` |
| `14-dom`, `15-persistence` | cached element handles (HUD + touch layer); `save.get/set` (localStorage `fa2.*`, try/catch) |
| `16-audio` | `blip`, `noise`, `SFX`, single `master` GainNode |
| `17-quality-tiers` | `TIERS` (high/medium/low: pixel ratio, shadows, fx density, fog, stars, AA), `detectTier()`, `IS_COARSE`, `Q` |
| `18-renderer-scene` | renderer, the light rig (`hemi`, `sun`, `rim`), `RIG_DEFAULT` + **`applyRig(rig)`**; `applyQuality(tier)` (also toggles `userData.rim` shells), `setQuality('auto'|tier)` |
| `19-world` | **`buildSky(stops,starCount,silhouette,silColor)` + `buildSilhouette(kind,color)`** (dome + stars + one band, in `world`, disposed by `clearWorld`), `mergeGeos()`, `stdMat()` cache, `addBlock()` queues boxes → `finalizeWorld()` emits one mesh per material **and calls `navBuild()`**; `addFloor/addWalls/makeLabel/addPortal/clearWorld`; `buildLobby/buildRange`, `addTarget`, `podDisplays[]`, `updatePodRings(emote)`, `tickPods` |
| `19b-maps` | `setTheme(rig)`, **`RIGS`** (per-map light rigs), **`LADDER`** (calibrated surface albedos per map), **`SKIES`** (gradient stops), `mapData`, `buildFoundry/buildRelay/buildFrost/buildReactor`, `MAPS[]`, `MODS[]`, `mulberry32`, `makeRunOrder(seed)`, `stageMap()`, `stageMod()` |
| `20-player` | `player` (incl. `kick`, `flinch`, `lead`), `run`, `computeStats()`, `GUN_MOUNT`, **`MOUNTS`** (per-operative `pos/rot/back/up`), **`applyVanguardPalette`**, `buildAvatarModel(ch)` (+ `addRim`) (glTF or `buildAvatarProcedural`; sets `gun.userData.kick`), `rebuildAvatar()` (`avatarAnim`, `avatarBones`) |
| `21-enemies` | `ENEMY_MODEL/ENEMY_TINT`, `corpses[]`, `makeEnemy` (glTF or `buildEnemyProcedural`) → `finishEnemy` (hit boxes, stats, `animator`, `attackT/shootT`), `removeEnemy(e,keepCorpse)`, `spawnDummy` |
| `21b-nav` | `navBuild`, `navCell/navHeightAt/navOpenAt/navCentre/navNearestOpen`, `navPath` (A*), `navClear` (Bresenham), `navSteer(e,target,out,dt)` |
| `22-effects` | **pools**: `TRACER_POOL` (48, geometry rewritten in place), `SPARK_POOL` (240, fade by scale, count × `Q.cfg.fx`), `PROJ_POOL` (160, no lights — `glowSprite()`), `dropPickup` |
| `23-state` | `state` (`mode` ∈ menu/lobby/range/run), `rangeStats`, `keys` |
| `23b-input-state` | `TOUCH` detection, **`SETTINGS`** (touch/mouse/pad sensitivity multipliers, volume, invert Y, screen shake; `applySettings()`), `inp`, `readInput()`, `pollGamepad()`, `aimAssist()`, `autoFireCheck()`, `doInteract()`, `pauseGame()`, `haptic()` |
| `24-math-helpers` | scratch vectors (`_v1.._v3`, `_fwd`, `_camF`…), `forwardInto(out,…)`, `resolveXZ`, `supportHeight`, **`rayAABB` / `rayWorld(o,d,tFar,tNear)`** (slab tests over `boxes[]` + the floor — used by shots, the camera and `lineOfSight`; a box containing the origin never blocks) |
| `25-hud-helpers` | `syncHUD` (ability, boss bar, touch button, stage), `syncCompass` (crates/items/boss/portal bearings), `syncItems`, `syncRange`, `setMode` |
| `26-items`, `27-characters` | `giveItem(id)`, **offers** (`rollTier/rollOffer`, `queueOffer`, `showOffer/pickOffer/closeOffer`, `offerMove/offerConfirm/offerKey` for pad + keys), **scrap** (`SCRAP_VALUE`, `addScrap`), **Fabricator** (`FAB_OPTS`, `spawnFabricator`, `openFabricator/showFab/fabBuy`, `showScrapPick/scrapPick/removeItemStack`); `selectChar(i, inLobby)` |
| `28-waves` | `startWave` (boss on multiples of `BOSS_EVERY`, `e.mk = stage`), `spawnOne` (nav-snapped, Lancer share + swift mod), `waveCleared` (crate, bounty), **`bossDefeated`, `buildStage`, `nextStage`** |
| `29-shooting` | `getHitList()` (enemy hit boxes + plates/barrels, rebuilt on `hitListVer`), `castShot(origin,dir,maxT,near)`, `tryFire` (per pellet: camera→aim point, then muzzle→aim point; crit, range targets; accuracy per pellet), `dealDamage` (lifesteal on `min(dmg, hp)`), `killEnemy`, `startReload` |
| `30-abilities`, `31-damage` | `useAbility` (Blink uses `inp`), `shakeCam(amp,dist)`, `hurtPlayer` (shield, i-frames, haptic, flinch + shake) |
| `32-loop` | `update(dt)` at a **fixed 60 Hz step**; order: input → timers (kick/flinch decay) → movement (ice, low-grav) → regen → avatar (layers + procedural) → pods → camera (+ shake) → spinners/targets → interactables (run: portal) → enemies (`approach()` = straight inside 3 m else `navSteer`; ground-following; animation LOD + layers + flinch; boss patterns by `mk`) → waves (paused while the portal is open) → reactor pulse → projectiles → pickups → fx; `perf`, auto-tier probe, debug overlay (2nd line = animation) |
| `33-mode-transitions` | `resetPlayerFor`, `goLobby/goRange`, `goRun(seed?)` (seed from arg / `?seed=` / clock → `run.order`, `buildStage(1)`), `resumePlay()`, `enterPlay()` |
| `34-input` | keyboard/mouse/pointer-lock; unlocking pauses (run/range) or opens the roster (lobby) |
| `34b-touch` | pointer-event joystick (floating, 50 px radius), look-drag, held buttons with pointer capture, `syncTouchHUD()`; iOS scroll/zoom suppression |
| `35-screens`, `36-boot` | `showMenu`, **`showSettings(back)`** (quality, 4 sliders, invert Y, aim assist/auto-fire on touch, FPS overlay), `showCodex`, `showLobbyPanel`, `showPause` (has Settings), `gameOver`; boot shows a loading bar until `loadModels()` resolves; `window.__ARENA__` |

### Three things worth understanding before editing

**Aiming.** The camera sits behind and 0.72 m right of the player; the crosshair line is the camera's centre ray. `tryFire()`
casts it twice: camera → aim point (first hit box whose centre projects past the muzzle plane, else the map via `rayWorld`, else 120 m),
then muzzle → aim point for the real hit, so cover behind the player and enemies behind the operative can't intercept, while cover
between the gun and the target still does. Hit boxes are double-sided (`MAT_HIDDEN`). **When scripting an aim test, put the target on `player.x + 0.72`** and keep the lane clear of map cover.

**Input flow.** Keyboard writes `keys`, touch writes `touch`, the gamepad is polled into `pad`; `readInput()` merges them into
`inp` at the top of every step and the loop/abilities/shooting read only `inp`. Look is a delta, so each source applies it to
`player.yaw/pitch` directly. `#touch` sits above the canvas, is hidden whenever `#screen` is visible, and only shows when `TOUCH`.
`@media (pointer:coarse)` re-lays the HUD (vitals/ammo top, ability panel replaced by the touch button, safe-area insets).

**No dynamic lights.** three.js recompiles every material's shader whenever the number of lights changes. The rig is three fixed lights
(`sun`, `rim`, `hemi`) whose colours / directions / intensities are swapped per map by `applyRig`; portal/pod lights in the lobby and the
muzzle flash are the only others. Everything transient glows with an additive sprite.

**Value ladder.** Surface colours are screen targets, not albedos: floor ≈ 10 %, cover ≈ 21 %, walls ≈ 32 % sRGB luminance from the
gameplay camera, operatives ≈ 45–55 % (flat-coloured characters add emissive = albedo × `CHAR_BOOST`). `LADDER[map]` was solved by
rendering and measuring (`calPoints()` gives the probe points; `look.js` prints the readout). Change a rig and the ladder needs re-solving.

---

## 5. Tuning surface

- Operative feel: `CHARS[i].base` and `.ability`. Item strength: the multipliers inside `computeStats()`.
- Drop rates: `killEnemy` (`r<0.06` item, `r<0.22` heal). Crate distance: `waveCleared`.
- Difficulty: `makeEnemy` hp/speed lines, `startWave` counts, `spawnOne` shooter share, boss timers in the boss branch of `update`.
- Melee pressure: `MELEE_TOKENS` (3), i-frames 0.35 s in `hurtPlayer`, orbit band 2.5–4 m in the chaser branch. Wave break 2.5 s when `state.waveT < 20` else 4.5 s; first-wave delay `state.startDelay=3` in `goRun`, 6 after a portal. Economy: `TIER_W`, `SCRAP_VALUE`, `FAB_OPTS` costs. Alive cap 16 in the spawn block (summons up to 20).
- Nav: `NAV_STEP`, `NAV_RADIUS`, repath interval in `navSteer`, `maxExpand` 2500. Stage: `MODS[]` effects in `spawnOne`/`killEnemy`/`dropPickup`/movement; boss patterns in the boss branch; reactor `period` in `buildReactor`.
- Touch: `TOUCH_SENS_BASE` 0.0085 × `SETTINGS.touchSens`; `MOUSE_SENS_BASE` 0.0022; `PAD_SENS_BASE` 2.8; `STICK_R`; aim-assist cone/pull in `aimAssist`.
- Models: per-model `height` in the packer `PICK`, `GUN_MOUNT` (scale 0.5) / `MOUNTS`, `GUN_AXIS` fallback, `player.aimT` 2.5 s / `hitT` 0.45 s / `rollT` 0.5 s / `landT` 0.55 s, jump-start window 0.32 s, `ENEMY_TINT`, `HOVER_Y`, emissive intensity 1.6 / colour cast 0.55 in `spawnCharacter`, clip `timeScale` formulas in the loop.
- Feel: kick per shot in `tryFire` (0.6 / 0.85 / 1 by operative), decay `dt*7`; flinch decay `dt*8`, torso flinch gain 0.35 (player) / 3 (enemies, from `e.hurt`); shake amplitudes at each `shakeCam` call, decay `dt*3`, camera offset 0.14 / 0.10 m; LOD distance 25 m (14 m low), 15 Hz; head-look clamp ±0.9 rad in `tickPods`.
- Quality: `TIERS` table; probe thresholds in `frame()`.
- Camera/FOV: `CAM` in `11-constants` — shoulder 1.05, dist 4.4 (2.9 aiming), pivot EYE+0.15, FOV 66 (56 aiming), yaw lead 4°.
- Look: `RIGS[map]` (sun/rim/hemi/exposure/fog), `SKIES[map]` stops, silhouette kind + colour in each builder, `LADDER[map]` albedos (re-calibrate with a scratch pass after changing a rig: measure the gameplay screenshot with `calPoints()` probes), `CHAR_BOOST.k` (1.3), rim `RIM_SCALE` 1.03 / opacity 0.35 in `addRim`, `MOUNTS[id].back/up`.

---

## 6. Verifying a change

cdnjs is blocked from the sandbox egress, so test through `test-local.html`.

```bash
npm install --no-audit --no-fund          # package.json pins three 0.128, playwright, gltf-transform, sharp, gl-matrix
node tools/fetch-quaternius.js            # once per machine: the packs into Assets/ (only needed to repack)
node build.js
node test.js    # menu, lobby E/1-2-3 select, range portal, blink, run, all 10 items, wave 5 boss, boss loot, draw-call count, death
node test2.js   # aimed fire on the range, chaser damage, barrier, wave clear -> crate -> pickup -> next wave
node test3.js   # touch: layer on, lobby without pointer lock, joystick moves, look-drag, FIRE/ability/pause buttons, aim assist drift
node test4.js   # stages: nav grid per map, 3 Rushers close on the player on every map (incl. Relay platform top), portal -> next stage, Mk2 summons, reactor pulse
node test5.js   # models parsed (13 items, 10 clips), settings sliders persist, enemies animate, kill -> corpse, draw calls
node test6.js   # layers: runshoot while moving+firing, airborne = -|aim, runL / runB strafes, Blink = roll, hit = idle|hit, kick decays, Rusher melee one-shot, flinch, shake decays, LOD count, pod emote -> idle, heads found
node test8.js   # v3 gates: damage curve table, crate -> 3-card offer -> key 2 gives candidate 2, Bounty = two picks, tier roll %, scrap credit, Fabricator offer / rare / reroll, wave break 2.5 vs 4.5, wave-25 Rusher time-to-kill
node test7.js   # v3 gates: back-to-cover shot hits, enemy behind can't eat a shot, 3 Rushers leave a Vanguard alive after 4 s, ≤3 tokens, omni sprint 0.8x, lifesteal clamp, CDR 0.45, Barrier 45%, timers, docs/ boots with the network off
```

Launch flags: `--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`. Simulation is fixed-step, so results are
deterministic per step; headless frames are slow (~0.5 s) so each frame advances up to 8 steps (0.13 s sim).
PWA check: `node test7.js` serves `docs/` over http, waits for the service worker to precache `index.html` + `three.min.js`, then reloads offline and expects the menu (manual: `cd docs && python3 -m http.server 8765`).

`window.__ARENA__` exposes `{timers, after, rayWorld, castShot, hurtPlayer, killEnemy, dealDamage, state, player, run, enemies, keys, camera, CHARS, ITEMS, computeStats, selectChar, giveItem,
useAbility, goLobby, goRange, goRun, startWave, pickups, targets, interactables, perf, Q, setQuality, renderer, toggleDebug,
inp, touch, pad, TOUCH, nav, MAPS, buildStage, nextStage, mapData, stageMap, navPath, navNearestOpen, bossDefeated, MODELS, SETTINGS,
showSettings, spawnCharacter, GUN_MOUNT, avatar, podDisplays, avatarAnim(), corpses, forceStart(mode)}`.
`forceStart('lobby'|'range'|'run')` bypasses pointer lock. `buildStage(n)` swaps the map without touching `state.stage`.

Acceptance bar: `ERRORS: none` in all six, range `hits > 0`, player HP drops on chaser contact, a crate appears after a wave clear,
`state.boss` is set on wave 5 and `pickups` gains 3 items when it dies, `perf` reports ≤ 140 draw calls at the alive cap,
touch joystick moves the player and aim assist drifts yaw toward an off-centre target, and in `test4.js` every map's enemy
distances fall over ~10 s with at least one enemy reaching `y=3` on Relay.

Measured (v2.7): ~110–126 draw calls / ~70k triangles with 16 enemies at the alive cap (v2.5 Kenney: ~70 / 17k; v2: ~330 / 3.7k); bundle 5.6 MB
(assets 5.3 MB). Desktop: 120 fps at High on an RTX 5090 (v2.1 — re-check with the heavier meshes, press `). Phone: unmeasured.

---

## 7. Known limitations / suggested next work

Roughly in value order (details in `ROADMAP.md`):

1. **Triangle budget moved up 4×** (mechs 6–9k tris, guns 3–9k, QuadShell 7.5k) and the bundle is 4.5 MB — profile on a phone before raising the
   alive cap; `gltf-transform simplify` (meshopt) on the kit guns and a smaller `height` for far enemies are the cheap levers. Trilobite (kit) is packed
   nowhere yet — it has a `Gun.L` bone and `AttackAuto`, a natural elite / second Lancer.
2. **Jump is retargeted, not authored for this rig** — arms hold the UAL pose (no weapon) during the jump; the gun stays in the hand via the wrist. `Roll` doubles as Blink. The mech operatives (Mike/Stan/George) are no longer
   packed; `MECH_CLIPS` and the Kenney packer remain for reference. The Universal Animation Library targets the UE mannequin rig, not these rigs.
3. **Gun grip offset** is the wrist bone with no offset (`GUN_MOUNT.pos`); if a gun's grip floats, add a per-character `MOUNTS[id].pos` (metres, before
   the rig scale).
4. **Nav is 2.5D** — no overhangs/bridges you can walk under; enemies occasionally jostle each other off a stair for a moment (separation force).
5. **Stage count is unbounded but only 4 maps** — stage 5 wraps to the shuffled order; more builders slot straight into `MAPS[]`.
6. **Store wrappers not started** (2c): Capacitor project, Play/TestFlight builds — needs developer accounts and a Mac for iOS.
7. **Phone verification pending** — touch was verified with Chromium touch emulation; a real Android/iOS pass is the phase 2 acceptance.
8. **Alive cap still 16** — batching leaves headroom; profile on a phone before raising it.

---

## 8. Constraints to respect

- Single file, no build step for the deliverable. Three r128 non-module, vendored (`site/three.min.js`); the standalone inlines it, `docs/` loads it same-origin. CDN allowlist for the artifact: scripts only from
  cdnjs / jsdelivr-npm / tailwind / jquery; no external images or fetches (so `docs/` extras never go into `arena.body.html`, which is the one file still pointing at cdnjs).
- Items are never granted silently: route every source through `queueOffer` so the player chooses. The offer pauses the sim (`state.running=false`) and `state.forced` (set by `forceStart`) lets the harness resume without pointer lock.
- No `setTimeout` for anything gameplay-timed — use `after(seconds, fn)`; `goRun/goLobby/goRange` clear the queue.
- Never raycast `colliderMeshes` per step; use `rayWorld` (slab test) for world hits and the cached `getHitList()` for hit boxes.
- Dark-only look is deliberate; `body` paints its background explicitly.
- Keep `arena.body.html` free of doctype/html/head/body tags — the Artifact tool supplies the skeleton.
- No dynamic lights on transient objects (§4). Add lights only in map builders.
- Loop code reads `inp`, never `keys`/`touch`/`pad` directly.
- Never edit `src/06-assets.js` by hand; change `PICK` / clip maps / `MAPS` in `tools/pack-quaternius.js` and re-run it against `Assets/`.
- Every map builder must end with `finalizeWorld()` (it bakes the nav grid) and must not leave anything the enemies need to walk under.
