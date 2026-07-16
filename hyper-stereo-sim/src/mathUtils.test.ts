import { sphericalToCartesian, cartesianToSpherical } from './mathUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error('Test failed: ' + message);
  }
}

function runTests() {
  console.log('Running mathUtils tests...');

  // Test 1: Spherical to Cartesian and back
  const refX = 10;
  const refY = -5;
  const azimuth = 45;
  const distance = 10;
  const elevation = 4;

  const cart = sphericalToCartesian(refX, refY, azimuth, distance, elevation);
  
  // 45 degrees: x offset = 10 * cos(45) = 7.071, y offset = 10 * sin(45) = 7.071
  // x = 17.071, y = 2.071, z = 4
  assert(Math.abs(cart.x - 17.0710678) < 1e-4, 'X coordinate matches');
  assert(Math.abs(cart.y - 2.0710678) < 1e-4, 'Y coordinate matches');
  assert(cart.z === 4, 'Z coordinate matches');

  // Convert back
  const spher = cartesianToSpherical(refX, refY, cart.x, cart.y, cart.z);
  assert(Math.abs(spher.azimuthDeg - azimuth) < 1e-4, 'Azimuth matches');
  assert(Math.abs(spher.distance - distance) < 1e-4, 'Distance matches');
  assert(spher.elevation === elevation, 'Elevation matches');

  // Test 2: Angle wrap around
  const cart2 = sphericalToCartesian(0, 0, 270, 5, 2);
  // 270 deg points along negative Y
  assert(Math.abs(cart2.x) < 1e-4, 'Wrap X matches');
  assert(Math.abs(cart2.y - (-5)) < 1e-4, 'Wrap Y matches');
  
  const spher2 = cartesianToSpherical(0, 0, cart2.x, cart2.y, cart2.z);
  assert(Math.abs(spher2.azimuthDeg - 270) < 1e-4, 'Wrap azimuth matches');

  console.log('All tests passed successfully!');
}

runTests();
