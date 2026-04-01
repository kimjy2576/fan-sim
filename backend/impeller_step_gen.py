"""
Sirocco Fan Impeller STEP Generator v1.0
─────────────────────────────────────────
Generates 3D solid model from design parameters.
Output: STEP AP214 (compatible with NX, SolidWorks, CATIA)

Usage:
  python impeller_step_gen.py '{"D1":120,"D2":175,...}' output.step
  python impeller_step_gen.py   # uses defaults
"""
import cadquery as cq
from cadquery import Vector
import math
import sys
import json
import os

# OCP imports for fast blade replication
import OCP.gp as gp
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.BRepOffsetAPI import BRepOffsetAPI_MakeOffsetShape
from OCP.BRepOffset import BRepOffset_Skin
from OCP.GeomAbs import GeomAbs_Intersection
from OCP.TopoDS import TopoDS_Compound
from OCP.BRep import BRep_Builder


def blade_centerline(D1, D2, beta1, beta2, n_pts=12):
    """Generate blade centerline (x, y) in mm using dθ/dr integration."""
    r1, r2 = D1 / 2, D2 / 2
    b1R = math.radians(beta1)
    b2R = math.radians(beta2)
    theta = 0
    pts = [(r1, 0.0)]
    for i in range(1, n_pts + 1):
        t = i / n_pts
        r = r1 + t * (r2 - r1)
        rP = r1 + (i - 1) / n_pts * (r2 - r1)
        rM = (r + rP) / 2
        tM = (t + (i - 1) / n_pts) / 2
        bM = b1R + tM * (b2R - b1R)
        if abs(math.tan(bM)) > 0.001:
            theta += (-1 / (rM * math.tan(bM))) * (r - rP)
        pts.append((r * math.cos(theta), r * math.sin(theta)))
    return pts


def make_single_blade(bc, r1, r2, b1, b2, t_blade):
    """Create one blade solid: lofted surface between bottom and top wires, then thickened."""
    # Bottom wire (z=0, on backplate)
    bottom = [(x, y, 0.0) for x, y in bc]
    # Top wire (z=h(r), on shroud)
    top = []
    for x, y in bc:
        r = math.sqrt(x ** 2 + y ** 2)
        tf = max(0.0, min(1.0, (r - r1) / (r2 - r1))) if r2 != r1 else 0
        top.append((x, y, b1 + tf * (b2 - b1)))

    # Assemble wires
    be = [cq.Edge.makeLine(Vector(*bottom[i]), Vector(*bottom[i + 1])) for i in range(len(bottom) - 1)]
    te = [cq.Edge.makeLine(Vector(*top[i]), Vector(*top[i + 1])) for i in range(len(top) - 1)]
    bw = cq.Wire.assembleEdges(be)
    tw = cq.Wire.assembleEdges(te)

    # Loft → ruled surface between two wires
    blade_shell = cq.Solid.makeLoft([bw, tw], ruled=True)

    # Thicken surface → solid with t_blade thickness
    try:
        offset_builder = BRepOffsetAPI_MakeOffsetShape()
        offset_builder.PerformByJoin(
            blade_shell.wrapped, t_blade, 1e-3,
            BRepOffset_Skin, False, False,
            GeomAbs_Intersection, True
        )
        return cq.Shape(offset_builder.Shape())
    except Exception:
        # Fallback: return thin shell
        return blade_shell


def replicate_blades(blade_shape, Z):
    """Create Z blades by rotating the single blade around Z-axis."""
    ax = gp.gp_Ax1(gp.gp_Pnt(0, 0, 0), gp.gp_Dir(0, 0, 1))
    shapes = [blade_shape]
    for i in range(1, Z):
        trsf = gp.gp_Trsf()
        trsf.SetRotation(ax, math.radians(360 * i / Z))
        builder = BRepBuilderAPI_Transform(blade_shape.wrapped, trsf, True)
        builder.Build()
        shapes.append(cq.Shape(builder.Shape()))
    # Combine as compound (fast, no boolean)
    return cq.occ_impl.shapes.Compound.makeCompound(shapes)


def build_impeller(p):
    """Build complete impeller from parameters dict."""
    D_eye = p.get('D_eye', p.get('D1', 120) - 10)
    D1 = p.get('D1', 120)
    D2 = p.get('D2', 175)
    b1 = p.get('b1', 60)
    b2 = p.get('b2', 50)
    beta1 = p.get('beta1', 30)
    beta2 = p.get('beta2', 145)
    Z = p.get('Z', 36)
    t_blade = p.get('t_blade', 1.0)
    hub_dia = p.get('hub_dia', D_eye * 0.35)
    shroud_t = p.get('shroud_t', 2.0)
    backplate_t = p.get('backplate_t', 2.0)

    r_eye = D_eye / 2
    r1 = D1 / 2
    r2 = D2 / 2
    r_hub = hub_dia / 2

    print(f"  Backplate: r_hub={r_hub:.1f}mm → r2={r2:.1f}mm, t={backplate_t}mm")

    # ─── Backplate ───
    backplate = (
        cq.Workplane("XY")
        .circle(r2).circle(r_hub)
        .extrude(-backplate_t)
    )

    # ─── Front Shroud ───
    # Simple ring at blade-top level with eye opening
    print(f"  Shroud: r_eye={r_eye:.1f}mm → r2={r2:.1f}mm, at z={b2}mm")
    shroud = (
        cq.Workplane("XY")
        .workplane(offset=b2)
        .circle(r2).circle(r_eye)
        .extrude(shroud_t)
    )

    # Eye bellmouth (curved inlet ring)
    try:
        eye_rise = min(10, b1 * 0.15)
        bellmouth = (
            cq.Workplane("XZ")
            .moveTo(r_eye, b1)
            .threePointArc((r_eye - 3, b1 + eye_rise * 0.7), (r_eye - 5, b1 + eye_rise))
            .lineTo(r_eye - 5, b1 + eye_rise + shroud_t)
            .lineTo(r_eye + 1, b1 + shroud_t)
            .lineTo(r_eye, b1)
            .close()
            .revolve(360, (0, 0, 0), (0, 0, 1))
        )
        shroud = shroud.union(bellmouth)
        print(f"  Bellmouth added: eye_rise={eye_rise:.1f}mm")
    except Exception as e:
        print(f"  Bellmouth skipped: {e}")

    # ─── Blades ───
    print(f"  Blades: Z={Z}, β₁={beta1}°, β₂={beta2}°, t={t_blade}mm")
    bc = blade_centerline(D1, D2, beta1, beta2, n_pts=12)
    single = make_single_blade(bc, r1, r2, b1, b2, t_blade)
    all_blades = replicate_blades(single, Z)
    print(f"  {Z} blades replicated")

    # ─── Hub ───
    hub = (
        cq.Workplane("XY")
        .circle(r_hub + 2).circle(r_hub)
        .extrude(-backplate_t - 8)
    )

    # ─── Assembly (compound, not boolean union) ───
    comp = TopoDS_Compound()
    bb = BRep_Builder()
    bb.MakeCompound(comp)
    bb.Add(comp, backplate.val().wrapped)
    bb.Add(comp, shroud.val().wrapped)
    bb.Add(comp, all_blades.wrapped)
    bb.Add(comp, hub.val().wrapped)

    return cq.Workplane("XY").newObject([cq.Shape(comp)])


def export_step(params, output_path):
    """Main entry: generate STEP file."""
    print(f"═══ Sirocco Fan Impeller STEP Generator ═══")
    print(f"  D_eye={params.get('D_eye', '—')}mm, D1={params.get('D1')}mm, "
          f"D2={params.get('D2')}mm")
    print(f"  b1={params.get('b1')}mm, b2={params.get('b2')}mm")
    print(f"  β₁={params.get('beta1')}°, β₂={params.get('beta2')}°, Z={params.get('Z')}")

    result = build_impeller(params)
    cq.exporters.export(result, output_path, cq.exporters.ExportTypes.STEP)

    sz = os.path.getsize(output_path)
    print(f"═══ Done: {output_path} ({sz / 1024:.0f} KB) ═══")
    return output_path


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith('{'):
        params = json.loads(sys.argv[1])
    else:
        params = {
            'D_eye': 110, 'D1': 120, 'D2': 175,
            'b1': 60, 'b2': 50,
            'beta1': 30, 'beta2': 145, 'Z': 36,
            't_blade': 1.0,
        }

    out = sys.argv[2] if len(sys.argv) > 2 else '/mnt/user-data/outputs/impeller.step'
    export_step(params, out)
