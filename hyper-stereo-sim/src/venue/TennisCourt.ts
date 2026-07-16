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

    // Orient whole group so Z is vertical (standard Three.js plane defaults to XY flat, so we rotate it)
    // Actually, since we draw flat planes on Z = 0 and posts standing in Z, the whole group is already constructed with Z vertical!
    // No rotation needed because we explicitly positioned lines and net using Z coordinates.
    return group;
  }

  getCoordinateAnchors(): VenueCoordinateAnchor[] {
    return [
      { id: 'origin', name: 'Venue Origin (Center Court)', position: new THREE.Vector3(0, 0, 0) },
      { id: 'center-court', name: 'Center Court', position: new THREE.Vector3(0, 0, 0) },
      { id: 'near-baseline', name: 'Near Baseline Center', position: new THREE.Vector3(-11.89, 0, 0) },
      { id: 'far-baseline', name: 'Far Baseline Center', position: new THREE.Vector3(11.89, 0, 0) },
      { id: 'net-center', name: 'Net Center', position: new THREE.Vector3(0, 0, 0) }
    ];
  }
}
