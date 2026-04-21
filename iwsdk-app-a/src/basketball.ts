import {
  createComponent,
  createSystem,
  Types,
  Interactable,
  Hovered,
  Pressed,
  DistanceGrabbable,
  MovementMode,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  Entity,
  BoxGeometry,
  Mesh,
  Group,
  Vector3,
  MeshStandardMaterial,
  ShaderMaterial,
  VideoTexture,
  PlaneGeometry,
  DataTexture,
  Texture,
  TextureLoader,
  SRGBColorSpace,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";
import Hls, { type ErrorData } from "hls.js";

// ── Constants ──────────────────────────────────────────────────────────────
const STREAM_URL =
  "https://streams.quintar.ai/nba-2025/20250216/newreg/" +
  "Main_Final_8m_hardmasked_nvenc_tb_20Mbps/index.m3u8";

const MASK_URL =
  "https://nba-stage.configs.quintar.ai/meta/2025/AllStar_MidCourt_Jumbo10.png";

const SCREEN_W       = 4.0;               // meters wide
const SCREEN_H       = SCREEN_W * 9 / 16; // 16:9 per-eye (2.25 m)
const SCREEN_Z       = -3.5;              // default depth (m)
const SCREEN_Z_CLOSE = -1.5;              // Mode A — twice the angular size → 2× effective PPD
const SCREEN_Y       =  1.2;              // comfortable eye level

// ── Basketball screen PANEL_H layout (UIKit units) ────────────────────────
//  paddingTop:3
//  bball-title:       h=6  (fs5×1.2),  mb=1.5  → cum 10.5
//  bball-status:      h=3.6(fs3×1.2),  mb=2    → cum 16.1
//  divider:           mt=2, h=0.12, mb=1.5      → cum 19.72
//  bball-row-1:       mt=1, h=6                 → cum 26.72  center=23.72
//  bball-row-2:       mt=1, h=6                 → cum 33.72  center=30.72
//  bball-menu-btn:    mt=2, h=7.6               → cum 43.32  center=39.52
//  paddingBottom:3                               → PANEL_H = 46.32
const BBALL_PANEL_H = 46.32;

// ── Button style constants ─────────────────────────────────────────────────
const MODE_BTN_ACTIVE   = { backgroundColor: "#1e3a5f", color: "#93c5fd", borderColor: "#2563eb", borderWidth: 0.15 };
const MODE_BTN_INACTIVE = { backgroundColor: "#18181b", color: "#71717a", borderColor: "#3f3f46", borderWidth: 0.1  };

// ── Three.js ShaderMaterial shaders (GLSL ES 1.0 / Three.js) ───────────────
// Video: top-bottom (TB) stereo — top half = left eye, bottom half = right eye
// Mask:  side-by-side (SBS) stereo — left half = left eye, right half = right eye
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uVideo;
  uniform sampler2D uMask;
  uniform float uVidYMin;
  uniform float uVidYMax;
  uniform float uMskXMin;
  uniform float uMskXMax;
  varying vec2 vUv;
  void main() {
    vec2 maskUv  = vec2(uMskXMin + vUv.x * (uMskXMax - uMskXMin), vUv.y);
    float alpha  = texture2D(uMask, maskUv).r;
    if (alpha < 0.01) discard;
    vec2 videoUv = vec2(vUv.x, uVidYMin + vUv.y * (uVidYMax - uVidYMin));
    vec4 color   = texture2D(uVideo, videoUv);
    gl_FragColor = vec4(color.rgb, alpha);
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────
type BballMode = 0 | 1 | 2; // 0=current, 1=A(closer), 2=B(aniso)

// ── ECS Component ─────────────────────────────────────────────────────────
export const BasketballButtonZone = createComponent("BasketballButtonZone", {
  actionType: { type: Types.Int8, default: 0 },
});

// ── System ────────────────────────────────────────────────────────────────
export class BasketballSystem extends createSystem({
  panel:           { required: [PanelUI, PanelDocument] },
  bballBtnHovered: { required: [BasketballButtonZone, Hovered] },
  bballBtnPressed: { required: [BasketballButtonZone, Pressed] },
}) {
  private active      = false;
  private screenMode: BballMode = 0;

  private bballUI: {
    screen:   UIKit.Text;
    statusEl: UIKit.Text;
    modeBtns: (UIKit.Text | null)[];
  } | null = null;

  private bballBtnZoneEntities:  Entity[] = [];
  private bballBtnZoneMaterials: MeshStandardMaterial[] = [];

  private videoEl:    HTMLVideoElement | null = null;
  private hlsInst:    Hls | null = null;
  private screenEnt:  Entity | null = null;
  private screenGroup: Group | null = null;          // for Z-position updates (modes A/D)
  private videoTex:   VideoTexture | null = null;    // for anisotropy (mode B) + mode D
  private screenMats: ShaderMaterial[] = [];

  // Mask texture — 1×1 white fallback until PNG loads
  private maskTex: Texture = makeFallbackMask();

  // Scratch vectors for billboard — pre-allocated to avoid GC pressure in update()
  private _headPos = new Vector3();
  private _screenPos = new Vector3();

  init() {
    new TextureLoader().load(
      MASK_URL,
      (tex) => {
        this.maskTex = tex;
        for (const mat of this.screenMats) {
          mat.uniforms.uMask.value = tex;
        }
      },
      undefined,
      (err) => console.warn("[Basketball] mask load failed — playing unmasked:", err),
    );

    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.bballUI) return;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;
      this.bballUI = {
        screen:   doc.getElementById("basketball-screen") as UIKit.Text,
        statusEl: doc.getElementById("bball-status")      as UIKit.Text,
        modeBtns: [
          doc.getElementById("bball-mode-current") as UIKit.Text | null,
          doc.getElementById("bball-mode-a")       as UIKit.Text | null,
          doc.getElementById("bball-mode-b")       as UIKit.Text | null,
        ],
      };
      (doc.getElementById("bball-menu-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.returnToMenu());
      (doc.getElementById("bball-mode-current") as UIKit.Text)
        ?.addEventListener("click", () => this.setMode(0));
      (doc.getElementById("bball-mode-a") as UIKit.Text)
        ?.addEventListener("click", () => this.setMode(1));
      (doc.getElementById("bball-mode-b") as UIKit.Text)
        ?.addEventListener("click", () => this.setMode(2));
      this.buildScreenZones(entity, doc);
    });

    this.queries.bballBtnHovered.subscribe("qualify", (entity) => {
      const idx = entity.getValue(BasketballButtonZone, "actionType") as number;
      const mat = this.bballBtnZoneMaterials[idx];
      if (mat) { mat.opacity = 0.28; mat.emissiveIntensity = 0.55; }
    });
    this.queries.bballBtnHovered.subscribe("disqualify", (entity) => {
      const idx = entity.getValue(BasketballButtonZone, "actionType") as number;
      const mat = this.bballBtnZoneMaterials[idx];
      if (mat) { mat.opacity = 0.0; mat.emissiveIntensity = 0.0; }
    });

    this.queries.bballBtnPressed.subscribe("qualify", (entity) => {
      if (!this.active) return;
      const idx = entity.getValue(BasketballButtonZone, "actionType") as number;
      switch (idx) {
        case 0: this.setMode(0);      break;
        case 1: this.setMode(1);      break;
        case 2: this.setMode(2);      break;
        case 4: this.returnToMenu();  break;
      }
    });

    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) {
      this.cleanupFuncs.push(
        activeGame.subscribe((game) => {
          if (game === "basketball" && !this.active) {
            this.startBasketball();
          } else if (game !== "basketball" && this.active) {
            this.stopBasketball();
          }
        }),
      );
    }
  }

  // ── Layout table ──────────────────────────────────────────────────────────
  // BBALL_PANEL_H = 46.32  →  halfH = 23.16
  //
  // action  x      y          w   h    description
  // ──────────────────────────────────────────────────────────────────────────
  //   0    -17    -0.56      32   6    bball-mode-current (row-1 left)
  //   1    +17    -0.56      32   6    bball-mode-a       (row-1 right)
  //   2    -17    -7.56      32   6    bball-mode-b       (row-2 left)
  //   3    +17    -7.56      32   6    bball-mode-d       (row-2 right)
  //   4      0   -16.36      66   7.6  bball-menu-btn

  private buildScreenZones(panelEntity: Entity, doc: UIKitDocument) {
    // Use the live ratio once PanelUI is set up (same formula as railroad.ts).
    // Requiring PanelUI in the panel query ensures this fires after PanelUISystem
    // has fully initialized the entity — including any world-scale it applies.
    // The fallback matches the drop-ttt hardcoded value.
    const computedW = (doc as any).computedSize?.width ?? 72;
    const scale = (doc.targetSize?.width ?? 0) > 0
      ? doc.targetSize.width / computedW
      : 0.76 / 72;

    const halfH  = BBALL_PANEL_H / 2; // 23.16
    const zoneD  = 0.10;
    const localZ = 0.06;

    // Heights use 1.3× the CSS-computed value so the ray has a generous target
    const defs = [
      { action: 0, x: -17, y: halfH - 23.72, w: 32, h: 7.8, color: 0x2255aa }, // 6.0 × 1.3
      { action: 1, x:  17, y: halfH - 23.72, w: 32, h: 7.8, color: 0x225577 }, // 6.0 × 1.3
      { action: 2, x: -17, y: halfH - 30.72, w: 32, h: 7.8, color: 0x225577 }, // 6.0 × 1.3
      { action: 4, x:   0, y: halfH - 39.52, w: 66, h: 9.9, color: 0x888888 }, // 7.6 × 1.3
    ];

    for (const { action, x, y, w, h, color } of defs) {
      const mat = new MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.0,
        transparent: true, opacity: 0.0, depthWrite: false, depthTest: false,
      });
      this.bballBtnZoneMaterials[action] = mat;

      const mesh = new Mesh(new BoxGeometry(w * scale, h * scale, zoneD), mat);
      mesh.position.set(x * scale, y * scale, localZ);
      mesh.renderOrder = 999;
      panelEntity.object3D!.add(mesh);

      const zoneEntity = this.world.createTransformEntity(mesh, panelEntity)
        .addComponent(BasketballButtonZone, { actionType: action });
      this.bballBtnZoneEntities.push(zoneEntity);
    }
  }

  private startBasketball() {
    this.active      = true;
    this.screenMode  = 0;
    this.bballUI?.screen.setProperties({ display: "flex" });
    this.bballUI?.statusEl.setProperties({ text: "Loading stream\u2026" });
    this.refreshModeBtnStyles();

    for (const e of this.bballBtnZoneEntities) {
      if (!e.hasComponent(Interactable)) e.addComponent(Interactable);
    }

    this.createStereoScreen();
  }

  private stopBasketball() {
    this.active = false;

    for (const e of this.bballBtnZoneEntities) {
      if (e.hasComponent(Interactable)) e.removeComponent(Interactable);
    }

    this.bballUI?.screen.setProperties({ display: "none" });

    if (this.hlsInst)    { this.hlsInst.destroy();                     this.hlsInst    = null; }
    if (this.videoEl)    { this.videoEl.pause(); this.videoEl.remove(); this.videoEl    = null; }
    if (this.screenEnt)  { this.screenEnt.dispose();                   this.screenEnt  = null; }
    this.screenGroup = null;
    this.videoTex    = null;
    this.screenMats  = [];
  }

  private returnToMenu() {
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) activeGame.value = "menu";
  }

  // ── Mode switching ─────────────────────────────────────────────────────────

  private setMode(mode: BballMode) {
    this.screenMode = mode;
    this.refreshModeBtnStyles();

    switch (mode) {
      case 0: this.applyModeCurrent(); break;
      case 1: this.applyModeA();       break;
      case 2: this.applyModeB();       break;
    }
  }

  private refreshModeBtnStyles() {
    this.bballUI?.modeBtns.forEach((btn, i) => {
      btn?.setProperties(i === this.screenMode ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE);
    });
  }

  private applyModeCurrent() {
    if (this.screenGroup) {
      this.screenGroup.position.z = SCREEN_Z;
      this.screenGroup.visible    = true;
    }
    if (this.videoTex) { this.videoTex.anisotropy = 1; this.videoTex.needsUpdate = true; }
    this.bballUI?.statusEl.setProperties({ text: "Live" });
  }

  private applyModeA() {
    // Closer: halves the angular distance → effectively doubles PPD, free of cost
    if (this.screenGroup) {
      this.screenGroup.position.z = SCREEN_Z_CLOSE;
      this.screenGroup.visible    = true;
    }
    if (this.videoTex) { this.videoTex.anisotropy = 1; this.videoTex.needsUpdate = true; }
    this.bballUI?.statusEl.setProperties({ text: "Live (Closer)" });
  }

  private applyModeB() {
    // Anisotropic filtering: improves texture quality for oblique viewing angles
    if (this.screenGroup) {
      this.screenGroup.position.z = SCREEN_Z;
      this.screenGroup.visible    = true;
    }
    const renderer = (this.world as any).renderer as { capabilities?: { getMaxAnisotropy?(): number } } | undefined;
    if (this.videoTex && renderer?.capabilities?.getMaxAnisotropy) {
      this.videoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      this.videoTex.needsUpdate = true;
    }
    this.bballUI?.statusEl.setProperties({ text: "Live (Aniso)" });
  }

  // ── update ────────────────────────────────────────────────────────────────
  update(_delta: number, _time: number) {
    // Y-axis billboard — rotate screen around Y to always face the player,
    // regardless of where it has been moved with the hand/controller grab.
    // X and Z rotations are locked to zero to keep the screen level.
    if (this.active && this.screenGroup && this.screenGroup.visible) {
      this.player.head.getWorldPosition(this._headPos);
      this.screenGroup.getWorldPosition(this._screenPos);
      this.screenGroup.rotation.y = Math.atan2(
        this._headPos.x - this._screenPos.x,
        this._headPos.z - this._screenPos.z,
      );
      this.screenGroup.rotation.x = 0;
      this.screenGroup.rotation.z = 0;
    }
  }

  // ── Stereo video screen ───────────────────────────────────────────────────
  private createStereoScreen() {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;
    video.loop  = true;
    this.videoEl = video;

    const onReady = () => {
      video.play().catch(console.warn);
      this.bballUI?.statusEl.setProperties({ text: "Live" });
    };

    if (Hls.isSupported()) {
      const hls = new Hls();
      this.hlsInst = hls;
      hls.loadSource(STREAM_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_evt: unknown, data: ErrorData) => {
        if (data.fatal) {
          console.warn("[Basketball] HLS fatal error", data);
          this.bballUI?.statusEl.setProperties({ text: "Stream error" });
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = STREAM_URL;
      video.addEventListener("loadedmetadata", onReady, { once: true });
    } else {
      this.bballUI?.statusEl.setProperties({ text: "HLS not supported" });
      return;
    }

    const videoTex = new VideoTexture(video);
    videoTex.colorSpace = SRGBColorSpace;
    this.videoTex = videoTex;

    const leftMat  = makeStereoMat(videoTex, this.maskTex, true);
    const rightMat = makeStereoMat(videoTex, this.maskTex, false);
    this.screenMats = [leftMat, rightMat];

    const geom = new PlaneGeometry(SCREEN_W, SCREEN_H);

    const leftMesh  = new Mesh(geom, leftMat);
    leftMesh.layers.set(1);  // left eye only

    const rightMesh = new Mesh(geom, rightMat);
    rightMesh.layers.set(2); // right eye only

    // Invisible grab proxy on the default layer (0) so the InputSystem's BVH
    // raycaster can intersect it regardless of eye-layer configuration.
    // leftMesh/rightMesh are on layers 1/2 (eye-specific); the proxy ensures
    // hand pinch and controller ray both have a reliable hit surface.
    const proxyMat = new MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const proxyMesh = new Mesh(new PlaneGeometry(SCREEN_W, SCREEN_H), proxyMat);
    // stays on layer 0 (default) — no layers.set() call

    const group = new Group();
    group.add(leftMesh, rightMesh, proxyMesh);
    group.position.set(0, SCREEN_Y, SCREEN_Z);

    this.screenGroup = group;
    this.screenEnt   = this.world.createTransformEntity(group)
      .addComponent(Interactable)
      .addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveFromTarget });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFallbackMask(): DataTexture {
  const tex = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
}

function makeStereoMat(videoTex: VideoTexture, maskTex: Texture, isLeft: boolean): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uVideo:   { value: videoTex },
      uMask:    { value: maskTex  },
      uVidYMin: { value: isLeft ? 0.5 : 0.0 },
      uVidYMax: { value: isLeft ? 1.0 : 0.5 },
      uMskXMin: { value: isLeft ? 0.0 : 0.5 },
      uMskXMax: { value: isLeft ? 0.5 : 1.0 },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite:  false,
  });
}

