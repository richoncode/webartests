import { WebXRState } from "@babylonjs/core";

// Thin polling wrapper around Babylon's default XR experience helper, giving SpectatorRig a
// tiny, stable interface (inXR / camera / getThumbstickAxes) instead of reaching into
// Babylon's WebXR internals directly.
export class XrManager {
  constructor(xrHelper) {
    this.xrHelper = xrHelper;
    this.inXR = false;
    this.camera = null;

    if (!xrHelper?.baseExperience) return;
    xrHelper.baseExperience.onStateChangedObservable.add((state) => {
      this.inXR = state === WebXRState.IN_XR;
      this.camera = this.inXR ? xrHelper.baseExperience.camera : null;
    });
  }

  getThumbstickAxes() {
    if (!this.inXR || !this.xrHelper?.input) return null;
    const axes = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
    for (const controller of this.xrHelper.input.controllers) {
      const stick = controller.motionController?.getComponent("xr-standard-thumbstick");
      if (!stick) continue;
      const target = controller.inputSource.handedness === "left" ? axes.left : axes.right;
      target.x = stick.axes.x;
      target.y = stick.axes.y;
    }
    return axes;
  }
}
