import {
  createComponent,
  createSystem,
  Entity,
  Types,
  eq,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";

const PANEL_CONFIG = "./ui/game-status.json";

// ── Table placement (world) ──────────────────────────────────────────────
const TABLE_TOP_Y    = 0.85;      // m — tabletop height (world Y of green surface)
const TABLE_CENTER_X = 0;
const TABLE_CENTER_Z = -1.2;      // m in front of player

// ── Table / playfield dimensions (local to tableRoot) ────────────────────
const TABLE_W  = 0.60;            // X extent
const TABLE_L  = 1.20;            // Z extent (long axis points away from player)
const TABLE_LEG_H = TABLE_TOP_Y;

const RAIL_H = 0.03;
const RAIL_T = 0.02;              // rail thickness (also shrinks playfield)

// Playfield rect is the table rect minus rail thickness on each side
const PLAY_MIN_X = -TABLE_W / 2 + RAIL_T;
const PLAY_MAX_X =  TABLE_W / 2 - RAIL_T;
const PLAY_MIN_Z = -TABLE_L / 2 + RAIL_T;
const PLAY_MAX_Z =  TABLE_L / 2 - RAIL_T;

// ── Ball & cup ───────────────────────────────────────────────────────────
const BALL_R = 0.02;                      // 40mm diameter
const CUP_R  = 0.045;                     // 90mm diameter
const CUP_Z  = -TABLE_L / 2 + 0.18;       // far end
const BALL_START_X = 0;
const BALL_START_Z =  TABLE_L / 2 - 0.18; // near end

// ── Physics ──────────────────────────────────────────────────────────────
// Fixed-timestep loop inside update() — deterministic regardless of frame rate.
const FIXED_DT            = 1 / 120;
const FRICTION_DAMP       = 0.8;   // 1/s — exponential velocity decay
const REST_SPEED          = 0.05;  // m/s — below this the ball stops
const RAIL_RESTITUTION    = 0.65;
const OBSTACLE_RESTITUTION = 0.55;
const MAX_AIM_DIST        = 0.55;  // m — drag distance clamp
const MAX_SHOT_SPEED      = 3.0;   // m/s at full drag
const MIN_AIM_DIST        = 0.04;  // m — below this, release is ignored
const SINK_MAX_SPEED      = 2.0;   // m/s — faster shots roll over the cup
const SUNK_RESET_DELAY    = 1.2;   // s — pause on "sunk" before tee reset

// Only begin an aim if the ray-plane hit lands within this padded rectangle;
// prevents trigger presses that target the menu panel from starting an aim.
const AIM_GATE_PAD = 0.2;

// ── Components ───────────────────────────────────────────────────────────
export const TablePuttBall = createComponent("TablePuttBall", {});
export const TablePuttCup = createComponent("TablePuttCup", {});
export const TablePuttObstacle = createComponent("TablePuttObstacle", {
  kind: { type: Types.Int8,    default: 0 }, // 0 = box, 1 = circle
  hx:   { type: Types.Float32, default: 0 }, // half X (box) or radius (circle)
  hz:   { type: Types.Float32, default: 0 }, // half Z (box)
});

// 2D ball state in tableRoot-local coordinates (X, Z on the plane).
interface BallState { x: number; z: number; vx: number; vz: number; }

type GameState = "idle" | "aiming" | "rolling" | "sunk";
type Hand = "left" | "right";

interface Obstacle {
  kind: 0 | 1;
  x: number; z: number;
  hx: number; hz: number; r: number;
}

export class TablePuttSystem extends createSystem({
  balls:     { required: [TablePuttBall] },
  cups:      { required: [TablePuttCup] },
  obstacles: { required: [TablePuttObstacle] },
  panel:     { required: [PanelUI, PanelDocument], where: [eq(PanelUI, "config", PANEL_CONFIG)] },
}) {
  private active = false;
  private state: GameState = "idle";
  private strokes = 0;
  private bestStrokes: number | null = null;

  // Scene refs
  private tableRoot: Object3D | null = null;
  private tableEntity: Entity | null = null;
  private ballEntity: Entity | null = null;
  private aimLine: Line | null = null;
  private aimLinePositions: Float32Array | null = null;

  // 2D ball state (table-local)
  private ball: BallState = { x: BALL_START_X, z: BALL_START_Z, vx: 0, vz: 0 };

  // Obstacle cache — local coordinates, used in the physics loop
  private obstacles: Obstacle[] = [];

  // Input state
  private aimHand: Hand | null = null;

  // Physics accumulator & reset timer
  private physAccum = 0;
  private resetTimer = 0;

  // Scratch vectors — allocated once
  private readonly _v0 = new Vector3();
  private readonly _v1 = new Vector3();

  private ui: {
    screen:    UIKit.Text;
    strokes:   UIKit.Text;
    best:      UIKit.Text;
    resetBtn:  UIKit.Text;
    menuBtn:   UIKit.Text;
  } | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  init() {
    const saved = localStorage.getItem("table-putt-best");
    if (saved) {
      const n = parseInt(saved, 10);
      if (Number.isFinite(n)) this.bestStrokes = n;
    }

    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.ui) return;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;
      const screen = doc.getElementById("putt-screen") as UIKit.Text;
      if (!screen) return;
      this.ui = {
        screen,
        strokes:  doc.getElementById("putt-strokes") as UIKit.Text,
        best:     doc.getElementById("putt-best")    as UIKit.Text,
        resetBtn: doc.getElementById("putt-reset")   as UIKit.Text,
        menuBtn:  doc.getElementById("putt-menu")    as UIKit.Text,
      };
      this.ui.resetBtn.addEventListener("click", () => {
        if (this.active) this.resetHole();
      });
      this.ui.menuBtn.addEventListener("click", () => {
        if (this.active) this.exitToMenu();
      });
    });

    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) {
      this.cleanupFuncs.push(
        activeGame.subscribe((game) => {
          if (game === "table-putt-lab" && !this.active) this.startGame();
          else if (game !== "table-putt-lab" && this.active) this.cleanup();
        }),
      );
    }
  }

  private startGame() {
    this.active = true;
    this.state = "idle";
    this.strokes = 0;
    this.physAccum = 0;
    this.buildCourse();
    this.resetBall();
    this.showScreen();
    this.refreshUI();
  }

  private exitToMenu() {
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) activeGame.value = "menu";
  }

  private cleanup() {
    this.active = false;
    this.state = "idle";
    this.aimHand = null;

    // Dispose ball / cup / obstacle entities then the root
    for (const e of Array.from(this.queries.balls.entities))     e.dispose();
    for (const e of Array.from(this.queries.cups.entities))      e.dispose();
    for (const e of Array.from(this.queries.obstacles.entities)) e.dispose();
    this.tableEntity?.dispose();

    this.tableEntity = null;
    this.tableRoot   = null;
    this.ballEntity  = null;
    this.aimLine     = null;
    this.aimLinePositions = null;
    this.obstacles = [];
    this.hideScreen();
  }

  // ── Course construction ───────────────────────────────────────────────
  private buildCourse() {
    const root = new Object3D();
    root.position.set(TABLE_CENTER_X, TABLE_TOP_Y, TABLE_CENTER_Z);
    this.tableRoot = root;
    this.tableEntity = this.world.createTransformEntity(root);

    // Green putting surface (top at local Y=0)
    const greenMat = new MeshStandardMaterial({
      color: 0x1a6d2b, roughness: 0.9, metalness: 0,
    });
    const green = new Mesh(new BoxGeometry(TABLE_W, 0.01, TABLE_L), greenMat);
    green.position.set(0, -0.005, 0);
    root.add(green);

    // Table legs (visual)
    const legMat = new MeshStandardMaterial({ color: 0x3a2d1a, roughness: 0.8 });
    const legW = 0.04;
    const legInset = legW;
    const legPositions: [number, number][] = [
      [ TABLE_W / 2 - legInset,  TABLE_L / 2 - legInset],
      [-TABLE_W / 2 + legInset,  TABLE_L / 2 - legInset],
      [ TABLE_W / 2 - legInset, -TABLE_L / 2 + legInset],
      [-TABLE_W / 2 + legInset, -TABLE_L / 2 + legInset],
    ];
    for (const [lx, lz] of legPositions) {
      const leg = new Mesh(new BoxGeometry(legW, TABLE_LEG_H, legW), legMat);
      leg.position.set(lx, -TABLE_LEG_H / 2 - 0.01, lz);
      root.add(leg);
    }

    // Rails — 4 box strips around the playfield
    const railMat = new MeshStandardMaterial({ color: 0x2a1a0d, roughness: 0.7 });
    const railLong = new BoxGeometry(RAIL_T, RAIL_H, TABLE_L);
    const rPlusX  = new Mesh(railLong, railMat);
    const rMinusX = new Mesh(railLong, railMat);
    rPlusX.position.set( TABLE_W / 2 - RAIL_T / 2, RAIL_H / 2, 0);
    rMinusX.position.set(-TABLE_W / 2 + RAIL_T / 2, RAIL_H / 2, 0);
    root.add(rPlusX, rMinusX);
    const railShort = new BoxGeometry(TABLE_W, RAIL_H, RAIL_T);
    const rPlusZ  = new Mesh(railShort, railMat);
    const rMinusZ = new Mesh(railShort, railMat);
    rPlusZ.position.set(0, RAIL_H / 2,  TABLE_L / 2 - RAIL_T / 2);
    rMinusZ.position.set(0, RAIL_H / 2, -TABLE_L / 2 + RAIL_T / 2);
    root.add(rPlusZ, rMinusZ);

    // Cup — dark disc + flag marker
    const cupMesh = new Mesh(
      new CylinderGeometry(CUP_R, CUP_R, 0.003, 24),
      new MeshStandardMaterial({ color: 0x050505, roughness: 1 }),
    );
    cupMesh.position.set(0, 0.0015, CUP_Z);
    root.add(cupMesh);
    this.world.createTransformEntity(cupMesh, this.tableEntity)
      .addComponent(TablePuttCup);

    const flagPole = new Mesh(
      new CylinderGeometry(0.003, 0.003, 0.22, 6),
      new MeshStandardMaterial({ color: 0xf4f4f4 }),
    );
    flagPole.position.set(0, 0.11, CUP_Z);
    root.add(flagPole);
    const flagCloth = new Mesh(
      new BoxGeometry(0.09, 0.055, 0.002),
      new MeshStandardMaterial({ color: 0xdc2626 }),
    );
    flagCloth.position.set(0.045, 0.19, CUP_Z);
    root.add(flagCloth);

    // Obstacles — two boxes and a cylinder between ball and cup
    this.addBoxObstacle(-0.14, -0.10, 0.07, 0.035, 0x8b5a2b);
    this.addBoxObstacle( 0.13,  0.08, 0.055, 0.035, 0x8b5a2b);
    this.addCircleObstacle(0.0, -0.30, 0.045, 0x6b7280);

    // Ball
    this.spawnBall();

    // Aim line (thin white line above the green, initially hidden)
    this.aimLinePositions = new Float32Array(2 * 3);
    const aimGeom = new BufferGeometry();
    aimGeom.setAttribute("position", new BufferAttribute(this.aimLinePositions, 3));
    this.aimLine = new Line(
      aimGeom,
      new LineBasicMaterial({ color: 0xfefce8, transparent: true, opacity: 0.9 }),
    );
    this.aimLine.visible = false;
    root.add(this.aimLine);
  }

  private spawnBall() {
    if (!this.tableRoot || !this.tableEntity) return;
    const mesh = new Mesh(
      new SphereGeometry(BALL_R, 20, 14),
      new MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 }),
    );
    mesh.position.set(this.ball.x, BALL_R, this.ball.z);
    this.tableRoot.add(mesh);
    this.ballEntity = this.world.createTransformEntity(mesh, this.tableEntity)
      .addComponent(TablePuttBall);
  }

  private addBoxObstacle(x: number, z: number, hx: number, hz: number, color: number) {
    if (!this.tableRoot || !this.tableEntity) return;
    const h = 0.04;
    const mesh = new Mesh(
      new BoxGeometry(hx * 2, h, hz * 2),
      new MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    mesh.position.set(x, h / 2, z);
    this.tableRoot.add(mesh);
    this.world.createTransformEntity(mesh, this.tableEntity)
      .addComponent(TablePuttObstacle, { kind: 0, hx, hz });
    this.obstacles.push({ kind: 0, x, z, hx, hz, r: 0 });
  }

  private addCircleObstacle(x: number, z: number, r: number, color: number) {
    if (!this.tableRoot || !this.tableEntity) return;
    const h = 0.04;
    const mesh = new Mesh(
      new CylinderGeometry(r, r, h, 20),
      new MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    mesh.position.set(x, h / 2, z);
    this.tableRoot.add(mesh);
    this.world.createTransformEntity(mesh, this.tableEntity)
      .addComponent(TablePuttObstacle, { kind: 1, hx: r, hz: 0 });
    this.obstacles.push({ kind: 1, x, z, hx: r, hz: 0, r });
  }

  // ── Per-frame update ──────────────────────────────────────────────────
  update(delta: number) {
    if (!this.active) return;

    this.handleAimInput();

    if (this.state === "rolling") {
      // Clamp huge deltas from tab switching so we never simulate hundreds of
      // substeps and drop a frame.
      this.physAccum += Math.min(delta, 0.05);
      while (this.physAccum >= FIXED_DT) {
        this.stepPhysics(FIXED_DT);
        this.physAccum -= FIXED_DT;
        if (this.state !== "rolling") break; // sunk / stopped mid-step
      }
      this.syncBallMesh();
    } else if (this.state === "sunk") {
      this.resetTimer -= delta;
      if (this.resetTimer <= 0) {
        this.strokes = 0;
        this.resetBall();
        this.refreshUI();
      }
    }
  }

  // ── Aim / shot input ──────────────────────────────────────────────────
  private handleAimInput() {
    const leftGP  = this.input.gamepads.left;
    const rightGP = this.input.gamepads.right;

    if (this.state === "idle") {
      if (rightGP?.getSelectStart()) {
        if (this.tryStartAim("right")) return;
      }
      if (leftGP?.getSelectStart()) {
        this.tryStartAim("left");
        return;
      }
    }

    if (this.state !== "aiming" || !this.aimHand) return;

    const hand = this.aimHand;
    const gp = hand === "right" ? rightGP : leftGP;

    const hit = this.rayHitOnTable(hand);
    if (hit) this.updateAimLineToward(hit.x, hit.z);

    if (gp?.getSelectEnd()) {
      if (hit) {
        const dx = hit.x - this.ball.x;
        const dz = hit.z - this.ball.z;
        const mag = Math.hypot(dx, dz);
        if (mag < MIN_AIM_DIST) this.cancelAim();
        else this.fireShot(dx, dz, Math.min(mag, MAX_AIM_DIST));
      } else {
        this.cancelAim();
      }
    }
  }

  private tryStartAim(hand: Hand): boolean {
    const hit = this.rayHitOnTable(hand);
    if (!hit || !this.hitInsideAimGate(hit.x, hit.z)) return false;
    this.aimHand = hand;
    this.state = "aiming";
    this.updateAimLineToward(hit.x, hit.z);
    if (this.aimLine) this.aimLine.visible = true;
    return true;
  }

  private hitInsideAimGate(localX: number, localZ: number): boolean {
    return Math.abs(localX) < TABLE_W / 2 + AIM_GATE_PAD
        && Math.abs(localZ) < TABLE_L / 2 + AIM_GATE_PAD;
  }

  // Ray from the hand's raySpace intersected with the table's top plane.
  // Returns the hit point in table-local coordinates, clamped to MAX_AIM_DIST
  // from the ball.
  private rayHitOnTable(hand: Hand): { x: number; z: number } | null {
    if (!this.tableRoot) return null;
    const raySpace = hand === "right" ? this.player.raySpaces.right : this.player.raySpaces.left;
    raySpace.getWorldPosition(this._v0);
    this._v1.set(0, 0, -1).applyQuaternion(raySpace.quaternion);
    if (Math.abs(this._v1.y) < 1e-4) return null;
    const t = (TABLE_TOP_Y - this._v0.y) / this._v1.y;
    if (t <= 0) return null;
    this._v0.addScaledVector(this._v1, t);
    this.tableRoot.worldToLocal(this._v0);
    let lx = this._v0.x - this.ball.x;
    let lz = this._v0.z - this.ball.z;
    const mag = Math.hypot(lx, lz);
    if (mag > MAX_AIM_DIST) {
      const k = MAX_AIM_DIST / mag;
      lx *= k; lz *= k;
    }
    return { x: this.ball.x + lx, z: this.ball.z + lz };
  }

  private updateAimLineToward(targetX: number, targetZ: number) {
    if (!this.aimLine || !this.aimLinePositions) return;
    const p = this.aimLinePositions;
    const y = BALL_R + 0.005;
    p[0] = this.ball.x; p[1] = y; p[2] = this.ball.z;
    p[3] = targetX;     p[4] = y; p[5] = targetZ;
    (this.aimLine.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  }

  private cancelAim() {
    this.state = "idle";
    this.aimHand = null;
    if (this.aimLine) this.aimLine.visible = false;
  }

  private fireShot(dx: number, dz: number, mag: number) {
    const nx = dx / mag, nz = dz / mag;
    const speed = MAX_SHOT_SPEED * (mag / MAX_AIM_DIST);
    this.ball.vx = nx * speed;
    this.ball.vz = nz * speed;
    this.strokes++;
    this.state = "rolling";
    this.aimHand = null;
    this.physAccum = 0;
    if (this.aimLine) this.aimLine.visible = false;
    this.refreshUI();
  }

  // ── Fixed-timestep physics step ───────────────────────────────────────
  private stepPhysics(dt: number) {
    const b = this.ball;

    // Integrate
    b.x += b.vx * dt;
    b.z += b.vz * dt;

    // Rolling friction — exponential decay
    const damp = Math.exp(-FRICTION_DAMP * dt);
    b.vx *= damp;
    b.vz *= damp;

    // Rail collisions (AABB reflection, one axis at a time)
    if (b.x - BALL_R < PLAY_MIN_X) {
      b.x = PLAY_MIN_X + BALL_R;
      if (b.vx < 0) b.vx = -b.vx * RAIL_RESTITUTION;
    } else if (b.x + BALL_R > PLAY_MAX_X) {
      b.x = PLAY_MAX_X - BALL_R;
      if (b.vx > 0) b.vx = -b.vx * RAIL_RESTITUTION;
    }
    if (b.z - BALL_R < PLAY_MIN_Z) {
      b.z = PLAY_MIN_Z + BALL_R;
      if (b.vz < 0) b.vz = -b.vz * RAIL_RESTITUTION;
    } else if (b.z + BALL_R > PLAY_MAX_Z) {
      b.z = PLAY_MAX_Z - BALL_R;
      if (b.vz > 0) b.vz = -b.vz * RAIL_RESTITUTION;
    }

    // Obstacles
    for (const o of this.obstacles) {
      if (o.kind === 0) this.collideBoxObstacle(o);
      else              this.collideCircleObstacle(o);
    }

    // Cup capture — slow-enough ball crossing the cup falls in
    const cdx = b.x;
    const cdz = b.z - CUP_Z;
    const cd  = Math.hypot(cdx, cdz);
    const speed = Math.hypot(b.vx, b.vz);
    if (cd < CUP_R && speed < SINK_MAX_SPEED) {
      this.onSunk();
      return;
    }

    // Rest — stop the ball and return to idle
    if (speed < REST_SPEED) {
      b.vx = 0; b.vz = 0;
      this.state = "idle";
    }
  }

  private collideBoxObstacle(o: Obstacle) {
    const b = this.ball;
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    // Closest point on the box to the ball centre (box-local)
    const cx = Math.max(-o.hx, Math.min(o.hx, dx));
    const cz = Math.max(-o.hz, Math.min(o.hz, dz));
    const rx = dx - cx;
    const rz = dz - cz;
    const d2 = rx * rx + rz * rz;
    if (d2 >= BALL_R * BALL_R) return;

    let nx: number, nz: number;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      nx = rx / d; nz = rz / d;
    } else {
      // Ball centre is inside the box — push out along the shallowest axis
      const penX = o.hx - Math.abs(dx);
      const penZ = o.hz - Math.abs(dz);
      if (penX < penZ) { nx = Math.sign(dx) || 1; nz = 0; }
      else             { nx = 0; nz = Math.sign(dz) || 1; }
    }
    b.x = o.x + cx + nx * BALL_R;
    b.z = o.z + cz + nz * BALL_R;
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      b.vx -= (1 + OBSTACLE_RESTITUTION) * vn * nx;
      b.vz -= (1 + OBSTACLE_RESTITUTION) * vn * nz;
    }
  }

  private collideCircleObstacle(o: Obstacle) {
    const b = this.ball;
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const d = Math.hypot(dx, dz);
    const minD = o.r + BALL_R;
    if (d >= minD) return;
    const invD = d > 1e-6 ? 1 / d : 0;
    const nx = dx * invD;
    const nz = dz * invD;
    b.x = o.x + nx * minD;
    b.z = o.z + nz * minD;
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      b.vx -= (1 + OBSTACLE_RESTITUTION) * vn * nx;
      b.vz -= (1 + OBSTACLE_RESTITUTION) * vn * nz;
    }
  }

  private syncBallMesh() {
    const obj = this.ballEntity?.object3D;
    if (!obj) return;
    obj.position.set(this.ball.x, BALL_R, this.ball.z);
  }

  // ── Goal / reset ──────────────────────────────────────────────────────
  private onSunk() {
    this.state = "sunk";
    this.resetTimer = SUNK_RESET_DELAY;
    this.ball.vx = 0; this.ball.vz = 0;
    // Sink the ball visually into the cup
    if (this.ballEntity?.object3D) {
      this.ballEntity.object3D.position.set(0, -BALL_R * 0.4, CUP_Z);
    }
    if (this.bestStrokes === null || this.strokes < this.bestStrokes) {
      this.bestStrokes = this.strokes;
      localStorage.setItem("table-putt-best", String(this.bestStrokes));
    }
    this.refreshUI();
  }

  private resetHole() {
    this.strokes = 0;
    this.resetBall();
    this.refreshUI();
  }

  private resetBall() {
    this.ball.x = BALL_START_X;
    this.ball.z = BALL_START_Z;
    this.ball.vx = 0; this.ball.vz = 0;
    this.state = "idle";
    this.aimHand = null;
    this.physAccum = 0;
    if (this.aimLine) this.aimLine.visible = false;
    if (this.ballEntity?.object3D) {
      this.ballEntity.object3D.position.set(BALL_START_X, BALL_R, BALL_START_Z);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────
  private showScreen() {
    this.ui?.screen.setProperties({ display: "flex" });
  }

  private hideScreen() {
    this.ui?.screen.setProperties({ display: "none" });
  }

  private refreshUI() {
    if (!this.ui) return;
    this.ui.strokes.setProperties({ text: String(this.strokes) });
    this.ui.best.setProperties({ text: this.bestStrokes === null ? "—" : String(this.bestStrokes) });
  }
}
