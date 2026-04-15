import {
  createComponent,
  createSystem,
  Entity,
  Types,
  Interactable,
  Pressed,
  Hovered,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  eq,
  BoxGeometry,
  TorusGeometry,
  Object3D,
  Mesh,
  MeshStandardMaterial,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsBody,
  PhysicsState,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";

// ─── Game modes ───────────────────────────────────────────────────────────────

interface GameMode {
  name:   string;
  cols:   number;
  rows:   number;
  winBy:  number;
  isDrop: boolean;
}

const GAME_MODES: GameMode[] = [
  { name: "Tic-Tac-Toe", cols: 3, rows: 3, winBy: 3, isDrop: false },
  { name: "Connect 3",   cols: 5, rows: 4, winBy: 3, isDrop: true },
  { name: "Connect 4",   cols: 7, rows: 6, winBy: 4, isDrop: true },
  { name: "Connect 5",   cols: 8, rows: 7, winBy: 5, isDrop: true },
  { name: "Connect 6",   cols: 9, rows: 8, winBy: 6, isDrop: true },
];

// ─── Components ───────────────────────────────────────────────────────────────

export const ColumnZone = createComponent("ColumnZone", {
  colIndex: { type: Types.Int8, default: 0 },
});

export const CellZone = createComponent("CellZone", {
  colIndex: { type: Types.Int8, default: 0 },
  rowIndex: { type: Types.Int8, default: 0 },
});

export const GamePiece = createComponent("GamePiece", {
  player:   { type: Types.Int8,    default: 1 }, // 1 = X (player), 2 = O (AI)
  dropping: { type: Types.Boolean, default: true },
  targetY:  { type: Types.Float32, default: 0 },
});

// Invisible zone entity in front of each PanelUI mode button (XR ray interaction)
export const MenuButton = createComponent("MenuButton", {
  modeIndex: { type: Types.Int8, default: 0 },
});

// Invisible zone entity in front of game-screen action buttons
export const GameActionButton = createComponent("GameActionButton", {
  actionType: { type: Types.Int8, default: 0 }, // 0 = reset score, 1 = change game
});

// ─── World constants ──────────────────────────────────────────────────────────

const BOARD_X    =  0;
const BOARD_Y    =  0.5;   // board bottom rests on floor
const BOARD_Z    = -1.5;   // 1.5 m in front of player
const DROP_SPEED =  2.5;   // m/s

const X_COLOR      = 0x2277ff;
const O_COLOR      = 0xff5522;
const PANEL_CONFIG = "./ui/game-status.json";

// ─── Piece factories ──────────────────────────────────────────────────────────

function makeX(size: number): Object3D {
  const s = Math.max(0.06, size);
  const mat = new MeshStandardMaterial({
    color: X_COLOR, emissive: 0x112244, emissiveIntensity: 0.2,
    roughness: 0.4, metalness: 0.2,
  });
  const b1 = new Mesh(new BoxGeometry(s, s * 0.28, 0.04), mat);
  const b2 = new Mesh(new BoxGeometry(s, s * 0.28, 0.04), mat);
  b1.rotation.z =  Math.PI / 4;
  b2.rotation.z = -Math.PI / 4;
  const g = new Object3D();
  g.add(b1, b2);
  return g;
}

function makeO(size: number): Mesh {
  const s = Math.max(0.06, size);
  return new Mesh(
    new TorusGeometry(s * 0.42, Math.max(0.01, s * 0.15), 8, 16),
    new MeshStandardMaterial({
      color: O_COLOR, emissive: 0x441100, emissiveIntensity: 0.2,
      roughness: 0.4, metalness: 0.2,
    }),
  );
}

// ─── System ───────────────────────────────────────────────────────────────────

export class DropTTTSystem extends createSystem({
  columnsPressed:    { required: [ColumnZone, Interactable, Pressed] },
  columnsHovered:    { required: [ColumnZone, Hovered] },
  cellsPressed:      { required: [CellZone, Interactable, Pressed] },
  cellsHovered:      { required: [CellZone, Hovered] },
  menuPressed:       { required: [MenuButton, Pressed] },
  menuHovered:       { required: [MenuButton, Hovered] },
  gameActionPressed: { required: [GameActionButton, Pressed] },
  gameActionHovered: { required: [GameActionButton, Hovered] },
  pieces:            { required: [GamePiece] },
  panel:             { required: [PanelUI, PanelDocument], where: [eq(PanelUI, "config", PANEL_CONFIG)] },
}) {
  // ── Active board dimensions (set by setMode) ───────────────────────────────
  private currentMode: GameMode = GAME_MODES[0];
  private cols      = 3;
  private rows      = 3;
  private winBy     = 3;
  private cellH     = 0; // cell height
  private cellW     = 0; // cell width (= cellH → square cells)
  private boardW    = 0;
  private maxDepth  = 9;
  private board:  number[][] = [];
  private colOrder: number[] = [];

  // ── Per-game state ─────────────────────────────────────────────────────────
  private gameActive     = false;
  private playerTurn     = true;
  private gameOver       = false;
  private aiPending      = false;
  private aiTimer        = 0;
  private waitingForLand = false;
  private lastResult: "win" | "loss" | "draw" | null = null;

  // ── Persistent scores ──────────────────────────────────────────────────────
  private wins   = 0;
  private losses = 0;
  private draws  = 0;

  // ── Scene entity / material tracking ──────────────────────────────────────
  private boardEntities: Array<{ dispose(): void }> = [];
  private zoneMaterials: MeshStandardMaterial[] = [];
  private menuZoneEntities: Entity[] = [];
  private menuZoneMaterials: MeshStandardMaterial[] = [];
  private gameActionZoneEntities: Entity[] = [];
  private gameActionZoneMaterials: MeshStandardMaterial[] = [];
  private gameZonesActive = false;
  private cornholeActive  = false;

  // ── UIKit element refs ─────────────────────────────────────────────────────
  private ui: {
    menuScreen: UIKit.Text; gameScreen: UIKit.Text;
    modeTitle:  UIKit.Text;
    turnYours:  UIKit.Text; turnAI:     UIKit.Text;
    resultWin:  UIKit.Text; resultLose: UIKit.Text; resultDraw: UIKit.Text;
    youScore:   UIKit.Text; aiScore:    UIKit.Text; drawScore:  UIKit.Text;
    resetBtn:   UIKit.Text; changeBtn:  UIKit.Text;
  } | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init() {
    // Panel entity lives for the whole session
    const panelEntity = this.world.createTransformEntity()
      .addComponent(PanelUI, { config: PANEL_CONFIG, maxWidth: 0.76, maxHeight: 1.1 })
      .addComponent(Interactable);
    panelEntity.object3D!.position.set(BOARD_X, 1.3, BOARD_Z);

    // Wire UIKit when document loads (guard: only wire once)
    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.ui) return; // already wired
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;
      this.ui = {
        menuScreen: doc.getElementById("menu-screen") as UIKit.Text,
        gameScreen: doc.getElementById("game-screen") as UIKit.Text,
        modeTitle:  doc.getElementById("mode-title")  as UIKit.Text,
        turnYours:  doc.getElementById("turn-yours")  as UIKit.Text,
        turnAI:     doc.getElementById("turn-ai")     as UIKit.Text,
        resultWin:  doc.getElementById("result-win")  as UIKit.Text,
        resultLose: doc.getElementById("result-lose") as UIKit.Text,
        resultDraw: doc.getElementById("result-draw") as UIKit.Text,
        youScore:   doc.getElementById("you-score")   as UIKit.Text,
        aiScore:    doc.getElementById("ai-score")    as UIKit.Text,
        drawScore:  doc.getElementById("draw-score")  as UIKit.Text,
        resetBtn:   doc.getElementById("reset-btn")   as UIKit.Text,
        changeBtn:  doc.getElementById("change-btn")  as UIKit.Text,
      };
      GAME_MODES.forEach((mode, i) => {
        const btn = doc.getElementById(`mode-${i}`) as UIKit.Text;
        btn?.addEventListener("click", () => this.startGame(mode));
      });
      (doc.getElementById("mode-5") as UIKit.Text)
        ?.addEventListener("click", () => this.launchCornhole());
      (doc.getElementById("qr-btn") as UIKit.Text)
        ?.addEventListener("click", () => {
          const w = window as unknown as Record<string, unknown>;
          if (typeof w["showQRModal"] === "function") {
            (w["showQRModal"] as () => void)();
          }
        });
      (doc.getElementById("exit-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.world.exitXR());
      (doc.getElementById("change-btn") as UIKit.Text)
        .addEventListener("click", () => this.returnToMenu());
      (doc.getElementById("reset-btn") as UIKit.Text)
        .addEventListener("click", () => {
          if (this.gameOver) {
            this.startGame(this.currentMode);
          } else {
            this.wins = this.losses = this.draws = 0;
            this.refreshUI();
          }
        });
      this.showMenuScreen();
    });

    // Column hover glow — reactive
    this.queries.columnsHovered.subscribe("qualify", (entity) => {
      const col = entity.getValue(ColumnZone, "colIndex") as number;
      const mat = this.zoneMaterials[col];
      if (mat) { mat.opacity = 0.38; mat.emissiveIntensity = 0.65; }
    });
    this.queries.columnsHovered.subscribe("disqualify", (entity) => {
      const col = entity.getValue(ColumnZone, "colIndex") as number;
      const mat = this.zoneMaterials[col];
      if (mat) { mat.opacity = 0.1; mat.emissiveIntensity = 0.0; }
    });

    // Cell hover glow
    this.queries.cellsHovered.subscribe("qualify", (entity) => {
      const col = entity.getValue(CellZone, "colIndex") as number;
      const row = entity.getValue(CellZone, "rowIndex") as number;
      const mat = this.zoneMaterials[col * this.rows + row];
      if (mat) { mat.opacity = 0.38; mat.emissiveIntensity = 0.65; }
    });
    this.queries.cellsHovered.subscribe("disqualify", (entity) => {
      const col = entity.getValue(CellZone, "colIndex") as number;
      const row = entity.getValue(CellZone, "rowIndex") as number;
      const mat = this.zoneMaterials[col * this.rows + row];
      if (mat) { mat.opacity = 0.1; mat.emissiveIntensity = 0.0; }
    });

    // Player move (Column-based)
    this.queries.columnsPressed.subscribe("qualify", (entity) => {
      if (!this.gameActive || !this.playerTurn || this.gameOver ||
          this.aiPending || this.waitingForLand || this.isAnimating()) return;
      const col = entity.getValue(ColumnZone, "colIndex") as number;
      this.placePlayerPiece(col);
    });

    // Player move (Cell-based)
    this.queries.cellsPressed.subscribe("qualify", (entity) => {
      if (!this.gameActive || !this.playerTurn || this.gameOver ||
          this.aiPending || this.waitingForLand || this.isAnimating()) return;
      const col = entity.getValue(CellZone, "colIndex") as number;
      const row = entity.getValue(CellZone, "rowIndex") as number;
      if (this.board[col][row] === 0) {
        this.placePlayerPiece(col, row);
      }
    });

    // Menu button hover glow
    this.queries.menuHovered.subscribe("qualify", (entity) => {
      if (this.gameActive) return;
      const idx = entity.getValue(MenuButton, "modeIndex") as number;
      const mat = this.menuZoneMaterials[idx];
      if (mat) { mat.opacity = 0.28; mat.emissiveIntensity = 0.5; }
    });
    this.queries.menuHovered.subscribe("disqualify", (entity) => {
      const idx = entity.getValue(MenuButton, "modeIndex") as number;
      const mat = this.menuZoneMaterials[idx];
      if (mat) { mat.opacity = 0.0; mat.emissiveIntensity = 0.0; }
    });

    // Menu mode selection + exit
    this.queries.menuPressed.subscribe("qualify", (entity) => {
      if (this.gameActive || this.cornholeActive) return;
      const idx = entity.getValue(MenuButton, "modeIndex") as number;
      if (idx === GAME_MODES.length + 1) {
        this.world.exitXR();
      } else if (idx === GAME_MODES.length) {
        this.launchCornhole();
      } else if (idx >= 0 && idx < GAME_MODES.length) {
        this.startGame(GAME_MODES[idx]);
      }
    });

    // Return from Cornhole when activeGame goes back to 'menu'
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) {
      this.cleanupFuncs.push(
        activeGame.subscribe((game) => {
          if (game === "menu" && this.cornholeActive) {
            this.cornholeActive = false;
            if (this.gameZonesActive) {
              for (const e of this.gameActionZoneEntities) e.removeComponent(Interactable);
              this.gameZonesActive = false;
            }
            for (const e of this.menuZoneEntities) {
              if (!e.hasComponent(Interactable)) e.addComponent(Interactable);
            }
            this.showMenuScreen();
          }
        }),
      );
    }

    // Game-screen action button hover
    this.queries.gameActionHovered.subscribe("qualify", (entity) => {
      const type = entity.getValue(GameActionButton, "actionType") as number;
      const mat = this.gameActionZoneMaterials[type];
      if (mat) { mat.opacity = 0.25; mat.emissiveIntensity = 0.5; }
    });
    this.queries.gameActionHovered.subscribe("disqualify", (entity) => {
      const type = entity.getValue(GameActionButton, "actionType") as number;
      const mat = this.gameActionZoneMaterials[type];
      if (mat) { mat.opacity = 0.0; mat.emissiveIntensity = 0.0; }
    });

    // Game-screen action button press
    this.queries.gameActionPressed.subscribe("qualify", (entity) => {
      const type = entity.getValue(GameActionButton, "actionType") as number;
      if (!this.gameActive) return;
      if (type === 0) {
        if (this.gameOver) {
          this.startGame(this.currentMode); // Play Again
        } else {
          this.wins = this.losses = this.draws = 0;
          this.refreshUI(); // Reset Score
        }
      } else if (type === 1) {
        this.returnToMenu();
      }
    });

    this.buildMenuZones();
  }

  update(delta: number) {
    if (!this.gameActive) return;

    // In drop mode, wait for player's piece to land. In select mode, start AI timer immediately.
    if (this.waitingForLand && (!this.currentMode.isDrop || !this.isAnimating())) {
      this.waitingForLand = false;
      this.aiPending = true;
      this.aiTimer = this.currentMode.isDrop ? 0.6 : 0.4;
    }

    if (this.aiPending) {
      this.aiTimer -= delta;
      if (this.aiTimer <= 0) { this.aiPending = false; this.doAIMove(); }
    }

    // Animate falling pieces
    for (const entity of this.queries.pieces.entities) {
      if (!entity.getValue(GamePiece, "dropping")) continue;
      const obj = entity.object3D!;
      const targetY = entity.getValue(GamePiece, "targetY") as number;
      const newY = obj.position.y - DROP_SPEED * delta;
      if (newY <= targetY) {
        obj.position.y = targetY;
        entity.setValue(GamePiece, "dropping", false);
      } else {
        obj.position.y = newY;
      }
    }
  }

  // ── Screen transitions ──────────────────────────────────────────────────────

  private showMenuScreen() {
    if (!this.ui) return;
    this.ui.menuScreen.setProperties({ display: "flex" });
    this.ui.gameScreen.setProperties({ display: "none" });
  }

  private showGameScreen(modeName: string) {
    if (!this.ui) return;
    this.ui.menuScreen.setProperties({ display: "none" });
    this.ui.gameScreen.setProperties({ display: "flex" });
    this.ui.modeTitle.setProperties({ text: modeName });
  }

  private startGame(mode: GameMode) {
    this.teardownBoard();
    this.setMode(mode);
    this.buildBoard();
    // Swap interactive zones: menu off, game action on (guard against double-add)
    if (!this.gameZonesActive) {
      for (const e of this.menuZoneEntities) e.removeComponent(Interactable);
      for (const e of this.gameActionZoneEntities) e.addComponent(Interactable);
      this.gameZonesActive = true;
    }
    this.gameActive      = true;
    this.playerTurn      = true;
    this.gameOver        = false;
    this.aiPending       = false;
    this.waitingForLand  = false;
    this.lastResult      = null;
    this.showGameScreen(mode.name);
    this.refreshUI();
  }

  private returnToMenu() {
    this.gameActive      = false;
    this.aiPending       = false;
    this.waitingForLand  = false;
    this.teardownBoard();
    // Swap interactive zones: game action off, menu on (guard against double-remove)
    if (this.gameZonesActive) {
      for (const e of this.gameActionZoneEntities) e.removeComponent(Interactable);
      for (const e of this.menuZoneEntities) e.addComponent(Interactable);
      this.gameZonesActive = false;
    }
    this.showMenuScreen();
  }

  private launchCornhole() {
    if (!this.ui) return;
    this.cornholeActive = true;
    // Disable menu zones so they don't receive raycasts while cornhole is active
    for (const e of this.menuZoneEntities) {
      if (e.hasComponent(Interactable)) e.removeComponent(Interactable);
    }
    this.ui.menuScreen.setProperties({ display: "none" });
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) activeGame.value = "cornhole";
  }

  // ── Mode setup ──────────────────────────────────────────────────────────────

  private setMode(mode: GameMode) {
    this.currentMode = mode;
    this.cols     = mode.cols;
    this.rows     = mode.rows;
    this.winBy    = mode.winBy;
    this.cellH    = 1.0 / this.rows;
    this.cellW    = this.cellH;                // square cells
    this.boardW   = this.cols * this.cellW;

    // Depth: small boards solved exactly; larger boards use heuristic cutoff
    const cells   = this.cols * this.rows;
    this.maxDepth = cells <= 12 ? 9 : cells <= 20 ? 8 : cells <= 42 ? 6 : 5;

    // Fresh board
    this.board = Array.from({ length: this.cols }, () => new Array(this.rows).fill(0));

    // Column order: centre-out for better alpha-beta pruning
    const c = Math.floor(this.cols / 2);
    this.colOrder = [c];
    for (let d = 1; d <= this.cols; d++) {
      if (c - d >= 0) this.colOrder.push(c - d);
      if (c + d < this.cols) this.colOrder.push(c + d);
    }
  }

  private colX(col: number): number {
    return BOARD_X - this.boardW / 2 + (col + 0.5) * this.cellW;
  }
  private rowY(row: number): number {
    return BOARD_Y - 0.5 + (row + 0.5) * this.cellH;
  }

  // ── Board construction / teardown ──────────────────────────────────────────

  private buildBoard() {
    const bw = this.boardW;
    const bh = 1.0; // fixed 1 m height

    // Backing plate
    const plate = new Mesh(
      new BoxGeometry(bw + 0.04, bh + 0.04, 0.02),
      new MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.9 }),
    );
    plate.position.set(BOARD_X, BOARD_Y, BOARD_Z);
    this.boardEntities.push(
      this.world
        .createTransformEntity(plate)
        .addComponent(PhysicsShape, {
          shape: PhysicsShapeType.Box,
          dimensions: [bw + 0.04, bh + 0.04, 0.02] as [number, number, number],
        })
        .addComponent(PhysicsBody, { state: PhysicsState.Static }),
    );

    // Grid lines
    const lineMat = new MeshStandardMaterial({ color: 0x5555cc, roughness: 0.5 });
    for (let i = 1; i < this.cols; i++) {
      const v = new Mesh(new BoxGeometry(0.008, bh, 0.025), lineMat);
      v.position.set(BOARD_X - bw / 2 + i * this.cellW, BOARD_Y, BOARD_Z + 0.012);
      this.boardEntities.push(
        this.world.createTransformEntity(v)
          .addComponent(PhysicsShape, {
            shape: PhysicsShapeType.Box,
            dimensions: [0.008, bh, 0.025] as [number, number, number],
          })
          .addComponent(PhysicsBody, { state: PhysicsState.Static }),
      );
    }
    for (let i = 1; i < this.rows; i++) {
      const h = new Mesh(new BoxGeometry(bw, 0.008, 0.025), lineMat);
      h.position.set(BOARD_X, BOARD_Y - 0.5 + i * this.cellH, BOARD_Z + 0.012);
      this.boardEntities.push(
        this.world.createTransformEntity(h)
          .addComponent(PhysicsShape, {
            shape: PhysicsShapeType.Box,
            dimensions: [bw, 0.008, 0.025] as [number, number, number],
          })
          .addComponent(PhysicsBody, { state: PhysicsState.Static }),
      );
    }

    if (this.currentMode.isDrop) {
      // Column strips + X previews above
      for (let col = 0; col < this.cols; col++) {
        const mat = new MeshStandardMaterial({
          color: 0x2244bb, emissive: 0x2244bb, emissiveIntensity: 0.0,
          transparent: true, opacity: 0.1, depthWrite: false,
        });
        this.zoneMaterials[col] = mat;

        const stripWidth = this.cellW * 0.88;
        const strip = new Mesh(new BoxGeometry(stripWidth, bh, 0.04), mat);
        // Position it slightly in front of grid lines
        strip.position.set(this.colX(col), BOARD_Y, BOARD_Z + 0.04);
        (strip as any).pointerEvents = 'auto';
        // Pre-parent to scene NOW so InputSystem.updateDescendantArrays (which
        // fires in the same frame via the dirty flag set in setupEventListeners)
        // sees mesh.parent != null and includes this entity in rayDescendants.
        // Without this, createTransformEntity defers the Three.js add() to
        // TransformSystem.update(), which runs after updateDescendantArrays.
        this.scene.add(strip);
        this.boardEntities.push(
          this.world.createTransformEntity(strip)
            .addComponent(Interactable)
            .addComponent(ColumnZone, { colIndex: col }),
        );


      }
    } else {
      // Individual cell interaction zones
      for (let col = 0; col < this.cols; col++) {
        for (let row = 0; row < this.rows; row++) {
          const mat = new MeshStandardMaterial({
            color: 0x2244bb, emissive: 0x2244bb, emissiveIntensity: 0.0,
            transparent: true, opacity: 0.1, depthWrite: false,
          });
          // Use col * this.rows + row to avoid index collisions
          this.zoneMaterials[col * this.rows + row] = mat;

          const cellW = this.cellW * 0.88;
          const cellH = this.cellH * 0.88;
          const cell = new Mesh(new BoxGeometry(cellW, cellH, 0.04), mat);
          // Position it slightly in front of grid lines
          cell.position.set(this.colX(col), this.rowY(row), BOARD_Z + 0.04);
          (cell as any).pointerEvents = 'auto';
          this.scene.add(cell);
          this.boardEntities.push(
            this.world.createTransformEntity(cell)
              .addComponent(Interactable)
              .addComponent(CellZone, { colIndex: col, rowIndex: row }),
          );
        }
      }
    }
  }

  private teardownBoard() {
    // Dispose pieces
    for (const e of Array.from(this.queries.pieces.entities)) e.dispose();
    // Dispose board structure
    for (const e of this.boardEntities) e.dispose();
    this.boardEntities = [];
    this.zoneMaterials = [];
  }

  private buildMenuZones() {
    // UIKit scale: maxWidth(0.76m) / root width(72 units) = 0.010556 m/unit
    // Panel entity at (BOARD_X, 1.3, BOARD_Z). Panel height auto-sizes to content.
    // Menu screen height ≈ 67.0 units:
    //   pad(3) + title(9) + 5×btn(7.6) + 4×gap(1.2) + mode-4 margin-bottom(1.2)
    //   + exit margin-top(2) + exit btn height(6) + pad(3) = 67.0
    // Panel anchor is its center (y=1.3), so top = 1.3 + height*scale/2.
    // Button centers from panel top (units): [15.8, 24.6, 33.4, 42.2, 51.0, 61.0]
    const scale = 0.76 / 72;           // 0.010556 m/unit
    const zoneD = 0.04;
    const zoneZ = BOARD_Z + 0.06;       // slightly in front of panel face

    // ── Menu mode buttons + Exit button ──
    // Panel height now includes QR button (between Cornhole and Exit): 75.8 + 6.5 = 82.3 units
    // offsets[0..5] = mode buttons (0=TTT, 5=Cornhole); offsets[6] = Exit to Browser
    // (QR button has no zone — non-VR only; exit offset shifts down by 6.5 units)
    const panelContentHeight = 82.3;
    const panelTopY = 1.3 + (panelContentHeight * scale) / 2;
    const buttonOffsets = [15.8, 24.6, 33.4, 42.2, 51.0, 59.8, 76.5];
    const zoneW = 0.68;
    const zoneH     = 7.6 * scale;    // ≈ 0.080m — mode button height
    const exitZoneH = 6.0 * scale;    // ≈ 0.063m — exit button height
    // Cornhole button gets a distinct tint (green)
    const cornholeColor = 0x22cc66;

    for (let i = 0; i <= GAME_MODES.length + 1; i++) {
      const isExit     = i === GAME_MODES.length + 1;
      const isCornhole = i === GAME_MODES.length;
      const worldY  = panelTopY - buttonOffsets[i] * scale;
      const height  = isExit ? exitZoneH : zoneH;
      const color   = isExit ? 0x555555 : isCornhole ? cornholeColor : 0x22aaff;

      const mat = new MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.0,
        transparent: true, opacity: 0.0, depthWrite: false,
      });
      this.menuZoneMaterials[i] = mat;

      const mesh = new Mesh(new BoxGeometry(zoneW, height, zoneD), mat);
      mesh.position.set(BOARD_X, worldY, zoneZ);

      this.menuZoneEntities.push(
        this.world.createTransformEntity(mesh)
          .addComponent(Interactable)
          .addComponent(MenuButton, { modeIndex: i }),
      );
    }

    // ── Game-screen action buttons (Reset Score / Change Game) ──
    // Created WITHOUT Interactable — enabled in startGame(), disabled in returnToMenu()
    // so they don't block menu zone raycasts (both overlap spatially).
    // Button layout: width=32, padding=2, font=2.5 → btn height = 2.5 + 2*2 = 6.5 units
    // Two buttons: 32 + margin(2) + 32 = 66 units = exact content width
    // Panel height: 38.8 + 2.1 extra (taller buttons) = 40.9 units
    // Action row center from bottom: padding(3) + btn-height(6.5)/2 = 6.25 units
    const gameScreenPanelBottomY = 1.3 - (40.9 * scale) / 2;
    const actionBtnCenterY = gameScreenPanelBottomY + 6.25 * scale;
    const actionBtnW = 32 * scale;
    const actionBtnH = 6.5 * scale;
    const actionZoneW = actionBtnW;        // 100% width — full button coverage
    const actionZoneH = actionBtnH * 2.5; // 250% height — generous vertical target (~17cm)
    const contentW = 66 * scale;
    const resetCenterX  = BOARD_X - contentW / 2 + actionBtnW / 2;
    const changeCenterX = BOARD_X + contentW / 2 - actionBtnW / 2;

    const actionDefs = [
      { type: 0, x: resetCenterX  },
      { type: 1, x: changeCenterX },
    ];

    for (const { type, x } of actionDefs) {
      const mat = new MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.0,
        transparent: true, opacity: 0.0, depthWrite: false,
      });
      this.gameActionZoneMaterials[type] = mat;
      const mesh = new Mesh(new BoxGeometry(actionZoneW, actionZoneH, zoneD), mat);
      mesh.position.set(x, actionBtnCenterY, BOARD_Z + 0.12);

      // No Interactable here — added by startGame(), removed by returnToMenu()
      this.gameActionZoneEntities.push(
        this.world.createTransformEntity(mesh)
          .addComponent(GameActionButton, { actionType: type }),
      );
    }
  }

  // ── Game logic ──────────────────────────────────────────────────────────────

  private isAnimating(): boolean {
    for (const e of this.queries.pieces.entities) {
      if (e.getValue(GamePiece, "dropping")) return true;
    }
    return false;
  }

  private getColHeight(col: number): number {
    for (let r = 0; r < this.rows; r++) {
      if (this.board[col][r] === 0) return r;
    }
    return -1;
  }

  private placePlayerPiece(col: number, row?: number) {
    const targetRow = row !== undefined ? row : this.getColHeight(col);
    if (targetRow === -1) return;

    this.board[col][targetRow] = 1;
    this.spawnPiece(col, targetRow, 1);

    if (this.checkWinner() === 1) { this.wins++;  this.endGame("win");  return; }
    if (this.isBoardFull())        { this.draws++; this.endGame("draw"); return; }

    this.playerTurn     = false;
    this.waitingForLand = true;
    this.refreshUI();
  }

  private doAIMove() {
    const move = this.getBestMove();
    if (!move) return;
    const { col, row } = move;

    this.board[col][row] = 2;
    this.spawnPiece(col, row, 2);

    if (this.checkWinner() === 2) { this.losses++; this.endGame("loss"); return; }
    if (this.isBoardFull())        { this.draws++;  this.endGame("draw"); return; }

    this.playerTurn = true;
    this.refreshUI();
  }

  private endGame(result: "win" | "loss" | "draw") {
    this.gameOver   = true;
    this.lastResult = result;
    this.refreshUI();
  }

  private spawnPiece(col: number, row: number, player: 1 | 2) {
    const size   = this.cellW * 0.72;
    const piece  = player === 1 ? makeX(size) : makeO(size);
    const targetY = this.rowY(row);

    if (this.currentMode.isDrop) {
      const startY = BOARD_Y + 0.5 + 0.3;
      piece.position.set(this.colX(col), startY, BOARD_Z + 0.035);
      this.world.createTransformEntity(piece)
        .addComponent(GamePiece, { player, dropping: true, targetY });
    } else {
      piece.position.set(this.colX(col), targetY, BOARD_Z + 0.035);
      this.world.createTransformEntity(piece)
        .addComponent(GamePiece, { player, dropping: false, targetY });
    }
  }

  // ── Win detection — works for any (cols, rows, winBy) ─────────────────────

  private checkWinner(): number {
    const dirs: [number, number][] = [[1,0],[0,1],[1,1],[1,-1]];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const p = this.board[c][r];
        if (!p) continue;
        for (const [dc, dr] of dirs) {
          let n = 1;
          while (n < this.winBy) {
            const nc = c + dc * n, nr = r + dr * n;
            if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows || this.board[nc][nr] !== p) break;
            n++;
          }
          if (n === this.winBy) return p;
        }
      }
    }
    return 0;
  }

  private isBoardFull(): boolean {
    return this.board.every(col => col.every(cell => cell !== 0));
  }

  // ── AI — alpha-beta with heuristic for depth-limited boards ───────────────

  private getBestMove(): { col: number, row: number } | null {
    let bestScore = -Infinity, bestMove: { col: number, row: number } | null = null;

    if (this.currentMode.isDrop) {
      for (const col of this.colOrder) {
        const row = this.getColHeight(col);
        if (row === -1) continue;
        this.board[col][row] = 2;
        const score = this.alphabeta(1, -Infinity, Infinity, false);
        this.board[col][row] = 0;
        if (score > bestScore) { bestScore = score; bestMove = { col, row }; }
      }
    } else {
      for (let col = 0; col < this.cols; col++) {
        for (let row = 0; row < this.rows; row++) {
          if (this.board[col][row] !== 0) continue;
          this.board[col][row] = 2;
          const score = this.alphabeta(1, -Infinity, Infinity, false);
          this.board[col][row] = 0;
          if (score > bestScore) { bestScore = score; bestMove = { col, row }; }
        }
      }
    }
    return bestMove;
  }

  private alphabeta(depth: number, alpha: number, beta: number, maximizing: boolean): number {
    const w = this.checkWinner();
    if (w === 2) return 1000 - depth;
    if (w === 1) return depth - 1000;
    if (this.isBoardFull()) return 0;
    if (depth >= this.maxDepth) return this.evaluateBoard();

    if (maximizing) {
      let val = -Infinity;
      if (this.currentMode.isDrop) {
        for (const col of this.colOrder) {
          const row = this.getColHeight(col);
          if (row === -1) continue;
          this.board[col][row] = 2;
          val = Math.max(val, this.alphabeta(depth + 1, alpha, beta, false));
          this.board[col][row] = 0;
          alpha = Math.max(alpha, val);
          if (alpha >= beta) break;
        }
      } else {
        for (let col = 0; col < this.cols; col++) {
          for (let row = 0; row < this.rows; row++) {
            if (this.board[col][row] !== 0) continue;
            this.board[col][row] = 2;
            val = Math.max(val, this.alphabeta(depth + 1, alpha, beta, false));
            this.board[col][row] = 0;
            alpha = Math.max(alpha, val);
            if (alpha >= beta) break;
          }
        }
      }
      return val;
    } else {
      let val = Infinity;
      if (this.currentMode.isDrop) {
        for (const col of this.colOrder) {
          const row = this.getColHeight(col);
          if (row === -1) continue;
          this.board[col][row] = 1;
          val = Math.min(val, this.alphabeta(depth + 1, alpha, beta, true));
          this.board[col][row] = 0;
          beta = Math.min(beta, val);
          if (beta <= alpha) break;
        }
      } else {
        for (let col = 0; col < this.cols; col++) {
          for (let row = 0; row < this.rows; row++) {
            if (this.board[col][row] !== 0) continue;
            this.board[col][row] = 1;
            val = Math.min(val, this.alphabeta(depth + 1, alpha, beta, true));
            this.board[col][row] = 0;
            beta = Math.min(beta, val);
            if (beta <= alpha) break;
          }
        }
      }
      return val;
    }
  }

  private evaluateBoard(): number {
    let score = 0;
    const dirs: [number, number][] = [[1,0],[0,1],[1,1],[1,-1]];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        for (const [dc, dr] of dirs) {
          // Check the far end of a winBy-length window fits on the board
          const ec = c + dc * (this.winBy - 1);
          const er = r + dr * (this.winBy - 1);
          if (ec < 0 || ec >= this.cols || er < 0 || er >= this.rows) continue;
          let ai = 0, player = 0;
          for (let k = 0; k < this.winBy; k++) {
            const v = this.board[c + dc * k][r + dr * k];
            if (v === 2) ai++; else if (v === 1) player++;
          }
          if (ai > 0 && player > 0) continue; // blocked window
          if (ai > 0) score += ai === this.winBy - 1 ? 50 : ai === this.winBy - 2 ? 5 : 1;
          if (player > 0) score -= player === this.winBy - 1 ? 50 : player === this.winBy - 2 ? 5 : 1;
        }
      }
    }
    // Centre column preference
    const centre = Math.floor(this.cols / 2);
    for (let r = 0; r < this.rows; r++) {
      if (this.board[centre][r] === 2) score += 3;
      else if (this.board[centre][r] === 1) score -= 3;
    }
    return score;
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  private refreshUI() {
    if (!this.ui) return;
    const u = this.ui;
    u.turnYours.setProperties({ display: "none" });
    u.turnAI.setProperties({ display: "none" });
    u.resultWin.setProperties({ display: "none" });
    u.resultLose.setProperties({ display: "none" });
    u.resultDraw.setProperties({ display: "none" });

    if (this.gameOver) {
      if      (this.lastResult === "win")  u.resultWin.setProperties({ display: "flex" });
      else if (this.lastResult === "loss") u.resultLose.setProperties({ display: "flex" });
      else                                 u.resultDraw.setProperties({ display: "flex" });
    } else if (this.playerTurn) {
      u.turnYours.setProperties({ display: "flex" });
    } else {
      u.turnAI.setProperties({ display: "flex" });
    }

    u.youScore.setProperties({ text: String(this.wins) });
    u.aiScore.setProperties({ text: String(this.losses) });
    u.drawScore.setProperties({ text: String(this.draws) });

    if (this.gameOver) {
      u.resetBtn.setProperties({ text: "Play Again" });
      u.changeBtn.setProperties({ text: "Different Game" });
    } else {
      u.resetBtn.setProperties({ text: "Reset Score" });
      u.changeBtn.setProperties({ text: "Change Game" });
    }
  }
}
