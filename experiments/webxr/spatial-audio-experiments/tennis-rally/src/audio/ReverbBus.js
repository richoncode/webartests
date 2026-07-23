// A from-scratch Web Audio reverb send, built with plain nodes (no assumption that Babylon
// ships a reverb-zone API). Any native AudioNode can be fanned into this bus via connectSource();
// dry and wet paths are both explicit and independently gained, then summed into one output gain.
//
//   source ---> dryGain ------------------------------> outputGain -> destination
//          \                                          /
//           -> wetGain -> [highpass] -> [lowpass] -> convolver -/
export class ReverbBus {
  constructor(audioContext, destinationNode) {
    this.audioContext = audioContext;
    this.dryGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.highpass = audioContext.createBiquadFilter();
    this.highpass.type = "highpass";
    this.lowpass = audioContext.createBiquadFilter();
    this.lowpass.type = "lowpass";
    this.convolver = audioContext.createConvolver();
    this.outputGain = audioContext.createGain();

    this.wetGain.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.convolver);
    this.convolver.connect(this.outputGain);
    this.dryGain.connect(this.outputGain);
    this.outputGain.connect(destinationNode);

    this._irCache = new Map();
    this._enabled = true;
  }

  // Fans a source's native output into both the dry and wet paths. Call once per sound.
  connectSource(sourceNode) {
    sourceNode.connect(this.dryGain);
    sourceNode.connect(this.wetGain);
  }

  async applySettings(reverbSettings) {
    this._enabled = reverbSettings.enabled;
    this.dryGain.gain.value = reverbSettings.dryLevel; // dry path always audible; "enabled" only toggles the wet send
    this.wetGain.gain.value = this._enabled ? reverbSettings.wetLevel : 0;
    this.outputGain.gain.value = reverbSettings.outputGain;

    this.highpass.frequency.value = reverbSettings.highpassHz > 0 ? reverbSettings.highpassHz : 20;
    this.lowpass.frequency.value = reverbSettings.lowpassHz > 0 ? reverbSettings.lowpassHz : 20000;

    if (reverbSettings.impulseResponse !== this._currentIrUrl) {
      this._currentIrUrl = reverbSettings.impulseResponse;
      const buffer = await this._loadImpulseResponse(reverbSettings.impulseResponse);
      if (buffer) this.convolver.buffer = buffer;
    }
  }

  async _loadImpulseResponse(url) {
    if (this._irCache.has(url)) return this._irCache.get(url);
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this._irCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`[ReverbBus] Could not load impulse response "${url}":`, error);
      return null;
    }
  }
}
