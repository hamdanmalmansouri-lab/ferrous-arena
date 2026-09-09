"""Bind your own mesh to a CC0 Quaternius armature and export a game-ready glTF. Fully local — no cloud services.

  blender --background --python tools/blender/rig_character.py -- \
      --mesh  Assets/custom/rusher2/rusher2.obj \
      --donor "Assets/Modular male/Individual Characters/glTF/Swat.gltf" \
      --out   Assets/custom/rusher2/rusher2.gltf

The donor supplies the skeleton AND its animation clips; your mesh supplies the geometry. Because the donor's
bind pose is never touched, every clip in the donor file — and every UAL clip tools/retarget.js knows how to
retarget onto that rig — plays correctly on your model with no further work.

Model your mesh around the donor's rest pose (T-pose, facing +Z, feet at the origin). Use --show-rig once to
export the bare skeleton as a reference you can model against.
"""
import bpy, sys, os, math, argparse

def parse():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument('--mesh', help='your model: .obj .fbx .gltf .glb .stl .ply .blend')
    p.add_argument('--donor', required=True, help='CC0 .gltf supplying the armature + clips')
    p.add_argument('--out', required=True, help='output .gltf (glTF Separate; writes a sidecar .bin)')
    p.add_argument('--height', type=float, default=0.0, help='metres; scale the mesh to this before binding (0 = match the rig)')
    p.add_argument('--keep-clips', default='', help='comma-separated clip names to keep (default: all)')
    p.add_argument('--show-rig', action='store_true', help='export the donor armature alone, as a modelling reference')
    p.add_argument('--no-scale', action='store_true', help='trust the mesh scale exactly as authored')
    return p.parse_args(argv)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_any(path):
    """Import by extension; return the objects that arrived."""
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.gltf', '.glb'):   bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.fbx':            bpy.ops.import_scene.fbx(filepath=path)
    elif ext == '.obj':            bpy.ops.wm.obj_import(filepath=path)
    elif ext == '.stl':            bpy.ops.wm.stl_import(filepath=path)
    elif ext == '.ply':            bpy.ops.wm.ply_import(filepath=path)
    elif ext == '.blend':
        with bpy.data.libraries.load(path) as (src, dst): dst.objects = src.objects
        for o in dst.objects:
            if o is not None: bpy.context.scene.collection.objects.link(o)
    else: raise SystemExit('unsupported mesh format: ' + ext)
    return [o for o in bpy.data.objects if o not in before]

def bbox_height(objs):
    zs = [(o.matrix_world @ v.co).z for o in objs if o.type == 'MESH' for v in o.data.vertices]
    return (max(zs) - min(zs)) if zs else 0.0

def join(objs, name):
    """Join every mesh in objs into one object (auto-weights binds per object; one object is predictable)."""
    meshes = [o for o in objs if o.type == 'MESH']
    if not meshes: raise SystemExit('no mesh found in the import')
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    out = bpy.context.view_layer.objects.active
    out.name = name
    return out

def main():
    a = parse()
    reset()

    donor = import_any(a.donor)
    arm = next((o for o in donor if o.type == 'ARMATURE'), None)
    if arm is None: raise SystemExit('no armature in the donor file')

    # keep every clip alive through the export, and let the user narrow the set
    keep = set(s.strip() for s in a.keep_clips.split(',') if s.strip())
    for act in bpy.data.actions:
        if keep and act.name not in keep: bpy.data.actions.remove(act); continue
        act.use_fake_user = True
    clips = sorted(act.name for act in bpy.data.actions)

    # the donor's own body is a placeholder — yours replaces it
    if not a.show_rig:
        for o in [o for o in donor if o.type == 'MESH']:
            bpy.data.objects.remove(o, do_unlink=True)

    rig_h = sum((arm.matrix_world @ b.tail_local).z for b in [arm.data.bones['Head']]) if 'Head' in arm.data.bones else 0.0

    if a.show_rig:
        bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLTF_SEPARATE', export_animations=False)
        print('RIG REFERENCE ->', a.out, '| bones', len(arm.data.bones), '| head top %.3f m' % rig_h)
        return

    if not a.mesh: raise SystemExit('--mesh is required unless --show-rig')
    mine = join(import_any(a.mesh), 'CustomBody')

    # scale to the rig (or to --height) before binding: automatic weights are distance-based, so a mesh
    # that is 100x the skeleton binds every vertex to whatever bone happens to be nearest, i.e. garbage
    if not a.no_scale:
        h = bbox_height([mine])
        target = a.height or rig_h
        if h > 1e-6 and target > 1e-6:
            s = target / h
            mine.scale = (s, s, s)
            print('scaling mesh %.3f m -> %.3f m (x%.4f)' % (h, target, s))
    bpy.context.view_layer.objects.active = mine
    mine.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # drop the mesh so its lowest point sits at the armature's origin (feet on the floor)
    zs = [(mine.matrix_world @ v.co).z for v in mine.data.vertices]
    mine.location.z -= min(zs)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    # bind: bone-heat automatic weights, exactly what a browser auto-rigger runs, but on your machine
    bpy.ops.object.select_all(action='DESELECT')
    mine.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or '.', exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=a.out, export_format='GLTF_SEPARATE',
        export_animations=True, export_animation_mode='ACTIONS',
        export_bake_animation=False, export_optimize_animation_size=True,
        export_cameras=False, export_lights=False, export_apply=True,
        export_yup=True)

    tris = sum(len(p.vertices) - 2 for p in mine.data.polygons)
    unweighted = [v.index for v in mine.data.vertices if not any(g.weight > 0 for g in v.groups)]
    print('=' * 60)
    print('OUT      ', a.out)
    print('tris     ', tris)
    print('bones    ', len(arm.data.bones))
    print('clips    ', len(clips), ':', ','.join(clips))
    print('unweighted vertices', len(unweighted), '(must be 0 — any non-zero means a limb will not move)')
    print('=' * 60)

main()
