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

// ── Raw WebGL shaders (GLSL ES 3.0) for Mode D XRWebGLBinding rendering ────
const VERT_RAW = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG_RAW = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform float uVidYMin;
uniform float uVidYMax;
uniform float uMskXMin;
uniform float uMskXMax;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 maskUv  = vec2(uMskXMin + vUv.x * (uMskXMax - uMskXMin), vUv.y);
  float alpha  = texture(uMask, maskUv).r;
  if (alpha < 0.01) discard;
  vec2 videoUv = vec2(vUv.x, uVidYMin + vUv.y * (uVidYMax - uVidYMin));
  fragColor    = vec4(texture(uVideo, videoUv).rgb, alpha);
}`;

// ── Types ─────────────────────────────────────────────────────────────────
type BballMode = 0 | 1 | 2 | 3; // 0=current, 1=A(closer), 2=B(aniso), 3=D(XR layer)

interface ModeDResources {
  program:  WebGLProgram;
  vao:      WebGLVertexArrayObject;
  uVideo:   WebGLUniformLocation;
  uMask:    WebGLUniformLocation;
  uVidYMin: WebGLUniformLocation;
  uVidYMax: WebGLUniformLocation;
  uMskXMin: WebGLUniformLocation;
  uMskXMax: WebGLUniformLocation;
  binding:  unknown; // XRWebGLBinding
  layer:    unknown; // XRQuadLayer
}

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

  // Mode D resources
  private modeD: ModeDResources | null = null;

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
          doc.getElementById("bball-mode-d")       as UIKit.Text | null,
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
      (doc.getElementById("bball-mode-d") as UIKit.Text)
        ?.addEventListener("click", () => this.setMode(3));
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
        case 3: this.setMode(3);      break;
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
    const scale = 0.76 / 72; // hardcoded — same as railroad.ts and drop-ttt.ts

    const halfH  = BBALL_PANEL_H / 2; // 23.16
    const zoneD  = 0.10;
    const localZ = 0.06;

    // Heights use 1.3× the CSS-computed value so the ray has a generous target
    const defs = [
      { action: 0, x: -17, y: halfH - 23.72, w: 32, h: 7.8, color: 0x2255aa }, // 6.0 × 1.3
      { action: 1, x:  17, y: halfH - 23.72, w: 32, h: 7.8, color: 0x225577 }, // 6.0 × 1.3
      { action: 2, x: -17, y: halfH - 30.72, w: 32, h: 7.8, color: 0x225577 }, // 6.0 × 1.3
      { action: 3, x:  17, y: halfH - 30.72, w: 32, h: 7.8, color: 0x552277 }, // 6.0 × 1.3
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

    this.teardownModeD();

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
      case 3: this.applyModeD();       break;
    }
  }

  private refreshModeBtnStyles() {
    this.bballUI?.modeBtns.forEach((btn, i) => {
      btn?.setProperties(i === this.screenMode ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE);
    });
  }

  private applyModeCurrent() {
    this.teardownModeD();
    if (this.screenGroup) {
      this.screenGroup.position.z = SCREEN_Z;
      this.screenGroup.visible    = true;
    }
    if (this.videoTex) this.videoTex.anisotropy = 1;
    this.bballUI?.statusEl.setProperties({ text: "Live" });
  }

  private applyModeA() {
    // Closer: halves the angular distance → effectively doubles PPD, free of cost
    this.teardownModeD();
    if (this.screenGroup) {
      this.screenGroup.position.z = SCREEN_Z_CLOSE;
      this.screenGroup.visible    = true;
    }
    if (this.videoTex) this.videoTex.anisotropy = 1;
    this.bballUI?.statusEl.setProperties({ text: "Live (Closer)" });
  }

  private applyModeB() {
    // Anisotropic filtering: improves texture quality for oblique viewing angles
    this.teardownModeD();
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

  private applyModeD() {
    // XRWebGLBinding compositor layer — renders at display-native resolution
    // bypassing the main XR framebuffer for highest fidelity
    const renderer  = (this.world as any).renderer as any;
    const xrSession = renderer?.xr?.getSession() as XRSession | null;

    if (!xrSession) {
      this.bballUI?.statusEl.setProperties({ text: "XR Layer: needs XR session" });
      return;
    }
    if (typeof (globalThis as any).XRWebGLBinding === "undefined") {
      this.bballUI?.statusEl.setProperties({ text: "XR Layer: not supported" });
      return;
    }

    const gl = renderer.getContext() as WebGL2RenderingContext;

    // Compile the raw WebGL pipeline once
    const prog = buildRawGLProgram(gl);
    if (!prog) {
      this.bballUI?.statusEl.setProperties({ text: "XR Layer: shader compile error" });
      return;
    }
    const vao = buildFullscreenVAO(gl, prog);

    const binding = new (globalThis as any).XRWebGLBinding(xrSession, gl);

    xrSession.requestReferenceSpace("local").then((space: XRReferenceSpace) => {
      const layer = binding.createQuadLayer({
        space,
        viewPixelWidth:  2048,
        viewPixelHeight: 1024,
        layout: "stereo-left-right",
        isStatic: false,
        transform: new XRRigidTransform(
          { x: 0, y: SCREEN_Y, z: SCREEN_Z, w: 1 },
          { x: 0, y: 0, z: 0, w: 1 },
        ),
        width:  SCREEN_W,
        height: SCREEN_H,
      });

      // Insert our layer before the WebGL layer so it composites on top
      const existingLayers: XRLayer[] = ((xrSession.renderState as any).layers as XRLayer[] | undefined) ?? [];
      xrSession.updateRenderState({ layers: [layer, ...existingLayers] });

      // Hide the Three.js fallback plane — the XR layer now handles rendering
      if (this.screenGroup) this.screenGroup.visible = false;

      this.modeD = {
        program: prog, vao,
        uVideo:   gl.getUniformLocation(prog, "uVideo")!,
        uMask:    gl.getUniformLocation(prog, "uMask")!,
        uVidYMin: gl.getUniformLocation(prog, "uVidYMin")!,
        uVidYMax: gl.getUniformLocation(prog, "uVidYMax")!,
        uMskXMin: gl.getUniformLocation(prog, "uMskXMin")!,
        uMskXMax: gl.getUniformLocation(prog, "uMskXMax")!,
        binding, layer,
      };

      this.bballUI?.statusEl.setProperties({ text: "Live (XR Layer)" });
    }).catch((err: unknown) => {
      console.warn("[Basketball] Mode D reference space error:", err);
      this.bballUI?.statusEl.setProperties({ text: "XR Layer: ref-space error" });
    });
  }

  private teardownModeD() {
    if (!this.modeD) return;
    const renderer = (this.world as any).renderer as any;
    const xrSession = renderer?.xr?.getSession() as XRSession | null;
    if (xrSession) {
      // Remove our layer from render state
      const layers: XRLayer[] = ((xrSession.renderState as any).layers as XRLayer[] | undefined) ?? [];
      const filtered = layers.filter((l) => l !== this.modeD!.layer);
      xrSession.updateRenderState({ layers: filtered });
    }
    const gl = renderer?.getContext() as WebGL2RenderingContext | undefined;
    if (gl) {
      gl.deleteProgram(this.modeD.program);
      gl.deleteVertexArray(this.modeD.vao);
    }
    this.modeD = null;
  }

  // ── update — Mode D per-frame rendering ───────────────────────────────────
  update(_delta: number, _time: number) {
    if (this.screenMode !== 3 || !this.modeD || !this.videoTex || !this.videoEl) return;
    if (this.videoEl.readyState < 2) return; // HAVE_CURRENT_DATA

    const renderer = (this.world as any).renderer as any;
    const frame    = renderer?.xr?.getFrame?.() as XRFrame | null;
    if (!frame) return;

    const gl = renderer.getContext() as WebGL2RenderingContext;

    // Upload the current video frame directly to the GPU texture
    const texProps   = (renderer as any).properties.get(this.videoTex) as any;
    const glVideoTex = texProps?.__webglTexture as WebGLTexture | undefined;
    const maskProps  = (renderer as any).properties.get(this.maskTex) as any;
    const glMaskTex  = maskProps?.__webglTexture as WebGLTexture | undefined;

    if (!glVideoTex || !glMaskTex) return; // textures not yet uploaded by Three.js

    // Upload latest video frame
    gl.bindTexture(gl.TEXTURE_2D, glVideoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoEl);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const { program, vao, uVideo, uMask, uVidYMin, uVidYMax, uMskXMin, uMskXMax, binding, layer } = this.modeD;

    const renderEye = (eye: "left" | "right", isLeft: boolean) => {
      let subImage: { framebuffer: WebGLFramebuffer | null; viewport: { x: number; y: number; width: number; height: number } };
      try {
        subImage = (binding as any).getSubImage(layer, frame, eye);
      } catch {
        return; // frame not valid for this eye yet
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, subImage.framebuffer);
      gl.viewport(subImage.viewport.x, subImage.viewport.y, subImage.viewport.width, subImage.viewport.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glVideoTex);
      gl.uniform1i(uVideo, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, glMaskTex);
      gl.uniform1i(uMask, 1);

      gl.uniform1f(uVidYMin, isLeft ? 0.5 : 0.0);
      gl.uniform1f(uVidYMax, isLeft ? 1.0 : 0.5);
      gl.uniform1f(uMskXMin, isLeft ? 0.0 : 0.5);
      gl.uniform1f(uMskXMax, isLeft ? 0.5 : 1.0);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    };

    renderEye("left",  true);
    renderEye("right", false);

    // Restore Three.js expected framebuffer state
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);
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

    const group = new Group();
    group.add(leftMesh, rightMesh);
    group.position.set(0, SCREEN_Y, SCREEN_Z);

    this.screenGroup = group;
    this.screenEnt   = this.world.createTransformEntity(group);
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

/** Compile the raw WebGL2 program used by Mode D. Returns null on failure. */
function buildRawGLProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[Basketball] Mode D shader error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER,   VERT_RAW);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_RAW);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[Basketball] Mode D link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/** Create a fullscreen triangle-strip VAO for Mode D rendering. */
function buildFullscreenVAO(gl: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  // Positions covering the full NDC clip space: (-1,-1) … (1,1)
  const positions = new Float32Array([-1, -1,  1, -1,  -1, 1,  1, 1]);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vao;
}
