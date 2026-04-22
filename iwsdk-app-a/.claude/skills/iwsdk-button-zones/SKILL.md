---
name: iwsdk-button-zones
description: IWSDK 3D button zone construction guide. Use when building invisible hit-zones for PanelUI buttons, adding Interactable zones to a panel, toggling zones between active/inactive states, or when buttons are failing to receive Hovered/Pressed. Also applies when any zone mesh is conditionally active (shown for one game mode but not another).
---

# IWSDK Button Zone Construction

## The Critical Rule

**`mesh.visible = false` does NOT prevent the raycaster from hitting a mesh.**

Three.js `Raycaster.intersectObject()` does not check `mesh.visible`. IWSDK's BVH is built via `object3D.traverse()` which also ignores visibility. An invisible mesh at a closer Z position than an active Interactable entity's zone will intercept the ray first, and the active entity never receives `Hovered`.

**The fix: park inactive zone meshes physically behind the panel (`localZ = -0.5`) instead of just hiding them.**

---

## Zone Creation Pattern

Always create zones in two steps:

### Step 1 — Initial position: behind the panel

```typescript
const zoneD = 0.04;   // depth for menu/game-action zones
const localZ = 0.06;  // active Z (in front of panel face)

const mesh = new Mesh(new BoxGeometry(w, h, zoneD), mat);
mesh.position.set(x, y, -0.5);  // ← start BEHIND panel, not at localZ
mesh.visible = false;

// Pre-parent BEFORE createTransformEntity so InputSystem BVH
// includes the mesh with the correct world transform on first qualify.
panelEntity.object3D!.add(mesh);

const zoneEntity = world.createTransformEntity(mesh, panelEntity)
  .addComponent(MyZoneComponent, { ... });
// DO NOT add Interactable here if the zone starts inactive
```

### Step 2 — Activate: move forward AND show

```typescript
private activateZones() {
  for (const e of this.zoneEntities) {
    if (e.object3D) {
      e.object3D.visible = true;
      (e.getVectorView(Transform, 'position') as Float32Array)[2] = 0.06;
    }
    if (!e.hasComponent(Interactable)) e.addComponent(Interactable);
  }
}
```

### Step 3 — Deactivate: move behind AND hide

```typescript
private deactivateZones() {
  for (const e of this.zoneEntities) {
    if (e.hasComponent(Interactable)) e.removeComponent(Interactable);
    if (e.object3D) {
      e.object3D.visible = false;
      (e.getVectorView(Transform, 'position') as Float32Array)[2] = -0.5;
    }
  }
}
```

Import `Transform` from `@iwsdk/core` to use `getVectorView`.

---

## Zone Height vs Button Pitch (CRITICAL)

When multiple coplanar zones sit side-by-side (same Z, adjacent Y), zone height must **match the button pitch exactly**. Not less, not more.

| Height vs pitch | Effect on real hardware                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `h < pitch`     | Gap between zones. Ray dies in gap → hover drops. Hand tremor re-enters → **flicker**. |
| `h = pitch`     | Zones abut exactly. One zone always covers the ray. **Stable.**              |
| `h > pitch`     | Zones overlap. Two zones coplanar at same Z both hit → distance tied → non-deterministic winner. Tremor flips winner → **flicker between adjacent buttons.** |

**Both undershoot and overshoot cause flicker, via different mechanisms.** Intuition says "bigger zones = more forgiving" — it's wrong. Overlap at identical Z is worse than a small gap because the flicker jumps between two legitimate hover targets instead of just dropping out.

If you must have a safety margin, offset the zones in Z (stagger by ≥ zoneD) so the closer zone always wins the raycast. But for a simple row of buttons in a single plane, just set `h = pitch`.

For the isolated Exit button (big gap above), a larger multiplier is fine — there's no neighbour to overlap with.

---

## Z Position Reference

| Zone type            | Inactive Z | Active Z | Notes                                     |
| -------------------- | ---------- | -------- | ----------------------------------------- |
| Menu button zones    | starts active at `0.06` | `0.06` | `zoneD=0.04` → front face at 0.08      |
| Game-action zones    | `-0.5`     | `0.12`   | `zoneD=0.04` → front face at 0.14        |
| Basketball zones     | `-0.5`     | `0.06`   | `zoneD=0.10` → front face at 0.11        |
| Railroad zones       | `-0.5`     | `0.06`   | `zoneD=0.10` → front face at 0.11        |

**Rule of thumb:** `activeZ + zoneD/2` must be ≤ `activeZ + zoneD/2` of any other zone the ray must reach through. When in doubt, use `zoneD=0.04` for action zones and park inactive ones at `-0.5`.

---

## Always-Active Zones

Menu button zones that are active from the start (and only lose `Interactable` when a game launches) are created at their real `localZ` and start visible:

```typescript
const mesh = new Mesh(new BoxGeometry(w, h, zoneD), mat);
mesh.position.set(x, y, localZ);  // ← real position, always active
panelEntity.object3D!.add(mesh);

world.createTransformEntity(mesh, panelEntity)
  .addComponent(Interactable)           // ← add immediately
  .addComponent(MenuButton, { modeIndex: i });
```

When a game launches, only remove `Interactable` — the mesh stays at `localZ`. These zones don't block anything because they ARE the targets in menu mode, and in game mode no other menu zone is nearby.

---

## Why Not Just `mesh.visible = false`?

`mesh.visible = false` prevents rendering but NOT raycasting. The InputSystem's BVH is built once via `computeBoundsTreeForEntity(entity.object3D)` using `traverse()` — no visibility check. At runtime, `Raycaster.intersectObject()` also ignores visibility.

If an invisible zone mesh with `zoneD=0.10` (front face at `localZ=0.11`) overlaps in Y with an active menu zone mesh at `localZ=0.08`, the invisible mesh is hit first. The parent panel entity receives `Hovered` via that invisible hit, consuming the pointer event before the menu zone entity gets tested.

Moving inactive zones to `z=-0.5` (behind the panel) ensures the raycaster hits them at a distance that is always greater than any active front-facing zone.

---

## Checklist: Adding a New Panel with Conditionally-Active Zones

- [ ] Inactive zones initialised at `z = -0.5`, `mesh.visible = false`, no `Interactable`
- [ ] Active zones initialised at correct `localZ`, `mesh.visible = true` (or false if deferred), `Interactable` added when game activates
- [ ] Pre-parent with `panelEntity.object3D!.add(mesh)` **before** `createTransformEntity`
- [ ] `getVectorView(Transform, 'position')` used to update Z (not `entity.object3D.position.z = ...` which may be overwritten by TransformSystem)
- [ ] `Transform` imported from `@iwsdk/core`
- [ ] `zoneD` for high-reliability angled raycasts: `0.04` for flat zones, `0.10` for zones that need to survive oblique angles
- [ ] `mesh.renderOrder = 999` and `depthTest: false` on the zone material to prevent z-fighting with panel background
