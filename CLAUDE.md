# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static multi-demo site with no build system, package manager, or test framework. All demos are self-contained single-file HTML pages with inline CSS and JavaScript. Serve locally to develop.

## Local Development

Any static file server works. Examples:

```sh
python3 -m http.server 8080
# or
npx serve .
```

The AR demo (`ar-cube-placer/`) requires HTTPS for camera access — use a tunneling tool like `npx localtunnel` or Cloudflare Tunnel when testing on a real device, since `localhost` is exempt.

## Architecture

```
index.html              # Landing page — card grid linking to each demo
ar-cube-placer/
  index.html            # WebAR demo: A-Frame 1.4.2 + AR.js 2.2.2, Hiro marker tracking
webgl-shader/
  index.html            # Raw WebGL demo: GLSL fragment shader, raymarched SDF blob
```

All external dependencies are loaded from CDNs (no local `node_modules`). Each demo page has a `← Back` link to `../`.

### AR Cube Placer (`ar-cube-placer/`)

Uses **A-Frame** declarative HTML components (`<a-scene>`, `<a-camera>`, `<a-marker>`, `<a-box>`) with the **AR.js** library for marker-based AR. Two placement modes:

- **Marker mode** — when the Hiro marker is visible, cubes are placed at the marker's world position (with random X/Z offsets to avoid stacking).
- **Fallback mode** — when no marker is visible, `getCameraForwardPosition()` projects a point along the camera's forward vector using `THREE.Vector3` (Three.js is bundled with A-Frame).

### WebGL Shader (`webgl-shader/`)

Pure WebGL 1 — no library. Pattern: compile vert/frag shaders → link program → bind a fullscreen quad (two triangles as `TRIANGLE_STRIP`) → `requestAnimationFrame` render loop passing `u_res`, `u_time`, `u_mouse` uniforms.

The fragment shader implements:
- **Raymarching** against a signed distance function (SDF) — an animated sphere with layered sinusoidal displacement for an organic blob shape.
- **Phong-style lighting** with two lights, soft shadows (marched), stepped ambient occlusion, Fresnel rim, and palette-based colour cycling.
- A syntax-highlighted in-page shader source viewer (the `highlight()` function does regex-based GLSL colouring).

Mouse/touch position feeds `u_mouse`; canvas is sized to `window.innerWidth/Height * devicePixelRatio` on resize.
