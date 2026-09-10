# Third-party assets

- **Quaternius — Ultimate Modular Men Pack / Ultimate Modular Women Pack** (Swat, Spacesuit, SciFi individual characters with their animation clips) — CC0 1.0 (public domain).
  https://quaternius.com · Packed by `tools/pack-quaternius.js` into `src/06-assets.js` (13 of 24 clips kept and renamed to a shared vocabulary, the
  placeholder pistol mesh removed, finger bones baked to the grip pose, resampled, quantized).
- **Quaternius — Universal Animation Library (Standard)** (Jump_Start, Jump_Loop, Jump_Land, retargeted onto the modular rig by `tools/retarget.js`) — CC0 1.0.
- **Quaternius — Sci-Fi Guns pack** (AR_2, Sniper_3, Grenade_2) — CC0 1.0. `Main` accent material recoloured per operative at runtime.
- **Quaternius — Animated Mech Pack** (Leela — Flat Colors variant, with her animation clips; used for the Rusher and range dummies) — CC0 1.0.
- **Quaternius — Sci-Fi Essentials Kit (Standard / free version)** (Enemy_EyeDrone, Enemy_QuadShell, Prop_Crate, Prop_HealthPack, Prop_Ammo_Small, plus the base-colour and emissive maps of those packs) — CC0 1.0.
  https://quaternius.com · Normal / ORM maps dropped; base colour downscaled to 512–1024 px JPEG, emissive to 256 px PNG, one map per pack shared by
  every model of that pack.
- **three.js r128** (MIT) — core via cdnjs; `GLTFLoader` and `SkeletonUtils` from `examples/js` inlined in `src/05-gltfloader.js`.

Earlier versions: ≤ v2.5 Kenney Mini Characters + Blaster Kit (CC0, `tools/pack-assets.js`); v2.6 the Animated Mech Pack operatives (Mike, Stan, George) and Sci-Fi Kit guns.

## v3.0.0-p7 roster note

Sable, Ember and Arclight (v3.0) reuse the packed Quaternius Ultimate Modular Women (SciFi) / Ultimate Modular Men (Spacesuit, Swat)
rigs and the Sci-Fi Guns AR_2 / Grenade_2 / Sniper_3 meshes, recoloured at runtime by material name. No new assets were packed, so
the bundle stays under 9 MB; a later repack with lighter clip sets could give each of them a unique body.
