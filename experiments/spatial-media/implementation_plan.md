# Implementation Plan: Lumina Spatial UI v2 (Mock Environment)

This plan outlines the staged, parallel-orchestrated build of the 3D UI features for the Lumina Spatial Gallery. The goal is to evolve the "blank glass panel" into a functional, interactive spatial dashboard verifiable in the Desktop Mock (Antigravity) environment.

## 1. Agent Roles & Parallel Strategy

| Agent Role | Responsibility | Parallel Task |
| :--- | :--- | :--- |
| **Coordinator** | State sync, feature registry, and architectural guardrails. | Update `features.json` and `progress-log.md`. |
| **Graphics Engineer** | Geometry, Glassmorphic Materials, Typography, and Billboarding. | Implement `SpatialButton.js` and `SpatialText` textures. |
| **ML Specialist** | Interaction Mocking: Gaze simulation and gesture-to-3D mapping. | Implement `RaycastManager` for desktop-to-3D hover/click propagation. |
| **QA Agent** | Automated interaction testing and visual fidelity audits. | Browser subagent validation of interaction loops. |

## 2. Core Features (Spatial UI)

### Phase A: Foundation & Visuals (Graphics Engineer)
1. **Dynamic Billboarding**: Enable `lookAt` logic with configurable damping to keep the UI oriented toward the camera.
2. **3D Text Rendering**: Implementation of a `CanvasTexture` based labels system to avoid external font dependencies while maintaining resolution.
3. **Enhanced Glassmorphism**: Upgrade `SpatialUI` material with `ior`, `transmission`, and `thickness` mapping to achieve a "layered" visual depth.

### Phase B: Interaction Mock (ML Specialist)
4. **Desktop Hover Mock**: Simulation of "Gaze Focus" by tracking mouse position and highlighting 3D sub-elements.
5. **Spatial Input Pipeline**: Mapping standard pointer events to custom `onSelect` and `onHover` callbacks on 3D UI children.

### Phase C: Component Library (Graphics Engineer + ML Specialist)
6. **Spatial Button**: A generic 3D component with "press depth" animation and text labels.
7. **Immersion Slider**: A 3D slider to replace the 2D HTML overlay, allowing for testing of vertical/horizontal interaction limits.

### Phase D: Verification (QA Agent)
8. **Automated Interaction Loop**: A test suite that simulates a "pinch-click" on the mock buttons and verifies the state change in the renderer.

## 3. Success Metrics
- [ ] 3D UI panel maintains readability at >45-degree camera angles.
- [ ] All 2D HTML controls replaced by functional 3D spatial equivalents.
- [ ] Hover/Active states visible in Desktop Preview without XR hardware.
- [ ] Haptic simulation (screen-shake/sound) triggered on 3D button press.

## 4. Execution Workflow (Autonomous)
1. **Coordinator**: Initialize features in `features.json`.
2. **Graphics Engineer**: Refactor `SpatialUI.js` into a container class with a children array.
3. **ML Specialist**: Integrate the 3D interaction raycaster update into the main render loop.
4. **Graphics Engineer**: Create `SpatialButton.js` and inject into the scene.
5. **QA Agent**: Run browser-based verification of the interaction flow.
