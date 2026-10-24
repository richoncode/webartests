/* Engine saw and thruster hiss, same shape as explainers/roadster-sim. */
(function (global) {
  'use strict';

  var AC = null;
  var nodes = null;
  var muted = false;

  function ensure() {
    var Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) return null;
    if (!AC) {
      AC = new Ctx();
      var o = AC.createOscillator();
      o.type = 'sawtooth';
      var g1 = AC.createGain();
      g1.gain.value = 0;
      o.connect(g1).connect(AC.destination);
      o.start();
      var n = AC.createBufferSource();
      var buf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var dd = buf.getChannelData(0);
      var i;
      for (i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      n.buffer = buf;
      n.loop = true;
      var f = AC.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2000;
      var g2 = AC.createGain();
      g2.gain.value = 0;
      n.connect(f).connect(g2).connect(AC.destination);
      n.start();
      nodes = { o: o, g1: g1, g2: g2 };
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  function blip(freq, dur, type, peak) {
    if (muted) return;
    var ac = ensure();
    if (!ac) return;
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.06, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function update(speed01, thrust01) {
    if (!AC) return;
    if (muted) {
      nodes.g1.gain.value = 0;
      nodes.g2.gain.value = 0;
      return;
    }
    nodes.o.frequency.value = 70 + speed01 * 160;
    nodes.g1.gain.value = 0.012 + speed01 * 0.02;
    nodes.g2.gain.value = thrust01 * 0.07;
  }

  global.RoadsterAudio = {
    ensure: ensure,
    update: update,
    blip: blip,
    setMuted: function (v) { muted = !!v; if (muted && nodes) { nodes.g1.gain.value = 0; nodes.g2.gain.value = 0; } },
    get muted() { return muted; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
