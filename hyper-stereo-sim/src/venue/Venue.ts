import * as THREE from 'three';
import { VenueDefinition, VenueCoordinateAnchor } from '../types';

export abstract class BaseVenue implements VenueDefinition {
  abstract id: string;
  abstract name: string;
  abstract dimensions: { width: number; length: number; height?: number };

  abstract createGeometry(): THREE.Object3D;
  abstract getCoordinateAnchors(): VenueCoordinateAnchor[];

  getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    const w = this.dimensions.width;
    const l = this.dimensions.length;
    const h = this.dimensions.height || 10;
    box.setFromCenterAndSize(
      new THREE.Vector3(0, 0, h / 2),
      new THREE.Vector3(l, w, h)
    );
    return box;
  }

  getDefaultOrigin(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }
}
