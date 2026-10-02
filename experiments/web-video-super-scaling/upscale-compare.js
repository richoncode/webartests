    const CLIP_W_EXPECT = 1920;
    const LOUPE = 168;
    const TABS = [
      { id: 'universal', name: 'Browser universal', methods: ['nearest', 'bilinear', 'bicubic', 'lanczos', 'a4k-s'] },
      { id: 'shaders', name: 'Shader sharpeners', methods: ['fsr1', 'nis', 'cas', 'xbr', 'lanczos-unsharp'] },
      { id: 'neural', name: 'Neural (WebGPU)', methods: ['a4k-s', 'a4k-m', 'a4k-l', 'a4k-gan', 'a4k-vl'] },
      { id: 'custom', name: 'Neural custom', methods: ['custom-0', 'custom-1', 'custom-2', 'custom-3', 'custom-4'] }
    ];
    const METHODS = {
      nearest: { name: 'Nearest', hint: 'Point sample', kind: 'filter', cpu: true },
      bilinear: { name: 'Bilinear', hint: '2×2 tent', kind: 'filter', cpu: true },
      bicubic: { name: 'Bicubic', hint: 'Catmull-Rom', kind: 'filter' },
      lanczos: { name: 'Lanczos', hint: 'Radius-3 sinc', kind: 'filter' },
      'lanczos-unsharp': { name: 'Lanczos + unsharp', hint: 'Radius-3, then 3×3 mask', kind: 'unsharp' },
      fsr1: { name: 'FSR 1', hint: 'EASU + RCAS', kind: 'fsr' },
      nis: { name: 'NVIDIA Image Scaling', hint: 'NVScaler', kind: 'nis' },
      cas: { name: 'CAS bilinear', hint: 'Bilinear, then CAS', kind: 'cas' },
      xbr: { name: 'xBR-lv2', hint: 'Hyllian edge-directed', kind: 'xbr' },
      'a4k-s': { name: 'Anime4K CNN-S', hint: 'v3.2 x2', kind: 'a4k', net: 's' },
      'a4k-m': { name: 'Anime4K CNN-M', hint: 'v3.2 x2', kind: 'a4k', net: 'm' },
      'a4k-l': { name: 'Anime4K CNN-L', hint: 'v3.2 x2 RGB', kind: 'a4k', net: 'l' },
      'a4k-gan': { name: 'Anime4K GAN-S', hint: 'v4.1 x2', kind: 'a4k', net: 'gan-s' },
      'a4k-vl': { name: 'Anime4K CNN-VL', hint: 'v3.2 x2, heaviest', kind: 'a4k', net: 'vl' },
      'custom-0': { name: 'Football ESPCN', hint: 'Tiny luma, trained on this clip', kind: 'custom', slot: 0, preset: 'upscale-models/football-espcn.json' },
      'custom-1': { name: 'Football wide', hint: 'Deeper luma, later stream frames', kind: 'custom', slot: 1, preset: 'upscale-models/football-wide.json' },
      'custom-2': { name: 'Football RGB', hint: 'RGB residual, not bilinear chroma', kind: 'custom', slot: 2, preset: 'upscale-models/football-rgb.json' },
      'custom-3': { name: 'Football temporal', hint: 'Current + previous luma, no warp', kind: 'custom', slot: 3, preset: 'upscale-models/football-temporal.json' },
      'custom-4': { name: 'Football distill', hint: 'Student of Anime4K CNN-M', kind: 'custom', slot: 4, preset: 'upscale-models/football-distill.json' }
    };
    const NET_FILES = {
      s: 'upscale-models/anime4k-s.json',
      m: 'upscale-models/anime4k-m.json',
      l: 'upscale-models/anime4k-l.json',
      'gan-s': 'upscale-models/anime4k-gan-s.json',
      vl: 'upscale-models/anime4k-vl.json'
    };

    const video = document.getElementById('video-source');
    const grid = document.getElementById('grid');
    const statusEl = document.getElementById('status');
    const q = new URLSearchParams(location.search);

    let mode = 'cpu';
    let device = null;
    let format = 'bgra8unorm';
    let hasTS = false;
    let scale = q.get('scale') === '4' ? 4 : 2;
    let zoom = 4;
    let fullW = 0;
    let fullH = 0;
    let hover = null;
    let scrubbing = false;
    let booted = false;
    let watching = false;
    let measuring = false;
    let readInFlight = false;
    let measureQueued = false;
    let startApplied = false;
    let frameSerial = 0;
    let fpsStamp = performance.now();
    let fpsCount = 0;
    let presentFps = 0;
    let metricsEnabled = true;
    let gpuLabel = 'WebGPU';
    let uploadCanvas = null;
    let uploadCtx = null;
    let srcTex = null;
    let lowTex = null;
    let midTex = null;
    let featLow = [];
    let featMid = [];
    let accLow = [null, null];
    let accMid = [null, null];
    let slotTex = [null, null, null, null, null];
    let scratchTex = null;
    let dummyTex = null;
    let generation = [];
    let pipelines = null;
    let kernelFail = {};
    let animeNets = {};
    let customModels = {};
    let metricBufs = null;
    let querySet = null;
    let tsResolve = null;
    let tsStaging = null;
    let panels = [];
    let activeTab = 'universal';
    const FEAT_POOL = 20;
    let uPool = {};
    let uCursor = {};
    let espcnBuf = [null, null];
    let espcnBytes = 0;
    let prevLow = null;
    let recentLow = null;
    let prevMid = null;
    let recentMid = null;
    let temporalTime = null;
    let recentLowReady = false;
    let recentMidReady = false;
    let temporalSynced = false;
    let temporalRepeat = false;
    let temporalSeedMid = false;

    function b64f32(s) {
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Float32Array(bytes.buffer);
    }

    function setStatus(text, bad) {
      statusEl.textContent = text;
      statusEl.classList.toggle('bad', !!bad);
    }

    function fmtTime(t) {
      if (!Number.isFinite(t) || t < 0) t = 0;
      const m = Math.floor(t / 60);
      const s = t - m * 60;
      return m + ':' + s.toFixed(2).padStart(5, '0');
    }

    function makePanel(spec) {
      const el = document.createElement('article');
      el.className = 'panel';
      el.innerHTML =
        '<div class="phead"><h2></h2><span class="hint"></span></div>' +
        '<div class="view"><canvas class="main"></canvas>' +
        '<div class="loupe"><canvas></canvas></div>' +
        '<div class="unavail"></div>' +
        '<div class="loader"><strong>Load model</strong>' +
        '<p>Drop a webartests-sr-v1 JSON file, or paste a URL, to replace the preset.</p>' +
        '<input type="url" placeholder="https://…/model.json" aria-label="Model URL">' +
        '<div class="row"><button type="button" data-act="url">Load URL</button>' +
        '<button type="button" data-act="file">Choose file</button></div>' +
        '<input type="file" accept="application/json,.json" hidden></div></div>' +
        '<div class="stats"><span data-k="time">—</span><span data-k="quality" class="dim">—</span></div>';
      el.querySelector('h2').textContent = spec.name;
      el.querySelector('.hint').textContent = spec.hint;
      grid.appendChild(el);
      const view = el.querySelector('.view');
      const loupe = el.querySelector('.loupe');
      return {
        ...spec,
        el,
        view,
        canvas: el.querySelector('canvas.main'),
        loupe,
        loupeCanvas: loupe.querySelector('canvas'),
        timeEl: el.querySelector('[data-k="time"]'),
        qualEl: el.querySelector('[data-k="quality"]'),
        unavail: el.querySelector('.unavail'),
        loader: el.querySelector('.loader'),
        urlInput: el.querySelector('input[type="url"]'),
        fileInput: el.querySelector('input[type="file"]'),
        ctx: null,
        lctx: null,
        cpu: null,
        lcpu: null,
        methodId: spec.id,
        live: spec.id === 'original',
        empty: false
      };
    }

    function buildDOM() {
      panels.push(makePanel({ id: 'original', name: 'Original', hint: 'Ground truth', kind: 'ref' }));
      for (let i = 0; i < 5; i++) panels.push(makePanel({ id: 'slot-' + i, name: '—', hint: '', kind: 'slot' }));
      const bar = document.getElementById('tabbar');
      for (const tab of TABS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = tab.name;
        btn.dataset.tab = tab.id;
        btn.addEventListener('click', () => selectTab(tab.id, true));
        bar.appendChild(btn);
      }
      for (const panel of panels) {
        if (!panel.loader) continue;
        panel.view.addEventListener('dragover', (ev) => { ev.preventDefault(); });
        panel.view.addEventListener('drop', (ev) => {
          ev.preventDefault();
          const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
          if (file) readModelFile(panel, file);
        });
        panel.loader.querySelector('[data-act="file"]').addEventListener('click', () => panel.fileInput.click());
        panel.loader.querySelector('[data-act="url"]').addEventListener('click', () => {
          const url = panel.urlInput.value.trim();
          if (url) loadCustomURL(panel, url);
        });
        panel.fileInput.addEventListener('change', () => {
          const file = panel.fileInput.files && panel.fileInput.files[0];
          if (file) readModelFile(panel, file);
        });
      }
    }

    function tabById(id) {
      return TABS.find((tab) => tab.id === id) || TABS[0];
    }

    function methodOf(panel) {
      return METHODS[panel.methodId] || null;
    }

    function hintFor(method) {
      if (!method) return '';
      if (scale === 4 && (method.kind === 'a4k' || method.kind === 'custom' || method.kind === 'nis')) {
        return method.hint + ' · x2 twice';
      }
      return method.hint;
    }

    function selectTab(id, writeHash) {
      const tab = tabById(id);
      activeTab = tab.id;
      if (writeHash) {
        const url = new URL(location.href);
        url.hash = tab.id;
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
      for (const btn of document.querySelectorAll('#tabbar button')) {
        btn.classList.toggle('active', btn.dataset.tab === tab.id);
      }
      tab.methods.forEach((mid, i) => bindSlot(panels[i + 1], mid));
      if (mode === 'gpu' && fullW) renderFrame();
      else if (mode === 'cpu' && fullW) renderFrame();
    }

    function bindSlot(panel, methodId) {
      const method = METHODS[methodId];
      panel.methodId = methodId;
      panel.kind = method.kind;
      panel.el.querySelector('h2').textContent = method.name;
      panel.el.querySelector('.hint').textContent = hintFor(method);
      panel.timeEl.textContent = '—';
      panel.qualEl.textContent = '—';
      panel.qualEl.classList.add('dim');
      panel.live = false;
      panel.empty = false;
      panel.loader.classList.remove('show');
      clearUnavailable(panel);
      if (mode === 'cpu' && !method.cpu) {
        markUnavailable(panel, 'Needs WebGPU. This browser has no WebGPU adapter, so this panel is off.');
        return;
      }
      if (mode === 'gpu') {
        const why = blockReason(methodId);
        if (why) {
          markUnavailable(panel, why);
          return;
        }
      }
      if (method.kind === 'custom') {
        const model = customModels[method.slot];
        if (!model) {
          panel.empty = true;
          panel.loader.classList.add('show');
          panel.timeEl.textContent = 'no model';
          panel.qualEl.textContent = 'load a JSON model';
          return;
        }
        if (model.error) {
          markUnavailable(panel, model.error);
          return;
        }
        panel.el.querySelector('h2').textContent = model.name || method.name;
      }
      panel.live = mode === 'gpu' || !!method.cpu;
    }

    function markUnavailable(panel, message) {
      panel.unavail.textContent = message;
      panel.unavail.classList.add('show');
      panel.timeEl.textContent = 'unavailable';
      panel.qualEl.textContent = '—';
    }

    function clearUnavailable(panel) {
      panel.unavail.classList.remove('show');
    }

    function weightBuffer(floats) {
      const size = Math.max(16, Math.ceil(floats.byteLength / 16) * 16);
      const buf = device.createBuffer({
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      device.queue.writeBuffer(buf, 0, floats);
      return buf;
    }

    function shaderErr(module, label) {
      return module.getCompilationInfo().then((info) => {
        const errors = info.messages.filter((m) => m.type === 'error');
        if (!errors.length) return;
        throw new Error(label + ': ' + errors.map((e) => e.message).join('; '));
      });
    }

    function makeConvWGSL(kind) {
      const taps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];
      let body = '';
      if (kind === 'conv1') {
        taps.forEach(([x, y], k) => {
          body += `{
            let s = textureLoad(src, clamp(id + vec2<i32>(${x}, ${y}), vec2<i32>(0), size - vec2<i32>(1)), 0);
            result += mat_at(${k * 16}u) * s;
          }`;
        });
        body += 'result += vec4<f32>(w[144u], w[145u], w[146u], w[147u]);';
      } else {
        taps.forEach(([x, y], k) => {
          const pos = k * 32;
          const neg = pos + 16;
          body += `{
            let s = textureLoad(src, clamp(id + vec2<i32>(${x}, ${y}), vec2<i32>(0), size - vec2<i32>(1)), 0);
            let pos = max(s, vec4<f32>(0.0));
            let neg = max(-s, vec4<f32>(0.0));
            result += mat_at(${pos}u) * pos;
            result += mat_at(${neg}u) * neg;
          }`;
        });
        body += 'result += vec4<f32>(w[288u], w[289u], w[290u], w[291u]);';
      }
      return `
        @group(0) @binding(0) var src: texture_2d<f32>;
        @group(0) @binding(1) var dst: texture_storage_2d<rgba16float, write>;
        @group(0) @binding(2) var<storage, read> w: array<f32>;

        fn mat_at(base: u32) -> mat4x4<f32> {
          return mat4x4<f32>(
            w[base + 0u], w[base + 1u], w[base + 2u], w[base + 3u],
            w[base + 4u], w[base + 5u], w[base + 6u], w[base + 7u],
            w[base + 8u], w[base + 9u], w[base + 10u], w[base + 11u],
            w[base + 12u], w[base + 13u], w[base + 14u], w[base + 15u]
          );
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
          let size = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
          let id = vec2<i32>(i32(gid.x), i32(gid.y));
          if (id.x >= size.x || id.y >= size.y) { return; }
          var result = vec4<f32>(0.0);
          ${body}
          textureStore(dst, id, result);
        }
      `;
    }

    const DOWNSCALE_WGSL = `
      struct Scale { value: u32, pad0: u32, pad1: u32, pad2: u32 }
      @group(0) @binding(0) var src: texture_2d<f32>;
      @group(0) @binding(1) var dst: texture_storage_2d<rgba8unorm, write>;
      @group(0) @binding(2) var<uniform> scale_u: Scale;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let low = vec2<i32>(i32(textureDimensions(dst).x), i32(textureDimensions(dst).y));
        let id = vec2<i32>(i32(gid.x), i32(gid.y));
        if (id.x >= low.x || id.y >= low.y) { return; }
        let s = i32(scale_u.value);
        var acc = vec4<f32>(0.0);
        for (var y = 0; y < s; y++) {
          for (var x = 0; x < s; x++) {
            acc += textureLoad(src, id * s + vec2<i32>(x, y), 0);
          }
        }
        textureStore(dst, id, acc / f32(s * s));
      }
    `;

    const UPSCALE_WGSL = `
      @group(0) @binding(0) var low_tex: texture_2d<f32>;
      @group(0) @binding(1) var out_tex: texture_storage_2d<rgba8unorm, write>;

      fn dims(t: texture_2d<f32>) -> vec2<i32> {
        let d = textureDimensions(t);
        return vec2<i32>(i32(d.x), i32(d.y));
      }

      fn at(t: texture_2d<f32>, p: vec2<i32>) -> vec4<f32> {
        let d = dims(t);
        return textureLoad(t, clamp(p, vec2<i32>(0), d - vec2<i32>(1)), 0);
      }

      fn sample_nearest(uv: vec2<f32>) -> vec4<f32> {
        let d = dims(low_tex);
        let p = uv * vec2<f32>(d);
        return at(low_tex, vec2<i32>(i32(floor(p.x)), i32(floor(p.y))));
      }

      fn sample_bilinear(uv: vec2<f32>) -> vec4<f32> {
        let d = vec2<f32>(dims(low_tex));
        let p = uv * d - vec2<f32>(0.5);
        let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
        let f = p - vec2<f32>(floor(p.x), floor(p.y));
        let s00 = at(low_tex, i);
        let s10 = at(low_tex, i + vec2<i32>(1, 0));
        let s01 = at(low_tex, i + vec2<i32>(0, 1));
        let s11 = at(low_tex, i + vec2<i32>(1, 1));
        return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
      }

      fn catmull(x: f32) -> f32 {
        let a = abs(x);
        if (a <= 1.0) { return ((1.5 * a) - 2.5) * a * a + 1.0; }
        if (a < 2.0) { return (((-0.5 * a) + 2.5) * a - 4.0) * a + 2.0; }
        return 0.0;
      }

      fn sample_bicubic(uv: vec2<f32>) -> vec4<f32> {
        let d = vec2<f32>(dims(low_tex));
        let p = uv * d - vec2<f32>(0.5);
        let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
        let f = p - vec2<f32>(floor(p.x), floor(p.y));
        var acc = vec4<f32>(0.0);
        var wsum = 0.0;
        for (var y = -1; y <= 2; y++) {
          for (var x = -1; x <= 2; x++) {
            let w = catmull(f.x - f32(x)) * catmull(f.y - f32(y));
            acc += at(low_tex, i + vec2<i32>(x, y)) * w;
            wsum += w;
          }
        }
        return clamp(acc / max(wsum, 1e-4), vec4<f32>(0.0), vec4<f32>(1.0));
      }

      fn lanczos3(x: f32) -> f32 {
        let a = abs(x);
        if (a < 1e-5) { return 1.0; }
        if (a >= 3.0) { return 0.0; }
        let pi = 3.14159265359;
        let pix = pi * a;
        return sin(pix) * sin(pix / 3.0) / (pix * (pix / 3.0));
      }

      fn sample_lanczos(uv: vec2<f32>) -> vec4<f32> {
        let d = vec2<f32>(dims(low_tex));
        let p = uv * d - vec2<f32>(0.5);
        let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
        let f = p - vec2<f32>(floor(p.x), floor(p.y));
        var acc = vec4<f32>(0.0);
        var wsum = 0.0;
        for (var y = -2; y <= 3; y++) {
          for (var x = -2; x <= 3; x++) {
            let w = lanczos3(f.x - f32(x)) * lanczos3(f.y - f32(y));
            acc += at(low_tex, i + vec2<i32>(x, y)) * w;
            wsum += w;
          }
        }
        return clamp(acc / max(wsum, 1e-4), vec4<f32>(0.0), vec4<f32>(1.0));
      }

      fn write_sample(id: vec3<u32>, color: vec4<f32>) {
        let out_d = textureDimensions(out_tex);
        if (id.x >= out_d.x || id.y >= out_d.y) { return; }
        textureStore(out_tex, vec2<i32>(i32(id.x), i32(id.y)), vec4<f32>(color.rgb, 1.0));
      }

      fn uv_at(id: vec3<u32>) -> vec2<f32> {
        let out_d = textureDimensions(out_tex);
        return (vec2<f32>(f32(id.x), f32(id.y)) + vec2<f32>(0.5)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
      }

      @compute @workgroup_size(8, 8)
      fn nearest(@builtin(global_invocation_id) id: vec3<u32>) { write_sample(id, sample_nearest(uv_at(id))); }
      @compute @workgroup_size(8, 8)
      fn bilinear(@builtin(global_invocation_id) id: vec3<u32>) { write_sample(id, sample_bilinear(uv_at(id))); }
      @compute @workgroup_size(8, 8)
      fn bicubic(@builtin(global_invocation_id) id: vec3<u32>) { write_sample(id, sample_bicubic(uv_at(id))); }
      @compute @workgroup_size(8, 8)
      fn lanczos(@builtin(global_invocation_id) id: vec3<u32>) { write_sample(id, sample_lanczos(uv_at(id))); }
    `;

    const D2S_WGSL = `
      @group(0) @binding(0) var color_tex: texture_2d<f32>;
      @group(0) @binding(1) var feat_tex: texture_2d<f32>;
      @group(0) @binding(2) var out_tex: texture_storage_2d<rgba8unorm, write>;

      fn at(p: vec2<i32>) -> vec4<f32> {
        let d = textureDimensions(color_tex);
        let di = vec2<i32>(i32(d.x), i32(d.y));
        return textureLoad(color_tex, clamp(p, vec2<i32>(0), di - vec2<i32>(1)), 0);
      }

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let out_d = textureDimensions(out_tex);
        if (gid.x >= out_d.x || gid.y >= out_d.y) { return; }
        let x = i32(gid.x);
        let y = i32(gid.y);
        let feat_d = textureDimensions(feat_tex);
        let lx = clamp(x / 2, 0, i32(feat_d.x) - 1);
        let ly = clamp(y / 2, 0, i32(feat_d.y) - 1);
        let ch = (y & 1) * 2 + (x & 1);
        let residual = textureLoad(feat_tex, vec2<i32>(lx, ly), 0)[ch];
        let uv = (vec2<f32>(f32(x), f32(y)) + vec2<f32>(0.5)) / vec2<f32>(f32(out_d.x), f32(out_d.y));
        let cd = vec2<f32>(f32(textureDimensions(color_tex).x), f32(textureDimensions(color_tex).y));
        let p = uv * cd - vec2<f32>(0.5);
        let i = vec2<i32>(i32(floor(p.x)), i32(floor(p.y)));
        let f = p - vec2<f32>(floor(p.x), floor(p.y));
        let base = mix(mix(at(i), at(i + vec2<i32>(1, 0)), f.x), mix(at(i + vec2<i32>(0, 1)), at(i + vec2<i32>(1, 1)), f.x), f.y);
        let rgb = clamp(base.rgb + vec3<f32>(residual), vec3<f32>(0.0), vec3<f32>(1.0));
        textureStore(out_tex, vec2<i32>(x, y), vec4<f32>(rgb, 1.0));
      }
    `;

    const PRESENT_WGSL = `
      @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
        let x = select(-1.0, 1.0, (i & 1u) == 1u);
        let y = select(1.0, -1.0, i >= 2u);
        return vec4<f32>(x, y, 0.0, 1.0);
      }
      @group(0) @binding(0) var tex: texture_2d<f32>;
      @fragment fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
        let d = textureDimensions(tex);
        let x = u32(pos.x);
        let y = u32(pos.y);
        if (x >= d.x || y >= d.y) { discard; }
        return textureLoad(tex, vec2<i32>(i32(x), i32(y)), 0);
      }
    `;

    const LOUPE_WGSL = `
      struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }
      struct Loupe { center: vec2<f32>, window: vec2<f32> }
      @vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
        let x = select(-1.0, 1.0, (i & 1u) == 1u);
        let y = select(1.0, -1.0, i >= 2u);
        var o: VSOut;
        o.pos = vec4<f32>(x, y, 0.0, 1.0);
        o.uv = vec2<f32>(select(0.0, 1.0, (i & 1u) == 1u), select(0.0, 1.0, i >= 2u));
        return o;
      }
      @group(0) @binding(0) var tex: texture_2d<f32>;
      @group(0) @binding(1) var<uniform> loupe: Loupe;
      @fragment fn fs(in: VSOut) -> @location(0) vec4<f32> {
        let src = loupe.center + (in.uv - vec2<f32>(0.5)) * loupe.window;
        let d = textureDimensions(tex);
        let coord = clamp(vec2<i32>(i32(floor(src.x)), i32(floor(src.y))), vec2<i32>(0), vec2<i32>(i32(d.x) - 1, i32(d.y) - 1));
        return textureLoad(tex, coord, 0);
      }
    `;

    const METRIC_WGSL = `
      struct Params { blocks_x: u32, blocks_y: u32, full_w: u32, full_h: u32 }
      struct Block { sse: f32, ssim: f32, n: f32, pad: f32 }

      @group(0) @binding(0) var ref_tex: texture_2d<f32>;
      @group(0) @binding(1) var test_tex: texture_2d<f32>;
      @group(0) @binding(2) var<storage, read_write> blocks: array<Block>;
      @group(0) @binding(3) var<uniform> params: Params;

      fn luma255(rgb: vec3<f32>) -> f32 {
        return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)) * 255.0;
      }

      @compute @workgroup_size(8, 8)
      fn blocks_main(@builtin(global_invocation_id) gid: vec3<u32>) {
        if (gid.x >= params.blocks_x || gid.y >= params.blocks_y) { return; }
        let x0 = gid.x * 8u;
        let y0 = gid.y * 8u;
        var sx = 0.0; var sy = 0.0; var sxx = 0.0; var syy = 0.0; var sxy = 0.0;
        var sse = 0.0; var n = 0.0;
        for (var y: u32 = 0u; y < 8u; y++) {
          for (var x: u32 = 0u; x < 8u; x++) {
            let px = x0 + x;
            let py = y0 + y;
            if (px >= params.full_w || py >= params.full_h) { continue; }
            let a = luma255(textureLoad(ref_tex, vec2<i32>(i32(px), i32(py)), 0).rgb);
            let b = luma255(textureLoad(test_tex, vec2<i32>(i32(px), i32(py)), 0).rgb);
            sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b;
            let d = a - b;
            sse += d * d;
            n += 1.0;
          }
        }
        let inv = 1.0 / max(n, 1.0);
        let mx = sx * inv; let my = sy * inv;
        let vx = max(sxx * inv - mx * mx, 0.0);
        let vy = max(syy * inv - my * my, 0.0);
        let cov = sxy * inv - mx * my;
        let c1 = 6.5025;
        let c2 = 58.5225;
        let ssim = ((2.0 * mx * my + c1) * (2.0 * cov + c2)) / ((mx * mx + my * my + c1) * (vx + vy + c2));
        let idx = gid.y * params.blocks_x + gid.x;
        blocks[idx].sse = sse;
        blocks[idx].ssim = ssim;
        blocks[idx].n = n;
        blocks[idx].pad = 0.0;
      }

      @group(1) @binding(0) var<storage, read> blocks_r: array<Block>;
      @group(1) @binding(1) var<storage, read_write> partial: array<vec4<f32>>;
      @group(1) @binding(2) var<uniform> params_r: Params;

      @compute @workgroup_size(256)
      fn reduce_partial(@builtin(global_invocation_id) gid: vec3<u32>) {
        let count = params_r.blocks_x * params_r.blocks_y;
        var sse = 0.0; var ssim = 0.0; var n = 0.0; var nb = 0.0;
        for (var i = gid.x; i < count; i += 256u) {
          sse += blocks_r[i].sse;
          ssim += blocks_r[i].ssim;
          n += blocks_r[i].n;
          nb += 1.0;
        }
        partial[gid.x] = vec4<f32>(sse, ssim, n, nb);
      }

      @group(2) @binding(0) var<storage, read> partial_in: array<vec4<f32>>;
      @group(2) @binding(1) var<storage, read_write> result: array<vec4<f32>>;

      @compute @workgroup_size(1)
      fn reduce_final() {
        var sse = 0.0; var ssim = 0.0; var n = 0.0; var nb = 0.0;
        for (var i = 0u; i < 256u; i++) {
          let v = partial_in[i];
          sse += v.x; ssim += v.y; n += v.z; nb += v.w;
        }
        result[0] = vec4<f32>(sse, ssim, n, nb);
      }
    `;

    function track(tex) {
      generation.push(tex);
      return tex;
    }

    function tex2d(w, h, formatName, extra) {
      return track(device.createTexture({
        size: [w, h],
        format: formatName,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | (extra || 0)
      }));
    }

    function allocTargets() {
      const retire = generation;
      generation = [];
      const lowW = Math.floor(fullW / scale);
      const lowH = Math.floor(fullH / scale);
      const midW = Math.floor(fullW / 2);
      const midH = Math.floor(fullH / 2);
      srcTex = track(device.createTexture({
        size: [fullW, fullH],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
      }));
      const copyUse = GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
      lowTex = tex2d(lowW, lowH, 'rgba8unorm', GPUTextureUsage.COPY_SRC);
      midTex = scale === 4 ? tex2d(midW, midH, 'rgba8unorm', GPUTextureUsage.COPY_SRC) : null;
      prevLow = tex2d(lowW, lowH, 'rgba8unorm', copyUse);
      recentLow = tex2d(lowW, lowH, 'rgba8unorm', copyUse);
      prevMid = scale === 4 ? tex2d(midW, midH, 'rgba8unorm', copyUse) : null;
      recentMid = scale === 4 ? tex2d(midW, midH, 'rgba8unorm', copyUse) : null;
      temporalTime = null;
      recentLowReady = false;
      recentMidReady = false;
      temporalSynced = false;
      scratchTex = tex2d(fullW, fullH, 'rgba8unorm');
      slotTex = [0, 1, 2, 3, 4].map(() => tex2d(fullW, fullH, 'rgba8unorm'));
      featLow = Array.from({ length: FEAT_POOL }, () => tex2d(lowW, lowH, 'rgba16float'));
      accLow = [tex2d(lowW, lowH, 'rgba16float'), tex2d(lowW, lowH, 'rgba16float')];
      featMid = scale === 4 ? Array.from({ length: FEAT_POOL }, () => tex2d(midW, midH, 'rgba16float')) : [];
      accMid = scale === 4 ? [tex2d(midW, midH, 'rgba16float'), tex2d(midW, midH, 'rgba16float')] : [null, null];
      if (!dummyTex) {
        dummyTex = device.createTexture({
          size: [1, 1],
          format: 'rgba16float',
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
        });
      }
      let espcnCh = 16;
      Object.keys(customModels).forEach((key) => {
        const model = customModels[key];
        if (model && model.maxCh) espcnCh = Math.max(espcnCh, model.maxCh);
      });
      ensureEspcn(espcnCh);
      uploadCanvas.width = fullW;
      uploadCanvas.height = fullH;
      for (const p of panels) {
        p.canvas.width = fullW;
        p.canvas.height = fullH;
        p.ctx.configure({ device, format, alphaMode: 'opaque' });
      }
      const blocks = Math.ceil(fullW / 8) * Math.ceil(fullH / 8);
      if (metricBufs && metricBufs.blocks) {
        metricBufs.blocks.destroy();
      }
      metricBufs = metricBufs || {};
      metricBufs.blocks = device.createBuffer({
        size: blocks * 16,
        usage: GPUBufferUsage.STORAGE
      });
      if (!metricBufs.partial) {
        metricBufs.partial = device.createBuffer({
          size: 256 * 16,
          usage: GPUBufferUsage.STORAGE
        });
        metricBufs.result = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        metricBufs.params = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        metricBufs.staging = device.createBuffer({
          size: 5 * 16,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        metricBufs.scale = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        metricBufs.loupe = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
      }
      device.queue.writeBuffer(metricBufs.scale, 0, new Uint32Array([scale, 0, 0, 0]));
      device.queue.onSubmittedWorkDone().then(() => {
        for (const t of retire) t.destroy();
      }).catch(() => {});
      const lowLabel = lowW + '×' + lowH;
      setStatus(gpuLabel + ' · ' + fullW + '×' + fullH + ' → ' + lowLabel + ' → ' + fullW + '×' + fullH + ' · loupe ' + zoom + '×');
    }

    async function initGPU() {
      if (!navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return false;
      const required = [];
      if (adapter.features.has('timestamp-query')) required.push('timestamp-query');
      device = await adapter.requestDevice({ requiredFeatures: required });
      hasTS = required.includes('timestamp-query');
      window.__gpuLost = null;
      device.lost.then((infoLost) => {
        window.__gpuLost = { reason: infoLost.reason, message: infoLost.message };
      }).catch((err) => {
        window.__gpuLost = { reason: 'lost-rejected', message: String(err && err.message || err) };
      });
      format = navigator.gpu.getPreferredCanvasFormat();
      const info = adapter.info || {};
      gpuLabel = info.description || info.device || 'WebGPU';
      device.lost.then((infoLost) => {
        if (infoLost.reason !== 'destroyed') setStatus('WebGPU device lost: ' + infoLost.message, true);
      }).catch(() => {});
      device.addEventListener('uncapturederror', (ev) => {
        setStatus(ev.error.message, true);
      });

      for (const p of panels) {
        p.ctx = p.canvas.getContext('webgpu');
        p.lctx = p.loupeCanvas.getContext('webgpu');
        p.loupeCanvas.width = LOUPE;
        p.loupeCanvas.height = LOUPE;
        if (!p.ctx || !p.lctx) return false;
        p.lctx.configure({ device, format, alphaMode: 'opaque' });
      }

      uploadCanvas = document.createElement('canvas');
      uploadCtx = uploadCanvas.getContext('2d', { alpha: false, willReadFrequently: true });

      const compute = (module, entry) => device.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: entry }
      });
      async function addPipe(name, code, entry) {
        const module = device.createShaderModule({ code });
        await shaderErr(module, name);
        return compute(module, entry);
      }
      const presentMod = device.createShaderModule({ code: PRESENT_WGSL });
      const loupeMod = device.createShaderModule({ code: LOUPE_WGSL });
      const metricMod = device.createShaderModule({ code: METRIC_WGSL });
      const downMod = device.createShaderModule({ code: DOWNSCALE_WGSL });
      const upMod = device.createShaderModule({ code: UPSCALE_WGSL });
      await Promise.all([
        shaderErr(presentMod, 'present'),
        shaderErr(loupeMod, 'loupe'),
        shaderErr(metricMod, 'metrics'),
        shaderErr(downMod, 'downsample'),
        shaderErr(upMod, 'upscale')
      ]);
      pipelines = {
        down: compute(downMod, 'main'),
        nearest: compute(upMod, 'nearest'),
        bilinear: compute(upMod, 'bilinear'),
        bicubic: compute(upMod, 'bicubic'),
        lanczos: compute(upMod, 'lanczos'),
        present: device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: presentMod, entryPoint: 'vs' },
          fragment: { module: presentMod, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-strip' }
        }),
        loupe: device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: loupeMod, entryPoint: 'vs' },
          fragment: { module: loupeMod, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-strip' }
        }),
        blocks: compute(metricMod, 'blocks_main'),
        reducePartial: compute(metricMod, 'reduce_partial'),
        reduceFinal: compute(metricMod, 'reduce_final')
      };
      const optional = [
        ['easu', UPSCALE_KERNELS.fsr, 'easu'],
        ['rcas', UPSCALE_KERNELS.fsr, 'rcas'],
        ['cas', UPSCALE_KERNELS.cas, 'cas'],
        ['unsharp', UPSCALE_KERNELS.unsharp, 'unsharp'],
        ['xbr', UPSCALE_KERNELS.xbr, 'xbr'],
        ['nis', UPSCALE_KERNELS.nis, 'nis'],
        ['conv3', UPSCALE_KERNELS.a4kConv3, 'conv3'],
        ['relu1', UPSCALE_KERNELS.a4kConv3, 'relu1'],
        ['relu2', UPSCALE_KERNELS.a4kRelu2, 'relu2'],
        ['conv1x1', UPSCALE_KERNELS.a4kConv1, 'conv1'],
        ['d2s', UPSCALE_KERNELS.a4kOut, 'd2s'],
        ['upconv', UPSCALE_KERNELS.a4kUp, 'upconv'],
        ['espcn', UPSCALE_KERNELS.espcn, 'conv'],
        ['shuffle', UPSCALE_KERNELS.shuffle, 'shuffle']
      ];
      for (const [name, code, entry] of optional) {
        try {
          pipelines[name] = await addPipe(name, code, entry);
        } catch (err) {
          kernelFail[name] = err.message || String(err);
        }
      }
      uPool = {
        conv1: uniformPool(64),
        d2s: uniformPool(16),
        espcn: uniformPool(48, 32),
        shuf: uniformPool(16, 32)
      };
      for (const key of Object.keys(uPool)) uCursor[key] = 0;
      if (pipelines.nis && typeof NIS_COEF_SCALE !== 'undefined') {
        metricBufs = metricBufs || {};
        metricBufs.nisScale = weightBuffer(NIS_COEF_SCALE);
        metricBufs.nisUsm = weightBuffer(NIS_COEF_USM);
        metricBufs.nisU = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      }
      metricBufs = metricBufs || {};
      metricBufs.xbrU = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      await loadAnimeNets();
      await loadCustomPreset();

      if (hasTS) {
        querySet = device.createQuerySet({ type: 'timestamp', count: 64 });
        tsResolve = device.createBuffer({ size: 64 * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
        tsStaging = device.createBuffer({ size: 64 * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      }
      return true;
    }

    function initCPU() {
      mode = 'cpu';
      for (const p of panels) {
        p.cpu = p.canvas.getContext('2d', { alpha: false });
        p.lcpu = p.loupeCanvas.getContext('2d', { alpha: false });
        p.loupeCanvas.width = LOUPE;
        p.loupeCanvas.height = LOUPE;
      }
      uploadCanvas = document.createElement('canvas');
      uploadCtx = uploadCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
      setStatus('WebGPU unavailable. Original, nearest, and bilinear still run on the CPU. The other methods need WebGPU.', true);
    }

    function sourceSize() {
      const stacked = video.videoHeight > video.videoWidth;
      const srcW = video.videoWidth;
      const srcH = stacked ? (video.videoHeight >> 1) : video.videoHeight;
      return { w: srcW & ~3, h: srcH & ~3, stacked };
    }

    function ensureSize() {
      if (video.readyState < 2) return false;
      const { w, h } = sourceSize();
      if (w < 16 || h < 16) return false;
      if (w !== fullW || h !== fullH || (mode === 'gpu' && !srcTex)) {
        fullW = w;
        fullH = h;
        if (mode === 'gpu') allocTargets();
        else {
          uploadCanvas.width = fullW;
          uploadCanvas.height = fullH;
          for (const p of panels) {
            if (!p.cpu) continue;
            p.canvas.width = fullW;
            p.canvas.height = fullH;
          }
        }
      }
      return true;
    }

    function captureSource() {
      const { w, h } = sourceSize();
      if (uploadCanvas.width !== w) uploadCanvas.width = w;
      if (uploadCanvas.height !== h) uploadCanvas.height = h;
      uploadCtx.drawImage(video, 0, 0, w, h, 0, 0, w, h);
    }

    function writeSource() {
      const img = uploadCtx.getImageData(0, 0, fullW, fullH);
      const unpadded = fullW * 4;
      const bytesPerRow = Math.ceil(unpadded / 256) * 256;
      let data = img.data;
      if (bytesPerRow !== unpadded) {
        const padded = new Uint8Array(bytesPerRow * fullH);
        for (let y = 0; y < fullH; y++) {
          padded.set(img.data.subarray(y * unpadded, (y + 1) * unpadded), y * bytesPerRow);
        }
        data = padded;
      }
      device.queue.writeTexture(
        { texture: srcTex },
        data,
        { bytesPerRow, rowsPerImage: fullH },
        { width: fullW, height: fullH }
      );
    }

    function dispatch(encoder, pipeline, entries, groupsX, groupsY, label, timed) {
      const pass = encoder.beginComputePass(timed || {});
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries
      }));
      pass.dispatchWorkgroups(groupsX, groupsY);
      pass.end();
      return label;
    }

    function viewOf(tex) { return tex.createView(); }

    function uniformPool(n, size) {
      const bytes = size || 16;
      return Array.from({ length: n }, () => device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      }));
    }

    function takeU(name) {
      const list = uPool[name];
      const i = uCursor[name]++;
      if (!list || !list[i]) throw new Error('Ran out of ' + name + ' uniform slots.');
      return list[i];
    }

    function resetUniforms() {
      for (const key of Object.keys(uCursor)) uCursor[key] = 0;
    }

    function ensureEspcn(channels) {
      const ch = Math.max(16, channels || 16);
      const pix = Math.max(1, Math.floor(fullW / 2) * Math.floor(fullH / 2));
      const bytes = Math.ceil((pix * ch * 4) / 16) * 16;
      if (espcnBuf[0] && espcnBytes >= bytes) return;
      for (const buf of espcnBuf) if (buf) buf.destroy();
      espcnBytes = bytes;
      espcnBuf = [0, 1].map(() => device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }));
    }

    function viewOrDummy(tex) {
      return viewOf(tex || dummyTex);
    }

    async function loadAnimeNets() {
      await Promise.all(Object.keys(NET_FILES).map(async (id) => {
        try {
          const res = await fetch(NET_FILES[id]);
          if (!res.ok) throw new Error(NET_FILES[id] + ' HTTP ' + res.status);
          const doc = await res.json();
          for (const op of doc.ops) {
            if (op.w) op.buf = weightBuffer(b64f32(op.w));
          }
          animeNets[id] = doc;
        } catch (err) {
          animeNets[id] = null;
          kernelFail['a4k-' + id] = err.message || String(err);
        }
      }));
    }

    const CUSTOM_ARCH = {
      'espcn-y': { inn: 1, out: 4, fromTex: 1, shufMode: 0, stride: 4 },
      'espcn-rgb': { inn: 3, out: 12, fromTex: 2, shufMode: 1, stride: 12 },
      'espcn-y2': { inn: 2, out: 4, fromTex: 3, shufMode: 0, stride: 4 }
    };

    function parseCustom(doc) {
      if (!doc || doc.format !== 'webartests-sr-v1') throw new Error('Expected format webartests-sr-v1.');
      const spec = CUSTOM_ARCH[doc.arch];
      if (!spec || doc.scale !== 2 || doc.residual !== true) {
        throw new Error('This loader runs espcn-y, espcn-rgb, and espcn-y2 scale-2 residual models.');
      }
      if (!Array.isArray(doc.layers) || !doc.layers.length) throw new Error('Model has no layers.');
      let expectIn = spec.inn;
      let maxCh = spec.inn;
      const layers = doc.layers.map((layer, i) => {
        if (layer.k !== 3) throw new Error('Only 3×3 convolutions are supported.');
        if (layer.in !== expectIn) throw new Error('Layer ' + (i + 1) + ' input channels do not match.');
        if (layer.out > 48) throw new Error('More than 48 channels is not supported.');
        const n = layer.out * layer.in * 9;
        if (!layer.weight || layer.weight.length !== n || !layer.bias || layer.bias.length !== layer.out) {
          throw new Error('Layer ' + (i + 1) + ' weight or bias length is wrong.');
        }
        const act = layer.activation === 'relu' ? 1 : 0;
        if (layer.activation !== 'relu' && layer.activation !== 'linear') {
          throw new Error('Activation must be relu or linear.');
        }
        expectIn = layer.out;
        maxCh = Math.max(maxCh, layer.out);
        const floats = new Float32Array(n + layer.out);
        floats.set(layer.weight, 0);
        floats.set(layer.bias, n);
        return { in: layer.in, out: layer.out, act, buf: weightBuffer(floats) };
      });
      if (layers[0].in !== spec.inn) throw new Error('The first layer input channels do not match this arch.');
      if (layers[layers.length - 1].out !== spec.out) {
        throw new Error('The last layer must output ' + spec.out + ' channels for an x2 pixel shuffle.');
      }
      return {
        name: doc.name || 'Custom model',
        layers,
        maxCh,
        arch: doc.arch,
        fromTex: spec.fromTex,
        shufMode: spec.shufMode,
        stride: spec.stride
      };
    }

    async function installCustom(slot, doc) {
      try {
        const model = parseCustom(doc);
        customModels[slot] = model;
        if (fullW) ensureEspcn(model.maxCh);
      } catch (err) {
        customModels[slot] = { error: err.message || String(err) };
      }
      if (activeTab === 'custom') selectTab('custom', false);
      else if (fullW) renderFrame();
    }

    async function loadCustomURL(panel, url) {
      const method = methodOf(panel);
      if (!method || method.kind !== 'custom') return;
      panel.timeEl.textContent = 'loading…';
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        await installCustom(method.slot, await res.json());
      } catch (err) {
        customModels[method.slot] = { error: err.message || String(err) };
        selectTab(activeTab, false);
      }
    }

    function readModelFile(panel, file) {
      const method = methodOf(panel);
      if (!method || method.kind !== 'custom') return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          installCustom(method.slot, JSON.parse(String(reader.result)));
        } catch (err) {
          customModels[method.slot] = { error: err.message || String(err) };
          selectTab(activeTab, false);
        }
      };
      reader.readAsText(file);
    }

    async function loadCustomPreset() {
      const jobs = Object.keys(METHODS).filter((id) => METHODS[id].kind === 'custom' && METHODS[id].preset);
      await Promise.all(jobs.map(async (id) => {
        const method = METHODS[id];
        try {
          const res = await fetch(method.preset);
          if (!res.ok) throw new Error(method.preset + ' HTTP ' + res.status);
          customModels[method.slot] = parseCustom(await res.json());
        } catch (err) {
          customModels[method.slot] = { error: err.message || String(err) };
        }
      }));
    }

    function animePassCount(net) {
      let n = 0;
      for (const op of net.ops) n += op.op === 'conv1' ? Math.ceil(op.srcs.length / 4) : 1;
      return n * (scale === 4 ? 2 : 1);
    }

    function runFilter(encoder, id, src, dest, timed) {
      dispatch(encoder, pipelines[id], [
        { binding: 0, resource: viewOf(src) },
        { binding: 1, resource: viewOf(dest) }
      ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), id, timed);
    }

    function runAnimeOnce(encoder, net, colorTex, dest, pool, accPair, nextStamp) {
      const map = Object.create(null);
      let used = 0;
      const claim = (name) => {
        if (map[name]) return map[name];
        if (used >= pool.length) throw new Error('Anime4K needs more feature maps than were allocated.');
        map[name] = pool[used++];
        return map[name];
      };
      const srcTexOf = (name) => (name === 'MAIN' ? colorTex : map[name]);
      const gw = Math.ceil(colorTex.width / 8);
      const gh = Math.ceil(colorTex.height / 8);
      for (const op of net.ops) {
        if (op.op === 'conv3' || op.op === 'conv3relu') {
          const dst = claim(op.dst);
          const src0 = srcTexOf(op.srcs[0]);
          if (op.op === 'conv3') {
            dispatch(encoder, pipelines.conv3, [
              { binding: 0, resource: viewOf(src0) },
              { binding: 1, resource: viewOf(dst) },
              { binding: 2, resource: { buffer: op.buf } }
            ], gw, gh, 'a4k', nextStamp());
          } else if (op.srcs.length === 1) {
            dispatch(encoder, pipelines.relu1, [
              { binding: 0, resource: viewOf(src0) },
              { binding: 1, resource: viewOf(dst) },
              { binding: 2, resource: { buffer: op.buf } }
            ], gw, gh, 'a4k', nextStamp());
          } else {
            dispatch(encoder, pipelines.relu2, [
              { binding: 0, resource: viewOf(src0) },
              { binding: 1, resource: viewOf(srcTexOf(op.srcs[1])) },
              { binding: 2, resource: viewOf(dst) },
              { binding: 3, resource: { buffer: op.buf } }
            ], gw, gh, 'a4k', nextStamp());
          }
        } else if (op.op === 'conv1') {
          const chunks = Math.ceil(op.srcs.length / 4);
          const paired = op.srcs.length % 2 === 0 && op.srcs.every((name, i) => i % 2 === 0 || name === op.srcs[i - 1] + '1');
          let prev = null;
          for (let c = 0; c < chunks; c++) {
            const last = c === chunks - 1;
            const dst = last ? claim(op.dst) : accPair[c % 2];
            const read = c === 0 ? dummyTex : prev;
            const u = takeU('conv1');
            const flags = (c > 0 ? 1 : 0) | (last ? 2 : 0) | (paired ? 4 : 0);
            device.queue.writeBuffer(u, 0, new Uint32Array([
              Math.min(4, op.srcs.length - c * 4),
              c * 4 * 32,
              op.n * 16,
              flags
            ]));
            const texes = [0, 1, 2, 3].map((k) => srcTexOf(op.srcs[c * 4 + k]) || dummyTex);
            dispatch(encoder, pipelines.conv1x1, [
              { binding: 0, resource: viewOf(texes[0]) },
              { binding: 1, resource: viewOf(texes[1]) },
              { binding: 2, resource: viewOf(texes[2]) },
              { binding: 3, resource: viewOf(texes[3]) },
              { binding: 4, resource: viewOf(read) },
              { binding: 5, resource: viewOf(dst) },
              { binding: 6, resource: { buffer: op.buf } },
              { binding: 7, resource: { buffer: u } }
            ], gw, gh, 'a4k', nextStamp());
            prev = dst;
          }
        } else if (op.op === 'd2s') {
          const u = takeU('d2s');
          device.queue.writeBuffer(u, 0, new Uint32Array([op.mode === 'rgb' ? 1 : 0, 0, 0, 0]));
          const feats = op.feats.map((name) => map[name] || dummyTex);
          dispatch(encoder, pipelines.d2s, [
            { binding: 0, resource: viewOf(colorTex) },
            { binding: 1, resource: viewOrDummy(feats[0]) },
            { binding: 2, resource: viewOrDummy(feats[1]) },
            { binding: 3, resource: viewOrDummy(feats[2]) },
            { binding: 4, resource: viewOf(dest) },
            { binding: 5, resource: { buffer: u } }
          ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'a4k', nextStamp());
        } else if (op.op === 'upconv') {
          dispatch(encoder, pipelines.upconv, [
            { binding: 0, resource: viewOf(colorTex) },
            { binding: 1, resource: viewOf(map[op.srcs[0]]) },
            { binding: 2, resource: viewOf(map[op.srcs[1]]) },
            { binding: 3, resource: viewOf(dest) },
            { binding: 4, resource: { buffer: op.buf } }
          ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'a4k', nextStamp());
        }
      }
    }

    function copyTex(encoder, src, dst) {
      encoder.copyTextureToTexture(
        { texture: src },
        { texture: dst },
        [src.width, src.height, 1]
      );
    }

    function syncTemporalBefore(encoder) {
      if (temporalSynced) return;
      temporalSynced = true;
      const t = video.currentTime;
      const same = temporalTime !== null && Math.abs(t - temporalTime) < 1e-4;
      temporalRepeat = same;
      if (same) return;
      const backward = temporalTime !== null && t < temporalTime - 1e-4;
      if (backward || !recentLowReady) {
        copyTex(encoder, lowTex, prevLow);
        temporalSeedMid = true;
      } else {
        copyTex(encoder, recentLow, prevLow);
        temporalSeedMid = !(scale === 4 && recentMidReady && prevMid && recentMid);
        if (!temporalSeedMid) copyTex(encoder, recentMid, prevMid);
      }
    }

    function syncTemporalMid(encoder) {
      if (temporalRepeat || !temporalSeedMid || !midTex || !prevMid) return;
      copyTex(encoder, midTex, prevMid);
    }

    function syncTemporalAfter(encoder) {
      if (temporalRepeat) return;
      copyTex(encoder, lowTex, recentLow);
      recentLowReady = true;
      if (scale === 4 && midTex && recentMid) {
        copyTex(encoder, midTex, recentMid);
        recentMidReady = true;
      }
      temporalTime = video.currentTime;
    }

    function runCustomOnce(encoder, model, colorTex, prevTex, dest, nextStamp) {
      let fromTex = model.fromTex || 1;
      let readBuf = espcnBuf[0];
      let writeBuf = espcnBuf[1];
      const w = colorTex.width;
      const h = colorTex.height;
      const prevView = viewOf(prevTex || colorTex);
      for (const layer of model.layers) {
        const u = takeU('espcn');
        device.queue.writeBuffer(u, 0, new Uint32Array([w, h, layer.in, layer.out, layer.act, fromTex, 0, 0]));
        dispatch(encoder, pipelines.espcn, [
          { binding: 0, resource: viewOf(colorTex) },
          { binding: 1, resource: prevView },
          { binding: 2, resource: { buffer: readBuf } },
          { binding: 3, resource: { buffer: writeBuf } },
          { binding: 4, resource: { buffer: layer.buf } },
          { binding: 5, resource: { buffer: u } }
        ], Math.ceil(w / 8), Math.ceil(h / 8), 'custom', nextStamp());
        fromTex = 0;
        const swap = readBuf;
        readBuf = writeBuf;
        writeBuf = swap;
      }
      const last = readBuf;
      const su = takeU('shuf');
      device.queue.writeBuffer(su, 0, new Uint32Array([
        dest.width, dest.height, w, h, model.shufMode || 0, model.stride || 4, 0, 0
      ]));
      dispatch(encoder, pipelines.shuffle, [
        { binding: 0, resource: viewOf(colorTex) },
        { binding: 1, resource: { buffer: last } },
        { binding: 2, resource: viewOf(dest) },
        { binding: 3, resource: { buffer: su } }
      ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'custom', nextStamp());
    }

    function blockReason(methodId) {
      const method = METHODS[methodId];
      if (!pipelines) return 'WebGPU is still starting.';
      const need = method.kind === 'filter' ? [methodId]
        : method.kind === 'unsharp' ? ['lanczos', 'unsharp']
        : method.kind === 'fsr' ? ['easu', 'rcas']
        : method.kind === 'cas' ? ['bilinear', 'cas']
        : method.kind === 'xbr' ? ['xbr']
        : method.kind === 'nis' ? ['nis']
        : method.kind === 'custom' ? ['espcn', 'shuffle']
        : method.kind === 'a4k'
          ? ['conv3', 'relu1', 'relu2', 'conv1x1', 'd2s'].concat(method.net === 'gan-s' ? ['upconv'] : [])
          : [];
      for (const name of need) {
        if (!pipelines[name]) return kernelFail[name] || (name + ' did not compile.');
      }
      if (method.kind === 'a4k' && !animeNets[method.net]) {
        return kernelFail['a4k-' + method.net] || 'Anime4K weights are still loading.';
      }
      if (method.kind === 'nis' && !(metricBufs && metricBufs.nisScale)) return 'NIS coefficients did not load.';
      return null;
    }

    function dispatchCount(methodId) {
      const method = METHODS[methodId];
      if (!method) return 0;
      if (method.kind === 'filter' || method.kind === 'xbr') return 1;
      if (method.kind === 'unsharp' || method.kind === 'fsr' || method.kind === 'cas') return 2;
      if (method.kind === 'nis') return scale === 4 ? 2 : 1;
      if (method.kind === 'a4k') {
        const net = animeNets[method.net];
        return net ? animePassCount(net) : 0;
      }
      if (method.kind === 'custom') {
        const model = customModels[method.slot];
        if (!model || model.error) return 0;
        return (model.layers.length + 1) * (scale === 4 ? 2 : 1);
      }
      return 0;
    }

    function runMethod(encoder, methodId, dest, nextStamp) {
      const method = METHODS[methodId];
      if (method.kind === 'filter') {
        runFilter(encoder, methodId, lowTex, dest, nextStamp());
        return;
      }
      if (method.kind === 'unsharp') {
        runFilter(encoder, 'lanczos', lowTex, scratchTex, nextStamp());
        dispatch(encoder, pipelines.unsharp, [
          { binding: 0, resource: viewOf(scratchTex) },
          { binding: 1, resource: viewOf(dest) }
        ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'unsharp', nextStamp());
        return;
      }
      if (method.kind === 'fsr') {
        runFilter(encoder, 'easu', lowTex, scratchTex, nextStamp());
        runFilter(encoder, 'rcas', scratchTex, dest, nextStamp());
        return;
      }
      if (method.kind === 'cas') {
        runFilter(encoder, 'bilinear', lowTex, scratchTex, nextStamp());
        runFilter(encoder, 'cas', scratchTex, dest, nextStamp());
        return;
      }
      if (method.kind === 'xbr') {
        device.queue.writeBuffer(metricBufs.xbrU, 0, new Float32Array([scale, 0, 0, 0]));
        dispatch(encoder, pipelines.xbr, [
          { binding: 0, resource: viewOf(lowTex) },
          { binding: 1, resource: viewOf(dest) },
          { binding: 2, resource: { buffer: metricBufs.xbrU } }
        ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'xbr', nextStamp());
        return;
      }
      if (method.kind === 'nis') {
        if (scale === 4) {
          runNis(encoder, lowTex, midTex, nextStamp());
          runNis(encoder, midTex, dest, nextStamp());
        } else {
          runNis(encoder, lowTex, dest, nextStamp());
        }
        return;
      }
      if (method.kind === 'a4k') {
        const net = animeNets[method.net];
        if (scale === 4) {
          runAnimeOnce(encoder, net, lowTex, midTex, featLow, accLow, nextStamp);
          runAnimeOnce(encoder, net, midTex, dest, featMid, accMid, nextStamp);
        } else {
          runAnimeOnce(encoder, net, lowTex, dest, featLow, accLow, nextStamp);
        }
        return;
      }
      if (method.kind === 'custom') {
        const model = customModels[method.slot];
        ensureEspcn(model.maxCh);
        const temporal = model.fromTex === 3;
        if (temporal) syncTemporalBefore(encoder);
        const prevLowTex = temporal ? prevLow : lowTex;
        const prevMidTex = temporal ? prevMid : midTex;
        if (scale === 4) {
          runCustomOnce(encoder, model, lowTex, prevLowTex, midTex, nextStamp);
          if (temporal) syncTemporalMid(encoder);
          runCustomOnce(encoder, model, midTex, prevMidTex || midTex, dest, nextStamp);
        } else {
          runCustomOnce(encoder, model, lowTex, prevLowTex, dest, nextStamp);
        }
        if (temporal) syncTemporalAfter(encoder);
      }
    }

    function runNis(encoder, src, dest, timed) {
      device.queue.writeBuffer(metricBufs.nisU, 0, new Float32Array([
        src.width / dest.width,
        src.height / dest.height,
        0, 0
      ]));
      dispatch(encoder, pipelines.nis, [
        { binding: 0, resource: viewOf(src) },
        { binding: 1, resource: viewOf(dest) },
        { binding: 2, resource: { buffer: metricBufs.nisScale } },
        { binding: 3, resource: { buffer: metricBufs.nisUsm } },
        { binding: 4, resource: { buffer: metricBufs.nisU } }
      ], Math.ceil(dest.width / 8), Math.ceil(dest.height / 8), 'nis', timed);
    }

    function present(encoder, ctx, tex) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 }
        }]
      });
      pass.setPipeline(pipelines.present);
      pass.setBindGroup(0, device.createBindGroup({
        layout: pipelines.present.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: viewOf(tex) }]
      }));
      pass.draw(4);
      pass.end();
    }

    function loupeWindow() {
      const span = Math.max(4, Math.round(LOUPE / zoom));
      return span;
    }

    function writeLoupeUniform() {
      if (!hover) return;
      const span = loupeWindow();
      const cx = Math.floor(hover.u * fullW) + 0.5;
      const cy = Math.floor(hover.v * fullH) + 0.5;
      device.queue.writeBuffer(metricBufs.loupe, 0, new Float32Array([cx, cy, span, span]));
    }

    function drawLoupes(encoder) {
      if (!hover || !srcTex) return;
      writeLoupeUniform();
      const texFor = (p) => {
        if (p.id === 'original') return srcTex;
        if (!p.live) return null;
        return slotTex[panels.indexOf(p) - 1];
      };
      for (const p of panels) {
        const tex = texFor(p);
        if (!tex || !p.lctx) {
          p.loupe.style.display = 'none';
          continue;
        }
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: p.lctx.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 }
          }]
        });
        pass.setPipeline(pipelines.loupe);
        pass.setBindGroup(0, device.createBindGroup({
          layout: pipelines.loupe.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: viewOf(tex) },
            { binding: 1, resource: { buffer: metricBufs.loupe } }
          ]
        }));
        pass.draw(4);
        pass.end();
        p.loupe.style.display = 'block';
      }
    }

    function positionLoupes() {
      for (const p of panels) {
        if (!hover || (p.id !== 'original' && !p.live)) {
          p.loupe.style.display = 'none';
          continue;
        }
        const vw = p.view.clientWidth;
        const vh = p.view.clientHeight;
        p.loupe.style.display = 'block';
        p.loupe.style.left = (hover.u * vw - LOUPE / 2) + 'px';
        p.loupe.style.top = (hover.v * vh - LOUPE / 2) + 'px';
      }
    }

    function metricPasses(encoder, testTex, slot) {
      const bw = Math.ceil(fullW / 8);
      const bh = Math.ceil(fullH / 8);
      device.queue.writeBuffer(metricBufs.params, 0, new Uint32Array([bw, bh, fullW, fullH]));
      const blockPass = encoder.beginComputePass();
      blockPass.setPipeline(pipelines.blocks);
      blockPass.setBindGroup(0, device.createBindGroup({
        layout: pipelines.blocks.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: viewOf(srcTex) },
          { binding: 1, resource: viewOf(testTex) },
          { binding: 2, resource: { buffer: metricBufs.blocks } },
          { binding: 3, resource: { buffer: metricBufs.params } }
        ]
      }));
      blockPass.dispatchWorkgroups(Math.ceil(bw / 8), Math.ceil(bh / 8));
      blockPass.end();

      const partial = encoder.beginComputePass();
      partial.setPipeline(pipelines.reducePartial);
      partial.setBindGroup(1, device.createBindGroup({
        layout: pipelines.reducePartial.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: { buffer: metricBufs.blocks } },
          { binding: 1, resource: { buffer: metricBufs.partial } },
          { binding: 2, resource: { buffer: metricBufs.params } }
        ]
      }));
      partial.dispatchWorkgroups(1);
      partial.end();

      const fin = encoder.beginComputePass();
      fin.setPipeline(pipelines.reduceFinal);
      fin.setBindGroup(2, device.createBindGroup({
        layout: pipelines.reduceFinal.getBindGroupLayout(2),
        entries: [
          { binding: 0, resource: { buffer: metricBufs.partial } },
          { binding: 1, resource: { buffer: metricBufs.result } }
        ]
      }));
      fin.dispatchWorkgroups(1);
      fin.end();
      encoder.copyBufferToBuffer(metricBufs.result, 0, metricBufs.staging, slot * 16, 16);
    }

    function applyMetrics(floats) {
      for (let i = 0; i < 5; i++) {
        const panel = panels[i + 1];
        if (!panel.live) continue;
        const sse = floats[i * 4];
        const ssimSum = floats[i * 4 + 1];
        const n = floats[i * 4 + 2];
        const nb = floats[i * 4 + 3];
        if (!n || !nb) continue;
        const mse = sse / n;
        const psnr = mse <= 1e-8 ? Infinity : 10 * Math.log10((255 * 255) / mse);
        const ssim = Math.max(0, Math.min(1, ssimSum / nb));
        const psnrText = psnr === Infinity ? '∞ dB' : psnr.toFixed(2) + ' dB';
        panel.qualEl.textContent = 'PSNR ' + psnrText + ' · SSIM ' + ssim.toFixed(3);
        panel.qualEl.classList.remove('dim');
      }
      const original = panels.find((p) => p.id === 'original');
      original.qualEl.textContent = 'reference';
      original.qualEl.classList.remove('dim');
    }

    function applyTimes(pairs) {
      const sums = {};
      for (const pair of pairs) {
        const ms = Number(pair.dt) / 1e6;
        if (!Number.isFinite(ms) || ms < 0) continue;
        sums[pair.label] = (sums[pair.label] || 0) + ms;
      }
      for (const p of panels) {
        const ms = p.id === 'original' || !p.live ? null : sums[p.methodId];
        if (ms == null) {
          if (p.id === 'original') p.timeEl.textContent = presentFps ? (presentFps.toFixed(0) + ' fps view') : 'source';
          continue;
        }
        p.timeEl.textContent = ms.toFixed(2) + ' ms · ' + (1000 / Math.max(ms, 0.01)).toFixed(0) + ' fps';
      }
      const down = sums.down;
      const head = gpuLabel + ' · ' + fullW + '×' + fullH + ' → ' + Math.floor(fullW / scale) + '×' + Math.floor(fullH / scale) +
        ' → ' + fullW + '×' + fullH + ' · loupe ' + zoom + '×';
      const extra = down != null ? ' · downsample ' + down.toFixed(2) + ' ms' : '';
      const fps = presentFps ? ' · ' + presentFps.toFixed(0) + ' fps' : '';
      setStatus(head + extra + fps);
    }

    function finishRead(labels, tsCount, doMetrics, gen) {
      if (readInFlight) return;
      readInFlight = true;
      device.queue.onSubmittedWorkDone().then(async () => {
        let tsMapped = false;
        let metricMapped = false;
        try {
          if (gen !== frameGen) return;
          if (tsCount && tsStaging) {
            await tsStaging.mapAsync(GPUMapMode.READ);
            tsMapped = true;
            const raw = new BigUint64Array(tsStaging.getMappedRange()).slice(0, tsCount);
            tsStaging.unmap();
            tsMapped = false;
            if (gen !== frameGen) return;
            const pairs = [];
            for (let i = 0; i < tsCount; i += 2) {
              const dt = raw[i + 1] - raw[i];
              if (dt < 0n) continue;
              pairs.push({ label: labels[i / 2], dt });
            }
            applyTimes(pairs);
          }
          if (doMetrics && metricBufs && metricBufs.staging) {
            if (gen !== frameGen) return;
            await metricBufs.staging.mapAsync(GPUMapMode.READ);
            metricMapped = true;
            const floats = new Float32Array(metricBufs.staging.getMappedRange()).slice();
            metricBufs.staging.unmap();
            metricMapped = false;
            if (gen !== frameGen) return;
            applyMetrics(floats);
          }
        } catch (err) {
          if (tsMapped) tsStaging.unmap();
          if (metricMapped) metricBufs.staging.unmap();
          setStatus(err.message || String(err), true);
        } finally {
          readInFlight = false;
          if (measureQueued && video.paused) {
            measureQueued = false;
            renderFrame();
          }
        }
      }).catch((err) => {
        readInFlight = false;
        setStatus(err.message || String(err), true);
      });
    }

    let tsLabels = [];
    let frameGen = 0;

    function renderGPU() {
      const gen = ++frameGen;
      temporalSynced = false;
      captureSource();
      writeSource();
      const lowW = Math.floor(fullW / scale);
      const lowH = Math.floor(fullH / scale);
      const wantMeasure = metricsEnabled && !readInFlight && (video.paused || (frameSerial % 8) === 0);
      measuring = wantMeasure;
      if (!wantMeasure && video.paused && metricsEnabled) measureQueued = true;
      tsLabels = [];
      let tsCount = 0;
      const timedFor = (label) => {
        if (!measuring || !hasTS) return {};
        const begin = tsCount;
        tsCount += 2;
        tsLabels.push(label);
        return { timestampWrites: { querySet, beginningOfPassWriteIndex: begin, endOfPassWriteIndex: begin + 1 } };
      };

      const encoder = device.createCommandEncoder();
      dispatch(encoder, pipelines.down, [
        { binding: 0, resource: viewOf(srcTex) },
        { binding: 1, resource: viewOf(lowTex) },
        { binding: 2, resource: { buffer: metricBufs.scale } }
      ], Math.ceil(lowW / 8), Math.ceil(lowH / 8), 'down', timedFor('down'));

      resetUniforms();
      const spanFor = (label, total) => {
        if (!measuring || !hasTS || total <= 0) return () => ({});
        const begin = tsCount;
        tsCount += 2;
        tsLabels.push(label);
        let i = 0;
        return () => {
          const role = total === 1 ? 'both' : (i === 0 ? 'begin' : (i === total - 1 ? 'end' : 'none'));
          i += 1;
          if (role === 'none') return {};
          const tw = { querySet };
          if (role === 'begin' || role === 'both') tw.beginningOfPassWriteIndex = begin;
          if (role === 'end' || role === 'both') tw.endOfPassWriteIndex = begin + 1;
          return { timestampWrites: tw };
        };
      };
      for (let s = 0; s < 5; s++) {
        const panel = panels[s + 1];
        const method = methodOf(panel);
        if (!panel.live || !method) continue;
        const total = dispatchCount(panel.methodId);
        const nextStamp = spanFor(panel.methodId, total);
        runMethod(encoder, panel.methodId, slotTex[s], nextStamp);
      }

      const doMetrics = measuring && metricsEnabled;
      if (doMetrics) {
        for (let s = 0; s < 5; s++) {
          const panel = panels[s + 1];
          if (!panel.live) continue;
          metricPasses(encoder, slotTex[s], s);
        }
      }

      present(encoder, panels[0].ctx, srcTex);
      for (let s = 0; s < 5; s++) {
        const panel = panels[s + 1];
        if (!panel.live || !panel.ctx) {
          const pass = encoder.beginRenderPass({
            colorAttachments: [{
              view: panel.ctx.getCurrentTexture().createView(),
              loadOp: 'clear',
              storeOp: 'store',
              clearValue: { r: 0, g: 0, b: 0, a: 1 }
            }]
          });
          pass.end();
          continue;
        }
        present(encoder, panel.ctx, slotTex[s]);
      }
      if (hover) drawLoupes(encoder);

      if (measuring && hasTS && tsCount) {
        encoder.resolveQuerySet(querySet, 0, tsCount, tsResolve, 0);
        encoder.copyBufferToBuffer(tsResolve, 0, tsStaging, 0, tsCount * 8);
      }

      device.pushErrorScope('validation');
      let command = null;
      try {
        command = encoder.finish();
      } catch (err) {
        device.popErrorScope().catch(() => {});
        throw err;
      }
      device.queue.submit([command]);
      device.popErrorScope().then((err) => {
        if (!err) return;
        window.__gpuErrors = window.__gpuErrors || [];
        window.__gpuErrors.push(err.message);
        if (hasTS && /timestamp|query/i.test(err.message)) {
          hasTS = false;
          setStatus('GPU timers are off on this device. ' + err.message, true);
          renderFrame();
          return;
        }
        if (/metric|ssim|block/i.test(err.message)) metricsEnabled = false;
        setStatus(err.message, true);
      }).catch((err) => {
        window.__gpuErrors = window.__gpuErrors || [];
        window.__gpuErrors.push(String(err && err.message || err));
      });
      if (measuring && (hasTS || doMetrics)) finishRead(tsLabels.slice(), hasTS ? tsCount : 0, doMetrics, gen);
      if (!hasTS) {
        for (const p of panels) {
          if (p.id === 'original') p.timeEl.textContent = presentFps ? (presentFps.toFixed(0) + ' fps view') : 'source';
          else if (p.live) p.timeEl.textContent = 'GPU timer off';
        }
      }
    }

    function renderCPU() {
      captureSource();
      const lowW = Math.floor(fullW / scale);
      const lowH = Math.floor(fullH / scale);
      const small = uploadCanvas;
      // Rebuild a box-downscaled bitmap in a side canvas.
      if (!renderCPU.small) {
        renderCPU.small = document.createElement('canvas');
        renderCPU.sctx = renderCPU.small.getContext('2d', { alpha: false });
      }
      const sc = renderCPU.small;
      if (sc.width !== lowW || sc.height !== lowH) {
        sc.width = lowW;
        sc.height = lowH;
      }
      const src = uploadCtx.getImageData(0, 0, fullW, fullH).data;
      const low = renderCPU.sctx.createImageData(lowW, lowH);
      const area = scale * scale;
      for (let y = 0; y < lowH; y++) {
        for (let x = 0; x < lowW; x++) {
          let r = 0, g = 0, b = 0;
          for (let oy = 0; oy < scale; oy++) {
            for (let ox = 0; ox < scale; ox++) {
              const si = ((y * scale + oy) * fullW + (x * scale + ox)) * 4;
              r += src[si]; g += src[si + 1]; b += src[si + 2];
            }
          }
          const di = (y * lowW + x) * 4;
          low.data[di] = r / area;
          low.data[di + 1] = g / area;
          low.data[di + 2] = b / area;
          low.data[di + 3] = 255;
        }
      }
      renderCPU.sctx.putImageData(low, 0, 0);
      const original = panels.find((p) => p.id === 'original');
      original.cpu.drawImage(uploadCanvas, 0, 0);
      original.timeEl.textContent = 'source';
      original.qualEl.textContent = 'reference';
      for (const p of panels) {
        if (p.id === 'original' || !p.cpu || !p.live) continue;
        if (p.methodId !== 'nearest' && p.methodId !== 'bilinear') continue;
        p.cpu.imageSmoothingEnabled = p.methodId === 'bilinear';
        p.cpu.imageSmoothingQuality = 'low';
        p.cpu.drawImage(sc, 0, 0, fullW, fullH);
        p.timeEl.textContent = 'CPU';
      }
      if (hover) drawLoupesCPU();
    }

    function drawLoupesCPU() {
      if (!hover) return;
      const span = loupeWindow();
      const sx = Math.floor(hover.u * fullW) + 0.5 - span / 2;
      const sy = Math.floor(hover.v * fullH) + 0.5 - span / 2;
      for (const p of panels) {
        if (!p.lcpu || !p.cpu || (p.id !== 'original' && !p.live)) {
          p.loupe.style.display = 'none';
          continue;
        }
        p.lcpu.imageSmoothingEnabled = false;
        p.lcpu.clearRect(0, 0, LOUPE, LOUPE);
        p.lcpu.drawImage(p.canvas, sx, sy, span, span, 0, 0, LOUPE, LOUPE);
        p.loupe.style.display = 'block';
      }
    }

    function renderLoupesOnly() {
      if (!hover || !fullW) return;
      positionLoupes();
      if (mode === 'cpu') {
        drawLoupesCPU();
        return;
      }
      if (!srcTex || !pipelines) return;
      const encoder = device.createCommandEncoder();
      drawLoupes(encoder);
      device.queue.submit([encoder.finish()]);
    }

    function renderFrame() {
      if (!booted || !ensureSize()) return;
      frameSerial++;
      if (!video.paused) {
        fpsCount++;
        const now = performance.now();
        if (now - fpsStamp > 500) {
          presentFps = fpsCount * 1000 / (now - fpsStamp);
          fpsCount = 0;
          fpsStamp = now;
        }
      }
      try {
        if (mode === 'gpu') renderGPU();
        else renderCPU();
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
    }

    function setHover(next) {
      hover = next;
      positionLoupes();
      if (!next) return;
      if (video.paused) renderLoupesOnly();
    }

    function updatePlayButton() {
      document.getElementById('play').textContent = video.paused ? 'Play' : 'Pause';
    }

    function watchFrames() {
      if (watching) return;
      watching = true;
      const tick = () => {
        if (video.paused) { watching = false; return; }
        renderFrame();
        if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(tick);
        else requestAnimationFrame(tick);
      };
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(tick);
      else requestAnimationFrame(tick);
    }

    function togglePlay() {
      if (video.paused) {
        video.play().then(() => { updatePlayButton(); watchFrames(); }).catch((err) => {
          setStatus(err.message || 'Playback was blocked.', true);
        });
      } else {
        video.pause();
      }
    }

    function clipDuration() {
      if (Number.isFinite(video.duration) && video.duration > 0 && video.seekable.length && video.seekable.end(0) > 0) {
        return video.seekable.end(video.seekable.length - 1);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
      return 0;
    }

    function applyStartTime() {
      if (startApplied) return false;
      const start = Number(q.get('t'));
      const dur = clipDuration();
      if (!Number.isFinite(start) || start <= 0 || dur <= 0) return false;
      if (video.seekable.length && video.seekable.end(0) <= 0) return false;
      startApplied = true;
      video.currentTime = Math.min(start, Math.max(dur - 0.001, 0));
      return true;
    }

    async function loadClip() {
      const res = await fetch('testdata/red-green-top-eye.mp4');
      if (!res.ok) throw new Error('Could not load testdata/red-green-top-eye.mp4 (' + res.status + ').');
      const blob = await res.blob();
      video.src = URL.createObjectURL(blob);
    }

    function stepFrame(dir) {
      video.pause();
      const dur = clipDuration();
      const next = Math.max(video.currentTime + dir / 60, 0);
      video.currentTime = dur ? Math.min(next, Math.max(dur - 0.001, 0)) : next;
    }

    function setScale(next) {
      scale = next;
      document.getElementById('scale-2').classList.toggle('primary', scale === 2);
      document.getElementById('scale-4').classList.toggle('primary', scale === 4);
      if (mode === 'gpu' && fullW) allocTargets();
      selectTab(activeTab, false);
    }

    function wireUI() {
      document.getElementById('play').addEventListener('click', togglePlay);
      document.getElementById('step-back').addEventListener('click', () => stepFrame(-1));
      document.getElementById('step-fwd').addEventListener('click', () => stepFrame(1));
      document.getElementById('scale-2').addEventListener('click', () => setScale(2));
      document.getElementById('scale-4').addEventListener('click', () => setScale(4));
      const zoomInput = document.getElementById('zoom');
      zoomInput.addEventListener('input', () => {
        zoom = Number(zoomInput.value);
        document.getElementById('zoom-val').textContent = zoom + '×';
        if (hover) renderLoupesOnly();
      });
      const scrub = document.getElementById('scrub');
      scrub.addEventListener('pointerdown', () => { scrubbing = true; video.pause(); });
      scrub.addEventListener('input', () => {
        const dur = clipDuration();
        if (!dur) return;
        video.currentTime = (Number(scrub.value) / 1000) * dur;
        document.getElementById('cur-time').textContent = fmtTime(video.currentTime);
      });
      window.addEventListener('pointerup', () => { scrubbing = false; });
      video.addEventListener('timeupdate', () => {
        document.getElementById('cur-time').textContent = fmtTime(video.currentTime);
        if (!scrubbing && video.duration) {
          scrub.value = String(Math.round(1000 * video.currentTime / video.duration));
        }
      });
      video.addEventListener('durationchange', () => {
        document.getElementById('dur-time').textContent = fmtTime(video.duration);
      });
      video.addEventListener('loadeddata', () => {
        document.getElementById('dur-time').textContent = fmtTime(video.duration);
        if (!applyStartTime()) renderFrame();
        if (q.get('play') === '1') togglePlay();
      });
      video.addEventListener('seeked', () => renderFrame());
      video.addEventListener('play', () => { updatePlayButton(); watchFrames(); });
      video.addEventListener('pause', () => { updatePlayButton(); renderFrame(); });
      video.addEventListener('error', () => {
        setStatus('Could not load testdata/red-green-top-eye.mp4.', true);
      });
      grid.addEventListener('pointermove', (ev) => {
        const view = ev.target.closest('.view');
        if (!view) { setHover(null); return; }
        const rect = view.getBoundingClientRect();
        const u = (ev.clientX - rect.left) / rect.width;
        const v = (ev.clientY - rect.top) / rect.height;
        if (u < 0 || v < 0 || u > 1 || v > 1) { setHover(null); return; }
        setHover({ u, v });
      });
      grid.addEventListener('pointerleave', () => setHover(null));
      window.addEventListener('keydown', (ev) => {
        if (ev.code !== 'Space' || ev.target !== document.body) return;
        ev.preventDefault();
        togglePlay();
      });
      window.addEventListener('resize', () => { if (hover) positionLoupes(); });
      window.addEventListener('hashchange', () => {
        const id = location.hash.replace('#', '');
        if (TABS.some((tab) => tab.id === id) && id !== activeTab) selectTab(id, false);
      });
    }

    async function main() {
      buildDOM();
      wireUI();
      document.getElementById('scale-2').classList.toggle('primary', scale === 2);
      document.getElementById('scale-4').classList.toggle('primary', scale === 4);
      try {
        const [, ok] = await Promise.all([
          loadClip(),
          initGPU()
        ]);
        if (ok) mode = 'gpu';
        else initCPU();
      } catch (err) {
        setStatus(err.message || String(err), true);
        if (!device) initCPU();
      }
      booted = true;
      const hash = location.hash.replace('#', '');
      selectTab(TABS.some((tab) => tab.id === hash) ? hash : 'universal', false);
      if (video.readyState >= 2) {
        document.getElementById('dur-time').textContent = fmtTime(video.duration);
        if (!applyStartTime()) renderFrame();
      }
    }

    main();
  