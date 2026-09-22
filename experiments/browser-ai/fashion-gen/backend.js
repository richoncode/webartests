/** TensorFlow.js backend picker, shared with the MNIST demo. */

export {
  activateBackend,
  backendChoiceLabel,
  describeTfBackend,
  getTf,
  loadTensorflow,
} from '../mnist/backend.js';

/** True when this browser can attempt the backend. CPU is always listed. */
export function backendAvailable(name, caps) {
  if (!caps) return name === 'cpu';
  if (name === 'webgpu') return !!(caps.webgpu && caps.webgpuAdapter);
  if (name === 'wasm') return !!caps.wasm;
  if (name === 'webgl') return !!caps.webgl;
  if (name === 'cpu') return true;
  return false;
}
