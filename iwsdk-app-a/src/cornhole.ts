import {
  createComponent,
  createSystem,
  Entity,
  Types,
  eq,
  Interactable,
  Pressed,
  DistanceGrabbable,
  MovementMode,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  PhysicsBody,
  PhysicsState,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsManipulation,
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";

// ── Panel config (same panel as drop-ttt) ──────────────────────────────────
const PANEL_CONFIG = "./ui/game-status.json";

// ── Board geometry constants (standard cornhole) ───────────────────────────
const CH_BOARD_DISTANCE  = 3.0;              // m in front of player
const CH_BOARD_WIDTH     = 0.61;             // m  (24")
const CH_BOARD_LENGTH    = 1.22;             // m  (48")
const CH_BOARD_THICKNESS = 0.018;            // m
const CH_BOARD_ANGLE     = 12 * Math.PI / 180;
const CH_HOLE_RADIUS     = 0.076;            // m  (6" diameter / 2)
// Hole is 9" (0.23 m) from the far (high) end, centered
const CH_HOLE_Z_LOCAL    = -(CH_BOARD_LENGTH / 2 - 0.23); // in board local space

// ── Bag & holder constants ─────────────────────────────────────────────────
const CH_HOLDER_X  =  0.55;   // m right of player
const CH_HOLDER_Y  =  0.8;    // m height
const CH_HOLDER_Z  = -0.5;    // m in front
const CH_BAG_SIZE  =  0.115;  // m  side length
const CH_BAG_H     =  0.05;   // m  bag thickness (thicker = easier to grab)
const CH_BAG_COLORS = [0xff3333, 0x3399ff, 0x33cc66, 0xffcc00];

// ── Physics / flight constants ─────────────────────────────────────────────
const CH_LANDING_SPEED   = 0.5;  // m/s — below this the bag is "at rest"
const CH_FLIGHT_COOLDOWN = 0.3;  // s   — ignore velocity before this
const GRAVITY            = 9.81; // m/s²

// ── Lob power constants ────────────────────────────────────────────────────
const CH_LOB_MIN_SPEED   = 3.0;  // m/s — speed at minimum charge
const CH_LOB_MAX_SPEED   = 9.0;  // m/s — speed at full charge
const CH_LOB_CHARGE_TIME = 2.0;  // s   — hold time to reach full power

// ── Arc preview ────────────────────────────────────────────────────────────
const CH_ARC_POINTS = 22;

// ── Components ────────────────────────────────────────────────────────────
export const CornholeBag = createComponent("CornholeBag", {
  bagIndex:   { type: Types.Int8,    default: 0 },
  inFlight:   { type: Types.Boolean, default: false },
  flightTime: { type: Types.Float32, default: 0 },
  scored:     { type: Types.Boolean, default: false },
  sinking:    { type: Types.Boolean, default: false },
  sinkTimer:  { type: Types.Float32, default: 0 },
});

export const CornholeBoard = createComponent("CornholeBoard", {});
export const CornholeArcDot = createComponent("CornholeArcDot", {
  dotIndex: { type: Types.Int8, default: 0 },
});

// ── Bag dot characters for UI ─────────────────────────────────────────────
const BAG_DOTS = ["● ● ● ●", "○ ● ● ●", "○ ○ ● ●", "○ ○ ○ ●", "○ ○ ○ ○"];

// ── System ────────────────────────────────────────────────────────────────
export class CornholeSystem extends createSystem({
  bags:        { required: [CornholeBag] },
  bagsInFlight: { required: [CornholeBag], where: [eq(CornholeBag, "inFlight", true)] },
  bagsSinking:  { required: [CornholeBag], where: [eq(CornholeBag, "sinking", true)] },
  bagsGrabbed:  { required: [CornholeBag, Pressed] },
  arcDots:      { required: [CornholeArcDot] },
  panel:        { required: [PanelUI, PanelDocument], where: [eq(PanelUI, "config", PANEL_CONFIG)] },
}) {
  // ── Game state ────────────────────────────────────────────────────────
  private active      = false;
  private throwMode: "grab" | "lob" = "grab";
  private arcPreview  = false;
  private roundScore  = 0;
  private highScore   = 0;
  private bagsThrown  = 0;
  private roundOver   = false;

  // ── Lob charging state ────────────────────────────────────────────────
  private lobCharging  = false;
  private lobPower     = 0;
  private hapticTimer  = 0;

  // ── Scene refs ────────────────────────────────────────────────────────
  private boardMesh: Mesh | null = null;
  private boardEntity: { dispose(): void } | null = null;
  private holderEntity: { dispose(): void } | null = null;
  private floorEntity: { dispose(): void } | null = null;
  // ── Panel ref (repositioned during cornhole so it's out of throw path) ─
  private panelEntity: Entity | null = null;
  private panelOrigPos = new Vector3();
  private panelOrigRotY = 0;
  private panelOrigScale = 1;
  // ── UI refs ───────────────────────────────────────────────────────────
  private chUI: {
    screen:       UIKit.Text;
    bags:         UIKit.Text;
    roundScore:   UIKit.Text;
    bestScore:    UIKit.Text;
    grabBtn:      UIKit.Text;
    lobBtn:       UIKit.Text;
    arcBtn:       UIKit.Text;
    newRoundBtn:  UIKit.Text;
  } | null = null;

  // ── Scratch vectors (no per-frame allocation) ─────────────────────────
  private _v0 = new Vector3();
  private _v1 = new Vector3();
  private _v2 = new Vector3();
  private _dir = new Vector3(); // lob direction

  // ── Landing detection: prev position per bag slot ─────────────────────
  private prevBagPos: (Vector3 | null)[] = [null, null, null, null];

  // ─────────────────────────────────────────────────────────────────────
  init() {
    // Load high score from localStorage
    const saved = localStorage.getItem("cornhole-best");
    this.highScore = saved ? parseInt(saved, 10) : 0;

    // Wire panel when PanelDocument qualifies
    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.chUI) return;
      this.panelEntity = entity;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;

      this.chUI = {
        screen:      doc.getElementById("cornhole-screen") as UIKit.Text,
        bags:        doc.getElementById("ch-bags")         as UIKit.Text,
        roundScore:  doc.getElementById("ch-round-score")  as UIKit.Text,
        bestScore:   doc.getElementById("ch-best-score")   as UIKit.Text,
        grabBtn:     doc.getElementById("ch-grab-btn")     as UIKit.Text,
        lobBtn:      doc.getElementById("ch-lob-btn")      as UIKit.Text,
        arcBtn:      doc.getElementById("ch-arc-btn")      as UIKit.Text,
        newRoundBtn: doc.getElementById("ch-new-round-btn") as UIKit.Text,
      };

      // Throw mode toggle
      (doc.getElementById("ch-grab-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.setThrowMode("grab"));
      (doc.getElementById("ch-lob-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.setThrowMode("lob"));

      // Arc preview toggle (lob mode only)
      (doc.getElementById("ch-arc-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.toggleArcPreview());

      // New round
      (doc.getElementById("ch-new-round-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.startNewRound(); });

      // Back to menu
      (doc.getElementById("ch-menu-btn") as UIKit.Text)
        ?.addEventListener("click", () => { if (this.active) this.endGame(); });
    });

    // When a bag is grabbed, freeze the other shelf bags so they can't be pushed off
    this.queries.bagsGrabbed.subscribe("qualify", (entity) => {
      if (!this.active) return;
      const grabbedIdx = entity.getValue(CornholeBag, "bagIndex") as number;
      for (const bag of this.queries.bags.entities) {
        const idx      = bag.getValue(CornholeBag, "bagIndex")  as number;
        const inFlight = bag.getValue(CornholeBag, "inFlight")  as boolean;
        const scored   = bag.getValue(CornholeBag, "scored")    as boolean;
        if (idx === grabbedIdx || inFlight || scored) continue;
        if (bag.hasComponent(PhysicsBody)) {
          bag.setValue(PhysicsBody, "state", PhysicsState.Kinematic);
        }
      }
    });

    // React to bags being grabbed then released (grab-mode throw detection)
    this.queries.bagsGrabbed.subscribe("disqualify", (entity) => {
      // Throw detection (grab mode only)
      if (this.active && this.throwMode === "grab") {
        const inFlight = entity.getValue(CornholeBag, "inFlight") as boolean;
        const scored   = entity.getValue(CornholeBag, "scored")   as boolean;
        if (!inFlight && !scored) {
          // Mark as in flight — DO NOT remove Interactable/DistanceGrabbable here.
          // IWSDK's grab system is still finishing release (applying throw velocity) in
          // this same frame; removing the component now corrupts its state and freezes.
          // The update() loop cleans up these components on the next frame.
          const idx = entity.getValue(CornholeBag, "bagIndex") as number;
          entity.setValue(CornholeBag, "inFlight", true);
          entity.setValue(CornholeBag, "flightTime", 0);
          this.bagsThrown++;
          this.prevBagPos[idx] = null;
          this.updateBagsUI();
          if (this.bagsThrown >= 4) this.roundOver = true;
        }
      }

      // Restore the frozen shelf bags to Dynamic now that the grab is over
      if (this.active) {
        for (const bag of this.queries.bags.entities) {
          const inFlight = bag.getValue(CornholeBag, "inFlight") as boolean;
          const scored   = bag.getValue(CornholeBag, "scored")   as boolean;
          if (inFlight || scored) continue;
          if (bag.hasComponent(PhysicsBody)) {
            bag.setValue(PhysicsBody, "state", PhysicsState.Dynamic);
          }
        }
      }
    });

    // Subscribe to activeGame signal from globals
    const activeGame = this.globals.activeGame as Signal<string>;
    if (activeGame) {
      this.cleanupFuncs.push(
        activeGame.subscribe((game) => {
          if (game === "cornhole" && !this.active) {
            this.startGame();
          } else if (game !== "cornhole" && this.active) {
            this.cleanup();
          }
        }),
      );
    }
  }

  // ── Public: called by signal ──────────────────────────────────────────
  startGame() {
    this.active    = true;
    this.throwMode = "grab";
    this.arcPreview = false;
    this.spawnBoard();
    this.spawnHolder();
    this.spawnFloor();
    this.startNewRound();
    this.showScreen();
  }

  endGame() {
    const activeGame = this.globals.activeGame as Signal<string>;
    if (activeGame) activeGame.value = "menu";
    // cleanup() will be triggered by the signal subscription above,
    // but also call directly in case signal fires synchronously
  }

  // ── Internal lifecycle ────────────────────────────────────────────────
  private cleanup() {
    this.active = false;

    // Dispose bags
    for (const entity of this.queries.bags.entities) {
      entity.dispose();
    }
    // Dispose arc dots
    for (const entity of this.queries.arcDots.entities) {
      entity.dispose();
    }
    // Dispose board, holder, and floor
    this.boardEntity?.dispose();
    this.holderEntity?.dispose();
    this.floorEntity?.dispose();
    this.boardMesh    = null;
    this.boardEntity  = null;
    this.holderEntity = null;
    this.floorEntity  = null;

    this.bagsThrown  = 0;
    this.roundScore  = 0;
    this.roundOver   = false;
    this.prevBagPos  = [null, null, null, null];
    this.lobCharging = false;
    this.lobPower    = 0;

    // Restore panel to its original position, rotation and scale
    if (this.panelEntity?.object3D) {
      this.panelEntity.object3D.position.copy(this.panelOrigPos);
      this.panelEntity.object3D.rotation.y = this.panelOrigRotY;
      this.panelEntity.object3D.scale.setScalar(this.panelOrigScale);
    }

    this.hideScreen();
  }

  private startNewRound() {
    // Dispose previous bags and arc dots
    for (const entity of this.queries.bags.entities) entity.dispose();
    for (const entity of this.queries.arcDots.entities) entity.dispose();

    this.bagsThrown  = 0;
    this.roundScore  = 0;
    this.roundOver   = false;
    this.prevBagPos  = [null, null, null, null];
    this.lobCharging = false;
    this.lobPower    = 0;

    this.spawnBags();
    this.spawnArcDots();

    // Ensure correct mode state on UI
    this.setThrowMode(this.throwMode);
    this.refreshUI();
  }

  // ── World building ────────────────────────────────────────────────────
  private spawnBoard() {
    const angle = CH_BOARD_ANGLE;
    // Board center: front edge on floor at z = -CH_BOARD_DISTANCE
    const halfLen = CH_BOARD_LENGTH / 2;
    const centerY = halfLen * Math.sin(angle);
    const centerZ = -(CH_BOARD_DISTANCE + halfLen * Math.cos(angle));

    // Main board surface
    const boardMat = new MeshStandardMaterial({ color: 0xc8874a, roughness: 0.7 });
    const boardGeo = new BoxGeometry(CH_BOARD_WIDTH, CH_BOARD_THICKNESS, CH_BOARD_LENGTH);
    const boardMesh = new Mesh(boardGeo, boardMat);
    boardMesh.position.set(0, centerY, centerZ);
    boardMesh.rotation.x = angle;  // front edge low (toward player), back edge elevated
    this.boardMesh = boardMesh;

    // Dark circle for the hole (visual only — slightly raised above board)
    const holeMat = new MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
    const holeGeo = new CylinderGeometry(CH_HOLE_RADIUS, CH_HOLE_RADIUS, 0.001, 32);
    const holeMesh = new Mesh(holeGeo, holeMat);
    holeMesh.position.set(0, CH_BOARD_THICKNESS / 2 + 0.0005, CH_HOLE_Z_LOCAL);
    boardMesh.add(holeMesh);

    // Board legs (two small boxes at front and back)
    const legMat = new MeshStandardMaterial({ color: 0x7c5230, roughness: 0.8 });
    const legFront = new Mesh(new BoxGeometry(0.55, 0.18, 0.03), legMat);
    legFront.position.set(0, -0.09, CH_BOARD_LENGTH / 2 - 0.05);
    boardMesh.add(legFront);
    const legBack = new Mesh(new BoxGeometry(0.55, 0.03, 0.03), legMat);
    legBack.position.set(0, 0.09, -(CH_BOARD_LENGTH / 2 - 0.05));
    boardMesh.add(legBack);

    this.boardEntity = this.world
      .createTransformEntity(boardMesh)
      .addComponent(CornholeBoard)
      .addComponent(PhysicsBody, { state: PhysicsState.Static })
      .addComponent(PhysicsShape, {
        shape: PhysicsShapeType.Box,
        dimensions: [CH_BOARD_WIDTH, 0.03, CH_BOARD_LENGTH], // slightly thicker than visual to prevent tunneling
        friction: 0.2,       // low board friction → bags slide up the surface
        restitution: 0.15,
      });
  }

  private spawnHolder() {
    const shelfMat = new MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 });
    const shelfGeo = new BoxGeometry(0.18, 0.018, 0.62);
    const shelfMesh = new Mesh(shelfGeo, shelfMat);
    shelfMesh.position.set(CH_HOLDER_X, CH_HOLDER_Y, CH_HOLDER_Z);

    this.holderEntity = this.world
      .createTransformEntity(shelfMesh)
      .addComponent(PhysicsBody, { state: PhysicsState.Static })
      .addComponent(PhysicsShape, {
        shape: PhysicsShapeType.Box,
        dimensions: [0.18, 0.018, 0.62],
        friction: 0.8,
        restitution: 0.05,
      });
  }

  private spawnFloor() {
    // Invisible static physics plane catches bags that fall off the shelf or board
    const floorGeo = new BoxGeometry(8, 0.05, 8);
    const floorMat = new MeshStandardMaterial({ color: 0xffffff });
    const floorMesh = new Mesh(floorGeo, floorMat);
    floorMesh.visible = false;
    floorMesh.position.set(0, -0.025, -2.5); // top surface sits at y = 0

    this.floorEntity = this.world
      .createTransformEntity(floorMesh)
      .addComponent(PhysicsBody, { state: PhysicsState.Static })
      .addComponent(PhysicsShape, {
        shape: PhysicsShapeType.Box,
        dimensions: [8, 0.05, 8],
        friction: 0.5,
        restitution: 0.05,
      });
  }

  private spawnBags() {
    const shelfTop = CH_HOLDER_Y + 0.009 + CH_BAG_H / 2 + 0.002;
    const zStart   = CH_HOLDER_Z - 0.22;
    const zStep    = 0.145;

    for (let i = 0; i < 4; i++) {
      const mat = new MeshStandardMaterial({ color: CH_BAG_COLORS[i], roughness: 0.85 });
      const geo = new BoxGeometry(CH_BAG_SIZE, CH_BAG_H, CH_BAG_SIZE);
      const mesh = new Mesh(geo, mat);
      mesh.position.set(CH_HOLDER_X, shelfTop, zStart + i * zStep);

      // Pre-add to scene so InputSystem picks up Interactable in the same frame
      this.scene.add(mesh);

      this.world
        .createTransformEntity(mesh)
        .addComponent(CornholeBag, { bagIndex: i })
        .addComponent(PhysicsBody, {
          state: PhysicsState.Dynamic,
          linearDamping: 0.3,  // low air drag so bags carry momentum onto the board
          angularDamping: 1.0,
          gravityFactor: 1.0,
        })
        .addComponent(PhysicsShape, {
          shape: PhysicsShapeType.Box,
          dimensions: [CH_BAG_SIZE, CH_BAG_H, CH_BAG_SIZE],
          friction: 0.25,      // low bag-on-board friction → slide effect
          restitution: 0.15,
          density: 0.6,
        })
        .addComponent(Interactable)
        .addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveFromTarget });
    }
  }

  private spawnArcDots() {
    const dotMat = new MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.0,
    });
    for (let i = 0; i < CH_ARC_POINTS; i++) {
      const mesh = new Mesh(new CylinderGeometry(0.012, 0.012, 0.012, 8), dotMat.clone());
      mesh.visible = false;
      this.world
        .createTransformEntity(mesh)
        .addComponent(CornholeArcDot, { dotIndex: i });
    }
  }

  // ── Update loop ───────────────────────────────────────────────────────
  update(delta: number) {
    if (!this.active) return;

    // Hole-sink animation: bags that scored a hole drop through the board visually
    for (const entity of this.queries.bagsSinking.entities) {
      let timer = entity.getValue(CornholeBag, "sinkTimer") as number;
      timer += delta;
      entity.setValue(CornholeBag, "sinkTimer", timer);
      entity.object3D!.position.y -= 0.4 * delta; // sink at 0.4 m/s
      if (timer > 0.45) {
        entity.object3D!.visible = false;
        entity.setValue(CornholeBag, "sinking", false); // leave sinking query
      }
    }

    // Deferred cleanup: remove grab components from bags now in flight.
    // This must run one frame after the disqualify handler so IWSDK's grab
    // system has finished applying the throw velocity before we touch the entity.
    for (const entity of this.queries.bagsInFlight.entities) {
      if (entity.hasComponent(Interactable))     entity.removeComponent(Interactable);
      if (entity.hasComponent(DistanceGrabbable)) entity.removeComponent(DistanceGrabbable);
    }

    // Landing detection for in-flight bags
    for (const entity of this.queries.bagsInFlight.entities) {
      const scored = entity.getValue(CornholeBag, "scored") as boolean;
      if (scored) continue;

      const idx   = entity.getValue(CornholeBag, "bagIndex")   as number;
      let time    = entity.getValue(CornholeBag, "flightTime") as number;
      time += delta;
      entity.setValue(CornholeBag, "flightTime", time);

      if (time < CH_FLIGHT_COOLDOWN) continue;

      // Continuous hole check: score the moment the bag is directly above the hole.
      // The board physics is solid so bags never fall through physically — we detect
      // proximity in board-local space and hide the bag to simulate it.
      if (this.boardMesh) {
        entity.object3D!.getWorldPosition(this._v1);
        this._v2.copy(this._v1);
        this.boardMesh.worldToLocal(this._v2);
        // Only check within a reasonable Y band above the board surface
        if (this._v2.y > -0.05 && this._v2.y < 0.3) {
          const dx = this._v2.x;
          const dz = this._v2.z - CH_HOLE_Z_LOCAL;
          if (Math.sqrt(dx * dx + dz * dz) < CH_HOLE_RADIUS + CH_BAG_SIZE / 2) {
            this.scoreBag(entity, idx);
            continue;
          }
        }
      }

      const pos  = entity.object3D!.position;
      const prev = this.prevBagPos[idx];
      if (!prev) {
        this.prevBagPos[idx] = new Vector3(pos.x, pos.y, pos.z);
        continue;
      }
      const speed = prev.distanceTo(pos) / delta;
      prev.set(pos.x, pos.y, pos.z);

      if (speed < CH_LANDING_SPEED) {
        this.scoreBag(entity, idx);
      }
    }

    // Lob mode: hold trigger to charge power, release to fire
    if (this.throwMode === "lob" && !this.roundOver) {
      const gamepad = this.input.gamepads.right;

      if (gamepad?.getSelectStart()) {
        this.lobCharging = true;
        this.lobPower    = 0;
        this.hapticTimer = 0; // fire first pulse immediately
      }

      if (this.lobCharging) {
        this.lobPower = Math.min(1.0, this.lobPower + delta / CH_LOB_CHARGE_TIME);

        // Haptic rumble builds with power; stops at full charge
        if (this.lobPower < 1.0) {
          this.hapticTimer -= delta;
          if (this.hapticTimer <= 0) {
            this.hapticTimer = 0.08; // pulse every 80 ms
            this.pulseHaptic("right", 0.15 + this.lobPower * 0.55, 80);
          }
        }

        if (this.arcPreview) this.updateArcPreview();
      }

      if (gamepad?.getSelectEnd() && this.lobCharging) {
        this.lobCharging = false;
        if (this.lobPower > 0.05) this.fireLobBag(this.lobPower);
        this.lobPower = 0;
        // Hide arc dots after releasing
        for (const e of this.queries.arcDots.entities) {
          e.object3D!.visible = false;
        }
      }
    }
  }

  // ── Scoring ───────────────────────────────────────────────────────────
  private scoreBag(entity: Entity, idx: number) {
    if (!this.boardMesh) return;

    entity.setValue(CornholeBag, "scored", true);

    // Transform bag world position to board local space
    entity.object3D!.getWorldPosition(this._v0);
    this.boardMesh.worldToLocal(this._v0);

    // Check hole (within hole radius on the board surface)
    const dx = this._v0.x;
    const dz = this._v0.z - CH_HOLE_Z_LOCAL;
    const distToHole = Math.sqrt(dx * dx + dz * dz);

    // Check board bounds (within board footprint in local XZ)
    const onBoard =
      Math.abs(this._v0.x) < CH_BOARD_WIDTH / 2 + CH_BAG_SIZE / 2 &&
      Math.abs(this._v0.z) < CH_BOARD_LENGTH / 2 + CH_BAG_SIZE / 2;

    let pts = 0;
    if (distToHole < CH_HOLE_RADIUS + CH_BAG_SIZE / 2) {
      // Hole! 3 points — drop the bag through the board (sinking animation)
      pts = 3;
      if (entity.hasComponent(PhysicsBody))  entity.removeComponent(PhysicsBody);
      if (entity.hasComponent(PhysicsShape)) entity.removeComponent(PhysicsShape);
      entity.setValue(CornholeBag, "sinking",   true);
      entity.setValue(CornholeBag, "sinkTimer", 0);
    } else if (onBoard) {
      // On board — 1 point
      pts = 1;
    }

    this.roundScore += pts;
    if (this.roundScore > this.highScore) {
      this.highScore = this.roundScore;
      localStorage.setItem("cornhole-best", String(this.highScore));
    }
    this.refreshUI();
  }

  // ── Lob throw ─────────────────────────────────────────────────────────
  private fireLobBag(power: number) {
    // Find first ready bag
    let target: Entity | null = null;
    for (const entity of this.queries.bags.entities) {
      const inFlight = entity.getValue(CornholeBag, "inFlight") as boolean;
      const scored   = entity.getValue(CornholeBag, "scored")   as boolean;
      if (!inFlight && !scored) { target = entity; break; }
    }
    if (!target) return;

    const idx = target.getValue(CornholeBag, "bagIndex") as number;

    // Launch from right grip position
    this.player.gripSpaces.right.getWorldPosition(this._v0);
    const grip = this._v0;

    // Direction: controller ray forward (where the player is pointing)
    this._dir.set(0, 0, -1);
    this._dir.applyQuaternion(this.player.raySpaces.right.quaternion);

    // Speed scales with charge
    const speed = CH_LOB_MIN_SPEED + power * (CH_LOB_MAX_SPEED - CH_LOB_MIN_SPEED);

    // Teleport bag to grip and fire
    target.object3D!.position.copy(grip);
    target.addComponent(PhysicsManipulation, {
      linearVelocity: [this._dir.x * speed, this._dir.y * speed, this._dir.z * speed],
    });

    target.setValue(CornholeBag, "inFlight", true);
    target.setValue(CornholeBag, "flightTime", 0);
    this.bagsThrown++;
    this.prevBagPos[idx] = null;
    this.updateBagsUI();
    if (this.bagsThrown >= 4) this.roundOver = true;
  }

  // ── Arc preview ───────────────────────────────────────────────────────
  private updateArcPreview() {
    this.player.gripSpaces.right.getWorldPosition(this._v0);
    const grip = this._v0;

    // Use controller ray direction (same as fireLobBag)
    this._dir.set(0, 0, -1);
    this._dir.applyQuaternion(this.player.raySpaces.right.quaternion);

    const speed = CH_LOB_MIN_SPEED + this.lobPower * (CH_LOB_MAX_SPEED - CH_LOB_MIN_SPEED);
    const vx = this._dir.x * speed;
    const vy = this._dir.y * speed;
    const vz = this._dir.z * speed;

    const T  = 2.5; // seconds of trajectory to show
    const dt = T / CH_ARC_POINTS;

    let i = 0;
    for (const entity of this.queries.arcDots.entities) {
      const t = (i + 1) * dt;
      entity.object3D!.position.set(
        grip.x + vx * t,
        grip.y + vy * t - 0.5 * GRAVITY * t * t,
        grip.z + vz * t,
      );
      entity.object3D!.visible = true;
      i++;
    }
  }

  // ── Haptics ───────────────────────────────────────────────────────────
  private pulseHaptic(hand: "left" | "right", intensity: number, durationMs: number): void {
    const session = this.xrManager.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
      if (source.handedness === hand) {
        source.gamepad?.hapticActuators?.[0]?.pulse(intensity, durationMs);
        return;
      }
    }
  }

  // ── Throw mode ────────────────────────────────────────────────────────
  private setThrowMode(mode: "grab" | "lob") {
    this.throwMode = mode;
    const inGrab   = mode === "grab";

    for (const entity of this.queries.bags.entities) {
      const inFlight = entity.getValue(CornholeBag, "inFlight") as boolean;
      const scored   = entity.getValue(CornholeBag, "scored")   as boolean;
      if (inFlight || scored) continue;

      if (inGrab) {
        if (!entity.hasComponent(Interactable))     entity.addComponent(Interactable);
        if (!entity.hasComponent(DistanceGrabbable)) entity.addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveFromTarget });
      } else {
        if (entity.hasComponent(DistanceGrabbable)) entity.removeComponent(DistanceGrabbable);
        if (entity.hasComponent(Interactable))      entity.removeComponent(Interactable);
      }
    }

    // Arc dots — only visible while actively charging; always hide on mode switch
    this.lobCharging = false;
    this.lobPower    = 0;
    for (const entity of this.queries.arcDots.entities) {
      entity.object3D!.visible = false;
    }

    this.updateModeUI();
  }

  private toggleArcPreview() {
    this.arcPreview = !this.arcPreview;
    // Dots are shown per-frame in updateArcPreview while charging;
    // hide immediately if arc was just turned off
    if (!this.arcPreview) {
      for (const entity of this.queries.arcDots.entities) {
        entity.object3D!.visible = false;
      }
    }
    this.updateModeUI();
  }

  // ── UI helpers ────────────────────────────────────────────────────────
  private showScreen() {
    if (!this.chUI) return;
    this.chUI.screen.setProperties({ display: "flex" });

    // Move the shared panel to the player's left, clear of the throw path,
    // and scale it up so text is comfortable to read at the new position.
    // The panel faces +Z when rotation.y = 0; atan2(-x, -z) gives the Y
    // rotation needed for it to face the player at the origin from any position.
    if (this.panelEntity?.object3D) {
      const obj = this.panelEntity.object3D;
      this.panelOrigPos.copy(obj.position);
      this.panelOrigRotY = obj.rotation.y;
      this.panelOrigScale = obj.scale.x;

      const px = -1.8;
      const pz = -1.0;
      obj.position.set(px, obj.position.y, pz);
      obj.rotation.y = Math.atan2(-px, -pz); // rotate to face player at origin
      obj.scale.setScalar(1.5);
    }

    this.refreshUI();
  }

  private hideScreen() {
    this.chUI?.screen.setProperties({ display: "none" });
  }

  private refreshUI() {
    this.updateBagsUI();
    this.updateScoreUI();
    this.updateModeUI();
  }

  private updateBagsUI() {
    if (!this.chUI) return;
    const thrown = Math.min(this.bagsThrown, 4);
    this.chUI.bags.setProperties({ text: BAG_DOTS[thrown] });
  }

  private updateScoreUI() {
    if (!this.chUI) return;
    this.chUI.roundScore.setProperties({ text: String(this.roundScore) });
    this.chUI.bestScore.setProperties({  text: String(this.highScore)  });
  }

  private updateModeUI() {
    if (!this.chUI) return;
    const inGrab = this.throwMode === "grab";

    // Grab button: active = highlighted blue
    this.chUI.grabBtn.setProperties(inGrab
      ? { backgroundColor: "#1e3a5f", color: "#93c5fd", borderColor: "#2563eb" }
      : { backgroundColor: "#18181b", color: "#52525b", borderColor: "#3f3f46" });

    // Lob button: active = highlighted orange
    this.chUI.lobBtn.setProperties(!inGrab
      ? { backgroundColor: "#431407", color: "#fb923c", borderColor: "#ea580c" }
      : { backgroundColor: "#18181b", color: "#52525b", borderColor: "#3f3f46" });

    // Arc button: only visible in lob mode
    this.chUI.arcBtn.setProperties({ display: inGrab ? "none" : "flex" });
    if (!inGrab) {
      this.chUI.arcBtn.setProperties(this.arcPreview
        ? { backgroundColor: "#1e3a5f", color: "#93c5fd", borderColor: "#2563eb",
            text: "Arc Preview: On" }
        : { backgroundColor: "#18181b", color: "#52525b", borderColor: "#3f3f46",
            text: "Arc Preview: Off" });
    }
  }
}
