# Ferrous Arena — Roadmap

Phase history for the game. **Open work now lives in `MASTER-ROADMAP.md`** (tagged tasks per sector, one per session). Read alongside `HANDOFF.md` (code map, tuning surface, test harnesses).
Each phase lists its goal, the concrete tasks, and the acceptance bar that closes it. Phases are ordered by
value-per-effort, but 1 (performance budget) is a hard prerequisite for 2 (mobile) — do not reorder those.

Legend: `[x]` shipped · `[ ]` open · **AC** acceptance criteria

---

## 0. Shipped so far

### v1.0 — Ferrous Arena (single arena)
- [x] Three.js r128 third-person shooter in one self-contained HTML file, no build step, no assets
- [x] 68×68 walled arena with cover blocks and pillars; AABB collision (`resolveXZ`, `supportHeight`), jump-onto-cover
- [x] Over-the-shoulder camera with wall pull-in; crosshair = camera centre ray (hitscan)
- [x] Two enemy types: Rusher (melee chaser), Lancer (ranged, strafes, needs line-of-sight)
- [x] Escalating waves, headshots (2.6×), repair-kit drops, WebAudio-synthesised SFX
- [x] Title / pause / game-over screens; pointer lock; kill feed, hit markers, damage vignette
- [x] Headless Playwright verification (`test.js`, aim/approach traces)

### v2.0 — Roguelite
- [x] **Main menu** with controls, best-wave record (localStorage), item codex, quick deploy
- [x] **3D lobby** — three operative pods (E / 1-2-3 / Tab roster), portals to the range and the arena
- [x] **Shooting range** — 7 static + 2 sliding plate targets, 3 respawning dummies, live DPS meter, no player damage
- [x] **Three operatives** with distinct bodies, weapons and abilities: Vanguard (rifle, Overdrive), Ranger (marksman, Blink), Bulwark (scatter cannon, Barrier)
- [x] **10 stacking stat items** — crate after every wave, 6% kill drop, 3 from bosses; inventory HUD chips; codex
- [x] **Warden boss every 5 waves** — boss bar, radial bullet bursts, charge attack, bonus loot; per-wave enemy scaling
- [x] Crit system, lifesteal, regen, shield absorption, i-frames; ability HUD with cooldown fill
- [x] Map system (`clearWorld` + per-map builders) — the foundation phase 4 builds on
- [x] Master gain node for audio; mode-aware HUD (`#hud[data-mode]`)
- [x] Extended headless coverage: lobby interaction, range aiming, all items, wave 5 boss + loot, death

### v2.1 — Phase 1: performance & architecture
- [x] Debug overlay (` key): fps, frame-time graph, draw calls, triangles, geometries, pool occupancy, tier
- [x] Quality tiers high/medium/low — auto-detected (cores, memory, coarse pointer), 3 s startup probe drops a tier if slow, menu override persisted
- [x] Static world merged into one mesh per material (`mergeGeos` + `finalizeWorld`); enemy torso/head/hips/pads merged per type; shared limb geometries and material caches
- [x] Object pools for sparks (240), tracers (48), projectiles (160); zero per-event allocation; spark density scales with tier
- [x] Dynamic PointLights removed from projectiles and pickups (each add/remove recompiled every shader) → additive glow sprites
- [x] Scratch vectors in movement/camera/enemy loops (no per-frame `new Vector3`); fixed separation-loop aliasing bug
- [x] Fixed-step simulation at 60 Hz with accumulator (deterministic gameplay across frame rates; tests no longer timing-sensitive)
- [x] Source split into `src/*.js` + `build.js` → single-file bundle unchanged for shipping
- Result: ~105 draw calls / 3.7k tris with 16 enemies (was ~330 calls)

### v2.2 — Phase 2a/2b: touch, gamepad, PWA
- [x] Input abstraction: `inp` merged per step from keyboard, touch and gamepad; loop/abilities/shooting read only `inp`
- [x] Touch controls: floating left joystick (push far = sprint), right-half look-drag, FIRE (hold) / ability (with cooldown ring) / JUMP / reload / interact pill / pause; pointer capture, iOS scroll+zoom suppression
- [x] Aim assist (soft magnetism within ~4° of the crosshair, stronger while firing) and optional auto-fire — touch only, toggles on the menu, persisted
- [x] Gamepad API: sticks, RT fire, LB/LT ability, X reload, A jump, Y/B interact, Start pause; menus accept A/Start
- [x] Menus work without pointer lock on touch; touch layer hidden behind any screen; landscape prompt in portrait
- [x] Mobile HUD layout via `@media (pointer:coarse)` with safe-area insets; haptics on hit/kill (Android)
- [x] PWA: `docs/` site built by `build.js` — manifest (fullscreen, landscape, maskable icon), service worker precache with per-build version, iOS home-screen metas
- [x] `test3.js` touch-emulation harness; README with GitHub Pages + install steps

### v2.3 — Phase 4: pathfinding, stages, four maps
- [x] Nav grid baked per map (1 m cells, ground height + open flag, 2.5D), A* with binary heap and corner-cut prevention, per-enemy path cache with string-pulling, straight-line steering inside 3 m; enemies follow ground height (stairs, platforms)
- [x] Stage flow: Warden death opens a portal (interactable, compass marker), wave loop pauses, E → fade → next map; wave counter continues; 60% HP floor on arrival
- [x] Map registry with seeded order (`?seed=`, shown on pause/death, "Replay this seed" button); best stage persisted
- [x] Four maps: Foundry, Relay Station (platforms + stairs + bridge), Frost Array (ice patches, dense fog), Reactor Core (tiers + telegraphed shockwave)
- [x] Five stage modifiers (Lancer Sweep, Swift Rushers, Bounty, No Repairs, Low Gravity), one per stage from stage 2
- [x] Warden variants: Mk2 summons Rushers, Mk3 triple burst, Mk4 shield phase at 50% HP
- [x] Compass strip (crates, items, boss, portal with distances); Stage counter in the top bar
- [x] `test4.js`: nav trace on every map, portal transition, Mk2 summon, reactor pulse

### v2.4 — Phase 3 (+ most of 5): glTF models, skeletal animation, settings (current)
- [x] Asset pipeline: `tools/pack-assets.js` strips colormaps/unused clips from Kenney CC0 GLBs, shares one rig's clips across all characters, emits `src/06-assets.js`; GLTFLoader + SkeletonUtils inlined; loading bar at boot; procedural fallback if parsing fails
- [x] Operatives, enemies (tinted per type), Warden, dummies as skinned Mini Characters; blasters mounted on the hand bone with a real muzzle point; range targets and crates from the Blaster kit
- [x] Animation state machine (crossfades): idle/walk/sprint/jump/fall/shoot for the player with aim pitch on the torso; sprint/attack for Rushers and the Warden; walk/aim/shoot for Lancers; `die` clip on death via a corpse list; lobby pods idle
- [x] Settings screen (main menu + pause): quality, touch / mouse / controller sensitivity sliders, volume, invert Y, aim assist, auto-fire, FPS overlay — persisted; touch look default raised ~1.9×
- [x] `test5.js`
- Result: ~70 draw calls / ~17k tris with 16 enemies; bundle 1.8 MB (was 125 KB) — still far under the artifact cap; phone verification of load time pending

### v2.5 — Phase 5: animation layers and procedural motion
- [x] Lower/upper body clip split (`splitClip`): locomotion on root + legs, aim/fire/attack on torso + arms + head — the player runs while shooting, Lancers walk while aiming, Rushers swing while sprinting; `animator.layer(lower, upper)` beside `play(full)`
- [x] Fixed: one-shot clips restarted every step (the Rusher/Warden melee swing never played past its first frame)
- [x] Procedural layers: weapon recoil kick per shot (per-operative strength), torso hit flinch on the player and every enemy, camera shake on boss bursts/charges, reactor shockwave hits, damage taken and Warden kills — "Screen shake" toggle in Settings
- [x] Animation LOD: mixers beyond 25 m (14 m on the low tier) step at 15 Hz; count shown on the debug overlay with the avatar's layer state
- [x] Lobby: the selected pod plays a jump emote; pod heads track the camera in the lobby and behind the main menu
- [x] `test6.js`

### v2.6 — Phase 3b: Quaternius sci-fi cast
- [x] `tools/pack-quaternius.js`: gltf-transform pipeline (strip PBR maps, keep + rename clips to one vocabulary, resample, quantize, prune), pre-quantization bounds stored per model, per-pack base-colour JPEG + emissive PNG; `Assets/` folder holds the downloaded packs (not in git)
- [x] Animated Mech Pack operatives — Vanguard = Mike + Rifle, Ranger = Stan + Sniper, Bulwark = George + Revolver — tinted to the operative colour, with their own Idle / Walk_Holding / Run_Holding / Shoot / Jump / Death / Hit / Hello clips
- [x] Sci-Fi Essentials Kit enemies — Rusher + dummy = Leela (kick attack), Lancer = hovering EyeDrone, Warden = QuadShell (Charge / Attack / TurnOff) — tinted through their emissive maps + a colour cast; kit crate, health pack and ammo module as pickups
- [x] `alignGun()`: weapon orientation solved from the rig's shoot pose at build time (any mech, any gun); `poseOffset()` fixes procedural bone offsets accumulating on held poses
- [x] Lobby wave emote (`Hello`), head tracking on the new `Head` bone
- Result: ~104 draw calls / ~72k tris with 16 enemies; bundle 4.5 MB (assets 4.2 MB); all six suites green

### v2.7 — Phase 3c: human operatives (current)
- [x] Operatives from the Ultimate Modular Men/Women packs — Vanguard = Swat, Ranger = SciFi (blue hair), Bulwark = Spacesuit — with 13 of their 24 clips: idle / aim / shoot / run-and-gun / walk / run / strafe L-R / back-pedal / roll / hit / death / wave
- [x] Sci-Fi Guns pack: AR_2 / Sniper_3 / Grenade_2, `Main` accent tinted per operative; packer detects each gun's barrel end; fingers baked into the grip pose (file −25 %)
- [x] Avatar state machine: strafe / back-pedal clips from the move vector, `Run_Shoot` when firing on the move, roll on Blink, upper-body hit reaction, aim hold for 2.5 s after the last shot
- [x] Jump start / loop / land from the Universal Animation Library, retargeted onto the human rig in the packer (`tools/retarget.js`, world-space bind-pose deltas); take-off → airborne loop → landing recovery
- Result: ~110–126 draw calls / ~70k tris with 16 enemies; bundle 5.6 MB (assets 5.3 MB); all six suites green

Known gaps carried forward: no store wrappers; phone load time / frame rate unmeasured; kit Trilobite unused.

---

## 1. Performance & architecture (prerequisite for mobile)

**Goal:** 60 fps on a mid-range laptop iGPU and a stable 30+ fps on a 2021 mid-range phone, with the same file.

- [x] **Instrument first.** Add a debug overlay (`~` key): fps, draw calls (`renderer.info.render.calls`), triangles, enemy count, frame-time graph. Record a baseline on desktop and on one Android + one iPhone via remote devtools.
- [x] **Quality tiers.** `quality = 'high' | 'medium' | 'low'`, auto-picked from `devicePixelRatio`, `navigator.hardwareConcurrency`, a 2-second startup fps probe, and `matchMedia('(pointer:coarse)')`. Tier controls: pixel ratio cap (2 / 1.5 / 1), shadow map size (2048 / 1024 / off), PCFSoft vs Basic shadows, spark count, tracer count, fog distance, star count. Persist an override in settings.
- [x] **Batch enemies.** Every enemy is ~10 meshes with unique `MeshStandardMaterial`s → share materials per type, merge static parts into one geometry (`BufferGeometryUtils.mergeBufferGeometries` is in three/examples; inline it), keep only limbs as separate children. Target ≤ 4 draw calls per enemy.
- [ ] **Instance the crowd.** *(deferred — batching alone hit the draw-call budget; revisit when the alive cap is raised above ~30)* For 16–40 enemies move to `InstancedMesh` per body part with per-instance matrices updated in `update()`. Hit detection stays on the invisible hit boxes.
- [x] **Static world merge.** After a map builds, merge all `addBlock` meshes into one geometry per material (cover, walls, floor). Keep `boxes[]` as-is for collision; keep one merged mesh in `colliderMeshes` for raycasts.
- [x] **Object pools.** Sparks, tracers, projectiles and pickups currently `new` and `dispose` per event → pre-allocate pools (sparks 200, tracers 40, projectiles 120) and recycle. Zero allocations per frame in `update()` (also remove the per-frame `new THREE.Vector3()` in movement/camera; reuse scratch vectors).
- [ ] **Cheaper enemy queries.** *(deferred — LOS is already gated on the fire cooldown and the O(n²) loop is ≤ 1600 checks at the current cap; measure on a phone first)* Spatial hash (cell 4 m) for the separation loop and for projectile-vs-player tests; LOS raycasts throttled to every 6th frame per Lancer and skipped beyond 30 m.
- [x] **Fixed-step simulation.** Accumulator at 60 Hz with interpolation for rendering, so gameplay is identical at 30 and 144 fps and the headless tests stop being time-sensitive.
- [x] **Module split (dev only).** Break `arena.body.html` into `src/*.js` and produce the single-file build with a 20-line Node script (concat + minify with `terser` from npm). The shipped artefact stays one file; the source becomes maintainable. Update `HANDOFF.md` build rule.
- [ ] **Web Worker for AI (optional, measure first).** Only if the enemy loop shows >4 ms/frame on phone after batching.

**AC:** debug overlay shows ≤ 120 draw calls with 30 enemies on the arena map ✅ (~105 at the 16 cap); desktop ≥ 60 fps at 1440p high tier (**needs a check on real hardware — press ` in game**); test phone ≥ 30 fps at low tier (**needs a phone**); `test.js` passes with fixed-step ✅; no per-frame GC spikes in the Chrome performance panel (**needs a desktop profile**).

---

## 2. Playable on Android and iOS

**Goal:** the same game playable with touch on phones/tablets, installable from the home screen, and shippable to both stores.

### 2a. Touch input layer
- [x] **Input abstraction.** Replace direct `keys.*` reads with an `input` object (`move: {x,y}`, `look: {dx,dy}`, `fire`, `ability`, `reload`, `jump`, `interact`, `sprint`). Keyboard/mouse, touch and gamepad each write into it.
- [x] **Virtual controls (pointer:coarse only):** left-thumb floating joystick for movement; right half of the screen is a look-drag area (delta → yaw/pitch, sensitivity setting); buttons for Fire (hold), Ability, Reload, Jump, Interact; auto-sprint when the joystick is pushed past 85%.
- [x] **Aim assist for touch:** soft magnetism toward the nearest enemy hit box within 4° of the crosshair while firing; optional auto-fire toggle (fires when an enemy is under the crosshair). Both off on desktop.
- [x] **Gamepad support** via the Gamepad API (Xbox/PlayStation/Backbone layouts) — cheap once the abstraction exists and makes phone-with-controller the best mobile experience.
- [x] **Mobile HUD layout.** Safe-area insets (`env(safe-area-inset-*)`), larger chips, ability button doubles as its cooldown ring, hide keyboard hints, landscape-lock prompt in portrait.
- [x] **Menus without pointer lock.** `enterPlay()` requests pointer lock only on fine-pointer devices; on touch, the screens simply hide and the touch layer activates. Pause via an on-screen button.
- [x] Audio unlock on first touch (`AudioContext.resume()` inside the touchend handler); haptics via `navigator.vibrate` on hit/kill (Android only — no-op elsewhere).

### 2b. PWA (instant "app" on both platforms, no store)
- [x] `manifest.webmanifest` (name, icons 192/512 generated from an in-repo SVG, `display: fullscreen`, `orientation: landscape`), service worker that precaches the single HTML + the three.js script (so it runs offline), `apple-touch-icon` + `apple-mobile-web-app-capable` meta for iOS home-screen install.
- [ ] Host the standalone build on a static origin *(ready: push the repo and enable Pages from `/docs` — see README)* (GitHub Pages / Cloudflare Pages) — required for the SW and for store wrappers. The Claude artifact stays as the shareable demo.

### 2c. Store builds
- [ ] **Capacitor** project wrapping the hosted build (bundled locally, not remote): Android Studio → signed AAB → Google Play internal test track; Xcode → TestFlight. Plugins: StatusBar (hide), ScreenOrientation (landscape), Haptics, App (pause/resume → auto-pause the game).
- [ ] Store assets: icon, feature graphic, 6 screenshots per platform (lobby, range, run, boss, items, death), privacy label (no data collected — localStorage only).
- [ ] Battery/thermal: cap to 60 fps on mobile (`requestAnimationFrame` skip), drop to low tier automatically when frame time exceeds 33 ms for 3 s.

**AC:** full run (menu → lobby → range → wave 5 boss) completed on an Android phone and an iPhone using only touch (**needs a phone once Pages is live**); PWA installs from Safari and Chrome and launches offline (**needs a phone**); internal-test build accepted by Play Console and TestFlight (2c, not started); touch controls covered by a Playwright test that emits synthetic touch events ✅ (`test3.js`).

---

## 3. Better models

**Goal:** replace the box-people with real low-poly characters, weapons and enemies while staying within the single-file / no-external-fetch constraint for the artifact.

- [x] **Art direction** — v2.6: Quaternius Animated Mech Pack (flat colours) + Sci-Fi Essentials Kit, low-poly sci-fi, hard edges. Palette: the three operative colours on the mechs' `Main` material + enemy red/purple/gold glows. *(v2.4 shipped Kenney Mini Characters as the interim set.)*
- [x] **Pipeline.** Author or source CC0 glTF models (Kenney, Quaternius, or Blender-built), run through `gltf-transform` (`dedup`, `prune`, `weld`, `quantize`, `draco` or `meshopt`), inline `GLTFLoader` + `DRACOLoader` (three/examples, r128) into the file, embed the `.glb` as a base64 data URI. Budget: ≤ 2.5 MB of model data total so the artifact stays well under 16 MB and mobile first-load stays quick.
- [x] **Loading screen** with a progress bar (models decode asynchronously; menu can show while they stream in).
- [x] **Operatives:** one shared humanoid rig with three material/attachment variants (helmet, shoulder pads, scope) to keep the file small; per-operative weapon meshes; muzzle socket as a named empty in the glTF (replaces the hard-coded `muzzleZ`).
- [x] **Enemies:** *(tinted character variants for now; Warden is a scaled gold variant with a crest)* Rusher (quadruped or hunched biped), Lancer (tall, cannon arm), Warden (twice-height, crest, glowing core = weak point → new headshot-style multiplier). Hit boxes stay as invisible primitives sized from the mesh bounding boxes.
- [x] **Props:** crates and range targets crates, pickups (item octahedron → a floating "module" model), portals, pods, range targets.
- [x] **Materials:** one 512² palette per pack, nearest-filtered `MeshStandardMaterial` with a tiny 2-tone matcap or flat vertex colours — no PBR textures (they are the file-size killer). Emissive slots for visors, cores, portals.
- [x] Keep the procedural box models behind a `USE_FALLBACK_MODELS` flag so the game still boots if decoding fails.

**AC:** every actor rendered from glTF on all maps ✅; standalone file ≤ 6 MB ✅ (4.5 MB); artifact publishes ✅; draw calls within budget ✅ (~104); first playable frame ≤ 3 s on a phone on 4G (**needs a phone check — 4.5 MB first load, cached by the SW afterwards**).

---

## 4. New maps that change after every boss

**Goal:** Risk-of-Rain style stage progression — beat the Warden, take the portal, arrive somewhere new.

- [x] **Stage flow.** After a Warden dies a golden portal spawns; the wave loop pauses (no next wave); walking through it → stage transition screen (stage name, theme, modifier) → new map, wave counter continues, difficulty +1 tier. Optional: 20-second loot window before the portal opens.
- [x] **Map registry.** `MAPS = [{id, name, build(), theme:{fog, sky, floor, grid, light}, spawnRing, playerSpawn, modifiers}]`; stage N picks `MAPS[N % MAPS.length]` with a shuffled order per run (seeded RNG so a run can be replayed).
- [x] **Four launch maps** (all reuse `addBlock` + merged geometry; each ≤ 150 lines):
  1. **Foundry** — the current arena, retuned (warm orange lights, steam vents that block LOS).
  2. **Relay Station** — two elevated platforms with ramps (uses `supportHeight`), catwalk over a central pit that damages on fall.
  3. **Frost Array** — open ground with sparse pillars, low fog, ice patches (reduced friction), long sightlines that favour the Ranger.
  4. **Reactor Core** — circular tiered rings around a glowing core; the core pulses an expanding shockwave every 20 s that must be jumped (telegraphed).
- [x] **Stage modifiers** (one per stage, shown on the transition screen): more Lancers, faster Rushers, double crates, no repair kits, low gravity.
- [x] **Boss variants per stage:** Warden Mk.N gets one extra pattern per stage (laser sweep, summon 4 Rushers, shield phase that only the weak-point breaks).
- [x] **Enemy navigation** (the long-standing gap): coarse nav grid (1 m cells) baked at map build from `boxes[]`, A* with path caching per enemy, string-pulling for straight runs; fall back to steering when within 3 m. Required for the two multi-level maps.
- [x] **Minimap / compass strip** showing crate and portal direction — bigger maps need it.

**AC:** a run visits ≥ 3 distinct maps in one session ✅; portal only appears after a boss ✅; enemies reach the player on Relay Station's upper platform without getting stuck ✅ (headless trace: two of three Rushers at 1.3 m on the platform within ~10 s; distances fall on every map); seeded run replays the same map order ✅ (`makeRunOrder` is pure in the seed). Deviation from plan: the Relay pit and the Foundry steam vents were dropped; the catwalk became a solid bridge because the nav grid is 2.5D.

---

## 5. Better character animations

**Goal:** characters that read as alive — locomotion blends, aim, recoil, hit and death reactions — driven by the glTF rigs from phase 3.

- [x] **Animation clips** *(from the Quaternius modular packs, v2.7)*: idle, walk, run, strafe L/R, back, fire, run-and-fire, roll (ability), hit, death, wave; jump start/loop/land and pistol reload retargeted from the Universal Animation Library (reload plays as an upper-body layer, v2.7.1). Enemies: idle, run, attack, hit, death; Warden: idle, walk, charge, attack, death.
- [x] **`AnimationMixer` per actor** with a small state machine: locomotion crossfades driven by velocity (idle↔walk↔sprint), masked upper-body layer for aim/fire/attack so legs keep running while shooting *(masked split rather than additive — the clips have no neutral reference pose to make additive deltas from; strafe clips do not exist in either pack)*.
- [x] **Aim IK-lite:** torso bone pitched after the mixer update spine/head bones rotated toward the camera pitch each frame (replaces `gun.rotation.x` hack); weapon parented to the hand bone.
- [x] **Procedural layers:** recoil kick on fire, camera shake on boss burst/charge, hit-flinch via a 120 ms torso pose, ragdoll-free death (play clip, sink through the floor).
- [x] **Dummies in the range** cycle idle/walk and flinch on hit so animation can be tested without a live fight; the debug overlay (`) shows the avatar's layer state, active mixers and LOD count.
- [x] **Mobile budget:** ≤ 20 mixers active (alive cap); enemies beyond 25 m update animation at 15 Hz *(instanced crowd / VAT deferred with the alive cap)*.
- [x] **Free look + aim (v2.7.2):** idle mouse / touch drag orbits the camera round the operative (see them from the front); moving, firing, jumping or aiming snaps the operative to the camera; RMB aim pulls the camera in over the shoulder (FOV 66→50, spread ×0.6, gun held up even while walking).
- [x] **Lobby polish:** pod displays play idle + a jump emote when selected; pod heads look toward the camera (menu backdrop and lobby).

**AC:** no visible foot sliding at walk/run speeds (clip `timeScale` follows speed — **eyeball on desktop**); firing while sprinting shows both layers ✅ (`test6.js`: `sprint|holding-right-shoot`); every actor has a death animation ✅; frame budget from phase 1 still met ✅ desktop (73 calls at the cap) — **phone still unmeasured**. Open: 2nd death variant and crouch (UAL `Death01`, `Crouch_*`); reload/strafe/hit shipped with the Quaternius swap.

---

## 5b. Map texture and things to do (v2.8, in progress)

**Goal:** every map reads as a place and gives the player something to use, not just cover to hide behind.

- [x] **Props pipeline (v2.8.0):** ten Sci-Fi Essentials Kit props packed with their trim-sheet textures; `addProp` merges them into the per-sheet world meshes with optional collision; lobby, range and all four run maps dressed (lockers, shelves, desks, dishes, crate stacks, drums).
- [x] **Explosive barrels (v2.8.0):** 6–8 per map, chain-react, hurt the player too, respawn on wave clear. First "thing to do" beyond shooting robots.
- [ ] **Per-map mechanic:** Foundry steam vents on a cycle (block LOS, scorch); Relay jump pads to the platform tops + a console that calls a 20 s sentry; Frost supply beacon (hold the ring 6 s mid-wave for an item); Reactor coolant panels that shorten the pulse timer when shot.
- [ ] **Density pass:** floor decals / grime, pipes and cable trays along the walls (kit trim sheets), emissive screens on desks, hanging lights; a second prop layer per map once the phone frame rate is known (props are 2–4k tris each).
- [ ] **Ambient motion:** dish rotation, vent steam sprites, flickering panel lights; hurt-state smoke on damaged barrels.

## 6. Later / nice-to-have

- [ ] Music: procedural WebAudio loop that intensifies with wave number and on boss spawn; separate music/SFX sliders.
- [ ] Meta-progression: unlock operatives 2 and 3 by reaching wave 5 / 10; per-operative challenges; run history screen.
- [ ] Proc-style items (chain lightning, on-kill explosion, bleed) on top of the stat items — needs hooks in `dealDamage` / `killEnemy`.
- [ ] Elite enemies (glowing, 3× HP, a modifier) and a second boss type.
- [ ] Daily seeded run with a shareable score code; local leaderboard.
- [ ] Accessibility: remappable keys, colour-blind-safe enemy outlines, screen-shake and flash toggles, subtitles for audio cues.
- [ ] Co-op (2-player, WebRTC host-authoritative) — only after nav and fixed-step are in; large scope.

---

## Suggested order and rough sizing

| # | Phase | Size | Depends on |
|---|---|---|---|
| 1 | Performance & architecture ✅ | M | — |
| 2a/2b | Touch + PWA ✅ | M | 1 |
| 4 (nav + stage flow + 4 maps) | Maps ✅ | M | 1 |
| 3 | Models ✅ (Quaternius, v2.6–2.7) | L | 1 (budget), loading screen |
| 5 | Animations ✅ | L | 3 |
| 4 (more maps, per-map boss arenas) | Maps, part 2 | M | 3, 5 |
| 2c | Store builds | S–M | 2a, 2b, 3 |
| 6 | Extras | ongoing | — |

S ≈ a focused session, M ≈ several sessions, L ≈ a multi-week effort with art time.

Working rules that carry over from `HANDOFF.md`: keep `arena.body.html` (or its generated equivalent) the single
source of truth; every phase extends `test.js`/`test2.js` before it is called done; publish to the existing artifact
URL; never let the artifact fetch anything from a host outside the CDN allowlist.
