import * as THREE from 'three';
import { BaseVenue } from './Venue';
import { VenueCoordinateAnchor } from '../types';

export class TennisCourt extends BaseVenue {
  id = 'tennis-court';
  name = 'Regulation Tennis Court';
  dimensions = {
    width: 18.29,  // Overall visual area width (60 ft)
    length: 36.58, // Overall visual area length (120 ft)
    height: 10.0   // Visual reference height
  };

  createGeometry(): THREE.Object3D {
    const group = new THREE.Group();

    // 1. Overall outer green court
    const outerGeo = new THREE.PlaneGeometry(this.dimensions.length, this.dimensions.width);
    const outerMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.9 });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.receiveShadow = true;
    group.add(outerMesh);

    // 2. Inner blue court (singles + doubles area)
    // Court length is 78 ft = 23.77m, width is 36 ft = 10.97m
    const innerGeo = new THREE.PlaneGeometry(23.77, 10.97);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x2a52be, roughness: 0.8 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.z = 0.001; // slightly higher
    innerMesh.receiveShadow = true;
    group.add(innerMesh);

    // 3. Regulation markings (white lines)
    const lineThickness = 0.1016; // 4 inches = 0.1016 meters
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    const addLine = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      const lineGeo = new THREE.PlaneGeometry(len, lineThickness);
      const lineMesh = new THREE.Mesh(lineGeo, lineMaterial);
      
      lineMesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0.002);
      lineMesh.rotation.z = angle;
      group.add(lineMesh);
    };

    // Baselines (at X = +/-11.89)
    addLine(-11.89, -5.485, -11.89, 5.485);
    addLine(11.89, -5.485, 11.89, 5.485);

    // Doubles Sidelines (at Y = +/-5.485)
    addLine(-11.89, -5.485, 11.89, -5.485);
    addLine(-11.89, 5.485, 11.89, 5.485);

    // Singles Sidelines (at Y = +/-4.115)
    addLine(-11.89, -4.115, 11.89, -4.115);
    addLine(-11.89, 4.115, 11.89, 4.115);

    // Service Lines (at X = +/-6.40, spans from singles sideline to singles sideline)
    addLine(-6.40, -4.115, -6.40, 4.115);
    addLine(6.40, -4.115, 6.40, 4.115);

    // Center Service Line (at Y = 0, spans between service lines)
    addLine(-6.40, 0, 6.40, 0);

    // Center Marks at Baselines (10cm length inward)
    addLine(-11.89, 0, -11.79, 0);
    addLine(11.89, 0, 11.79, 0);


    // 4. Net and Net Posts
    // Net posts are located 3 feet (0.914m) outside the doubles court: doubles width 10.97, so posts at Y = +/- (5.485 + 0.914) = +/-6.40
    const postHeight = 1.07;
    const postRadius = 0.05;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.2 });

    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(0, -6.40, postHeight / 2);
    postLeft.rotation.x = Math.PI / 2; // Cylinders stand along Y, rotate to Z
    postLeft.castShadow = true;
    group.add(postLeft);

    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(0, 6.40, postHeight / 2);
    postRight.rotation.x = Math.PI / 2;
    postRight.castShadow = true;
    group.add(postRight);

    // Net Mesh
    const netWidth = 12.80; // Distance between posts
    const netHeight = 0.95;  // Average height (1.07 at posts, 0.914 at center)
    const netPlaneGeo = new THREE.PlaneGeometry(netWidth, netHeight);
    
    // Transparent mesh pattern to represent tennis net
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    
    const netMesh = new THREE.Mesh(netPlaneGeo, netMat);
    netMesh.position.set(0, 0, netHeight / 2);
    netMesh.rotation.x = Math.PI / 2; // Lie vertical along Y-axis
    netMesh.rotation.y = Math.PI / 2; // Align along Y
    group.add(netMesh);

    // Net Top White Tape
    const tapeHeight = 0.05;
    const tapeGeo = new THREE.PlaneGeometry(netWidth, tapeHeight);
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
    tapeMesh.position.set(0, 0, netHeight - tapeHeight / 2);
    tapeMesh.rotation.x = Math.PI / 2;
    tapeMesh.rotation.y = Math.PI / 2;
    group.add(tapeMesh);

    const createLimb = (from: THREE.Vector3, to: THREE.Vector3, radius: number, color: number, role = 'player') => {
      const length = from.distanceTo(to);
      const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 10),
        new THREE.MeshBasicMaterial({ color })
      );
      limb.userData.anaglyphBwRole = role;
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      limb.position.copy(mid);
      limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      group.add(limb);
    };

    const addPlayer = (x: number, y: number, facing: 1 | -1) => {
      const skin = 0xf2c8a5;
      const kit = facing === 1 ? 0xffffff : 0xf0a040;
      const line = 0x111111;
      const footZ = 0.02;
      const hip = new THREE.Vector3(x, y, 0.92);
      const chest = new THREE.Vector3(x, y, 1.42);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), new THREE.MeshBasicMaterial({ color: skin }));
      head.userData.anaglyphBwRole = 'player';
      head.position.set(x, y, 1.68);
      group.add(head);

      createLimb(hip, chest, 0.045, kit);
      createLimb(new THREE.Vector3(x, y - 0.22, footZ), hip, 0.032, line, 'player-stroke');
      createLimb(new THREE.Vector3(x, y + 0.22, footZ), hip, 0.032, line, 'player-stroke');
      createLimb(chest, new THREE.Vector3(x + facing * 0.36, y - 0.24, 1.16), 0.026, skin);
      createLimb(chest, new THREE.Vector3(x + facing * 0.32, y + 0.26, 1.2), 0.026, skin);
      createLimb(new THREE.Vector3(x + facing * 0.32, y + 0.26, 1.2), new THREE.Vector3(x + facing * 0.56, y + 0.36, 1.12), 0.018, line, 'player-stroke');
    };

    addPlayer(-8.5, 0.65, 1);
    addPlayer(8.5, -0.65, -1);

    // Orient whole group so Z is vertical (standard Three.js plane defaults to XY flat, so we rotate it)
    // Actually, since we draw flat planes on Z = 0 and posts standing in Z, the whole group is already constructed with Z vertical!
    // No rotation needed because we explicitly positioned lines and net using Z coordinates.
    return group;
  }

  getCoordinateAnchors(): VenueCoordinateAnchor[] {
    const trussDistance = 56 / 3.28084;
    const highTrussHorizontalDistance = Math.sqrt(66 ** 2 - 29 ** 2) / 3.28084;
    const lowHeight = 15 / 3.28084;
    const highHeight = 29 / 3.28084;
    const ft = 1 / 3.28084;
    const actualLowTrussLeft = new THREE.Vector3(
      58.56730371114535 * ft,
      -0.9115353677714437 * ft,
      14.616400134243909 * ft
    );
    const actualLowTrussRight = new THREE.Vector3(
      58.28133493957031 * ft,
      3.5487666161943006 * ft,
      14.497700565129103 * ft
    );
    const actualLowTrussCenter = actualLowTrussLeft.clone().add(actualLowTrussRight).multiplyScalar(0.5);
    const pointFromCenter = (distance: number, azimuthDeg: number, height: number) => {
      const azimuthRad = (azimuthDeg * Math.PI) / 180;
      return new THREE.Vector3(
        distance * Math.cos(azimuthRad),
        distance * Math.sin(azimuthRad),
        height
      );
    };

    return [
      { id: 'origin', name: 'Venue Origin (Center Court)', position: new THREE.Vector3(0, 0, 0) },
      { id: 'center-court', name: 'Center Court', position: new THREE.Vector3(0, 0, 0) },
      { id: 'near-baseline', name: 'Near Baseline Center', position: new THREE.Vector3(-11.89, 0, 0) },
      { id: 'far-baseline', name: 'Far Baseline Center', position: new THREE.Vector3(11.89, 0, 0) },
      { id: 'net-center', name: 'Net Center', position: new THREE.Vector3(0, 0, 0) },
      { id: 'camera-low-truss', name: 'Low Truss', position: pointFromCenter(trussDistance, 0, lowHeight) },
      {
        id: 'camera-low-truss-actual',
        name: 'Low Truss Actual',
        position: actualLowTrussCenter,
        actualCameras: {
          label: 'Low Truss Actual',
          leftPosition: { x: actualLowTrussLeft.x, y: actualLowTrussLeft.y, z: actualLowTrussLeft.z },
          rightPosition: { x: actualLowTrussRight.x, y: actualLowTrussRight.y, z: actualLowTrussRight.z },
          viewDirection: {
            x: -0.8957036848509264,
            y: -0.038067748571483706,
            z: -0.44301891095434126
          },
          upDirection: {
            x: -0.44261934352932497,
            y: -0.018811491084971713,
            z: 0.8965122668077831
          }
        }
      },
      { id: 'camera-high-truss', name: 'High Truss', position: pointFromCenter(highTrussHorizontalDistance, 0, highHeight) },
      { id: 'camera-low-slash', name: 'Low Slash', position: pointFromCenter(trussDistance, 30, lowHeight) },
      { id: 'camera-high-slash', name: 'High Slash', position: pointFromCenter(trussDistance, 30, highHeight) },
      { id: 'target-near', name: 'Near Target', position: new THREE.Vector3(8.5, 0, 0) },
      { id: 'target-mid', name: 'Mid Target', position: new THREE.Vector3(0, 0, 0) },
      { id: 'target-far', name: 'Far Target', position: new THREE.Vector3(-8.5, 0, 0) }
    ];
  }
}
