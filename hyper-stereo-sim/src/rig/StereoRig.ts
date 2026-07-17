import * as THREE from 'three';
import { CameraRigConfiguration } from '../types';
import { calculateVergenceQuaternion } from '../mathUtils';

export class StereoRig {
  group: THREE.Group;
  
  // Left and Right cameras
  leftCamera: THREE.PerspectiveCamera;
  rightCamera: THREE.PerspectiveCamera;

  // Visualization helper meshes
  private centerMesh!: THREE.Mesh;
  private leftCamMesh!: THREE.Mesh;
  private rightCamMesh!: THREE.Mesh;
  private leftLookAtMarker!: THREE.Mesh;
  private rightLookAtMarker!: THREE.Mesh;
  private lookAtDotGeometry!: THREE.SphereGeometry;
  private lookAtToeInGeometry!: THREE.CircleGeometry;
  private baselineLine!: THREE.Line;
  private leftOpticalAxis!: THREE.Line;
  private rightOpticalAxis!: THREE.Line;
  private zeroParallaxPlane!: THREE.Mesh;
  private frustumLines!: THREE.LineSegments;

  constructor() {
    this.group = new THREE.Group();

    // Initialize Perspective cameras
    // We set aspect ratio to 16/9 default
    this.leftCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    this.rightCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    
    // Crucial: Set camera up vector to Z so they rotate correctly around positive Z
    this.leftCamera.up.set(0, 0, 1);
    this.rightCamera.up.set(0, 0, 1);

    this.createHelperGeometry();
  }

  private createHelperGeometry() {
    // 1. Rig Center indicator (yellow sphere)
    const centerGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    this.centerMesh = new THREE.Mesh(centerGeo, centerMat);
    this.group.add(this.centerMesh);

    // 2. Camera bodies (boxes)
    const camGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const leftMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan
    const rightMat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta
    
    this.leftCamMesh = new THREE.Mesh(camGeo, leftMat);
    this.rightCamMesh = new THREE.Mesh(camGeo, rightMat);
    this.group.add(this.leftCamMesh);
    this.group.add(this.rightCamMesh);

    this.lookAtDotGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    this.lookAtToeInGeometry = new THREE.CircleGeometry(0.16, 3);
    this.leftLookAtMarker = new THREE.Mesh(this.lookAtDotGeometry, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    this.rightLookAtMarker = new THREE.Mesh(this.lookAtDotGeometry, new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    this.leftLookAtMarker.renderOrder = 6;
    this.rightLookAtMarker.renderOrder = 6;
    this.group.add(this.leftLookAtMarker);
    this.group.add(this.rightLookAtMarker);

    // 3. Baseline Connection Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    this.baselineLine = new THREE.Line(lineGeo, lineMat);
    this.group.add(this.baselineLine);

    // 4. Optical Axes (forward rays)
    const axisMatLeft = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 0.5,
      gapSize: 0.3
    });
    const axisMatRight = new THREE.LineDashedMaterial({
      color: 0xff00ff,
      dashSize: 0.5,
      gapSize: 0.3
    });
    
    this.leftOpticalAxis = new THREE.Line(new THREE.BufferGeometry(), axisMatLeft);
    this.rightOpticalAxis = new THREE.Line(new THREE.BufferGeometry(), axisMatRight);
    this.group.add(this.leftOpticalAxis);
    this.group.add(this.rightOpticalAxis);

    // 5. Zero-Parallax Target Plane (transparent rectangular sheet)
    const zpPlaneGeo = new THREE.PlaneGeometry(8, 4);
    const zpPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x5b9bd5,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.zeroParallaxPlane = new THREE.Mesh(zpPlaneGeo, zpPlaneMat);
    this.group.add(this.zeroParallaxPlane);

    // 6. Frustum outline geometries (empty initialized buffer)
    this.frustumLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4 })
    );
    this.group.add(this.frustumLines);
  }

  /**
   * Update left/right cameras and visualizer geometries according to the configuration state.
   */
  update(config: CameraRigConfiguration, options: { showFrustums: boolean, showZPPlane: boolean, zpOpacity: number }) {
    const center = new THREE.Vector3(config.x, config.y, config.z);
    const actualCameras = config.actualCameras;

    // Determine target point for rig look-at / convergence.
    const targetPos = new THREE.Vector3();
    if (config.lookAtTargetEnabled) {
      targetPos.set(config.lookAtTarget.x, config.lookAtTarget.y, config.lookAtTarget.z);
    } else {
      targetPos.set(config.convergenceTarget.x, config.convergenceTarget.y, config.convergenceTarget.z);
    }
    
    // Euler angles for Rig orientation (converted to Radians)
    const yawRad = (config.yaw * Math.PI) / 180;
    const pitchRad = (config.pitch * Math.PI) / 180;
    const rollRad = (config.roll * Math.PI) / 180;
    
    // Order YXZ represents yaw (Z), pitch (X), roll (Y) in Z-up coordinate space
    const rigRotation = new THREE.Euler(pitchRad, rollRad, yawRad, 'YXZ');
    const rigQuaternion = new THREE.Quaternion();
    if (actualCameras) {
      const viewDirection = new THREE.Vector3(
        actualCameras.viewDirection.x,
        actualCameras.viewDirection.y,
        actualCameras.viewDirection.z
      ).normalize();
      const upDirection = new THREE.Vector3(
        actualCameras.upDirection.x,
        actualCameras.upDirection.y,
        actualCameras.upDirection.z
      ).normalize();
      const lookMatrix = new THREE.Matrix4();
      lookMatrix.lookAt(center, center.clone().add(viewDirection), upDirection);
      rigQuaternion.setFromRotationMatrix(lookMatrix);
    } else if (config.lookAtTargetEnabled) {
      const lookMatrix = new THREE.Matrix4();
      lookMatrix.lookAt(center, targetPos, new THREE.Vector3(0, 0, 1));
      rigQuaternion.setFromRotationMatrix(lookMatrix);
    } else {
      rigQuaternion.setFromEuler(rigRotation);
    }

    // Rig look direction (negative Z is forward in standard Three.js)
    const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(rigQuaternion);

    // Baseline Direction (rotated with yaw, pitch, roll of the rig)
    const baselineDir = new THREE.Vector3(1, 0, 0).applyQuaternion(rigQuaternion);

    if (actualCameras) {
      const viewDirection = new THREE.Vector3(
        actualCameras.viewDirection.x,
        actualCameras.viewDirection.y,
        actualCameras.viewDirection.z
      ).normalize();
      const upDirection = new THREE.Vector3(
        actualCameras.upDirection.x,
        actualCameras.upDirection.y,
        actualCameras.upDirection.z
      ).normalize();
      this.leftCamera.position.set(
        actualCameras.leftPosition.x,
        actualCameras.leftPosition.y,
        actualCameras.leftPosition.z
      );
      this.rightCamera.position.set(
        actualCameras.rightPosition.x,
        actualCameras.rightPosition.y,
        actualCameras.rightPosition.z
      );

      const leftLookMatrix = new THREE.Matrix4();
      leftLookMatrix.lookAt(this.leftCamera.position, this.leftCamera.position.clone().add(viewDirection), upDirection);
      this.leftCamera.quaternion.setFromRotationMatrix(leftLookMatrix);

      const rightLookMatrix = new THREE.Matrix4();
      rightLookMatrix.lookAt(this.rightCamera.position, this.rightCamera.position.clone().add(viewDirection), upDirection);
      this.rightCamera.quaternion.setFromRotationMatrix(rightLookMatrix);
    } else {
      // Left and Right camera placements
      const halfB = config.baselineMeters / 2;
      this.leftCamera.position.copy(center).addScaledVector(baselineDir, -halfB);
      this.rightCamera.position.copy(center).addScaledVector(baselineDir, halfB);
    }

    // Update projections
    this.leftCamera.fov = config.fov;
    this.leftCamera.aspect = config.aspect;
    this.leftCamera.near = config.near;
    this.leftCamera.far = config.far;
    this.leftCamera.updateProjectionMatrix();

    this.rightCamera.fov = config.fov;
    this.rightCamera.aspect = config.aspect;
    this.rightCamera.near = config.near;
    this.rightCamera.far = config.far;
    this.rightCamera.updateProjectionMatrix();

    if (actualCameras) {
      // Measured actual cameras already carry their own world-space orientation.
    } else if (config.parallel) {
      // Symmetrical parallel cameras share the exact rig orientation
      this.leftCamera.quaternion.copy(rigQuaternion);
      this.rightCamera.quaternion.copy(rigQuaternion);
    } else {
      // Symmetrical vergence: each looks at the target point independently
      this.leftCamera.quaternion.copy(calculateVergenceQuaternion(this.leftCamera.position, targetPos, rigQuaternion));
      this.rightCamera.quaternion.copy(calculateVergenceQuaternion(this.rightCamera.position, targetPos, rigQuaternion));
    }

    // ── Update Helper Meshes Positions ──
    this.centerMesh.position.set(0, 0, 0);
    this.leftCamMesh.position.copy(this.leftCamera.position).sub(center);
    this.leftCamMesh.quaternion.copy(this.leftCamera.quaternion);
    this.rightCamMesh.position.copy(this.rightCamera.position).sub(center);
    this.rightCamMesh.quaternion.copy(this.rightCamera.quaternion);

    this.leftCamera.updateMatrixWorld(true);
    this.rightCamera.updateMatrixWorld(true);

    // Baseline track line
    const baselinePts = [
      this.leftCamera.position.clone().sub(center),
      this.rightCamera.position.clone().sub(center)
    ];
    this.baselineLine.geometry.setFromPoints(baselinePts);

    // Optical Axis projecting forward from each camera lens
    const axisLen = Math.max(10, center.distanceTo(targetPos) * 1.5);
    
    const leftForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.leftCamera.quaternion);
    const leftEnd = this.leftCamera.position.clone().addScaledVector(leftForward, axisLen);
    this.leftOpticalAxis.geometry.setFromPoints([
      this.leftCamera.position.clone().sub(center),
      leftEnd.sub(center)
    ]);
    this.leftOpticalAxis.computeLineDistances(); // Required for dashed line styling

    const rightForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rightCamera.quaternion);
    const rightEnd = this.rightCamera.position.clone().addScaledVector(rightForward, axisLen);
    this.rightOpticalAxis.geometry.setFromPoints([
      this.rightCamera.position.clone().sub(center),
      rightEnd.sub(center)
    ]);
    this.rightOpticalAxis.computeLineDistances();
    this.updateCameraLookAtMarkers(center, targetPos);

    // Zero-Parallax Target Plane
    const distanceToTarget = center.distanceTo(targetPos);
    this.zeroParallaxPlane.position.copy(forwardDirection).multiplyScalar(distanceToTarget);
    this.zeroParallaxPlane.quaternion.copy(rigQuaternion);
    this.zeroParallaxPlane.visible = options.showZPPlane;
    (this.zeroParallaxPlane.material as THREE.MeshBasicMaterial).opacity = options.zpOpacity;

    // Rescale visual zero-parallax plane to represent a realistic field of view scale
    const vPlaneHeight = 2 * distanceToTarget * Math.tan((config.fov * Math.PI) / 360);
    const vPlaneWidth = vPlaneHeight * config.aspect;
    this.zeroParallaxPlane.scale.set(vPlaneWidth / 8, vPlaneHeight / 4, 1);

    // Camera Frustums Outline
    this.frustumLines.visible = options.showFrustums;
    if (options.showFrustums) {
      this.updateFrustumGeometry(config, center);
    }
  }

  private updateCameraLookAtMarkers(rigCenter: THREE.Vector3, fallbackTarget: THREE.Vector3) {
    const leftForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.leftCamera.quaternion).normalize();
    const rightForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rightCamera.quaternion).normalize();
    const isToeIn = leftForward.angleTo(rightForward) > THREE.MathUtils.degToRad(0.05);
    this.leftLookAtMarker.geometry = isToeIn ? this.lookAtToeInGeometry : this.lookAtDotGeometry;
    this.rightLookAtMarker.geometry = isToeIn ? this.lookAtToeInGeometry : this.lookAtDotGeometry;

    const updateMarker = (camera: THREE.PerspectiveCamera, marker: THREE.Mesh) => {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      let point: THREE.Vector3;
      if (Math.abs(forward.z) > 0.0001) {
        const t = -camera.position.z / forward.z;
        point = t > 0
          ? camera.position.clone().addScaledVector(forward, t)
          : fallbackTarget.clone();
      } else {
        point = fallbackTarget.clone();
      }

      marker.visible = true;
      marker.position.copy(point.sub(rigCenter));
      marker.position.z += 0.04;
      if (isToeIn) {
        marker.rotation.set(0, 0, Math.atan2(forward.y, forward.x) - Math.PI / 2);
      } else {
        marker.rotation.set(0, 0, 0);
      }
    };

    updateMarker(this.leftCamera, this.leftLookAtMarker);
    updateMarker(this.rightCamera, this.rightLookAtMarker);
  }

  private updateFrustumGeometry(config: CameraRigConfiguration, rigCenter: THREE.Vector3) {
    const fovRad = (config.fov * Math.PI) / 180;
    const halfHeightFar = config.far * Math.tan(fovRad / 2);
    const halfWidthFar = halfHeightFar * config.aspect;

    const halfHeightNear = config.near * Math.tan(fovRad / 2);
    const halfWidthNear = halfHeightNear * config.aspect;

    // Frustum corner points in camera local space (looking down negative Z)
    const nearCorners = [
      new THREE.Vector3(-halfWidthNear, -halfHeightNear, -config.near),
      new THREE.Vector3(halfWidthNear, -halfHeightNear, -config.near),
      new THREE.Vector3(halfWidthNear, halfHeightNear, -config.near),
      new THREE.Vector3(-halfWidthNear, halfHeightNear, -config.near)
    ];

    const farCorners = [
      new THREE.Vector3(-halfWidthFar, -halfHeightFar, -config.far),
      new THREE.Vector3(halfWidthFar, -halfHeightFar, -config.far),
      new THREE.Vector3(halfWidthFar, halfHeightFar, -config.far),
      new THREE.Vector3(-halfWidthFar, halfHeightFar, -config.far)
    ];

    // Transform points to world space and add to line vertices
    const points: THREE.Vector3[] = [];
    const pushBox = (cornersNear: THREE.Vector3[], cornersFar: THREE.Vector3[], cam: THREE.PerspectiveCamera) => {
      const n = cornersNear.map(p => p.clone().applyMatrix4(cam.matrixWorld).sub(rigCenter));
      const f = cornersFar.map(p => p.clone().applyMatrix4(cam.matrixWorld).sub(rigCenter));
      
      // Near loop
      points.push(n[0], n[1], n[1], n[2], n[2], n[3], n[3], n[0]);
      // Far loop
      points.push(f[0], f[1], f[1], f[2], f[2], f[3], f[3], f[0]);
      // Connectors
      points.push(n[0], f[0], n[1], f[1], n[2], f[2], n[3], f[3]);
    };

    pushBox(nearCorners, farCorners, this.leftCamera);
    pushBox(nearCorners, farCorners, this.rightCamera);

    this.frustumLines.geometry.dispose();
    this.frustumLines.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}
