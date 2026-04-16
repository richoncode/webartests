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
  eq,
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
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
const SNAP_RADIUS   = 0.10;   // distance at which endpoints snap (m)
const TRAIN_SPEED   = 0.30;   // m/s along track

const RAIL_MAT    = new MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.7 });
const TIE_MAT     = new MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
const SNAP_MAT    = new MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 });

const Z_AXIS = new Vector3(0, 0, 1);

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

  // Two rails
  const railGeo = new BoxGeometry(RAIL_W, RAIL_H, SEG_LEN);
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
// continuing in the correct direction from `existDir` / `existEnd`.
function snapAlign(
  obj:        Object3D,
  newEnd:     "A" | "B",
  targetPos:  Vector3,
  existDir:   Vector3,
  existEnd:   "B" | "A",
): void {
  // Natural continuation (A→B or B→A): same orientation.
  // Back-to-back (A→A or B→B): reversed orientation.
  const sameSide  = newEnd === existEnd;
  const newDir    = sameSide ? existDir.clone().negate() : existDir.clone();
  const endOffset = newEnd === "A" ? -HALF_SEG : HALF_SEG;

  obj.quaternion.setFromUnitVectors(Z_AXIS, newDir);
  // Ensure newEnd is at targetPos: obj.pos + newDir * endOffset = targetPos
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
}) {
  private active        = false;
  private nextSegId     = 1;
  private segMap        = new Map<number, SegData>();
  private panelEntity:  Entity | null = null;
  private panelOrigPos  = new Vector3();
  private panelOrigRotY = 0;
  private panelOrigScale = 1;

  // Snap indicator dots (one per held segment endpoint)
  private snapDotA: Mesh | null = null;
  private snapDotB: Mesh | null = null;

  // Railroad-screen button zones (4 buttons)
  private rrBtnZoneEntities:  Entity[] = [];
  private rrBtnZoneMaterials: MeshStandardMaterial[] = [];

  // UI refs
  private rrUI: {
    screen:     UIKit.Text;
    count:      UIKit.Text;
  } | null = null;

  // Scratch
  private _va  = new Vector3();
  private _vb  = new Vector3();
  private _dir = new Vector3();
  private _q   = new Quaternion();

  init() {
    // Wire panel when it qualifies
    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.rrUI) return;
      this.panelEntity = entity;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;

      this.rrUI = {
        screen: doc.getElementById("railroad-screen") as UIKit.Text,
        count:  doc.getElementById("rr-track-count") as UIKit.Text,
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

      // Build 3D button zones parented to panel (created without Interactable; enabled on startGame)
      this.buildButtonZones(entity);
    });

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
    this.hideScreen();
    for (const e of this.rrBtnZoneEntities) {
      if (e.hasComponent(Interactable)) e.removeComponent(Interactable);
    }

    if (this.panelEntity?.object3D) {
      this.panelEntity.object3D.position.copy(this.panelOrigPos);
      this.panelEntity.object3D.rotation.y = this.panelOrigRotY;
      this.panelEntity.object3D.scale.setScalar(this.panelOrigScale);
    }
  }

  private showScreen() {
    this.rrUI?.screen.setProperties({ display: "flex" });

    // Position panel to the right of the player, facing them, scaled up
    if (this.panelEntity?.object3D) {
      const obj = this.panelEntity.object3D;
      this.panelOrigPos.copy(obj.position);
      this.panelOrigRotY = obj.rotation.y;
      this.panelOrigScale = obj.scale.x;

      const px = 1.8;
      const pz = -1.0;
      obj.position.set(px, obj.position.y, pz);
      obj.rotation.y = Math.atan2(-px, -pz);
      obj.scale.setScalar(1.4);
    }
  }

  private hideScreen() {
    this.rrUI?.screen.setProperties({ display: "none" });
  }

  private refreshCountUI() {
    if (!this.rrUI) return;
    const segs   = this.segMap.size;
    const trains = this.queries.allTrains.entities.size;
    this.rrUI.count.setProperties({ text: `${segs} piece${segs !== 1 ? "s" : ""} · ${trains} train${trains !== 1 ? "s" : ""}` });
  }

  // ── Railroad-screen button zones ──────────────────────────────────────
  // Layout mirrors game-screen action buttons (two rows, two columns each).
  // Railroad-screen content height ≈ 40.9 UIKit units.
  // Row 1 (+ Track / + Train): center at 25.02 units from panel top.
  // Row 2 (Clear All / Menu):  center at 34.12 units from panel top.
  // Buttons are 32 units wide with a 2-unit gap (content 66 units, centered).
  private buildButtonZones(panelEntity: Entity) {
    const scale      = 0.76 / 72;         // m per UIKit unit
    const rrH        = 40.9;              // railroad-screen height (units)
    const row1Y      = (rrH / 2 - 25.02) * scale;   //  ≈ -0.048 m
    const row2Y      = (rrH / 2 - 34.12) * scale;   //  ≈ -0.144 m
    const leftX      = -17 * scale;                   //  ≈ -0.180 m
    const rightX     = +17 * scale;                   //  ≈ +0.180 m
    const btnW       = 32  * scale;
    const btnH       = 7.6 * scale * 1.5;  // 1.5× for easier hit
    const zoneD      = 0.04;
    const localZ     = 0.06;

    const defs = [
      { action: 0, x: leftX,  y: row1Y, color: 0x22bb88 },  // + Track
      { action: 1, x: rightX, y: row1Y, color: 0xffcc22 },  // + Train
      { action: 2, x: leftX,  y: row2Y, color: 0x888888 },  // Clear All
      { action: 3, x: rightX, y: row2Y, color: 0x888888 },  // Menu
    ];

    for (const { action, x, y, color } of defs) {
      const mat = new MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.0,
        transparent: true, opacity: 0.0, depthWrite: false,
      });
      this.rrBtnZoneMaterials[action] = mat;

      const mesh = new Mesh(new BoxGeometry(btnW, btnH, zoneD), mat);
      mesh.position.set(x, y, localZ);

      // No Interactable yet — added in startGame(), removed in cleanup()
      this.rrBtnZoneEntities.push(
        this.world.createTransformEntity(mesh, panelEntity)
          .addComponent(RailroadButtonZone, { actionType: action }),
      );
    }
  }

  // ── Spawn track piece ─────────────────────────────────────────────────
  private spawnTrackPiece() {
    const id   = this.nextSegId++;
    const mesh = makeTrackMesh();

    // Spawn at arm's reach in front-right of player
    this.player.head.getWorldPosition(this._va);
    mesh.position.set(this._va.x + 0.25, this._va.y - 0.2, this._va.z - 0.45);

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
      existDir: Vector3;
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
          bestCase  = { newEnd: c.newEnd, existId, existEnd: c.existEnd, targetPos: c.existEndPos.clone(), existDir: existDir.clone() };
        }
      }
    }

    if (!bestCase) return;

    // Snap position/orientation
    snapAlign(newObj, bestCase.newEnd, bestCase.targetPos, bestCase.existDir, bestCase.existEnd);

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

  // ── Spawn train ───────────────────────────────────────────────────────
  private spawnTrain() {
    // Find any placed segment to put the train on
    let startData: SegData | null = null;
    for (const data of this.segMap.values()) {
      const placed = data.entity.getValue(TrackSegment, "placed") as boolean;
      if (placed) { startData = data; break; }
    }
    if (!startData) {
      // No placed track yet — place a track piece first
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

    // Show snap indicators while holding a track piece
    for (const ent of this.queries.heldTrack.entities) {
      this.updateSnapIndicators(ent);
    }
    if (this.queries.heldTrack.entities.size === 0) {
      this.hideSnapIndicators();
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

      // Handle segment transitions
      let iterations = 0;
      while ((t > 1 || t < 0) && iterations < 8) {
        iterations++;
        if (t > 1) {
          // Reached B end — try to continue to connected segment
          const nextId  = segData.connBId;
          const nextEnd = segData.connBEnd;
          if (nextId !== -1) {
            const nextData = this.segMap.get(nextId);
            if (nextData) {
              const overshoot = (t - 1) * SEG_LEN;
              segId   = nextId;
              // If we entered via B end of next segment, we travel A→B direction (reversed)
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
          const nextId  = segData.connAId;
          const nextEnd = segData.connAEnd;
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

      // Orient train (face travel direction)
      const faceDir = dir > 0 ? trackDir.clone() : trackDir.clone().negate();
      trainEnt.object3D!.quaternion.setFromUnitVectors(Z_AXIS, faceDir);

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
