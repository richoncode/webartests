# Hyper-Stereo VR Mode Specification

## Terminology

- **Rig / cameras**: The physical stereo camera rig being planned and placed in the venue.
- **Viewer**: The desktop 3D planning viewport used to inspect the space.
- **HMD / VR mode**: The immersive Quest/WebXR inspection mode.
- **Stereo screen**: The room-space panel that displays the rendered left/right camera images in the HMD.
- **Floating panels**: The two control panels placed in room space to the left and right of the stereo screen.

## VR Mode Goal

VR mode is for putting on an HMD, standing in passthrough, and evaluating camera placement options as stereo image panels in front of the user. It is not a miniature 3D scene viewer.

## Required Behavior

1. **Enter true immersive passthrough WebXR**
   - Request a real WebXR immersive session, preferably `immersive-ar` for passthrough on Quest.
   - Do not treat the desktop HMD layout as a successful VR session.
   - The app should only switch to the HMD/VR state after WebXR confirms the immersive session has started.

2. **Room-lock the stereo screen**
   - Place the stereo screen in the room about **4 ft in front of the user** at session start.
   - The stereo screen must remain fixed in room space after placement.
   - It must not be head-locked.
   - It should use the user/session pose only for initial placement, not for continuous head-following.
   - Initial placement should ignore headset roll so the screen and panels stay level. Looking with the head can set heading and pitch, but side-to-side head tilt must not roll the UI.

3. **Render stereo camera images onto the screen**
   - The left camera render must be visible to the left eye.
   - The right camera render must be visible to the right eye.
   - The screen should be aligned to the same horizontal tile/axis as the selected rig camera angle.
   - The stereo panel should update when rig settings, presets, stereo quality, or camera settings change.

4. **Do not render the planning scene in VR space**
   - The court, rig, frustums, planning aids, and scene geometry should not appear as free-floating 3D objects in the immersive session.
   - The planning scene is used offscreen only to produce the left/right camera images for the stereo screen.

5. **Room-space floating control panels**
   - Place the left floating panel to the left of the stereo screen.
   - Place the right floating panel to the right of the stereo screen.
   - These panels must be room-locked with the stereo screen, not head-locked.
   - Side panels should rotate inward toward the user around their inside vertical edges, like hinged wings beside the stereo screen.
   - Pointer/controller interactions must work in XR.

6. **XR pointer interaction guidelines**
   - Every interactive control must have a visible hover/focus state before activation.
   - Hover feedback should be strong enough to confirm pointer contact in the headset before the user clicks/selects.
   - Sliders should support press-and-drag after initial contact.
   - Buttons should use large hit regions with clear active and hover states.
   - Controls should not require precise pixel-perfect targeting.

## Floating Panel Contents

Only the controls intentionally placed in the two floating panels should be included in this VR-mode UI.

### Left Panel

The left panel contains selected rig/camera planning controls:

- Camera FoV
- Rig direct distance
- Rig azimuth angle
- Rig elevation
- Camera baseline
- Baseline preset buttons
- Vergence offset

### Right Panel

The right panel contains:

- Stereo Quality toggle
- Value Preset loader
- Preset creation control for saving the current immersive setup
- Disparity slider at the bottom of the panel

When loading a value preset in VR mode:

- Apply the preset rig/settings values needed for inspection.
- Preserve the current view mode.
- Preserve the current Stereo Quality toggle state.
- Do not force the user out of the current HMD stereo viewing mode.

## UI Architecture Requirement

The control definitions for the two floating panels must be maintained once.

Use a shared, headless control schema for the floating-panel controls, then render that schema through separate renderers:

- **DOM renderer**: Used for desktop/debug HMD layout or browser overlay fallback.
- **WebXR room-space renderer**: Used inside the immersive session for actual Quest interaction.

Do not maintain two separate hand-written versions of the same floating panel controls.

## Current Implementation Note

The current code has a shared schema and a DOM renderer for the HMD floating panels. The WebXR room-space renderer for those same schema controls still needs to be implemented. Until that exists, the app may enter immersive mode without showing the real panels if DOM overlay is unavailable or unsupported.

## Acceptance Criteria

- Pressing VR Mode on Quest enters immersive passthrough WebXR.
- The stereo screen appears about 4 ft in front of the user and stays fixed in the room.
- Moving the head does not cause the stereo screen or panels to move with the head.
- Only the stereo screen and floating panels appear in the immersive session.
- The planning 3D scene is not visible as independent VR geometry.
- The left and right panels appear beside the stereo screen.
- XR pointer/controller input can operate the floating panel controls.
- XR pointer/controller hover visibly highlights controls before select.
- Head roll does not tilt the stereo screen or floating panels side-to-side.
- The left and right panels are generated from the same shared control schema as any DOM/debug representation.
