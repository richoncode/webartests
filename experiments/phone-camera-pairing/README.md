# Phone ↔ camera pairing

A static experiment after Richard Bailey’s [US 9,162,144 B2](https://patents.google.com/patent/US9162144B2), “Portable device pairing with a tracking system.” No build step. GitHub Pages can serve this folder as-is.

The patent pairs a phone with the person holding it. The phone emits an acceleration gesture. A camera tracks the hand and turns that path into acceleration. Both signals are rotated into one vertical X,Y plane so the toward/away axis (Z) is minimized, then compared with dynamic time warping. A match is announced on both sides.

## Try the wrist test

This is the first thing to learn: when a phone covers the fingers, does the camera still have a point to follow?

1. Open `camera.html` on a laptop. Use HTTPS or `localhost` (a phone later needs HTTPS for motion sensors). Allow the camera.
2. Stand so your torso and the hand holding a phone are in frame. Leave the toggle on **Pose / wrist**.
3. Grip the phone normally, fingers wrapped around it. Read the status on the picture:
   - **TRACKING** and a high “frames with a point” percentage: the wrist is still there.
   - **LOW**: the point is weak.
   - **LOST**: that tracker has dropped the hand. The note under the status says what it can still see.
4. Switch to **Hands**, then **Both**. Pose follows the arm. Hands looks for a finger shape, which a phone often hides. The split percentages are the comparison.
5. Scribble the phone across the frame. The trail and the acceleration plot should move with the wrist. Pushing the phone straight at the lens is the Z axis this test drops, and the picture will barely see it.

`Full pose` swaps in the heavier MediaPipe model if Lite is missing the arm.

## Pair the two devices

1. On the camera page, scan the code (or open `phone.html` on the same origin) and tap **Enable sensors**. iOS asks for motion access from that button.
2. **Start live link**, then scan the offer or paste the token on the phone. Send the phone’s answer back (scan it with the laptop, or paste it). Samples move on a WebRTC data channel. A STUN lookup can add a public address; on a normal shared Wi-Fi the direct host address is enough.
3. Scribble for a second or two. Both pages flash **PAIRED** when DTW and the magnitude correlation clear the gate in `js/dtw.js`.
4. If the link never opens (guest-network isolation, a VPN, or a dense QR), skip it. On the phone, **Copy buffer**. On the laptop, **Match buffer**. Each page keeps about 30 seconds, and the match uses the strongest 1.6s of each recording.

**Score a known gesture** on the camera page runs the matcher on a built-in pair and a decoy, with no phone and no camera.

BroadcastChannel is not used. It cannot leave the browser, so it cannot reach the phone.

## Layout

| File | Role |
| --- | --- |
| `camera.html` | Webcam, MediaPipe Pose and Hands, wrist trail, derived acceleration, pairing |
| `phone.html` | DeviceMotion plots, rolling sample buffer, export, live-link answer |
| `js/plane.js` | Gravity split, plane fit that minimizes Z, position → acceleration |
| `js/dtw.js` | Resample, energy normalize, rotation search, DTW, the match gate |
| `js/signal.js` | WebRTC data channel. Offer and answer are compressed SDP, passed by QR or paste |
| `js/selftest.mjs` | Node check of the math. `node experiments/phone-camera-pairing/js/selftest.mjs` |

MediaPipe Tasks Vision 0.10.17 and the float16 models load from CDN. The pose and hand tasks run in the browser; nothing is bundled.

## Later

- A small signaling relay would replace the offer/answer paste when two networks cannot punch a direct hole. Keep it off BroadcastChannel.
- Gyro is captured and plotted. The match does not use it yet.
- The patent also allows comparing all three axes. This demo drops Z on purpose, because a single webcam barely measures toward/away motion.
