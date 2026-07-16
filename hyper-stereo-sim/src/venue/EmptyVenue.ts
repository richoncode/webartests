import * as THREE from 'three';
import { BaseVenue } from './Venue';
import { VenueCoordinateAnchor } from '../types';

export class EmptyVenue extends BaseVenue {
  id = 'empty-venue';
  name = 'Empty Rectangular Venue';
  dimensions: { width: number; length: number; height?: number };

  constructor(width = 20, length = 40, height = 10) {
    super();
    this.dimensions = { width, length, height };
  }

  createGeometry(): THREE.Object3D {
    const group = new THREE.Group();

    // Floor
    const floorGeo = new THREE.PlaneGeometry(this.dimensions.length, this.dimensions.width);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Floor Grid
    const maxDim = Math.max(this.dimensions.length, this.dimensions.width);
    const gridHelper = new THREE.GridHelper(maxDim, maxDim, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2; // Lie flat on Z=0
    gridHelper.position.z = 0.002;
    group.add(gridHelper);

    // Outer boundary wireframe box
    const h = this.dimensions.height || 10;
    const boxGeo = new THREE.BoxGeometry(
      this.dimensions.length,
      this.dimensions.width,
      h
    );
    const edges = new THREE.EdgesGeometry(boxGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x555555 }));
    line.position.z = h / 2;
    group.add(line);

    return group;
  }

  getCoordinateAnchors(): VenueCoordinateAnchor[] {
    return [
      { id: 'origin', name: 'Venue Origin (Center)', position: new THREE.Vector3(0, 0, 0) },
      { id: 'near-center', name: 'Near Side Center', position: new THREE.Vector3(-this.dimensions.length / 2, 0, 0) },
      { id: 'far-center', name: 'Far Side Center', position: new THREE.Vector3(this.dimensions.length / 2, 0, 0) }
    ];
  }
}
