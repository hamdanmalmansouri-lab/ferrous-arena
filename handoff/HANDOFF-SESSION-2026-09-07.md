# Ferrous Arena — session handoff (7 Sep 2026, v2.5 → v2.7)

Paste-ready brief for the next Claude Code session. Repo: `C:\Users\user\Workspace\ferrous-arena` (GitHub `hamdanmalmansouri-lab/ferrous-arena`,
Pages from `/docs`). Read `HANDOFF.md` (code map, rig facts, tuning surface, test harness) and `ROADMAP.md` (phase status) before touching code.
This file is the delta: what this session shipped, how it was verified, what is still open, and the traps that cost time.

## 1. State of the build

- **v2.7** is in the folder, built (`ferrous-arena.html`, `arena.body.html`, `docs/`), all six Playwright suites green, artifact republished.
- **Not yet pushed to GitHub.** `push.cmd` at the repo root does `git add -A && git commit && git push` — the human runs it (the previous session had no
  shell on the PC). Confirm with `git log -1` that the v2.7 commit exists before doing new work; if not, commit first.
- Bundle 5.6 MB (assets 5.3 MB), ~110–126 draw calls / ~70k tris with 16 enemies. Desktop unmeasured since the mesh change; phone unmeasured.

## 2. What was done (chronological)

| Version | Change | Key files |
|---|---|---|
| v2.5 | Phase 5 animation: lower/upper clip split (`splitClip`, `animator.layer`), recoil kick, hit flinch, camera shake (+ Settings toggle), 15 Hz animation LOD past 25 m, lobby emote + head tracking, fix for one-shot clips restarting every step | `07-models`, `32-loop`, `31-damage`, `35-screens`, `19-world`, `test6.js` |
| v2.6 | Quaternius swap #1: `tools/pack-quaternius.js` (gltf-transform), mech operatives, kit enemies (EyeDrone Lancer, QuadShell Warden, Leela Rusher), kit crate/health/ammo props, `alignGun()` (barrel solved from the rig's aim pose), `poseOffset()` (procedural bone offsets that don't accumulate on held poses) | `tools/pack-quaternius.js`, `07-models`, `20-player`, `21-enemies`, `22-effects` |
| v2.7 | Quaternius swap #2: operatives = Ultimate Modular Men/Women (Swat = Vanguard, SciFi blue-hair = Ranger, Spacesuit = Bulwark) + Sci-Fi Guns (AR_2 / Sniper_3 / Grenade_2, `Main` accent tinted per operative); 13 native clips incl. strafes, back-pedal, run-and-gun, roll (Blink), hit; fingers baked to the grip pose; barrel-end detection per gun | same + `29-shooting`, `30-abilities` |
| v2.7 | UAL jump: `tools/retarget.js` retargets Universal Animation Library clips (UE mannequin rig) onto the human rig via world-space bind-pose deltas; Jump_Start / Loop / Land wired as take-off → airborne → landing recovery | `tools/retarget.js`, `32-loop` |

Docs updated each step: `HANDOFF.md`, `ROADMAP.md`, `ATTRIBUTION.md`. Memory of design decisions lives in `HANDOFF.md §2 Models and animation` and `§7`.

## 3. Verification that exists

```
npm i three@0.128.0 playwright @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions sharp gl-matrix --no-audit --no-fund
node tools/pack-quaternius.js ./Assets     # only after changing PICK / clip maps / MAPS / UAL_CLIPS (~60 s)
node build.js
node test.js; node test2.js; node test3.js; node test4.js; node test5.js; node test6.js   # all must print ERRORS: none
```
Visual checks are headless screenshots: `look.js` (operative portraits: idle + run-and-fire), plus ad-hoc `look2..6.js` in the previous session
(not committed except `look.js`). `diag*.js` measured gun axes — rewrite as needed. `Assets/` (≈270 MB of packs) is git-ignored and must exist locally
for the packer; the human downloaded: Animated Mech Pack, Sci-Fi Essentials Kit (Standard), Universal Animation Library (Standard), Ultimate Modular
Men + Women, Sci-Fi Guns.

## 4. Open work, in value order

1. **Push + phone pass** — run `push.cmd`; then play the Pages build on the Android PWA: load time (5.6 MB first load, SW-cached after), frame rate at
   the alive cap (16), touch feel. Roadmap phases 1 and 2 still have "needs a phone" acceptance items.
2. **Desktop feel pass** (human decides): jump take-off timing (`airT<0.32`, 2.4× rate), landing recovery 0.55 s, shake amplitudes, Warden size 2.3,
   gun grip offsets (`MOUNTS[id].pos` in `20-player.js` if a grip floats).
3. ~~**Reload animation**~~ — shipped in v2.7.1 (8 Sep): `Pistol_Reload` retargeted, upper-body layer while `player.reloading>0`, `test6.js` covers it;
   `tools/fetch-quaternius.js` now downloads the packs so any machine can repack. Other UAL candidates: `Hit_Chest/Hit_Head` (better than the native HitRecieve), `Crouch_*`, `Death01` (2nd death variant), `Roll`.
4. **Enemies from richer rigs** — Sci-Fi Kit `Trilobite` (has `Gun.L`, `AttackAuto`) is unpacked: natural elite / second Lancer. Roadmap §6 elites.
5. **Performance headroom** — mechs/humans are 7–10k tris; `gltf-transform simplify` (meshopt) on guns and a smaller far-LOD are the cheap levers
   before raising the alive cap; profile on a phone first.
6. **Store wrappers (2c)** — untouched; needs the human's developer accounts + a Mac for iOS.
7. Roadmap §6 extras (music, meta-progression, proc items, daily seed, accessibility) — untouched.

## 5. Traps that cost time this session (read before editing animation code)

- **timeScale 0 stops the mixer writing a bone** (`isRunning()` false) — use 0.02 for a "frozen" pose.
- **The mixer only rewrites a bone when its blended value changes.** Any per-frame procedural `bone.rotation.x -= a` accumulates on a held pose.
  Always go through `poseOffset(bone, axis, angle)` (`07-models`).
- **Quantized skinned meshes bake the dequantize transform into the bind matrices**, so `Box3.setFromObject` on a character is meaningless; the packer
  stores pre-quantization bounds in `raw` and the game scales from those. Guns (unskinned) measure fine — but measure **before** mounting them.
- **GLTFLoader strips dots from node names** (`Wrist.R` → `WristR`).
- **Each modular character's glTF "rest" pose is an arbitrary captured frame**, not the T-pose; the true bind pose is only in `inverseBindMatrices`
  (`tools/retarget.js` uses those). `Foot.L/R` are IK-style bones parented to `Root`, animated by their own tracks.
- **Sci-Fi Guns are modelled at ~2× human scale** (`GUN_MOUNT.scale` 0.5); their barrel is +X, the Sci-Fi Kit guns' was −X — the packer now detects it.
- Headless Chromium advances ~0.13 s of sim per real frame; one-shot clips need long waits in tests (see `test6.js`).
- The artifact URL is shared with other sessions: `Artifact read` before publishing, or the publish is refused as stale.

## 6. Constraints (unchanged)

Single self-contained HTML, three r128 non-module from cdnjs, no external fetches, `arena.body.html` has no doctype/head/body, never edit
`src/06-assets.js` by hand, loop code reads only `inp`, no dynamic lights on transient objects, every map builder ends with `finalizeWorld()`.
