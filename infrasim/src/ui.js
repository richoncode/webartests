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
let CHIPS=[], MODELS=[], RAW={}, SOURCES={}, TAGS={}, DATASRC='';
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
function layApple(c){
  const memShort=(c.memType||'').replace('Unified ','');
  const nm=clamp(Math.round(c.bw/150),2,8), nl=Math.ceil(nm/2), nr=nm-nl, mems=[];
  const stack=(n,x)=>{const gap=4,h=(240-(n-1)*gap)/n,first=mems.length;for(let i=0;i<n;i++)mems.push({x,y:12+i*(h+gap),w:58,h,label:i===0?memShort:'',sub:i===0&&n>1?'':'',left:x<300});return first;};
  stack(nl,10); if(nr)stack(nr,552);
  const slc={x:92,y:12,w:436,h:22,label:'System Level Cache (size not published)',sub:''};
  const dies=c.dies||1, top=42, bot=258, frames=[], blocks=[], extra=[], links=[], cells=[];
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
    if(Math.random()<0.08){const t=extra[Math.floor(Math.random()*extra.length)];return {ci:-1,blk:t,pts:[{x:ex,y:cy(m)},{x:rail,y:cy(m)},{x:rail,y:23},{x:cx(t),y:23},{x:cx(t),y:cy(t)}]};}
    const i=Math.floor(Math.random()*cells.length),cell=cells[i];
    return {ci:i,pts:[{x:ex,y:cy(m)},{x:rail,y:cy(m)},{x:rail,y:23},{x:cx(cell),y:23},{x:cx(cell),y:cy(cell)}]};};
  const na=c.matrix;
  return {arch:'apple',mems,caches:[slc],cells,blocks,links,ic:null,route,extraBlk:extra,na,
    note:(na?'Inner bright square in each GPU core = Neural Accelerator (matrix unit). ':'No per-core matrix unit: matrix math runs on shader ALUs. ')+'One unified memory pool.',
    noteLong:(na?'Each GPU core has a Neural Accelerator (matrix unit), drawn as the bright inner square. ':'No per-core matrix unit: matrix math runs on the GPU shader ALUs. ')+'Unified memory: no CPU-GPU copy. The number of memory blocks drawn is scaled to bandwidth; it is not a package count. The Neural Engine is not used for LLM inference by llama.cpp/MLX, so it is drawn idle.'};
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
  p.innerHTML='<div class="ribbon" hidden>SPECULATIVE PROJECTION</div><div class="ptitle"><b></b><span></span><em class="tokc"></em></div>'+
   '<div class="pills"></div><div class="pdetail"></div><canvas class="cv"></canvas><canvas class="strip"></canvas><div class="status"><span class="st"></span><span class="ic"></span></div><div class="chipnote"></div>'+
   '<div class="stats"><div class="l"><span class="badge"></span><div class="big"></div><div class="sub s1"></div><div class="rng"><div class="rt"></div><div class="rtrack"><div class="rband"></div><div class="rmid"></div><div class="rceil"></div></div></div></div>'+
   '<div class="bars"></div></div>';
  side.root=p;side.cv=p.querySelector('canvas.cv');side.st=p.querySelector('canvas.strip');
  side.cx=side.cv.getContext('2d');side.sx=side.st.getContext('2d');
  side.pills=p.querySelector('.pills');side.pdetail=p.querySelector('.pdetail');
  side.pills.addEventListener('click',ev=>{const b=ev.target.closest('.pill');if(!b)return;const k=b.dataset.k;side.sel=side.sel===k?null:k;renderPillDetail(side);});
  return side;
}
let sides=[];
function sizeCanvas(cv,cssW,cssH){const d=window.devicePixelRatio||1;cv.style.height=cssH+'px';cv.width=Math.round(cssW*d);cv.height=Math.round(cssH*d);return d;}
function resizeAll(){
  const narrow=window.innerWidth<=900;
  for(const s of sides){const w=Math.max(200,s.cv.parentElement.clientWidth-20),hh=Math.min(w*CH/CW,narrow?260:196);s.dpr=sizeCanvas(s.cv,w,hh);s.sc=Math.min(hh/CH,w/CW);s.offx=(w-CW*s.sc)/2;s.offy=(hh-CH*s.sc)/2;sizeCanvas(s.st,w,30);s.stW=w;}
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
  s.pills.innerHTML=keys.map(k=>'<button class="pill'+(s.sel===k?' sel':'')+'" data-k="'+k+'" title="'+esc(specLabel(k,chip)+': '+specVal(k,sp[k])+' ['+sp[k].tag+'] - click for source')+'"><span class="tg '+sp[k].tag+'">'+sp[k].tag+'</span><span class="txt">'+esc(pillText(k,chip,sp[k]))+'</span></button>').join('')+
   '<button class="pill'+(s.sel==='eff'?' sel':'')+'" data-k="eff" title="Efficiency factors - click for details"><span class="tg '+eff.tag+'">'+eff.tag+'</span><span class="txt">eff '+esc(eff.v)+'</span></button>';
  s.root.querySelector('.ribbon').hidden=chip.status!=='speculative';
}
function renderPillDetail(s){
  const chip=s.chip,sp=s.sel==='eff'?effSpec(chip):chip.raw.specs[s.sel];
  s.root.querySelectorAll('.pill').forEach(b=>b.classList.toggle('sel',b.dataset.k===s.sel));
  if(!s.sel||!sp){s.pdetail.className='pdetail';s.pdetail.innerHTML='';return;}
  const label=s.sel==='eff'?'Efficiency factors (MFU prefill / MFU decode / bandwidth)':specLabel(s.sel,chip);
  s.pdetail.className='pdetail on';
  s.pdetail.innerHTML='<b>'+esc(label)+':</b> '+esc(s.sel==='eff'?sp.v:specVal(s.sel,sp))+' <span class="tg '+sp.tag+'" style="display:inline-flex">'+sp.tag+'</span> <span class="tiny">'+({V:'verified vendor source',A:'approximate / derived / third-party',U:'assumed'}[sp.tag])+'</span><br>'+esc(sp.note||'')+'<br><span class="tiny">Source: '+srcLinks(sp.src)+'</span>';
}

// ---------------------------------------------------------------- compute + DOM update
let R={};
const chipById=id=>CHIPS.find(c=>c.id===id), modelById=id=>E.deriveModel(MODELS.find(m=>m.id===id));
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
      s.root.querySelector('.ptitle span').textContent=c.caption;renderPills(s);renderPillDetail(s);const cn=s.root.querySelector('.chipnote');cn.textContent=s.layout.note||'';cn.title=s.layout.noteLong||s.layout.note||'';}
  });
  const [a,b]=sides, maxT=Math.max(...sides.flatMap(s=>[s.res.sumTc,s.res.sumTm,s.res.sumComm,s.res.total]));
  const o=opts();
  sides.forEach(s=>{
    const r=s.res,c=s.chip,rootEl=s.root;
    rootEl.classList.toggle('oomp',r.oom);
    rootEl.querySelector('.ptitle b').textContent=c.name+(r.N>1?'  x'+r.N:'');
    const bd=rootEl.querySelector('.badge');
    const cls=r.oom?'oom':r.bound;bd.className='badge '+cls;
    bd.textContent=r.oom?'OUT OF MEMORY':(r.bound==='mem'?'MEMORY-BOUND':r.bound==='comp'?'COMPUTE-BOUND':'INTERCONNECT-LIMITED')+' ('+Math.round((r.bound==='comm'?r.commShare:(r.bound==='mem'?r.memShare:1-r.memShare))*100)+'%)';
    const big=rootEl.querySelector('.big'),s1=rootEl.querySelector('.s1'),rt=rootEl.querySelector('.rt');
    const hyp=r.oom?'<small> (hypothetical)</small>':'';
    const g=s.rng;
    if(r.decode){big.innerHTML=fmtN(r.tokUser)+' <small>tok/s/user</small>'+hyp;
      s1.textContent='batch '+S.B_+': '+fmtN(r.tokAgg)+' tok/s aggregate | step '+fmtT(r.total);
      rt.textContent='range '+fmtN(g.worst)+'\u2013'+fmtN(g.best)+' tok/s | ceiling '+fmtN(s.ceil.tokUser);}
    else{big.innerHTML=fmtT(r.ttft)+' <small>to first token</small>'+hyp;
      s1.textContent='prefill '+fmtN(r.prefTput)+' tok/s | '+(S.B_*S.L).toLocaleString()+' tokens';
      rt.textContent='range '+fmtT(g.best)+'\u2013'+fmtT(g.worst)+' | ceiling '+fmtT(s.ceil.ttft);}
    // range bar on a "speed" axis (higher = faster): value / ceiling
    const sp=v=>r.decode?v:1/v, cs=sp(r.decode?s.ceil.tokUser:s.ceil.ttft);
    const xl=clamp(sp(g.worst)/cs,0,1),xh=clamp(sp(g.best)/cs,0,1),xm=clamp(sp(r.decode?r.tokUser:r.ttft)/cs,0,1);
    const rb=rootEl.querySelector('.rband'),rm=rootEl.querySelector('.rmid'),rc=rootEl.querySelector('.rceil');
    rb.style.left=(xl*100)+'%';rb.style.width=Math.max(0.5,(xh-xl)*100)+'%';rm.style.left='calc('+(xm*100)+'% - 1px)';rc.style.left='calc(100% - 1px)';
    rt.title=rootEl.querySelector('.rtrack').title='Estimate range: every efficiency factor x0.8 to x1.2 (capped at 1), shown as the blue band. White tick: central estimate. Dashed amber: peak-spec ceiling (efficiency 100%).';
    const bar=(lab,v,col,txt)=>'<div class="brow"><span class="lab">'+lab+'</span><div class="track"><div class="fill" style="width:'+(100*v/maxT).toFixed(1)+'%;background:'+col+'"></div></div><span class="num">'+txt+'</span></div>';
    const den=Math.max(r.capGB,r.weightGB+r.kvGB), wp=100*r.weightGB/den, kp=100*r.kvGB/den, mk=100*r.usableGB/den;
    rootEl.querySelector('.bars').innerHTML=
      bar('compute',r.sumTc,'var(--comp)',fmtT(r.sumTc))+bar('memory',r.sumTm,'var(--mem)',fmtT(r.sumTm))+
      (r.N>1?bar('comm',r.sumComm,'var(--comm)',fmtT(r.sumComm)):'')+
      '<div class="capwrap"><div class="captrack'+(r.oom?' bad':'')+'"><div class="fill" style="width:'+wp.toFixed(1)+'%;background:#3b82f6"></div><div class="fill" style="width:'+kp.toFixed(2)+'%;background:#22d3ee"></div>'+
      '<div style="position:absolute;left:'+mk.toFixed(1)+'%;top:0;bottom:0;border-left:2px dashed #94a3b8"></div></div>'+
      '<div class="cap-txt'+(r.oom?' bad':'')+'">'+(r.oom?'DOES NOT FIT: ':'fits: ')+'weights '+r.weightGB.toFixed(1)+' GB + KV '+r.kvGB.toFixed(2)+' GB vs '+r.usableGB.toFixed(0)+' GB usable of '+r.capGB+' GB</div></div>';
  });
  // verdict
  const warn=[];
  if(S.tp>1&&sides.some(s=>s.chip.maxTP===1))warn.push('Apple chips have no multi-chip link in this model, so they run as 1 chip.');
  if(S.prec==='fp8'&&sides.some(s=>!s.chip.fp8))warn.push('Apple GPUs have no native FP8 math: 8-bit weights, 16-bit compute.');
  if(S.prec==='int4')warn.push('INT4 is weight-only (dequantize to FP16 for math).');
  if(S.L>R.m.maxPos)warn.push('Context exceeds the base model\'s trained length ('+R.m.maxPos.toLocaleString()+'); capacity math still applies.');
  const mx=sides.map(s=>s.chip.matrix);
  if(sides.some(s=>s.chip.arch==='apple')&&(mx[0]!==mx[1]||sides.every(s=>s.chip.matrix)))
    warn.push('M5-generation GPU cores each have a Neural Accelerator (matrix unit): it raises compute-bound prefill, while decode stays set by memory bandwidth. Apple publishes only relative AI-compute gains, so these chips\' TFLOPS are third-party-derived (tag A).');
  if(sides.every(s=>s.chip.arch==='apple')&&sides[0].chip.matrix!==sides[1].chip.matrix)
    warn.push('Apple efficiency factors for M4/M3 chips were fitted to a 2023 llama.cpp build and the M5-generation ones to a 2026 build, so decode gaps between the generations are somewhat inflated.');
  $('vtxt').innerHTML='<p class="why">'+E.explain(a.res,b.res,a.chip,b.chip,o)+'</p>'+
    '<p class="sub">Model '+R.m.name+': '+(R.m.total/1e9).toFixed(1)+'B params ('+(R.m.active/1e9).toFixed(1)+'B active/token), KV cache '+(R.m.kvPerTok*PRECS[S.prec].kv/1024).toFixed(0)+' KB/token.</p>'+
    '<p class="sub">Arithmetic intensity this phase: A '+fmtN(a.res.AI)+' | B '+fmtN(b.res.AI)+' FLOP/byte. Ridge point: A '+fmtN(a.res.ridge)+' | B '+fmtN(b.res.ridge)+' FLOP/byte.</p>'+
    warn.map(w=>'<p class="sub" style="color:#fbbf24">Note: '+w+'</p>').join('');
  $('bval').textContent=S.B_;$('lval').textContent=S.L.toLocaleString()+' tok';
  $('llabel').textContent=S.phase==='decode'?'Context so far':'Prompt length';
  const tmax=Math.max(a.res.total,b.res.total);
  const sl=WALL/tmax; $('slowmo').textContent='animation '+(sl>=1?'slowed ~'+Math.round(sl).toLocaleString()+'x':'sped up ~'+Math.round(1/sl).toLocaleString()+'x')+'; relative speeds are to scale';
  cyc=0;a.prog=b.prog=0;a.done=b.done=false;a.steps=b.steps=0;
  drawRoof();
  if(!noHash)writeHash();
  if($('drawer').classList.contains('open'))renderSens();
}

// ---------------------------------------------------------------- drawing
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// draw text centered/left-aligned; shrink to fit maxW, skip if it cannot fit above minPx (in screen px)
function txt(ctx,str,x,y,maxW,sc,align){
  if(!str)return;const base=Math.max(9.5,8.5/Math.max(sc,0.3));let fs=base;
  ctx.font=fs+'px system-ui,sans-serif';let w=ctx.measureText(str).width;
  if(w>maxW){fs=fs*maxW/w;if(fs*sc<6.2)return;ctx.font=fs+'px system-ui,sans-serif';}
  ctx.textAlign=align||'center';ctx.fillText(str,x,y);
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
    ctx.fillStyle='#a5f3fc';txt(ctx,k.label,k.x+k.w/2,k.y+k.h/2-(k.sub?5:0),k.w-4,sc);if(k.sub){ctx.fillStyle='#5aa8b5';txt(ctx,k.sub,k.x+k.w/2,k.y+k.h/2+8,k.w-4,sc);}}
  // die links (Fusion / UltraFusion)
  for(const k of (L.links||[])){
    if(k.pill){ctx.fillStyle='#0d1424';ctx.strokeStyle='rgba(244,114,182,.7)';rr(ctx,k.x,k.y,k.w,k.h,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fbcfe8';txt(ctx,k.label,k.x+k.w/2,k.y+k.h/2+0.5,k.w-6,sc);continue;}
    ctx.fillStyle='rgba(244,114,182,'+(0.12+0.18*mu)+')';ctx.strokeStyle='rgba(244,114,182,.55)';rr(ctx,k.x,k.y,k.w,k.h,3);ctx.fill();ctx.stroke();
    if(k.label&&k.vert){ctx.save();ctx.translate(k.x+k.w/2,k.y+k.h/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#fbcfe8';txt(ctx,k.label,0,0.5,k.h-6,sc);ctx.restore();}}
  // extra blocks
  for(const b of (L.extraBlk||[])){ctx.fillStyle='#141c2e';ctx.strokeStyle='#2c3a57';rr(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();ctx.stroke();ctx.fillStyle='#7f8fae';txt(ctx,b.label,b.x+b.w/2,b.y+b.h/2,b.w-4,sc);
    if(b.flash>0.02){ctx.fillStyle='rgba(52,211,153,'+b.flash*0.4+')';rr(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();}b.flash=(b.flash||0)*0.92;}
  // interconnect
  const commGlow=clamp(sg.t>0?sg.comm/sg.t:0,0,1);
  if(L.ic){const b=L.ic;ctx.fillStyle='rgba(244,114,182,'+(0.07+0.5*commGlow)+')';ctx.strokeStyle='rgba(244,114,182,'+(0.4+0.5*commGlow)+')';rr(ctx,b.x,b.y,b.w,b.h,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fbcfe8';txt(ctx,b.label,b.x+b.w/2,b.y+b.h/2-6,b.w-4,sc);ctx.fillStyle='#b9769b';txt(ctx,b.sub,b.x+b.w/2,b.y+b.h/2+8,b.w-4,sc);
    if(L.arch==='tpu'){ctx.strokeStyle='rgba(244,114,182,.6)';[[560,60,560,38],[560,190,560,212],[512,125,492,125],[608,125,616,125]].forEach(l=>{ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();});}}
  // compute cells
  const act=s.done?0.03:Math.max(0.04,cu);
  const col=(()=>{const t=clamp((act-0.12)/0.6,0,1);return [lerp(251,52,t),lerp(191,211,t),lerp(36,153,t)].map(Math.round);})();
  const wavespeed=2+7*act;
  L.cells.forEach((cl,i)=>{
    let b;
    if(L.tpu){const wv=0.5+0.5*Math.sin((cl.r+cl.c)*0.9-tm*wavespeed);b=0.10+0.9*act*wv;}
    else b=0.10+0.9*act*(0.55+0.45*Math.sin(tm*(2.5+7*act)+s.ph[i]));
    b=clamp(b+s.flash[i]*0.6,0,1)*oomDim;
    s.flash[i]*=0.9;
    ctx.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+b.toFixed(3)+')';
    ctx.fillRect(cl.x,cl.y,cl.w,cl.h);
    if(L.na&&cl.w>=6&&cl.h>=6){ // Neural Accelerator: inner matrix-unit square, lights up only when matrix work is the limiter
      const ix=cl.w*0.24,iy=cl.h*0.24,nb=clamp(0.12+0.95*act*(0.6+0.4*Math.sin(tm*(3+8*act)+s.ph[i]*1.7)),0,1)*oomDim;
      ctx.fillStyle='rgba(224,247,255,'+nb.toFixed(3)+')';ctx.fillRect(cl.x+ix,cl.y+iy,cl.w-2*ix,cl.h-2*iy);
      ctx.strokeStyle='rgba(165,243,252,0.55)';ctx.lineWidth=0.6;ctx.strokeRect(cl.x+ix,cl.y+iy,cl.w-2*ix,cl.h-2*iy);}
    if(act<0.5&&!s.done){ctx.strokeStyle='rgba(251,191,36,'+(0.18+0.12*Math.sin(tm*4+i))+')';ctx.lineWidth=0.5;ctx.strokeRect(cl.x,cl.y,cl.w,cl.h);}
  });
  // particles
  for(const p of s.parts){
    const f=p.d/p.total;let rem=p.d,seg=0;while(seg<p.lens.length-1&&rem>p.lens[seg]){rem-=p.lens[seg];seg++;}
    const a=p.pts[seg],bb=p.pts[seg+1],t=p.lens[seg]?clamp(rem/p.lens[seg],0,1):1,x=lerp(a.x,bb.x,t),y=lerp(a.y,bb.y,t);
    ctx.fillStyle=f<0.28?'rgba(251,191,36,.95)':(f<0.62?'rgba(103,232,249,.95)':'rgba(190,255,225,.95)');
    ctx.globalAlpha=r.oom?0.45:1;ctx.beginPath();ctx.arc(x,y,1.7/Math.max(0.6,sc*1.2)+0.6,0,6.283);ctx.fill();ctx.globalAlpha=1;
  }
  // HTML status line (readable at any size)
  let msg,mc;
  if(r.oom){msg='X OOM: weights + KV do not fit, would not run';mc='#fca5a5';}
  else if(s.done){msg='done in '+fmtT(r.total)+' - waiting for the other chip';mc='#8493ab';}
  else if(sg.tm>=sg.tc){const stall=Math.round((1-cu)*100);msg=((tm*2.2)%2<1.3?'STALL ':'')+c.unitName+'s idle ~'+stall+'% waiting on memory | memory busy 100%';mc='#fbbf24';}
  else {msg='COMPUTE-BOUND: '+c.unitName+'s ~'+Math.round(cu*100)+'% busy | memory busy '+Math.round(mu*100)+'% (headroom)';mc='#34d399';}
  const stEl=s.root.querySelector('.st'),icEl=s.root.querySelector('.status .ic');
  if(stEl._m!==msg){stEl._m=msg;stEl.textContent=msg;stEl.style.color=mc;}
  const icm=(c.ic?c.icName+' '+c.ic+' GB/s':'no multi-chip link modeled')+(commGlow>0.05?'  '+Math.round(commGlow*100)+'% of step':'');
  if(icEl._m!==icm){icEl._m=icm;icEl.textContent=icm;icEl.style.color=commGlow>0.05?'#f472b6':'';}
  drawStrip(s,cur,tm);
}
function drawStrip(s,cur,tm){
  const ctx=s.sx,W=s.stW,H=30,r=s.res,d=s.sx.canvas.width/W;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,W,H);
  const n=r.n,x0=64,bw=(W-x0-30)/n;
  ctx.font='10px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#8493ab';
  ctx.fillText(s.done?'layers done':(cur.part==='head'?'LM head':'layer '+(cur.layer+1)+'/'+n),2,9);
  ctx.fillStyle='#5b6b86';ctx.fillText(s.done?'':(cur.part==='head'?'':cur.part==='attn'?'attention':'MLP'),2,22);
  const cA=r.segA.bound==='mem'?'251,191,36':'52,211,153',cM=r.segM.bound==='mem'?'251,191,36':'52,211,153',cH=r.segH.bound==='mem'?'251,191,36':'52,211,153';
  for(let i=0;i<n;i++){
    const past=s.done||i<cur.layer||cur.part==='head',now=!s.done&&i===cur.layer&&cur.part!=='head';
    const x=x0+i*bw;
    ctx.fillStyle='rgba('+cA+','+(past?0.95:(now&&cur.part==='attn'?1:0.28))+')';ctx.fillRect(x,3,Math.max(1,bw-1),11);
    ctx.fillStyle='rgba('+cM+','+(past?0.95:(now&&cur.part==='mlp'?1:0.28))+')';ctx.fillRect(x,16,Math.max(1,bw-1),11);
    if(now){ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.strokeRect(x-0.5,1.5,bw+0.5,26);}
  }
  const xh=x0+n*bw+3;ctx.fillStyle='rgba('+cH+','+((s.done||cur.part==='head')?1:0.28)+')';ctx.fillRect(xh,3,20,24);
  ctx.fillStyle='#0a0e16';ctx.textAlign='center';ctx.fillText('LM',xh+10,15);
}
function drawRoof(){
  const cv=$('roof'),ctx=cv.getContext('2d'),d=cv.width/(cv.clientWidth||1),W=cv.clientWidth,H=cv.clientHeight;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,W,H);
  const ml=38,mr=8,mt=8,mb=24,x0=Math.log10(0.5),x1=Math.log10(30000),y0=Math.log10(0.5),y1=Math.log10(4000);
  const X=v=>ml+(Math.log10(v)-x0)/(x1-x0)*(W-ml-mr),Y=v=>H-mb-(Math.log10(v)-y0)/(y1-y0)*(H-mt-mb);
  ctx.font='9.5px system-ui,sans-serif';ctx.textBaseline='middle';ctx.strokeStyle='#1b2539';ctx.lineWidth=1;
  for(let e=0;e<=4;e++){const v=Math.pow(10,e);ctx.beginPath();ctx.moveTo(X(Math.max(v,0.5)),mt);ctx.lineTo(X(Math.max(v,0.5)),H-mb);ctx.stroke();ctx.fillStyle='#6b7a96';ctx.textAlign='center';ctx.fillText(v>=1000?(v/1000)+'k':v,X(v),H-mb+9);}
  for(let e=0;e<=3;e++){const v=Math.pow(10,e);ctx.beginPath();ctx.moveTo(ml,Y(v));ctx.lineTo(W-mr,Y(v));ctx.stroke();ctx.fillStyle='#6b7a96';ctx.textAlign='right';ctx.fillText(v>=1000?(v/1000)+'k':v,ml-4,Y(v));}
  ctx.fillStyle='#6b7a96';ctx.textAlign='center';ctx.fillText('arithmetic intensity (FLOP/byte)',(W+ml)/2,H-4);
  ctx.save();ctx.translate(9,(H-mb+mt)/2);ctx.rotate(-Math.PI/2);ctx.fillText('TFLOPS',0,0);ctx.restore();
  sides.forEach(s=>{
    const c=s.chip,pk=s.res.peakTF,bw=c.bw/1000;
    ctx.strokeStyle=s.color;ctx.lineWidth=1.8;ctx.beginPath();let first=true;
    for(let i=0;i<=80;i++){const ai=Math.pow(10,lerp(x0,x1,i/80)),y=Math.min(pk,bw*ai);if(y<0.5)continue;const px=X(ai),py=Y(y);if(first){ctx.moveTo(px,py);first=false;}else ctx.lineTo(px,py);}ctx.stroke();
    const rx=X(s.res.ridge);ctx.setLineDash([3,3]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rx,Y(pk));ctx.lineTo(rx,H-mb);ctx.stroke();ctx.setLineDash([]);
    const ox=X(clamp(s.res.AI,0.5,30000)),oy=Y(clamp(s.res.achTF,0.5,4000));
    ctx.fillStyle=s.res.oom?'#7f1d1d':s.color;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ox,oy,6,0,6.283);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 9px system-ui';ctx.fillText(s.key,ox,oy+0.5);ctx.font='9.5px system-ui,sans-serif';
  });
  ctx.fillStyle='#8493ab';ctx.textAlign='left';ctx.fillText(W<340?'solid: roof | dashed: ridge | dot: workload':'solid: chip roof (peak spec) | dashed: ridge | dot: this workload',ml+4,mt+4);
}

// ---------------------------------------------------------------- animation loop
function spawn(s,n){
  for(let i=0;i<n&&s.parts.length<700;i++){
    const rt=s.layout.route();const pts=rt.pts,lens=[];let tot=0;
    for(let k=0;k<pts.length-1;k++){const l=Math.hypot(pts[k+1].x-pts[k].x,pts[k+1].y-pts[k].y);lens.push(l);tot+=l;}
    s.parts.push({pts,lens,total:tot,d:-Math.random()*8,ci:rt.ci,blk:rt.blk,v:170+Math.random()*30});
  }
}
let last=performance.now(),clock=0,cyc=0,playing=true;
function step(dt){
  clock+=dt;
  const tmax=Math.max(sides[0].res.total,sides[1].res.total),decode=S.phase==='decode';
  if(playing){
    cyc+=dt*S.spd/WALL;
    if(cyc>=(decode?1:1.15))cyc=0;
    for(const s of sides){
      const x=cyc*tmax/s.res.total;
      if(decode){s.steps=Math.floor(x);s.prog=x-Math.floor(x);s.done=false;}
      else{s.prog=Math.min(1,x);s.done=x>=1;s.steps=s.done?1:0;}
    }
  }
  for(const s of sides){
    if(!playing)continue;
    const cur=curSeg(s),sg=cur.seg,core=Math.max(sg.tc,sg.tm)||1e-12,mu=s.done?0:clamp(sg.tm/core,0,1);
    const bwUsed=s.chip.bw*s.chip.eff.bw*mu*(s.res.N);
    const frac=s.done?0:clamp(0.06+0.94*Math.pow(bwUsed/5400,0.75),0,1)*(s.res.oom?0.6:1);
    s.acc+=dt*S.spd*210*frac;const k=Math.floor(s.acc);s.acc-=k;if(k>0)spawn(s,k);
    for(const p of s.parts){p.d+=p.v*dt*S.spd;if(p.d>=p.total&&!p.hit){p.hit=true;if(p.ci>=0)s.flash[p.ci]=1;else if(p.blk)p.blk.flash=1;}}
    s.parts=s.parts.filter(p=>p.d<p.total);
  }
  for(const s of sides){const el=s.root.querySelector('.tokc'),t=decode?'tokens in window: '+(s.steps||0):'';if(el.textContent!==t)el.textContent=t;el.style.display=t?'':'none';}
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
  if(drawerTab==='specs'){body.innerHTML=specsHTML();return;}
  let h='<div class="dnote">Everything below is an <b>assumption or a fitted factor</b>, not a measurement. Move a slider to see how sensitive the result is; the link in your address bar updates so you can share the exact settings.</div>';
  h+='<h4>Formulas (exactly as implemented)</h4><pre class="formulas">'+esc(FORMULAS)+'</pre>';
  h+='<h4>Global factors</h4>';
  for(const k of Object.keys(E.ASSUME_META)){const m=E.ASSUME_META[k];h+=sliderRow('g_'+k,m.label,m.min,m.max,m.step,ASSUME[k],m.fmt,ASSUME[k]!==E.DEFAULT_ASSUME[k],m.tag)+'<div class="shelp">'+esc(m.help)+' Default '+m.fmt(E.DEFAULT_ASSUME[k])+'.</div>';}
  for(const side of ['A','B']){
    const c=chipById(S[side]),e=effNow(side),d=c.eff,raw=c.raw.eff;
    h+='<h4><span class="dot" style="background:'+(side==='A'?'var(--A)':'var(--B)')+'"></span>Chip '+side+': '+esc(c.name)+' efficiency</h4>';
    for(const [k,lab] of [['mfuP','MFU prefill'],['mfuD','MFU decode'],['bw','Bandwidth eff.']])
      h+=sliderRow('e'+side+'_'+k,lab,0.05,1,0.01,e[k],v=>v.toFixed(2),Math.abs(e[k]-d[k])>1e-9,raw[k].tag)+'<div class="shelp">Default '+d[k].toFixed(2)+' ['+raw[k].tag+']: '+esc(raw[k].note||'')+'</div>';
    h+='<button class="hbtn" data-reset="'+side+'">Reset chip '+side+' to defaults</button>';
  }
  h+='<p><button class="hbtn" id="resetAll">Reset all assumptions</button></p>';
  h+='<h4>Sensitivity of the headline number (+/-20% on one factor)</h4><div id="sensBox"></div>';
  body.innerHTML=h;
  body.querySelectorAll('input[type=range]').forEach(inp=>inp.addEventListener('input',onSlider));
  body.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>{S['eff'+b.dataset.reset]=null;recompute();renderDrawer();});
  $('resetAll').onclick=()=>{S.effA=S.effB=null;ASSUME=Object.assign({},E.DEFAULT_ASSUME);S.assume=null;recompute();renderDrawer();};
  renderSens();
}
function sliderRow(id,label,min,max,step,val,fmt,chg,tag){
  return '<div class="srow'+(chg?' chg':'')+'"><span title="tag '+tag+'"><span class="tg '+tag+'" style="width:13px;height:13px;font-size:8px;vertical-align:-2px">'+tag+'</span> '+esc(label)+'</span><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-label="'+esc(label)+'"><span class="sv" id="'+id+'_v">'+fmt(val)+'</span></div>';
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
  let h='<div class="legend"><span><span class="tg V">V</span> verified: vendor-published</span><span><span class="tg A">A</span> approximate / derived / third-party</span><span><span class="tg U">U</span> assumed</span></div>';
  h+='<div class="dnote">Data source: '+esc(DATASRC)+'. Apple never publishes GPU TFLOPS, so those rows are never tagged V. No chip in this data set is a speculative projection: M6 and M5 Ultra were announced by Apple on 2026-08-25 (the app supports a "speculative" status and ribbon for future unannounced chips).</div>';
  for(const s of sides){
    const c=s.chip;
    h+='<h4><span class="dot" style="background:'+(s.key==='A'?'var(--A)':'var(--B)')+'"></span>Chip '+s.key+': '+esc(c.name)+(c.status==='speculative'?' <b style="color:#f87171">[SPECULATIVE PROJECTION]</b>':'')+'</h4><table class="spectbl">';
    const keys=SPEC_ORDER.concat(['maxTP']).filter(k=>c.raw.specs[k]);
    for(const k of keys){const sp=c.raw.specs[k];h+='<tr><td>'+esc(specLabel(k,c))+'</td><td><span class="tg '+sp.tag+'">'+sp.tag+'</span> <b>'+esc(specVal(k,sp))+'</b><br>'+esc(sp.note||'')+'<br><span class="tiny">'+srcLinks(sp.src)+'</span></td></tr>';}
    for(const [k,lab] of [['mfuP','MFU prefill'],['mfuD','MFU decode'],['bw','Bandwidth efficiency']]){const sp=c.raw.eff[k];h+='<tr><td>'+lab+'</td><td><span class="tg '+sp.tag+'">'+sp.tag+'</span> <b>'+sp.v+'</b><br>'+esc(sp.note||'')+'<br><span class="tiny">'+srcLinks(sp.src)+'</span></td></tr>';}
    if(c.notes)h+='<tr><td>Notes</td><td>'+esc(c.notes)+'</td></tr>';
    h+='</table>';
  }
  return h;
}

// ---------------------------------------------------------------- controls + init
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
  CHIPS=cd.chips.map(E.flattenChip);MODELS=md.models;
  sides=[mkSide('A'),mkSide('B')];
  fillSelect($('model'),MODELS.map(m=>[m.id,m.name]),'');
  fillSelect($('chipA'),CHIPS.map(c=>[c.id,c.vendor+' '+c.short+(c.status==='speculative'?' (speculative)':'')]),'');
  fillSelect($('chipB'),CHIPS.map(c=>[c.id,c.vendor+' '+c.short+(c.status==='speculative'?' (speculative)':'')]),'');
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
  $('assumeBtn').onclick=()=>openDrawer('assume');
  $('tabAssume').onclick=()=>{drawerTab='assume';renderDrawer();};
  $('tabSpecs').onclick=()=>{drawerTab='specs';renderDrawer();};
  $('dclose').onclick=closeDrawer;$('backdrop').onclick=closeDrawer;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
  $('copyBtn').onclick=()=>{writeHash();const url=location.href,done=()=>{$('copyBtn').textContent='Copied';setTimeout(()=>$('copyBtn').textContent='Copy link',1400);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,()=>{fallbackCopy(url);done();});else{fallbackCopy(url);done();}};
  window.addEventListener('hashchange',()=>{const cur=E.encodeState(S,Object.fromEntries(CHIPS.map(c=>[c.id,c])));if('#'+cur===location.hash)return;applyHash();recompute(true);if($('drawer').classList.contains('open'))renderDrawer();});
  window.addEventListener('resize',()=>{resizeAll();drawRoof();});
  $('datasrc').textContent=DATASRC;
  resizeAll();recompute(true);writeHash();
  window.__infrasim={get S(){return S;},sides,step,recompute,E,CHIPS,MODELS,get ASSUME(){return ASSUME;},openDrawer,closeDrawer,DATASRC};
  requestAnimationFrame(frame);
}
function fallbackCopy(t){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
loadData().then(init).catch(err=>{document.body.insertAdjacentHTML('afterbegin','<div id="loaderr"><b>InfraSim could not load its data.</b><br>'+esc(err.message)+'</div>');console.error(err);});
})();
