import {
  createComponent,
  createSystem,
  Types,
  Interactable,
  Hovered,
  Pressed,
  PanelDocument,
  UIKitDocument,
  UIKit,
  Entity,
  BoxGeometry,
  Mesh,
  Group,
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

const SCREEN_W = 4.0;               // meters wide
const SCREEN_H = SCREEN_W * 9 / 16; // 16:9 per-eye aspect ratio (2.25 m)
const SCREEN_Z = -3.5;              // m in front of world origin
const SCREEN_Y =  1.2;              // m up (comfortable eye level)

// Basketball screen PANEL_H layout (UIKit units):
//  paddingTop:3
//  bball-title:  h=6  (fs5×1.2), mb=1.5  → cum: 10.5
//  bball-status: h=3.6(fs3×1.2), mb=2    → cum: 16.1
//  divider:      mt=2, h=0.12, mb=1.5    → cum: 19.72
//  bball-menu-btn: mt=2, h=7.6           → center=25.52, bottom=29.32
//  paddingBottom:3                        → PANEL_H = 32.32
const BBALL_PANEL_H = 32.32;

// ── Shaders ────────────────────────────────────────────────────────────────
// The video is top-bottom stereo (TB): top half = left eye, bottom half = right eye.
// The mask is side-by-side stereo (SBS): left half = left eye, right half = right eye.
// Each eye gets its own ShaderMaterial instance with distinct UV range uniforms.
//
//  Left eye:   uVidYMin=0.5, uVidYMax=1.0   uMskXMin=0.0, uMskXMax=0.5
//  Right eye:  uVidYMin=0.0, uVidYMax=0.5   uMskXMin=0.5, uMskXMax=1.0

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

  // Video UV vertical range — selects top or bottom half of the TB stereo frame
  uniform float uVidYMin;
  uniform float uVidYMax;

  // Mask UV horizontal range — selects left or right half of the SBS stereo mask
  uniform float uMskXMin;
  uniform float uMskXMax;

  varying vec2 vUv;

  void main() {
    // Sample mask for this eye from its SBS half
    vec2 maskUv = vec2(uMskXMin + vUv.x * (uMskXMax - uMskXMin), vUv.y);
    vec4 m = texture2D(uMask, maskUv);

    // Mask value: use red channel (white=opaque, black=discard).
    // Works for greyscale B/W masks; also handles RGBA masks where shape is in R.
    float alpha = m.r;
    if (alpha < 0.01) discard;

    // Sample video for this eye from its TB half
    vec2 videoUv = vec2(vUv.x, uVidYMin + vUv.y * (uVidYMax - uVidYMin));
    vec4 color = texture2D(uVideo, videoUv);

    gl_FragColor = vec4(color.rgb, alpha);
  }
`;

// ── ECS Component ─────────────────────────────────────────────────────────
export const BasketballButtonZone = createComponent("BasketballButtonZone", {
  actionType: { type: Types.Int8, default: 0 },
});

// ── System ────────────────────────────────────────────────────────────────
export class BasketballSystem extends createSystem({
  panel:           { required: [PanelDocument] },
  bballBtnHovered: { required: [BasketballButtonZone, Hovered] },
  bballBtnPressed: { required: [BasketballButtonZone, Pressed] },
}) {
  private active = false;

  private bballUI: {
    screen:   UIKit.Text;
    statusEl: UIKit.Text;
  } | null = null;

  private bballBtnZoneEntities:  Entity[] = [];
  private bballBtnZoneMaterials: MeshStandardMaterial[] = [];

  private videoEl:    HTMLVideoElement | null = null;
  private hlsInst:    Hls | null = null;
  private screenEnt:  Entity | null = null;
  private screenMats: ShaderMaterial[] = []; // kept to apply late mask load

  // Mask texture — starts as 1×1 white (fully opaque) until the PNG loads
  private maskTex: Texture = makeFallbackMask();

  init() {
    // Begin loading the mask PNG immediately so it's ready (or close) by first play
    new TextureLoader().load(
      MASK_URL,
      (tex) => {
        this.maskTex = tex;
        // If the screen is already live, patch existing materials in-place
        for (const mat of this.screenMats) {
          mat.uniforms.uMask.value = tex;
        }
      },
      undefined,
      (err) => console.warn("[Basketball] mask load failed — playing unmasked:", err),
    );

    // Wire UIKit panel elements once the document loads (same pattern as RailroadSystem)
    this.queries.panel.subscribe("qualify", (entity) => {
      if (this.bballUI) return;
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) return;
      this.bballUI = {
        screen:   doc.getElementById("basketball-screen") as UIKit.Text,
        statusEl: doc.getElementById("bball-status")      as UIKit.Text,
      };
      (doc.getElementById("bball-menu-btn") as UIKit.Text)
        ?.addEventListener("click", () => this.returnToMenu());
      this.buildScreenZones(entity, doc);
    });

    // Hover glow for "Menu" zone
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

    // Press → action dispatch
    this.queries.bballBtnPressed.subscribe("qualify", (entity) => {
      if (!this.active) return;
      const idx = entity.getValue(BasketballButtonZone, "actionType") as number;
      switch (idx) {
        case 0: this.returnToMenu(); break;
      }
    });

    // React to activeGame signal
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

  // ── Layout table for basketball screen button zones ────────────────────────
  // BBALL_PANEL_H = 32.32  →  halfH = 16.16
  //
  // yFromTop  item
  // ──────────────────────────────────────────────────────────────────
  // 25.52     bball-menu-btn center  (top-of-btn=19.72, mt=2, h=7.6)
  //
  // Zone: action=0, x=0 (full-width 66u), y = halfH - 25.52 = -9.36

  private buildScreenZones(panelEntity: Entity, doc: UIKitDocument) {
    const computedW = (doc as any).computedSize?.width ?? 72;
    const scale     = (doc.targetSize?.width ?? 0) > 0
      ? doc.targetSize.width / computedW
      : 0.76 / 72;

    const halfH  = BBALL_PANEL_H / 2; // 16.16
    const zoneD  = 0.10;
    const localZ = 0.06;

    const defs = [
      { action: 0, x: 0, y: halfH - 25.52, w: 66, h: 7.6, color: 0x888888 },
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
      panelEntity.object3D!.add(mesh); // pre-parent before createTransformEntity

      const zoneEntity = this.world.createTransformEntity(mesh, panelEntity)
        .addComponent(BasketballButtonZone, { actionType: action });
      this.bballBtnZoneEntities.push(zoneEntity);
    }
  }

  private startBasketball() {
    this.active = true;
    this.bballUI?.screen.setProperties({ display: "flex" });
    this.bballUI?.statusEl.setProperties({ text: "Loading stream\u2026" });

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

    if (this.hlsInst)  { this.hlsInst.destroy();                    this.hlsInst  = null; }
    if (this.videoEl)  { this.videoEl.pause(); this.videoEl.remove(); this.videoEl  = null; }
    if (this.screenEnt){ this.screenEnt.dispose();                   this.screenEnt = null; }
    this.screenMats = [];
  }

  private returnToMenu() {
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) activeGame.value = "menu";
  }

  // ── Stereo video screen ────────────────────────────────────────────────────
  // Video is top-bottom (TB) stereo:  top  = left eye,  bottom = right eye
  // Mask is side-by-side (SBS) stereo: left = left eye,  right  = right eye
  //
  // Each eye is a separate PlaneGeometry + ShaderMaterial on its own Three.js
  // layer (1=left, 2=right).  The shader handles all UV remapping via uniforms
  // and discards fragments where the mask red channel is near-zero.

  private createStereoScreen() {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;  // muted required for autoplay policy
    video.loop = true;
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

    // Shared VideoTexture — Three.js auto-sets needsUpdate each frame
    const videoTex = new VideoTexture(video);
    videoTex.colorSpace = SRGBColorSpace;

    const leftMat  = makeStereoMat(videoTex, this.maskTex, true);
    const rightMat = makeStereoMat(videoTex, this.maskTex, false);
    this.screenMats = [leftMat, rightMat];

    const geom = new PlaneGeometry(SCREEN_W, SCREEN_H);

    const leftMesh  = new Mesh(geom, leftMat);
    leftMesh.layers.set(1);  // left eye only

    const rightMesh = new Mesh(geom, rightMat);
    rightMesh.layers.set(2); // right eye only

    const group = new Group();
    group.add(leftMesh, rightMesh);
    group.position.set(0, SCREEN_Y, SCREEN_Z);

    this.screenEnt = this.world.createTransformEntity(group);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** 1×1 fully-white texture — used as mask fallback while the PNG loads. */
function makeFallbackMask(): DataTexture {
  const tex = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a ShaderMaterial for one eye of the stereo display.
 *   isLeft=true  → samples video top half (left eye)  + mask left half
 *   isLeft=false → samples video bottom half (right eye) + mask right half
 */
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
