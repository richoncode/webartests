/* InfraSim UI: layouts, animation, controls, assumptions drawer, share-state hash. Depends on InfraEngine. */
(function(){
'use strict';
const E = InfraEngine;
const $ = id => document.getElementById(id);
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtT=s=>s>=1?s.toFixed(2)+' s':(s>=0.01?(s*1000).toFixed(1):(s*1000).toFixed(2))+' ms';
const fmtN=(x,d=1)=>x>=1000?Math.round(x).toLocaleString('en-US'):x.toFixed(x>=100?0:d);
const CW=620, CH=266, WALL=8;
const BATCHES=E.BATCHES, CTXS=E.CTXS, PRECS=E.PRECS;
let CHIPS=[], MODELS=[], ANE_OUT=[], RAW={}, SOURCES={}, TAGS={}, DATASRC='';
let S=null;                    // state (see E.DEFAULT_STATE)
let ASSUME=Object.assign({},E.DEFAULT_ASSUME);

// ---------------------------------------------------------------- data loading
async function loadData(){
  const inl=window.__INFRASIM_DATA__;
  if(inl&&inl.inlineOnly){DATASRC='inlined data (single-file build)';return inl;}
  if(/^https?:$/.test(location.protocol)){
    try{
      const [c,m]=await Promise.all(['../data/chips.json','../data/models.json'].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json();})));
      DATASRC='data/chips.json + data/models.json (loaded from files)';return {chips:c,models:m};
    }catch(e){console.warn('fetch failed, using inlined data:',e.message);}
  }
  if(inl){DATASRC='inlined data fallback (file:// or fetch failed)';return inl;}
  throw new Error('No data: could not fetch ../data/*.json and no inlined data present. Open app/infrasim.html instead.');
}

// ---------------------------------------------------------------- layouts (logical coords CW x CH)
function grid(n,x,y,w,h,cols,gap,maxW,maxH){
  const rows=Math.ceil(n/cols);let cw=(w-(cols-1)*gap)/cols,ch=(h-(rows-1)*gap)/rows;
  if(maxW)cw=Math.min(cw,maxW); if(maxH)ch=Math.min(ch,maxH);
  const gw=cols*cw+(cols-1)*gap,gh=rows*ch+(rows-1)*gap,ox=x+(w-gw)/2,oy=y+(h-gh)/2,a=[];
  for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols;a.push({x:ox+c*(cw+gap),y:oy+r*(ch+gap),w:cw,h:ch,r,c});}
  return {cells:a,rows,cols};
}
const cx=r=>r.x+r.w/2, cy=r=>r.y+r.h/2;
function layNvidia(c){
  const mems=[],caches=[];
  for(let i=0;i<5;i++)mems.push({x:12,y:14+i*48,w:64,h:40,label:i===0?c.memType:'',sub:i===0?c.cap+' GB':''});
  caches.push({x:104,y:14,w:76,h:114,label:'L2',sub:'50 MB'},{x:104,y:134,w:76,h:114,label:'L2',sub:'(2 partitions)'});
  const g=grid(c.units,212,12,330,238,12,3);
  const ic={x:556,y:96,w:52,h:70,label:'NVLink',sub:'900 GB/s'};
  const route=()=>{const i=Math.floor(Math.random()*g.cells.length),cell=g.cells[i],s=Math.min(4,Math.floor(cell.r*5/g.rows)),m=mems[s];
    return {ci:i,pts:[{x:m.x+m.w,y:cy(m)},{x:caches[0].x,y:cy(m)},{x:caches[0].x+caches[0].w,y:cy(cell)},{x:cell.x-2,y:cy(cell)},{x:cx(cell),y:cy(cell)}]};};
  return {arch:'nvidia',mems,caches,cells:g.cells,blocks:[{x:206,y:6,w:342,h:250,label:'GPU die: '+c.units+' SMs (each with 256 KB L1/shared + tensor cores)',lx:210,ly:5,frame:true}],ic,route,
    note:'HBM feeds a shared L2, then SMs with their own fast L1/shared memory and tensor cores.'};
}
function layAmd(c){
  const mems=[],caches=[],cells=[],blocks=[];
  for(let q=0;q<4;q++){const x0=10+(q%2)*302,y0=6+Math.floor(q/2)*124;
    blocks.push({x:x0,y:y0,w:292,h:118,label:'IOD '+(q+1),lx:x0+250,ly:y0+9,frame:true});
    for(let j=0;j<2;j++)mems.push({x:x0+5,y:y0+8+j*54,w:40,h:50,label:j===0&&q===0?c.memType:'HBM',sub:''});
    caches.push({x:x0+52,y:y0+8,w:32,h:104,label:'IF$',sub:q===0?'256MB':''});
    for(let j=0;j<2;j++){const b={x:x0+94,y:y0+8+j*54,w:190,h:50,label:'XCD 38 CU, 4 MB L2'};blocks.push(Object.assign({lx:b.x+4,ly:b.y+9},b));
      const g=grid(38,b.x+5,b.y+15,180,30,19,1.5);g.cells.forEach(cl=>{cl.q=q;cl.j=j;cl.blk=b;cells.push(cl);});}}
  const route=()=>{const i=Math.floor(Math.random()*cells.length),cell=cells[i],q=cell.q,m=mems[q*2+Math.floor(Math.random()*2)],ca=caches[q];
    return {ci:i,pts:[{x:m.x+m.w,y:cy(m)},{x:cx(ca),y:cy(m)},{x:cell.blk.x-2,y:cy(cell.blk)},{x:cx(cell),y:cy(cell)}]};};
  return {arch:'amd',mems,caches,cells,blocks,ic:null,route,note:'Chiplets: HBM on I/O dies with a big Infinity Cache; compute dies (XCDs) read through it.'};
}
function slcCaption(c){
  const sp=c.raw&&c.raw.specs&&c.raw.specs.l2;
  if(!sp||sp.v==null)return {label:'System Level Cache (size not published)',tag:null};
  const m=String(sp.v).match(/(\d+(?:\s*-\s*\d+)?)\s*(?:MB|MiB)\b/i);
  if(!m)return {label:'System Level Cache (size not published)',tag:sp.tag||null};
  return {label:'System Level Cache · '+m[1].replace(/\s+/g,'')+' MB',tag:sp.tag||null};
}
function layApple(c){
  const memShort=(c.memType||'').replace('Unified ','');
  const nm=clamp(Math.round(c.bw/150),2,8), nl=Math.ceil(nm/2), nr=nm-nl, mems=[];
  const stack=(n,x)=>{const gap=4,h=(240-(n-1)*gap)/n,first=mems.length;for(let i=0;i<n;i++)mems.push({x,y:12+i*(h+gap),w:58,h,label:i===0?memShort:'',sub:i===0&&n>1?'':'',left:x<300});return first;};
  stack(nl,10); if(nr)stack(nr,552);
  const cap=slcCaption(c);
  // Label band on top, dot lane underneath. Height is the same for every Apple chip.
  const slc={x:92,y:8,w:436,h:36,labelBand:20,label:cap.label,tag:cap.tag,sub:''};
  const laneY=slc.y+slc.labelBand+(slc.h-slc.labelBand)/2;
  const dies=c.dies||1, top=slc.y+slc.h+6, bot=258, frames=[], blocks=[], extra=[], links=[], cells=[];
  if(dies===1)frames.push({x:92,y:top,w:436,h:bot-top});
  else if(dies===2){frames.push({x:92,y:top,w:212,h:bot-top},{x:316,y:top,w:212,h:bot-top});links.push({x:304,y:top+40,w:12,h:bot-top-80,label:'Fusion',vert:true});}
  else{const hh=(bot-top-8)/2;frames.push({x:92,y:top,w:212,h:hh},{x:316,y:top,w:212,h:hh},{x:92,y:top+hh+8,w:212,h:hh},{x:316,y:top+hh+8,w:212,h:hh});
    links.push({x:304,y:top+10,w:12,h:2*hh+8-20,label:'',vert:true},{x:112,y:top+hh,w:396,h:8,label:'',vert:false},{x:230,y:top+hh-3,w:160,h:14,label:'UltraFusion >4.4 TB/s',pill:true});}
  const perDie=Math.ceil(c.units/dies);let left=c.units;
  frames.forEach((f,fi)=>{
    const n=Math.min(perDie,left);left-=n;
    let gx,gy,gw,gh;
    if(dies===1){gx=f.x+8;gy=f.y+16;gw=f.w-94;gh=f.h-24;
      const cpu={x:f.x+f.w-78,y:f.y+18,w:70,h:(f.h-30)/2-2,label:'CPU',kind:'blk'},ne={x:f.x+f.w-78,y:f.y+18+(f.h-30)/2+2,w:70,h:(f.h-30)/2-2,label:'Neural Eng.',kind:'blk'};extra.push(cpu,ne);}
    else{gx=f.x+8;gy=f.y+15;gw=f.w-16;gh=f.h-(dies===2?52:44);
      const by=f.y+f.h-(dies===2?30:25),bh=dies===2?24:19;extra.push({x:f.x+8,y:by,w:90,h:bh,label:'CPU',kind:'blk'},{x:f.x+106,y:by,w:90,h:bh,label:'Neural Eng.',kind:'blk'});}
    const cols=Math.max(1,Math.round(Math.sqrt(n*gw/gh)));
    const g=grid(n,gx,gy,gw,gh,cols,2,dies===1?46:34,dies===1?40:30);
    g.cells.forEach(cl=>{cl.f=fi;cells.push(cl);});
    blocks.push({x:f.x,y:f.y,w:f.w,h:f.h,label:dies===1?'one SoC die: CPU + GPU + Neural Engine on one memory pool':'die '+(fi+1)+' of '+dies,lx:f.x+6,ly:f.y+8,frame:true});
  });
  const route=()=>{const m=mems[Math.floor(Math.random()*mems.length)],ex=m.left?m.x+m.w:m.x,rail=m.left?88:532;
    const i=Math.floor(Math.random()*cells.length),cell=cells[i];
    return {ci:i,pts:[{x:ex,y:cy(m)},{x:rail,y:cy(m)},{x:rail,y:laneY},{x:cx(cell),y:laneY},{x:cx(cell),y:cy(cell)}]};};
  const na=c.matrix;
  return {arch:'apple',mems,caches:[slc],cells,blocks,links,ic:null,route,extraBlk:extra,na,
    note:(na?'Inner bright square in each GPU core = Neural Accelerator (matrix unit). ':'No per-core matrix unit: matrix math runs on shader ALUs. ')+'One unified memory pool.',
    noteLong:(na?'Each GPU core has a Neural Accelerator (matrix unit), drawn as the bright inner square. ':'No per-core matrix unit: matrix math runs on the GPU shader ALUs. ')+'Unified memory: no CPU-GPU copy. The number of memory blocks drawn is scaled to bandwidth; it is not a package count. The Neural Engine uses that same memory. It lights only while Run on Neural Engine is on and the current step is one the documented path places there.'};
}
function layTpu(c){
  const mems=[{x:12,y:14,w:56,h:236,label:c.memType,sub:c.cap+' GB'}];
  const vmem={x:104,y:14,w:60,h:236,label:'VMEM',sub:'on-chip'};
  const m1=grid(64,214,18,150,104,8,3), m2=grid(64,214,142,150,104,8,3);
  const cells=m1.cells.concat(m2.cells);
  const vec={x:396,y:18,w:96,h:104,label:'Vector unit',kind:'blk'}, sca={x:396,y:142,w:96,h:46,label:'Scalar unit',kind:'blk'};
  const ic={x:512,y:60,w:96,h:130,label:'ICI',sub:'4 ports, 800 GB/s'};
  const route=()=>{const i=Math.floor(Math.random()*cells.length),cell=cells[i];
    return {ci:i,pts:[{x:68,y:cy(cell)},{x:vmem.x+vmem.w/2,y:cy(cell)},{x:cell.x-6,y:cy(cell)},{x:cx(cell),y:cy(cell)}]};};
  return {arch:'tpu',mems,caches:[vmem],cells,blocks:[{x:206,y:10,w:166,h:116,label:'MXU 1 (systolic array)',lx:210,ly:9,frame:true},{x:206,y:134,w:166,h:116,label:'MXU 2 (systolic array)',lx:210,ly:133,frame:true},vec,sca],ic,route,extraBlk:[vec,sca],tpu:true,
    note:'Compiler fuses the graph; data streams through the systolic arrays.'};
}
const LAY={nvidia:layNvidia,amd:layAmd,apple:layApple,tpu:layTpu};

// ---------------------------------------------------------------- side objects
function mkSide(key){
  const side={key,color:key==='A'?'#60a5fa':'#c084fc',prog:0,done:false,parts:[],acc:0,flash:null,ph:null,layout:null,chipId:null,sel:null};
  const p=$('p'+key);
  p.innerHTML='<div class="ribbon" aria-hidden="true">SPECULATIVE PROJECTION</div><div class="ptitle"><b></b><span></span><em class="tokc" aria-hidden="true">tokens in window: <span class="tokc-n">0</span></em></div>'+
   '<div class="pills"></div><div class="pdetail"></div><canvas class="cv"></canvas><div class="stripwrap"><button type="button" class="slayer" data-link="note:layer" data-kind="strip" data-part="layer" aria-label="Layer index. The word layer stays put. The number is the layer now running, out of the model layers."><span class="sw">layer</span><span class="sn">1/1</span></button><canvas class="strip" aria-label="Layer strip. Attention on top, feed-forward below, LM head at the end."></canvas><span class="srows"><button type="button" class="srow" data-link="note:attn" data-kind="strip" data-part="attn" aria-label="Attention, the top row of each layer.">attention</button><button type="button" class="srow" data-link="note:ffn" data-kind="strip" data-part="ffn" aria-label="Feed-forward, the bottom row of each layer.">feed-forward</button></span></div><div class="docrate">dot rate ∝ memory bandwidth</div>'+
   '<div class="status"><div class="st-row"><span class="st-badge">STALL</span><span class="st-main"><span class="st-phrase"></span><span class="st-pct">100%</span></span></div><div class="st-cause"><span class="st-cause-txt"></span><span class="st-cause-pct">100%</span><span class="st-cause-tail"></span></div><div class="st-link"><button type="button" class="mk" data-link="note:nolink" data-tip="One package: all-reduce time in the step is 0 s, so tok/s comes only from this chip\'s compute and memory bandwidth. The model is not split, so weights and the KV cache have to fit here." aria-label="One package: all-reduce time in the step is 0 s, so tok/s comes only from this chip\'s compute and memory bandwidth.">4</button><span class="st-link-name" data-link="note:nolink" data-tip="One package: all-reduce time in the step is 0 s, so tok/s comes only from this chip\'s compute and memory bandwidth. The model is not split, so weights and the KV cache have to fit here.">all-reduce 0 s</span><span class="st-link-pct">100% of step</span></div></div><div class="chipnote" data-link="note:arch" data-tip="Gold dots are bytes moving from memory, through the on-chip cache, into a compute unit. Dot speed and dots per second scale with effective bandwidth on one scale for both panels. dot rate ∝ memory bandwidth."></div>'+
   '<div class="stats"><div class="resultslot">'+
   '<div class="rview final"><div class="l"><button type="button" class="mk seev" data-link="xref:verdict" data-tip="Which chip finishes the step sooner, and whether the gap comes from memory bandwidth, peak compute, or the chip-to-chip link." aria-label="Which chip finishes the step sooner, and whether the gap comes from memory bandwidth, peak compute, or the chip-to-chip link.">W</button><span class="badge"><span class="bd-name"></span><span class="bd-pct"></span></span><div class="big"><span class="n">0</span><small class="unit"></small><small class="hyp"> (hypothetical)</small></div>'+'<div class="sub s1"><span class="s1a"></span><button type="button" class="s1b" data-link="note:ane" data-kind="ane" data-side="'+key+'"></button></div>'+'<div class="rng"><button type="button" class="mk" data-link="note:range" data-tip="Blue band: efficiency from ×0.8 to ×1.2, capped at 1. White tick: the central estimate. Amber dashes: peak specs with every efficiency at 100%." aria-label="Blue band: efficiency from ×0.8 to ×1.2. White tick: central estimate. Dashed line: peak specs.">3</button><div class="rt" data-link="note:range" data-tip="Blue band: efficiency from ×0.8 to ×1.2, capped at 1. White tick: the central estimate. Amber dashes: peak specs with every efficiency at 100%."></div><div class="rtrack" data-link="note:range" data-tip="Blue band: efficiency from ×0.8 to ×1.2, capped at 1. White tick: the central estimate. Amber dashes: peak specs with every efficiency at 100%."><div class="rband"></div><div class="rmid"></div><div class="rceil"></div></div></div></div>'+
   '<div class="bars">'+
   '<div class="brow compute" data-link="note:gpu" data-kind="gpu" data-side="'+key+'" aria-label="GPU compute time per token is FLOPs per token divided by peak TFLOPS times efficiency."><span class="lab">GPU compute</span><div class="track"><div class="fill"></div></div><span class="num">0.00 ms</span></div>'+
   '<div class="brow memory"><span class="lab">memory read</span><div class="track"><div class="fill"></div></div><span class="num">0.00 ms</span></div>'+
   '<div class="brow comm off"><span class="lab">comm</span><div class="track"><div class="fill"></div></div><span class="num">0.00 ms</span></div>'+
   '</div></div>'+
   '<div class="rview run"><div class="runlab">Time to generate 1 token</div><div class="runbig"><span class="n run-t">0.00 ms</span></div><div class="runspd">speed <span class="n run-s">0.0</span> tok/s</div></div>'+
   '<div class="rview oom"><div class="oombox"><b>OUT OF MEMORY</b><span>Weights and KV cache do not fit, so this chip would not run. Figures below are hypothetical.</span></div></div>'+
   '</div><div class="capwrap"><div class="captrack"></div><button type="button" class="cap-txt" data-link="note:fit" data-kind="fit" data-side="'+key+'"></button></div></div>';
  side.root=p;side.cv=p.querySelector('canvas.cv');side.stripwrap=p.querySelector('.stripwrap');side.st=p.querySelector('canvas.strip');
  side.layerBtn=p.querySelector('.slayer');side.lnum=p.querySelector('.slayer .sn');side.rowLabs=p.querySelector('.srows');
  const lm=document.createElement('button');lm.type='button';lm.className='lmhit';lm.dataset.link='note:lm';lm.dataset.kind='strip';lm.dataset.part='lm';lm.setAttribute('aria-label','LM head, drawn once after the layers.');side.stripwrap.appendChild(lm);side.lmHit=lm;
  side.cx=side.cv.getContext('2d');side.sx=side.st.getContext('2d');
  side.pills=p.querySelector('.pills');side.pdetail=p.querySelector('.pdetail');
  side.pills.addEventListener('click',ev=>{if(ev.target.closest('button'))return;const b=ev.target.closest('.pill');if(!b)return;const k=b.dataset.k;side.sel=side.sel===k?null:k;renderPillDetail(side);});
  side.pills.addEventListener('keydown',ev=>{if(ev.target.closest('button'))return;if(ev.key!=='Enter'&&ev.key!==' ')return;ev.preventDefault();const b=ev.target.closest('.pill');if(!b)return;const k=b.dataset.k;side.sel=side.sel===k?null:k;renderPillDetail(side);});
  return side;
}
let sides=[];
function sizeCanvas(cv,cssW,cssH){const d=window.devicePixelRatio||1;cv.style.height=cssH+'px';cv.width=Math.round(cssW*d);cv.height=Math.round(cssH*d);return d;}
function resizeAll(){
  const narrow=window.innerWidth<=900;
  for(const s of sides){const w=Math.max(200,s.cv.parentElement.clientWidth-20),hh=Math.min(w*CH/CW,narrow?260:196);s.dpr=sizeCanvas(s.cv,w,hh);s.sc=Math.min(hh/CH,w/CW);s.offx=(w-CW*s.sc)/2;s.offy=(hh-CH*s.sc)/2;const used=(s.layerBtn?s.layerBtn.offsetWidth:48)+(s.rowLabs?s.rowLabs.offsetWidth:84)+8;const cw=Math.max(80,(s.stripwrap?s.stripwrap.clientWidth:w)-used);sizeCanvas(s.st,cw,30);s.st.style.width=cw+'px';s.stW=cw;}
  const rw=Math.max(200,$('roof').parentElement.clientWidth-20);sizeCanvas($('roof'),rw,narrow?150:128);
}

// ---------------------------------------------------------------- spec pills / details
const SPEC_ORDER=['fp16','fp8','bw','cap','units','node','l2','neural','ic','usable','announced'];
function specLabel(k,chip){return {fp16:'FP16 matrix compute (dense)',fp8:'FP8 / 8-bit compute (dense)',bw:'Memory bandwidth',cap:'Memory capacity',usable:'Usable fraction of memory',units:chip.unitName+'s',ic:'Chip-to-chip interconnect',maxTP:'Max chips (TP) in this tool',l2:'On-chip cache',node:'Process / packaging',neural:'Neural Engine',announced:'Announced'}[k]||k;}
function specUnit(k){return {fp16:' TFLOPS',fp8:' TFLOPS',bw:' GB/s',cap:' GB',ic:' GB/s'}[k]||'';}
function specVal(k,sp){if(sp.v==null)return 'n/a';if(typeof sp.v==='number')return (k==='usable'?Math.round(sp.v*100)+'%':Number(sp.v).toLocaleString('en-US'))+specUnit(k);return String(sp.v);}
function pillText(k,chip,sp){
  if(k==='fp16')return 'FP16 '+Number(sp.v).toLocaleString('en-US')+' TF';
  if(k==='fp8')return sp.v==null?'FP8 n/a':'FP8 '+Number(sp.v).toLocaleString('en-US')+' TF';
  if(k==='bw')return Number(sp.v).toLocaleString('en-US')+' GB/s';
  if(k==='cap')return sp.v+' GB';
  if(k==='units')return sp.v+' '+chip.unitName+'s';
  if(k==='node'){const m=String(sp.v).match(/\b(\d) nm\b/);return m?m[1]+' nm':(/4N/.test(sp.v)?'TSMC 4N':(/Quad/.test(sp.v)?'quad-die':(/3 nm class/.test(sp.v)?'3 nm class':'node n/a')));}
  if(k==='announced')return 'announced '+sp.v;
  return specVal(k,sp);
}
function srcLinks(keys){return (keys||[]).map(k=>{const s=SOURCES[k];if(!s)return esc(k);return /^https?:/.test(s.url)?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>':esc(s.title)+' ('+esc(s.url)+')';}).join('; ')||'no external source (modelling choice)';}
function effSpec(chip){const e=chip.raw.eff,ks=['mfuP','mfuD','bw'];
  return {v:ks.map(k=>e[k].v).join(' / '),tag:ks.some(k=>e[k].tag==='U')?'U':'A',src:[...new Set(ks.flatMap(k=>e[k].src))],
    note:'MFU prefill / MFU decode / bandwidth efficiency (details and sliders in the Assumptions drawer). Tag is U if any factor is an assumption, else A (fitted to measurements). '+e.bw.note};}
function renderPills(s){
  const chip=s.chip,sp=chip.raw.specs;
  const keys=['fp16','fp8','bw','cap','units','node','announced'].filter(k=>sp[k]&&!(k==='fp8'&&sp[k].v==null));
  const eff=effSpec(chip);
  const pill=(k,tag,text,spec,src,note,kind)=>'<div class="pill'+(s.sel===k?' sel':'')+'" tabindex="0" data-k="'+k+'" data-link="spec:'+k+'" data-tip="'+esc(specTip(k))+'">'+tagBtn(tag,{spec:spec,src:src,note:note,kind:kind})+'<span class="txt">'+esc(text)+'</span></div>';
  s.pills.innerHTML=keys.map(k=>pill(k,sp[k].tag,pillText(k,chip,sp[k]),specLabel(k,chip),sp[k].src,sp[k].note)).join('')+
   pill('eff',eff.tag,'eff '+eff.v,'Efficiency factors',eff.src,eff.note,'eff');
  const rib=s.root.querySelector('.ribbon'); rib.classList.toggle('on', chip.status==='speculative'); rib.setAttribute('aria-hidden', chip.status==='speculative'?'false':'true');
  refreshTagLink();
}
function renderPillDetail(s){
  const chip=s.chip,sp=s.sel==='eff'?effSpec(chip):chip.raw.specs[s.sel];
  s.root.querySelectorAll('.pill').forEach(b=>b.classList.toggle('sel',b.dataset.k===s.sel));
  if(!s.sel||!sp){s.pdetail.className='pdetail';s.pdetail.innerHTML='';delete s.pdetail.dataset.link;refreshTagLink();return;}
  const label=s.sel==='eff'?'Efficiency factors (MFU prefill / MFU decode / bandwidth)':specLabel(s.sel,chip);
  s.pdetail.className='pdetail on';
  s.pdetail.dataset.link='spec:'+s.sel;
  s.pdetail.dataset.tip=specTip(s.sel);
  s.pdetail.innerHTML='<b>'+esc(label)+':</b> '+esc(s.sel==='eff'?sp.v:specVal(s.sel,sp))+' '+tagBtn(sp.tag,{spec:label,src:sp.src,note:sp.note,kind:s.sel==='eff'?'eff':''})+' <span class="tiny">'+({V:'published figure',A:'approximate / derived / third-party',U:'assumed'}[sp.tag])+'</span><br>'+esc(sp.note||'')+'<br><span class="tiny">Source: '+srcLinks(sp.src)+'</span>';
  refreshTagLink();
}

// ---------------------------------------------------------------- compute + DOM update
let R={};
const chipById=id=>CHIPS.find(c=>c.id===(E.resolveChipId(CHIPS,id)||id)), modelById=id=>E.deriveModel(MODELS.find(m=>m.id===id));
function chipMenuLabel(c){
  const cpu=c.raw&&c.raw.specs&&c.raw.specs.cpu&&c.raw.specs.cpu.v;
  const head=cpu&&String(cpu).match(/^(\d+-core CPU)/);
  const family=String(c.short||'').replace(/\s+\d+C$/,'');
  const spec=c.status==='speculative'?' (speculative)':'';
  if(head&&c.units&&family!==c.short)return family+' ('+head[1]+' / '+c.units+'-core GPU)'+spec;
  return c.vendor+' '+c.short+spec;
}
function opts(extra){return Object.assign({prec:S.prec,B:S.B_,L:S.L,phase:S.phase,N:S.tp},extra||{});}
function effOf(key){return S['eff'+key]||null;}
function writeHash(){
  const byId=Object.fromEntries(CHIPS.map(c=>[c.id,c]));
  const h='#'+E.encodeState(S,byId);
  if(location.hash!==h)try{history.replaceState(null,'',h);}catch(e){}
}
function recompute(noHash){
  const m=modelById(S.model); R.m=m;
  sides.forEach(s=>{
    const c=chipById(S[s.key]); s.chip=c;
    const o=opts({eff:effOf(s.key)||undefined});
    s.rng=E.estimateRange(m,c,o,ASSUME); s.res=s.rng.mid; s.ceil=s.rng.ceil;
    if(s.chipId!==c.id){s.chipId=c.id;s.layout=LAY[c.arch](c);s.flash=new Float32Array(s.layout.cells.length);s.ph=Array.from(s.layout.cells,()=>Math.random()*6.28);s.parts=[];s.sel=null;
      s.root.querySelector('.ptitle span').textContent=c.caption;renderPills(s);renderPillDetail(s);const cn=s.root.querySelector('.chipnote');const note=s.layout.note||'',long=s.layout.noteLong||'';cn.textContent=note;cn.dataset.extra=long&&long!==note?long:'';cn.removeAttribute('title');cn.setAttribute('aria-label',note+(long&&long!==note?'. '+long:''));}
  });
  const aneT=E.aneToggle(R.m,sides.map(s=>s.chip),S.prec,S.L);
  if(!aneT.ok)S.ane=false;
  const [a,b]=sides, maxT=Math.max(...sides.flatMap(s=>[s.res.sumTc,s.res.sumTm,s.res.sumComm,s.res.total]));
  const o=opts();
  sides.forEach(s=>{
    const r=s.res,c=s.chip,rootEl=s.root;
    rootEl.classList.toggle('oomp',r.oom);
    rootEl.querySelector('.ptitle b').textContent=c.name+(r.N>1?'  x'+r.N:'');
    const bd=rootEl.querySelector('.badge');
    const cls=r.oom?'oom':r.bound;bd.className='badge '+cls;
    const pct=Math.round((r.bound==='comm'?r.commShare:(r.bound==='mem'?r.memShare:1-r.memShare))*100);
    bd.querySelector('.bd-name').textContent=r.oom?'OUT OF MEMORY':(r.bound==='mem'?'MEMORY-BOUND':r.bound==='comp'?'COMPUTE-BOUND':'INTERCONNECT-LIMITED');
    bd.querySelector('.bd-pct').textContent=r.oom?'': '('+pct+'%)';
    const big=rootEl.querySelector('.big'),s1=rootEl.querySelector('.s1a'),s1b=rootEl.querySelector('.s1b'),rt=rootEl.querySelector('.rt');
    big.querySelector('.hyp').classList.toggle('on', !!r.oom);
    const g=s.rng;
    if(r.decode){big.querySelector('.n').textContent=fmtN(r.tokUser); big.querySelector('.unit').textContent='tok/s/user';
      s1.textContent='batch '+S.B_+': '+fmtN(r.tokAgg)+' tok/s aggregate | step '+fmtT(r.total);
      rt.textContent='range '+fmtN(g.worst)+'\u2013'+fmtN(g.best)+' tok/s | ceiling '+fmtN(s.ceil.tokUser);}
    else{big.querySelector('.n').textContent=fmtT(r.ttft); big.querySelector('.unit').textContent='to first token';
      s1.textContent='prefill '+fmtN(r.prefTput)+' tok/s | '+(S.B_*S.L).toLocaleString()+' tokens';
      rt.textContent='range '+fmtT(g.best)+'\u2013'+fmtT(g.worst)+' | ceiling '+fmtT(s.ceil.ttft);}
    const gAne=E.aneGate(R.m,c,S.prec,S.L);
    const aneNote=S.ane&&gAne.ok?'Bandwidth roofline, same unified memory. No published Neural Engine tok/s.':(S.ane?'GPU. '+gAne.reason:'');
    s1b.textContent=aneNote;s1b.classList.toggle('on',!!aneNote);s1b.setAttribute('aria-label',aneNote||'Neural Engine');
    // range bar on a "speed" axis (higher = faster): value / ceiling
    const sp=v=>r.decode?v:1/v, cs=sp(r.decode?s.ceil.tokUser:s.ceil.ttft);
    const xl=clamp(sp(g.worst)/cs,0,1),xh=clamp(sp(g.best)/cs,0,1),xm=clamp(sp(r.decode?r.tokUser:r.ttft)/cs,0,1);
    const rb=rootEl.querySelector('.rband'),rm=rootEl.querySelector('.rmid'),rc=rootEl.querySelector('.rceil');
    rb.style.left=(xl*100)+'%';rb.style.width=Math.max(0.5,(xh-xl)*100)+'%';rm.style.left='calc('+(xm*100)+'% - 1px)';rc.style.left='calc(100% - 4px)';
    rt.removeAttribute('title');rootEl.querySelector('.rtrack').removeAttribute('title');
    const setBar=(key,v,col,txt,show)=>{const row=rootEl.querySelector('.brow.'+key); row.classList.toggle('off',!show); const fill=row.querySelector('.fill'); fill.style.width=(100*v/maxT).toFixed(1)+'%'; fill.style.background=col; row.querySelector('.num').textContent=txt;};
    setBar('compute',r.sumTc,'var(--comp)',fmtT(r.sumTc),true);
    setBar('memory',r.sumTm,'var(--mem)',fmtT(r.sumTm),true);
    setBar('comm',r.sumComm,'var(--comm)',fmtT(r.sumComm),r.N>1);
    const den=Math.max(r.capGB,r.weightGB+r.kvGB), wp=100*r.weightGB/den, kp=100*r.kvGB/den, mk=100*r.usableGB/den;
    const track=rootEl.querySelector('.captrack');
    track.classList.toggle('bad', !!r.oom);
    track.innerHTML='<div class="fill" style="width:'+wp.toFixed(1)+'%;background:#3b82f6"></div><div class="fill" style="width:'+kp.toFixed(2)+'%;background:#22d3ee"></div>'+
      '<div style="position:absolute;left:'+mk.toFixed(1)+'%;top:0;bottom:0;border-left:2px dashed #94a3b8"></div>';
    const cap=rootEl.querySelector('.cap-txt');
    cap.classList.toggle('bad', !!r.oom);
    cap.textContent=(r.oom?'DOES NOT FIT: ':'fits: ')+'weights '+r.weightGB.toFixed(1)+' GB + KV '+r.kvGB.toFixed(2)+' GB vs '+r.usableGB.toFixed(0)+' GB usable of '+r.capGB+' GB';
    cap.setAttribute('aria-label', cap.textContent);
  });
  // verdict
  const warn=[];
  if(S.tp>1&&sides.some(s=>s.chip.maxTP===1))warn.push({link:'note:nolink',text:'This chip has no NVLink-style link, so tensor parallel stays at 1 and the whole model has to fit in that one chip.'});
  if(S.prec==='fp8'&&sides.some(s=>!s.chip.fp8))warn.push({link:'note:fp8',text:'Apple GPUs have no native 8-bit math: weights stay 8-bit and the matmul runs in 16-bit.'});
  if(S.prec==='int4')warn.push({text:'INT4 is weight-only (dequantize to FP16 for math).'});
  if(S.L>R.m.maxPos)warn.push({text:'Context exceeds the base model\'s trained length ('+R.m.maxPos.toLocaleString()+'); capacity math still applies.'});
  const mx=sides.map(s=>s.chip.matrix);
  if(sides.some(s=>s.chip.arch==='apple')&&(mx[0]!==mx[1]||sides.every(s=>s.chip.matrix)))
    warn.push({link:'note:na',text:'M5-generation GPU cores each have a Neural Accelerator (matrix unit): it raises compute-bound prefill, while decode stays set by memory bandwidth. Apple publishes only relative AI-compute gains, so these chips\' TFLOPS are third-party-derived.',tag:'A'});
  if(sides.every(s=>s.chip.arch==='apple')&&sides[0].chip.matrix!==sides[1].chip.matrix)
    warn.push({text:'Apple efficiency factors for M4/M3 chips were fitted to a 2023 llama.cpp build and the M5-generation ones to a 2026 build, so decode gaps between the generations are somewhat inflated.'});
  $('vtxt').innerHTML='<p class="why">'+esc(E.explain(a.res,b.res,a.chip,b.chip,o))+'</p>'+
    '<p class="sub">Model '+esc(R.m.name)+': '+(R.m.total/1e9).toFixed(1)+'B params ('+(R.m.active/1e9).toFixed(1)+'B active/token), KV cache '+(R.m.kvPerTok*PRECS[S.prec].kv/1024).toFixed(0)+' KB/token.</p>'+
    '<p class="sub" data-link="spec:ai" data-tip="'+esc(specTip('ai'))+'">Arithmetic intensity this phase: A '+fmtN(a.res.AI)+' | B '+fmtN(b.res.AI)+' FLOP/byte. Ridge point: A '+fmtN(a.res.ridge)+' | B '+fmtN(b.res.ridge)+' FLOP/byte. '+mark('xref:roofline','R',specTip('xref:roofline'))+'</p>'+
    warn.map(w=>'<p class="sub" style="color:#fbbf24"'+(w.link?' data-link="'+w.link+'" data-tip="'+esc(specTip(w.link))+'"':'')+'>'+(w.link?mark(w.link,w.link==='note:fp8'?'F':w.link==='note:na'?'2':'4',specTip(w.link))+' ':'')+'Note: '+esc(w.text)+(w.tag?' '+tagBtn(w.tag,{spec:'Matrix compute',note:w.text}):'')+'</p>').join('');
  refreshTagLink();
  $('bval').textContent=S.B_;$('lval').textContent=S.L.toLocaleString()+' tok';
  $('llabel').textContent=S.phase==='decode'?'Context so far':'Prompt length';
  const tmax=Math.max(a.res.total,b.res.total);
  const sl=WALL/tmax, slowed=sl>=1;
  $('slowdir').textContent=slowed?'slowed':'sped up';
  $('slown').textContent=Math.round(slowed?sl:1/sl).toLocaleString();
  a.tAnim=b.tAnim=0;a.prog=b.prog=0;a.done=b.done=false;a.steps=b.steps=0;
  drawRoof();
  paintAne();
  if(!noHash)writeHash();
  if($('drawer').classList.contains('open'))renderSens();
}

// ---------------------------------------------------------------- drawing
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function paintSlcLabel(ctx,k){
  if(!k.labelBand)return;
  ctx.save();
  rr(ctx,k.x,k.y,k.w,k.h,5);ctx.clip();
  ctx.fillStyle='#0b1520';
  ctx.fillRect(k.x,k.y,k.w,k.labelBand);
  ctx.restore();
}
function syncSlcLabel(s){
  const k=(s.layout&&s.layout.caches||[]).find(c=>c.labelBand);
  let el=s.slcLabel;
  if(!el){el=document.createElement('div');el.className='slc-label';el.style.display='none';s.root.appendChild(el);s.slcLabel=el;}
  if(!k||!s.chip){el.style.display='none';return;}
  const sp=(s.chip.raw&&s.chip.raw.specs&&s.chip.raw.specs.l2)||{};
  const bl=1,bt=1,bw=s.cv.width/s.dpr||1,bh=s.cv.height/s.dpr||1;
  const scaleX=s.cv.clientWidth/bw, scaleY=s.cv.clientHeight/bh;
  const left=s.cv.offsetLeft+bl+(s.offx+k.x*s.sc)*scaleX;
  const top=s.cv.offsetTop+bt+(s.offy+k.y*s.sc)*scaleY;
  const w=(k.w*s.sc)*scaleX, h=(k.labelBand*s.sc)*scaleY;
  const tagPx=Math.max(11,Math.min(15,h-1));
  const sig=(s.chip.id||'')+'|'+(k.tag||'')+'|'+k.label+'|'+tagPx.toFixed(1);
  if(el.dataset.sig!==sig){
    el.dataset.sig=sig;
    el.innerHTML='<span class="slc-txt" data-link="spec:l2" data-tip="'+esc(specTip('l2'))+'">'+esc(k.label)+'</span>'+(k.tag?tagBtn(k.tag,{spec:'On-chip cache',src:sp.src||[],note:sp.note||''}):'')+mark('spec:l2','•',specTip('l2'));
    el.querySelectorAll('button.tg,button.mk').forEach(b=>{
      b.style.width=tagPx.toFixed(1)+'px'; b.style.height=tagPx.toFixed(1)+'px';
      b.style.fontSize=Math.max(8,Math.round(tagPx*0.56))+'px';
    });
    const b=el.querySelector('button.tg');
    if(b) b.setAttribute('aria-label', k.label+' — '+(TAGS[k.tag]||k.tag));
    refreshTagLink();
  }
  el.style.fontSize=Math.max(8,Math.min(12,h-3)).toFixed(1)+'px';
  el.style.left=left.toFixed(1)+'px'; el.style.top=top.toFixed(1)+'px';
  el.style.width=w.toFixed(1)+'px'; el.style.height=h.toFixed(1)+'px';
  el.style.display='flex';
}
// draw text centered/left-aligned; shrink to fit maxW, skip if it cannot fit above minPx (in screen px)
function txt(ctx,str,x,y,maxW,sc,align){
  if(!str)return;const base=Math.max(9.5,8.5/Math.max(sc,0.3));let fs=base;
  ctx.font=fs+'px system-ui,sans-serif';let w=ctx.measureText(str).width;
  if(w>maxW){fs=fs*maxW/w;if(fs*sc<6.2)return;ctx.font=fs+'px system-ui,sans-serif';}
  ctx.textAlign=align||'center';ctx.fillText(str,x,y);
}
function aneLive(s){
  if(!S||!S.ane||!R.m||!s||!s.chip)return null;
  const g=E.aneGate(R.m,s.chip,S.prec,S.L);
  return g.ok?g:null;
}
function curSeg(s){
  const r=s.res,pair=r.segA.t+r.segM.t,x=s.prog*r.total;
  if(s.done||x>=r.n*pair)return {seg:r.segH,layer:r.n,part:'head',frac:1};
  const li=Math.floor(x/pair),rem=x-li*pair;
  return rem<r.segA.t?{seg:r.segA,layer:li,part:'attn'}:{seg:r.segM,layer:li,part:'mlp'};
}
function drawSide(s,tm){
  const ctx=s.cx,L=s.layout,r=s.res,c=s.chip,cur=curSeg(s),sg=cur.seg,sc=s.sc;
  const core=Math.max(sg.tc,sg.tm)||1e-12;
  let cu=clamp(sg.tc/core,0,1),mu=clamp(sg.tm/core,0,1);
  if(s.done){cu=0.03;mu=0.03;}
  const oomDim=r.oom?0.55:1;
  ctx.setTransform(s.dpr*sc,0,0,s.dpr*sc,s.dpr*s.offx,s.dpr*s.offy);
  ctx.clearRect(-s.offx/sc,-s.offy/sc,CW+2*s.offx/sc,CH+2*s.offy/sc);
  ctx.textBaseline='middle';
  // frames
  for(const b of L.blocks){if(b.frame){ctx.strokeStyle='#26324a';ctx.lineWidth=1;ctx.fillStyle='#0d1424';rr(ctx,b.x,b.y,b.w,b.h,6);ctx.fill();ctx.stroke();ctx.fillStyle='#5b6b86';txt(ctx,b.label,b.lx,b.ly+1,b.w-12,sc,'left');}}
  // memory
  const busy=0.25+0.75*mu*(0.8+0.2*Math.sin(tm*5));
  for(const m of L.mems){ctx.fillStyle='rgba(251,191,36,'+(0.10+0.28*busy*oomDim)+')';ctx.strokeStyle='rgba(251,191,36,'+(0.35+0.5*mu)+')';rr(ctx,m.x,m.y,m.w,m.h,5);ctx.fill();ctx.stroke();
    if(m.label){ctx.fillStyle='#fde68a';txt(ctx,m.label,m.x+m.w/2,m.y+11,m.w-4,sc);if(m.sub){ctx.fillStyle='#b99a4a';txt(ctx,m.sub,m.x+m.w/2,m.y+24,m.w-4,sc);}}}
  // caches
  for(const k of L.caches){ctx.fillStyle='rgba(34,211,238,'+(0.08+0.14*mu*oomDim)+')';ctx.strokeStyle='rgba(34,211,238,'+(0.3+0.4*mu)+')';rr(ctx,k.x,k.y,k.w,k.h,5);ctx.fill();ctx.stroke();
    if(k.labelBand)paintSlcLabel(ctx,k);
    else{ctx.fillStyle='#a5f3fc';txt(ctx,k.label,k.x+k.w/2,k.y+k.h/2-(k.sub?5:0),k.w-4,sc);if(k.sub){ctx.fillStyle='#5aa8b5';txt(ctx,k.sub,k.x+k.w/2,k.y+k.h/2+8,k.w-4,sc);}}}
  // die links (Fusion / UltraFusion)
  for(const k of (L.links||[])){
    if(k.pill){ctx.fillStyle='#0d1424';ctx.strokeStyle='rgba(244,114,182,.7)';rr(ctx,k.x,k.y,k.w,k.h,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fbcfe8';txt(ctx,k.label,k.x+k.w/2,k.y+k.h/2+0.5,k.w-6,sc);continue;}
    ctx.fillStyle='rgba(244,114,182,0.14)';ctx.strokeStyle='rgba(244,114,182,.35)';rr(ctx,k.x,k.y,k.w,k.h,3);ctx.fill();ctx.stroke();
    if(k.label&&k.vert){ctx.save();ctx.translate(k.x+k.w/2,k.y+k.h/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#fbcfe8';txt(ctx,k.label,0,0.5,k.h-6,sc);ctx.restore();}}
  syncFuseHit(s);
  // extra blocks. Neural Engine lights only on a documented ANE step.
  const live=aneLive(s), stepUnit=live&&live.parts[cur.part]&&live.parts[cur.part].unit;
  const aneStep=!!(live&&stepUnit==='ane'&&!s.done);
  const gpuStep=!!(live&&stepUnit==='gpu'&&!s.done);
  for(const b of (L.extraBlk||[])){
    const isNe=/^Neural/.test(b.label||'');
    ctx.fillStyle='#141c2e';ctx.strokeStyle='#2c3a57';rr(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();ctx.stroke();
    if(isNe&&aneStep){const g=0.45+0.2*Math.sin(tm*4);ctx.fillStyle='rgba(244,114,182,'+g.toFixed(3)+')';rr(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();ctx.strokeStyle='rgba(244,114,182,.9)';ctx.stroke();}
    else if(!live&&b.flash>0.02){ctx.fillStyle='rgba(52,211,153,'+(b.flash*0.4)+')';rr(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();}
    b.flash=(b.flash||0)*0.92;
    ctx.fillStyle=isNe&&aneStep?'#fce7f3':'#7f8fae';txt(ctx,b.label,b.x+b.w/2,b.y+b.h/2,b.w-4,sc);
  }
  // interconnect
  const commGlow=clamp(sg.t>0?sg.comm/sg.t:0,0,1);
  if(L.ic){const b=L.ic;ctx.fillStyle='rgba(244,114,182,'+(0.07+0.5*commGlow)+')';ctx.strokeStyle='rgba(244,114,182,'+(0.4+0.5*commGlow)+')';rr(ctx,b.x,b.y,b.w,b.h,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fbcfe8';txt(ctx,b.label,b.x+b.w/2,b.y+b.h/2-6,b.w-4,sc);ctx.fillStyle='#b9769b';txt(ctx,b.sub,b.x+b.w/2,b.y+b.h/2+8,b.w-4,sc);
    if(L.arch==='tpu'){ctx.strokeStyle='rgba(244,114,182,.6)';[[560,60,560,38],[560,190,560,212],[512,125,492,125],[608,125,616,125]].forEach(l=>{ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();});}}
  // compute cells
  const act=aneStep?0.04:(s.done?0.03:Math.max(0.04,cu));
  const col=(()=>{const t=clamp((act-0.12)/0.6,0,1);return [lerp(251,52,t),lerp(191,211,t),lerp(36,153,t)].map(Math.round);})();
  const wavespeed=2+7*act;
  L.cells.forEach((cl,i)=>{
    if(gpuStep){
      const gb=0.62+0.22*Math.sin(tm*3+s.ph[i]);
      ctx.fillStyle='rgba(96,165,250,'+gb.toFixed(3)+')';ctx.fillRect(cl.x,cl.y,cl.w,cl.h);
      if(L.na&&cl.w>=6&&cl.h>=6){const ix=cl.w*0.24,iy=cl.h*0.24;ctx.fillStyle='rgba(224,247,255,0.9)';ctx.fillRect(cl.x+ix,cl.y+iy,cl.w-2*ix,cl.h-2*iy);}
      return;
    }
    let b;
    if(L.tpu){const wv=0.5+0.5*Math.sin((cl.r+cl.c)*0.9-tm*wavespeed);b=0.10+0.9*act*wv;}
    else b=0.10+0.9*act*(0.55+0.45*Math.sin(tm*(2.5+7*act)+s.ph[i]));
    b=clamp(b+s.flash[i]*0.6,0,1)*oomDim;
    s.flash[i]*=0.9;
    ctx.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+b.toFixed(3)+')';
    ctx.fillRect(cl.x,cl.y,cl.w,cl.h);
    if(L.na&&!aneStep&&cl.w>=6&&cl.h>=6){ // Neural Accelerator: inner matrix-unit square, lights up only when matrix work is the limiter
      const ix=cl.w*0.24,iy=cl.h*0.24,nb=clamp(0.12+0.95*act*(0.6+0.4*Math.sin(tm*(3+8*act)+s.ph[i]*1.7)),0,1)*oomDim;
      ctx.fillStyle='rgba(224,247,255,'+nb.toFixed(3)+')';ctx.fillRect(cl.x+ix,cl.y+iy,cl.w-2*ix,cl.h-2*iy);
      ctx.strokeStyle='rgba(165,243,252,0.55)';ctx.lineWidth=0.6;ctx.strokeRect(cl.x+ix,cl.y+iy,cl.w-2*ix,cl.h-2*iy);}
    if(act<0.5&&!s.done&&!aneStep){ctx.strokeStyle='rgba(251,191,36,'+(0.18+0.12*Math.sin(tm*4+i))+')';ctx.lineWidth=0.5;ctx.strokeRect(cl.x,cl.y,cl.w,cl.h);}
  });
  // particles
  for(const p of s.parts){
    const f=p.d/p.total;let rem=p.d,seg=0;while(seg<p.lens.length-1&&rem>p.lens[seg]){rem-=p.lens[seg];seg++;}
    const a=p.pts[seg],bb=p.pts[seg+1],t=p.lens[seg]?clamp(rem/p.lens[seg],0,1):1,x=lerp(a.x,bb.x,t),y=lerp(a.y,bb.y,t);
    ctx.fillStyle=f<0.28?'rgba(251,191,36,.95)':(f<0.62?'rgba(103,232,249,.95)':'rgba(190,255,225,.95)');
    ctx.globalAlpha=r.oom?0.45:1;ctx.beginPath();ctx.arc(x,y,1.7/Math.max(0.6,sc*1.2)+0.6,0,6.283);ctx.fill();ctx.globalAlpha=1;
  }
  for(const k of L.caches) if(k.labelBand)paintSlcLabel(ctx,k);
  syncSlcLabel(s);
  // Fixed status rows. The badge blinks with opacity so the phrase never shifts, and the link note stays on its own row.
  const put=(el,v)=>{if(el.textContent!==v)el.textContent=v;};
  const badge=s.root.querySelector('.st-badge'),phrase=s.root.querySelector('.st-phrase'),pct=s.root.querySelector('.st-pct');
  const cause=s.root.querySelector('.st-cause-txt'),causePct=s.root.querySelector('.st-cause-pct'),causeTail=s.root.querySelector('.st-cause-tail');
  let badgeText,phraseText,pctText,causeText,causePctText,causeTailText,mc;
  if(r.oom){badgeText='OOM';phraseText='weights + KV do not fit';pctText='';causeText='would not run';causePctText='';causeTailText='';mc='#fca5a5';}
  else if(s.done){badgeText='DONE';phraseText='done in '+fmtT(r.total);pctText='';causeText='waiting for the other chip';causePctText='';causeTailText='';mc='#8493ab';}
  else if(sg.tm>=sg.tc){badgeText='STALL';phraseText=c.unitName+'s idle ~';pctText=Math.round((1-cu)*100)+'%';causeText='waiting on memory · memory busy';causePctText='100%';causeTailText='';mc='#fbbf24';}
  else {badgeText='COMPUTE';phraseText=c.unitName+'s busy ~';pctText=Math.round(cu*100)+'%';causeText='memory busy';causePctText=Math.round(mu*100)+'%';causeTailText='· headroom';mc='#34d399';}
  put(badge,badgeText);put(phrase,phraseText);put(pct,pctText);put(cause,causeText);put(causePct,causePctText);put(causeTail,causeTailText);
  badge.classList.toggle('dim', badgeText==='STALL' && (tm*2.2)%2>=1.3);
  s.root.querySelector('.st-row').style.color=mc;
  const linkName=s.root.querySelector('.st-link-name'),linkPct=s.root.querySelector('.st-link-pct');
  put(linkName, c.ic ? c.icName+' '+c.ic+' GB/s' : 'all-reduce 0 s');
  const showComm=commGlow>0.05;
  put(linkPct, showComm ? Math.round(commGlow*100)+'% of step' : '100% of step');
  linkPct.classList.toggle('on', showComm);
  drawStrip(s,cur,tm);
}
function syncLmHit(s,x,w){
  const el=s.lmHit;if(!el)return;
  const scale=s.st.clientWidth/Math.max(1,s.stW||1);
  el.style.left=(s.st.offsetLeft+x*scale).toFixed(1)+'px';
  el.style.top=(s.st.offsetTop+3).toFixed(1)+'px';
  el.style.width=Math.max(16,w*scale).toFixed(1)+'px';
  el.style.height='24px';
}
function drawStrip(s,cur,tm){
  const ctx=s.sx,W=s.stW,H=30,r=s.res,d=s.sx.canvas.width/W;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,W,H);
  const n=r.n,lmW=22,gap=3,bw=Math.max(1,(W-lmW-gap)/n),live=aneLive(s);
  const num=(s.done||cur.part==='head')?n:(cur.layer+1);
  const lab=num+'/'+n;
  if(s.lnum&&s.lnum.textContent!==lab)s.lnum.textContent=lab;
  const cA=r.segA.bound==='mem'?'251,191,36':'52,211,153',cM=r.segM.bound==='mem'?'251,191,36':'52,211,153',cH=r.segH.bound==='mem'?'251,191,36':'52,211,153';
  for(let i=0;i<n;i++){
    const past=s.done||i<cur.layer||cur.part==='head',now=!s.done&&i===cur.layer&&cur.part!=='head';
    const x=i*bw;
    ctx.fillStyle='rgba('+cA+','+(past?0.95:(now&&cur.part==='attn'?1:0.28))+')';ctx.fillRect(x,3,Math.max(1,bw-1),11);
    ctx.fillStyle='rgba('+cM+','+(past?0.95:(now&&cur.part==='mlp'?1:0.28))+')';ctx.fillRect(x,16,Math.max(1,bw-1),11);
    if(live){
      const bar=u=>ctx.fillStyle=(u==='ane'?'#f472b6':'#60a5fa');
      bar(live.parts.attn&&live.parts.attn.unit);ctx.fillRect(x,3,Math.min(3,Math.max(1,bw-1)),11);
      bar(live.parts.mlp&&live.parts.mlp.unit);ctx.fillRect(x,16,Math.min(3,Math.max(1,bw-1)),11);
    }
    if(now){ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.strokeRect(x-0.5,1.5,bw+0.5,26);}
  }
  const xh=n*bw+gap,boxW=Math.max(12,Math.min(lmW-2,W-xh));
  const headNow=!s.done&&cur.part==='head';
  ctx.fillStyle='rgba('+cH+','+((s.done||cur.part==='head')?1:0.28)+')';ctx.fillRect(xh,3,boxW,24);
  if(live){ctx.fillStyle=(live.parts.head&&live.parts.head.unit==='ane')?'#f472b6':'#60a5fa';ctx.fillRect(xh,3,3,24);}
  ctx.fillStyle='#0a0e16';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='10px system-ui,sans-serif';ctx.fillText('LM',xh+boxW/2,15);
  if(headNow){ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.strokeRect(xh-0.5,1.5,boxW+1,26);}
  syncLmHit(s,xh,boxW);
}
function phaseRes(s,phase){
  if(!!s.res.decode===(phase==='decode'))return s.res;
  return E.estimate(R.m,s.chip,opts({phase,eff:effOf(s.key)||undefined}),ASSUME);
}
function chipShort(c){return String(c.short||c.name||'').replace(/\s+\d+C$/,'');}
// Attainable TFLOPS on the published roof: min(peak TFLOPS, (GB/s ÷ 1000) × FLOP/byte).
function roofTF(peakTF,bwGBs,ai){return Math.min(peakTF,(bwGBs/1000)*ai);}
function drawRoof(){
  const cv=$('roof'),ctx=cv.getContext('2d'),d=cv.width/(cv.clientWidth||1),W=cv.clientWidth,H=cv.clientHeight;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,W,H);
  const ml=38,mr=8,mt=16,mb=22,xMin=0.5,xMax=30000,yMin=0.05,yMax=4000,x0=Math.log10(xMin),x1=Math.log10(xMax),y0=Math.log10(yMin),y1=Math.log10(yMax);
  const X=v=>ml+(Math.log10(Math.max(v,1e-6))-x0)/(x1-x0)*(W-ml-mr),Y=v=>H-mb-(Math.log10(Math.max(v,1e-6))-y0)/(y1-y0)*(H-mt-mb);
  ctx.font='9.5px system-ui,sans-serif';ctx.textBaseline='middle';ctx.strokeStyle='#1b2539';ctx.lineWidth=1;
  for(let e=0;e<=4;e++){const v=Math.pow(10,e);ctx.beginPath();ctx.moveTo(X(Math.max(v,xMin)),mt);ctx.lineTo(X(Math.max(v,xMin)),H-mb);ctx.stroke();ctx.fillStyle='#6b7a96';ctx.textAlign='center';ctx.fillText(v>=1000?(v/1000)+'k':v,X(v),H-mb+9);}
  for(let e=-1;e<=3;e++){const v=Math.pow(10,e);ctx.beginPath();ctx.moveTo(ml,Y(v));ctx.lineTo(W-mr,Y(v));ctx.stroke();ctx.fillStyle='#6b7a96';ctx.textAlign='right';ctx.fillText(v>=1000?(v/1000)+'k':v<1?v.toFixed(1):String(v),ml-4,Y(v));}
  ctx.fillStyle='#6b7a96';ctx.textAlign='center';ctx.fillText('FLOP/byte',(W+ml)/2,H-3);
  ctx.save();ctx.translate(9,(H-mb+mt)/2);ctx.rotate(-Math.PI/2);ctx.fillText('TFLOPS',0,0);ctx.restore();
  const dots=[];
  if(!sides.length||!sides[0].res)return;
  sides.forEach(s=>{
    const c=s.chip,pk=s.res.peakTF,bw=c.bw;
    ctx.strokeStyle=s.color;ctx.lineWidth=1.8;ctx.beginPath();let first=true;
    for(let i=0;i<=80;i++){const ai=Math.pow(10,lerp(x0,x1,i/80)),y=roofTF(pk,bw,ai);if(y<yMin)continue;const px=X(ai),py=Y(y);if(first){ctx.moveTo(px,py);first=false;}else ctx.lineTo(px,py);}ctx.stroke();
    const rx=X(s.res.ridge);ctx.setLineDash([3,3]);ctx.lineWidth=1;ctx.strokeStyle=s.color;ctx.beginPath();ctx.moveTo(rx,Y(Math.max(yMin,pk)));ctx.lineTo(rx,H-mb);ctx.stroke();ctx.setLineDash([]);
    const put=(name,ai,tf)=>{
      const x=X(clamp(ai,xMin,xMax)), y=Y(clamp(tf,yMin,yMax));
      dots.push({name,x,y,ai,tf,color:s.color,key:s.key});
    };
    for(const phase of ['decode','prefill']){const r=phaseRes(s,phase);put(phase,r.AI,roofTF(pk,bw,r.AI));}
    put('ridge',s.res.ridge,pk);
  });
  const ridges=sides.map(s=>X(clamp(s.res.ridge,0.5,30000)));
  const leftR=Math.min(...ridges), rightR=Math.max(...ridges);
  ctx.font='10px system-ui,sans-serif';ctx.fillStyle='#6b7a96';ctx.textAlign='center';
  const memX=ml+(leftR-ml)*0.45, compX=rightR+(W-mr-rightR)*0.55;
  if(leftR-ml>52)ctx.fillText('memory-bound',memX,mt+8);
  if(W-mr-rightR>64)ctx.fillText('compute-bound',compX,mt+8);
  const placed=[];
  ctx.font='10px system-ui,sans-serif';
  for(const dot of dots){
    const tw=ctx.measureText(dot.name).width;
    const cands=[{dx:8,dy:-11,align:'left'},{dx:8,dy:11,align:'left'},{dx:-8,dy:-11,align:'right'},{dx:-8,dy:11,align:'right'},{dx:8,dy:0,align:'left'},{dx:-8,dy:0,align:'right'}];
    let pick=cands[0];
    for(const c of cands){
      const lx=dot.x+c.dx, ly=dot.y+c.dy;
      const L=c.align==='left'?lx:lx-tw, R=L+tw, T=ly-6, B=ly+6;
      const inside=L>=ml-2&&R<=W-2&&T>=mt&&B<=H-mb+2;
      const hit=placed.some(p=>!(R<p.l-2||L>p.r+2||B<p.t-2||T>p.b+2));
      const onDot=dots.some(o=>o!==dot&&Math.hypot((L+R)/2-o.x,(T+B)/2-o.y)<11);
      if(inside&&!hit&&!onDot){pick=c;break;}
    }
    const lx=dot.x+pick.dx, ly=dot.y+pick.dy;
    const L=pick.align==='left'?lx:lx-tw;
    placed.push({l:L,r:L+tw,t:ly-6,b:ly+6});
    dot.lx=lx;dot.ly=ly;dot.align=pick.align;
  }
  for(const dot of dots){
    ctx.strokeStyle=dot.color;ctx.globalAlpha=0.75;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(dot.x,dot.y);ctx.lineTo(dot.lx,dot.ly);ctx.stroke();ctx.globalAlpha=1;
  }
  for(const dot of dots){
    ctx.beginPath();ctx.arc(dot.x,dot.y,3.1,0,6.2832);
    ctx.fillStyle=dot.color;ctx.fill();
    ctx.lineWidth=1;ctx.strokeStyle='#0a0f1a';ctx.stroke();
    ctx.fillStyle=dot.color;ctx.textAlign=dot.align;ctx.textBaseline='middle';ctx.fillText(dot.name,dot.lx,dot.ly);
  }
  const key=$('roofkey');
  if(key){
    const chipBits=sides.map(s=>'<span class="rk" style="color:'+s.color+'"><i class="dt"></i>'+s.key+' = '+esc(chipShort(s.chip))+'</span>').join('');
    const html=chipBits+'<span class="rk"><i class="ln"></i>line = max achievable</span><span class="rk"><i class="ds"></i>dashed = ridge point (where compute becomes the limit)</span><span class="rk"><i class="dt"></i>dots = this workload</span>';
    if(key.dataset.html!==html){key.dataset.html=html;key.innerHTML=html;}
  }
  window.__roofPts=dots.map(d=>({key:d.key,name:d.name,x:d.x,y:d.y,ai:d.ai,tf:d.tf}));
}

// ---------------------------------------------------------------- animation loop
function effGBs(s){
  const e=Object.assign({},s.chip.eff,effOf(s.key)||{});
  const bwEff=Math.min(1,e.bw*(S.prec==='int4'?ASSUME.int4BwFactor:1));
  return s.chip.bw*bwEff;
}
const DOT_SPEED_CAP=4, DOT_BASE_V=180, DOT_BASE_RATE=32;
function spawn(s,n){
  const speedK=Math.min(s.flowK||1,DOT_SPEED_CAP);
  for(let i=0;i<n&&s.parts.length<700;i++){
    const rt=s.layout.route();const pts=rt.pts,lens=[];let tot=0;
    for(let k=0;k<pts.length-1;k++){const l=Math.hypot(pts[k+1].x-pts[k].x,pts[k+1].y-pts[k].y);lens.push(l);tot+=l;}
    s.parts.push({pts,lens,total:tot,d:-Math.random()*8,ci:rt.ci,blk:rt.blk,v:DOT_BASE_V*(0.92+Math.random()*0.16)*speedK});
  }
}
let last=performance.now(),clock=0,playing=true;
function step(dt){
  clock+=dt;
  const tmax=Math.max(sides[0].res.total,sides[1].res.total),decode=S.phase==='decode';
  const flows=sides.map(effGBs), ref=Math.min(...flows.filter(v=>v>0))||1;
  if(playing){
    for(const s of sides){
      s.tAnim=(s.tAnim||0)+dt*S.spd;
      const x=s.tAnim/Math.max(1e-9,E.animSeconds(s.res.total,tmax,WALL));
      if(decode){s.steps=Math.floor(x);s.prog=x-Math.floor(x);s.done=false;}
      else{s.prog=Math.min(1,x);s.done=x>=1;s.steps=s.done?1:0;}
    }
  }
  for(const s of sides){
    if(!playing)continue;
    const cur=curSeg(s),sg=cur.seg,core=Math.max(sg.tc,sg.tm)||1e-12,mu=s.done?0:clamp(sg.tm/core,0,1);
    s.effGBs=effGBs(s);s.flowK=E.flowScale(s.effGBs,ref);
    const busy=s.done?0:(0.2+0.8*mu)*(s.res.oom?0.45:1);
    s.acc+=dt*S.spd*DOT_BASE_RATE*s.flowK*busy;const k=Math.floor(s.acc);s.acc-=k;if(k>0)spawn(s,k);
    for(const p of s.parts){p.d+=p.v*dt*S.spd;if(p.d>=p.total&&!p.hit){p.hit=true;if(p.ci>=0)s.flash[p.ci]=1;else if(p.blk)p.blk.flash=1;}}
    s.parts=s.parts.filter(p=>p.d<p.total);
  }
  for(const s of sides){
    const el=s.root.querySelector('.tokc'), n=el.querySelector('.tokc-n'), txt=String(s.steps||0);
    el.classList.toggle('on', decode); el.setAttribute('aria-hidden', decode?'false':'true');
    if(n.textContent!==txt) n.textContent=txt;
    const running=S.phase==='prefill' && !s.res.oom && !s.done;
    s.root.classList.toggle('running', running);
    if(running){
      const elapsed=s.prog*s.res.total, te=s.root.querySelector('.run-t'), ts=fmtT(elapsed);
      if(te.textContent!==ts) te.textContent=ts;
      const spd=elapsed>1e-9?(S.B_*S.L*Math.min(1,s.prog))/elapsed:0, se=s.root.querySelector('.run-s'), ss=fmtN(spd);
      if(se.textContent!==ss) se.textContent=ss;
    }
  }
}
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;step(dt);
  sides.forEach(s=>drawSide(s,clock));
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- assumptions drawer
const FORMULAS=[
'Notation: N = TP chips, B = batch, L = context (decode) or prompt length (prefill),',
'  h = hidden size, dAttn = heads x headDim, kvd = kvHeads x headDim, w = bytes per weight, kv = bytes per KV element',
'  attnP = 2*h*dAttn + 2*h*kvd      expertP = 3*h*ffn      embed = vocab*h',
'  T = B (decode)  |  B*L (prefill)        Et = E*(1-(1-k/E)^T) if E>1 else 1   (distinct experts touched)',
'',
'Per layer, per chip (two segments, then the LM head once per step):',
'  attn FLOPs = ( T*2*attnP + core ) / N      core = 4*dAttn*L*B (decode) | 2*dAttn*L^2*B (prefill)',
'  attn bytes = attnP*w/N + B*L*2*kvHeads*headDim*kv/N + T*h*2*actTraffic',
'  mlp  FLOPs = T*2*k*expertP / N',
'  mlp  bytes = Et*expertP*w/N + T*h*2*actTraffic',
'  head FLOPs = B*2*embed/N        head bytes = embed*w/N',
'  comm (N>1) = 2(N-1)/N * T*h*2 / (ic/2 * linkEff) + alphaUs      (once per segment, 2 per layer)',
'',
'  segment time = max( FLOPs / (peak TFLOPS * MFU),  bytes / (BW * eta) ) + comm',
'  eta = bandwidth efficiency (x int4BwFactor for INT4)       peak = FP8 rate only if the chip has one, else FP16',
'  step = layers*(attn + mlp) + head',
'  decode: tok/s per user = 1/step, aggregate = B/step      prefill: time to first token = step',
'  OOM when weights + B*L*KV bytes > capacity * usable fraction * N',
'',
'Estimate range = the same model with every efficiency factor x0.8 and x1.2 (capped at 1).',
'Ceiling = MFU = eta = 1 and no comm overheads (peak specs). These are estimates, not measurements.'
].join('\n');
let drawerTab='assume';
function openDrawer(tab){drawerTab=tab||drawerTab;$('drawer').classList.add('open');$('backdrop').classList.add('on');renderDrawer();}
function closeDrawer(){$('drawer').classList.remove('open');$('backdrop').classList.remove('on');}
function effNow(side){const c=chipById(S[side]);return Object.assign({},c.eff,effOf(side)||{});}
function renderDrawer(){
  $('tabAssume').classList.toggle('on',drawerTab==='assume');$('tabSpecs').classList.toggle('on',drawerTab==='specs');
  const body=$('dbody');
  if(drawerTab==='specs'){body.innerHTML=specsHTML();refreshTagLink();return;}
  let h='<div class="dnote">Everything below is an <b>assumption or a fitted factor</b>, not a measurement. Move a slider to see how sensitive the result is; the link in your address bar updates so you can share the exact settings.</div>';
  h+='<h4>Formulas (exactly as implemented)</h4><pre class="formulas">'+esc(FORMULAS)+'</pre>';
  h+='<h4>Global factors</h4>';
  for(const k of Object.keys(E.ASSUME_META)){const m=E.ASSUME_META[k];h+=sliderRow('g_'+k,m.label,m.min,m.max,m.step,ASSUME[k],m.fmt,ASSUME[k]!==E.DEFAULT_ASSUME[k],m.tag,{note:m.help})+'<div class="shelp">'+esc(m.help)+' Default '+m.fmt(E.DEFAULT_ASSUME[k])+'.</div>';}
  for(const side of ['A','B']){
    const c=chipById(S[side]),e=effNow(side),d=c.eff,raw=c.raw.eff;
    h+='<h4><span class="dot" style="background:'+(side==='A'?'var(--A)':'var(--B)')+'"></span>Chip '+side+': '+esc(c.name)+' efficiency</h4>';
    for(const [k,lab] of [['mfuP','MFU prefill'],['mfuD','MFU decode'],['bw','Bandwidth eff.']])
      h+=sliderRow('e'+side+'_'+k,lab,0.05,1,0.01,e[k],v=>v.toFixed(2),Math.abs(e[k]-d[k])>1e-9,raw[k].tag,{src:raw[k].src,note:raw[k].note,link:'spec:eff',tip:specTip('eff')})+'<div class="shelp">Default '+d[k].toFixed(2)+' ['+raw[k].tag+']: '+esc(raw[k].note||'')+'</div>';
    h+='<button class="hbtn" data-reset="'+side+'">Reset chip '+side+' to defaults</button>';
  }
  h+='<p><button class="hbtn" id="resetAll">Reset all assumptions</button></p>';
  h+='<h4>Sensitivity of the headline number (+/-20% on one factor)</h4><div id="sensBox"></div>';
  body.innerHTML=h;
  body.querySelectorAll('input[type=range]').forEach(inp=>inp.addEventListener('input',onSlider));
  body.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>{S['eff'+b.dataset.reset]=null;recompute();renderDrawer();});
  $('resetAll').onclick=()=>{S.effA=S.effB=null;ASSUME=Object.assign({},E.DEFAULT_ASSUME);S.assume=null;recompute();renderDrawer();};
  renderSens();
  refreshTagLink();
}
function sliderRow(id,label,min,max,step,val,fmt,chg,tag,meta){
  meta=meta||{};
  const lk=meta.link?' data-link="'+meta.link+'" data-tip="'+esc(meta.tip||'')+'"':'';
  return '<div class="srow'+(chg?' chg':'')+'"'+lk+'><span>'+tagBtn(tag,{spec:label,src:meta.src||[],note:meta.note||'',style:'width:13px;height:13px;font-size:8px'})+' '+esc(label)+'</span><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-label="'+esc(label)+'"><span class="sv" id="'+id+'_v">'+fmt(val)+'</span></div>';
}
function onSlider(ev){
  const id=ev.target.id,v=+ev.target.value;let m;
  if((m=id.match(/^g_(.+)$/))){ASSUME[m[1]]=v;S.assume=Object.assign({},ASSUME);$(id+'_v').textContent=E.ASSUME_META[m[1]].fmt(v);ev.target.closest('.srow').classList.toggle('chg',v!==E.DEFAULT_ASSUME[m[1]]);}
  else if((m=id.match(/^e([AB])_(.+)$/))){const side=m[1],k=m[2];S['eff'+side]=Object.assign({},effNow(side),{[k]:v});$(id+'_v').textContent=v.toFixed(2);ev.target.closest('.srow').classList.toggle('chg',Math.abs(v-chipById(S[side]).eff[k])>1e-9);}
  recompute();
}
function renderSens(){
  const box=$('sensBox');if(!box)return;
  const m=R.m;let h='';
  for(const s of sides){
    const sv=E.sensitivity(m,s.chip,opts({eff:effOf(s.key)||undefined}),ASSUME);
    const unit=sv.key==='tokUser'?'tok/s':'TTFT';
    h+='<table class="sens"><tr><th>Chip '+s.key+' ('+esc(s.chip.short)+')'+(s.res.oom?' [hypothetical: OOM]':'')+'</th><th>-20%</th><th>base</th><th>+20%</th></tr>';
    for(const r of sv.rows)h+='<tr><td>'+esc(r.label)+'</td><td>'+(r.down>=0?'+':'')+(r.down*100).toFixed(0)+'%</td><td>'+(sv.key==='tokUser'?fmtN(sv.base)+' '+unit:fmtT(sv.base))+'</td><td>'+(r.up>=0?'+':'')+(r.up*100).toFixed(0)+'%</td></tr>';
    h+='</table>';
  }
  h+='<div class="shelp">A row near 0% means that factor does not limit this workload (e.g. MFU barely matters in memory-bound decode). Percent change is in '+(R.m&&S.phase==='decode'?'tokens/s':'time to first token (negative = faster)')+'.</div>';
  box.innerHTML=h;
}
function specsHTML(){
  let h='<div class="legend"><span class="leg" data-link="tag:V" data-tip="'+esc(specTip('tag:V'))+'">'+tagBtn('V')+' verified: published figure</span><span class="leg" data-link="tag:A" data-tip="'+esc(specTip('tag:A'))+'">'+tagBtn('A')+' approximate / derived / third-party</span><span class="leg" data-link="tag:U" data-tip="'+esc(specTip('tag:U'))+'">'+tagBtn('U')+' assumed</span></div>';
  h+='<div class="dnote">Data source: '+esc(DATASRC)+'. Apple never publishes GPU TFLOPS, so those rows are never tagged V. No chip in this data set is a speculative projection: M6 and M5 Ultra were announced by Apple on 2026-08-25 (the app supports a "speculative" status and ribbon for future unannounced chips).</div>';
  for(const s of sides){
    const c=s.chip;
    h+='<h4><span class="dot" style="background:'+(s.key==='A'?'var(--A)':'var(--B)')+'"></span>Chip '+s.key+': '+esc(c.name)+(c.status==='speculative'?' <b style="color:#f87171">[SPECULATIVE PROJECTION]</b>':'')+'</h4><table class="spectbl">';
    const keys=SPEC_ORDER.concat(['maxTP']).filter(k=>c.raw.specs[k]);
    for(const k of keys){const sp=c.raw.specs[k];h+='<tr data-link="spec:'+k+'" data-tip="'+esc(specTip(k))+'"><td>'+mark('spec:'+k,'•',specTip(k))+' '+esc(specLabel(k,c))+'</td><td>'+tagBtn(sp.tag,{spec:specLabel(k,c),src:sp.src,note:sp.note})+' <b>'+esc(specVal(k,sp))+'</b><br>'+esc(sp.note||'')+'<br><span class="tiny">'+srcLinks(sp.src)+'</span></td></tr>';}
    for(const [k,lab] of [['mfuP','MFU prefill'],['mfuD','MFU decode'],['bw','Bandwidth efficiency']]){const sp=c.raw.eff[k];h+='<tr data-link="spec:eff" data-tip="'+esc(specTip('eff'))+'"><td>'+mark('spec:eff','•',specTip('eff'))+' '+lab+'</td><td>'+tagBtn(sp.tag,{spec:lab,src:sp.src,note:sp.note})+' <b>'+sp.v+'</b><br>'+esc(sp.note||'')+'<br><span class="tiny">'+srcLinks(sp.src)+'</span></td></tr>';}
    if(c.notes)h+='<tr><td>Notes</td><td>'+esc(c.notes)+'</td></tr>';
    h+='</table>';
  }
  return h;
}

// ---------------------------------------------------------------- one highlight handler for every data-link group
let tagLock=null, tagAnchor=null, tagHover=false, hideT=0, touchAt=-1e9;
function specTip(k){
  return ({
    fp16:'FP16 dense matrix throughput, in TFLOPS. It is the flat top of the roofline and the compute rate of a step.',
    fp8:'FP8 / 8-bit matrix throughput, in TFLOPS. It replaces the FP16 peak when this precision is selected. Empty means the chip has no native 8-bit math.',
    bw:'Memory bandwidth in GB/s. It is the slant of the roofline. When a step is memory-bound, tokens per second scale with it.',
    cap:'Memory capacity in GB. Weights plus the KV cache have to fit in the usable share of this.',
    units:'How many compute units the diagram draws: GPU cores, SMs, CUs, or MXUs.',
    node:'Manufacturing process. The speed math does not use it.',
    l2:'On-chip cache. On Apple chips this is the System Level Cache drawn above the GPU.',
    neural:'Neural Engine core count. No separate memory bus or peak TFLOPS is published. It lights only when Run on Neural Engine is on for a documented model.',
    ic:'Chip-to-chip link bandwidth. Zero means there is no NVLink-style link and the chip runs alone.',
    usable:'Share of capacity the model may use for weights and the KV cache. The rest is left for the OS and the GPU.',
    announced:'Announcement date. The speed math does not use it.',
    maxTP:'Most chips this comparison will place side by side. A single-package chip stays at 1.',
    eff:'Three factors, in order: prefill MFU, decode MFU, bandwidth efficiency. The badge says what each number scales.',
    ai:'Arithmetic intensity is FLOPs divided by bytes moved. Left of the ridge the step is memory-bound; right of it, compute-bound.',
    'tag:V':'Verified: a published figure. Each chip badge names that publication.',
    'tag:A':'Approximate: derived or measured. Each chip badge names the derivation and the source.',
    'tag:U':'Assumed: a modelling choice. Each chip badge says what is assumed, and says when no source is recorded.',
    'note:nolink':'One package: all-reduce time in the step is 0 s, so tok/s comes only from this chip\'s compute and memory bandwidth. The model is not split, so weights and the KV cache have to fit here.',
    'note:range':'Blue band: efficiency from ×0.8 to ×1.2, capped at 1. White tick: the central estimate. Amber dashes: peak specs with every efficiency at 100%.',
    'note:na':'Bright cells are doing math. Dim amber cells, with STALL, are waiting on memory. On M5-generation Apple GPUs the bright inner square is the Neural Accelerator, the matrix unit in each GPU core.',
    'note:fp8':'On Apple GPUs, FP8 stores weights in 8 bits and runs the matmul in 16-bit, because those GPUs have no native 8-bit math.',
    'note:arch':'Gold dots are bytes moving from memory, through the on-chip cache, into a compute unit. Dot speed and dots per second scale with effective bandwidth (published GB/s times bandwidth efficiency) on one scale for both panels. dot rate ∝ memory bandwidth.',
    'note:layer':'The word layer stays on the left of the grid. The number under it is the layer now running, out of this model\'s layers, in a fixed-width slot. A white outline marks that column.',
    'note:attn':'Attention is the top row of every column. The word stays attention. Amber means that half is waiting on memory. Green means it is limited by compute.',
    'note:ffn':'Feed-forward (MLP) is the bottom row of every column. The word stays feed-forward. Amber means that half is waiting on memory. Green means it is limited by compute.',
    'note:lm':'LM head, once per step, after the layers. Amber means it is waiting on memory. Green means it is limited by compute.',
    'note:est':'Analytical roofline-style estimates. Specs are tagged V/A/U; efficiency factors are assumptions or fits.',
    'note:assume':'Formulas, efficiency factors, sliders, sensitivity, chip spec sources.',
    'note:copy':'Copy a link that restores these exact settings.',
    'note:gpu':'GPU compute time per token = FLOPs/token / (peak TFLOPS × eff). It is far smaller than memory read time, so memory sets the speed.',
    'xref:roofline':'Horizontal axis: FLOPs per byte moved. Vertical axis: achievable TFLOPS. The slope is the bandwidth limit, the flat top is the compute limit, and the ridge is where they meet.',
    'xref:verdict':'Which chip finishes the step sooner, and whether the gap comes from memory bandwidth, peak compute, or the chip-to-chip link.'
  })[k]||k;
}
function mark(link,label,tip){
  const t=tip||label;
  return '<button type="button" class="mk" data-link="'+link+'" data-tip="'+esc(t)+'" aria-label="'+esc(t)+'">'+label+'</button>';
}
function tagBtn(tag,meta){
  meta=meta||{};
  if(!tag)return '';
  const src=Array.isArray(meta.src)?meta.src.filter(Boolean).join(','):(meta.src||'');
  const spec=meta.spec||'', note=meta.note||'', kind=meta.kind||'';
  const al=kind==='eff'
    ? 'Efficiency factors. Prefill MFU, decode MFU, and bandwidth efficiency: what each number scales, and whether a source is recorded.'
    : (spec?spec+'. ':'')+(note?note+' ':'')+(src?'Source '+src+'.':'No recorded source.');
  const st=meta.style?' style="'+meta.style+'"':'';
  return '<button type="button" class="tg '+tag+'" data-link="tag:'+tag+'" data-tag="'+tag+'" data-kind="'+esc(kind)+'" data-spec="'+esc(spec)+'" data-src="'+esc(src)+'" data-note="'+esc(note)+'" aria-label="'+esc(al)+'"'+st+'>'+tag+'</button>';
}
function firstSentence(s){
  const t=String(s||'').trim();
  if(!t)return '';
  const m=t.match(/^[\s\S]*?[.!?](?:\s|$)/);
  return (m?m[0]:t).trim();
}
function sourceBits(keys){
  const list=(keys||[]).map(k=>SOURCES[k]).filter(Boolean);
  const html=list.map(s=>/^https?:/.test(s.url||'')?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>':esc(s.title)+(s.url?' ('+esc(s.url)+')':'')).join('; ');
  return {list,html};
}
function syncFuseHit(s){
  const links=(s.layout&&s.layout.links)||[];
  const k=links.find(x=>x.pill)||links.find(x=>x.vert)||null;
  let el=s.fuseHit;
  if(!k||!s.chip){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('button');el.type='button';el.className='fusehit';el.dataset.link='note:fuse';el.dataset.kind='fuse';s.root.appendChild(el);s.fuseHit=el;}
  const bl=1,bt=1,bw=s.cv.width/s.dpr||1,bh=s.cv.height/s.dpr||1;
  const scaleX=s.cv.clientWidth/bw, scaleY=s.cv.clientHeight/bh;
  const left=s.cv.offsetLeft+bl+(s.offx+k.x*s.sc)*scaleX;
  const top=s.cv.offsetTop+bt+(s.offy+k.y*s.sc)*scaleY;
  const w=Math.max(18,(k.w*s.sc)*scaleX), h=Math.max(18,(k.h*s.sc)*scaleY);
  el.style.left=(left-(w-(k.w*s.sc)*scaleX)/2).toFixed(1)+'px';
  el.style.top=top.toFixed(1)+'px';
  el.style.width=w.toFixed(1)+'px';
  el.style.height=h.toFixed(1)+'px';
  el.style.display='block';
  const al='Die-to-die link, idle. The speed math does not send bytes across it, so tok/s is unchanged.';
  if(el.getAttribute('aria-label')!==al)el.setAttribute('aria-label',al);
}
function fusePopHtml(chip){
  const node=(chip.raw.specs&&chip.raw.specs.node)||{};
  const ic=(chip.raw.specs&&chip.raw.specs.ic)||{};
  const nodeBits=sourceBits(node.src||[]);
  const icBits=sourceBits(ic.src||[]);
  const dies=chip.dies||1;
  let h='<p><b>Idle on purpose.</b> This bar is the die-to-die link. The speed math does not send bytes across it, so there is no traffic to animate.</p>';
  h+='<p>All-reduce time is added only when more than one chip is used and a link bandwidth is set. Interconnect in this model is '+esc(ic.v==null?'not recorded':String(ic.v))+', so the link adds 0 s and tok/s does not change. No bytes-per-token figure is recorded for this bar.</p>';
  h+='<p><b>'+dies+' die'+(dies===1?'':'s')+'.</b> '+(node.tag==='V'?'Verified: ':(node.tag==='A'?'Approximate: ':'Assumed: '))+esc(node.v||'die count not recorded')+(node.note?'. '+node.note:'')+(nodeBits.list.length?'':' No recorded source.')+'</p>';
  if(nodeBits.html)h+='<p>'+nodeBits.html+'</p>';
  h+='<p><b>Link bandwidth used by the model:</b> '+esc(ic.v==null?'not recorded':String(ic.v))+'. '+(ic.tag==='V'?'Verified: ':(ic.tag==='A'?'Approximate: ':'Assumed: '))+(ic.note||'not modelled.')+(icBits.list.length?'':' No recorded source.')+'</p>';
  if(icBits.html)h+='<p>'+icBits.html+'</p>';
  if(/TB\/s|GB\/s/.test(String(node.v)+' '+String(node.note)))h+='<p>A rate appears in the die description above. This model does not apply it. Interconnect stays at the value in the spec, so that rate does not change tok/s.</p>';
  return h;
}
function chipFromEl(el){
  const panel=el&&el.closest&&el.closest('.panel');
  if(!panel)return null;
  const s=sides.find(x=>x.root===panel);
  return s&&s.chip;
}
function effPopHtml(chip){
  const e=chip.raw.eff;
  const rows=[
    ['prefill MFU', e.mfuP, 'Scales peak FLOPS during prefill: rate = peak × '+e.mfuP.v+'. Compute-bound tokens per second scale with it. A memory-bound step ignores it.'],
    ['decode MFU', e.mfuD, 'Scales peak FLOPS during decode: rate = peak × '+e.mfuD.v+'. A memory-bound decode keeps tokens per second on the bandwidth line, so this factor does not change them unless compute time exceeds memory time.'],
    ['bandwidth efficiency', e.bw, 'Scales published GB/s: bytes/s = bandwidth × '+e.bw.v+'. Memory-bound tokens per second (the usual decode) scale with it: tok/s ≈ (bandwidth × '+e.bw.v+') / bytes per token. INT4 also multiplies bandwidth by the INT4 factor.']
  ];
  let h='<p><b>'+e.mfuP.v+' / '+e.mfuD.v+' / '+e.bw.v+'</b> prefill MFU, decode MFU, bandwidth efficiency.</p>';
  h+='<p class="eq">step = max(FLOPs / (peak × MFU), bytes / (bandwidth × bw eff))<br>decode tok/s = 1 / step</p>';
  for(const [lab,sp,scales] of rows){
    const bits=sourceBits(sp.src||[]);
    const lead=sp.tag==='U'?'Assumed':'Approximate';
    const why=firstSentence(sp.note)||'no further detail is recorded.';
    const nosrc=bits.list.length?'':' No recorded source.';
    h+='<p><b>'+sp.v+' '+esc(lab)+'.</b> '+esc(scales)+'</p>';
    h+='<p>'+esc(lead+': '+why+nosrc)+'</p>';
    if(bits.html)h+='<p>'+bits.html+'</p>';
  }
  const assumed=rows.filter(r=>r[1].tag==='U').map(r=>r[0]);
  if(assumed.length)h+='<p>The badge is U because '+esc(assumed.join(' and '))+(assumed.length>1?' are':' is')+' an assumption. A factor with a named measurement is marked on its own line.</p>';
  return h;
}
function badgePopHtml(el){
  if(el.dataset.kind==='eff'){
    const chip=chipFromEl(el);
    if(chip&&chip.raw&&chip.raw.eff)return effPopHtml(chip);
  }
  const tag=el.dataset.tag||'';
  const spec=el.dataset.spec||'';
  const note=el.dataset.note||'';
  const keys=(el.dataset.src||'').split(',').filter(Boolean);
  const bits=sourceBits(keys);
  if(!spec&&!note)return '<p>'+esc(specTip('tag:'+tag))+'</p>';
  let body;
  if(tag==='V')body='Verified: '+(bits.list.length?bits.list.map(s=>s.title).join('; ')+'.':'no recorded source for this figure.')+(note?' '+note:'');
  else if(tag==='A')body='Approximate: '+(note||'derived or measured figure.')+(bits.list.length?'':' No recorded source.');
  else body='Assumed: '+(note||'a modelling choice.')+(bits.list.length?'':' No recorded source.');
  return '<p><b>'+esc(spec|| (tag==='V'?'Verified':tag==='A'?'Approximate':'Assumed'))+'</b></p><p>'+esc(body)+'</p>'+(bits.html?'<p>'+bits.html+'</p>':'');
}
function specCite(label,sp){
  if(!sp)return '';
  const bits=sourceBits(sp.src||[]);
  const lead=sp.tag==='V'?'Verified':sp.tag==='A'?'Approximate':'Assumed';
  return '<p><b>'+esc(label)+' '+esc(sp.v==null?'not recorded':String(sp.v))+'.</b> '+esc(lead)+': '+esc(firstSentence(sp.note)||'no further detail is recorded.')+(bits.list.length?'':' No recorded source.')+(bits.html?' '+bits.html:'')+'</p>';
}
function fitPopHtml(sideKey){
  const s=sides.find(x=>x.key===sideKey);
  if(!s||!s.res)return '<p>Weights and the KV cache have to fit in usable memory.</p>';
  const r=s.res,m=r.m,c=s.chip,P=PRECS[S.prec],sp=(c.raw.specs&&c.raw.specs.usable)||{};
  const wB=P.w,kvB=P.kv,pct=Math.round(c.usable*100);
  let h='<p><b>Weights</b> = parameters × bytes per parameter, for the precision selected now ('+esc(P.label)+').</p>';
  h+='<p class="eq">'+Math.round(m.total).toLocaleString('en-US')+' params × '+wB+' byte'+(wB===1?'':'s')+' = '+r.weightGB.toFixed(1)+' GB</p>';
  h+='<p><b>KV cache</b> = 2 × layers × kv heads × head dim × bytes × batch × context.</p>';
  h+='<p class="eq">2 × '+m.layers+' × '+m.kvHeads+' × '+m.headDim+' × '+kvB+' × '+S.B_+' × '+S.L.toLocaleString('en-US')+' = '+r.kvGB.toFixed(2)+' GB</p>';
  h+='<p>That is '+m.kvPerTok.toLocaleString('en-US')+' KV elements per token. KV bytes are '+kvB+' per element'+(S.prec==='int4'?' (INT4 keeps the cache at 16-bit)':'')+'.</p>';
  h+=specCite('Usable fraction',Object.assign({},sp,{v:sp.v}));
  h+='<p>'+pct+'% of '+r.capGB+' GB is '+r.usableGB.toFixed(0)+' GB usable.</p>';
  h+='<p>'+(r.oom?'Weights plus the KV cache are larger than that usable share, so this chip would not run. The tok/s figures are hypothetical.':'Weights plus the KV cache fit in that usable share, so this chip can hold the model and the cache.')+'</p>';
  return h;
}
function roofPopHtml(){
  let h='<p><b>How to read this chart.</b> The horizontal axis is arithmetic intensity: FLOPs per byte moved. The vertical axis is achievable TFLOPS. Both scales are logarithmic.</p>';
  h+='<p>The sloping line is the memory-bandwidth limit: TFLOPS = published GB/s ÷ 1000 × FLOP/byte. The flat top is the compute limit, the peak TFLOPS for this precision. The ridge is the crossover. Left of the ridge a step is memory-bound. Right of it, compute-bound.</p>';
  h+='<p>A dot is this workload, drawn on that line at its intensity. Decode reads the weights again for every token and does little math per byte, so it sits on the slope. Prefill reuses each weight across the prompt, so its intensity is higher.</p>';
  for(const s of sides){
    const dec=phaseRes(s,'decode'),pre=phaseRes(s,'prefill'),ridge=s.res.ridge,pk=s.res.peakTF;
    const sit=ai=>ai<ridge?'on the memory slope, left of the ridge':'on the compute flat, right of the ridge';
    const aiFmt=x=>x>=100?x.toFixed(0):x>=10?x.toFixed(1):x.toFixed(2);
    h+='<p><b>'+s.key+' '+esc(chipShort(s.chip))+'.</b> Decode '+aiFmt(dec.AI)+' FLOP/byte, '+sit(dec.AI)+'. Prefill '+aiFmt(pre.AI)+' FLOP/byte, '+sit(pre.AI)+'. Ridge '+aiFmt(ridge)+' FLOP/byte at '+aiFmt(pk)+' TFLOPS.</p>';
    h+=specCite('Memory bandwidth',s.chip.raw.specs.bw);
    const pkKey=(S.prec==='fp8'&&s.chip.fp8)?'fp8':'fp16';
    h+=specCite(pkKey==='fp8'?'FP8 peak compute':'FP16 peak compute',s.chip.raw.specs[pkKey]);
    if(S.prec==='fp8'&&!s.chip.fp8)h+='<p>No FP8 rate is recorded for this chip, so the flat top is the FP16 peak. On Apple GPUs the matmul stays 16-bit.</p>';
  }
  if(S.ane){
    const live=sides.filter(s=>E.aneGate(R.m,s.chip,S.prec,S.L).ok);
    h+='<p><b>Neural Engine, same bus.</b> '+(live.length?'Run on Neural Engine is on for '+live.map(s=>s.key+' '+chipShort(s.chip)).join(' and ')+'. ':'')+'The lines do not move and tokens per second do not change. The Neural Engine has no separate memory bandwidth in the spec, so the slope stays the published unified-memory GB/s. No Neural Engine peak TFLOPS is published, so the flat top stays the GPU peak. No published Neural Engine tok/s for this model is recorded, so none is plotted.</p>';
  }
  return h;
}
function anePopHtml(el){
  const m=R.m,a=m&&m.ane,t=E.aneToggle(m,sides.map(s=>s.chip),S.prec,S.L);
  const sideKey=el&&el.dataset&&el.dataset.side;
  const s=sideKey&&sides.find(x=>x.key===sideKey);
  let h='';
  if(!t.ok)h+='<p><b>Run on Neural Engine is unavailable.</b> '+esc(t.reason)+'</p>';
  else if(!S.ane)h+='<p><b>Run on Neural Engine is off.</b> The GPU path is drawn. Turning it on does not change tokens per second.</p>';
  else h+='<p><b>Run on Neural Engine is on.</b> Tokens per second stay on the unified-memory bandwidth roofline. No published Neural Engine tok/s for this model is recorded, so none is shown.</p>';
  if(a){
    const lead=a.tag==='V'?'Verified. ':a.tag==='A'?'Approximate. ':'Assumed. ';
    const body=a.viable?(a.contextNote||''): (a.why||'');
    if(body && body!==t.reason)h+='<p>'+lead+esc(body)+'</p>';
    if(a.ramNote)h+='<p>'+esc(a.ramNote)+'</p>';
    if(a.benchNote && S.ane)h+='<p>'+esc(a.benchNote)+'</p>';
    const bits=sourceBits(a.src||[]);
    if(bits.html)h+='<p>'+bits.html+'</p>';
    const names={embed:'Embeddings',attn:'Attention',mlp:'Feed-forward',head:'LM head'};
    for(const k of ['embed','attn','mlp','head']){
      const part=a.parts&&a.parts[k]; if(!part)continue;
      const unit=part.unit==='ane'?'Neural Engine':part.unit==='gpu'?'GPU fallback':'CPU';
      const pb=sourceBits(part.src||[]);
      const plead=part.tag==='V'?'Verified. ':part.tag==='A'?'Approximate. ':'Assumed. ';
      h+='<p><b>'+names[k]+': '+unit+'.</b> '+plead+esc(part.note||'')+(pb.list.length?'':' No recorded source.')+'</p>';
      if(pb.html)h+='<p>'+pb.html+'</p>';
    }
    if(Array.isArray(a.benchmarks))for(const b of a.benchmarks){
      const bb=sourceBits(b.src||[]);
      h+='<p><b>Published '+esc(String(b.toks))+' '+esc(b.unit||'tok/s')+'</b> on '+esc(b.device||'the measured device')+'. '+esc(b.note||'')+'</p>';
      if(bb.html)h+='<p>'+bb.html+'</p>';
    }
  }
  h+='<p>The Neural Engine uses the same unified memory as the GPU. The roofline slope stays the published bandwidth. No Neural Engine peak TFLOPS is published, so the flat top stays the GPU peak.</p>';
  if(s){
    const g=E.aneGate(m,s.chip,S.prec,S.L);
    h+='<p><b>'+s.key+' '+esc(chipShort(s.chip))+'.</b> '+(S.ane&&g.ok?'This panel follows the Neural Engine steps. Pink N marks the Neural Engine. Blue G marks the GPU fallback.':('This panel stays on the GPU. '+(g.ok?'The toggle is off.':g.reason)))+'</p>';
  } else if(ANE_OUT.length){
    h+='<p><b>Not in this model list.</b> Recorded so their numbers are not copied onto these rows.</p>';
    for(const o of ANE_OUT){
      const bits=sourceBits(o.src||[]);
      const lead=o.tag==='V'?'Verified. ':o.tag==='A'?'Approximate. ':'Assumed. ';
      h+='<p><b>'+esc(o.name)+'.</b> '+lead+esc(o.note||'')+'</p>';
      if(Array.isArray(o.benchmarks))for(const b of o.benchmarks){
        const bb=sourceBits(b.src||[]);
        h+='<p><b>Published '+esc(String(b.toks))+' '+esc(b.unit||'tok/s')+'</b> on '+esc(b.device||'the measured device')+'. '+esc(b.note||'')+'</p>';
        if(bb.html)h+='<p>'+bb.html+'</p>';
      }
      if(bits.html)h+='<p>'+bits.html+'</p>';
    }
  }
  return h;
}
function hideSrcPop(){
  const pop=$('srcpop');
  if(!pop)return;
  pop.hidden=true;
  pop.innerHTML='';
  delete pop.dataset.owner;
}
function paragraphs(text){
  return String(text||'').split(/\n\n+/).map(s=>s.trim()).filter(Boolean).map(s=>'<p>'+esc(s)+'</p>').join('');
}
function absorbTitle(el){
  if(!el||!el.getAttribute)return;
  const t=el.getAttribute('title');
  if(!t)return;
  if(!el.dataset.extra)el.dataset.extra=t;
  else if(el.dataset.extra.indexOf(t)<0)el.dataset.extra+='\n\n'+t;
  if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',t);
  el.removeAttribute('title');
}
function tipHtml(el){
  const tip=el.dataset.tip||specTip(el.dataset.link||'')||'';
  const extra=el.dataset.extra||'';
  const html=paragraphs([tip,extra].filter(Boolean).join('\n\n'));
  if(html)return html;
  const al=el.getAttribute('aria-label')||'';
  return al?'<p>'+esc(al)+'</p>':'';
}
function rectsOverlap(a,b){
  return !(a.right<=b.left+0.5||a.left>=b.right-0.5||a.bottom<=b.top+0.5||a.top>=b.bottom-0.5);
}
function placePop(pop,el){
  const r=el.getBoundingClientRect();
  const pw=pop.offsetWidth, ph=pop.offsetHeight, vw=window.innerWidth, vh=window.innerHeight, gap=8;
  const obstacles=[{left:r.left,top:r.top,right:r.right,bottom:r.bottom}];
  document.querySelectorAll('.pdetail.on').forEach(n=>{
    const b=n.getBoundingClientRect();
    if(b.width>2&&b.height>2)obstacles.push(b);
  });
  const candidates=[
    {left:r.left,top:r.bottom+gap},
    {left:r.right-pw,top:r.bottom+gap},
    {left:r.left,top:r.top-ph-gap},
    {left:r.right-pw,top:r.top-ph-gap},
    {left:r.right+gap,top:r.top},
    {left:r.left-pw-gap,top:r.top}
  ];
  const fits=c=>{
    const box={left:c.left,top:c.top,right:c.left+pw,bottom:c.top+ph};
    if(box.left<8||box.top<8||box.right>vw-8||box.bottom>vh-8)return false;
    return !obstacles.some(o=>rectsOverlap(box,o));
  };
  let pick=candidates.find(fits);
  if(!pick){
    let left=Math.min(Math.max(8,r.left),Math.max(8,vw-pw-8));
    let top=r.bottom+gap;
    if(top+ph>vh-8)top=r.top-ph-gap;
    if(top<8)top=Math.min(Math.max(8,r.top),Math.max(8,vh-ph-8));
    const box={left,top,right:left+pw,bottom:top+ph};
    if(rectsOverlap(box,obstacles[0])){
      if(vw-r.right>=r.left)left=Math.min(vw-pw-8,r.right+gap);
      else left=Math.max(8,r.left-pw-gap);
      top=Math.min(Math.max(8,r.top),Math.max(8,vh-ph-8));
    }
    pick={left,top};
  }
  pop.style.left=Math.round(pick.left)+'px';
  pop.style.top=Math.round(pick.top)+'px';
}
function gpuPopHtml(sideKey){
  const s=sides.find(x=>x.key===sideKey);
  if(!s||!s.res||!s.chip)return '<p><b>GPU compute time per token</b> = FLOPs/token / (peak TFLOPS × eff).</p>';
  const r=s.res,c=s.chip,T=Math.max(1,r.decode?S.B_:S.B_*S.L);
  const flops=r.F/T,e=Object.assign({},c.eff,effOf(s.key)||{}),mfu=r.decode?e.mfuD:e.mfuP,peak=r.peakTF;
  const sec=flops/(peak*1e12*Math.max(1e-9,mfu)),memSec=r.sumTm/T;
  const pkKey=(S.prec==='fp8'&&c.raw.specs.fp8&&c.raw.specs.fp8.v!=null)?'fp8':'fp16';
  const pk=c.raw.specs[pkKey],units=c.raw.specs.units;
  const effName=r.decode?'decode MFU':'prefill MFU';
  let h='<p><b>GPU compute time per token</b> = FLOPs/token / (peak TFLOPS × eff).</p>';
  h+='<p class="eq">'+Math.round(flops).toLocaleString('en-US')+' FLOPs/token / ('+peak+' × '+mfu+') = '+fmtT(sec)+'</p>';
  h+='<p>'+esc(String(units.v))+' '+esc(c.unitName)+'s '+tagBtn(units.tag,{spec:specLabel('units',c),src:units.src,note:units.note})+' Peak '+esc(specVal(pkKey,pk))+' '+tagBtn(pk.tag,{spec:specLabel(pkKey,c),src:pk.src,note:pk.note})+' eff is the '+effName+', '+mfu+'.</p>';
  if(sec*4<memSec)h+='<p>GPU compute time ('+fmtT(sec)+') is far smaller than memory read time ('+fmtT(memSec)+'), so memory sets the speed.</p>';
  else if(sec<memSec)h+='<p>GPU compute time ('+fmtT(sec)+') is smaller than memory read time ('+fmtT(memSec)+'), so memory sets the speed.</p>';
  else h+='<p>GPU compute time ('+fmtT(sec)+') is longer than memory read time ('+fmtT(memSec)+'), so compute sets the speed.</p>';
  return h;
}
function showSrcPop(el){
  const pop=$('srcpop');
  if(!pop||!el)return;
  absorbTitle(el);
  let html='';
  if(el.dataset&&el.dataset.kind==='fuse'){const chip=chipFromEl(el);html=chip?fusePopHtml(chip):'<p>Idle on purpose. Die-to-die traffic is not in the speed math.</p>';}
  else if(el.dataset&&el.dataset.kind==='fit')html=fitPopHtml(el.dataset.side||'A');
  else if(el.dataset&&el.dataset.kind==='roof')html=roofPopHtml();
  else if(el.dataset&&el.dataset.kind==='ane')html=anePopHtml(el);
  else if(el.dataset&&el.dataset.kind==='strip')html=paragraphs(specTip('note:'+(el.dataset.part||'layer')));
  else if(el.dataset&&el.dataset.kind==='gpu')html=gpuPopHtml(el.dataset.side||'A');
  else if(el.matches&&el.matches('button.tg'))html=badgePopHtml(el);
  else html=tipHtml(el);
  if(el.dataset&&el.dataset.extra&&html.indexOf(el.dataset.extra.slice(0,48))<0)html+=paragraphs(el.dataset.extra);
  if(!html||html==='<p></p>'){hideSrcPop();return;}
  pop.innerHTML=html;
  pop.dataset.owner=el.dataset.link||'tip';
  pop.hidden=false;
  pop.style.visibility='hidden';
  placePop(pop,el);
  pop.style.visibility='visible';
}
function tagShown(){return !!(tagLock||tagHover)&&tagAnchor&&tagAnchor.isConnected&&tagAnchor.dataset.link;}
function linkHidden(el){
  for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
    const cs=getComputedStyle(n);
    if(cs.display==='none'||cs.visibility==='hidden')return true;
  }
  return false;
}
function paintTagLink(){
  const link=tagShown()?tagAnchor.dataset.link:'';
  document.querySelectorAll('[data-link]').forEach(el=>{
    const on=!!link&&el.dataset.link===link&&!linkHidden(el);
    el.classList.toggle('lk',on);
  });
}
function refreshTagLink(){if(tagAnchor&&!tagAnchor.isConnected)clearTagLink();else if(tagShown())paintTagLink();}
function armMarkers(){}
function showTag(el,lock){
  if(!el||!el.dataset||!el.dataset.link)return;
  clearTimeout(hideT); tagAnchor=el;
  if(lock) tagLock=el.dataset.link; else tagHover=true;
  paintTagLink();
  showSrcPop(el);
}
function scheduleHide(){
  clearTimeout(hideT);
  hideT=setTimeout(()=>{
    if(tagLock)return;
    const a=document.activeElement;
    if(a&&a.closest&&a.closest('[data-link]'))return;
    tagHover=false; if(!tagLock){tagAnchor=null;hideSrcPop();} paintTagLink();
  },180);
}
function clearTagLink(){clearTimeout(hideT);tagLock=null;tagHover=false;tagAnchor=null;paintTagLink();hideSrcPop();}
function linkTarget(node){return node&&node.closest&&node.closest('[data-link]');}
function bindLinks(){
  document.addEventListener('pointerover',ev=>{
    if(ev.pointerType==='touch'||performance.now()-touchAt<700)return;
    const t=linkTarget(ev.target); if(t) showTag(t,false);
  });
  document.addEventListener('pointerout',ev=>{
    if(ev.pointerType&&ev.pointerType!=='mouse')return;
    const fromLink=linkTarget(ev.target);
    const fromPop=ev.target.closest&&ev.target.closest('#srcpop');
    if(!fromLink&&!fromPop)return;
    const to=ev.relatedTarget;
    if(to&&to.closest&&(to.closest('[data-link]')||to.closest('#srcpop')))return;
    scheduleHide();
  });
  document.addEventListener('pointerover',ev=>{
    if(ev.target.closest&&ev.target.closest('#srcpop'))clearTimeout(hideT);
  });
  document.addEventListener('pointerdown',ev=>{
    if(ev.target.closest&&ev.target.closest('#srcpop'))return;
    const t=linkTarget(ev.target);
    if(ev.pointerType==='touch'){
      touchAt=performance.now();
      if(t){if(t.closest('button'))ev.preventDefault(); if(tagLock&&tagAnchor===t) clearTagLink(); else showTag(t,true);}
      else clearTagLink();
      return;
    }
    if(!t&&tagLock) clearTagLink();
  });
  document.addEventListener('focusin',ev=>{const t=linkTarget(ev.target); if(t) showTag(t,false);});
  document.addEventListener('focusout',()=>scheduleHide());
}

// ---------------------------------------------------------------- controls + init
function paintAne(){
  const btn=$('ane'); if(!btn||!R.m)return;
  const t=E.aneToggle(R.m,sides.map(s=>s.chip),S.prec,S.L);
  if(S.ane&&!t.ok)S.ane=false;
  const on=!!(S.ane&&t.ok);
  btn.classList.toggle('on',on);
  btn.classList.toggle('off',!t.ok);
  btn.setAttribute('aria-disabled',t.ok?'false':'true');
  const tip=t.ok?(on?'On. Feed-forward and the LM head use the Neural Engine. Attention is the GPU fallback. Tokens per second stay on the unified-memory bandwidth roofline.':'Off. Turn on to mark Neural Engine steps. Tokens per second do not change: same unified memory.'):t.reason;
  btn.dataset.tip=tip;
  btn.setAttribute('aria-label','Run on Neural Engine. '+tip);
}
function fillSelect(el,items,val){el.innerHTML=items.map(i=>'<option value="'+i[0]+'">'+esc(i[1])+'</option>').join('');el.value=val;}
function syncControls(){
  $('model').value=S.model;$('chipA').value=S.A;$('chipB').value=S.B;$('prec').value=S.prec;$('tp').value=String(S.tp);$('spd').value=String(S.spd);
  $('batch').value=BATCHES.indexOf(S.B_);$('ctx').value=CTXS.indexOf(S.L);
  $('phase').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.v===S.phase));
}
function applyHash(){
  S=E.decodeState(location.hash,CHIPS,MODELS);
  ASSUME=Object.assign({},E.DEFAULT_ASSUME,S.assume||{});
  syncControls();
}
function init(data){
  const cd=data.chips,md=data.models;
  SOURCES=cd.sources||{};TAGS=cd.tagLegend||{};
  const aliases=Object.assign({},cd.aliases||{});
  for(const raw of cd.chips){if(raw.aliasOf)aliases[raw.id]=raw.aliasOf;else if(aliases[raw.id])raw.aliasOf=aliases[raw.id];}
  CHIPS=cd.chips.map(E.flattenChip);MODELS=md.models;ANE_OUT=md.aneOutside||[];
  const menu=CHIPS.filter(c=>!c.aliasOf);
  sides=[mkSide('A'),mkSide('B')];
  fillSelect($('model'),MODELS.map(m=>[m.id,m.name]),'');
  fillSelect($('chipA'),menu.map(c=>[c.id,chipMenuLabel(c)]),'');
  fillSelect($('chipB'),menu.map(c=>[c.id,chipMenuLabel(c)]),'');
  fillSelect($('prec'),Object.keys(PRECS).map(k=>[k,PRECS[k].label.replace(' (weight-only)',' (W-only)')]),'');
  applyHash();
  const ch=(id,fn)=>$(id).addEventListener('change',e=>{fn(e.target.value);recompute();});
  ch('model',v=>{S.model=v;});
  ch('chipA',v=>{S.A=v;S.effA=null;});ch('chipB',v=>{S.B=v;S.effB=null;});
  ch('prec',v=>{S.prec=v;});ch('tp',v=>{S.tp=+v;});ch('spd',v=>{S.spd=+v;});
  $('batch').oninput=e=>{S.B_=BATCHES[+e.target.value];recompute();};
  $('ctx').oninput=e=>{S.L=CTXS[+e.target.value];recompute();};
  $('phase').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.phase=b.dataset.v;
    if(S.phase==='prefill'&&CTXS.indexOf(S.L)>5)S.L=CTXS[4];syncControls();recompute();});
  $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';$('play').classList.toggle('paused',!playing);};
  $('ane').onclick=()=>{const t=E.aneToggle(R.m,sides.map(s=>s.chip),S.prec,S.L);if(!t.ok)return;S.ane=!S.ane;recompute();};
  $('assumeBtn').onclick=()=>openDrawer('assume');
  $('tabAssume').onclick=()=>{drawerTab='assume';renderDrawer();};
  $('tabSpecs').onclick=()=>{drawerTab='specs';renderDrawer();};
  $('dclose').onclick=closeDrawer;$('backdrop').onclick=closeDrawer;
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(tagShown()||tagLock){clearTagLink();const a=document.activeElement;if(a&&a.closest&&a.closest('[data-link]'))a.blur();}
    closeDrawer();
  });
  $('copyBtn').onclick=()=>{writeHash();const url=location.href,done=()=>{$('copyBtn').textContent='Copied';setTimeout(()=>$('copyBtn').textContent='Copy link',1400);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,()=>{fallbackCopy(url);done();});else{fallbackCopy(url);done();}};
  window.addEventListener('hashchange',()=>{const cur=E.encodeState(S,Object.fromEntries(CHIPS.map(c=>[c.id,c])));if('#'+cur===location.hash)return;applyHash();recompute(true);if($('drawer').classList.contains('open'))renderDrawer();});
  window.addEventListener('resize',()=>{resizeAll();drawRoof();requestAnimationFrame(()=>{if(tagShown()){paintTagLink();showSrcPop(tagAnchor);}});});
  bindLinks();
  document.querySelectorAll('[title]').forEach(absorbTitle);
  armMarkers();
  document.querySelectorAll('[data-link]').forEach(b=>{if(!b.getAttribute('aria-label')&&b.dataset.tip)b.setAttribute('aria-label',b.dataset.tip);});
  $('datasrc').textContent=DATASRC;
  resizeAll();recompute(true);writeHash();
  window.__infrasim={get S(){return S;},sides,step,recompute,E,CHIPS,MODELS,get ASSUME(){return ASSUME;},openDrawer,closeDrawer,DATASRC};
  requestAnimationFrame(frame);
}
function fallbackCopy(t){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
loadData().then(init).catch(err=>{document.body.insertAdjacentHTML('afterbegin','<div id="loaderr"><b>InfraSim could not load its data.</b><br>'+esc(err.message)+'</div>');console.error(err);});
})();
