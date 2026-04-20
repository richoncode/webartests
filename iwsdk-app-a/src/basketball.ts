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
  VideoTexture,
  PlaneGeometry,
  SRGBColorSpace,
} from "@iwsdk/core";
import type { Signal } from "@preact/signals-core";
import Hls, { type ErrorData } from "hls.js";

// ── Constants ──────────────────────────────────────────────────────────────
const STREAM_URL =
  "https://streams.quintar.ai/nba-2025/20250216/newreg/" +
  "Main_Final_8m_hardmasked_nvenc_tb_20Mbps/index.m3u8";

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

// ── ECS Component ─────────────────────────────────────────────────────────
export const BasketballButtonZone = createComponent("BasketballButtonZone", {
  actionType: { type: Types.Int8, default: 0 },
});

// ── System ────────────────────────────────────────────────────────────────
export class BasketballSystem extends createSystem({
  panel:             { required: [PanelDocument] },
  bballBtnHovered:   { required: [BasketballButtonZone, Hovered] },
  bballBtnPressed:   { required: [BasketballButtonZone, Pressed] },
}) {
  private active = false;

  private bballUI: {
    screen:   UIKit.Text;
    statusEl: UIKit.Text;
  } | null = null;

  private bballBtnZoneEntities:  Entity[] = [];
  private bballBtnZoneMaterials: MeshStandardMaterial[] = [];

  private videoEl:   HTMLVideoElement | null = null;
  private hlsInst:   Hls | null = null;
  private screenEnt: Entity | null = null;

  init() {
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

    if (this.hlsInst)  { this.hlsInst.destroy();               this.hlsInst  = null; }
    if (this.videoEl)  { this.videoEl.pause(); this.videoEl.remove(); this.videoEl = null; }
    if (this.screenEnt){ this.screenEnt.dispose();              this.screenEnt = null; }
  }

  private returnToMenu() {
    const activeGame = this.globals.activeGame as Signal<string> | undefined;
    if (activeGame) activeGame.value = "menu";
  }

  // ── Stereo video screen ────────────────────────────────────────────────────
  // The HLS stream is a top-bottom stereo frame:
  //   top  half → left  eye (V: 0.5–1.0 in UV space after flipY)
  //   bottom half → right eye (V: 0.0–0.5)
  //
  // We create two identical planes at the same world position, each with UV
  // coordinates mapped to their respective half of the video texture.
  // Three.js layers 1/2 route each plane to only the left/right eye camera.

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
      // Safari native HLS
      video.src = STREAM_URL;
      video.addEventListener("loadedmetadata", onReady, { once: true });
    } else {
      this.bballUI?.statusEl.setProperties({ text: "HLS not supported" });
      return;
    }

    // One VideoTexture shared by both eye planes — Three.js auto-updates it each frame
    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;

    // Left eye: show top half of video (UV V = 0.5 → 1.0)
    const leftMesh = new Mesh(
      buildHalfPlane(SCREEN_W, SCREEN_H, true),
      new MeshStandardMaterial({ map: texture, toneMapped: false }),
    );
    leftMesh.layers.set(1); // visible to left eye camera only

    // Right eye: show bottom half of video (UV V = 0.0 → 0.5)
    const rightMesh = new Mesh(
      buildHalfPlane(SCREEN_W, SCREEN_H, false),
      new MeshStandardMaterial({ map: texture, toneMapped: false }),
    );
    rightMesh.layers.set(2); // visible to right eye camera only

    const group = new Group();
    group.add(leftMesh, rightMesh);
    group.position.set(0, SCREEN_Y, SCREEN_Z);

    this.screenEnt = this.world.createTransformEntity(group);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a PlaneGeometry whose UV V-coordinates are remapped to the top or
 * bottom half of the source texture:
 *   topHalf=true  → V: 0.5–1.0  (left eye content in a top-bottom stereo frame)
 *   topHalf=false → V: 0.0–0.5  (right eye content)
 */
function buildHalfPlane(w: number, h: number, topHalf: boolean): PlaneGeometry {
  const geom   = new PlaneGeometry(w, h);
  const uvAttr = geom.attributes.uv as { count: number; getY(i: number): number; setY(i: number, v: number): void; needsUpdate: boolean };
  const vMin   = topHalf ? 0.5 : 0.0;
  const vMax   = topHalf ? 1.0 : 0.5;
  for (let i = 0; i < uvAttr.count; i++) {
    const vOld = uvAttr.getY(i);
    uvAttr.setY(i, vMin + vOld * (vMax - vMin));
  }
  uvAttr.needsUpdate = true;
  return geom;
}
