# Ferrous Arena — Master Roadmap

The single backlog for the game, split by sector and tagged so several Claude Code sessions can work in parallel.
`ROADMAP.md` is the phase history (what shipped when); `HANDOFF.md` is the code map. **This file is the to-do list.**

Current build: **v3.0.0-p4** (10 Sep 2026) — v3.0 "Meltdown" pass in progress (see the V3 table below). v2.8.0 (8 Sep 2026): Quaternius cast, UAL jump + reload, free look + RMB aim, kit props merged into the world, explosive barrels.

## V3 — "Meltdown" pass (one-shot prompt, 10 Sep 2026)

Seven phases, each a clean cut with its own gate and commit. Rows here are ticked per phase; sector rows below that a phase absorbs are ticked at the same time.

| Tag | Phase | Status |
|---|---|---|
| **V3-P1** `[x]` v3.0.0-p1 | **Correctness.** Muzzle-origin two-stage fire trace; player i-frames 0.35 s + melee token pool (3); lifesteal overkill clamp; omnidirectional sprint (0.8×); CDR floor 0.45; Barrier = 45 % max HP; cached cast list + slab-test world/camera/LOS rays; `timers[]` replaces every gameplay `setTimeout`; build syntax-checks before writing, `<title>` in `<head>`; three.js vendored into `site/` (SW precache, no CDN; standalone inlines it); Warden subtitle from `mk` flags; hurt pop on the model child; per-pellet accuracy; hostiles = on-field + queued; generated HTML untracked. Gate suite `test7.js`. | done |
| **V3-P2** `[x]` v3.0.0-p2 | **Roguelite loop.** Every item is a pick of 1 from 3 (paused card: 1/2/3 keys, tap targets, D-pad + A); `tier` common/rare/legendary at 70/25/5 drives the roll, codex grouping and chip borders (+2 legendaries so the tier exists); scrap credited per kill (Rusher 3 / Lancer 5 / Elite 12 / Warden 60) and a Fabricator per stage (60 offer / 120 rare offer / 200 reroll a held stack); enemy HP `(34+8w)(1+0.018w)`, melee/projectile growth capped at wave 22; wave break 2.5 s on a sub-20 s clear, 4.5 s otherwise, 6 s after a Warden; `REGEN_RATE` 4. Gate suite `test8.js`. | done |
| **V3-P3** `[x]` v3.0.0-p3 | **Art foundation.** `setTheme(rig)` → `applyRig` (sun / rim / hemisphere / exposure / fog per map: Foundry sodium key + cold fill, Relay neutral high key, Frost flat overcast + heavy fog, Reactor near-black + magenta rim); `buildSky(stops, stars, silhouette)` with one unlit extruded band per map (stacks / masts / ridge / towers); `LADDER` albedos calibrated so the gameplay view lands floor 0.10 / cover 0.21 (walls derived at 0.32) sRGB, operatives ~0.45–0.55 via `CHAR_BOOST` self-light; `addRim` inflated back-face additive shell on every character (bind-matrix inflation on skinned meshes, off on low); Vanguard navy + emissive visor + chest stripe; `MOUNTS` with barrel-axis `back`/`up` per operative; camera shoulder 1.05, dist 4.4, pivot +0.15, aim FOV delta 10, 4° yaw lead. `look.js` now shoots every map + sky and prints the ladder. | done |
| **V3-P4** `[x]` v3.0.0-p4 | **Game feel.** Pooled damage numbers (24, white / gold crit / red head, 0.7 s); hit-stop scales the sim accumulator 60 ms (Warden 140 ms); corpses dissolve (emissive ramp + shrink + rim flare, 0.8 s); per-weapon muzzle sprite (star / lance / bloom), tracer width + colour, scorch decals on world hits; HUD system on an 8 px grid, 10 px radius, 28 / 15 / 11 type — wide integrity bar bottom-left, magazine hero + capacity bottom-right, wave + Warden-in top-centre, two-line colour-coded feed bottom-centre, score / kills / stage moved to the pause and death screens, no placeholder values; lobby: three-point rig per pod, turntable on the selected operative, hangar corridor backdrop with a vanishing point, extruded bevelled title, stat + ability card beside each pod. Gate suite `test9.js` (10 s wave-5 capture). ANIM-07 (signature idles, repack) not included. | done |
| **V3-P5** `[ ]` | **Evolutions.** Forge Cores, ten item evolutions, operative ascensions. (absorbs GP-07) | |
| **V3-P6** `[ ]` | **Meltdown Protocol.** Director mode, reactor charge, Core Shards, extraction win, scoring + score code, Trials. (absorbs GP-10) | |
| **V3-P7** `[ ]` | **Roster.** Rebalance + passives, Sable / Ember / Arclight, unlock ladder, assets. (absorbs GP-11) | |


---

## How to run a task in its own session

1. Start the session with: *"Read HANDOFF.md and MASTER-ROADMAP.md, then do task `<TAG>`."* One tag per session.
2. `git pull`, then `npm install --no-audit --no-fund`. Only tasks marked **repack** need `node tools/fetch-quaternius.js` (≈310 MB into `Assets/`, once per machine).
3. Work on a branch named after the tag (`gp-01-foundry-vents`). Commit small, push the branch, merge to `main` when the acceptance line is met.
4. Before merging: `node build.js` then all suites `node test.js … test6.js` print `ERRORS: none`. Add or extend a check in the suite named in the task.
5. On merge: tick the task here (`[x]`, version, one line of what changed), republish `arena.body.html` to the artifact, `git push` (Pages redeploys from `docs/`).
6. **Conflict rules.** `src/06-assets.js` is generated: never merge it, re-run the packer on `main` instead. `src/32-loop.js` is the hot file — tasks that touch it are marked **loop**; run at most one of those at a time. Two sessions may share a map builder only if they edit different maps.

Sizes: **S** = one focused session, **M** = 2–3 sessions, **L** = multi-session with art time. Status: `[ ]` open · `[~]` in progress (write the session date) · `[x]` done.

---

## GP — Gameplay

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **GP-01** `[ ]` | **Foundry steam vents.** 4 vents on a 9 s cycle: 1.5 s hiss warning, 2.5 s column (blocks `lineOfSight`, 12+wave×0.4 dmg/s to anyone inside, pushes enemies out). Additive sprite column, no lights. | S | `19b-maps` (Foundry), `32-loop` **loop**, `24-math-helpers` (LOS), `test4` | Vent visible + damages the player standing in it; a Lancer behind a live vent stops firing; `test4` asserts both. |
| **GP-02** `[ ]` | **Relay jump pads + sentry console.** Two pads at the stair feet launch you to the platform top (vel.y set, glow ring). A desk on each platform is an interactable: E calls a sentry drone (reuse `enemy_drone` mesh, blue) that shoots enemies for 20 s, 60 s cooldown. | M | `19b-maps` (Relay), new `28b-allies`, `32-loop` **loop**, `25-hud` (cooldown chip), `test4` | Pad lands the player on y=3; sentry kills a Rusher in the harness; cooldown shown. |
| **GP-03** `[ ]` | **Frost supply beacon.** One beacon ring (r 3 m) per wave at a random open cell. Stand inside 6 s (bar in HUD, resets when you leave) → item drop; Rushers get +20 % speed toward the beacon while it's armed. | S | `19b-maps` (Frost), `28-waves`, `32-loop` **loop**, `25-hud`, `test4` | Beacon completes in the harness and drops an item; leaving the ring resets the bar. |
| **GP-04** `[ ]` | **Reactor coolant panels.** 4 shootable panels on the tier corners; each hit shortens `mapData.pulse.t` by 4 s (min 1 s) so the player picks when the shockwave fires; panels reset after the pulse. | S | `19b-maps` (Reactor), `29-shooting` (hit route like barrels), `test4` | Shooting a panel changes `pulse.t`; panel re-arms after a pulse. |
| **GP-05** `[ ]` | **Elite enemies.** 8 % of spawns from wave 4: glow outline, 3× HP, one modifier (fast / tanky / splitter). Uses the Sci-Fi Kit `Enemy_Trilobite` (`Gun.L`, `AttackAuto`) as a second ranged type. **repack** | M | `tools/pack-quaternius` (PICK), `21-enemies`, `28-waves`, `test5` | Trilobite spawns, shoots, dies with its own clip; elite outline visible; `test5` counts one. |
| **GP-06** `[ ]` | **Second boss.** "Colossus" (scaled Trilobite or QuadShell variant) alternates with the Warden on boss waves: ground slam (jump it) + laser sweep telegraphed 1 s. | M | `21-enemies`, `28-waves`, `32-loop` **loop**, `test` | Wave 10 spawns the Colossus; both patterns fire in the harness. |
| **GP-07** `[ ]` | **Proc items.** Chain Lightning (hit arcs 40 % dmg to 2 enemies within 6 m), Detonator (kills explode, 30 % of max HP in 3 m), Bleed (5 %/s for 3 s). Hooks in `dealDamage` / `killEnemy`; codex entries. | M | `13-data-items`, `26-items`, `29-shooting`, `35-screens`, `test` | Each proc fires once in the harness; codex lists them. |
| **GP-08** `[ ]` | **Barrel tuning + hurt state.** Barrels get 2 HP: first shot smokes (sprite), second blows; self-damage tuned with the human. | S | `19-world` (barrels), `test6` | Two-stage barrel in the harness. |
| **GP-09** `[ ]` | **Aim on gamepad + touch.** LT = aim (ability moves to LB only); a hold-to-aim button on touch next to FIRE. Aim assist stronger while aiming. | S | `23b-input-state`, `34b-touch`, `markup/styles`, `test3` | `inp.aim` true from pad LT and the touch button; `test3` asserts FOV drops. |
| **GP-10** `[ ]` | **Daily run + local leaderboard.** Seed = date; "Daily" button on the menu; best 10 runs per seed in localStorage with a shareable score code. | S | `35-screens`, `33-mode-transitions`, `15-persistence`, `test` | Daily seed replays the same map order; score code round-trips. |
| **GP-11** `[ ]` | **Meta-progression.** Ranger unlocks at best wave 5, Bulwark at 10; per-operative challenge chips on the pod; run history screen. | M | `12-data-characters`, `27-characters`, `35-screens`, `15-persistence`, `test` | Locked pods show the requirement; unlock persists. |

## MAP — Maps and environment

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **MAP-01** `[ ]` | **Density pass.** Pipes and cable trays along the walls (box strips with trim-sheet UVs or kit props), hanging light fixtures (emissive quads), floor grime decals (alpha planes). Budget: +30 % tris max per map. | M | `19-world` (helpers), `19b-maps` (all four — coordinate with GP-01..04 by map) | Screenshot per map in `look.js`; draw calls ≤ 100 at the cap. |
| **MAP-02** `[ ]` | **Ambient motion.** Dishes rotate slowly, vent steam idles, panel lights flicker, barrels wobble when hit. All through `spinners[]` or a new `ambients[]` ticked once per step. | S | `19b-maps`, `32-loop` **loop** | Visible in a 3 s headless clip; zero allocations per frame. |
| **MAP-03** `[ ]` | **Fifth map — "Hangar".** Long hall, two rows of crate stacks as lanes, a raised gantry at one end (stairs), rolling shutter that opens mid-wave to release a Rusher pack. | M | `19b-maps`, `test4` | Nav trace passes like the other maps; shutter releases enemies. |
| **MAP-04** `[ ]` | **Per-map boss arenas.** Boss waves clear the central cover and raise a ring wall so the Warden fight is a defined arena on every map. | S | `28-waves`, `19b-maps` | Arena builds on wave 5 and reverts on the next wave. |
| **MAP-05** `[~]` v3.0.0-p4 (V3-P4 scope: lighting, turntable, backdrop, title, stat cards; consoles + trophy wall open) | **Lobby overhaul.** Consoles that open Settings / Codex in-world (interactables), a trophy wall for best wave/stage, the operative pods get a floor plate with the ability icon. | S | `19-world` (lobby), `35-screens` | Both consoles open their screens via E. |
| **MAP-06** `[x]` v3.0.0-p3 (V3-P3) | **Skyboxes per map.** Cheap: gradient dome + star density + one silhouette band (foundry stacks, relay masts, frost ridge, reactor towers). | S | `18-renderer-scene`, `19b-maps` | Each map's screenshot shows its band; no external textures. |

## ANIM — Animation

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **ANIM-01** `[ ]` | **UAL hit reactions.** `Hit_Chest` / `Hit_Head` (retargeted) replace the native `HitRecieve`; pick by whether the hit was high. **repack** | S | `tools/pack-quaternius` (UAL_CLIPS), `32-loop` **loop**, `test6` | Both clips present; `test6` sees `idle|hitchest`. |
| **ANIM-02** `[ ]` | **Second death.** `Death01` from the UAL; operatives alternate death clips. **repack** | S | packer, `35-screens` (game over uses the avatar) | Death variant alternates in two harness deaths. |
| **ANIM-03** `[ ]` | **Crouch.** `Crouch_Idle/Walk` from the UAL, C toggles; hit box shrinks, spread ×0.8, speed ×0.55. **repack** | M | packer, `23b-input-state`, `32-loop` **loop**, `20-player`, `test6` | Crouch pose in the harness; enemy shots over a crouched player miss. |
| **ANIM-04** `[ ]` | **Locomotion polish.** Foot-slide check at walk/run (clip `timeScale` vs speed), strafe blend when moving diagonally, aim-walk clip crawl rate. Human eyeballs it; the harness only checks the state machine. | S | `32-loop` **loop** | Human sign-off + `test6` unchanged. |
| **ANIM-05** `[ ]` | **Enemy telegraphs.** Rusher wind-up pose 0.3 s before the kick, Lancer `charge` glow before a shot, Warden burst has a visible spin-up. | S | `32-loop` **loop**, `21-enemies` | Telegraph clip plays before each attack in `test6`. |
| **ANIM-06** `[ ]` | **Animation debug panel.** Second line in the ` overlay: player slots (`full/lower/upper`), weights, clip times; F9 cycles the player through every clip. | S | `32-loop` (debug), `07-models` | Panel shows the three slots. |
| **ANIM-07** `[ ]` | **Lobby idles.** Per-operative signature idle (Vanguard checks the rifle, Ranger scopes, Bulwark shoulder roll) from the modular packs' spare clips. **repack** | S | packer, `19-world` (pods) | Each pod plays a different idle. |

## SFX — Sound and music

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **SFX-01** `[ ]` | **Procedural music.** WebAudio loop (bass pulse + arps) whose layers ramp with wave number, boss layer on boss spawn, drops out on death; starts after the first input. | M | `16-audio`, `28-waves`, `31-damage` | Layers audible in the browser; no clicks at loop points; `test` checks the graph exists. |
| **SFX-02** `[ ]` | **Music / SFX sliders.** Separate gains, persisted, in Settings. | S | `16-audio`, `23b-input-state` (SETTINGS), `35-screens`, `test5` | Slider values persist and change the gains. |
| **SFX-03** `[ ]` | **Map sounds.** Barrel blast layered (thump + debris), vent hiss, beacon hum, coolant panel ping, reactor charge whine. | S | `16-audio` (`SFX`), callers in `19-world` / `19b-maps` | Each has an `SFX.*` entry and a caller. |
| **SFX-04** `[ ]` | **Footsteps.** Step cadence from the locomotion `timeScale`; surface variants (metal, ice, grating) from `mapData`. | S | `32-loop` **loop**, `16-audio` | Steps audible at walk/run; ice sounds different. |
| **SFX-05** `[ ]` | **Enemy cues.** Rusher growl on wind-up, Lancer charge tone, Warden roar on charge; positional volume by distance. | S | `16-audio`, `32-loop` **loop** | Cue fires before each attack. |
| **SFX-06** `[ ]` | **Audio subtitles.** Toggle in Settings: one-line captions for cues ("Warden charging", "Shockwave") in the feed. | S | `25-hud`, `35-screens`, `23b-input-state` | Captions appear when the toggle is on. |

## ART — Visual effects and materials

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **ART-01** `[x]` v3.0.0-p4 (V3-P4; shell-eject sparks not done) | **Muzzle + tracers.** Per-weapon flash sprite (rifle star, sniper lance, cannon bloom), tracer width by weapon, shell-eject sparks. | S | `22-effects`, `29-shooting`, `20-player` | Screenshot per operative firing. |
| **ART-02** `[ ]` | **Explosion sprite sheet.** Canvas-generated 4×4 sheet for barrels, boss death, Detonator; pooled, additive. | S | `22-effects`, `19-world` (barrels) | Explosion animates over 0.5 s; pool never allocates. |
| **ART-03** `[x]` v3.0.0-p4 (V3-P4) | **Damage numbers.** Floating numbers on hits (white / gold crit / red head), capped to 24 on screen, pooled canvas sprites. | S | `22-effects`, `29-shooting` | Numbers visible; no allocations per hit. |
| **ART-04** `[ ]` | **Emissive screens.** Desks and consoles get animated canvas textures (scrolling telemetry), one shared texture per map. | S | `19-world` (props), `19b-maps` | One extra texture per map; screens animate. |
| **ART-05** `[ ]` | **Prop simplification.** `gltf-transform simplify` on props and guns (target −40 % tris), verify silhouettes in `look.js`. **repack** | S | `tools/pack-quaternius` | Bundle smaller, screenshots unchanged to the eye. |

## CUST — Custom characters (your own models)

Route: **fully in-house** — model in Blender, bind to the CC0 Quaternius armature you already own with
`tools/blender/rig_character.py`, pack. No cloud services, no Adobe account, every clip stays CC0.
Read `CUSTOM-CHARACTER-PIPELINE.md` before starting any CUST task. Bone-heat weighting only works against a
humanoid skeleton, so characters in this lane are **bipeds** (the Leela mech is the reference silhouette);
drones and quadrupeds go to CUST-05.

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **CUST-01** `[x]` v2.8.0 | **Local rigging tool.** `tools/blender/rig_character.py` — headless Blender: imports a donor Quaternius `.gltf`, keeps its armature + 24 actions, deletes its body, imports/joins/scales your mesh, `ARMATURE_AUTO` bone-heat bind, exports glTF Separate. `--show-rig` emits a bare-skeleton modelling reference. Packer gained a `CUSTOM` dir constant + a commented `PICK` template. | S | `tools/blender/` (new), `tools/pack-quaternius` | **Done.** Verified on a 132-tri stand-in: 62 bones, 24 clips, 0 unweighted vertices; through the real packer chain → all 13 game clips, skin intact (1 skin / 62 joints / JOINTS_0+WEIGHTS_0), 482 KB packed. |
| **CUST-02** `[ ]` | **First custom enemy — model it.** Bipedal mech-creature, ≤ 6k tris, flat material colours, no maps, modelled against the `--show-rig` reference (T-pose, +Z, feet at origin), limbs gapped at armpits and thighs. Bind with CUST-01's script until it prints `unweighted vertices 0`. **Human art time — this is the task that needs you at the keyboard.** | L | `Assets/custom/<id>/`, art only | `Assets/custom/<id>/<id>.gltf` + `.bin` exist; script prints 0 unweighted vertices. |
| **CUST-03** `[ ]` | **Pack it.** Uncomment the `PICK` template, set id + `height`. `clips:HUMAN_CLIPS`, `bakeFingers:true`, `ual:UAL_CLIPS` all apply unchanged because the rig is the stock one. **repack** | S | `tools/pack-quaternius` | Packer prints the id with all 13 clips + the UAL retargets; packed < 250 KB; bundle still < 8 MB. |
| **CUST-04** `[ ]` | **Wire it in.** New enemy type in `21-enemies` (HP / speed / range / hitbox), spawn entry in `28-waves`, state machine reused from the Rusher, `look.js` scene. | M | `21-enemies`, `28-waves`, `32-loop` **loop**, `look.js`, `test5`, `test6` | Spawns, chases, attacks, takes damage and dies in the harness; screenshot in the gallery. |
| **CUST-05** `[ ]` | **Non-biped path.** Drones/quadrupeds can't bone-heat against a humanoid rig: hand-place bones in Blender or drive them procedurally in `32-loop` (`spinners[]` / `ambients[]`). Decide per creature and document the choice. | M | `19-world`, `32-loop` **loop**, `21-enemies` | One non-biped custom enemy moves convincingly. |
| **CUST-06** `[ ]` | **Custom textures (optional).** If flat colours aren't enough: own atlas in the packer's `MAPS`, `sharp` resize entry, `extras.packmap` key through `loadDoc`. Only after CUST-02..04 ship. | M | `tools/pack-quaternius`, `07-models` | Custom atlas re-attaches at load; bundle grows < 400 KB. |
| **CUST-07** `[ ]` | **Clip budget.** The verified pack showed animation data dominates a custom character (482 KB for a 132-tri mesh). Add a per-model `clips` subset for enemies that never strafe, and measure. **repack** | S | `tools/pack-quaternius` | Enemy models pack ≥ 30 % smaller with no visible loss. |

## UI — HUD, screens, accessibility

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **UI-01** `[ ]` | **Run summary.** Death screen adds accuracy, damage dealt/taken, barrels blown, items timeline; best-run comparison. | S | `35-screens`, `23-state` (acc) | Numbers match the state at death. |
| **UI-02** `[ ]` | **Minimap.** Top-right canvas: walls from `boxes[]`, enemies, crates, portal; replaces the compass strip on desktop, compass stays on touch. | M | `25-hud`, `32-loop` **loop** | Minimap renders each map; ≤ 1 ms per frame. |
| **UI-03** `[ ]` | **Remappable keys.** Settings page lists actions, click to rebind, persisted; gamepad layout picker. | M | `34-input`, `23b-input-state`, `35-screens`, `test5` | Rebinding W→I moves forward with I. |
| **UI-04** `[ ]` | **Accessibility toggles.** Colour-blind enemy outlines (per-type shapes above the head), flash reduction, larger HUD scale. | S | `35-screens`, `styles.css`, `21-enemies` | Each toggle persists and changes the render. |
| **UI-05** `[ ]` | **Onboarding.** First run: three contextual prompts (free look, aim, barrels) that dismiss on use. | S | `25-hud`, `15-persistence` | Prompts show once. |

## PERF — Performance

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **PERF-01** `[ ]` | **Phone profile.** Play the Pages build on Android (and iOS if available): load time at 7 MB, fps at the alive cap on each map, touch feel. Record numbers in `HANDOFF §6`. Blocks PERF-03/04. | S (needs a phone) | docs only | Table of fps per map per tier. |
| **PERF-02** `[ ]` | **Far LOD for characters.** Simplified mesh past 25 m (meshopt simplify at pack time, swap by distance). **repack** | M | packer, `07-models`, `32-loop` **loop** | Tris at the cap drop ≥ 30 % with 16 enemies at 30 m. |
| **PERF-03** `[ ]` | **Raise the alive cap** to 24 after PERF-01/02, retune wave counts. | S | `28-waves`, `32-loop` | 24 enemies ≤ 120 draw calls; phone ≥ 30 fps at low. |
| **PERF-04** `[ ]` | **Spatial hash** for enemy separation and projectile-vs-player; LOS throttled per Lancer. | S | `32-loop` **loop**, `21b-nav` | Enemy loop time halves at 24 enemies (perf overlay). |
| **PERF-05** `[ ]` | **Texture budget.** Trim sheets to 256 px where the prop is small; measure bundle and first-frame time. | S | packer | Bundle −0.5 MB, no visible loss. |

## MOB — Mobile and platforms

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **MOB-01** `[ ]` | **Phone pass.** Full run menu → lobby → range → wave 5 on Android with touch; PWA installs and launches offline. Fix what breaks. | S (needs a phone) | `34b-touch`, `styles.css` | Roadmap phase 2 AC ticked. |
| **MOB-02** `[ ]` | **Capacitor wrapper.** Android project bundling `docs/`, StatusBar/ScreenOrientation/Haptics/App plugins, signed AAB to an internal test track. | M (needs accounts) | new `native/` | Play Console accepts the build. |
| **MOB-03** `[ ]` | **Store assets.** Icon, feature graphic, 6 screenshots per platform from `look.js` scenes, privacy label. | S | `site/`, `tools/` | Assets folder complete. |
| **MOB-04** `[ ]` | **Battery cap.** 60 fps cap on mobile, auto-drop to low tier after 3 s over 33 ms. | S | `32-loop` (frame), `17-quality-tiers` | Cap measurable in the overlay. |

## TOOL — Tooling and infrastructure

| Tag | Task | Size | Touches | Acceptance |
|---|---|---|---|---|
| **TOOL-01** `[ ]` | **`npm test`.** One script runs build + the six suites, prints a pass/fail table, exits non-zero on any `ERRORS`. | S | `package.json`, new `tools/run-tests.js` | `npm test` green on main. |
| **TOOL-02** `[ ]` | **Screenshot gallery.** `tools/gallery.js` renders the standard scenes (each map from above and ground, each operative idle/aim/reload) into `Claude outputs/` for visual review. | S | `tools/` | One command, 15 PNGs. |
| **TOOL-03** `[ ]` | **CI.** GitHub Actions: install, build, run the suites with Playwright's Linux Chromium, upload screenshots. | S | `.github/workflows/` | Green check on push. |
| **TOOL-04** `[ ]` | **Skinned props.** Let `addProp` merge skinned kit props (the animated Chest) by baking the bind pose; or bake in the packer. **repack** | S | `19-world`, packer | Chest renders correctly merged. |
| **TOOL-05** `[ ]` | **Bundle report.** Packer prints per-model share of the bundle and warns above 8 MB. | S | packer | Report line at the end of a pack run. |

---

## Suggested parallel lanes

Sessions that do not collide (different files):

- **Lane A (loop owner):** GP-01 → GP-03 → ANIM-05 → SFX-04. One at a time; these all edit `32-loop.js`.
- **Lane B (maps):** MAP-01 on Foundry/Relay while Lane A is on Frost/Reactor, then MAP-03, MAP-06.
- **Lane C (content):** GP-07 → GP-10 → GP-11 (items, screens, persistence).
- **Lane D (audio):** SFX-01 → SFX-02 → SFX-03 → SFX-06.
- **Lane F (custom art):** CUST-01 done → **CUST-02 (your art time)** → CUST-03 → CUST-04. CUST-02 blocks the rest; nothing else in the file touches `Assets/custom/`.
- **Lane E (tooling):** TOOL-01 → TOOL-03 → TOOL-02, then ART-05 / PERF-05 (packer, repack on main only).
- **Needs a phone:** PERF-01 → MOB-01 → MOB-04; everything in PERF after that.

Dependencies: GP-02's sentry needs an allies list (new file, no conflict). GP-05/06 share `21-enemies` — run in sequence. ANIM-01/02/03/07 and ART-05/PERF-02 all repack — sequence them and repack on `main`.

---

## Done (since this file started)

- v2.8.0 (8 Sep 2026): props pipeline, set dressing on all maps, explosive barrels, kit textures fixed — see `ROADMAP.md §5b`.
