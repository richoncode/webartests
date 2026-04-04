import * as THREE from 'three';

export class HandTrackingManager {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        
        this.hands = [
            this.renderer.xr.getHand(0),
            this.renderer.xr.getHand(1)
        ];

        this.handGrips = [
            this.renderer.xr.getController(0),
            this.renderer.xr.getController(1)
        ];

        this.hands.forEach(hand => this.scene.add(hand));
        
        this.lastPinchStates = [false, false];
        this.onPinchStart = null;
        this.onPinchEnd = null;
    }

    update() {
        this.hands.forEach((hand, index) => {
            const joints = hand.joints;
            
            // Joint 4: Thumb Tip, Joint 9: Index Tip
            if (joints['thumb-tip'] && joints['index-finger-tip']) {
                const thumb = joints['thumb-tip'].position;
                const indexTip = joints['index-finger-tip'].position;
                
                const distance = thumb.distanceTo(indexTip);
                const isPinching = distance < 0.02; // 2cm threshold
                
                if (isPinching && !this.lastPinchStates[index]) {
                    this.executePinchStart(index, thumb);
                } else if (!isPinching && this.lastPinchStates[index]) {
                    this.executePinchEnd(index);
                }
                
                this.lastPinchStates[index] = isPinching;
            }
        });
    }

    executePinchStart(index, position) {
        console.log(`Hand ${index} Pinch START at`, position);
        if (this.onPinchStart) this.onPinchStart(index, position);
        
        // Haptic Feedback (via Gamepad API if available on the hand controller)
        const session = this.renderer.xr.getSession();
        if (session && session.inputSources[index] && session.inputSources[index].gamepad) {
            const haptic = session.inputSources[index].gamepad.hapticActuators;
            if (haptic && haptic.length > 0) {
                haptic[0].pulse(0.6, 20); // 60% intensity, 20ms
            }
        }
    }

    executePinchEnd(index) {
        console.log(`Hand ${index} Pinch END`);
        if (this.onPinchEnd) this.onPinchEnd(index);
    }
}
