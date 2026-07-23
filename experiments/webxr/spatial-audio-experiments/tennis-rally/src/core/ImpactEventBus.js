// Minimal typed pub/sub for ball-impact events. Physics/animation code only ever calls
// emit() here; nothing downstream (audio, visuals) talks back into the simulation through
// this bus, keeping the event flow one-directional.
export class ImpactEventBus {
  constructor() {
    this._listeners = new Map(); // type -> Set<fn>
    this._wildcard = new Set();
  }

  on(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(handler);
    return () => this.off(type, handler);
  }

  onAny(handler) {
    this._wildcard.add(handler);
    return () => this._wildcard.delete(handler);
  }

  off(type, handler) {
    this._listeners.get(type)?.delete(handler);
  }

  emit(event) {
    this._listeners.get(event.type)?.forEach((handler) => handler(event));
    this._wildcard.forEach((handler) => handler(event));
  }
}
