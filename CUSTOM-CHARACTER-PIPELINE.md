# Ferrous Arena — Custom Character Pipeline (fully in-house)

Your own 3D characters, modelled → rigged → animated → playable, **entirely on your own PC**. No Mixamo, no
Adobe account, no upload of anything anywhere. Every animation stays CC0, so the repo's licence posture is
unchanged and `arena.body.html` can keep shipping base64-inlined on public GitHub Pages.

Read alongside `HANDOFF.md` (code map) and `MASTER-ROADMAP.md` (the CUST lane runs these tasks).

---

## 0. The idea

**The skeleton is the contract. The mesh is free.**

You already own, on disk, everything a commercial auto-rigging service would have sold you:

- a **rig** — the Quaternius modular-human armature, 62 bones, CC0, sitting in every file under
  `Assets/Modular male/` and `Assets/modular females/`
- **24 clips already on that rig** — `Idle_Gun`, `Run_Shoot`, `Death`, `Roll`, `Run_Left/Right/Back`…
- **a second CC0 clip library** — the Universal Animation Library, which `tools/retarget.js` already knows
  how to bend onto that rig (jump, reload, and ~1,500 more you haven't touched)

So the job is not "make a rig and find animations." The job is **bind your mesh to the rig you already have**,
and everything downstream — the packer, `retarget.js`, `32-loop.js`'s state machine, the weapon mount on
`Wrist.R`, the finger-baking, the six test suites — keeps working with **zero code changes**.

`tools/blender/rig_character.py` does that binding, headless, in about six seconds.

## 1. Verified, not theoretical

This pipeline was run end to end before it was written down. A stand-in robot mesh (132 tris, built from
boxes) was bound to `Swat.gltf`'s armature and pushed through the real packer transform chain:

```
scaling mesh 1.710 m -> 1.664 m (x0.9731)
OUT       out/robot.gltf
tris      132
bones     62
clips     24 : Death,Gun_Shoot,HitRecieve,...,Walk,Wave
unweighted vertices 0

[packer chain] source 1263KB -> packed 482KB | base64 in page 643KB
               rawH 1.664 m  minY -0.000
               clips die,hit,idle,aim,shoot,roll,run,runB,runL,runR,runshoot,walk,emote
[glb] skins 1  joints 62  nodes with skin: CustomBody
      mesh attrs: JOINTS_0,POSITION,NORMAL,TEXCOORD_0,WEIGHTS_0
```

All 13 game clips arrive under their game names, the skin survives `quantize()` + `prune()`, and the output
is structurally identical to what the shipping Quaternius characters produce. The `prune: Removed types...
Skin (1)` line in the packer log is normal — the control run on the untouched `Swat.gltf` prints it too.

## 2. Install once

| Tool | Why | Note |
|---|---|---|
| **Blender 4.2+** | modelling, rigging, export | free; `rig_character.py` was verified against 4.5 LTS |
| *(optional)* **ComfyUI 3D nodes** | local image/text → mesh | you already run ComfyUI; TRELLIS / Hunyuan3D-2 fit a 5090 comfortably and never leave your PC |
| *(optional)* **blender-mcp** | let me drive Blender directly | see §8 |

Nothing else. No accounts.

## 3. Get a modelling reference

Export the bare skeleton so you can model *around* it rather than guessing proportions:

```bash
blender --background --python tools/blender/rig_character.py -- \
  --show-rig \
  --donor "Assets/Modular male/Individual Characters/glTF/Swat.gltf" \
  --out   Assets/custom/_rig_reference.gltf
```

Open that in Blender alongside your blockout. Your mesh should match its rest pose: **T-pose, facing +Z,
feet at the origin, ~1.66 m to the top of the head bone.** The closer you match it, the better the automatic
weights bind — this is the single biggest lever on quality in the whole pipeline.

## 4. Model it

Constraints that come from the engine, not from taste:

- **Biped, limbs gapped.** Bone-heat weighting assigns each vertex to nearby bones. Arms fused to the
  ribcage, or legs touching each other, produce vertices that follow the wrong bone. Leave air at the
  armpits and between the thighs.
- **≤ 6k tris, one or a few flat-colour materials, no image textures.** The bundle is base64'd into a single
  HTML file — currently **7.16 MB**, and TOOL-05 warns above 8 MB. Base64 inflates binary by 33 %, so budget
  ~250 KB packed per character (the verified test packed to 482 KB with a 132-tri mesh, so **the clips, not
  the geometry, dominate** — trimming `clips` in the packer is a bigger saving than trimming polygons).
- **Silhouette readable at 25 m** — where PERF-02's LOD swap lands and where players actually fight.
- Apply all modifiers and **all transforms** before exporting.
- Save as `.obj`, `.fbx`, `.gltf`, `.stl`, `.ply` or `.blend` — the script imports any of them.

If you generate the base mesh in ComfyUI instead of sculpting it, everything above still applies; budget
real retopo time, because generated meshes are dense and usually have fused limbs.

## 5. Bind it — one command

```bash
blender --background --python tools/blender/rig_character.py -- \
  --mesh  Assets/custom/rusher2/rusher2.obj \
  --donor "Assets/Modular male/Individual Characters/glTF/Swat.gltf" \
  --out   Assets/custom/rusher2/rusher2.gltf
```

What it does: imports the donor, keeps its armature and marks all 24 actions fake-user so they survive
export, deletes the donor's body, imports and joins your mesh, scales it to the rig and drops it so its
lowest point sits at the origin, runs **`ARMATURE_AUTO`** (Blender's bone-heat automatic weights — the same
algorithm a browser auto-rigger runs, on your machine), and exports **glTF Separate**.

Flags: `--height 1.9` to force a size, `--no-scale` to trust your authored scale, `--keep-clips idle,walk,run,...`
to ship fewer animations, `--show-rig` for the reference in §3.

**Read the last line of the output.** `unweighted vertices` **must be 0**. Anything else means part of your
mesh is bound to nothing and will hang in the air while the rest animates — go back and fix the geometry
(usually a floating armour plate or a limb welded to the torso), don't fight it downstream.

**Why glTF Separate and not `.glb`:** the packer's `loadDoc()` does
`JSON.parse(fs.readFileSync(file,'utf8'))` to strip texture references before loading, so it needs a text
`.gltf` plus a sidecar `.bin`. A binary `.glb` throws. The script already exports the right format.

## 6. Pack it

`tools/pack-quaternius.js` now has a `CUSTOM` constant and a commented template. Uncomment, set the id and
the height:

```js
custom_rusher: {file:path.join(CUSTOM,'rusher2','rusher2.gltf'), pack:'mech', clips:HUMAN_CLIPS, height:1.8, bakeFingers:true, ual:UAL_CLIPS},
```

Note what you get for free, because the rig is unchanged:

- `clips:HUMAN_CLIPS` — the donor's clip names came through, so the existing map applies verbatim
- `bakeFingers:true` — the finger regex `/^(Index|Middle|Ring|Pinky|Thumb)\d/` still matches
- `ual:UAL_CLIPS` — `retarget.js` puts jump and reload on it with no new bone map
- `pack:'mech'` — flat colours, no atlas lookup, and a model with no textures gets `packmap:false` and
  passes through `loadDoc` completely untouched
- no `drop:['Pistol']` — the script already deleted the donor's meshes

Then `node tools/pack-quaternius.js` and check the printed line: source KB → packed KB, tri count, clip list.
A missing clip name there means the donor didn't have it.

## 7. Wire it into the game

- `src/21-enemies.js` — new type: HP, speed, attack range, clip names, hitbox height
- `src/28-waves.js` — spawn table entry with a wave threshold
- `src/32-loop.js` (**loop** — one session at a time) — reuse the Rusher's state machine if it's a melee biped
- `test5.js` / `test6.js` — assert it spawns, plays its clip, and dies
- `look.js` — a screenshot scene so visual review picks it up

Acceptance: `node build.js`, then all six suites print `ERRORS: none`.

## 8. Letting me drive Blender directly

There is no Blender connector in Claude's connector directory — I checked. The way to give me hands inside
Blender is the community **blender-mcp** server (a Blender addon plus a local MCP server): you install it on
your PC, add it to the desktop app's MCP config, and its tools reach me through the device bridge as
`mcp__remote-devices__blender__*`. I could then inspect your scene, run operators, and iterate on weights
without you relaying screenshots.

Worth knowing before you set it up: **it is a third-party server that gets scripting access to Blender**, so
treat it like any local dev tool you install. And it is not required for anything above — the headless script
covers the whole pipeline, and headless scripts are more repeatable than GUI automation anyway. My honest
read: add it if you want interactive back-and-forth on a model that isn't binding well; skip it if the
one-command path is working.

The gap the script genuinely can't close is **sculpting**. Everything from "a finished mesh exists" onward is
automated and verified. Making the mesh look good is yours.

## 9. What this route can't do

**Non-bipeds.** Bone-heat weighting against a humanoid skeleton is meaningless for a drone, a spider or a
quadruped — your Lancer (EyeDrone) and Warden (QuadShell) are both in that category. Those need either
hand-placed bones in Blender or pure procedural motion in `32-loop.js` (`spinners[]` / `ambients[]`), which
is what CUST-06 covers. Start with a humanoid mech in the Leela family; it is the shape this pipeline was
built for.

## 10. Checklist

- [ ] Rig reference exported and open next to your blockout
- [ ] Mesh is a biped, gapped at armpits and thighs, T-pose, +Z, transforms applied
- [ ] ≤ 6k tris, flat material colours, no image textures
- [ ] `rig_character.py` ran and printed **`unweighted vertices 0`**
- [ ] Output landed as `.gltf` + `.bin` in `Assets/custom/<id>/`
- [ ] `PICK` entry uncommented, packer run, printed clip list complete, packed size < 250 KB
- [ ] Bundle still under 8 MB, all six suites green, `look.js` screenshot looks right
