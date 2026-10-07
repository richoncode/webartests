import"./modulepreload-polyfill-P2Xu9kJm.js";import{d as e,t}from"./voice-BsUSyx_d.js";function n(e,t){a();let n=document.createElement(`section`);n.className=t.floating?`fire-audio fire-audio-floating`:`fire-audio`;let o=document.createElement(`p`);o.className=`fire-audio-credit`,o.textContent=`Synthesized fire. The simulation is Daniel Greenheck’s Fire Pro.`;let s=document.createElement(`div`);s.className=`fire-audio-row`;let c=document.createElement(`button`);c.type=`button`,c.textContent=`Unmute`;let l=document.createElement(`span`);l.className=`fire-audio-state`,l.textContent=`Silent until a click or the U key.`,s.append(c,l);let u=document.createElement(`label`);u.className=`fire-audio-level`;let d=document.createElement(`span`),f=document.createElement(`input`);f.type=`range`,f.min=`0`,f.max=`1`,f.step=`0.01`,f.value=String(t.level);let p=document.createElement(`span`);p.textContent=i(t.level),d.textContent=`Level`,u.append(d,f,p);let m=document.createElement(`p`);if(m.className=`fire-audio-hint`,m.textContent=t.hint,n.append(o,s,u,m),t.onLog){let e=document.createElement(`label`);e.className=`fire-audio-log`;let r=document.createElement(`input`);r.type=`checkbox`,r.checked=t.logInitially??!1,e.append(r,document.createTextNode(` Log probe`)),r.addEventListener(`change`,()=>t.onLog?.(r.checked)),n.append(e)}let h=[],g;if(t.probeHud){let e=document.createElement(`div`);e.className=`fire-audio-hud`;let t=document.createElement(`p`);t.className=`fire-audio-hud-caption`,t.textContent=`Probe energy. The bottom row is the emitter.`,e.append(t);for(let t=3;t>=0;t--){let n=document.createElement(`div`);n.className=`fire-audio-hud-row`;for(let e=0;e<4;e++){let r=document.createElement(`div`);r.className=`fire-audio-bar`;let i=document.createElement(`span`);r.append(i),n.append(r),h[t*4+e]=i}e.append(n)}g=document.createElement(`p`),g.className=`fire-audio-hud-summary`,g.textContent=`Waiting for probes.`,e.append(g),n.append(e)}e.append(n);let _=()=>{c.textContent=t.voice.isAudible?`Mute`:`Unmute`,c.setAttribute(`aria-pressed`,t.voice.isAudible?`true`:`false`)},v=async()=>{c.disabled=!0,l.textContent=t.voice.isAudible?`Muting…`:`Starting…`;try{await t.voice.toggle(),l.textContent=t.voice.isAudible?`On. Level 0 lets the crackle die out.`:`Muted.`}catch(e){l.textContent=e instanceof Error?e.message:`Audio failed to start.`}finally{c.disabled=!1,_()}};return c.addEventListener(`click`,()=>void v()),c.addEventListener(`keydown`,e=>{e.code===`Space`&&e.preventDefault()}),f.addEventListener(`input`,()=>{let e=Number(f.value);p.textContent=i(e),t.onLevel(e)}),addEventListener(`keydown`,e=>{e.repeat||e.metaKey||e.ctrlKey||e.altKey||e.code===`KeyU`&&(e.preventDefault(),v())}),_(),{setProbes(e){if(!g)return;let t=0,n=0,i=0,a=0;e.forEach((e,o)=>{let s=h[o];if(!s)return;let c=e.live?r(e.energy):0;s.style.width=`${Math.round(c*100)}%`;let l=s.parentElement;l&&(l.style.opacity=e.live?`1`:`0.35`),s.title=`heat ${e.heat.toFixed(2)}`,e.live&&(t+=e.heat,n+=e.speed,i+=e.vorticity,a++)}),g.textContent=a>0?`heat ${(t/a).toFixed(2)}  speed ${(n/a).toFixed(2)}  vort ${(i/a).toFixed(1)}  live ${a}`:`Probes quiet.`}}}function r(e){return e>0?e>1?1:e:0}function i(e){return`${Math.round(e*100)}%`}function a(){if(document.getElementById(`fire-audio-style`))return;let e=document.createElement(`style`);e.id=`fire-audio-style`,e.textContent=`
    .fire-audio { color: #e7e4df; font: 13px/1.45 ui-sans-serif, system-ui, sans-serif; }
    .fire-audio-floating {
      position: fixed; left: 12px; bottom: 12px; z-index: 2;
      width: min(320px, calc(100vw - 24px));
      padding: 12px 14px; border-radius: 12px;
      background: rgba(18, 19, 22, 0.9);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
    }
    .fire-audio-credit, .fire-audio-hint { margin: 0; color: #b7b3ac; }
    .fire-audio-hint { margin-top: 8px; }
    .fire-audio-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
    .fire-audio button {
      font: inherit; background: #e7e4df; color: #15161a; border: 0;
      border-radius: 999px; padding: 6px 14px; cursor: pointer;
    }
    .fire-audio button:disabled { opacity: 0.6; cursor: default; }
    .fire-audio-level { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
    .fire-audio-level input { width: 100%; }
    .fire-audio-log { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: #b7b3ac; }
    .fire-audio-hud { margin-top: 10px; }
    .fire-audio-hud-caption, .fire-audio-hud-summary {
      margin: 0; color: #b7b3ac; font-variant-numeric: tabular-nums;
    }
    .fire-audio-hud-summary { margin-top: 4px; }
    .fire-audio-hud-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin-top: 3px; }
    .fire-audio-bar { height: 8px; background: #2a2c31; border-radius: 2px; overflow: hidden; }
    .fire-audio-bar > span { display: block; height: 100%; width: 0; background: #e07a3d; }
  `,document.head.append(e)}var o=new t,s=.7,c=()=>o.setControls(e(s)),l=document.querySelector(`#audio`);if(!l)throw Error(`Missing #audio.`);n(l,{voice:o,level:s,hint:`Level is the energy. At zero the roar and the crackle decay and then stop.`,onLevel:e=>{s=e,c()}}),c();