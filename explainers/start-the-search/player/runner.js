/* Runs the cut's score(S, kit) inside the sandbox and returns plain ScoreData {events, master, tempo}.
 * Dependency-free classic JS: it is concatenated into the runner. Times are film seconds; beats use S.tempo(). */
function recordScore(cut, kit) {
  var events = [];
  var master = { gain: -6, fadeOut: 1, loudness: -16 };
  var grid = { bpm: 120, t0: 0 };
  var tracks = {};
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var seed = 7;
  function rnd() {
    seed = (seed + 0x6d2b79f5) | 0;
    var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function spb() { return 60 / grid.bpm; }
  function b2t(b) { return grid.t0 + b * spb(); }
  var bad = { count: 0, names: [] };
  function midiOf(p) {
    var n = p, m;
    if (typeof p !== 'number') {
      m = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/.exec(text(p).trim());
      n = m ? 12 * (Number(m[3]) + 1) + NOTE[m[1].toUpperCase()] + (/[#♯]/.test(m[2]) ? 1 : m[2] ? -1 : 0) : NaN;
    }
    return n === n ? Math.max(0, Math.min(127, Math.round(n))) : refuse(p, '');
  }
  function text(p) { try { return String(p); } catch (e) { return typeof p; } }
  /* A pitch that cannot be read costs its own note, not the score: a throw from here leaves the film silent.
   * After 20,000 refusals, the cap on a score's events, it throws all the same, so that an endless list ends. */
  function refuse(p, where) {
    if (bad.count >= 20000) throw new Error('score: over 20,000 pitches could not be read');
    var name = (p == null || typeof p === 'number' ? String(p) : JSON.stringify(text(p).slice(0, 24))) + where;
    bad.count++;
    if (bad.names.length < 6 && bad.names.indexOf(name) < 0) bad.names.push(name);
    return null;
  }
  /* Anything that is not a list is refused whole, not read as one pitch: a chord's name such as "G7" would then play as one very high note. */
  function listOf(pitches, call) { return pitches !== null && typeof pitches === 'object' && pitches.length >= 0 ? pitches : (refuse(pitches, ' where ' + call + ' takes a list'), []); }
  /* {beat, beats} on the grid or {t, dur} in seconds → [t, dur] */
  function when(o, defDur) {
    o = o || {};
    var t = o.t !== undefined ? num(o.t, 0) : b2t(num(o.beat, 0));
    var dur = o.dur !== undefined ? num(o.dur, defDur) : o.beats !== undefined ? num(o.beats, 1) * spb() : defDur;
    return [t, Math.max(0.01, dur)];
  }
  function push(kind, patch, midi, t, dur, vel, params) {
    if (midi === null) return;
    if (t < 0 && t > -0.1) t = 0; /* humanize jitter around beat 0 */
    if (!(t >= 0) || t > 600) return;
    var ev = { t: t, dur: dur, kind: kind, patch: String(patch), midi: midi, vel: Math.max(1, Math.min(127, Math.round(num(vel, 64)))) };
    if (params) ev.params = params;
    events.push(ev);
  }
  function notes(patch, p, t, dur, vel, params) {
    var list = Array.isArray(p) ? p : [p], i;
    for (i = 0; i < list.length; i++) push('note', patch, midiOf(list[i]), t, dur, vel, params);
  }
  function trackOf(name) {
    var tr = tracks[name];
    return tr || { patch: String(name), params: null };
  }
  function merged(base, o, keys) {
    var out = null, k, i;
    if (base) { out = {}; for (k in base) out[k] = base[k]; }
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (o && typeof o[k] === 'number') { out = out || {}; out[k] = o[k]; }
    }
    return out;
  }
  var VOICE_KEYS = ['pan', 'gain', 'rev', 'detune', 'bright'];
  var S = {
    /* Grid: beats per minute and where beat 0 sits on the film clock. Pick it FROM the cut (cut cadence = 1 beat). */
    tempo: function (bpm, o) { grid.bpm = Math.max(20, Math.min(300, num(bpm, 120))); grid.t0 = num(o && o.t0, 0); return S; },
    beat: function (b) { return b2t(b); },
    toBeat: function (t) { return (t - grid.t0) / spb(); },
    seed: function (s) { seed = num(s, 7) | 0; return S; },
    rand: rnd,
    /* Name a track and give it a patch (+ default pan -1..1, gain dB, rev 0..1 send). */
    program: function (track, patch, o) { tracks[track] = { patch: String(patch || track), params: merged(null, o, VOICE_KEYS) }; return S; },
    note: function (track, pitch, o) {
      var tr = trackOf(track), w = when(o, 0.3);
      notes(tr.patch, pitch, w[0], w[1], o && o.vel, merged(tr.params, o, VOICE_KEYS));
      return S;
    },
    chord: function (track, pitches, o) {
      var tr = trackOf(track), w = when(o, 1), spread = num(o && o.spread, 0), i;
      pitches = listOf(pitches, 'chord');
      for (i = 0; i < pitches.length; i++) notes(tr.patch, pitches[i], w[0] + i * spread, Math.max(0.02, w[1] - i * spread), o && o.vel, merged(tr.params, o, VOICE_KEYS));
      return S;
    },
    /* 'x.x.x-xx' on a step grid from beat 'from': x = hit (pitch list cycles), X = accent, . = rest. */
    pattern: function (track, pat, o) {
      o = o || {};
      var tr = trackOf(track), step = num(o.step, 0.5), from = num(o.from, 0), reps = Math.max(1, num(o.repeat, 1));
      var pitches = Array.isArray(o.pitch) ? o.pitch : [o.pitch !== undefined ? o.pitch : 'C4'];
      var vel = num(o.vel, 64), human = num(o.humanize, 0.004), hit = 0, r, i, c, b;
      for (r = 0; r < reps; r++) for (i = 0; i < pat.length; i++) {
        c = pat.charAt(i);
        if (c !== 'x' && c !== 'X') continue;
        b = from + (r * pat.length + i) * step;
        notes(tr.patch, pitches[hit % pitches.length], b2t(b) + (rnd() * 2 - 1) * human, num(o.dur, step * spb() * 0.9), vel + (c === 'X' ? 12 : 0) + Math.round((rnd() * 2 - 1) * num(o.velJitter, 4)), merged(tr.params, o, VOICE_KEYS));
        hit++;
      }
      return S;
    },
    /* Evenly stepped run in seconds (accelerate by passing your own times to note()). */
    run: function (track, pitches, o) {
      o = o || {};
      var tr = trackOf(track), t = num(o.t, 0), step = num(o.step, 0.1), i;
      pitches = listOf(pitches, 'run');
      for (i = 0; i < pitches.length; i++) notes(tr.patch, pitches[i], t + i * step, num(o.dur, 0.3), num(o.vel, 64) + num(o.cresc, 0) * i, merged(tr.params, o, VOICE_KEYS));
      return S;
    },
    drum: function (name, o) { var w = when(o, 0.1); push('drum', name, 0, w[0], w[1], o && o.vel, merged(null, o, VOICE_KEYS)); return S; },
    /* Drum pattern sugar: S.drums({kick:'x...x...', hat:'xxxxxxxx'}, {from, step, repeat, vel}) */
    drums: function (kitPat, o) {
      o = o || {};
      var step = num(o.step, 0.5), from = num(o.from, 0), reps = Math.max(1, num(o.repeat, 1)), name, pat, r, i, c;
      for (name in kitPat) {
        pat = String(kitPat[name]);
        for (r = 0; r < reps; r++) for (i = 0; i < pat.length; i++) {
          c = pat.charAt(i);
          if (c === 'x' || c === 'X' || c === 'o') push('drum', name, 0, b2t(from + (r * pat.length + i) * step), 0.1, num(o.vel, 70) + (c === 'X' ? 16 : c === 'o' ? -22 : 0) + Math.round((rnd() * 2 - 1) * 4), merged(null, o, VOICE_KEYS));
        }
      }
      return S;
    },
    /* UI foley at an exact film time (off-grid): tick click doubleclick pop ding chime whoosh boing revswell roll swell. */
    fx: function (name, t, o) {
      o = o || {};
      push('fx', name, (o.pitch !== undefined && midiOf(o.pitch)) || 0, num(t, 0), Math.max(0.01, num(o.dur, 0.25)), num(o.vel, 64), merged(null, o, VOICE_KEYS.concat(['into', 'rate'])));
      return S;
    },
    /* One tick per time — typing. */
    ticks: function (times, o) {
      o = o || {};
      var i, j = num(o.jitter, 6);
      for (i = 0; i < times.length; i++) S.fx(o.name || 'tick', times[i], { vel: num(o.vel, 36) + Math.round((rnd() * 2 - 1) * j), pan: o.pan });
      return S;
    },
    /* gain trims before the master; loudness = integrated LUFS the host normalizes to (default -16; false = leave raw). */
    master: function (o) { master = { gain: Math.max(-40, Math.min(6, num(o && o.gain, -6))), fadeOut: Math.max(0, Math.min(10, num(o && o.fadeOut, 1))), loudness: o && (o.loudness === false || o.loudness === null) ? null : Math.max(-40, Math.min(-6, num(o && o.loudness, -16))) }; return S; }
  };
  if (cut && typeof cut.score === 'function') cut.score(S, kit);
  if (bad.count > 0) console.error('score: ' + bad.count + (bad.count === 1 ? ' pitch could not be read and was' : ' pitches could not be read and were') + ' left out: ' + bad.names.slice(0, 5).join(', ') + (bad.names.length > 5 ? ' and others' : '') + ' (write "C4", "F#3", "Bb2" or a MIDI number)');
  events.sort(function (a, b) { return a.t - b.t; });
  if (events.length > 20000) events.length = 20000;
  return { events: events, master: master, tempo: { bpm: grid.bpm, t0: grid.t0 } };
}

;
/* Reads the cut's narration inside the sandbox and captions it. Dependency-free classic JS: it is concatenated into the runner.
 * CUT.narration = { lines: [{ at, text, audio, dur }], captions?: false | { style }, duck?: dB }; the host page speaks it. */
var filmCaptions = (function () {
  /* limits: the host's { maxLines, maxLineSeconds }. Its parseNarration (animation/narration.ts) applies the same, so a line it drops is named here and not captioned. */
  function read(cut, limits) {
    var n = cut.narration;
    if (!n || typeof n !== 'object' || !Array.isArray(n.lines)) return null;
    if (n.lines.length > limits.maxLines) console.error('narration has ' + n.lines.length + ' lines; only the first ' + limits.maxLines + ' are used');
    var lines = [];
    n.lines.slice(0, limits.maxLines).forEach(function (l, i) {
      if (!l || typeof l.at !== 'number' || typeof l.dur !== 'number' || !(l.at >= 0 && l.at < cut.duration) || !(l.dur > 0 && l.dur <= limits.maxLineSeconds) || typeof l.text !== 'string' || typeof l.audio !== 'string' || !l.audio) {
        console.error('narration line ' + (i + 1) + ' is left out. It needs { at, text, audio, dur }: a start in seconds inside the film, the words, the name of an audio asset, and that audio\'s length in seconds (' + limits.maxLineSeconds + ' at most); at and dur as numbers');
        return;
      }
      lines.push({ at: Number(l.at), text: l.text, audio: l.audio, dur: Number(l.dur) });
    });
    return { lines: lines, duck: typeof n.duck === 'number' ? n.duck : null };
  }

  /* A line over 76 characters is shown in parts of about equal length, split at spaces, each for its share of the line's time. */
  function cues(lines) {
    var MAX = 76, out = [];
    lines.forEach(function (l) {
      var words = l.text.trim().split(/\s+/), total = words.join(' ').length;
      if (!total) return;
      var aim = total / Math.ceil(total / MAX), part = '', done = 0;
      words.forEach(function (w, i) {
        part += (part ? ' ' : '') + w;
        if (i < words.length - 1 && part.length + (words[i + 1].length + 1) / 2 < aim) return;
        out.push({ a: l.at + (l.dur * done) / total, b: l.at + l.dur * Math.min(1, (done + part.length + 1) / total), text: part });
        done += part.length + 1;
        part = '';
      });
    });
    return out;
  }

  /* short: the stage's shorter side, which sizes the type. What draw(t, stage) shows depends only on t. */
  function layer(lines, opts, short, sans) {
    var list = cues(lines), box = document.createElement('div'), words = document.createElement('span');
    box.className = 'film-caption';
    box.dir = 'auto';
    box.style.cssText = 'position:absolute;left:10%;right:10%;bottom:7%;text-align:center;text-wrap:balance;pointer-events:none;z-index:2147483647;font:600 ' + Math.round(short * 0.042) + 'px/1.62 ' + sans;
    /* an inline box cloned per row, so each row's background hugs its own words */
    words.style.cssText = 'padding:.2em .6em;border-radius:.3em;background:rgba(0,0,0,.7);color:#fff;-webkit-box-decoration-break:clone;box-decoration-break:clone' + (opts && typeof opts.style === 'string' ? ';' + opts.style : '');
    box.appendChild(words);
    return {
      draw: function (t, stage) {
        var cue = null;
        for (var i = 0; i < list.length; i++) if (t >= list[i].a && t < list[i].b) cue = list[i];
        /* last in the stage, so it stays above what the cut adds */
        if (stage.lastChild !== box) stage.appendChild(box);
        box.style.visibility = cue ? 'visible' : 'hidden';
        if (cue && words.textContent !== cue.text) words.textContent = cue.text;
      }
    };
  }

  return Object.freeze({ read: read, cues: cues, layer: layer });
})();

;
/* Draws the joined look that the host sends with 'load' (animation/look.ts, Drawn) as DOM frames on the stage; payload-src/README.md has the contract.
 * Dependency-free classic JS, concatenated into the runner ahead of runtime.js, which calls installLooks(kit, look, addFonts). */
var FILM_LOOKS = {};
/* own.js, when it came with 'load', sets this: data in, a look out */
var OWN_LOOK = null;

function installLooks(kit, data, addFonts) {
  var own = function (o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); };
  var enrol = function (d) { if (d && d.own && OWN_LOOK) FILM_LOOKS[d.id] = OWN_LOOK(d.own); };
  enrol(data);
  /* by kind of text: the most lines before it shrinks, the smallest scale it shrinks to, the smallest size in px. A look may add grow: a scale to start from, so short words fill */
  var FIT = {
    kicker: { lines: 1, floor: 0.7 }, head: { lines: 3, floor: 0.55 }, sub: { lines: 3, floor: 0.7 }, value: { lines: 1, floor: 0.4 }, label: { lines: 2, floor: 0.7 },
    note: { lines: 2, floor: 0.7 }, before: { lines: 1, floor: 0.7 }, quote: { lines: 5, floor: 0.5 }, name: { lines: 1, floor: 0.7 }, role: { lines: 1, floor: 0.7 },
    wordmark: { lines: 1, floor: 0.5 }, cta: { lines: 1, floor: 0.6 }, url: { lines: 1, floor: 0.6 }, item: { lines: 2, floor: 0.65 }, itemnote: { lines: 3, floor: 0.7 }, ui: { lines: 1, floor: 0.6, min: 14 }, uibody: { lines: 2, floor: 0.7, min: 14 }
  };

  function E(tag, cls, part, kids) {
    var n = document.createElement(tag); if (cls) n.className = cls; if (part) n.setAttribute('data-part', part);
    (kids || []).forEach(function (k) { if (k) n.appendChild(k); });
    return n;
  }
  /* the film's own logo (look.json "logo"): an html module holding one <svg>, or an image asset; none, and nothing is drawn */
  function mark() {
    var name = data.logo, n = null;
    if (/\.html$/i.test(name) && kit.module(name) != null) n = kit.h(kit.module(name));
    else if (name && kit.assets.has(name)) { n = document.createElement('img'); n.alt = ''; n.src = kit.assets.url(name); }
    if (n) { n.classList.add('fr-mark'); n.setAttribute('data-part', 'mark'); }
    return n;
  }
  /* words reach the DOM as text nodes only; *stars* wrap the phrase a look may stress */
  function fill(node, s) {
    node.textContent = ''; node.__words = null; /* kit.TextFx keeps its word spans there */
    String(s).split(/\*([^*\n]+)\*/).forEach(function (bit, i) {
      if (bit === '') return;
      var into = node; if (i % 2) { into = document.createElement('em'); into.className = 'hl'; node.appendChild(into); }
      /* a line never breaks at a hyphen ("on-/call") */
      bit.split(/([^\s-]+(?:-[^\s-]+)+)/).forEach(function (w, j) {
        if (j % 2) { var nb = document.createElement('span'); nb.style.whiteSpace = 'nowrap'; nb.textContent = w; into.appendChild(nb); } else if (w) into.appendChild(document.createTextNode(w));
      });
    });
  }

  var LAYOUTS = {
    title: function (t) { return [mark(), t('kicker', 'p'), t('head', 'h1'), t('sub', 'p')]; },
    statement: function (t) { return [t('kicker', 'p'), t('head', 'h2'), t('sub', 'p')]; },
    points: function (t) {
      var li = [1, 2, 3, 4].map(function (i) {
        var a = t('item' + i, 'b', 'item'); if (!a) return null;
        var dot = E('i', 'pt-n'); dot.setAttribute('data-n', i);
        return E('li', 'pt', 'point' + i, [dot, E('div', 'pt-tx', null, [a, t('note' + i, 'span', 'itemnote')])]);
      });
      return [E('header', 'fr-top', null, [t('kicker', 'p'), t('head', 'h2')]), E('ul', 'pts', 'points', li)];
    },
    stat: function (t) { return [t('kicker', 'p'), E('div', 'st', 'stat', [t('value', 'div'), E('div', 'st-tx', null, [t('label', 'p'), t('before', 'p')])]), t('note', 'p')]; },
    /* the window is the look's; what it shows is the film's own: an html module (its [data-text] nodes are bound like any words) or an image asset */
    screen: function (t, f, mine) {
      var body = E('div', 'app-body', 'body'), win = E('div', 'app', 'pane', [E('div', 'app-bar', null, [E('i'), E('i'), E('i'), t('address', 'span', 'ui')]), body]), wrap = E('div', 'app-wrap', 'window', [win]);
      if (/\.html$/i.test(f.body) && kit.module(f.body) != null) {
        var inner = kit.h('<div class="app-html">' + kit.module(f.body) + '</div>'); body.appendChild(inner);
        inner.querySelectorAll('[data-text]').forEach(function (n) { mine.push(n); });
        /* [data-pop]: a toast or a menu that may overhang the window's edge, so it sits beside the window, not inside its clip */
        inner.querySelectorAll('[data-pop]').forEach(function (n) { wrap.appendChild(n); });
      } else if (f.body && kit.assets.has(f.body)) { var img = E('img', 'app-shot'); img.alt = ''; img.src = kit.assets.url(f.body); body.appendChild(img); }
      var top = [t('kicker', 'p'), t('head', 'h2'), t('sub', 'p')];
      return [top.some(Boolean) ? E('header', 'fr-top', null, top) : null, wrap];
    },
    /* the speaker's picture is the film's own (body: an image asset); none, and no face is drawn */
    quote: function (t, f) {
      var who = [t('name', 'b'), t('role', 'span')], face = null;
      if (f.body && kit.assets.has(f.body)) { face = E('img', 'q-face', 'face'); face.alt = ''; face.src = kit.assets.url(f.body); }
      return [E('i', 'q-mark', 'qmark'), t('quote', 'blockquote'), who.some(Boolean) ? E('footer', 'q-by', 'by', [face, E('div', null, null, who)]) : null];
    },
    end: function (t) { return [E('div', 'e-brand', 'brand', [mark(), t('wordmark', 'b')]), t('head', 'h2'), E('div', 'e-act', null, [t('cta', 'span'), t('url', 'span')])]; }
  };

  /* composition and plain defaults, all inside :where() (no specificity), so any rule a look writes wins */
  var BASE = [
    ':where(.look){position:absolute;inset:0;color:var(--c-ink);font-synthesis:none;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}',
    ':where(.look *){box-sizing:border-box;margin:0;padding:0}',
    ':where(.look em,.look i,.look b){font-style:normal;font-weight:inherit}',
    ':where(.look .fr){position:absolute;inset:0;overflow:hidden;background:var(--c-bg)}',
    ':where(.look .fr-ground,.look .fr-over){position:absolute;inset:0;pointer-events:none}',
    ':where(.look .fr-ground svg,.look .fr-over svg){position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
    ':where(.look .fr-safe){position:absolute;inset:120px 150px;display:flex;flex-direction:column;justify-content:center;gap:36px}',
    ':where(.look .tx){display:block;overflow-wrap:break-word;text-wrap:balance}', ':where(.look .is-fitting .tx){overflow-wrap:normal;word-break:normal}',
    ':where(.look .tx-kicker){font-size:30px;line-height:1.2;letter-spacing:.08em;text-transform:uppercase;color:var(--c-a1)}',
    ':where(.look .tx-head){font-size:104px;line-height:1.04;letter-spacing:-.025em;max-width:1400px}',
    ':where(.look .tx-sub,.look .tx-note){font-size:42px;line-height:1.3;color:var(--c-muted);max-width:1100px}',
    ':where(.look .hl){color:var(--c-a1)}',
    ':where(.look .fr-mark){width:88px;height:88px;flex:none;object-fit:contain}:where(.look .mk-box){fill:var(--c-a1)}:where(.look .mk-line){stroke:var(--c-on-a1)}',
    ':where(.look .fr-title .tx-head){font-size:136px}',
    ':where(.look .fr-statement .tx-head){font-size:124px;max-width:1500px}',
    ':where(.look .fr-top){display:flex;flex-direction:column;gap:24px}',
    ':where(.look .fr-points .tx-head){font-size:84px}',
    ':where(.look .pts){list-style:none;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:40px;margin-top:40px}',
    ':where(.look .pt){display:flex;flex-direction:column;gap:28px;min-width:0}',
    ':where(.look .pt-n){display:block;width:72px;height:72px;border-radius:50%;background:var(--c-a1)}',
    ':where(.look .pt-tx){display:flex;flex-direction:column;gap:14px;min-width:0}',
    ':where(.look .tx-item){font-size:46px;line-height:1.15}:where(.look .tx-itemnote){font-size:32px;line-height:1.35;color:var(--c-muted)}',
    ':where(.look .st){display:flex;align-items:flex-end;gap:64px}:where(.look .st-tx){display:flex;flex-direction:column;gap:16px;padding-bottom:44px;min-width:0;max-width:640px}',
    ':where(.look .tx-value){font-size:360px;line-height:.86;letter-spacing:-.045em;white-space:nowrap;color:var(--c-a1);max-width:1150px;flex:none}',
    ':where(.look .tx-label){font-size:56px;line-height:1.12}:where(.look .tx-before){font-size:34px;line-height:1.2;color:var(--c-muted)}',
    ':where(.look .fr-screen .fr-safe){inset:90px 110px;display:grid;grid-template-columns:500px 1fr;align-items:center;gap:80px}',
    ':where(.look .fr-screen.is-wide .fr-safe){grid-template-columns:1fr}:where(.look .fr-screen.is-wide .app-wrap){justify-self:center}',
    /* a pop overhangs on purpose: while the frame is sized that does not count as the safe area spilling */
    ':where(.look [data-pop]){position:absolute;right:-40px;bottom:-40px}:where(.look .is-sized .app-wrap){overflow:clip}',
    ':where(.look .fr-screen .tx-head){font-size:68px;line-height:1.08}:where(.look .fr-screen .tx-sub){font-size:34px}',
    ':where(.look .q-mark){display:block;width:72px;height:56px;background:var(--c-a1)}',
    ':where(.look .tx-quote){font-size:76px;line-height:1.18;letter-spacing:-.015em;max-width:1450px}',
    ':where(.look .q-by){display:flex;align-items:center;gap:28px;margin-top:20px}:where(.look .q-face){object-fit:cover;display:block;width:92px;height:92px;border-radius:50%;background:var(--c-a2);flex:none}',
    ':where(.look .tx-name){font-size:38px;line-height:1.2}:where(.look .tx-role){font-size:32px;line-height:1.25;color:var(--c-muted)}',
    ':where(.look .fr-end .fr-safe){align-items:center;text-align:center;gap:48px}',
    ':where(.look .e-brand){display:flex;align-items:center;gap:28px}:where(.look .tx-wordmark){font-size:84px;line-height:1;letter-spacing:-.02em}',
    ':where(.look .fr-end .tx-head){font-size:92px}',
    ':where(.look .e-act){display:flex;align-items:center;gap:40px;margin-top:16px}',
    ':where(.look .tx-cta){font-size:40px;line-height:1;padding:30px 52px;border-radius:999px;background:var(--c-a1);color:var(--c-on-a1);white-space:nowrap}:where(.look .tx-url){font-size:36px;color:var(--c-muted);white-space:nowrap}',
    /* the product window: 1120 x 760 */
    ':where(.look .app-wrap){position:relative;width:1120px;height:760px;justify-self:end}',
    ':where(.look .app){position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;background:var(--app-bg,var(--c-surface));color:var(--app-ink,var(--c-ink));border:2px solid var(--app-line,var(--c-line));font-size:20px;line-height:1.25}',
    ':where(.look .app-wrap .tx){white-space:nowrap;text-wrap:initial;min-width:0}',
    ':where(.look .app-bar){flex:none;height:48px;display:flex;align-items:center;gap:10px;padding:0 20px;border-bottom:2px solid var(--app-line,var(--c-line))}',
    ':where(.look .app-bar i){width:13px;height:13px;border-radius:50%;background:var(--app-line,var(--c-line))}',
    ':where(.look .tx-address){margin:0 auto;font-size:17px;color:var(--app-muted,var(--c-muted));transform:translateX(-30px)}',
    ':where(.look .app-body){position:relative;flex:1;display:flex;min-height:0}',
    ':where(.look .app-side){flex:none;width:218px;padding:24px 16px;display:flex;flex-direction:column;gap:6px;border-right:2px solid var(--app-line,var(--c-line))}',
    ':where(.look .app-brand){display:flex;align-items:center;gap:12px;padding:0 10px 20px;font-size:23px}:where(.look .app-brand .fr-mark){width:34px;height:34px}',
    ':where(.look .app-nav){display:flex;align-items:center;gap:12px;height:46px;padding:0 12px;border-radius:10px;color:var(--app-muted,var(--c-muted))}',
    ':where(.look .app-nav.is-on){background:color-mix(in srgb,var(--c-a1) 12%,transparent);color:var(--c-a1)}',
    ':where(.look .app-ico){width:18px;height:18px;border-radius:5px;border:2.5px solid currentColor;flex:none}',
    ':where(.look .app-main){flex:1;min-width:0;padding:24px 28px;display:flex;flex-direction:column;gap:20px}',
    ':where(.look .app-head){display:flex;align-items:center;justify-content:space-between}:where(.look .tx-view){font-size:28px}',
    ':where(.look .tx-range){font-size:17px;padding:8px 16px;border-radius:999px;border:2px solid var(--app-line,var(--c-line));color:var(--app-muted,var(--c-muted))}',
    ':where(.look .app-kpis){display:grid;grid-template-columns:repeat(3,1fr);gap:16px}',
    ':where(.look .app-kpi,.look .app-card){border:2px solid var(--app-line,var(--c-line));border-radius:14px;padding:16px 20px}',
    ':where(.look .app-kpi){display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:4px 8px}',
    ':where(.look .tx-kpilabel){grid-column:1/-1;font-size:16px;color:var(--app-muted,var(--c-muted))}:where(.look .tx-kpi){font-size:34px;letter-spacing:-.02em}',
    ':where(.look .tx-kpidelta){font-size:16px;color:var(--c-a2)}:where(.look .is-bad .tx-kpidelta){color:var(--c-a3)}',
    ':where(.look .app-chart){flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}',
    ':where(.look .app-cardhead){display:flex;justify-content:space-between;align-items:baseline}:where(.look .tx-charttitle){font-size:20px}:where(.look .tx-legend){font-size:15px;color:var(--app-muted,var(--c-muted))}',
    ':where(.look .ch){position:relative;flex:1;min-height:0}:where(.look .ch-svg){position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
    ':where(.look .ch-grid){stroke:var(--app-line,var(--c-line));stroke-width:1.5}:where(.look .ch-band){fill:var(--c-a1);opacity:.1}:where(.look .ch-area){fill:none}',
    ':where(.look .ch-line){stroke:var(--c-a1);stroke-width:4;stroke-linejoin:round;stroke-linecap:round}',
    ':where(.look .ch-drop){stroke:var(--c-a3);stroke-width:2;stroke-dasharray:5 6}',
    ':where(.look .ch-dot){position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:var(--c-a3);border:4px solid var(--app-bg,var(--c-surface));box-shadow:0 0 0 7px color-mix(in srgb,var(--c-a3) 25%,transparent)}',
    ':where(.look .tx-flag){position:absolute;transform:translate(-100%,-50%);margin-left:-28px;font-size:15px;padding:6px 12px;border-radius:8px;background:var(--c-a3);color:var(--c-on-a3)}',
    ':where(.look .app-alert){position:absolute;left:262px;bottom:-46px;width:440px;font-size:20px;line-height:1.25;color:var(--app-ink,var(--c-ink));display:grid;grid-template-columns:auto 1fr;gap:8px 14px;align-items:start;padding:18px 20px;border-radius:16px;background:var(--app-bg,var(--c-surface));border:2px solid var(--app-line,var(--c-line));box-shadow:0 18px 50px rgba(10,16,40,.22)}',
    ':where(.look .app-alertico){width:34px;height:34px;border-radius:10px;background:var(--c-a3)}',
    ':where(.look .app-alerttx){display:flex;flex-direction:column;gap:4px;min-width:0}:where(.look .tx-alert){font-size:20px}',
    ':where(.look .app-wrap .tx-alertbody){font-size:16px;line-height:1.35;white-space:normal;color:var(--app-muted,var(--c-muted))}',
    ':where(.look .tx-action){grid-column:2;justify-self:start;font-size:16px;padding:9px 16px;border-radius:9px;background:var(--c-a1);color:var(--c-on-a1);margin-top:6px}',
    ':where(.look .app-html){display:contents}:where(.look .app-shot){display:block;width:100%;height:100%;object-fit:cover;object-position:left top}'
  ].join('\n');

  /* layout px throughout (clientHeight, scrollWidth), so the fit is the same in a 320 px thumbnail runner as on the stage */
  function lines(el) {
    var cs = getComputedStyle(el), size = parseFloat(cs.fontSize) || 16, lh = parseFloat(cs.lineHeight) || size * 1.2;
    return Math.round((el.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0)) / lh);
  }
  function fit(fr, rules) {
    var txs = Array.prototype.slice.call(fr.el.querySelectorAll('[data-fit]'));
    var base = txs.map(function (el) { return parseFloat(getComputedStyle(el).fontSize) || 16; }), scale = [], min = [], freed = [], safe = fr.safe, all = 1;
    var put = function (i) { txs[i].style.fontSize = Math.max(min[i], base[i] * scale[i] * all).toFixed(2) + 'px'; };
    /* tight leading lets descenders hang below the last line box, which counts as overflow at any size: allow for it */
    var hang = 1 + Math.min(48, 0.15 * Math.max.apply(null, [0].concat(base)));
    var spills = function () { return safe.scrollHeight > safe.clientHeight + hang || safe.scrollWidth > safe.clientWidth + 1; };
    var rule = txs.map(function (el) { var kind = el.getAttribute('data-fit'); return Object.assign({ lines: 3, floor: 0.6, min: 0, grow: 1 }, FIT[kind], rules && rules[kind], rules && rules[fr.layout + '.' + el.getAttribute('data-part')]); });
    /* the pieces that grow come last, once the others have settled */
    var order = txs.map(function (_, i) { return i; }).sort(function (a, b) { return (rule[a].grow > 1) - (rule[b].grow > 1) || a - b; });
    var each = function (first) {
      order.forEach(function (i) {
        var el = txs[i], r = rule[i];
        var wide = function () { return el.scrollWidth > el.clientWidth + (first ? 0 : 1); };
        var shrink = function () { while (scale[i] > r.floor && (lines(el) > r.lines || wide() || (scale[i] > 1 && spills()))) { scale[i] = Math.max(r.floor, scale[i] - 0.04); put(i); } };
        if (first) { scale[i] = Math.max(1, r.grow); min[i] = Math.min(r.min, base[i]); if (scale[i] > 1) put(i); }
        shrink();
        /* a word too wide even at the floor has to break: the piece starts again with that allowed */
        if (first && wide()) { el.style.overflowWrap = 'break-word'; freed.push(el); scale[i] = Math.max(1, r.grow); put(i); shrink(); }
      });
    };
    /* first with no word allowed to break inside, so that one too wide for its column shrinks its piece (or stops its growth); then as the frame will be shown */
    fr.el.classList.add('is-sized', 'is-fitting'); each(true); fr.el.classList.remove('is-fitting');
    freed.forEach(function (el) { el.style.overflowWrap = ''; });
    each(false);
    while (all > 0.6 && spills()) { all -= 0.04; for (var i = 0; i < txs.length; i++) put(i); }
    fr.spilt = spills();
    fr.el.classList.remove('is-sized');
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  var L = null;
  function make() {
    var D = data, root = null, sheet = null, frames = [], byId = {}, nodes = {}, raw = {}, set = [], turns = 0;
    function bind(node, key, s) { node.setAttribute('data-text', key); nodes[key] = node; raw[key] = s; fill(node, s); return node; }
    function build(f, index) {
      var t = function (slot, tag, kind) {
        if (!own(f.text, slot)) return null;
        var n = E(tag, 'tx tx-' + (kind && kind !== 'ui' ? kind : slot), slot); n.setAttribute('data-fit', kind || slot);
        return bind(n, f.id + '.' + slot, f.text[slot]);
      };
      var mine = [], fr = { id: f.id, layout: f.layout, ground: E('div', 'fr-ground'), safe: E('div', 'fr-safe', null, LAYOUTS[f.layout](t, f, mine)), over: E('div', 'fr-over'), parts: Object.create(null), made: [], built: [] };
      /* is-wide: a screen with no words beside it, so the window sits in the middle */
      fr.el = E('section', 'fr fr-' + f.layout + (f.layout === 'screen' && !fr.safe.querySelector('.fr-top') ? ' is-wide' : ''), null, [fr.ground, fr.safe, fr.over]); fr.el.setAttribute('data-frame', f.id); fr.el.setAttribute('data-layout', f.layout); fr.el.setAttribute('data-i', index);
      /* words in the film's own markup: bound when look.json holds them, else left as drawn and not offered for editing */
      mine.forEach(function (n) {
        var slot = n.getAttribute('data-text');
        if (own(f.text, slot) && !own(nodes, f.id + '.' + slot)) { if (!n.hasAttribute('data-fit')) n.setAttribute('data-fit', 'ui'); if (!n.hasAttribute('data-part') && !fr.safe.querySelector('[data-part="' + slot + '"]')) n.setAttribute('data-part', slot); bind(n, f.id + '.' + slot, f.text[slot]); } else n.removeAttribute('data-text');
      });
      /* the skeleton's names first; the film's own markup (inside the logo or a screen's body, or a [data-pop] moved out of it) takes those still free; the first of a name stands. No prototype: the film picks names */
      var named = Array.prototype.slice.call(fr.el.querySelectorAll('[data-part]')), films = function (n) { return !!(n.closest('[data-pop]') || n.parentElement.closest('.fr-mark, .app-html')); };
      [false, true].forEach(function (theirs) { named.forEach(function (n) { var p = n.getAttribute('data-part'); if (films(n) === theirs && !(p in fr.parts)) fr.parts[p] = n; }); });
      fr.parts.ground = fr.ground; fr.parts.over = fr.over;
      fr.built = [fr.el].concat(Array.prototype.slice.call(fr.el.querySelectorAll('*'))).map(function (n) {
        var at = {}; Array.prototype.forEach.call(n.attributes, function (a) { at[a.name] = a.value; });
        return [n, at];
      });
      return fr;
    }
    function dress(fr, index) {
      var look = FILM_LOOKS[D.id], o = kit.srect(fr.el), seed = hash((look.salt || D.id) + '/' + fr.id); /* salt: seeds the frames' chance in place of the id */
      var ctx = { kit: kit, values: D.values, palette: D.palette, dark: D.dark, W: kit.W, H: kit.H, frame: D.frames[index], index: index, count: frames.length, parts: fr.parts, seed: seed, rng: kit.rng(seed), layer: fr.ground,
        rect: function (n) { var r = kit.srect(n); return { x: r.x - o.x, y: r.y - o.y, w: r.w, h: r.h }; },
        /* one box a line, for a phrase that wraps */
        rects: function (n) { var all = kit.srect(n), b = n.getBoundingClientRect(), k = b.width ? all.w / b.width : 1; return Array.prototype.map.call(n.getClientRects(), function (r) { return { x: all.x - o.x + (r.left - b.left) * k, y: all.y - o.y + (r.top - b.top) * k, w: r.width * k, h: r.height * k }; }); },
        /* a hook's own markup, made of numbers and checked hexes and never of a record's words: a full-frame <svg>, or nodes, into ctx.layer */
        svg: function (markup) { return ctx.layer.appendChild(kit.h('<svg viewBox="0 0 ' + kit.W + ' ' + kit.H + '">' + (markup || '') + '</svg>')); },
        html: function (markup, into) { var box = kit.h('<div>' + markup + '</div>'); while (box.firstChild) (into || ctx.layer).appendChild(box.firstChild); } };
      undress(fr);
      var was = Array.prototype.slice.call(fr.el.querySelectorAll('*'));
      /* a hook that throws (a screen's markup is whatever the film brings) costs its own drawing, never the frame */
      var run = function (name) { try { if (look[name]) look[name](fr.el, ctx); } catch (e) { console.error('look ' + D.id + ': ' + name + ' threw on frame ' + fr.id + ': ' + (e && e.message)); } };
      run('ground');
      fit(fr, look.fit);
      ctx.layer = fr.over; run('decorate');
      fr.el.querySelectorAll('*').forEach(function (n) { if (was.indexOf(n) < 0) fr.made.push(n); });
    }
    /* back to the frame as built, so it is measured at rest: no node a hook made, no attribute (class, style) a hook or the cut set, the words whole */
    function undress(fr) {
      fr.made.forEach(function (n) { n.remove(); }); fr.made = [];
      fr.built.forEach(function (w) {
        Array.prototype.slice.call(w[0].attributes).forEach(function (a) { if (!own(w[1], a.name)) w[0].removeAttribute(a.name); });
        for (var a in w[1]) if (w[0].getAttribute(a) !== w[1][a]) w[0].setAttribute(a, w[1][a]);
      });
      for (var k in nodes) if (k.split('.')[0] === fr.id && fr.el.contains(nodes[k])) fill(nodes[k], raw[k]);
    }
    /* measuring needs the frame in the document. After a change the frames on screen are dressed at once and the rest when next shown, so a drag of a control dresses one frame, not all */
    function tidy(fr, i) { if (fr.stale && fr.el.parentNode === root) { fr.stale = false; dress(fr, i); } }
    function redress(only) { frames.forEach(function (fr, i) { if (!only || only === fr.id) { fr.stale = true; tidy(fr, i); } }); }
    function tell() { (D.notes || []).forEach(function (n) { console.warn(n); }); }
    function wear() {
      set.forEach(function (k) { if (k.slice(0, 2) === '--') root.style.removeProperty(k); else root.removeAttribute(k); }); set = [];
      root.className = 'look look-' + D.id; root.setAttribute('data-look', D.id);
      for (var v in D.vars) { root.style.setProperty(v, D.vars[v]); set.push(v); }
      for (var a in D.attrs) { root.setAttribute(a, D.attrs[a]); set.push(a); }
      var look = FILM_LOOKS[D.id], css = look.css, text = [BASE, look.under, typeof css === 'function' ? css({ values: D.values, palette: D.palette, dark: D.dark }) : css, look.guard].filter(Boolean).join('\n');
      if (sheet.textContent !== text) sheet.textContent = text;
    }
    var api = {
      get id() { return D.id; }, get values() { return D.values; }, get palette() { return D.palette; }, get dark() { return D.dark; }, get root() { return root; },
      frames: D.frames.map(function (f) { return f.id; }),
      /* the runner calls this once, after the fonts and before the cut's own init: every frame built and dressed, none shown */
      init: function () {
        if (root) return api;
        /* under the kit's own layers (svgLayer, the fx canvas), so a cut's marks show over a frame */
        sheet = kit.css(''); root = kit.el('div'); kit.stage.insertBefore(root, kit.stage.querySelector('#fx'));
        tell();
        if (D.missing) console.warn('look.json asks for the look "' + D.missing + '", which ' + (/^own-/.test(D.missing) ? 'no styles module of the film gives in a form that can be read' : 'this player does not have') + ': drawn ' + (D.missing === D.id ? 'plain' : 'in "' + D.id + '"'));
        wear();
        frames = D.frames.map(build); frames.forEach(function (fr) { byId[fr.id] = fr; });
        root.replaceChildren.apply(root, frames.map(function (fr) { return fr.el; })); redress(); api.show();
        return api;
      },
      /* spilt: its words do not fit even at their floors */
      frame: function (id) { return own(byId, id) ? { el: byId[id].el, parts: byId[id].parts, spilt: !!byId[id].spilt } : null; },
      /* painted in the order named; the rest leave the document, since the raster serialises the whole stage for every frame of video */
      show: function () {
        var want = Array.prototype.slice.call(arguments).filter(function (id) { return own(byId, id); }).map(function (id) { return byId[id].el; });
        if (want.length !== root.children.length || want.some(function (el, i) { return root.children[i] !== el; })) root.replaceChildren.apply(root, want);
        frames.forEach(tidy);
      },
      /* the words under a key ("<frame>.<slot>", or an id of look.json's "text"), and a node of the cut's own bound to them */
      text: function (key) {
        var p = String(key).split('.'), f = p.length === 2 ? D.frames.filter(function (x) { return x.id === p[0]; })[0] : p.length === 1 ? D : null;
        return own(raw, key) ? raw[key] : f && own(f.text, p[p.length - 1]) ? f.text[p[p.length - 1]] : null;
      },
      /* no such words in look.json: the node is left as it is, and is not offered for editing */
      bind: function (node, key) { var s = api.text(key); if (s == null) return node; if (own(nodes, key) && nodes[key] !== node) nodes[key].removeAttribute('data-text'); return bind(node, key, s); },
      raw: function (key) { return own(raw, key) ? raw[key] : null; },
      refit: function (id) { if (own(byId, id)) redress(id); },
      /* every frame is dressed anew, not that one alone: a look may echo one frame's words on another */
      setText: function (key, s) {
        if (!own(nodes, key)) return false;
        var p = String(key).split('.'), f = p.length === 2 ? D.frames.filter(function (x) { return x.id === p[0]; })[0] : D;
        raw[key] = f.text[p[p.length - 1]] = String(s); fill(nodes[key], raw[key]); redress();
        return true;
      },
      /* the same film joined anew (a control, a palette, words), applied in place: parts stay the same nodes.
       * false = another look, whose code this runner lacks, or frames, pieces of text or a logo that are not the same ones: only a reload will do */
      async retune(next) {
        var keys = function (o) { return Object.keys(o).sort().join(); }, turn = ++turns;
        var made = next && next.own && OWN_LOOK ? OWN_LOOK(next.own) : null;
        if (!root || !next || !(made || own(FILM_LOOKS, next.id)) || next.frames.length !== D.frames.length || keys(next.text) !== keys(D.text) || next.logo !== D.logo) return false;
        if (next.frames.some(function (f, i) { var g = D.frames[i]; return f.id !== g.id || f.layout !== g.layout || f.body !== g.body || keys(f.text) !== keys(g.text); })) return false;
        await addFonts(next.fonts);
        if (turn !== turns) return true; /* a later call has overtaken this one */
        if (made) FILM_LOOKS[next.id] = made; /* only now: a call refused or overtaken leaves the look as it was */
        /* a look names in "vars" the controls that reach the picture through custom properties alone: a drag of one needs no new dressing */
        var was = D, light = FILM_LOOKS[next.id].vars || [], same = !next.own && next.id === was.id && keys(next.palette) + Object.values(next.palette) === keys(was.palette) + Object.values(was.palette);
        for (var v in next.values) if (next.values[v] !== was.values[v] && light.indexOf(v) < 0) same = false;
        D = next; wear();
        if (D.id !== was.id) tell();
        var say = function (k, s, old) { if (s !== old) same = false; if (own(nodes, k) && raw[k] !== s) { raw[k] = s; fill(nodes[k], s); } };
        D.frames.forEach(function (f, i) { for (var slot in f.text) say(f.id + '.' + slot, f.text[slot], was.frames[i].text[slot]); });
        for (var id in D.text) say(id, D.text[id], was.text[id]);
        if (!same) redress();
        return true;
      }
    };
    return api;
  }

  kit.look = function () {
    if (!data || !own(FILM_LOOKS, data.id)) throw new Error('kit.look: the film needs a modules/look.json that is JSON like {"v": 1, "look": "sketch", "frames": [...]}; it has none, or one the player cannot read');
    return L || (L = make());
  };
  /* window.CUT = kit.stills({duration?}): each frame held (3 s, or an equal share of duration), hard cuts, a chapter per frame */
  kit.stills = function (opts) {
    var look = kit.look(), ids = look.frames, n = Math.max(1, ids.length), hold = opts && opts.duration > 0 ? opts.duration / n : 3;
    return {
      width: 1920, height: 1080, fps: 30, duration: n * hold,
      /* read anew each time, so that they follow a retune */
      get background() { return look.palette.bg; },
      get chapters() { return ids.map(function (id, i) { return { t: i * hold, label: String(look.text(id + '.head') || look.text(id + '.quote') || look.text(id + '.label') || id).replace(/\*/g, '').slice(0, 48) }; }); },
      render: function (t) { if (ids.length) look.show(ids[Math.min(n - 1, Math.max(0, Math.floor(t / hold)))]); }
    };
  };
  return function () { return L; };
}

;
/* How a snapshot's SVG image is drawn at w × h. Plain script, shared as text by the two documents that draw one: the raster document
 * (film/raster-frame.ts) and the runner, for plates (film/frame.ts puts it ahead of film/runtime.js). Resolves with a canvas or an ImageBitmap; given a canvas to draw in, always with an ImageBitmap. */
var drawSnapshot = (function () {
  var WAYS = {
    /* createImageBitmap copies the canvas before this returns, so frames that share the given canvas cannot get each other's picture, even when they were all asked for before the way of drawing was picked */
    plain: function (source, w, h, into) {
      var c = into || document.createElement('canvas'), x; c.width = w; c.height = h; x = c.getContext('2d'); x.drawImage(source, 0, 0, w, h);
      /* a lost context ignores draws until the browser restores it, and the canvas keeps that context: the catch in draw() takes a new canvas */
      if (into && x.isContextLost && x.isContextLost()) throw new Error('canvas context lost');
      return into ? createImageBitmap(c) : c;
    },
    bitmap: function (source, w, h) { return createImageBitmap(source, { resizeWidth: w, resizeHeight: h }); }
  };
  /* the test scene, 16 × 12: an opaque box and, two bands down, a bare one, each with a hard shadow 8 px to its right (WebKit's canvas misplaces the two differently). Redrawn right at 32 × 24 it is
   * opaque (1) or clear (0) on both sides of every upright edge: x = 0, 7, 8, 15, 16, 23, 24, 31 of rows 4, 12 and 20. A picture enlarged smoothly from a smaller one is grey there, and would soften every frame */
  var SCENE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"><foreignObject width="16" height="12"><div xmlns="http://www.w3.org/1999/xhtml">' +
    '<div style="width:4px;height:4px;background:#000;box-shadow:8px 0 0 #000"></div><div style="width:4px;height:4px;margin-top:4px;box-shadow:8px 0 0 #000"></div></div></foreignObject></svg>';
  var RIGHT = '11001100' + '00000000' + '00001100';
  function right(picture) {
    if (picture.width !== 32 || picture.height !== 24) return false;
    var a = WAYS.plain(picture, 32, 24).getContext('2d').getImageData(0, 0, 32, 24).data;
    for (var i = 0, alpha; i < 24; i++) { alpha = a[((4 + 8 * (i >> 3)) * 32 + 8 * ((i & 7) >> 1) + 7 * (i & 1)) * 4 + 3]; if (RIGHT.charAt(i) === '1' ? alpha < 224 : alpha > 31) return false; }
    return true;
  }
  function transfers(bitmap) { var ch = new MessageChannel(); try { ch.port1.postMessage(bitmap, [bitmap]); return true; } catch (e) { return false; } finally { ch.port1.close(); ch.port2.close(); } }
  /* HACK: WebKit is told from other engines by a CSS property only it has; a WebKit that dropped it would keep the plain draw, shadows misplaced */
  function webkit() { try { return CSS.supports('-webkit-nbsp-mode', 'space'); } catch (e) { return false; } }

  /* WebKit's canvas leaves the offset and blur of CSS shadows unscaled when it draws an SVG at another size. Other engines must not try the bitmap: Chromium's cannot be posted */
  var way = !webkit() ? Promise.resolve('plain') : new Promise(function (done) {
    var scene = new Image();
    scene.onerror = function () { done('plain'); };
    scene.onload = function () {
      new Promise(function (next) { next(right(WAYS.plain(scene, 32, 24)) ? null : WAYS.bitmap(scene, 32, 24)); })
        .then(function (b) { var good = false; try { good = b !== null && right(b) && transfers(b); } finally { if (b !== null && !good) b.close(); } done(good ? 'bitmap' : 'plain'); })
        .catch(function () { done('plain'); });
    };
    scene.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SCENE);
  });
  /* WebKit makes the bitmap at first use, so this catch sees a refusal, never a picture that could not be made. It also sees a given canvas that is lost or cannot be copied, so it draws in a new one */
  function draw(img, w, h, into) { return way.then(function (k) { return WAYS[k](img, w, h, into); }).catch(function () { return WAYS.plain(img, w, h, into && document.createElement('canvas')); }); }
  draw.way = way;
  return draw;
})();

;
/* What a person did to a film's scenes by hand (modules/recut.json), as the runner applies it: played time <-> the film's own time, part by part (payload-src/README.md, "Scenes by hand").
 * Dependency-free classic JS, concatenated into the runner ahead of runtime.js. The page's reader is animation/recut.ts; both readers' tests run the cases in animation/recut.fixtures.ts. */

/* The film cut on its own time: at 0, and at each labelled chapter start over 0.05 s from the cut before it and from the end. ids: the scenes' ids, in a film made of scenes. */
function filmParts(duration, chapters, ids) {
  var cuts = [{ t: 0, label: '' }];
  chapters.forEach(function (ch) {
    if (ch.label.trim() === '' || ch.t >= duration - 0.05) return;
    if (ch.t <= 0.05) { if (cuts.length === 1) cuts[0].label = ch.label; return; }
    if (ch.t - cuts[cuts.length - 1].t > 0.05) cuts.push({ t: ch.t, label: ch.label });
  });
  var keyed = ids && ids.length === cuts.length;
  return cuts.map(function (c, i) { return { key: keyed ? ids[i] : null, label: c.label, a0: c.t, nat: Math.round(((i + 1 < cuts.length ? cuts[i + 1].t : duration) - c.t) * 1e6) / 1e6 }; });
}

/* own: filmParts' list. text: the record. Returns the parts as played, { key, label, own, a0, nat, p0, dur } (own: the film's label, label: the person's if they gave one), with at() and back(); moved: some part plays at another length than its own; aside: the lengths would take the film past its limit, so none is played.
 * A pair stands only while the film still says its "was", and a length only within the limits; one that does not is ignored, never clamped. */
function sceneClock(own, text) {
  /* the limits are animation/recut.ts's: LEAST 0.5, MOST 3, FLOOR_S 1, MAX_FILM_S, NEAR_S, MAX_ENTRIES 33, MAX_NAME 48 */
  var MOST_S = 300, NEAR = 0.001, EDGE = 1e-9, list = [], r = null;
  /* over that length the page reads no record either (animation/plan.ts, json) */
  try { r = typeof text === 'string' && text.length <= 262144 ? JSON.parse(text) : null; } catch (e) { /* not ours */ }
  if (r && typeof r === 'object' && r.v === 1 && Array.isArray(r.scenes)) list = r.scenes.slice(0, 33);
  var pair = function (p) { return p && typeof p === 'object' ? p : {}; };
  var fits = function (nat, v) { return typeof v === 'number' && isFinite(v) && v >= nat * 0.5 - 1e-9 && v <= nat * 3 + 1e-9 && v >= Math.min(1, nat) && v <= MOST_S; };
  var tidy = function (s) { return Array.from(s.slice(0, 96)).slice(0, 48).join('').replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\p{Noncharacter_Code_Point}\p{Default_Ignorable_Code_Point}\u2800\ufffc\u{16fe4}\s]+/gu, ' ').trim(); };
  var lay = function (stretch) {
    var p = 0;
    return own.map(function (x, i) {
      var dur = x.nat, label = x.label;
      list.forEach(function (e) {
        if (!e || typeof e !== 'object' || (x.key !== null ? e.id !== x.key : e.part !== i || e.id !== undefined || pair(e.name).was !== x.label)) return;
        if (stretch && typeof pair(e.dur).was === 'number' && Math.abs(e.dur.was - x.nat) <= NEAR && fits(x.nat, e.dur.v)) dur = e.dur.v;
        if (pair(e.name).was === x.label && typeof e.name.v === 'string' && tidy(e.name.v) !== '') label = tidy(e.name.v);
      });
      var part = { key: x.key, label: label, own: x.label, a0: x.a0, nat: x.nat, p0: p, dur: dur };
      p = Math.round((p + dur) * 1e6) / 1e6;
      return part;
    });
  };
  var end = function (sc) { var z = sc[sc.length - 1]; return Math.round((z.p0 + z.dur) * 1e6) / 1e6; };
  var sc = lay(true), aside = end(sc) > MOST_S && sc.some(function (x) { return x.dur !== x.nat; });
  /* past the limit every part plays at its own length */
  if (aside) sc = lay(false);
  /* where nothing is moved the two clocks are one, to the last digit */
  if (!sc.some(function (x) { return x.dur !== x.nat; })) sc.forEach(function (x) { x.p0 = x.a0; });
  var z = sc[sc.length - 1], a = z.a0 + z.nat, p = end(sc);
  var find = function (at, v) { var k = 0; for (var j = 1; j < sc.length; j++) if (sc[j][at] <= v) k = j; return sc[k]; };
  return {
    parts: sc, duration: p, moved: sc.some(function (x) { return x.dur !== x.nat; }), aside: aside,
    /* played t -> { T: the film's own seconds, rate: of those per played second }. A part stops just short of the next one's first instant. */
    at: function (t) {
      t = t < 0 ? 0 : t > p ? p : t;
      var x = find('p0', t);
      return { T: x.a0 + Math.min(x === z ? x.nat : x.nat - EDGE, (t - x.p0) * (x.nat / x.dur)), rate: x.nat / x.dur };
    },
    /* the film's own T -> played seconds; before 0 and past the end it runs on at normal speed (a score's lead-in and tail) */
    back: function (T) {
      if (T < 0) return T;
      if (T >= a) return p + (T - a);
      var x = find('a0', T);
      return x.p0 + (T - x.a0) * (x.dur / x.nat);
    }
  };
}

/* The score is recorded in the film's own time and played in played time. Starts and lengths both move, so a stretched part's sound slows with its picture, at the same pitch. */
function warpScore(score, clock) {
  return Object.assign({}, score, { events: score.events.map(function (e) {
    var t = clock.back(e.t);
    return Object.assign({}, e, { t: t, dur: Math.max(0.01, clock.back(e.t + e.dur) - t) });
  }) });
}

;
/* A rough scene's outlines redrawn as hand-drawn strokes, like the Plan tab's storyboard frames (ui/Sketch.tsx): payload-src/README.md, "A rough scene is sketched".
 * Dependency-free classic JS, concatenated into the runner ahead of scenes.js, which calls installSketch(kit). */

/* The strokes for one element of w by h px, as path data: a pure function of its arguments, so that a frame follows from t alone. o.u: the square root of the stage's area over that of 1280 by 720. o.sides: the border's width at top, right, bottom, left, 0 for a side not drawn.
 * o.onEdge: draw on the box's edge, not down the border's middle. o.bar: one stroke along the longer side. o.broken: dashed or dotted. o.rx, o.ry: the corner as CSS states it. o.hatch: 0 none, 1 close, 2 wide. o.skip: [x0, y0, x1, y1] that the hatching keeps off, or null. */
function sketchBox(seed, w, h, o) {
  var u = o.u, step = 110 * u, thin = Math.min(w, h), b = o.sides;
  /* Each line has random numbers of its own, drawn in an order that its length does not change: as a box grows, what is drawn stays put and the rest follows smoothly. */
  var stream = function (k) {
    /* mixed first: the generator is linear, and would give neighbouring seeds the same numbers a constant apart */
    var m = seed + k * 104729; m ^= m >>> 16; m = Math.imul(m, 0x45d9f3b); m ^= m >>> 16;
    var s = ((m >>> 1) % 2147483646) + 1;
    return function () { return (s = (s * 16807) % 2147483647) / 2147483647; };
  };
  var n1 = function (n) { return String(Math.round(n * 10) / 10); }, n0 = function (n) { return String(Math.round(n)); };
  var through = function (p) {
    var d = 'M' + n1(p[0][0]) + ' ' + n1(p[0][1]);
    for (var k = 1; k < p.length - 1; k++) d += 'Q' + n1(p[k][0]) + ' ' + n1(p[k][1]) + ' ' + n1((p[k][0] + p[k + 1][0]) / 2) + ' ' + n1((p[k][1] + p[k + 1][1]) / 2);
    return d + 'L' + n1(p[p.length - 1][0]) + ' ' + n1(p[p.length - 1][1]);
  };
  var line = function (roll, x0, y0, x1, y1, amp) {
    var len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len, over = Math.min(37 * u, len * 0.11, thin * 0.16);
    var a = over * (0.3 + roll()), all = len + a + over * (0.3 + roll()), far = amp * Math.min(1, all / step), p = [], off = roll() * 2 - 1;
    var put = function (s, f) { p.push([x0 + ux * (s - a) - uy * f * far, y0 + uy * (s - a) + ux * f * far]); };
    for (var s = 0; ; s += step) {
      var next = roll() * 2 - 1;
      put(s, off);
      if (!(s + step < all) || p.length > 400) { put(all, off + ((next - off) * (all - s)) / step); return through(p); }
      off = next;
    }
  };
  /* on one box a wider border is never a thinner pen: what chance adds is the box's own, and under 1 px */
  var base = (3 + Math.max(0, Math.min(1, thin / u / 100 - 1.5))) * u, chance = stream(0)() * Math.min(0.5 * u, 0.8), pen = function (bw) { return Math.max(2 * u, base + bw - 2) + chance; };
  /* pencil: a line is three thin passes, each straying further than the last; the third is spared on a small element, where it would only thicken the line */
  var stroke = function (k, bw, draw) { return { main: draw(stream(1 + k), 1), again: draw(stream(11 + k), 1.5), third: Math.max(w, h) > step ? draw(stream(31 + k), 2.1) : '', width: n1(pen(bw)) }; };
  var out = { wash: '', hatch: '', cross: '', fine: n1(1.5 * u), lines: [null, null, null, null] };
  if (o.bar) {
    /* with its round ends the stroke covers what the element covers: a dot where the sides are equal, with no jump as one of them grows */
    out.lines[0] = stroke(0, thin - base + 2, function (roll, k) { return w >= h ? line(roll, h / 2, h / 2, w - h / 2, h / 2, 3 * u * k) : line(roll, w / 2, w / 2, w / 2, h - w / 2, 3 * u * k); });
    return out;
  }
  var mid = o.onEdge ? 0 : 0.5, x0 = b[3] * mid, y0 = b[0] * mid, x1 = w - b[1] * mid, y1 = h - b[2] * mid, whole = b[0] && b[1] && b[2] && b[3];
  /* as CSS does, radii too large for the box are shrunk by one factor */
  var fit = Math.min(1, o.rx ? w / (2 * o.rx) : 1, o.ry ? h / (2 * o.ry) : 1), round = whole && Math.min(o.rx, o.ry) * fit >= 0.3 * thin;
  var rx = round ? Math.max(0, o.rx * fit - x0) : 0, ry = round ? Math.max(0, o.ry * fit - y0) : 0;
  if (round) {
    out.lines[0] = stroke(0, b[0], function (roll, k) {
      var p = [], q = [], starts = [], full = 4.5 * u * k * 0.8, amp = Math.min(full, (full * Math.min(rx, ry)) / (96 * u)), was = null;
      /* each point: x, y, the outward normal, and a weight, 0 on a corner and 1 at the middle of a straight run, so that a pill's long sides bend as a box's do */
      [[x1 - rx, y0 + ry, -90, 0, 1], [x1 - rx, y1 - ry, 0, -1, 0], [x0 + rx, y1 - ry, 90, 0, -1], [x0 + rx, y0 + ry, 180, 1, 0]].forEach(function (corner, j) {
        starts.push(p.length + 3);
        for (var i = 0; i <= 6; i++) { var t = ((corner[2] + 15 * i) * Math.PI) / 180; p.push([corner[0] + rx * Math.cos(t), corner[1] + ry * Math.sin(t), Math.cos(t), Math.sin(t), 0]); }
        var run = j % 2 ? x1 - x0 - 2 * rx : y1 - y0 - 2 * ry, n = Math.min(Math.floor(run / step), 400), end = p[p.length - 1];
        for (var m = 1; m <= n; m++) p.push([end[0] + (corner[3] * run * m) / (n + 1), end[1] + (corner[4] * run * m) / (n + 1), end[2], end[3], Math.sin((Math.PI * m) / (n + 1))]);
      });
      /* a dashed ring stops where it began: dashes laid over dashes would show out of step */
      var from = starts[Math.floor(roll() * 4)], p1 = roll() * 6.3, p2 = roll() * 6.3, p3 = roll() * 6.3, last = p.length + (o.broken ? 0 : 3);
      for (var i = 0; i <= last; i++) {
        /* a slow swell and a drift, so that the end misses the beginning */
        var at = p[(from + i) % p.length], t = ((from + i) * 2 * Math.PI) / p.length;
        var off = (amp + at[4] * (full - amp)) * (0.55 * Math.sin(t + p1) + 0.35 * Math.sin(2 * t + p2) + 0.2 * Math.sin(3 * t + p3)) + amp * 0.9 * (i / last - 0.5);
        /* with no straight run between two corners, one ends on the point the next begins with */
        if (!was || Math.hypot(at[0] - was[0], at[1] - was[1]) > 0.5) q.push([at[0] + at[2] * off, at[1] + at[3] * off]);
        was = at;
      }
      return through(q);
    });
  } else {
    [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].forEach(function (e, k) {
      if (b[k]) out.lines[k] = stroke(k, b[k], function (roll, more) { return line(roll, e[0], e[1], e[2], e[3], 4.5 * u * more); });
    });
  }
  if (!whole || !o.hatch) return out;
  var arc = function (x, y) { return round ? 'A' + n1(rx) + ' ' + n1(ry) + ' 0 0 1 ' + n1(x) + ' ' + n1(y) : ''; };
  out.wash = 'M' + n1(x0 + rx) + ' ' + n1(y0) + 'H' + n1(x1 - rx) + arc(x1, y0 + ry) + 'V' + n1(y1 - ry) + arc(x1 - rx, y1) + 'H' + n1(x0 + rx) + arc(x0, y1 - ry) + 'V' + n1(y0 + ry) + arc(x0 + rx, y0) + 'Z';
  var inside = function (x, y) {
    if (x < x0 || x > x1 || y < y0 || y > y1 || (o.skip && x > o.skip[0] && x < o.skip[2] && y > o.skip[1] && y < o.skip[3])) return false;
    var ex = x < x0 + rx ? x0 + rx - x : x > x1 - rx ? x - (x1 - rx) : 0, ey = y < y0 + ry ? y0 + ry - y : y > y1 - ry ? y - (y1 - ry) : 0;
    return !ex || !ey || (ex * ex) / (rx * rx) + (ey * ey) / (ry * ry) <= 1;
  };
  /* shading is two layers a few degrees apart, the second more open, and spared in a small box */
  var layer = function (k, lean, wide) {
    var d = '', roll = stream(k), turn = ((38 + lean + roll() * 10) * Math.PI) / 180, dx = -Math.sin(turn), dy = Math.cos(turn), gap = ((o.hatch === 2 ? 20 : 12) * wide * u) / dy, inch = 3 * u;
    for (var px = gap * (0.3 + roll() * 0.5); px < w - (h * dx) / dy && d.length < 6000; px += gap * (0.7 + roll() * 0.6)) {
      var trim = roll() * 2 * inch, from = -1;
      for (var a = 0; a <= h / dy + inch; a += inch) {
        var on = a <= h / dy && inside(px + dx * a, dy * a);
        if (on && from < 0) from = a;
        if (!on && from >= 0) {
          if (a - inch - from > 4 * inch) d += 'M' + n0(px + dx * (from + trim)) + ' ' + n0(dy * (from + trim)) + 'L' + n0(px + dx * (a - inch)) + ' ' + n0(dy * (a - inch));
          from = -1;
        }
      }
    }
    return d;
  };
  out.hatch = layer(21, 0, 1);
  if (thin > step) out.cross = layer(22, 7, 1.7);
  return out;
}

/* installSketch(kit)(stage, id) returns the pen for one rough scene: a call that sketches the scene as it stands, made after every render, since a scene may show a state by its borders.
 * It goes by what is drawn, a border or a flat colour, because the class names are the film's own. If the pen itself fails, the scene loses its sketch and plays on. */
function installSketch(kit) {
  var SVG = 'http://www.w3.org/2000/svg', SIDES = ['Top', 'Right', 'Bottom', 'Left'], CORNERS = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'], strokesFor = sketchBox, sheet = null;
  var LEFT_ALONE = /^(?:IMG|CANVAS|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|INPUT|TEXTAREA|SELECT|BUTTON|PROGRESS|METER|DETAILS|HR|BR|STYLE|TABLE|TD|TH|TR)$/, KITS_OWN = '.film-cursor,.film-chip';
  /* MOST: a scene of more elements is left clean, since each is read at every frame */
  var MOST = 300, DRAWABLE = /^(?:solid|dashed|dotted)$/, CLIPS = /^(?:hidden|clip|scroll|auto)$/, OUT_OF_FLOW = /^(?:absolute|fixed)$/;
  /* data-sketch on an element says what of its own is put aside while it is sketched. edge: its border's colour. fill: its background's. flow: it is position: static, and is made relative so that the strokes can be placed by it.
   * label: where its ::after is placed. shape: nothing; no rule reads it. */
  var RULES = '[data-sketch-on] [data-sketch~=edge]{border-color:transparent!important}' +
    '[data-sketch-on] [data-sketch~=fill]{background-color:transparent!important}[data-sketch-on] [data-sketch~=flow]{position:relative!important}' +
    '[data-sketch-on] [data-sketch~=label]::after{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:max-content!important;min-width:min-content!important;max-width:100%!important;margin:0!important;translate:none!important;rotate:none!important;scale:none!important;text-align:center!important}';
  /* named in inline styles, so that a film's plain rules for svg, path or "every child" do not reach these properties */
  var SVG_CSS = ';width:1px;height:1px;margin:0;padding:0;border:0;outline:0;box-sizing:content-box;display:block;visibility:inherit;opacity:1;transform:none;filter:none;clip-path:none;mix-blend-mode:normal;z-index:auto;overflow:visible;pointer-events:none';
  var PATH_CSS = ';transform:none;visibility:inherit;stroke-opacity:1;stroke-dashoffset:0;stroke-linecap:round;stroke-linejoin:round;opacity:';
  var n1 = function (n) { return String(Math.round(n * 10) / 10); };
  var isClear = function (c) { return !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c); };
  var isSet = function (v) { return /\(/.test(v || ''); };
  var toPx = function (v, of) { return /%$/.test(v) ? (parseFloat(v) / 100) * of : parseFloat(v) || 0; };
  var ink = function (color, width, kind, opacity) {
    var w = Number(width), dash = kind === 'dashed' ? w * 3.5 + ' ' + w * 3 : kind === 'dotted' ? '0.1 ' + w * 2.6 : 'none';
    return 'fill:none;stroke:' + color + ';stroke-width:' + width + 'px;stroke-dasharray:' + dash + PATH_CSS + opacity;
  };
  var isPens = function (n) { return n.namespaceURI === SVG && n.hasAttribute('data-sketch-pen'); };
  /* remembered for the length of one drawing */
  var memo = new Map(), position = function (n, pseudo) {
    var m = memo.get(n), k = pseudo || 'self';
    if (!m) memo.set(n, (m = {}));
    return k in m ? m[k] : (m[k] = n.ownerDocument.defaultView.getComputedStyle(n, pseudo).position);
  };
  /* Does el hold anything placed absolutely or fixed, a ::before or ::after too, that an ancestor of el positions? Made relative, el would position it instead. */
  var anchors = function (el) {
    var all = el.firstElementChild ? el.querySelectorAll('*') : [], out = function (n, pseudo) { return OUT_OF_FLOW.test(position(n, pseudo)); };
    for (var i = -1; i < all.length; i++) {
      var n = i < 0 ? el : all[i], inSvg = n.namespaceURI === SVG;
      if (inSvg && (isPens(n) || n.parentNode.namespaceURI === SVG)) continue;
      var self = i >= 0 && out(n, null);
      if (!self && (inSvg || !(out(n, '::before') || out(n, '::after')))) continue;
      for (var p = self ? n.parentElement : n; p !== el && position(p, null) === 'static'; p = p.parentElement);
      if (p === el) return true;
    }
    return false;
  };

  /* What to draw for an element, read from the film's own styles; null leaves it as the scene drew it. */
  var plan = function (s, u) {
    var el = s.el, cs = s.cs, w = el.offsetWidth, h = el.offsetHeight, thin = Math.min(w, h), share = (w * h) / (kit.W * kit.H), other = false;
    var raw = SIDES.map(function (side) { return parseFloat(cs['border' + side + 'Width']) || 0; });
    var sides = SIDES.map(function (side, i) {
      var kind = cs['border' + side + 'Style'], color = cs['border' + side + 'Color'];
      if (!raw[i] || !kind || kind === 'none' || kind === 'hidden' || isClear(color)) return null;
      if (!DRAWABLE.test(kind)) other = true;
      return { wide: raw[i], color: color, kind: kind };
    });
    var on = sides.filter(Boolean), flat = !isClear(cs.backgroundColor), empty = !el.textContent.trim() && [].every.call(el.children, isPens);
    if (!on.length && !(flat && empty)) return null;
    /* the pen runs along and past the border, where an element that clips would cut it off */
    if (!w || !h || other || CLIPS.test(cs.overflowX) || CLIPS.test(cs.overflowY) || isSet(cs.clipPath) || isSet(cs.maskImage) || isSet(cs.webkitMaskImage) || /paint|content|strict/.test(cs.contain) || isSet(cs.borderImageSource)) return null;
    /* the strokes are a positioned child, which an inline box or a table's part cannot hold */
    if (/^(?:inline|contents|table)/.test(cs.display) && !/^inline-(?:block|flex|grid)$/.test(cs.display)) return null;
    var whole = on.length === 4, alike = on.every(function (x) { return x.wide === on[0].wide && x.color === on[0].color && x.kind === on[0].kind; });
    var radii = CORNERS.map(function (c) { return cs['border' + c + 'Radius']; }), r = radii[0].split(' '), rx = toPx(r[0], w), ry = toPx(r[1] || r[0], h);
    var curved = radii.some(function (v) { var a = v.split(' '), x = toPx(a[0], w), y = toPx(a[1] || a[0], h); return Math.min(x, y) * Math.min(1, x ? w / (2 * x) : 1, y ? h / (2 * y) : 1) >= 0.3 * thin; });
    var meet = on.length > 0 && (raw[1] + raw[3] + 1 >= w || raw[0] + raw[2] + 1 >= h);
    /* a shape: empty, and filled by its background or by four like borders that meet. An empty flat colour over 29% of the stage or more is taken for the background. */
    var shape = empty && (on.length ? meet && whole && alike : share < 0.29);
    if (!on.length && !shape) return null;
    /* borders that meet at a corner, clear ones too, make a triangle; one border on an element of no thickness is a line */
    if (meet && !shape && sides.some(function (x, i) { return x && (raw[(i + 1) % 4] || raw[(i + 3) % 4]); })) return null;
    /* one line goes round a curve: not round an arch, a ring whose sides differ, or corners that differ */
    if (curved && (!radii.every(function (v) { return v === radii[0]; }) || (!shape && !(whole && alike)))) return null;
    var inFlow = cs.position === 'static';
    if (inFlow && anchors(el)) return null;
    var hatch = shape || !whole || !empty || flat || isSet(cs.backgroundImage) || share >= 0.29 ? 0 : share > 0.077 ? 2 : 1, skip = null, pad = 8 * u;
    var bar = shape && thin <= 8 * u, label = false;
    if (empty && !bar && (hatch || el.hasAttribute('data-label'))) {
      s.after = s.after || el.ownerDocument.defaultView.getComputedStyle(el, '::after');
      var lx = parseFloat(s.after.left) + raw[3], ly = parseFloat(s.after.top) + raw[0], lw = parseFloat(s.after.width), lh = parseFloat(s.after.height), room = w - raw[1] - raw[3];
      var moved = /^matrix\(1, 0, 0, 1, (-?[\d.e-]+), (-?[\d.e-]+)\)$/.exec(s.after.transform || '');
      if (moved) { lx += parseFloat(moved[1]); ly += parseFloat(moved[2]); }
      /* A placeholder's label (data-label, which the instructions' base.css draws with ::after) is put in the middle: at a corner it would cross a circle's line. One that the film put wholly outside is a caption, and stays.
       * Any other ::after stays where the film put it, counting a translate(). */
      var mx = parseFloat(s.after.marginLeft) || 0, my = parseFloat(s.after.marginTop) || 0;
      label = el.hasAttribute('data-label') && s.after.position === 'absolute' && lx + mx < w - raw[1] && ly + my < h - raw[2] && lx + mx + lw > raw[3] && ly + my + lh > raw[0];
      if (label) { lx = raw[3] + (room - lw) / 2; ly = raw[0] + (h - raw[0] - raw[2] - lh) / 2; }
      if (hatch && lw > 0 && lh > 0 && lx === lx && ly === ly) skip = [lx - pad, ly - pad, lx + lw + pad, ly + lh + pad];
    }
    return {
      w: w, h: h, left: raw[3], top: raw[0], fill: on.length ? on[0].color : cs.backgroundColor, sides: shape ? null : sides,
      mark: (shape ? (bar ? 'fill edge' : 'shape') : 'edge') + (inFlow ? ' flow' : '') + (label ? ' label' : ''),
      o: { u: u, sides: shape ? [2, 2, 2, 2] : sides.map(function (x) { return x ? x.wide : 0; }), onEdge: shape, bar: bar, broken: !shape && on[0].kind !== 'solid', rx: rx, ry: ry, hatch: hatch, skip: skip }
    };
  };

  return function (stage, id) {
    var known = new WeakMap(), owner = new WeakMap(), seed = 7, dead = false, said = false;
    for (var c = 0; c < id.length; c++) seed = (seed * 31 + id.charCodeAt(c)) % 2147483646;
    var off = function () {
      stage.removeAttribute('data-sketch-on');
      [].forEach.call(stage.querySelectorAll('svg[data-sketch-pen]'), function (n) { n.remove(); });
      [].forEach.call(stage.querySelectorAll('[data-sketch]'), function (n) { n.removeAttribute('data-sketch'); });
      known = new WeakMap();
    };
    var say = function (why) {
      if (!said) console.warn('player: rough scene ' + id + ' is shown without its sketch (' + why + '); nothing in the film needs changing');
      said = true;
    };
    var draw = function () {
      if (!stage.parentNode) return;
      var u = Math.sqrt(kit.W * kit.H) / 960, all = stage.querySelectorAll('*'), root = { path: seed, kids: 0, lone: 0 }, seen = [], strays = [], todo = [], fresh = [];
      var keyOf = function (s) { var d = plan(s, u); return { s: s, d: d, key: d ? JSON.stringify([s.path, d]) : '' }; };
      /* not kit.css, which places by the canvas: a scene may have taken the canvas into its box */
      if (!sheet || !sheet.parentNode) sheet = kit.stage.insertBefore(kit.el('style', { text: RULES }), kit.stage.firstChild);
      /* read with the rules off, so that what is read is the film's own; then written, all at once */
      stage.removeAttribute('data-sketch-on');
      memo.clear();
      for (var i = 0; i < all.length; i++) {
        var el = all[i], s = known.get(el);
        /* cloneNode and innerHTML copy the pen's strokes and marks */
        if (el.namespaceURI === SVG) { if (isPens(el) && owner.get(el) !== el.parentNode) strays.push(el); continue; }
        if (!s) { known.set(el, (s = { el: el, svg: null, paths: [], key: '', path: 0, kids: 0, lone: 0, after: null, cs: el.ownerDocument.defaultView.getComputedStyle(el) })); el.removeAttribute('data-sketch'); }
        /* The lines are seeded by where the element sits among its parent's elements, all the way down: only an earlier sibling that comes or goes moves them. What is left alone has a count of its own, so that the canvas,
         * which the runner moves in and out of a scene's box, does not change what is sketched beside it. An element whose parent is not known, as inside a film's own svg, counts among the box's own. */
        var up = known.get(el.parentNode) || root, alone = LEFT_ALONE.test(el.tagName) || el.closest(KITS_OWN);
        s.path = (up.path * 131 + (alone ? 65537 * ++up.lone : ++up.kids)) % 2147483646; s.kids = s.lone = 0;
        if (!alone && seen.push(s) > MOST) break;
      }
      /* for this frame alone: a frame follows from t, never from the frames before it */
      if (seen.length > MOST) { off(); return say('over ' + MOST + ' elements'); }
      seen.forEach(function (s) {
        var t = keyOf(s);
        if (t.key !== s.key || (t.d && s.svg.parentNode !== s.el)) todo.push(t);
      });
      stage.setAttribute('data-sketch-on', '');
      strays.forEach(function (n) { n.remove(); });
      todo.forEach(function (t) {
        var s = t.s, d = t.d, doc = s.el.ownerDocument;
        if (!d) { s.el.removeAttribute('data-sketch'); s.svg.remove(); s.key = ''; return; }
        if (!s.svg) { s.svg = doc.createElementNS(SVG, 'svg'); s.svg.setAttribute('data-sketch-pen', ''); s.svg.setAttribute('aria-hidden', 'true'); owner.set(s.svg, s.el); }
        if (s.svg.parentNode !== s.el) { s.el.appendChild(s.svg); fresh.push(t); }
        if (t.key === s.key) return;
        s.key = t.key;
        var k = strokesFor(s.path + 1, d.w, d.h, d.o), parts = [[k.wash, 'fill:' + d.fill + ';stroke:none' + PATH_CSS + 0.05], [k.hatch, ink(d.fill, k.fine, 'solid', 0.36)], [k.cross, ink(d.fill, k.fine, 'solid', 0.2)]], soft = {}, faint = {}, firm = {};
        k.lines.forEach(function (l, i) {
          if (!l) return;
          var side = (d.sides && d.sides[i]) || { color: d.fill, kind: 'solid' }, wide = function (part) { return n1(Number(l.width) * (d.o.bar ? 1 : 0.66) * part); };
          /* each pass thinner and fainter than the one over it; a bar's first is as thick as the bar */
          var b = ink(side.color, wide(1), side.kind, 0.88), a = ink(side.color, wide(0.74), side.kind, 0.5), e = ink(side.color, wide(0.55), side.kind, 0.32);
          firm[b] = (firm[b] || '') + l.main; faint[a] = (faint[a] || '') + l.again; if (l.third) soft[e] = (soft[e] || '') + l.third;
        });
        [soft, faint, firm].forEach(function (g) { for (var css in g) parts.push([g[css], css]); });
        s.el.setAttribute('data-sketch', d.mark);
        s.svg.setAttribute('style', 'position:absolute;left:' + -d.left + 'px;top:' + -d.top + 'px' + SVG_CSS);
        while (s.paths.length < parts.length) s.paths.push(s.svg.appendChild(doc.createElementNS(SVG, 'path')));
        while (s.paths.length > parts.length) s.paths.pop().remove();
        s.paths.forEach(function (p, i) { p.setAttribute('d', parts[i][0]); p.setAttribute('style', parts[i][1]); });
      });
      if (!fresh.length) return memo.clear();
      /* The strokes are a child, which :empty and its like can tell. Where the film's own styles ask for something else now that the child is there, they come off again, in this same drawing: sketched and clean by turns would flicker. */
      stage.removeAttribute('data-sketch-on');
      memo.clear();
      fresh = fresh.filter(function (t) { return keyOf(t.s).key !== t.key; });
      stage.setAttribute('data-sketch-on', '');
      fresh.forEach(function (t) { t.s.el.removeAttribute('data-sketch'); t.s.svg.remove(); t.s.key = ''; });
      memo.clear();
    };
    return function () {
      if (dead) return;
      try { draw(); } catch (e) {
        var why = 'error';
        dead = true;
        try { off(); why = String((e && e.message) || e).slice(0, 200); } catch (x) { /* the reason could not be read */ }
        said = false; say(why);
      }
    };
  };
}

;
/* A film written one scene at a time (payload-src/README.md, "A film made of scenes"). Dependency-free classic JS, concatenated into the runner ahead of runtime.js,
 * which calls installScenes(kit, sys). */

/* The record with its list, or a throw: one sentence, with no stack for the page to show. The page's reader is animation/scenes.ts. */
function readScenes(text) {
  var MOST = 24, LONGEST_S = 300, r = null;
  var fault = function (why) { var e = new Error('scenes.json: ' + why); e.stack = ''; return e; };
  try { r = JSON.parse(String(text)); } catch (e) { /* said below */ }
  if (!r || typeof r !== 'object' || r.v !== 1 || (r.stage !== 'rough' && r.stage !== 'final')) throw fault('must be JSON like {"v": 1, "stage": "rough", "scenes": [\u2026]}');
  var whole = function (v, d) { return Number.isInteger(v) && v >= 16 && v <= 4096 ? v : d; };
  var out = { stage: r.stage, width: whole(r.width, 1920), height: whole(r.height, 1080), fps: [24, 30, 60].indexOf(r.fps) < 0 ? 60 : r.fps,
    background: typeof r.background === 'string' && r.background !== '' && r.background.length <= 64 ? r.background : '#ffffff', scenes: null };
  if (!Array.isArray(r.scenes) || r.scenes.length < 1 || r.scenes.length > MOST) throw fault('"scenes" must list 1 to ' + MOST + ' scenes');
  var seen = Object.create(null), total = 0;
  out.scenes = r.scenes.map(function (s, i) {
    var n = 'scene ' + (i + 1);
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(s.id)) throw fault(n + ' needs an "id" of lower-case letters, digits and "-", starting with a letter, 32 characters at most');
    if (seen[s.id]) throw fault('two scenes are called ' + s.id);
    seen[s.id] = true;
    if (typeof s.dur !== 'number' || !isFinite(s.dur) || !(s.dur > 0)) throw fault(n + ' needs a "dur" in seconds, above 0');
    total += s.dur;
    return { id: s.id, name: (typeof s.name === 'string' ? s.name.trim().slice(0, 48).trim() : '') || s.id, dur: s.dur };
  });
  if (total > LONGEST_S) throw fault('the scenes add up to ' + Math.round(total * 100) / 100 + ' s; a film is ' + LONGEST_S + ' s at most');
  return out;
}

/* sys.run(name, kit, own): runs a js module with that kit in reach, own: as strict code in a scope of its own, and returns what it threw, or null. sys.reseed(n): starts Math.random afresh from n.
 * sys.late(fn): fn is told what deferred code throws while the film loads. sys.now(): the real clock, in ms. sys.voice: this viewer gets narrations. */
function installScenes(kit, sys) {
  /* Of the 20 s the page gives a film to load (film/host.ts), 15 are for the scenes' inits. One init may take 5 of them at most, and never what is kept for the scenes after it:
   * so one that hangs leaves the others time. */
  var LOAD_MS = 15000, MOST_MS = 5000, KEPT_MS = 250;
  var LATE = 'a timer, a listener or an unawaited promise threw while the film loaded: ';
  var run = sys.run, reseed = sys.reseed, mounting = null;
  var defs = Object.create(null), boxes = Object.create(null), cards = Object.create(null), kits = Object.create(null), said = Object.create(null);
  var list = null, open = null, scoreFn = null, voiceFn = null, shown = null, ground = '#ffffff', rough = false, frames = 0;
  var sketch = installSketch(kit), pens = Object.create(null);
  var file = function (id) { return 'scene-' + id + '.js'; };
  var words = function (e) { try { return String((e && e.message) || e || 'error').slice(0, 300); } catch (x) { return 'error'; } };
  /* logged once per scene and kind of fault, not per message: a message may hold the time, and render runs every frame */
  var tell = function (id, when, e) {
    if (said[id + when]) return;
    said[id + when] = true;
    console.error('scene ' + id + ': ' + words(e));
  };
  /* a scene's randomness follows from its id and its own clock, never from the scenes around it */
  var seed = function (id, t) {
    var h = 2166136261;
    for (var i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    reseed((h ^ Math.imul(Math.round(t * 1000) + 1, 2654435761)) >>> 0);
  };
  var box = function () { return kit.el('div', { style: 'position:absolute;inset:0;overflow:hidden;isolation:isolate' }); };
  /* What is rough is in black and white. For as long as a box given to grey() is on show, one filter on the film's stage greys the ground, the box, the canvas and what shared.js put beside them alike; a snapshot of the stage carries it.
   * What the film itself had there is put back afterwards. Round the stage lies #film-root, in the film's ground, of which a hairline can show: it takes the ground's grey meanwhile, where that can be told. */
  var greys = new WeakSet(), was = null;
  var tone = function () {
    var on = greys.has(shown);
    if (on === (was !== null)) return;
    var root = kit.stage.parentNode, p = rgb(), v = p && Math.round(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
    if (on) was = { filter: kit.stage.style.filter, round: root && root.style.background };
    kit.stage.style.filter = on ? 'grayscale(1)' : was.filter;
    if (root && p) root.style.background = on ? 'rgb(' + v + ', ' + v + ', ' + v + ')' : was.round;
    if (!on) was = null;
  };
  var grey = function (node) { greys.add(node); tone(); return node; };
  var show = function (node) {
    if (shown === node) return;
    if (shown) shown.remove();
    /* a scene may have taken the canvas into its box */
    if (kit.fxCanvas.parentNode !== kit.stage) kit.stage.appendChild(kit.fxCanvas);
    kit.stage.insertBefore(node, kit.fxCanvas);
    shown = node;
    tone();
  };
  /* the canvas spells most CSS colours as #rrggbb or rgba(): enough to tell a dark ground from a light one */
  var spelled = function (failing) {
    var x = kit.fx, before = x.fillStyle;
    x.fillStyle = failing; x.fillStyle = ground;
    var c = String(x.fillStyle);
    x.fillStyle = before;
    return c;
  };
  /* the ground's red, green and blue, if it is an opaque colour that the canvas spells so; what the canvas cannot read (a gradient, var()) it ignores, and so gives back whatever was there */
  var rgb = function () { var c = spelled('#ffffff'), m = c === spelled('#000000') && /^#(..)(..)(..)$/.exec(c); return m && m.slice(1).map(function (h) { return parseInt(h, 16); }); };
  /* White or black, whichever stands out more (WCAG's contrast) from the ground as the card shows it, greyed or not. At these strengths it is at least 3 to 1 on every ground that rgb() can read. */
  var ink = function (greyed) {
    var p = rgb() || (spelled('#ffffff').match(/[\d.]+/g) || [255, 255, 255]).map(Number).slice(0, 3), v = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    if (greyed) p = [v, v, v];
    var light = function (c) { return c.reduce(function (sum, x, i) { x /= 255; return sum + [0.2126, 0.7152, 0.0722][i] * (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); }, 0.05); };
    var apart = function (shade, a) { var l = light(p.map(function (x) { return x * (1 - a) + shade * a; })) / light(p); return l > 1 ? l : 1 / l; };
    return apart(255, 0.72) >= apart(0, 0.64) ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.64)';
  };
  var card = function (s) {
    if (!cards[s.id]) {
      /* Every film's stage is "rough" until its last write, even if all its scenes are written finished, so only a scene that says rough: true marks a rough cut. */
      var greyed = rough && list.some(function (x) { return defs[x.id] && defs[x.id].rough === true; });
      cards[s.id] = greyed ? grey(box()) : box();
      cards[s.id].appendChild(kit.el('div', { text: s.name, style: 'position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:0 8%;font:500 ' + Math.round(kit.H / 19) + 'px ' + kit.fonts.sans + ';color:' + ink(greyed) }));
    }
    return cards[s.id];
  };
  /* the film's kit on the scene's clock and in the scene's box */
  var scoped = function (stage, start, dur, me) {
    var k = Object.create(kit), into = function (n) { stage.appendChild(n); return n; };
    Object.defineProperties(k, { stage: { value: stage }, start: { value: start }, dur: { value: dur } });
    k.css = function (text) { return into(kit.el('style', { text: String(text) })); };
    k.cursor = function (kind) { var c = kit.cursor(kind); into(c.el); return c; };
    k.svgLayer = function () { return into(kit.svgLayer()); };
    k.chip = function (text, opts) { return into(kit.chip(text, opts)); };
    k.video = function (src, o) { return kit.video(src, Object.assign({}, o, { start: start + (Number(o && o.start) || 0) })); };
    k.typist = function () {
      var times = kit.typing.times, n = times.length, made = kit.typist.apply(kit, arguments);
      /* a failed scene's init may run on: what it types then is not the film's */
      if (me.gone) times.length = n;
      for (var i = n; i < times.length; i++) times[i] += start;
      return made;
    };
    /* What the module throws, or that there is none, is rethrown, so the scene's code that called exec can catch it.
     * It runs as in any film, with no scope of its own: the functions it declares land on window, which is how the caller gets them. */
    k.exec = function (name) { var e = run(name, k, false); if (e) throw e; };
    return k;
  };
  /* After the first throw of deferred code, init is waited for only a little longer: long enough for what else the same fault throws to fall to this scene, not the next. */
  var hurry = function (me) { if (me.no && !me.soon) me.soon = setTimeout(me.no, KEPT_MS, me.late); };
  /* what init returns; or a throw, once ms have gone by or hurry's wait is over */
  var within = function (p, ms, me) {
    if (!p || typeof p.then !== 'function') return p;
    var why = 'init was cut off after ' + (ms / 1000).toFixed(2) + ' s' + (ms < MOST_MS ? ', when the film\u2019s time to load ran out' : '');
    var timer, cut = new Promise(function (_, no) {
      me.no = no;
      if (me.late) hurry(me);
      timer = setTimeout(function () { no(new Error(why + (document.hidden === true ? ' (this tab was in the background)' : ''))); }, ms);
    });
    return Promise.race([p, cut]).finally(function () { clearTimeout(timer); clearTimeout(me.soon); me.no = null; });
  };
  /* The scene's box is on the stage while it loads, so that init can measure, and the canvas is blank, in its default state. A scene that fails leaves nothing behind: no box, no keystrokes for the score. */
  var mount = async function (s, start, ms) {
    var me = (mounting = { late: null, no: null, soon: 0, gone: false }), stage = box(), k = scoped(stage, start, s.dur, me), typed = kit.typing.times.length;
    var fault = function (e) {
      mounting = null; me.gone = true; kit.typing.times.length = typed;
      tell(s.id, 'load', e);
      if (me.late && me.late !== e) console.error(LATE + words(me.late));
    };
    kit.fxCanvas.width = kit.fxCanvas.width;
    show(stage);
    seed(s.id, 0);
    open = s.id;
    var e = run(file(s.id), k, true);
    open = null;
    if (e) return fault(e);
    var def = defs[s.id];
    if (!def) return fault('the module must call kit.scene(\'' + s.id + '\', { render(t, kit) { \u2026 } })');
    try {
      if (def.rough === true) grey(stage);
      if (typeof def.init === 'function') await within(def.init(k), ms, me);
      /* Its first frame is tried, so that a render that can never draw is a scene that failed. A promise is not waited for: one that never settles would hold up the film. */
      seed(s.id, 0);
      var r = def.render(0, k);
      if (r && typeof r.then === 'function') r.then(undefined, function () {});
      if (me.late) throw me.late;
      if (def.rough === true) (pens[s.id] = sketch(stage, s.id))();
      boxes[s.id] = stage; kits[s.id] = k; mounting = null;
    } catch (x) { fault(x); }
  };

  kit.scene = function (id, def) {
    if (open === null || id !== open) return void console.warn('kit.scene: ' + String(id).slice(0, 40) + ' is not this module\u2019s own scene; ignored');
    if (def && typeof def.render === 'function') defs[id] = def;
  };
  kit.score = function (fn) { if (typeof fn === 'function') scoreFn = fn; };
  kit.narration = function (fn) { if (typeof fn === 'function') voiceFn = fn; };
  kit.scenes = function () {
    var blank = function (init) { return { duration: 1, init: init, render: function () {} }; };
    var text = kit.module('scenes.json'), rec = null;
    /* the script may reach the page ahead of the list, whose arrival loads the film again */
    if (text == null) { console.warn('kit.scenes: no modules/scenes.json yet'); return blank(); }
    /* thrown from init, which the runner calls itself: of what a script throws as it is read, a browser may pass on no more than "Script error." */
    try { rec = readScenes(text); } catch (e) { return blank(function () { throw e; }); }
    list = rec.scenes; ground = rec.background; rough = rec.stage === 'rough';
    var at = [], T = Object.create(null), end = 0;
    list.forEach(function (s) { at.push(end); T[s.id] = end; end += s.dur; });
    T.END = end;
    var cut = {
      width: rec.width, height: rec.height, fps: rec.fps, duration: end, background: ground,
      chapters: list.map(function (s, i) { return { t: at[i], label: s.name }; }),
      init: async function () {
        var have = kit.modules(), css = kit.module('base.css'), t0 = sys.now();
        var written = list.filter(function (s) { return have.indexOf(file(s.id)) >= 0; }).length;
        /* The first thing deferred code throws is put down to the scene being brought up, whose own it most likely is. The rest, or with no such scene, is logged. Either way the film comes up. */
        sys.late(function (e) {
          if (!mounting || mounting.late) return console.error(LATE + words(e));
          mounting.late = e || new Error('error');
          hurry(mounting);
        });
        var aside = function (name) { var e = have.indexOf(name) < 0 ? null : run(name, kit, true); if (e) console.error(name + ': ' + words(e)); };
        if (css != null) kit.css(css);
        aside('shared.js');
        for (var i = 0; i < list.length; i++) if (have.indexOf(file(list[i].id)) >= 0) await mount(list[i], at[i], Math.max(KEPT_MS, Math.min(MOST_MS, LOAD_MS - (sys.now() - t0) - KEPT_MS * --written)));
        seed('score.js', 0);
        aside('score.js');
        if (scoreFn) cut.score = function (S) { seed('score.js', 0); scoreFn(S, T); };
        if (sys.voice) {
          /* narration.js gets a copy of T, and a kit.score call made as it is read, or as its function runs, is undone: the score is the same with the voice or without it */
          var score = scoreFn, lines = null;
          aside('narration.js');
          try { lines = voiceFn && voiceFn(Object.assign(Object.create(null), T)); } catch (e) { console.error('narration.js: ' + words(e)); }
          scoreFn = score;
          if (lines) cut.narration = lines;
        }
      },
      render: function (t) {
        var i = 0;
        while (i + 1 < list.length && t >= at[i + 1]) i++;
        var s = list[i], frame = ++frames;
        /* the one canvas starts every frame blank and in its default state, so that nothing one scene sets on kit.fx reaches another */
        kit.fxCanvas.width = kit.fxCanvas.width;
        if (!boxes[s.id]) return show(card(s));
        show(boxes[s.id]);
        seed(s.id, t - at[i]);
        /* a fault shows the card, and nothing the scene had drawn, for this frame alone: a frame follows from t, never from the frames before it */
        var fault = function (e) {
          tell(s.id, 'render', e);
          /* a rejection may land when a later frame is already up */
          if (frame !== frames) return;
          /* a canvas given its own width again is blank, with no clip, alpha or saved state left */
          kit.fxCanvas.width = kit.fxCanvas.width;
          show(card(s));
        };
        try {
          var r = defs[s.id].render(t - at[i], kits[s.id]), pen = pens[s.id];
          /* at once, and again when a promise settles: the browser may paint in between */
          if (pen) pen();
          if (r && typeof r.then === 'function') return (pen ? r.then(pen) : r).then(undefined, fault);
          return r;
        } catch (e) { fault(e); }
      }
    };
    return cut;
  };
  /* null: not a film made of scenes */
  return function () {
    var have = list && kit.modules();
    return list && list.map(function (s) { return { id: s.id, state: have.indexOf(file(s.id)) < 0 ? 'todo' : !boxes[s.id] ? 'failed' : defs[s.id].rough === true ? 'rough' : 'final' }; });
  };
}

;
/* Film runner: the one in-frame runtime (plain JS, no deps) — stage, cut evaluation, pure-in-t enforcement,
 * foreignObject raster, appifact-film:* protocol. Helpers ported from the original film kit. */
(function () {
'use strict';
var VERSION = 2;
var NS = 'appifact-film:';
var realParent = window.parent;
var origNow = performance.now.bind(performance);
var wallNow = Date.now.bind(Date); /* kept from before the film's Date, which reads the film clock */
function post(msg, transfer) { try { realParent.postMessage(msg, '*', transfer || []); } catch (e) { /* clone refusal: drop */ } }
function say(type, body, transfer) { var m = { type: NS + type }; if (body) for (var k in body) m[k] = body[k]; post(m, transfer); }

/* navigation sentinel (same reasoning as the kit embed runtime: registered before any author code) */
var navSentinel = function () { say('navigating', { at: wallNow() }); };
window.addEventListener('beforeunload', navSentinel);
window.addEventListener('pagehide', function (e) { if (e && e.persisted === true) return; navSentinel(); });

/* console + error forwarding: the host shows them, the CLI fails on errors */
var seenErrors = Object.create(null);
function fmt(a) { try { if (a instanceof Error) return String(a.stack || a.message || a); if (typeof a === 'object') return JSON.stringify(a); return String(a); } catch (e) { return String(a); } }
['log', 'info', 'warn', 'error'].forEach(function (level) {
  var orig = console[level] ? console[level].bind(console) : function () {};
  console[level] = function () { var parts = []; for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i])); var text = parts.join(' ').slice(0, 2000); orig.apply(null, arguments); say('console', { level: level, text: text }); };
});
function reportError(phase, err) {
  var message = String((err && err.message) || err || 'error').slice(0, 600);
  var stack = String((err && err.stack) || '').slice(0, 2000);
  var key = phase + '|' + message; if (seenErrors[key]) return; seenErrors[key] = 1;
  say('error', { phase: phase, message: message, stack: stack });
}
var PHASE = 'load', loadFailed = false, guarded = null, lateTo = null;
/* lateTo: in a film made of scenes, who is told of what deferred code (a timer, an onload, a promise nobody awaits) throws while the film loads, instead of the film failing */
window.addEventListener('error', function (e) {
  if (guarded) { guarded.error = e.error || new Error(String(e.message)); e.preventDefault(); return; }
  if (lateTo && PHASE === 'load') { lateTo(e.error || new Error(String(e.message))); e.preventDefault(); return; }
  if (PHASE === 'load') loadFailed = true; reportError(PHASE, e.error || e.message);
});
window.addEventListener('unhandledrejection', function (e) {
  if (lateTo && PHASE === 'load') { lateTo(e.reason); e.preventDefault(); return; }
  reportError(PHASE, e.reason);
});

/* focus containment: the stage is a picture — nothing in it may take keyboard focus from the player (lifted composers
 * carry autofocus/.focus()); a focus that lands anyway is bounced back to the host window */
try { HTMLElement.prototype.focus = function () {}; if (window.SVGElement) SVGElement.prototype.focus = function () {}; } catch (e) { /* leave */ }
window.addEventListener('focus', function () { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); realParent.focus(); } catch (e) { /* cross-origin focus refused: nothing else to do */ } });

/* ── helpers ported from the original film kit (engine.js) ───────────────────────────────────────────── */
var STAGE_W = 1920, STAGE_H = 1080;
var TYPING_TIMES = [];
// ── math ──────────────────────────────────────────────────────────────────
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const eo = x => 1 - Math.pow(1 - clamp01(x), 3);              // ease-out cubic
const ei = x => Math.pow(clamp01(x), 3);                      // ease-in cubic
const eio = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eoq = x => 1 - Math.pow(1 - clamp01(x), 4);             // ease-out quart
const eox = x => 1 - Math.pow(2, -10 * clamp01(x));           // ease-out expo
const eob = (x, c1 = 1.4) => { x = clamp01(x); const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }; // back-out (overshoot)
const spring = (x, damp = 6, freq = 2.2) => { x = clamp01(x); return 1 - Math.exp(-damp * x) * Math.cos(freq * Math.PI * 2 * x) * (1 - x); }; // gentle settle
const step = (t, a) => t >= a ? 1 : 0;
const pulse = (t, a, b) => (t >= a && t < b) ? 1 : 0;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// smooth 1-D value noise in [-1,1]
function vnoise(seed) { const r = rng(seed), tab = Array.from({ length: 256 }, () => r() * 2 - 1); return x => { const i = Math.floor(x), f = x - i, a = tab[i & 255], b = tab[(i + 1) & 255], u = f * f * (3 - 2 * f); return a + (b - a) * u; }; }

// per-character schedule for natural typing
function typist(text, t0, cps, seed = 7) {
  /* runner addition: every schedule's times also land in kit.typing.times (foley for the score) */
  const r = rng(seed); const times = []; let t = t0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let d = (1 / cps) * (0.55 + 0.9 * r());
    if (ch === ' ') d += 0.035; if (text[i - 1] === '.' || text[i - 1] === '!') d += 0.16;
    t += d; times.push(t);
  }
  for (const x of times) TYPING_TIMES.push(x);
  return { text, times, end: t, count(now) { let n = 0; while (n < times.length && times[n] <= now) n++; return n; }, at(now) { return text.slice(0, this.count(now)); } };
}
const streamed = (text, t, t0, cps = 95, chunk = 7) => { const n = Math.floor((t - t0) * cps / chunk) * chunk; return t < t0 ? '' : text.slice(0, Math.min(text.length, Math.max(0, n))); };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── stage-space geometry ──────────────────────────────────────────────────
let K = 1;                       // viewport fit scale (1 when recording)
const stageEl = () => document.getElementById('stage');
// rect of a node in STAGE coordinates (undoes the viewport fit only — includes camera zoom, i.e. "as seen on screen")
function srect(node) { const r = node.getBoundingClientRect(), s = stageEl().getBoundingClientRect(); return { x: (r.left - s.left) / K, y: (r.top - s.top) / K, w: r.width / K, h: r.height / K }; }
const center = (node, dx = 0, dy = 0) => () => { const r = srect(node); return [r.x + r.w / 2 + dx, r.y + r.h / 2 + dy]; };
// rect of a node in the un-zoomed scene space of a camera (so marks/cursor can be authored in scene coords)
function camrect(node, cam) { const r = srect(node), c = cam.state; return { x: (r.x - c.tx) / c.z, y: (r.y - c.ty) / c.z, w: r.w / c.z, h: r.h / c.z }; }

// rect (stage space) of a phrase inside an element's text — for underlines/circles on sub-strings. null if not found (e.g. not streamed yet)
function phraseRect(el, phrase) {
  if (!el) return null; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const i = n.data.indexOf(phrase); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + phrase.length); const rects = [...r.getClientRects()]; if (!rects.length) return null; const b = rects[rects.length - 1], s = stageEl().getBoundingClientRect(); return { x: (b.left - s.left) / K, y: (b.top - s.top) / K, w: b.width / K, h: b.height / K, lines: rects.length }; } }
  return null;
}
const phraseCamRect = (el, phrase, cam) => { const r = phraseRect(el, phrase); if (!r) return null; const c = cam.state; return { x: (r.x - c.tx) / c.z, y: (r.y - c.ty) / c.z, w: r.w / c.z, h: r.h / c.z }; };

// ── camera: wraps scene content; keys = [{t, cx, cy, z, ease?, cut?, from?, hold?, drift?}] ─────
// The view eases from key A to key B over [B.from ?? A.t + A.hold, B.t] (eio default; `ease: eox` = whip).
// `cut:true` on B = hard cut at B.t (A holds — and drifts — right up to it).
// `drift:[dx/s, dy/s, dlogz/s]` on A = slow creep while A holds; it accumulates until the ease toward B begins
// and is carried into that ease (no pop). So "hold + creep, then move" = give A `hold` (or B `from`) + `drift`.
class Camera {
  constructor(el) { this.el = el; this.keys = [{ t: 0, cx: STAGE_W / 2, cy: STAGE_H / 2, z: 1 }]; this.state = { tx: 0, ty: 0, z: 1, cx: 960, cy: 540 }; el.style.transformOrigin = '0 0'; }
  set(keys) { this.keys = keys.slice().sort((a, b) => a.t - b.t); return this; }
  at(t) {
    const ks = this.keys; let i = 0;
    for (let k = 0; k < ks.length; k++) if (ks[k].t <= t) i = k;
    const a = ks[i], b = ks[i + 1] || null;
    // ease start: b.from, else after a's optional hold
    const from = b ? (b.cut ? b.t : b.from !== undefined ? b.from : a.t + (a.hold || 0)) : Infinity;
    // a's state including its drift, which accumulates until the ease toward b begins (so nothing pops)
    const dT = Math.max(0, Math.min(t, from) - a.t);
    let cx = a.cx, cy = a.cy, z = a.z;
    if (a.drift) { cx += a.drift[0] * dT; cy += a.drift[1] * dT; z *= Math.exp((a.drift[2] || 0) * dT); }
    if (b && !b.cut && t > from) {
      const f = (b.ease || eio)(seg(t, from, b.t));
      z = Math.exp(lerp(Math.log(z), Math.log(b.z), f)); cx = lerp(cx, b.cx, f); cy = lerp(cy, b.cy, f);
    }
    return { cx, cy, z };
  }
  apply(t, extra) {
    const v = this.at(t); const z = v.z * (extra && extra.z || 1);
    const tx = STAGE_W / 2 - v.cx * z + (extra && extra.x || 0), ty = STAGE_H / 2 - v.cy * z + (extra && extra.y || 0);
    this.state = { tx, ty, z, cx: v.cx, cy: v.cy };
    this.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(5)})${extra && extra.rot ? ` rotate(${extra.rot}deg)` : ''}`;
    return this.state;
  }
}

// ── cursor: keys [{t, at:[x,y]|fn, bow?, lin?}], clicks [t…], holds [[a,b]…] ─
class Cursor {
  constructor(el) { this.el = el; this.gfx = el.querySelector('.cursor-gfx'); this.ring = el.querySelector('.cursor-ring'); this.keys = []; this.clicks = []; this.holds = []; this.ewSpans = []; this.shapes = []; this.cur = ''; this.visible = () => 1; }
  // shapes: [{ spans:[[a,b],…], gfx: CURSOR_COPY | CURSOR_NWSE | CURSOR_TEXT | svg }] checked before ewSpans
  pos(t) {
    const C = this.keys, P = k => typeof k.at === 'function' ? k.at() : k.at;
    if (!C.length) return [-100, -100];
    if (t <= C[0].t) return P(C[0]);
    for (let i = 0; i < C.length - 1; i++) {
      const a = C[i], b = C[i + 1];
      if (t >= a.t && t < b.t) {
        const p = b.lin ? seg(t, a.t, b.t) : eio(seg(t, a.t, b.t));
        const A = P(a), B = P(b); let x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p);
        if (b.bow) { const dx = B[0] - A[0], dy = B[1] - A[1]; const n = Math.sin(Math.PI * p) * b.bow; x += -dy * n; y += dx * n; }
        return [x, y];
      }
    }
    return P(C[C.length - 1]);
  }
  render(t) {
    const op = this.visible(t);
    this.el.style.display = op > 0.001 ? '' : 'none'; if (op <= 0.001) return;
    const [x, y] = this.pos(t);
    this.el.style.opacity = op; this.el.style.transform = `translate(${x}px, ${y}px)`;
    const ew = this.ewSpans.some(([a, b]) => t >= a && t < b);
    const sh = this.shapes.find(s => s.spans.some(([a, b]) => t >= a && t < b));
    // oxlint-disable-next-line appifacts/no-html-sink -- in-frame film runtime: a kit cursor constant or the cut's own shape SVG (shapes is set by the cut, whose code already runs in this frame)
    const g = sh ? sh.gfx : ew ? CURSOR_EW : CURSOR_ARROW; if (g !== this.cur) { this.gfx.innerHTML = g; this.cur = g; }
    let press = 0, ringAge = 9;
    for (const c of this.clicks) { const age = t - c; if (age >= 0 && age < ringAge) ringAge = age; if (age >= -0.04 && age < 0.14) press = 1; }
    const held = this.holds.some(([a, b]) => t >= a && t < b);
    this.gfx.style.transform = `scale(${press || held ? .86 : 1})`;
    this.ring.style.opacity = ringAge < 0.4 ? .55 * (1 - ringAge / 0.4) : 0;
    this.ring.style.transform = `scale(${lerp(.35, 1, eo(ringAge / 0.4))})`;
  }
}

/* cursor glyphs (parts.js) */
const CURSOR_ARROW = `<svg width="30" height="30" viewBox="0 0 24 24"><path d="M5.2 2.9v17.4l4.3-4.1 2.7 6.2 2.9-1.25-2.65-6.05h5.85z" fill="#111" stroke="#fff" stroke-width="1.35" stroke-linejoin="round"/></svg>`;
const CURSOR_EW = `<svg width="46" height="46" viewBox="0 0 24 24" style="margin:-23px 0 0 -23px"><path d="M2.5 12l4.2-4.2v2.7h10.6V7.8L21.5 12l-4.2 4.2v-2.7H6.7v2.7z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const CURSOR_NESW = `<svg width="46" height="46" viewBox="0 0 24 24" style="margin:-23px 0 0 -23px"><g transform="rotate(-45 12 12)"><path d="M2.5 12l4.2-4.2v2.7h10.6V7.8L21.5 12l-4.2 4.2v-2.7H6.7v2.7z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`;
const CURSOR_NWSE = `<svg width="46" height="46" viewBox="0 0 24 24" style="margin:-23px 0 0 -23px"><g transform="rotate(45 12 12)"><path d="M2.5 12l4.2-4.2v2.7h10.6V7.8L21.5 12l-4.2 4.2v-2.7H6.7v2.7z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`;
const CURSOR_COPY = `<svg width="40" height="40" viewBox="0 0 32 32"><path d="M5.2 2.9v17.4l4.3-4.1 2.7 6.2 2.9-1.25-2.65-6.05h5.85z" fill="#111" stroke="#fff" stroke-width="1.35" stroke-linejoin="round"/><circle cx="22.5" cy="22" r="7" fill="#34c84a" stroke="#fff" stroke-width="1.6"/><path d="M22.5 18.2v7.6M18.7 22h7.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
const CURSOR_GRAB = CURSOR_ARROW;
const CURSOR_TEXT = `<svg width="30" height="34" viewBox="0 0 24 28" style="margin:-17px 0 0 -12px"><path d="M8 3h3.2c.5 0 .8.3.8.8V24.2c0 .5-.3.8-.8.8H8M16 3h-3.2c-.5 0-.8.3-.8.8M16 25h-3.2c-.5 0-.8-.3-.8-.8M9.5 14h5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M8 3h3.2c.5 0 .8.3.8.8V24.2c0 .5-.3.8-.8.8H8M16 3h-3.2c-.5 0-.8.3-.8.8M16 25h-3.2c-.5 0-.8-.3-.8-.8M9.5 14h5" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/></svg>`;

/* default mark colour (a marker red); cuts pass their own */
const MARK_COLOR = '#e5484d';
const BOIL_FPS = 12;

// ── Marks ─────────────────────────────────────────────────────────────────
// A mark = { id, kind, t0 (draw start), dur (draw-on), out (time it starts erasing; optional), outDur,
//            color, width, seed, ...geometry }  Geometry is in the coordinate space of the SVG layer
// you pass to `new Marks(svg)` (stage space, or a camera's scene space if the svg sits inside the camera).
// kinds:  circle {x,y,w,h}  (bbox of the thing to circle; the ellipse is padded + tilted + overshoots)
//         underline {x,y,w} (baseline start + length; slight wave, hooks up at the end)
//         arrow {from:[x,y], to:[x,y], bend}  (curved shaft, then two head strokes)
//         bracket {x,y,h, side:'left'|'right'}
//         scribble {x,y,w,h} (zig-zag highlighter fill, drawn behind text — use low opacity or a pale tint)
//         burst {x,y,r, n}   (n short radiating ticks — "emphasis")
//         path {d:[[x,y],…]} (freehand polyline you supply; smoothed)
class Marks {
  constructor(svg) {
    this.svg = svg; this.items = []; this.nodes = new Map();
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    // one subtle roughen filter for all marks (single texture layer — never stack)
    if (!document.getElementById('mk-rough')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      // oxlint-disable-next-line appifacts/no-html-sink -- constant SVG filter markup, nothing interpolated
      defs.innerHTML = `<filter id="mk-rough" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2720" height="1880"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>`;
      // marks in camera space draw past the edges of a small stage, so the filter never covers less than it does at 1920×1080
      defs.firstElementChild.setAttribute('width', String(Math.max(1920, STAGE_W) + 800));
      defs.firstElementChild.setAttribute('height', String(Math.max(1080, STAGE_H) + 800));
      svg.appendChild(defs);
    }
  }
  // Pass geometry either as plain numbers or lazily via `geom: () => ({x,y,w,h})` (evaluated every frame —
  // use it for anything that moves or doesn't exist yet). `padPx` adds screen padding around a rect.
  add(m) { const d = Object.getOwnPropertyDescriptors(m); const o = { dur: 0.45, color: MARK_COLOR, width: 10, seed: 1, outDur: 0.3 }; Object.defineProperties(o, d); this.items.push(o); return this; }
  get(id) { return this.items.find(m => m.id === id); }
  clear() { this.items = []; for (const n of this.nodes.values()) n.remove(); this.nodes.clear(); }
  // build the polyline(s) for a mark at boil frame `bf` → array of point arrays (each = one stroke, drawn in sequence)
  strokes(m, bf) {
    if (typeof m.geom === 'function') { const gm = m.geom(); if (!gm) return []; Object.assign(m, gm); }
    if (m.kind === 'circle' || m.kind === 'scribble') { if (!(m.w > 0 && m.h > 0) || !isFinite(m.x + m.y)) return []; }
    const R = rng(m.seed * 7919 + 13), jit = vnoise(m.seed * 31 + bf * 977), J = (i, amp) => jit(i * 0.37 + bf * 3.1) * amp;
    const boilAmp = m.boil !== undefined ? m.boil : 1.1;
    const out = [];
    if (m.kind === 'circle') {
      const pad = m.pad !== undefined ? m.pad : 0.18;
      const cx = m.x + m.w / 2 + (R() - .5) * m.w * 0.04, cy = m.y + m.h / 2 + (R() - .5) * m.h * 0.06;
      const rx = m.padX !== undefined ? m.w / 2 + m.padX : m.w / 2 * (1 + pad) + m.h * 0.25, ry = m.padY !== undefined ? m.h / 2 + m.padY : m.h / 2 * (1 + pad) + Math.min(m.h * 0.35, 26);
      const tilt = (m.tilt !== undefined ? m.tilt : (-4 + R() * 5)) * Math.PI / 180;
      const a0 = (m.startDeg !== undefined ? m.startDeg : 195 + R() * 30) * Math.PI / 180, sweep = (m.sweepDeg !== undefined ? m.sweepDeg : 385 + R() * 30) * Math.PI / 180;
      const n1 = vnoise(m.seed * 3 + 1), n2 = vnoise(m.seed * 5 + 2);
      const N = 90, pts = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, a = a0 + sweep * u;
        // radius drifts outward over the sweep so the tail passes outside the start (open spiral), plus low-freq wobble
        const drift = 1 + 0.07 * u + 0.045 * n1(u * 3.2) ;
        const px = Math.cos(a) * rx * drift * (1 + 0.03 * n2(u * 4 + 1)), py = Math.sin(a) * ry * drift * (1 + 0.04 * n1(u * 4 + 7));
        const x = cx + px * Math.cos(tilt) - py * Math.sin(tilt) + J(i, boilAmp), y = cy + px * Math.sin(tilt) + py * Math.cos(tilt) + J(i + 500, boilAmp);
        pts.push([x, y]);
      }
      out.push(pts);
    } else if (m.kind === 'underline') {
      const n1 = vnoise(m.seed * 11 + 4); const N = 40, pts = [];
      const over = m.w * 0.04;
      for (let i = 0; i <= N; i++) { const u = i / N; const x = m.x - over + (m.w + 2 * over) * u; let y = m.y + n1(u * 2.3) * (m.wave !== undefined ? m.wave : 3.5) - u * (m.rise || 2); if (u > 0.93) y -= (u - 0.93) / 0.07 * (m.hook !== undefined ? m.hook : 7); pts.push([x + J(i, boilAmp), y + J(i + 300, boilAmp)]); }
      out.push(pts);
    } else if (m.kind === 'arrow') {
      const [x0, y0] = m.from, [x1, y1] = m.to; const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, bend = (m.bend !== undefined ? m.bend : 0.18) * len;
      const n1 = vnoise(m.seed * 13 + 5); const N = 44, shaft = [];
      for (let i = 0; i <= N; i++) { const u = i / N; const b = Math.sin(Math.PI * u) * bend + n1(u * 2) * 3; shaft.push([x0 + dx * u + nx * b + J(i, boilAmp), y0 + dy * u + ny * b + J(i + 200, boilAmp)]); }
      out.push(shaft);
      // head: two strokes back from the tip, angled off the final shaft direction
      const [ax, ay] = shaft[N - 3], tx = x1 - ax, ty = y1 - ay, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const hl = m.head !== undefined ? m.head : Math.min(46, len * 0.28), spread = 0.5;
      const h1 = [[x1, y1], [x1 - (ux * Math.cos(spread) - uy * Math.sin(spread)) * hl + J(7, boilAmp), y1 - (uy * Math.cos(spread) + ux * Math.sin(spread)) * hl + J(8, boilAmp)]];
      const h2 = [[x1, y1], [x1 - (ux * Math.cos(-spread) - uy * Math.sin(-spread)) * hl * 0.9 + J(9, boilAmp), y1 - (uy * Math.cos(-spread) + ux * Math.sin(-spread)) * hl * 0.9 + J(10, boilAmp)]];
      out.push(h1, h2);
    } else if (m.kind === 'bracket') {
      const s = m.side === 'right' ? -1 : 1, d = m.depth || 18, n1 = vnoise(m.seed + 9); const N = 30, pts = [];
      for (let i = 0; i <= N; i++) { const u = i / N; const y = m.y + m.h * u; const bulge = (u < 0.08 ? (0.08 - u) / 0.08 : u > 0.92 ? (u - 0.92) / 0.08 : 0) * d; pts.push([m.x + s * bulge + n1(u * 3) * 2 + J(i, boilAmp), y + J(i + 90, boilAmp)]); }
      out.push(pts);
    } else if (m.kind === 'scribble') {
      const rows = Math.max(3, Math.round(m.w / (m.h * 0.55))), pts = [], n1 = vnoise(m.seed + 21);
      for (let i = 0; i <= rows; i++) { const u = i / rows; const x = m.x + m.w * u + n1(i) * 4; const top = i % 2 === 0; pts.push([x + (top ? -m.h * 0.25 : m.h * 0.25) + J(i, boilAmp), (top ? m.y + m.h * 0.12 : m.y + m.h * 0.88) + J(i + 40, boilAmp * 1.5)]); }
      out.push(pts);
    } else if (m.kind === 'burst') {
      const n = m.n || 3, spread = m.spread || 70, base = (m.angle !== undefined ? m.angle : -90) - spread / 2;
      for (let k = 0; k < n; k++) { const a = (base + spread * (n === 1 ? 0.5 : k / (n - 1))) * Math.PI / 180; const r0 = m.r * 0.55, r1 = m.r * (0.95 + 0.12 * ((k * 37) % 3)); out.push([[m.x + Math.cos(a) * r0 + J(k, boilAmp), m.y + Math.sin(a) * r0 + J(k + 5, boilAmp)], [m.x + Math.cos(a) * r1 + J(k + 9, boilAmp), m.y + Math.sin(a) * r1 + J(k + 14, boilAmp)]]); }
    } else if (m.kind === 'check') {
      const s = m.size || 40; out.push([[m.x - s * 0.45 + J(1, boilAmp), m.y - s * 0.05 + J(2, boilAmp)], [m.x - s * 0.12 + J(3, boilAmp), m.y + s * 0.32 + J(4, boilAmp)], [m.x + s * 0.55 + J(5, boilAmp), m.y - s * 0.48 + J(6, boilAmp)]]);
    } else if (m.kind === 'cross') {
      const s = m.size || 40; out.push([[m.x - s / 2 + J(1, boilAmp), m.y - s / 2 + J(2, boilAmp)], [m.x + s / 2 + J(3, boilAmp), m.y + s / 2 + J(4, boilAmp)]]); out.push([[m.x + s / 2 + J(5, boilAmp), m.y - s / 2 + J(6, boilAmp)], [m.x - s / 2 + J(7, boilAmp), m.y + s / 2 + J(8, boilAmp)]]);
    } else if (m.kind === 'path') {
      out.push(m.d.map(([x, y], i) => [x + J(i, boilAmp), y + J(i + 60, boilAmp)]));
    }
    return out;
  }
  static toPath(pts) {
    if (pts.length < 3) return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    // Catmull-Rom → cubic bezier for a smooth hand line
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)},${c2x.toFixed(1)} ${c2y.toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  render(t) {
    const bf = Math.floor(t * BOIL_FPS);
    for (const m of this.items) {
      const gone = m.out !== undefined && t >= m.out + m.outDur;
      const on = t >= m.t0 && !gone && !(m.until !== undefined && t >= m.until);
      let g = this.nodes.get(m);
      if (!on) { if (g) g.style.display = 'none'; continue; }
      if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); this.svg.appendChild(g); this.nodes.set(m, g); }
      g.style.display = '';
      const strokes = this.strokes(m, m.still ? 0 : bf);
      while (g.childNodes.length < strokes.length) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); g.appendChild(p); }
      // draw-on progress is distributed over strokes by their length
      const lens = strokes.map(s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; });
      const total = lens.reduce((a, b) => a + b, 0) || 1;
      const drawn = (m.ease || (x => 1 - Math.pow(1 - x, 2.4)))(seg(t, m.t0, m.t0 + m.dur)) * total;
      const erased = m.out !== undefined ? eio(seg(t, m.out, m.out + m.outDur)) * total : 0;
      let acc = 0;
      const wj = m.still ? 1 : 1 + 0.04 * vnoise(m.seed + 77)(bf * 1.7); // stroke-weight boil
      for (let i = 0; i < g.childNodes.length; i++) {
        const p = g.childNodes[i];
        if (i >= strokes.length) { p.style.display = 'none'; continue; }
        p.style.display = '';
        const L = lens[i], vis0 = clamp(erased - acc, 0, L), vis1 = clamp(drawn - acc, 0, L); acc += L;
        p.setAttribute('d', Marks.toPath(strokes[i]));
        p.setAttribute('stroke', m.color); p.setAttribute('stroke-width', (m.width * wj).toFixed(2));
        if (m.opacity !== undefined) p.setAttribute('opacity', m.opacity);
        if (m.rough !== false) p.setAttribute('filter', 'url(#mk-rough)');
        // dash: show [vis0, vis1]
        const shown = Math.max(0, vis1 - vis0);
        p.setAttribute('stroke-dasharray', `${shown.toFixed(1)} ${(L + 50).toFixed(1)}`);
        p.setAttribute('stroke-dashoffset', (-vis0).toFixed(1));
        p.style.opacity = shown < 0.5 ? 0 : (m.opacity !== undefined ? m.opacity : 1);
      }
    }
  }
}

// ── Text: fade from right (words drift ~24px leftward, ~110ms apart) ──────
const TextFx = {
  split(el) { if (el.__words) return el.__words; const text = el.textContent; el.textContent = ''; const words = text.split(/(\s+)/); const spans = []; for (const w of words) { if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); continue; } if (!w) continue; const s = document.createElement('span'); s.textContent = w; s.style.display = 'inline-block'; s.style.willChange = 'opacity, transform'; el.appendChild(s); spans.push(s); } el.__words = spans; return spans; },
  // p in: t0..; each word i starts at t0 + i*stagger, lasts dur
  fadeFromRight(el, t, t0, o = {}) { const { stagger = 0.11, dur = 0.5, dx = 26 } = o; const ws = TextFx.split(el); ws.forEach((s, i) => { const p = eo(seg(t, t0 + i * stagger, t0 + i * stagger + dur)); s.style.opacity = p; s.style.transform = `translateX(${((1 - p) * dx).toFixed(1)}px)`; }); return t0 + (ws.length - 1) * stagger + dur; },
  fadeOutLeft(el, t, t0, o = {}) { const { stagger = 0.07, dur = 0.35, dx = 22 } = o; const ws = TextFx.split(el); ws.forEach((s, i) => { const p = ei(seg(t, t0 + i * stagger, t0 + i * stagger + dur)); if (t >= t0) { s.style.opacity = 1 - p; s.style.transform = `translateX(${(-p * dx).toFixed(1)}px)`; } }); },
  inOut(el, t, tIn, tOut, o) { if (tOut !== undefined && t >= tOut) TextFx.fadeOutLeft(el, t, tOut, o); else TextFx.fadeFromRight(el, t, tIn, o); },
};

// ── Shapes: cut-paper polygons ────────────────────────────────────────
// cutPaper(seed, n, irregularity) → unit polygon (radius≈1) with straight edges at uneven angles.
function cutPaper(seed = 1, n = 7, irr = 0.28) { const r = rng(seed * 977 + 3); const pts = []; let a = r() * Math.PI * 2; for (let i = 0; i < n; i++) { a += (Math.PI * 2 / n) * (0.7 + 0.6 * r()); const rad = 1 - irr * r(); pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); } return pts; }
const polyLerp = (A, B, p) => A.map((a, i) => [lerp(a[0], B[i % B.length][0], p), lerp(a[1], B[i % B.length][1], p)]);
const polyStr = (pts, cx, cy, sx, sy, rot = 0) => { const c = Math.cos(rot), s = Math.sin(rot); return pts.map(([x, y]) => `${(cx + (x * c - y * s) * sx).toFixed(1)},${(cy + (x * s + y * c) * sy).toFixed(1)}`).join(' '); };
// breathing scale for held shapes (never fully still)
const breathe = (t, amt = 0.012, period = 3.2) => 1 + amt * Math.sin(t * Math.PI * 2 / period);


/* ── runner ────────────────────────────────────────────────────────────────────────────────────────────────── */
var root = null, stage = null, fxCanvas = null, fxCtx = null, fontStyle = null;
var CUT = null, META = null, SCORE = { events: [], master: { gain: -6, fadeOut: 1 } }, NARRATION = null, CAPTIONS = null, captioner = typeof filmCaptions === 'object' ? filmCaptions : null;
var MODULES = Object.create(null), ASSETS = Object.create(null);
/* system stacks; a film may ship its own font assets (registered below by file stem), may say which family heads a stack, and a person may put one at the head of any (load, d.faces). display: the sans stack, unless a face is named or picked for it */
var FONT_FAMILIES = { sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', serif: 'ui-serif, Georgia, "Times New Roman", serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
var STACKS = { sans: FONT_FAMILIES.sans, serif: FONT_FAMILIES.serif, mono: FONT_FAMILIES.mono }, FILLED = [];
var FONT_PROBES = [];
var FONT_CSS = '';
/* p: a font shorthand, alone or with text that the face is for: a face with a unicode-range is loaded only for text in it */
function loadFace(p) { return (typeof p === 'string' ? document.fonts.load(p) : document.fonts.load(p[0], p[1])).catch(function () { return null; }); }
/* each field is matched before it is joined into CSS: some faces come from outside (film/fetch-faces.ts) */
var FACE_FIELDS = { family: /^[A-Za-z0-9 _-]{1,64}$/, url: /^data:font\/woff2;base64,[A-Za-z0-9+\/]+={0,2}$/, weight: /^[0-9]{1,4}(?: [0-9]{1,4})?$/, style: /^(?:normal|italic)$/, range: /^(?:U\+[0-9A-F]{1,6}(?:-[0-9A-F]{1,6})?(?:,(?=U)|$))*$/ };
/* faces from the page (film/looks), shipped or fetched: real families with a weight range, and a line box if they give one, beside the film's own font assets. Resolves once all of them are loaded */
function addFonts(list) {
  var had = FONT_CSS, probes = (Array.isArray(list) ? list : []).filter(function (f) { return f && Object.keys(FACE_FIELDS).every(function (k) { return k === 'range' && f[k] === undefined ? true : typeof f[k] === 'string' && FACE_FIELDS[k].test(f[k]); }); }).map(function (f) {
    var face = '\n@font-face{font-family:"' + f.family + '";src:url(' + f.url + ') format("woff2");font-weight:' + f.weight + ';font-style:' + f.style + (f.range ? ';unicode-range:' + f.range : '') + (f.box ? ';ascent-override:' + Number(f.box[0]) + '%;descent-override:' + Number(f.box[1]) + '%;line-gap-override:0%' : '') + ';font-display:block}', probe = [f.style + ' ' + f.weight.split(' ')[0] + ' 16px "' + f.family + '"', typeof f.sample === 'string' && f.sample.length <= 2 ? f.sample : ' '];
    if (FONT_CSS.indexOf(face) < 0) { FONT_CSS += face; FONT_PROBES.push(probe); }
    return probe;
  });
  if (fontStyle && FONT_CSS !== had) fontStyle.textContent = FONT_CSS;
  return Promise.all(probes.map(loadFace));
}
var filmT = 0, rand = rng(1);
/* CLOCK (film/scene-clock.js) maps the player's time to the film's own; null: the two are one. RATE: the film's seconds per played second at the frame on the stage. The prelude's functions are taken now: a film may declare the same names. */
var CLOCK = null, RATE = 1, partsOf = typeof filmParts === 'function' && filmParts, clockOf = typeof sceneClock === 'function' && sceneClock, warped = typeof warpScore === 'function' && warpScore;
var EPOCH = Date.UTC(2026, 0, 1, 12, 0, 0);
var loaded = false, renderIsAsyncWarned = false;
var imageCache = Object.create(null);
var plateBytes = 0, plateCount = 0;

/* B5 determinism: the film clock is the only clock; randomness reseeds per rendered t */
function setFilmTime(t) { filmT = t; rand = rng(((Math.round(t * 1000) + 1) * 2654435761) >>> 0); }
var OrigDate = Date;
/* zero-argument Date()/new Date()/Date.now() read the film clock; explicit dates pass through */
function FilmDate() {
  var args = [].slice.call(arguments);
  if (args.length === 0) args = [EPOCH + Math.round(filmT * 1000)];
  if (typeof new.target === 'undefined') return new (OrigDate.bind.apply(OrigDate, [null].concat(args)))().toString();
  return new (OrigDate.bind.apply(OrigDate, [null].concat(args)))();
}
FilmDate.prototype = OrigDate.prototype; FilmDate.UTC = OrigDate.UTC; FilmDate.parse = OrigDate.parse;
FilmDate.now = function () { return EPOCH + Math.round(filmT * 1000); };
window.Date = FilmDate;
try { performance.now = function () { return filmT * 1000; }; } catch (e) { /* non-writable: leave */ }
Math.random = function () { return rand(); };

function b64(buf) { var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, Math.min(i + CH, u.length))); return btoa(s); }
function dataUrl(mime, buf) { return 'data:' + mime + ';base64,' + b64(buf); }
// oxlint-disable-next-line appifacts/no-html-sink -- kit.h(): the markup helper this in-frame runtime offers the cut's own code (which already runs in this frame)
function h(html) { var t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; }
function el(tag, props, children) {
  var n = document.createElement(tag); props = props || {};
  for (var k in props) { var v = props[k]; if (v == null) continue;
    if (k === 'class') n.className = v; else if (k === 'style' && typeof v === 'object') { for (var s in v) n.style[s] = v[s]; } else if (k === 'style') n.style.cssText = v;
    // oxlint-disable-next-line appifacts/no-html-sink -- kit.el({ html }): same contract as h() above, markup supplied by the cut's own code inside the film frame
    else if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v; else if (k === 'attrs') { for (var a in v) n.setAttribute(a, v[a]); } else n[k] = v; }
  (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return n;
}

/* kit.fonts for a css module, which cannot read the kit: var(--sans) always, and var(--serif), var(--mono), var(--display) where the film names a face for that stack, or a person has picked one. On the root and in :where(), so that a film's own property of the name, on the root or nearer, wins.
 * Not otherwise: a film that says var(--serif, Georgia, serif), or uses such a name for something of its own, and has no face named or picked for it goes on as it was */
function stackCss() { return ':where(:root){' + ['sans'].concat(FILLED.filter(function (s) { return s !== 'sans'; })).map(function (s) { return '--' + s + ':' + FONT_FAMILIES[s]; }).join(';') + '}'; }
function buildStage(W, H, background) {
  if (root) root.remove();
  root = el('div', { attrs: { id: 'film-root' }, style: 'position:fixed;inset:0;overflow:hidden;background:' + (background || '#ffffff') });
  stage = el('div', { attrs: { id: 'stage' }, style: 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;overflow:hidden;transform-origin:0 0;background:' + (background || '#ffffff') });
  fontStyle = el('style', { attrs: { id: 'film-fonts' }, text: FONT_CSS });
  var reset = el('style', { attrs: { id: 'film-reset' }, text: stackCss() + '#stage{text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased;font-kerning:normal}#stage,#stage *,#stage *::before,#stage *::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}#stage ::-webkit-scrollbar{display:none}' });
  fxCanvas = el('canvas', { attrs: { id: 'fx', width: String(W), height: String(H) }, style: 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;z-index:2147483647' });
  fxCtx = fxCanvas.getContext('2d');
  stage.appendChild(fontStyle); stage.appendChild(reset); stage.appendChild(fxCanvas);
  root.appendChild(stage); document.body.appendChild(root);
  fit();
}
var fitW = -1, fitH = -1; /* the iframe's size at the last fit */
function fit() {
  if (!stage) return;
  fitW = window.innerWidth; fitH = window.innerHeight;
  var iw = fitW || STAGE_W, ih = fitH || STAGE_H;
  K = Math.min(iw / STAGE_W, ih / STAGE_H) || 1;
  stage.style.transform = 'scale(' + K + ')';
  stage.style.left = ((iw - STAGE_W * K) / 2) + 'px'; stage.style.top = ((ih - STAGE_H * K) / 2) + 'px';
}
window.addEventListener('resize', function () { fit(); retell(); });

/* ── kit (the cut's whole world) ── */
function cursorEl(kind) {
  var c = el('div', { class: 'film-cursor', style: 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483646;pointer-events:none' });
  // oxlint-disable-next-line appifacts/no-html-sink -- constant cursor markup plus `kind`: a kit cursor constant or SVG the cut passes to kit.cursor(kind), inside the film frame
  c.innerHTML = '<div class="cursor-ring" style="position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(20,20,19,.55);opacity:0"></div><div class="cursor-gfx" style="position:absolute;left:-4px;top:-3px;transform-origin:4px 3px">' + (kind || CURSOR_ARROW) + '</div>';
  return c;
}
function findModule(name) {
  name = String(name);
  if (Object.prototype.hasOwnProperty.call(MODULES, name)) return MODULES[name];
  if (name.indexOf('.') >= 0) return null;
  var hits = Object.keys(MODULES).filter(function (k) { return k.slice(0, name.length + 1) === name + '.' && k.indexOf('.', name.length + 1) < 0; });
  return hits.length === 1 ? MODULES[hits[0]] : null;
}
function makeKit() {
  var kit = {
    version: VERSION,
    get W() { return STAGE_W; }, get H() { return STAGE_H; },
    get stage() { return stage; }, get fx() { return fxCtx; }, get fxCanvas() { return fxCanvas; },
    el: el, h: h, esc: esc,
    css: function (text) { var s = el('style', { text: String(text) }); stage.insertBefore(s, fxCanvas); return s; },
    /* modules are named by file name ("app.css"); a bare stem ("app") finds its one match too */
    module: function (name) { var m = findModule(name); return m ? m.text : null; },
    json: function (name) { var t = kit.module(name); if (t == null) return null; try { return JSON.parse(t); } catch (e) { console.error('kit.json(' + name + '): ' + e.message); return null; } },
    exec: function (name) { var m = findModule(name); if (!m) { console.error('kit.exec: no module ' + name); return; } injectScript(m.text, 'module ' + name); },
    modules: function () { return Object.keys(MODULES); },
    assets: {
      has: function (n) { return Object.prototype.hasOwnProperty.call(ASSETS, n); },
      list: function () { return Object.keys(ASSETS); },
      url: function (n) { var a = ASSETS[n]; if (!a) { console.error('kit.assets: no asset ' + n); return ''; } return a.url; },
      mime: function (n) { var a = ASSETS[n]; return a ? a.mime : ''; },
      bytes: function (n) { var a = ASSETS[n]; return a && a.buffer ? new Uint8Array(a.buffer.slice(0)) : null; },
      text: function (n) { var a = ASSETS[n]; return a && a.buffer ? new TextDecoder().decode(a.buffer) : null; },
      image: function (n) { if (imageCache[n]) return imageCache[n]; var a = ASSETS[n]; if (!a) return Promise.reject(new Error('no asset ' + n));
        imageCache[n] = new Promise(function (res, rej) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { rej(new Error('asset ' + n + ' did not decode')); }; img.src = a.url; }); return imageCache[n]; },
      size: function (n) { var a = ASSETS[n]; return a && a.w ? { w: a.w, h: a.h } : null; }
    },
    cursors: { arrow: CURSOR_ARROW, ew: CURSOR_EW, nesw: CURSOR_NESW, nwse: CURSOR_NWSE, copy: CURSOR_COPY, text: CURSOR_TEXT },
    fonts: FONT_FAMILIES,
    typing: { times: TYPING_TIMES },
    /* math + timing */
    clamp01: clamp01, clamp: clamp, seg: seg, lerp: lerp, eo: eo, ei: ei, eio: eio, eoq: eoq, eox: eox, eob: eob, spring: spring, step: step, pulse: pulse, rng: rng, vnoise: vnoise,
    smoothstep: function (a, b, x) { var p = clamp01((x - a) / (b - a)); return p * p * (3 - 2 * p); },
    typist: typist, streamed: streamed,
    srect: srect, center: center, camrect: camrect, phraseRect: phraseRect, phraseCamRect: phraseCamRect,
    Camera: Camera, Cursor: Cursor, Marks: Marks, TextFx: TextFx, cutPaper: cutPaper, polyLerp: polyLerp, polyStr: polyStr, breathe: breathe,
    /* a muted clip placed like any element; the runner keeps every stage <video> at film time t − start (loop honoured), plays it
     * with the transport and seeks it for scrubs and exported frames; kit.seek(video, s) in render shows exactly second s instead (stepped live) */
    video: function (src, o) { o = o || {}; var v = el('video', { muted: true, playsInline: true, preload: 'auto', loop: !!o.loop, attrs: { 'data-start': String(o.start || 0) }, class: o.class, style: o.style });
      src = String(src || ''); if (Object.prototype.hasOwnProperty.call(ASSETS, src)) src = ASSETS[src].url; else if (!/[:\/]/.test(src)) console.error('kit.video: no asset ' + src);
      watchVideo(v); v.src = src; return v; },
    seek: function (video, s) { if (video && video.tagName === 'VIDEO' && isFinite(s)) videoSeeks.set(video, Number(s)); },
    cursor: function (kind) { var c = cursorEl(kind); stage.insertBefore(c, fxCanvas); return new Cursor(c); },
    svgLayer: function () { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', STAGE_W); s.setAttribute('height', STAGE_H); s.setAttribute('viewBox', '0 0 ' + STAGE_W + ' ' + STAGE_H); s.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible'; stage.insertBefore(s, fxCanvas); return s; },
    /* caption chip (walkthrough look: white pill, 26px sans, optional 1.5px leader to an anchor dot) + spotlight */
    chip: function (text, opts) { opts = opts || {}; var x = opts.x != null ? opts.x : STAGE_W / 2, y = opts.y != null ? opts.y : STAGE_H - 120;
      var c = el('div', { class: 'film-chip', style: 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483645;opacity:0;pointer-events:none' });
      if (opts.anchor) { var ax = opts.anchor[0] - x, ay = opts.anchor[1] - y, len = Math.hypot(ax, ay), ang = Math.atan2(ay, ax) * 180 / Math.PI;
        c.appendChild(el('div', { class: 'film-chip-line', style: 'position:absolute;left:0;top:-0.75px;width:' + len.toFixed(1) + 'px;height:1.5px;background:' + (opts.lineColor || '#111') + ';transform-origin:0 50%;transform:rotate(' + ang.toFixed(2) + 'deg)' }));
        c.appendChild(el('div', { class: 'film-chip-dot', style: 'position:absolute;left:' + (ax - 5) + 'px;top:' + (ay - 5) + 'px;width:10px;height:10px;border-radius:50%;background:' + (opts.dotColor || '#111') + ';box-shadow:0 0 0 3px #fff' })); }
      c.appendChild(el('div', { class: 'film-chip-pill', text: text, style: 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);padding:12px 22px;border-radius:999px;background:#fff;color:#111;font:500 26px/1.25 ' + FONT_FAMILIES.sans + ';letter-spacing:.005em;white-space:nowrap;box-shadow:0 6px 24px rgba(20,20,19,.14),0 0 0 1px rgba(20,20,19,.06)' + (opts.style ? ';' + opts.style : '') }));
      c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; c.__xy = [x, y]; stage.insertBefore(c, fxCanvas); return c; },
    /* fade/raise a chip (or any absolutely placed node) in at tIn and out at tOut */
    show: function (node, t, tIn, tOut, o) { o = o || {}; var d = o.dur || 0.35, dy = o.dy == null ? 12 : o.dy; var p = eo(seg(t, tIn, tIn + d)); if (tOut != null) p *= 1 - ei(seg(t, tOut, tOut + d));
      node.style.opacity = p; var xy = node.__xy; node.style.transform = (xy ? 'translate(' + xy[0] + 'px,' + xy[1] + 'px) ' : '') + 'translateY(' + ((1 - p) * dy).toFixed(1) + 'px)'; return p; },
    spotlight: function (rect, amount, o) { o = o || {}; if (!(amount > 0.001) || !rect) return; var x = fxCtx, pad = o.pad == null ? 24 : o.pad, r = o.radius == null ? 18 : o.radius; x.save(); x.fillStyle = 'rgba(20,20,19,' + (0.55 * amount).toFixed(3) + ')'; x.beginPath(); x.rect(0, 0, STAGE_W, STAGE_H); roundRectPath(x, rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2, r); x.fill('evenodd'); x.restore(); },
    raster: raster,
    plateStats: function () { return { count: plateCount, bytes: plateBytes }; }
  };
  return kit;
}
function roundRectPath(x, X, Y, W, H, r) { r = Math.min(r, W / 2, H / 2); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
var KIT = null, SCENES = function () { return null; }, LOOK = function () { return null; }; /* LOOK(): the film's kit.look(), once something has asked for it */

function injectScript(code, label, own) {
  var s = document.createElement('script');
  /* block scope + kit in reach; a thrown error surfaces through window 'error' with PHASE.
   * own: strict code in a function's scope instead, so that no var, function or undeclared name at its top level reaches window, where another module's could meet it */
  s.text = (own ? '(function () { "use strict"; const kit = window.__filmKit;\n' : '{ const kit = window.__filmKit;\n') + String(code) + (own ? '\n})();' : '\n}') + '\n//# sourceURL=' + String(label || 'cut').replace(/[^A-Za-z0-9_.\/ -]/g, '_') + '\n';
  document.body.appendChild(s);
  s.remove();
}

/* What a script put into the page throws goes to window 'error', during the call, never to the caller: a try alone would catch nothing. Returns it, or null.
 * kit: what the code sees as kit. own: as for injectScript. One such script may run another. */
function tryScript(code, label, kit, own) {
  var outer = guarded, outerKit = window.__filmKit, g = (guarded = { error: null });
  window.__filmKit = kit;
  try { injectScript(code, label, own); } finally { guarded = outer; window.__filmKit = outerKit; }
  return g.error;
}

/* ── video clock: stage <video>s follow film time (render: play/hold; frame pulls: seek and wait) ── */
var videoSeeks = new Map();
function vwarn(v, k, msg) { v.__filmWarned = v.__filmWarned || {}; if (v.__filmWarned[k]) return; v.__filmWarned[k] = 1; console.warn('video ' + (v.id ? '#' + v.id + ' ' : '') + msg); }
/* the clip time for film time t: kit.seek's value, else t − data-start; looped or clamped once the duration is known (an unknown or
 * infinite duration is neither); +½ ms so a frame boundary reached through float arithmetic lands on that frame, not the one before */
function videoTime(v, t) {
  var explicit = videoSeeks.has(v), lt = explicit ? videoSeeks.get(v) : t - (Number(v.getAttribute('data-start')) || 0), d = v.duration, live = lt >= 0;
  if (d > 0 && isFinite(d)) { if (v.loop) { if (lt >= 0) lt = lt % d; } else { live = live && lt < d; lt = Math.min(lt, d - 0.001); } }
  return { lt: Math.max(0, lt) + 0.0005, live: live, explicit: explicit };
}
function watchVideo(v) {
  if (v.__filmWatched) return; v.__filmWatched = true; v.playsInline = true; v.autoplay = false;
  var failed = function () { console.error('video ' + (v.id ? '#' + v.id + ' ' : '') + 'did not load (' + (v.error ? 'code ' + v.error.code : 'no source') + '): use an uploaded .mp4/.webm asset, a data: or a blob: URL'); };
  v.addEventListener('error', failed); if (v.error) failed();
}
/* resolves once v shows the frame it was seeked to (or errored); a clip that misses the deadline is warned about once and waited on only briefly until it catches up.
 * quick: wait at most 250 ms, and leave the clip's slow mark and its warning alone */
function settled(v, quick) {
  if ((!v.currentSrc && !v.src) || v.error || (!v.seeking && v.readyState >= 2)) return Promise.resolve();
  var ms = quick || v.__filmSlow ? 250 : 4000;
  return new Promise(function (res) { var evs = ['seeked', 'loadeddata', 'error'];
    var done = function (ok) { clearTimeout(timer); evs.forEach(function (n) { v.removeEventListener(n, check); }); if (!quick) { v.__filmSlow = !ok; if (!ok) vwarn(v, 'slow', 'did not reach its frame within ' + ms + ' ms; exported frames may show a stale picture of it'); } res(); };
    var check = function () { if (v.error || (!v.seeking && v.readyState >= 2)) done(true); }; var timer = setTimeout(function () { done(false); }, ms);
    evs.forEach(function (n) { v.addEventListener(n, check); }); });
}
/* mode 'play': live playback (clips play, drift-corrected; a kit.seek'd clip is stepped instead); 'hold': paused/scrubbed;
 * 'frame': an exported frame — returns a promise that settles once every clip shows its frame (quick: see settled) */
function syncVideos(t, mode, quick) {
  if (!stage) return null;
  var vids = stage.querySelectorAll('video'), waits = [], eps = 0.5 / ((CUT && CUT.fps) || 60);
  for (var i = 0; i < vids.length; i++) { var w = syncVideo(vids[i], t, mode, eps, quick); if (w) waits.push(w); }
  return waits.length ? Promise.all(waits) : null;
}
function syncVideo(v, t, mode, eps, quick) {
  watchVideo(v); v.muted = true;
  if (v.error) return null;
  var vt = videoTime(v, t);
  if (mode === 'play' && vt.live && !vt.explicit) {
    if (CLOCK && Math.abs(v.playbackRate - RATE) > 1e-4) v.playbackRate = RATE;
    if ((v.paused || (!v.seeking && v.readyState >= 3)) && Math.abs(v.currentTime - vt.lt) > 0.25) v.currentTime = vt.lt;
    if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') vwarn(v, 'play', 'could not play: ' + String((e && e.name) || e)); }); }
    return null;
  }
  if (!v.paused) v.pause();
  if (Math.abs(v.currentTime - vt.lt) > eps) v.currentTime = vt.lt;
  return mode === 'frame' ? settled(v, quick) : null;
}

/* ── raster: #stage (or a fragment) → canvas through SVG foreignObject ── */
var CLEAR_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABeqhXUAAAAABJRU5ErkJggg==';
var BIG_PICTURE_CHARS = 65536, SMALL_SNAPSHOT_MAX_CHARS = 1000000;
/* WebKit can paint a picture inside an SVG image blank unless the picture is told to decode before painting */
function decodeFirst(root) { var imgs = root.querySelectorAll('img'); for (var i = 0; i < imgs.length; i++) imgs[i].setAttribute('decoding', 'sync'); }
function copyAt(src, w, h, k) { var s = document.createElement('canvas'); s.width = Math.max(1, Math.round(w * k)); s.height = Math.max(1, Math.round(h * k)); s.getContext('2d').drawImage(src, 0, 0, s.width, s.height); return s; }
/* mediaScale under 1, for a caller that only inspects the picture: canvases, clips and large inlined pictures are read from small copies, and the font
 * style is left out (text and icons fall back to another font, which still shows whether anything is there). At 1 a canvas is read untouched. */
function serializeForRaster(node, W, H, mediaScale) {
  var clone = node.cloneNode(true);
  /* canvas pixels are spliced into the string after serialising: an <img src> set in this long-lived document would start
   * a load the document retains (one unique data: URL per frame) */
  var canvasUrls = [], mark = 'data-raster-canvas-' + Math.random().toString(36).slice(2);
  if (mediaScale < 1) {
    var fonts = clone.querySelector('#film-fonts'); if (fonts) fonts.textContent = '';
    var srcImgs = node.querySelectorAll('img'), dstImgs = clone.querySelectorAll('img');
    for (var ii = 0; ii < dstImgs.length && ii < srcImgs.length; ii++) {
      var si = srcImgs[ii], di = dstImgs[ii], iurl = '';
      var from = si.currentSrc || si.src;
      if (!si.complete || !si.naturalWidth || from.length < BIG_PICTURE_CHARS) continue;
      var box = getComputedStyle(si);
      /* left whole: an SVG, whose natural size may be a default, and the two fits that draw a picture at its natural size */
      if (/^data:image\/svg/i.test(from) || box.objectFit === 'none' || box.objectFit === 'scale-down') continue;
      try { iurl = copyAt(si, si.naturalWidth, si.naturalHeight, mediaScale).toDataURL('image/png'); } catch (e) { continue; }
      di.style.setProperty('width', box.width, 'important'); di.style.setProperty('height', box.height, 'important'); di.removeAttribute('src'); di.removeAttribute('srcset');
      di.setAttribute(mark, String(canvasUrls.length)); canvasUrls.push(iurl);
    }
  }
  var srcCanvases = node.querySelectorAll('canvas'), dstCanvases = clone.querySelectorAll('canvas');
  for (var i = 0; i < dstCanvases.length && i < srcCanvases.length; i++) {
    var c = srcCanvases[i], d = dstCanvases[i], img = document.createElement('img'), url = '';
    try { url = (mediaScale < 1 ? copyAt(c, c.width, c.height, mediaScale) : c).toDataURL('image/png'); } catch (e) { img.alt = ''; }
    img.setAttribute(mark, String(canvasUrls.length)); canvasUrls.push(url);
    img.setAttribute('style', d.getAttribute('style') || ''); img.className = d.className; img.width = c.width; img.height = c.height;
    if (!d.style.width) img.style.width = (c.clientWidth || c.width) + 'px'; if (!d.style.height) img.style.height = (c.clientHeight || c.height) + 'px';
    d.parentNode.replaceChild(img, d);
  }
  /* a <video> rasterises as its current frame (the raster document cannot play media); the clone's own load is cancelled */
  var srcVideos = node.querySelectorAll('video'), dstVideos = clone.querySelectorAll('video');
  for (var vi = 0; vi < dstVideos.length && vi < srcVideos.length; vi++) {
    var sv = srcVideos[vi], dv = dstVideos[vi], vimg = document.createElement('img'), vurl = '', cs = getComputedStyle(sv);
    dv.removeAttribute('src'); dv.textContent = ''; try { dv.load(); } catch (e) { /* nothing to cancel */ }
    if (sv.readyState >= 2 && sv.videoWidth > 0) { try { var vc = copyAt(sv, sv.videoWidth, sv.videoHeight, Math.min(1, mediaScale)); vurl = vc.toDataURL('image/webp', 0.92); /* alpha kept, a fraction of PNG's bytes per frame (the raster document retains every data: URL until recycled) */ } catch (e) { vwarn(sv, 'taint', 'cannot be exported (' + String((e && e.name) || e) + '); it shows empty in frames'); } }
    else if ((sv.currentSrc || sv.src) && !sv.error) vwarn(sv, 'empty', 'had no decoded frame when a frame was exported; it shows empty there');
    if (!vurl) vimg.alt = '';
    vimg.setAttribute(mark, String(canvasUrls.length)); canvasUrls.push(vurl);
    vimg.setAttribute('style', dv.getAttribute('style') || ''); vimg.className = dv.className; if (dv.id) vimg.id = dv.id;
    vimg.style.objectFit = cs.objectFit; vimg.style.objectPosition = cs.objectPosition;
    if (!dv.style.width) vimg.style.width = cs.width; if (!dv.style.height) vimg.style.height = cs.height;
    dv.parentNode.replaceChild(vimg, dv);
  }
  var ins = clone.querySelectorAll('input, textarea, select'), srcIns = node.querySelectorAll('input, textarea, select');
  for (var j = 0; j < ins.length && j < srcIns.length; j++) { var sv = srcIns[j];
    if (sv.type === 'checkbox' || sv.type === 'radio') { if (sv.checked) ins[j].setAttribute('checked', ''); else ins[j].removeAttribute('checked'); }
    else if (ins[j].tagName === 'TEXTAREA') ins[j].textContent = sv.value;
    else if (ins[j].tagName === 'SELECT') { var ops = ins[j].querySelectorAll('option'); for (var oi = 0; oi < ops.length; oi++) { if (oi === sv.selectedIndex) ops[oi].setAttribute('selected', ''); else ops[oi].removeAttribute('selected'); } }
    else ins[j].setAttribute('value', sv.value); }
  decodeFirst(clone);
  if (clone.id === 'stage') { clone.style.transform = 'none'; clone.style.left = '0'; clone.style.top = '0'; }
  var wrap = document.createElement('div');
  wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrap.style.cssText = 'width:' + W + 'px;height:' + H + 'px;overflow:hidden;position:relative;margin:0;padding:0';
  wrap.appendChild(clone);
  var out = new XMLSerializer().serializeToString(wrap);
  /* a stand-in with no picture gets a clear pixel, because an <img> without a source is drawn with a broken-image border in the snapshot */
  for (var k = 0; k < canvasUrls.length; k++) out = out.replace(' ' + mark + '="' + k + '"', ' src="' + (/^data:image\//.test(canvasUrls[k]) ? canvasUrls[k] : CLEAR_PIXEL) + '"');
  return out;
}
/* The SVG keeps its content's own size, W × H with no viewBox, and the draw scales it to pw × ph (film/raster-draw.js): WebKit ignores an SVG-level scale for positioned HTML
 * in a foreignObject. data-raster-size draws nothing: it makes the text, and so the data: URL the browser caches by, differ per output size, so a timing probe at a new size is not served from cache */
function svgForRaster(xml, W, H, scale) {
  var pw = Math.max(1, Math.round(W * scale)), ph = Math.max(1, Math.round(H * scale));
  return { pw: pw, ph: ph, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" data-raster-size="' + pw + 'x' + ph + '"><foreignObject x="0" y="0" width="' + W + '" height="' + H + '">' + xml + '</foreignObject></svg>' };
}
function rasterXml(xml, W, H, scale) {
  return new Promise(function (resolve, reject) {
    var s = svgForRaster(xml, W, H, scale), pw = s.pw, ph = s.ph, svg = s.svg;
    var img = new Image();
    img.onload = function () {
      try { drawPlate(img, pw, ph).then(function (p) { if (p.getContext) return p; var c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(p, 0, 0); p.close(); return c; }).then(resolve, reject); } catch (e) { reject(e); }
    };
    img.onerror = function () { reject(new Error('snapshot decode failed (foreignObject)')); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
var drawPlate = drawSnapshot; /* film/raster-draw.js's, taken now: a film's own top-level drawSnapshot replaces the global */
/* kit.raster(html, {width, height, scale, css}) → Promise<canvas>: a DOM "plate" for canvas-style cuts (call in init) */
function raster(html, opts) {
  opts = opts || {}; var W = opts.width || STAGE_W, H = opts.height || STAGE_H, scale = opts.scale || 1;
  var holder = el('div', { style: 'width:' + W + 'px;height:' + H + 'px;position:relative;overflow:hidden' });
  holder.appendChild(el('style', { text: FONT_CSS + stackCss() + (opts.css || '') }));
  var body = typeof html === 'string' ? h('<div>' + html + '</div>') : html; holder.appendChild(body); decodeFirst(holder);
  return rasterXml(new XMLSerializer().serializeToString((function () { var w = document.createElement('div'); w.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml'); w.style.cssText = 'width:' + W + 'px;height:' + H + 'px;overflow:hidden;position:relative'; w.appendChild(holder); return w; })()), W, H, scale)
    .then(function (c) { plateCount++; plateBytes += c.width * c.height * 4; if (plateBytes > 256 * 1024 * 1024) console.warn('kit.raster: plates now hold ' + Math.round(plateBytes / 1048576) + ' MB'); return c; });
}

/* B5 raster-safety scan: things the snapshot cannot see or that break purity */
var scanSeen = Object.create(null);
function scanStage() {
  if (!stage) return;
  function once(k, msg) { if (scanSeen[k]) return; scanSeen[k] = 1; console.error('raster-safety: ' + msg); }
  var imgs = stage.querySelectorAll('img'); for (var i = 0; i < imgs.length; i++) { var s = imgs[i].getAttribute('src') || ''; if (s && s.slice(0, 5) !== 'data:') once('img:' + s.slice(0, 40), '<img src> must be a data: URL (kit.assets.url) — "' + s.slice(0, 60) + '" will not appear in exported frames'); }
  if (stage.querySelector('iframe')) once('iframe', '<iframe> inside the stage cannot be exported');
  if (stage.querySelector('link[rel=stylesheet]')) once('link', 'external stylesheets are blocked; put CSS in a module and kit.css() it');
  var af = stage.querySelectorAll('[autofocus]'); for (var a = 0; a < af.length; a++) af[a].removeAttribute('autofocus');
  var all = stage.querySelectorAll('*'); for (var j = 0; j < all.length; j++) { var n = all[j]; if (n.scrollTop || n.scrollLeft) { once('scroll', 'an element is scrolled (scrollTop/scrollLeft); exported frames ignore scroll offsets — animate a translateY instead'); break; } }
  var cssTexts = [], bg = stage.querySelectorAll('[style*="url("]'), sheets = stage.querySelectorAll('style');
  for (var k = 0; k < bg.length; k++) cssTexts.push(bg[k].getAttribute('style') || '');
  for (var k2 = 0; k2 < sheets.length; k2++) if (sheets[k2] !== fontStyle) cssTexts.push(sheets[k2].textContent || '');
  scanCss: for (var k3 = 0; k3 < cssTexts.length; k3++) { var re = /url\(\s*['"]?\s*([^'")\s]*)/g, mm;
    while ((mm = re.exec(cssTexts[k3])) !== null) { if (mm[1] && mm[1].slice(0, 5) !== 'data:' && mm[1].charAt(0) !== '#') { once('cssurl', 'CSS uses url(' + mm[1].slice(0, 40) + ') that is not a data: URL; it will not load here (inline it as an asset data: URL or drop the rule)'); break scanCss; } } }
}

/* ── load ── */
function validateCut(c) {
  if (!c || typeof c !== 'object') return 'the script did not set window.CUT';
  if (typeof c.render !== 'function') return 'window.CUT.render(t, kit) is missing';
  var W = c.width == null ? 1920 : c.width, H = c.height == null ? 1080 : c.height, fps = c.fps == null ? 60 : c.fps, d = c.duration;
  if (!(Number.isInteger(W) && Number.isInteger(H) && W >= 16 && H >= 16 && W <= 4096 && H <= 4096)) return 'CUT.width/height must be integers between 16 and 4096';
  if ([24, 30, 60].indexOf(fps) < 0) return 'CUT.fps must be 24, 30 or 60';
  if (!(typeof d === 'number' && isFinite(d) && d > 0 && d <= 300)) return 'CUT.duration must be a number of seconds in (0, 300]';
  return '';
}
function chaptersOf(c) {
  var out = []; if (!Array.isArray(c.chapters)) return out;
  for (var i = 0; i < c.chapters.length && out.length < 32; i++) { var ch = c.chapters[i]; if (ch && typeof ch.t === 'number' && isFinite(ch.t) && typeof ch.label === 'string') out.push({ t: Math.max(0, Math.min(c.duration, ch.t)), label: ch.label.slice(0, 48) }); }
  return out.sort(function (a, b) { return a.t - b.t; });
}
/* What a person did to the scenes by hand moves what the page is told (length, chapters, score), never what the cut sees. A fault costs their changes, not the film. */
function recut() {
  try {
    var m = findModule('recut.json'), clock = clockOf(partsOf(META.duration, META.chapters, META.scenes && META.scenes.map(function (s) { return s.id; })), m ? m.text : null), own = META.duration;
    var chapters = META.chapters.map(function (ch) { var p = clock.parts.filter(function (x) { return Math.abs(x.a0 - ch.t) <= 0.05 && x.own === ch.label; })[0]; return { t: clock.moved ? clock.back(ch.t) : ch.t, label: p ? p.label : ch.label }; });
    var score = clock.moved ? warped(SCORE, clock) : SCORE;
    META.parts = clock.parts; META.chapters = chapters;
    if (clock.aside) console.info('a person\u2019s scene lengths (modules/recut.json) would take the film past 300 s, so every scene plays at its own length.');
    if (!clock.moved) return;
    CLOCK = clock; META.duration = clock.duration; SCORE = score;
    console.info('a person changed scene lengths (modules/recut.json): the film plays ' + clock.duration + ' s, its own time is ' + Math.round(own * 1e6) / 1e6 + ' s. Times given to and by this player are as played; render(t), scenes.json and a comment\u2019s Anchor detail are the film\u2019s own. meta.parts lists both.');
  } catch (e) { if (findModule('recut.json')) console.warn('what a person did to the scenes (modules/recut.json) could not be applied, so the film plays as written.'); }
}
async function load(d) {
  var t0 = origNow();
  try {
    FONT_CSS = '';
    var assets = Array.isArray(d.assets) ? d.assets : [];
    assets.forEach(function (a) { if (!a || typeof a.name !== 'string' || !(a.buffer || typeof a.url === 'string')) return; var isFont = /^font\//.test(a.mime);
      /* images/fonts arrive as bytes and become data: URLs (the raster can only see data:); video arrives as its URL and streams */
      ASSETS[a.name] = { url: a.buffer ? dataUrl(a.mime, a.buffer) : a.url, mime: a.mime, buffer: a.buffer || null, w: a.w || 0, h: a.h || 0 };
      if (isFont) { var fam = a.name.replace(/\.[a-z0-9]+$/i, '').replace(/["\\]/g, ''); FONT_CSS += '\n@font-face{font-family:"' + fam + '";src:url(' + ASSETS[a.name].url + ');font-display:block}'; FONT_PROBES.push('16px "' + fam + '"'); } });
    (Array.isArray(d.modules) ? d.modules : []).forEach(function (m) { if (m && typeof m.name === 'string') MODULES[m.name] = { kind: String(m.kind || 'text'), text: String(m.text || '') }; });

    if (d.look) addFonts(d.look.fonts);
    /* the film's typefaces, and a person's (animation/film-faces.ts), go to the heads of their stacks before the cut reads them */
    FILLED = []; ['sans', 'serif', 'mono'].forEach(function (s) { FONT_FAMILIES[s] = STACKS[s]; });
    if (d.faces) {
      addFonts(d.faces.fonts);
      FILLED = ['sans', 'serif', 'mono', 'display'].filter(function (s) { return typeof d.faces.slots[s] === 'string'; });
      /* sans first: a headline's face falls back to the film's own sans */
      FILLED.forEach(function (s) { FONT_FAMILIES[s] = '"' + d.faces.slots[s].replace(/["\\]/g, '') + '", ' + (s === 'display' ? FONT_FAMILIES.sans : STACKS[s]); });
    }
    if (FILLED.indexOf('display') < 0) FONT_FAMILIES.display = FONT_FAMILIES.sans;
    KIT = makeKit(); window.__filmKit = KIT;
    if (d.look) injectScript(String(d.look.source || ''), 'looks/' + d.look.id + '.js');
    if (loadFailed) return; /* reported as the look's own error: the cut would only add that there is no look */
    LOOK = installLooks(KIT, d.look || null, addFonts);
    SCENES = installScenes(KIT, {
      run: function (name, kit, own) { var m = findModule(name); return m ? tryScript(m.text, 'module ' + name, kit, own) : new Error('no module ' + name); },
      reseed: function (n) { rand = rng(n); }, late: function (fn) { lateTo = fn; }, now: origNow, voice: !!d.narration
    });
    buildStage(STAGE_W, STAGE_H, '#ffffff');
    PHASE = 'load'; setFilmTime(0);
    window.CUT = undefined;
    injectScript(String(d.script || ''), 'cut.js');
    if (loadFailed) return; /* the SyntaxError/throw was already reported with its line */
    if (stage.childNodes.length > 3) console.warn('cut.js built DOM at top level; it is discarded when the stage is sized — build the scene in init(kit)');
    var c = window.CUT;
    var bad = validateCut(c);
    if (bad) { reportError('load', new Error(bad)); return; }
    c.width = c.width == null ? 1920 : c.width; c.height = c.height == null ? 1080 : c.height; c.fps = c.fps == null ? 60 : c.fps;
    CUT = c; STAGE_W = c.width; STAGE_H = c.height;
    buildStage(STAGE_W, STAGE_H, typeof c.background === 'string' ? c.background : '#ffffff');
    /* fonts really in before init() measures anything */
    try { await Promise.all(FONT_PROBES.map(loadFace)); await document.fonts.ready; } catch (e) { /* fonts API absent */ }
    if (d.look) await KIT.look().init();
    if (typeof c.init === 'function') await c.init(KIT);
    try { await document.fonts.ready; } catch (e) { /* continue */ }
    var painted = getComputedStyle(stage);
    META = { width: STAGE_W, height: STAGE_H, fps: c.fps, duration: c.duration, chapters: chaptersOf(c), scenes: SCENES(), background: [painted.backgroundColor, painted.backgroundImage] };
    if (typeof c.score === 'function') {
      try { SCORE = typeof recordScore === 'function' ? recordScore(c, KIT) : SCORE; } catch (e) { console.error('score(S) threw: ' + (e && e.message)); }
    }
    recut();
    if (d.narration && captioner) {
      try {
        NARRATION = captioner.read(c, d.narration);
        /* a line starts on the action it speaks of, so its start moves with the picture; its dur is the take's real seconds, and stays */
        if (NARRATION && CLOCK) NARRATION.lines.forEach(function (l) { l.at = CLOCK.back(l.at); });
        if (NARRATION && c.narration.captions !== false) CAPTIONS = captioner.layer(NARRATION.lines, c.narration.captions, Math.min(STAGE_W, STAGE_H), FONT_FAMILIES.sans);
      }
      catch (e) { NARRATION = CAPTIONS = null; console.error('the narration could not be read, so the film plays without it: ' + (e && e.message)); }
    }
    PHASE = 'render';
    renderAt(0);
    syncVideos(0, 'hold');
    scanStage();
    loaded = true;
    var qa = null; try { qa = c.qa && typeof c.qa === 'object' ? JSON.parse(JSON.stringify(c.qa)) : null; } catch (e) { console.warn('CUT.qa is not plain data; ignored'); }
    say('ready', { meta: META, score: SCORE, narration: NARRATION, loadMs: Math.round(origNow() - t0), qa: qa });
  } catch (e) {
    reportError('load', e);
  }
}

/* ── render / frame ── */
var lastRenderOk = true, lastRenderError = null, played = 0;
function renderAt(t) {
  if (!CUT) return null;
  t = Math.max(0, Math.min(CLOCK ? CLOCK.duration : CUT.duration, Number(t) || 0));
  played = t;
  RATE = 1;
  /* the parts' lengths are rounded to 1e-6, so their sum can miss CUT.duration: the played end draws the cut's own end */
  if (CLOCK) { var at = CLOCK.at(t); t = t >= CLOCK.duration ? CUT.duration : Math.min(CUT.duration, at.T); RATE = at.rate; }
  setFilmTime(t);
  fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, STAGE_W, STAGE_H);
  var r, wasOk = lastRenderOk; lastRenderOk = true; videoSeeks = new Map();
  try { r = CUT.render(t, KIT); } catch (e) { lastRenderOk = false; lastRenderError = e; reportError('render', e); return null; }
  if (CAPTIONS) CAPTIONS.draw(played, stage);
  if (r && typeof r.then === 'function') {
    if (!renderIsAsyncWarned) { renderIsAsyncWarned = true; console.warn('CUT.render returned a Promise: live playback will not wait for it (only exported frames do). Do async work in init().'); }
    /* bounded: a render promise that never settles must not wedge the stage; recovery (dedupe reset) only once it fulfils */
    return Promise.race([r, new Promise(function (_, rej) { setTimeout(function () { var hidden = document.hidden === true, err = new Error('render(' + t.toFixed(3) + ') returned a Promise that did not settle within 10 s' + (hidden ? ' (this tab was in the background)' : '')); err.filmFatal = true; err.filmEnv = hidden; rej(err); }, 10000); })])
      /* the caption is that of the frame last drawn: a later frame, live or pulled, may have been drawn by now */
      .then(function (v) { if (!wasOk) seenErrors = Object.create(null); if (CAPTIONS) CAPTIONS.draw(played, stage); return v; });
  }
  if (!wasOk) seenErrors = Object.create(null); /* recovered: a later failure episode reports afresh (a persistent one reported once) */
  return null;
}
/* ── Tweaks: while the page watches, it is sent the stage's text nodes, in document order, at 'watch', after each paused frame and after a resize, and looks for the film's lines among them (animation/script-words.ts).
 * Hidden nodes are sent too: without them, nodes that are apart would sit side by side and a line could be found across the gap. ── */
var watching = false, resized = false, retelling = false;
/* seen is a hit test (elementsFromPoint), so the stage must fit the iframe, which has its new size before it hears 'resize'. At an unchanged size it is left alone: a film may have placed the stage itself */
function tellTexts() { if (watching && stage) { if (fitW !== window.innerWidth || fitH !== window.innerHeight) fit(); say('texts', { nodes: textNodes() }); } }
/* one report when the resizing stops, not one for each: a report's hit tests are slow */
function retell() {
  resized = true; if (retelling || !watching) return;
  retelling = true;
  requestAnimationFrame(function rest() { if (resized) { resized = false; requestAnimationFrame(rest); return; } retelling = false; tellTexts(); });
}
function paintsOver(e, memo) {
  if (memo.has(e)) return memo.get(e);
  var cs = getComputedStyle(e), bg = cs.backgroundColor, a = /^rgba\(/.test(bg) ? parseFloat(bg.split(',')[3]) : bg.indexOf('/') > 0 ? parseFloat(bg.split('/')[1]) : 1;
  var solid = /^(IMG|VIDEO|CANVAS)$/.test(e.tagName) || cs.backgroundImage.indexOf('url(') >= 0 || a > 0.9;
  for (var p = e; solid && p && p !== stage; p = p.parentElement) if (parseFloat(getComputedStyle(p).opacity) < 0.9) solid = false;
  memo.set(e, solid); return solid;
}
/* is the point outside a box that clips el? Any clip-path on el or above it counts as clipping the point, whatever its shape */
function clippedAt(el, x, y) {
  for (var p = el; p && p !== stage.parentElement; p = p.parentElement) {
    var cs = getComputedStyle(p); if (cs.clipPath !== 'none') return true; if (p === el || (cs.overflowX === 'visible' && cs.overflowY === 'visible')) continue;
    var r = p.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true;
  }
  return false;
}
function seenAt(el, line, memo) {
  if (getComputedStyle(el).pointerEvents === 'none') return true; /* hit testing skips it, so it counts as seen */
  var s = stage.getBoundingClientRect(), l = Math.max(line.left, s.left), r = Math.min(line.right, s.right), y = (Math.max(line.top, s.top) + Math.min(line.bottom, s.bottom)) / 2;
  /* the middle of what lies on the stage, then near its ends: long words may run under a neighbour. An ancestor is met first where the words overflow their own box, or are clipped away */
  return r > l && [0.5, 0.1, 0.9].some(function (f) {
    var x = l + (r - l) * f, hit = document.elementsFromPoint(x, y);
    for (var i = 0; i < hit.length; i++) { var e = hit[i]; if (e === el || el.contains(e)) return true; if (e.contains(el)) return !clippedAt(el, x, y); if (paintsOver(e, memo)) return false; }
    return false;
  });
}
function textNodes() {
  var out = [], chars = 0, t0 = origNow(), memo = new Map(), w = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT), range = document.createRange(), n;
  while ((n = w.nextNode()) && out.length < 2000 && chars < 60000) {
    var el = n.parentElement; if (!el || !/\S/.test(n.data) || el.closest('style,script,.film-caption')) continue; /* a caption is skipped too, the player's or one the cut draws with that class: its words are spoken, and the recording would not change */
    while (el !== stage && getComputedStyle(el).display === 'contents') el = el.parentElement; /* it has no box of its own to hide or to hit */
    var item = { s: n.data.slice(0, 301) }; chars += item.s.length; out.push(item);
    /* measured in the film's own pixels: on a small screen, or zoomed far in, the whole picture may be a few pixels wide */
    range.selectNodeContents(n); var b = range.getBoundingClientRect(); if (!(b.width > 0 && b.height > 0)) continue;
    var r = srect(range), line = range.getClientRects()[0]; if (r.w < 1 || r.h < 1) continue; item.x = r.x; item.y = r.y; item.w = r.w; item.h = r.h; item.line = r.h * line.height / b.height;
    /* hit testing slows as the stage fills: after 40 ms in all, whatever is not hidden counts as seen */
    item.seen = (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) && (origNow() - t0 > 40 || seenAt(el, line, memo));
  }
  return out;
}
var pending = null, rafQueued = false, framing = false;
function flushRender() {
  rafQueued = false; if (!pending || !loaded) return;
  /* a frame pull owns the one stage until its snapshot is serialised; live renders wait for it */
  if (framing) { rafQueued = true; requestAnimationFrame(flushRender); return; }
  var p = pending; pending = null; var t0 = origNow();
  var pr = renderAt(p.t);
  var done = function () { syncVideos(filmT, p.playing ? 'play' : 'hold'); say('presented', { seq: p.seq, t: p.t, ok: lastRenderOk, ms: Math.round((origNow() - t0) * 10) / 10 }); if (!p.playing) tellTexts(); };
  if (pr) pr.then(done, function (e) { lastRenderOk = false; lastRenderError = e; reportError('render', e); done(); }); else done();
}
var frameChain = Promise.resolve();
function frame(d) {
  var seq = typeof d.seq === 'number' ? d.seq : -1, scale = typeof d.scale === 'number' && d.scale > 0 && d.scale <= 4 ? d.scale : 1;
  frameChain = frameChain.then(async function () {
    if (!loaded) { say('frame-error', { seq: seq, env: true, message: 'the film is not loaded' }); return; }
    var t0 = origNow(); framing = true;
    try {
      var rendered = false;
      /* read this call's outcome before any await: a live render can only settle (and rewrite the flags) while we wait */
      var pr = renderAt(d.t), threw = !lastRenderOk, err = lastRenderError;
      if (threw) throw err != null ? err : new Error(String(err));
      if (pr) await pr;
      rendered = true;
      var ft = filmT;
      /* a pull that only inspects the picture waits at most 250 ms for a clip (settled's quick) */
      var vw = syncVideos(ft, 'frame', d.smallMedia === true); if (vw) await vw;
      scanStage();
      var s = svgForRaster(serializeForRaster(stage, STAGE_W, STAGE_H, d.smallMedia === true ? scale : 1), STAGE_W, STAGE_H, scale);
      if (d.smallMedia === true && s.svg.length > SMALL_SNAPSHOT_MAX_CHARS) throw new Error('the stage is too large to inspect: its snapshot is ' + s.svg.length + ' characters');
      say('frame', { seq: seq, t: ft, svg: s.svg, pw: s.pw, ph: s.ph, ms: Math.round(origNow() - t0) });
    } catch (e) {
      /* hold: this frame failed but the next may not (render threw, the snapshot failed); a render that never settles is fatal */
      var fatal = !!(e && e.filmFatal), m = String((e && e.message) || e).slice(0, 300);
      say('frame-error', { seq: seq, hold: !fatal, env: !!(e && e.filmEnv), message: rendered || fatal ? m : 'render(' + filmT.toFixed(3) + ') threw: ' + m });
    }
    finally { framing = false; }
  });
}

window.addEventListener('message', function (e) {
  if (e.source !== realParent) return;
  var d = e.data; if (!d || typeof d !== 'object' || typeof d.type !== 'string' || d.type.slice(0, NS.length) !== NS) return;
  var type = d.type.slice(NS.length);
  if (type === 'load') { if (loaded || CUT) { reportError('load', new Error('already loaded; mount a fresh runner')); return; } load(d); }
  else if (type === 'render') { pending = { t: Number(d.t) || 0, seq: typeof d.seq === 'number' ? d.seq : 0, playing: d.playing === true }; if (!rafQueued) { rafQueued = true; requestAnimationFrame(flushRender); } }
  else if (type === 'frame') frame(d);
  else if (type === 'scan') scanStage();
  else if (type === 'watch') { watching = d.on === true; tellTexts(); }
});

say('hello', { version: VERSION });
})();
