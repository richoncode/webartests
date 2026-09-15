#!/usr/bin/env python3
"""Battery base for the CrowPanel 1.28" rotary module — watertight STL, no CAD.

The module is already a finished 48 x 48 x 33 mm enclosure (aluminium, plastic,
acrylic), so nothing here wraps it. This is a tray that carries a lithium cell
and a charger board, with a pocket in its top that the module's lower 8 mm
presses into. The module is the lid: one printed part, nothing to screw, and
the battery lead runs straight up out of the bay into the pocket.

Geometry is built as a loft through stacked rounded-rectangle rings, so the
result is closed by construction. Every edge is checked afterwards: a closed
surface uses each edge exactly twice, once in each direction.

Print it, then check the fit with fit-gauge.stl before committing to the tray.
"""
import math, struct, sys

# ── the module ──────────────────────────────────────────────────────────────
# 48 x 48 x 33 mm published by Elecrow. The manufacturer's STEP file measures
# 47.3 x 43.1 x 35.0 across its control points, which bound the surface rather
# than lie on it, so the published figure is the one used and CLEARANCE covers
# the difference. Confirm with the fit gauge before printing the tray.
MODULE      = 48.0
CLEARANCE   = 0.5           # printed parts come out tight; FDM needs this
POCKET_DEEP = 8.0           # how much of the module's 33 mm the tray grips

# ── the cell ────────────────────────────────────────────────────────────────
# 503450: 1000 mAh, 50 x 34 x 5 mm, the largest common pouch that keeps the
# tray close to the module's own footprint. A 2000 mAh cell is ~55 x 60 and
# makes the tray wider than the device.
CELL_L, CELL_W, CELL_H = 50.0, 34.0, 5.0
CELL_GAP    = 1.5           # room for the pouch, its tape and the lead
CHARGER_H   = 2.0           # a TP4056 module lying flat beside the cell

WALL, FLOOR, RADIUS = 2.6, 2.4, 3.0
SEG = 8                     # segments per rounded corner


def ring(hx, hy, r, seg=SEG):
    """A rounded rectangle as a closed point list, corners first-quadrant last."""
    r = min(r, hx, hy)
    pts = []
    for cx, cy, a0 in ((hx - r, hy - r, 0), (-(hx - r), hy - r, 90),
                       (-(hx - r), -(hy - r), 180), (hx - r, -(hy - r), 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    # drop duplicated corner joins
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - out[-1][0]) > 1e-9 or abs(p[1] - out[-1][1]) > 1e-9:
            out.append(p)
    return out


class Mesh:
    def __init__(self):
        self.tris = []

    def tri(self, a, b, c):
        self.tris.append((a, b, c))

    def quad(self, a, b, c, d):
        self.tri(a, b, c)
        self.tri(a, c, d)

    def loft(self, profile, outward):
        """profile: [(z, hx, hy)] — consecutive rings joined by quads."""
        rings = [(z, ring(hx, hy, RADIUS)) for z, hx, hy in profile]
        for (z0, r0), (z1, r1) in zip(rings, rings[1:]):
            n = len(r0)
            for i in range(n):
                j = (i + 1) % n
                a = (r0[i][0], r0[i][1], z0)
                b = (r0[j][0], r0[j][1], z0)
                c = (r1[j][0], r1[j][1], z1)
                d = (r1[i][0], r1[i][1], z1)
                self.quad(a, b, c, d) if outward else self.quad(a, d, c, b)

    def cap(self, z, hx, hy, up):
        """Solid face, fanned from the centre — valid for a convex ring."""
        r = ring(hx, hy, RADIUS)
        n = len(r)
        for i in range(n):
            j = (i + 1) % n
            a, b = (r[i][0], r[i][1], z), (r[j][0], r[j][1], z)
            self.tri((0, 0, z), a, b) if up else self.tri((0, 0, z), b, a)

    def annulus(self, z, outer, inner, up):
        """Flat ring between two concentric rounded rectangles."""
        o, i_ = ring(*outer, RADIUS), ring(*inner, RADIUS)
        n = len(o)
        for k in range(n):
            m = (k + 1) % n
            a = (o[k][0], o[k][1], z)
            b = (o[m][0], o[m][1], z)
            c = (i_[m][0], i_[m][1], z)
            d = (i_[k][0], i_[k][1], z)
            self.quad(a, b, c, d) if up else self.quad(a, d, c, b)

    def watertight(self):
        edges = {}
        for t in self.tris:
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                ka, kb = tuple(round(v, 5) for v in a), tuple(round(v, 5) for v in b)
                edges[(ka, kb)] = edges.get((ka, kb), 0) + 1
        bad = [e for e, c in edges.items() if c != 1 or edges.get((e[1], e[0]), 0) != 1]
        return len(bad), len(edges)

    def write(self, path, name):
        with open(path, "wb") as f:
            f.write(struct.pack("<80sI", name.encode()[:80], len(self.tris)))
            for a, b, c in self.tris:
                u = [b[i] - a[i] for i in range(3)]
                v = [c[i] - a[i] for i in range(3)]
                nx = u[1] * v[2] - u[2] * v[1]
                ny = u[2] * v[0] - u[0] * v[2]
                nz = u[0] * v[1] - u[1] * v[0]
                m = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
                f.write(struct.pack("<3f", nx / m, ny / m, nz / m))
                for p in (a, b, c):
                    f.write(struct.pack("<3f", *p))
                f.write(b"\0\0")


def build(profile_outer, profile_inner, floor_z, top_z):
    m = Mesh()
    m.loft(profile_outer, outward=True)
    m.loft(profile_inner, outward=False)
    o0 = profile_outer[0]
    m.annulus(top_z, (profile_outer[-1][1], profile_outer[-1][2]),
              (profile_inner[-1][1], profile_inner[-1][2]), up=True)
    if floor_z > 0:
        m.cap(0, o0[1], o0[2], up=False)                       # solid underside
        m.cap(floor_z, profile_inner[0][1], profile_inner[0][2], up=True)
    else:
        m.annulus(0, (o0[1], o0[2]), (profile_inner[0][1], profile_inner[0][2]), up=False)
    return m


def tray():
    pocket = MODULE + CLEARANCE
    bay_x, bay_y = CELL_L + CELL_GAP, CELL_W + CELL_GAP
    bay_h = CELL_H + CHARGER_H + CELL_GAP
    in_x = max(pocket, bay_x) / 2
    out_x = in_x + WALL
    out_y = max(pocket, bay_y) / 2 + WALL
    step = FLOOR + bay_h
    top = step + POCKET_DEEP

    outer = [(0, out_x, out_y), (top, out_x, out_y)]
    inner = [(FLOOR, bay_x / 2, bay_y / 2),
             (step,  bay_x / 2, bay_y / 2),
             (step,  pocket / 2, pocket / 2),
             (top,   pocket / 2, pocket / 2)]
    m = build(outer, inner, FLOOR, top)
    return m, (out_x * 2, out_y * 2, top), bay_h


def gauge():
    pocket = MODULE + CLEARANCE
    h = 6.0
    o = pocket / 2 + WALL
    outer = [(0, o, o), (h, o, o)]
    inner = [(0, pocket / 2, pocket / 2), (h, pocket / 2, pocket / 2)]
    return build(outer, inner, 0, h), (o * 2, o * 2, h)


if __name__ == "__main__":
    ok = True
    m, dims, bay_h = tray()
    bad, n = m.watertight()
    print(f"base-tray.stl      {len(m.tris):5d} triangles  {dims[0]:.1f} x {dims[1]:.1f} x {dims[2]:.1f} mm"
          f"   bay {CELL_L + CELL_GAP:.1f} x {CELL_W + CELL_GAP:.1f} x {bay_h:.1f}")
    print(f"                   edges {n}, unpaired {bad}")
    ok &= bad == 0
    m.write("base-tray.stl", "espRotary base tray")

    g, gd = gauge()
    bad, n = g.watertight()
    print(f"fit-gauge.stl      {len(g.tris):5d} triangles  {gd[0]:.1f} x {gd[1]:.1f} x {gd[2]:.1f} mm")
    print(f"                   edges {n}, unpaired {bad}")
    ok &= bad == 0
    g.write("fit-gauge.stl", "espRotary fit gauge")
    sys.exit(0 if ok else 1)
