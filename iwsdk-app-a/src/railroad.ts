import {
  createComponent,
  createSystem,
  Types,
  Entity,
  Interactable,
  Hovered,
  Pressed,
  DistanceGrabbable,
  MovementMode,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  XRPlane,
  eq,
  BoxGeometry,
  CylinderGeometry,
  PlaneGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Vector3,
  Quaternion,
  Object3D,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";

// ── Constants ──────────────────────────────────────────────────────────────
const PANEL_CONFIG  = "./ui/game-status.json";
const SEG_LEN       = 0.32;   // total length of one track segment (m)
const HALF_SEG      = SEG_LEN / 2;
const GAUGE         = 0.060;  // distance between rail centerlines (m)
const RAIL_W        = 0.006;  // rail cross-section width (m)
const RAIL_H        = 0.009;  // rail cross-section height (m)
const TIE_W         = GAUGE + 0.018;  // sleeper width
const TIE_D         = 0.014;  // sleeper depth (along track)
const TIE_H         = 0.007;  // sleeper height
const TIE_COUNT     = 5;
const SNAP_RADIUS        = 0.12;   // distance at which track endpoints snap (m)
const SURFACE_SNAP_DIST  = 0.30;   // max distance from a detected AR plane to trigger surface snap (m)
const TRAIN_SPEED        = 0.30;   // m/s along track

const RAIL_MAT    = new MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.7 });
const TIE_MAT     = new MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
const SNAP_MAT    = new MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 });

const Z_AXIS  = new Vector3(0, 0, 1);
const Y_AXIS  = new Vector3(0, 1, 0);
const RAIL_OVERLAP = 0.006; // extend rail geometry past endpoints to close visual seam at junctions

// ── Components ─────────────────────────────────────────────────────────────
export const TrackSegment = createComponent("TrackSegment", {
  segId:   { type: Types.Int32, default: 0 },
  placed:  { type: Types.Boolean, default: false }, // false while held, true after drop
});

export const TrackTrain = createComponent("TrackTrain", {
  segId:     { type: Types.Int32, default: 0 },
  t:         { type: Types.Float32, default: 0 },
  direction: { type: Types.Int8,    default: 1 },  // 1 = A→B, -1 = B→A
});

// 0=+Track  1=+Train  2=Clear All  3=Menu
export const RailroadButtonZone = createComponent("RailroadButtonZone", {
  actionType: { type: Types.Int8, default: 0 },
});

// ── Per-segment connectivity (stored in system map, not ECS) ───────────────
interface SegData {
  entity:    Entity;
  connAId:   number;   // segId of segment connected at A end (-1 = free)
  connAEnd:  "A" | "B";
  connBId:   number;   // segId of segment connected at B end (-1 = free)
  connBEnd:  "A" | "B";
}

// ── Geometry helpers ───────────────────────────────────────────────────────
function makeTrackMesh(): Object3D {
  const root = new Object3D();

  // Two rails — slightly longer than SEG_LEN so adjacent segments overlap at
  // the joint and don't show a seam gap.
  const railGeo = new BoxGeometry(RAIL_W, RAIL_H, SEG_LEN + RAIL_OVERLAP * 2);
  for (const side of [-1, 1]) {
    const rail = new Mesh(railGeo, RAIL_MAT);
    rail.position.set(side * GAUGE / 2, TIE_H + RAIL_H / 2, 0);
    root.add(rail);
  }

  // Ties (sleepers)
  const tieGeo = new BoxGeometry(TIE_W, TIE_H, TIE_D);
  const tieSpacing = SEG_LEN / (TIE_COUNT + 1);
  for (let i = 1; i <= TIE_COUNT; i++) {
    const tie = new Mesh(tieGeo, TIE_MAT);
    tie.position.set(0, TIE_H / 2, -HALF_SEG + i * tieSpacing);
    root.add(tie);
  }

  return root;
}

function makeSnapIndicator(): Mesh {
  const geo = new CylinderGeometry(0.022, 0.022, 0.04, 8);
  return new Mesh(geo, SNAP_MAT.clone());
}

// Thin plane shown while holding a track piece to preview where it will surface-snap
function makeSurfacePreview(): Mesh {
  const mat = new MeshBasicMaterial({
    color: 0x00ccff, transparent: true, opacity: 0.22,
    depthWrite: false,
  });
  return new Mesh(new PlaneGeometry(SEG_LEN, GAUGE + 0.06), mat);
}

function makeTrainMesh(): Object3D {
  const root = new Object3D();

  // Body
  const bodyMat = new MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6, metalness: 0.2 });
  const body = new Mesh(new BoxGeometry(0.055, 0.048, 0.14), bodyMat);
  body.position.y = TIE_H + RAIL_H + 0.028;
  root.add(body);

  // Cab
  const cabMat = new MeshStandardMaterial({ color: 0x6b1010, roughness: 0.6 });
  const cab = new Mesh(new BoxGeometry(0.044, 0.032, 0.06), cabMat);
  cab.position.set(0, TIE_H + RAIL_H + 0.068, 0.03);
  root.add(cab);

  // Stack
  const stackMat = new MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const stack = new Mesh(new CylinderGeometry(0.007, 0.009, 0.024, 6), stackMat);
  stack.position.set(0, TIE_H + RAIL_H + 0.098, -0.038);
  root.add(stack);

  // Four wheels (cylinders on rail positions)
  const wheelMat = new MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.4 });
  const wheelGeo = new CylinderGeometry(0.012, 0.012, 0.010, 8);
  for (const side of [-1, 1]) {
    for (const zOff of [-0.045, 0.045]) {
      const w = new Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(side * (GAUGE / 2 + 0.005), TIE_H + RAIL_H - 0.002, zOff);
      root.add(w);
    }
  }

  return root;
}

// World-space endpoints for a placed segment's object3D
function getEndpoints(obj: Object3D): { a: Vector3; b: Vector3; dir: Vector3 } {
  const dir = Z_AXIS.clone().applyQuaternion(obj.quaternion);
  const a   = obj.position.clone().addScaledVector(dir, -HALF_SEG);
  const b   = obj.position.clone().addScaledVector(dir,  HALF_SEG);
  return { a, b, dir };
}

// Position + orient `obj` so that its `newEnd` endpoint sits at `targetPos`,
// continuing in the correct direction from `existObj` / `existEnd`.
// Works for floor, wall, and ceiling tracks by preserving the full quaternion
// of the existing segment rather than projecting to the XZ plane.
function snapAlign(
  obj:        Object3D,
  newEnd:     "A" | "B",
  targetPos:  Vector3,
  existObj:   Object3D,
  existEnd:   "A" | "B",
): void {
  const sameSide  = newEnd === existEnd;
  const existDir  = Z_AXIS.clone().applyQuaternion(existObj.quaternion);

  if (!sameSide) {
    // Straight continuation: new segment has exactly the same orientation as
    // the existing one — this preserves wall/ceiling alignment automatically.
    obj.quaternion.copy(existObj.quaternion);
  } else {
    // Back-to-back (A→A or B→B): rotate 180° around the existing segment's
    // local-up axis so the new segment reverses direction while staying on the
    // same surface (floor, wall, ceiling).
    const localUp = Y_AXIS.clone().applyQuaternion(existObj.quaternion);
    const flipQ   = new Quaternion().setFromAxisAngle(localUp, Math.PI);
    obj.quaternion.multiplyQuaternions(flipQ, existObj.quaternion);
  }

  const newDir    = sameSide ? existDir.clone().negate() : existDir;
  const endOffset = newEnd === "A" ? -HALF_SEG : HALF_SEG;
  obj.position.copy(targetPos).addScaledVector(newDir, -endOffset);
}

// ── System ─────────────────────────────────────────────────────────────────
export class RailroadSystem extends createSystem({
  heldTrack:     { required: [TrackSegment, Interactable, Pressed] },
  allTrack:      { required: [TrackSegment] },
  allTrains:     { required: [TrackTrain] },
  panel:         { required: [PanelUI, PanelDocument], where: [eq(PanelUI, "config", PANEL_CONFIG)] },
  rrBtnHovered:  { required: [RailroadButtonZone, Hovered] },
  rrBtnPressed:  { required: [RailroadButtonZone, Pressed] },
  arPlanes:      { required: [XRPlane] },
}) {
  private active        = false;
  private nextSegId     = 1;
  private segMap        = new Map<number, SegData>();
  private panelEntity:  Entity | null = null;

  // initiateRoomCapture can only be called once per XR session (WebXR spec).
  // Track whether we've already triggered it so retries don't throw.
  private roomCaptureAttempted = false;

  // Snap indicator dots (one per held segment endpoint)
  private snapDotA: Mesh | null = null;
  private snapDotB: Mesh | null = null;

  // Ghost plane shown while holding a track to preview surface snap target
  private surfacePreview: Mesh | null = null;

  // Railroad-screen button zones (4 buttons)
  private rrBtnZoneEntities:  Entity[] = [];
  private rrBtnZoneMaterials: MeshStandardMaterial[] = [];

  // UI refs
  private rrUI: {
    screen:    UIKit.Text;
    count:     UIKit.Text;
    debugBtn:  UIKit.Text;
  } | null = null;

  // Scene-understanding debug visualisation
  private debugMode       = false;
  private planeDebugMeshes = new Map<number, Mesh>(); // entity.index → debug overlay mesh

  // Scratch
  private _va     = new Vector3();
  private _vb     = new Vector3();
  private _vc     = new Vector3(); // extra scratch for surface snap
  private _dir    = new Vector3();
  private _normal = new Vector3();
  private _q      = new Quaternion();
  private _q2     = new Quaternion();

  init() {
    // Wire panel when it qualifies
    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.rrUI) return;
      this.panelEntity = entity;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;

      this.rrUI = {
        screen:   doc.getElementById("railroad-screen") as UIKit.Text,
        count:    doc.getElementById("rr-track-count") as UIKit.Text,
        debugBtn: doc.getElementById("rr-debug-btn")   as UIKit.Text,
      };

      // HTML click events as belt-and-suspenders backup
      (doc.getElementById("rr-track-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.spawnTrackPiece(); });
      (doc.getElementById("rr-train-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.spawnTrain(); });
      (doc.getElementById("rr-clear-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.clearAll(); });
      (doc.getElementById("rr-menu-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.endGame(); });
      (doc.getElementById("rr-debug-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.toggleDebug(); });

      // Build 3D button zones parented to panel (created without Interactable; enabled on startGame)
      this.buildButtonZones(entity, doc);
    });

    // Track AR plane detection — create/remove debug overlays on the fly
    this.cleanupFuncs.push(
      this.queries.arPlanes.subscribe("qualify", (entity) => {
        if (this.debugMode) this.createPlaneDebugMesh(entity);
      }),
      this.queries.arPlanes.subscribe("disqualify", (entity) => {
        const mesh = this.planeDebugMeshes.get(entity.index);
        if (mesh) {
          mesh.removeFromParent();
          this.planeDebugMeshes.delete(entity.index);
        }
      }),
    );

    // Button hover glow
    this.queries.rrBtnHovered.subscribe("qualify", (entity) => {
      const idx = entity.getValue(RailroadButtonZone, "actionType") as number;
      const mat = this.rrBtnZoneMaterials[idx];
      if (mat) { mat.opacity = 0.28; mat.emissiveIntensity = 0.55; }
    });
    this.queries.rrBtnHovered.subscribe("disqualify", (entity) => {
      const idx = entity.getValue(RailroadButtonZone, "actionType") as number;
      const mat = this.rrBtnZoneMaterials[idx];
      if (mat) { mat.opacity = 0.0; mat.emissiveIntensity = 0.0; }
    });

    // Button press actions
    this.queries.rrBtnPressed.subscribe("qualify", (entity) => {
      if (!this.active) return;
      const idx = entity.getValue(RailroadButtonZone, "actionType") as number;
      switch (idx) {
        case 0: this.spawnTrackPiece(); break;
        case 1: this.spawnTrain();      break;
        case 2: this.clearAll();        break;
        case 3: this.endGame();         break;
        case 4: this.toggleDebug();     break;
      }
    });

    // When a held track piece is released, do snap
    this.queries.heldTrack.subscribe("disqualify", (entity) => {
      if (!this.active) return;
      this.doSnap(entity);
      entity.setValue(TrackSegment, "placed", true);
      this.hideSnapIndicators();
    });

    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) {
      this.cleanupFuncs.push(
        activeGame.subscribe((game) => {
          if (game === "railroad" && !this.active) {
            this.startGame();
          } else if (game !== "railroad" && this.active) {
            this.cleanup();
          }
        }),
      );
    }

    // Create snap indicator dots (invisible by default)
    this.snapDotA = makeSnapIndicator();
    this.snapDotB = makeSnapIndicator();
    this.snapDotA.visible = false;
    this.snapDotB.visible = false;
    this.world.createTransformEntity(this.snapDotA);
    this.world.createTransformEntity(this.snapDotB);

    // Surface preview ghost — shown while holding a track piece
    this.surfacePreview = makeSurfacePreview();
    this.surfacePreview.visible = false;
    this.world.createTransformEntity(this.surfacePreview);
  }

  // ── Public ─────────────────────────────────────────────────────────────
  startGame() {
    this.active = true;
    this.showScreen();
    this.refreshCountUI();
    for (const e of this.rrBtnZoneEntities) {
      if (!e.hasComponent(Interactable)) e.addComponent(Interactable);
    }
  }

  endGame() {
    const g = this.globals.activeGame as Signal<string> | undefined;
    if (g) g.value = "menu";
  }

  // ── Internal lifecycle ────────────────────────────────────────────────
  private cleanup() {
    this.active = false;
    this.clearAll();
    this.hideSnapIndicators();
    if (this.surfacePreview) this.surfacePreview.visible = false;
    this.hideScreen();
    for (const e of this.rrBtnZoneEntities) {
      if (e.hasComponent(Interactable)) e.removeComponent(Interactable);
    }
    // Remove all debug overlays and reset debug state
    for (const mesh of this.planeDebugMeshes.values()) mesh.removeFromParent();
    this.planeDebugMeshes.clear();
    this.debugMode = false;
  }

  private showScreen() {
    this.rrUI?.screen.setProperties({ display: "flex" });
    // Panel stays at its current position — player can grab it with DistanceGrabbable
    // if they need to reposition it while placing track.
    // Removing scale/position manipulation here fixed the button flakiness:
    // PanelUISystem "accounts for world scale" by shrinking the UIKit layout in
    // local space, so if the entity scales to 1.4×, the button zone meshes end
    // up 1.4× further from panel center than the UIKit button faces, causing
    // raycasts to mostly miss (1-in-30 hit rate).
  }

  private hideScreen() {
    this.rrUI?.screen.setProperties({ display: "none" });
  }

  private refreshCountUI() {
    if (!this.rrUI) return;
    const segs   = this.segMap.size;
    const trains = this.queries.allTrains.entities.size;
    const planes = this.queries.arPlanes.entities.size;
    const planeInfo = this.debugMode ? ` · ${planes} plane${planes !== 1 ? "s" : ""}` : "";
    this.rrUI.count.setProperties({ text: `${segs} piece${segs !== 1 ? "s" : ""} · ${trains} train${trains !== 1 ? "s" : ""}${planeInfo}` });
  }

  // ── Railroad-screen button zones ────────────────────────────────────
  // Positions are computed from CSS layout constants rather than UIKit's
  // globalMatrix signal.  The signal approach fired in UIKit's reactive render
  // context (outside the ECS update loop) making worldToLocal unreliable.
  // The hardcoded approach is what all other working button zones use.
  //
  // Railroad-screen layout (UIKit units, root padding=3, root width=72):
  //   Panel height H = 48.42   half = 24.21
  //   Y = (H/2 - yFromTop) * scale   [positive = up from panel centre]
  //
  //   Element                yFromTop   cenY    cenX    w    h
  //   rr-track-btn           25.02     −0.81   −17    32   7.6
  //   rr-train-btn           25.02     −0.81   +17    32   7.6
  //   rr-clear-btn           34.12     −9.91   −17    32   7.6
  //   rr-menu-btn            34.12     −9.91   +17    32   7.6
  //   rr-debug-btn           42.42    −18.21     0    66   6.0
  //
  // If rows are added update PANEL_H below and recalculate cenY values.
  private buildButtonZones(panelEntity: Entity, doc: UIKitDocument) {
    const PANEL_H = 48.42;
    const halfH   = PANEL_H / 2;

    // Metres per UIKit unit.  Prefer the live ratio from the document; fall
    // back to 0.76 / 72 (panel ≈76 cm wide over 72 UIKit units) if not ready.
    const computedW = (doc as any).computedSize?.width ?? 72;
    const scale     = (doc.targetSize?.width ?? 0) > 0
      ? doc.targetSize.width / computedW
      : 0.76 / 72;

    const zoneD  = 0.04;
    const localZ = 0.06;

    // { action, x, y, w, h } all in UIKit units (centred on element).
    // Heights use 1.3× the CSS-computed value so the ray has a generous target.
    const defs = [
      { action: 0, id: "rr-track-btn",  x: -17, y: halfH - 25.02, w: 32, h: 9.9, color: 0x22bb88 },
      { action: 1, id: "rr-train-btn",  x:  17, y: halfH - 25.02, w: 32, h: 9.9, color: 0xffcc22 },
      { action: 2, id: "rr-clear-btn",  x: -17, y: halfH - 34.12, w: 32, h: 9.9, color: 0x888888 },
      { action: 3, id: "rr-menu-btn",   x:  17, y: halfH - 34.12, w: 32, h: 9.9, color: 0x888888 },
      { action: 4, id: "rr-debug-btn",  x:   0, y: halfH - 42.42, w: 66, h: 7.8, color: 0x334455 },
    ];

    for (const { action, id, x, y, w, h, color } of defs) {
      const mat = new MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.0,
        transparent: true, opacity: 0.0, depthWrite: false,
      });
      this.rrBtnZoneMaterials[action] = mat;

      const mesh = new Mesh(new BoxGeometry(w * scale, h * scale, zoneD), mat);
      mesh.position.set(x * scale, y * scale, localZ);
      // Pre-parent before addComponent(Interactable) so InputSystem BVH
      // includes the mesh with the correct world transform.
      panelEntity.object3D!.add(mesh);

      const zoneEntity = this.world.createTransformEntity(mesh, panelEntity)
        .addComponent(RailroadButtonZone, { actionType: action });
      // Interactable added in startGame(), removed in cleanup()
      this.rrBtnZoneEntities.push(zoneEntity);
    }
  }

  // ── Spawn track piece ─────────────────────────────────────────────────
  private spawnTrackPiece() {
    const id   = this.nextSegId++;
    const mesh = makeTrackMesh();

    // Spawn at arm's reach in front-right of player
    this.player.head.getWorldPosition(this._va);
    mesh.position.set(this._va.x + 0.25, this._va.y - 0.2, this._va.z - 0.45);
    // Pre-parent to scene NOW so mesh.parent != null when addComponent(Interactable)
    // triggers InputSystem.updateDescendantArrays — same fix as board column/cell zones.
    this.scene.add(mesh);

    const entity = this.world
      .createTransformEntity(mesh)
      .addComponent(TrackSegment, { segId: id, placed: false })
      .addComponent(Interactable)
      .addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveFromTarget });

    this.segMap.set(id, {
      entity,
      connAId: -1, connAEnd: "B",
      connBId: -1, connBEnd: "A",
    });

    this.refreshCountUI();
  }

  // ── Surface snap (AR plane detection) ────────────────────────────────
  // Find the closest detected AR plane to `worldPos` and, if within
  // SURFACE_SNAP_DIST, project the track onto that plane surface and orient
  // it to lie flat.  The track's current azimuth (direction along the surface)
  // is preserved so the user chooses where it points.
  private snapToSurface(obj: Object3D): void {
    let bestDist = SURFACE_SNAP_DIST;
    let bestNormal: Vector3 | null = null;
    let bestPlanePos: Vector3 | null = null;

    for (const planeEnt of this.queries.arPlanes.entities) {
      const planeObj = planeEnt.object3D;
      if (!planeObj) continue;

      // Plane normal = local Y of the plane entity (WebXR convention)
      this._normal.set(0, 1, 0).applyQuaternion(planeObj.quaternion);

      // Signed distance from track centre to this plane
      this._vc.subVectors(obj.position, planeObj.position);
      const signedDist = this._vc.dot(this._normal);

      // Snap from either side — Math.abs lets wall/ceiling tracks work regardless
      // of which way the detected plane's normal faces.
      const absDist = Math.abs(signedDist);
      if (absDist < bestDist) {
        bestDist     = absDist;
        // Ensure normal points toward the track (so the offset pushes it out)
        if (signedDist < 0) this._normal.negate();
        bestNormal   = this._normal.clone();
        bestPlanePos = planeObj.position.clone();
      }
    }

    if (!bestNormal || !bestPlanePos) return;

    // ── 1. Move track onto the plane surface ─────────────────────────
    // Offset the centre up by (RAIL_H + TIE_H) so the bottom of the sleepers
    // sits flush against the detected surface rather than the centre.
    const surfaceOffset = TIE_H + RAIL_H * 0.5;
    this._vc.subVectors(obj.position, bestPlanePos);
    const dist = this._vc.dot(bestNormal);
    obj.position.addScaledVector(bestNormal, -dist + surfaceOffset);

    // ── 2. Reorient: local Y → planeNormal, local Z preserved on surface ──
    // Step A: rotate so world-Y maps to bestNormal
    this._q.setFromUnitVectors(Y_AXIS, bestNormal);

    // Step B: figure out where local Z ended up after step A
    this._dir.copy(Z_AXIS).applyQuaternion(this._q);

    // Project current track direction onto the plane to preserve azimuth
    const curTrackDir = Z_AXIS.clone().applyQuaternion(obj.quaternion);
    const dot = curTrackDir.dot(bestNormal);
    curTrackDir.addScaledVector(bestNormal, -dot).normalize();

    if (curTrackDir.lengthSq() < 0.01) {
      // Track was perpendicular to surface — keep default direction from step A
      obj.quaternion.copy(this._q);
    } else {
      // Step B: rotate _dir → curTrackDir (both ⊥ normal) to restore azimuth
      this._q2.setFromUnitVectors(this._dir, curTrackDir);
      obj.quaternion.multiplyQuaternions(this._q2, this._q);
    }
  }

  // Return the closest surface snap target (position + normal) for the preview,
  // or null if nothing is close enough.
  private findSurfaceSnapTarget(pos: Vector3): { pos: Vector3; normal: Vector3 } | null {
    let bestDist = SURFACE_SNAP_DIST;
    let result: { pos: Vector3; normal: Vector3 } | null = null;

    for (const planeEnt of this.queries.arPlanes.entities) {
      const planeObj = planeEnt.object3D;
      if (!planeObj) continue;

      const normal = new Vector3(0, 1, 0).applyQuaternion(planeObj.quaternion);
      const toPos  = pos.clone().sub(planeObj.position);
      const signedDist = toPos.dot(normal);

      const absDist = Math.abs(signedDist);
      if (absDist < bestDist) {
        bestDist = absDist;
        const facingNormal = signedDist >= 0 ? normal : normal.clone().negate();
        const snapPos = pos.clone().addScaledVector(facingNormal, -absDist + TIE_H + RAIL_H * 0.5);
        result = { pos: snapPos, normal: facingNormal };
      }
    }
    return result;
  }

  // ── Snap logic ────────────────────────────────────────────────────────
  private doSnap(newEnt: Entity) {
    const newId = newEnt.getValue(TrackSegment, "segId") as number;
    const newObj = newEnt.object3D!;
    const { a: newA, b: newB, dir: newDir } = getEndpoints(newObj);
    const newData = this.segMap.get(newId);
    if (!newData) return;

    let bestDist = SNAP_RADIUS;
    let bestCase: {
      newEnd: "A" | "B";
      existId: number;
      existEnd: "A" | "B";
      targetPos: Vector3;
      existObj: Object3D;
    } | null = null;

    for (const [existId, existData] of this.segMap) {
      if (existId === newId) continue;
      const existObj = existData.entity.object3D!;
      const { a: existA, b: existB, dir: existDir } = getEndpoints(existObj);

      // Only check free (unconnected) endpoints on the existing segment
      const checkExistA = existData.connAId === -1;
      const checkExistB = existData.connBId === -1;
      // Only check free endpoints on the new segment too
      const checkNewA = newData.connAId === -1;
      const checkNewB = newData.connBId === -1;

      const candidates: Array<{
        newEnd: "A" | "B"; existEnd: "A" | "B";
        newEndPos: Vector3; existEndPos: Vector3;
      }> = [];
      if (checkNewA && checkExistB) candidates.push({ newEnd: "A", existEnd: "B", newEndPos: newA, existEndPos: existB });
      if (checkNewA && checkExistA) candidates.push({ newEnd: "A", existEnd: "A", newEndPos: newA, existEndPos: existA });
      if (checkNewB && checkExistA) candidates.push({ newEnd: "B", existEnd: "A", newEndPos: newB, existEndPos: existA });
      if (checkNewB && checkExistB) candidates.push({ newEnd: "B", existEnd: "B", newEndPos: newB, existEndPos: existB });

      for (const c of candidates) {
        const d = c.newEndPos.distanceTo(c.existEndPos);
        if (d < bestDist) {
          bestDist  = d;
          bestCase  = { newEnd: c.newEnd, existId, existEnd: c.existEnd, targetPos: c.existEndPos.clone(), existObj };
        }
      }
    }

    if (!bestCase) {
      // No endpoint snap — try to place flat on the nearest AR surface
      this.snapToSurface(newObj);
      return;
    }

    // Snap position/orientation to the neighbouring endpoint
    snapAlign(newObj, bestCase.newEnd, bestCase.targetPos, bestCase.existObj, bestCase.existEnd);

    // Record connections
    const existData = this.segMap.get(bestCase.existId)!;
    if (bestCase.newEnd === "A") {
      newData.connAId  = bestCase.existId;
      newData.connAEnd = bestCase.existEnd;
    } else {
      newData.connBId  = bestCase.existId;
      newData.connBEnd = bestCase.existEnd;
    }
    if (bestCase.existEnd === "A") {
      existData.connAId  = newId;
      existData.connAEnd = bestCase.newEnd;
    } else {
      existData.connBId  = newId;
      existData.connBEnd = bestCase.newEnd;
    }
  }

  // ── Snap indicator update (called in update while holding) ─────────────
  private updateSnapIndicators(heldEnt: Entity) {
    const newId  = heldEnt.getValue(TrackSegment, "segId") as number;
    const newObj = heldEnt.object3D!;
    const { a: newA, b: newB } = getEndpoints(newObj);
    const newData = this.segMap.get(newId);
    if (!newData || !this.snapDotA || !this.snapDotB) return;

    let closestA = Infinity, closestB = Infinity;
    let snapPosA: Vector3 | null = null;
    let snapPosB: Vector3 | null = null;

    for (const [existId, existData] of this.segMap) {
      if (existId === newId) continue;
      const existObj = existData.entity.object3D!;
      const { a: existA, b: existB } = getEndpoints(existObj);

      if (newData.connAId === -1) {
        if (existData.connBId === -1) {
          const d = newA.distanceTo(existB);
          if (d < closestA) { closestA = d; snapPosA = existB.clone(); }
        }
        if (existData.connAId === -1) {
          const d = newA.distanceTo(existA);
          if (d < closestA) { closestA = d; snapPosA = existA.clone(); }
        }
      }
      if (newData.connBId === -1) {
        if (existData.connAId === -1) {
          const d = newB.distanceTo(existA);
          if (d < closestB) { closestB = d; snapPosB = existA.clone(); }
        }
        if (existData.connBId === -1) {
          const d = newB.distanceTo(existB);
          if (d < closestB) { closestB = d; snapPosB = existB.clone(); }
        }
      }
    }

    if (snapPosA && closestA < SNAP_RADIUS * 1.8) {
      this.snapDotA.visible = true;
      this.snapDotA.position.copy(snapPosA);
    } else {
      this.snapDotA.visible = false;
    }

    if (snapPosB && closestB < SNAP_RADIUS * 1.8) {
      this.snapDotB.visible = true;
      this.snapDotB.position.copy(snapPosB);
    } else {
      this.snapDotB.visible = false;
    }
  }

  private hideSnapIndicators() {
    if (this.snapDotA) this.snapDotA.visible = false;
    if (this.snapDotB) this.snapDotB.visible = false;
  }

  // ── Scene-understanding debug ─────────────────────────────────────────
  private toggleDebug() {
    this.debugMode = !this.debugMode;

    if (this.debugMode) {
      // Materialise overlays for all planes already detected
      for (const ent of this.queries.arPlanes.entities) {
        this.createPlaneDebugMesh(ent);
      }
      // If no planes exist, trigger Meta's room-capture flow.
      // initiateRoomCapture() opens the Space Setup UI from inside the XR
      // session — it's the proper way to ask the user to scan their room.
      // It can only be called once per session (WebXR spec), so guard the call.
      if (this.queries.arPlanes.entities.size === 0 && !this.roomCaptureAttempted) {
        this.roomCaptureAttempted = true;
        const session = this.xrManager.getSession() as any;
        if (typeof session?.initiateRoomCapture === "function") {
          session.initiateRoomCapture().catch((e: unknown) => {
            console.warn("[Railroad] initiateRoomCapture failed:", e);
          });
        }
      }
    } else {
      // Remove fill children and hide the plane Object3Ds again
      for (const fill of this.planeDebugMeshes.values()) fill.removeFromParent();
      this.planeDebugMeshes.clear();
      for (const ent of this.queries.arPlanes.entities) {
        if (ent.object3D) ent.object3D.visible = false;
      }
    }

    // Update button appearance
    this.rrUI?.debugBtn.setProperties({
      text:            this.debugMode ? "Debug: On" : "Debug: Off",
      backgroundColor: this.debugMode ? "#1a2a1a"  : "#18181b",
      color:           this.debugMode ? "#86efac"  : "#52525b",
      borderColor:     this.debugMode ? "#16a34a"  : "#3f3f46",
    });
    this.refreshCountUI();
  }

  // Create a coloured fill overlay parented to the XRPlane's Object3D.
  // Floor/ceiling planes → green; wall planes → blue.
  //
  // Root cause of invisible overlays: SceneUnderstandingSystem creates each
  // plane mesh with visible=false by default (showWireFrame config = false).
  // Three.js propagates visible=false to ALL descendants, so children we add
  // are hidden too.  Fix: set planeObj.visible = true here; the parent's own
  // white wireframe (wireframe:true, opacity:0.3) also becomes visible, which
  // is a useful bonus.  Cleanup resets visible=false when debug turns off.
  private createPlaneDebugMesh(entity: Entity) {
    if (this.planeDebugMeshes.has(entity.index)) return;
    const planeObj = entity.object3D;
    if (!planeObj) return;

    const xrPlane = entity.getValue(XRPlane, "_plane") as { orientation?: string } | undefined;
    const isHorizontal = xrPlane?.orientation === "horizontal";

    // Use the actual plane bounding-box dimensions (set by SceneUnderstandingSystem
    // from the XRPlane polygon) so the fill covers the real detected surface.
    const boxGeo = (planeObj as any).geometry as BoxGeometry | undefined;
    const planeW = boxGeo?.parameters?.width ?? 2;
    const planeD = boxGeo?.parameters?.depth ?? 2;

    const fillMat = new MeshBasicMaterial({
      color:       isHorizontal ? 0x00ff44 : 0x4488ff,
      transparent: true,
      opacity:     0.30,
      side:        2,   // DoubleSide
      depthWrite:  false,
    });
    // PlaneGeometry lies in XY (normal = +Z). Rotate -90° around X so it
    // lies in the entity's XZ plane (normal = +Y = surface normal).
    const fill = new Mesh(new PlaneGeometry(planeW, planeD), fillMat);
    fill.rotation.x = -Math.PI / 2;
    planeObj.add(fill);

    // Un-hide parent so our fill child (and the existing white wireframe) shows.
    planeObj.visible = true;

    this.planeDebugMeshes.set(entity.index, fill);
  }
  private updateSurfacePreview(heldEnt: Entity) {
    if (!this.surfacePreview) return;
    const obj = heldEnt.object3D!;
    const target = this.findSurfaceSnapTarget(obj.position);

    if (!target) {
      this.surfacePreview.visible = false;
      return;
    }

    this.surfacePreview.visible = true;
    this.surfacePreview.position.copy(target.pos);
    // PlaneGeometry normal is +Z; rotate so it faces along the surface normal
    this.surfacePreview.quaternion.setFromUnitVectors(Z_AXIS, target.normal);
  }

  // ── Spawn train ───────────────────────────────────────────────────────
  private spawnTrain() {
    // Use any track in the scene — prefer placed ones, accept unplaced too.
    // Only fall back to spawning a track when the map is completely empty.
    // (Previously required placed=true, which meant tracks that were spawned
    // but never grabbed-and-released were ignored, confusingly spawning a
    // second track when the user pressed the train button.)
    let startData: SegData | null = null;
    for (const data of this.segMap.values()) {
      if (data.entity.getValue(TrackSegment, "placed")) { startData = data; break; }
      if (!startData) startData = data; // accept unplaced as fallback
    }
    if (!startData) {
      // No track in the scene at all — spawn one first
      this.spawnTrackPiece();
      return;
    }

    const startId = startData.entity.getValue(TrackSegment, "segId") as number;
    const mesh = makeTrainMesh();

    // Position at A end of start segment
    const { a: startA, dir } = getEndpoints(startData.entity.object3D!);
    mesh.position.copy(startA).addScaledVector(dir, HALF_SEG * 0.5);
    mesh.quaternion.setFromUnitVectors(Z_AXIS, dir);

    this.world
      .createTransformEntity(mesh)
      .addComponent(TrackTrain, { segId: startId, t: 0.1, direction: 1 });

    this.refreshCountUI();
  }

  // ── Update: move trains along track ───────────────────────────────────
  update(delta: number) {
    if (!this.active) return;

    // Keep plane count live in debug mode
    if (this.debugMode) this.refreshCountUI();

    // Show snap indicators while holding a track piece
    let hasHeld = false;
    for (const ent of this.queries.heldTrack.entities) {
      hasHeld = true;
      this.updateSnapIndicators(ent);
      this.updateSurfacePreview(ent);
    }
    if (!hasHeld) {
      this.hideSnapIndicators();
      if (this.surfacePreview) this.surfacePreview.visible = false;
    }

    // Move trains
    for (const trainEnt of this.queries.allTrains.entities) {
      let segId = trainEnt.getValue(TrackTrain, "segId") as number;
      let t     = trainEnt.getValue(TrackTrain, "t")     as number;
      let dir   = trainEnt.getValue(TrackTrain, "direction") as number;

      const segData = this.segMap.get(segId);
      if (!segData) continue;
      const segObj = segData.entity.object3D!;

      const travelDist = TRAIN_SPEED * delta;
      t += (dir * travelDist) / SEG_LEN;

      // Handle segment transitions.
      // Re-fetch currentData each iteration so we always follow the correct
      // segment's connectivity (segData captured above is stale after segId changes).
      let iterations = 0;
      while ((t > 1 || t < 0) && iterations < 8) {
        iterations++;
        const currentData = this.segMap.get(segId);
        if (!currentData) break;

        if (t > 1) {
          // Reached B end — try to continue to connected segment
          const nextId  = currentData.connBId;
          const nextEnd = currentData.connBEnd;
          if (nextId !== -1) {
            const nextData = this.segMap.get(nextId);
            if (nextData) {
              const overshoot = (t - 1) * SEG_LEN;
              segId   = nextId;
              if (nextEnd === "B") {
                dir = -1;
                t   = 1 - overshoot / SEG_LEN;
              } else {
                dir = 1;
                t   = overshoot / SEG_LEN;
              }
              continue;
            }
          }
          // No connection — reverse
          dir = -1;
          t   = 2 - t;
        } else if (t < 0) {
          // Reached A end — try to continue to connected segment
          const nextId  = currentData.connAId;
          const nextEnd = currentData.connAEnd;
          if (nextId !== -1) {
            const nextData = this.segMap.get(nextId);
            if (nextData) {
              const overshoot = Math.abs(t) * SEG_LEN;
              segId   = nextId;
              if (nextEnd === "A") {
                dir = 1;
                t   = overshoot / SEG_LEN;
              } else {
                dir = -1;
                t   = 1 - overshoot / SEG_LEN;
              }
              continue;
            }
          }
          // No connection — reverse
          dir = 1;
          t   = -t;
        }
        break;
      }

      t = Math.max(0, Math.min(1, t));

      // Position train along segment
      const { a, b, dir: trackDir } = getEndpoints(this.segMap.get(segId)!.entity.object3D!);
      this._va.lerpVectors(a, b, t);
      trainEnt.object3D!.position.copy(this._va);

      // Orient train to face travel direction.
      // Use setFromAxisAngle around Y so we always get a clean Y-only rotation
      // with no roll — setFromUnitVectors can produce unexpected roll when
      // trackDir is antiparallel to Z_AXIS.
      const faceDir = dir > 0 ? trackDir : this._dir.copy(trackDir).negate();
      const angle   = Math.atan2(faceDir.x, faceDir.z);
      this._q.setFromAxisAngle(Y_AXIS, angle);
      trainEnt.object3D!.quaternion.copy(this._q);

      // Write back
      trainEnt.setValue(TrackTrain, "segId",     segId);
      trainEnt.setValue(TrackTrain, "t",         t);
      trainEnt.setValue(TrackTrain, "direction", dir);
    }
  }

  // ── Clear all ─────────────────────────────────────────────────────────
  private clearAll() {
    for (const ent of Array.from(this.queries.allTrack.entities)) {
      ent.dispose();
    }
    for (const ent of Array.from(this.queries.allTrains.entities)) {
      ent.dispose();
    }
    this.segMap.clear();
    this.nextSegId = 1;
    this.refreshCountUI();
  }
}
