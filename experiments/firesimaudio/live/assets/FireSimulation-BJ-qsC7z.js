import{$ as e,$n as t,$r as n,$t as r,A as i,At as a,B as o,Bn as s,Br as c,C as l,Cn as u,Cr as d,Ct as f,D as p,Dn as m,Dr as h,Dt as g,E as _,Er as v,Et as y,F as b,Fn as x,G as S,Gn as ee,Gt as te,H as ne,Hn as re,Hr as ie,Ht as ae,In as oe,It as se,J as ce,Jn as le,Jt as ue,K as de,Kn as fe,Kt as pe,Ln as me,Lr as he,Lt as ge,Mn as _e,Mr as ve,Mt as ye,N as be,Nn as xe,O as Se,Or as Ce,Ot as we,Pn as Te,Pr as Ee,Q as De,Qn as Oe,Qr as ke,R as Ae,Rn as je,Rr as Me,S as Ne,Sn as Pe,Sr as Fe,St as Ie,T as Le,Tn as Re,Tr as ze,Tt as Be,Un as Ve,Ur as He,V as Ue,Vn as We,Vr as Ge,Vt as Ke,Wn as qe,Wr as Je,Wt as Ye,X as Xe,Xn as Ze,Xr as Qe,Xt as $e,Y as et,Yn as tt,Yt as nt,Z as rt,Zn as it,Zr as at,_ as ot,_i as st,_n as ct,_t as lt,a as ut,ai as dt,an as ft,ar as pt,at as mt,b as ht,bi as gt,br as _t,bt as vt,c as yt,ci as bt,cn as xt,cr as St,ct as Ct,d as wt,di as Tt,dn as Et,dt as Dt,ei as Ot,en as kt,et as At,f as jt,fi as Mt,fn as Nt,ft as Pt,g as Ft,gi as It,gn as Lt,gr as Rt,gt as zt,h as Bt,hi as Vt,hn as Ht,hr as Ut,ht as Wt,i as Gt,in as Kt,ir as qt,it as Jt,j as Yt,jn as Xt,jr as Zt,jt as Qt,k as $t,kn as en,kr as tn,l as nn,ln as rn,lr as an,lt as on,m as sn,mi as C,mn as cn,mr as ln,n as un,ni as dn,nn as fn,nr as pn,nt as mn,oi as hn,on as gn,or as _n,ot as vn,p as yn,pi as bn,pn as xn,pr as Sn,q as Cn,qn as wn,qr as Tn,qt as En,r as Dn,rn as On,rr as kn,rt as An,s as jn,si as w,sn as Mn,sr as Nn,st as Pn,ti as Fn,tn as In,tt as Ln,u as Rn,ui as zn,un as Bn,ur as Vn,v as Hn,vi as T,vr as Un,vt as Wn,w as Gn,wn as Kn,wr as qn,x as Jn,xn as Yn,xr as Xn,y as Zn,yi as Qn,yn as $n,yr as er,yt as tr,z as nr,zn as rr,zr as ir,zt as ar}from"./GpuProfiler-Cxt4H1pu.js";var or=`alphaMap.alphaTest.anisotropy.anisotropyMap.anisotropyRotation.aoMap.aoMapIntensity.attenuationColor.attenuationDistance.bumpMap.clearcoat.clearcoatMap.clearcoatNormalMap.clearcoatNormalScale.clearcoatRoughness.color.dispersion.displacementMap.emissive.emissiveIntensity.emissiveMap.envMap.envMapIntensity.envMapRotation.gradientMap.ior.iridescence.iridescenceIOR.iridescenceMap.iridescenceThicknessMap.lightMap.lightMapIntensity.map.matcap.metalness.metalnessMap.normalMap.normalScale.opacity.roughness.roughnessMap.sheen.sheenColor.sheenColorMap.sheenRoughnessMap.shininess.specular.specularColor.specularColorMap.specularIntensity.specularIntensityMap.specularMap.thickness.transmission.transmissionMap`.split(`.`),sr=new WeakMap,cr=new WeakMap,lr=new WeakMap,ur=class{constructor(e){this.renderObjects=new WeakMap,this.hasNode=this.containsNode(e),this.hasAnimation=e.object.isSkinnedMesh===!0,this.refreshUniforms=or,this.renderId=0}firstInitialization(e){return this.renderObjects.has(e)===!1&&(this.getRenderObjectData(e),!0)}needsVelocity(e){let t=e.getMRT();return t!==null&&t.has(`velocity`)}getRenderObjectData(e){let t=this.renderObjects.get(e);if(t===void 0){let{geometry:n,object:r}=e;if(t={geometryId:n.id,worldMatrix:r.matrixWorld.clone()},r.center&&(t.center=r.center.clone()),r.morphTargetInfluences&&(t.morphTargetInfluences=r.morphTargetInfluences.slice()),e.bundle!==null&&(t.version=e.bundle.version),e.material.transmission>0){let{width:n,height:r}=e.context;t.bufferWidth=n,t.bufferHeight=r}let{environmentIntensity:i,environmentRotation:a}=e.scene;t.environmentIntensity=i,t.environmentRotation=a.clone(),t.lights=this.getLightsData(e.lightsNode.getLights(),[]),this.renderObjects.set(e,t)}return t}getAttributesData(e){let t={};for(let n in e){let r=e[n];t[n]={id:r.isInterleavedBufferAttribute?r.data.uuid:r.id,version:r.isInterleavedBufferAttribute?r.data.version:r.version}}return t}containsNode(e){let t=e.material;for(let e in t)if(t[e]&&t[e].isNode)return!0;return!!(e.context.modelViewMatrix||e.context.modelNormalViewMatrix||e.context.getAO||e.context.getShadow)}getGeometryData(e){let t=lr.get(e);return t===void 0&&(t={_renderId:-1,_equal:!1,attributes:this.getAttributesData(e.attributes),indexId:e.index?e.index.id:null,indexVersion:e.index?e.index.version:null,drawRange:{start:e.drawRange.start,count:e.drawRange.count}},lr.set(e,t)),t}getMaterialData(e){let t=cr.get(e);if(t===void 0){t={_renderId:-1,_equal:!1};for(let n of this.refreshUniforms){let r=e[n];r!=null&&(typeof r==`object`&&r.clone!==void 0?r.isTexture===!0?t[n]={id:r.id,version:0}:t[n]=r.clone():t[n]=r)}cr.set(e,t)}return t}equals(e,t,n){let{object:r,material:i,geometry:a}=e,o=this.getRenderObjectData(e);if(o.worldMatrix.equals(r.matrixWorld)!==!0)return o.worldMatrix.copy(r.matrixWorld),!1;let s=this.getMaterialData(e.material);if(s._renderId!==n){s._renderId=n;for(let e in s){let t=s[e],n=i[e];if(e!==`_renderId`&&e!==`_equal`){if(t.equals!==void 0){if(t.equals(n)===!1)return t.copy(n),s._equal=!1,!1}else if(n.isTexture===!0){if(t.id!==n.id||t.version!==n.version)return t.id=n.id,t.version=n.version,s._equal=!1,!1}else if(t!==n)return s[e]=n,s._equal=!1,!1}}if(s.transmission>0){let{width:t,height:n}=e.context;if(o.bufferWidth!==t||o.bufferHeight!==n)return o.bufferWidth=t,o.bufferHeight=n,s._equal=!1,!1}s._equal=!0}else if(s._equal===!1)return!1;if(o.geometryId!==a.id)return o.geometryId=a.id,!1;let c=this.getGeometryData(e.geometry);if(c._renderId!==n){c._renderId=n;let e=a.attributes,t=c.attributes,r=0,i=0;for(let t in e)r++;for(let n in t){i++;let r=t[n],a=e[n];if(a===void 0)return delete t[n],c._equal=!1,!1;let o=a.isInterleavedBufferAttribute?a.data.uuid:a.id,s=a.isInterleavedBufferAttribute?a.data.version:a.version;if(r.id!==o||r.version!==s)return r.id=o,r.version=s,c._equal=!1,!1}if(i!==r)return c.attributes=this.getAttributesData(e),c._equal=!1,!1;let o=a.index,s=c.indexId,l=c.indexVersion,u=o?o.id:null,d=o?o.version:null;if(s!==u||l!==d)return c.indexId=u,c.indexVersion=d,c._equal=!1,!1;if(c.drawRange.start!==a.drawRange.start||c.drawRange.count!==a.drawRange.count)return c.drawRange.start=a.drawRange.start,c.drawRange.count=a.drawRange.count,c._equal=!1,!1;c._equal=!0}else if(c._equal===!1)return!1;if(o.morphTargetInfluences){let e=!1;for(let t=0;t<o.morphTargetInfluences.length;t++)o.morphTargetInfluences[t]!==r.morphTargetInfluences[t]&&(o.morphTargetInfluences[t]=r.morphTargetInfluences[t],e=!0);if(e)return!1}if(o.lights){for(let e=0;e<t.length;e++)if(o.lights[e].map!==t[e].map)return!1}let l=e.scene;return l.environment!==null&&i.envMap===null&&(o.environmentIntensity!==l.environmentIntensity||o.environmentRotation.equals(l.environmentRotation)===!1)?(o.environmentIntensity=l.environmentIntensity,o.environmentRotation.copy(l.environmentRotation),!1):o.center&&o.center.equals(r.center)===!1?(o.center.copy(r.center),!1):(e.bundle!==null&&(o.version=e.bundle.version),!0)}getLightsData(e,t){t.length=0;for(let n of e)n.isSpotLight===!0&&n.map!==null&&t.push({map:n.map.version});return t}getLights(e,t){let n=sr.get(e);return n===void 0&&(n={renderId:-1,lightsData:[]},sr.set(e,n)),n.renderId===t?n.lightsData:(n.renderId=t,this.getLightsData(e.getLights(),n.lightsData),n.lightsData)}needsRefresh(e,t){if(this.hasNode||this.hasAnimation||this.firstInitialization(e)||this.needsVelocity(t.renderer))return!0;let{renderId:n}=t;if(this.renderId!==n)return this.renderId=n,!0;let r=e.object.static===!0,i=e.bundle!==null&&e.bundle.static===!0&&this.getRenderObjectData(e).version===e.bundle.version;if(r||i)return!1;let a=this.getLights(e.lightsNode,n);return this.equals(e,a,n)!==!0}},dr=[/^StackTrace\.js$/,/^TSLCore\.js$/,/^.*Node\.js$/,/^three\.webgpu.*\.js$/];function fr(e){let t=/(?:at\s+(.+?)\s+\()?(?:(.+?)@)?([^@\s()]+):(\d+):(\d+)/;return e.split(`
`).map(e=>{let n=e.match(t);if(!n)return null;let r=n[1]||n[2]||``,i=n[3].split(`?`)[0],a=parseInt(n[4],10),o=parseInt(n[5],10);return{fn:r,file:i.split(`/`).pop(),line:a,column:o}}).filter(e=>e&&!dr.some(t=>t.test(e.file)))}var pr=class{constructor(e=null){this.isStackTrace=!0,this.stack=fr(e||Error().stack)}getLocation(){if(this.stack.length===0)return`[Unknown location]`;let e=this.stack[0],t=e.fn;return`${t?`"${t}()" at `:``}"${e.file}:${e.line}"`}getError(e){return this.stack.length===0?e:`${e}\n${this.stack.map(e=>{let t=`${e.file}:${e.line}:${e.column}`;return e.fn?`    at ${e.fn} (${t})`:`    at ${t}`}).join(`
`)}`}};function mr(e,t=0){let n=3735928559^t,r=1103547991^t;if(Array.isArray(e))for(let t=0,i;t<e.length;t++)i=e[t],n=Math.imul(n^i,2654435761),r=Math.imul(r^i,1597334677);else for(let t=0,i;t<e.length;t++)i=e.charCodeAt(t),n=Math.imul(n^i,2654435761),r=Math.imul(r^i,1597334677);return n=Math.imul(n^n>>>16,2246822507),n^=Math.imul(r^r>>>13,3266489909),r=Math.imul(r^r>>>16,2246822507),r^=Math.imul(n^n>>>13,3266489909),4294967296*(2097151&r)+(n>>>0)}var hr=e=>mr(e),gr=e=>mr(e),_r=(...e)=>mr(e),vr=new Map([[1,`float`],[2,`vec2`],[3,`vec3`],[4,`vec4`],[9,`mat3`],[16,`mat4`]]),yr=new WeakMap;function br(e){return vr.get(e)}function xr(e){if(/[iu]?vec\d/.test(e))return e.startsWith(`ivec`)?Int32Array:e.startsWith(`uvec`)?Uint32Array:Float32Array;if(/mat\d/.test(e)||/float/.test(e))return Float32Array;if(/uint/.test(e))return Uint32Array;if(/int/.test(e))return Int32Array;throw Error(`THREE.NodeUtils: Unsupported type: ${e}`)}function Sr(e){if(/float|int|uint|bool/.test(e))return 1;if(/vec2/.test(e))return 2;if(/vec3/.test(e))return 3;if(/vec4/.test(e)||/mat2/.test(e))return 4;if(/mat3/.test(e))return 9;if(/mat4/.test(e))return 16;C(`TSL: Unsupported type: ${e}`,new pr)}function Cr(e){if(/float|int|uint|bool/.test(e))return 1;if(/vec2/.test(e))return 2;if(/vec3/.test(e))return 3;if(/vec4/.test(e)||/mat2/.test(e))return 4;if(/mat3/.test(e))return 12;if(/mat4/.test(e))return 16;C(`TSL: Unsupported type: ${e}`,new pr)}function wr(e){if(/float|int|uint|bool/.test(e))return 1;if(/vec2/.test(e))return 2;if(/vec3/.test(e)||/vec4/.test(e))return 4;if(/mat2/.test(e))return 2;if(/mat3/.test(e)||/mat4/.test(e))return 4;C(`TSL: Unsupported type: ${e}`,new pr)}function Tr(e){if(e==null)return null;let t=typeof e;return e.isNode===!0?`node`:t===`number`?`float`:t===`boolean`?`bool`:t===`string`?`string`:t===`function`?`shader`:e.isVector2===!0?`vec2`:e.isVector3===!0?`vec3`:e.isVector4===!0?`vec4`:e.isMatrix2===!0?`mat2`:e.isMatrix3===!0?`mat3`:e.isMatrix4===!0?`mat4`:e.isColor===!0?`color`:e instanceof ArrayBuffer?`ArrayBuffer`:null}function Er(e,...t){let n=e?e.slice(-4):void 0;return t.length===1&&(n===`vec2`?t=[t[0],t[0]]:n===`vec3`?t=[t[0],t[0],t[0]]:n===`vec4`&&(t=[t[0],t[0],t[0],t[0]])),e===`color`?new de(...t):n===`vec2`?new hn(...t):n===`vec3`?new w(...t):n===`vec4`?new bt(...t):n===`mat2`?new fn(...t):n===`mat3`?new On(...t):n===`mat4`?new Kt(...t):e===`bool`?t[0]||!1:e===`float`||e===`int`||e===`uint`?t[0]||0:e===`string`?t[0]||``:e===`ArrayBuffer`?kr(t[0]):null}function Dr(e){let t=yr.get(e);return t===void 0&&(t={},yr.set(e,t)),t}function Or(e){let t=``,n=new Uint8Array(e);for(let e=0;e<n.length;e++)t+=String.fromCharCode(n[e]);return btoa(t)}function kr(e){return Uint8Array.from(atob(e),e=>e.charCodeAt(0)).buffer}var Ar={VERTEX:`vertex`,FRAGMENT:`fragment`},E={NONE:`none`,FRAME:`frame`,RENDER:`render`,OBJECT:`object`},jr={BOOLEAN:`bool`,INTEGER:`int`,FLOAT:`float`,VECTOR2:`vec2`,VECTOR3:`vec3`,VECTOR4:`vec4`,MATRIX2:`mat2`,MATRIX3:`mat3`,MATRIX4:`mat4`},Mr={READ_ONLY:`readOnly`,WRITE_ONLY:`writeOnly`,READ_WRITE:`readWrite`},Nr=[`fragment`,`vertex`],Pr=[`setup`,`analyze`,`generate`],Fr=[...Nr,`compute`],Ir=[`x`,`y`,`z`,`w`],Lr={analyze:`setup`,generate:`analyze`},Rr=0,D=class e extends Dt{static get type(){return`Node`}constructor(t=null){super(),this.nodeType=t,this.updateType=E.NONE,this.updateBeforeType=E.NONE,this.updateAfterType=E.NONE,this.version=0,this.name=``,this.global=!1,this.parents=!1,this.isNode=!0,this._beforeNodes=null,this._cacheKey=null,this._uuid=null,this._cacheKeyVersion=0,this.id=Rr++,this.stackTrace=null,e.captureStackTrace===!0&&(this.stackTrace=new pr)}set needsUpdate(e){e===!0&&this.version++}get uuid(){return this._uuid===null&&(this._uuid=In.generateUUID()),this._uuid}get type(){return this.constructor.type}onUpdate(e,t){return this.updateType=t,this.update=e.bind(this),this}onFrameUpdate(e){return this.onUpdate(e,E.FRAME)}onRenderUpdate(e){return this.onUpdate(e,E.RENDER)}onObjectUpdate(e){return this.onUpdate(e,E.OBJECT)}onReference(e){return this.updateReference=e.bind(this),this}updateReference(){return this}isGlobal(){return this.global}*getChildren(){for(let{childNode:e}of this._getChildren())yield e}dispose(){this.dispatchEvent({type:`dispose`})}traverse(e){e(this);for(let t of this.getChildren())t.traverse(e)}_getChildren(e=new Set){let t=[];e.add(this);for(let n of Object.getOwnPropertyNames(this)){let r=this[n];if(!(n.startsWith(`_`)===!0||e.has(r))){if(Array.isArray(r)===!0)for(let e=0;e<r.length;e++){let i=r[e];i&&i.isNode===!0&&t.push({property:n,index:e,childNode:i})}else if(r&&r.isNode===!0)t.push({property:n,childNode:r});else if(r&&Object.getPrototypeOf(r)===Object.prototype)for(let e in r){if(e.startsWith(`_`)===!0)continue;let i=r[e];i&&i.isNode===!0&&t.push({property:n,index:e,childNode:i})}}}return t}getCacheKey(e=!1,t=null){if(e||=this.version!==this._cacheKeyVersion,e===!0||this._cacheKey===null){t===null&&(t=new Set);let n=[];for(let{property:r,childNode:i}of this._getChildren(t))n.push(hr(r.slice(0,-4)),i.getCacheKey(e,t));this._cacheKey=_r(gr(n),this.customCacheKey()),this._cacheKeyVersion=this.version}return this._cacheKey}customCacheKey(){return this.id}getScope(){return this}getHash(){return String(this.id)}getUpdateType(){return this.updateType}getUpdateBeforeType(){return this.updateBeforeType}getUpdateAfterType(){return this.updateAfterType}getElementType(e){let t=this.getNodeType(e);return e.getElementType(t)}getMemberType(){return`void`}getNodeType(e,t=null){let n=e.getDataFromNode(this),r;return t===null?(r=n.type,r===void 0&&(r=this.generateNodeType(e),n.type=r)):(n.typeFromOutput=n.typeFromOutput||{},r=n.typeFromOutput[t],r===void 0&&(r=this.generateNodeType(e,t),n.typeFromOutput[t]=r)),r}generateNodeType(e,t=null){let n=e.getNodeProperties(this);return n.outputNode?n.outputNode.getNodeType(e,t):this.nodeType}getShared(e){let t=this.getHash(e),n=e.getNodeFromHash(t),r=null;if(n&&n!==this)r=n;else if(e.context.overrideNodes){let t=e.context.overrideNodes.get(this);if(t){let n=e.getDataFromNode(this);n.isOverwritten===!0?r=n.sharedNode:(n.isOverwritten=!0,r=t(e).overrideNode(this,null),n.sharedNode=r)}}return r||this}getArrayCount(){return null}setup(e){let t=e.getNodeProperties(this),n=0;for(let e of this.getChildren())t[`node`+n++]=e;return t.outputNode||null}analyze(e,t=null){let n=e.increaseUsage(this);if(this.parents===!0){let n=e.getDataFromNode(this,`any`);n.stages=n.stages||{},n.stages[e.shaderStage]=n.stages[e.shaderStage]||[],n.stages[e.shaderStage].push(t)}if(n===1){let t=e.getNodeProperties(this);for(let n of Object.values(t))n&&n.isNode===!0&&n.build(e,this)}}generate(e,t){let{outputNode:n}=e.getNodeProperties(this);if(n&&n.isNode===!0)return n.build(e,t)}updateBefore(){T(`Abstract function.`)}updateAfter(){T(`Abstract function.`)}update(){T(`Abstract function.`)}before(e){return this._beforeNodes===null&&(this._beforeNodes=[]),this._beforeNodes.push(e),this}build(e,t=null){let n=this.getShared(e);if(this!==n)return n.build(e,t);if(this._beforeNodes!==null){let n=this._beforeNodes;this._beforeNodes=null;for(let r of n)r.build(e,t);this._beforeNodes=n}let r=e.getDataFromNode(this);r.buildStages=r.buildStages||{},r.buildStages[e.buildStage]=!0;let i=Lr[e.buildStage];if(i&&r.buildStages[i]!==!0){let t=e.getBuildStage();e.setBuildStage(i),this.build(e),e.setBuildStage(t)}e.addChain(this);let a=null,o=e.getBuildStage();if(o===`setup`){e.addNode(this),this.updateReference(e);let t=e.getNodeProperties(this);if(t.initialized!==!0){t.initialized=!0,t.outputNode=this.setup(e)||t.outputNode||null;for(let n of Object.values(t))if(n&&n.isNode===!0){if(n.parents===!0){let t=e.getNodeProperties(n);t.parents=t.parents||[],t.parents.push(this)}n.build(e)}e.addSequentialNode(this)}a=t.outputNode}else if(o===`analyze`)this.analyze(e,t);else if(o===`generate`){if(this.generate.length<2){let n=this.getNodeType(e),r=e.getDataFromNode(this);a=r.snippet,a===void 0?r.generated===void 0?(r.generated=!0,a=this.generate(e)||``,r.snippet=a):(T(`Node: Recursion detected.`,this),a=`/* Recursion detected. */`):r.flowCodes!==void 0&&e.context.nodeBlock!==void 0&&e.addFlowCodeHierarchy(this,e.context.nodeBlock),a=e.format(a,n,t)}else a=this.generate(e,t)||``;a===``&&t!==null&&t!==`void`&&t!==`OutputType`&&(C(`TSL: Invalid generated code, expected a "${t}".`),a=e.generateConst(t))}return e.removeChain(this),a}getSerializeChildren(){return this._getChildren()}serialize(e){let t=this.getSerializeChildren(),n={};for(let{property:r,index:i,childNode:a}of t)i===void 0?n[r]=a.toJSON(e.meta).uuid:(n[r]===void 0&&(n[r]=Number.isInteger(i)?[]:{}),n[r][i]=a.toJSON(e.meta).uuid);Object.keys(n).length>0&&(e.inputNodes=n)}deserialize(e){if(e.inputNodes!==void 0){let t=e.meta.nodes;for(let n in e.inputNodes)if(Array.isArray(e.inputNodes[n])){let r=[];for(let i of e.inputNodes[n])r.push(t[i]);this[n]=r}else if(typeof e.inputNodes[n]==`object`){let r={};for(let i in e.inputNodes[n])r[i]=t[e.inputNodes[n][i]];this[n]=r}else{let r=e.inputNodes[n];this[n]=t[r]}}}toJSON(e){let{uuid:t,type:n}=this,r=e===void 0||typeof e==`string`;r&&(e={textures:{},images:{},nodes:{}});let i=e.nodes[t];i===void 0&&(i={uuid:t,type:n,meta:e,metadata:{version:4.7,type:`Node`,generator:`Node.toJSON`}},r!==!0&&(e.nodes[i.uuid]=i),this.serialize(i),delete i.meta);function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(r){let t=a(e.textures),n=a(e.images),r=a(e.nodes);t.length>0&&(i.textures=t),n.length>0&&(i.images=n),r.length>0&&(i.nodes=r)}return i}};D.captureStackTrace=!1;var zr=class extends D{static get type(){return`ArrayElementNode`}constructor(e,t){super(),this.node=e,this.indexNode=t,this.isArrayElementNode=!0}generateNodeType(e){return this.node.getElementType(e)}getMemberType(e,t){return this.node.getMemberType(e,t)}generate(e){let t=this.indexNode.getNodeType(e);return`${this.node.build(e)}[ ${this.indexNode.build(e,!e.isVector(t)&&e.isInteger(t)?t:`uint`)} ]`}},Br=class extends D{static get type(){return`ConvertNode`}constructor(e,t){super(),this.node=e,this.convertTo=t}generateNodeType(e){let t=this.node.getNodeType(e),n=null;for(let r of this.convertTo.split(`|`))(n===null||e.getTypeLength(t)===e.getTypeLength(r))&&(n=r);return n}serialize(e){super.serialize(e),e.convertTo=this.convertTo}deserialize(e){super.deserialize(e),this.convertTo=e.convertTo}generate(e,t){let n=this.node,r=this.getNodeType(e),i=n.build(e,r);return e.format(i,r,t)}},Vr=class extends D{static get type(){return`TempNode`}constructor(e=null){super(e),this.isTempNode=!0}hasDependencies(e){return e.getDataFromNode(this).usageCount>1}build(e,t){if(e.getBuildStage()===`generate`){let n=e.getVectorType(this.getNodeType(e,t)),r=e.getDataFromNode(this);if(r.propertyName!==void 0)return e.format(r.propertyName,n,t);if(n!==`void`&&t!==`void`&&this.hasDependencies(e)){let i=super.build(e,n),a=e.getVarFromNode(this,null,n),o=e.getPropertyName(a);return e.addLineFlowCode(`${o} = ${i}`,this),r.snippet=i,r.propertyName=o,e.format(r.propertyName,n,t)}}return super.build(e,t)}},Hr=class extends Vr{static get type(){return`JoinNode`}constructor(e=[],t=null){super(t),this.nodes=e}generateNodeType(e){return this.nodeType===null?e.getTypeFromLength(this.nodes.reduce((t,n)=>t+e.getTypeLength(n.getNodeType(e)),0)):e.getVectorType(this.nodeType)}generate(e,t){let n=this.getNodeType(e),r=e.getTypeLength(n),i=this.nodes,a=e.getComponentType(n),o=[],s=0;for(let t of i){if(s>=r){C(`TSL: Length of parameters exceeds maximum length of function '${n}()' type.`,this.stackTrace);break}let i=t.getNodeType(e),c=e.getTypeLength(i),l;if(s+c>r&&(C(`TSL: Length of '${n}()' data exceeds maximum length of output type.`,this.stackTrace),c=r-s,i=e.getTypeFromLength(c)),s+=c,l=t.build(e,i),e.getComponentType(i)!==a){let t=e.getTypeFromLength(c,a);l=e.format(l,i,t)}o.push(l)}let c=`${e.getType(n)}( ${o.join(`, `)} )`;return e.format(c,n,t)}},Ur=Ir.join(``),Wr=class extends D{static get type(){return`SplitNode`}constructor(e,t=`x`){super(),this.node=e,this.components=t,this.isSplitNode=!0}getVectorLength(){let e=this.components.length;for(let t of this.components)e=Math.max(Ir.indexOf(t)+1,e);return e}getComponentType(e){return e.getComponentType(this.node.getNodeType(e))}generateNodeType(e){return e.getTypeFromLength(this.components.length,this.getComponentType(e))}getScope(){return this.node.getScope()}generate(e,t){let n=this.node,r=e.getTypeLength(n.getNodeType(e)),i=null;if(r>1){let a=null;this.getVectorLength()>=r&&(a=e.getTypeFromLength(this.getVectorLength(),this.getComponentType(e)));let o=n.build(e,a);i=this.components.length===r&&this.components===Ur.slice(0,this.components.length)?e.format(o,a,t):e.format(`${o}.${this.components}`,this.getNodeType(e),t)}else i=n.build(e,t);return i}serialize(e){super.serialize(e),e.components=this.components}deserialize(e){super.deserialize(e),this.components=e.components}},Gr=class extends Vr{static get type(){return`SetNode`}constructor(e,t,n){super(),this.sourceNode=e,this.components=t,this.targetNode=n}generateNodeType(e){return this.sourceNode.getNodeType(e)}generate(e){let{sourceNode:t,components:n,targetNode:r}=this,i=this.getNodeType(e),a=e.getComponentType(r.getNodeType(e)),o=e.getTypeFromLength(n.length,a),s=r.build(e,o),c=t.build(e,i),l=e.getTypeLength(i),u=[];for(let e=0;e<l;e++){let t=Ir[e];t===n[0]?(u.push(s),e+=n.length-1):u.push(c+`.`+t)}return`${e.getType(i)}( ${u.join(`, `)} )`}},Kr=class extends Vr{static get type(){return`FlipNode`}constructor(e,t){super(),this.sourceNode=e,this.components=t}generateNodeType(e){return this.sourceNode.getNodeType(e)}generate(e){let{components:t,sourceNode:n}=this,r=this.getNodeType(e),i=n.build(e),a=e.getVarFromNode(this),o=e.getPropertyName(a);e.addLineFlowCode(o+` = `+i,this);let s=e.getTypeLength(r),c=[],l=0;for(let e=0;e<s;e++){let n=Ir[e];n===t[l]?(c.push(`1.0 - `+(o+`.`+n)),l++):c.push(o+`.`+n)}return`${e.getType(r)}( ${c.join(`, `)} )`}},qr=class extends D{static get type(){return`InputNode`}constructor(e,t=null){super(t),this.isInputNode=!0,this.value=e,this.precision=null}generateNodeType(){return this.nodeType===null?Tr(this.value):this.nodeType}getInputType(e){return this.getNodeType(e)}setPrecision(e){return this.precision=e,this}serialize(e){super.serialize(e),e.value=this.value,this.value&&this.value.toArray&&(e.value=this.value.toArray()),e.valueType=Tr(this.value),e.nodeType=this.nodeType,e.valueType===`ArrayBuffer`&&(e.value=Or(e.value)),e.precision=this.precision}deserialize(e){super.deserialize(e),this.nodeType=e.nodeType,this.value=Array.isArray(e.value)?Er(e.valueType,...e.value):e.value,this.precision=e.precision||null,this.value&&this.value.fromArray&&(this.value=this.value.fromArray(e.value))}generate(){T(`Abstract function.`)}},Jr=/float|u?int/,Yr=class extends qr{static get type(){return`ConstNode`}constructor(e,t=null){super(e,t),this.isConstNode=!0}generateConst(e){return e.generateConst(this.getNodeType(e),this.value)}generate(e,t){let n=this.getNodeType(e);return Jr.test(n)&&Jr.test(t)?e.generateConst(t,this.value):e.format(this.generateConst(e),n,t)}},Xr=class extends D{static get type(){return`MemberNode`}constructor(e,t){super(),this.structNode=e,this.property=t,this.isMemberNode=!0}hasMember(e){return this.structNode.isMemberNode&&this.structNode.hasMember(e)===!1?!1:this.structNode.getMemberType(e,this.property)!==`void`}generateNodeType(e){return this.hasMember(e)===!1?`float`:this.structNode.getMemberType(e,this.property)}getMemberType(e,t){if(this.hasMember(e)===!1)return`float`;let n=this.getNodeType(e);return e.getStructTypeNode(n).getMemberType(e,t)}generate(e){if(this.hasMember(e)===!1){T(`TSL: Member "${this.property}" does not exist in struct.`,this.stackTrace);let t=this.getNodeType(e);return e.generateConst(t)}return this.structNode.build(e)+`.`+this.property}},Zr=null,Qr=new Map;function O(e,t){if(Qr.has(e)){T(`TSL: Redefinition of method chaining '${e}'.`);return}if(typeof t!=`function`)throw Error(`THREE.TSL: Node element ${e} is not a function`);Qr.set(e,t),e!==`assign`&&(D.prototype[e]=function(...e){return this.isStackNode?this.addToStack(t(...e)):t(this,...e)},D.prototype[e+`Assign`]=function(...e){return this.isStackNode?this.assign(e[0],t(...e)):this.assign(t(this,...e))})}var $r=e=>e.replace(/r|s/g,`x`).replace(/g|t/g,`y`).replace(/b|p/g,`z`).replace(/a|q/g,`w`),ei=e=>$r(e).split(``).sort().join(``);D.prototype.assign=function(...e){if(this.isStackNode!==!0)return Zr===null?C(`TSL: No stack defined for assign operation. Make sure the assign is inside a Fn().`,new pr):Zr.assign(this,...e),this;{let t=Qr.get(`assign`);return this.addToStack(t(...e))}},D.prototype.toVarIntent=function(){return this},D.prototype.get=function(e){return new Xr(this,e)};var ti={};function ni(e,t,n){ti[e]=ti[t]=ti[n]={get(){this._cache=this._cache||{};let t=this._cache[e];return t===void 0&&(t=new Wr(this,e),this._cache[e]=t),t},set(t){this[e].assign(k(t))}};let r=e.toUpperCase(),i=t.toUpperCase(),a=n.toUpperCase();D.prototype[`set`+r]=D.prototype[`set`+i]=D.prototype[`set`+a]=function(t){let n=ei(e);return new Gr(this,n,k(t))},D.prototype[`flip`+r]=D.prototype[`flip`+i]=D.prototype[`flip`+a]=function(){let t=ei(e);return new Kr(this,t)}}var ri=[`x`,`y`,`z`,`w`],ii=[`r`,`g`,`b`,`a`],ai=[`s`,`t`,`p`,`q`];for(let e=0;e<4;e++){let t=ri[e],n=ii[e],r=ai[e];ni(t,n,r);for(let i=0;i<4;i++){t=ri[e]+ri[i],n=ii[e]+ii[i],r=ai[e]+ai[i],ni(t,n,r);for(let a=0;a<4;a++){t=ri[e]+ri[i]+ri[a],n=ii[e]+ii[i]+ii[a],r=ai[e]+ai[i]+ai[a],ni(t,n,r);for(let o=0;o<4;o++)t=ri[e]+ri[i]+ri[a]+ri[o],n=ii[e]+ii[i]+ii[a]+ii[o],r=ai[e]+ai[i]+ai[a]+ai[o],ni(t,n,r)}}}for(let e=0;e<32;e++)ti[e]={get(){this._cache=this._cache||{};let t=this._cache[e];return t===void 0&&(t=new zr(this,new Yr(e,`uint`)),this._cache[e]=t),t},set(t){this[e].assign(k(t))}};Object.defineProperties(D.prototype,ti);var oi=function(e,t=null){let n=Tr(e);return n===`node`?e:t===null&&(n===`float`||n===`boolean`)||n&&n!==`shader`&&n!==`string`?k(Ei(e,t)):n===`shader`?e.isFn?e:N(e):e},si=function(e,t=null){for(let n in e)e[n]=k(e[n],t);return e},ci=function(e,t=null){let n=e.length;for(let r=0;r<n;r++)e[r]=k(e[r],t);return e},li=function(e,t=null,n=null,r=null){function i(e){return r===null?e=k(e):(e=k(Object.assign(e,r)),r.intent===!0&&(e=e.toVarIntent())),e}let a,o=t,s,c;function l(t){let n;return n=o?/[a-z]/i.test(o)?o+`()`:o:e.type,s!==void 0&&t.length<s?(C(`TSL: "${n}" parameter length is less than minimum required.`,new pr),t.concat(Array(s-t.length).fill(0))):c!==void 0&&t.length>c?(C(`TSL: "${n}" parameter length exceeds limit.`,new pr),t.slice(0,c)):t}return t===null?a=(...t)=>i(new e(...Ni(l(t)))):n===null?a=(...n)=>i(new e(t,...Ni(l(n)))):(n=k(n),a=(...r)=>i(new e(t,...Ni(l(r)),n))),a.setParameterLength=(...e)=>(e.length===1?s=c=e[0]:e.length===2&&([s,c]=e),a),a.setName=e=>(o=e,a),a},ui=function(e,...t){return new e(...Ni(t))},di=class extends D{constructor(e,t){super(),this.shaderNode=e,this.rawInputs=t,this.isShaderCallNodeInternal=!0}generateNodeType(e){return this.shaderNode.nodeType||this.getOutputNode(e).getNodeType(e)}getElementType(e){return this.getOutputNode(e).getElementType(e)}getMemberType(e,t){return this.getOutputNode(e).getMemberType(e,t)}call(e){let{shaderNode:t,rawInputs:n}=this,r=e.getNodeProperties(t),i=e.getClosestSubBuild(t.subBuilds)||``,a=i||`default`;if(r[a])return r[a];let o=e.subBuildFn,s=e.fnCall;e.subBuildFn=i,e.fnCall=this;let c=null;if(t.layout){if(n){let r=t.layout.inputs;if(fi(n)){let t=n;for(let n=0;n<r.length;n++){let r=t[n];r&&r.isNode&&r.build(e)}}else{let t=n[0];for(let n of r){let r=t[n.name];r&&r.isNode&&r.build(e)}}}let r=e.buildFunctionNode(t);e.addInclude(r);let i=n?pi(n):null;c=r.call(i)}else{let r=new Proxy(e,{get:(e,t,n)=>{let r;return r=Symbol.iterator===t?function*(){yield void 0}:Reflect.get(e,t,n),r}}),i=n?mi(n):null,a=Array.isArray(n)?n.length>0:n!==null,o=t.jsFunc;c=k(a||o.length>1?o(i,r):o(r))}return e.subBuildFn=o,e.fnCall=s,t.once&&(r[a]=c),c}setupOutput(e){return e.addStack(),e.stack.outputNode=this.call(e),e.removeStack()}getOutputNode(e){let t=e.getNodeProperties(this),n=e.getSubBuildOutput(this);return t[n]=t[n]||this.setupOutput(e),t[n].subBuild=e.getClosestSubBuild(this),t[n]}build(e,t=null){let n=null,r=e.getBuildStage(),i=e.getNodeProperties(this),a=e.getSubBuildOutput(this),o=this.getOutputNode(e),s=e.fnCall;if(e.fnCall=this,r===`setup`){let t=e.getSubBuildProperty(`initialized`,this);if(i[t]!==!0&&(i[t]=!0,i[a]=this.getOutputNode(e),i[a].build(e),this.shaderNode.subBuilds))for(let t of e.chaining){let n=e.getDataFromNode(t,`any`);n.subBuilds=n.subBuilds||new Set;for(let e of this.shaderNode.subBuilds)n.subBuilds.add(e)}n=i[a]}else r===`analyze`?o.build(e,t):r===`generate`&&(n=o.build(e,t)||``);return e.fnCall=s,n}};function fi(e){return e[0]&&(e[0].isNode||Object.getPrototypeOf(e[0])!==Object.prototype)}function pi(e){let t;return Mi(e),t=fi(e)?[...e]:e[0],t}function mi(e){let t=0;return Mi(e),new Proxy(e,{get:(n,r,i)=>{let a;if(r===`length`)return a=e.length,a;if(Symbol.iterator===r)a=function*(){for(let t of e)yield k(t)};else{if(e.length>0){if(Object.getPrototypeOf(e[0])===Object.prototype){let n=e[0];a=n[r]===void 0?n[t++]:Reflect.get(n,r,i)}else e[0]instanceof D&&(a=e[r]===void 0?e[t++]:Reflect.get(e,r,i))}else a=Reflect.get(n,r,i);a=k(a)}return a}})}var hi=class extends D{constructor(e,t){super(t),this.jsFunc=e,this.layout=null,this.global=!0,this.once=!1}setLayout(e){return this.layout=e,this}getLayout(){return this.layout}call(e=null){return new di(this,e)}setup(){return this.call()}},gi=[!1,!0],_i=[0,1,2,3],vi=[-1,-2],yi=[.5,1.5,1/3,1e-6,1e6,Math.PI,Math.PI*2,1/Math.PI,2/Math.PI,1/(Math.PI*2),Math.PI/2],bi=new Map;for(let e of gi)bi.set(e,new Yr(e));var xi=new Map;for(let e of _i)xi.set(e,new Yr(e,`uint`));var Si=new Map([...xi].map(e=>new Yr(e.value,`int`)));for(let e of vi)Si.set(e,new Yr(e,`int`));var Ci=new Map([...Si].map(e=>new Yr(e.value)));for(let e of yi)Ci.set(e,new Yr(e));for(let e of yi)Ci.set(-e,new Yr(-e));var wi={bool:bi,uint:xi,ints:Si,float:Ci},Ti=new Map([...bi,...Ci]),Ei=(e,t)=>Ti.has(e)?Ti.get(e):e.isNode===!0?e:new Yr(e,t),Di=function(e,t=null){return(...n)=>{for(let t of n)if(t===void 0)return C(`TSL: Invalid parameter for the type "${e}".`,new pr),new Yr(0,e);if((n.length===0||![`bool`,`float`,`int`,`uint`].includes(e)&&n.every(e=>{let t=typeof e;return t!==`object`&&t!==`function`}))&&(n=[Er(e,...n)]),n.length===1&&t!==null&&t.has(n[0]))return ji(t.get(n[0]));if(n.length===1){let t=Ei(n[0],e);return t.nodeType===e?ji(t):ji(new Br(t,e))}return ji(new Hr(n.map(e=>Ei(e)),e))}};function Oi(e){return e&&e.isNode&&e.traverse(t=>{t.isConstNode&&(e=t.value)}),!!e}var ki=e=>e==null?null:e.nodeType||e.convertTo||(typeof e==`string`?e:null);function Ai(e,t){return new hi(e,t)}var k=(e,t=null)=>oi(e,t),ji=(e,t=null)=>k(e,t).toVarIntent(),Mi=(e,t=null)=>new si(e,t),Ni=(e,t=null)=>new ci(e,t),A=(e,t=null,n=null,r=null)=>new li(e,t,n,r),j=(e,...t)=>new ui(e,...t),M=(e,t=null,n=null,r={})=>new li(e,t,n,{...r,intent:!0}),Pi=(e,t)=>new Proxy(e,{get(e,n,r){return Reflect.get(t,n,r)},set(e,n,r){return Reflect.set(t,n,r)}}),Fi=0,Ii=class extends D{constructor(e,t=null){super();let n=null;t!==null&&(typeof t==`object`?n=t.return:(typeof t==`string`?n=t:C(`TSL: Invalid layout type.`,new pr),t=null)),this.shaderNode=new Ai(e,n),t!==null&&this.setLayout(t),this.isFn=!0}setLayout(e){let t=this.shaderNode.nodeType;if(typeof e.inputs!=`object`){let n={name:`fn`+Fi++,type:t,inputs:[]};for(let t in e)t!==`return`&&n.inputs.push({name:t,type:e[t]});e=n}return this.shaderNode.setLayout(e),this}generateNodeType(e){return this.shaderNode.getNodeType(e)||`float`}call(...e){let t=this.shaderNode.call(e);return this.shaderNode.nodeType===`void`&&t.toStack(),t.toVarIntent()}once(e=null){return this.shaderNode.once=!0,this.shaderNode.subBuilds=e,this}generate(e){let t=this.getNodeType(e);return C(`TSL: "Fn()" was declared but not invoked. Try calling it like "Fn()( ...params )".`,this.stackTrace),e.generateConst(t)}};function N(e,t=null){let n=new Ii(e,t);return new Proxy(()=>{},{apply(e,t,r){return n.call(...r)},get(e,t,r){return Reflect.get(n,t,r)},set(e,t,r,i){return Reflect.set(n,t,r,i)}})}var Li=e=>{Zr=e},Ri=()=>Zr,P=(...e)=>Zr.If(...e),zi=(...e)=>Zr.Switch(...e);function Bi(e){return Zr&&Zr.addToStack(e),e}O(`toStack`,Bi);var Vi=new Di(`color`),F=new Di(`float`,wi.float),I=new Di(`int`,wi.ints),L=new Di(`uint`,wi.uint),Hi=new Di(`bool`,wi.bool),R=new Di(`vec2`),Ui=new Di(`ivec2`),Wi=new Di(`uvec2`),Gi=new Di(`bvec2`),z=new Di(`vec3`),Ki=new Di(`ivec3`),qi=new Di(`uvec3`),Ji=new Di(`bvec3`),B=new Di(`vec4`),Yi=new Di(`ivec4`),Xi=new Di(`uvec4`),Zi=new Di(`bvec4`),Qi=new Di(`mat2`),$i=new Di(`mat3`),ea=new Di(`mat4`);O(`toColor`,Vi),O(`toFloat`,F),O(`toInt`,I),O(`toUint`,L),O(`toBool`,Hi),O(`toVec2`,R),O(`toIVec2`,Ui),O(`toUVec2`,Wi),O(`toBVec2`,Gi),O(`toVec3`,z),O(`toIVec3`,Ki),O(`toUVec3`,qi),O(`toBVec3`,Ji),O(`toVec4`,B),O(`toIVec4`,Yi),O(`toUVec4`,Xi),O(`toBVec4`,Zi),O(`toMat2`,Qi),O(`toMat3`,$i),O(`toMat4`,ea);var ta=A(zr).setParameterLength(2),na=(e,t)=>new Br(k(e),t),ra=(e,t)=>new Wr(k(e),t);O(`element`,ta),O(`convert`,na);var ia=e=>(T(`TSL: append() has been renamed to Stack().`,new pr),Bi(e));O(`append`,e=>(T(`TSL: .append() has been renamed to .toStack().`,new pr),Bi(e)));var aa=class extends D{static get type(){return`PropertyNode`}constructor(e,t=null,n=!1,r=null){super(e),this.name=t,this.varying=n,this.placeholderNode=k(r),this.isPropertyNode=!0,this.global=!0}getNodeType(e){let t=super.getNodeType(e);return t===`output`?e.getOutputType():t}customCacheKey(){return hr(this.type+`:`+(this.name||``)+`:`+(this.varying?`1`:`0`))}getHash(e){return this.name||super.getHash(e)}generate(e){let t;if(this.varying===!0)t=e.getVaryingFromNode(this,this.name),t.needsInterpolation=!0;else if(t=e.getVarFromNode(this,this.name),this.placeholderNode!==null&&e.hasWriteUsage(this)===!1){let n=this.placeholderNode.build(e,this.getNodeType(e));e.addLineFlowCode(`${e.getPropertyName(t)} = ${n}`,this)}return e.getPropertyName(t)}},oa=(e,t,n=null)=>new aa(e,t,!1,n),sa=(e,t,n=null)=>new aa(e,t,!0,n),ca=j(aa,`vec4`,`DiffuseColor`),la=j(aa,`vec3`,`DiffuseContribution`),ua=j(aa,`vec3`,`EmissiveColor`),da=j(aa,`float`,`Roughness`),fa=j(aa,`float`,`Metalness`),pa=j(aa,`float`,`Clearcoat`),ma=j(aa,`float`,`ClearcoatRoughness`),ha=j(aa,`vec3`,`Sheen`),ga=j(aa,`float`,`SheenRoughness`),_a=j(aa,`float`,`Iridescence`),va=j(aa,`float`,`IridescenceIOR`),ya=j(aa,`float`,`IridescenceThickness`),ba=j(aa,`float`,`AlphaT`),xa=j(aa,`float`,`Anisotropy`),Sa=j(aa,`vec3`,`AnisotropyT`),Ca=j(aa,`vec3`,`AnisotropyB`),wa=j(aa,`color`,`SpecularColor`),Ta=j(aa,`color`,`SpecularColorBlended`),Ea=j(aa,`float`,`SpecularF90`),Da=j(aa,`float`,`Shininess`),Oa=j(aa,`output`,`Output`),ka=j(aa,`float`,`dashSize`),Aa=j(aa,`float`,`gapSize`),ja=j(aa,`float`,`pointWidth`),Ma=j(aa,`float`,`IOR`),Na=j(aa,`float`,`Transmission`),Pa=j(aa,`float`,`Thickness`),Fa=j(aa,`float`,`AttenuationDistance`),Ia=j(aa,`color`,`AttenuationColor`),La=j(aa,`float`,`Dispersion`),Ra=j(aa,`float`,`AmbientOcclusion`,!1,1),za=class extends D{static get type(){return`UniformGroupNode`}constructor(e,t=!1,n=1,r=null){super(`string`),this.name=e,this.shared=t,this.order=n,this.updateType=r,this.isUniformGroup=!0}update(){this.needsUpdate=!0}serialize(e){super.serialize(e),e.name=this.name,e.version=this.version,e.shared=this.shared}deserialize(e){super.deserialize(e),this.name=e.name,this.version=e.version,this.shared=e.shared}},Ba=(e,t=1,n=null)=>new za(e,!1,t,n),Va=(e,t=0,n=null)=>new za(e,!0,t,n),Ha=Va(`frame`,0,E.FRAME),V=Va(`render`,0,E.RENDER),Ua=Ba(`object`,1,E.OBJECT),Wa=class extends qr{static get type(){return`UniformNode`}constructor(e,t=null){super(e,t),this.isUniformNode=!0,this.name=``,this.groupNode=Ua}setName(e){return this.name=e,this}label(e){return T(`TSL: "label()" has been deprecated. Use "setName()" instead.`,new pr),this.setName(e)}setGroup(e){return this.groupNode=e,this}getGroup(){return this.groupNode}getUniformHash(e){return this.getHash(e)}onUpdate(e,t){return e=e.bind(this),super.onUpdate(t=>{let n=e(t,this);n!==void 0&&(this.value=n)},t)}getInputType(e){let t=super.getInputType(e);return t===`bool`&&(t=`uint`),t}generate(e,t){let n=this.getNodeType(e),r=this.getUniformHash(e),i=e.getNodeFromHash(r);i===void 0&&(e.setHashNode(this,r),i=this);let a=i.getInputType(e),o=e.getUniformFromNode(i,a,e.shaderStage,this.name||e.context.nodeName),s=e.getPropertyName(o);e.context.nodeName!==void 0&&delete e.context.nodeName;let c=s;if(n===`bool`){let t=e.getDataFromNode(this),r=t.propertyName;if(r===void 0){let i=e.getVarFromNode(this,null,`bool`);r=e.getPropertyName(i),t.propertyName=r,c=e.format(s,a,n),e.addLineFlowCode(`${r} = ${c}`,this)}c=r}return e.format(c,n,t)}},H=(e,t)=>{let n=ki(t||e);if(n===e&&(e=Er(n)),e&&e.isNode===!0){let t=e.value;e.traverse(e=>{e.isConstNode===!0&&(t=e.value)}),e=t}return new Wa(e,n)},Ga=class extends Vr{static get type(){return`ArrayNode`}constructor(e,t,n=null){super(e),this.count=t,this.values=n,this.isArrayNode=!0}getArrayCount(){return this.count}generateNodeType(e){return this.nodeType===null?this.values[0].getNodeType(e):this.nodeType}getElementType(e){return this.getNodeType(e)}getMemberType(e,t){return this.nodeType===null?this.values[0].getMemberType(e,t):super.getMemberType(e,t)}generate(e){let t=this.getNodeType(e);return e.generateArray(t,this.count,this.values)}},Ka=(...e)=>{let t;if(e.length===1){let n=e[0];t=new Ga(null,n.length,n)}else{let n=e[0],r=e[1];t=new Ga(n,r)}return k(t)};O(`toArray`,(e,t)=>Ka(Array(t).fill(e)));var qa=A(class extends Vr{static get type(){return`AssignNode`}constructor(e,t){super(),this.targetNode=e,this.sourceNode=t,this.isAssignNode=!0}hasDependencies(){return!1}generateNodeType(e,t){return t===`void`?`void`:this.targetNode.getNodeType(e)}needsSplitAssign(e){let{targetNode:t}=this;if(e.isAvailable(`swizzleAssign`)===!1&&t.isSplitNode&&t.components.length>1){let n=e.getTypeLength(t.node.getNodeType(e));return Ir.join(``).slice(0,n)!==t.components}return!1}setup(e){let{targetNode:t,sourceNode:n}=this,r=t.getScope(),i=e.getDataFromNode(r);i.assign=!0;let a=e.getNodeProperties(this);a.sourceNode=n,a.targetNode=t.context({assign:!0})}generate(e,t){let{targetNode:n,sourceNode:r}=e.getNodeProperties(this),i=this.needsSplitAssign(e),a=n.build(e),o=n.getNodeType(e),s=r.build(e,o),c=r.getNodeType(e),l=e.getDataFromNode(this),u;if(l.initialized===!0)t!==`void`&&(u=a);else if(i){let r=e.getVarFromNode(this,null,o),i=e.getPropertyName(r);e.addLineFlowCode(`${i} = ${s}`,this);let c=n.node,l=c.node.context({assign:!0}).build(e);for(let t=0;t<c.components.length;t++){let n=c.components[t];e.addLineFlowCode(`${l}.${n} = ${i}[ ${t} ]`,this)}t!==`void`&&(u=a)}else u=`${a} = ${s}`,(t===`void`||c===`void`)&&(e.addLineFlowCode(u,this),t!==`void`&&(u=a));return l.initialized=!0,e.format(u,o,t)}}).setParameterLength(2);O(`assign`,qa);var Ja=class extends Vr{static get type(){return`FunctionCallNode`}constructor(e=null,t={}){super(),this.functionNode=e,this.parameters=t}setParameters(e){return this.parameters=e,this}getParameters(){return this.parameters}generateNodeType(e){return this.functionNode.getNodeType(e)}getMemberType(e,t){return this.functionNode.getMemberType(e,t)}generate(e){let t=[],n=this.functionNode,r=n.getInputs(e),i=this.parameters,a=(t,n)=>{let r=n.type,i=r===`pointer`,a;return a=i?`&`+t.build(e):t.build(e,r),a};if(Array.isArray(i)){if(i.length>r.length)C(`TSL: The number of provided parameters exceeds the expected number of inputs in 'Fn()'.`),i.length=r.length;else if(i.length<r.length)for(C(`TSL: The number of provided parameters is less than the expected number of inputs in 'Fn()'.`);i.length<r.length;)i.push(F(0));for(let e=0;e<i.length;e++)t.push(a(i[e],r[e]))}else for(let e of r){let n=i[e.name];n===void 0?(C(`TSL: Input '${e.name}' not found in \'Fn()\'.`),t.push(a(F(0),e))):t.push(a(n,e))}return`${n.build(e,`property`)}( ${t.join(`, `)} )`}},Ya=(e,...t)=>(t=t.length>1||t[0]&&t[0].isNode===!0?Ni(t):Mi(t[0]),new Ja(k(e),t));O(`call`,Ya);var Xa={"==":`equal`,"!=":`notEqual`,"<":`lessThan`,">":`greaterThan`,"<=":`lessThanEqual`,">=":`greaterThanEqual`,"%":`mod`},Za=class e extends Vr{static get type(){return`OperatorNode`}constructor(t,n,r,...i){if(super(),i.length>0){let a=new e(t,n,r);for(let n=0;n<i.length-1;n++)a=new e(t,a,i[n]);n=a,r=i[i.length-1]}this.op=t,this.aNode=n,this.bNode=r,this.isOperatorNode=!0}getOperatorMethod(e,t){return e.getMethod(Xa[this.op],t)}generateNodeType(e,t=null){let n=this.op,r=this.aNode,i=this.bNode,a=r.getNodeType(e),o=i?i.getNodeType(e):null;if(a===`void`||o===`void`)return t||`void`;if(n===`%`)return a;if(n===`~`||n===`&`||n===`|`||n===`^`||n===`>>`||n===`<<`)return e.getIntegerType(a);if(n===`&&`||n===`||`||n===`^^`)return`bool`;if(n===`!`){let t=e.getTypeLength(a);return t>1?`bvec${t}`:`bool`}if(n===`==`||n===`!=`||n===`<`||n===`>`||n===`<=`||n===`>=`){let t=Math.max(e.getTypeLength(a),e.getTypeLength(o));return t>1?`bvec${t}`:`bool`}if(e.isMatrix(a)){if(o===`float`)return a;if(e.isVector(o))return e.getVectorFromMatrix(a);if(e.isMatrix(o))return a}else if(e.isMatrix(o)){if(a===`float`)return o;if(e.isVector(a))return e.getVectorFromMatrix(o)}return e.getTypeLength(o)>e.getTypeLength(a)?o:a}generate(e,t){let n=this.op,{aNode:r,bNode:i}=this,a=this.getNodeType(e,t),o=null,s=null;a===`void`?o=s=a:(o=r.getNodeType(e),s=i?i.getNodeType(e):null,n===`<`||n===`>`||n===`<=`||n===`>=`||n===`==`||n===`!=`?e.isVector(o)?s=o:e.isVector(s)?o=s:o!==s&&(o=s=`float`):n===`>>`||n===`<<`?(o=a,s=e.changeComponentType(s,`uint`)):n===`%`?(o=a,s=e.isInteger(o)&&e.isInteger(s)?s:o):e.isMatrix(o)?s===`float`?s=`float`:e.isVector(s)?s=e.getVectorFromMatrix(o):e.isMatrix(s)||(o=s=a):o=e.isMatrix(s)?o===`float`?`float`:e.isVector(o)?e.getVectorFromMatrix(s):s=a:s=a);let c=r.build(e,o),l=i?i.build(e,s):null,u=e.getFunctionOperator(n);if(t!==`void`){let r=e.renderer.coordinateSystem===zn;if(n===`==`||n===`!=`||n===`<`||n===`>`||n===`<=`||n===`>=`)return r&&e.isVector(o)?e.format(`${this.getOperatorMethod(e,t)}( ${c}, ${l} )`,a,t):e.format(`( ${c} ${n} ${l} )`,a,t);if(n===`%`)return e.isInteger(s)?e.format(`( ${c} % ${l} )`,a,t):e.format(`${this.getOperatorMethod(e,a)}( ${c}, ${l} )`,a,t);if(n===`!`)return r&&e.isVector(o)?e.format(`not( ${c} )`,t):e.format(`( ${n} ${c} )`,o,t);if(n===`~`)return e.format(`( ${n} ${c} )`,o,t);if(u)return e.format(`${u}( ${c}, ${l} )`,a,t);if(e.isMatrix(o)&&s===`float`)return e.format(`( ${l} ${n} ${c} )`,a,t);if(o===`float`&&e.isMatrix(s))return e.format(`${c} ${n} ${l}`,a,t);{let i=`( ${c} ${n} ${l} )`;return!r&&a===`bool`&&e.isVector(o)&&e.isVector(s)&&(i=`all${i}`),e.format(i,a,t)}}if(o!==`void`)return u?e.format(`${u}( ${c}, ${l} )`,a,t):e.isMatrix(o)&&s===`float`?e.format(`${l} ${n} ${c}`,a,t):e.format(`${c} ${n} ${l}`,a,t)}serialize(e){super.serialize(e),e.op=this.op}deserialize(e){super.deserialize(e),this.op=e.op}},Qa=M(Za,`+`).setParameterLength(2,1/0).setName(`add`),U=M(Za,`-`).setParameterLength(2,1/0).setName(`sub`),W=M(Za,`*`).setParameterLength(2,1/0).setName(`mul`),$a=M(Za,`/`).setParameterLength(2,1/0).setName(`div`),eo=M(Za,`%`).setParameterLength(2).setName(`mod`),to=M(Za,`==`).setParameterLength(2).setName(`equal`),no=M(Za,`!=`).setParameterLength(2).setName(`notEqual`),ro=M(Za,`<`).setParameterLength(2).setName(`lessThan`),io=M(Za,`>`).setParameterLength(2).setName(`greaterThan`),ao=M(Za,`<=`).setParameterLength(2).setName(`lessThanEqual`),oo=M(Za,`>=`).setParameterLength(2).setName(`greaterThanEqual`),so=M(Za,`&&`).setParameterLength(2,1/0).setName(`and`),co=M(Za,`||`).setParameterLength(2,1/0).setName(`or`),lo=M(Za,`!`).setParameterLength(1).setName(`not`),uo=M(Za,`^^`).setParameterLength(2).setName(`xor`),fo=M(Za,`&`).setParameterLength(2).setName(`bitAnd`),po=M(Za,`~`).setParameterLength(1).setName(`bitNot`),mo=M(Za,`|`).setParameterLength(2).setName(`bitOr`),ho=M(Za,`^`).setParameterLength(2).setName(`bitXor`),go=M(Za,`<<`).setParameterLength(2).setName(`shiftLeft`),_o=M(Za,`>>`).setParameterLength(2).setName(`shiftRight`),vo=N(([e])=>(e.addAssign(1),e)),yo=N(([e])=>(e.subAssign(1),e)),bo=N(([e])=>{let t=I(e).toConst();return e.addAssign(1),t}),xo=N(([e])=>{let t=I(e).toConst();return e.subAssign(1),t});O(`add`,Qa),O(`sub`,U),O(`mul`,W),O(`div`,$a),O(`mod`,eo),O(`equal`,to),O(`notEqual`,no),O(`lessThan`,ro),O(`greaterThan`,io),O(`lessThanEqual`,ao),O(`greaterThanEqual`,oo),O(`and`,so),O(`or`,co),O(`not`,lo),O(`xor`,uo),O(`bitAnd`,fo),O(`bitNot`,po),O(`bitOr`,mo),O(`bitXor`,ho),O(`shiftLeft`,go),O(`shiftRight`,_o),O(`incrementBefore`,vo),O(`decrementBefore`,yo),O(`increment`,bo),O(`decrement`,xo);var G=class e extends Vr{static get type(){return`MathNode`}constructor(t,n,r=null,i=null){if(super(),(t===e.MAX||t===e.MIN)&&arguments.length>3){let a=new e(t,n,r);for(let n=3;n<arguments.length-1;n++)a=new e(t,a,arguments[n]);n=a,r=arguments[arguments.length-1],i=null}this.method=t,this.aNode=n,this.bNode=r,this.cNode=i,this.isMathNode=!0}getInputType(e){let t=this.aNode.getNodeType(e),n=this.bNode?this.bNode.getNodeType(e):null,r=this.cNode?this.cNode.getNodeType(e):null,i=e.isMatrix(t)?0:e.getTypeLength(t),a=e.isMatrix(n)?0:e.getTypeLength(n),o=e.isMatrix(r)?0:e.getTypeLength(r);return i>a&&i>o?t:a>o?n:o>i?r:t}generateNodeType(t){let n=this.method;return n===e.LENGTH||n===e.DISTANCE||n===e.DOT?`float`:n===e.CROSS?`vec3`:n===e.ALL||n===e.ANY?`bool`:n===e.EQUALS?t.changeComponentType(this.aNode.getNodeType(t),`bool`):this.getInputType(t)}setup(t){let{aNode:n,bNode:r,method:i}=this,a=null;if(i===e.ONE_MINUS)a=U(1,n);else if(i===e.RECIPROCAL)a=$a(1,n);else if(i===e.DIFFERENCE)a=es(U(n,r));else if(i===e.TRANSFORM_DIRECTION){let e,i;t.isMatrix(n.getNodeType(t))?(e=n,i=r):(e=r,i=n),a=Bo(W(e,B(z(i),0)).xyz)}return a===null?super.setup(t):a}generate(t,n){if(t.getNodeProperties(this).outputNode)return super.generate(t,n);let r=this.method,i=this.getNodeType(t),a=this.getInputType(t),o=this.aNode,s=this.bNode,c=this.cNode,l=t.renderer.coordinateSystem;if(r===e.NEGATE)return t.format(`( - `+o.build(t,a)+` )`,i,n);{let u=[];return r===e.CROSS?u.push(o.build(t,i),s.build(t,i)):l===2e3&&r===e.STEP?u.push(o.build(t,t.getTypeLength(o.getNodeType(t))===1?`float`:a),s.build(t,a)):l===2e3&&(r===e.MIN||r===e.MAX)?u.push(o.build(t,a),s.build(t,t.getTypeLength(s.getNodeType(t))===1?`float`:a)):r===e.REFRACT?u.push(o.build(t,a),s.build(t,a),c.build(t,`float`)):r===e.MIX?u.push(o.build(t,a),s.build(t,a),c.build(t,t.getTypeLength(c.getNodeType(t))===1?`float`:a)):(l===2001&&r===e.ATAN&&s!==null&&(r=`atan2`),t.shaderStage!==`fragment`&&(r===e.DFDX||r===e.DFDY)&&(T(`TSL: '${r}' is not supported in the ${t.shaderStage} stage.`,this.stackTrace),r=`/*`+r+`*/`),u.push(o.build(t,a)),s!==null&&u.push(s.build(t,a)),c!==null&&u.push(c.build(t,a))),t.format(`${t.getMethod(r,i)}( ${u.join(`, `)} )`,i,n)}}serialize(e){super.serialize(e),e.method=this.method}deserialize(e){super.deserialize(e),this.method=e.method}};G.ALL=`all`,G.ANY=`any`,G.RADIANS=`radians`,G.DEGREES=`degrees`,G.EXP=`exp`,G.EXP2=`exp2`,G.LOG=`log`,G.LOG2=`log2`,G.SQRT=`sqrt`,G.INVERSE_SQRT=`inversesqrt`,G.FLOOR=`floor`,G.CEIL=`ceil`,G.NORMALIZE=`normalize`,G.FRACT=`fract`,G.SIN=`sin`,G.SINH=`sinh`,G.COS=`cos`,G.COSH=`cosh`,G.TAN=`tan`,G.TANH=`tanh`,G.ASIN=`asin`,G.ASINH=`asinh`,G.ACOS=`acos`,G.ACOSH=`acosh`,G.ATAN=`atan`,G.ATANH=`atanh`,G.ABS=`abs`,G.SIGN=`sign`,G.LENGTH=`length`,G.NEGATE=`negate`,G.ONE_MINUS=`oneMinus`,G.DFDX=`dFdx`,G.DFDY=`dFdy`,G.ROUND=`round`,G.RECIPROCAL=`reciprocal`,G.TRUNC=`trunc`,G.FWIDTH=`fwidth`,G.TRANSPOSE=`transpose`,G.DETERMINANT=`determinant`,G.INVERSE=`inverse`,G.EQUALS=`equals`,G.MIN=`min`,G.MAX=`max`,G.STEP=`step`,G.REFLECT=`reflect`,G.DISTANCE=`distance`,G.DIFFERENCE=`difference`,G.DOT=`dot`,G.CROSS=`cross`,G.POW=`pow`,G.TRANSFORM_DIRECTION=`transformDirection`,G.MIX=`mix`,G.CLAMP=`clamp`,G.REFRACT=`refract`,G.SMOOTHSTEP=`smoothstep`,G.FACEFORWARD=`faceforward`;var So=F(1e-6),Co=F(1e6),wo=F(Math.PI),To=F(Math.PI*2),Eo=F(Math.PI*2),Do=F(Math.PI*.5),Oo=M(G,G.ALL).setParameterLength(1),ko=M(G,G.ANY).setParameterLength(1),Ao=M(G,G.RADIANS).setParameterLength(1),jo=M(G,G.DEGREES).setParameterLength(1),Mo=M(G,G.EXP).setParameterLength(1),No=M(G,G.EXP2).setParameterLength(1),Po=M(G,G.LOG).setParameterLength(1),Fo=M(G,G.LOG2).setParameterLength(1),Io=M(G,G.SQRT).setParameterLength(1),Lo=M(G,G.INVERSE_SQRT).setParameterLength(1),Ro=M(G,G.FLOOR).setParameterLength(1),zo=M(G,G.CEIL).setParameterLength(1),Bo=M(G,G.NORMALIZE).setParameterLength(1),Vo=M(G,G.FRACT).setParameterLength(1),Ho=M(G,G.SIN).setParameterLength(1),Uo=M(G,G.SINH).setParameterLength(1),Wo=M(G,G.COS).setParameterLength(1),Go=M(G,G.COSH).setParameterLength(1),Ko=M(G,G.TAN).setParameterLength(1),qo=M(G,G.TANH).setParameterLength(1),Jo=M(G,G.ASIN).setParameterLength(1),Yo=M(G,G.ASINH).setParameterLength(1),Xo=M(G,G.ACOS).setParameterLength(1),Zo=M(G,G.ACOSH).setParameterLength(1),Qo=M(G,G.ATAN).setParameterLength(1,2),$o=M(G,G.ATANH).setParameterLength(1),es=M(G,G.ABS).setParameterLength(1),ts=M(G,G.SIGN).setParameterLength(1),ns=M(G,G.LENGTH).setParameterLength(1),rs=M(G,G.NEGATE).setParameterLength(1),is=M(G,G.ONE_MINUS).setParameterLength(1),as=M(G,G.DFDX).setParameterLength(1),os=M(G,G.DFDY).setParameterLength(1),ss=M(G,G.ROUND).setParameterLength(1),cs=M(G,G.RECIPROCAL).setParameterLength(1),ls=M(G,G.TRUNC).setParameterLength(1),us=M(G,G.FWIDTH).setParameterLength(1),ds=M(G,G.TRANSPOSE).setParameterLength(1),fs=M(G,G.DETERMINANT).setParameterLength(1),ps=M(G,G.INVERSE).setParameterLength(1),ms=M(G,G.MIN).setParameterLength(2,1/0),hs=M(G,G.MAX).setParameterLength(2,1/0),gs=M(G,G.STEP).setParameterLength(2),_s=M(G,G.REFLECT).setParameterLength(2),vs=M(G,G.DISTANCE).setParameterLength(2),ys=M(G,G.DIFFERENCE).setParameterLength(2),bs=M(G,G.DOT).setParameterLength(2),xs=M(G,G.CROSS).setParameterLength(2),Ss=M(G,G.POW).setParameterLength(2),Cs=e=>W(e,e),ws=e=>W(e,e,e),Ts=e=>W(e,e,e,e),Es=M(G,G.TRANSFORM_DIRECTION).setParameterLength(2),Ds=(e,t)=>Bo(W(t,B(z(e),0)).xyz),Os=(e,t)=>Bo(B(z(e),0).mul(t).xyz),ks=e=>W(ts(e),Ss(es(e),1/3)),As=e=>bs(e,e),K=M(G,G.MIX).setParameterLength(3),js=(e,t=0,n=1)=>new G(G.CLAMP,k(e),k(t),k(n)),Ms=e=>js(e),Ns=M(G,G.REFRACT).setParameterLength(3),Ps=M(G,G.SMOOTHSTEP).setParameterLength(3),Fs=M(G,G.FACEFORWARD).setParameterLength(3),Is=N(([e])=>Vo(Ho(eo(bs(e.xy,R(12.9898,78.233)),wo)).mul(43758.5453))),Ls=(e,t,n)=>K(t,n,e),Rs=(e,t,n)=>Ps(t,n,e),zs=(e,t)=>gs(t,e),Bs=Fs,Vs=Lo;O(`all`,Oo),O(`any`,ko),O(`radians`,Ao),O(`degrees`,jo),O(`exp`,Mo),O(`exp2`,No),O(`log`,Po),O(`log2`,Fo),O(`sqrt`,Io),O(`inverseSqrt`,Lo),O(`floor`,Ro),O(`ceil`,zo),O(`normalize`,Bo),O(`fract`,Vo),O(`sin`,Ho),O(`sinh`,Uo),O(`cos`,Wo),O(`cosh`,Go),O(`tan`,Ko),O(`tanh`,qo),O(`asin`,Jo),O(`asinh`,Yo),O(`acos`,Xo),O(`acosh`,Zo),O(`atan`,Qo),O(`atanh`,$o),O(`abs`,es),O(`sign`,ts),O(`length`,ns),O(`lengthSq`,As),O(`negate`,rs),O(`oneMinus`,is),O(`dFdx`,as),O(`dFdy`,os),O(`round`,ss),O(`reciprocal`,cs),O(`trunc`,ls),O(`fwidth`,us),O(`min`,ms),O(`max`,hs),O(`step`,zs),O(`reflect`,_s),O(`distance`,vs),O(`dot`,bs),O(`cross`,xs),O(`pow`,Ss),O(`pow2`,Cs),O(`pow3`,ws),O(`pow4`,Ts),O(`transformDirection`,Es),O(`transformNormalByViewMatrix`,Ds),O(`transformNormalByInverseViewMatrix`,Os),O(`mix`,Ls),O(`clamp`,js),O(`refract`,Ns),O(`smoothstep`,Rs),O(`faceForward`,Fs),O(`difference`,ys),O(`saturate`,Ms),O(`cbrt`,ks),O(`transpose`,ds),O(`determinant`,fs),O(`inverse`,ps),O(`rand`,Is);var Hs=A(class extends D{static get type(){return`ConditionalNode`}constructor(e,t,n=null){super(),this.condNode=e,this.ifNode=t,this.elseNode=n}generateNodeType(e){let{ifNode:t,elseNode:n}=e.getNodeProperties(this);if(t===void 0)return e.flowBuildStage(this,`setup`),this.getNodeType(e);let r=t.getNodeType(e);if(n!==null){let t=n.getNodeType(e);if(e.getTypeLength(t)>e.getTypeLength(r))return t}return r}setup(e){let t=this.condNode,n=this.ifNode.isolate(),r=this.elseNode?this.elseNode.isolate():null,i=e.context.nodeBlock;e.getDataFromNode(n).parentNodeBlock=i,r!==null&&(e.getDataFromNode(r).parentNodeBlock=i);let a=e.context.uniformFlow,o=e.getNodeProperties(this);o.condNode=t,o.ifNode=a?n:n.context({nodeBlock:n}),o.elseNode=r?a?r:r.context({nodeBlock:r}):null}generate(e,t){let n=this.getNodeType(e),r=e.getDataFromNode(this);if(r.nodeProperty!==void 0)return r.nodeProperty;let{condNode:i,ifNode:a,elseNode:o}=e.getNodeProperties(this),s=e.currentFunctionNode,c=t!==`void`,l=c?oa(n).build(e):``;r.nodeProperty=l;let u=i.build(e,`bool`);if(e.context.uniformFlow&&o!==null){let r=a.build(e,n),i=o.build(e,n),s=e.getTernary(u,r,i);return e.format(s,n,t)}e.addFlowCode(`\n${e.tab}if ( ${u} ) {\n\n`).addFlowTab();let d=a.build(e,n);if(d&&(c?d=l+` = `+d+`;`:(d=`return `+d+`;`,s===null&&(T(`TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.`,this.stackTrace),d=`// `+d))),e.removeFlowTab().addFlowCode(e.tab+`	`+d+`

`+e.tab+`}`),o!==null){e.addFlowCode(` else {

`).addFlowTab();let t=o.build(e,n);t&&(c?t=l+` = `+t+`;`:(t=`return `+t+`;`,s===null&&(T(`TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.`,this.stackTrace),t=`// `+t))),e.removeFlowTab().addFlowCode(e.tab+`	`+t+`

`+e.tab+`}

`)}else e.addFlowCode(`

`);return e.format(l,n,t)}}).setParameterLength(2,3);O(`select`,Hs);var Us=class extends D{static get type(){return`ContextNode`}constructor(e=null,t={}){super(),this.isContextNode=!0,this.node=e,this.value=t}getScope(){return this.node.getScope()}generateNodeType(e){return this.node.getNodeType(e)}getFlowContextData(){let e=[];return this.traverse(t=>{t.isContextNode===!0&&e.push(t.value)}),Object.assign({},...e)}getMemberType(e,t){return this.node.getMemberType(e,t)}analyze(e){let t=e.addContext(this.value);this.node.build(e),e.setContext(t)}setup(e){let t=e.addContext(this.value);this.node.build(e),e.setContext(t)}generate(e,t){let n=e.addContext(this.value),r=this.node.build(e,t);return e.setContext(n),r}},Ws=(e=null,t={})=>{let n=e;return(n===null||n.isNode!==!0)&&(t=n||t,n=null),new Us(n,t)},Gs=e=>Ws(e,{uniformFlow:!0}),Ks=(e,t)=>Ws(e,{nodeName:t});function qs(e,t,n=null){return Ws(n,{getShadow:({light:n,shadowColorNode:r})=>t===n?r.mul(e):r})}function Js(e,t=null){return Ws(t,{getAO:(t,{material:n})=>n.transparent===!0?t:t===null?e:t.mul(e)})}function Ys(e,t){return T(`TSL: "label()" has been deprecated. Use "setName()" instead.`),Ks(e,t)}O(`context`,Ws),O(`label`,Ys),O(`uniformFlow`,Gs),O(`setName`,Ks),O(`builtinShadowContext`,(e,t,n)=>qs(t,n,e)),O(`builtinAOContext`,(e,t)=>Js(t,e));var Xs=class extends D{static get type(){return`VarNode`}constructor(e,t=null,n=!1){super(),this.node=e,this.name=t,this.global=!0,this.isVarNode=!0,this.readOnly=n,this.parents=!0,this.intent=!1}setIntent(e){return this.intent=e,this}isIntent(e){return e.getDataFromNode(this).forceDeclaration!==!0&&this.intent}getIntent(){return this.intent}getMemberType(e,t){return this.node.getMemberType(e,t)}getElementType(e){return this.node.getElementType(e)}generateNodeType(e){return this.node.getNodeType(e)}getArrayCount(e){return this.node.getArrayCount(e)}isAssign(e){return e.getDataFromNode(this).assign}build(...e){let t=e[0],n=this.getShared(t);if(this!==n)return n.build(...e);if(this._hasStack(t)===!1&&t.buildStage===`setup`&&(t.context.nodeLoop||t.context.nodeBlock)){let e=!1;if(this.node.isShaderCallNodeInternal&&this.node.shaderNode.getLayout()===null&&t.fnCall&&t.fnCall.shaderNode&&t.getDataFromNode(this.node.shaderNode).hasLoop){let n=t.getDataFromNode(this);n.forceDeclaration=!0,e=!0}let n=t.getBaseStack();e?n.addToStackBefore(this):n.addToStack(this)}return this.isIntent(t)&&this.isAssign(t)!==!0?this.node.build(...e):super.build(...e)}generate(e){let{node:t,name:n,readOnly:r}=this,{renderer:i}=e,a=i.backend.isWebGPUBackend===!0,o=!1,s=!1;r&&(o=e.isDeterministic(t),s=a?r:o);let c=this.getNodeType(e);if(c==`void`)return this.isIntent(e)!==!0&&C(`TSL: ".toVar()" can not be used with void type.`,this.stackTrace),t.build(e);let l=e.getVectorType(c),u=t.build(e,l),d=e.getVarFromNode(this,n,l,void 0,s),f=e.getPropertyName(d),p=f;if(s){if(a)p=o?`const ${f}`:`let ${f}`;else{let n=t.getArrayCount(e);p=`const ${e.getVar(d.type,f,n)}`}}return e.addLineFlowCode(`${p} = ${u}`,this),f}_hasStack(e){return e.getDataFromNode(this).stack!==void 0}},Zs=A(Xs),Qs=(e,t=null)=>Zs(e,t).toStack(),$s=(e,t=null)=>Zs(e,t,!0).toStack(),ec=e=>Zs(e).setIntent(!0).toStack();O(`toVar`,Qs),O(`toConst`,$s),O(`toVarIntent`,ec);var tc=class extends D{static get type(){return`SubBuild`}constructor(e,t,n=null){super(n),this.node=e,this.name=t,this.isSubBuildNode=!0}generateNodeType(e){if(this.nodeType!==null)return this.nodeType;e.addSubBuild(this.name);let t=this.node.getNodeType(e);return e.removeSubBuild(),t}build(e,...t){e.addSubBuild(this.name);let n=this.node.build(e,...t);return e.removeSubBuild(),n}},nc=(e,t,n=null)=>new tc(k(e),t,n),rc=A(class extends D{static get type(){return`VaryingNode`}constructor(e,t=null){super(),this.node=nc(e,`VERTEX`),this.name=t,this.isVaryingNode=!0,this.interpolationType=null,this.interpolationSampling=null,this.global=!0}setInterpolation(e,t=null){return this.interpolationType=e,this.interpolationSampling=t,this}getHash(e){return this.name||super.getHash(e)}generateNodeType(e){return this.node.getNodeType(e)}setupVarying(e){let t=e.getNodeProperties(this),n=t.varying;if(n===void 0){let r=this.name,i=this.getNodeType(e),a=this.interpolationType,o=this.interpolationSampling;t.varying=n=e.getVaryingFromNode(this,r,i,a,o),t.node=nc(this.node,`VERTEX`)}return n.needsInterpolation||(n.needsInterpolation=e.shaderStage===`fragment`),n}setup(e){this.setupVarying(e),e.flowNodeFromShaderStage(Ar.VERTEX,this.node)}analyze(e){this.setupVarying(e),e.flowNodeFromShaderStage(Ar.VERTEX,this.node)}generate(e){let t=e.getSubBuildProperty(`property`,e.currentStack),n=e.getNodeProperties(this),r=this.setupVarying(e);if(n[t]===void 0){let i=this.getNodeType(e),a=e.getPropertyName(r,Ar.VERTEX);if(e.shaderStage===Ar.VERTEX){let t=n.node.build(e,i);e.addLineFlowCode(`${a} = ${t}`,this)}else e.flowNodeFromShaderStage(Ar.VERTEX,n.node,i,a);n[t]=a}return e.getPropertyName(r)}}).setParameterLength(1,2),ic=e=>rc(e);O(`toVarying`,rc),O(`toVertexStage`,ic);var ac=N(([e])=>K(e.mul(.9478672986).add(.0521327014).pow(2.4),e.mul(.0773993808),e.lessThanEqual(.04045))).setLayout({name:`sRGBTransferEOTF`,type:`vec3`,inputs:[{name:`color`,type:`vec3`}]}),oc=N(([e])=>K(e.pow(.41666).mul(1.055).sub(.055),e.mul(12.92),e.lessThanEqual(.0031308))).setLayout({name:`sRGBTransferOETF`,type:`vec3`,inputs:[{name:`color`,type:`vec3`}]}),sc=`WorkingColorSpace`,cc=`OutputColorSpace`,lc=class extends Vr{static get type(){return`ColorSpaceNode`}constructor(e,t,n){super(`vec4`),this.colorNode=e,this.source=t,this.target=n}resolveColorSpace(e,t){return t===sc?Cn.workingColorSpace:t===cc?e.context.outputColorSpace||e.renderer.outputColorSpace:t}setup(e){let{colorNode:t}=this,n=this.resolveColorSpace(e,this.source),r=this.resolveColorSpace(e,this.target),i=t;return Cn.enabled===!1||n===r||!n||!r?i:(Cn.getTransfer(n)===`srgb`&&(i=B(ac(i.rgb),i.a)),Cn.getPrimaries(n)!==Cn.getPrimaries(r)&&(i=B($i(Cn._getMatrix(new On,n,r)).mul(i.rgb),i.a)),Cn.getTransfer(r)===`srgb`&&(i=B(oc(i.rgb),i.a)),i)}},uc=(e,t)=>new lc(k(e),sc,t),dc=(e,t)=>new lc(k(e),t,sc),fc=(e,t,n)=>new lc(k(e),t,n);O(`workingToColorSpace`,uc),O(`colorSpaceToWorking`,dc);var pc=class extends zr{static get type(){return`ReferenceElementNode`}constructor(e,t){super(e,t),this.referenceNode=e,this.isReferenceElementNode=!0}generateNodeType(){return this.referenceNode.uniformType}generate(e){let t=super.generate(e),n=this.referenceNode.getNodeType(),r=this.getNodeType();return e.format(t,n,r)}},mc=class extends D{static get type(){return`ReferenceBaseNode`}constructor(e,t,n=null,r=null){super(),this.property=e,this.uniformType=t,this.object=n,this.count=r,this.properties=e.split(`.`),this.reference=n,this.node=null,this.group=null,this.updateType=E.OBJECT}setGroup(e){return this.group=e,this}element(e){return new pc(this,k(e))}setNodeType(e){let t=H(null,e);this.group!==null&&t.setGroup(this.group),this.node=t}generateNodeType(e){return this.node===null&&(this.updateReference(e),this.updateValue()),this.node.getNodeType(e)}getValueFromReference(e=this.reference){let{properties:t}=this,n=e[t[0]];for(let e=1;e<t.length;e++)n=n[t[e]];return n}updateReference(e){return this.reference=this.object===null?e.object:this.object,this.reference}setup(){return this.updateValue(),this.node}update(){this.updateValue()}updateValue(){this.node===null&&this.setNodeType(this.uniformType);let e=this.getValueFromReference();Array.isArray(e)?this.node.array=e:this.node.value=e}},hc=(e,t,n)=>new mc(e,t,n),gc=class extends mc{static get type(){return`RendererReferenceNode`}constructor(e,t,n=null){super(e,t,n),this.renderer=n,this.setGroup(V)}updateReference(e){return this.reference=this.renderer===null?e.renderer:this.renderer,this.reference}},_c=(e,t,n=null)=>new gc(e,t,n),vc=class extends Vr{static get type(){return`ToneMappingNode`}constructor(e,t=bc,n=null){super(`vec3`),this._toneMapping=e,this.exposureNode=t,this.colorNode=n}customCacheKey(){return _r(this._toneMapping)}setToneMapping(e){return this._toneMapping=e,this}getToneMapping(){return this._toneMapping}setup(e){let t=this.colorNode||e.context.color,n=this._toneMapping;if(n===0)return t;let r=null,i=e.renderer.library.getToneMappingFunction(n);return i===null?(C(`ToneMappingNode: Unsupported Tone Mapping configuration.`,n),r=t):r=B(i(t.rgb,this.exposureNode),t.a),r}},yc=(e,t,n)=>new vc(e,k(t),k(n)),bc=_c(`toneMappingExposure`,`float`);O(`toneMapping`,(e,t,n)=>yc(t,n,e));var xc=new WeakMap;function Sc(e,t){let n=xc.get(e);return n===void 0&&(n=new Qt(e,t),xc.set(e,n)),n}var Cc=class extends qr{static get type(){return`BufferAttributeNode`}constructor(e,t=null,n=0,r=0){super(e,t),this.isBufferNode=!0,this.bufferType=t,this.bufferStride=n,this.bufferOffset=r,this.usage=ie,this.instanced=!1,this.attribute=null,this.global=!0,e&&e.isBufferAttribute===!0&&e.itemSize<=4&&(this.attribute=e,this.usage=e.usage,this.instanced=e.isInstancedBufferAttribute)}getHash(e){let t;if(this.bufferStride===0&&this.bufferOffset===0){let n=e.globalCache.getData(this.value);n===void 0&&(n={node:this},e.globalCache.setData(this.value,n)),t=n.node.id}else t=this.id;return String(t)}generateNodeType(e){return this.bufferType===null&&(this.bufferType=e.getTypeFromAttribute(this.attribute)),this.bufferType}setup(e){if(this.attribute!==null)return;let t=this.getNodeType(e),n=e.getTypeLength(t),r=this.value,i=this.bufferStride||n,a=this.bufferOffset,o;o=r.isInterleavedBuffer===!0?r:r.isBufferAttribute===!0?Sc(r.array,i):Sc(r,i);let s=new ye(o,n,a);o.setUsage(this.usage),this.attribute=s,this.attribute.isInstancedBufferAttribute=this.instanced}generate(e){let t=this.getNodeType(e),n=e.context.nodeName;n!==void 0&&delete e.context.nodeName;let r=e.getBufferAttributeFromNode(this,t,n),i=e.getPropertyName(r),a=null;if(e.shaderStage===`vertex`||e.shaderStage===`compute`)this.name=i,a=i;else{let r;n&&(r=n+`Varying`),a=rc(this,r).build(e,t)}return a}getInputType(){return`bufferAttribute`}setUsage(e){return this.usage=e,this.attribute&&this.attribute.isBufferAttribute===!0&&(this.attribute.usage=e),this}setInstanced(e){return this.instanced=e,this}};function wc(e,t=null,n=0,r=0,i=ie,a=!1){return t===`mat3`||t===null&&e.itemSize===9?$i(new Cc(e,`vec3`,9,0).setUsage(i).setInstanced(a),new Cc(e,`vec3`,9,3).setUsage(i).setInstanced(a),new Cc(e,`vec3`,9,6).setUsage(i).setInstanced(a)):t===`mat4`||t===null&&e.itemSize===16?ea(new Cc(e,`vec4`,16,0).setUsage(i).setInstanced(a),new Cc(e,`vec4`,16,4).setUsage(i).setInstanced(a),new Cc(e,`vec4`,16,8).setUsage(i).setInstanced(a),new Cc(e,`vec4`,16,12).setUsage(i).setInstanced(a)):new Cc(e,t,n,r).setUsage(i)}var Tc=(e,t=null,n=0,r=0)=>wc(e,t,n,r),Ec=(e,t=null,n=0,r=0)=>wc(e,t,n,r,on),Dc=(e,t=null,n=0,r=0)=>wc(e,t,n,r,ie,!0),Oc=(e,t=null,n=0,r=0)=>wc(e,t,n,r,on,!0);O(`toAttribute`,e=>Tc(e.value));var kc=class e extends D{static get type(){return`IndexNode`}constructor(e){super(`uint`),this.scope=e,this.isIndexNode=!0}generate(t){let n=this.getNodeType(t),r=this.scope,i;if(r===e.VERTEX)i=t.getVertexIndex();else if(r===e.INSTANCE)i=t.getInstanceIndex();else if(r===e.DRAW)i=t.getDrawIndex();else if(r===e.INVOCATION_LOCAL)i=t.getInvocationLocalIndex();else if(r===e.INVOCATION_SUBGROUP)i=t.getInvocationSubgroupIndex();else if(r===e.SUBGROUP)i=t.getSubgroupIndex();else throw Error(`THREE.IndexNode: Unknown scope: `+r);let a;return a=t.shaderStage===`vertex`||t.shaderStage===`compute`?i:rc(this).build(t,n),a}};kc.VERTEX=`vertex`,kc.INSTANCE=`instance`,kc.SUBGROUP=`subgroup`,kc.INVOCATION_LOCAL=`invocationLocal`,kc.INVOCATION_SUBGROUP=`invocationSubgroup`,kc.DRAW=`draw`;var Ac=j(kc,kc.VERTEX),jc=j(kc,kc.INSTANCE),Mc=j(kc,kc.SUBGROUP),Nc=j(kc,kc.INVOCATION_SUBGROUP),Pc=j(kc,kc.INVOCATION_LOCAL),Fc=j(kc,kc.DRAW),Ic=class extends D{static get type(){return`ComputeNode`}constructor(e,t){super(`void`),this.isComputeNode=!0,this.computeNode=e,this.workgroupSize=t,this.count=null,this.dispatchSize=null,this.version=1,this.name=``,this.updateBeforeType=E.OBJECT,this.onInitFunction=null,this.countNode=null}dispose(){this.dispatchEvent({type:`dispose`})}setName(e){return this.name=e,this}label(e){return T(`TSL: "label()" has been deprecated. Use "setName()" instead.`,new pr),this.setName(e)}onInit(e){return this.onInitFunction=e,this}updateBefore({renderer:e}){e.compute(this)}setup(e){this.count!==null&&this.countNode===null&&(this.countNode=H(this.count,`uint`).onObjectUpdate(()=>this.count));let t=this.computeNode.build(e);if(t){let n=e.getNodeProperties(this);n.outputComputeNode=t.outputNode,t.outputNode=null}return t}generate(e,t){let{shaderStage:n}=e;if(n===`compute`){let t=this.computeNode.build(e,`void`);if(t!==``&&e.addLineFlowCode(t,this),this.count!==null&&e.allowEarlyReturns===!0){let t=this.countNode.build(e,`uint`),n=jc.build(e,`uint`);e.flow.code=`${e.tab}if ( ${n} >= ${t} ) { return; }\n\n${e.flow.code}`}}else{let n=e.getNodeProperties(this).outputComputeNode;if(n)return n.build(e,t)}}},Lc=(e,t=[64])=>{(t.length===0||t.length>3)&&C(`TSL: compute() workgroupSize must have 1, 2, or 3 elements`,new pr);for(let e=0;e<t.length;e++){let n=t[e];(typeof n!=`number`||n<=0||!Number.isInteger(n))&&C(`TSL: compute() workgroupSize element at index [ ${e} ] must be a positive integer`,new pr)}for(;t.length<3;)t.push(1);return new Ic(k(e),t)},Rc=(e,t,n)=>{let r=Lc(e,n);return typeof t==`number`?r.count=t:r.dispatchSize=t,r};O(`compute`,Rc),O(`computeKernel`,Lc);var zc=class extends D{static get type(){return`IsolateNode`}constructor(e,t=!0){super(),this.node=e,this.parent=t,this.isIsolateNode=!0}generateNodeType(e){let t=e.getCache(),n=e.getCacheFromNode(this,this.parent);e.setCache(n);let r=this.node.getNodeType(e);return e.setCache(t),r}build(e,...t){let n=e.getCache(),r=e.getCacheFromNode(this,this.parent);e.setCache(r);let i=this.node.build(e,...t);return e.setCache(n),i}setParent(e){return this.parent=e,this}getParent(){return this.parent}},Bc=e=>new zc(k(e));function Vc(e,t=!0){return T(`TSL: "cache()" has been deprecated. Use "isolate()" instead.`),Bc(e).setParent(t)}O(`cache`,Vc),O(`isolate`,Bc);var Hc=A(class extends D{static get type(){return`BypassNode`}constructor(e,t){super(),this.isBypassNode=!0,this.outputNode=e,this.callNode=t}generateNodeType(e){return this.outputNode.getNodeType(e)}generate(e){let t=this.callNode.build(e,`void`);return t!==``&&e.addLineFlowCode(t,this),this.outputNode.build(e)}}).setParameterLength(2);O(`bypass`,Hc);var Uc=N(([e,t,n,r=F(0),i=F(1),a=Hi(!1)])=>{let o=e.sub(t).div(n.sub(t));return Oi(a)&&(o=o.clamp()),o.mul(i.sub(r)).add(r)});function Wc(e,t,n,r=F(0),i=F(1)){return Uc(e,t,n,r,i,!0)}O(`remap`,Uc),O(`remapClamp`,Wc);var Gc=class extends D{static get type(){return`ExpressionNode`}constructor(e=``,t=`void`){super(t),this.snippet=e}generate(e,t){let n=this.getNodeType(e),r=this.snippet;if(n===`void`)e.addLineFlowCode(r,this);else return e.format(r,n,t)}},Kc=A(Gc).setParameterLength(1,2),qc=e=>(e?Hs(e,Kc(`discard`)):Kc(`discard`)).toStack(),Jc=()=>Kc(`return`).toStack();O(`discard`,qc);var Yc=N(([e])=>B(e.rgb.mul(e.a),e.a),{color:`vec4`,return:`vec4`}),Xc=N(([e])=>e.a.equal(0).select(B(0),B(e.rgb.div(e.a),e.a)),{color:`vec4`,return:`vec4`}),Zc=class extends Vr{static get type(){return`RenderOutputNode`}constructor(e,t,n){super(`vec4`),this.colorNode=e,this._toneMapping=t,this.outputColorSpace=n,this.isRenderOutputNode=!0}setToneMapping(e){return this._toneMapping=e,this}getToneMapping(){return this._toneMapping}setup({context:e}){let t=this.colorNode||e.color;t=B(t.rgb,t.a.clamp(0,1)),t=Xc(t);let n=(this._toneMapping===null?e.toneMapping:this._toneMapping)||0,r=(this.outputColorSpace===null?e.outputColorSpace:this.outputColorSpace)||``;return n!==0&&(t=t.toneMapping(n)),r!==``&&r!==Cn.workingColorSpace&&(t=t.workingToColorSpace(r)),t=Yc(t),t}},Qc=(e,t=null,n=null)=>new Zc(k(e),t,n);O(`renderOutput`,Qc);var $c=class extends Vr{static get type(){return`DebugNode`}constructor(e,t=null){super(),this.node=e,this.callback=t}generateNodeType(e){return this.node.getNodeType(e)}setup(e){return this.node.build(e)}analyze(e){return this.node.build(e)}generate(e){let t=this.callback,n=this.node.build(e);if(t!==null)t(e,n);else{let t=`--- TSL debug - `+e.shaderStage+` shader ---`,r=`-`.repeat(t.length),i=``;i+=`// #`+t+`#
`,i+=e.flow.code.replace(/^\t/gm,``)+`
`,i+=`/* ... */ `+n+` /* ... */
`,i+=`// #`+r+`#
`,st(i)}return n}},el=(e,t=null)=>new $c(k(e),t).toStack();O(`debug`,el);var tl=class extends Dt{constructor(){super(),this._renderer=null,this.currentFrame=null}get nodeFrame(){return this._renderer._nodes.nodeFrame}setRenderer(e){return this._renderer=e,this}getRenderer(){return this._renderer}init(){}begin(){}finish(){}inspect(){}computeAsync(){}beginCompute(){}finishCompute(){}beginRender(){}finishRender(){}copyTextureToTexture(){}copyFramebufferToTexture(){}},nl=class extends D{static get type(){return`InspectorNode`}constructor(e,t=``,n=null){super(),this.node=e,this.name=t,this.callback=n,this.updateType=E.FRAME,this.isInspectorNode=!0}getName(){return this.name||this.node.name}update(e){e.renderer.inspector.inspect(this)}generateNodeType(e){return this.node.getNodeType(e)}setup(e){let t=this.node;return e.context.inspector===!0&&this.callback!==null&&(t=this.callback(t)),e.renderer.backend.isWebGPUBackend!==!0&&e.renderer.inspector.constructor!==tl&&Qn(`TSL: ".toInspector()" is only available with WebGPU.`),t}};function rl(e,t=``,n=null){return e=k(e),e.before(new nl(e,t,n))}O(`toInspector`,rl);function il(e){T(`TSL: AddNodeElement has been removed in favor of tree-shaking. Trying add`,e)}var al=class extends D{static get type(){return`AttributeNode`}constructor(e,t=null){super(t),this.global=!0,this._attributeName=e}getHash(e){return this.getAttributeName(e)}generateNodeType(e){let t=this.nodeType;if(t===null){let n=this.getAttributeName(e);if(e.hasGeometryAttribute(n)){let r=e.geometry.getAttribute(n);t=e.getTypeFromAttribute(r)}else t=`float`}return t}setAttributeName(e){return this._attributeName=e,this}getAttributeName(){return this._attributeName}generate(e){let t=this.getAttributeName(e),n=this.getNodeType(e);if(e.hasGeometryAttribute(t)===!0){let r=e.geometry.getAttribute(t),i=e.getTypeFromAttribute(r),a=e.getAttribute(t,i);return e.shaderStage===`vertex`?e.format(a.name,i,n):rc(this).build(e,n)}return T(`AttributeNode: Vertex attribute "${t}" not found on geometry.`),e.generateConst(n)}serialize(e){super.serialize(e),e.global=this.global,e._attributeName=this._attributeName}deserialize(e){super.deserialize(e),this.global=e.global,this._attributeName=e._attributeName}},ol=(e,t=null)=>new al(e,t),sl=(e=0)=>ol(`uv`+(e>0?e:``),`vec2`),cl=A(class extends D{static get type(){return`TextureSizeNode`}constructor(e,t=null){super(`uvec2`),this.isTextureSizeNode=!0,this.textureNode=e,this.levelNode=t}generate(e,t){let n=this.textureNode.build(e,`property`),r=this.levelNode===null?`0`:this.levelNode.build(e,`int`);return e.format(`${e.getMethod(`textureDimensions`)}( ${n}, ${r} )`,this.getNodeType(e),t)}}).setParameterLength(1,2),ll=A(class extends Wa{static get type(){return`MaxMipLevelNode`}constructor(e){super(0),this._textureNode=e,this.updateType=E.FRAME}get textureNode(){return this._textureNode}get texture(){return this._textureNode.value}update(){let e=this.texture,t=e.images,n=t&&t.length>0?t[0]&&t[0].image||t[0]:e.image;if(n&&n.width!==void 0){let{width:e,height:t}=n;this.value=Math.log2(Math.max(e,t))}}}).setParameterLength(1),ul=class extends Error{constructor(e,t=null){super(e),this.name=`NodeError`,this.stackTrace=t}},dl=new Je,fl=class extends Wa{static get type(){return`TextureNode`}constructor(e=dl,t=null,n=null,r=null){super(e),this.isTextureNode=!0,this.uvNode=t,this.levelNode=n,this.biasNode=r,this.compareNode=null,this.depthNode=null,this.gradNode=null,this.gatherNode=null,this.offsetNode=null,this.sampler=!0,this.updateMatrix=!1,this.updateType=E.NONE,this.referenceNode=null,this._value=e,this._matrixUniform=null,this._flipYUniform=null,this.setUpdateMatrix(t===null)}set value(e){this.referenceNode?this.referenceNode.value=e:this._value=e}get value(){return this.referenceNode?this.referenceNode.value:this._value}getUniformHash(){return this.value.uuid}generateNodeType(){return this.value.isDepthTexture===!0?this.gatherNode===null?`float`:`vec4`:this.value.type===1014?`uvec4`:this.value.type===1013?`ivec4`:`vec4`}getInputType(){return`texture`}getDefaultUV(){return sl(this.value.channel)}updateReference(){return this.value}getTransformedUV(e){return this._matrixUniform===null&&(this._matrixUniform=H(this.value.matrix)),this._matrixUniform.mul(z(e,1)).xy}setUpdateMatrix(e){return this.updateMatrix=e,this}setupUV(e,t){return e.isFlipY()&&(this._flipYUniform===null&&(this._flipYUniform=H(!1)),t=t.toVar(),t=this.sampler?this._flipYUniform.select(t.flipY(),t):this._flipYUniform.select(t.setY(I(cl(this,this.levelNode).y).sub(t.y).sub(1)),t)),t}setup(e){let t=e.getNodeProperties(this);t.referenceNode=this.referenceNode;let n=this.value;if(!n||n.isTexture!==!0)throw new ul("THREE.TSL: `texture( value )` function expects a valid instance of THREE.Texture().",this.stackTrace);let r=N(()=>{let t=this.uvNode;return(t===null||e.context.forceUVContext===!0)&&e.context.getUV&&(t=e.context.getUV(this,e)),t||=this.getDefaultUV(),this.updateMatrix===!0&&(t=this.getTransformedUV(t)),t=this.setupUV(e,t),this.updateType=this._matrixUniform!==null||this._flipYUniform!==null?E.OBJECT:E.NONE,t})(),i=this.levelNode;i===null&&e.context.getTextureLevel&&(i=e.context.getTextureLevel(this));let a=null,o=null;if(this.compareNode!==null){if(e.renderer.hasCompatibility(ce.TEXTURE_COMPARE))a=this.compareNode;else{let e=n.compareFunction;e===null||e===513||e===515||e===516||e===518?o=this.compareNode:(a=this.compareNode,Qn(`TSL: Only "LessCompare", "LessEqualCompare", "GreaterCompare" and "GreaterEqualCompare" are supported for depth texture comparison fallback.`))}}t.uvNode=r,t.levelNode=i,t.biasNode=this.biasNode,t.compareNode=a,t.compareStepNode=o,t.gradNode=this.gradNode,t.gatherNode=this.gatherNode,t.depthNode=this.depthNode,t.offsetNode=this.offsetNode}generateUV(e,t){return t.build(e,this.sampler===!0?`vec2`:`ivec2`)}generateOffset(e,t){return t.build(e,`ivec2`)}generateSnippet(e,t,n,r,i,a,o,s,c,l,u){let d=this.value,f;return f=i?e.generateTextureBias(d,t,n,i,a,l):s?e.generateTextureGrad(d,t,n,s,a,l):c?o?e.generateTextureGatherCompare(d,t,n,o,a,l,u):e.generateTextureGather(d,t,n,c,a,l,u):o?e.generateTextureCompare(d,t,n,o,a,l):this.sampler===!1?e.generateTextureLoad(d,t,n,r,a,l):r?e.generateTextureLevel(d,t,n,r,a,l):e.generateTexture(d,t,n,a,l),f}generate(e,t){let n=this.value,r=e.getNodeProperties(this),i=super.generate(e,`property`);if(/^sampler/.test(t))return i+`_sampler`;if(e.isReference(t))return i;{let a=e.getDataFromNode(this),o=this.getNodeType(e),s=a.propertyName;if(s===void 0){let{uvNode:t,levelNode:c,biasNode:l,compareNode:u,compareStepNode:d,depthNode:f,gradNode:p,gatherNode:m,offsetNode:h}=r,g=this.generateUV(e,t),_=c?c.build(e,`float`):null,v=l?l.build(e,`float`):null,y=f?f.build(e,`int`):null,b=u?u.build(e,`float`):null,x=d?d.build(e,`float`):null,S=p?[p[0].build(e,`vec2`),p[1].build(e,`vec2`)]:null,ee=m?m.build(e,`int`):null,te=h?this.generateOffset(e,h):null,ne=this._flipYUniform?this._flipYUniform.build(e,`bool`):null;ee&&(o=`vec4`);let re=y;re===null&&n.isArrayTexture&&this.isTexture3DNode!==!0&&(re=`0`);let ie=e.getVarFromNode(this);s=e.getPropertyName(ie);let ae=this.generateSnippet(e,i,g,_,v,re,b,S,ee,te,ne);if(x!==null){let t=n.compareFunction;ae=t===516||t===518?gs(Kc(ae,o),Kc(x,`float`)).build(e,o):gs(Kc(x,`float`),Kc(ae,o)).build(e,o)}e.addLineFlowCode(`${s} = ${ae}`,this),a.snippet=ae,a.propertyName=s}let c=s;return e.needsToWorkingColorSpace(n)&&(c=dc(Kc(c,o),n.colorSpace).setup(e).build(e,o)),e.format(c,o,t)}}setSampler(e){return this.sampler=e,this}getSampler(){return this.sampler}sample(e){let t=this.clone();return t.uvNode=k(e),t.referenceNode=this.getBase(),k(t)}load(e){return this.sample(e).setSampler(!1)}blur(e){let t=this.clone();t.biasNode=k(e).mul(ll(t)),t.referenceNode=this.getBase();let n=t.value;return t.generateMipmaps===!1&&(n&&n.generateMipmaps===!1||n.minFilter===1003||n.magFilter===1003)&&(T(`TSL: texture().blur() requires mipmaps and sampling. Use .generateMipmaps=true and .minFilter/.magFilter=THREE.LinearFilter in the Texture.`),t.biasNode=null),k(t)}level(e){let t=this.clone();return t.levelNode=k(e),t.referenceNode=this.getBase(),k(t)}size(e){return cl(this,e)}bias(e){let t=this.clone();return t.biasNode=k(e),t.referenceNode=this.getBase(),k(t)}getBase(){return this.referenceNode?this.referenceNode.getBase():this}compare(e){let t=this.clone();return t.compareNode=k(e),t.referenceNode=this.getBase(),k(t)}grad(e,t){let n=this.clone();return n.gradNode=[k(e),k(t)],n.referenceNode=this.getBase(),k(n)}gather(e=0){let t=this.clone();return t.gatherNode=k(e),t.referenceNode=this.getBase(),k(t)}depth(e){let t=this.clone();return t.depthNode=k(e),t.referenceNode=this.getBase(),k(t)}offset(e){let t=this.clone();return t.offsetNode=k(e),t.referenceNode=this.getBase(),k(t)}serialize(e){super.serialize(e),e.value=this.value.toJSON(e.meta).uuid,e.sampler=this.sampler,e.updateMatrix=this.updateMatrix,e.updateType=this.updateType}deserialize(e){super.deserialize(e),this.value=e.meta.textures[e.value],this.sampler=e.sampler,this.updateMatrix=e.updateMatrix,this.updateType=e.updateType}update(){let e=this.value,t=this._matrixUniform;t!==null&&(t.value=e.matrix),e.matrixAutoUpdate===!0&&e.updateMatrix();let n=this._flipYUniform;n!==null&&(n.value=e.image instanceof ImageBitmap&&e.flipY===!0||e.isRenderTargetTexture===!0||e.isFramebufferTexture===!0||e.isDepthTexture===!0)}clone(){let e=new this.constructor(this.value,this.uvNode,this.levelNode,this.biasNode);return e.sampler=this.sampler,e.depthNode=this.depthNode,e.compareNode=this.compareNode,e.gradNode=this.gradNode,e.gatherNode=this.gatherNode,e.offsetNode=this.offsetNode,e}},pl=A(fl).setParameterLength(1,4).setName(`texture`),q=(e=dl,t=null,n=null,r=null)=>{let i;return e&&e.isTextureNode===!0?(i=k(e.clone()),i.referenceNode=e.getBase(),t!==null&&(i.uvNode=k(t)),n!==null&&(i.levelNode=k(n)),r!==null&&(i.biasNode=k(r))):i=pl(e,t,n,r),i},ml=(e=dl)=>q(e),hl=(...e)=>q(...e).setSampler(!1),gl=(e,t,n)=>q(e,t).level(n),_l=e=>(e.isNode===!0?e:q(e)).convert(`sampler`),vl=e=>(e.isNode===!0?e:q(e)).convert(`samplerComparison`),yl=class extends Wa{static get type(){return`BufferNode`}constructor(e,t,n=0){super(e,t),this.isBufferNode=!0,this.bufferType=t,this.bufferCount=n,this.updateRanges=[]}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}getElementType(e){return this.getNodeType(e)}getInputType(){return`buffer`}},bl=(e,t,n)=>new yl(e,t,n),xl=class extends zr{static get type(){return`UniformArrayElementNode`}constructor(e,t){super(e,t),this.isArrayBufferElementNode=!0}generate(e){let t=super.generate(e),n=this.getNodeType(e),r=this.node.getPaddedType();return e.format(t,r,n)}},Sl=class extends yl{static get type(){return`UniformArrayNode`}constructor(e,t=null){super(null),this.array=e,this.elementType=t===null?Tr(e[0]):t,this.paddedType=this.getPaddedType(),this.updateType=E.RENDER,this.isArrayBufferNode=!0}generateNodeType(){return this.paddedType}getElementType(){return this.elementType}getPaddedType(){let e=this.elementType,t=`vec4`;return e===`mat2`?t=`mat2`:/mat/.test(e)===!0?t=`mat4`:e.charAt(0)===`i`?t=`ivec4`:e.charAt(0)===`u`&&(t=`uvec4`),t}update(){let{array:e,value:t}=this,n=this.elementType;if(n===`float`||n===`int`||n===`uint`)for(let n=0;n<e.length;n++){let r=n*4;t[r]=e[n]}else if(n===`color`)for(let n=0;n<e.length;n++){let r=n*4,i=e[n];t[r]=i.r,t[r+1]=i.g,t[r+2]=i.b||0}else if(n===`mat2`)for(let n=0;n<e.length;n++){let r=n*4,i=e[n];t[r]=i.elements[0],t[r+1]=i.elements[1],t[r+2]=i.elements[2],t[r+3]=i.elements[3]}else if(n===`mat3`)for(let n=0;n<e.length;n++){let r=n*16,i=e[n];t[r]=i.elements[0],t[r+1]=i.elements[1],t[r+2]=i.elements[2],t[r+4]=i.elements[3],t[r+5]=i.elements[4],t[r+6]=i.elements[5],t[r+8]=i.elements[6],t[r+9]=i.elements[7],t[r+10]=i.elements[8],t[r+15]=1}else if(n===`mat4`)for(let n=0;n<e.length;n++){let r=n*16,i=e[n];for(let e=0;e<i.elements.length;e++)t[r+e]=i.elements[e]}else for(let n=0;n<e.length;n++){let r=n*4,i=e[n];t[r]=i.x,t[r+1]=i.y,t[r+2]=i.z||0,t[r+3]=i.w||0}}setup(e){let t=this.array.length,n=this.elementType,r=Float32Array,i=this.paddedType,a=e.getTypeLength(i);return n.charAt(0)===`i`&&(r=Int32Array),n.charAt(0)===`u`&&(r=Uint32Array),this.value=new r(t*a),this.bufferCount=t,this.bufferType=i,this.update(),super.setup(e)}element(e){return new xl(this,k(e))}},Cl=(e,t)=>new Sl(e,t),wl=A(class extends D{constructor(e){super(`float`),this.name=e,this.isBuiltinNode=!0}generate(){return this.name}}).setParameterLength(1),Tl,El,Dl=class e extends D{static get type(){return`ScreenNode`}constructor(e){super(),this.scope=e,this._output=null,this.isViewportNode=!0}generateNodeType(){return this.scope===e.DPR?`float`:this.scope===e.VIEWPORT?`vec4`:`vec2`}getUpdateType(){let t=E.NONE;return(this.scope===e.SIZE||this.scope===e.VIEWPORT||this.scope===e.DPR)&&(t=E.RENDER),this.updateType=t,t}update({renderer:t}){let n=t.getRenderTarget();this.scope===e.VIEWPORT?n===null?(t.getViewport(El),El.multiplyScalar(t.getPixelRatio())):El.copy(n.viewport):this.scope===e.DPR?this._output.value=t.getPixelRatio():n===null?t.getDrawingBufferSize(Tl):(Tl.width=n.width,Tl.height=n.height)}setup(){let t=this.scope,n=null;return n=t===e.SIZE?H(Tl||=new hn):t===e.VIEWPORT?H(El||=new bt):t===e.DPR?H(1):R(jl.div(Al)),this._output=n,n}generate(t){if(this.scope===e.COORDINATE){let e=t.getFragCoord();if(t.isFlipY()){let n=t.getNodeProperties(Al).outputNode.build(t);e=`${t.getType(`vec2`)}( ${e}.x, ${n}.y - ${e}.y )`}return e}return super.generate(t)}};Dl.COORDINATE=`coordinate`,Dl.VIEWPORT=`viewport`,Dl.SIZE=`size`,Dl.UV=`uv`,Dl.DPR=`dpr`;var Ol=j(Dl,Dl.DPR),kl=j(Dl,Dl.UV),Al=j(Dl,Dl.SIZE),jl=j(Dl,Dl.COORDINATE),Ml=j(Dl,Dl.VIEWPORT),Nl=Ml.zw,Pl=jl.sub(Ml.xy),Fl=Pl.div(Nl),Il=N(()=>(T(`TSL: "viewportResolution" is deprecated. Use "screenSize" instead.`,new pr),Al),`vec2`).once()(),Ll=null,Rl=null,zl=null,Bl=null,Vl=null,Hl=null,Ul=null,Wl=null,Gl=null,Kl=null,ql=null,Jl=null,Yl=null,Xl=null,Zl=H(0,`uint`).setName(`u_cameraIndex`).setGroup(Va(`cameraIndex`)).toVarying(`v_cameraIndex`),Ql=H(`float`).setName(`cameraNear`).setGroup(V).onRenderUpdate(({camera:e})=>e.near),$l=H(`float`).setName(`cameraFar`).setGroup(V).onRenderUpdate(({camera:e})=>e.far),eu=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.projectionMatrix);Rl===null?Rl=Cl(n).setGroup(V).setName(`cameraProjectionMatrices`):Rl.array=n,t=Rl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else Ll===null&&(Ll=H(e.projectionMatrix).setName(`cameraProjectionMatrix`).setGroup(V).onRenderUpdate(({camera:e})=>e.projectionMatrix)),t=Ll;return t}).once()(),tu=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.projectionMatrixInverse);Bl===null?Bl=Cl(n).setGroup(V).setName(`cameraProjectionMatricesInverse`):Bl.array=n,t=Bl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else zl===null&&(zl=H(e.projectionMatrixInverse).setName(`cameraProjectionMatrixInverse`).setGroup(V).onRenderUpdate(({camera:e})=>e.projectionMatrixInverse)),t=zl;return t}).once()(),nu=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.matrixWorldInverse);Hl===null?Hl=Cl(n).setGroup(V).setName(`cameraViewMatrices`):Hl.array=n,t=Hl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else Vl===null&&(Vl=H(e.matrixWorldInverse).setName(`cameraViewMatrix`).setGroup(V).onRenderUpdate(({camera:e})=>e.matrixWorldInverse)),t=Vl;return t}).once()(),ru=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.matrixWorld);Wl===null?Wl=Cl(n).setGroup(V).setName(`cameraWorldMatrices`):Wl.array=n,t=Wl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else Ul===null&&(Ul=H(e.matrixWorld).setName(`cameraWorldMatrix`).setGroup(V).onRenderUpdate(({camera:e})=>e.matrixWorld)),t=Ul;return t}).once()(),iu=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.normalMatrix);Kl===null?Kl=Cl(n).setGroup(V).setName(`cameraNormalMatrices`):Kl.array=n,t=Kl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else Gl===null&&(Gl=H(e.normalMatrix).setName(`cameraNormalMatrix`).setGroup(V).onRenderUpdate(({camera:e})=>e.normalMatrix)),t=Gl;return t}).once()(),au=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t=0,r=e.cameras.length;t<r;t++)n.push(new w);Jl===null?Jl=Cl(n).setGroup(V).setName(`cameraPositions`).onRenderUpdate(({camera:e},t)=>{let n=e.cameras,r=t.array;for(let e=0,t=n.length;e<t;e++)r[e].setFromMatrixPosition(n[e].matrixWorld)}):Jl.array=n,t=Jl.element(e.isMultiViewCamera?wl(`gl_ViewID_OVR`):Zl)}else ql===null&&(ql=H(new w).setName(`cameraPosition`).setGroup(V).onRenderUpdate(({camera:e},t)=>t.value.setFromMatrixPosition(e.matrixWorld))),t=ql;return t}).once()(),ou=N(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let t of e.cameras)n.push(t.viewport);Xl===null?Xl=Cl(n,`vec4`).setGroup(V).setName(`cameraViewports`):Xl.array=n,t=Xl.element(Zl)}else Yl===null&&(Yl=B(0,0,Al.x,Al.y).toConst(`cameraViewport`)),t=Yl;return t}).once()(),su=new he,cu=class e extends D{static get type(){return`Object3DNode`}constructor(e,t=null){super(),this.scope=e,this.object3d=t,this.updateType=E.OBJECT,this.uniformNode=new Wa(null)}generateNodeType(){let t=this.scope;if(t===e.WORLD_MATRIX)return`mat4`;if(t===e.POSITION||t===e.VIEW_POSITION||t===e.DIRECTION||t===e.SCALE)return`vec3`;if(t===e.RADIUS)return`float`}update(t){let n=this.object3d,r=this.uniformNode,i=this.scope;if(i===e.WORLD_MATRIX)r.value=n.matrixWorld;else if(i===e.POSITION)r.value=r.value||new w,r.value.setFromMatrixPosition(n.matrixWorld);else if(i===e.SCALE)r.value=r.value||new w,r.value.setFromMatrixScale(n.matrixWorld);else if(i===e.DIRECTION)r.value=r.value||new w,n.getWorldDirection(r.value);else if(i===e.VIEW_POSITION){let e=t.camera;r.value=r.value||new w,r.value.setFromMatrixPosition(n.matrixWorld),r.value.applyMatrix4(e.matrixWorldInverse)}else if(i===e.RADIUS){let e=t.object.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),su.copy(e.boundingSphere).applyMatrix4(n.matrixWorld),r.value=su.radius}}generate(t){let n=this.scope;return n===e.WORLD_MATRIX?this.uniformNode.nodeType=`mat4`:n===e.POSITION||n===e.VIEW_POSITION||n===e.DIRECTION||n===e.SCALE?this.uniformNode.nodeType=`vec3`:n===e.RADIUS&&(this.uniformNode.nodeType=`float`),this.uniformNode.build(t)}serialize(e){super.serialize(e),e.scope=this.scope}deserialize(e){super.deserialize(e),this.scope=e.scope}};cu.WORLD_MATRIX=`worldMatrix`,cu.POSITION=`position`,cu.SCALE=`scale`,cu.VIEW_POSITION=`viewPosition`,cu.DIRECTION=`direction`,cu.RADIUS=`radius`;var lu=A(cu,cu.DIRECTION).setParameterLength(1),uu=A(cu,cu.WORLD_MATRIX).setParameterLength(1),du=A(cu,cu.POSITION).setParameterLength(1),fu=A(cu,cu.SCALE).setParameterLength(1),pu=A(cu,cu.VIEW_POSITION).setParameterLength(1),mu=A(cu,cu.RADIUS).setParameterLength(1),hu=class extends cu{static get type(){return`ModelNode`}constructor(e){super(e)}update(e){this.object3d=e.object,super.update(e)}},gu=j(hu,hu.DIRECTION),_u=j(hu,hu.WORLD_MATRIX),vu=j(hu,hu.POSITION),yu=j(hu,hu.SCALE),bu=j(hu,hu.VIEW_POSITION),xu=j(hu,hu.RADIUS),Su=H(new On).onObjectUpdate(({object:e},t)=>t.value.getNormalMatrix(e.matrixWorld)),Cu=H(new Kt).onObjectUpdate(({object:e},t)=>t.value.copy(e.matrixWorld).invert()),wu=N(e=>e.context.modelViewMatrix||Tu).once()().toVar(`modelViewMatrix`),Tu=nu.mul(_u),Eu=N(e=>(e.context.isHighPrecisionModelViewMatrix=!0,H(`mat4`).onObjectUpdate(({object:e,camera:t})=>e.modelViewMatrix.multiplyMatrices(t.matrixWorldInverse,e.matrixWorld)))).once()().toVar(`highpModelViewMatrix`),Du=N(e=>{let t=e.context.isHighPrecisionModelViewMatrix;return H(`mat3`).onObjectUpdate(({object:e,camera:n})=>(t!==!0&&e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix)))}).once()().toVar(`highpModelNormalViewMatrix`),Ou=N(e=>e.shaderStage===`fragment`?e.context.clipSpace.toVarying(`v_clipSpace`):(Qn("TSL: `clipSpace` is only available in fragment stage."),B())).once()(),ku=ol(`position`,`vec3`),Au=ku.toVarying(`positionLocal`),ju=ku.toVarying(`positionPrevious`),Mu=N(e=>_u.mul(Au).xyz.toVarying(e.getSubBuildProperty(`v_positionWorld`)),`vec3`).once([`POSITION`])(),Nu=N(()=>Au.transformDirection(_u).toVarying(`v_positionWorldDirection`).normalize().toVar(`positionWorldDirection`),`vec3`).once([`POSITION`])(),Pu=N(e=>{if(e.shaderStage===`fragment`&&e.material.vertexNode){let e=tu.mul(Ou);return e.xyz.div(e.w).toVar(`positionView`)}return e.context.setupPositionView().toVarying(`v_positionView`)},`vec3`).once([`POSITION`,`VERTEX`])(),Fu=N(e=>{let t;return t=e.camera.isOrthographicCamera?z(0,0,1):Pu.negate().toVarying(`v_positionViewDirection`).normalize(),t.toVar(`positionViewDirection`)},`vec3`).once([`POSITION`])(),Iu=j(class extends D{static get type(){return`FrontFacingNode`}constructor(){super(`bool`),this.isFrontFacingNode=!0}generate(e){if(e.shaderStage!==`fragment`)return`true`;let{material:t}=e;return t.side===1?`false`:e.getFrontFacing()}}),Lu=F(Iu).mul(2).sub(1),Ru=N(([e],{material:t})=>{let n=t.side;return n===1?e=e.mul(-1):n===2&&(e=e.mul(Lu)),e}),zu=e=>(Qn(`TSL: "directionToFaceDirection()" has been renamed to "negateOnBackSide()".`),Ru(e)),Bu=ol(`normal`,`vec3`),Vu=N(e=>e.geometry.hasAttribute(`normal`)===!1?(T(`TSL: Vertex attribute "normal" not found on geometry.`),z(0,1,0)):Bu,`vec3`).once()().toVar(`normalLocal`),Hu=Pu.dFdx().cross(Pu.dFdy()).normalize().toVar(`normalFlat`),Uu=N(e=>{let t;return t=e.isFlatShading()?Hu:Ju(Vu).toVarying(`v_normalViewGeometry`).normalize(),t},`vec3`).once()().toVar(`normalViewGeometry`),Wu=N(e=>{let t=Uu.transformNormalByInverseViewMatrix(nu);return e.isFlatShading()!==!0&&(t=t.toVarying(`v_normalWorldGeometry`)),t.normalize().toVar(`normalWorldGeometry`)},`vec3`).once()(),J=N(e=>{let t;return e.subBuildFn===`NORMAL`||e.subBuildFn===`VERTEX`?(t=Uu,e.isFlatShading()!==!0&&(t=Ru(t))):t=e.context.setupNormal().context({getUV:null,getTextureLevel:null}),t},`vec3`).once([`NORMAL`,`VERTEX`])().toVar(`normalView`),Gu=J.transformNormalByInverseViewMatrix(nu).toVar(`normalWorld`),Ku=N(({subBuildFn:e,context:t})=>{let n;return n=e===`NORMAL`||e===`VERTEX`?J:t.setupClearcoatNormal().context({getUV:null,getTextureLevel:null}),n},`vec3`).once([`NORMAL`,`VERTEX`])().toVar(`clearcoatNormalView`),qu=N(([e,t=_u])=>$i(t).inverse().transpose().mul(e).normalize());O(`transformNormal`,qu);var Ju=N(([e],t)=>{let n=t.context.modelNormalViewMatrix;return n?e.transformNormalByViewMatrix(n):Su.mul(e).transformNormalByViewMatrix(nu)}),Yu=N(()=>(T(`TSL: "transformedNormalView" is deprecated. Use "normalView" instead.`),J)).once([`NORMAL`,`VERTEX`])(),Xu=N(()=>(T(`TSL: "transformedNormalWorld" is deprecated. Use "normalWorld" instead.`),Gu)).once([`NORMAL`,`VERTEX`])(),Zu=N(()=>(T(`TSL: "transformedClearcoatNormalView" is deprecated. Use "clearcoatNormalView" instead.`),Ku)).once([`NORMAL`,`VERTEX`])(),Qu=new Kt,$u=H(0).onReference(({material:e})=>e).onObjectUpdate(({material:e})=>e.refractionRatio),ed=H(1).onReference(({material:e})=>e).onObjectUpdate(function({material:e,scene:t}){return e.envMap?e.envMapIntensity:t.environmentIntensity}),td=H(new Kt).onReference(function(e){return e.material}).onObjectUpdate(function({material:e,scene:t}){let n=(t.environment!==null||t.environmentNode&&t.environmentNode.isNode)&&e.envMap===null?t.environmentRotation:e.envMapRotation;return n?Qu.makeRotationFromEuler(n).transpose():Qu.identity(),Qu}),nd=Fu.negate().reflect(J),rd=Fu.negate().refract(J,$u),id=nd.transformDirection(ru).toVar(`reflectVector`),ad=rd.transformDirection(ru).toVar(`refractVector`),od=new De,sd=A(class extends fl{static get type(){return`CubeTextureNode`}constructor(e,t=null,n=null,r=null){super(e,t,n,r),this.isCubeTextureNode=!0}getInputType(){return this.value.isDepthTexture===!0?`cubeDepthTexture`:`cubeTexture`}getDefaultUV(){let e=this.value;return e.mapping===301?id:e.mapping===302?ad:(C(`CubeTextureNode: Mapping "%s" not supported.`,e.mapping),z(0,0,0))}setUpdateMatrix(){}setupUV(e,t){let n=this.value;return n.isDepthTexture===!0?e.renderer.coordinateSystem===2001?z(t.x,t.y.negate(),t.z):t:(t=td.mul(t),(e.renderer.coordinateSystem===2001||!n.isRenderTargetTexture)&&(t=z(t.x.negate(),t.yz)),t)}generateUV(e,t){return t.build(e,this.sampler===!0?`vec3`:`ivec3`)}}).setParameterLength(1,4).setName(`cubeTexture`),cd=(e=od,t=null,n=null,r=null)=>{let i;return e&&e.isCubeTextureNode===!0?(i=k(e.clone()),i.referenceNode=e,t!==null&&(i.uvNode=k(t)),n!==null&&(i.levelNode=k(n)),r!==null&&(i.biasNode=k(r))):i=sd(e,t,n,r),i},ld=(e=od)=>sd(e),ud=class extends zr{static get type(){return`ReferenceElementNode`}constructor(e,t){super(e,t),this.referenceNode=e,this.isReferenceElementNode=!0}generateNodeType(){return this.referenceNode.uniformType}generate(e){let t=super.generate(e),n=this.referenceNode.getNodeType(e),r=this.getNodeType(e);return e.format(t,n,r)}},dd=class extends D{static get type(){return`ReferenceNode`}constructor(e,t,n=null,r=null){super(),this.property=e,this.uniformType=t,this.object=n,this.count=r,this.properties=e.split(`.`),this.reference=n,this.node=null,this.group=null,this.name=null,this.updateType=E.OBJECT}element(e){return new ud(this,k(e))}setGroup(e){return this.group=e,this}setName(e){return this.name=e,this}label(e){return T(`TSL: "label()" has been deprecated. Use "setName()" instead.`),this.setName(e)}setNodeType(e){let t=null;this.count===null?Array.isArray(this.getValueFromReference())?(t=Cl(null,e),t.updateType=E.OBJECT):t=e===`texture`?q(null):e===`cubeTexture`?cd(null):H(null,e):t=bl(null,e,this.count),this.group!==null&&t.setGroup(this.group),this.name!==null&&t.setName(this.name),this.node=t}generateNodeType(e){return this.node===null&&(this.updateReference(e),this.updateValue()),this.node.getNodeType(e)}getValueFromReference(e=this.reference){let{properties:t}=this,n=e[t[0]];for(let e=1;e<t.length;e++)n=n[t[e]];return n}updateReference(e){return this.reference=this.object===null?e.object:this.object,this.reference}setup(){return this.updateValue(),this.node}update(){this.updateValue()}updateValue(){this.node===null&&this.setNodeType(this.uniformType);let e=this.getValueFromReference();Array.isArray(e)?this.node.array=e:this.node.value=e}},fd=(e,t,n)=>new dd(e,t,n),pd=(e,t,n,r)=>new dd(e,t,r,n),md=class extends dd{static get type(){return`MaterialReferenceNode`}constructor(e,t,n=null){super(e,t,n),this.material=n,this.isMaterialReferenceNode=!0}updateReference(e){return this.reference=this.material===null?e.material:this.material,this.reference}},hd=(e,t,n=null)=>new md(e,t,n),gd=sl(),_d=Pu.dFdx(),vd=Pu.dFdy(),yd=gd.dFdx(),bd=gd.dFdy(),xd=J,Sd=vd.cross(xd),Cd=xd.cross(_d),wd=Sd.mul(yd.x).add(Cd.mul(bd.x)),Td=Sd.mul(yd.y).add(Cd.mul(bd.y)),Ed=wd.dot(wd).max(Td.dot(Td)),Dd=Ed.equal(0).select(0,Ed.inverseSqrt()),Od=wd.mul(Dd).toVar(`tangentViewFrame`),kd=Td.mul(Dd).toVar(`bitangentViewFrame`),Ad=ol(`tangent`,`vec4`),jd=Ad.xyz.toVar(`tangentLocal`),Md=N(e=>{let t;return t=e.subBuildFn===`VERTEX`||e.geometry.hasAttribute(`tangent`)?wu.mul(B(jd,0)).xyz.toVarying(`v_tangentView`).normalize():Od,e.isFlatShading()!==!0&&(t=Ru(t)),t},`vec3`).once([`NORMAL`,`VERTEX`])().toVar(`tangentView`),Nd=Md.transformDirection(ru).toVarying(`v_tangentWorld`).normalize().toVar(`tangentWorld`),Pd=N(([e,t],n)=>{let r=e.mul(Ad.w).xyz;return n.subBuildFn===`NORMAL`&&n.isFlatShading()!==!0&&(r=r.toVarying(t)),r}).once([`NORMAL`]),Fd=Pd(Bu.cross(Ad),`v_bitangentGeometry`).normalize().toVar(`bitangentGeometry`),Id=Pd(Vu.cross(jd),`v_bitangentLocal`).normalize().toVar(`bitangentLocal`),Ld=N(e=>{let t;return t=e.subBuildFn===`VERTEX`||e.geometry.hasAttribute(`tangent`)?Pd(J.cross(Md),`v_bitangentView`).normalize():kd,e.isFlatShading()!==!0&&(t=Ru(t)),t},`vec3`).once([`NORMAL`,`VERTEX`])().toVar(`bitangentView`),Rd=Pd(Gu.cross(Nd),`v_bitangentWorld`).normalize().toVar(`bitangentWorld`),zd=$i(Md,Ld,J).toVar(`TBNViewMatrix`),Bd=Fu.mul(zd),Vd=(e,t)=>e.sub(Bd.mul(t)),Hd=N(()=>{let e=Ca.cross(Fu);return e=e.cross(Ca).normalize(),e=K(e,J,xa.mul(da.oneMinus()).oneMinus().pow2().pow2()).normalize(),e}).once()(),Ud=e=>k(e).mul(.5).add(.5),Wd=e=>k(e).mul(2).sub(1),Gd=e=>z(e,Io(Ms(F(1).sub(bs(e,e))))),Kd=e=>(Qn(`TSL: "directionToColor()" has been renamed to "packNormalToRGB()".`),Ud(e)),qd=e=>(Qn(`TSL: "colorToDirection()" has been renamed to "unpackRGBToNormal()".`),Wd(e)),Jd=A(class extends Vr{static get type(){return`NormalMapNode`}constructor(e,t=null){super(`vec3`),this.node=e,this.scaleNode=t,this.normalMapType=0,this.unpackNormalMode=``}setup(e){let{normalMapType:t,scaleNode:n,unpackNormalMode:r}=this,i=this.node.mul(2).sub(1);if(t===0?r===`rg`?i=Gd(i.xy):r===`ga`?i=Gd(i.yw):r!==``&&C(`THREE.NodeMaterial: Unexpected unpack normal mode: ${r}`):r!==``&&C(`THREE.NodeMaterial: Normal map type '${t}' is not compatible with unpack normal mode '${r}'`),n!==null){let t=n;e.isFlatShading()===!0&&(t=Ru(t)),i=z(i.xy.mul(t),i.z)}let a=null;return t===1?a=Ju(i):t===0?a=zd.mul(i).normalize():(C(`NodeMaterial: Unsupported normal map type: ${t}`),a=J),a}}).setParameterLength(1,2),Yd=N(({textureNode:e,bumpScale:t})=>{let n=t=>e.isolate().context({getUV:e=>t(e.uvNode||sl()),forceUVContext:!0}),r=F(n(e=>e));return R(F(n(e=>e.add(e.dFdx()))).sub(r),F(n(e=>e.add(e.dFdy()))).sub(r)).mul(t)}),Xd=N(e=>{let{surf_pos:t,surf_norm:n,dHdxy:r}=e,i=t.dFdx().normalize(),a=t.dFdy().normalize(),o=n,s=a.cross(o),c=o.cross(i),l=i.dot(s).mul(Lu),u=l.sign().mul(r.x.mul(s).add(r.y.mul(c)));return l.abs().mul(n).sub(u).normalize()}),Zd=A(class extends Vr{static get type(){return`BumpMapNode`}constructor(e,t=null){super(`vec3`),this.textureNode=e,this.scaleNode=t}setup(e){if(e.material.wireframe===!0)return J;let t=this.scaleNode===null?1:this.scaleNode;return Xd({surf_pos:Pu,surf_norm:J,dHdxy:Yd({textureNode:this.textureNode,bumpScale:t})})}}).setParameterLength(1,2),Qd=new Map,Y=class e extends D{static get type(){return`MaterialNode`}constructor(e){super(),this.scope=e}getCache(e,t){let n=Qd.get(e);return n===void 0&&(n=hd(e,t),Qd.set(e,n)),n}getFloat(e){return this.getCache(e,`float`)}getColor(e){return this.getCache(e,`color`)}getTexture(e){return this.getCache(e===`map`?`map`:e+`Map`,`texture`)}setup(t){let n=t.context.material,r=this.scope,i=null;if(r===e.COLOR){let e=n.color===void 0?z():this.getColor(r);i=n.map&&n.map.isTexture===!0?e.mul(this.getTexture(`map`)):e}else if(r===e.OPACITY){let e=this.getFloat(r);i=n.alphaMap&&n.alphaMap.isTexture===!0?e.mul(this.getTexture(`alpha`)):e}else if(r===e.SPECULAR_STRENGTH)i=n.specularMap&&n.specularMap.isTexture===!0?this.getTexture(`specular`).r:F(1);else if(r===e.SPECULAR_INTENSITY){let e=this.getFloat(r);i=n.specularIntensityMap&&n.specularIntensityMap.isTexture===!0?e.mul(this.getTexture(r).a):e}else if(r===e.SPECULAR_COLOR){let e=this.getColor(r);i=n.specularColorMap&&n.specularColorMap.isTexture===!0?e.mul(this.getTexture(r).rgb):e}else if(r===e.ROUGHNESS){let e=this.getFloat(r);i=n.roughnessMap&&n.roughnessMap.isTexture===!0?e.mul(this.getTexture(r).g):e}else if(r===e.METALNESS){let e=this.getFloat(r);i=n.metalnessMap&&n.metalnessMap.isTexture===!0?e.mul(this.getTexture(r).b):e}else if(r===e.EMISSIVE){let e=this.getFloat(`emissiveIntensity`),t=this.getColor(r).mul(e);i=n.emissiveMap&&n.emissiveMap.isTexture===!0?t.mul(this.getTexture(r)):t}else if(r===e.NORMAL)n.normalMap?(i=Jd(this.getTexture(`normal`),this.getCache(`normalScale`,`vec2`)),i.normalMapType=n.normalMapType,(n.normalMap.format==1030||n.normalMap.format==36285||n.normalMap.format==37490)&&(i.unpackNormalMode=`rg`)):i=n.bumpMap?Zd(this.getTexture(`bump`).r,this.getFloat(`bumpScale`)):J;else if(r===e.CLEARCOAT){let e=this.getFloat(r);i=n.clearcoatMap&&n.clearcoatMap.isTexture===!0?e.mul(this.getTexture(r).r):e}else if(r===e.CLEARCOAT_ROUGHNESS){let e=this.getFloat(r);i=n.clearcoatRoughnessMap&&n.clearcoatRoughnessMap.isTexture===!0?e.mul(this.getTexture(r).r):e}else if(r===e.CLEARCOAT_NORMAL)i=n.clearcoatNormalMap?Jd(this.getTexture(r),this.getCache(r+`Scale`,`vec2`)):J;else if(r===e.SHEEN){let e=this.getColor(`sheenColor`).mul(this.getFloat(`sheen`));i=n.sheenColorMap&&n.sheenColorMap.isTexture===!0?e.mul(this.getTexture(`sheenColor`).rgb):e}else if(r===e.SHEEN_ROUGHNESS){let e=this.getFloat(r);i=n.sheenRoughnessMap&&n.sheenRoughnessMap.isTexture===!0?e.mul(this.getTexture(r).a):e,i=i.clamp(1e-4,1)}else if(r===e.ANISOTROPY){if(n.anisotropyMap&&n.anisotropyMap.isTexture===!0){let e=this.getTexture(r);i=Qi(Lf.x,Lf.y,Lf.y.negate(),Lf.x).mul(e.rg.mul(2).sub(R(1)).normalize().mul(e.b))}else i=Lf}else if(r===e.IRIDESCENCE_THICKNESS){let e=fd(`1`,`float`,n.iridescenceThicknessRange);if(n.iridescenceThicknessMap){let t=fd(`0`,`float`,n.iridescenceThicknessRange);i=e.sub(t).mul(this.getTexture(r).g).add(t)}else i=e}else if(r===e.TRANSMISSION){let e=this.getFloat(r);i=n.transmissionMap?e.mul(this.getTexture(r).r):e}else if(r===e.THICKNESS){let e=this.getFloat(r);i=n.thicknessMap?e.mul(this.getTexture(r).g):e}else if(r===e.IOR)i=this.getFloat(r);else if(r===e.LIGHT_MAP)i=n.lightMap?this.getTexture(r).rgb.mul(this.getFloat(`lightMapIntensity`)):z(0);else if(r===e.AO)i=n.aoMap?this.getTexture(r).r.sub(1).mul(this.getFloat(`aoMapIntensity`)).add(1):F(1);else if(r===e.LINE_DASH_OFFSET)i=n.dashOffset?this.getFloat(r):F(0);else{let e=this.getNodeType(t);i=this.getCache(r,e)}return i}};Y.ALPHA_TEST=`alphaTest`,Y.COLOR=`color`,Y.OPACITY=`opacity`,Y.SHININESS=`shininess`,Y.SPECULAR=`specular`,Y.SPECULAR_STRENGTH=`specularStrength`,Y.SPECULAR_INTENSITY=`specularIntensity`,Y.SPECULAR_COLOR=`specularColor`,Y.REFLECTIVITY=`reflectivity`,Y.ROUGHNESS=`roughness`,Y.METALNESS=`metalness`,Y.NORMAL=`normal`,Y.CLEARCOAT=`clearcoat`,Y.CLEARCOAT_ROUGHNESS=`clearcoatRoughness`,Y.CLEARCOAT_NORMAL=`clearcoatNormal`,Y.EMISSIVE=`emissive`,Y.ROTATION=`rotation`,Y.SHEEN=`sheen`,Y.SHEEN_ROUGHNESS=`sheenRoughness`,Y.ANISOTROPY=`anisotropy`,Y.IRIDESCENCE=`iridescence`,Y.IRIDESCENCE_IOR=`iridescenceIOR`,Y.IRIDESCENCE_THICKNESS=`iridescenceThickness`,Y.IOR=`ior`,Y.TRANSMISSION=`transmission`,Y.THICKNESS=`thickness`,Y.ATTENUATION_DISTANCE=`attenuationDistance`,Y.ATTENUATION_COLOR=`attenuationColor`,Y.LINE_SCALE=`scale`,Y.LINE_DASH_SIZE=`dashSize`,Y.LINE_GAP_SIZE=`gapSize`,Y.LINE_WIDTH=`linewidth`,Y.LINE_DASH_OFFSET=`dashOffset`,Y.POINT_SIZE=`size`,Y.DISPERSION=`dispersion`,Y.LIGHT_MAP=`light`,Y.AO=`ao`;var $d=j(Y,Y.ALPHA_TEST),ef=j(Y,Y.COLOR),tf=j(Y,Y.SHININESS),nf=j(Y,Y.EMISSIVE),rf=j(Y,Y.OPACITY),af=j(Y,Y.SPECULAR),of=j(Y,Y.SPECULAR_INTENSITY),sf=j(Y,Y.SPECULAR_COLOR),cf=j(Y,Y.SPECULAR_STRENGTH),lf=j(Y,Y.REFLECTIVITY),uf=j(Y,Y.ROUGHNESS),df=j(Y,Y.METALNESS),ff=j(Y,Y.NORMAL),pf=j(Y,Y.CLEARCOAT),mf=j(Y,Y.CLEARCOAT_ROUGHNESS),hf=j(Y,Y.CLEARCOAT_NORMAL),gf=j(Y,Y.ROTATION),_f=j(Y,Y.SHEEN),vf=j(Y,Y.SHEEN_ROUGHNESS),yf=j(Y,Y.ANISOTROPY),bf=j(Y,Y.IRIDESCENCE),xf=j(Y,Y.IRIDESCENCE_IOR),Sf=j(Y,Y.IRIDESCENCE_THICKNESS),Cf=j(Y,Y.TRANSMISSION),wf=j(Y,Y.THICKNESS),Tf=j(Y,Y.IOR),Ef=j(Y,Y.ATTENUATION_DISTANCE),Df=j(Y,Y.ATTENUATION_COLOR),Of=j(Y,Y.LINE_SCALE),kf=j(Y,Y.LINE_DASH_SIZE),Af=j(Y,Y.LINE_GAP_SIZE),jf=j(Y,Y.LINE_WIDTH),Mf=j(Y,Y.LINE_DASH_OFFSET),Nf=j(Y,Y.POINT_SIZE),Pf=j(Y,Y.DISPERSION),Ff=j(Y,Y.LIGHT_MAP),If=j(Y,Y.AO),Lf=H(new hn).onReference(function(e){return e.material}).onRenderUpdate(function({material:e}){this.value.set(e.anisotropy*Math.cos(e.anisotropyRotation),e.anisotropy*Math.sin(e.anisotropyRotation))}),Rf=N(e=>e.context.setupModelViewProjection(),`vec4`).once()().toVarying(`v_modelViewProjection`),zf=class e extends D{static get type(){return`EventNode`}constructor(t,n){super(`void`),this.eventType=t,this.callback=n,t===e.OBJECT?this.updateType=E.OBJECT:t===e.MATERIAL?this.updateType=E.RENDER:t===e.FRAME?this.updateType=E.FRAME:t===e.BEFORE_OBJECT?this.updateBeforeType=E.OBJECT:t===e.BEFORE_MATERIAL?this.updateBeforeType=E.RENDER:t===e.BEFORE_FRAME&&(this.updateBeforeType=E.FRAME)}update(e){this.callback(e)}updateBefore(e){this.callback(e)}};zf.OBJECT=`object`,zf.MATERIAL=`material`,zf.FRAME=`frame`,zf.BEFORE_OBJECT=`beforeObject`,zf.BEFORE_MATERIAL=`beforeMaterial`,zf.BEFORE_FRAME=`beforeFrame`;var Bf=(e,t)=>new zf(e,t).toStack(),Vf=e=>Bf(zf.OBJECT,e),Hf=e=>Bf(zf.MATERIAL,e),Uf=e=>Bf(zf.FRAME,e),Wf=e=>Bf(zf.BEFORE_OBJECT,e),Gf=e=>Bf(zf.BEFORE_MATERIAL,e),Kf=e=>Bf(zf.BEFORE_FRAME,e),qf=A(class extends zr{static get type(){return`StorageArrayElementNode`}constructor(e,t){super(e,t),this.isStorageArrayElementNode=!0}set storageBufferNode(e){this.node=e}get storageBufferNode(){return this.node}getMemberType(e,t){let n=this.storageBufferNode.structTypeNode;return n?n.getMemberType(e,t):`void`}setup(e){return e.isAvailable(`storageBuffer`)===!1&&this.node.isPBO===!0&&e.setupPBO(this.node),super.setup(e)}generate(e,t){let n,r=e.isContextAssign();if(n=e.isAvailable(`storageBuffer`)===!1?this.node.isPBO===!0&&r!==!0&&(this.node.value.isInstancedBufferAttribute||e.shaderStage!==`compute`)?e.generatePBO(this):this.node.build(e):super.generate(e),r!==!0){let r=this.getNodeType(e);n=e.format(n,r,t)}return n}}).setParameterLength(2),Jf=class extends yl{static get type(){return`StorageBufferNode`}constructor(e,t=null,n=0){let r,i=null;t&&t.isStructTypeNode?(r=`struct`,i=t,(e.isStorageBufferAttribute||e.isStorageInstancedBufferAttribute)&&(n=e.count)):t===null&&(e.isStorageBufferAttribute||e.isStorageInstancedBufferAttribute)?(r=br(e.itemSize),n=e.count):r=t,super(e,r,n),this.isStorageBufferNode=!0,this.structTypeNode=i,this.access=Mr.READ_WRITE,this.isAtomic=!1,this.isPBO=!1,this._attribute=null,this._varying=null,this.global=!0,e.isStorageBufferAttribute!==!0&&e.isStorageInstancedBufferAttribute!==!0&&(e.isInstancedBufferAttribute?e.isStorageInstancedBufferAttribute=!0:e.isStorageBufferAttribute=!0)}getHash(e){let t;if(this.bufferCount===0){let n=e.globalCache.getData(this.value);n===void 0&&(n={node:this},e.globalCache.setData(this.value,n)),t=n.node.id}else t=this.id;return String(t)}getInputType(){return this.value.isIndirectStorageBufferAttribute?`indirectStorageBuffer`:`storageBuffer`}element(e){return qf(this,e)}setPBO(e){return this.isPBO=e,this}getPBO(){return this.isPBO}setAccess(e){return this.access=e,this}toReadOnly(){return this.setAccess(Mr.READ_ONLY)}setAtomic(e){return this.isAtomic=e,this}toAtomic(){return this.setAtomic(!0)}getAttributeData(){return this._attribute===null&&(this._attribute=Tc(this.value),this._varying=rc(this._attribute)),{attribute:this._attribute,varying:this._varying}}generateNodeType(e){if(this.structTypeNode!==null)return this.structTypeNode.getNodeType(e);if(e.isAvailable(`storageBuffer`)||e.isAvailable(`indirectStorageBuffer`))return super.generateNodeType(e);let{attribute:t}=this.getAttributeData();return t.getNodeType(e)}getMemberType(e,t){return this.structTypeNode===null?`void`:this.structTypeNode.getMemberType(e,t)}generate(e){if(this.structTypeNode!==null&&this.structTypeNode.build(e),e.isAvailable(`storageBuffer`)||e.isAvailable(`indirectStorageBuffer`))return super.generate(e);let{attribute:t,varying:n}=this.getAttributeData(),r=n.build(e);return e.registerTransform(r,t),r}},Yf=(e,t=null,n=0)=>new Jf(e,t,n),Xf=new WeakMap,Zf=new WeakMap,Qf=new WeakMap;function $f(e,t){let n,r=Math.max(t.count,1);if(t.isStorageInstancedBufferAttribute===!0)n=Yf(t,`mat4`,r).element(jc);else if(r*16*4<=e.getUniformBufferLimit())n=bl(t.array,`mat4`,r).element(jc);else{let e=Xf.get(t);e||(e=new we(t.array,16,1),Xf.set(t,e));let r=t.usage===35048?Oc:Dc;n=ea(r(e,`vec4`,16,0),r(e,`vec4`,16,4),r(e,`vec4`,16,8),r(e,`vec4`,16,12))}return n}function ep(e,t,n){let r=Qf.get(e);if(r===void 0){let i=t.clone();r={previousInstanceMatrix:i,node:$f(n,i)},Qf.set(e,r)}return r.node}var tp=sa(`vec3`,`vInstanceColor`),np=N(([e,t=null],n)=>{let r=e.isStorageInstancedBufferAttribute===!0,i=t&&t.isStorageInstancedBufferAttribute===!0,a=$f(n,e),o=null;r||Math.max(e.count,1)*16*4>n.getUniformBufferLimit()&&(o=Xf.get(e));let s=null,c=null;if(t){if(i)s=Yf(t,`vec3`,Math.max(t.count,1)).element(jc);else{let e=Zf.get(t);e||(e=new g(t.array,3),Zf.set(t,e)),c=e,s=z((t.usage===35048?Oc:Dc)(e,`vec3`,3,0))}}(o!==null||c!==null)&&Uf(()=>{o!==null&&(o.clearUpdateRanges(),o.updateRanges.push(...e.updateRanges),e.version!==o.version&&(o.version=e.version)),t&&c!==null&&(c.clearUpdateRanges(),c.updateRanges.push(...t.updateRanges),t.version!==c.version&&(c.version=t.version))});let l=a.mul(Au).xyz;if(Au.assign(l),n.needsPreviousData()){let t=n.object;Vf(({object:t})=>{Qf.get(t).previousInstanceMatrix.array.set(e.array)});let r=ep(t,e,n);ju.assign(r.mul(ju).xyz)}if(n.hasGeometryAttribute(`normal`)){let e=qu(Vu,a);Vu.assign(e)}s!==null&&tp.assign(s)},`void`),rp=N(([e])=>{let{instanceMatrix:t,instanceColor:n}=e;np(t,n)},`void`),ip=N(([e,t])=>{let n=I(cl(hl(e),0).x).toConst(),r=I(t);return hl(e,Ui(r.mod(n).toConst(),r.div(n).toConst()))}),ap=N(([e,t])=>{let n=I(cl(hl(e),0).x).toConst();return hl(e,Ui(I(t).mod(n).toConst(),I(t).div(n).toConst())).x}),op=sa(`vec4`,`vBatchColor`),sp=N(([e],t)=>{let n=t.getDrawIndex()===null?jc:Fc,r=ap(e._indirectTexture,I(n)),i=e._matricesTexture,a=I(cl(hl(i),0).x).toConst(),o=F(r).mul(4).toInt().toConst(),s=o.mod(a).toConst(),c=o.div(a).toConst(),l=ea(hl(i,Ui(s,c)),hl(i,Ui(s.add(1),c)),hl(i,Ui(s.add(2),c)),hl(i,Ui(s.add(3),c))),u=e._colorsTexture;if(u!==null){let e=ip(u,r);op.assign(e)}let d=$i(l);Au.assign(l.mul(Au));let f=Vu.div(z(d[0].dot(d[0]),d[1].dot(d[1]),d[2].dot(d[2]))),p=d.mul(f).xyz;Vu.assign(p),t.hasGeometryAttribute(`tangent`)&&jd.mulAssign(d)},`void`),cp=new WeakMap,lp=new WeakMap;function up(e,t,n,r,i,a){let o=e.element(i.x),s=e.element(i.y),c=e.element(i.z),l=e.element(i.w),u=n.mul(t),d=Qa(o.mul(a.x).mul(u),s.mul(a.y).mul(u),c.mul(a.z).mul(u),l.mul(a.w).mul(u));return r.mul(d).xyz}function dp(e,t,n,r,i,a,o){let s=e.element(a.x),c=e.element(a.y),l=e.element(a.z),u=e.element(a.w),d=Qa(o.x.mul(s),o.y.mul(c),o.z.mul(l),o.w.mul(u));return d=i.mul(d).mul(r),{skinNormal:d.transformDirection(t).xyz,skinTangent:d.transformDirection(n).xyz}}function fp(e,t,n,r,i){let a=e.skeleton,o=lp.get(a);if(o===void 0){a.update();let e=new Float32Array(a.boneMatrices);o={previousBoneMatrices:e,node:bl(e,`mat4`,a.bones.length)},lp.set(a,o)}return up(o.node,ju,t,n,r,i)}var pp=N(([e],t)=>{let n=ol(`skinIndex`,`uvec4`),r=ol(`skinWeight`,`vec4`),i=fd(`bindMatrix`,`mat4`),a=fd(`bindMatrixInverse`,`mat4`),o=pd(`skeleton.boneMatrices`,`mat4`,e.skeleton.bones.length);if(Vf(({object:e,frameId:t})=>{let n=e.skeleton;if(cp.get(n)!==t){cp.set(n,t);let e=lp.get(n);e!==void 0&&e.previousBoneMatrices.set(n.boneMatrices),n.update()}}),t.needsPreviousData()){let t=fp(e,i,a,n,r);ju.assign(t)}let s=up(o,Au,i,a,n,r);if(Au.assign(s),t.hasGeometryAttribute(`normal`)){let{skinNormal:e,skinTangent:s}=dp(o,Vu,jd,i,a,n,r);Vu.assign(e),t.hasGeometryAttribute(`tangent`)&&jd.assign(s)}},`void`),mp=N(([e,t=null],n)=>{let r=Yf(new g(e.geometry.getAttribute(`position`).array,3),`vec3`).setPBO(!0).toReadOnly().element(jc).toVar(),i=Yf(new g(new Uint32Array(e.geometry.getAttribute(`skinIndex`).array),4),`uvec4`).setPBO(!0).toReadOnly().element(jc).toVar(),a=Yf(new g(e.geometry.getAttribute(`skinWeight`).array,4),`vec4`).setPBO(!0).toReadOnly().element(jc).toVar(),o=H(e.bindMatrix,`mat4`),s=H(e.bindMatrixInverse,`mat4`),c=bl(e.skeleton.boneMatrices,`mat4`,e.skeleton.bones.length),l=e.skeleton;if(Vf(({frameId:e})=>{if(cp.get(l)!==e){cp.set(l,e);let t=lp.get(l);t!==void 0&&t.previousBoneMatrices.set(l.boneMatrices),l.update()}}),n.needsPreviousData()){let t=fp(e,o,s,i,a);ju.assign(t)}let u=up(c,r,o,s,i,a);if(t!==null&&t.assign(u),n.hasGeometryAttribute(`normal`)){let{skinNormal:e,skinTangent:t}=dp(c,Vu,jd,o,s,i,a);Vu.assign(e),n.hasGeometryAttribute(`tangent`)&&jd.assign(t)}return u}),hp=class extends D{static get type(){return`LoopNode`}constructor(e=[]){super(`void`),this.params=e}getVarName(e){return String.fromCharCode(105+e)}getProperties(e){let t=e.getNodeProperties(this);if(t.stackNode!==void 0)return t;let n={};for(let e=0,t=this.params.length-1;e<t;e++){let t=this.params[e],r=t.isNode!==!0&&t.name||this.getVarName(e);n[r]=Kc(r,t.isNode!==!0&&t.type||`int`)}let r=e.addStack(),i=this.params[this.params.length-1](n);t.returnsNode=i.context({nodeLoop:i}),t.stackNode=r;let a=this.params[0];if(a.isNode!==!0&&typeof a.update==`function`){let e=N(this.params[0].update)(n);t.updateNode=e.context({nodeLoop:e})}return e.removeStack(),t}setup(e){if(this.getProperties(e),e.fnCall){let t=e.getDataFromNode(e.fnCall.shaderNode);t.hasLoop=!0}}generate(e){let t=this.getProperties(e),n=this.params,r=t.stackNode;for(let r=0,i=n.length-1;r<i;r++){let i=n[r],a=!1,o=null,s=null,c=null,l=null,u=null,d=null;i.isNode?i.getNodeType(e)===`bool`?(a=!0,l=`bool`,s=i.build(e,l)):(l=`int`,c=this.getVarName(r),o=`0`,s=i.build(e,l),u=`<`):(l=i.type||`int`,c=i.name||this.getVarName(r),o=i.start,s=i.end,u=i.condition,d=i.update,typeof o==`number`?o=e.generateConst(l,o):o&&o.isNode&&(o=o.build(e,l)),typeof s==`number`?s=e.generateConst(l,s):s&&s.isNode&&(s=s.build(e,l)),o!==void 0&&s===void 0?(o+=` - 1`,s=`0`,u=`>=`):s!==void 0&&o===void 0&&(o=`0`,u=`<`),u===void 0&&(u=Number(o)>Number(s)?`>=`:`<`));let f;if(a)f=`while ( ${s} )`;else{let n={start:o,end:s},r=n.start,i=n.end,a,p=()=>u.includes(`<`)?`+=`:`-=`;if(d!=null)switch(typeof d){case`function`:a=e.flowStagesNode(t.updateNode,`void`).code.replace(/\t|;/g,``);break;case`number`:a=c+` `+p()+` `+e.generateConst(l,d);break;case`string`:a=c+` `+d;break;default:d.isNode?a=c+` `+p()+` `+d.build(e):(C(`TSL: 'Loop( { update: ... } )' is not a function, string or number.`,this.stackTrace),a=`break /* invalid update */`)}else d=l===`int`||l===`uint`?u.includes(`<`)?`++`:`--`:p()+` 1.`,a=c+` `+d;f=`for ( ${e.getVar(l,c)+` = `+r}; ${c+` `+u+` `+i}; ${a} )`}e.addFlowCode((r===0?`
`:``)+e.tab+f+` {

`).addFlowTab()}let i=r.build(e,`void`);t.returnsNode.build(e,`void`),e.removeFlowTab().addFlowCode(`
`+e.tab+i);for(let t=0,n=this.params.length-1;t<n;t++)e.addFlowCode((t===0?``:e.tab)+`}

`).removeFlowTab();e.addFlowTab()}},gp=(...e)=>new hp(Ni(e,`int`)).toStack(),_p=()=>Kc(`continue`).toStack(),vp=()=>Kc(`break`).toStack(),yp=new WeakMap,bp=new bt,xp=new WeakMap,Sp=N(({bufferMap:e,influence:t,stride:n,width:r,depth:i,offset:a})=>{let o=I(Ac).mul(n).add(a),s=o.div(r);return hl(e,Ui(o.sub(s.mul(r)),s)).depth(i).xyz.mul(t)});function Cp(e){let t=e.morphAttributes.position!==void 0,n=e.morphAttributes.normal!==void 0,r=e.morphAttributes.color!==void 0,i=e.morphAttributes.position||e.morphAttributes.normal||e.morphAttributes.color,a=i===void 0?0:i.length,o=yp.get(e);if(o===void 0||o.count!==a){o!==void 0&&o.texture.dispose();let i=e.morphAttributes.position||[],s=e.morphAttributes.normal||[],c=e.morphAttributes.color||[],l=0;t===!0&&(l=1),n===!0&&(l=2),r===!0&&(l=3);let u=e.attributes.position.count*l,d=1,f=4096;u>f&&(d=Math.ceil(u/f),u=f);let p=new Float32Array(u*d*4*a),m=new At(p,u,d,a);m.type=lt,m.needsUpdate=!0;let h=l*4;for(let e=0;e<a;e++){let a=i[e],o=s[e],l=c[e],f=u*d*4*e;for(let e=0;e<a.count;e++){let i=e*h;t===!0&&(bp.fromBufferAttribute(a,e),p[f+i+0]=bp.x,p[f+i+1]=bp.y,p[f+i+2]=bp.z,p[f+i+3]=0),n===!0&&(bp.fromBufferAttribute(o,e),p[f+i+4]=bp.x,p[f+i+5]=bp.y,p[f+i+6]=bp.z,p[f+i+7]=0),r===!0&&(bp.fromBufferAttribute(l,e),p[f+i+8]=bp.x,p[f+i+9]=bp.y,p[f+i+10]=bp.z,p[f+i+11]=l.itemSize===4?bp.w:1)}}o={count:a,texture:m,stride:l,size:new hn(u,d)},yp.set(e,o);function g(){m.dispose(),yp.delete(e),e.removeEventListener(`dispose`,g)}e.addEventListener(`dispose`,g)}return o}var wp=N(([e])=>{let{geometry:t}=e,n=t.morphAttributes.position!==void 0,r=t.hasAttribute(`normal`)&&t.morphAttributes.normal!==void 0,i=t.morphAttributes.position||t.morphAttributes.normal||t.morphAttributes.color,a=i===void 0?0:i.length;if(a===0)return;let o=xp.get(e);(o===void 0||o.count!==a)&&(o={base:H(1),influences:e.morphTargetInfluences?Cl(e.morphTargetInfluences,`float`):null,count:a},xp.set(e,o));let{base:s,influences:c}=o,{texture:l,stride:u,size:d}=Cp(t);n===!0&&Au.mulAssign(s),r===!0&&Vu.mulAssign(s);let f=I(d.width);gp(a,({i:t})=>{let i=F(0).toVar();e.count>1&&e.morphTexture!==null&&e.morphTexture!==void 0?i.assign(hl(e.morphTexture,Ui(I(t).add(1),I(jc))).r):i.assign(c.element(t).toVar()),P(i.notEqual(0),()=>{n===!0&&Au.addAssign(Sp({bufferMap:l,influence:i,stride:u,width:f,depth:t,offset:I(0)})),r===!0&&Vu.addAssign(Sp({bufferMap:l,influence:i,stride:u,width:f,depth:t,offset:I(1)}))})}),Vf(({object:e})=>{let{base:t,influences:n}=o;t.value=e.geometry.morphTargetsRelative?1:1-e.morphTargetInfluences.reduce((e,t)=>e+t,0),n&&(n.array=e.morphTargetInfluences,n.update())})},`void`),Tp=class extends D{static get type(){return`LightingNode`}constructor(){super(`vec3`),this.isLightingNode=!0}},Ep=class extends Tp{static get type(){return`AONode`}constructor(e=null){super(),this.aoNode=e}setup(e){e.context.ambientOcclusion.mulAssign(this.aoNode)}},Dp=A(class extends Us{static get type(){return`LightingContextNode`}constructor(e,t=null,n=[],r=null,i=null){super(e),this.lightingModel=t,this.materialLightings=n,this.backdropNode=r,this.backdropAlphaNode=i,this._value=null}getContext(){let{materialLightings:e,backdropNode:t,backdropAlphaNode:n}=this,r={directDiffuse:z().toVar(`directDiffuse`),directSpecular:z().toVar(`directSpecular`),indirectDiffuse:z().toVar(`indirectDiffuse`),indirectSpecular:z().toVar(`indirectSpecular`)};return{radiance:z().toVar(`radiance`),irradiance:z().toVar(`irradiance`),iblIrradiance:z().toVar(`iblIrradiance`),ambientOcclusion:F(1).toVar(`ambientOcclusion`),reflectedLight:r,materialLightings:e,backdrop:t,backdropAlpha:n}}setup(e){return this.value=this._value||=this.getContext(),this.value.lightingModel=this.lightingModel||e.context.lightingModel,super.setup(e)}}),Op=class extends Tp{static get type(){return`IrradianceNode`}constructor(e){super(),this.node=e}setup(e){e.context.irradiance.addAssign(this.node)}},kp=new hn,Ap=class extends fl{static get type(){return`ViewportTextureNode`}constructor(e=kl,t=null,n=null){let r=null;n===null?(r=new Wn,r.minFilter=En,n=r):r=n,super(n,e,t),this.generateMipmaps=!1,this.defaultFramebuffer=r,this.isOutputTextureNode=!0,this.updateBeforeType=E.RENDER,this._cacheTextures=new WeakMap}getTextureForReference(e=null){let t,n;if(this.referenceNode?(t=this.referenceNode.defaultFramebuffer,n=this.referenceNode._cacheTextures):(t=this.defaultFramebuffer,n=this._cacheTextures),e===null)return t;if(n.has(e)===!1){let r=t.clone();n.set(e,r)}return n.get(e)}updateReference(e){let t=e.renderer,n=t.getRenderTarget(),r=t.getCanvasTarget(),i=n||r;return this.value=this.getTextureForReference(i),this.value}updateBefore(e){let t=e.renderer,n=t.getRenderTarget(),r=t.getCanvasTarget(),i=n||r;i===null?t.getDrawingBufferSize(kp):i.getDrawingBufferSize?i.getDrawingBufferSize(kp):kp.set(i.width,i.height);let a=this.getTextureForReference(i);(a.image.width!==kp.width||a.image.height!==kp.height)&&(a.image.width=kp.width,a.image.height=kp.height,a.needsUpdate=!0);let o=a.generateMipmaps;a.generateMipmaps=this.generateMipmaps,t.copyFramebufferToTexture(a),a.generateMipmaps=o}clone(){let e=new this.constructor(this.uvNode,this.levelNode,this.value);return e.generateMipmaps=this.generateMipmaps,e}},jp=A(Ap).setParameterLength(0,3),Mp=A(Ap,null,null,{generateMipmaps:!0}).setParameterLength(0,3),Np=Mp(),Pp=(e=kl,t=null)=>Np.sample(e,t),Fp=null,Ip=A(class extends Ap{static get type(){return`ViewportDepthTextureNode`}constructor(e=kl,t=null,n=null){n===null&&(Fp===null&&(Fp=new Pn),n=Fp),super(e,t,n)}}).setParameterLength(0,3),Lp=class e extends D{static get type(){return`ViewportDepthNode`}constructor(e,t=null){super(`float`),this.scope=e,this.valueNode=t,this.isViewportDepthNode=!0}generate(t){let{scope:n}=this;return n===e.DEPTH_BASE?t.getFragDepth():super.generate(t)}setup({camera:t}){let{scope:n}=this,r=this.valueNode,i=null;return n===e.DEPTH_BASE?r!==null&&(i=Kp().assign(r)):n===e.DEPTH?i=t.isPerspectiveCamera?Vp(Pu.z,Ql,$l):Rp(Pu.z,Ql,$l):n===e.LINEAR_DEPTH&&(i=r===null?Rp(Pu.z,Ql,$l):t.isPerspectiveCamera?Rp(Up(r,Ql,$l),Ql,$l):r),i}};Lp.DEPTH_BASE=`depthBase`,Lp.DEPTH=`depth`,Lp.LINEAR_DEPTH=`linearDepth`;var Rp=(e,t,n)=>e.add(t).div(t.sub(n)),zp=(e,t,n)=>e.add(n).div(n.sub(t)),Bp=N(([e,t,n],r)=>r.renderer.reversedDepthBuffer===!0?n.sub(t).mul(e).sub(n):t.sub(n).mul(e).sub(t)),Vp=(e,t,n)=>t.add(e).mul(n).div(n.sub(t).mul(e)),Hp=(e,t,n)=>t.mul(e.add(n)).div(e.mul(t.sub(n))),Up=N(([e,t,n],r)=>r.renderer.reversedDepthBuffer===!0?t.mul(n).div(t.sub(n).mul(e).sub(t)):t.mul(n).div(n.sub(t).mul(e).sub(n))),Wp=(e,t,n)=>{t=t.max(1e-6).toVar();let r=Fo(e.negate().div(t)),i=Fo(n.div(t));return r.div(i)},Gp=(e,t,n)=>{let r=e.mul(Po(n.div(t)));return F(Math.E).pow(r).mul(t).negate()},Kp=A(Lp,Lp.DEPTH_BASE),qp=j(Lp,Lp.DEPTH),Jp=A(Lp,Lp.LINEAR_DEPTH).setParameterLength(0,1),Yp=Jp(Ip());qp.assign=e=>Kp(e);var Xp=class e extends D{static get type(){return`ClippingNode`}constructor(t=e.DEFAULT){super(),this.scope=t}setup(t){super.setup(t);let{intersectionPlanes:n,unionPlanes:r}=t.clippingContext;return this.hardwareClipping=t.hardwareClipping,this.scope===e.ALPHA_TO_COVERAGE?this.setupAlphaToCoverage(n,r):this.scope===e.HARDWARE?this.setupHardwareClipping(r,t):this.setupDefault(n,r)}setupAlphaToCoverage(e,t){return N(()=>{let n=F().toVar(`distanceToPlane`),r=F().toVar(`distanceToGradient`),i=F(1).toVar(`clipOpacity`),a=t.length;if(this.hardwareClipping===!1&&a>0){let e=Cl(t).setGroup(V);gp(a,({i:t})=>{let a=e.element(t);n.assign(Pu.dot(a.xyz).negate().add(a.w)),r.assign(n.fwidth().div(2)),i.mulAssign(Ps(r.negate(),r,n))})}let o=e.length;if(o>0){let t=Cl(e).setGroup(V),a=F(1).toVar(`intersectionClipOpacity`);gp(o,({i:e})=>{let i=t.element(e);n.assign(Pu.dot(i.xyz).negate().add(i.w)),r.assign(n.fwidth().div(2)),a.mulAssign(Ps(r.negate(),r,n).oneMinus())}),i.mulAssign(a.oneMinus())}ca.a.mulAssign(i),ca.a.equal(0).discard()})()}setupDefault(e,t){return N(()=>{let n=t.length;if(this.hardwareClipping===!1&&n>0){let e=Cl(t).setGroup(V);gp(n,({i:t})=>{let n=e.element(t);Pu.dot(n.xyz).greaterThan(n.w).discard()})}let r=e.length;if(r>0){let t=Cl(e).setGroup(V),n=Hi(!0).toVar(`clipped`);gp(r,({i:e})=>{let r=t.element(e);n.assign(Pu.dot(r.xyz).greaterThan(r.w).and(n))}),n.discard()}})()}setupHardwareClipping(e,t){let n=e.length;return t.enableHardwareClipping(n),N(()=>{let r=Cl(e).setGroup(V),i=wl(t.getClipDistance());gp(n,({i:e})=>{let t=r.element(e),n=Pu.dot(t.xyz).sub(t.w).negate();i.element(e).assign(n)})})()}};Xp.ALPHA_TO_COVERAGE=`alphaToCoverage`,Xp.DEFAULT=`default`,Xp.HARDWARE=`hardware`;var Zp=()=>new Xp,Qp=()=>new Xp(Xp.ALPHA_TO_COVERAGE),$p=()=>new Xp(Xp.HARDWARE),em=.05,tm=N(([e])=>Vo(W(1e4,Ho(W(17,e.x).add(W(.1,e.y)))).mul(Qa(.1,es(Ho(W(13,e.y).add(e.x))))))),nm=N(([e])=>tm(R(tm(e.xy),e.z))),rm=N(([e])=>{let t=hs(ns(as(e.xyz)),ns(os(e.xyz))),n=F(1).div(F(em).mul(t)).toVar(`pixScale`),r=R(No(Ro(Fo(n))),No(zo(Fo(n)))),i=R(nm(Ro(r.x.mul(e.xyz))),nm(Ro(r.y.mul(e.xyz)))),a=Vo(Fo(n)),o=Qa(W(a.oneMinus(),i.x),W(a,i.y)),s=ms(a,a.oneMinus()),c=z(o.mul(o).div(W(2,s).mul(U(1,s))),o.sub(W(.5,s)).div(U(1,s)),U(1,U(1,o).mul(U(1,o)).div(W(2,s).mul(U(1,s)))));return js(o.lessThan(s.oneMinus()).select(o.lessThan(s).select(c.x,c.y),c.z),1e-6,1)}).setLayout({name:`getAlphaHashThreshold`,type:`float`,inputs:[{name:`position`,type:`vec3`}]}),im=class extends al{static get type(){return`VertexColorNode`}constructor(e){super(null,`vec4`),this.isVertexColorNode=!0,this.index=e}getAttributeName(){let e=this.index;return`color`+(e>0?e:``)}generate(e){let t=this.getAttributeName(e),n=e.hasGeometryAttribute(t),r;return r=n===!0?super.generate(e):e.generateConst(this.nodeType,new bt(1,1,1,1)),r}serialize(e){super.serialize(e),e.index=this.index}deserialize(e){super.deserialize(e),this.index=e.index}},am=(e=0)=>new im(e),om=class extends kt{static get type(){return`NodeMaterial`}get type(){return this.constructor.type}set type(e){}constructor(){super(),this.isNodeMaterial=!0,this.fog=!0,this.lights=!1,this.lightsNode=null,this.envNode=null,this.aoNode=null,this.colorNode=null,this.normalNode=null,this.opacityNode=null,this.backdropNode=null,this.backdropAlphaNode=null,this.alphaTestNode=null,this.maskNode=null,this.maskShadowNode=null,this.positionNode=null,this.geometryNode=null,this.depthNode=null,this.receivedShadowPositionNode=null,this.castShadowPositionNode=null,this.receivedShadowNode=null,this.castShadowNode=null,this.outputNode=null,this.mrtNode=null,this.fragmentNode=null,this.vertexNode=null,this.contextNode=null}_getNodeChildren(){let e=[];for(let t of Object.getOwnPropertyNames(this)){if(t.startsWith(`_`)===!0)continue;let n=this[t];n&&n.isNode===!0&&e.push({property:t,childNode:n})}return e}customProgramCacheKey(){let e=[];for(let{property:t,childNode:n}of this._getNodeChildren())e.push(hr(t.slice(0,-4)),n.getCacheKey());return this.type+gr(e)}build(e){this.setup(e)}setupObserver(e){return new ur(e)}setup(e){e.context.setupNormal=()=>nc(this.setupNormal(e),`NORMAL`,`vec3`),e.context.setupPositionView=()=>this.setupPositionView(e),e.context.setupModelViewProjection=()=>this.setupModelViewProjection(e);let t=e.renderer,n=t.getRenderTarget();e.addStack();let r=this.setupVertex(e),i=nc(this.vertexNode||r,`VERTEX`);e.context.clipSpace=i,e.stack.outputNode=i,this.setupHardwareClipping(e),this.geometryNode!==null&&(e.stack.outputNode=e.stack.outputNode.bypass(this.geometryNode)),e.addFlow(`vertex`,e.removeStack()),e.addStack();let a,o=this.setupClipping(e);if((this.depthWrite===!0||this.depthTest===!0)&&(n===null?t.depth===!0&&this.setupDepth(e):n.depthBuffer===!0&&this.setupDepth(e)),this.fragmentNode===null){this.setupDiffuseColor(e),this.setupAmbientOcclusion(e),this.setupVariants(e);let r=this.setupLighting(e);o!==null&&e.stack.addToStack(o);let i=B(r,ca.a).max(0);a=this.setupOutput(e,i),Oa.assign(a);let s=this.outputNode!==null;if(s&&(a=this.outputNode),e.context.getOutput&&(a=e.context.getOutput(a,e)),n!==null){let e=t.getMRT(),n=this.mrtNode;e===null?n!==null&&(a=n):(s&&Oa.assign(a),a=e,n!==null&&(a=e.merge(n)))}}else{let t=this.fragmentNode;t.isOutputStructNode!==!0&&(t=t.convert(e.getOutputType())),a=this.setupOutput(e,t)}e.stack.outputNode=a,e.addFlow(`fragment`,e.removeStack()),e.observer=this.setupObserver(e)}setupClipping(e){if(e.clippingContext===null)return null;let{unionPlanes:t,intersectionPlanes:n}=e.clippingContext,r=null;if(t.length>0||n.length>0){let t=e.renderer.currentSamples;this.alphaToCoverage&&t>1?r=Qp():e.stack.addToStack(Zp())}return r}setupHardwareClipping(e){if(e.hardwareClipping=!1,e.clippingContext===null)return;let t=e.clippingContext.unionPlanes.length;t>0&&t<=8&&e.isAvailable(`clipDistance`)&&(e.stack.addToStack($p()),e.hardwareClipping=!0)}setupDepth(e){let{renderer:t,camera:n}=e,r=this.depthNode;if(r===null){let e=t.getMRT();e&&e.has(`depth`)?r=e.get(`depth`):t.logarithmicDepthBuffer===!0&&(r=n.isPerspectiveCamera?Wp(Pu.z,Ql,$l):Rp(Pu.z,Ql,$l))}r!==null&&qp.assign(r).toStack()}setupPositionView(){return wu.mul(Au).xyz}setupModelViewProjection(){return eu.mul(Pu)}setupVertex(e){return e.addStack(),this.setupPosition(e),e.context.position=e.removeStack(),Rf}setupPosition(e){let{object:t,geometry:n}=e;if((n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color)&&wp(t),t.isSkinnedMesh===!0&&pp(t),this.displacementMap){let e=hd(`displacementMap`,`texture`),t=hd(`displacementScale`,`float`),n=hd(`displacementBias`,`float`);Au.addAssign(Vu.normalize().mul(e.x.mul(t).add(n)))}return t.isBatchedMesh&&sp(t),t.isInstancedMesh&&t.instanceMatrix&&t.instanceMatrix.isInstancedBufferAttribute===!0&&rp(t),this.positionNode!==null&&Au.assign(nc(this.positionNode,`POSITION`,`vec3`)),Au}setupDiffuseColor(e){let{object:t,geometry:n}=e;this.maskNode!==null&&Hi(this.maskNode).not().discard();let r=this.colorNode?B(this.colorNode):ef;this.vertexColors===!0&&n.hasAttribute(`color`)&&(r=r.mul(am())),t.instanceColor&&(r=tp.mul(r)),t.isBatchedMesh&&t._colorsTexture&&(r=op.mul(r)),ca.assign(r);let i=this.opacityNode?F(this.opacityNode):rf;ca.a.assign(ca.a.mul(i));let a=null;(this.alphaTestNode!==null||this.alphaTest>0)&&(a=this.alphaTestNode===null?$d:F(this.alphaTestNode),this.alphaToCoverage===!0?(ca.a=Ps(a,a.add(us(ca.a)),ca.a),ca.a.lessThanEqual(0).discard()):ca.a.lessThanEqual(a).discard()),this.alphaHash===!0&&ca.a.lessThan(rm(Au)).discard(),e.isOpaque()&&ca.a.assign(1)}setupVariants(){}setupOutgoingLight(){return this.lights===!0?z(0):ca.rgb}setupNormal(){return this.normalNode?z(this.normalNode):ff}setupEnvironment(){let e=null;return this.envNode?e=this.envNode:this.envMap&&(e=this.envMap.isCubeTexture?hd(`envMap`,`cubeTexture`):hd(`envMap`,`texture`)),e}setupLightMap(e){let t=null;return e.material.lightMap&&(t=new Op(Ff)),t}setupMaterialLightings(e){let t=[];if(e.renderer.lighting.enabled===!1)return t;let n=this.setupEnvironment(e);n&&n.isLightingNode&&t.push(n);let r=this.setupLightMap(e);return r&&r.isLightingNode&&t.push(r),e.context.ambientOcclusion&&t.push(new Ep(e.context.ambientOcclusion)),t}setupAmbientOcclusion(e){let t=this.aoNode;t===null&&e.material.aoMap&&(t=If),e.context.getAO&&(t=e.context.getAO(t,e)),t!==null&&(Ra.assign(t),e.context.ambientOcclusion=Ra)}setupLightingModel(){}setupLighting(e){let{material:t}=e,{backdropNode:n,backdropAlphaNode:r,emissiveNode:i}=this,a=this.lights===!0||this.lightsNode!==null,o=this.lights===!0?this.setupMaterialLightings(e):[],s=a?this.lightsNode||e.lightsNode:null,c=this.setupOutgoingLight(e);return s&&(o.length>0||s.getScope().hasLights)?c=Dp(s,this.setupLightingModel(e)||null,o,n,r):n!==null&&(c=z(r===null?n:K(c,n,r))),(i&&i.isNode===!0||t.emissive&&t.emissive.isColor===!0)&&(ua.assign(z(i||nf)),c=c.add(ua)),c}setupFog(e,t){let n=e.fogNode;return n&&(Oa.assign(t),t=B(n.toVar())),t}setupPremultipliedAlpha(e,t){return Yc(t)}setupOutput(e,t){return this.fog===!0&&(t=this.setupFog(e,t)),this.premultipliedAlpha===!0&&(t=this.setupPremultipliedAlpha(e,t)),t}setDefaultValues(e){for(let t in e){let n=e[t];this[t]===void 0&&(this[t]=n,n&&n.clone&&(this[t]=n.clone()))}let t=Object.getOwnPropertyDescriptors(e.constructor.prototype);for(let e in t)Object.getOwnPropertyDescriptor(this.constructor.prototype,e)===void 0&&t[e].get!==void 0&&Object.defineProperty(this.constructor.prototype,e,t[e])}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{},nodes:{}});let n=kt.prototype.toJSON.call(this,e);n.inputNodes={};for(let{property:t,childNode:r}of this._getNodeChildren())n.inputNodes[t]=r.toJSON(e).uuid;function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images),a=r(e.nodes);t.length>0&&(n.textures=t),i.length>0&&(n.images=i),a.length>0&&(n.nodes=a)}return n}copy(e){let t=Object.getOwnPropertyDescriptors(this.constructor.prototype);for(let n in t)if(t[n].set!==void 0&&e[n]!==void 0){let t=e[n];this[n]&&this[n].copy!==void 0?this[n].copy(t):this[n]=t}for(let t in this)if(!/^(?:is[A-Z]|_)|^(?:id|uuid|version|type|userData|clippingPlanes)$/.test(t)&&this[t]!==void 0&&e[t]!==void 0){let n=e[t];this[t]&&this[t].copy!==void 0?this[t].copy(n):this[t]=n}return this.clippingPlanes=e.clippingPlanes?e.clippingPlanes.map(e=>e.clone()):null,this.userData=JSON.parse(JSON.stringify(e.userData)),this}},sm=new Ke,cm=class extends om{static get type(){return`LineBasicNodeMaterial`}constructor(e){super(),this.isLineBasicNodeMaterial=!0,this.setDefaultValues(sm),this.setValues(e)}},lm=new ae,um=class extends om{static get type(){return`LineDashedNodeMaterial`}constructor(e){super(),this.isLineDashedNodeMaterial=!0,this.setDefaultValues(lm),this.dashOffset=0,this.offsetNode=null,this.dashScaleNode=null,this.dashSizeNode=null,this.gapSizeNode=null,this.setValues(e)}setupVariants(){let e=this.offsetNode?F(this.offsetNode):Mf,t=this.dashScaleNode?F(this.dashScaleNode):Of,n=this.dashSizeNode?F(this.dashSizeNode):kf,r=this.gapSizeNode?F(this.gapSizeNode):Af;ka.assign(n),Aa.assign(r);let i=rc(ol(`lineDistance`).mul(t));(e?i.add(e):i).mod(ka.add(Aa)).greaterThan(ka).discard()}},dm=sa(`vec3`,`worldStart`),fm=sa(`vec3`,`worldEnd`),pm=sa(`float`,`lineDistance`),mm=sa(`vec4`,`worldPos`),hm=N(({start:e,end:t})=>{let n=eu.element(2).element(2),r=eu.element(3).element(2);return n.greaterThan(0).select(r.negate().div(n.add(1)),r.mul(-.5).div(n)).sub(e.z).div(t.z.sub(e.z))},{start:`vec4`,end:`vec4`,return:`float`}),gm=N(({p1:e,p2:t,p3:n,p4:r})=>{let i=e.sub(n),a=r.sub(n),o=t.sub(e),s=i.dot(a),c=a.dot(o),l=i.dot(o),u=a.dot(a),d=o.dot(o).mul(u).sub(c.mul(c)),f=s.mul(c).sub(l.mul(u)).div(d).clamp();return R(f,s.add(c.mul(f)).div(u).clamp())},{p1:`vec3`,p2:`vec3`,p3:`vec3`,p4:`vec3`,return:`vec2`});N(({material:e})=>{let t=e._useDash,n=e._useWorldUnits,r=ol(`instanceStart`),i=ol(`instanceEnd`),a=B(wu.mul(B(r,1))).toVar(`start`),o=B(wu.mul(B(i,1))).toVar(`end`),s,c;t&&(s=F(ol(`instanceDistanceStart`)).toVar(`distanceStart`),c=F(ol(`instanceDistanceEnd`)).toVar(`distanceEnd`)),n&&(dm.assign(a.xyz),fm.assign(o.xyz));let l=Ml.z.div(Ml.w);if(P(eu.element(2).element(3).equal(-1),()=>{P(a.z.lessThan(0).and(o.z.greaterThan(0)),()=>{let e=hm({start:a,end:o});o.assign(B(K(a.xyz,o.xyz,e),o.w)),t&&c.assign(K(s,c,e))}).ElseIf(o.z.lessThan(0).and(a.z.greaterThanEqual(0)),()=>{let e=hm({start:o,end:a});a.assign(B(K(o.xyz,a.xyz,e),a.w)),t&&s.assign(K(c,s,e))})}),t){let t=e.dashScaleNode?F(e.dashScaleNode):Of,n=e.offsetNode?F(e.offsetNode):Mf,r=ku.y.lessThan(.5).select(t.mul(s),t.mul(c));r=r.add(n),pm.assign(r)}let u=eu.mul(a),d=eu.mul(o),f=u.xyz.div(u.w),p=d.xyz.div(d.w),m=p.xy.sub(f.xy).toVar();m.x.assign(m.x.mul(l)),m.assign(m.normalize());let h=B().toVar();if(n){let e=o.xyz.sub(a.xyz).normalize(),n=K(a.xyz,o.xyz,.5).normalize(),r=e.cross(n).normalize(),i=e.cross(r);mm.assign(ku.y.lessThan(.5).select(a,o));let s=jf.mul(.5);mm.addAssign(B(ku.x.lessThan(0).select(r.mul(s),r.mul(s).negate()),0)),t||(mm.addAssign(B(ku.y.lessThan(.5).select(e.mul(s).negate(),e.mul(s)),0)),mm.addAssign(B(i.mul(s),0)),P(ku.y.greaterThan(1).or(ku.y.lessThan(0)),()=>{mm.subAssign(B(i.mul(2).mul(s),0))})),h.assign(eu.mul(mm));let c=z().toVar();c.assign(ku.y.lessThan(.5).select(f,p)),h.z.assign(c.z.mul(h.w))}else{let e=R(m.y,m.x.negate()).toVar(`offset`);m.x.assign(m.x.div(l)),e.x.assign(e.x.div(l)),e.assign(ku.x.lessThan(0).select(e.negate(),e)),P(ku.y.lessThan(0),()=>{e.assign(e.sub(m))}).ElseIf(ku.y.greaterThan(1),()=>{e.assign(e.add(m))}),e.assign(e.mul(jf)),e.assign(e.div(Ml.w.div(Ol))),h.assign(ku.y.lessThan(.5).select(u,d)),e.assign(e.mul(h.w)),h.assign(h.add(B(e,0,0)))}return h})(),N(({material:e,renderer:t})=>{let n=e._useAlphaToCoverage,r=e._useDash,i=e._useWorldUnits,a=sl();if(r){let t=e.dashSizeNode?F(e.dashSizeNode):kf,n=e.gapSizeNode?F(e.gapSizeNode):Af;ka.assign(t),Aa.assign(n),a.y.lessThan(-1).or(a.y.greaterThan(1)).discard(),pm.mod(ka.add(Aa)).greaterThan(ka).discard()}let o=F(1).toVar(`alpha`);if(i){let e=mm.xyz.normalize().mul(1e5),i=fm.sub(dm),a=gm({p1:dm,p2:fm,p3:z(0,0,0),p4:e}),s=dm.add(i.mul(a.x)),c=e.mul(a.y),l=s.sub(c).length().div(jf);if(!r){if(n&&t.currentSamples>0){let e=l.fwidth();o.assign(Ps(e.negate().add(.5),e.add(.5),l).oneMinus())}else l.greaterThan(.5).discard()}}else if(n&&t.currentSamples>0){let e=a.x,t=a.y.greaterThan(0).select(a.y.sub(1),a.y.add(1)),n=e.mul(e).add(t.mul(t)),r=F(n.fwidth()).toVar(`dlen`);P(a.y.abs().greaterThan(1),()=>{o.assign(Ps(r.oneMinus(),r.add(1),n).oneMinus())})}else P(a.y.abs().greaterThan(1),()=>{let e=a.x,t=a.y.greaterThan(0).select(a.y.sub(1),a.y.add(1));e.mul(e).add(t.mul(t)).greaterThan(1).discard()});return o})();var _m=new rn,vm=class extends om{static get type(){return`MeshNormalNodeMaterial`}constructor(e){super(),this.isMeshNormalNodeMaterial=!0,this.setDefaultValues(_m),this.setValues(e)}setupDiffuseColor(){let e=this.opacityNode?F(this.opacityNode):rf;ca.assign(dc(B(Ud(J),e),tn))}},ym=N(([e=Nu])=>R(e.z.atan(e.x).mul(1/(Math.PI*2)).add(.5),e.y.clamp(-1,1).asin().mul(1/Math.PI).add(.5))),bm=N(([e=sl()])=>{let t=e.x.sub(.5).mul(Math.PI*2),n=e.y.sub(.5).mul(Math.PI),r=n.cos();return z(r.mul(t.cos()),n.sin(),r.mul(t.sin()))}),xm=class extends Xn{constructor(e=1,t={}){super(e,e,t),this.isCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new De(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){let n=t.minFilter,r=t.generateMipmaps;t.generateMipmaps=!0,this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i=new nr(5,5,5),a=ym(Nu),o=new om;o.colorNode=q(t,a,0),o.side=1,o.blending=0;let s=new ft(i,o),c=new Zt;c.add(s),t.minFilter===1008&&(t.minFilter=te);let l=new Xe(1,10,this),u=e.getMRT();return e.setMRT(null),l.update(e,c),e.setMRT(u),t.minFilter=n,t.generateMipmaps=r,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Sm=new WeakMap,Cm=class extends Vr{static get type(){return`CubeMapNode`}constructor(e){super(`vec3`),this.envNode=e,this._cubeTexture=null,this._cubeTextureNode=cd(null);let t=new De;t.isRenderTargetTexture=!0,this._defaultTexture=t,this.updateBeforeType=E.RENDER}updateBefore(e){let{renderer:t,material:n}=e,r=this.envNode;if(r.isTextureNode||r.isMaterialReferenceNode){let e=r.isTextureNode?r.value:n[r.property];if(e&&e.isTexture){let n=e.mapping;if(n===303||n===304){if(Sm.has(e)){let t=Sm.get(e);Em(t,e.mapping),this._cubeTexture=t}else{let n=e.image;if(wm(n)){let r=new xm(n.height);r.fromEquirectangularTexture(t,e),Em(r.texture,e.mapping),this._cubeTexture=r.texture,Sm.set(e,r.texture),e.addEventListener(`dispose`,Tm)}else this._cubeTexture=this._defaultTexture}this._cubeTextureNode.value=this._cubeTexture}else this._cubeTextureNode=this.envNode}}}setup(e){return this.updateBefore(e),this._cubeTextureNode}};function wm(e){return e!=null&&e.height>0}function Tm(e){let t=e.target;t.removeEventListener(`dispose`,Tm);let n=Sm.get(t);n!==void 0&&(Sm.delete(t),n.dispose())}function Em(e,t){t===303?e.mapping=301:t===304&&(e.mapping=302)}var Dm=A(Cm).setParameterLength(1),Om=class extends Tp{static get type(){return`BasicEnvironmentNode`}constructor(e=null){super(),this.envNode=e}setup(e){e.context.environment=Dm(this.envNode)}},km=class extends Tp{static get type(){return`BasicLightMapNode`}constructor(e=null){super(),this.lightMapNode=e}setup(e){let t=F(1/Math.PI);e.context.irradianceLightMap=this.lightMapNode.mul(t)}},Am=class{start(e){e.lightsNode.setupLights(e,e.lightsNode.getLightNodes(e)),this.indirect(e)}finish(){}direct(){}directRectArea(){}indirect(){}ambientOcclusion(){}},jm=class extends Am{constructor(){super()}indirect({context:e}){let t=e.ambientOcclusion,n=e.reflectedLight,r=e.irradianceLightMap;n.indirectDiffuse.assign(B(0)),r?n.indirectDiffuse.addAssign(r):n.indirectDiffuse.addAssign(B(1,1,1,0)),n.indirectDiffuse.mulAssign(t),n.indirectDiffuse.mulAssign(ca.rgb)}finish(e){let{material:t,context:n}=e,r=n.outgoingLight,i=e.context.environment;if(i)switch(t.combine){case 0:r.rgb.assign(K(r.rgb,r.rgb.mul(i.rgb),cf.mul(lf)));break;case 1:r.rgb.assign(K(r.rgb,i.rgb,cf.mul(lf)));break;case 2:r.rgb.addAssign(i.rgb.mul(cf.mul(lf)));break;default:T(`BasicLightingModel: Unsupported .combine value:`,t.combine)}}},Mm=new gn,Nm=class extends om{static get type(){return`MeshBasicNodeMaterial`}constructor(e){super(),this.isMeshBasicNodeMaterial=!0,this.lights=!0,this.setDefaultValues(Mm),this.setValues(e)}setupNormal(){return Ru(Uu)}setupEnvironment(e){let t=super.setupEnvironment(e);return t?new Om(t):null}setupLightMap(e){let t=null;return e.material.lightMap&&(t=new km(Ff)),t}setupOutgoingLight(){return ca.rgb}setupLightingModel(){return new jm}},Pm=N(({f0:e,f90:t,dotVH:n})=>{let r=n.mul(-5.55473).sub(6.98316).mul(n).exp2();return e.mul(r.oneMinus()).add(t.mul(r))}),Fm=N(e=>e.diffuseColor.mul(1/Math.PI)),Im=()=>F(.25),Lm=N(({dotNH:e})=>Da.mul(F(.5)).add(1).mul(F(1/Math.PI)).mul(e.pow(Da))),Rm=N(({lightDirection:e})=>{let t=e.add(Fu).normalize(),n=J.dot(t).clamp(),r=Pm({f0:wa,f90:1,dotVH:Fu.dot(t).clamp()}),i=Im(),a=Lm({dotNH:n});return r.mul(i).mul(a)}),zm=class extends jm{constructor(e=!0){super(),this.specular=e}direct({lightDirection:e,lightColor:t,reflectedLight:n}){let r=J.dot(e).clamp().mul(t);n.directDiffuse.addAssign(r.mul(Fm({diffuseColor:ca.rgb}))),this.specular===!0&&n.directSpecular.addAssign(r.mul(Rm({lightDirection:e})).mul(cf))}indirect(e){let{ambientOcclusion:t,irradiance:n,reflectedLight:r}=e.context;r.indirectDiffuse.addAssign(n.mul(Fm({diffuseColor:ca}))),r.indirectDiffuse.mulAssign(t)}},Bm=new Mn,Vm=class extends om{static get type(){return`MeshLambertNodeMaterial`}constructor(e){super(),this.isMeshLambertNodeMaterial=!0,this.lights=!0,this.setDefaultValues(Bm),this.setValues(e)}setupEnvironment(e){let t=super.setupEnvironment(e);return t?new Om(t):null}setupLightingModel(){return new zm(!1)}},Hm=new Bn,Um=class extends om{static get type(){return`MeshPhongNodeMaterial`}constructor(e){super(),this.isMeshPhongNodeMaterial=!0,this.lights=!0,this.shininessNode=null,this.specularNode=null,this.setDefaultValues(Hm),this.setValues(e)}setupEnvironment(e){let t=super.setupEnvironment(e);return t?new Om(t):null}setupLightingModel(){return new zm}setupVariants(){let e=(this.shininessNode?F(this.shininessNode):tf).max(1e-4);Da.assign(e);let t=this.specularNode||af;wa.assign(t)}},Wm=N(e=>{if(e.geometry.hasAttribute(`normal`)===!1)return F(0);let t=Uu.dFdx().abs().max(Uu.dFdy().abs());return t.x.max(t.y).max(t.z)}),Gm=N(e=>{let{roughness:t}=e,n=Wm(),r=t.max(.0525);return r=r.add(n),r=r.min(1),r}),Km=N(({alpha:e,dotNL:t,dotNV:n})=>{let r=e.pow2(),i=t.mul(r.add(r.oneMinus().mul(n.pow2())).sqrt()),a=n.mul(r.add(r.oneMinus().mul(t.pow2())).sqrt());return $a(.5,i.add(a).max(So))}).setLayout({name:`V_GGX_SmithCorrelated`,type:`float`,inputs:[{name:`alpha`,type:`float`},{name:`dotNL`,type:`float`},{name:`dotNV`,type:`float`}]}),qm=N(({alphaT:e,alphaB:t,dotTV:n,dotBV:r,dotTL:i,dotBL:a,dotNV:o,dotNL:s})=>{let c=s.mul(z(e.mul(n),t.mul(r),o).length()),l=o.mul(z(e.mul(i),t.mul(a),s).length());return $a(.5,c.add(l).max(So))}).setLayout({name:`V_GGX_SmithCorrelated_Anisotropic`,type:`float`,inputs:[{name:`alphaT`,type:`float`,qualifier:`in`},{name:`alphaB`,type:`float`,qualifier:`in`},{name:`dotTV`,type:`float`,qualifier:`in`},{name:`dotBV`,type:`float`,qualifier:`in`},{name:`dotTL`,type:`float`,qualifier:`in`},{name:`dotBL`,type:`float`,qualifier:`in`},{name:`dotNV`,type:`float`,qualifier:`in`},{name:`dotNL`,type:`float`,qualifier:`in`}]}),Jm=N(({alpha:e,dotNH:t})=>{let n=e.pow2(),r=t.pow2().mul(n.oneMinus()).oneMinus();return n.div(r.pow2()).mul(1/Math.PI)}).setLayout({name:`D_GGX`,type:`float`,inputs:[{name:`alpha`,type:`float`},{name:`dotNH`,type:`float`}]}),Ym=F(1/Math.PI),Xm=N(({alphaT:e,alphaB:t,dotNH:n,dotTH:r,dotBH:i})=>{let a=e.mul(t),o=z(t.mul(r),e.mul(i),a.mul(n)),s=o.dot(o),c=a.div(s);return Ym.mul(a.mul(c.pow2()))}).setLayout({name:`D_GGX_Anisotropic`,type:`float`,inputs:[{name:`alphaT`,type:`float`,qualifier:`in`},{name:`alphaB`,type:`float`,qualifier:`in`},{name:`dotNH`,type:`float`,qualifier:`in`},{name:`dotTH`,type:`float`,qualifier:`in`},{name:`dotBH`,type:`float`,qualifier:`in`}]}),Zm=N(({lightDirection:e,f0:t,f90:n,roughness:r,f:i,normalView:a=J,USE_IRIDESCENCE:o,USE_ANISOTROPY:s})=>{let c=r.pow2(),l=e.add(Fu).normalize(),u=a.dot(e).clamp(),d=a.dot(Fu).clamp(),f=a.dot(l).clamp(),p=Pm({f0:t,f90:n,dotVH:Fu.dot(l).clamp()}),m,h;if(Oi(o)&&(p=_a.mix(p,i)),Oi(s)){let t=Sa.dot(e),n=Sa.dot(Fu),r=Sa.dot(l),i=Ca.dot(e),a=Ca.dot(Fu),o=Ca.dot(l);m=qm({alphaT:ba,alphaB:c,dotTV:n,dotBV:a,dotTL:t,dotBL:i,dotNV:d,dotNL:u}),h=Xm({alphaT:ba,alphaB:c,dotNH:f,dotTH:r,dotBH:o})}else m=Km({alpha:c,dotNL:u,dotNV:d}),h=Jm({alpha:c,dotNH:f});return p.mul(m).mul(h)}),Qm=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),$m=null,eh=N(({roughness:e,dotNV:t})=>{$m===null&&($m=new Ln(Qm,16,16,ln,Ie),$m.name=`DFG_LUT`,$m.minFilter=te,$m.magFilter=te,$m.wrapS=S,$m.wrapT=S,$m.generateMipmaps=!1,$m.needsUpdate=!0);let n=R(e,t);return q($m,n).rg}),th=N(({lightDirection:e,f0:t,f90:n,roughness:r,f:i,USE_IRIDESCENCE:a,USE_ANISOTROPY:o})=>{let s=Zm({lightDirection:e,f0:t,f90:n,roughness:r,f:i,USE_IRIDESCENCE:a,USE_ANISOTROPY:o}),c=J.dot(e).clamp(),l=eh({roughness:r,dotNV:J.dot(Fu).clamp()}),u=eh({roughness:r,dotNV:c}),d=t.mul(l.x).add(n.mul(l.y)),f=t.mul(u.x).add(n.mul(u.y)),p=l.x.add(l.y),m=u.x.add(u.y),h=F(1).sub(p),g=F(1).sub(m),_=t.add(t.oneMinus().mul(.047619)),v=d.mul(f).mul(_).div(F(1).sub(h.mul(g).mul(_).mul(_)).add(So)),y=h.mul(g),b=v.mul(y);return s.add(b)}),nh=N(e=>{let{dotNV:t,specularColor:n,specularF90:r,roughness:i}=e,a=eh({dotNV:t,roughness:i});return n.mul(a.x).add(r.mul(a.y))}),rh=N(({f:e,f90:t,dotVH:n})=>{let r=n.oneMinus().saturate(),i=r.mul(r),a=r.mul(i,i).clamp(0,.9999);return e.sub(z(t).mul(a)).div(a.oneMinus())}).setLayout({name:`Schlick_to_F0`,type:`vec3`,inputs:[{name:`f`,type:`vec3`},{name:`f90`,type:`float`},{name:`dotVH`,type:`float`}]}),ih=N(({roughness:e,dotNH:t})=>{let n=e.pow2(),r=F(1).div(n),i=t.pow2().oneMinus().max(.0078125);return F(2).add(r).mul(i.pow(r.mul(.5))).div(2*Math.PI)}).setLayout({name:`D_Charlie`,type:`float`,inputs:[{name:`roughness`,type:`float`},{name:`dotNH`,type:`float`}]}),ah=N(({dotNV:e,dotNL:t})=>F(1).div(F(4).mul(t.add(e).sub(t.mul(e))))).setLayout({name:`V_Neubelt`,type:`float`,inputs:[{name:`dotNV`,type:`float`},{name:`dotNL`,type:`float`}]}),oh=N(({lightDirection:e})=>{let t=e.add(Fu).normalize(),n=J.dot(e).clamp(),r=J.dot(Fu).clamp(),i=ih({roughness:ga,dotNH:J.dot(t).clamp()}),a=ah({dotNV:r,dotNL:n});return ha.mul(i).mul(a)}),sh=N(({N:e,V:t,roughness:n})=>{let r=R(n,e.dot(t).saturate().oneMinus().sqrt());return r.assign(r.mul(.984375).add(.0078125)),r}).setLayout({name:`LTC_Uv`,type:`vec2`,inputs:[{name:`N`,type:`vec3`},{name:`V`,type:`vec3`},{name:`roughness`,type:`float`}]}),ch=N(({f:e})=>{let t=e.length();return hs(t.mul(t).add(e.z).div(t.add(1)),0)}).setLayout({name:`LTC_ClippedSphereFormFactor`,type:`float`,inputs:[{name:`f`,type:`vec3`}]}),lh=N(({v1:e,v2:t})=>{let n=e.dot(t),r=n.abs().toVar(),i=r.mul(.0145206).add(.4965155).mul(r).add(.8543985).toVar(),a=r.add(4.1616724).mul(r).add(3.417594).toVar(),o=i.div(a),s=n.greaterThan(0).select(o,hs(n.mul(n).oneMinus(),1e-7).inverseSqrt().mul(.5).sub(o));return e.cross(t).mul(s)}).setLayout({name:`LTC_EdgeVectorFormFactor`,type:`vec3`,inputs:[{name:`v1`,type:`vec3`},{name:`v2`,type:`vec3`}]}),uh=N(({N:e,V:t,P:n,mInv:r,p0:i,p1:a,p2:o,p3:s})=>{let c=a.sub(i).toVar(),l=s.sub(i).toVar(),u=c.cross(l),d=z().toVar();return P(u.dot(n.sub(i)).greaterThanEqual(0),()=>{let c=t.sub(e.mul(t.dot(e))).normalize(),l=e.cross(c).negate(),u=r.mul($i(c,l,e).transpose()).toVar(),f=u.mul(i.sub(n)).normalize().toVar(),p=u.mul(a.sub(n)).normalize().toVar(),m=u.mul(o.sub(n)).normalize().toVar(),h=u.mul(s.sub(n)).normalize().toVar(),g=z(0).toVar();g.addAssign(lh({v1:f,v2:p})),g.addAssign(lh({v1:p,v2:m})),g.addAssign(lh({v1:m,v2:h})),g.addAssign(lh({v1:h,v2:f})),d.assign(z(ch({f:g})))}),d}).setLayout({name:`LTC_Evaluate`,type:`vec3`,inputs:[{name:`N`,type:`vec3`},{name:`V`,type:`vec3`},{name:`P`,type:`vec3`},{name:`mInv`,type:`mat3`},{name:`p0`,type:`vec3`},{name:`p1`,type:`vec3`},{name:`p2`,type:`vec3`},{name:`p3`,type:`vec3`}]}),dh=1/6,fh=e=>W(dh,W(e,W(e,e.negate().add(3)).sub(3)).add(1)),ph=e=>W(dh,W(e,W(e,W(3,e).sub(6))).add(4)),mh=e=>W(dh,W(e,W(e,W(-3,e).add(3)).add(3)).add(1)),hh=e=>W(dh,Ss(e,3)),gh=e=>fh(e).add(ph(e)),_h=e=>mh(e).add(hh(e)),vh=e=>Qa(-1,ph(e).div(fh(e).add(ph(e)))),yh=e=>Qa(1,hh(e).div(mh(e).add(hh(e)))),bh=(e,t,n)=>{let r=e.uvNode,i=W(r,t.zw).add(.5),a=Ro(i),o=Vo(i),s=gh(o.x),c=_h(o.x),l=vh(o.x),u=yh(o.x),d=vh(o.y),f=yh(o.y),p=R(a.x.add(l),a.y.add(d)).sub(.5).mul(t.xy),m=R(a.x.add(u),a.y.add(d)).sub(.5).mul(t.xy),h=R(a.x.add(l),a.y.add(f)).sub(.5).mul(t.xy),g=R(a.x.add(u),a.y.add(f)).sub(.5).mul(t.xy),_=gh(o.y).mul(Qa(s.mul(e.sample(p).level(n)),c.mul(e.sample(m).level(n)))),v=_h(o.y).mul(Qa(s.mul(e.sample(h).level(n)),c.mul(e.sample(g).level(n))));return _.add(v)},xh=N(([e,t])=>{let n=R(e.size(I(t))),r=R(e.size(I(t.add(1)))),i=$a(1,n),a=$a(1,r),o=bh(e,B(i,n),Ro(t)),s=bh(e,B(a,r),zo(t));return Vo(t).mix(o,s)}),Sh=N(([e,t])=>xh(e,t.mul(ll(e)))),Ch=N(([e,t,n,r,i])=>{let a=z(Ns(t.negate(),Bo(e),$a(1,r))),o=z(ns(i[0].xyz),ns(i[1].xyz),ns(i[2].xyz));return Bo(a).mul(n.mul(o))}).setLayout({name:`getVolumeTransmissionRay`,type:`vec3`,inputs:[{name:`n`,type:`vec3`},{name:`v`,type:`vec3`},{name:`thickness`,type:`float`},{name:`ior`,type:`float`},{name:`modelMatrix`,type:`mat4`}]}),wh=N(([e,t])=>e.mul(js(t.mul(2).sub(2),0,1))).setLayout({name:`applyIorToRoughness`,type:`float`,inputs:[{name:`roughness`,type:`float`},{name:`ior`,type:`float`}]}),Th=Mp(),Eh=Pp(),Dh=N(([e,t,n],{material:r})=>xh((r.side===1?Th:Eh).sample(e),Fo(Al.x).mul(wh(t,n)))),Oh=N(([e,t,n])=>(P(n.notEqual(0),()=>Mo(Po(t).negate().div(n).negate().mul(e))),z(1))).setLayout({name:`volumeAttenuation`,type:`vec3`,inputs:[{name:`transmissionDistance`,type:`float`},{name:`attenuationColor`,type:`vec3`},{name:`attenuationDistance`,type:`float`}]}),kh=N(([e,t,n,r,i,a,o,s,c,l,u,d,f,p,m])=>{let h,g;if(m){h=B().toVar(),g=z().toVar();let i=u.sub(1).mul(m.mul(.025)),a=z(u.sub(i),u,u.add(i));gp({start:0,end:3},({i})=>{let u=a.element(i),m=Ch(e,t,d,u,s),_=o.add(m),v=l.mul(c.mul(B(_,1))),y=R(v.xy.div(v.w)).toVar();y.addAssign(1),y.divAssign(2),y.assign(R(y.x,y.y.oneMinus()));let b=Dh(y,n,u);h.element(i).assign(b.element(i)),h.a.addAssign(b.a),g.element(i).assign(r.element(i).mul(Oh(ns(m),f,p).element(i)))}),h.a.divAssign(3)}else{let i=Ch(e,t,d,u,s),a=o.add(i),m=l.mul(c.mul(B(a,1))),_=R(m.xy.div(m.w)).toVar();_.addAssign(1),_.divAssign(2),_.assign(R(_.x,_.y.oneMinus())),h=Dh(_,n,u),g=r.mul(Oh(ns(i),f,p))}let _=g.rgb.mul(h.rgb),v=z(nh({dotNV:e.dot(t).clamp(),specularColor:i,specularF90:a,roughness:n})),y=g.r.add(g.g,g.b).div(3);return B(v.oneMinus().mul(_),h.a.oneMinus().mul(y).oneMinus())}),Ah=$i(3.2404542,-.969266,.0556434,-1.5371385,1.8760108,-.2040259,-.4985314,.041556,1.0572252),jh=e=>{let t=e.sqrt();return z(1).add(t).div(z(1).sub(t))},Mh=(e,t)=>e.sub(t).div(e.add(t)).pow2(),Nh=(e,t)=>{let n=e.mul(2*Math.PI*1e-9),r=z(54856e-17,44201e-17,52481e-17),i=z(1681e3,1795300,2208400),a=z(43278e5,93046e5,66121e5),o=F(9747e-17*Math.sqrt(2*Math.PI*45282e5)).mul(n.mul(2239900).add(t.x).cos()).mul(n.pow2().mul(-45282e5).exp()),s=r.mul(a.mul(2*Math.PI).sqrt()).mul(i.mul(n).add(t).cos()).mul(n.pow2().negate().mul(a).exp());return s=z(s.x.add(o),s.y,s.z).div(1.0685e-7),Ah.mul(s)},Ph=N(({outsideIOR:e,eta2:t,cosTheta1:n,thinFilmThickness:r,baseF0:i})=>{let a=K(e,t,Ps(0,.03,r)),o=e.div(a).pow2().mul(n.pow2().oneMinus()).oneMinus();P(o.lessThan(0),()=>z(1));let s=o.sqrt(),c=Pm({f0:Mh(a,e),f90:1,dotVH:n}),l=c.oneMinus(),u=a.lessThan(e).select(Math.PI,0),d=F(Math.PI).sub(u),f=jh(i.clamp(0,.9999)),p=Pm({f0:Mh(f,a.toVec3()),f90:1,dotVH:s}),m=z(f.x.lessThan(a).select(Math.PI,0),f.y.lessThan(a).select(Math.PI,0),f.z.lessThan(a).select(Math.PI,0)),h=a.mul(r,s,2),g=z(d).add(m),_=c.mul(p).clamp(1e-5,.9999),v=_.sqrt(),y=l.pow2().mul(p).div(z(1).sub(_)),b=c.add(y).toVar(),x=y.sub(l).toVar();return gp({start:1,end:2,condition:`<=`,name:`m`},({m:e})=>{x.mulAssign(v);let t=Nh(F(e).mul(h),F(e).mul(g)).mul(2);b.addAssign(x.mul(t))}),b.max(z(0))}).setLayout({name:`evalIridescence`,type:`vec3`,inputs:[{name:`outsideIOR`,type:`float`},{name:`eta2`,type:`float`},{name:`cosTheta1`,type:`float`},{name:`thinFilmThickness`,type:`float`},{name:`baseF0`,type:`vec3`}]}),Fh=N(({normal:e,viewDir:t,roughness:n})=>{let r=e.dot(t).saturate(),i=n.mul(n),a=n.add(.1).reciprocal(),o=F(-1.9362).add(n.mul(1.0678)).add(i.mul(.4573)).sub(a.mul(.8469)),s=F(-.6014).add(n.mul(.5538)).sub(i.mul(.467)).sub(a.mul(.1255));return o.mul(r).add(s).exp().saturate()}),Ih=z(.04),Lh=F(1),Rh=class extends Am{constructor(e=!1,t=!1,n=!1,r=!1,i=!1,a=!1){super(),this.clearcoat=e,this.sheen=t,this.iridescence=n,this.anisotropy=r,this.transmission=i,this.dispersion=a,this.clearcoatRadiance=null,this.clearcoatSpecularDirect=null,this.clearcoatSpecularIndirect=null,this.sheenSpecularDirect=null,this.sheenSpecularIndirect=null,this.iridescenceFresnel=null,this.iridescenceF0=null,this.iridescenceF0Dielectric=null,this.iridescenceF0Metallic=null}start(e){if(this.clearcoat===!0&&(this.clearcoatRadiance=z().toVar(`clearcoatRadiance`),this.clearcoatSpecularDirect=z().toVar(`clearcoatSpecularDirect`),this.clearcoatSpecularIndirect=z().toVar(`clearcoatSpecularIndirect`)),this.sheen===!0&&(this.sheenSpecularDirect=z().toVar(`sheenSpecularDirect`),this.sheenSpecularIndirect=z().toVar(`sheenSpecularIndirect`)),this.iridescence===!0){let e=J.dot(Fu).clamp(),t=Ph({outsideIOR:F(1),eta2:va,cosTheta1:e,thinFilmThickness:ya,baseF0:wa}),n=Ph({outsideIOR:F(1),eta2:va,cosTheta1:e,thinFilmThickness:ya,baseF0:ca.rgb});this.iridescenceFresnel=K(t,n,fa),this.iridescenceF0Dielectric=rh({f:t,f90:1,dotVH:e}),this.iridescenceF0Metallic=rh({f:n,f90:1,dotVH:e}),this.iridescenceF0=K(this.iridescenceF0Dielectric,this.iridescenceF0Metallic,fa)}if(this.transmission===!0){let t=Mu,n=au.sub(Mu).normalize(),r=Gu,i=e.context;i.backdrop=kh(r,n,da,la,Ta,Ea,t,_u,nu,eu,Ma,Pa,Ia,Fa,this.dispersion?La:null),i.backdropAlpha=Na,ca.a.mulAssign(K(1,i.backdrop.a,Na))}super.start(e)}computeMultiscattering(e,t,n,r,i=null){let a=eh({roughness:da,dotNV:J.dot(Fu).clamp()}),o=i?_a.mix(r,i):r,s=o.mul(a.x).add(n.mul(a.y)),c=a.x.add(a.y).oneMinus(),l=o.add(o.oneMinus().mul(.047619)),u=s.mul(l).div(c.mul(l).oneMinus());e.addAssign(s),t.addAssign(u.mul(c))}direct({lightDirection:e,lightColor:t,reflectedLight:n}){let r=J.dot(e).clamp().mul(t).toVar();if(this.sheen===!0){this.sheenSpecularDirect.addAssign(r.mul(oh({lightDirection:e})));let t=Fh({normal:J,viewDir:Fu,roughness:ga}),n=Fh({normal:J,viewDir:e,roughness:ga}),i=ha.r.max(ha.g).max(ha.b).mul(t.max(n)).oneMinus();r.mulAssign(i)}if(this.clearcoat===!0){let n=Ku.dot(e).clamp().mul(t);this.clearcoatSpecularDirect.addAssign(n.mul(Zm({lightDirection:e,f0:Ih,f90:Lh,roughness:ma,normalView:Ku})))}n.directDiffuse.addAssign(r.mul(Fm({diffuseColor:la}))),n.directSpecular.addAssign(r.mul(th({lightDirection:e,f0:Ta,f90:1,roughness:da,f:this.iridescenceFresnel,USE_IRIDESCENCE:this.iridescence,USE_ANISOTROPY:this.anisotropy})))}directRectArea({lightColor:e,lightPosition:t,halfWidth:n,halfHeight:r,reflectedLight:i,ltc_1:a,ltc_2:o}){let s=t.add(n).sub(r),c=t.sub(n).sub(r),l=t.sub(n).add(r),u=t.add(n).add(r),d=J,f=Fu,p=Pu.toVar(),m=sh({N:d,V:f,roughness:da}),h=a.sample(m).toVar(),g=o.sample(m).toVar(),_=$i(z(h.x,0,h.y),z(0,1,0),z(h.z,0,h.w)).toVar(),v=Ta.mul(g.x).add(Ea.sub(Ta).mul(g.y)).toVar();if(i.directSpecular.addAssign(e.mul(v).mul(uh({N:d,V:f,P:p,mInv:_,p0:s,p1:c,p2:l,p3:u}))),i.directDiffuse.addAssign(e.mul(la).mul(uh({N:d,V:f,P:p,mInv:$i(1,0,0,0,1,0,0,0,1),p0:s,p1:c,p2:l,p3:u}))),this.clearcoat===!0){let t=Ku,n=sh({N:t,V:f,roughness:ma}),r=a.sample(n),i=o.sample(n),d=$i(z(r.x,0,r.y),z(0,1,0),z(r.z,0,r.w)),m=Ih.mul(i.x).add(Lh.sub(Ih).mul(i.y));this.clearcoatSpecularDirect.addAssign(e.mul(m).mul(uh({N:t,V:f,P:p,mInv:d,p0:s,p1:c,p2:l,p3:u})))}}indirect(e){this.indirectDiffuse(e),this.indirectSpecular(e),this.ambientOcclusion(e)}indirectDiffuse(e){let{irradiance:t,reflectedLight:n}=e.context,r=t.mul(Fm({diffuseColor:la})).toVar();if(this.sheen===!0){let e=Fh({normal:J,viewDir:Fu,roughness:ga}),t=ha.r.max(ha.g).max(ha.b).mul(e).oneMinus();r.mulAssign(t)}n.indirectDiffuse.addAssign(r)}indirectSpecular(e){let{radiance:t,iblIrradiance:n,reflectedLight:r}=e.context;if(this.sheen===!0&&this.sheenSpecularIndirect.addAssign(n.mul(ha,Fh({normal:J,viewDir:Fu,roughness:ga}))),this.clearcoat===!0){let e=nh({dotNV:Ku.dot(Fu).clamp(),specularColor:Ih,specularF90:Lh,roughness:ma});this.clearcoatSpecularIndirect.addAssign(this.clearcoatRadiance.mul(e))}let i=z().toVar(`singleScatteringDielectric`),a=z().toVar(`multiScatteringDielectric`),o=z().toVar(`singleScatteringMetallic`),s=z().toVar(`multiScatteringMetallic`);this.computeMultiscattering(i,a,Ea,wa,this.iridescenceF0Dielectric),this.computeMultiscattering(o,s,Ea,ca.rgb,this.iridescenceF0Metallic);let c=K(i,o,fa),l=K(a,s,fa),u=i.add(a),d=la.mul(u.oneMinus()),f=n.mul(1/Math.PI),p=t.mul(c).add(l.mul(f)).toVar(),m=d.mul(f).toVar();if(this.sheen===!0){let e=Fh({normal:J,viewDir:Fu,roughness:ga}),t=ha.r.max(ha.g).max(ha.b).mul(e).oneMinus();p.mulAssign(t),m.mulAssign(t)}r.indirectSpecular.addAssign(p),r.indirectDiffuse.addAssign(m)}ambientOcclusion(e){let{ambientOcclusion:t,reflectedLight:n}=e.context,r=J.dot(Fu).clamp().add(t),i=da.mul(-16).oneMinus().negate().exp2(),a=t.sub(r.pow(i).oneMinus()).clamp();this.clearcoat===!0&&this.clearcoatSpecularIndirect.mulAssign(t),this.sheen===!0&&this.sheenSpecularIndirect.mulAssign(t),n.indirectDiffuse.mulAssign(t),n.indirectSpecular.mulAssign(a)}finish({context:e}){let{outgoingLight:t}=e;if(this.clearcoat===!0){let e=Pm({dotVH:Ku.dot(Fu).clamp(),f0:Ih,f90:Lh}),n=t.mul(pa.mul(e).oneMinus()).add(this.clearcoatSpecularDirect.add(this.clearcoatSpecularIndirect).mul(pa));t.assign(n)}if(this.sheen===!0){let e=t.add(this.sheenSpecularDirect,this.sheenSpecularIndirect.mul(1/Math.PI));t.assign(e)}}},zh=F(1),Bh=F(-2),Vh=F(.8),Hh=F(-1),Uh=F(.4),Wh=F(2),Gh=F(.305),Kh=F(3),qh=F(.21),Jh=F(4),Yh=F(4),Xh=F(16),Zh=N(([e])=>{let t=z(es(e)).toVar(),n=F(-1).toVar();return P(t.x.greaterThan(t.z),()=>{P(t.x.greaterThan(t.y),()=>{n.assign(Hs(e.x.greaterThan(0),0,3))}).Else(()=>{n.assign(Hs(e.y.greaterThan(0),1,4))})}).Else(()=>{P(t.z.greaterThan(t.y),()=>{n.assign(Hs(e.z.greaterThan(0),2,5))}).Else(()=>{n.assign(Hs(e.y.greaterThan(0),1,4))})}),n}).setLayout({name:`getFace`,type:`float`,inputs:[{name:`direction`,type:`vec3`}]}),Qh=N(([e,t])=>{let n=R().toVar();return P(t.equal(0),()=>{n.assign(R(e.z,e.y).div(es(e.x)))}).ElseIf(t.equal(1),()=>{n.assign(R(e.x.negate(),e.z.negate()).div(es(e.y)))}).ElseIf(t.equal(2),()=>{n.assign(R(e.x.negate(),e.y).div(es(e.z)))}).ElseIf(t.equal(3),()=>{n.assign(R(e.z.negate(),e.y).div(es(e.x)))}).ElseIf(t.equal(4),()=>{n.assign(R(e.x.negate(),e.z).div(es(e.y)))}).Else(()=>{n.assign(R(e.x,e.y).div(es(e.z)))}),W(.5,n.add(1))}).setLayout({name:`getUV`,type:`vec2`,inputs:[{name:`direction`,type:`vec3`},{name:`face`,type:`float`}]}),$h=N(([e])=>{let t=F(0).toVar();return P(e.greaterThanEqual(Vh),()=>{t.assign(zh.sub(e).mul(Hh.sub(Bh)).div(zh.sub(Vh)).add(Bh))}).ElseIf(e.greaterThanEqual(Uh),()=>{t.assign(Vh.sub(e).mul(Wh.sub(Hh)).div(Vh.sub(Uh)).add(Hh))}).ElseIf(e.greaterThanEqual(Gh),()=>{t.assign(Uh.sub(e).mul(Kh.sub(Wh)).div(Uh.sub(Gh)).add(Wh))}).ElseIf(e.greaterThanEqual(qh),()=>{t.assign(Gh.sub(e).mul(Jh.sub(Kh)).div(Gh.sub(qh)).add(Kh))}).Else(()=>{t.assign(F(-2).mul(Fo(W(1.16,e))))}),t}).setLayout({name:`roughnessToMip`,type:`float`,inputs:[{name:`roughness`,type:`float`}]}),eg=N(([e,t])=>{let n=e.toVar();n.assign(W(2,n).sub(1));let r=z(n,1).toVar();return P(t.equal(0),()=>{r.assign(r.zyx)}).ElseIf(t.equal(1),()=>{r.assign(r.xzy),r.xz.mulAssign(-1)}).ElseIf(t.equal(2),()=>{r.x.mulAssign(-1)}).ElseIf(t.equal(3),()=>{r.assign(r.zyx),r.xz.mulAssign(-1)}).ElseIf(t.equal(4),()=>{r.assign(r.xzy),r.xy.mulAssign(-1)}).ElseIf(t.equal(5),()=>{r.z.mulAssign(-1)}),r}).setLayout({name:`getDirection`,type:`vec3`,inputs:[{name:`uv`,type:`vec2`},{name:`face`,type:`float`}]}),tg=N(([e,t,n,r,i,a])=>{let o=F(n),s=z(t),c=js($h(o),Bh,a),l=Vo(c),u=Ro(c),d=z(ng(e,s,u,r,i,a)).toVar();return P(l.notEqual(0),()=>{let t=z(ng(e,s,u.add(1),r,i,a)).toVar();d.assign(K(d,t,l))}),d}),ng=N(([e,t,n,r,i,a])=>{let o=F(n).toVar(),s=z(t),c=F(Zh(s)).toVar(),l=F(hs(Yh.sub(o),0)).toVar();o.assign(hs(o,Yh));let u=F(No(o)).toVar(),d=R(Qh(s,c).mul(u.sub(2)).add(1)).toVar();return P(c.greaterThan(2),()=>{d.y.addAssign(u),c.subAssign(3)}),d.x.addAssign(c.mul(u)),d.x.addAssign(l.mul(W(3,Xh))),d.y.addAssign(W(4,No(a).sub(u))),d.x.mulAssign(r),d.y.mulAssign(i),e.sample(d).grad(R(),R())}),rg=N(({envMap:e,mipInt:t,outputDirection:n,theta:r,axis:i,CUBEUV_TEXEL_WIDTH:a,CUBEUV_TEXEL_HEIGHT:o,CUBEUV_MAX_MIP:s})=>{let c=Wo(r);return ng(e,n.mul(c).add(i.cross(n).mul(Ho(r))).add(i.mul(i.dot(n).mul(c.oneMinus()))),t,a,o,s)}),ig=N(({n:e,latitudinal:t,poleAxis:n,outputDirection:r,weights:i,samples:a,dTheta:o,mipInt:s,envMap:c,CUBEUV_TEXEL_WIDTH:l,CUBEUV_TEXEL_HEIGHT:u,CUBEUV_MAX_MIP:d})=>{let f=z(Hs(t,n,xs(n,r))).toVar();P(f.equal(z(0)),()=>{f.assign(z(r.z,0,r.x.negate()))}),f.assign(Bo(f));let p=z().toVar();return p.addAssign(i.element(0).mul(rg({theta:0,axis:f,outputDirection:r,mipInt:s,envMap:c,CUBEUV_TEXEL_WIDTH:l,CUBEUV_TEXEL_HEIGHT:u,CUBEUV_MAX_MIP:d}))),gp({start:I(1),end:e},({i:e})=>{P(e.greaterThanEqual(a),()=>{vp()});let t=F(o.mul(F(e))).toVar();p.addAssign(i.element(e).mul(rg({theta:t.mul(-1),axis:f,outputDirection:r,mipInt:s,envMap:c,CUBEUV_TEXEL_WIDTH:l,CUBEUV_TEXEL_HEIGHT:u,CUBEUV_MAX_MIP:d}))),p.addAssign(i.element(e).mul(rg({theta:t,axis:f,outputDirection:r,mipInt:s,envMap:c,CUBEUV_TEXEL_WIDTH:l,CUBEUV_TEXEL_HEIGHT:u,CUBEUV_MAX_MIP:d})))}),B(p,1)}),ag=N(([e])=>{let t=L(e).toVar();return t.assign(t.shiftLeft(L(16)).bitOr(t.shiftRight(L(16)))),t.assign(t.bitAnd(L(1431655765)).shiftLeft(L(1)).bitOr(t.bitAnd(L(2863311530)).shiftRight(L(1)))),t.assign(t.bitAnd(L(858993459)).shiftLeft(L(2)).bitOr(t.bitAnd(L(3435973836)).shiftRight(L(2)))),t.assign(t.bitAnd(L(252645135)).shiftLeft(L(4)).bitOr(t.bitAnd(L(4042322160)).shiftRight(L(4)))),t.assign(t.bitAnd(L(16711935)).shiftLeft(L(8)).bitOr(t.bitAnd(L(4278255360)).shiftRight(L(8)))),F(t).mul(23283064365386963e-26)}),og=N(([e,t])=>R(F(e).div(F(t)),ag(e))),sg=N(([e,t,n])=>{let r=n.mul(n).toConst(),i=z(1,0,0).toConst(),a=xs(t,i).toConst(),o=Io(e.x).toConst(),s=W(2,3.14159265359).mul(e.y).toConst(),c=o.mul(Wo(s)).toConst(),l=o.mul(Ho(s)).toVar(),u=W(.5,t.z.add(1)).toConst();l.assign(u.oneMinus().mul(Io(c.mul(c).oneMinus())).add(u.mul(l)));let d=i.mul(c).add(a.mul(l)).add(t.mul(Io(hs(0,c.mul(c).add(l.mul(l)).oneMinus()))));return Bo(z(r.mul(d.x),r.mul(d.y),hs(0,d.z)))}),cg=N(({roughness:e,mipInt:t,envMap:n,N_immutable:r,GGX_SAMPLES:i,CUBEUV_TEXEL_WIDTH:a,CUBEUV_TEXEL_HEIGHT:o,CUBEUV_MAX_MIP:s})=>{let c=z(r).toVar(),l=z(0).toVar(),u=F(0).toVar();return P(e.lessThan(.001),()=>{l.assign(ng(n,c,t,a,o,s))}).Else(()=>{let r=Bo(xs(Hs(es(c.z).lessThan(.999),z(0,0,1),z(1,0,0)),c)).toVar(),d=xs(c,r).toVar();gp({start:L(0),end:i},({i:f})=>{let p=sg(og(f,i),z(0,0,1),e),m=Bo(r.mul(p.x).add(d.mul(p.y)).add(c.mul(p.z))),h=Bo(m.mul(bs(c,m).mul(2)).sub(c)),g=hs(bs(c,h),0);P(g.greaterThan(0),()=>{let e=ng(n,h,t,a,o,s);l.addAssign(e.mul(g)),u.addAssign(g)})}),P(u.greaterThan(0),()=>{l.assign(l.div(u))})}),B(l,1)}),lg=4,ug=[.125,.215,.35,.446,.526,.582],dg=20,fg=512,pg=new Yn(-1,1,1,-1,0,1),mg=new Pe(90,1),hg=new de,gg=null,_g=0,vg=0,yg=new w,bg=new WeakMap,xg=[3,1,5,0,4,2],Sg=eg(sl(),ol(`faceIndex`)).normalize(),Cg=z(Sg.x,Sg.y,Sg.z),wg=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._blurMaterial=null,this._ggxMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._backgroundBox=null}get _hasInitialized(){return this._renderer.hasInitialized()}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=yg,renderTarget:s=null}=i;if(this._setSize(a),this._hasInitialized===!1)throw Error(`THREE.PMREMGenerator: .fromScene() called before the backend is initialized. Use "await renderer.init();" before using this method.`);gg=this._renderer.getRenderTarget(),_g=this._renderer.getActiveCubeFace(),vg=this._renderer.getActiveMipmapLevel();let c=s||this._allocateTarget(!0);return this._init(c),this._sceneToCubeUV(e,n,r,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}async fromSceneAsync(e,t=0,n=.1,r=100,i={}){return Qn(`PMREMGenerator: ".fromSceneAsync()" is deprecated. Use "await renderer.init()" instead.`),await this._renderer.init(),this.fromScene(e,t,n,r,i)}fromEquirectangular(e,t=null){if(this._hasInitialized===!1)throw Error(`THREE.PMREMGenerator: .fromEquirectangular() called before the backend is initialized. Use "await renderer.init();" before using this method.`);return this._fromTexture(e,t)}async fromEquirectangularAsync(e,t=null){return Qn(`PMREMGenerator: ".fromEquirectangularAsync()" is deprecated. Use "await renderer.init()" instead.`),await this._renderer.init(),this._fromTexture(e,t)}fromCubemap(e,t=null){if(this._hasInitialized===!1)throw Error(`THREE.PMREMGenerator: .fromCubemap() called before the backend is initialized. Use "await renderer.init();" before using this method.`);return this._fromTexture(e,t)}async fromCubemapAsync(e,t=null){return Qn(`PMREMGenerator: ".fromCubemapAsync()" is deprecated. Use "await renderer.init()" instead.`),await this._renderer.init(),this._fromTexture(e,t)}async compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ag(),await this._compileMaterial(this._cubemapMaterial))}async compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=jg(),await this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSizeFromTexture(e){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4)}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(gg,_g,vg),e.scissorTest=!1,this._setViewport(e,0,0,e.width,e.height)}_fromTexture(e,t){this._setSizeFromTexture(e),gg=this._renderer.getRenderTarget(),_g=this._renderer.getActiveCubeFace(),vg=this._renderer.getActiveMipmapLevel();let n=t||this._allocateTarget(!1);return this._init(n),this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTarget(e){return Eg(3*Math.max(this._cubeSize,112),4*this._cubeSize,e)}_init(e){if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e.width||this._pingPongRenderTarget.height!==e.height){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Eg(e.width,e.height);let{_lodMax:t}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Tg(t)),this._blurMaterial=Og(t,e.width,e.height),this._ggxMaterial=kg(t,e.width,e.height)}}async _compileMaterial(e){let t=new ft(new Ue,e);await this._renderer.compile(t,pg)}_sceneToCubeUV(e,t,n,r,i){let a=mg;a.near=t,a.far=n;let o=[1,1,1,1,-1,1],s=[1,-1,1,-1,1,-1],c=this._renderer,l=c.autoClear;c.getClearColor(hg),c.autoClear=!1,this._backgroundBox===null&&(this._backgroundBox=new ft(new nr,new gn({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let u=this._backgroundBox,d=u.material,f=!1,p=e.background;p?p.isColor&&(d.color.copy(p),e.background=null,f=!0):(d.color.copy(hg),f=!0),c.setRenderTarget(r),c.clear(),f&&c.render(u,a);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;this._setViewport(r,n*l,t>2?l:0,l,l),c.render(e,a)}c.autoClear=l,e.background=p}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?this._cubemapMaterial===null&&(this._cubemapMaterial=Ag(e)):this._equirectMaterial===null&&(this._equirectMaterial=jg(e));let i=r?this._cubemapMaterial:this._equirectMaterial;i.fragmentNode.value=e;let a=this._lodMeshes[0];a.material=i;let o=this._cubeSize;this._setViewport(t,0,0,3*o,2*o),n.setRenderTarget(t),n.render(a,pg)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=bg.get(a),c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-lg?n-d+lg:0),m=4*(this._cubeSize-f);e.texture.frame=(e.texture.frame||0)+1,s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,this._setViewport(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,pg),i.texture.frame=(i.texture.frame||0)+1,s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,this._setViewport(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,pg)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&C(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=bg.get(c),d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):dg;m>dg&&T(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${dg}`);let h=[],g=0;for(let e=0;e<dg;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;e.texture.frame=(e.texture.frame||0)+1,u.envMap.value=e.texture,u.samples.value=m,u.weights.array=h,u.latitudinal.value=+(a===`latitudinal`),o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r],y=3*v*(r>_-lg?r-_+lg:0),b=4*(this._cubeSize-v);this._setViewport(t,y,b,3*v,2*v),s.setRenderTarget(t),s.render(l,pg)}_setViewport(e,t,n,r,i){this._renderer.isWebGLRenderer?(e.viewport.set(t,e.height-i-n,r,i),e.scissor.set(t,e.height-i-n,r,i)):(e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i))}};function Tg(e){let t=[],n=[],r=[],i=e,a=e-lg+1+ug.length;for(let s=0;s<a;s++){let a=2**i;t.push(a);let c=1/a;s>e-lg?c=ug[s-e+lg-1]:s===0&&(c=0),n.push(c);let l=1/(a-2),u=-l,d=1+l,f=[u,u,d,u,d,d,u,u,d,d,u,d],p=new Float32Array(108),m=new Float32Array(72),h=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0],i=xg[e];p.set(r,18*i),m.set(f,12*i);let a=[i,i,i,i,i,i];h.set(a,6*i)}let g=new Ue;g.setAttribute(`position`,new o(p,3)),g.setAttribute(`uv`,new o(m,2)),g.setAttribute(`faceIndex`,new o(h,1)),r.push(new ft(g,null)),i>lg&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function Eg(e,t,n){let r=new Xn(e,t,{magFilter:te,minFilter:te,generateMipmaps:!1,type:Ie,format:oe,colorSpace:nt,depthBuffer:n});return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.texture.isPMREMTexture=!0,r.scissorTest=!0,r}function Dg(e){let t=new om;return t.depthTest=!1,t.depthWrite=!1,t.blending=0,t.name=`PMREM_${e}`,t}function Og(e,t,n){let r=Cl(Array(dg).fill(0)),i=H(new w(0,1,0)),a=H(0),o=F(dg),s=H(0),c={n:o,latitudinal:s,weights:r,poleAxis:i,outputDirection:Cg,dTheta:a,samples:H(1),envMap:q(),mipInt:H(0),CUBEUV_TEXEL_WIDTH:F(1/t),CUBEUV_TEXEL_HEIGHT:F(1/n),CUBEUV_MAX_MIP:F(e)},l=Dg(`blur`);return l.fragmentNode=ig({...c,latitudinal:s.equal(1)}),bg.set(l,c),l}function kg(e,t,n){let r={envMap:q(),roughness:H(0),mipInt:H(0),CUBEUV_TEXEL_WIDTH:F(1/t),CUBEUV_TEXEL_HEIGHT:F(1/n),CUBEUV_MAX_MIP:F(e)},i=Dg(`ggx`);return i.fragmentNode=cg({...r,N_immutable:Cg,GGX_SAMPLES:L(fg)}),bg.set(i,r),i}function Ag(e){let t=Dg(`cubemap`);return t.fragmentNode=cd(e,Cg),t}function jg(e){let t=Dg(`equirect`);return t.fragmentNode=q(e,ym(Cg),0),t}var Mg=new WeakMap;function Ng(e){let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(2**t,112)),texelHeight:n,maxMip:t}}function Pg(e,t,n){let r=Fg(t),i=r.get(e);if((i===void 0?-1:i.pmremVersion)!==e.pmremVersion){let t=e.image;if(e.isCubeTexture){if(Lg(t))i=n.fromCubemap(e,i);else return null}else if(Rg(t))i=n.fromEquirectangular(e,i);else return null;if(i.pmremVersion=e.pmremVersion,r.has(e)===!1){let t=()=>{e.removeEventListener(`dispose`,t);let n=r.get(e);n!==void 0&&(n.dispose(),r.delete(e))};e.addEventListener(`dispose`,t)}r.set(e,i)}return i.texture}function Fg(e){let t=Mg.get(e);return t===void 0&&(t=new WeakMap,Mg.set(e,t)),t}var Ig=class extends Vr{static get type(){return`PMREMNode`}constructor(e,t=null,n=null){super(`vec3`),this._value=e,this._pmrem=null,this.uvNode=t,this.levelNode=n,this._generator=null;let r=new Je;r.isRenderTargetTexture=!0,this._texture=q(r),this._width=H(0),this._height=H(0),this._maxMip=H(0),this.updateBeforeType=E.RENDER}set value(e){this._value=e,this._pmrem=null}get value(){return this._value}updateFromTexture(e){let t=Ng(e.image.height);this._texture.value=e,this._width.value=t.texelWidth,this._height.value=t.texelHeight,this._maxMip.value=t.maxMip}updateBefore(e){let t=this._pmrem,n=t?t.pmremVersion:-1,r=this._value;n!==r.pmremVersion&&(t=r.isPMREMTexture===!0||r.mapping===306?r:Pg(r,e.renderer,this._generator),t!==null&&(this._pmrem=t,this.updateFromTexture(t)))}setup(e){this._generator===null&&(this._generator=new wg(e.renderer)),this.updateBefore(e);let t=this.uvNode;t===null&&e.context.getUV&&(t=e.context.getUV(this,e)),t=this._pmrem.isRenderTargetTexture?td.mul(z(t.x,t.y.negate(),t.z)):td.mul(t);let n=this.levelNode;return n===null&&e.context.getTextureLevel&&(n=e.context.getTextureLevel(this)),tg(this._texture,t,n,this._width,this._height,this._maxMip)}dispose(){super.dispose(),this._generator!==null&&this._generator.dispose()}};function Lg(e){if(e==null)return!1;let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function Rg(e){return e!=null&&e.height>0}var zg=A(Ig).setParameterLength(1,3),Bg=new WeakMap,Vg=class extends Tp{static get type(){return`EnvironmentNode`}constructor(e=null){super(),this.envNode=e}setup(e){let{material:t}=e,n=this.envNode;if(n.isTextureNode||n.isMaterialReferenceNode){let r=n.isTextureNode?n.value:t[n.property],i=this._getPMREMNodeCache(e.renderer),a=i.get(r);a===void 0&&(a=zg(r),i.set(r,a)),n=a}let r=t.useAnisotropy===!0||t.anisotropy>0?Hd:J,i=n.context(Hg(da,r)).mul(ed),a=n.context(Ug(Gu)).mul(Math.PI).mul(ed),o=Bc(i),s=Bc(a);e.context.radiance.addAssign(o),e.context.iblIrradiance.addAssign(s);let c=e.context.lightingModel.clearcoatRadiance;if(c){let e=Bc(n.context(Hg(ma,Ku)).mul(ed));c.addAssign(e)}}_getPMREMNodeCache(e){let t=Bg.get(e);return t===void 0&&(t=new WeakMap,Bg.set(e,t)),t}},Hg=(e,t)=>{let n=null;return{getUV:()=>(n===null&&(n=Fu.negate().reflect(t),n=Ts(e).mix(n,t).normalize(),n=n.transformDirection(ru)),n),getTextureLevel:()=>e}},Ug=e=>({getUV:()=>e,getTextureLevel:()=>F(1)}),Wg=new Nt,Gg=class extends om{static get type(){return`MeshStandardNodeMaterial`}constructor(e){super(),this.isMeshStandardNodeMaterial=!0,this.lights=!0,this.emissiveNode=null,this.metalnessNode=null,this.roughnessNode=null,this.setDefaultValues(Wg),this.setValues(e)}setupEnvironment(e){let t=super.setupEnvironment(e);return t===null&&e.environmentNode&&(t=e.environmentNode),t?new Vg(t):null}setupLightingModel(){return new Rh}setupSpecular(){let e=K(z(.04),ca.rgb,fa);wa.assign(z(.04)),Ta.assign(e),Ea.assign(1)}setupVariants(){let e=this.metalnessNode?F(this.metalnessNode):df;fa.assign(e);let t=this.roughnessNode?F(this.roughnessNode):uf;t=Gm({roughness:t}),da.assign(t),this.setupSpecular(),la.assign(ca.rgb.mul(e.oneMinus()))}},Kg=new Et,qg=class extends Gg{static get type(){return`MeshPhysicalNodeMaterial`}constructor(e){super(),this.isMeshPhysicalNodeMaterial=!0,this.clearcoatNode=null,this.clearcoatRoughnessNode=null,this.clearcoatNormalNode=null,this.sheenNode=null,this.sheenRoughnessNode=null,this.iridescenceNode=null,this.iridescenceIORNode=null,this.iridescenceThicknessNode=null,this.specularIntensityNode=null,this.specularColorNode=null,this.iorNode=null,this.transmissionNode=null,this.thicknessNode=null,this.attenuationDistanceNode=null,this.attenuationColorNode=null,this.dispersionNode=null,this.anisotropyNode=null,this.setDefaultValues(Kg),this.setValues(e)}get useClearcoat(){return this.clearcoat>0||this.clearcoatNode!==null}get useIridescence(){return this.iridescence>0||this.iridescenceNode!==null}get useSheen(){return this.sheen>0||this.sheenNode!==null}get useAnisotropy(){return this.anisotropy>0||this.anisotropyNode!==null}get useTransmission(){return this.transmission>0||this.transmissionNode!==null}get useDispersion(){return this.dispersion>0||this.dispersionNode!==null}setupSpecular(){let e=this.iorNode?F(this.iorNode):Tf;Ma.assign(e),wa.assign(ms(Cs(Ma.sub(1).div(Ma.add(1))).mul(sf),z(1)).mul(of)),Ta.assign(K(wa,ca.rgb,fa)),Ea.assign(K(of,1,fa))}setupLightingModel(){return new Rh(this.useClearcoat,this.useSheen,this.useIridescence,this.useAnisotropy,this.useTransmission,this.useDispersion)}setupVariants(e){if(super.setupVariants(e),this.useClearcoat){let e=this.clearcoatNode?F(this.clearcoatNode):pf,t=this.clearcoatRoughnessNode?F(this.clearcoatRoughnessNode):mf;pa.assign(e),ma.assign(Gm({roughness:t}))}if(this.useSheen){let e=this.sheenNode?z(this.sheenNode):_f,t=this.sheenRoughnessNode?F(this.sheenRoughnessNode):vf;ha.assign(e),ga.assign(t)}if(this.useIridescence){let e=this.iridescenceNode?F(this.iridescenceNode):bf,t=this.iridescenceIORNode?F(this.iridescenceIORNode):xf,n=this.iridescenceThicknessNode?F(this.iridescenceThicknessNode):Sf;_a.assign(e),va.assign(t),ya.assign(n)}if(this.useAnisotropy){let e=(this.anisotropyNode?R(this.anisotropyNode):yf).toVar();xa.assign(e.length()),P(xa.equal(0),()=>{e.assign(R(1,0))}).Else(()=>{e.divAssign(R(xa)),xa.assign(xa.saturate())}),ba.assign(xa.pow2().mix(da.pow2(),1)),Sa.assign(zd[0].mul(e.x).add(zd[1].mul(e.y))),Ca.assign(zd[1].mul(e.x).sub(zd[0].mul(e.y)))}if(this.useTransmission){let e=this.transmissionNode?F(this.transmissionNode):Cf,t=this.thicknessNode?F(this.thicknessNode):wf,n=this.attenuationDistanceNode?F(this.attenuationDistanceNode):Ef,r=this.attenuationColorNode?z(this.attenuationColorNode):Df;if(Na.assign(e),Pa.assign(t),Fa.assign(n),Ia.assign(r),this.useDispersion){let e=this.dispersionNode?F(this.dispersionNode):Pf;La.assign(e)}}}setupClearcoatNormal(){return this.clearcoatNormalNode?z(this.clearcoatNormalNode):hf}setup(e){e.context.setupClearcoatNormal=()=>nc(this.setupClearcoatNormal(e),`NORMAL`,`vec3`),super.setup(e)}},Jg=N(({normal:e,lightDirection:t,builder:n})=>{let r=R(e.dot(t).mul(.5).add(.5),0);if(n.material.gradientMap)return z(hd(`gradientMap`,`texture`).context({getUV:()=>r}).r);{let e=r.fwidth().mul(.5);return K(z(.7),z(1),Ps(F(.7).sub(e.x),F(.7).add(e.x),r.x))}}),Yg=class extends Am{direct({lightDirection:e,lightColor:t,reflectedLight:n},r){let i=Jg({normal:Bu,lightDirection:e,builder:r}).mul(t);n.directDiffuse.addAssign(i.mul(Fm({diffuseColor:ca.rgb})))}indirect(e){let{ambientOcclusion:t,irradiance:n,reflectedLight:r}=e.context;r.indirectDiffuse.addAssign(n.mul(Fm({diffuseColor:ca}))),r.indirectDiffuse.mulAssign(t)}},Xg=new xn,Zg=class extends om{static get type(){return`MeshToonNodeMaterial`}constructor(e){super(),this.isMeshToonNodeMaterial=!0,this.lights=!0,this.setDefaultValues(Xg),this.setValues(e)}setupLightingModel(){return new Yg}},Qg=N(()=>{let e=z(Fu.z,0,Fu.x.negate()).normalize(),t=Fu.cross(e);return R(e.dot(J),t.dot(J)).mul(.495).add(.5)}).once([`NORMAL`,`VERTEX`])().toVar(`matcapUV`),$g=new xt,e_=class extends om{static get type(){return`MeshMatcapNodeMaterial`}constructor(e){super(),this.isMeshMatcapNodeMaterial=!0,this.setDefaultValues($g),this.setValues(e)}setupVariants(e){let t=Qg,n;n=e.material.matcap?hd(`matcap`,`texture`).context({getUV:()=>t}):z(K(.2,.8,t.y)),ca.rgb.mulAssign(n.rgb)}},t_=A(class extends Vr{static get type(){return`RotateNode`}constructor(e,t){super(),this.positionNode=e,this.rotationNode=t}generateNodeType(e){return this.positionNode.getNodeType(e)}setup(e){let{rotationNode:t,positionNode:n}=this;if(this.getNodeType(e)===`vec2`){let e=t.cos(),r=t.sin();return Qi(e,r,r.negate(),e).mul(n)}{let e=t,r=ea(B(1,0,0,0),B(0,Wo(e.x),Ho(e.x).negate(),0),B(0,Ho(e.x),Wo(e.x),0),B(0,0,0,1)),i=ea(B(Wo(e.y),0,Ho(e.y),0),B(0,1,0,0),B(Ho(e.y).negate(),0,Wo(e.y),0),B(0,0,0,1)),a=ea(B(Wo(e.z),Ho(e.z).negate(),0,0),B(Ho(e.z),Wo(e.z),0,0),B(0,0,1,0),B(0,0,0,1));return r.mul(i).mul(a).mul(B(n,1)).xyz}}}).setParameterLength(2),n_=new Ge,r_=class extends om{static get type(){return`SpriteNodeMaterial`}constructor(e){super(),this.isSpriteNodeMaterial=!0,this._useSizeAttenuation=!0,this.positionNode=null,this.rotationNode=null,this.scaleNode=null,this.transparent=!0,this.setDefaultValues(n_),this.setValues(e)}setupPositionView(e){let{object:t,camera:n}=e,{positionNode:r,rotationNode:i,scaleNode:a,sizeAttenuation:o}=this,s=wu.mul(z(r||0)),c=R(_u[0].xyz.length(),_u[1].xyz.length());a!==null&&(c=c.mul(R(a))),n.isPerspectiveCamera&&o===!1&&(c=c.mul(s.z.negate()));let l=ku.xy;if(t.center&&t.center.isVector2===!0){let e=hc(`center`,`vec2`,t);l=l.sub(e.sub(.5))}l=l.mul(c);let u=F(i||gf),d=t_(l,u);return B(s.xy.add(d),s.zw)}get sizeAttenuation(){return this._useSizeAttenuation}set sizeAttenuation(e){this._useSizeAttenuation!==e&&(this._useSizeAttenuation=e,this.needsUpdate=!0)}},i_=new m,a_=new hn,o_=class extends r_{static get type(){return`PointsNodeMaterial`}constructor(e){super(),this.sizeNode=null,this.isPointsNodeMaterial=!0,this.setDefaultValues(i_),this.setValues(e)}setupPositionView(){let{positionNode:e}=this;return wu.mul(z(e||Au)).xyz}setupVertexSprite(e){let{material:t,camera:n}=e,{rotationNode:r,scaleNode:i,sizeNode:a,sizeAttenuation:o}=this,s=super.setupVertex(e);if(t.isNodeMaterial!==!0)return s;let c=a===null?Nf:R(a);c=c.mul(Ol),n.isPerspectiveCamera&&o===!0&&(c=c.mul(s_.div(Pu.z.negate()))),i&&i.isNode&&(c=c.mul(R(i)));let l=ku.xy;if(r&&r.isNode){let e=F(r);l=t_(l,e)}return l=l.mul(c),l=l.div(Nl.div(2)),l=l.mul(s.w),s=s.add(B(l,0,0)),s}setupVertex(e){return e.object.isPoints?super.setupVertex(e):this.setupVertexSprite(e)}get alphaToCoverage(){return this._useAlphaToCoverage}set alphaToCoverage(e){this._useAlphaToCoverage!==e&&(this._useAlphaToCoverage=e,this.needsUpdate=!0)}},s_=H(1).onFrameUpdate(function({renderer:e}){let t=e.getSize(a_);this.value=.5*t.y}),c_=class extends Am{constructor(){super(),this.shadowNode=F(1).toVar(`shadowMask`)}direct({lightNode:e}){e.shadowNode!==null&&this.shadowNode.mulAssign(e.shadowNode)}finish({context:e}){ca.a.mulAssign(this.shadowNode.oneMinus()),e.outgoingLight.rgb.assign(ca.rgb)}},l_=new ve,u_=class extends om{static get type(){return`ShadowNodeMaterial`}constructor(e){super(),this.isShadowNodeMaterial=!0,this.lights=!0,this.transparent=!0,this.setDefaultValues(l_),this.setValues(e)}setupLightingModel(){return new c_}};oa(`vec3`),oa(`vec3`),oa(`vec3`);var d_=class{constructor(e,t,n){this.renderer=e,this.nodes=t,this.info=n,this._context=typeof self<`u`?self:null,this._animationLoop=null,this._requestId=null}start(){let e=(t,n)=>{this._requestId=this._context.requestAnimationFrame(e),this.info.autoReset===!0&&this.info.reset(),this.nodes.nodeFrame.update(),this.info.frame=this.nodes.nodeFrame.frameId,this.renderer._inspector.begin(),this._animationLoop!==null&&this._animationLoop(t,n),this.renderer._inspector.finish()};e()}stop(){this._context!==null&&this._context.cancelAnimationFrame(this._requestId),this._requestId=null}getAnimationLoop(){return this._animationLoop}setAnimationLoop(e){this._animationLoop=e}getContext(){return this._context}setContext(e){this._context=e}dispose(){this.stop()}},f_=class{constructor(){this.weakMaps={}}_getWeakMap(e){let t=e.length,n=this.weakMaps[t];return n===void 0&&(n=new WeakMap,this.weakMaps[t]=n),n}get(e){let t=this._getWeakMap(e);for(let n=0;n<e.length-1;n++)if(t=t.get(e[n]),t===void 0)return;return t.get(e[e.length-1])}set(e,t){let n=this._getWeakMap(e);for(let t=0;t<e.length-1;t++){let r=e[t];n.has(r)===!1&&n.set(r,new WeakMap),n=n.get(r)}return n.set(e[e.length-1],t),this}delete(e){let t=this._getWeakMap(e);for(let n=0;n<e.length-1;n++)if(t=t.get(e[n]),t===void 0)return!1;return t.delete(e[e.length-1])}},p_=0,m_=new WeakMap;function h_(e){let t=Object.keys(e),n=m_.get(e.constructor);if(n===void 0){n=[];let t=Object.getPrototypeOf(e);for(;t;){let e=Object.getOwnPropertyDescriptors(t);for(let t in e){let r=e[t];r&&typeof r.get==`function`&&n.push(t)}t=Object.getPrototypeOf(t)}m_.set(e.constructor,n)}for(let e=0;e<n.length;e++)t.push(n[e]);return t}var g_=class{constructor(e,t,n,r,i,a,o,s,c,l){this.id=p_++,this._nodes=e,this._geometries=t,this.renderer=n,this.object=r,this.material=i,this.scene=a,this.camera=o,this.lightsNode=s,this.context=c,this.geometry=r.geometry,this.version=i.version,this.drawRange=null,this.attributes=null,this.attributesId=null,this.pipeline=null,this.group=null,this.vertexBuffers=null,this.drawParams=null,this.bundle=null,this.clippingContext=l,this.clippingContextCacheKey=l===null?``:l.cacheKey,this.initialNodesCacheKey=this.getDynamicCacheKey(),this.initialCacheKey=this.getCacheKey(),this._nodeBuilderState=null,this._bindings=null,this._monitor=null,this._sourceMaterial=n._currentSourceMaterial,this.onDispose=null,this.isRenderObject=!0,this.onMaterialDispose=()=>{this.dispose()},this.onGeometryDispose=()=>{this.attributes=null,this.attributesId=null},this.material.addEventListener(`dispose`,this.onMaterialDispose),this.geometry.addEventListener(`dispose`,this.onGeometryDispose),this._sourceMaterial!==null&&this._sourceMaterial.addEventListener(`dispose`,this.onMaterialDispose)}updateClipping(e){this.clippingContext=e}get clippingNeedsUpdate(){return this.clippingContext===null||this.clippingContext.cacheKey===this.clippingContextCacheKey?!1:(this.clippingContextCacheKey=this.clippingContext.cacheKey,!0)}get hardwareClippingPlanes(){return this.getNodeBuilderState().hardwareClipping===!0?this.clippingContext.unionClippingCount:0}getNodeBuilderState(){return this._nodeBuilderState||=this._nodes.getForRender(this)}getMonitor(){return this._monitor||=this.getNodeBuilderState().observer}getBindings(){return this._bindings||=this.getNodeBuilderState().createBindings()}getBindingGroup(e){for(let t of this.getBindings())if(t.name===e)return t}getIndex(){return this._geometries.getIndex(this)}getIndirect(){return this._geometries.getIndirect(this)}getIndirectOffset(){return this._geometries.getIndirectOffset(this)}getChainArray(){return[this.object,this.material,this.context,this.lightsNode]}setGeometry(e){this.geometry=e,this.attributes=null,this.attributesId=null}getAttributes(){if(this.attributes!==null)return this.attributes;let e=this.getNodeBuilderState().nodeAttributes,t=this.geometry,n=[],r=new Set,i={};for(let a of e){let e;if(a.node&&a.node.attribute?e=a.node.attribute:(e=t.getAttribute(a.name),e!==void 0&&(e.isInterleavedBufferAttribute?i[a.name]=e.data.uuid:i[a.name]=e.id)),e===void 0)continue;n.push(e);let o=e.isInterleavedBufferAttribute?e.data:e;r.add(o)}return this.attributes=n,this.attributesId=i,this.vertexBuffers=Array.from(r.values()),n}getVertexBuffers(){return this.vertexBuffers===null&&this.getAttributes(),this.vertexBuffers}getDrawParameters(){let{object:e,material:t,geometry:n,group:r,drawRange:i}=this,a=this.drawParams||={vertexCount:0,firstVertex:0,instanceCount:0,firstInstance:0},o=this.getIndex(),s=o!==null,c=1;if(n.isInstancedBufferGeometry===!0?c=n.instanceCount:e.count!==void 0&&(c=Math.max(0,e.count)),c===0)return null;if(a.instanceCount=c,e.isBatchedMesh===!0)return a;let l=1;t.wireframe===!0&&!e.isPoints&&!e.isLineSegments&&!e.isLine&&!e.isLineLoop&&(l=2);let u=i.start*l,d=(i.start+i.count)*l;r!==null&&(u=Math.max(u,r.start*l),d=Math.min(d,(r.start+r.count)*l));let f=n.attributes.position,p=1/0;s?p=o.count:f!=null&&(p=f.count),u=Math.max(u,0),d=Math.min(d,p);let m=d-u;return m<0||m===1/0?null:(a.vertexCount=m,a.firstVertex=u,a)}getGeometryCacheKey(){let{geometry:e}=this,t=``;for(let n of Object.keys(e.attributes).sort()){let r=e.attributes[n];t+=n+`,`,r.data&&(t+=r.data.stride+`,`),r.offset&&(t+=r.offset+`,`),r.itemSize&&(t+=r.itemSize+`,`),r.normalized&&(t+=`n,`)}for(let n of Object.keys(e.morphAttributes).sort()){let r=e.morphAttributes[n];t+=`morph-`+n+`,`;for(let e=0,n=r.length;e<n;e++){let n=r[e];t+=n.id+`,`}}return e.index&&(t+=`index,`),t}getMaterialCacheKey(){let{object:e,material:t,renderer:n}=this,r=t.customProgramCacheKey();for(let e of h_(t)){if(/^(is[A-Z]|_)|^(visible|version|uuid|name|opacity|userData)$/.test(e))continue;let i=t[e],a;if(i!==null){let t=typeof i;t===`number`?a=e===`side`?String(i):i===0?`0`:`1`:t===`object`?(a=`{`,i.isTexture&&(a+=i.mapping,n.backend.isWebGPUBackend===!0&&(a+=i.magFilter,a+=i.minFilter,a+=i.wrapS,a+=i.wrapT,a+=i.wrapR)),a+=`}`):a=String(i)}else a=String(i);r+=a+`,`}return r+=this.clippingContextCacheKey+`,`,e.geometry&&(r+=this.getGeometryCacheKey()),e.skeleton&&(r+=e.skeleton.bones.length+`,`),e.isBatchedMesh&&(r+=e._matricesTexture.uuid+`,`,e._colorsTexture!==null&&(r+=e._colorsTexture.uuid+`,`)),(e.isInstancedMesh||e.count>1)&&(r+=e.uuid+`,`),r+=this.context.id+`,`,r+=e.receiveShadow+`,`,hr(r)}get needsGeometryUpdate(){if(this.geometry.id!==this.object.geometry.id)return!0;if(this.attributes!==null){let e=this.attributesId;for(let t in e){let n=this.geometry.getAttribute(t);if(n===void 0)return!0;let r=n.isInterleavedBufferAttribute?n.data.uuid:n.id;if(e[t]!==r)return!0}}return!1}get needsUpdate(){return this.initialNodesCacheKey!==this.getDynamicCacheKey()||this.clippingNeedsUpdate}getDynamicCacheKey(){let e=0;return this.material.isShadowPassMaterial!==!0&&(e=this._nodes.getCacheKey(this.scene,this.lightsNode)),this.camera.isArrayCamera&&(e=_r(e,this.camera.cameras.length)),this.object.receiveShadow&&(e=_r(e,1)),e=_r(e,this.renderer.contextNode.id,this.renderer.contextNode.version),e}getCacheKey(){return this.getMaterialCacheKey()+this.getDynamicCacheKey()}dispose(){this.material.removeEventListener(`dispose`,this.onMaterialDispose),this.geometry.removeEventListener(`dispose`,this.onGeometryDispose),this._sourceMaterial!==null&&this._sourceMaterial.removeEventListener(`dispose`,this.onMaterialDispose),this.onDispose()}},__=[],v_=class{constructor(e,t,n,r,i,a){this.renderer=e,this.nodes=t,this.geometries=n,this.pipelines=r,this.bindings=i,this.info=a,this.chainMaps={}}get(e,t,n,r,i,a,o,s){let c=this.getChainMap(s);__[0]=e,__[1]=t,__[2]=a,__[3]=i;let l=c.get(__);return l===void 0?(l=this.createRenderObject(this.nodes,this.geometries,this.renderer,e,t,n,r,i,a,o,s),c.set(__,l)):(l.camera=r,l.updateClipping(o),l.needsGeometryUpdate&&l.setGeometry(e.geometry),(l.version!==t.version||l.needsUpdate)&&(l.initialCacheKey===l.getCacheKey()?l.version=t.version:(l.dispose(),l=this.get(e,t,n,r,i,a,o,s)))),__[0]=null,__[1]=null,__[2]=null,__[3]=null,l}getChainMap(e=`default`){return this.chainMaps[e]||(this.chainMaps[e]=new f_)}dispose(){this.chainMaps={}}createRenderObject(e,t,n,r,i,a,o,s,c,l,u){let d=this.getChainMap(u),f=new g_(e,t,n,r,i,a,o,s,c,l);return f.onDispose=()=>{this.pipelines.delete(f),this.bindings.deleteForRender(f),this.nodes.delete(f),d.delete(f.getChainArray())},f}},y_=class{constructor(){this.data=new WeakMap}get(e){let t=this.data.get(e);return t===void 0&&(t={},this.data.set(e,t)),t}delete(e){let t=null;return this.data.has(e)&&(t=this.data.get(e),this.data.delete(e)),t}has(e){return this.data.has(e)}dispose(){this.data=new WeakMap}},b_={VERTEX:1,INDEX:2,STORAGE:3,INDIRECT:4},x_=16,S_=211,C_=212,w_=class extends y_{constructor(e,t){super(),this.backend=e,this.info=t}delete(e){let t=super.delete(e);return t!==null&&(this.backend.destroyAttribute(e),this.info.destroyAttribute(e)),t}update(e,t){let n=this.get(e);if(n.version===void 0)t===b_.VERTEX?(this.backend.createAttribute(e),this.info.createAttribute(e)):t===b_.INDEX?(this.backend.createIndexAttribute(e),this.info.createIndexAttribute(e)):t===b_.STORAGE?(this.backend.createStorageAttribute(e),this.info.createStorageAttribute(e)):t===b_.INDIRECT&&(this.backend.createIndirectStorageAttribute(e),this.info.createIndirectStorageAttribute(e)),n.version=this._getBufferAttribute(e).version;else{let t=this._getBufferAttribute(e);(n.version<t.version||t.usage===35048)&&(this.backend.updateAttribute(e),n.version=t.version)}}_getBufferAttribute(e){return e.isInterleavedBufferAttribute&&(e=e.data),e}};function T_(e){return e.index===null?e.attributes.position.version:e.index.version}function E_(e){return e.index===null?e.attributes.position.id:e.index.id}function D_(e){let t=[],n=e.index,r=e.attributes.position;if(n!==null){let e=n.array;for(let n=0,r=e.length;n<r;n+=3){let r=e[n+0],i=e[n+1],a=e[n+2];t.push(r,i,i,a,a,r)}}else{let e=r.array;for(let n=0,r=e.length/3-1;n<r;n+=3){let e=n+0,r=n+1,i=n+2;t.push(e,r,r,i,i,e)}}let i=new(r.count>=65535?at:Qe)(t,1);return i.version=T_(e),i.__id=E_(e),i}var O_=class extends y_{constructor(e,t){super(),this.attributes=e,this.info=t,this.wireframes=new WeakMap,this.attributeCall=new WeakMap,this._geometryDisposeListeners=new Map}has(e){let t=e.geometry;return super.has(t)&&this.get(t).initialized===!0}updateForRender(e){this.has(e)===!1&&this.initGeometry(e),this.updateAttributes(e)}initGeometry(e){let t=e.geometry,n=this.get(t);n.initialized=!0,this.info.memory.geometries++;let r=()=>{this.info.memory.geometries--;let n=t.index,i=e.getAttributes();n!==null&&this.attributes.delete(n);for(let e of i)this.attributes.delete(e);let a=this.wireframes.get(t);a!==void 0&&this.attributes.delete(a),t.removeEventListener(`dispose`,r),this._geometryDisposeListeners.delete(t)};t.addEventListener(`dispose`,r),this._geometryDisposeListeners.set(t,r)}updateAttributes(e){let t=e.getAttributes();for(let e of t)e.isStorageBufferAttribute||e.isStorageInstancedBufferAttribute?this.updateAttribute(e,b_.STORAGE):this.updateAttribute(e,b_.VERTEX);let n=this.getIndex(e);n!==null&&this.updateAttribute(n,b_.INDEX);let r=e.geometry.indirect;r!==null&&this.updateAttribute(r,b_.INDIRECT)}updateAttribute(e,t){let n=this.info.render.calls;e.isInterleavedBufferAttribute?this.attributeCall.get(e)===void 0?(this.attributes.update(e,t),this.attributeCall.set(e,n)):this.attributeCall.get(e.data)!==n&&(this.attributes.update(e,t),this.attributeCall.set(e.data,n),this.attributeCall.set(e,n)):this.attributeCall.get(e)!==n&&(this.attributes.update(e,t),this.attributeCall.set(e,n))}getIndirect(e){return e.geometry.indirect}getIndirectOffset(e){return e.geometry.indirectOffset}getIndex(e){let{geometry:t,material:n}=e,r=t.index;if(n.wireframe===!0){let e=this.wireframes,n=e.get(t);n===void 0?(n=D_(t),e.set(t,n)):(n.version!==T_(t)||n.__id!==E_(t))&&(this.attributes.delete(n),n=D_(t),e.set(t,n)),r=n}return r}dispose(){for(let[e,t]of this._geometryDisposeListeners.entries())e.removeEventListener(`dispose`,t);this._geometryDisposeListeners.clear()}},k_=class{constructor(){this.autoReset=!0,this.frame=0,this.calls=0,this.render={calls:0,frameCalls:0,drawCalls:0,triangles:0,points:0,lines:0,timestamp:0},this.compute={calls:0,frameCalls:0,timestamp:0},this.memory={attributes:0,attributesSize:0,geometries:0,indexAttributes:0,indexAttributesSize:0,indirectStorageAttributes:0,indirectStorageAttributesSize:0,programs:0,programsSize:0,readbackBuffers:0,readbackBuffersSize:0,renderTargets:0,storageAttributes:0,storageAttributesSize:0,textures:0,texturesSize:0,uniformBuffers:0,uniformBuffersSize:0,total:0},this.memoryMap=new Map}update(e,t,n){this.render.drawCalls++,e.isMesh||e.isSprite?this.render.triangles+=t/3*n:e.isPoints?this.render.points+=n*t:e.isLineSegments?this.render.lines+=t/2*n:e.isLine?this.render.lines+=n*(t-1):C(`WebGPUInfo: Unknown object type.`)}reset(){this.render.drawCalls=0,this.render.frameCalls=0,this.compute.frameCalls=0,this.render.triangles=0,this.render.points=0,this.render.lines=0}dispose(){this.reset(),this.calls=0,this.render.calls=0,this.compute.calls=0,this.render.timestamp=0,this.compute.timestamp=0;for(let e in this.memory)this.memory[e]=0;this.memoryMap.clear()}createTexture(e){let t=this._getTextureMemorySize(e);this.memoryMap.set(e,t),this.memory.textures++,this.memory.total+=t,this.memory.texturesSize+=t}destroyTexture(e){let t=this.memoryMap.get(e)||0;this.memoryMap.delete(e),this.memory.textures--,this.memory.total-=t,this.memory.texturesSize-=t}_createAttribute(e,t){let n=this._getAttributeMemorySize(e);this.memoryMap.set(e,{size:n,type:t}),this.memory[t]++,this.memory.total+=n,this.memory[t+`Size`]+=n}createAttribute(e){this._createAttribute(e,`attributes`)}createIndexAttribute(e){this._createAttribute(e,`indexAttributes`)}createStorageAttribute(e){this._createAttribute(e,`storageAttributes`)}createIndirectStorageAttribute(e){this._createAttribute(e,`indirectStorageAttributes`)}destroyAttribute(e){let t=this.memoryMap.get(e);t&&(this.memoryMap.delete(e),this.memory[t.type]--,this.memory.total-=t.size,this.memory[t.type+`Size`]-=t.size)}createReadbackBuffer(e){let t=e.maxByteLength;this.memoryMap.set(e,{size:t,type:`readbackBuffers`}),this.memory.readbackBuffers++,this.memory.total+=t,this.memory.readbackBuffersSize+=t}destroyReadbackBuffer(e){let{size:t}=this.memoryMap.get(e);this.memoryMap.delete(e),this.memory.readbackBuffers--,this.memory.total-=t,this.memory.readbackBuffersSize-=t}createUniformBuffer(e){let t=e.byteLength;this.memoryMap.set(e,{size:t,type:`uniformBuffers`}),this.memory.uniformBuffers++,this.memory.total+=t,this.memory.uniformBuffersSize+=t}destroyUniformBuffer(e){let t=this.memoryMap.get(e);t&&(this.memoryMap.delete(e),this.memory.uniformBuffers--,this.memory.total-=t.size,this.memory.uniformBuffersSize-=t.size)}createProgram(e){let t=e.code.length;this.memoryMap.set(e,t),this.memory.programs++,this.memory.total+=t,this.memory.programsSize+=t}destroyProgram(e){let t=this.memoryMap.get(e)||0;this.memoryMap.delete(e),this.memory.programs--,this.memory.total-=t,this.memory.programsSize-=t}_getTextureMemorySize(e){if(e.isCompressedTexture)return 1;let t=1;e.type===1010||e.type===1009?t=1:e.type===1011||e.type===1012||e.type===1016?t=2:(e.type===1013||e.type===1014||e.type===1015)&&(t=4);let n=4;e.format===1021||e.format===1028||e.format===1029||e.format===1026||e.format===1027?n=1:e.format===1030||e.format===1031?n=2:(e.format===1022||e.format===1032)&&(n=3);let r=t*n;e.type===1017||e.type===1018?r=2:(e.type===1020||e.type===35902||e.type===35899)&&(r=4);let i=e.width||1,a=e.height||1,o=e.isCubeTexture?6:e.depth||1,s=i*a*o*r,c=e.mipmaps;if(c&&c.length>0){let e=0;for(let t=0;t<c.length;t++){let n=c[t];if(n.data)e+=n.data.byteLength;else{let s=n.width||Math.max(1,i>>t),c=n.height||Math.max(1,a>>t);e+=s*c*o*r}}s+=e}else e.generateMipmaps&&(s*=1.333);return Math.round(s)}_getAttributeMemorySize(e){return e.isInterleavedBufferAttribute&&(e=e.data),e.array?e.array.byteLength:e.count&&e.itemSize?e.count*e.itemSize*4:0}},A_=class{constructor(e){this.cacheKey=e,this.usedTimes=0}},j_=class extends A_{constructor(e,t,n){super(e),this.vertexProgram=t,this.fragmentProgram=n}},M_=class extends A_{constructor(e,t){super(e),this.computeProgram=t,this.isComputePipeline=!0}},N_=0,P_=class{constructor(e,t,n,r=null,i=null){this.id=N_++,this.code=e,this.stage=t,this.name=n,this.transforms=r,this.attributes=i,this.usedTimes=0}},F_=class extends y_{constructor(e,t,n){super(),this.backend=e,this.nodes=t,this.info=n,this.bindings=null,this.caches=new Map,this.programs={vertex:new Map,fragment:new Map,compute:new Map}}getForCompute(e,t){let{backend:n}=this,r=this.get(e);if(this._needsComputeUpdate(e)){let i=r.pipeline;i&&(i.usedTimes--,i.computeProgram.usedTimes--);let a=this.nodes.getForCompute(e),o=this.programs.compute.get(a.computeShader);o===void 0&&(i&&i.computeProgram.usedTimes===0&&this._releaseProgram(i.computeProgram),o=new P_(a.computeShader,`compute`,e.name,a.transforms,a.nodeAttributes),this.programs.compute.set(a.computeShader,o),n.createProgram(o),this.info.createProgram(o));let s=this._getComputeCacheKey(e,o),c=this.caches.get(s);c===void 0&&(i&&i.usedTimes===0&&this._releasePipeline(i),c=this._getComputePipeline(e,o,s,t)),c.usedTimes++,o.usedTimes++,r.version=e.version,r.pipeline=c}return r.pipeline}getForRender(e,t=null){let{backend:n}=this,r=this.get(e);if(this._needsRenderUpdate(e)){let i=r.pipeline;i&&(i.usedTimes--,i.vertexProgram.usedTimes--,i.fragmentProgram.usedTimes--);let a=e.getNodeBuilderState(),o=e.material?e.material.name:``,s=this.programs.vertex.get(a.vertexShader);s===void 0&&(i&&i.vertexProgram.usedTimes===0&&this._releaseProgram(i.vertexProgram),s=new P_(a.vertexShader,`vertex`,o),this.programs.vertex.set(a.vertexShader,s),n.createProgram(s),this.info.createProgram(s));let c=this.programs.fragment.get(a.fragmentShader);c===void 0&&(i&&i.fragmentProgram.usedTimes===0&&this._releaseProgram(i.fragmentProgram),c=new P_(a.fragmentShader,`fragment`,o),this.programs.fragment.set(a.fragmentShader,c),n.createProgram(c),this.info.createProgram(c));let l=this._getRenderCacheKey(e,s,c),u=this.caches.get(l);u===void 0?(i&&i.usedTimes===0&&this._releasePipeline(i),u=this._getRenderPipeline(e,s,c,l,t)):e.pipeline=u,u.usedTimes++,s.usedTimes++,c.usedTimes++,r.pipeline=u}return r.pipeline}isReady(e){let t=this.get(e).pipeline;if(t===void 0)return!1;let n=this.backend.get(t);return n.pipeline!==void 0&&n.pipeline!==null}delete(e){let t=this.get(e).pipeline;return t&&(t.usedTimes--,t.usedTimes===0&&this._releasePipeline(t),t.isComputePipeline?(t.computeProgram.usedTimes--,t.computeProgram.usedTimes===0&&this._releaseProgram(t.computeProgram)):(t.fragmentProgram.usedTimes--,t.vertexProgram.usedTimes--,t.vertexProgram.usedTimes===0&&this._releaseProgram(t.vertexProgram),t.fragmentProgram.usedTimes===0&&this._releaseProgram(t.fragmentProgram))),super.delete(e)}dispose(){super.dispose(),this.caches=new Map,this.programs={vertex:new Map,fragment:new Map,compute:new Map}}updateForRender(e){this.getForRender(e)}_getComputePipeline(e,t,n,r){n||=this._getComputeCacheKey(e,t);let i=this.caches.get(n);return i===void 0&&(i=new M_(n,t),this.caches.set(n,i),this.backend.createComputePipeline(i,r)),i}_getRenderPipeline(e,t,n,r,i){r||=this._getRenderCacheKey(e,t,n);let a=this.caches.get(r);return a===void 0&&(a=new j_(r,t,n),this.caches.set(r,a),e.pipeline=a,this.backend.createRenderPipeline(e,i)),a}_getComputeCacheKey(e,t){return e.id+`,`+t.id}_getRenderCacheKey(e,t,n){return t.id+`,`+n.id+`,`+this.backend.getRenderCacheKey(e)}_releasePipeline(e){this.caches.delete(e.cacheKey)}_releaseProgram(e){let t=e.code,n=e.stage;this.programs[n].delete(t),this.info.destroyProgram(e)}_needsComputeUpdate(e){let t=this.get(e);return t.pipeline===void 0||t.version!==e.version}_needsRenderUpdate(e){return this.get(e).pipeline===void 0||this.backend.needsRenderUpdate(e)}},I_=class extends y_{constructor(e,t,n,r,i,a){super(),this.backend=e,this.textures=n,this.pipelines=i,this.attributes=r,this.nodes=t,this.info=a,this.pipelines.bindings=this}getForRender(e){let t=e.getBindings(),n=this.get(e);return n.initialized!==!0&&(this._createBindings(t),n.initialized=!0),t}getForCompute(e){let t=this.nodes.getForCompute(e).bindings,n=this.get(e);return(n.initialized!==!0||n.bindings!==t)&&(n.bindings!==void 0&&this._destroyBindings(n.bindings),this._createBindings(t),n.initialized=!0,n.bindings=t),t}updateForCompute(e){this._updateBindings(this.getForCompute(e))}updateForRender(e){this._updateBindings(this.getForRender(e))}deleteForCompute(e){let t=this.get(e).bindings||this.nodes.getForCompute(e).bindings;this._destroyBindings(t),this.delete(e)}deleteForRender(e){let t=e.getBindings();this._destroyBindings(t),this.delete(e)}_createBindings(e){for(let t of e){let n=this.get(t);if(n.bindGroup===void 0){for(let e of t.bindings)if(e.isUniformBuffer)this.backend.createUniformBuffer(e),this.info.createUniformBuffer(e);else if(e.isSampledTexture)this.textures.updateTexture(e.texture);else if(e.isSampler)this.textures.updateSampler(e);else if(e.isStorageBuffer){let t=e.attribute,n=t.isIndirectStorageBufferAttribute?b_.INDIRECT:b_.STORAGE;this.attributes.update(t,n)}this.backend.createBindings(t,e,0),n.bindGroup=t,n.usedTimes=1}else n.usedTimes++}}_destroyBindings(e){for(let t of e){let e=this.get(t);if(e.usedTimes--,e.usedTimes===0){for(let e of t.bindings)e.isUniformBuffer?(this.backend.destroyUniformBuffer(e),this.info.destroyUniformBuffer(e),e.release()):e.isSampler&&(e.isSampledTexture!==!0&&this.backend.destroySampler(e),e.release());this.backend.deleteBindGroupData(t),this.delete(t)}}}_updateBindings(e){for(let t of e)this._update(t,e)}_update(e,t){let{backend:n}=this,r=!1,i=!0,a=0,o=0;for(let t of e.bindings)if(this.nodes.updateGroup(t)!==!1){if(t.isStorageBuffer){let e=t.attribute,i=e.isIndirectStorageBufferAttribute?b_.INDIRECT:b_.STORAGE,a=n.get(t);this.attributes.update(e,i),a.attribute!==e&&(a.attribute=e,r=!0)}if(t.isUniformBuffer)t.update()&&n.updateBinding(t);else if(t.isSampledTexture){let s=t.update(),c=t.texture,l=this.textures.get(c);if(s&&(this.textures.updateTexture(c),t.generation!==l.generation&&(t.generation=l.generation,r=!0),l.bindGroups.add(e)),n.get(c).externalTexture!==void 0||l.isDefaultTexture?i=!1:(a=a*10+c.id,o+=c.version),c.isStorageTexture===!0&&c.mipmapsAutoUpdate===!0){let e=this.get(c);t.store===!0?e.needsMipmap=!0:this.textures.needsMipmaps(c)&&e.needsMipmap===!0&&(this.backend.generateMipmaps(c),e.needsMipmap=!1)}}else if(t.isSampler&&t.update()){let e=this.textures.updateSampler(t);t.samplerKey!==e&&(t.samplerKey=e,r=!0)}t.isBuffer&&t.updateRanges.length>0&&t.clearUpdateRanges()}r===!0&&this.backend.updateBindings(e,t,i?a:0,o)}},L_=Object.freeze([]);function R_(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:e.z-t.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function z_(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function B_(e){return(e.transmission>0||e.transmissionNode&&e.transmissionNode.isNode)&&e.side===2&&e.forceSinglePass===!1}var V_=class{constructor(e,t,n){this.renderItems=[],this.renderItemsIndex=0,this.opaque=[],this.transparentDoublePass=[],this.transparent=[],this.bundles=[],this.lighting=e,this.lightsNode=e.getNode(t),this.lightsArray=[],this.scene=t,this.camera=n,this.occlusionQueryCount=0,this._lastOcclusionObject=null}begin(){return this.renderItemsIndex=0,this.opaque.length=0,this.transparentDoublePass.length=0,this.transparent.length=0,this.bundles.length=0,this.lightsArray.length=0,this.occlusionQueryCount=0,this}getNextRenderItem(e,t,n,r,i,a,o){let s=this.renderItems[this.renderItemsIndex];return s===void 0?(s={id:e.id,object:e,geometry:t,material:n,groupOrder:r,renderOrder:e.renderOrder,z:i,group:a,clippingContext:o},this.renderItems[this.renderItemsIndex]=s):(s.id=e.id,s.object=e,s.geometry=t,s.material=n,s.groupOrder=r,s.renderOrder=e.renderOrder,s.z=i,s.group=a,s.clippingContext=o),this.renderItemsIndex++,s}push(e,t,n,r,i,a,o){let s=this.getNextRenderItem(e,t,n,r,i,a,o);e.occlusionTest===!0&&this._lastOcclusionObject!==e&&(this.occlusionQueryCount++,this._lastOcclusionObject=e),n.transparent===!0||n.transmission>0||n.transmissionNode&&n.transmissionNode.isNode||n.backdropNode&&n.backdropNode.isNode?(B_(n)&&this.transparentDoublePass.push(s),this.transparent.push(s)):this.opaque.push(s)}unshift(e,t,n,r,i,a,o){let s=this.getNextRenderItem(e,t,n,r,i,a,o);n.transparent===!0||n.transmission>0||n.transmissionNode&&n.transmissionNode.isNode||n.backdropNode&&n.backdropNode.isNode?(B_(n)&&this.transparentDoublePass.unshift(s),this.transparent.unshift(s)):this.opaque.unshift(s)}pushBundle(e){this.bundles.push(e)}pushLight(e){this.lightsArray.push(e)}sort(e,t,n){this.opaque.length>1&&this.opaque.sort(e||R_),this.transparentDoublePass.length>1&&this.transparentDoublePass.sort(t||z_),this.transparent.length>1&&this.transparent.sort(t||z_),n&&(this.opaque.reverse(),this.transparentDoublePass.reverse(),this.transparent.reverse())}finish(){this.lightsNode.setLights(this.lighting.enabled?this.lightsArray:L_);for(let e=this.renderItemsIndex,t=this.renderItems.length;e<t;e++){let t=this.renderItems[e];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.groupOrder=null,t.renderOrder=null,t.z=null,t.group=null,t.clippingContext=null}this._lastOcclusionObject=null}},H_=[],U_=class{constructor(e){this.lighting=e,this.lists=new f_}get(e,t){let n=this.lists;H_[0]=e,H_[1]=t;let r=n.get(H_);return r===void 0&&(r=new V_(this.lighting,e,t),n.set(H_,r)),H_[0]=null,H_[1]=null,r}dispose(){this.lists=new f_}},W_=0,G_=class{constructor(){this.id=W_++,this.mrt=null,this.color=!0,this.clearColor=!0,this.clearColorValue={r:0,g:0,b:0,a:1},this.depth=!0,this.clearDepth=!0,this.clearDepthValue=1,this.stencil=!1,this.clearStencil=!0,this.clearStencilValue=1,this.viewport=!1,this.viewportValue=new bt,this.scissor=!1,this.scissorValue=new bt,this.renderTarget=null,this.textures=null,this.depthTexture=null,this.activeCubeFace=0,this.activeMipmapLevel=0,this.sampleCount=1,this.width=0,this.height=0,this.occlusionQueryCount=0,this.clippingContext=null,this.camera=null,this.isRenderContext=!0}getCacheKey(){return K_(this)}};function K_(e){let{textures:t,activeCubeFace:n,activeMipmapLevel:r}=e,i=[n,r];for(let e of t)i.push(e.id);return gr(i)}var q_=class{constructor(e){this.renderer=e,this._renderContexts={}}get(e=null,t=null,n=0){let r;if(e===null)r=`default`;else{let t=e.texture.format,n=e.texture.type;r=`${e.textures.length}:${t}:${n}:${e.samples}:${e.depthBuffer}:${e.stencilBuffer}`}let i=t===null?`default`:t.id,a=r+`-`+i+`-`+n,o=this._renderContexts[a];return o===void 0&&(o=new G_,o.mrt=t,this._renderContexts[a]=o),e!==null&&(o.sampleCount=e.samples===0?1:e.samples),o.clearDepthValue=this.renderer.getClearDepth(),o.clearStencilValue=this.renderer.getClearStencil(),o}dispose(){this._renderContexts={}}},J_=new w,Y_=class extends y_{constructor(e,t,n){super(),this.renderer=e,this.backend=t,this.info=n,this._htmlTextures=new Set}updateRenderTarget(e,t=0){let n=this.get(e),r=e.samples===0?1:e.samples,i=n.depthTextureMips||={},a=e.textures,o=this.getSize(a[0]),s=o.width>>t,c=o.height>>t,l=e.depthTexture||i[t],u=e.depthBuffer===!0||e.stencilBuffer===!0,d=!1,f=l!==void 0&&l.image!==void 0&&l.image.depth>1,p=o.depth>1&&(e.useArrayDepthTexture||e.multiview||f);l===void 0&&u&&(l=new Pn,l.format=e.stencilBuffer?vn:mt,l.type=e.stencilBuffer?Ot:dn,l.image.width=s,l.image.height=c,l.image.depth=o.depth,l.renderTarget=e,i[t]=l),l&&(l.isArrayTexture=p),(n.width!==o.width||o.height!==n.height)&&(d=!0,l&&(l.needsUpdate=!0,l.image.width=s,l.image.height=c,l.image.depth=p?o.depth:1)),n.width=o.width,n.height=o.height,n.textures=a,n.depthTexture=l||null,n.depth=e.depthBuffer,n.stencil=e.stencilBuffer,n.renderTarget=e,n.sampleCount!==r&&(d=!0,l&&(l.needsUpdate=!0),n.sampleCount=r);let m={sampleCount:r};if(e.isXRRenderTarget!==!0){for(let e=0;e<a.length;e++){let t=a[e];d&&(t.needsUpdate=!0),this.updateTexture(t,m)}l&&this.updateTexture(l,m)}n.initialized!==!0&&(n.initialized=!0,this.info.memory.renderTargets++,n.onDispose=()=>{this._destroyRenderTarget(e)},e.addEventListener(`dispose`,n.onDispose))}updateTexture(e,t={}){let n=this.get(e);if(n.initialized===!0&&n.version===e.version)return;let r=e.isRenderTargetTexture||e.isDepthTexture||e.isFramebufferTexture,i=this.backend;if(r&&n.initialized===!0&&i.destroyTexture(e),e.isFramebufferTexture){let t=this.renderer.getRenderTarget();e.type=t?t.texture.type:ke}if(e.isHTMLTexture&&e.image){let t=this.renderer.domElement;if(`requestPaint`in t){if(t.hasAttribute(`layoutsubtree`)||t.setAttribute(`layoutsubtree`,`true`),e.image.parentNode!==t&&t.appendChild(e.image),this._htmlTextures.size===0){let e=this._htmlTextures;t.onpaint=t=>{let n=t&&t.changedElements;for(let t of e)(!n||n.includes(t.image))&&(t.needsUpdate=!0)}}this._htmlTextures.add(e)}}let{width:a,height:o,depth:s}=this.getSize(e);if(t.width=a,t.height=o,t.depth=s,t.needsMipmaps=this.needsMipmaps(e),t.levels=t.needsMipmaps?this.getMipLevels(e,a,o):1,e.isCubeTexture&&e.mipmaps.length>0&&t.levels++,r||e.isStorageTexture===!0||e.isExternalTexture===!0)i.createTexture(e,t),n.generation=e.version;else if(e.version>0){let r=e.image;if(r===void 0)T(`Renderer: Texture marked for update but image is undefined.`);else if(r.complete===!1)T(`Renderer: Texture marked for update but image is incomplete.`);else{if(e.images){let n=[];for(let t of e.images)n.push(t);t.images=n}else t.image=r;(n.isDefaultTexture===void 0||n.isDefaultTexture===!0)&&(i.createTexture(e,t),n.isDefaultTexture=!1,n.generation=e.version),e.source.dataReady===!0&&i.updateTexture(e,t);let a=e.isStorageTexture===!0&&e.mipmapsAutoUpdate===!1;t.needsMipmaps&&e.mipmaps.length===0&&!a&&i.generateMipmaps(e),e.onUpdate&&e.onUpdate(e)}}else i.createDefaultTexture(e),n.isDefaultTexture=!0,n.generation=e.version;n.initialized!==!0&&(n.initialized=!0,n.generation=e.version,n.bindGroups=new Set,this.info.createTexture(e),e.isVideoTexture&&Cn.enabled===!0&&Cn.getTransfer(e.colorSpace)!==`srgb`&&T(`WebGPURenderer: Video textures must use a color space with a sRGB transfer function, e.g. SRGBColorSpace.`),n.onDispose=()=>{this._destroyTexture(e)},e.addEventListener(`dispose`,n.onDispose)),n.version=e.version}updateSampler(e){return this.backend.updateSampler(e)}getSize(e,t=J_){let n=e.images?e.images[0]:e.image;return n?(n.image!==void 0&&(n=n.image),e.isHTMLTexture?(t.width=n.offsetWidth||1,t.height=n.offsetHeight||1,t.depth=1):typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement?(t.width=n.videoWidth||1,t.height=n.videoHeight||1,t.depth=1):typeof VideoFrame<`u`&&n instanceof VideoFrame?(t.width=n.displayWidth||1,t.height=n.displayHeight||1,t.depth=1):(t.width=n.width||1,t.height=n.height||1,t.depth=e.isCubeTexture?6:n.depth||1)):t.width=t.height=t.depth=1,t}getMipLevels(e,t,n){let r;return r=e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture===!0?1:Math.floor(Math.log2(Math.max(t,n)))+1,r}needsMipmaps(e){return e.generateMipmaps===!0||e.mipmaps.length>0}_destroyRenderTarget(e){if(this.has(e)===!0){let t=this.get(e),n=t.textures,r=t.depthTexture;e.removeEventListener(`dispose`,t.onDispose);for(let e=0;e<n.length;e++)this._destroyTexture(n[e]);r&&this._destroyTexture(r),this.delete(e),this.backend.delete(e),this.info.memory.renderTargets--}}_destroyTexture(e){if(this.has(e)===!0){let t=this.get(e);e.removeEventListener(`dispose`,t.onDispose);let n=t.isDefaultTexture;if(this.backend.destroyTexture(e,n),t.bindGroups)for(let n of t.bindGroups){let t=this.backend.get(n);t.groups=void 0,t.versions=void 0;for(let t of n.bindings)t.isSampler&&t.texture===e&&(t.isSampledTexture!==!0&&this.backend.destroySampler(t),t.reset(),t.release())}this._htmlTextures.delete(e),this.delete(e),this.info.destroyTexture(e)}}},X_=class extends de{constructor(e,t,n,r=1){super(e,t,n),this.a=r}set(e,t,n,r=1){return this.a=r,super.set(e,t,n)}copy(e){return e.a!==void 0&&(this.a=e.a),super.copy(e)}clone(){return new this.constructor(this.r,this.g,this.b,this.a)}},Z_=class extends Us{static get type(){return`OverrideContextNode`}constructor(e,t=null){super(t,{overrideNodes:e}),this.isOverrideContextNode=!0}getFlowContextData(){let e=[];this.traverse(t=>{t.isOverrideContextNode===!0&&e.push(t.value.overrideNodes)});let t=new Map(e.flatMap(e=>Array.from(e.entries()))),n=super.getFlowContextData();return n.overrideNodes=t,n}};function Q_(e,t=null,n=null){if(t&&t.isNode){let e=t;t=()=>e}return new Z_(new Map([[e,t]]),n)}O(`overrideNode`,(e,t,n)=>Q_(t,n,e));function $_(e,t=null){let n=new Map;for(let[t,r]of e){let e=r===null?null:typeof r==`function`?r:()=>r;n.set(t,e)}return new Z_(n,t)}O(`overrideNodes`,(e,t)=>$_(t,e));var ev=class extends aa{static get type(){return`ParameterNode`}constructor(e,t=null){super(e,t),this.isParameterNode=!0}getMemberType(e,t){let n=this.getNodeType(e),r=e.getStructTypeNode(n),i;return r===null?(C(`TSL: Member "${t}" not found in struct "${n}".`,new pr),i=`float`):i=r.getMemberType(e,t),i}getHash(){return String(this.id)}generate(){return this.name}},tv=(e,t)=>new ev(e,t),nv=A(class extends D{static get type(){return`StackNode`}constructor(e=null){super(),this.nodes=[],this.outputNode=null,this.parent=e,this._currentCond=null,this._expressionNode=null,this._currentNode=null,this._nodeDataLibrary=new Map,this.isStackNode=!0}getElementType(e){return this.outputNode?this.outputNode.getElementType(e):`void`}generateNodeType(e){return this.outputNode?this.outputNode.getNodeType(e):`void`}getMemberType(e,t){return this.outputNode?this.outputNode.getMemberType(e,t):`void`}addToStack(e,t=-1){if(e.isNode!==!0)return C(`TSL: Invalid node added to stack.`,new pr),this;if(t===-1){if(this._currentNode){let e=this._nodeDataLibrary.get(this._currentNode);e===void 0&&(e={delta:0},this._nodeDataLibrary.set(this._currentNode,e)),e.delta++,t=this.nodes.indexOf(this._currentNode)+e.delta}else t=this.nodes.length}return this.nodes.splice(t,0,e),this}addToStackBefore(e){let t=this._currentNode?this.nodes.indexOf(this._currentNode):0;return this.addToStack(e,t)}If(e,t){let n=new Ai(t);return this._currentCond=Hs(e,n),this.addToStack(this._currentCond)}ElseIf(e,t){let n=Hs(e,new Ai(t));return this._currentCond.elseNode=n,this._currentCond=n,this}Else(e){return this._currentCond.elseNode=new Ai(e),this}Switch(e){return this._expressionNode=k(e),this}Case(...e){let t=[];if(e.length>=2)for(let n=0;n<e.length-1;n++)t.push(this._expressionNode.equal(k(e[n])));else C(`TSL: Invalid parameter length. Case() requires at least two parameters.`,new pr);let n=e[e.length-1],r=new Ai(n),i=t[0];for(let e=1;e<t.length;e++)i=i.or(t[e]);let a=Hs(i,r);return this._currentCond===null?(this._currentCond=a,this.addToStack(this._currentCond)):(this._currentCond.elseNode=a,this._currentCond=a,this)}Default(e){return this.Else(e),this}setup(e){let t=e.getNodeProperties(this),n=0;for(let r of this.getChildren())r.isVarNode&&r.isIntent(e)&&r.isAssign(e)!==!0||(t[`node`+n++]=r);return t.outputNode||null}build(e,...t){let n=Ri(),r=e.buildStage;Li(this),e.setActiveStack(this);for(let t=0;t<this.nodes.length;t++){let n=this.nodes[t],i=this._currentNode;if(this._currentNode=n,!(n.isVarNode&&n.isIntent(e)&&n.isAssign(e)!==!0)){if(r===`setup`)n.build(e);else if(r===`analyze`)n.build(e,this);else if(r===`generate`){let t=e.getDataFromNode(n,`any`).stages,r=t&&t[e.shaderStage];if(n.isVarNode&&r&&r.length===1&&r[0]&&r[0].isStackNode)continue;n.build(e,`void`)}this._currentNode=i}}let i;if(this.outputNode){let n=this.outputNode.build(e,...t);(e.buildStage!==`generate`||this.outputNode.getNodeType(e)!==`void`)&&(i=n)}else i=super.build(e,...t);return Li(n),e.removeActiveStack(this),i}}).setParameterLength(0,1);function rv(e){return Object.entries(e).map(([e,t])=>typeof t==`string`?{name:e,type:t,atomic:!1}:{name:e,type:t.type,atomic:t.atomic||!1})}var iv=class extends D{static get type(){return`StructTypeNode`}constructor(e,t=null){super(`struct`),this.membersLayout=rv(e),this.name=t,this.isStructTypeNode=!0}getLength(){let e=1,t=0;for(let n of this.membersLayout){let r=n.type,i=Cr(r),a=wr(r);e=Math.max(e,a);let o=t%e%a;o!==0&&(t+=a-o),t+=i}return Math.ceil(t/e)*e}getMemberType(e,t){let n=this.membersLayout.find(e=>e.name===t);return n?n.type:`void`}generateNodeType(e){return e.getStructTypeFromNode(this,this.membersLayout,this.name).name}setup(e){e.getStructTypeFromNode(this,this.membersLayout,this.name),e.addInclude(this)}generate(e){return this.getNodeType(e)}},av=class extends D{static get type(){return`StructNode`}constructor(e,t){super(`vec3`),this.structTypeNode=e,this.values=t,this.isStructNode=!0}generateNodeType(e){return this.structTypeNode.getNodeType(e)}getMemberType(e,t){return this.structTypeNode.getMemberType(e,t)}_getChildren(){let e=super._getChildren(),t=e.find(e=>e.childNode===this.structTypeNode);return e.splice(e.indexOf(t),1),e.push(t),e}generate(e){let t=e.getVarFromNode(this),n=t.type,r=e.getPropertyName(t);return e.addLineFlowCode(`${r} = ${e.generateStruct(n,this.structTypeNode.membersLayout,this.values)}`,this),t.name}},ov=(e,t=null)=>{let n=new iv(e,t);return Pi((...t)=>{let r=null;if(t.length>0){if(t[0].isNode){r={};let n=Object.keys(e);for(let e=0;e<t.length;e++)r[n[e]]=t[e]}else r=t[0]}return new av(n,r)},n)},sv=class extends D{static get type(){return`OutputStructNode`}constructor(...e){super(),this.members=e,this.isOutputStructNode=!0}generateNodeType(){return`OutputType`}generate(e){let t=e.getDataFromNode(this);if(t.membersLayout===void 0){let n=this.members,r=[];for(let t=0;t<n.length;t++){let i=`m`+t,a=n[t].getNodeType(e);r.push({name:i,type:a,index:t})}t.membersLayout=r,t.structType=e.getOutputStructTypeFromNode(this,t.membersLayout)}let n=e.getOutputStructName(),r=this.members,i=n===``?``:n+`.`;for(let n=0;n<r.length;n++){let a=r[n].build(e,t.membersLayout[n].type);e.addLineFlowCode(`${i}m${n} = ${a}`,this)}return n}},cv=A(sv),lv=class{constructor(e=1){this.blending=e,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.premultiplyAlpha=!1}copy(e){return this.blending=e.blending,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.premultiplyAlpha=e.premultiplyAlpha,this}clone(){return new this.constructor().copy(this)}},uv=new lv(0),dv=new lv(6);function fv(e,t){for(let n=0;n<e.length;n++)if(e[n].name===t)return n;return-1}var pv=A(class extends sv{static get type(){return`MRTNode`}constructor(e){super(),this.outputNodes=e,this.blendModes={output:dv},this.isMRTNode=!0}setBlendMode(e,t){return this.blendModes[e]=t,this}getBlendMode(e){return this.blendModes[e]||uv}has(e){return this.outputNodes[e]!==void 0}get(e){return this.outputNodes[e]}merge(e){let t={...this.outputNodes,...e.outputNodes},n={...this.blendModes,...e.blendModes},r=pv(t);return r.blendings=n,r}setup(e){let t=this.outputNodes,n=e.renderer.getRenderTarget(),r=[],i=n.textures;for(let n in t){let a=fv(i,n);if(a===-1)continue;let o=e.getOutputType(a);r[a]=t[n].convert(o)}return this.members=r,super.setup(e)}}),mv=class extends Vr{static get type(){return`BitcastNode`}constructor(e,t,n=null){super(),this.valueNode=e,this.conversionType=t,this.inputType=n,this.isBitcastNode=!0}generateNodeType(e){if(this.inputType!==null){let t=this.valueNode.getNodeType(e),n=e.getTypeLength(t);return e.getTypeFromLength(n,this.conversionType)}return this.conversionType}generate(e){let t=this.getNodeType(e),n=``;if(this.inputType!==null){let t=this.valueNode.getNodeType(e);n=e.getTypeLength(t)===1?this.inputType:e.changeComponentType(t,this.inputType)}else n=this.valueNode.getNodeType(e);return`${e.getBitcastMethod(t,n)}( ${this.valueNode.build(e,n)} )`}},hv=M(mv).setParameterLength(2),gv=e=>new mv(e,`int`,`float`),_v=e=>new mv(e,`uint`,`float`),vv=e=>new mv(e,`float`,`int`),yv=e=>new mv(e,`float`,`uint`),bv={},xv=class e extends G{static get type(){return`BitcountNode`}constructor(e,t){super(e,t),this.isBitcountNode=!0}_resolveElementType(e,t,n){n===`int`?t.assign(hv(e,`uint`)):t.assign(e)}_returnDataNode(e){switch(e){case`uint`:return L;case`int`:return I;case`uvec2`:return Wi;case`uvec3`:return qi;case`uvec4`:return Xi;case`ivec2`:return Ui;case`ivec3`:return Ki;case`ivec4`:return Yi}}_createTrailingZerosBaseLayout(e,t){let n=this._returnDataNode(t);return N(([e])=>{let r=L(0);this._resolveElementType(e,r,t);let i=_v(F(r.bitAnd(rs(r)))).shiftRight(23).sub(127);return n(i)}).setLayout({name:e,type:t,inputs:[{name:`value`,type:t}]})}_createLeadingZerosBaseLayout(e,t){let n=this._returnDataNode(t);return N(([e])=>{P(e.equal(L(0)),()=>L(32));let r=L(0),i=L(0);return this._resolveElementType(e,r,t),P(r.shiftRight(16).equal(0),()=>{i.addAssign(16),r.shiftLeftAssign(16)}),P(r.shiftRight(24).equal(0),()=>{i.addAssign(8),r.shiftLeftAssign(8)}),P(r.shiftRight(28).equal(0),()=>{i.addAssign(4),r.shiftLeftAssign(4)}),P(r.shiftRight(30).equal(0),()=>{i.addAssign(2),r.shiftLeftAssign(2)}),P(r.shiftRight(31).equal(0),()=>{i.addAssign(1)}),n(i)}).setLayout({name:e,type:t,inputs:[{name:`value`,type:t}]})}_createOneBitsBaseLayout(e,t){let n=this._returnDataNode(t);return N(([e])=>{let r=L(0);this._resolveElementType(e,r,t),r.assign(r.sub(r.shiftRight(L(1)).bitAnd(L(1431655765)))),r.assign(r.bitAnd(L(858993459)).add(r.shiftRight(L(2)).bitAnd(L(858993459))));let i=r.add(r.shiftRight(L(4))).bitAnd(L(252645135)).mul(L(16843009)).shiftRight(L(24));return n(i)}).setLayout({name:e,type:t,inputs:[{name:`value`,type:t}]})}_createMainLayout(e,t,n,r){let i=this._returnDataNode(t);return N(([e])=>{if(n===1)return i(r(e));{let t=i(0),a=[`x`,`y`,`z`,`w`];for(let i=0;i<n;i++){let n=a[i];t[n].assign(r(e[n]))}return t}}).setLayout({name:e,type:t,inputs:[{name:`value`,type:t}]})}setup(t){let{method:n,aNode:r}=this,{renderer:i}=t;if(i.backend.isWebGPUBackend)return super.setup(t);let a=this.getInputType(t),o=t.getElementType(a),s=t.getTypeLength(a),c=`${n}_base_${o}`,l=`${n}_${a}`,u=bv[c];if(u===void 0){switch(n){case e.COUNT_LEADING_ZEROS:u=this._createLeadingZerosBaseLayout(c,o);break;case e.COUNT_TRAILING_ZEROS:u=this._createTrailingZerosBaseLayout(c,o);break;case e.COUNT_ONE_BITS:u=this._createOneBitsBaseLayout(c,o)}bv[c]=u}let d=bv[l];return d===void 0&&(d=this._createMainLayout(l,a,s,u),bv[l]=d),N(()=>d(r))()}};xv.COUNT_TRAILING_ZEROS=`countTrailingZeros`,xv.COUNT_LEADING_ZEROS=`countLeadingZeros`,xv.COUNT_ONE_BITS=`countOneBits`;var Sv=M(xv,xv.COUNT_TRAILING_ZEROS).setParameterLength(1),Cv=M(xv,xv.COUNT_LEADING_ZEROS).setParameterLength(1),wv=M(xv,xv.COUNT_ONE_BITS).setParameterLength(1),Tv=N(([e])=>{let t=e.toUint().mul(747796405).add(2891336453),n=t.shiftRight(t.shiftRight(28).add(4)).bitXor(t).mul(277803737);return n.shiftRight(22).bitXor(n).toFloat().mul(1/2**32)}),Ev=(e,t)=>Ss(W(4,e.mul(U(1,e))),t),Dv=(e,t)=>e.lessThan(.5)?Ev(e.mul(2),t).div(2):U(1,Ev(W(U(1,e),2),t).div(2)),Ov=(e,t,n)=>Ss($a(Ss(e,t),Qa(Ss(e,t),Ss(U(1,e),n))),1/t),kv=(e,t)=>Ho(wo.mul(t.mul(e).sub(1))).div(wo.mul(t.mul(e).sub(1))),Av=class extends Vr{static get type(){return`PackFloatNode`}constructor(e,t){super(),this.vectorNode=t,this.encoding=e,this.isPackFloatNode=!0}generateNodeType(){return`uint`}generate(e){let t=this.vectorNode.getNodeType(e);return`${e.getFloatPackingMethod(this.encoding)}(${this.vectorNode.build(e,t)})`}},jv=M(Av,`snorm`).setParameterLength(1),Mv=M(Av,`unorm`).setParameterLength(1),Nv=M(Av,`float16`).setParameterLength(1),Pv=class extends Vr{static get type(){return`UnpackFloatNode`}constructor(e,t){super(),this.uintNode=t,this.encoding=e,this.isUnpackFloatNode=!0}generateNodeType(){return`vec2`}generate(e){let t=this.uintNode.getNodeType(e);return`${e.getFloatUnpackingMethod(this.encoding)}(${this.uintNode.build(e,t)})`}},Fv=M(Pv,`snorm`).setParameterLength(1),Iv=M(Pv,`unorm`).setParameterLength(1),Lv=M(Pv,`float16`).setParameterLength(1),Rv=N(([e])=>e.fract().sub(.5).abs()).setLayout({name:`tri`,type:`float`,inputs:[{name:`x`,type:`float`}]}),zv=N(([e])=>z(Rv(e.z.add(Rv(e.y.mul(1)))),Rv(e.z.add(Rv(e.x.mul(1)))),Rv(e.y.add(Rv(e.x.mul(1)))))).setLayout({name:`tri3`,type:`vec3`,inputs:[{name:`p`,type:`vec3`}]}),Bv=N(([e,t,n])=>{let r=z(e).toVar(),i=F(1.4).toVar(),a=F(0).toVar(),o=z(r).toVar();return gp({start:F(0),end:F(3),type:`float`,condition:`<=`},()=>{let e=z(zv(o.mul(2))).toVar();r.addAssign(e.add(n.mul(F(.1).mul(t)))),o.mulAssign(1.8),i.mulAssign(1.5),r.mulAssign(1.2);let s=F(Rv(r.z.add(Rv(r.x.add(Rv(r.y)))))).toVar();a.addAssign(s.div(i)),o.addAssign(.14)}),a}).setLayout({name:`triNoise3D`,type:`float`,inputs:[{name:`position`,type:`vec3`},{name:`speed`,type:`float`},{name:`time`,type:`float`}]}),Vv=A(class extends D{static get type(){return`FunctionOverloadingNode`}constructor(e=[],...t){super(),this.functionNodes=e,this.parametersNodes=t,this._candidateFn=null,this.global=!0}generateNodeType(e){return this.getCandidateFn(e).shaderNode.layout.type}getCandidateFn(e){let t=this.parametersNodes,n=this._candidateFn;if(n===null){let r=null,i=-1;for(let n of this.functionNodes){let a=n.shaderNode.layout;if(a===null)throw Error(`THREE.FunctionOverloadingNode: FunctionNode must be a layout.`);let o=a.inputs;if(t.length===o.length){let a=0;for(let n=0;n<t.length;n++){let r=t[n],i=o[n];r.getNodeType(e)===i.type&&a++}a>i&&(r=n,i=a)}}this._candidateFn=n=r}return n}setup(e){return this.getCandidateFn(e)(...this.parametersNodes)}}),Hv=e=>(...t)=>Vv(e,...t),Uv=H(0).setGroup(V).onRenderUpdate(e=>e.time),Wv=H(0).setGroup(V).onRenderUpdate(e=>e.deltaTime),Gv=H(0,`uint`).setGroup(V).onRenderUpdate(e=>e.frameId),Kv=(e=Uv)=>e.add(.75).mul(Math.PI*2).sin().mul(.5).add(.5),qv=(e=Uv)=>e.fract().round(),Jv=(e=Uv)=>e.add(.5).fract().mul(2).sub(1).abs(),Yv=(e=Uv)=>e.fract();function Xv(e,t=null){return Ws(t,{getUV:typeof e==`function`?e:()=>e})}var Zv=N(([e,t,n=R(.5)])=>t_(e.sub(n),t).add(n)),Qv=N(([e,t,n=R(.5)])=>{let r=e.sub(n),i=r.dot(r),a=i.mul(i).mul(t);return e.add(r.mul(a))}),$v=N(({position:e=null,horizontal:t=!0,vertical:n=!1})=>{let r;e===null?r=_u:(r=_u.toVar(),r[3][0]=e.x,r[3][1]=e.y,r[3][2]=e.z);let i=nu.mul(r);return Oi(t)&&(i[0][0]=_u[0].length(),i[0][1]=0,i[0][2]=0),Oi(n)&&(i[1][0]=0,i[1][1]=_u[1].length(),i[1][2]=0),i[2][0]=0,i[2][1]=0,i[2][2]=1,eu.mul(i).mul(Au)}),ey=N(([e=null])=>{let t=Jp();return Jp(Ip(e)).sub(t).lessThan(0).select(kl,e)}),ty=N(([e,t=sl(),n=F(0)])=>{let r=e.x,i=e.y,a=n.mod(r.mul(i)).floor(),o=a.mod(r),s=i.sub(a.add(1).div(r).ceil()),c=e.reciprocal(),l=R(o,s);return t.add(l).mul(c)}),ny=N(([e,t=null,n=null,r=F(1),i=Au,a=Vu])=>{let o=a.abs().normalize();o=o.div(o.dot(z(1)));let s=i.yz.mul(r),c=i.zx.mul(r),l=i.xy.mul(r),u=e.value,d=t===null?u:t.value,f=n===null?u:n.value;return Qa(q(u,s).mul(o.x),q(d,c).mul(o.y),q(f,l).mul(o.z))}),ry=(...e)=>ny(...e),iy=new u,ay=new w,oy=new w,sy=new w,cy=new Kt,ly=new w(0,0,-1),uy=new bt,dy=new w,fy=new w,py=new bt,my=new hn,hy=new Xn,gy=kl.flipX();hy.depthTexture=new Pn(1,1);var _y=!1,vy=class e extends fl{static get type(){return`ReflectorNode`}constructor(e={}){super(e.defaultTexture||hy.texture,gy),this._reflectorBaseNode=e.reflector||new yy(this,e),this._depthNode=null,this.setUpdateMatrix(!1)}get reflector(){return this._reflectorBaseNode}get target(){return this._reflectorBaseNode.target}getDepthNode(){if(this._depthNode===null){if(this._reflectorBaseNode.depth!==!0)throw Error(`THREE.ReflectorNode: Depth node can only be requested when the reflector is created with { depth: true }. `);this._depthNode=new e({defaultTexture:hy.depthTexture,reflector:this._reflectorBaseNode})}return this._depthNode}setup(e){return e.object.isQuadMesh||this._reflectorBaseNode.build(e),super.setup(e)}clone(){let e=new this.constructor(this.reflectorNode);return e.uvNode=this.uvNode,e.levelNode=this.levelNode,e.biasNode=this.biasNode,e.sampler=this.sampler,e.depthNode=this.depthNode,e.compareNode=this.compareNode,e.gradNode=this.gradNode,e.gatherNode=this.gatherNode,e.offsetNode=this.offsetNode,e._reflectorBaseNode=this._reflectorBaseNode,e}dispose(){super.dispose(),this._reflectorBaseNode.dispose()}},yy=class extends D{static get type(){return`ReflectorBaseNode`}constructor(e,t={}){super();let{target:n=new $n,resolutionScale:r=1,generateMipmaps:i=!1,bounces:a=!0,depth:o=!1,samples:s=0}=t;this.textureNode=e,this.target=n,this.resolutionScale=r,t.resolution!==void 0&&(Qn(`ReflectorNode: The "resolution" parameter has been renamed to "resolutionScale".`),this.resolutionScale=t.resolution),this.generateMipmaps=i,this.bounces=a,this.depth=o,this.samples=s,this.updateBeforeType=a?E.RENDER:E.FRAME,this.virtualCameras=new WeakMap,this.renderTargets=new Map,this.forceUpdate=!1,this.hasOutput=!1}_updateResolution(e,t){let n=this.resolutionScale;t.getDrawingBufferSize(my),e.setSize(Math.round(my.width*n),Math.round(my.height*n))}setup(e){return this._updateResolution(hy,e.renderer),super.setup(e)}dispose(){super.dispose();for(let e of this.renderTargets.values())e.dispose()}getVirtualCamera(e){let t=this.virtualCameras.get(e);return t===void 0&&(t=e.clone(),this.virtualCameras.set(e,t)),t}getRenderTarget(e){let t=this.renderTargets.get(e);return t===void 0&&(t=new Xn(0,0,{type:Ie,samples:this.samples}),this.generateMipmaps===!0&&(t.texture.minFilter=pe,t.texture.generateMipmaps=!0),this.depth===!0&&(t.depthTexture=new Pn),this.renderTargets.set(e,t)),t}updateBefore(e){if(this.bounces===!1&&_y)return!1;_y=!0;let{scene:t,camera:n,renderer:r,material:i}=e,{target:a}=this,o=this.getVirtualCamera(n),s=this.getRenderTarget(o);r.getDrawingBufferSize(my),this._updateResolution(s,r),oy.setFromMatrixPosition(a.matrixWorld),sy.setFromMatrixPosition(n.matrixWorld),cy.extractRotation(a.matrixWorld),ay.set(0,0,1),ay.applyMatrix4(cy),dy.subVectors(oy,sy);let c=dy.dot(ay)>0,l=!1;if(c===!0&&this.forceUpdate===!1){if(this.hasOutput===!1){_y=!1;return}l=!0}dy.reflect(ay).negate(),dy.add(oy),cy.extractRotation(n.matrixWorld),ly.set(0,0,-1),ly.applyMatrix4(cy),ly.add(sy),fy.subVectors(oy,ly),fy.reflect(ay).negate(),fy.add(oy),o.coordinateSystem=n.coordinateSystem,o.position.copy(dy),o.up.set(0,1,0),o.up.applyMatrix4(cy),o.up.reflect(ay),o.lookAt(fy),o.near=n.near,o.far=n.far,o.updateMatrixWorld(),o.projectionMatrix.copy(n.projectionMatrix),iy.setFromNormalAndCoplanarPoint(ay,oy),iy.applyMatrix4(o.matrixWorldInverse),uy.set(iy.normal.x,iy.normal.y,iy.normal.z,iy.constant);let u=o.projectionMatrix;py.x=(Math.sign(uy.x)+u.elements[8])/u.elements[0],py.y=(Math.sign(uy.y)+u.elements[9])/u.elements[5],py.z=-1,py.w=(1+u.elements[10])/u.elements[14],uy.multiplyScalar(1/uy.dot(py)),u.elements[2]=uy.x,u.elements[6]=uy.y,u.elements[10]=r.coordinateSystem===2001?uy.z-0:uy.z+1-0,u.elements[14]=uy.w,this.textureNode.value=s.texture,this.depth===!0&&(this.textureNode.getDepthNode().value=s.depthTexture),i.visible=!1;let d=r.getRenderTarget(),f=r.getMRT(),p=r.autoClear;r.setMRT(null),r.setRenderTarget(s),r.autoClear=!0;let m=t.name;t.name=(t.name||`Scene`)+` [ Reflector ]`,l?(r.clear(),this.hasOutput=!1):(r.render(t,o),this.hasOutput=!0),t.name=m,r.setMRT(f),r.setRenderTarget(d),r.autoClear=p,i.visible=!0,_y=!1,this.forceUpdate=!1}get resolution(){return Qn(`ReflectorNode: The "resolution" property has been renamed to "resolutionScale".`),this.resolutionScale}set resolution(e){Qn(`ReflectorNode: The "resolution" property has been renamed to "resolutionScale".`),this.resolutionScale=e}},by=e=>new vy(e),xy=new Yn(-1,1,1,-1,0,1),Sy=new class extends Ue{constructor(e=!1){super();let t=e===!1?[0,-1,0,1,2,1]:[0,2,0,0,2,0];this.setAttribute(`position`,new zt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new zt(t,2))}},Cy=class extends ft{constructor(e=null){super(Sy,e),this.camera=xy,this.isQuadMesh=!0}async renderAsync(e){Qn(`QuadMesh: "renderAsync()" has been deprecated. Use "render()" and "await renderer.init();" when creating the renderer.`),await e.init(),e.render(this,xy)}render(e){e.render(this,xy)}},wy=new hn,Ty=class extends fl{static get type(){return`RTTNode`}constructor(e,t=null,n=null,r={type:Ie}){let i=new Xn(t,n,r);super(i.texture,sl()),this.isRTTNode=!0,this.node=e,this.width=t,this.height=n,this.renderTarget=i,this.textureNeedsUpdate=!0,this.autoUpdate=!0,this._resolutionScale=1,this._rttNode=null,this._quadMesh=new Cy(new om),this.updateBeforeType=E.RENDER}get autoResize(){return this.width===null}setup(e){return this._rttNode=this.node.context(e.getSharedContext()),this._quadMesh.material.name=`RTT`,this._quadMesh.material.needsUpdate=!0,super.setup(e)}setSize(e,t){let n=Math.floor(e*this._resolutionScale),r=Math.floor(t*this._resolutionScale);this.renderTarget.setSize(n,r),this.textureNeedsUpdate=!0}setResolutionScale(e){return this._resolutionScale=e,this.autoResize===!1&&this.setSize(this.width,this.height),this}getResolutionScale(){return this._resolutionScale}updateBefore({renderer:e}){if(this.textureNeedsUpdate===!1&&this.autoUpdate===!1)return;this.textureNeedsUpdate=!1;let t=e.getRenderTarget();if(this.autoResize===!0){let t=e.getDrawingBufferSize(wy),n=Math.floor(t.width*this._resolutionScale),r=Math.floor(t.height*this._resolutionScale);(n!==this.renderTarget.width||r!==this.renderTarget.height)&&(this.renderTarget.setSize(n,r),this.textureNeedsUpdate=!0)}let n=`RTT`;this.node.name&&(n=this.node.name+` [ `+n+` ]`),this._quadMesh.material.fragmentNode=this._rttNode,this._quadMesh.name=n,e.setRenderTarget(this.renderTarget),this._quadMesh.render(e),e.setRenderTarget(t)}clone(){let e=new fl(this.value,this.uvNode,this.levelNode);return e.sampler=this.sampler,e.referenceNode=this,e}},Ey=(e,...t)=>new Ty(k(e),...t),Dy=(e,...t)=>e.isSampleNode||e.isTextureNode?e:e.isPassNode?e.getTextureNode():Ey(e,...t),Oy=N(([e,t,n],r)=>{let i;r.renderer.coordinateSystem===2001?(e=R(e.x,e.y.oneMinus()).mul(2).sub(1),i=B(z(e,t),1)):i=B(z(e.x,e.y.oneMinus(),t).mul(2).sub(1),1);let a=B(n.mul(i));return a.xyz.div(a.w)}),ky=N(([e,t])=>{let n=t.mul(B(e,1)),r=n.xy.div(n.w).mul(.5).add(.5).toVar();return R(r.x,r.y.oneMinus())}),Ay=N(([e,t,n])=>{let r=cl(hl(t)),i=Ui(e.mul(r)).toVar(),a=hl(t,i).toVar(),o=hl(t,i.sub(Ui(2,0))).toVar(),s=hl(t,i.sub(Ui(1,0))).toVar(),c=hl(t,i.add(Ui(1,0))).toVar(),l=hl(t,i.add(Ui(2,0))).toVar(),u=hl(t,i.add(Ui(0,2))).toVar(),d=hl(t,i.add(Ui(0,1))).toVar(),f=hl(t,i.sub(Ui(0,1))).toVar(),p=hl(t,i.sub(Ui(0,2))).toVar(),m=es(U(F(2).mul(s).sub(o),a)).toVar(),h=es(U(F(2).mul(c).sub(l),a)).toVar(),g=es(U(F(2).mul(d).sub(u),a)).toVar(),_=es(U(F(2).mul(f).sub(p),a)).toVar(),v=Oy(e,a,n).toVar();return Bo(xs(m.lessThan(h).select(v.sub(Oy(e.sub(R(F(1).div(r.x),0)),s,n)),v.negate().add(Oy(e.add(R(F(1).div(r.x),0)),c,n))),g.lessThan(_).select(v.sub(Oy(e.add(R(0,F(1).div(r.y))),d,n)),v.negate().add(Oy(e.sub(R(0,F(1).div(r.y))),f,n)))))}),jy=N(([e])=>Vo(F(52.9829189).mul(Vo(bs(e,R(.06711056,.00583715)))))).setLayout({name:`interleavedGradientNoise`,type:`float`,inputs:[{name:`position`,type:`vec2`}]}),My=N(([e,t,n])=>{let r=F(2.399963229728653),i=Io(F(e).add(.5).div(F(t))),a=F(e).mul(r).add(n);return R(Wo(a),Ho(a)).mul(i)}).setLayout({name:`vogelDiskSample`,type:`vec2`,inputs:[{name:`sampleIndex`,type:`int`},{name:`samplesCount`,type:`int`},{name:`phi`,type:`float`}]}),Ny=class extends D{static get type(){return`SampleNode`}constructor(e,t=null){super(),this.callback=e,this.uvNode=t,this.isSampleNode=!0}setup(){return this.sample(sl())}sample(e){return this.callback(e)}},Py=(e,t=null)=>new Ny(e,k(t)),Fy=class extends g{constructor(e,t,n=Float32Array){let r=ArrayBuffer.isView(e)?e:new n(e*t);super(r,t),this.isStorageInstancedBufferAttribute=!0}},Iy=class extends o{constructor(e,t,n=Float32Array){let r=ArrayBuffer.isView(e)?e:new n(e*t);super(r,t),this.isStorageBufferAttribute=!0}},Ly=(e,t=`float`)=>{let n,r;return t.isStructTypeNode===!0?(n=t.getLength(),r=xr(`float`)):(n=Sr(t),r=xr(t)),Yf(new Iy(e,n,r),t,e)},Ry=(e,t=`float`)=>{let n,r;t.isStructTypeNode===!0?(n=t.getLength(),r=xr(`float`)):(n=Sr(t),r=xr(t));let i=new Fy(e,n,r);return Yf(i,t,i.count)},zy=j(class extends D{static get type(){return`PointUVNode`}constructor(){super(`vec2`),this.isPointUVNode=!0}generate(){return`vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y )`}}),By=new Kt,Vy=H(0).setGroup(V).onRenderUpdate(({scene:e})=>e.backgroundBlurriness),Hy=H(1).setGroup(V).onRenderUpdate(({scene:e})=>e.backgroundIntensity),Uy=H(new Kt).setGroup(V).onRenderUpdate(({scene:e})=>{let t=e.background;return t!==null&&t.isTexture&&t.mapping!==300||e.backgroundNode&&e.backgroundNode.isNode?By.makeRotationFromEuler(e.backgroundRotation).transpose():By.identity(),By}),Wy=class extends fl{static get type(){return`StorageTextureNode`}constructor(e,t,n=null){super(e,t),this.storeNode=n,this.mipLevel=0,this.isStorageTextureNode=!0,this.access=Mr.WRITE_ONLY}getInputType(){return`storageTexture`}getTransformedUV(e){return e}setup(e){super.setup(e);let t=e.getNodeProperties(this);return t.storeNode=this.storeNode,t}setAccess(e){return this.access=e,this}setMipLevel(e){return this.mipLevel=e,this}generate(e,t){return this.storeNode===null?super.generate(e,t):(this.generateStore(e),``)}generateSnippet(e,t,n,r,i,a,o,s,c){let l=this.value;return e.generateStorageTextureLoad(l,t,n,r,a,c)}toReadWrite(){return this.setAccess(Mr.READ_WRITE)}toReadOnly(){return this.setAccess(Mr.READ_ONLY)}toWriteOnly(){return this.setAccess(Mr.WRITE_ONLY)}store(e,t){let n=this.clone();return n.referenceNode=this.getBase(),n.uvNode=e,n.storeNode=t,t!==null&&n.toStack(),n}generateStore(e){let{uvNode:t,storeNode:n,depthNode:r}=e.getNodeProperties(this),i=super.generate(e,`property`),a=t.build(e,this.value.is3DTexture===!0?`uvec3`:`uvec2`),o=n.build(e,`vec4`),s=r?r.build(e,`int`):null,c=e.generateTextureStore(this.value,i,a,s,o);e.addLineFlowCode(c,this)}clone(){let e=super.clone();return e.storeNode=this.storeNode,e.mipLevel=this.mipLevel,e.access=this.access,e}},Gy=A(Wy).setParameterLength(1,3),Ky=(e,t,n)=>{let r;return e.isStorageTextureNode===!0?r=e.store(t,n):(r=Gy(e,t,n),n!==null&&r.toStack()),r},qy=A(class extends Wy{static get type(){return`StorageTexture3DNode`}constructor(e,t,n=null){super(e,t,n),this.isStorageTexture3DNode=!0}getDefaultUV(){return z(.5,.5,.5)}setUpdateMatrix(){}generateUV(e,t){return t.build(e,this.sampler===!0?`vec3`:`ivec3`)}generateOffset(e,t){return t.build(e,`ivec3`)}}).setParameterLength(1,3),Jy=N(({texture:e,uv:t})=>{let n=1e-4,r=z().toVar();return P(t.x.lessThan(n),()=>{r.assign(z(1,0,0))}).ElseIf(t.y.lessThan(n),()=>{r.assign(z(0,1,0))}).ElseIf(t.z.lessThan(n),()=>{r.assign(z(0,0,1))}).ElseIf(t.x.greaterThan(.9999),()=>{r.assign(z(-1,0,0))}).ElseIf(t.y.greaterThan(.9999),()=>{r.assign(z(0,-1,0))}).ElseIf(t.z.greaterThan(.9999),()=>{r.assign(z(0,0,-1))}).Else(()=>{let n=.01,i=e.sample(t.add(z(-.01,0,0))).r.sub(e.sample(t.add(z(n,0,0))).r),a=e.sample(t.add(z(0,-.01,0))).r.sub(e.sample(t.add(z(0,n,0))).r),o=e.sample(t.add(z(0,0,-.01))).r.sub(e.sample(t.add(z(0,0,n))).r);r.assign(z(i,a,o))}),r.normalize()}),Yy=A(class extends fl{static get type(){return`Texture3DNode`}constructor(e,t=null,n=null){super(e,t,n),this.isTexture3DNode=!0}getInputType(){return`texture3D`}getDefaultUV(){return z(.5,.5,.5)}setUpdateMatrix(){}generateUV(e,t){return t.build(e,this.sampler===!0?`vec3`:`ivec3`)}generateOffset(e,t){return t.build(e,`ivec3`)}normal(e){return Jy({texture:this,uv:e})}}).setParameterLength(1,3),Xy=(...e)=>Yy(...e).setSampler(!1),Zy=(e,t,n)=>Yy(e,t).level(n),Qy=class extends dd{static get type(){return`UserDataNode`}constructor(e,t,n=null){super(e,t,n),this.userData=n}updateReference(e){return this.reference=this.userData===null?e.object.userData:this.userData,this.reference}},$y=(e,t,n)=>new Qy(e,t,n),eb=new WeakMap,tb=class extends Vr{static get type(){return`VelocityNode`}constructor(){super(`vec2`),this.projectionMatrix=null,this.updateType=E.OBJECT,this.updateAfterType=E.OBJECT,this.previousModelWorldMatrix=H(new Kt),this.previousProjectionMatrix=H(new Kt).setGroup(V),this.previousCameraViewMatrix=H(new Kt)}setProjectionMatrix(e){this.projectionMatrix=e}update({frameId:e,camera:t,object:n}){let r=rb(n);this.previousModelWorldMatrix.value.copy(r);let i=nb(t);i.frameId!==e&&(i.frameId=e,i.previousProjectionMatrix===void 0?(i.previousProjectionMatrix=new Kt,i.previousCameraViewMatrix=new Kt,i.currentProjectionMatrix=new Kt,i.currentCameraViewMatrix=new Kt,i.previousProjectionMatrix.copy(this.projectionMatrix||t.projectionMatrix),i.previousCameraViewMatrix.copy(t.matrixWorldInverse)):(i.previousProjectionMatrix.copy(i.currentProjectionMatrix),i.previousCameraViewMatrix.copy(i.currentCameraViewMatrix)),i.currentProjectionMatrix.copy(this.projectionMatrix||t.projectionMatrix),i.currentCameraViewMatrix.copy(t.matrixWorldInverse),this.previousProjectionMatrix.value.copy(i.previousProjectionMatrix),this.previousCameraViewMatrix.value.copy(i.previousCameraViewMatrix))}updateAfter({object:e}){rb(e).copy(e.matrixWorld)}setup(){let e=this.projectionMatrix===null?eu:H(this.projectionMatrix),t=this.previousCameraViewMatrix.mul(this.previousModelWorldMatrix),n=e.mul(wu).mul(Au),r=this.previousProjectionMatrix.mul(t).mul(ju);return U(n.xy.div(n.w),r.xy.div(r.w))}};function nb(e){let t=eb.get(e);return t===void 0&&(t={},eb.set(e,t)),t}function rb(e,t=0){let n=nb(e),r=n[t];return r===void 0&&(n[t]=r=new Kt,n[t].copy(e.matrixWorld)),r}var ib=j(tb),ab=N(([e,t])=>ms(1,e.oneMinus().div(t)).oneMinus()).setLayout({name:`blendBurn`,type:`vec3`,inputs:[{name:`base`,type:`vec3`},{name:`blend`,type:`vec3`}]}),ob=N(([e,t])=>ms(e.div(t.oneMinus()),1)).setLayout({name:`blendDodge`,type:`vec3`,inputs:[{name:`base`,type:`vec3`},{name:`blend`,type:`vec3`}]}),sb=N(([e,t])=>e.oneMinus().mul(t.oneMinus()).oneMinus()).setLayout({name:`blendScreen`,type:`vec3`,inputs:[{name:`base`,type:`vec3`},{name:`blend`,type:`vec3`}]}),cb=N(([e,t])=>K(e.mul(2).mul(t),e.oneMinus().mul(2).mul(t.oneMinus()).oneMinus(),gs(.5,e))).setLayout({name:`blendOverlay`,type:`vec3`,inputs:[{name:`base`,type:`vec3`},{name:`blend`,type:`vec3`}]}),lb=N(([e,t])=>{let n=t.a.add(e.a.mul(t.a.oneMinus()));return B(t.rgb.mul(t.a).add(e.rgb.mul(e.a).mul(t.a.oneMinus())).div(n),n)}).setLayout({name:`blendColor`,type:`vec4`,inputs:[{name:`base`,type:`vec4`},{name:`blend`,type:`vec4`}]}),ub=N(([e])=>mb(e.rgb)),db=N(([e,t=F(1)])=>t.mix(mb(e.rgb),e.rgb).max(0)),fb=N(([e,t=F(0)])=>{let n=Qa(e.r,e.g,e.b).div(3),r=e.r.max(e.g.max(e.b)),i=r.sub(n).mul(t).mul(-3);return K(e.rgb,r,i).max(0)}),pb=N(([e,t=F(1)])=>{let n=z(.57735,.57735,.57735),r=t.cos();return z(e.rgb.mul(r).add(n.cross(e.rgb).mul(t.sin()).add(n.mul(bs(n,e.rgb).mul(r.oneMinus()))))).max(0)}),mb=(e,t=z(Cn.getLuminanceCoefficients(new w)))=>bs(e,t),hb=N(([e,t=z(1),n=z(0),r=z(1),i=F(1),a=z(Cn.getLuminanceCoefficients(new w,nt))])=>{let o=e.rgb.dot(z(a)),s=hs(e.rgb.mul(t).add(n),0),c=s.pow(r);return P(s.r.greaterThan(0),()=>{s.r.assign(c.r)}),P(s.g.greaterThan(0),()=>{s.g.assign(c.g)}),P(s.b.greaterThan(0),()=>{s.b.assign(c.b)}),s.assign(o.add(s.sub(o).mul(i)).max(0)),B(s.rgb,e.a)}),gb=N(([e,t])=>e.mul(t).floor().div(t)),_b=null,vb=A(class extends Ap{static get type(){return`ViewportSharedTextureNode`}constructor(e=kl,t=null){_b===null&&(_b=new Wn),super(e,t,_b)}getTextureForReference(){return _b}updateReference(){return this}}).setParameterLength(0,2),yb=new hn,bb=class extends fl{static get type(){return`PassTextureNode`}constructor(e,t){super(t),this.passNode=e,this.isPassTextureNode=!0,this.setUpdateMatrix(!1)}setup(e){let t=e.getNodeProperties(this);return t.passNode=this.passNode,super.setup(e)}clone(){return new this.constructor(this.passNode,this.value)}},xb=class extends bb{static get type(){return`PassMultipleTextureNode`}constructor(e,t,n=!1){super(e,null),this.textureName=t,this.previousTexture=n,this.isPassMultipleTextureNode=!0}updateTexture(){this.value=this.previousTexture?this.passNode.getPreviousTexture(this.textureName):this.passNode.getTexture(this.textureName)}setup(e){return this.updateTexture(),super.setup(e)}clone(){let e=new this.constructor(this.passNode,this.textureName,this.previousTexture);return e.uvNode=this.uvNode,e.levelNode=this.levelNode,e.biasNode=this.biasNode,e.sampler=this.sampler,e.depthNode=this.depthNode,e.compareNode=this.compareNode,e.gradNode=this.gradNode,e.gatherNode=this.gatherNode,e.offsetNode=this.offsetNode,e}},Sb=class e extends Vr{static get type(){return`PassNode`}constructor(t,n,r,i={}){super(`vec4`),this.scope=t,this.scene=n,this.camera=r,this.options=i,this._width=1,this._height=1;let a=new Xn(this._width,this._height,{type:Ie,...i});a.texture.name=`output`;let o=null;(this.scope===e.DEPTH||i.depthBuffer!==!1)&&(o=new Pn,o.isRenderTargetTexture=!0,o.name=`depth`,a.depthTexture=o),this.renderTarget=a,this.overrideMaterial=null,this.transparent=!0,this.opaque=!0,this.contextNode=null,this._contextNodeCache=null,this._textures={output:a.texture},o!==null&&(this._textures.depth=o),this._textureNodes={},this._linearDepthNodes={},this._viewZNodes={},this._previousTextures={},this._previousTextureNodes={},this._cameraNear=H(0),this._cameraFar=H(0),this._mrt=null,this._layers=null,this._resolutionScale=1,this._viewport=null,this._scissor=null,this.isPassNode=!0,this.updateBeforeType=E.FRAME,this.global=!0}setResolutionScale(e){return this._resolutionScale=e,this}getResolutionScale(){return this._resolutionScale}setResolution(e){return T(`PassNode: .setResolution() is deprecated. Use .setResolutionScale() instead.`),this.setResolutionScale(e)}getResolution(){return T(`PassNode: .getResolution() is deprecated. Use .getResolutionScale() instead.`),this.getResolutionScale()}setLayers(e){return this._layers=e,this}getLayers(){return this._layers}setMRT(e){return this._mrt=e,this}getMRT(){return this._mrt}getTexture(e){let t=this._textures[e];if(t===void 0){if(e===`depth`)throw Error(`THREE.PassNode: Depth texture is not available for this pass.`);t=this.renderTarget.texture.clone(),t.name=e,this._textures[e]=t,this.renderTarget.textures.push(t)}return t}getPreviousTexture(e){let t=this._previousTextures[e];return t===void 0&&(t=this.getTexture(e).clone(),this._previousTextures[e]=t),t}toggleTexture(e){let t=this._previousTextures[e];if(t!==void 0){let n=this._textures[e],r=this.renderTarget.textures.indexOf(n);this.renderTarget.textures[r]=t,this._textures[e]=t,this._previousTextures[e]=n,this._textureNodes[e].updateTexture(),this._previousTextureNodes[e].updateTexture()}}getTextureNode(e=`output`){let t=this._textureNodes[e];return t===void 0&&(t=new xb(this,e),t.updateTexture(),this._textureNodes[e]=t),t}getPreviousTextureNode(e=`output`){let t=this._previousTextureNodes[e];return t===void 0&&(this._textureNodes[e]===void 0&&this.getTextureNode(e),t=new xb(this,e,!0),t.updateTexture(),this._previousTextureNodes[e]=t),t}getViewZNode(e=`depth`){let t=this._viewZNodes[e];if(t===void 0){let n=this._cameraNear,r=this._cameraFar;this._viewZNodes[e]=t=Up(this.getTextureNode(e),n,r)}return t}getLinearDepthNode(e=`depth`){let t=this._linearDepthNodes[e];if(t===void 0){let n=this._cameraNear,r=this._cameraFar,i=this.getViewZNode(e);this._linearDepthNodes[e]=t=Rp(i,n,r)}return t}async compileAsync(e){let t=e.getRenderTarget(),n=e.getMRT();e.setRenderTarget(this.renderTarget),e.setMRT(this._mrt),await e.compileAsync(this.scene,this.camera),e.setRenderTarget(t),e.setMRT(n)}setup({renderer:t}){return this.renderTarget.samples=this.options.samples===void 0?t.samples:this.options.samples,this.renderTarget.texture.type=t.getOutputBufferType(),t.reversedDepthBuffer===!0&&this.renderTarget.depthTexture!==null&&(this.renderTarget.depthTexture.type=lt),this.scope===e.COLOR?this.getTextureNode():this.getLinearDepthNode()}updateBefore(e){let{renderer:t}=e,{scene:n}=this,r,i=t.getOutputRenderTarget();i&&i.isXRRenderTarget===!0?(r=t.xr.getCamera(),t.xr.updateCamera(r),yb.set(i.width,i.height)):(r=this.camera,t.getDrawingBufferSize(yb)),this.setSize(yb.width,yb.height);let a=t.getRenderTarget(),o=t.getMRT(),s=t.autoClear,c=t.transparent,l=t.opaque,u=r.layers.mask,d=t.contextNode,f=n.overrideMaterial;this._cameraNear.value=r.near,this._cameraFar.value=r.far,this._layers!==null&&(r.layers.mask=this._layers.mask);for(let e in this._previousTextures)this.toggleTexture(e);this.overrideMaterial!==null&&(n.overrideMaterial=this.overrideMaterial),t.setRenderTarget(this.renderTarget),t.setMRT(this._mrt),t.autoClear=!0,t.transparent=this.transparent,t.opaque=this.opaque,this.contextNode!==null&&((this._contextNodeCache===null||this._contextNodeCache.version!==this.version)&&(this._contextNodeCache={version:this.version,context:Ws({...t.contextNode.getFlowContextData(),...this.contextNode.getFlowContextData()})}),t.contextNode=this._contextNodeCache.context);let p=n.name;n.name=this.name?this.name:n.name,t.render(n,r),n.name=p,n.overrideMaterial=f,t.setRenderTarget(a),t.setMRT(o),t.autoClear=s,t.transparent=c,t.opaque=l,t.contextNode=d,r.layers.mask=u}setSize(e,t){this._width=e,this._height=t;let n=Math.floor(this._width*this._resolutionScale),r=Math.floor(this._height*this._resolutionScale);this.renderTarget.setSize(n,r),this._scissor===null?this.renderTarget.scissorTest=!1:(this.renderTarget.scissor.copy(this._scissor).multiplyScalar(this._resolutionScale).floor(),this.renderTarget.scissorTest=!0),this._viewport!==null&&this.renderTarget.viewport.copy(this._viewport).multiplyScalar(this._resolutionScale).floor()}setScissor(e,t,n,r){e===null?this._scissor=null:(this._scissor===null&&(this._scissor=new bt),e.isVector4?this._scissor.copy(e):this._scissor.set(e,t,n,r))}setViewport(e,t,n,r){e===null?this._viewport=null:(this._viewport===null&&(this._viewport=new bt),e.isVector4?this._viewport.copy(e):this._viewport.set(e,t,n,r))}dispose(){this.renderTarget.dispose()}};Sb.COLOR=`color`,Sb.DEPTH=`depth`;var Cb=(e,t,n)=>new Sb(Sb.COLOR,e,t,n),wb=(e,t)=>new bb(e,t),Tb=(e,t,n)=>new Sb(Sb.DEPTH,e,t,n),Eb=class extends Sb{static get type(){return`ToonOutlinePassNode`}constructor(e,t,n,r,i){super(Sb.COLOR,e,t),this.colorNode=n,this.thicknessNode=r,this.alphaNode=i,this._materialCache=new WeakMap,this.name=`Outline Pass`}updateBefore(e){let{renderer:t}=e,n=t.getRenderObjectFunction();t.setRenderObjectFunction((e,n,r,i,a,o,s,c)=>{if((a.isMeshToonMaterial||a.isMeshToonNodeMaterial)&&a.wireframe===!1){let l=this._getOutlineMaterial(a);t.renderObject(e,n,r,i,l,o,s,c)}t.renderObject(e,n,r,i,a,o,s,c)}),super.updateBefore(e),t.setRenderObjectFunction(n)}_createMaterial(){let e=new om;e.isMeshToonOutlineMaterial=!0,e.name=`Toon_Outline`,e.side=1;let t=Vu.negate(),n=eu.mul(wu),r=F(1),i=n.mul(B(Au,1)),a=n.mul(B(Au.add(t),1)),o=Bo(i.sub(a));return e.vertexNode=i.add(o.mul(this.thicknessNode).mul(i.w).mul(r)),e.colorNode=B(this.colorNode,this.alphaNode),e}_getOutlineMaterial(e){let t=this._materialCache.get(e);return t===void 0&&(t=this._createMaterial(),this._materialCache.set(e,t)),t}},Db=(e,t,n=new de(0,0,0),r=.003,i=1)=>new Eb(e,t,k(n),k(r),k(i)),Ob=N(([e,t])=>e.mul(t).clamp()).setLayout({name:`linearToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),kb=N(([e,t])=>(e=e.mul(t),e.div(e.add(1)).clamp())).setLayout({name:`reinhardToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),Ab=N(([e,t])=>{e=e.mul(t),e=e.sub(.004).max(0);let n=e.mul(e.mul(6.2).add(.5)),r=e.mul(e.mul(6.2).add(1.7)).add(.06);return n.div(r).pow(2.2)}).setLayout({name:`cineonToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),jb=N(([e])=>{let t=e.mul(e.add(.0245786)).sub(90537e-9),n=e.mul(e.add(.432951).mul(.983729)).add(.238081);return t.div(n)}),Mb=N(([e,t])=>{let n=$i(.59719,.35458,.04823,.076,.90834,.01566,.0284,.13383,.83777),r=$i(1.60475,-.53108,-.07367,-.10208,1.10813,-.00605,-.00327,-.07276,1.07602);return e=e.mul(t).div(.6),e=n.mul(e),e=jb(e),e=r.mul(e),e.clamp()}).setLayout({name:`acesFilmicToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),Nb=$i(z(1.6605,-.1246,-.0182),z(-.5876,1.1329,-.1006),z(-.0728,-.0083,1.1187)),Pb=$i(z(.6274,.0691,.0164),z(.3293,.9195,.088),z(.0433,.0113,.8956)),Fb=N(([e])=>{let t=z(e).toVar(),n=z(t.mul(t)).toVar(),r=z(n.mul(n)).toVar();return F(15.5).mul(r.mul(n)).sub(W(40.14,r.mul(t))).add(W(31.96,r).sub(W(6.868,n.mul(t))).add(W(.4298,n).add(W(.1191,t).sub(.00232))))}),Ib=N(([e,t])=>{let n=z(e).toVar(),r=$i(z(.856627153315983,.137318972929847,.11189821299995),z(.0951212405381588,.761241990602591,.0767994186031903),z(.0482516061458583,.101439036467562,.811302368396859)),i=$i(z(1.1271005818144368,-.1413297634984383,-.14132976349843826),z(-.11060664309660323,1.157823702216272,-.11060664309660294),z(-.016493938717834573,-.016493938717834257,1.2519364065950405)),a=F(-12.47393),o=F(4.026069);return n.mulAssign(t),n.assign(Pb.mul(n)),n.assign(r.mul(n)),n.assign(hs(n,1e-10)),n.assign(Fo(n)),n.assign(n.sub(a).div(o.sub(a))),n.assign(js(n,0,1)),n.assign(Fb(n)),n.assign(i.mul(n)),n.assign(Ss(hs(z(0),n),z(2.2))),n.assign(Nb.mul(n)),n.assign(js(n,0,1)),n}).setLayout({name:`agxToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),Lb=N(([e,t])=>{let n=F(.76),r=F(.15);e=e.mul(t);let i=ms(e.r,ms(e.g,e.b)),a=Hs(i.lessThan(.08),i.sub(W(6.25,i.mul(i))),.04);e.subAssign(a);let o=hs(e.r,hs(e.g,e.b));P(o.lessThan(n),()=>e);let s=U(1,n),c=U(1,s.mul(s).div(o.add(s.sub(n))));e.mulAssign(c.div(o));let l=U(1,$a(1,r.mul(o.sub(c)).add(1)));return K(e,z(c),l)}).setLayout({name:`neutralToneMapping`,type:`vec3`,inputs:[{name:`color`,type:`vec3`},{name:`exposure`,type:`float`}]}),Rb=class extends D{static get type(){return`CodeNode`}constructor(e=``,t=[],n=``){super(`code`),this.isCodeNode=!0,this.global=!0,this.code=e,this.includes=t,this.language=n}setIncludes(e){return this.includes=e,this}getIncludes(){return this.includes}generate(e){let t=this.getIncludes(e);for(let n of t)n.build(e);let n=e.getCodeFromNode(this,this.getNodeType(e));return n.code=this.code,n.code}serialize(e){super.serialize(e),e.code=this.code,e.language=this.language}deserialize(e){super.deserialize(e),this.code=e.code,this.language=e.language}},zb=A(Rb).setParameterLength(1,3),Bb=(e,t)=>zb(e,t,`js`),Vb=(e,t)=>zb(e,t,`wgsl`),Hb=(e,t)=>zb(e,t,`glsl`),Ub=class extends Rb{static get type(){return`FunctionNode`}constructor(e=``,t=[],n=``){super(e,t,n)}generateNodeType(e){return this.getNodeFunction(e).type}getMemberType(e,t){let n=this.getNodeType(e);return e.getStructTypeNode(n).getMemberType(e,t)}getInputs(e){return this.getNodeFunction(e).inputs}getNodeFunction(e){let t=e.getDataFromNode(this),n=t.nodeFunction;return n===void 0&&(n=e.parser.parseFunction(this.code),t.nodeFunction=n),n}generate(e,t){super.generate(e);let n=this.getNodeFunction(e),r=n.name,i=n.type,a=e.getCodeFromNode(this,i);r!==``&&(a.name=r);let o=e.getPropertyName(a);return a.code=this.getNodeFunction(e).getCode(o)+`
`,t===`property`?o:e.format(`${o}()`,i,t)}},Wb=(e,t=[],n=``)=>{let r=new Ub(e,t,n);return Pi((...e)=>r.call(...e),r)},Gb=(e,t)=>Wb(e,t,`glsl`),Kb=(e,t)=>Wb(e,t,`wgsl`);function qb(e){let t,n=e.context.getViewZ;return n!==void 0&&(t=n(this)),(t||Pu.z).negate()}var Jb=N(([e,t],n)=>Ps(e,t,qb(n))),Yb=N(([e],t)=>{let n=qb(t);return e.mul(e,n,n).negate().exp().oneMinus()}),Xb=N(([e,t],n)=>{let r=qb(n),i=t.sub(Mu.y).max(0).toConst().mul(r).toConst();return e.mul(e,i,i).negate().exp().oneMinus()}),Zb=N(([e,t])=>B(t.toFloat().mix(Oa.rgb,e.toVec3()),Oa.a)),Qb=null,$b=null,ex=A(class extends D{static get type(){return`RangeNode`}constructor(e=F(),t=F()){super(),this.minNode=e,this.maxNode=t}getVectorLength(e){let t=this.getConstNode(this.minNode),n=this.getConstNode(this.maxNode),r=e.getTypeLength(Tr(t.value)),i=e.getTypeLength(Tr(n.value));return r>i?r:i}generateNodeType(e){return e.object.count>1?e.getTypeFromLength(this.getVectorLength(e)):`float`}getConstNode(e){let t=null;if(e.traverse(e=>{e.isConstNode===!0&&(t=e)}),t===null)throw new ul(`THREE.TSL: No "ConstNode" found in node graph.`,this.stackTrace);return t}setup(e){let t=e.object,n=null;if(t.count>1){let r=this.getConstNode(this.minNode),i=this.getConstNode(this.maxNode),a=r.value,o=i.value,s=e.getTypeLength(Tr(a)),c=e.getTypeLength(Tr(o));Qb||=new bt,$b||=new bt,Qb.setScalar(0),$b.setScalar(0),s===1?Qb.setScalar(a):a.isColor?Qb.set(a.r,a.g,a.b,1):Qb.set(a.x,a.y,a.z||0,a.w||0),c===1?$b.setScalar(o):o.isColor?$b.set(o.r,o.g,o.b,1):$b.set(o.x,o.y,o.z||0,o.w||0);let l=4*t.count,u=new Float32Array(l);for(let e=0;e<l;e++){let t=e%4,n=Qb.getComponent(t),r=$b.getComponent(t);u[e]=In.lerp(n,r,Math.random())}let d=this.getNodeType(e);if(t.count*4*4<=e.getUniformBufferLimit())n=bl(u,`vec4`,t.count).element(jc).convert(d);else{let t=new g(u,4);e.geometry.setAttribute(`__range`+this.id,t),n=Dc(t).convert(d)}}else n=F(0);return n}}).setParameterLength(2),tx=class extends D{static get type(){return`ComputeBuiltinNode`}constructor(e,t){super(t),this._builtinName=e}getHash(e){return this.getBuiltinName(e)}generateNodeType(){return this.nodeType}setBuiltinName(e){return this._builtinName=e,this}getBuiltinName(){return this._builtinName}hasBuiltin(e){return e.hasBuiltin(this._builtinName)}generate(e,t){let n=this.getBuiltinName(e),r=this.getNodeType(e);return e.shaderStage===`compute`?e.format(n,r,t):(T(`ComputeBuiltinNode: Compute built-in value ${n} can not be accessed in the ${e.shaderStage} stage`),e.generateConst(r))}serialize(e){super.serialize(e),e.global=this.global,e._builtinName=this._builtinName}deserialize(e){super.deserialize(e),this.global=e.global,this._builtinName=e._builtinName}},nx=(e,t)=>new tx(e,t),rx=nx(`numWorkgroups`,`uvec3`),ix=nx(`workgroupId`,`uvec3`),ax=nx(`globalId`,`uvec3`),ox=nx(`localId`,`uvec3`),sx=nx(`subgroupSize`,`uint`),cx=A(class extends D{constructor(e){super(),this.scope=e,this.isBarrierNode=!0}setup(e){e.allowEarlyReturns=!1,e.allowGlobalVariables=!1}generate(e){let{scope:t}=this,{renderer:n}=e;n.backend.isWebGLBackend===!0?e.addFlowCode(`\t// ${t}Barrier \n`):e.addLineFlowCode(`${t}Barrier()`,this)}}),lx=()=>cx(`workgroup`).toStack(),ux=()=>cx(`storage`).toStack(),dx=()=>cx(`texture`).toStack(),fx=class extends zr{constructor(e,t){super(e,t),this.isWorkgroupInfoElementNode=!0}generate(e,t){let n,r=e.isContextAssign();if(n=super.generate(e),r!==!0){let r=this.getNodeType(e);n=e.format(n,r,t)}return n}},px=class extends D{constructor(e,t,n=0){super(t),this.bufferType=t,this.bufferCount=n,this.isWorkgroupInfoNode=!0,this.elementType=t,this.scope=e,this.name=``}setName(e){return this.name=e,this}label(e){return T(`TSL: "label()" has been deprecated. Use "setName()" instead.`,new pr),this.setName(e)}setScope(e){return this.scope=e,this}getElementType(){return this.elementType}getInputType(){return`${this.scope}Array`}element(e){return new fx(this,e)}generate(e){let t=this.name===``?`${this.scope}Array_${this.id}`:this.name;return e.getScopedArray(t,this.scope.toLowerCase(),this.bufferType,this.bufferCount)}},mx=(e,t)=>new px(`Workgroup`,e,t),hx=class extends D{static get type(){return`AtomicFunctionNode`}constructor(e,t,n){super(`uint`),this.method=e,this.pointerNode=t,this.valueNode=n,this.parents=!0}getInputType(e){return this.pointerNode.getNodeType(e)}generateNodeType(e){return this.getInputType(e)}generate(e){let t=e.getNodeProperties(this),n=t.parents,r=this.method,i=this.getNodeType(e),a=this.getInputType(e),o=this.pointerNode,s=this.valueNode,c=[];c.push(`&${o.build(e,a)}`),s!==null&&c.push(s.build(e,a));let l=`${e.getMethod(r,i)}( ${c.join(`, `)} )`;if(n&&n.length===1&&n[0].isStackNode===!0)e.addLineFlowCode(l,this);else return t.constNode===void 0&&(t.constNode=Kc(l,i).toConst()),t.constNode.build(e)}};hx.ATOMIC_LOAD=`atomicLoad`,hx.ATOMIC_STORE=`atomicStore`,hx.ATOMIC_ADD=`atomicAdd`,hx.ATOMIC_SUB=`atomicSub`,hx.ATOMIC_MAX=`atomicMax`,hx.ATOMIC_MIN=`atomicMin`,hx.ATOMIC_AND=`atomicAnd`,hx.ATOMIC_OR=`atomicOr`,hx.ATOMIC_XOR=`atomicXor`;var gx=A(hx),_x=(e,t,n)=>gx(e,t,n).toStack(),vx=e=>_x(hx.ATOMIC_LOAD,e,null),yx=(e,t)=>_x(hx.ATOMIC_STORE,e,t),bx=(e,t)=>_x(hx.ATOMIC_ADD,e,t),xx=(e,t)=>_x(hx.ATOMIC_SUB,e,t),Sx=(e,t)=>_x(hx.ATOMIC_MAX,e,t),Cx=(e,t)=>_x(hx.ATOMIC_MIN,e,t),wx=(e,t)=>_x(hx.ATOMIC_AND,e,t),Tx=(e,t)=>_x(hx.ATOMIC_OR,e,t),Ex=(e,t)=>_x(hx.ATOMIC_XOR,e,t),X=class e extends Vr{static get type(){return`SubgroupFunctionNode`}constructor(e,t=null,n=null){super(),this.method=e,this.aNode=t,this.bNode=n}getInputType(e){let t=this.aNode?this.aNode.getNodeType(e):null,n=this.bNode?this.bNode.getNodeType(e):null;return(e.isMatrix(t)?0:e.getTypeLength(t))>(e.isMatrix(n)?0:e.getTypeLength(n))?t:n}generateNodeType(t){let n=this.method;return n===e.SUBGROUP_ELECT?`bool`:n===e.SUBGROUP_BALLOT?`uvec4`:this.getInputType(t)}generate(t,n){let r=this.method,i=this.getNodeType(t),a=this.getInputType(t),o=this.aNode,s=this.bNode,c=[];if(r===e.SUBGROUP_BROADCAST||r===e.SUBGROUP_SHUFFLE||r===e.QUAD_BROADCAST){let e=s.getNodeType(t);c.push(o.build(t,i),s.build(t,e===`float`?`int`:i))}else r===e.SUBGROUP_SHUFFLE_XOR||r===e.SUBGROUP_SHUFFLE_DOWN||r===e.SUBGROUP_SHUFFLE_UP?c.push(o.build(t,i),s.build(t,`uint`)):(o!==null&&c.push(o.build(t,a)),s!==null&&c.push(s.build(t,a)));let l=c.length===0?`()`:`( ${c.join(`, `)} )`;return t.format(`${t.getMethod(r,i)}${l}`,i,n)}serialize(e){super.serialize(e),e.method=this.method}deserialize(e){super.deserialize(e),this.method=e.method}};X.SUBGROUP_ELECT=`subgroupElect`,X.SUBGROUP_BALLOT=`subgroupBallot`,X.SUBGROUP_ADD=`subgroupAdd`,X.SUBGROUP_INCLUSIVE_ADD=`subgroupInclusiveAdd`,X.SUBGROUP_EXCLUSIVE_AND=`subgroupExclusiveAdd`,X.SUBGROUP_MUL=`subgroupMul`,X.SUBGROUP_INCLUSIVE_MUL=`subgroupInclusiveMul`,X.SUBGROUP_EXCLUSIVE_MUL=`subgroupExclusiveMul`,X.SUBGROUP_AND=`subgroupAnd`,X.SUBGROUP_OR=`subgroupOr`,X.SUBGROUP_XOR=`subgroupXor`,X.SUBGROUP_MIN=`subgroupMin`,X.SUBGROUP_MAX=`subgroupMax`,X.SUBGROUP_ALL=`subgroupAll`,X.SUBGROUP_ANY=`subgroupAny`,X.SUBGROUP_BROADCAST_FIRST=`subgroupBroadcastFirst`,X.QUAD_SWAP_X=`quadSwapX`,X.QUAD_SWAP_Y=`quadSwapY`,X.QUAD_SWAP_DIAGONAL=`quadSwapDiagonal`,X.SUBGROUP_BROADCAST=`subgroupBroadcast`,X.SUBGROUP_SHUFFLE=`subgroupShuffle`,X.SUBGROUP_SHUFFLE_XOR=`subgroupShuffleXor`,X.SUBGROUP_SHUFFLE_UP=`subgroupShuffleUp`,X.SUBGROUP_SHUFFLE_DOWN=`subgroupShuffleDown`,X.QUAD_BROADCAST=`quadBroadcast`;var Dx=M(X,X.SUBGROUP_ELECT).setParameterLength(0),Ox=M(X,X.SUBGROUP_BALLOT).setParameterLength(1),kx=M(X,X.SUBGROUP_ADD).setParameterLength(1),Ax=M(X,X.SUBGROUP_INCLUSIVE_ADD).setParameterLength(1),jx=M(X,X.SUBGROUP_EXCLUSIVE_AND).setParameterLength(1),Mx=M(X,X.SUBGROUP_MUL).setParameterLength(1),Nx=M(X,X.SUBGROUP_INCLUSIVE_MUL).setParameterLength(1),Px=M(X,X.SUBGROUP_EXCLUSIVE_MUL).setParameterLength(1),Fx=M(X,X.SUBGROUP_AND).setParameterLength(1),Ix=M(X,X.SUBGROUP_OR).setParameterLength(1),Lx=M(X,X.SUBGROUP_XOR).setParameterLength(1),Rx=M(X,X.SUBGROUP_MIN).setParameterLength(1),zx=M(X,X.SUBGROUP_MAX).setParameterLength(1),Bx=M(X,X.SUBGROUP_ALL).setParameterLength(0),Vx=M(X,X.SUBGROUP_ANY).setParameterLength(0),Hx=M(X,X.SUBGROUP_BROADCAST_FIRST).setParameterLength(2),Ux=M(X,X.QUAD_SWAP_X).setParameterLength(1),Wx=M(X,X.QUAD_SWAP_Y).setParameterLength(1),Gx=M(X,X.QUAD_SWAP_DIAGONAL).setParameterLength(1),Kx=M(X,X.SUBGROUP_BROADCAST).setParameterLength(2),qx=M(X,X.SUBGROUP_SHUFFLE).setParameterLength(2),Jx=M(X,X.SUBGROUP_SHUFFLE_XOR).setParameterLength(2),Yx=M(X,X.SUBGROUP_SHUFFLE_UP).setParameterLength(2),Xx=M(X,X.SUBGROUP_SHUFFLE_DOWN).setParameterLength(2),Zx=M(X,X.QUAD_BROADCAST).setParameterLength(1),Qx;function $x(e){Qx||=new WeakMap;let t=Qx.get(e);return t===void 0&&Qx.set(e,t={}),t}function eS(e){let t=$x(e);return t.shadowMatrix||=H(`mat4`).setGroup(V).onRenderUpdate(t=>((e.castShadow!==!0||t.renderer.shadowMap.enabled===!1)&&(e.shadow.camera.coordinateSystem!==t.camera.coordinateSystem&&(e.shadow.camera.coordinateSystem=t.camera.coordinateSystem,e.shadow.camera.updateProjectionMatrix()),e.shadow.updateMatrices(e)),e.shadow.matrix))}function tS(e,t=Mu){let n=eS(e).mul(t);return n.xyz.div(n.w)}function nS(e){let t=$x(e);return t.position||=H(new w).setGroup(V).onRenderUpdate((t,n)=>n.value.setFromMatrixPosition(e.matrixWorld))}function rS(e){let t=$x(e);return t.targetPosition||=H(new w).setGroup(V).onRenderUpdate((t,n)=>n.value.setFromMatrixPosition(e.target.matrixWorld))}function iS(e){let t=$x(e);return t.viewPosition||=H(new w).setGroup(V).onRenderUpdate(({camera:t},n)=>{n.value=n.value||new w,n.value.setFromMatrixPosition(e.matrixWorld),n.value.applyMatrix4(t.matrixWorldInverse)})}var aS=e=>nu.transformDirection(nS(e).sub(rS(e))),oS=oa(`vec3`,`totalDiffuse`),sS=oa(`vec3`,`totalSpecular`),cS=oa(`vec3`,`outgoingLight`),lS=e=>e.sort((e,t)=>e.id-t.id),uS=(e,t)=>{for(let n of t)if(n.isAnalyticLightNode&&n.light.id===e)return n;return null},dS=new WeakMap,fS=[],pS=class extends D{static get type(){return`LightsNode`}constructor(){super(`vec3`),this.totalDiffuseNode=oS,this.totalSpecularNode=sS,this.outgoingLightNode=cS,this._lights=[],this.global=!0}customCacheKey(){let e=this._lights;for(let t=0;t<e.length;t++){let n=e[t];if(fS.push(n.id),fS.push(+!!n.castShadow),n.isSpotLight===!0){let e=n.map===null?-1:n.map.id,t=n.colorNode?n.colorNode.getCacheKey():-1;fS.push(e,t)}}let t=gr(fS);return fS.length=0,t}getHash(e){let t=e.getDataFromNode(this);if(t.lightNodesHash===void 0){let n=this.setupLightsNode(e);t.lightNodes=n;let r=[];for(let e of n)r.push(e.getHash());t.lightNodesHash=`lights-`+r.join(`,`)}return t.lightNodesHash}analyze(e){let t=e.getNodeProperties(this);for(let n of t.nodes)n.build(e);t.outputNode.build(e)}setupLightsNode(e){let t=e.getDataFromNode(this),n=[],r=t.lightNodes||null,i=e.context.materialLightings,a=lS([...i,...this._lights]),o=e.renderer.library;for(let e of a)if(e.isNode)n.push(e);else{let t=null;if(r!==null&&(t=uS(e.id,r)),t===null){let n=o.getLightNodeClass(e.constructor);if(n===null){T(`LightsNode.setupNodeLights: Light node not found for ${e.constructor.name}`);continue}dS.has(e)===!1&&dS.set(e,new n(e)),t=dS.get(e)}n.push(t)}return n}setupDirectLight(e,t,n){let{lightingModel:r,reflectedLight:i}=e.context;r.direct({...n,lightNode:t,reflectedLight:i},e)}setupDirectRectAreaLight(e,t,n){let{lightingModel:r,reflectedLight:i}=e.context;r.directRectArea({...n,lightNode:t,reflectedLight:i},e)}setupLights(e,t){for(let n of t)n.build(e)}getLightNodes(e){let t=e.getDataFromNode(this);return t.lightNodes===void 0&&(t.lightNodes=this.setupLightsNode(e)),t.lightNodes}setup(e){let t=e.lightsNode;e.lightsNode=this;let n=this.outgoingLightNode,r=e.context,i=r.lightingModel,a=e.getNodeProperties(this);if(i){let{totalDiffuseNode:t,totalSpecularNode:o}=this;r.outgoingLight=n,a.nodes=e.addStack().nodes,i.start(e);let{backdrop:s,backdropAlpha:c}=r,{directDiffuse:l,directSpecular:u,indirectDiffuse:d,indirectSpecular:f}=r.reflectedLight,p=l.add(d);s!==null&&(p=z(c===null?s:c.mix(p,s))),t.assign(p),o.assign(u.add(f)),n.assign(t.add(o)),i.finish(e),n=n.bypass(e.removeStack())}else a.nodes=[];return e.lightsNode=t,n}setLights(e){return this._lights=e,this}getLights(){return this._lights}get hasLights(){return this._lights.length>0}},mS=(e=[])=>new pS().setLights(e),hS=class extends D{static get type(){return`ShadowBaseNode`}constructor(e){super(),this.light=e,this.updateBeforeType=E.RENDER,this.isShadowBaseNode=!0}setupShadowPosition({context:e,material:t}){gS.assign(t.receivedShadowPositionNode||e.shadowPositionWorld||Mu)}},gS=oa(`vec3`,`shadowPositionWorld`);function _S(e,t={}){return t.toneMapping=e.toneMapping,t.toneMappingExposure=e.toneMappingExposure,t.outputColorSpace=e.outputColorSpace,t.renderTarget=e.getRenderTarget(),t.activeCubeFace=e.getActiveCubeFace(),t.activeMipmapLevel=e.getActiveMipmapLevel(),t.renderObjectFunction=e.getRenderObjectFunction(),t.pixelRatio=e.getPixelRatio(),t.mrt=e.getMRT(),t.clearColor=e.getClearColor(t.clearColor||new de),t.clearAlpha=e.getClearAlpha(),t.autoClear=e.autoClear,t.scissorTest=e.getScissorTest(),t}function vS(e,t){return t=_S(e,t),e.setMRT(null),e.setRenderObjectFunction(null),e.setClearColor(0,1),e.autoClear=!0,t}function yS(e,t){e.toneMapping=t.toneMapping,e.toneMappingExposure=t.toneMappingExposure,e.outputColorSpace=t.outputColorSpace,e.setRenderTarget(t.renderTarget,t.activeCubeFace,t.activeMipmapLevel),e.setRenderObjectFunction(t.renderObjectFunction),e.setPixelRatio(t.pixelRatio),e.setMRT(t.mrt),e.setClearColor(t.clearColor,t.clearAlpha),e.autoClear=t.autoClear,e.setScissorTest(t.scissorTest)}function bS(e,t={}){return t.background=e.background,t.backgroundNode=e.backgroundNode,t.overrideMaterial=e.overrideMaterial,t}function xS(e,t){return t=bS(e,t),e.background=null,e.backgroundNode=null,e.overrideMaterial=null,t}function SS(e,t){e.background=t.background,e.backgroundNode=t.backgroundNode,e.overrideMaterial=t.overrideMaterial}function CS(e,t,n){return n=vS(e,n),n=xS(t,n),n}function wS(e,t,n){yS(e,n),SS(t,n)}var TS=new WeakMap,ES=N(({depthTexture:e,shadowCoord:t,depthLayer:n})=>{let r=q(e,t.xy).setName(`t_basic`);return e.isArrayTexture&&(r=r.depth(n)),r.compare(t.z)}),DS=N(({depthTexture:e,shadowCoord:t,shadow:n,depthLayer:r})=>{let i=(t,n)=>{let i=q(e,t);return e.isArrayTexture&&(i=i.depth(r)),i.compare(n)},a=fd(`mapSize`,`vec2`,n).setGroup(V),o=fd(`radius`,`float`,n).setGroup(V),s=R(1).div(a),c=o.mul(s.x),l=jy(jl.xy).mul(6.28318530718);return Qa(i(t.xy.add(My(0,5,l).mul(c)),t.z),i(t.xy.add(My(1,5,l).mul(c)),t.z),i(t.xy.add(My(2,5,l).mul(c)),t.z),i(t.xy.add(My(3,5,l).mul(c)),t.z),i(t.xy.add(My(4,5,l).mul(c)),t.z)).mul(1/5)}),OS=N(({depthTexture:e,shadowCoord:t,shadow:n,depthLayer:r})=>{let i=fd(`mapSize`,`vec2`,n).setGroup(V),a=R(1).div(i),o=t.xy,s=Vo(o.mul(i).add(.5)).toConst();o.subAssign(s.sub(.5).mul(a));let c=n=>{let i=q(e,o).offset(n).gather();return e.isArrayTexture&&(i=i.depth(r)),i.compare(t.z)},l=c(Ui(-1,1)).toConst(),u=c(Ui(1,1)).toConst(),d=c(Ui(-1,-1)).toConst(),f=c(Ui(1,-1)).toConst();return Qa(K(l.x,u.y,s.x).add(l.y).add(u.x).mul(s.y),K(l.w,u.z,s.x).add(l.z).add(u.w),K(d.x,f.y,s.x).add(d.y).add(f.x),K(d.w,f.z,s.x).add(d.z).add(f.w).mul(s.y.oneMinus())).mul(1/9)}),kS=N(({depthTexture:e,shadowCoord:t,depthLayer:n},r)=>{let i=q(e).sample(t.xy);e.isArrayTexture&&(i=i.depth(n)),i=i.rg;let a=i.x,o=hs(1e-7,i.y.mul(i.y)),s=r.renderer.reversedDepthBuffer?gs(a,t.z):gs(t.z,a),c=F(1).toVar();return P(s.notEqual(1),()=>{let e=t.z.sub(a),n=o.div(o.add(e.mul(e)));n=js(U(n,.3).div(.65)),c.assign(hs(s,n))}),c}),AS=e=>{let t=TS.get(e);return t===void 0&&(t=new om,t.colorNode=B(0,0,0,1),t.isShadowPassMaterial=!0,t.name=`ShadowMaterial`,t.blending=0,t.fog=!1,TS.set(e,t)),t},jS=e=>{let t=TS.get(e);t!==void 0&&(t.dispose(),TS.delete(e))},MS=new f_,NS=[],PS=(e,t,n,r)=>{NS[0]=e,NS[1]=t;let i=MS.get(NS);return(i===void 0||i.shadowType!==n||i.useVelocity!==r)&&(i=(i,a,o,s,c,l,u,d,f)=>{(i.castShadow===!0||i.receiveShadow&&n===3)&&(r&&(Dr(i).useVelocity=!0),i.onBeforeShadow(e,i,o,t.camera,s,a.overrideMaterial,l),e.renderObject(i,a,o,s,c,l,u,d,f),i.onAfterShadow(e,i,o,t.camera,s,a.overrideMaterial,l))},i.shadowType=n,i.useVelocity=r,MS.set(NS,i)),NS[0]=null,NS[1]=null,i},FS=N(({samples:e,radius:t,size:n,shadowPass:r,depthLayer:i})=>{let a=F(0).toVar(`meanVertical`),o=F(0).toVar(`squareMeanVertical`),s=e.lessThanEqual(F(1)).select(F(0),F(2).div(e.sub(1))),c=e.lessThanEqual(F(1)).select(F(0),F(-1));return gp({start:I(0),end:I(e),type:`int`,condition:`<`},({i:e})=>{let l=c.add(F(e).mul(s)),u=r.sample(Qa(jl.xy,R(0,l).mul(t)).div(n));r.value.isArrayTexture&&(u=u.depth(i)),u=u.x,a.addAssign(u),o.addAssign(u.mul(u))}),a.divAssign(e),o.divAssign(e),R(a,Io(o.sub(a.mul(a)).max(0)))}),IS=N(({samples:e,radius:t,size:n,shadowPass:r,depthLayer:i})=>{let a=F(0).toVar(`meanHorizontal`),o=F(0).toVar(`squareMeanHorizontal`),s=e.lessThanEqual(F(1)).select(F(0),F(2).div(e.sub(1))),c=e.lessThanEqual(F(1)).select(F(0),F(-1));return gp({start:I(0),end:I(e),type:`int`,condition:`<`},({i:e})=>{let l=c.add(F(e).mul(s)),u=r.sample(Qa(jl.xy,R(l,0).mul(t)).div(n));r.value.isArrayTexture&&(u=u.depth(i)),a.addAssign(u.x),o.addAssign(Qa(u.y.mul(u.y),u.x.mul(u.x)))}),a.divAssign(e),o.divAssign(e),R(a,Io(o.sub(a.mul(a)).max(0)))}),LS=[ES,DS,OS,kS],RS,zS=new Cy,BS=class extends hS{static get type(){return`ShadowNode`}constructor(e,t=null){super(e),this.shadow=t||e.shadow,this.shadowMap=null,this.vsmShadowMapVertical=null,this.vsmShadowMapHorizontal=null,this.vsmMaterialVertical=null,this.vsmMaterialHorizontal=null,this._node=null,this._currentShadowType=null,this._cameraFrameId=new WeakMap,this.isShadowNode=!0,this.depthLayer=0}setupShadowFilter(e,{filterFn:t,depthTexture:n,shadowCoord:r,shadow:i,depthLayer:a}){let o=r.x.greaterThanEqual(0).and(r.x.lessThanEqual(1)).and(r.y.greaterThanEqual(0)).and(r.y.lessThanEqual(1)).and(r.z.lessThanEqual(1)),s=t({depthTexture:n,shadowCoord:r,shadow:i,depthLayer:a});return o.select(s,F(1))}setupShadowCoord(e,t){let{shadow:n}=this,{renderer:r}=e,i=n.biasNode||fd(`bias`,`float`,n).setGroup(V),a=t,o;if(n.camera.isOrthographicCamera||r.logarithmicDepthBuffer!==!0)a=a.xyz.div(a.w),o=a.z;else{let e=a.w;a=a.xy.div(e);let t=fd(`near`,`float`,n.camera).setGroup(V),r=fd(`far`,`float`,n.camera).setGroup(V);o=Wp(e.negate(),t,r)}return a=z(a.x,a.y.oneMinus(),r.reversedDepthBuffer?o.sub(i):o.add(i)),a}getShadowFilterFn(e){return LS[e]}setupRenderTarget(e,t){let n=new Pn(e.mapSize.width,e.mapSize.height);n.name=`ShadowDepthTexture`,n.compareFunction=t.renderer.reversedDepthBuffer?518:515;let r=t.createRenderTarget(e.mapSize.width,e.mapSize.height);return r.texture.name=`ShadowMap`,r.texture.type=e.mapType,r.depthTexture=n,{shadowMap:r,depthTexture:n}}setupShadow(e){let{renderer:t,camera:n}=e,{light:r,shadow:i}=this,{depthTexture:a,shadowMap:o}=this.setupRenderTarget(i,e),s=t.shadowMap.type,c=t.hasCompatibility(ce.TEXTURE_COMPARE);if((s===1||s===2)&&c?(a.minFilter=te,a.magFilter=te):(a.minFilter=Ht,a.magFilter=Ht),i.camera.coordinateSystem=n.coordinateSystem,i.camera.updateProjectionMatrix(),s===3&&i.isPointLightShadow!==!0){a.compareFunction=null,o.depth>1?(o._vsmShadowMapVertical||(o._vsmShadowMapVertical=e.createRenderTarget(i.mapSize.width,i.mapSize.height,{format:ln,type:Ie,depth:o.depth,depthBuffer:!1}),o._vsmShadowMapVertical.texture.name=`VSMVertical`),this.vsmShadowMapVertical=o._vsmShadowMapVertical,o._vsmShadowMapHorizontal||(o._vsmShadowMapHorizontal=e.createRenderTarget(i.mapSize.width,i.mapSize.height,{format:ln,type:Ie,depth:o.depth,depthBuffer:!1}),o._vsmShadowMapHorizontal.texture.name=`VSMHorizontal`),this.vsmShadowMapHorizontal=o._vsmShadowMapHorizontal):(this.vsmShadowMapVertical=e.createRenderTarget(i.mapSize.width,i.mapSize.height,{format:ln,type:Ie,depthBuffer:!1}),this.vsmShadowMapHorizontal=e.createRenderTarget(i.mapSize.width,i.mapSize.height,{format:ln,type:Ie,depthBuffer:!1}));let t=q(a);a.isArrayTexture&&(t=t.depth(this.depthLayer));let n=q(this.vsmShadowMapVertical.texture);a.isArrayTexture&&(n=n.depth(this.depthLayer));let r=fd(`blurSamples`,`float`,i).setGroup(V),s=fd(`radius`,`float`,i).setGroup(V),c=fd(`mapSize`,`vec2`,i).setGroup(V),l=this.vsmMaterialVertical||=new om;l.fragmentNode=FS({samples:r,radius:s,size:c,shadowPass:t,depthLayer:this.depthLayer}).context(e.getSharedContext()),l.name=`VSMVertical`,l=this.vsmMaterialHorizontal||=new om,l.fragmentNode=IS({samples:r,radius:s,size:c,shadowPass:n,depthLayer:this.depthLayer}).context(e.getSharedContext()),l.name=`VSMHorizontal`}let l=fd(`intensity`,`float`,i).setGroup(V),u=fd(`normalBias`,`float`,i).setGroup(V),d=eS(r),f=Gu.mul(u),p;p=!t.highPrecision||e.material.receivedShadowPositionNode||e.context.shadowPositionWorld?d.mul(gS.add(f)):H(`mat4`).onObjectUpdate(({object:e},t)=>t.value.multiplyMatrices(d.value,e.matrixWorld)).mul(Au).add(d.mul(B(f,0)));let m=this.setupShadowCoord(e,p),h=i.filterNode||this.getShadowFilterFn(t.shadowMap.type)||null;if(h===null)throw Error(`THREE.WebGPURenderer: Shadow map type not supported yet.`);let g=s===3&&i.isPointLightShadow!==!0?this.vsmShadowMapHorizontal.texture:a,_=this.setupShadowFilter(e,{filterFn:h,shadowTexture:o.texture,depthTexture:g,shadowCoord:m,shadow:i,depthLayer:this.depthLayer}),v;t.shadowMap.transmitted===!0&&(o.texture.isCubeTexture?v=cd(o.texture,m.xyz):(v=q(o.texture,m),a.isArrayTexture&&(v=v.depth(this.depthLayer))));let y;y=v?K(1,_.rgb.mix(v,1),l.mul(v.a)).toVar():K(1,_,l).toVar(),this.shadowMap=o,this.shadow.map=o;let b=`${this.light.type} Shadow [ ${this.light.name||`ID: `+this.light.id} ]`;return v&&y.toInspector(`${b} / Color`,()=>this.shadowMap.texture.isCubeTexture?cd(this.shadowMap.texture,bm()):q(this.shadowMap.texture)),y.toInspector(`${b} / Depth`,()=>{let e=fd(`near`,`float`,this.shadow.camera),t=fd(`far`,`float`,this.shadow.camera),n;n=this.shadowMap.texture.isCubeTexture?cd(this.shadowMap.depthTexture,bm()).r:q(this.shadowMap.depthTexture).r;let r;return r=this.shadow.camera.isPerspectiveCamera?Up(n,e,t):Bp(n,e,t),r=Rp(r,e,t),r.oneMinus()})}setup(e){if(e.renderer.shadowMap.enabled!==!1)return N(()=>{let t=e.renderer.shadowMap.type;this._currentShadowType!==t&&(this._reset(),this._node=null);let n=this._node;return this.setupShadowPosition(e),n===null&&(this._node=n=this.setupShadow(e),this._currentShadowType=t),e.material.receivedShadowNode&&(n=e.material.receivedShadowNode(n)),n})()}renderShadow(e){let{shadow:t,shadowMap:n,light:r}=this,{renderer:i,scene:a}=e;t.updateMatrices(r),n.setSize(t.mapSize.width,t.mapSize.height,n.depth);let o=a.name;a.name=`Shadow Map [ ${r.name||`ID: `+r.id} ]`,i.render(a,t.camera),a.name=o}updateShadow(e){let{shadowMap:t,light:n,shadow:r}=this,{renderer:i,scene:a,camera:o}=e,s=i.shadowMap.type,c=t.depthTexture.version;this._depthVersionCached=c;let l=r.camera.layers.mask;r.camera.layers.mask&4294967294||(r.camera.layers.mask=o.layers.mask);let u=i.getRenderObjectFunction(),d=i.getMRT(),f=d?d.has(`velocity`):!1;RS=CS(i,a,RS),a.overrideMaterial=AS(n),i.setRenderObjectFunction(PS(i,r,s,f)),i.setClearColor(0,0),i.setRenderTarget(t),this.renderShadow(e),i.setRenderObjectFunction(u),s===3&&r.isPointLightShadow!==!0&&this.vsmPass(i),r.camera.layers.mask=l,wS(i,a,RS)}vsmPass(e){let{shadow:t}=this,n=this.shadowMap.depth;this.vsmShadowMapVertical.setSize(t.mapSize.width,t.mapSize.height,n),this.vsmShadowMapHorizontal.setSize(t.mapSize.width,t.mapSize.height,n),e.setRenderTarget(this.vsmShadowMapVertical),zS.material=this.vsmMaterialVertical,zS.render(e),e.setRenderTarget(this.vsmShadowMapHorizontal),zS.material=this.vsmMaterialHorizontal,zS.render(e)}dispose(){this._reset(),super.dispose()}_reset(){this._currentShadowType=null,jS(this.light),this.shadowMap&&=(this.shadowMap.dispose(),null),this.vsmShadowMapVertical!==null&&(this.vsmShadowMapVertical.dispose(),this.vsmShadowMapVertical=null,this.vsmMaterialVertical.dispose(),this.vsmMaterialVertical=null),this.vsmShadowMapHorizontal!==null&&(this.vsmShadowMapHorizontal.dispose(),this.vsmShadowMapHorizontal=null,this.vsmMaterialHorizontal.dispose(),this.vsmMaterialHorizontal=null)}updateBefore(e){let{shadow:t}=this,n=t.needsUpdate||t.autoUpdate;n&&(this._cameraFrameId[e.camera]===e.frameId&&(n=!1),this._cameraFrameId[e.camera]=e.frameId),n&&(this.updateShadow(e),this.shadowMap.depthTexture.version===this._depthVersionCached&&(t.needsUpdate=!1))}},VS=(e,t)=>new BS(e,t),HS=new de,US=new Kt,WS=new w,GS=new w,KS=[new w(1,0,0),new w(-1,0,0),new w(0,-1,0),new w(0,1,0),new w(0,0,1),new w(0,0,-1)],qS=[new w(0,-1,0),new w(0,-1,0),new w(0,0,-1),new w(0,0,1),new w(0,-1,0),new w(0,-1,0)],JS=[new w(1,0,0),new w(-1,0,0),new w(0,1,0),new w(0,-1,0),new w(0,0,1),new w(0,0,-1)],YS=[new w(0,-1,0),new w(0,-1,0),new w(0,0,1),new w(0,0,-1),new w(0,-1,0),new w(0,-1,0)],XS=N(({depthTexture:e,bd3D:t,dp:n})=>cd(e,t).compare(n)),ZS=N(({depthTexture:e,bd3D:t,dp:n,shadow:r})=>{let i=fd(`radius`,`float`,r).setGroup(V),a=fd(`mapSize`,`vec2`,r).setGroup(V),o=i.div(a.x),s=es(t),c=Bo(xs(t,s.x.greaterThan(s.z).select(z(0,1,0),z(1,0,0)))),l=xs(t,c),u=jy(jl.xy).mul(6.28318530718),d=My(0,5,u),f=My(1,5,u),p=My(2,5,u),m=My(3,5,u),h=My(4,5,u);return cd(e,t.add(c.mul(d.x).add(l.mul(d.y)).mul(o))).compare(n).add(cd(e,t.add(c.mul(f.x).add(l.mul(f.y)).mul(o))).compare(n)).add(cd(e,t.add(c.mul(p.x).add(l.mul(p.y)).mul(o))).compare(n)).add(cd(e,t.add(c.mul(m.x).add(l.mul(m.y)).mul(o))).compare(n)).add(cd(e,t.add(c.mul(h.x).add(l.mul(h.y)).mul(o))).compare(n)).mul(1/5)}),QS=N(({filterFn:e,depthTexture:t,shadowCoord:n,shadow:r},i)=>{let a=n.xyz.toConst(),o=a.abs().toConst(),s=o.x.max(o.y).max(o.z),c=H(`float`).setGroup(V).onRenderUpdate(()=>r.camera.near),l=H(`float`).setGroup(V).onRenderUpdate(()=>r.camera.far),u=fd(`bias`,`float`,r).setGroup(V),d=F(1).toVar();return P(s.sub(l).lessThanEqual(0).and(s.sub(c).greaterThanEqual(0)),()=>{let n;i.renderer.reversedDepthBuffer?(n=Hp(s.negate(),c,l),n.subAssign(u)):i.renderer.logarithmicDepthBuffer?(n=Wp(s.negate(),c,l),n.addAssign(u)):(n=Vp(s.negate(),c,l),n.addAssign(u));let o=a.normalize();d.assign(e({depthTexture:t,bd3D:o,dp:n,shadow:r}))}),d}),$S=class extends BS{static get type(){return`PointShadowNode`}constructor(e,t=null){super(e,t)}getShadowFilterFn(e){return e===0?XS:ZS}setupShadowCoord(e,t){return t}setupShadowFilter(e,{filterFn:t,depthTexture:n,shadowCoord:r,shadow:i}){return QS({filterFn:t,depthTexture:n,shadowCoord:r,shadow:i})}setupRenderTarget(e,t){let n=new rt(e.mapSize.width);n.name=`PointShadowDepthTexture`,n.compareFunction=t.renderer.reversedDepthBuffer?518:515;let r=t.createCubeRenderTarget(e.mapSize.width);return r.texture.name=`PointShadowMap`,r.depthTexture=n,{shadowMap:r,depthTexture:n}}renderShadow(e){let{shadow:t,shadowMap:n,light:r}=this,{renderer:i,scene:a}=e,o=t.camera,s=t.matrix,c=i.coordinateSystem===Tt,l=c?KS:JS,u=c?qS:YS;n.setSize(t.mapSize.width,t.mapSize.width);let d=i.autoClear,f=i.getClearColor(HS),p=i.getClearAlpha();i.autoClear=!1,i.setClearColor(t.clearColor,t.clearAlpha);for(let e=0;e<6;e++){i.setRenderTarget(n,e),i.clear();let c=r.distance||o.far;c!==o.far&&(o.far=c,o.updateProjectionMatrix()),WS.setFromMatrixPosition(r.matrixWorld),o.position.copy(WS),GS.copy(o.position),GS.add(l[e]),o.up.copy(u[e]),o.lookAt(GS),o.updateMatrixWorld(),s.makeTranslation(-WS.x,-WS.y,-WS.z),US.multiplyMatrices(o.projectionMatrix,o.matrixWorldInverse),t._frustum.setFromProjectionMatrix(US,o.coordinateSystem,o.reversedDepth);let d=a.name;a.name=`Point Light Shadow [ ${r.name||`ID: `+r.id} ] - Face ${e+1}`,i.render(a,o),a.name=d}i.autoClear=d,i.setClearColor(f,p)}},eC=(e,t)=>new $S(e,t),tC=class extends Tp{static get type(){return`AnalyticLightNode`}constructor(e=null){super(),this.light=e,this.color=new de,this.colorNode=e&&e.colorNode||H(this.color).setGroup(V),this.baseColorNode=null,this.shadowNode=null,this.shadowColorNode=null,this.isAnalyticLightNode=!0,this.updateType=E.FRAME,e&&e.shadow&&(this._shadowDisposeListener=()=>{this.disposeShadow()},e.addEventListener(`dispose`,this._shadowDisposeListener))}dispose(){this._shadowDisposeListener&&this.light.removeEventListener(`dispose`,this._shadowDisposeListener),super.dispose()}disposeShadow(){this.shadowNode!==null&&(this.shadowNode.dispose(),this.shadowNode=null),this.shadowColorNode=null,this.baseColorNode!==null&&(this.colorNode=this.baseColorNode,this.baseColorNode=null)}getHash(){return this.light.uuid}getLightVector(e){return iS(this.light).sub(e.context.positionView||Pu)}setupDirect(){}setupDirectRectArea(){}setupShadowNode(){return VS(this.light)}setupShadow(e){let{renderer:t}=e;if(t.shadowMap.enabled===!1)return;let n=this.shadowColorNode;if(n===null){let e=this.light.shadow.shadowNode,t;t=e===void 0?this.setupShadowNode():k(e),this.shadowNode=t,this.shadowColorNode=n=this.colorNode.mul(t),this.baseColorNode=this.colorNode}e.context.getShadow&&(n=e.context.getShadow(this,e)),this.colorNode=n}setup(e){this.colorNode=this.baseColorNode||this.colorNode,this.light.castShadow?e.object.receiveShadow&&this.setupShadow(e):this.shadowNode!==null&&(this.shadowNode.dispose(),this.shadowNode=null,this.shadowColorNode=null);let t=this.setupDirect(e),n=this.setupDirectRectArea(e);t&&e.lightsNode.setupDirectLight(e,this,t),n&&e.lightsNode.setupDirectRectAreaLight(e,this,n)}update(){let{light:e}=this;this.color.copy(e.color).multiplyScalar(e.intensity)}},nC=N(({lightDistance:e,cutoffDistance:t,decayExponent:n})=>{let r=e.pow(n).max(.01).reciprocal();return t.greaterThan(0).select(r.mul(e.div(t).pow4().oneMinus().clamp().pow2()),r)}),rC=({color:e,lightVector:t,cutoffDistance:n,decayExponent:r})=>{let i=t.normalize(),a=nC({lightDistance:t.length(),cutoffDistance:n,decayExponent:r});return{lightDirection:i,lightColor:e.mul(a)}},iC=class extends tC{static get type(){return`PointLightNode`}constructor(e=null){super(e),this.cutoffDistanceNode=H(0).setGroup(V),this.decayExponentNode=H(2).setGroup(V)}update(e){let{light:t}=this;super.update(e),this.cutoffDistanceNode.value=t.distance,this.decayExponentNode.value=t.decay}setupShadowNode(){return eC(this.light)}setupDirect(e){return rC({color:this.colorNode,lightVector:this.getLightVector(e),cutoffDistance:this.cutoffDistanceNode,decayExponent:this.decayExponentNode})}},aC=N(([e=sl()])=>{let t=e.mul(2),n=t.x.floor(),r=t.y.floor();return n.add(r).mod(2).sign()}),oC=N(([e=sl()],{renderer:t,material:n})=>{let r=As(e.mul(2).sub(1)),i;if(n.alphaToCoverage&&t.currentSamples>0){let e=F(r.fwidth()).toVar();i=Ps(e.oneMinus(),e.add(1),r).oneMinus()}else i=Hs(r.greaterThan(1),0,1);return i}),sC=N(([e,t,n])=>{let r=F(n).toVar(),i=F(t).toVar();return Hs(Hi(e).toVar(),i,r).uniformFlow()}).setLayout({name:`mx_select`,type:`float`,inputs:[{name:`b`,type:`bool`},{name:`t`,type:`float`},{name:`f`,type:`float`}]}),cC=N(([e,t])=>{let n=Hi(t).toVar(),r=F(e).toVar();return Hs(n,r.negate(),r).uniformFlow()}).setLayout({name:`mx_negate_if`,type:`float`,inputs:[{name:`val`,type:`float`},{name:`b`,type:`bool`}]}),lC=N(([e])=>I(Ro(F(e).toVar()))).setLayout({name:`mx_floor`,type:`int`,inputs:[{name:`x`,type:`float`}]}),uC=N(([e,t])=>{let n=F(e).toVar();return t.assign(lC(n)),n.sub(F(t))}),dC=Hv([N(([e,t,n,r,i,a])=>{let o=F(a).toVar(),s=F(i).toVar(),c=F(r).toVar(),l=F(n).toVar(),u=F(t).toVar(),d=F(e).toVar(),f=F(U(1,s)).toVar();return U(1,o).mul(d.mul(f).add(u.mul(s))).add(o.mul(l.mul(f).add(c.mul(s))))}).setLayout({name:`mx_bilerp_0`,type:`float`,inputs:[{name:`v0`,type:`float`},{name:`v1`,type:`float`},{name:`v2`,type:`float`},{name:`v3`,type:`float`},{name:`s`,type:`float`},{name:`t`,type:`float`}]}),N(([e,t,n,r,i,a])=>{let o=F(a).toVar(),s=F(i).toVar(),c=z(r).toVar(),l=z(n).toVar(),u=z(t).toVar(),d=z(e).toVar(),f=F(U(1,s)).toVar();return U(1,o).mul(d.mul(f).add(u.mul(s))).add(o.mul(l.mul(f).add(c.mul(s))))}).setLayout({name:`mx_bilerp_1`,type:`vec3`,inputs:[{name:`v0`,type:`vec3`},{name:`v1`,type:`vec3`},{name:`v2`,type:`vec3`},{name:`v3`,type:`vec3`},{name:`s`,type:`float`},{name:`t`,type:`float`}]})]),fC=Hv([N(([e,t,n,r,i,a,o,s,c,l,u])=>{let d=F(u).toVar(),f=F(l).toVar(),p=F(c).toVar(),m=F(s).toVar(),h=F(o).toVar(),g=F(a).toVar(),_=F(i).toVar(),v=F(r).toVar(),y=F(n).toVar(),b=F(t).toVar(),x=F(e).toVar(),S=F(U(1,p)).toVar(),ee=F(U(1,f)).toVar();return F(U(1,d)).toVar().mul(ee.mul(x.mul(S).add(b.mul(p))).add(f.mul(y.mul(S).add(v.mul(p))))).add(d.mul(ee.mul(_.mul(S).add(g.mul(p))).add(f.mul(h.mul(S).add(m.mul(p))))))}).setLayout({name:`mx_trilerp_0`,type:`float`,inputs:[{name:`v0`,type:`float`},{name:`v1`,type:`float`},{name:`v2`,type:`float`},{name:`v3`,type:`float`},{name:`v4`,type:`float`},{name:`v5`,type:`float`},{name:`v6`,type:`float`},{name:`v7`,type:`float`},{name:`s`,type:`float`},{name:`t`,type:`float`},{name:`r`,type:`float`}]}),N(([e,t,n,r,i,a,o,s,c,l,u])=>{let d=F(u).toVar(),f=F(l).toVar(),p=F(c).toVar(),m=z(s).toVar(),h=z(o).toVar(),g=z(a).toVar(),_=z(i).toVar(),v=z(r).toVar(),y=z(n).toVar(),b=z(t).toVar(),x=z(e).toVar(),S=F(U(1,p)).toVar(),ee=F(U(1,f)).toVar();return F(U(1,d)).toVar().mul(ee.mul(x.mul(S).add(b.mul(p))).add(f.mul(y.mul(S).add(v.mul(p))))).add(d.mul(ee.mul(_.mul(S).add(g.mul(p))).add(f.mul(h.mul(S).add(m.mul(p))))))}).setLayout({name:`mx_trilerp_1`,type:`vec3`,inputs:[{name:`v0`,type:`vec3`},{name:`v1`,type:`vec3`},{name:`v2`,type:`vec3`},{name:`v3`,type:`vec3`},{name:`v4`,type:`vec3`},{name:`v5`,type:`vec3`},{name:`v6`,type:`vec3`},{name:`v7`,type:`vec3`},{name:`s`,type:`float`},{name:`t`,type:`float`},{name:`r`,type:`float`}]})]),pC=Hv([N(([e,t,n])=>{let r=F(n).toVar(),i=F(t).toVar(),a=L(L(e).toVar().bitAnd(L(7))).toVar(),o=F(sC(a.lessThan(L(4)),i,r)).toVar(),s=F(W(2,sC(a.lessThan(L(4)),r,i))).toVar();return cC(o,Hi(a.bitAnd(L(1)))).add(cC(s,Hi(a.bitAnd(L(2)))))}).setLayout({name:`mx_gradient_float_0`,type:`float`,inputs:[{name:`hash`,type:`uint`},{name:`x`,type:`float`},{name:`y`,type:`float`}]}),N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=F(t).toVar(),s=L(L(e).toVar().bitAnd(L(15))).toVar(),c=F(sC(s.lessThan(L(8)),o,a)).toVar(),l=F(sC(s.lessThan(L(4)),a,sC(s.equal(L(12)).or(s.equal(L(14))),o,i))).toVar();return cC(c,Hi(s.bitAnd(L(1)))).add(cC(l,Hi(s.bitAnd(L(2)))))}).setLayout({name:`mx_gradient_float_1`,type:`float`,inputs:[{name:`hash`,type:`uint`},{name:`x`,type:`float`},{name:`y`,type:`float`},{name:`z`,type:`float`}]})]),mC=Hv([N(([e,t,n])=>{let r=F(n).toVar(),i=F(t).toVar(),a=qi(e).toVar();return z(pC(a.x,i,r),pC(a.y,i,r),pC(a.z,i,r))}).setLayout({name:`mx_gradient_vec3_0`,type:`vec3`,inputs:[{name:`hash`,type:`uvec3`},{name:`x`,type:`float`},{name:`y`,type:`float`}]}),N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=F(t).toVar(),s=qi(e).toVar();return z(pC(s.x,o,a,i),pC(s.y,o,a,i),pC(s.z,o,a,i))}).setLayout({name:`mx_gradient_vec3_1`,type:`vec3`,inputs:[{name:`hash`,type:`uvec3`},{name:`x`,type:`float`},{name:`y`,type:`float`},{name:`z`,type:`float`}]})]),hC=N(([e])=>W(.6616,F(e).toVar())).setLayout({name:`mx_gradient_scale2d_0`,type:`float`,inputs:[{name:`v`,type:`float`}]}),gC=N(([e])=>W(.982,F(e).toVar())).setLayout({name:`mx_gradient_scale3d_0`,type:`float`,inputs:[{name:`v`,type:`float`}]}),_C=Hv([hC,N(([e])=>W(.6616,z(e).toVar())).setLayout({name:`mx_gradient_scale2d_1`,type:`vec3`,inputs:[{name:`v`,type:`vec3`}]})]),vC=Hv([gC,N(([e])=>W(.982,z(e).toVar())).setLayout({name:`mx_gradient_scale3d_1`,type:`vec3`,inputs:[{name:`v`,type:`vec3`}]})]),yC=N(([e,t])=>{let n=I(t).toVar(),r=L(e).toVar();return r.shiftLeft(n).bitOr(r.shiftRight(I(32).sub(n)))}).setLayout({name:`mx_rotl32`,type:`uint`,inputs:[{name:`x`,type:`uint`},{name:`k`,type:`int`}]}),bC=N(([e,t,n])=>{e.subAssign(n),e.bitXorAssign(yC(n,I(4))),n.addAssign(t),t.subAssign(e),t.bitXorAssign(yC(e,I(6))),e.addAssign(n),n.subAssign(t),n.bitXorAssign(yC(t,I(8))),t.addAssign(e),e.subAssign(n),e.bitXorAssign(yC(n,I(16))),n.addAssign(t),t.subAssign(e),t.bitXorAssign(yC(e,I(19))),e.addAssign(n),n.subAssign(t),n.bitXorAssign(yC(t,I(4))),t.addAssign(e)}),xC=N(([e,t,n])=>{let r=L(n).toVar(),i=L(t).toVar(),a=L(e).toVar();return r.bitXorAssign(i),r.subAssign(yC(i,I(14))),a.bitXorAssign(r),a.subAssign(yC(r,I(11))),i.bitXorAssign(a),i.subAssign(yC(a,I(25))),r.bitXorAssign(i),r.subAssign(yC(i,I(16))),a.bitXorAssign(r),a.subAssign(yC(r,I(4))),i.bitXorAssign(a),i.subAssign(yC(a,I(14))),r.bitXorAssign(i),r.subAssign(yC(i,I(24))),r}).setLayout({name:`mx_bjfinal`,type:`uint`,inputs:[{name:`a`,type:`uint`},{name:`b`,type:`uint`},{name:`c`,type:`uint`}]}),SC=N(([e])=>F(L(e).toVar()).div(F(L(I(4294967295))))).setLayout({name:`mx_bits_to_01`,type:`float`,inputs:[{name:`bits`,type:`uint`}]}),CC=N(([e])=>{let t=F(e).toVar();return t.mul(t).mul(t).mul(t.mul(t.mul(6).sub(15)).add(10))}).setLayout({name:`mx_fade`,type:`float`,inputs:[{name:`t`,type:`float`}]}),wC=Hv([N(([e])=>{let t=I(e).toVar(),n=L(L(1)).toVar(),r=L(L(I(3735928559)).add(n.shiftLeft(L(2))).add(L(13))).toVar();return xC(r.add(L(t)),r,r)}).setLayout({name:`mx_hash_int_0`,type:`uint`,inputs:[{name:`x`,type:`int`}]}),N(([e,t])=>{let n=I(t).toVar(),r=I(e).toVar(),i=L(L(2)).toVar(),a=L().toVar(),o=L().toVar(),s=L().toVar();return a.assign(o.assign(s.assign(L(I(3735928559)).add(i.shiftLeft(L(2))).add(L(13))))),a.addAssign(L(r)),o.addAssign(L(n)),xC(a,o,s)}).setLayout({name:`mx_hash_int_1`,type:`uint`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`}]}),N(([e,t,n])=>{let r=I(n).toVar(),i=I(t).toVar(),a=I(e).toVar(),o=L(L(3)).toVar(),s=L().toVar(),c=L().toVar(),l=L().toVar();return s.assign(c.assign(l.assign(L(I(3735928559)).add(o.shiftLeft(L(2))).add(L(13))))),s.addAssign(L(a)),c.addAssign(L(i)),l.addAssign(L(r)),xC(s,c,l)}).setLayout({name:`mx_hash_int_2`,type:`uint`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`z`,type:`int`}]}),N(([e,t,n,r])=>{let i=I(r).toVar(),a=I(n).toVar(),o=I(t).toVar(),s=I(e).toVar(),c=L(L(4)).toVar(),l=L().toVar(),u=L().toVar(),d=L().toVar();return l.assign(u.assign(d.assign(L(I(3735928559)).add(c.shiftLeft(L(2))).add(L(13))))),l.addAssign(L(s)),u.addAssign(L(o)),d.addAssign(L(a)),bC(l,u,d),l.addAssign(L(i)),xC(l,u,d)}).setLayout({name:`mx_hash_int_3`,type:`uint`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`z`,type:`int`},{name:`xx`,type:`int`}]}),N(([e,t,n,r,i])=>{let a=I(i).toVar(),o=I(r).toVar(),s=I(n).toVar(),c=I(t).toVar(),l=I(e).toVar(),u=L(L(5)).toVar(),d=L().toVar(),f=L().toVar(),p=L().toVar();return d.assign(f.assign(p.assign(L(I(3735928559)).add(u.shiftLeft(L(2))).add(L(13))))),d.addAssign(L(l)),f.addAssign(L(c)),p.addAssign(L(s)),bC(d,f,p),d.addAssign(L(o)),f.addAssign(L(a)),xC(d,f,p)}).setLayout({name:`mx_hash_int_4`,type:`uint`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`z`,type:`int`},{name:`xx`,type:`int`},{name:`yy`,type:`int`}]})]),TC=Hv([N(([e,t])=>{let n=I(t).toVar(),r=L(wC(I(e).toVar(),n)).toVar(),i=qi().toVar();return i.x.assign(r.bitAnd(I(255))),i.y.assign(r.shiftRight(I(8)).bitAnd(I(255))),i.z.assign(r.shiftRight(I(16)).bitAnd(I(255))),i}).setLayout({name:`mx_hash_vec3_0`,type:`uvec3`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`}]}),N(([e,t,n])=>{let r=I(n).toVar(),i=I(t).toVar(),a=L(wC(I(e).toVar(),i,r)).toVar(),o=qi().toVar();return o.x.assign(a.bitAnd(I(255))),o.y.assign(a.shiftRight(I(8)).bitAnd(I(255))),o.z.assign(a.shiftRight(I(16)).bitAnd(I(255))),o}).setLayout({name:`mx_hash_vec3_1`,type:`uvec3`,inputs:[{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`z`,type:`int`}]})]),EC=Hv([N(([e])=>{let t=R(e).toVar(),n=I().toVar(),r=I().toVar(),i=F(uC(t.x,n)).toVar(),a=F(uC(t.y,r)).toVar(),o=F(CC(i)).toVar(),s=F(CC(a)).toVar();return _C(F(dC(pC(wC(n,r),i,a),pC(wC(n.add(I(1)),r),i.sub(1),a),pC(wC(n,r.add(I(1))),i,a.sub(1)),pC(wC(n.add(I(1)),r.add(I(1))),i.sub(1),a.sub(1)),o,s)).toVar())}).setLayout({name:`mx_perlin_noise_float_0`,type:`float`,inputs:[{name:`p`,type:`vec2`}]}),N(([e])=>{let t=z(e).toVar(),n=I().toVar(),r=I().toVar(),i=I().toVar(),a=F(uC(t.x,n)).toVar(),o=F(uC(t.y,r)).toVar(),s=F(uC(t.z,i)).toVar(),c=F(CC(a)).toVar(),l=F(CC(o)).toVar(),u=F(CC(s)).toVar();return vC(F(fC(pC(wC(n,r,i),a,o,s),pC(wC(n.add(I(1)),r,i),a.sub(1),o,s),pC(wC(n,r.add(I(1)),i),a,o.sub(1),s),pC(wC(n.add(I(1)),r.add(I(1)),i),a.sub(1),o.sub(1),s),pC(wC(n,r,i.add(I(1))),a,o,s.sub(1)),pC(wC(n.add(I(1)),r,i.add(I(1))),a.sub(1),o,s.sub(1)),pC(wC(n,r.add(I(1)),i.add(I(1))),a,o.sub(1),s.sub(1)),pC(wC(n.add(I(1)),r.add(I(1)),i.add(I(1))),a.sub(1),o.sub(1),s.sub(1)),c,l,u)).toVar())}).setLayout({name:`mx_perlin_noise_float_1`,type:`float`,inputs:[{name:`p`,type:`vec3`}]})]),DC=Hv([N(([e])=>{let t=R(e).toVar(),n=I().toVar(),r=I().toVar(),i=F(uC(t.x,n)).toVar(),a=F(uC(t.y,r)).toVar(),o=F(CC(i)).toVar(),s=F(CC(a)).toVar();return _C(z(dC(mC(TC(n,r),i,a),mC(TC(n.add(I(1)),r),i.sub(1),a),mC(TC(n,r.add(I(1))),i,a.sub(1)),mC(TC(n.add(I(1)),r.add(I(1))),i.sub(1),a.sub(1)),o,s)).toVar())}).setLayout({name:`mx_perlin_noise_vec3_0`,type:`vec3`,inputs:[{name:`p`,type:`vec2`}]}),N(([e])=>{let t=z(e).toVar(),n=I().toVar(),r=I().toVar(),i=I().toVar(),a=F(uC(t.x,n)).toVar(),o=F(uC(t.y,r)).toVar(),s=F(uC(t.z,i)).toVar(),c=F(CC(a)).toVar(),l=F(CC(o)).toVar(),u=F(CC(s)).toVar();return vC(z(fC(mC(TC(n,r,i),a,o,s),mC(TC(n.add(I(1)),r,i),a.sub(1),o,s),mC(TC(n,r.add(I(1)),i),a,o.sub(1),s),mC(TC(n.add(I(1)),r.add(I(1)),i),a.sub(1),o.sub(1),s),mC(TC(n,r,i.add(I(1))),a,o,s.sub(1)),mC(TC(n.add(I(1)),r,i.add(I(1))),a.sub(1),o,s.sub(1)),mC(TC(n,r.add(I(1)),i.add(I(1))),a,o.sub(1),s.sub(1)),mC(TC(n.add(I(1)),r.add(I(1)),i.add(I(1))),a.sub(1),o.sub(1),s.sub(1)),c,l,u)).toVar())}).setLayout({name:`mx_perlin_noise_vec3_1`,type:`vec3`,inputs:[{name:`p`,type:`vec3`}]})]),OC=Hv([N(([e])=>SC(wC(I(lC(F(e).toVar())).toVar()))).setLayout({name:`mx_cell_noise_float_0`,type:`float`,inputs:[{name:`p`,type:`float`}]}),N(([e])=>{let t=R(e).toVar();return SC(wC(I(lC(t.x)).toVar(),I(lC(t.y)).toVar()))}).setLayout({name:`mx_cell_noise_float_1`,type:`float`,inputs:[{name:`p`,type:`vec2`}]}),N(([e])=>{let t=z(e).toVar();return SC(wC(I(lC(t.x)).toVar(),I(lC(t.y)).toVar(),I(lC(t.z)).toVar()))}).setLayout({name:`mx_cell_noise_float_2`,type:`float`,inputs:[{name:`p`,type:`vec3`}]}),N(([e])=>{let t=B(e).toVar();return SC(wC(I(lC(t.x)).toVar(),I(lC(t.y)).toVar(),I(lC(t.z)).toVar(),I(lC(t.w)).toVar()))}).setLayout({name:`mx_cell_noise_float_3`,type:`float`,inputs:[{name:`p`,type:`vec4`}]})]),kC=Hv([N(([e])=>{let t=I(lC(F(e).toVar())).toVar();return z(SC(wC(t,I(0))),SC(wC(t,I(1))),SC(wC(t,I(2))))}).setLayout({name:`mx_cell_noise_vec3_0`,type:`vec3`,inputs:[{name:`p`,type:`float`}]}),N(([e])=>{let t=R(e).toVar(),n=I(lC(t.x)).toVar(),r=I(lC(t.y)).toVar();return z(SC(wC(n,r,I(0))),SC(wC(n,r,I(1))),SC(wC(n,r,I(2))))}).setLayout({name:`mx_cell_noise_vec3_1`,type:`vec3`,inputs:[{name:`p`,type:`vec2`}]}),N(([e])=>{let t=z(e).toVar(),n=I(lC(t.x)).toVar(),r=I(lC(t.y)).toVar(),i=I(lC(t.z)).toVar();return z(SC(wC(n,r,i,I(0))),SC(wC(n,r,i,I(1))),SC(wC(n,r,i,I(2))))}).setLayout({name:`mx_cell_noise_vec3_2`,type:`vec3`,inputs:[{name:`p`,type:`vec3`}]}),N(([e])=>{let t=B(e).toVar(),n=I(lC(t.x)).toVar(),r=I(lC(t.y)).toVar(),i=I(lC(t.z)).toVar(),a=I(lC(t.w)).toVar();return z(SC(wC(n,r,i,a,I(0))),SC(wC(n,r,i,a,I(1))),SC(wC(n,r,i,a,I(2))))}).setLayout({name:`mx_cell_noise_vec3_3`,type:`vec3`,inputs:[{name:`p`,type:`vec4`}]})]),AC=N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=I(t).toVar(),s=z(e).toVar(),c=F(0).toVar(),l=F(1).toVar();return gp(o,()=>{c.addAssign(l.mul(EC(s))),l.mulAssign(i),s.mulAssign(a)}),c}).setLayout({name:`mx_fractal_noise_float`,type:`float`,inputs:[{name:`p`,type:`vec3`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),jC=N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=I(t).toVar(),s=z(e).toVar(),c=z(0).toVar(),l=F(1).toVar();return gp(o,()=>{c.addAssign(l.mul(DC(s))),l.mulAssign(i),s.mulAssign(a)}),c}).setLayout({name:`mx_fractal_noise_vec3`,type:`vec3`,inputs:[{name:`p`,type:`vec3`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),MC=N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=I(t).toVar(),s=z(e).toVar();return R(AC(s,o,a,i),AC(s.add(z(I(19),I(193),I(17))),o,a,i))}).setLayout({name:`mx_fractal_noise_vec2`,type:`vec2`,inputs:[{name:`p`,type:`vec3`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),NC=N(([e,t,n,r])=>{let i=F(r).toVar(),a=F(n).toVar(),o=I(t).toVar(),s=z(e).toVar();return B(z(jC(s,o,a,i)).toVar(),F(AC(s.add(z(I(19),I(193),I(17))),o,a,i)).toVar())}).setLayout({name:`mx_fractal_noise_vec4`,type:`vec4`,inputs:[{name:`p`,type:`vec3`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),PC=Hv([N(([e,t,n,r,i,a,o])=>{let s=I(o).toVar(),c=F(a).toVar(),l=I(i).toVar(),u=I(r).toVar(),d=I(n).toVar(),f=I(t).toVar(),p=R(e).toVar(),m=z(kC(R(f.add(u),d.add(l)))).toVar(),h=R(m.x,m.y).toVar();h.subAssign(.5),h.mulAssign(c),h.addAssign(.5);let g=R(R(R(F(f),F(d)).add(h)).toVar().sub(p)).toVar();return P(s.equal(I(2)),()=>es(g.x).add(es(g.y))),P(s.equal(I(3)),()=>hs(es(g.x),es(g.y))),bs(g,g)}).setLayout({name:`mx_worley_distance_0`,type:`float`,inputs:[{name:`p`,type:`vec2`},{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`xoff`,type:`int`},{name:`yoff`,type:`int`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]}),N(([e,t,n,r,i,a,o,s,c])=>{let l=I(c).toVar(),u=F(s).toVar(),d=I(o).toVar(),f=I(a).toVar(),p=I(i).toVar(),m=I(r).toVar(),h=I(n).toVar(),g=I(t).toVar(),_=z(e).toVar(),v=z(kC(z(g.add(p),h.add(f),m.add(d)))).toVar();v.subAssign(.5),v.mulAssign(u),v.addAssign(.5);let y=z(z(z(F(g),F(h),F(m)).add(v)).toVar().sub(_)).toVar();return P(l.equal(I(2)),()=>es(y.x).add(es(y.y)).add(es(y.z))),P(l.equal(I(3)),()=>hs(es(y.x),es(y.y),es(y.z))),bs(y,y)}).setLayout({name:`mx_worley_distance_1`,type:`float`,inputs:[{name:`p`,type:`vec3`},{name:`x`,type:`int`},{name:`y`,type:`int`},{name:`z`,type:`int`},{name:`xoff`,type:`int`},{name:`yoff`,type:`int`},{name:`zoff`,type:`int`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]})]),FC=N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=R(e).toVar(),o=I().toVar(),s=I().toVar(),c=R(uC(a.x,o),uC(a.y,s)).toVar(),l=F(1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{let n=F(PC(c,e,t,o,s,i,r)).toVar();l.assign(ms(l,n))})}),P(r.equal(I(0)),()=>{l.assign(Io(l))}),l}).setLayout({name:`mx_worley_noise_float_0`,type:`float`,inputs:[{name:`p`,type:`vec2`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]}),IC=N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=R(e).toVar(),o=I().toVar(),s=I().toVar(),c=R(uC(a.x,o),uC(a.y,s)).toVar(),l=R(1e6,1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{let n=F(PC(c,e,t,o,s,i,r)).toVar();P(n.lessThan(l.x),()=>{l.y.assign(l.x),l.x.assign(n)}).ElseIf(n.lessThan(l.y),()=>{l.y.assign(n)})})}),P(r.equal(I(0)),()=>{l.assign(Io(l))}),l}).setLayout({name:`mx_worley_noise_vec2_0`,type:`vec2`,inputs:[{name:`p`,type:`vec2`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]}),LC=N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=R(e).toVar(),o=I().toVar(),s=I().toVar(),c=R(uC(a.x,o),uC(a.y,s)).toVar(),l=z(1e6,1e6,1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{let n=F(PC(c,e,t,o,s,i,r)).toVar();P(n.lessThan(l.x),()=>{l.z.assign(l.y),l.y.assign(l.x),l.x.assign(n)}).ElseIf(n.lessThan(l.y),()=>{l.z.assign(l.y),l.y.assign(n)}).ElseIf(n.lessThan(l.z),()=>{l.z.assign(n)})})}),P(r.equal(I(0)),()=>{l.assign(Io(l))}),l}).setLayout({name:`mx_worley_noise_vec3_0`,type:`vec3`,inputs:[{name:`p`,type:`vec2`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]}),RC=Hv([FC,N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=z(e).toVar(),o=I().toVar(),s=I().toVar(),c=I().toVar(),l=z(uC(a.x,o),uC(a.y,s),uC(a.z,c)).toVar(),u=F(1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{gp({start:-1,end:I(1),name:`z`,condition:`<=`},({z:n})=>{let a=F(PC(l,e,t,n,o,s,c,i,r)).toVar();u.assign(ms(u,a))})})}),P(r.equal(I(0)),()=>{u.assign(Io(u))}),u}).setLayout({name:`mx_worley_noise_float_1`,type:`float`,inputs:[{name:`p`,type:`vec3`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]})]),zC=Hv([IC,N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=z(e).toVar(),o=I().toVar(),s=I().toVar(),c=I().toVar(),l=z(uC(a.x,o),uC(a.y,s),uC(a.z,c)).toVar(),u=R(1e6,1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{gp({start:-1,end:I(1),name:`z`,condition:`<=`},({z:n})=>{let a=F(PC(l,e,t,n,o,s,c,i,r)).toVar();P(a.lessThan(u.x),()=>{u.y.assign(u.x),u.x.assign(a)}).ElseIf(a.lessThan(u.y),()=>{u.y.assign(a)})})})}),P(r.equal(I(0)),()=>{u.assign(Io(u))}),u}).setLayout({name:`mx_worley_noise_vec2_1`,type:`vec2`,inputs:[{name:`p`,type:`vec3`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]})]),BC=Hv([LC,N(([e,t,n])=>{let r=I(n).toVar(),i=F(t).toVar(),a=z(e).toVar(),o=I().toVar(),s=I().toVar(),c=I().toVar(),l=z(uC(a.x,o),uC(a.y,s),uC(a.z,c)).toVar(),u=z(1e6,1e6,1e6).toVar();return gp({start:-1,end:I(1),name:`x`,condition:`<=`},({x:e})=>{gp({start:-1,end:I(1),name:`y`,condition:`<=`},({y:t})=>{gp({start:-1,end:I(1),name:`z`,condition:`<=`},({z:n})=>{let a=F(PC(l,e,t,n,o,s,c,i,r)).toVar();P(a.lessThan(u.x),()=>{u.z.assign(u.y),u.y.assign(u.x),u.x.assign(a)}).ElseIf(a.lessThan(u.y),()=>{u.z.assign(u.y),u.y.assign(a)}).ElseIf(a.lessThan(u.z),()=>{u.z.assign(a)})})})}),P(r.equal(I(0)),()=>{u.assign(Io(u))}),u}).setLayout({name:`mx_worley_noise_vec3_1`,type:`vec3`,inputs:[{name:`p`,type:`vec3`},{name:`jitter`,type:`float`},{name:`metric`,type:`int`}]})]),VC=N(([e,t,n,r,i,a,o,s,c,l,u])=>{let d=I(e).toVar(),f=R(t).toVar(),p=R(n).toVar(),m=R(r).toVar(),h=F(i).toVar(),g=F(a).toVar(),_=F(o).toVar(),v=Hi(s).toVar(),y=I(c).toVar(),b=F(l).toVar(),x=F(u).toVar(),S=f.mul(p).add(m),ee=F(0).toVar();return P(d.equal(I(0)),()=>{ee.assign(DC(S))}),P(d.equal(I(1)),()=>{ee.assign(kC(S))}),P(d.equal(I(2)),()=>{ee.assign(BC(S,h,I(0)))}),P(d.equal(I(3)),()=>{ee.assign(jC(z(S,0),y,b,x))}),ee.assign(ee.mul(_.sub(g)).add(g)),P(v,()=>{ee.assign(js(ee,g,_))}),ee}).setLayout({name:`mx_unifiednoise2d`,type:`float`,inputs:[{name:`noiseType`,type:`int`},{name:`texcoord`,type:`vec2`},{name:`freq`,type:`vec2`},{name:`offset`,type:`vec2`},{name:`jitter`,type:`float`},{name:`outmin`,type:`float`},{name:`outmax`,type:`float`},{name:`clampoutput`,type:`bool`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),HC=N(([e,t,n,r,i,a,o,s,c,l,u])=>{let d=I(e).toVar(),f=z(t).toVar(),p=z(n).toVar(),m=z(r).toVar(),h=F(i).toVar(),g=F(a).toVar(),_=F(o).toVar(),v=Hi(s).toVar(),y=I(c).toVar(),b=F(l).toVar(),x=F(u).toVar(),S=f.mul(p).add(m),ee=F(0).toVar();return P(d.equal(I(0)),()=>{ee.assign(DC(S))}),P(d.equal(I(1)),()=>{ee.assign(kC(S))}),P(d.equal(I(2)),()=>{ee.assign(BC(S,h,I(0)))}),P(d.equal(I(3)),()=>{ee.assign(jC(S,y,b,x))}),ee.assign(ee.mul(_.sub(g)).add(g)),P(v,()=>{ee.assign(js(ee,g,_))}),ee}).setLayout({name:`mx_unifiednoise3d`,type:`float`,inputs:[{name:`noiseType`,type:`int`},{name:`position`,type:`vec3`},{name:`freq`,type:`vec3`},{name:`offset`,type:`vec3`},{name:`jitter`,type:`float`},{name:`outmin`,type:`float`},{name:`outmax`,type:`float`},{name:`clampoutput`,type:`bool`},{name:`octaves`,type:`int`},{name:`lacunarity`,type:`float`},{name:`diminish`,type:`float`}]}),UC=N(([e])=>{let t=e.y,n=e.z,r=z().toVar();return P(t.lessThan(1e-4),()=>{r.assign(z(n,n,n))}).Else(()=>{let i=e.x;i=i.sub(Ro(i)).mul(6).toVar();let a=I(ls(i)),o=i.sub(F(a)),s=n.mul(t.oneMinus()),c=n.mul(t.mul(o).oneMinus()),l=n.mul(t.mul(o.oneMinus()).oneMinus());P(a.equal(I(0)),()=>{r.assign(z(n,l,s))}).ElseIf(a.equal(I(1)),()=>{r.assign(z(c,n,s))}).ElseIf(a.equal(I(2)),()=>{r.assign(z(s,n,l))}).ElseIf(a.equal(I(3)),()=>{r.assign(z(s,c,n))}).ElseIf(a.equal(I(4)),()=>{r.assign(z(l,s,n))}).Else(()=>{r.assign(z(n,s,c))})}),r}).setLayout({name:`mx_hsvtorgb`,type:`vec3`,inputs:[{name:`hsv`,type:`vec3`}]}),WC=N(([e])=>{let t=z(e).toVar(),n=F(t.x).toVar(),r=F(t.y).toVar(),i=F(t.z).toVar(),a=F(ms(n,ms(r,i))).toVar(),o=F(hs(n,hs(r,i))).toVar(),s=F(o.sub(a)).toVar(),c=F().toVar(),l=F().toVar(),u=F().toVar();return u.assign(o),P(o.greaterThan(0),()=>{l.assign(s.div(o))}).Else(()=>{l.assign(0)}),P(l.lessThanEqual(0),()=>{c.assign(0)}).Else(()=>{P(n.greaterThanEqual(o),()=>{c.assign(r.sub(i).div(s))}).ElseIf(r.greaterThanEqual(o),()=>{c.assign(Qa(2,i.sub(n).div(s)))}).Else(()=>{c.assign(Qa(4,n.sub(r).div(s)))}),c.mulAssign(1/6),P(c.lessThan(0),()=>{c.addAssign(1)})}),z(c,l,u)}).setLayout({name:`mx_rgbtohsv`,type:`vec3`,inputs:[{name:`c`,type:`vec3`}]}),GC=N(([e])=>{let t=z(e).toVar(),n=Ji(io(t,z(.04045))).toVar();return K(z(t.div(12.92)).toVar(),z(Ss(hs(t.add(z(.055)),z(0)).div(1.055),z(2.4))).toVar(),n)}).setLayout({name:`mx_srgb_texture_to_lin_rec709`,type:`vec3`,inputs:[{name:`color`,type:`vec3`}]}),KC=(e,t)=>{e=F(e),t=F(t);let n=R(t.dFdx(),t.dFdy()).length().mul(.7071067811865476);return Ps(e.sub(n),e.add(n),t)},qC=(e,t,n,r)=>K(e,t,n[r].clamp()),JC=(e,t,n=sl())=>qC(e,t,n,`x`),YC=(e,t,n=sl())=>qC(e,t,n,`y`),XC=(e,t,n,r,i=sl())=>{let a=i.x.clamp(),o=i.y.clamp();return K(K(e,t,a),K(n,r,a),o)},ZC=(e,t,n,r,i)=>K(e,t,KC(n,r[i])),QC=(e,t,n,r=sl())=>ZC(e,t,n,r,`x`),$C=(e,t,n,r=sl())=>ZC(e,t,n,r,`y`),ew=(e=1,t=0,n=sl())=>n.mul(e).add(t),tw=(e,t=1)=>(e=F(e),e.abs().pow(t).mul(e.sign())),nw=(e,t=1,n=.5)=>F(e).sub(n).mul(t).add(n),rw=(e=sl(),t=1,n=0)=>EC(e.convert(`vec2|vec3`)).mul(t).add(n),iw=(e=sl(),t=1,n=0)=>DC(e.convert(`vec2|vec3`)).mul(t).add(n),aw=(e=sl(),t=1,n=0)=>(e=e.convert(`vec2|vec3`),B(DC(e),EC(e.add(R(19,73)))).mul(t).add(n)),ow=(e,t=sl(),n=R(1,1),r=R(0,0),i=1,a=0,o=1,s=!1,c=1,l=2,u=.5)=>VC(e,t.convert(`vec2|vec3`),n,r,i,a,o,s,c,l,u),sw=(e,t=sl(),n=R(1,1),r=R(0,0),i=1,a=0,o=1,s=!1,c=1,l=2,u=.5)=>HC(e,t.convert(`vec2|vec3`),n,r,i,a,o,s,c,l,u),cw=(e=sl(),t=1)=>RC(e.convert(`vec2|vec3`),t,I(1)),lw=(e=sl(),t=1)=>zC(e.convert(`vec2|vec3`),t,I(1)),uw=(e=sl(),t=1)=>BC(e.convert(`vec2|vec3`),t,I(1)),dw=(e=sl())=>OC(e.convert(`vec2|vec3`)),fw=(e=sl(),t=3,n=2,r=.5,i=1)=>AC(e,I(t),n,r).mul(i),pw=(e=sl(),t=3,n=2,r=.5,i=1)=>MC(e,I(t),n,r).mul(i),mw=(e=sl(),t=3,n=2,r=.5,i=1)=>jC(e,I(t),n,r).mul(i),hw=(e=sl(),t=3,n=2,r=.5,i=1)=>NC(e,I(t),n,r).mul(i),gw=(e,t=F(0))=>Qa(e,t),_w=(e,t=F(0))=>U(e,t),vw=(e,t=F(1))=>W(e,t),yw=(e,t=F(1))=>$a(e,t),bw=(e,t=F(1))=>eo(e,t),xw=(e,t=F(1))=>Ss(e,t),Sw=(e=F(0),t=F(1))=>Qo(e,t),Cw=()=>Uv,ww=()=>Gv,Tw=(e,t=F(1))=>U(t,e),Ew=(e,t,n,r)=>e.greaterThan(t).mix(n,r),Dw=(e,t,n,r)=>e.greaterThanEqual(t).mix(n,r),Ow=(e,t,n,r)=>e.equal(t).mix(n,r),kw=(e,t=null)=>{if(typeof t==`string`){let n={x:0,r:0,y:1,g:1,z:2,b:2,w:3,a:3},r=t.replace(/^out/,``).toLowerCase();if(n[r]!==void 0)return e.element(n[r])}if(typeof t==`number`)return e.element(t);if(typeof t==`string`&&t.length===1){let n={x:0,r:0,y:1,g:1,z:2,b:2,w:3,a:3};if(n[t]!==void 0)return e.element(n[t])}return e},Aw=(e,t=R(.5,.5),n=R(1,1),r=F(0),i=R(0,0))=>{let a=e;if(t&&(a=a.sub(t)),n&&(a=a.mul(n)),r){let e=r.mul(Math.PI/180),t=e.cos(),n=e.sin();a=R(a.x.mul(t).sub(a.y.mul(n)),a.x.mul(n).add(a.y.mul(t)))}return t&&(a=a.add(t)),i&&(a=a.add(i)),a},jw=(e,t)=>{e=R(e),t=F(t);let n=t.mul(Math.PI/180);return t_(e,n)},Mw=(e,t,n)=>{e=z(e),t=F(t),n=z(n);let r=t.mul(Math.PI/180),i=n.normalize(),a=r.cos(),o=r.sin(),s=F(1).sub(a);return e.mul(a).add(i.cross(e).mul(o)).add(i.mul(i.dot(e)).mul(s))},Nw=(e,t)=>(e=z(e),t=F(t),Zd(e,t)),Pw=N(([e,t,n])=>{let r=Bo(e).toVar(),i=U(F(.5).mul(t.sub(n)),Mu).div(r).toVar(),a=U(F(-.5).mul(t.sub(n)),Mu).div(r).toVar(),o=z().toVar();o.x=r.x.greaterThan(F(0)).select(i.x,a.x),o.y=r.y.greaterThan(F(0)).select(i.y,a.y),o.z=r.z.greaterThan(F(0)).select(i.z,a.z);let s=ms(o.x,o.y,o.z).toVar();return Mu.add(r.mul(s)).toVar().sub(n)}),Fw=N(([e,t])=>{let n=e.x,r=e.y,i=e.z,a=t.element(0).mul(.886227);return a=a.add(t.element(1).mul(1.023328).mul(r)),a=a.add(t.element(2).mul(1.023328).mul(i)),a=a.add(t.element(3).mul(1.023328).mul(n)),a=a.add(t.element(4).mul(.858086).mul(n).mul(r)),a=a.add(t.element(5).mul(.858086).mul(r).mul(i)),a=a.add(t.element(6).mul(i.mul(i).mul(.743125).sub(.247708))),a=a.add(t.element(7).mul(.858086).mul(n).mul(i)),a=a.add(t.element(8).mul(.429043).mul(W(n,n).sub(W(r,r)))),a}),Z=Object.freeze({__proto__:null,BRDF_GGX:Zm,BRDF_Lambert:Fm,BasicPointShadowFilter:XS,BasicShadowFilter:ES,Break:vp,Const:$s,Continue:_p,DFGLUT:eh,D_GGX:Jm,Discard:qc,EPSILON:So,F_Schlick:Pm,Fn:N,HALF_PI:Do,INFINITY:Co,If:P,Loop:gp,NodeAccess:Mr,NodeShaderStage:Ar,NodeType:jr,NodeUpdateType:E,OnBeforeFrameUpdate:Kf,OnBeforeMaterialUpdate:Gf,OnBeforeObjectUpdate:Wf,OnFrameUpdate:Uf,OnMaterialUpdate:Hf,OnObjectUpdate:Vf,PCFShadowFilter:DS,PCFSoftShadowFilter:OS,PI:wo,PI2:To,PointShadowFilter:ZS,Return:Jc,Schlick_to_F0:rh,ShaderNode:Ai,Stack:Bi,Switch:zi,TBNViewMatrix:zd,TWO_PI:Eo,VSMShadowFilter:kS,V_GGX_SmithCorrelated:Km,Var:Qs,VarIntent:ec,abs:es,acesFilmicToneMapping:Mb,acos:Xo,acosh:Zo,add:Qa,addMethodChaining:O,addNodeElement:il,agxToneMapping:Ib,all:Oo,alphaT:ba,ambientOcclusion:Ra,and:so,anisotropy:xa,anisotropyB:Ca,anisotropyT:Sa,any:ko,append:ia,array:Ka,asin:Jo,asinh:Yo,assign:qa,atan:Qo,atanh:$o,atomicAdd:bx,atomicAnd:wx,atomicFunc:_x,atomicLoad:vx,atomicMax:Sx,atomicMin:Cx,atomicOr:Tx,atomicStore:yx,atomicSub:xx,atomicXor:Ex,attenuationColor:Ia,attenuationDistance:Fa,attribute:ol,attributeArray:Ly,backgroundBlurriness:Vy,backgroundIntensity:Hy,backgroundRotation:Uy,batch:sp,batchColor:op,bentNormalView:Hd,billboarding:$v,bitAnd:fo,bitNot:po,bitOr:mo,bitXor:ho,bitangentGeometry:Fd,bitangentLocal:Id,bitangentView:Ld,bitangentWorld:Rd,bitcast:hv,blendBurn:ab,blendColor:lb,blendDodge:ob,blendOverlay:cb,blendScreen:sb,blur:ig,bool:Hi,buffer:bl,bufferAttribute:Tc,builtin:wl,builtinAOContext:Js,builtinShadowContext:qs,bumpMap:Zd,bvec2:Gi,bvec3:Ji,bvec4:Zi,bypass:Hc,cache:Vc,call:Ya,cameraFar:$l,cameraIndex:Zl,cameraNear:Ql,cameraNormalMatrix:iu,cameraPosition:au,cameraProjectionMatrix:eu,cameraProjectionMatrixInverse:tu,cameraViewMatrix:nu,cameraViewport:ou,cameraWorldMatrix:ru,cbrt:ks,cdl:hb,ceil:zo,checker:aC,cineonToneMapping:Ab,clamp:js,clearcoat:pa,clearcoatNormalView:Ku,clearcoatRoughness:ma,clipSpace:Ou,code:zb,color:Vi,colorSpaceToWorking:dc,colorToDirection:qd,compute:Rc,computeKernel:Lc,computeSkinning:mp,context:Ws,convert:na,convertColorSpace:fc,convertToTexture:Dy,cos:Wo,cosh:Go,countLeadingZeros:Cv,countOneBits:wv,countTrailingZeros:Sv,cross:xs,cubeTexture:cd,cubeTextureBase:sd,dFdx:as,dFdy:os,dashSize:ka,debug:el,decrement:xo,decrementBefore:yo,defaultBuildStages:Pr,defaultShaderStages:Nr,defined:Oi,degrees:jo,deltaTime:Wv,densityFogFactor:Yb,depth:qp,depthPass:Tb,determinant:fs,difference:ys,diffuseColor:ca,diffuseContribution:la,directPointLight:rC,directionToColor:Kd,directionToFaceDirection:zu,dispersion:La,disposeShadowMaterial:jS,distance:vs,div:$a,dot:bs,drawIndex:Fc,dynamicBufferAttribute:Ec,element:ta,emissive:ua,equal:to,equirectDirection:bm,equirectUV:ym,exp:Mo,exp2:No,exponentialHeightFogFactor:Xb,expression:Kc,faceDirection:Lu,faceForward:Fs,faceforward:Bs,float:F,floatBitsToInt:gv,floatBitsToUint:_v,floor:Ro,fog:Zb,fract:Vo,frameGroup:Ha,frameId:Gv,frontFacing:Iu,fwidth:us,gain:Dv,gapSize:Aa,getConstNodeType:ki,getCurrentStack:Ri,getDirection:eg,getDistanceAttenuation:nC,getGeometryRoughness:Wm,getNormalFromDepth:Ay,getParallaxCorrectNormal:Pw,getRoughness:Gm,getScreenPosition:ky,getShIrradianceAt:Fw,getShadowMaterial:AS,getShadowRenderObjectFunction:PS,getTextureIndex:fv,getViewPosition:Oy,ggxConvolution:cg,globalId:ax,glsl:Hb,glslFn:Gb,grayscale:ub,greaterThan:io,greaterThanEqual:oo,hash:Tv,highpModelNormalViewMatrix:Du,highpModelViewMatrix:Eu,hue:pb,increment:bo,incrementBefore:vo,inspector:rl,instance:np,instanceColor:tp,instanceIndex:jc,instancedArray:Ry,instancedBufferAttribute:Dc,instancedDynamicBufferAttribute:Oc,instancedMesh:rp,int:I,intBitsToFloat:vv,interleavedGradientNoise:jy,inverse:ps,inverseSqrt:Lo,inversesqrt:Vs,invocationLocalIndex:Pc,invocationSubgroupIndex:Nc,ior:Ma,iridescence:_a,iridescenceIOR:va,iridescenceThickness:ya,isolate:Bc,ivec2:Ui,ivec3:Ki,ivec4:Yi,js:Bb,label:Ys,length:ns,lengthSq:As,lessThan:ro,lessThanEqual:ao,lightPosition:nS,lightProjectionUV:tS,lightShadowMatrix:eS,lightTargetDirection:aS,lightTargetPosition:rS,lightViewPosition:iS,lightingContext:Dp,lights:mS,linearDepth:Jp,linearToneMapping:Ob,localId:ox,log:Po,log2:Fo,logarithmicDepthToViewZ:Gp,luminance:mb,mat2:Qi,mat3:$i,mat4:ea,matcapUV:Qg,materialAO:If,materialAlphaTest:$d,materialAnisotropy:yf,materialAnisotropyVector:Lf,materialAttenuationColor:Df,materialAttenuationDistance:Ef,materialClearcoat:pf,materialClearcoatNormal:hf,materialClearcoatRoughness:mf,materialColor:ef,materialDispersion:Pf,materialEmissive:nf,materialEnvIntensity:ed,materialEnvRotation:td,materialIOR:Tf,materialIridescence:bf,materialIridescenceIOR:xf,materialIridescenceThickness:Sf,materialLightMap:Ff,materialLineDashOffset:Mf,materialLineDashSize:kf,materialLineGapSize:Af,materialLineScale:Of,materialLineWidth:jf,materialMetalness:df,materialNormal:ff,materialOpacity:rf,materialPointSize:Nf,materialReference:hd,materialReflectivity:lf,materialRefractionRatio:$u,materialRotation:gf,materialRoughness:uf,materialSheen:_f,materialSheenRoughness:vf,materialShininess:tf,materialSpecular:af,materialSpecularColor:sf,materialSpecularIntensity:of,materialSpecularStrength:cf,materialThickness:wf,materialTransmission:Cf,max:hs,maxMipLevel:ll,mediumpModelViewMatrix:Tu,metalness:fa,min:ms,mix:K,mixElement:Ls,mod:eo,modelDirection:gu,modelNormalMatrix:Su,modelPosition:vu,modelRadius:xu,modelScale:yu,modelViewMatrix:wu,modelViewPosition:bu,modelViewProjection:Rf,modelWorldMatrix:_u,modelWorldMatrixInverse:Cu,morphReference:wp,mrt:pv,mul:W,mx_aastep:KC,mx_add:gw,mx_atan2:Sw,mx_cell_noise_float:dw,mx_contrast:nw,mx_divide:yw,mx_fractal_noise_float:fw,mx_fractal_noise_vec2:pw,mx_fractal_noise_vec3:mw,mx_fractal_noise_vec4:hw,mx_frame:ww,mx_heighttonormal:Nw,mx_hsvtorgb:UC,mx_ifequal:Ow,mx_ifgreater:Ew,mx_ifgreatereq:Dw,mx_invert:Tw,mx_modulo:bw,mx_multiply:vw,mx_noise_float:rw,mx_noise_vec3:iw,mx_noise_vec4:aw,mx_place2d:Aw,mx_power:xw,mx_ramp4:XC,mx_ramplr:JC,mx_ramptb:YC,mx_rgbtohsv:WC,mx_rotate2d:jw,mx_rotate3d:Mw,mx_safepower:tw,mx_separate:kw,mx_splitlr:QC,mx_splittb:$C,mx_srgb_texture_to_lin_rec709:GC,mx_subtract:_w,mx_timer:Cw,mx_transform_uv:ew,mx_unifiednoise2d:ow,mx_unifiednoise3d:sw,mx_worley_noise_float:cw,mx_worley_noise_vec2:lw,mx_worley_noise_vec3:uw,negate:rs,negateOnBackSide:Ru,neutralToneMapping:Lb,nodeArray:Ni,nodeImmutable:j,nodeObject:k,nodeObjectIntent:ji,nodeObjects:Mi,nodeProxy:A,nodeProxyConstructor:Pi,nodeProxyIntent:M,normalFlat:Hu,normalGeometry:Bu,normalLocal:Vu,normalMap:Jd,normalView:J,normalViewGeometry:Uu,normalWorld:Gu,normalWorldGeometry:Wu,normalize:Bo,not:lo,notEqual:no,numWorkgroups:rx,objectDirection:lu,objectGroup:Ua,objectPosition:du,objectRadius:mu,objectScale:fu,objectViewPosition:pu,objectWorldMatrix:uu,oneMinus:is,or:co,orthographicDepthToViewZ:Bp,oscSawtooth:Yv,oscSine:Kv,oscSquare:qv,oscTriangle:Jv,output:Oa,outputStruct:cv,overloadingFn:Hv,overrideNode:Q_,overrideNodes:$_,packHalf2x16:Nv,packNormalToRGB:Ud,packSnorm2x16:jv,packUnorm2x16:Mv,parabola:Ev,parallaxDirection:Bd,parallaxUV:Vd,parameter:tv,pass:Cb,passTexture:wb,pcurve:Ov,perspectiveDepthToViewZ:Up,pmremTexture:zg,pointShadow:eC,pointUV:zy,pointWidth:ja,positionGeometry:ku,positionLocal:Au,positionPrevious:ju,positionView:Pu,positionViewDirection:Fu,positionWorld:Mu,positionWorldDirection:Nu,posterize:gb,pow:Ss,pow2:Cs,pow3:ws,pow4:Ts,premultiplyAlpha:Yc,property:oa,quadBroadcast:Zx,quadSwapDiagonal:Gx,quadSwapX:Ux,quadSwapY:Wx,radians:Ao,rand:Is,range:ex,rangeFogFactor:Jb,reciprocal:cs,reference:fd,referenceBuffer:pd,reflect:_s,reflectVector:id,reflectView:nd,reflector:by,refract:Ns,refractVector:ad,refractView:rd,reinhardToneMapping:kb,remap:Uc,remapClamp:Wc,renderGroup:V,renderOutput:Qc,rendererReference:_c,replaceDefaultUV:Xv,rotate:t_,rotateUV:Zv,roughness:da,round:ss,rtt:Ey,sRGBTransferEOTF:ac,sRGBTransferOETF:oc,sample:Py,sampler:_l,samplerComparison:vl,saturate:Ms,saturation:db,screenCoordinate:jl,screenDPR:Ol,screenSize:Al,screenUV:kl,select:Hs,setCurrentStack:Li,setName:Ks,shaderStages:Fr,shadow:VS,shadowPositionWorld:gS,shapeCircle:oC,sharedUniformGroup:Va,sheen:ha,sheenRoughness:ga,shiftLeft:go,shiftRight:_o,shininess:Da,sign:ts,sin:Ho,sinc:kv,sinh:Uo,skinning:pp,smoothstep:Ps,smoothstepElement:Rs,specularColor:wa,specularColorBlended:Ta,specularF90:Ea,spherizeUV:Qv,split:ra,spritesheetUV:ty,sqrt:Io,stack:nv,step:gs,stepElement:zs,storage:Yf,storageBarrier:ux,storageTexture:Gy,storageTexture3D:qy,struct:ov,sub:U,subBuild:nc,subgroupAdd:kx,subgroupAll:Bx,subgroupAnd:Fx,subgroupAny:Vx,subgroupBallot:Ox,subgroupBroadcast:Kx,subgroupBroadcastFirst:Hx,subgroupElect:Dx,subgroupExclusiveAdd:jx,subgroupExclusiveMul:Px,subgroupInclusiveAdd:Ax,subgroupInclusiveMul:Nx,subgroupIndex:Mc,subgroupMax:zx,subgroupMin:Rx,subgroupMul:Mx,subgroupOr:Ix,subgroupShuffle:qx,subgroupShuffleDown:Xx,subgroupShuffleUp:Yx,subgroupShuffleXor:Jx,subgroupSize:sx,subgroupXor:Lx,tan:Ko,tangentGeometry:Ad,tangentLocal:jd,tangentView:Md,tangentWorld:Nd,tanh:qo,texture:q,texture3D:Yy,texture3DLevel:Zy,texture3DLoad:Xy,textureBarrier:dx,textureBicubic:Sh,textureBicubicLevel:xh,textureCubeUV:tg,textureLevel:gl,textureLoad:hl,textureSize:cl,textureStore:Ky,thickness:Pa,time:Uv,toneMapping:yc,toneMappingExposure:bc,toonOutlinePass:Db,transformDirection:Es,transformNormal:qu,transformNormalByInverseViewMatrix:Os,transformNormalByViewMatrix:Ds,transformNormalToView:Ju,transformedClearcoatNormalView:Zu,transformedNormalView:Yu,transformedNormalWorld:Xu,transmission:Na,transpose:ds,triNoise3D:Bv,triplanarTexture:ry,triplanarTextures:ny,trunc:ls,uint:L,uintBitsToFloat:yv,uniform:H,uniformArray:Cl,uniformCubeTexture:ld,uniformFlow:Gs,uniformGroup:Ba,uniformTexture:ml,unpackHalf2x16:Lv,unpackNormal:Gd,unpackRGBToNormal:Wd,unpackSnorm2x16:Fv,unpackUnorm2x16:Iv,unpremultiplyAlpha:Xc,userData:$y,uv:sl,uvec2:Wi,uvec3:qi,uvec4:Xi,varying:rc,varyingProperty:sa,vec2:R,vec3:z,vec4:B,vectorComponents:Ir,velocity:ib,vertexColor:am,vertexIndex:Ac,vertexStage:ic,vibrance:fb,viewZToLogarithmicDepth:Wp,viewZToOrthographicDepth:Rp,viewZToPerspectiveDepth:Vp,viewZToReversedOrthographicDepth:zp,viewZToReversedPerspectiveDepth:Hp,viewport:Ml,viewportCoordinate:Pl,viewportDepthTexture:Ip,viewportLinearDepth:Yp,viewportMipTexture:Mp,viewportOpaqueMipTexture:Pp,viewportResolution:Il,viewportSafeUV:ey,viewportSharedTexture:vb,viewportSize:Nl,viewportTexture:jp,viewportUV:Fl,vogelDiskSample:My,wgsl:Vb,wgslFn:Kb,workgroupArray:mx,workgroupBarrier:lx,workgroupId:ix,workingToColorSpace:uc,xor:uo}),Iw=new X_,Lw=class extends y_{constructor(e,t){super(),this.renderer=e,this.nodes=t}update(e,t,n){let r=this.renderer,i=this.nodes.getBackgroundNode(e)||e.background,a=!1;if(i===null)r._clearColor.getRGB(Iw),Iw.a=r._clearColor.a;else if(i.isColor===!0)i.getRGB(Iw),Iw.a=1,a=!0;else if(i.isNode===!0){let n=this.get(e),a=i;Iw.copy(r._clearColor);let o=n.backgroundMesh;if(o===void 0){let e=B(a).mul(Hy).context({getUV:()=>Uy.mul(Wu),getTextureLevel:()=>Vy}),t=eu.element(3).element(3).equal(1),r=$a(1,eu.element(1).element(1)).mul(3),s=t.select(Au.mul(r),Au),c=wu.mul(B(s,0)),l=eu.mul(B(c.xyz,1));l=l.setZ(l.w);let u=new om;u.name=`Background.material`,u.side=1,u.depthTest=!1,u.depthWrite=!1,u.allowOverride=!1,u.fog=!1,u.lights=!1,u.vertexNode=l,u.colorNode=e,n.backgroundMeshNode=e,n.backgroundMesh=o=new ft(new Me(1,32,32),u),o.frustumCulled=!1,o.name=`Background.mesh`;function d(){i.removeEventListener(`dispose`,d),o.material.dispose(),o.geometry.dispose()}i.addEventListener(`dispose`,d)}let s=a.getCacheKey();n.backgroundCacheKey!==s&&(n.backgroundMeshNode.node=B(a).mul(Hy),n.backgroundMeshNode.needsUpdate=!0,o.material.needsUpdate=!0,n.backgroundCacheKey=s),t.unshift(o,o.geometry,o.material,0,0,null,null)}else C(`Renderer: Unsupported background configuration.`,i);let o=r.xr.getEnvironmentBlendMode();if(o===`additive`?Iw.set(0,0,0,1):o===`alpha-blend`&&Iw.set(0,0,0,0),r.autoClear===!0||a===!0){let e=n.clearColorValue;e.r=Iw.r,e.g=Iw.g,e.b=Iw.b,e.a=Iw.a,(r.backend.isWebGLBackend===!0||r.alpha===!0)&&(e.r*=e.a,e.g*=e.a,e.b*=e.a),n.depthClearValue=r.getClearDepth(),n.stencilClearValue=r.getClearStencil(),n.clearColor=r.autoClearColor===!0,n.clearDepth=r.autoClearDepth===!0,n.clearStencil=r.autoClearStencil===!0}else n.clearColor=!1,n.clearDepth=!1,n.clearStencil=!1}},Rw=0,zw=class{constructor(e=``,t=[]){this.name=e,this.bindings=t,this.id=Rw++}},Bw=class{constructor(e,t,n,r,i,a,o,s,c,l,u=[]){this.vertexShader=e,this.fragmentShader=t,this.computeShader=n,this.transforms=u,this.nodeAttributes=r,this.bindings=i,this.updateNodes=a,this.updateBeforeNodes=o,this.updateAfterNodes=s,this.observer=c,this.hardwareClipping=l,this.usedTimes=0}createBindings(){let e=[];for(let t of this.bindings)if(t.bindings[0].groupNode.shared!==!0){let n=new zw(t.name,[]);e.push(n);for(let e of t.bindings)n.bindings.push(e.clone())}else e.push(t);return e}},Vw=class{constructor(e,t,n=null){this.isNodeAttribute=!0,this.name=e,this.type=t,this.node=n}},Hw=class{constructor(e,t,n){this.isNodeUniform=!0,this.name=e,this.type=t,this.node=n}get value(){return this.node.value}set value(e){this.node.value=e}get id(){return this.node.id}get groupNode(){return this.node.groupNode}},Uw=class{constructor(e,t,n=!1,r=null){this.isNodeVar=!0,this.name=e,this.type=t,this.readOnly=n,this.count=r}},Ww=class extends Uw{constructor(e,t,n=null,r=null){super(e,t),this.needsInterpolation=!1,this.isNodeVarying=!0,this.interpolationType=n,this.interpolationSampling=r}},Gw=class{constructor(e,t,n=``){this.name=e,this.type=t,this.code=n,Object.defineProperty(this,"isNodeCode",{value:!0})}},Kw=0,qw=class{constructor(e=null){this.id=Kw++,this.nodesData=new WeakMap,this.parent=e}getData(e){let t=this.nodesData.get(e);return t===void 0&&this.parent!==null&&(t=this.parent.getData(e)),t}setData(e,t){this.nodesData.set(e,t)}},Jw=class{constructor(e,t){this.name=e,this.members=t,this.output=!1}},Yw=class{constructor(e,t){this.name=e,this.value=t,this.boundary=0,this.itemSize=0,this.offset=0,this.index=-1}setValue(e){this.value=e}getValue(){return this.value}},Xw=class extends Yw{constructor(e,t=0){super(e,t),this.isNumberUniform=!0,this.boundary=4,this.itemSize=1}},Zw=class extends Yw{constructor(e,t=new hn){super(e,t),this.isVector2Uniform=!0,this.boundary=8,this.itemSize=2}},Qw=class extends Yw{constructor(e,t=new w){super(e,t),this.isVector3Uniform=!0,this.boundary=16,this.itemSize=3}},$w=class extends Yw{constructor(e,t=new bt){super(e,t),this.isVector4Uniform=!0,this.boundary=16,this.itemSize=4}},eT=class extends Yw{constructor(e,t=new de){super(e,t),this.isColorUniform=!0,this.boundary=16,this.itemSize=3}},tT=class extends Yw{constructor(e,t=new fn){super(e,t),this.isMatrix2Uniform=!0,this.boundary=8,this.itemSize=4}},nT=class extends Yw{constructor(e,t=new On){super(e,t),this.isMatrix3Uniform=!0,this.boundary=48,this.itemSize=12}},rT=class extends Yw{constructor(e,t=new Kt){super(e,t),this.isMatrix4Uniform=!0,this.boundary=64,this.itemSize=16}},iT=class extends Xw{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},aT=class extends Zw{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},oT=class extends Qw{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},sT=class extends $w{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},cT=class extends eT{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},lT=class extends tT{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},uT=class extends nT{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},dT=class extends rT{constructor(e){super(e.name,e.value),this.nodeUniform=e}getValue(){return this.nodeUniform.value}getType(){return this.nodeUniform.type}},fT=0,pT=new WeakMap,mT=new WeakMap,hT=new WeakMap,gT=new Map([[Int8Array,`int`],[Int16Array,`int`],[Int32Array,`int`],[Uint8Array,`uint`],[Uint16Array,`uint`],[Uint32Array,`uint`],[Float32Array,`float`]]),_T=e=>/e/g.test(e)?String(e).replace(/\+/g,``):(e=Number(e),e+(e%1?``:`.0`)),vT=e=>{if(e.writeUsageCount>0)return!0;if(e.subBuildsCache!==void 0){for(let t in e.subBuildsCache)if(vT(e.subBuildsCache[t]))return!0}return!1},yT=class{constructor(e,t,n){this.object=e,this.material=e&&e.material||null,this.geometry=e&&e.geometry||null,this.renderer=t,this.parser=n,this.scene=null,this.camera=null,this.nodes=new Set,this.sequentialNodes=new Set,this.updateNodes=[],this.updateBeforeNodes=[],this.updateAfterNodes=[],this.hashNodes={},this.observer=null,this.lightsNode=null,this.environmentNode=null,this.fogNode=null,this.clippingContext=null,this.hardwareClipping=!1,this.vertexShader=null,this.fragmentShader=null,this.computeShader=null,this.flowNodes={vertex:[],fragment:[],compute:[]},this.flowCode={vertex:``,fragment:``,compute:``},this.uniforms={vertex:[],fragment:[],compute:[],index:0},this.structs={vertex:[],fragment:[],compute:[],index:0},this.types={vertex:[],fragment:[],compute:[],index:0},this.bindings={vertex:{},fragment:{},compute:{}},this.bindingsIndexes={},this.bindGroups=null,this.attributes=[],this.bufferAttributes=[],this.varyings=[],this.codes={},this.vars={},this.declarations={},this.flow={code:``},this.chaining=[],this.stack=nv(),this.stacks=[],this.tab=`	`,this.currentFunctionNode=null,this.context={material:this.material},this.cache=new qw,this.globalCache=this.cache,this.flowsData=new WeakMap,this.shaderStage=null,this.buildStage=null,this.subBuildLayers=[],this.activeStacks=[],this.subBuildFn=null,this.fnCall=null,Object.defineProperty(this,"id",{value:fT++})}isFlatShading(){return this.material.flatShading===!0||this.geometry.hasAttribute(`normal`)===!1}isOpaque(){let e=this.material;return e.transparent===!1&&e.blending===1&&e.alphaToCoverage===!1}createRenderTarget(e,t,n){return new Xn(e,t,n)}createCubeRenderTarget(e,t){return new xm(e,t)}includes(e){return this.nodes.has(e)}getOutputType(e=0){let t=`vec4`,n=this.renderer.getRenderTarget();if(n!==null){let r=n.textures[e].type,i=n.textures[e].format,a=`vec`;r===1013?a=`ivec`:r===1014&&(a=`uvec`),t=i===1028||i===1029?r===1013?`int`:r===1014?`uint`:`float`:i===1030||i===1031?`${a}2`:i===1022||i===1032?`${a}3`:`${a}4`}return t}getOutputStructName(){}_getBindGroup(e,t){let n=t[0].groupNode,r=n.shared;if(r)for(let e=1;e<t.length;e++)n!==t[e].groupNode&&(r=!1);let i;if(r){let n=``;for(let e of t)if(e.isNodeUniformsGroup){e.uniforms.sort((e,t)=>e.nodeUniform.node.id-t.nodeUniform.node.id);for(let t of e.uniforms)n+=t.nodeUniform.node.id}else n+=e.nodeUniform.id;let r=this.renderer._currentRenderContext||this.renderer,a=pT.get(r);a===void 0&&(a=new Map,pT.set(r,a));let o=hr(n);i=a.get(o),i===void 0&&(i=new zw(e,t),a.set(o,i))}else i=new zw(e,t);return i}getBindGroupArray(e,t){let n=this.bindings[t],r=n[e];return r===void 0&&(this.bindingsIndexes[e]===void 0&&(this.bindingsIndexes[e]={binding:0,group:Object.keys(this.bindingsIndexes).length}),n[e]=r=[]),r}getBindings(){let e=this.bindGroups;if(e===null){let t={},n=this.bindings;for(let e of Fr)for(let r in n[e]){let i=n[e][r],a=t[r]||(t[r]=[]);for(let e of i)a.includes(e)===!1&&a.push(e)}e=[];for(let n in t){let r=t[n],i=this._getBindGroup(n,r);e.push(i)}this.bindGroups=e}return e}sortBindingGroups(){let e=this.getBindings();e.sort((e,t)=>e.bindings[0].groupNode.order-t.bindings[0].groupNode.order);for(let t=0;t<e.length;t++){let n=e[t];this.bindingsIndexes[n.name].group=t}}setHashNode(e,t){this.hashNodes[t]=e}addNode(e){this.nodes.has(e)===!1&&(this.nodes.add(e),this.setHashNode(e,e.getHash(this)))}addSequentialNode(e){let t=e.getUpdateBeforeType(),n=e.getUpdateAfterType();(t!==E.NONE||n!==E.NONE)&&this.sequentialNodes.add(e)}buildUpdateNodes(){for(let e of this.nodes)e.getUpdateType()!==E.NONE&&this.updateNodes.push(e);for(let e of this.sequentialNodes){let t=e.getUpdateBeforeType(),n=e.getUpdateAfterType();t!==E.NONE&&this.updateBeforeNodes.push(e),n!==E.NONE&&this.updateAfterNodes.push(e)}}get currentNode(){return this.chaining[this.chaining.length-1]}isFilteredTexture(e){return e.magFilter===1006||e.magFilter===1007||e.magFilter===1005||e.magFilter===1008||e.minFilter===1006||e.minFilter===1007||e.minFilter===1005||e.minFilter===1008}getUniformBufferLimit(){return this.renderer.backend.capabilities.getUniformBufferLimit()}addChain(e){this.chaining.push(e)}removeChain(e){if(this.chaining.pop()!==e)throw Error(`THREE.NodeBuilder: Invalid node chaining!`)}getMethod(e){return e}getTernary(){return null}getNodeFromHash(e){return this.hashNodes[e]}addFlow(e,t){return this.flowNodes[e].push(t),t}setContext(e){this.context=e}getContext(){return this.context}addContext(e){let t=this.getContext();return this.setContext({...this.context,...e}),t}getSharedContext(){let e={...this.context};return delete e.material,delete e.getUV,delete e.getOutput,delete e.getTextureLevel,delete e.getAO,delete e.getShadow,e}setCache(e){this.cache=e}getCache(){return this.cache}getCacheFromNode(e,t=!0){let n=this.getDataFromNode(e);return n.cache===void 0&&(n.cache=new qw(t?this.getCache():null)),n.cache}isAvailable(){return!1}getVertexIndex(){T(`Abstract function.`)}getInstanceIndex(){T(`Abstract function.`)}getDrawIndex(){T(`Abstract function.`)}getFrontFacing(){T(`Abstract function.`)}getFragCoord(){T(`Abstract function.`)}isFlipY(){return!1}isContextAssign(){return this.context.assign===!0}increaseUsage(e){let t=this.getDataFromNode(e);return t.usageCount=t.usageCount===void 0?1:t.usageCount+1,this.isContextAssign()?t.writeUsageCount=t.writeUsageCount===void 0?1:t.writeUsageCount+1:t.readUsageCount=t.readUsageCount===void 0?1:t.readUsageCount+1,t.usageCount}hasWriteUsage(e){let t=e.getShared(this),n=(t.isGlobal(this)?this.globalCache:this.cache).getData(t);if(n!==void 0){for(let e in n)if(vT(n[e]))return!0}return!1}generateTexture(){T(`Abstract function.`)}generateTextureLod(){T(`Abstract function.`)}generateArrayDeclaration(e,t){return this.getType(e)+`[ `+t+` ]`}generateArray(e,t,n=null){let r=this.generateArrayDeclaration(e,t)+`( `;for(let i=0;i<t;i++){let a=n?n[i]:null;r+=a===null?this.generateConst(e):a.build(this,e),i<t-1&&(r+=`, `)}return r+=` )`,r}generateStruct(e,t,n=null){let r=[];for(let e of t){let{name:t,type:i}=e;n&&n[t]&&n[t].isNode?r.push(n[t].build(this,i)):r.push(this.generateConst(i))}return e+`( `+r.join(`, `)+` )`}generateConst(e,t=null){if(t===null&&(e===`float`||e===`int`||e===`uint`?t=0:e===`bool`?t=!1:e===`color`?t=new de:e===`vec2`||e===`uvec2`||e===`ivec2`?t=new hn:e===`vec3`||e===`uvec3`||e===`ivec3`?t=new w:(e===`vec4`||e===`uvec4`||e===`ivec4`)&&(t=new bt)),e===`float`)return _T(t);if(e===`int`)return`${Math.round(t)}`;if(e===`uint`)return t>=0?`${Math.round(t)}u`:`0u`;if(e===`bool`)return t?`true`:`false`;if(e===`color`)return`${this.getType(`vec3`)}( ${_T(t.r)}, ${_T(t.g)}, ${_T(t.b)} )`;let n=this.getTypeLength(e),r=this.getComponentType(e),i=e=>this.generateConst(r,e);if(n===2)return`${this.getType(e)}( ${i(t.x)}, ${i(t.y)} )`;if(n===3)return`${this.getType(e)}( ${i(t.x)}, ${i(t.y)}, ${i(t.z)} )`;if(n===4&&e!==`mat2`)return`${this.getType(e)}( ${i(t.x)}, ${i(t.y)}, ${i(t.z)}, ${i(t.w)} )`;if(n>=4&&t&&(t.isMatrix2||t.isMatrix3||t.isMatrix4))return`${this.getType(e)}( ${t.elements.map(i).join(`, `)} )`;if(n>4)return`${this.getType(e)}()`;throw Error(`THREE.NodeBuilder: Type '${e}' not found in generate constant attempt.`)}getType(e){return e===`color`?`vec3`:e}hasGeometryAttribute(e){return this.geometry&&this.geometry.getAttribute(e)!==void 0}getAttribute(e,t){let n=this.attributes;for(let t of n)if(t.name===e)return t;let r=new Vw(e,t);return this.registerDeclaration(r),n.push(r),r}getPropertyName(e){return e.name}isVector(e){return/vec\d/.test(e)}isMatrix(e){return/mat\d/.test(e)}isReference(e){return e===`void`||e===`property`||e===`sampler`||e===`samplerComparison`||e===`texture`||e===`cubeTexture`||e===`storageTexture`||e===`depthTexture`||e===`texture3D`}needsToWorkingColorSpace(){return!1}getComponentTypeFromTexture(e){let t=e.type;return e.isDepthTexture===!0?`float`:t===1013?`int`:t===1014?`uint`:`float`}getElementType(e){return e===`mat2`?`vec2`:e===`mat3`?`vec3`:e===`mat4`?`vec4`:this.getComponentType(e)}getComponentType(e){if(e=this.getVectorType(e),e===`float`||e===`bool`||e===`int`||e===`uint`)return e;let t=/(b|i|u|)(vec|mat)([2-4])/.exec(e);return t===null?null:t[1]===`b`?`bool`:t[1]===`i`?`int`:t[1]===`u`?`uint`:`float`}getVectorType(e){return e===`color`?`vec3`:e===`texture`||e===`cubeTexture`||e===`storageTexture`||e===`texture3D`?`vec4`:e}getTypeFromLength(e,t=`float`){if(e===1)return t;let n=br(e),r=t===`float`?``:t[0];return/mat2/.test(t)===!0&&(n=n.replace(`vec`,`mat`)),r+n}getTypeFromArray(e){return gT.get(e.constructor)}isInteger(e){return/int|uint|(i|u)vec/.test(e)}getTypeFromAttribute(e){let t=e;e.isInterleavedBufferAttribute&&(t=e.data);let n=t.array,r=e.itemSize,i=e.normalized,a;return!(e instanceof Wt)&&i!==!0&&(a=this.getTypeFromArray(n)),this.getTypeFromLength(r,a)}getTypeLength(e){let t=this.getVectorType(e),n=/vec([2-4])/.exec(t);return n===null?t===`float`||t===`bool`||t===`int`||t===`uint`?1:/mat2/.test(e)===!0?4:/mat3/.test(e)===!0?9:/mat4/.test(e)===!0?16:0:Number(n[1])}getVectorFromMatrix(e){return e.replace(`mat`,`vec`)}changeComponentType(e,t){return this.getTypeFromLength(this.getTypeLength(e),t)}getIntegerType(e){let t=this.getComponentType(e);return t===`int`||t===`uint`?e:this.changeComponentType(e,`int`)}setActiveStack(e){this.activeStacks.push(e)}removeActiveStack(e){if(this.activeStacks[this.activeStacks.length-1]===e)this.activeStacks.pop();else throw Error(`THREE.NodeBuilder: Invalid active stack removal.`)}getActiveStack(){return this.activeStacks[this.activeStacks.length-1]}getBaseStack(){return this.activeStacks[0]}addStack(){this.stack=nv(this.stack);let e=Ri();return this.stacks.push(e),Li(this.stack),this.stack}removeStack(){let e=this.stack;for(let t of e.nodes){let n=this.getDataFromNode(t);n.stack=e}return this.stack=e.parent,Li(this.stacks.pop()),e}getDataFromNode(e,t=this.shaderStage,n=null){n=n===null?e.isGlobal(this)?this.globalCache:this.cache:n;let r=n.getData(e);r===void 0&&(r={},n.setData(e,r)),r[t]===void 0&&(r[t]={});let i=r[t];if(this.subBuildLayers.length===0)return i;let a=r.any?r.any.subBuilds:null,o=this.getClosestSubBuild(a);return o&&(i.subBuildsCache===void 0&&(i.subBuildsCache={}),i=i.subBuildsCache[o]||(i.subBuildsCache[o]={}),i.subBuilds=a),i}getNodeProperties(e,t=`any`){let n=this.getDataFromNode(e,t);return n.properties||={outputNode:null}}getBufferAttributeFromNode(e,t,n=null){let r=this.getDataFromNode(e,`vertex`),i=r.bufferAttribute;if(i===void 0){let a=this.uniforms.index++;n===null&&(n=`nodeAttribute`+a),i=new Vw(n,t,e),this.bufferAttributes.push(i),r.bufferAttribute=i}return i}getStructTypeNode(e,t=this.shaderStage){return this.types[t][e]||null}getStructTypeFromNode(e,t,n=null,r=this.shaderStage){let i=this.getDataFromNode(e,r,this.globalCache),a=i.structType;if(a===void 0){let o=this.structs.index++;n===null&&(n=`StructType`+o),a=new Jw(n,t),this.structs[r].push(a),this.types[r][n]=e,i.structType=a}return a}getOutputStructTypeFromNode(e,t){let n=this.getStructTypeFromNode(e,t,`OutputType`,`fragment`);return n.output=!0,n}getUniformFromNode(e,t,n=this.shaderStage,r=null){let i=this.getDataFromNode(e,n,this.globalCache),a=i.uniform;if(a===void 0){let o=this.uniforms.index++;a=new Hw(r||`nodeUniform`+o,t,e),this.uniforms[n].push(a),this.registerDeclaration(a),i.uniform=a}return a}getVarFromNode(e,t=null,n=e.getNodeType(this),r=this.shaderStage,i=!1){let a=this.getDataFromNode(e,r),o=this.getSubBuildProperty(`variable`,a.subBuilds),s=a[o];if(s===void 0){let c=i?`_const`:`_var`,l=this.vars[r]||(this.vars[r]=[]),u=this.vars[c]||(this.vars[c]=0);t===null&&(t=(i?`nodeConst`:`nodeVar`)+u,this.vars[c]++),o!==`variable`&&(t=this.getSubBuildProperty(t,a.subBuilds));let d=e.getArrayCount(this);s=new Uw(t,n,i,d),i||l.push(s),this.registerDeclaration(s),a[o]=s}return s}isDeterministic(e){if(e.isMathNode)return this.isDeterministic(e.aNode)&&(!e.bNode||this.isDeterministic(e.bNode))&&(!e.cNode||this.isDeterministic(e.cNode));if(e.isOperatorNode)return this.isDeterministic(e.aNode)&&(!e.bNode||this.isDeterministic(e.bNode));if(e.isArrayNode){if(e.values!==null){for(let t of e.values)if(!this.isDeterministic(t))return!1}return!0}return!!e.isConstNode}getVaryingFromNode(e,t=null,n=e.getNodeType(this),r=null,i=null){let a=this.getDataFromNode(e,`any`),o=this.getSubBuildProperty(`varying`,a.subBuilds),s=a[o];if(s===void 0){let e=this.varyings,c=e.length;t===null&&(t=`nodeVarying`+c),o!==`varying`&&(t=this.getSubBuildProperty(t,a.subBuilds)),s=new Ww(t,n,r,i),e.push(s),this.registerDeclaration(s),a[o]=s}return s}registerDeclaration(e){let t=this.shaderStage,n=this.declarations[t]||(this.declarations[t]={}),r=e.name,i=r,a=this.getPropertyName(e),o=1;for(;n[a]!==void 0;)i=r+`_`+o++,e.name=i,a=this.getPropertyName(e);i!==r&&T(`TSL: Declaration name '${r}' of '${e.type}' already in use. Renamed to '${i}'.`),n[a]=e}getCodeFromNode(e,t,n=this.shaderStage){let r=this.getDataFromNode(e),i=r.code;if(i===void 0){let e=this.codes[n]||(this.codes[n]=[]),a=e.length;i=new Gw(`nodeCode`+a,t),e.push(i),r.code=i}return i}addFlowCodeHierarchy(e,t){let{flowCodes:n,flowCodeBlock:r}=this.getDataFromNode(e),i=!0,a=t;for(;a;){if(r.get(a)===!0){i=!1;break}a=this.getDataFromNode(a).parentNodeBlock}if(i)for(let e of n)this.addLineFlowCode(e)}addLineFlowCodeBlock(e,t,n){let r=this.getDataFromNode(e),i=r.flowCodes||=[],a=r.flowCodeBlock||=new WeakMap;i.push(t),a.set(n,!0)}addLineFlowCode(e,t=null){return e===``?this:(t!==null&&this.context.nodeBlock&&this.addLineFlowCodeBlock(t,e,this.context.nodeBlock),e=this.tab+e,/;\s*$/.test(e)||(e+=`;
`),this.flow.code+=e,this)}addFlowCode(e){return this.flow.code+=e,this}addFlowTab(){return this.tab+=`	`,this}removeFlowTab(){return this.tab=this.tab.slice(0,-1),this}getFlowData(e){return this.flowsData.get(e)}flowNode(e){let t=e.getNodeType(this),n=this.flowChildNode(e,t);return this.flowsData.set(e,n),n}addInclude(e){this.currentFunctionNode!==null&&this.currentFunctionNode.includes.push(e)}buildFunctionNode(e){let t=this.renderer.backend,n=mT.get(t);n===void 0&&(n=new WeakMap,mT.set(t,n));let r=n.get(e);if(r===void 0){r=new Ub;let t=this.currentFunctionNode;this.currentFunctionNode=r,r.code=this.buildFunctionCode(e),this.currentFunctionNode=t,n.set(e,r)}return r}flowShaderNode(e){let t=e.layout,n={[Symbol.iterator](){let e=0,t=Object.values(this);return{next:()=>({value:t[e],done:e++>=t.length})}}};for(let e of t.inputs)n[e.name]=new ev(e.type,e.name);e.layout=null;let r=e.call(n),i=this.flowStagesNode(r,t.type);return e.layout=t,i}flowBuildStage(e,t,n=null){let r=this.getBuildStage();this.setBuildStage(t);let i=e.build(this,n);return this.setBuildStage(r),i}flowStagesNode(e,t=null){let n=this.flow,r=this.vars,i=this.declarations,a=this.cache,o=this.buildStage,s=this.stack,c={code:``};this.flow=c,this.vars={},this.declarations={},this.cache=new qw,this.stack=nv();for(let n of Pr)this.setBuildStage(n),c.result=e.build(this,t);return c.vars=this.getVars(this.shaderStage),this.flow=n,this.vars=r,this.declarations=i,this.cache=a,this.stack=s,this.setBuildStage(o),c}getFunctionOperator(){return null}buildFunctionCode(){T(`Abstract function.`)}flowChildNode(e,t=null){let n=this.flow,r={code:``};return this.flow=r,r.result=e.build(this,t),this.flow=n,r}flowNodeFromShaderStage(e,t,n=null,r=null){let i=this.tab,a=this.cache,o=this.shaderStage,s=this.context;this.setShaderStage(e);let c={...this.context};delete c.nodeBlock,this.cache=this.globalCache,this.tab=`	`,this.context=c;let l=null;if(this.buildStage===`generate`){let i=this.flowChildNode(t,n);r!==null&&(i.code+=`${this.tab+r} = ${i.result};\n`),this.flowCode[e]=this.flowCode[e]+i.code,l=i}else l=t.build(this);return this.setShaderStage(o),this.cache=a,this.tab=i,this.context=s,l}getAttributesArray(){return this.attributes.concat(this.bufferAttributes)}getAttributes(){T(`Abstract function.`)}getVaryings(){T(`Abstract function.`)}getVar(e,t,n=null){return`${n===null?this.getType(e):this.generateArrayDeclaration(e,n)} ${t}`}getVars(e,t=!1){let n=[],r=this.vars[e];if(r!==void 0)for(let e of r)n.push(`${this.getVar(e.type,e.name,e.count)};`);return n.join(t?`
`:`
	`)}getUniforms(){T(`Abstract function.`)}getCodes(e){let t=this.codes[e],n=``;if(t!==void 0)for(let e of t)n+=e.code+`
`;return n}getHash(){return this.vertexShader+this.fragmentShader+this.computeShader}setShaderStage(e){this.shaderStage=e}getShaderStage(){return this.shaderStage}setBuildStage(e){this.buildStage=e}getBuildStage(){return this.buildStage}buildCode(){T(`Abstract function.`)}get subBuild(){return this.subBuildLayers[this.subBuildLayers.length-1]||null}addSubBuild(e){this.subBuildLayers.push(e)}removeSubBuild(){return this.subBuildLayers.pop()}getClosestSubBuild(e){let t;if(t=e&&e.isNode?e.isShaderCallNodeInternal?e.shaderNode.subBuilds:e.isStackNode?[e.subBuild]:this.getDataFromNode(e,`any`).subBuilds:e instanceof Set?[...e]:e,!t)return null;let n=this.subBuildLayers;for(let e=t.length-1;e>=0;e--){let r=t[e];if(n.includes(r))return r}return null}getSubBuildOutput(e){return this.getSubBuildProperty(`outputNode`,e)}getSubBuildProperty(e=``,t=null){let n;n=t===null?this.subBuildFn:this.getClosestSubBuild(t);let r;return r=n?e?n+`_`+e:n:e,r}prebuild(){let{object:e,renderer:t,material:n}=this;if(t.contextNode.isContextNode===!0?this.context={...this.context,...t.contextNode.getFlowContextData()}:C('NodeBuilder: "renderer.contextNode" must be an instance of `context()`.'),n&&n.contextNode&&(n.contextNode.isContextNode===!0?this.context={...this.context,...n.contextNode.getFlowContextData()}:C('NodeBuilder: "material.contextNode" must be an instance of `context()`.')),n!==null){let e=t.library.fromMaterial(n);e===null&&(C(`NodeBuilder: Material "${n.type}" is not compatible.`),e=new om),e.build(this)}else this.addFlow(`compute`,e)}build(){this.prebuild();for(let e of Pr){this.setBuildStage(e),this.context.position&&this.context.position.isNode&&this.flowNodeFromShaderStage(`vertex`,this.context.position);for(let t of Fr){this.setShaderStage(t);let n=this.flowNodes[t];for(let t of n)e===`generate`?this.flowNode(t):t.build(this)}}return this.setBuildStage(null),this.setShaderStage(null),this.buildCode(),this.buildUpdateNodes(),this}async buildAsync(){this.prebuild();for(let e of Pr){this.setBuildStage(e),this.context.position&&this.context.position.isNode&&this.flowNodeFromShaderStage(`vertex`,this.context.position);for(let t of Fr){this.setShaderStage(t);let n=this.flowNodes[t];for(let t of n)e===`generate`?this.flowNode(t):t.build(this);await gt()}}return this.setBuildStage(null),this.setShaderStage(null),this.buildCode(),this.buildUpdateNodes(),this}getSharedDataFromNode(e){let t=hT.get(e);return t===void 0&&(t={}),t}getNodeUniform(e,t){let n=this.getSharedDataFromNode(e),r=n.cache;if(r===void 0){if(t===`float`||t===`int`||t===`uint`)r=new iT(e);else if(t===`vec2`||t===`ivec2`||t===`uvec2`)r=new aT(e);else if(t===`vec3`||t===`ivec3`||t===`uvec3`)r=new oT(e);else if(t===`vec4`||t===`ivec4`||t===`uvec4`)r=new sT(e);else if(t===`color`)r=new cT(e);else if(t===`mat2`)r=new lT(e);else if(t===`mat3`)r=new uT(e);else if(t===`mat4`)r=new dT(e);else throw Error(`THREE.NodeBuilder: Uniform "${t}" not implemented.`);n.cache=r}return r}format(e,t,n){if(t=this.getVectorType(t),n=this.getVectorType(n),t===n||n===null||this.isReference(n))return e;let r=this.getTypeLength(t),i=this.getTypeLength(n);return r===16&&i===9?`${this.getType(n)}( ${e}[ 0 ].xyz, ${e}[ 1 ].xyz, ${e}[ 2 ].xyz )`:r===9&&i===4?`${this.getType(n)}( ${e}[ 0 ].xy, ${e}[ 1 ].xy )`:r>4||i>4||i===0?e:r===i?`${this.getType(n)}( ${e} )`:r>i?(e=n===`bool`?`all( ${e} )`:`${e}.${`xyz`.slice(0,i)}`,this.format(e,this.getTypeFromLength(i,this.getComponentType(t)),n)):i===4&&r>1?`${this.getType(n)}( ${this.format(e,t,`vec3`)}, 1.0 )`:r===2?`${this.getType(n)}( ${this.format(e,t,`vec2`)}, 0.0 )`:(r===1&&i>1&&t!==this.getComponentType(n)&&(e=`${this.getType(this.getComponentType(n))}( ${e} )`),`${this.getType(n)}( ${e} )`)}getSignature(){return`// Three.js r185 - Node System
`}needsPreviousData(){let e=this.renderer.getMRT();return e&&e.has(`velocity`)||Dr(this.object).useVelocity===!0}},bT=class{constructor(){this.time=0,this.deltaTime=0,this.frameId=0,this.renderId=0,this.updateMap=new WeakMap,this.updateBeforeMap=new WeakMap,this.updateAfterMap=new WeakMap,this.renderer=null,this.material=null,this.camera=null,this.object=null,this.scene=null}_getMaps(e,t){let n=e.get(t);return n===void 0&&(n={renderId:0,frameId:0},e.set(t,n)),n}updateBeforeNode(e){let t=e.getUpdateBeforeType(),n=e.updateReference(this);if(t===E.FRAME){let t=this._getMaps(this.updateBeforeMap,n);if(t.frameId!==this.frameId){let n=t.frameId;t.frameId=this.frameId,e.updateBefore(this)===!1&&(t.frameId=n)}}else if(t===E.RENDER){let t=this._getMaps(this.updateBeforeMap,n);if(t.renderId!==this.renderId){let n=t.renderId;t.renderId=this.renderId,e.updateBefore(this)===!1&&(t.renderId=n)}}else t===E.OBJECT&&e.updateBefore(this)}updateAfterNode(e){let t=e.getUpdateAfterType(),n=e.updateReference(this);if(t===E.FRAME){let t=this._getMaps(this.updateAfterMap,n);t.frameId!==this.frameId&&e.updateAfter(this)!==!1&&(t.frameId=this.frameId)}else if(t===E.RENDER){let t=this._getMaps(this.updateAfterMap,n);t.renderId!==this.renderId&&e.updateAfter(this)!==!1&&(t.renderId=this.renderId)}else t===E.OBJECT&&e.updateAfter(this)}updateNode(e){let t=e.getUpdateType(),n=e.updateReference(this);if(t===E.FRAME){let t=this._getMaps(this.updateMap,n);t.frameId!==this.frameId&&e.update(this)!==!1&&(t.frameId=this.frameId)}else if(t===E.RENDER){let t=this._getMaps(this.updateMap,n);t.renderId!==this.renderId&&e.update(this)!==!1&&(t.renderId=this.renderId)}else t===E.OBJECT&&e.update(this)}update(){this.frameId++,this.lastTime===void 0&&(this.lastTime=performance.now()),this.deltaTime=(performance.now()-this.lastTime)/1e3,this.lastTime=performance.now(),this.time+=this.deltaTime}},xT=class{constructor(e,t,n=null,r=``,i=!1){this.type=e,this.name=t,this.count=n,this.qualifier=r,this.isConst=i}};xT.isNodeFunctionInput=!0;var ST=class extends tC{static get type(){return`AmbientLightNode`}constructor(e=null){super(e)}setup({context:e}){e.irradiance.addAssign(this.colorNode)}},CT=class extends tC{static get type(){return`DirectionalLightNode`}constructor(e=null){super(e)}setupDirect(){let e=this.colorNode;return{lightDirection:aS(this.light),lightColor:e}}},wT=class extends tC{static get type(){return`HemisphereLightNode`}constructor(e=null){super(e),this.lightPositionNode=nS(e),this.lightDirectionNode=this.lightPositionNode.normalize(),this.groundColorNode=H(new de).setGroup(V)}update(e){let{light:t}=this;super.update(e),this.lightPositionNode.object3d=t,this.groundColorNode.value.copy(t.groundColor).multiplyScalar(t.intensity)}setup(e){let{colorNode:t,groundColorNode:n,lightDirectionNode:r}=this,i=K(n,t,Gu.dot(r).mul(.5).add(.5));e.context.irradiance.addAssign(i)}},TT=class extends tC{static get type(){return`SpotLightNode`}constructor(e=null){super(e),this.coneCosNode=H(0).setGroup(V),this.penumbraCosNode=H(0).setGroup(V),this.cutoffDistanceNode=H(0).setGroup(V),this.decayExponentNode=H(0).setGroup(V),this.colorNode=H(this.color).setGroup(V)}update(e){super.update(e);let{light:t}=this;this.coneCosNode.value=Math.cos(t.angle),this.penumbraCosNode.value=Math.cos(t.angle*(1-t.penumbra)),this.cutoffDistanceNode.value=t.distance,this.decayExponentNode.value=t.decay}getSpotAttenuation(e,t){let{coneCosNode:n,penumbraCosNode:r}=this;return Ps(n,r,t)}getLightCoord(e){let t=e.getNodeProperties(this),n=t.projectionUV;return n===void 0&&(n=tS(this.light,e.context.positionWorld),t.projectionUV=n),n}setupDirect(e){let{colorNode:t,cutoffDistanceNode:n,decayExponentNode:r,light:i}=this,a=this.getLightVector(e),o=a.normalize(),s=o.dot(aS(i)),c=this.getSpotAttenuation(e,s),l=nC({lightDistance:a.length(),cutoffDistance:n,decayExponent:r}),u=t.mul(c).mul(l),d,f;return i.colorNode?(f=this.getLightCoord(e),d=i.colorNode(f)):i.map&&(f=this.getLightCoord(e),d=q(i.map,f.xy).onRenderUpdate(()=>i.map)),d&&(u=f.mul(2).sub(1).abs().lessThan(1).all().select(u.mul(d),u)),{lightColor:u,lightDirection:o}}},ET=class extends TT{static get type(){return`IESSpotLightNode`}constructor(e=null){super(e),this._iesTextureNode=null}getSpotAttenuation(e,t){let n=this.light.iesMap,r=null;if(n&&n.isTexture===!0){let e=t.acos().mul(1/Math.PI);this._iesTextureNode=q(n,R(e,0),0),r=this._iesTextureNode.r}else r=super.getSpotAttenuation(e,t);return r}update(e){super.update(e),this._iesTextureNode!==null&&this.light.iesMap&&(this._iesTextureNode.value=this.light.iesMap)}},DT=class extends tC{static get type(){return`LightProbeNode`}constructor(e=null){super(e);let t=[];for(let e=0;e<9;e++)t.push(new w);this.lightProbe=Cl(t)}update(e){let{light:t}=this;super.update(e);for(let e=0;e<9;e++)this.lightProbe.array[e].copy(t.sh.coefficients[e]).multiplyScalar(t.intensity)}setup(e){let t=Fw(Gu,this.lightProbe);e.context.irradiance.addAssign(t)}},OT=N(([e,t])=>{let n=e.abs().sub(t);return ns(hs(n,0)).add(ms(hs(n.x,n.y),0))}),kT=class extends TT{static get type(){return`ProjectorLightNode`}update(e){super.update(e);let t=this.light;if(this.penumbraCosNode.value=Math.min(Math.cos(t.angle*(1-t.penumbra)),.99999),t.aspect===null){let e=1;t.map!==null&&(e=t.map.width/t.map.height),t.shadow.aspect=e}else t.shadow.aspect=t.aspect}getSpotAttenuation(e){let t=F(0),n=this.penumbraCosNode,r=eS(this.light).mul(e.context.positionWorld||Mu);return P(r.w.greaterThan(0),()=>{let e=OT(r.xyz.div(r.w).xy.sub(R(.5)),R(.5)),i=$a(-1,U(1,Xo(n)).sub(1));t.assign(Ms(e.mul(-2).mul(i)))}),t}},AT=new Kt,jT=new Kt,MT=null,NT=class extends tC{static get type(){return`RectAreaLightNode`}constructor(e=null){super(e),this.halfHeight=H(new w).setGroup(V),this.halfWidth=H(new w).setGroup(V),this.updateType=E.RENDER}update(e){super.update(e);let{light:t}=this,n=e.camera.matrixWorldInverse;jT.identity(),AT.copy(t.matrixWorld),AT.premultiply(n),jT.extractRotation(AT),this.halfWidth.value.set(t.width*.5,0,0),this.halfHeight.value.set(0,t.height*.5,0),this.halfWidth.value.applyMatrix4(jT),this.halfHeight.value.applyMatrix4(jT)}setupDirectRectArea(e){let t,n;e.isAvailable(`float32Filterable`)?(t=q(MT.LTC_FLOAT_1),n=q(MT.LTC_FLOAT_2)):(t=q(MT.LTC_HALF_1),n=q(MT.LTC_HALF_2));let{colorNode:r,light:i}=this;return{lightColor:r,lightPosition:iS(i),halfWidth:this.halfWidth,halfHeight:this.halfHeight,ltc_1:t,ltc_2:n}}static setLTC(e){MT=e}},PT=class{parseFunction(){T(`Abstract function.`)}},FT=class{constructor(e,t,n=``,r=``){this.type=e,this.inputs=t,this.name=n,this.precision=r}getCode(){T(`Abstract function.`)}};FT.isNodeFunction=!0;var IT=/^\s*(highp|mediump|lowp)?\s*([a-z_0-9]+)\s*([a-z_0-9]+)?\s*\(([\s\S]*?)\)/i,LT=/[a-z_0-9]+/gi,RT=`#pragma main`,zT=e=>{e=e.trim();let t=e.indexOf(RT),n=t===-1?e:e.slice(t+12),r=n.match(IT);if(r!==null&&r.length===5){let i=r[4],a=[],o=null;for(;(o=LT.exec(i))!==null;)a.push(o);let s=[],c=0;for(;c<a.length;){let e=a[c][0]===`const`;e===!0&&c++;let t=a[c][0];t===`in`||t===`out`||t===`inout`?c++:t=``;let n=a[c++][0],r=Number.parseInt(a[c][0]);Number.isNaN(r)===!1?c++:r=null;let i=a[c++][0];s.push(new xT(n,i,r,t,e))}let l=n.substring(r[0].length),u=r[3]===void 0?``:r[3];return{type:r[2],inputs:s,name:u,precision:r[1]===void 0?``:r[1],inputsCode:i,blockCode:l,headerCode:t===-1?``:e.slice(0,t)}}throw Error(`THREE.FunctionNode: Function is not a GLSL code.`)},BT=class extends FT{constructor(e){let{type:t,inputs:n,name:r,precision:i,inputsCode:a,blockCode:o,headerCode:s}=zT(e);super(t,n,r,i),this.inputsCode=a,this.blockCode=o,this.headerCode=s}getCode(e=this.name){let t,n=this.blockCode;if(n!==``){let{type:r,inputsCode:i,headerCode:a,precision:o}=this,s=`${r} ${e} ( ${i.trim()} )`;o!==``&&(s=`${o} ${s}`),t=a+s+n}else t=``;return t}},VT=class extends PT{parseFunction(e){return new BT(e)}},HT=[],UT=[],WT=H(0,`int`).setGroup(V),GT=class extends y_{constructor(e,t){super(),this.renderer=e,this.backend=t,this.nodeFrame=new bT,this.nodeBuilderCache=new Map,this.callHashCache=new f_,this.groupsData=new f_,this._buildQueue=[],this._buildInProgress=!1,this.cacheLib={}}updateGroup(e){let t=e.groupNode;if(t.updateType===E.OBJECT)return!0;HT[0]=t,HT[1]=e;let n=this.groupsData.get(HT);return n===void 0&&this.groupsData.set(HT,n={}),HT[0]=null,HT[1]=null,n.version!==t.version&&(n.version=t.version,!0)}getForRenderCacheKey(e){return e.initialCacheKey}_createNodeBuilder(e,t){let n=this.backend.createNodeBuilder(e.object,this.renderer);return n.scene=e.scene,n.material=t,n.camera=e.camera,n.context.material=t,n.lightsNode=e.lightsNode,n.environmentNode=this.getEnvironmentNode(e.scene),n.fogNode=this.getFogNode(e.scene),n.clippingContext=e.clippingContext,this.renderer.getOutputRenderTarget()&&this.renderer.getOutputRenderTarget().multiview&&n.enableMultiview(),n}getForRender(e,t=!1){let n=this.get(e),r=n.nodeBuilderState;if(r===void 0){let{nodeBuilderCache:i}=this,a=this.getForRenderCacheKey(e);if(r=i.get(a),r===void 0){let o=async()=>{let n=this._createNodeBuilder(e,e.material);try{t?await n.buildAsync():n.build()}catch(r){n=this._createNodeBuilder(e,new om),t?await n.buildAsync():n.build(),C(`TSL: `+r)}return n};if(t)return o().then(e=>(r=this._createNodeBuilderState(e),i.set(a,r),r.usedTimes++,n.nodeBuilderState=r,r));{let t=this._createNodeBuilder(e,e.material);try{t.build()}catch(n){t=this._createNodeBuilder(e,new om),t.build();let r=n.stackTrace;!r&&n.stack&&(r=new pr(n.stack)),C(`TSL: `+n,r)}r=this._createNodeBuilderState(t),i.set(a,r)}}r.usedTimes++,n.nodeBuilderState=r}return r}getForRenderAsync(e){let t=this.getForRender(e,!0);return t.then?t:Promise.resolve(t)}getForRenderDeferred(e){let t=this.get(e);if(t.nodeBuilderState!==void 0)return t.nodeBuilderState;let n=this.getForRenderCacheKey(e),r=this.nodeBuilderCache.get(n);return r===void 0?(t.pendingBuild!==!0&&(t.pendingBuild=!0,this._buildQueue.push(()=>this.getForRenderAsync(e).then(()=>{t.pendingBuild=!1})),this._processBuildQueue()),null):(r.usedTimes++,t.nodeBuilderState=r,r)}_processBuildQueue(){this._buildInProgress||this._buildQueue.length===0||(this._buildInProgress=!0,this._buildQueue.shift()().then(()=>{this._buildInProgress=!1,this._processBuildQueue()}))}delete(e){if(e.isRenderObject){let t=this.get(e).nodeBuilderState;t!==void 0&&(t.usedTimes--,t.usedTimes===0&&this.nodeBuilderCache.delete(this.getForRenderCacheKey(e)))}return super.delete(e)}getForCompute(e){let t=this.get(e),n=t.nodeBuilderState;if(n===void 0||t.version!==e.version){let r=this.backend.createNodeBuilder(e,this.renderer);r.build(),n=this._createNodeBuilderState(r),t.nodeBuilderState=n,t.version=e.version}return n}_createNodeBuilderState(e){return new Bw(e.vertexShader,e.fragmentShader,e.computeShader,e.getAttributesArray(),e.getBindings(),e.updateNodes,e.updateBeforeNodes,e.updateAfterNodes,e.observer,e.hardwareClipping,e.transforms)}getEnvironmentNode(e){if(this.renderer.lighting.enabled===!1)return null;this.updateEnvironment(e);let t=null;if(e.environmentNode&&e.environmentNode.isNode)t=e.environmentNode;else{let n=this.get(e);n.environmentNode&&(t=n.environmentNode)}return t}getBackgroundNode(e){this.updateBackground(e);let t=null;if(e.backgroundNode&&e.backgroundNode.isNode)t=e.backgroundNode;else{let n=this.get(e);n.backgroundNode&&(t=n.backgroundNode)}return t}getFogNode(e){return this.updateFog(e),e.fogNode||this.get(e).fogNode||null}getCacheKey(e,t){HT[0]=e,HT[1]=t;let n=this.renderer.info.calls,r=this.callHashCache.get(HT)||{};if(r.callId!==n){if(UT.push(this.renderer.getOutputRenderTarget()&&this.renderer.getOutputRenderTarget().multiview?1:0),UT.push(+!!this.renderer.lighting.enabled),this.renderer.lighting.enabled){UT.push(t.getCacheKey(!0)),UT.push(+!!this.renderer.shadowMap.enabled),UT.push(this.renderer.shadowMap.type);let n=this.getEnvironmentNode(e);n&&UT.push(n.getCacheKey())}let i=this.getFogNode(e);i&&UT.push(i.getCacheKey()),r.callId=n,r.cacheKey=gr(UT),this.callHashCache.set(HT,r),UT.length=0}return HT[0]=null,HT[1]=null,r.cacheKey}get isToneMappingState(){return!this.renderer.getRenderTarget()}updateBackground(e){let t=this.get(e),n=e.background;if(n){let r=e.backgroundBlurriness===0&&t.backgroundBlurriness>0||e.backgroundBlurriness>0&&t.backgroundBlurriness===0;(t.background!==n||r)&&(t.backgroundNode=this.getCacheNode(`background`,n,()=>{if(n.isCubeTexture===!0||n.mapping===303||n.mapping===304||n.mapping===306){if(e.backgroundBlurriness>0||n.mapping===306)return zg(n);{let e;return e=n.isCubeTexture===!0?cd(n):q(n),Dm(e)}}if(n.isTexture===!0)return q(n,kl.flipY()).setUpdateMatrix(!0);n.isColor!==!0&&C(`WebGPUNodes: Unsupported background configuration.`,n)},r),t.background=n,t.backgroundBlurriness=e.backgroundBlurriness)}else t.backgroundNode&&(delete t.backgroundNode,delete t.background)}getCacheNode(e,t,n,r=!1){let i=this.cacheLib[e]||(this.cacheLib[e]=new WeakMap),a=i.get(t);return(a===void 0||r)&&(a=n(),i.set(t,a)),a}updateFog(e){let t=this.get(e),n=e.fog;n?t.fog!==n&&(t.fogNode=this.getCacheNode(`fog`,n,()=>{if(n.isFogExp2)return Zb(fd(`color`,`color`,n).setGroup(V),Yb(fd(`density`,`float`,n).setGroup(V)));if(n.isFog)return Zb(fd(`color`,`color`,n).setGroup(V),Jb(fd(`near`,`float`,n).setGroup(V),fd(`far`,`float`,n).setGroup(V)));C(`Renderer: Unsupported fog configuration.`,n)}),t.fog=n):(delete t.fogNode,delete t.fog)}updateEnvironment(e){let t=this.get(e),n=e.environment;n?t.environment!==n&&(t.environmentNode=this.getCacheNode(`environment`,n,()=>{if(n.isCubeTexture===!0)return cd(n);if(n.isTexture===!0)return q(n);C(`Nodes: Unsupported environment configuration.`,n)}),t.environment=n):t.environmentNode&&(delete t.environmentNode,delete t.environment)}getNodeFrame(e=this.renderer,t=null,n=null,r=null,i=null){let a=this.nodeFrame;return a.renderer=e,a.scene=t,a.object=n,a.camera=r,a.material=i,a}getNodeFrameForRender(e){return this.getNodeFrame(e.renderer,e.scene,e.object,e.camera,e.material)}getOutputCacheKey(){let e=this.renderer;return e.toneMapping+`,`+e.currentColorSpace+`,`+e.xr.isPresenting}getOutputNode(e){let t=this.renderer,n;return n=e.isArrayTexture?this.backend.isWebGLBackend?q(e,kl).depth(wl(`gl_ViewID_OVR`)).renderOutput(t.toneMapping,t.currentColorSpace):q(e,kl).depth(WT).renderOutput(t.toneMapping,t.currentColorSpace):q(e,kl).renderOutput(t.toneMapping,t.currentColorSpace),n}setOutputLayerIndex(e){WT.value=e}updateBefore(e){let t=e.getNodeBuilderState();for(let n of t.updateBeforeNodes)this.getNodeFrameForRender(e).updateBeforeNode(n)}updateAfter(e){let t=e.getNodeBuilderState();for(let n of t.updateAfterNodes)this.getNodeFrameForRender(e).updateAfterNode(n)}updateForCompute(e){let t=this.getNodeFrame(),n=this.getForCompute(e);for(let e of n.updateNodes)t.updateNode(e)}updateForRender(e){let t=this.getNodeFrameForRender(e),n=e.getNodeBuilderState();for(let e of n.updateNodes)t.updateNode(e)}needsRefresh(e){let t=this.getNodeFrameForRender(e);return e.getMonitor().needsRefresh(e,t)}dispose(){super.dispose(),this.nodeFrame=new bT,this.nodeBuilderCache=new Map,this.cacheLib={}}},KT=new u,qT=class e{constructor(e=null){this.version=0,this.clipIntersection=null,this.cacheKey=``,this.shadowPass=!1,this.viewMatrix=new Kt,this.viewNormalMatrix=new On,this.clippingGroupContexts=new WeakMap,this.intersectionPlanes=[],this.unionPlanes=[],this.parentVersion=null,e!==null&&(this.viewMatrix=e.viewMatrix,this.viewNormalMatrix=e.viewNormalMatrix,this.clippingGroupContexts=e.clippingGroupContexts,this.shadowPass=e.shadowPass)}projectPlanes(e,t,n){let r=e.length;for(let i=0;i<r;i++){KT.copy(e[i]).applyMatrix4(this.viewMatrix,this.viewNormalMatrix);let r=t[n+i],a=KT.normal;r.x=-a.x,r.y=-a.y,r.z=-a.z,r.w=KT.constant}}updateGlobal(e,t){this.shadowPass=e.overrideMaterial!==null&&e.overrideMaterial.isShadowPassMaterial,this.viewMatrix.copy(t.matrixWorldInverse),this.viewNormalMatrix.getNormalMatrix(this.viewMatrix)}update(e,t){let n=!1;e.version!==this.parentVersion&&(this.intersectionPlanes=Array.from(e.intersectionPlanes),this.unionPlanes=Array.from(e.unionPlanes),this.parentVersion=e.version),this.clipIntersection!==t.clipIntersection&&(this.clipIntersection=t.clipIntersection,this.clipIntersection?this.unionPlanes.length=e.unionPlanes.length:this.intersectionPlanes.length=e.intersectionPlanes.length);let r=t.clippingPlanes,i=r.length,a,o;if(this.clipIntersection?(a=this.intersectionPlanes,o=e.intersectionPlanes.length):(a=this.unionPlanes,o=e.unionPlanes.length),a.length!==o+i){a.length=o+i;for(let e=0;e<i;e++)a[o+e]=new bt;n=!0}this.projectPlanes(r,a,o),n&&(this.version++,this.cacheKey=`${this.intersectionPlanes.length}:${this.unionPlanes.length}`)}getGroupContext(t){if(this.shadowPass&&!t.clipShadows)return this;let n=this.clippingGroupContexts.get(t);return n===void 0&&(n=new e(this),this.clippingGroupContexts.set(t,n)),n.update(this,t),n}get unionClippingCount(){return this.unionPlanes.length}},JT=class{constructor(e,t,n){this.bundleGroup=e,this.camera=t,this.renderContext=n}},YT=[],XT=class{constructor(){this.bundles=new f_}get(e,t,n){let r=this.bundles;YT[0]=e,YT[1]=t,YT[2]=n;let i=r.get(YT);return i===void 0&&(i=new JT(e,t,n),r.set(YT,i)),YT[0]=null,YT[1]=null,YT[2]=null,i}dispose(){this.bundles=new f_}},ZT=class{constructor(){this.lightNodes=new WeakMap,this.materialNodes=new Map,this.toneMappingNodes=new Map}fromMaterial(e){if(e.isNodeMaterial)return e;let t=null,n=this.getMaterialNodeClass(e.type);if(n!==null){t=new n;for(let n in e)t[n]=e[n]}return t}addToneMapping(e,t){this.addType(e,t,this.toneMappingNodes)}getToneMappingFunction(e){return this.toneMappingNodes.get(e)||null}getMaterialNodeClass(e){return this.materialNodes.get(e)||null}addMaterial(e,t){this.addType(e,t,this.materialNodes)}getLightNodeClass(e){return this.lightNodes.get(e)||null}addLight(e,t){this.addClass(e,t,this.lightNodes)}addType(e,t,n){if(n.has(t)){T(`Redefinition of node ${t}`);return}if(typeof e!=`function`)throw Error(`THREE.NodeLibrary: Node class ${e.name} is not a class.`);if(typeof t==`function`||typeof t==`object`)throw Error(`THREE.NodeLibrary: Base class ${t} is not a class.`);n.set(t,e)}addClass(e,t,n){if(n.has(t)){T(`Redefinition of node ${t.name}`);return}if(typeof e!=`function`)throw Error(`THREE.NodeLibrary: Node class ${e.name} is not a class.`);if(typeof t!=`function`)throw Error(`THREE.NodeLibrary: Base class ${t.name} is not a class.`);n.set(t,e)}},QT=new pS,$T=new WeakMap,eE=class{constructor(){this.enabled=!0,this._cache=[]}createNode(e=[]){return new pS().setLights(e)}getNode(e){if(e.isScene!==!0&&e.isGroup!==!0)return QT;let t=$T.get(e);return t===void 0&&(t=this.createNode(),$T.set(e,t)),t}beginRender(e){this._cache.push(this.getNode(e).getLights())}finishRender(e){this.getNode(e).setLights(this._cache.pop())}},tE=class extends Xn{constructor(e=1,t=1,n={}){super(e,t,n),this.isXRRenderTarget=!0,this._hasExternalTextures=!1,this._autoAllocateDepthBuffer=!0,this._isOpaqueFramebuffer=!1}copy(e){return super.copy(e),this._hasExternalTextures=e._hasExternalTextures,this._autoAllocateDepthBuffer=e._autoAllocateDepthBuffer,this._isOpaqueFramebuffer=e._isOpaqueFramebuffer,this}},nE=new w,rE=new w,iE=new WeakMap,aE=class extends Dt{constructor(e,t=!1){super(),this.enabled=!1,this.isPresenting=!1,this.cameraAutoUpdate=!0,this._renderer=e,this._cameraL=new Pe,this._cameraL.viewport=new bt,this._cameraL.matrixWorldAutoUpdate=!1,this._cameraR=new Pe,this._cameraR.viewport=new bt,this._cameraR.matrixWorldAutoUpdate=!1,this._cameras=[this._cameraL,this._cameraR],this._cameraXR=new b,this._currentDepthNear=null,this._currentDepthFar=null,this._controllers=[],this._controllerInputSources=[],this._xrRenderTarget=null,this._layers=[],this._sessionUsesLayers=!1,this._supportsGlBinding=typeof XRWebGLBinding<`u`,this._supportsWebGPUBinding=globalThis.XRGPUBinding!==void 0,this._createXRLayer=fE.bind(this),this._gl=null,this._currentAnimationContext=null,this._currentAnimationLoop=null,this._currentPixelRatio=null,this._currentSamples=null,this._currentSize=new hn,this._onSessionEvent=lE.bind(this),this._onSessionEnd=uE.bind(this),this._onInputSourcesChange=dE.bind(this),this._onAnimationFrame=pE.bind(this),this._referenceSpace=null,this._referenceSpaceType=`local-floor`,this._customReferenceSpace=null,this._framebufferScaleFactor=1,this._foveation=1,this._session=null,this._glBaseLayer=null,this._glBinding=null,this._webgpuBinding=null,this._glProjLayer=null,this._xrFrame=null,this._supportsLayers=this._supportsGlBinding&&`createProjectionLayer`in XRWebGLBinding.prototype,this._useMultiviewIfPossible=t,this._useMultiview=!1}getController(e){return this._getController(e).getTargetRaySpace()}getControllerGrip(e){return this._getController(e).getGripSpace()}getHand(e){return this._getController(e).getHandSpace()}getFoveation(){return this._foveation}setFoveation(e){this._foveation=e,this._glProjLayer!==null&&(this._glProjLayer.fixedFoveation=e),this._glBaseLayer!==null&&this._glBaseLayer.fixedFoveation!==void 0&&(this._glBaseLayer.fixedFoveation=e)}getFramebufferScaleFactor(){return this._framebufferScaleFactor}setFramebufferScaleFactor(e){this._framebufferScaleFactor=e,this.isPresenting===!0&&T(`XRManager: Cannot change framebuffer scale while presenting.`)}getReferenceSpaceType(){return this._referenceSpaceType}setReferenceSpaceType(e){this._referenceSpaceType=e,this.isPresenting===!0&&T(`XRManager: Cannot change reference space type while presenting.`)}getReferenceSpace(){return this._customReferenceSpace||this._referenceSpace}setReferenceSpace(e){this._customReferenceSpace=e}getCamera(){return this._cameraXR}getEnvironmentBlendMode(){if(this._session!==null)return this._session.environmentBlendMode}getBaseLayer(){return this._glProjLayer===null?this._glBaseLayer:this._glProjLayer}getBinding(){return this._glBinding===null&&this._supportsGlBinding&&(this._glBinding=new XRWebGLBinding(this._session,this._gl)),this._glBinding}foveateBoundTexture(e){if(e.isPostProcessingRenderTarget!==!0||this.isPresenting!==!0||this._glProjLayer===null)return;let t=this._renderer.backend;if(t===void 0||t.isWebGLBackend!==!0||t.state===null)return;let n=this._renderer.getOutputRenderTarget();if(n===null||n.isXRRenderTarget!==!0)return;let r=this.getBinding();if(r===null||typeof r.foveateBoundTexture!=`function`)return;this._renderer._textures.updateRenderTarget(e);let{textureGPU:i,glTextureType:a}=t.get(e.texture);if(i!==void 0&&a!==void 0&&e._xrFoveationTextureGPU!==i){e._xrFoveationTextureGPU=i,t.state.bindTexture(a,i);try{r.foveateBoundTexture(a,this.getFoveation())}catch(e){Qn(`XRManager: Unable to foveate bound XR post-processing texture. ${e.name}: ${e.message}`)}finally{t.state.unbindTexture()}}}getWebGPUBinding(){return this._webgpuBinding===null&&this._supportsWebGPUBinding&&(this._webgpuBinding=new globalThis.XRGPUBinding(this._session,this._renderer.backend.device)),this._webgpuBinding}_isWebGPUSession(){return this._renderer.backend.isWebGPUBackend===!0&&this._session!==null&&this._session.enabledFeatures.includes(`webgpu`)}_validateWebGPUSession(){let e=this._renderer;if(e.backend.isWebGPUBackend===!0){if(this._session.enabledFeatures.includes(`webgpu`)===!1)throw Error(`THREE.XRManager: WebGPU XR sessions require the "webgpu" session feature. Use VRButtonGPU/XRButton with "webgpu" enabled or use a WebGL backend.`);e.samples>0&&(Qn(`THREE.XRManager: WebGPU XR does not support MSAA yet. Disabling MSAA for this XR session.`),this._currentSamples===null&&(this._currentSamples=e.samples),e._samples=0)}}async _initWebGPUSession(e){let t=this.getWebGPUBinding(),n=t.createProjectionLayer({colorFormat:t.getPreferredColorFormat(),depthStencilFormat:`depth24plus`});this._glProjLayer=n,e.updateRenderState({layers:[n]}),this._referenceSpace=await e.requestReferenceSpace(this.getReferenceSpaceType()),this._xrRenderTarget=new Xn(n.textureWidth,n.textureHeight,{depth:2,minFilter:te,magFilter:te,depthBuffer:!0,multiview:!1,useArrayDepthTexture:!0,samples:0}),this._xrRenderTarget.texture.isArrayTexture=!0,this._useMultiviewIfPossible===!0&&Qn(`THREE.XRManager: WebGPU XR does not support multiview yet. Disabling multiview for this XR session.`),this._useMultiview=!1}_disposeWebGPUSession(){let e=this._renderer,t=this._xrRenderTarget;if(t===null||e.backend.isWebGPUBackend!==!0)return;let n=e.backend,r=e._textures,i=n.get?n.get(t):null;i&&(i.descriptors=void 0);let a=e=>{e!=null&&(n.delete&&n.delete(e),r.delete&&r.delete(e))};for(let e=0;e<t.textures.length;e++)a(t.textures[e]);a(t.depthTexture),a(t),e._renderContexts&&e._renderContexts.dispose&&e._renderContexts.dispose(),t.dispose()}_getWebGPUViewData(e){let t=this.getWebGPUBinding(),n={colorTexture:null,viewDescriptors:[],viewports:[]};for(let r=0;r<e.length;r++){let i=t.getViewSubImage(this._glProjLayer,e[r]);n.colorTexture===null&&(n.colorTexture=i.colorTexture),n.viewports.push(i.viewport),i.getViewDescriptor&&n.viewDescriptors.push(i.getViewDescriptor())}return n}getFrame(){return this._xrFrame}useMultiview(){return this._useMultiview}createQuadLayer(e,t,n,r,i,a,o,s={}){let c=new Kn(e,t),l=new tE(i,a,{format:oe,type:ke,depthTexture:new Pn(i,a,s.stencil?Ot:dn,void 0,void 0,void 0,void 0,void 0,void 0,s.stencil?vn:mt),stencilBuffer:s.stencil,resolveDepthBuffer:!1,resolveStencilBuffer:!1});l._autoAllocateDepthBuffer=!0;let u=new gn({color:16777215,side:0});u.map=l.texture,u.map.offset.y=1,u.map.repeat.y=-1;let d=new ft(c,u);d.position.copy(n),d.quaternion.copy(r);let f={type:`quad`,width:e,height:t,translation:n,quaternion:r,pixelwidth:i,pixelheight:a,plane:d,material:u,rendercall:o,renderTarget:l};if(this._layers.push(f),this._session!==null){f.plane.material=new gn({color:16777215,side:0}),f.plane.material.blending=5,f.plane.material.blendEquation=100,f.plane.material.blendSrc=200,f.plane.material.blendDst=200,f.xrlayer=this._createXRLayer(f);let e=this._session.renderState.layers;e.unshift(f.xrlayer),this._session.updateRenderState({layers:e})}else l.isXRRenderTarget=!1;return d}createCylinderLayer(t,n,r,i,a,o,s,c,l={}){let u=new e(t,t,t*n/r,64,64,!0,Math.PI-n/2,n),d=new tE(o,s,{format:oe,type:ke,depthTexture:new Pn(o,s,l.stencil?Ot:dn,void 0,void 0,void 0,void 0,void 0,void 0,l.stencil?vn:mt),stencilBuffer:l.stencil,resolveDepthBuffer:!1,resolveStencilBuffer:!1});d._autoAllocateDepthBuffer=!0;let f=new gn({color:16777215,side:1});f.map=d.texture,f.map.offset.y=1,f.map.repeat.y=-1;let p=new ft(u,f);p.position.copy(i),p.quaternion.copy(a);let m={type:`cylinder`,radius:t,centralAngle:n,aspectratio:r,translation:i,quaternion:a,pixelwidth:o,pixelheight:s,plane:p,material:f,rendercall:c,renderTarget:d};if(this._layers.push(m),this._session!==null){m.plane.material=new gn({color:16777215,side:1}),m.plane.material.blending=5,m.plane.material.blendEquation=100,m.plane.material.blendSrc=200,m.plane.material.blendDst=200,m.xrlayer=this._createXRLayer(m);let e=this._session.renderState.layers;e.unshift(m.xrlayer),this._session.updateRenderState({layers:e})}else d.isXRRenderTarget=!1;return p}renderLayers(){let e=new w,t=new en,n=this._renderer,r=this.isPresenting;this.isPresenting=!1;let i=new hn;n.getSize(i);let a=n.getRenderTarget();for(let r of this._layers){r.renderTarget.isXRRenderTarget=this._session!==null,r.renderTarget._hasExternalTextures=r.renderTarget.isXRRenderTarget;let i=n.contextNode,a;if(r.renderTarget.isXRRenderTarget&&this._sessionUsesLayers){r.xrlayer.transform=new XRRigidTransform(r.plane.getWorldPosition(e),r.plane.getWorldQuaternion(t));let o=this._glBinding.getSubImage(r.xrlayer,this._xrFrame);n.backend.setXRRenderTargetTextures(r.renderTarget,o.colorTexture,void 0),n._setXRLayerSize(r.renderTarget.width,r.renderTarget.height),a=iE.get(i),a===void 0&&(a=i.context({getOutput:e=>Qc(e,n.toneMapping,n.outputColorSpace)}),iE.set(i,a))}else a=i;n.contextNode=a,n.setRenderTarget(r.renderTarget),r.rendercall(),n.contextNode=i}n.setRenderTarget(a),n._setXRLayerSize(i.x,i.y),this.isPresenting=r}getSession(){return this._session}async setSession(e){let t=this._renderer;t.initialized===!1&&await t.init(),this._gl=t.getContext();let n=this._gl;if(this._session=e,e!==null){if(e.addEventListener(`select`,this._onSessionEvent),e.addEventListener(`selectstart`,this._onSessionEvent),e.addEventListener(`selectend`,this._onSessionEvent),e.addEventListener(`squeeze`,this._onSessionEvent),e.addEventListener(`squeezestart`,this._onSessionEvent),e.addEventListener(`squeezeend`,this._onSessionEvent),e.addEventListener(`end`,this._onSessionEnd),e.addEventListener(`inputsourceschange`,this._onInputSourcesChange),this._validateWebGPUSession(),this._currentPixelRatio=t.getPixelRatio(),t.getSize(this._currentSize),this._currentAnimationContext=t._animation.getContext(),this._currentAnimationLoop=t._animation.getAnimationLoop(),t._animation.stop(),this._isWebGPUSession())await this._initWebGPUSession(e);else if(this._supportsLayers===!0){let r=null,i=null,a=null,o=n.getContextAttributes();await t.backend.makeXRCompatible(),this.setFoveation(this.getFoveation()),t.depth&&(a=t.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,r=t.stencil?vn:mt,i=t.stencil?Ot:dn);let s={colorFormat:n.RGBA8,depthFormat:a,scaleFactor:this._framebufferScaleFactor,clearOnAccess:!1};this._useMultiviewIfPossible&&t.hasFeature(`OVR_multiview2`)&&(s.textureType=`texture-array`,this._useMultiview=!0),this._glBinding=this.getBinding();let c=this._glBinding.createProjectionLayer(s),l=[c];this._glProjLayer=c,t.setPixelRatio(1),t._setXRLayerSize(c.textureWidth,c.textureHeight);let u=this._useMultiview?2:1,d=new Pn(c.textureWidth,c.textureHeight,i,void 0,void 0,void 0,void 0,void 0,void 0,r,u);if(this._xrRenderTarget=new tE(c.textureWidth,c.textureHeight,{format:oe,type:ke,colorSpace:t.outputColorSpace,depthTexture:d,stencilBuffer:t.stencil,samples:o.antialias?4:0,resolveDepthBuffer:c.ignoreDepthValues===!1,resolveStencilBuffer:c.ignoreDepthValues===!1,depth:this._useMultiview?2:1,multiview:this._useMultiview}),this._xrRenderTarget._hasExternalTextures=!0,this._xrRenderTarget.depth=this._useMultiview?2:1,this._sessionUsesLayers=e.enabledFeatures.includes(`layers`),this._referenceSpace=await e.requestReferenceSpace(this.getReferenceSpaceType()),this._sessionUsesLayers)for(let e of this._layers)e.plane.material=new gn({color:16777215,side:+(e.type===`cylinder`)}),e.plane.material.blending=5,e.plane.material.blendEquation=100,e.plane.material.blendSrc=200,e.plane.material.blendDst=200,e.xrlayer=this._createXRLayer(e),l.unshift(e.xrlayer);e.updateRenderState({layers:l})}else{await t.backend.makeXRCompatible(),this.setFoveation(this.getFoveation());let r={antialias:t.currentSamples>0,alpha:!0,depth:t.depth,stencil:t.stencil,framebufferScaleFactor:this.getFramebufferScaleFactor()},i=new XRWebGLLayer(e,n,r);this._glBaseLayer=i,e.updateRenderState({baseLayer:i}),t.setPixelRatio(1),t._setXRLayerSize(i.framebufferWidth,i.framebufferHeight),this._xrRenderTarget=new tE(i.framebufferWidth,i.framebufferHeight,{format:oe,type:ke,colorSpace:t.outputColorSpace,stencilBuffer:t.stencil,resolveDepthBuffer:i.ignoreDepthValues===!1,resolveStencilBuffer:i.ignoreDepthValues===!1}),this._xrRenderTarget._isOpaqueFramebuffer=!0,this._referenceSpace=await e.requestReferenceSpace(this.getReferenceSpaceType())}t._animation.setAnimationLoop(this._onAnimationFrame),t._animation.setContext(e),t._animation.start(),this.isPresenting=!0,this.dispatchEvent({type:`sessionstart`})}}updateCamera(e){let t=this._session;if(t===null)return;let n=e.near,r=e.far,i=this._cameraXR,a=this._cameraL,o=this._cameraR;i.near=o.near=a.near=n,i.far=o.far=a.far=r,i.isMultiViewCamera=this._useMultiview,(this._currentDepthNear!==i.near||this._currentDepthFar!==i.far)&&(t.updateRenderState({depthNear:i.near,depthFar:i.far}),this._currentDepthNear=i.near,this._currentDepthFar=i.far),i.layers.mask=e.layers.mask|6,a.layers.mask=i.layers.mask&-5,o.layers.mask=i.layers.mask&-3;let s=e.parent,c=i.cameras;sE(i,s);for(let e=0;e<c.length;e++)sE(c[e],s);c.length===2?oE(i,a,o):i.projectionMatrix.copy(a.projectionMatrix),cE(e,i,s)}_getController(e){let t=this._controllers[e];return t===void 0&&(t=new Mt,this._controllers[e]=t),t}};function oE(e,t,n){nE.setFromMatrixPosition(t.matrixWorld),rE.setFromMatrixPosition(n.matrixWorld);let r=nE.distanceTo(rE),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function sE(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}function cE(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=_e*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}function lE(e){let t=this._controllerInputSources.indexOf(e.inputSource);if(t===-1)return;let n=this._controllers[t];if(n!==void 0){let t=this.getReferenceSpace();n.update(e.inputSource,e.frame,t),n.dispatchEvent({type:e.type,data:e.inputSource})}}function uE(){let e=this._session,t=this._renderer;e.removeEventListener(`select`,this._onSessionEvent),e.removeEventListener(`selectstart`,this._onSessionEvent),e.removeEventListener(`selectend`,this._onSessionEvent),e.removeEventListener(`squeeze`,this._onSessionEvent),e.removeEventListener(`squeezestart`,this._onSessionEvent),e.removeEventListener(`squeezeend`,this._onSessionEvent),e.removeEventListener(`end`,this._onSessionEnd),e.removeEventListener(`inputsourceschange`,this._onInputSourcesChange);for(let e=0;e<this._controllers.length;e++){let t=this._controllerInputSources[e];t!==null&&(this._controllerInputSources[e]=null,this._controllers[e].disconnect(t))}if(this._currentDepthNear=null,this._currentDepthFar=null,this._currentSamples!==null&&(t._samples=this._currentSamples,this._currentSamples=null),t._resetXRState(),this._disposeWebGPUSession(),this._session=null,this._xrRenderTarget=null,this._glBinding=null,this._webgpuBinding=null,this._glBaseLayer=null,this._glProjLayer=null,this._sessionUsesLayers===!0)for(let e of this._layers)e.renderTarget=new tE(e.pixelwidth,e.pixelheight,{format:oe,type:ke,depthTexture:new Pn(e.pixelwidth,e.pixelheight,e.stencilBuffer?Ot:dn,void 0,void 0,void 0,void 0,void 0,void 0,e.stencilBuffer?vn:mt),stencilBuffer:e.stencilBuffer,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),e.renderTarget.isXRRenderTarget=!1,e.plane.material=e.material,e.material.map=e.renderTarget.texture,e.material.map.offset.y=1,e.material.map.repeat.y=-1,delete e.xrlayer;this.isPresenting=!1,this._useMultiview=!1,t._animation.stop(),t._animation.setAnimationLoop(this._currentAnimationLoop),t._animation.setContext(this._currentAnimationContext),t._animation.start(),t.setPixelRatio(this._currentPixelRatio),t.setSize(this._currentSize.width,this._currentSize.height,!1),this.dispatchEvent({type:`sessionend`})}function dE(e){let t=this._controllers,n=this._controllerInputSources;for(let r=0;r<e.removed.length;r++){let i=e.removed[r],a=n.indexOf(i);a>=0&&(n[a]=null,t[a].disconnect(i))}for(let r=0;r<e.added.length;r++){let i=e.added[r],a=n.indexOf(i);if(a===-1){for(let e=0;e<t.length;e++)if(e>=n.length){n.push(i),a=e;break}else if(n[e]===null){n[e]=i,a=e;break}if(a===-1)break}let o=t[a];o&&o.connect(i)}}function fE(e){return e.type===`quad`?this._glBinding.createQuadLayer({transform:new XRRigidTransform(e.translation,e.quaternion),width:e.width/2,height:e.height/2,space:this._referenceSpace,viewPixelWidth:e.pixelwidth,viewPixelHeight:e.pixelheight,clearOnAccess:!1}):this._glBinding.createCylinderLayer({transform:new XRRigidTransform(e.translation,e.quaternion),radius:e.radius,centralAngle:e.centralAngle,aspectRatio:e.aspectRatio,space:this._referenceSpace,viewPixelWidth:e.pixelwidth,viewPixelHeight:e.pixelheight,clearOnAccess:!1})}function pE(e,t){if(t===void 0)return;let n=this._cameraXR,r=this._renderer,i=r.backend,a=this._glBaseLayer,o=this.getReferenceSpace(),s=t.getViewerPose(o);if(this._xrFrame=t,s!==null){let e=s.views,t=this._isWebGPUSession()?this._getWebGPUViewData(e):null;this._glBaseLayer!==null&&t===null&&i.setXRTarget(a.framebuffer);let o=!1;e.length!==n.cameras.length&&(n.cameras.length=0,o=!0);for(let r=0;r<e.length;r++){let s=e[r],c;if(t!==null)c=t.viewports[r];else if(this._supportsLayers===!0){let e=this._glBinding.getViewSubImage(this._glProjLayer,s);c=e.viewport,r===0&&i.setXRRenderTargetTextures(this._xrRenderTarget,e.colorTexture,this._glProjLayer.ignoreDepthValues&&!this._useMultiview?void 0:e.depthStencilTexture)}else c=a.getViewport(s);let l=this._cameras[r];l===void 0&&(l=new Pe,l.layers.enable(r),l.viewport=new bt,l.matrixWorldAutoUpdate=!1,this._cameras[r]=l),l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.quaternion,l.scale),l.projectionMatrix.fromArray(s.projectionMatrix),l.projectionMatrixInverse.copy(l.projectionMatrix).invert(),l.viewport.set(c.x,c.y,c.width,c.height),r===0&&(n.matrix.copy(l.matrix),n.matrix.decompose(n.position,n.quaternion,n.scale)),o===!0&&n.cameras.push(l)}t!==null&&t.colorTexture!==null&&i.setXRRenderTargetTextures(this._xrRenderTarget,t.colorTexture,t.viewDescriptors),r.setOutputRenderTarget(this._xrRenderTarget);let c=r._getFrameBufferTarget();r.xr.foveateBoundTexture(c)}for(let e=0;e<this._controllers.length;e++){let n=this._controllerInputSources[e],r=this._controllers[e];n!==null&&r!==void 0&&r.update(n,t,o)}this._currentAnimationLoop&&this._currentAnimationLoop(e,t),t.detectedPlanes&&this.dispatchEvent({type:`planesdetected`,data:t}),this._xrFrame=null}var mE=class extends Dt{constructor(e){super(),this.domElement=e,this._pixelRatio=1,this._width=this.domElement.width,this._height=this.domElement.height,this._viewport=new bt(0,0,this._width,this._height),this._scissor=new bt(0,0,this._width,this._height),this._scissorTest=!1,this.colorTexture=new Wn,this.depthTexture=new Pn}getPixelRatio(){return this._pixelRatio}getDrawingBufferSize(e){return e.set(this._width*this._pixelRatio,this._height*this._pixelRatio).floor()}getSize(e){return e.set(this._width,this._height)}setPixelRatio(e=1){this._pixelRatio!==e&&(this._pixelRatio=e,this.setSize(this._width,this._height,!1))}setDrawingBufferSize(e,t,n){this.xr&&this.xr.isPresenting||(this._width=e,this._height=t,this._pixelRatio=n,this.domElement.width=Math.floor(e*n),this.domElement.height=Math.floor(t*n),this.setViewport(0,0,e,t),this._dispatchResize())}setSize(e,t,n=!0){this.xr&&this.xr.isPresenting||(this._width=e,this._height=t,this.domElement.width=Math.floor(e*this._pixelRatio),this.domElement.height=Math.floor(t*this._pixelRatio),n===!0&&(this.domElement.style.width=e+`px`,this.domElement.style.height=t+`px`),this.setViewport(0,0,e,t),this._dispatchResize())}getScissor(e){let t=this._scissor;return e.x=t.x,e.y=t.y,e.width=t.width,e.height=t.height,e}setScissor(e,t,n,r){let i=this._scissor;e.isVector4?i.copy(e):i.set(e,t,n,r)}getScissorTest(){return this._scissorTest}setScissorTest(e){this._scissorTest=e}getViewport(e){return e.copy(this._viewport)}setViewport(e,t,n,r,i=0,a=1){let o=this._viewport;e.isVector4?o.copy(e):o.set(e,t,n,r),o.minDepth=i,o.maxDepth=a}_dispatchResize(){this.dispatchEvent({type:`resize`})}dispose(){this.dispatchEvent({type:`dispose`})}},hE=new Zt,gE=new hn,_E=new bt,vE=new tr,yE=new vt,bE=new Kt,xE=new bt,SE={0:1,1:0,2:2},CE=class{constructor(e,t={}){this.isRenderer=!0;let{logarithmicDepthBuffer:n=!1,reversedDepthBuffer:r=!1,alpha:i=!0,depth:a=!0,stencil:o=!1,antialias:s=!1,samples:c=0,getFallback:l=null,outputBufferType:u=Ie,multiview:d=!1}=t;this.backend=e,this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.alpha=i,this.logarithmicDepthBuffer=n,this.reversedDepthBuffer=r,this.outputColorSpace=tn,this.toneMapping=0,this.toneMappingExposure=1,this.sortObjects=!0,this.depth=a,this.stencil=o,this.info=new k_,this.contextNode=Ws(),this.library=new ZT,this.lighting=new eE,this._samples=c||s===!0?4:0,this._onCanvasTargetResize=this._onCanvasTargetResize.bind(this),this._canvasTarget=new mE(e.getDomElement()),this._canvasTarget.addEventListener(`resize`,this._onCanvasTargetResize),this._canvasTarget.isDefaultCanvasTarget=!0,this._inspector=new tl,this._inspector.setRenderer(this),this._getFallback=l,this._attributes=null,this._geometries=null,this._nodes=null,this._animation=null,this._bindings=null,this._objects=null,this._pipelines=null,this._bundles=null,this._renderLists=null,this._renderContexts=null,this._textures=null,this._background=null,this._quadCache=new Map,this._currentRenderContext=null,this._opaqueSort=null,this._transparentSort=null,this._frameBufferTargets=new Map;let f=this.alpha===!0?0:1;this._clearColor=new X_(0,0,0,f),this._clearDepth=1,this._clearStencil=0,this._renderTarget=null,this._activeCubeFace=0,this._activeMipmapLevel=0,this._outputRenderTarget=null,this._mrt=null,this._renderObjectFunction=null,this._currentRenderObjectFunction=null,this._currentRenderBundle=null,this._handleObjectFunction=this._renderObjectDirect,this._isDeviceLost=!1,this.onDeviceLost=this._onDeviceLost,this.onError=this._onError,this._outputBufferType=u,this._cacheShadowNodes=new WeakMap,this._initialized=!1,this._callDepth=-1,this._initPromise=null,this._compilationPromises=null,this._currentSourceMaterial=null,this.transparent=!0,this.opaque=!0,this.shadowMap={enabled:!1,transmitted:!1,type:1},this.xr=new aE(this,d),this.debug={checkShaderErrors:!0,onShaderError:null,getShaderAsync:async(e,t,n)=>{await this.compileAsync(n,t,e);let r=this.needsFrameBufferTarget&&this._renderTarget===null?this._getFrameBufferTarget():this._renderTarget||this._outputRenderTarget,i=this._renderLists.get(e,t),a=this._renderContexts.get(r,this._mrt),o=e.overrideMaterial||n.material,{fragmentShader:s,vertexShader:c}=this._objects.get(n,o,e,t,i.lightsNode,a,a.clippingContext).getNodeBuilderState();return{fragmentShader:s,vertexShader:c}}}}async init(){return this._initPromise===null&&(this._initPromise=new Promise(async(e,t)=>{let n=this.backend;try{await n.init(this)}catch(e){if(this._getFallback!==null)try{this.backend=n=this._getFallback(e),await n.init(this)}catch(e){t(e);return}else{t(e);return}}this._nodes=new GT(this,n),this._animation=new d_(this,this._nodes,this.info),this._attributes=new w_(n,this.info),this._background=new Lw(this,this._nodes),this._geometries=new O_(this._attributes,this.info),this._textures=new Y_(this,n,this.info),this._pipelines=new F_(n,this._nodes,this.info),this._bindings=new I_(n,this._nodes,this._textures,this._attributes,this._pipelines,this.info),this._objects=new v_(this,this._nodes,this._geometries,this._pipelines,this._bindings,this.info),this._renderLists=new U_(this.lighting),this._bundles=new XT,this._renderContexts=new q_(this),this._animation.start(),this._initialized=!0,this._inspector.init(),e(this)})),this._initPromise}get domElement(){return this._canvasTarget.domElement}get coordinateSystem(){return this.backend.coordinateSystem}async compileAsync(e,t,n=null){if(this._isDeviceLost===!0)return;this._initialized===!1&&await this.init();let r=this._nodes.nodeFrame,i=r.renderId,a=this._currentRenderContext,o=this._currentRenderObjectFunction,s=this._handleObjectFunction,c=this._compilationPromises;n===null&&(n=e);let l=e.isScene===!0?e:n.isScene===!0?n:hE,u=this.needsFrameBufferTarget&&this._renderTarget===null?this._getFrameBufferTarget():this._renderTarget||this._outputRenderTarget,d=this._renderContexts.get(u,this._mrt),f=this._activeMipmapLevel,p=[];this._currentRenderContext=d,this._currentRenderObjectFunction=this.renderObject,this._handleObjectFunction=this._createObjectPipeline,this._compilationPromises=p,r.renderId++,r.update(),d.depth=this.depth,d.stencil=this.stencil,d.clippingContext||=new qT,d.clippingContext.updateGlobal(l,t),e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t=this._updateCamera(t),l.onBeforeRender(this,e,t,u);let m=t.isArrayCamera?yE:vE;t.isArrayCamera?m.setFromArrayCamera(t):(bE.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),m.setFromProjectionMatrix(bE,t.coordinateSystem,t.reversedDepth));let h=this._renderLists.get(l,t);if(h.begin(),this._projectObject(e,t,0,h,d.clippingContext),n!==e&&n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&h.pushLight(e)}),h.finish(),u!==null){this._textures.updateRenderTarget(u,f);let e=this._textures.get(u);d.textures=e.textures,d.depthTexture=e.depthTexture}else d.textures=null,d.depthTexture=null;n===e?this._background.update(l,h,d):this._background.update(n,h,d);let g=h.opaque,_=h.transparent,v=h.transparentDoublePass,y=h.lightsNode;this.opaque===!0&&g.length>0&&this._renderObjects(g,t,l,y),this.transparent===!0&&_.length>0&&this._renderTransparents(_,v,t,l,y),r.renderId=i,this._currentRenderContext=a,this._currentRenderObjectFunction=o,this._handleObjectFunction=s,this._compilationPromises=c;for(let e of p){let t=this._objects.get(e.object,e.material,e.scene,e.camera,e.lightsNode,e.renderContext,e.clippingContext,e.passId);t.drawRange=e.object.geometry.drawRange,t.group=e.group,await this._nodes.getForRenderAsync(t),this._nodes.updateBefore(t),this._geometries.updateForRender(t),this._nodes.updateForRender(t),this._bindings.updateForRender(t);let n=[];this._pipelines.getForRender(t,n),n.length>0&&await Promise.all(n),this._nodes.updateAfter(t),await gt()}}async renderAsync(e,t){Qn(`Renderer: "renderAsync()" has been deprecated. Use "render()" and "await renderer.init();" when creating the renderer.`),await this.init(),this.render(e,t)}async waitForGPU(){C(`Renderer: waitForGPU() has been removed. Read https://github.com/mrdoob/three.js/issues/32012 for more information.`)}set inspector(e){this._inspector!==null&&this._inspector.setRenderer(null),this._inspector=e,this._inspector.setRenderer(this)}get inspector(){return this._inspector}set highPrecision(e){let t=this.contextNode.value;e===!0?(t.modelViewMatrix=Eu,t.modelNormalViewMatrix=Du):this.highPrecision&&(delete t.modelViewMatrix,delete t.modelNormalViewMatrix)}get highPrecision(){let e=this.contextNode.value;return e.modelViewMatrix===Eu&&e.modelNormalViewMatrix===Du}setMRT(e){return this._mrt=e,this}getMRT(){return this._mrt}getOutputBufferType(){return this._outputBufferType}getColorBufferType(){return Qn(`Renderer: ".getColorBufferType()" has been renamed to ".getOutputBufferType()".`),this.getOutputBufferType()}_onDeviceLost(e){let t=`THREE.WebGPURenderer: ${e.api} Device Lost:\n\nMessage: ${e.message}`;e.reason&&(t+=`\nReason: ${e.reason}`),C(t),this._isDeviceLost=!0}_onError(e){let t=`WebGPURenderer: Uncaptured ${e.api} ${e.type}`;e.message&&(t+=`: ${e.message}`),C(t)}_bundleNeedsUpdate(e,t){return t.bundleGPU===void 0||e.version!==t.version}_renderBundle(e,t,n){let{bundleGroup:r,camera:i,renderList:a}=e,o=this._currentRenderContext,s=this._bundles.get(r,i,o),c=this.backend.get(s);if(this._bundleNeedsUpdate(r,c)){this.backend.beginBundle(o),this._currentRenderBundle=s;let{transparentDoublePass:e,transparent:l,opaque:u}=a;this.opaque===!0&&u.length>0&&this._renderObjects(u,i,t,n),this.transparent===!0&&l.length>0&&this._renderTransparents(l,e,i,t,n),this._currentRenderBundle=null,this.backend.finishBundle(o,s),c.version=r.version}else{let{renderObjects:e}=c;for(let t=0,n=e.length;t<n;t++){let n=e[t];this._nodes.needsRefresh(n)&&(this._nodes.updateBefore(n),this._geometries.updateForRender(n),this._nodes.updateForRender(n),this._bindings.updateForRender(n),this._nodes.updateAfter(n))}}this.backend.addBundle(o,s)}render(e,t){if(this._initialized===!1)throw Error(`THREE.Renderer: .render() called before the backend is initialized. Use "await renderer.init();" before rendering.`);this._renderScene(e,t)}get initialized(){return this._initialized}_renderOutputLayers(e,t){if(t.texture.isArrayTexture!==!0||t.texture.image.depth<=1){this._renderScene(e,e.camera,!1);return}let n=this._activeCubeFace;try{for(let n=0;n<t.texture.image.depth;n++)this._nodes.setOutputLayerIndex(n),this._activeCubeFace=n,this._renderScene(e,e.camera,!1)}finally{this._nodes.setOutputLayerIndex(0),this._activeCubeFace=n}}_getFrameBufferTarget(){let{currentToneMapping:e,currentColorSpace:t}=this,n=e!==0,r=t!==Cn.workingColorSpace;if(n===!1&&r===!1)return null;let{width:i,height:a}=this.getDrawingBufferSize(gE),{depth:o,stencil:s}=this,c=this._outputRenderTarget||this._canvasTarget,l=this._frameBufferTargets.get(c);if(l===void 0){l=new Xn(i,a,{depthBuffer:o,stencilBuffer:s,type:this._outputBufferType,format:oe,colorSpace:Cn.workingColorSpace,generateMipmaps:!1,minFilter:te,magFilter:te,samples:this.samples}),l.isPostProcessingRenderTarget=!0;let e=()=>{c.removeEventListener(`dispose`,e),l.dispose(),this._frameBufferTargets.delete(c)};c.addEventListener(`dispose`,e),this._frameBufferTargets.set(c,l)}let u=this.getOutputRenderTarget();l.depthBuffer=o,l.stencilBuffer=s,u===null?l.setSize(i,a,1):l.setSize(u.width,u.height,u.depth);let d=this._outputRenderTarget?this._outputRenderTarget.viewport:c._viewport,f=this._outputRenderTarget?this._outputRenderTarget.scissor:c._scissor,p=this._outputRenderTarget?1:c._pixelRatio,m=this._outputRenderTarget?this._outputRenderTarget.scissorTest:c._scissorTest;return l.viewport.copy(d),l.scissor.copy(f),l.viewport.multiplyScalar(p),l.scissor.multiplyScalar(p),l.scissorTest=m,l.multiview=u!==null&&u.multiview,l.useArrayDepthTexture=u!==null&&u.useArrayDepthTexture,l.resolveDepthBuffer=u===null||u.resolveDepthBuffer,l._autoAllocateDepthBuffer=u!==null&&u._autoAllocateDepthBuffer,l}_renderScene(e,t,n=!0){if(this._isDeviceLost===!0)return;let r=n?this._getFrameBufferTarget():null,i=this._nodes.nodeFrame,a=i.renderId,o=this._currentRenderContext,s=this._currentRenderObjectFunction,c=this._handleObjectFunction;this.lighting.beginRender(e),this._callDepth++;let l=e.isScene===!0?e:hE,u=this._renderTarget||this._outputRenderTarget,d=this._activeCubeFace,f=this._activeMipmapLevel,p;if(r===null?p=u:(p=r,this.setRenderTarget(p)),p!==null&&p.depthBuffer===!0){let e=this._textures.get(p);e.depthInitialized!==!0&&((this.autoClear===!1||this.autoClear===!0&&this.autoClearDepth===!1)&&this.clearDepth(),e.depthInitialized=!0)}let m=this._renderContexts.get(p,this._mrt,this._callDepth);this._currentRenderContext=m,this._currentRenderObjectFunction=this._renderObjectFunction||this.renderObject,this._handleObjectFunction=this._renderObjectDirect,this.info.calls++,this.info.render.calls++,this.info.render.frameCalls++,i.renderId=this.info.calls,this.backend.updateTimeStampUID(m),this.inspector.beginRender(this.backend.getTimestampUID(m),e,t,p),e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t=this._updateCamera(t);let h=this._canvasTarget,g=h._viewport,_=h._scissor,v=h._pixelRatio;p!==null&&(g=p.viewport,_=p.scissor,v=1),this.getDrawingBufferSize(gE),_E.set(0,0,gE.width,gE.height);let y=g.minDepth===void 0?0:g.minDepth,b=g.maxDepth===void 0?1:g.maxDepth;m.viewportValue.copy(g).multiplyScalar(v).floor(),m.viewportValue.width>>=f,m.viewportValue.height>>=f,m.viewportValue.minDepth=y,m.viewportValue.maxDepth=b,m.viewport=m.viewportValue.equals(_E)===!1,m.scissorValue.copy(_).multiplyScalar(v).floor(),m.scissor=h._scissorTest&&m.scissorValue.equals(_E)===!1,m.scissorValue.width>>=f,m.scissorValue.height>>=f,m.clippingContext||=new qT,m.clippingContext.updateGlobal(l,t),l.onBeforeRender(this,e,t,p);let x=t.isArrayCamera?yE:vE;t.isArrayCamera?x.setFromArrayCamera(t):(bE.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),x.setFromProjectionMatrix(bE,t.coordinateSystem,t.reversedDepth));let S=this._renderLists.get(e,t);if(S.begin(),this._projectObject(e,t,0,S,m.clippingContext),S.finish(),this.sortObjects===!0&&S.sort(this._opaqueSort,this._transparentSort,t.reversedDepth),p!==null){this._textures.updateRenderTarget(p,f);let e=this._textures.get(p);m.textures=e.textures,m.depthTexture=e.depthTexture,m.width=e.width,m.height=e.height,m.renderTarget=p,m.depth=p.depthBuffer,m.stencil=p.stencilBuffer}else m.textures=null,m.depthTexture=null,m.width=gE.width,m.height=gE.height,m.depth=this.depth,m.stencil=this.stencil;m.width>>=f,m.height>>=f,m.activeCubeFace=d,m.activeMipmapLevel=f,m.occlusionQueryCount=S.occlusionQueryCount,m.scissorValue.max(xE.set(0,0,0,0)),m.scissorValue.x+m.scissorValue.width>m.width&&(m.scissorValue.width=Math.max(m.width-m.scissorValue.x,0)),m.scissorValue.y+m.scissorValue.height>m.height&&(m.scissorValue.height=Math.max(m.height-m.scissorValue.y,0)),this._background.update(l,S,m),m.camera=t,this.backend.beginRender(m);let{bundles:ee,lightsNode:te,transparentDoublePass:ne,transparent:re,opaque:ie}=S;return ee.length>0&&this._renderBundles(ee,l,te),this.opaque===!0&&ie.length>0&&this._renderObjects(ie,t,l,te),this.transparent===!0&&re.length>0&&this._renderTransparents(re,ne,t,l,te),this.backend.finishRender(m),i.renderId=a,this._currentRenderContext=o,this._currentRenderObjectFunction=s,this._handleObjectFunction=c,this.lighting.finishRender(e),this._callDepth--,r!==null&&(this.setRenderTarget(u,d,f),this._renderOutput(p)),l.onAfterRender(this,e,t,p),this.inspector.finishRender(this.backend.getTimestampUID(m)),m}_setXRLayerSize(e,t){this._canvasTarget._width=e,this._canvasTarget._height=t,this.setViewport(0,0,e,t)}_renderOutput(e){let t=this._nodes.getOutputCacheKey(),n=this._quadCache.get(e.texture),r;if(n===void 0){r=new Cy(new om),r.name=`Output Color Transform`,r.material.name=`outputColorTransform`,r.material.fragmentNode=this._nodes.getOutputNode(e.texture),n={quad:r,cacheKey:t},this._quadCache.set(e.texture,n);let i=()=>{r.material.dispose(),this._quadCache.delete(e.texture),e.texture.removeEventListener(`dispose`,i)};e.texture.addEventListener(`dispose`,i)}else r=n.quad,n.cacheKey!==t&&(r.material.fragmentNode=this._nodes.getOutputNode(e.texture),r.material.needsUpdate=!0,n.cacheKey=t);let i=this.autoClear,a=this.xr.enabled;this.autoClear=!1,this.xr.enabled=!1,this._renderOutputLayers(r,e),this.autoClear=i,this.xr.enabled=a}getMaxAnisotropy(){return this.backend.capabilities.getMaxAnisotropy()}getActiveCubeFace(){return this._activeCubeFace}getActiveMipmapLevel(){return this._activeMipmapLevel}async setAnimationLoop(e){this._initialized===!1&&await this.init(),this._animation.setAnimationLoop(e)}getAnimationLoop(){return this._animation.getAnimationLoop()}async getArrayBufferAsync(e,t=null,n=0,r=-1){if(t!==null&&t.isReadbackBuffer&&this.info.memoryMap.has(t)===!1){this.info.createReadbackBuffer(t);let e=()=>{t.removeEventListener(`dispose`,e),this.info.destroyReadbackBuffer(t)};t.addEventListener(`dispose`,e)}if(n%4!=0||r>0&&r%4!=0)throw Error(`THREE.Renderer: "getArrayBufferAsync()" offset and count must be a multiple of 4.`);return await this.backend.getArrayBufferAsync(e,t,n,r)}getContext(){return this.backend.getContext()}getPixelRatio(){return this._canvasTarget.getPixelRatio()}getDrawingBufferSize(e){return this._canvasTarget.getDrawingBufferSize(e)}getSize(e){return this._canvasTarget.getSize(e)}setPixelRatio(e=1){this._canvasTarget.setPixelRatio(e)}setDrawingBufferSize(e,t,n){this.xr&&this.xr.isPresenting||this._canvasTarget.setDrawingBufferSize(e,t,n)}setSize(e,t,n=!0){this.xr&&this.xr.isPresenting||this._canvasTarget.setSize(e,t,n)}setOpaqueSort(e){this._opaqueSort=e}setTransparentSort(e){this._transparentSort=e}getScissor(e){return this._canvasTarget.getScissor(e)}setScissor(e,t,n,r){this._canvasTarget.setScissor(e,t,n,r)}getScissorTest(){return this._canvasTarget.getScissorTest()}setScissorTest(e){this._canvasTarget.setScissorTest(e),this.backend.setScissorTest(e)}getViewport(e){return this._canvasTarget.getViewport(e)}setViewport(e,t,n,r,i=0,a=1){this._canvasTarget.setViewport(e,t,n,r,i,a)}getClearColor(e){return e.copy(this._clearColor)}setClearColor(e,t=1){this._clearColor.set(e),this._clearColor.a=t}getClearAlpha(){return this._clearColor.a}setClearAlpha(e){this._clearColor.a=e}getClearDepth(){return this.reversedDepthBuffer===!0?1-this._clearDepth:this._clearDepth}setClearDepth(e){this._clearDepth=e}getClearStencil(){return this._clearStencil}setClearStencil(e){this._clearStencil=e}isOccluded(e){let t=this._currentRenderContext;return t&&this.backend.isOccluded(t,e)}clear(e=!0,t=!0,n=!0){if(this._initialized===!1)throw Error(`THREE.Renderer: .clear() called before the backend is initialized. Use "await renderer.init();" before using this method.`);let r=this._renderTarget||this._getFrameBufferTarget(),i=null;if(r!==null){this._textures.updateRenderTarget(r);let e=this._textures.get(r);i=this._renderContexts.get(r,null,-1),i.textures=e.textures,i.depthTexture=e.depthTexture,i.width=e.width,i.height=e.height,i.renderTarget=r,i.depth=r.depthBuffer,i.stencil=r.stencilBuffer;let t=this.backend.getClearColor();i.clearColorValue.r=t.r,i.clearColorValue.g=t.g,i.clearColorValue.b=t.b,i.clearColorValue.a=t.a,i.clearDepthValue=this.getClearDepth(),i.clearStencilValue=this.getClearStencil(),i.activeCubeFace=this.getActiveCubeFace(),i.activeMipmapLevel=this.getActiveMipmapLevel(),r.depthBuffer===!0&&(e.depthInitialized=!0)}this.backend.clear(e,t,n,i),r!==null&&this._renderTarget===null&&this._renderOutput(r)}clearColor(){this.clear(!0,!1,!1)}clearDepth(){this.clear(!1,!0,!1)}clearStencil(){this.clear(!1,!1,!0)}async clearAsync(e=!0,t=!0,n=!0){Qn(`Renderer: "clearAsync()" has been deprecated. Use "clear()" and "await renderer.init();" when creating the renderer.`),await this.init(),this.clear(e,t,n)}async clearColorAsync(){Qn(`Renderer: "clearColorAsync()" has been deprecated. Use "clearColor()" and "await renderer.init();" when creating the renderer.`),this.clear(!0,!1,!1)}async clearDepthAsync(){Qn(`Renderer: "clearDepthAsync()" has been deprecated. Use "clearDepth()" and "await renderer.init();" when creating the renderer.`),this.clear(!1,!0,!1)}async clearStencilAsync(){Qn(`Renderer: "clearStencilAsync()" has been deprecated. Use "clearStencil()" and "await renderer.init();" when creating the renderer.`),this.clear(!1,!1,!0)}get needsFrameBufferTarget(){let e=this.currentToneMapping!==0,t=this.currentColorSpace!==Cn.workingColorSpace;return e||t}get samples(){return this._samples}get currentSamples(){let e=this._samples;return this._renderTarget===null?this.needsFrameBufferTarget&&(e=0):e=this._renderTarget.samples,e}get currentToneMapping(){return this.isOutputTarget?this.toneMapping:0}get currentColorSpace(){return this.isOutputTarget?this.outputColorSpace:Cn.workingColorSpace}get isOutputTarget(){return this._renderTarget===this._outputRenderTarget||this._renderTarget===null}dispose(){if(this._initialized===!0){this.info.dispose(),this.backend.dispose(),this._animation.dispose(),this._objects.dispose(),this._geometries.dispose(),this._pipelines.dispose(),this._nodes.dispose(),this._bindings.dispose(),this._renderLists.dispose(),this._renderContexts.dispose(),this._textures.dispose();for(let e of this._frameBufferTargets.keys())e.dispose();Object.values(this.backend.timestampQueryPool).forEach(e=>{e!==null&&e.dispose()})}this.setRenderTarget(null),this.setAnimationLoop(null)}setRenderTarget(e,t=0,n=0){this._renderTarget=e,this._activeCubeFace=t,this._activeMipmapLevel=n}getRenderTarget(){return this._renderTarget}setOutputRenderTarget(e){this._outputRenderTarget=e}getOutputRenderTarget(){return this._outputRenderTarget}setCanvasTarget(e){this._canvasTarget.removeEventListener(`resize`,this._onCanvasTargetResize),this._canvasTarget=e,this._canvasTarget.addEventListener(`resize`,this._onCanvasTargetResize)}getCanvasTarget(){return this._canvasTarget}_resetXRState(){this.backend.setXRTarget(null),this.setOutputRenderTarget(null),this.setRenderTarget(null);for(let e of this._frameBufferTargets.keys())e.dispose()}setRenderObjectFunction(e){this._renderObjectFunction=e}getRenderObjectFunction(){return this._renderObjectFunction}compute(e,t=null){if(this._isDeviceLost===!0)return;if(this._initialized===!1)return T(`Renderer: .compute() called before the backend is initialized. Try using .computeAsync() instead.`),this.computeAsync(e,t);let n=this._nodes.nodeFrame,r=n.renderId;this.info.calls++,this.info.compute.calls++,this.info.compute.frameCalls++,n.renderId=this.info.calls,this.backend.updateTimeStampUID(e),this.inspector.beginCompute(this.backend.getTimestampUID(e),e);let i=this.backend,a=this._pipelines,o=this._bindings,s=this._nodes,c=Array.isArray(e)?e:[e];if(c[0]===void 0||c[0].isComputeNode!==!0)throw Error(`THREE.Renderer: .compute() expects a ComputeNode.`);i.beginCompute(e);for(let n of c){if(a.has(n)===!1){let e=()=>{n.removeEventListener(`dispose`,e),a.delete(n),o.deleteForCompute(n),s.delete(n)};n.addEventListener(`dispose`,e);let t=n.onInitFunction;t!==null&&t.call(n,{renderer:this})}s.updateForCompute(n),o.updateForCompute(n);let r=o.getForCompute(n),c=a.getForCompute(n,r);i.compute(e,n,r,c,t)}i.finishCompute(e),n.renderId=r,this.inspector.finishCompute(this.backend.getTimestampUID(e))}async computeAsync(e,t=null){this._initialized===!1&&await this.init(),this.compute(e,t)}async hasFeatureAsync(e){return Qn(`Renderer: "hasFeatureAsync()" has been deprecated. Use "hasFeature()" and "await renderer.init();" when creating the renderer.`),await this.init(),this.hasFeature(e)}async resolveTimestampsAsync(e=`render`){return this._initialized===!1&&await this.init(),this.backend.resolveTimestampsAsync(e)}hasFeature(e){if(this._initialized===!1)throw Error(`THREE.Renderer: .hasFeature() called before the backend is initialized. Use "await renderer.init();" before using this method.`);return this.backend.hasFeature(e)}hasInitialized(){return this._initialized}async initTextureAsync(e){Qn(`Renderer: "initTextureAsync()" has been deprecated. Use "initTexture()" and "await renderer.init();" when creating the renderer.`),await this.init(),this.initTexture(e)}initTexture(e){if(this._initialized===!1)throw Error(`THREE.Renderer: .initTexture() called before the backend is initialized. Use "await renderer.init();" before using this method.`);this._textures.updateTexture(e)}initRenderTarget(e){if(this._initialized===!1)throw Error(`THREE.Renderer: .initRenderTarget() called before the backend is initialized. Use "await renderer.init();" before using this method.`);this._textures.updateRenderTarget(e);let t=this._textures.get(e),n=this._renderContexts.get(e);n.textures=t.textures,n.depthTexture=t.depthTexture,n.width=t.width,n.height=t.height,n.renderTarget=e,n.depth=e.depthBuffer,n.stencil=e.stencilBuffer,this.backend.initRenderTarget(n)}copyFramebufferToTexture(e,t=null){if(t!==null){if(t.isVector2)t=xE.set(t.x,t.y,e.image.width,e.image.height).floor();else if(t.isVector4)t=xE.copy(t).floor();else{C(`Renderer.copyFramebufferToTexture: Invalid rectangle.`);return}}else t=xE.set(0,0,e.image.width,e.image.height);let n=this._currentRenderContext,r;n===null?(r=this._renderTarget||this._getFrameBufferTarget(),r!==null&&(this._textures.updateRenderTarget(r),n=this._textures.get(r))):r=n.renderTarget,this._textures.updateTexture(e,{renderTarget:r}),this.backend.copyFramebufferToTexture(e,n,t),this._inspector.copyFramebufferToTexture(e)}copyTextureToTexture(e,t,n=null,r=null,i=0,a=0){this._textures.updateTexture(e),this._textures.updateTexture(t),this.backend.copyTextureToTexture(e,t,n,r,i,a),this._inspector.copyTextureToTexture(e,t)}async readRenderTargetPixelsAsync(e,t,n,r,i,a=0,o=0){return this.backend.copyTextureToBuffer(e.textures[a],t,n,r,i,o)}_projectObject(e,t,n,r,i){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder,e.isClippingGroup&&e.enabled&&(i=i.getGroupContext(e));else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)r.pushLight(e);else if(e.isSprite){let a=t.isArrayCamera?yE:vE;if(!e.frustumCulled||a.intersectsSprite(e)){this.sortObjects===!0&&xE.setFromMatrixPosition(e.matrixWorld).applyMatrix4(bE);let{geometry:t,material:a}=e;a.visible&&r.push(e,t,a,n,xE.z,null,i)}}else if(e.isLineLoop)C(`Renderer: Objects of type THREE.LineLoop are not supported. Please use THREE.Line or THREE.LineSegments.`);else if(e.isMesh||e.isLine||e.isPoints){let a=t.isArrayCamera?yE:vE;if(!e.frustumCulled||a.intersectsObject(e)){let{geometry:t,material:a}=e;if(this.sortObjects===!0&&(t.boundingSphere===null&&t.computeBoundingSphere(),xE.copy(t.boundingSphere.center).applyMatrix4(e.matrixWorld).applyMatrix4(bE)),Array.isArray(a)){let o=t.groups;for(let s=0,c=o.length;s<c;s++){let c=o[s],l=a[c.materialIndex];l&&l.visible&&r.push(e,t,l,n,xE.z,c,i)}}else a.visible&&r.push(e,t,a,n,xE.z,null,i)}}}if(e.isBundleGroup===!0&&this.backend.beginBundle!==void 0){let a=r;r=this._renderLists.get(e,t);let o=this._bundles.get(e,t,this._currentRenderContext),s=this.backend.get(o);if(this._bundleNeedsUpdate(e,s)){r.begin(),s.renderObjects===void 0?s.renderObjects=[]:s.renderObjects.length=0;let a=e.children;for(let e=0,o=a.length;e<o;e++)this._projectObject(a[e],t,n,r,i);r.finish()}a.pushBundle({bundleGroup:e,camera:t,renderList:r});return}let a=e.children;for(let e=0,o=a.length;e<o;e++)this._projectObject(a[e],t,n,r,i)}_renderBundles(e,t,n){for(let r of e)this._renderBundle(r,t,n)}_renderTransparents(e,t,n,r,i){if(t.length>0){for(let{material:e}of t)e.side=1;this._renderObjects(t,n,r,i,`backSide`);for(let{material:e}of t)e.side=0;this._renderObjects(e,n,r,i);for(let{material:e}of t)e.side=2}else this._renderObjects(e,n,r,i)}_renderObjects(e,t,n,r,i=null){for(let a=0,o=e.length;a<o;a++){let{object:o,geometry:s,material:c,group:l,clippingContext:u}=e[a];this._currentRenderObjectFunction(o,n,t,s,c,l,r,u,i)}}_getShadowNodes(e){let t=e.version,n=this._cacheShadowNodes.get(e);if(n===void 0||n.version!==t){let r=e.map&&e.map.isTexture,i=e.colorNode&&e.colorNode.isNode,a=e.castShadowNode&&e.castShadowNode.isNode,o=e.maskShadowNode&&e.maskShadowNode.isNode||e.maskNode&&e.maskNode.isNode,s=null,c=null,l=null;if(r||i||a||o){let t,n;if(a?(t=e.castShadowNode.rgb,n=e.castShadowNode.a,this.shadowMap.transmitted!==!0&&Qn("Renderer: `shadowMap.transmitted` needs to be set to `true` when using `material.castShadowNode`.")):(t=z(0),n=F(1)),r&&(n=n.mul(fd(`map`,`texture`,e).a)),i&&(n=n.mul(e.colorNode.a)),c=B(t,n),o){let t=e.maskShadowNode||e.maskNode;c=N(([e])=>(t.not().discard(),e))(c)}}e.depthNode&&e.depthNode.isNode&&(l=e.depthNode),e.castShadowPositionNode&&e.castShadowPositionNode.isNode?s=e.castShadowPositionNode:e.positionNode&&e.positionNode.isNode&&(s=e.positionNode),n={version:t,colorNode:c,depthNode:l,positionNode:s},this._cacheShadowNodes.set(e,n)}return n}_updateCamera(e){let t=this.xr;if(t.isPresenting===!1){let t=!1;if(this.reversedDepthBuffer===!0&&e.reversedDepth!==!0){if(e._reversedDepth=!0,e.isArrayCamera)for(let t of e.cameras)t._reversedDepth=!0;t=!0}let n=this.coordinateSystem;if(e.coordinateSystem!==n){if(e.coordinateSystem=n,e.isArrayCamera)for(let t of e.cameras)t.coordinateSystem=n;t=!0}if(t===!0&&(e.updateProjectionMatrix(),e.isArrayCamera))for(let t of e.cameras)t.updateProjectionMatrix()}return e.parent===null&&e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.enabled===!0&&t.isPresenting===!0&&(t.cameraAutoUpdate===!0&&t.updateCamera(e),e=t.getCamera()),e}renderObject(e,t,n,r,i,a,o,s=null,c=null){let l=!1,u,d,f,p,m,h,g,_=this._currentSourceMaterial;if(e.onBeforeRender(this,t,n,r,i,a),i.allowOverride===!0&&t.overrideMaterial!==null){this._currentSourceMaterial=i;let e=t.overrideMaterial;if(l=!0,u=e.isNodeMaterial?e.colorNode:null,d=e.isNodeMaterial?e.depthNode:null,f=e.isNodeMaterial?e.positionNode:null,p=t.overrideMaterial.side,m=e.displacementMap,h=e.displacementScale,g=e.displacementBias,i.positionNode&&i.positionNode.isNode&&(e.positionNode=i.positionNode),e.alphaTest=i.alphaTest,e.alphaMap=i.alphaMap,e.displacementMap=i.displacementMap,e.displacementScale=i.displacementScale,e.displacementBias=i.displacementBias,e.transparent=i.transparent||i.transmission>0||i.transmissionNode&&i.transmissionNode.isNode||i.backdropNode&&i.backdropNode.isNode,e.isShadowPassMaterial){let{colorNode:t,depthNode:n,positionNode:r}=this._getShadowNodes(i);e.side=this.shadowMap.type===3?i.shadowSide===null?i.side:i.shadowSide:i.shadowSide===null?SE[i.side]:i.shadowSide,t!==null&&(e.colorNode=t),n!==null&&(e.depthNode=n),r!==null&&(e.positionNode=r)}i=e}i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,this._handleObjectFunction(e,i,t,n,o,a,s,`backSide`),i.side=0,this._handleObjectFunction(e,i,t,n,o,a,s,c),i.side=2):this._handleObjectFunction(e,i,t,n,o,a,s,c),l&&(t.overrideMaterial.colorNode=u,t.overrideMaterial.depthNode=d,t.overrideMaterial.positionNode=f,t.overrideMaterial.side=p,t.overrideMaterial.displacementMap=m,t.overrideMaterial.displacementScale=h,t.overrideMaterial.displacementBias=g),this._currentSourceMaterial=_,e.onAfterRender(this,t,n,r,i,a)}hasCompatibility(e){if(this._initialized===!1)throw Error(`THREE.Renderer: .hasCompatibility() called before the backend is initialized. Use "await renderer.init();" before using this method.`);return this.backend.hasCompatibility(e)}_renderObjectDirect(e,t,n,r,i,a,o,s){let c=this._objects.get(e,t,n,r,i,this._currentRenderContext,o,s);c.drawRange=e.geometry.drawRange,c.group=a,this._currentRenderBundle!==null&&(this.backend.get(this._currentRenderBundle).renderObjects.push(c),c.bundle=this._currentRenderBundle.bundleGroup);let l=this._nodes.needsRefresh(c);l&&(this._nodes.updateBefore(c),this._geometries.updateForRender(c),this._nodes.updateForRender(c),this._bindings.updateForRender(c)),this._pipelines.updateForRender(c),this._pipelines.isReady(c)&&(this.backend.draw(c,this.info),l&&this._nodes.updateAfter(c))}_createObjectPipeline(e,t,n,r,i,a,o,s){if(this._compilationPromises!==null){this._compilationPromises.push({object:e,material:t,scene:n,camera:r,lightsNode:i,group:a,clippingContext:o,passId:s,renderContext:this._currentRenderContext});return}let c=this._objects.get(e,t,n,r,i,this._currentRenderContext,o,s);c.drawRange=e.geometry.drawRange,c.group=a,this._nodes.updateBefore(c),this._geometries.updateForRender(c),this._nodes.updateForRender(c),this._bindings.updateForRender(c),this._pipelines.getForRender(c,this._compilationPromises),this._nodes.updateAfter(c)}_onCanvasTargetResize(){this._initialized&&this.backend.updateSize()}get compile(){return this.compileAsync}},wE=class{constructor(e=``){this.name=e,this.visibility=0}setVisibility(e){this.visibility|=e}getVisibility(){return this.visibility}clone(){return Object.assign(new this.constructor,this)}};function TE(e){return e+(x_-e%x_)%x_}var EE=class extends wE{constructor(e,t=null){super(e),this.isBuffer=!0,this.bytesPerElement=Float32Array.BYTES_PER_ELEMENT,this._buffer=t,this._updateRanges=[]}get updateRanges(){return this._updateRanges}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}get byteLength(){return TE(this._buffer.byteLength)}get buffer(){return this._buffer}update(){return!0}release(){this._buffer=null}},DE=class extends EE{constructor(e,t=null){super(e,t),this.isUniformBuffer=!0}},OE=0,kE=class extends DE{constructor(e,t){super(`UniformBuffer_`+OE++,e?e.value:null),this.nodeUniform=e,this.groupNode=t,this.isNodeUniformBuffer=!0}set updateRanges(e){this.nodeUniform.updateRanges=e}get updateRanges(){return this.nodeUniform.updateRanges}addUpdateRange(e,t){this.nodeUniform.addUpdateRange(e,t)}clearUpdateRanges(){this.nodeUniform.clearUpdateRanges()}get byteLength(){return TE(this.buffer.byteLength)}get buffer(){return this.nodeUniform.value}},AE=class extends DE{constructor(e){super(e),this.isUniformsGroup=!0,this._values=null,this.uniforms=[],this._updateRangeCache=new Map,this._addedIndices=new Set}addUniformUpdateRange(e){let t=e.index;if(this._addedIndices.has(t))return;let n=this._updateRangeCache.get(t);n===void 0&&(n={start:0,count:0},this._updateRangeCache.set(t,n)),n.start=e.offset,n.count=e.itemSize,this._addedIndices.add(t),this.updateRanges.push(n)}clearUpdateRanges(){this._addedIndices.clear(),super.clearUpdateRanges()}addUniform(e){return this.uniforms.push(e),this}removeUniform(e){let t=this.uniforms.indexOf(e);return t!==-1&&this.uniforms.splice(t,1),this}get values(){return this._values===null&&(this._values=Array.from(this.buffer)),this._values}get buffer(){let e=this._buffer;if(e===null){let t=this.byteLength;e=new Float32Array(new ArrayBuffer(t)),this._buffer=e}return e}get byteLength(){let e=this.bytesPerElement,t=0;for(let n=0,r=this.uniforms.length;n<r;n++){let r=this.uniforms[n],i=r.boundary,a=r.itemSize*e,o=t%x_,s=o%i,c=o+s;t+=s,c!==0&&x_-c<a&&(t+=x_-c),r.offset=t/e,r.index=n,t+=a}return Math.ceil(t/x_)*x_}update(){let e=!1;for(let t of this.uniforms)this.updateByType(t)===!0&&(e=!0);return e}release(){super.release(),this._values=null}updateByType(e){if(e.isNumberUniform)return this.updateNumber(e);if(e.isVector2Uniform)return this.updateVector2(e);if(e.isVector3Uniform)return this.updateVector3(e);if(e.isVector4Uniform)return this.updateVector4(e);if(e.isColorUniform)return this.updateColor(e);if(e.isMatrix3Uniform)return this.updateMatrix3(e);if(e.isMatrix4Uniform)return this.updateMatrix4(e);C(`WebGPUUniformsGroup: Unsupported uniform type.`,e)}updateNumber(e){let t=!1,n=this.values,r=e.getValue(),i=e.offset,a=e.getType();if(n[i]!==r){let o=this._getBufferForType(a);o[i]=n[i]=r,t=!0,this.addUniformUpdateRange(e)}return t}updateVector2(e){let t=!1,n=this.values,r=e.getValue(),i=e.offset,a=e.getType();if(n[i+0]!==r.x||n[i+1]!==r.y){let o=this._getBufferForType(a);o[i+0]=n[i+0]=r.x,o[i+1]=n[i+1]=r.y,t=!0,this.addUniformUpdateRange(e)}return t}updateVector3(e){let t=!1,n=this.values,r=e.getValue(),i=e.offset,a=e.getType();if(n[i+0]!==r.x||n[i+1]!==r.y||n[i+2]!==r.z){let o=this._getBufferForType(a);o[i+0]=n[i+0]=r.x,o[i+1]=n[i+1]=r.y,o[i+2]=n[i+2]=r.z,t=!0,this.addUniformUpdateRange(e)}return t}updateVector4(e){let t=!1,n=this.values,r=e.getValue(),i=e.offset,a=e.getType();if(n[i+0]!==r.x||n[i+1]!==r.y||n[i+2]!==r.z||n[i+3]!==r.w){let o=this._getBufferForType(a);o[i+0]=n[i+0]=r.x,o[i+1]=n[i+1]=r.y,o[i+2]=n[i+2]=r.z,o[i+3]=n[i+3]=r.w,t=!0,this.addUniformUpdateRange(e)}return t}updateColor(e){let t=!1,n=this.values,r=e.getValue(),i=e.offset;if(n[i+0]!==r.r||n[i+1]!==r.g||n[i+2]!==r.b){let a=this.buffer;a[i+0]=n[i+0]=r.r,a[i+1]=n[i+1]=r.g,a[i+2]=n[i+2]=r.b,t=!0,this.addUniformUpdateRange(e)}return t}updateMatrix3(e){let t=!1,n=this.values,r=e.getValue().elements,i=e.offset;if(n[i+0]!==r[0]||n[i+1]!==r[1]||n[i+2]!==r[2]||n[i+4]!==r[3]||n[i+5]!==r[4]||n[i+6]!==r[5]||n[i+8]!==r[6]||n[i+9]!==r[7]||n[i+10]!==r[8]){let a=this.buffer;a[i+0]=n[i+0]=r[0],a[i+1]=n[i+1]=r[1],a[i+2]=n[i+2]=r[2],a[i+4]=n[i+4]=r[3],a[i+5]=n[i+5]=r[4],a[i+6]=n[i+6]=r[5],a[i+8]=n[i+8]=r[6],a[i+9]=n[i+9]=r[7],a[i+10]=n[i+10]=r[8],t=!0,this.addUniformUpdateRange(e)}return t}updateMatrix4(e){let t=!1,n=this.values,r=e.getValue().elements,i=e.offset;return ME(n,r,i)===!1&&(this.buffer.set(r,i),jE(n,r,i),t=!0,this.addUniformUpdateRange(e)),t}_getBufferForType(e){return e===`int`||e===`ivec2`||e===`ivec3`||e===`ivec4`?new Int32Array(this.buffer.buffer):e===`uint`||e===`uvec2`||e===`uvec3`||e===`uvec4`?new Uint32Array(this.buffer.buffer):this.buffer}};function jE(e,t,n){for(let r=0,i=t.length;r<i;r++)e[n+r]=t[r]}function ME(e,t,n){for(let r=0,i=t.length;r<i;r++)if(e[n+r]!==t[r])return!1;return!0}var NE=0,PE=class extends AE{constructor(e,t){super(e),this.id=NE++,this.groupNode=t,this.isNodeUniformsGroup=!0}},FE=class extends wE{constructor(e,t){super(e),this._texture=t,this.version=-1,this.generation=null,this.samplerKey=``,this.isSampler=!0}set texture(e){this._texture!==e&&(this._texture=e,this.reset())}get texture(){return this._texture}update(){let{texture:e,version:t}=this;return t!==e.version&&(this.version=e.version,!0)}reset(){this.generation=null,this.version=-1}release(){this._texture=null}},IE=0,LE=class extends FE{constructor(e,t){super(e,t),this.id=IE++,this.store=!1,this.mipLevel=0,this.isSampledTexture=!0}},RE=class extends LE{constructor(e,t,n,r=null){super(e,t?t.value:null),this.textureNode=t,this.groupNode=n,this.access=r}update(){let{textureNode:e}=this;return this.texture===e.value?super.update():(this.texture=e.value,!0)}},zE=class extends RE{constructor(e,t,n,r=null){super(e,t,n,r),this.isSampledCubeTexture=!0}},BE=class extends RE{constructor(e,t,n,r=null){super(e,t,n,r),this.isSampledTexture3D=!0}},VE={bitcast_int_uint:new Rb(`uint tsl_bitcast_int_to_uint ( int x ) { return floatBitsToUint( intBitsToFloat ( x ) ); }`),bitcast_uint_int:new Rb(`uint tsl_bitcast_uint_to_int ( uint x ) { return floatBitsToInt( uintBitsToFloat ( x ) ); }`),textureGather:new Rb(`
vec4 tsl_textureGather( const int comp, sampler2D map, vec2 coord, ivec2 offset, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ) );
	vec2 st = floor( coord * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, ij.xw, 0.0 )[ comp ],
		textureLod( map, ij.zw, 0.0 )[ comp ],
		textureLod( map, ij.zy, 0.0 )[ comp ],
		textureLod( map, ij.xy, 0.0 )[ comp ]
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherArray:new Rb(`
vec4 tsl_textureGather_array( const int comp, sampler2DArray map, vec3 coord, ivec2 offset, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ).xy );
	vec2 st = floor( coord.xy * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, vec3( ij.xw, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.zw, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.zy, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.xy, coord.z ), 0.0 )[ comp ]
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherCompare:new Rb(`
vec4 tsl_textureGatherCompare( sampler2DShadow map, vec2 coord, ivec2 offset, float ref, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ) );
	vec2 st = floor( coord * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, vec3( ij.xw, ref ), 0.0 ),
		textureLod( map, vec3( ij.zw, ref ), 0.0 ),
		textureLod( map, vec3( ij.zy, ref ), 0.0 ),
		textureLod( map, vec3( ij.xy, ref ), 0.0 )
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherCompareArray:new Rb(`
vec4 tsl_textureGatherCompare_array( sampler2DArrayShadow map, vec3 coord, ivec2 offset, float ref, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ).xy );
	vec2 st = floor( coord.xy * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		texture( map, vec4( ij.xw, coord.z, ref ) ),
		texture( map, vec4( ij.zw, coord.z, ref ) ),
		texture( map, vec4( ij.zy, coord.z, ref ) ),
		texture( map, vec4( ij.xy, coord.z, ref ) )
	);
	return flipY ? ret.wzyx : ret;
}
`)},HE={textureDimensions:`textureSize`,equals:`equal`,bitcast_float_int:`floatBitsToInt`,bitcast_int_float:`intBitsToFloat`,bitcast_uint_float:`uintBitsToFloat`,bitcast_float_uint:`floatBitsToUint`,bitcast_uint_int:`tsl_bitcast_uint_to_int`,bitcast_int_uint:`tsl_bitcast_int_to_uint`,floatpack_snorm_2x16:`packSnorm2x16`,floatpack_unorm_2x16:`packUnorm2x16`,floatpack_float16_2x16:`packHalf2x16`,floatunpack_snorm_2x16:`unpackSnorm2x16`,floatunpack_unorm_2x16:`unpackUnorm2x16`,floatunpack_float16_2x16:`unpackHalf2x16`},UE={low:`lowp`,medium:`mediump`,high:`highp`},WE={swizzleAssign:!0,storageBuffer:!1},GE={perspective:`smooth`,linear:`noperspective`},KE={centroid:`centroid`},qE=`
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;
precision highp samplerCube;
precision highp sampler2DArray;

precision highp usampler2D;
precision highp usampler3D;
precision highp usamplerCube;
precision highp usampler2DArray;

precision highp isampler2D;
precision highp isampler3D;
precision highp isamplerCube;
precision highp isampler2DArray;

precision highp sampler2DShadow;
precision highp sampler2DArrayShadow;
precision highp samplerCubeShadow;
`,JE=class extends yT{constructor(e,t){super(e,t,new VT),this.uniformGroups={},this.transforms=[],this.extensions={},this.builtins={vertex:[],fragment:[],compute:[]}}needsToWorkingColorSpace(e){return e.isVideoTexture===!0&&e.colorSpace!==``}_include(e){let t=VE[e];return t.build(this),this.addInclude(t),t}getMethod(e){return VE[e]!==void 0&&this._include(e),HE[e]||e}getBitcastMethod(e,t){return this.getMethod(`bitcast_${t}_${e}`)}getFloatPackingMethod(e){return this.getMethod(`floatpack_${e}_2x16`)}getFloatUnpackingMethod(e){return this.getMethod(`floatunpack_${e}_2x16`)}getTernary(e,t,n){return`${e} ? ${t} : ${n}`}getOutputStructName(){return``}buildFunctionCode(e){let t=e.layout,n=this.flowShaderNode(e),r=[];for(let e of t.inputs)r.push(this.getType(e.type)+` `+e.name);return`${this.getType(t.type)} ${t.name}( ${r.join(`, `)} ) {

	${n.vars}

${n.code}
	return ${n.result};

}`}setupPBO(e){let t=e.value;if(t.pbo===void 0){let e=t.array,n=t.count*t.itemSize,{itemSize:r}=t,i=t.array.constructor.name.toLowerCase().includes(`int`),o=i?_t:er;r===2?o=i?Ut:ln:r===3?o=i?_n:pt:r===4&&(o=i?me:oe);let s={Float32Array:lt,Uint8Array:ke,Uint16Array:dt,Uint32Array:dn,Int8Array:ne,Int16Array:Ee,Int32Array:a,Uint8ClampedArray:ke},c=2**Math.ceil(Math.log2(Math.sqrt(n/r))),l=Math.ceil(n/r/c);c*l*r<n&&l++;let u=c*l*r,d=new e.constructor(u);d.set(e,0),t.array=d;let f=new Ln(t.array,c,l,o,s[t.array.constructor.name]||1015);f.needsUpdate=!0,f.isPBOTexture=!0;let p=new fl(f,null,null);p.setPrecision(`high`),t.pboNode=p,t.pbo=p.value,this.getUniformFromNode(t.pboNode,`texture`,this.shaderStage,this.context.nodeName)}}getPropertyName(e,t=this.shaderStage){return e.isNodeUniform&&e.node.isTextureNode!==!0&&e.node.isBufferNode!==!0?e.name:super.getPropertyName(e,t)}generatePBO(e){let{node:t,indexNode:n}=e,r=t.value;if(this.renderer.backend.has(r)){let e=this.renderer.backend.get(r);e.pbo=r.pbo}let i=this.getUniformFromNode(r.pboNode,`texture`,this.shaderStage,this.context.nodeName),a=this.getPropertyName(i);this.increaseUsage(n);let o=n.build(this,`uint`),s=this.getDataFromNode(e),c=s.propertyName;if(c===void 0){let n=this.getVarFromNode(e);c=this.getPropertyName(n);let i=this.getDataFromNode(t),l=i.propertySizeName;l===void 0&&(l=c+`Size`,this.getVarFromNode(t,l,`uint`),this.addLineFlowCode(`${l} = uint( textureSize( ${a}, 0 ).x )`,e),i.propertySizeName=l);let{itemSize:u}=r,d=`.`+Ir.join(``).slice(0,u),f=`ivec2(${o} % ${l}, ${o} / ${l})`,p=this.generateTextureLoad(null,a,f,`0`,null,null),m=`vec4`;r.pbo.type===1014?m=`uvec4`:r.pbo.type===1013&&(m=`ivec4`),this.addLineFlowCode(`${c} = ${m}(${p})${d}`,e),s.propertyName=c}return c}generateTextureLoad(e,t,n,r,i,a){r===null&&(r=`0`);let o;return o=i?a?`texelFetchOffset( ${t}, ivec3( ${n}, ${i} ), int( ${r} ), ${a} )`:`texelFetch( ${t}, ivec3( ${n}, ${i} ), int( ${r} ) )`:a?`texelFetchOffset( ${t}, ${n}, int( ${r} ), ${a} )`:`texelFetch( ${t}, ${n}, int( ${r} ) )`,e!==null&&e.isDepthTexture&&(o+=`.x`),o}generateTexture(e,t,n,r,i){return r&&(n=`vec3( ${n}, ${r} )`),e.isDepthTexture?i?`textureOffset( ${t}, ${n}, ${i} ).x`:`texture( ${t}, ${n} ).x`:i?`textureOffset( ${t}, ${n}, ${i} )`:`texture( ${t}, ${n} )`}generateTextureLevel(e,t,n,r,i,a){return i&&(n=`vec3( ${n}, ${i} )`),a?`textureLodOffset( ${t}, ${n}, ${r}, ${a} )`:`textureLod( ${t}, ${n}, ${r} )`}generateTextureBias(e,t,n,r,i,a){return i&&(n=`vec3( ${n}, ${i} )`),a?`textureOffset( ${t}, ${n}, ${a}, ${r} )`:`texture( ${t}, ${n}, ${r} )`}generateTextureGrad(e,t,n,r,i,a){return i&&(n=`vec3( ${n}, ${i} )`),a?`textureGradOffset( ${t}, ${n}, ${r[0]}, ${r[1]}, ${a} )`:`textureGrad( ${t}, ${n}, ${r[0]}, ${r[1]} )`}generateTextureCompare(e,t,n,r,i,a,o=this.shaderStage){if(o===`fragment`)return e.isCubeTexture?`texture( ${t}, vec4( ${n}, ${r} ) )`:i?a?`textureOffset( ${t}, vec4( ${n}, ${i}, ${r} ), ${a} )`:`texture( ${t}, vec4( ${n}, ${i}, ${r} ) )`:a?`textureOffset( ${t}, vec3( ${n}, ${r} ), ${a} )`:`texture( ${t}, vec3( ${n}, ${r} ) )`;C(`WebGPURenderer: THREE.DepthTexture.compareFunction() does not support ${o} shader.`)}generateTextureGather(e,t,n,r,i,a,o){return e.isDepthTexture&&(r=`0`),a===null&&(a=`ivec2( 0 )`),o===null&&(o=`false`),i?(this._include(`textureGatherArray`),`tsl_textureGather_array( ${r}, ${t}, vec3( ${n}, ${i} ), ${a}, ${o} )`):(this._include(`textureGather`),`tsl_textureGather( ${r}, ${t}, ${n}, ${a}, ${o} )`)}generateTextureGatherCompare(e,t,n,r,i,a,o){return a===null&&(a=`ivec2( 0 )`),o===null&&(o=`false`),i?(this._include(`textureGatherCompareArray`),`tsl_textureGatherCompare_array( ${t}, vec3( ${n}, ${i} ), ${a}, ${r}, ${o} )`):(this._include(`textureGatherCompare`),`tsl_textureGatherCompare( ${t}, ${n}, ${a}, ${r}, ${o} )`)}getUniforms(e){let t=this.uniforms[e],n=[],r={};for(let e of t){let t=null,i=!1;if(e.type===`texture`||e.type===`texture3D`){let n=e.node,r=n.value,i=``;(r.isDataTexture===!0||r.isData3DTexture===!0)&&(r.type===1014?i=`u`:r.type===1013&&(i=`i`)),t=e.type===`texture3D`&&r.isArrayTexture===!1?`${i}sampler3D ${e.name};`:r.compareFunction&&n.compareNode!==null?r.isArrayTexture===!0?`sampler2DArrayShadow ${e.name};`:`sampler2DShadow ${e.name};`:r.isArrayTexture===!0||r.isDataArrayTexture===!0||r.isCompressedArrayTexture===!0?`${i}sampler2DArray ${e.name};`:`${i}sampler2D ${e.name};`}else if(e.type===`cubeTexture`)t=`samplerCube ${e.name};`;else if(e.type===`cubeDepthTexture`)t=e.node.value.compareFunction?`samplerCubeShadow ${e.name};`:`samplerCube ${e.name};`;else if(e.type===`buffer`){let n=e.node,r=this.getType(n.bufferType),i=n.bufferCount,a=i>0?i:``;t=`${n.name} {\n\t${r} ${e.name}[${a}];\n};\n`}else{let t=e.groupNode.name;if(r[t]===void 0){let e=this.uniformGroups[t];if(e!==void 0){let n=[];for(let t of e.uniforms){let e=t.getType(),r=this.getVectorType(e),i=t.nodeUniform.node.precision,a=`${r} ${t.name};`;i!==null&&(a=UE[i]+` `+a),n.push(`	`+a)}r[t]=n}}i=!0}if(!i){let r=e.node.precision;r!==null&&(t=UE[r]+` `+t),t=`uniform `+t,n.push(t)}}let i=``;for(let e in r){let t=r[e];i+=this._getGLSLUniformStruct(e,t.join(`
`))+`
`}return i+=n.join(`
`),i}getTypeFromAttribute(e){let t=super.getTypeFromAttribute(e);if(/^[iu]/.test(t)&&e.gpuType!==1013){let n=e;e.isInterleavedBufferAttribute&&(n=e.data);let r=n.array;r instanceof Uint32Array||r instanceof Int32Array||(t=t.slice(1))}return t}getAttributes(e){let t=``;if(e===`vertex`||e===`compute`){let e=this.getAttributesArray(),n=0;for(let r of e)t+=`layout( location = ${n++} ) in ${r.type} ${r.name};\n`}return t}getStructMembers(e){let t=[];for(let n of e.members)t.push(`\t${n.type} ${n.name};`);return t.join(`
`)}getStructs(e){let t=[],n=this.structs[e],r=[];for(let e of n)if(e.output)for(let t of e.members)r.push(`layout( location = ${t.index} ) out ${t.type} ${t.name};`);else{let n=`struct `+e.name+` {
`;n+=this.getStructMembers(e),n+=`
};
`,t.push(n)}return e===`fragment`&&r.length===0&&r.push(`layout( location = 0 ) out ${this.getOutputType()} fragColor;`),`
`+r.join(`
`)+`

`+t.join(`
`)}getVaryings(e){let t=``,n=this.varyings;if(e===`vertex`||e===`compute`)for(let r of n){e===`compute`&&(r.needsInterpolation=!0);let n=this.getType(r.type);if(r.needsInterpolation){if(r.interpolationType){let e=GE[r.interpolationType]||r.interpolationType,i=KE[r.interpolationSampling]||``;t+=`${e} ${i} out ${n} ${r.name};\n`}else{let e=n.includes(`int`)||n.includes(`uv`)||n.includes(`iv`)?`flat `:``;t+=`${e}out ${n} ${r.name};\n`}}else t+=`${n} ${r.name};\n`}else if(e===`fragment`){for(let e of n)if(e.needsInterpolation){let n=this.getType(e.type);if(e.interpolationType){let r=GE[e.interpolationType]||e.interpolationType,i=KE[e.interpolationSampling]||``;t+=`${r} ${i} in ${n} ${e.name};\n`}else{let r=n.includes(`int`)||n.includes(`uv`)||n.includes(`iv`)?`flat `:``;t+=`${r}in ${n} ${e.name};\n`}}}for(let n of this.builtins[e])t+=`${n};\n`;return t}getVertexIndex(){return`uint( gl_VertexID )`}getInstanceIndex(){return`uint( gl_InstanceID )`}getInvocationLocalIndex(){return`uint( gl_InstanceID ) % ${this.object.workgroupSize.reduce((e,t)=>e*t,1)}u`}getSubgroupSize(){C(`GLSLNodeBuilder: WebGLBackend does not support the subgroupSize node`)}getInvocationSubgroupIndex(){C(`GLSLNodeBuilder: WebGLBackend does not support the invocationSubgroupIndex node`)}getSubgroupIndex(){C(`GLSLNodeBuilder: WebGLBackend does not support the subgroupIndex node`)}getDrawIndex(){return this.renderer.backend.extensions.has(`WEBGL_multi_draw`)?`uint( gl_DrawID )`:`nodeUniformDrawId`}getFrontFacing(){return`gl_FrontFacing`}getFragCoord(){return`gl_FragCoord.xy`}getFragDepth(){return`gl_FragDepth`}enableExtension(e,t,n=this.shaderStage){let r=this.extensions[n]||(this.extensions[n]=new Map);r.has(e)===!1&&r.set(e,{name:e,behavior:t})}getExtensions(e){let t=[];if(e===`vertex`){let t=this.renderer.backend.extensions;this.object.isBatchedMesh&&t.has(`WEBGL_multi_draw`)&&this.enableExtension(`GL_ANGLE_multi_draw`,`require`,e)}let n=this.extensions[e];if(n!==void 0)for(let{name:e,behavior:r}of n.values())t.push(`#extension ${e} : ${r}`);return t.join(`
`)}getClipDistance(){return`gl_ClipDistance`}isAvailable(e){let t=WE[e];if(t===void 0){let n;switch(t=!1,e){case`float32Filterable`:n=`OES_texture_float_linear`;break;case`clipDistance`:n=`WEBGL_clip_cull_distance`}if(n!==void 0){let e=this.renderer.backend.extensions;e.has(n)&&(e.get(n),t=!0)}WE[e]=t}return t}isFlipY(){return!0}enableHardwareClipping(e){this.enableExtension(`GL_ANGLE_clip_cull_distance`,`require`),this.builtins.vertex.push(`out float gl_ClipDistance[ ${e} ]`)}enableMultiview(){this.enableExtension(`GL_OVR_multiview2`,`require`,`fragment`),this.enableExtension(`GL_OVR_multiview2`,`require`,`vertex`),this.builtins.vertex.push(`layout(num_views = 2) in`)}registerTransform(e,t){this.transforms.push({varyingName:e,attributeNode:t})}getTransforms(){let e=this.transforms,t=``;for(let n=0;n<e.length;n++){let r=e[n],i=this.getPropertyName(r.attributeNode);i&&(t+=`${r.varyingName} = ${i};\n\t`)}return t}_getGLSLUniformStruct(e,t){return`
layout( std140 ) uniform ${e} {
${t}
};`}_getGLSLVertexCode(e){return`#version 300 es

${this.getSignature()}

// extensions
${e.extensions}

// precision
${qE}

// structs
${e.structs}

// uniforms
${e.uniforms}

// varyings
${e.varyings}

// attributes
${e.attributes}

// vars
${e.vars}

// codes
${e.codes}

void main() {

	// transforms
	${e.transforms}

	// flow
	${e.flow}

	gl_PointSize = 1.0;

}
`}_getGLSLFragmentCode(e){return`#version 300 es

${this.getSignature()}

// extensions
${e.extensions}

// precision
${qE}

// structs
${e.structs}

// uniforms
${e.uniforms}

// varyings
${e.varyings}

// vars
${e.vars}

// codes
${e.codes}

void main() {

	// flow
	${e.flow}

}
`}buildCode(){let e=this.material===null?{compute:{}}:{fragment:{},vertex:{}};this.sortBindingGroups();for(let t in e){let n=`// code

`;n+=this.flowCode[t];let r=this.flowNodes[t],i=r[r.length-1];for(let e of r){let r=this.getFlowData(e),a=e.name;a&&(n.length>0&&(n+=`
`),n+=`\t// flow -> ${a}\n\t`),n+=`${r.code}\n\t`,e===i&&t!==`compute`&&(n+=`// result
	`,t===`vertex`?(n+=`gl_Position = `,n+=`${this.format(r.result,i.getNodeType(this),`vec4`)};`):t===`fragment`&&(e.outputNode.isOutputStructNode||(n+=`fragColor = `,n+=`${this.format(r.result,i.getNodeType(this),this.getOutputType())};`)))}let a=e[t];if(a.extensions=this.getExtensions(t),a.uniforms=this.getUniforms(t),a.attributes=this.getAttributes(t),a.varyings=this.getVaryings(t),a.vars=this.getVars(t,!0),a.structs=this.getStructs(t),a.codes=this.getCodes(t),a.transforms=this.getTransforms(t),a.flow=n,t===`vertex`){let e=this.renderer.backend.extensions;this.object.isBatchedMesh&&e.has(`WEBGL_multi_draw`)===!1&&(a.uniforms+=`
uniform uint nodeUniformDrawId;
`)}}this.material===null?this.computeShader=this._getGLSLVertexCode(e.compute):(this.vertexShader=this._getGLSLVertexCode(e.vertex),this.fragmentShader=this._getGLSLFragmentCode(e.fragment))}getUniformFromNode(e,t,n,r=null){let i=super.getUniformFromNode(e,t,n,r),a=this.getDataFromNode(e,n,this.globalCache),o=a.uniformGPU;if(o===void 0){let r=e.groupNode,s=r.name,c=this.getBindGroupArray(s,n);if(t===`texture`)o=new RE(i.name,i.node,r),c.push(o);else if(t===`cubeTexture`||t===`cubeDepthTexture`)o=new zE(i.name,i.node,r),c.push(o);else if(t===`texture3D`)o=new BE(i.name,i.node,r),c.push(o);else if(t===`buffer`){i.name=`buffer${e.id}`;let t=this.getSharedDataFromNode(e),n=t.buffer;n===void 0&&(e.name=`NodeBuffer_${e.id}`,n=new kE(e,r),n.name=e.name,t.buffer=n),c.push(n),o=n}else{let e=this.uniformGroups[s];e===void 0?(e=new PE(s,r),this.uniformGroups[s]=e,c.push(e)):c.indexOf(e)===-1&&c.push(e),o=this.getNodeUniform(i,t);let n=o.name;e.uniforms.some(e=>e.name===n)||e.addUniform(o)}a.uniformGPU=o}return i}},YE=null,XE=null,ZE=class{constructor(e={}){this.parameters=Object.assign({},e),this.data=new WeakMap,this.renderer=null,this.domElement=null,this.timestampQueryPool={[Tn.RENDER]:null,[Tn.COMPUTE]:null},this.trackTimestamp=e.trackTimestamp===!0}async init(e){this.renderer=e}get coordinateSystem(){}beginRender(){}finishRender(){}setXRTarget(){}beginCompute(){}finishCompute(){}draw(){}compute(){}createProgram(){}destroyProgram(){}createBindings(){}updateBindings(){}updateBinding(){}createRenderPipeline(){}createComputePipeline(){}needsRenderUpdate(){}getRenderCacheKey(){}createNodeBuilder(){}updateSampler(){}destroySampler(){}createDefaultTexture(){}createTexture(){}updateTexture(){}generateMipmaps(){}destroyTexture(){}async copyTextureToBuffer(){}copyTextureToTexture(){}copyFramebufferToTexture(){}createAttribute(){}createIndexAttribute(){}createStorageAttribute(){}createUniformBuffer(){}destroyUniformBuffer(){}updateAttribute(){}destroyAttribute(){}getContext(){}updateSize(){}updateViewport(){}updateTimeStampUID(e){let t=this.get(e),n=this.renderer.info.frame,r;r=e.isComputeNode===!0?`c:`+this.renderer.info.compute.frameCalls:`r:`+this.renderer.info.render.frameCalls,t.timestampUID=r+`:`+e.id+`:f`+n}getTimestampUID(e){return this.get(e).timestampUID}getTimestampFrames(e){let t=this.timestampQueryPool[e];return t?t.getTimestampFrames():[]}_getQueryPool(e){let t=e.startsWith(`c:`)?Tn.COMPUTE:Tn.RENDER;return this.timestampQueryPool[t]}getTimestamp(e){return this._getQueryPool(e).getTimestamp(e)}get hasTimestamp(){return!1}hasTimestampQuery(e){return this._getQueryPool(e).hasTimestampQuery(e)}isOccluded(){}async resolveTimestampsAsync(e=`render`){if(!this.trackTimestamp){Qn(`WebGPURenderer: Timestamp tracking is disabled.`);return}let t=this.timestampQueryPool[e];if(!t)return;let n=await t.resolveQueriesAsync();return this.renderer.info[e].timestamp=n,n}async getArrayBufferAsync(){}async hasFeatureAsync(){}hasFeature(){}getDrawingBufferSize(){return YE||=new hn,this.renderer.getDrawingBufferSize(YE)}setScissorTest(){}getClearColor(){let e=this.renderer;return XE||=new X_,e.getClearColor(XE),XE.getRGB(XE),XE}getDomElement(){let e=this.domElement;return e===null&&(e=this.parameters.canvas===void 0?bn():this.parameters.canvas,`setAttribute`in e&&e.setAttribute(`data-engine`,`three.js r185 webgpu`),this.domElement=e),e}hasCompatibility(){return!1}initRenderTarget(){}set(e,t){this.data.set(e,t)}get(e){let t=this.data.get(e);return t===void 0&&(t={},this.data.set(e,t)),t}has(e){return this.data.has(e)}delete(e){this.data.delete(e)}deleteBindGroupData(){}dispose(){}},QE=0,$E=class{constructor(e,t){this.buffers=[e.bufferGPU,t],this.type=e.type,this.bufferType=e.bufferType,this.pbo=e.pbo,this.byteLength=e.byteLength,this.bytesPerElement=e.BYTES_PER_ELEMENT,this.version=e.version,this.isInteger=e.isInteger,this.activeBufferIndex=0,this.baseId=e.id}get id(){return`${this.baseId}|${this.activeBufferIndex}`}get bufferGPU(){return this.buffers[this.activeBufferIndex]}get transformBuffer(){return this.buffers[this.activeBufferIndex^1]}switchBuffers(){this.activeBufferIndex^=1}},eD=class{constructor(e){this.backend=e}createAttribute(e,t){let n=this.backend,{gl:r}=n,i=e.array,a=e.usage||r.STATIC_DRAW,o=e.isInterleavedBufferAttribute?e.data:e,s=n.get(o),c=s.bufferGPU;c===void 0&&(c=this._createBuffer(r,t,i,a),s.bufferGPU=c,s.bufferType=t,s.version=o.version);let l;if(i instanceof Float32Array)l=r.FLOAT;else if(typeof Float16Array<`u`&&i instanceof Float16Array)l=r.HALF_FLOAT;else if(i instanceof Uint16Array)l=e.isFloat16BufferAttribute?r.HALF_FLOAT:r.UNSIGNED_SHORT;else if(i instanceof Int16Array)l=r.SHORT;else if(i instanceof Uint32Array)l=r.UNSIGNED_INT;else if(i instanceof Int32Array)l=r.INT;else if(i instanceof Int8Array)l=r.BYTE;else if(i instanceof Uint8Array)l=r.UNSIGNED_BYTE;else if(i instanceof Uint8ClampedArray)l=r.UNSIGNED_BYTE;else throw Error(`THREE.WebGLBackend: Unsupported buffer data format: `+i);let u={bufferGPU:c,bufferType:t,type:l,byteLength:i.byteLength,bytesPerElement:i.BYTES_PER_ELEMENT,version:e.version,pbo:e.pbo,isInteger:l===r.INT||l===r.UNSIGNED_INT||e.gpuType===1013,id:QE++};if(e.isStorageBufferAttribute||e.isStorageInstancedBufferAttribute){let e=this._createBuffer(r,t,i,a);u=new $E(u,e)}n.set(e,u)}updateAttribute(e){let t=this.backend,{gl:n}=t,r=e.array,i=e.isInterleavedBufferAttribute?e.data:e,a=t.get(i),o=a.bufferType,s=e.isInterleavedBufferAttribute?e.data.updateRanges:e.updateRanges;if(n.bindBuffer(o,a.bufferGPU),s.length===0)n.bufferSubData(o,0,r);else{for(let e=0,t=s.length;e<t;e++){let t=s[e];n.bufferSubData(o,t.start*r.BYTES_PER_ELEMENT,r,t.start,t.count)}i.clearUpdateRanges()}n.bindBuffer(o,null),a.version=i.version}destroyAttribute(e){let t=this.backend,{gl:n}=t;e.isInterleavedBufferAttribute&&t.delete(e.data);let r=t.get(e);n.deleteBuffer(r.bufferGPU),t.delete(e)}async getArrayBufferAsync(e,t=null,n=0,r=-1){let i=this.backend,{gl:a}=i,o=e.isInterleavedBufferAttribute?e.data:e,s=i.get(o),{bufferGPU:c}=s,l=r===-1?s.byteLength-n:r,u;if(t===null)u=new Uint8Array(new ArrayBuffer(l));else if(t.isReadbackBuffer){if(t._mapped===!0)throw Error(`THREE.WebGPURenderer: ReadbackBuffer must be released before being used again.`);let e=()=>{t.buffer=null,t._mapped=!1,t.removeEventListener(`release`,e),t.removeEventListener(`dispose`,e)};t.addEventListener(`release`,e),t.addEventListener(`dispose`,e),u=new Uint8Array(new ArrayBuffer(l)),t.buffer=u.buffer}else u=new Uint8Array(t);return a.bindBuffer(a.COPY_READ_BUFFER,c),a.getBufferSubData(a.COPY_READ_BUFFER,n,u),a.bindBuffer(a.COPY_READ_BUFFER,null),a.bindBuffer(a.COPY_WRITE_BUFFER,null),t&&t.isReadbackBuffer?t:u.buffer}_createBuffer(e,t,n,r){let i=e.createBuffer();return e.bindBuffer(t,i),e.bufferData(t,n,r),e.bindBuffer(t,null),i}},tD,nD,rD=class{constructor(e){this.backend=e,this.gl=this.backend.gl,this.enabled={},this.parameters={},this.currentFlipSided=null,this.currentCullFace=null,this.currentProgram=null,this.currentBlendingEnabled=!1,this.currentBlending=null,this.currentBlendSrc=null,this.currentBlendDst=null,this.currentBlendSrcAlpha=null,this.currentBlendDstAlpha=null,this.currentPremultipledAlpha=null,this.currentPolygonOffsetFactor=null,this.currentPolygonOffsetUnits=null,this.currentColorMask=null,this.currentDepthReversed=!1,this.currentDepthFunc=null,this.currentDepthMask=null,this.currentStencilFunc=null,this.currentStencilRef=null,this.currentStencilFuncMask=null,this.currentStencilFail=null,this.currentStencilZFail=null,this.currentStencilZPass=null,this.currentStencilMask=null,this.currentLineWidth=null,this.currentClippingPlanes=0,this.currentVAO=null,this.currentIndex=null,this.currentBoundFramebuffers={},this.currentDrawbuffers=new WeakMap,this.maxTextures=this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS),this.currentTextureSlot=null,this.currentBoundTextures={},this.currentBoundBufferBases={},this._init()}_init(){let e=this.gl;tD={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT},nD={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA};let t=e.getParameter(e.SCISSOR_BOX),n=e.getParameter(e.VIEWPORT);this.currentScissor=new bt().fromArray(t),this.currentViewport=new bt().fromArray(n),this._tempVec4=new bt}enable(e){let{enabled:t}=this;t[e]!==!0&&(this.gl.enable(e),t[e]=!0)}disable(e){let{enabled:t}=this;t[e]!==!1&&(this.gl.disable(e),t[e]=!1)}setFlipSided(e){if(this.currentFlipSided!==e){let{gl:t}=this;e?t.frontFace(t.CW):t.frontFace(t.CCW),this.currentFlipSided=e}}setCullFace(e){let{gl:t}=this;e===0?this.disable(t.CULL_FACE):(this.enable(t.CULL_FACE),e!==this.currentCullFace&&(e===1?t.cullFace(t.BACK):e===2?t.cullFace(t.FRONT):t.cullFace(t.FRONT_AND_BACK))),this.currentCullFace=e}setLineWidth(e){let{currentLineWidth:t,gl:n}=this;e!==t&&(n.lineWidth(e),this.currentLineWidth=e)}setMRTBlending(e,t,n){let r=this.gl,i=this.backend.drawBuffersIndexedExt;if(!i){Qn(`WebGPURenderer: Multiple Render Targets (MRT) blending configuration is not fully supported in compatibility mode. The material blending will be used for all render targets.`);return}for(let a=0;a<e.length;a++){let o=e[a],s=null;if(t!==null){let e=t.getBlendMode(o.name);e.blending===6?s=n:e.blending!==0&&(s=e)}else s=n;s===null?i.blendFuncSeparateiOES(a,r.ONE,r.ZERO,r.ONE,r.ZERO):this._setMRTBlendingIndex(a,s)}}_setMRTBlendingIndex(e,t){let{gl:n}=this,r=this.backend.drawBuffersIndexedExt,i=t.blending,a=t.blendSrc,o=t.blendDst,s=t.blendEquation,c=t.premultipliedAlpha;if(i===5){let n=t.blendSrcAlpha===null?a:t.blendSrcAlpha,i=t.blendDstAlpha===null?o:t.blendDstAlpha,c=t.blendEquationAlpha===null?s:t.blendEquationAlpha;r.blendEquationSeparateiOES(e,tD[s],tD[c]),r.blendFuncSeparateiOES(e,nD[a],nD[o],nD[n],nD[i])}else if(r.blendEquationSeparateiOES(e,n.FUNC_ADD,n.FUNC_ADD),c)switch(i){case 1:r.blendFuncSeparateiOES(e,n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:r.blendFuncSeparateiOES(e,n.ONE,n.ONE,n.ONE,n.ONE);break;case 3:r.blendFuncSeparateiOES(e,n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case 4:r.blendFuncSeparateiOES(e,n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:r.blendFuncSeparateiOES(e,n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA)}else switch(i){case 1:r.blendFuncSeparateiOES(e,n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:r.blendFuncSeparateiOES(e,n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case 3:r.blendFuncSeparateiOES(e,n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case 4:r.blendFuncSeparateiOES(e,n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:r.blendFuncSeparateiOES(e,n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA)}}setBlending(e,t,n,r,i,a,o,s){let{gl:c}=this;if(e===0){this.currentBlendingEnabled===!0&&(this.disable(c.BLEND),this.currentBlendingEnabled=!1);return}if(this.currentBlendingEnabled===!1&&(this.enable(c.BLEND),this.currentBlendingEnabled=!0),e!==5){if(e!==this.currentBlending||s!==this.currentPremultipledAlpha){if((this.currentBlendEquation!==100||this.currentBlendEquationAlpha!==100)&&(c.blendEquation(c.FUNC_ADD),this.currentBlendEquation=100,this.currentBlendEquationAlpha=100),s)switch(e){case 1:c.blendFuncSeparate(c.ONE,c.ONE_MINUS_SRC_ALPHA,c.ONE,c.ONE_MINUS_SRC_ALPHA);break;case 2:c.blendFunc(c.ONE,c.ONE);break;case 3:c.blendFuncSeparate(c.ZERO,c.ONE_MINUS_SRC_COLOR,c.ZERO,c.ONE);break;case 4:c.blendFuncSeparate(c.DST_COLOR,c.ONE_MINUS_SRC_ALPHA,c.ZERO,c.ONE);break;default:C(`WebGLState: Invalid blending: `,e)}else switch(e){case 1:c.blendFuncSeparate(c.SRC_ALPHA,c.ONE_MINUS_SRC_ALPHA,c.ONE,c.ONE_MINUS_SRC_ALPHA);break;case 2:c.blendFuncSeparate(c.SRC_ALPHA,c.ONE,c.ONE,c.ONE);break;case 3:C(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:C(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:C(`WebGLState: Invalid blending: `,e)}this.currentBlendSrc=null,this.currentBlendDst=null,this.currentBlendSrcAlpha=null,this.currentBlendDstAlpha=null,this.currentBlending=e,this.currentPremultipledAlpha=s}return}i||=t,a||=n,o||=r,(t!==this.currentBlendEquation||i!==this.currentBlendEquationAlpha)&&(c.blendEquationSeparate(tD[t],tD[i]),this.currentBlendEquation=t,this.currentBlendEquationAlpha=i),(n!==this.currentBlendSrc||r!==this.currentBlendDst||a!==this.currentBlendSrcAlpha||o!==this.currentBlendDstAlpha)&&(c.blendFuncSeparate(nD[n],nD[r],nD[a],nD[o]),this.currentBlendSrc=n,this.currentBlendDst=r,this.currentBlendSrcAlpha=a,this.currentBlendDstAlpha=o),this.currentBlending=e,this.currentPremultipledAlpha=!1}setColorMask(e){this.currentColorMask!==e&&(this.gl.colorMask(e,e,e,e),this.currentColorMask=e)}setDepthTest(e){let{gl:t}=this;e?this.enable(t.DEPTH_TEST):this.disable(t.DEPTH_TEST)}setReversedDepth(e){if(this.currentDepthReversed!==e){let t=this.backend.extensions.get(`EXT_clip_control`);e?t.clipControlEXT(t.LOWER_LEFT_EXT,t.ZERO_TO_ONE_EXT):t.clipControlEXT(t.LOWER_LEFT_EXT,t.NEGATIVE_ONE_TO_ONE_EXT),this.currentDepthReversed=e}}setDepthMask(e){this.currentDepthMask!==e&&(this.gl.depthMask(e),this.currentDepthMask=e)}setDepthFunc(e){if(this.currentDepthReversed&&(e=qn[e]),this.currentDepthFunc!==e){let{gl:t}=this;switch(e){case 0:t.depthFunc(t.NEVER);break;case 1:t.depthFunc(t.ALWAYS);break;case 2:t.depthFunc(t.LESS);break;case 3:t.depthFunc(t.LEQUAL);break;case 4:t.depthFunc(t.EQUAL);break;case 5:t.depthFunc(t.GEQUAL);break;case 6:t.depthFunc(t.GREATER);break;case 7:t.depthFunc(t.NOTEQUAL);break;default:t.depthFunc(t.LEQUAL)}this.currentDepthFunc=e}}scissor(e,t,n,r){let i=this._tempVec4.set(e,t,n,r);if(this.currentScissor.equals(i)===!1){let{gl:e}=this;e.scissor(i.x,i.y,i.z,i.w),this.currentScissor.copy(i)}}viewport(e,t,n,r){let i=this._tempVec4.set(e,t,n,r);if(this.currentViewport.equals(i)===!1){let{gl:e}=this;e.viewport(i.x,i.y,i.z,i.w),this.currentViewport.copy(i)}}setScissorTest(e){let t=this.gl;e?this.enable(t.SCISSOR_TEST):this.disable(t.SCISSOR_TEST)}setStencilTest(e){let{gl:t}=this;e?this.enable(t.STENCIL_TEST):this.disable(t.STENCIL_TEST)}setStencilMask(e){this.currentStencilMask!==e&&(this.gl.stencilMask(e),this.currentStencilMask=e)}setStencilFunc(e,t,n){(this.currentStencilFunc!==e||this.currentStencilRef!==t||this.currentStencilFuncMask!==n)&&(this.gl.stencilFunc(e,t,n),this.currentStencilFunc=e,this.currentStencilRef=t,this.currentStencilFuncMask=n)}setStencilOp(e,t,n){(this.currentStencilFail!==e||this.currentStencilZFail!==t||this.currentStencilZPass!==n)&&(this.gl.stencilOp(e,t,n),this.currentStencilFail=e,this.currentStencilZFail=t,this.currentStencilZPass=n)}setMaterial(e,t,n){let{gl:r}=this;e.side===2?this.disable(r.CULL_FACE):this.enable(r.CULL_FACE);let i=e.side===1;t&&(i=!i),this.setFlipSided(i),e.blending===1&&e.transparent===!1?this.setBlending(0):this.setBlending(e.blending,e.blendEquation,e.blendSrc,e.blendDst,e.blendEquationAlpha,e.blendSrcAlpha,e.blendDstAlpha,e.premultipliedAlpha),this.setDepthFunc(e.depthFunc),this.setDepthTest(e.depthTest),this.setDepthMask(e.depthWrite),this.setColorMask(e.colorWrite);let a=e.stencilWrite;if(this.setStencilTest(a),a&&(this.setStencilMask(e.stencilWriteMask),this.setStencilFunc(e.stencilFunc,e.stencilRef,e.stencilFuncMask),this.setStencilOp(e.stencilFail,e.stencilZFail,e.stencilZPass)),this.setPolygonOffset(e.polygonOffset,e.polygonOffsetFactor,e.polygonOffsetUnits),e.alphaToCoverage===!0&&this.backend.renderer.currentSamples>0?this.enable(r.SAMPLE_ALPHA_TO_COVERAGE):this.disable(r.SAMPLE_ALPHA_TO_COVERAGE),n>0&&this.currentClippingPlanes!==n){let e=12288;for(let t=0;t<8;t++)t<n?this.enable(e+t):this.disable(e+t)}}setPolygonOffset(e,t,n){let{gl:r}=this;e?(this.enable(r.POLYGON_OFFSET_FILL),(this.currentPolygonOffsetFactor!==t||this.currentPolygonOffsetUnits!==n)&&(r.polygonOffset(t,n),this.currentPolygonOffsetFactor=t,this.currentPolygonOffsetUnits=n)):this.disable(r.POLYGON_OFFSET_FILL)}useProgram(e){return this.currentProgram!==e&&(this.gl.useProgram(e),this.currentProgram=e,!0)}setVertexState(e,t=null){let n=this.gl;return this.currentVAO!==e||this.currentIndex!==t?(n.bindVertexArray(e),t!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t),this.currentVAO=e,this.currentIndex=t,!0):!1}resetVertexState(){let e=this.gl;e.bindVertexArray(null),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null),this.currentVAO=null,this.currentIndex=null}bindFramebuffer(e,t){let{gl:n,currentBoundFramebuffers:r}=this;return r[e]!==t&&(n.bindFramebuffer(e,t),r[e]=t,e===n.DRAW_FRAMEBUFFER&&(r[n.FRAMEBUFFER]=t),e===n.FRAMEBUFFER&&(r[n.DRAW_FRAMEBUFFER]=t),!0)}drawBuffers(e,t){let{gl:n}=this,r=[],i=!1;if(e.textures!==null){r=this.currentDrawbuffers.get(t),r===void 0&&(r=[],this.currentDrawbuffers.set(t,r));let a=e.textures;if(r.length!==a.length||r[0]!==n.COLOR_ATTACHMENT0){for(let e=0,t=a.length;e<t;e++)r[e]=n.COLOR_ATTACHMENT0+e;r.length=a.length,i=!0}}else r[0]!==n.BACK&&(r[0]=n.BACK,i=!0);i&&n.drawBuffers(r)}activeTexture(e){let{gl:t,currentTextureSlot:n,maxTextures:r}=this;e===void 0&&(e=t.TEXTURE0+r-1),n!==e&&(t.activeTexture(e),this.currentTextureSlot=e)}bindTexture(e,t,n){let{gl:r,currentTextureSlot:i,currentBoundTextures:a,maxTextures:o}=this;n===void 0&&(n=i===null?r.TEXTURE0+o-1:i);let s=a[n];s===void 0&&(s={type:void 0,texture:void 0},a[n]=s),(s.type!==e||s.texture!==t)&&(i!==n&&(r.activeTexture(n),this.currentTextureSlot=n),r.bindTexture(e,t),s.type=e,s.texture=t)}bindBufferBase(e,t,n){let{gl:r}=this,i=`${e}-${t}`;return this.currentBoundBufferBases[i]!==n&&(r.bindBufferBase(e,t,n),this.currentBoundBufferBases[i]=n,!0)}unbindTexture(){let{gl:e,currentTextureSlot:t,currentBoundTextures:n}=this,r=n[t];r!==void 0&&r.type!==void 0&&(e.bindTexture(r.type,null),r.type=void 0,r.texture=void 0)}getParameter(e){let{gl:t,parameters:n}=this;return n[e]===void 0?t.getParameter(e):n[e]}pixelStorei(e,t){let{gl:n,parameters:r}=this;r[e]!==t&&(n.pixelStorei(e,t),r[e]=t)}},iD=class{constructor(e){this.backend=e,this.gl=this.backend.gl,this.extensions=e.extensions}convert(e,t=``){let{gl:n,extensions:r}=this,i,a=Cn.getTransfer(t);if(e===1009)return n.UNSIGNED_BYTE;if(e===1017)return n.UNSIGNED_SHORT_4_4_4_4;if(e===1018)return n.UNSIGNED_SHORT_5_5_5_1;if(e===35902)return n.UNSIGNED_INT_5_9_9_9_REV;if(e===35899)return n.UNSIGNED_INT_10F_11F_11F_REV;if(e===1010)return n.BYTE;if(e===1011)return n.SHORT;if(e===1012)return n.UNSIGNED_SHORT;if(e===1013)return n.INT;if(e===1014)return n.UNSIGNED_INT;if(e===1015)return n.FLOAT;if(e===1016)return n.HALF_FLOAT;if(e===1021)return n.ALPHA;if(e===1022)return n.RGB;if(e===1023)return n.RGBA;if(e===1026)return n.DEPTH_COMPONENT;if(e===1027)return n.DEPTH_STENCIL;if(e===1028)return n.RED;if(e===1029)return n.RED_INTEGER;if(e===1030)return n.RG;if(e===1031)return n.RG_INTEGER;if(e===1033)return n.RGBA_INTEGER;if(e===33776||e===33777||e===33778||e===33779){if(a===`srgb`){if(i=r.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(e===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(e===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(e===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(e===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=r.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(e===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(e===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(e===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(e===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(e===35840||e===35841||e===35842||e===35843){if(i=r.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(e===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(e===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(e===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(e===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(e===36196||e===37492||e===37496||e===37488||e===37489||e===37490||e===37491){if(i=r.get(`WEBGL_compressed_texture_etc`),i!==null){if(e===36196||e===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(e===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(e===37488)return i.COMPRESSED_R11_EAC;if(e===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(e===37490)return i.COMPRESSED_RG11_EAC;if(e===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(e===37808||e===37809||e===37810||e===37811||e===37812||e===37813||e===37814||e===37815||e===37816||e===37817||e===37818||e===37819||e===37820||e===37821){if(i=r.get(`WEBGL_compressed_texture_astc`),i!==null){if(e===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(e===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(e===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(e===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(e===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(e===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(e===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(e===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(e===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(e===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(e===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(e===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(e===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(e===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(e===36492||e===36494||e===36495){if(i=r.get(`EXT_texture_compression_bptc`),i!==null){if(e===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(e===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(e===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(e===36283||e===36284||e===36285||e===36286){if(i=r.get(`EXT_texture_compression_rgtc`),i!==null){if(e===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(e===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(e===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(e===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return e===1020?n.UNSIGNED_INT_24_8:n[e]===void 0?null:n[e]}_clientWaitAsync(){let{gl:e}=this,t=e.fenceSync(e.SYNC_GPU_COMMANDS_COMPLETE,0);return e.flush(),new Promise((n,r)=>{function i(){let a=e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0);if(a===e.WAIT_FAILED){e.deleteSync(t),r();return}if(a===e.TIMEOUT_EXPIRED){requestAnimationFrame(i);return}e.deleteSync(t),n()}i()})}},aD=!1,oD,sD,cD,lD=class{constructor(e){this.backend=e,this.gl=e.gl,this.extensions=e.extensions,this.defaultTextures={},this._srcFramebuffer=null,this._dstFramebuffer=null,aD===!1&&(this._init(),aD=!0)}_init(){let e=this.gl;oD={[Fe]:e.REPEAT,[S]:e.CLAMP_TO_EDGE,[cn]:e.MIRRORED_REPEAT},sD={[Ht]:e.NEAREST,[ct]:e.NEAREST_MIPMAP_NEAREST,[Lt]:e.NEAREST_MIPMAP_LINEAR,[te]:e.LINEAR,[ue]:e.LINEAR_MIPMAP_NEAREST,[En]:e.LINEAR_MIPMAP_LINEAR},cD={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL}}getGLTextureType(e){let{gl:t}=this,n;return n=e.isCubeTexture===!0?t.TEXTURE_CUBE_MAP:e.isArrayTexture===!0||e.isDataArrayTexture===!0||e.isCompressedArrayTexture===!0?t.TEXTURE_2D_ARRAY:e.isData3DTexture===!0?t.TEXTURE_3D:t.TEXTURE_2D,n}getInternalFormat(e,t,n,r,i,a=!1){let{gl:o,extensions:s}=this;if(e!==null){if(o[e]!==void 0)return o[e];T(`WebGLBackend: Attempt to use non-existing WebGL internal format '`+e+`'`)}let c=null;r&&(c=s.get(`EXT_texture_norm16`),c||T(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=t;if(t===o.RED&&(n===o.FLOAT&&(l=o.R32F),n===o.HALF_FLOAT&&(l=o.R16F),n===o.UNSIGNED_BYTE&&(l=o.R8),n===o.BYTE&&(l=o.R8_SNORM),n===o.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),n===o.SHORT&&c&&(l=c.R16_SNORM_EXT)),t===o.RED_INTEGER&&(n===o.UNSIGNED_BYTE&&(l=o.R8UI),n===o.UNSIGNED_SHORT&&(l=o.R16UI),n===o.UNSIGNED_INT&&(l=o.R32UI),n===o.BYTE&&(l=o.R8I),n===o.SHORT&&(l=o.R16I),n===o.INT&&(l=o.R32I)),t===o.RG&&(n===o.FLOAT&&(l=o.RG32F),n===o.HALF_FLOAT&&(l=o.RG16F),n===o.UNSIGNED_BYTE&&(l=o.RG8),n===o.BYTE&&(l=o.RG8_SNORM),n===o.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),n===o.SHORT&&c&&(l=c.RG16_SNORM_EXT)),t===o.RG_INTEGER&&(n===o.UNSIGNED_BYTE&&(l=o.RG8UI),n===o.UNSIGNED_SHORT&&(l=o.RG16UI),n===o.UNSIGNED_INT&&(l=o.RG32UI),n===o.BYTE&&(l=o.RG8I),n===o.SHORT&&(l=o.RG16I),n===o.INT&&(l=o.RG32I)),t===o.RGB){let e=a?$e:Cn.getTransfer(i);n===o.FLOAT&&(l=o.RGB32F),n===o.HALF_FLOAT&&(l=o.RGB16F),n===o.UNSIGNED_BYTE&&(l=e===`srgb`?o.SRGB8:o.RGB8),n===o.BYTE&&(l=o.RGB8_SNORM),n===o.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),n===o.SHORT&&c&&(l=c.RGB16_SNORM_EXT),n===o.UNSIGNED_SHORT_5_6_5&&(l=o.RGB565),n===o.UNSIGNED_SHORT_5_5_5_1&&(l=o.RGB5_A1),n===o.UNSIGNED_SHORT_4_4_4_4&&(l=o.RGB4),n===o.UNSIGNED_INT_5_9_9_9_REV&&(l=o.RGB9_E5),n===o.UNSIGNED_INT_10F_11F_11F_REV&&(l=o.R11F_G11F_B10F)}if(t===o.RGB_INTEGER&&(n===o.UNSIGNED_BYTE&&(l=o.RGB8UI),n===o.UNSIGNED_SHORT&&(l=o.RGB16UI),n===o.UNSIGNED_INT&&(l=o.RGB32UI),n===o.BYTE&&(l=o.RGB8I),n===o.SHORT&&(l=o.RGB16I),n===o.INT&&(l=o.RGB32I)),t===o.RGBA){let e=a?$e:Cn.getTransfer(i);n===o.FLOAT&&(l=o.RGBA32F),n===o.HALF_FLOAT&&(l=o.RGBA16F),n===o.UNSIGNED_BYTE&&(l=e===`srgb`?o.SRGB8_ALPHA8:o.RGBA8),n===o.BYTE&&(l=o.RGBA8_SNORM),n===o.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),n===o.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),n===o.UNSIGNED_SHORT_4_4_4_4&&(l=o.RGBA4),n===o.UNSIGNED_SHORT_5_5_5_1&&(l=o.RGB5_A1)}return t===o.RGBA_INTEGER&&(n===o.UNSIGNED_BYTE&&(l=o.RGBA8UI),n===o.UNSIGNED_SHORT&&(l=o.RGBA16UI),n===o.UNSIGNED_INT&&(l=o.RGBA32UI),n===o.BYTE&&(l=o.RGBA8I),n===o.SHORT&&(l=o.RGBA16I),n===o.INT&&(l=o.RGBA32I)),t===o.DEPTH_COMPONENT&&(n===o.UNSIGNED_SHORT&&(l=o.DEPTH_COMPONENT16),n===o.UNSIGNED_INT&&(l=o.DEPTH_COMPONENT24),n===o.FLOAT&&(l=o.DEPTH_COMPONENT32F)),t===o.DEPTH_STENCIL&&n===o.UNSIGNED_INT_24_8&&(l=o.DEPTH24_STENCIL8),(l===o.R16F||l===o.R32F||l===o.RG16F||l===o.RG32F||l===o.RGBA16F||l===o.RGBA32F)&&s.get(`EXT_color_buffer_float`),l}setTextureParameters(e,t){let{gl:n,extensions:r,backend:i}=this,{state:a}=this.backend,o=Cn.getPrimaries(Cn.workingColorSpace),s=t.colorSpace===``?null:Cn.getPrimaries(t.colorSpace),c=t.colorSpace===``||o===s?n.NONE:n.BROWSER_DEFAULT_WEBGL;a.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,t.flipY),a.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),a.pixelStorei(n.UNPACK_ALIGNMENT,t.unpackAlignment),a.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,c),n.texParameteri(e,n.TEXTURE_WRAP_S,oD[t.wrapS]),n.texParameteri(e,n.TEXTURE_WRAP_T,oD[t.wrapT]),(e===n.TEXTURE_3D||e===n.TEXTURE_2D_ARRAY)&&(t.isArrayTexture||n.texParameteri(e,n.TEXTURE_WRAP_R,oD[t.wrapR])),n.texParameteri(e,n.TEXTURE_MAG_FILTER,sD[t.magFilter]);let l=t.mipmaps!==void 0&&t.mipmaps.length>0,u=t.minFilter===1006&&l?En:t.minFilter;if(n.texParameteri(e,n.TEXTURE_MIN_FILTER,sD[u]),t.compareFunction&&(n.texParameteri(e,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(e,n.TEXTURE_COMPARE_FUNC,cD[t.compareFunction])),r.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&r.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1){let a=r.get(`EXT_texture_filter_anisotropic`);n.texParameterf(e,a.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,i.capabilities.getMaxAnisotropy()))}}}createDefaultTexture(e){let{gl:t,backend:n,defaultTextures:r}=this,i=this.getGLTextureType(e),a=r[i];a===void 0&&(a=t.createTexture(),n.state.bindTexture(i,a),t.texParameteri(i,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(i,t.TEXTURE_MAG_FILTER,t.NEAREST),r[i]=a),n.set(e,{textureGPU:a,glTextureType:i})}createTexture(e,t){let{gl:n,backend:r}=this,i,a,o,s,c;if(e.isExternalTexture===!0)i=e.sourceTexture,a=this.getGLTextureType(e);else{let{levels:l,width:u,height:d,depth:f}=t;o=r.utils.convert(e.format,e.colorSpace),s=r.utils.convert(e.type),c=this.getInternalFormat(e.internalFormat,o,s,e.normalized,e.colorSpace,e.isVideoTexture),i=n.createTexture(),a=this.getGLTextureType(e),r.state.bindTexture(a,i),this.setTextureParameters(a,e),e.isArrayTexture||e.isDataArrayTexture||e.isCompressedArrayTexture?n.texStorage3D(n.TEXTURE_2D_ARRAY,l,c,u,d,f):e.isData3DTexture?n.texStorage3D(n.TEXTURE_3D,l,c,u,d,f):e.isVideoTexture||n.texStorage2D(a,l,c,u,d)}r.set(e,{textureGPU:i,glTextureType:a,glFormat:o,glType:s,glInternalFormat:c})}copyBufferToTexture(e,t){let{gl:n,backend:r}=this,{state:i}=r,{textureGPU:a,glTextureType:o,glFormat:s,glType:c}=r.get(t),{width:l,height:u}=t.source.data;n.bindBuffer(n.PIXEL_UNPACK_BUFFER,e),r.state.bindTexture(o,a),i.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.texSubImage2D(o,0,0,0,l,u,s,c,0),n.bindBuffer(n.PIXEL_UNPACK_BUFFER,null),r.state.unbindTexture()}updateTexture(e,t){let{gl:n}=this,{width:r,height:i}=t,{textureGPU:a,glTextureType:o,glFormat:s,glType:c,glInternalFormat:l}=this.backend.get(e);if(!(e.isRenderTargetTexture||a===void 0)){if(this.backend.state.bindTexture(o,a),this.setTextureParameters(o,e),e.isCompressedTexture){let r=e.mipmaps,i=t.image;for(let t=0;t<r.length;t++){let a=r[t];e.isCompressedArrayTexture?e.format===n.RGBA?n.texSubImage3D(n.TEXTURE_2D_ARRAY,t,0,0,0,a.width,a.height,i.depth,s,c,a.data):s===null?T(`WebGLBackend: Attempt to load unsupported compressed texture format in .uploadTexture()`):n.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,t,0,0,0,a.width,a.height,i.depth,s,a.data):s===null?T(`WebGLBackend: Unsupported compressed texture format`):n.compressedTexSubImage2D(n.TEXTURE_2D,t,0,0,a.width,a.height,s,a.data)}}else if(e.isCubeTexture){let a=t.images,o=e.mipmaps;for(let e=0;e<6;e++){let t=uD(a[e]);n.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,r,i,s,c,t);for(let t=0;t<o.length;t++){let r=o[t],i=uD(r.images[e]);n.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,i.width,i.height,s,c,i)}}}else if(e.isDataArrayTexture||e.isArrayTexture){let r=t.image;if(e.layerUpdates.size>0){let t=Vt(r.width,r.height,e.format,e.type);for(let i of e.layerUpdates){let e=r.data.subarray(i*t/r.data.BYTES_PER_ELEMENT,(i+1)*t/r.data.BYTES_PER_ELEMENT);n.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,i,r.width,r.height,1,s,c,e)}e.clearLayerUpdates()}else n.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,r.width,r.height,r.depth,s,c,r.data)}else if(e.isData3DTexture){let e=t.image;n.texSubImage3D(n.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)}else if(e.isVideoTexture)e.update(),n.texImage2D(o,0,l,s,c,t.image);else if(e.isHTMLTexture)typeof n.texElementImage2D==`function`&&(n.texElementImage2D.length===3?n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,t.image):n.texElementImage2D(n.TEXTURE_2D,0,n.RGBA,n.RGBA,n.UNSIGNED_BYTE,t.image));else{let a=e.mipmaps;if(a.length>0)for(let e=0,t=a.length;e<t;e++){let t=a[e],r=uD(t);n.texSubImage2D(o,e,0,0,t.width,t.height,s,c,r)}else{let e=uD(t.image);n.texSubImage2D(o,0,0,0,r,i,s,c,e)}}}}generateMipmaps(e){let{gl:t,backend:n}=this,{textureGPU:r,glTextureType:i}=n.get(e);n.state.bindTexture(i,r),t.generateMipmap(i)}deallocateRenderBuffers(e){let{gl:t,backend:n}=this;if(e){let r=n.get(e);if(r.renderBufferStorageSetup=void 0,r.framebuffers){for(let e in r.framebuffers)t.deleteFramebuffer(r.framebuffers[e]);delete r.framebuffers}if(r.depthRenderbuffer&&(t.deleteRenderbuffer(r.depthRenderbuffer),delete r.depthRenderbuffer),r.stencilRenderbuffer&&(t.deleteRenderbuffer(r.stencilRenderbuffer),delete r.stencilRenderbuffer),r.msaaFrameBuffer&&(t.deleteFramebuffer(r.msaaFrameBuffer),delete r.msaaFrameBuffer),r.msaaRenderbuffers){for(let e=0;e<r.msaaRenderbuffers.length;e++)t.deleteRenderbuffer(r.msaaRenderbuffers[e]);delete r.msaaRenderbuffers}}}destroyTexture(e,t=!1){let{gl:n,backend:r}=this,{textureGPU:i,renderTarget:a}=r.get(e);this.deallocateRenderBuffers(a),t===!1&&e.isExternalTexture!==!0&&n.deleteTexture(i),r.delete(e)}copyTextureToTexture(e,t,n=null,r=null,i=0,a=0){let{gl:o,backend:s}=this,{state:c}=this.backend,{textureGPU:l,glTextureType:u,glType:d,glFormat:f}=s.get(t);c.bindTexture(u,l);let p,m,h,g,_,v,y,b,x,S=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)p=n.max.x-n.min.x,m=n.max.y-n.min.y,h=n.isBox3?n.max.z-n.min.z:1,g=n.min.x,_=n.min.y,v=n.isBox3?n.min.z:0;else{let t=2**-i;p=Math.floor(S.width*t),m=Math.floor(S.height*t),h=e.isDataArrayTexture||e.isArrayTexture?S.depth:e.isData3DTexture?Math.floor(S.depth*t):1,g=0,_=0,v=0}r===null?(y=0,b=0,x=0):(y=r.x,b=r.y,x=r.z),c.pixelStorei(o.UNPACK_FLIP_Y_WEBGL,t.flipY),c.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),c.pixelStorei(o.UNPACK_ALIGNMENT,t.unpackAlignment);let ee=c.getParameter(o.UNPACK_ROW_LENGTH),te=c.getParameter(o.UNPACK_IMAGE_HEIGHT),ne=c.getParameter(o.UNPACK_SKIP_PIXELS),re=c.getParameter(o.UNPACK_SKIP_ROWS),ie=c.getParameter(o.UNPACK_SKIP_IMAGES);c.pixelStorei(o.UNPACK_ROW_LENGTH,S.width),c.pixelStorei(o.UNPACK_IMAGE_HEIGHT,S.height),c.pixelStorei(o.UNPACK_SKIP_PIXELS,g),c.pixelStorei(o.UNPACK_SKIP_ROWS,_),c.pixelStorei(o.UNPACK_SKIP_IMAGES,v);let ae=e.isDataArrayTexture||e.isData3DTexture||t.isArrayTexture,oe=t.isDataArrayTexture||t.isData3DTexture||t.isArrayTexture;if(e.isDepthTexture){let n=s.get(e),r=s.get(t),u=s.get(n.renderTarget),d=s.get(r.renderTarget),f=u.framebuffers[n.cacheKey],S=d.framebuffers[r.cacheKey],ee=c.currentBoundFramebuffers[o.READ_FRAMEBUFFER]??null,te=c.currentBoundFramebuffers[o.DRAW_FRAMEBUFFER]??null;c.bindFramebuffer(o.READ_FRAMEBUFFER,f),c.bindFramebuffer(o.DRAW_FRAMEBUFFER,S);for(let e=0;e<h;e++)ae&&(o.framebufferTextureLayer(o.READ_FRAMEBUFFER,o.COLOR_ATTACHMENT0,n.textureGPU,i,v+e),o.framebufferTextureLayer(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0,l,a,x+e)),o.blitFramebuffer(g,_,p,m,y,b,p,m,o.DEPTH_BUFFER_BIT,o.NEAREST);c.bindFramebuffer(o.READ_FRAMEBUFFER,ee),c.bindFramebuffer(o.DRAW_FRAMEBUFFER,te)}else if(i!==0||e.isRenderTargetTexture||s.has(e)){let t=s.get(e);this._srcFramebuffer===null&&(this._srcFramebuffer=o.createFramebuffer()),this._dstFramebuffer===null&&(this._dstFramebuffer=o.createFramebuffer());let n=c.currentBoundFramebuffers[o.READ_FRAMEBUFFER]??null,r=c.currentBoundFramebuffers[o.DRAW_FRAMEBUFFER]??null;c.bindFramebuffer(o.READ_FRAMEBUFFER,this._srcFramebuffer),c.bindFramebuffer(o.DRAW_FRAMEBUFFER,this._dstFramebuffer);for(let e=0;e<h;e++)ae?o.framebufferTextureLayer(o.READ_FRAMEBUFFER,o.COLOR_ATTACHMENT0,t.textureGPU,i,v+e):o.framebufferTexture2D(o.READ_FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,t.textureGPU,i),oe?o.framebufferTextureLayer(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0,l,a,x+e):o.framebufferTexture2D(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,l,a),i===0?oe?o.copyTexSubImage3D(u,a,y,b,x+e,g,_,p,m):o.copyTexSubImage2D(u,a,y,b,g,_,p,m):o.blitFramebuffer(g,_,p,m,y,b,p,m,o.COLOR_BUFFER_BIT,o.NEAREST);c.bindFramebuffer(o.READ_FRAMEBUFFER,n),c.bindFramebuffer(o.DRAW_FRAMEBUFFER,r)}else oe?e.isDataTexture||e.isData3DTexture?o.texSubImage3D(u,a,y,b,x,p,m,h,f,d,S.data):t.isCompressedArrayTexture?o.compressedTexSubImage3D(u,a,y,b,x,p,m,h,f,S.data):o.texSubImage3D(u,a,y,b,x,p,m,h,f,d,S):e.isDataTexture?o.texSubImage2D(o.TEXTURE_2D,a,y,b,p,m,f,d,S.data):e.isCompressedTexture?o.compressedTexSubImage2D(o.TEXTURE_2D,a,y,b,S.width,S.height,f,S.data):o.texSubImage2D(o.TEXTURE_2D,a,y,b,p,m,f,d,S);c.pixelStorei(o.UNPACK_ROW_LENGTH,ee),c.pixelStorei(o.UNPACK_IMAGE_HEIGHT,te),c.pixelStorei(o.UNPACK_SKIP_PIXELS,ne),c.pixelStorei(o.UNPACK_SKIP_ROWS,re),c.pixelStorei(o.UNPACK_SKIP_IMAGES,ie),a===0&&t.generateMipmaps&&o.generateMipmap(u),c.unbindTexture()}copyFramebufferToTexture(e,t,n){let{gl:r}=this,{state:i}=this.backend,{textureGPU:a}=this.backend.get(e),{x:o,y:s,z:c,w:l}=n,u=e.isDepthTexture===!0||t.renderTarget&&t.renderTarget.samples>0,d=t.renderTarget?t.renderTarget.height:this.backend.getDrawingBufferSize().y;if(u){let n=o!==0||s!==0,u,f;if(e.isDepthTexture===!0?(u=r.DEPTH_BUFFER_BIT,f=r.DEPTH_ATTACHMENT,t.stencil&&(u|=r.STENCIL_BUFFER_BIT)):(u=r.COLOR_BUFFER_BIT,f=r.COLOR_ATTACHMENT0),n){let e=this.backend.get(t.renderTarget),n=e.framebuffers[t.getCacheKey()],f=e.msaaFrameBuffer;i.bindFramebuffer(r.DRAW_FRAMEBUFFER,n),i.bindFramebuffer(r.READ_FRAMEBUFFER,f);let p=d-s-l;r.blitFramebuffer(o,p,o+c,p+l,o,p,o+c,p+l,u,r.NEAREST),i.bindFramebuffer(r.READ_FRAMEBUFFER,n),i.bindTexture(r.TEXTURE_2D,a),r.copyTexSubImage2D(r.TEXTURE_2D,0,0,0,o,p,c,l),i.unbindTexture()}else{let e=r.createFramebuffer();i.bindFramebuffer(r.DRAW_FRAMEBUFFER,e),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,f,r.TEXTURE_2D,a,0),r.blitFramebuffer(0,0,c,l,0,0,c,l,u,r.NEAREST),r.deleteFramebuffer(e)}}else i.bindTexture(r.TEXTURE_2D,a),r.copyTexSubImage2D(r.TEXTURE_2D,0,0,0,o,d-l-s,c,l),i.unbindTexture();e.generateMipmaps&&this.generateMipmaps(e),this.backend._setFramebuffer(t)}setupRenderBufferStorage(e,t,n,r=!1){let{gl:i}=this,a=t.renderTarget,{depthTexture:o,depthBuffer:s,stencilBuffer:c,width:l,height:u}=a;if(i.bindRenderbuffer(i.RENDERBUFFER,e),s&&!c){let t=i.DEPTH_COMPONENT24;r===!0?this.extensions.get(`WEBGL_multisampled_render_to_texture`).renderbufferStorageMultisampleEXT(i.RENDERBUFFER,a.samples,t,l,u):n>0?(o&&o.isDepthTexture&&o.type===i.FLOAT&&(t=i.DEPTH_COMPONENT32F),i.renderbufferStorageMultisample(i.RENDERBUFFER,n,t,l,u)):i.renderbufferStorage(i.RENDERBUFFER,t,l,u),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.RENDERBUFFER,e)}else s&&c&&(n>0?i.renderbufferStorageMultisample(i.RENDERBUFFER,n,i.DEPTH24_STENCIL8,l,u):i.renderbufferStorage(i.RENDERBUFFER,i.DEPTH_STENCIL,l,u),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.RENDERBUFFER,e));i.bindRenderbuffer(i.RENDERBUFFER,null)}async copyTextureToBuffer(e,t,n,r,i,a){let{backend:o,gl:s}=this,{textureGPU:c,glFormat:l,glType:u}=this.backend.get(e),d=s.createFramebuffer();o.state.bindFramebuffer(s.READ_FRAMEBUFFER,d);let f=e.isCubeTexture?s.TEXTURE_CUBE_MAP_POSITIVE_X+a:s.TEXTURE_2D;s.framebufferTexture2D(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,f,c,0);let p=this._getTypedArrayType(u),m=this._getBytesPerTexel(u,l),h=r*i*m,g=s.createBuffer();s.bindBuffer(s.PIXEL_PACK_BUFFER,g),s.bufferData(s.PIXEL_PACK_BUFFER,h,s.STREAM_READ),s.readPixels(t,n,r,i,l,u,0),s.bindBuffer(s.PIXEL_PACK_BUFFER,null),await o.utils._clientWaitAsync();let _=new p(h/p.BYTES_PER_ELEMENT);return s.bindBuffer(s.PIXEL_PACK_BUFFER,g),s.getBufferSubData(s.PIXEL_PACK_BUFFER,0,_),s.bindBuffer(s.PIXEL_PACK_BUFFER,null),o.state.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.deleteFramebuffer(d),_}_getTypedArrayType(e){let{gl:t}=this;if(e===t.UNSIGNED_BYTE)return Uint8Array;if(e===t.UNSIGNED_SHORT_4_4_4_4||e===t.UNSIGNED_SHORT_5_5_5_1||e===t.UNSIGNED_SHORT_5_6_5||e===t.UNSIGNED_SHORT)return Uint16Array;if(e===t.UNSIGNED_INT)return Uint32Array;if(e===t.HALF_FLOAT)return Uint16Array;if(e===t.FLOAT)return Float32Array;throw Error(`THREE.WebGLTextureUtils: Unsupported WebGL type: ${e}`)}_getBytesPerTexel(e,t){let{gl:n}=this,r=0;if(e===n.UNSIGNED_BYTE&&(r=1),(e===n.UNSIGNED_SHORT_4_4_4_4||e===n.UNSIGNED_SHORT_5_5_5_1||e===n.UNSIGNED_SHORT_5_6_5||e===n.UNSIGNED_SHORT||e===n.HALF_FLOAT)&&(r=2),(e===n.UNSIGNED_INT||e===n.FLOAT)&&(r=4),t===n.RGBA)return r*4;if(t===n.RGB)return r*3;if(t===n.ALPHA)return r}dispose(){let{gl:e}=this;this._srcFramebuffer!==null&&e.deleteFramebuffer(this._srcFramebuffer),this._dstFramebuffer!==null&&e.deleteFramebuffer(this._dstFramebuffer)}};function uD(e){return e.isDataTexture?e.image.data:typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas?e:e.data}var dD=class{constructor(e){this.backend=e,this.gl=this.backend.gl,this.availableExtensions=this.gl.getSupportedExtensions(),this.extensions={}}get(e){let t=this.extensions[e];return t===void 0&&(t=this.gl.getExtension(e),this.extensions[e]=t),t}has(e){return this.availableExtensions.includes(e)}},fD=class{constructor(e){this.backend=e,this.maxAnisotropy=null,this.maxUniformBlockSize=null}getMaxAnisotropy(){if(this.maxAnisotropy!==null)return this.maxAnisotropy;let e=this.backend.gl,t=this.backend.extensions;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);this.maxAnisotropy=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else this.maxAnisotropy=0;return this.maxAnisotropy}getUniformBufferLimit(){if(this.maxUniformBlockSize!==null)return this.maxUniformBlockSize;let e=this.backend.gl;return this.maxUniformBlockSize=e.getParameter(e.MAX_UNIFORM_BLOCK_SIZE),this.maxUniformBlockSize}},pD={WEBGL_multi_draw:`WEBGL_multi_draw`,WEBGL_compressed_texture_astc:`texture-compression-astc`,WEBGL_compressed_texture_etc:`texture-compression-etc2`,WEBGL_compressed_texture_etc1:`texture-compression-etc1`,WEBGL_compressed_texture_pvrtc:`texture-compression-pvrtc`,WEBGL_compressed_texture_s3tc:`texture-compression-s3tc`,EXT_texture_compression_bptc:`texture-compression-bc`,EXT_disjoint_timer_query_webgl2:`timestamp-query`,OVR_multiview2:`OVR_multiview2`},mD=class{constructor(e){this.gl=e.gl,this.extensions=e.extensions,this.info=e.renderer.info,this.mode=null,this.index=0,this.type=null,this.object=null}render(e,t){let{gl:n,mode:r,object:i,type:a,info:o,index:s}=this;s===0?n.drawArrays(r,e,t):n.drawElements(r,t,a,e),o.update(i,t,1)}renderInstances(e,t,n){let{gl:r,mode:i,type:a,index:o,object:s,info:c}=this;n!==0&&(o===0?r.drawArraysInstanced(i,e,t,n):r.drawElementsInstanced(i,t,a,e,n),c.update(s,t,n))}renderMultiDraw(e,t,n){let{extensions:r,mode:i,object:a,info:o}=this;if(n===0)return;let s=r.get(`WEBGL_multi_draw`);if(s===null)for(let r=0;r<n;r++)this.render(e[r],t[r]);else{this.index===0?s.multiDrawArraysWEBGL(i,e,0,t,0,n):s.multiDrawElementsWEBGL(i,t,0,this.type,e,0,n);let r=0;for(let e=0;e<n;e++)r+=t[e];o.update(a,r,1)}}},hD=class{constructor(e=256){this.trackTimestamp=!0,this.maxQueries=e,this.currentQueryIndex=0,this.queryOffsets=new Map,this.isDisposed=!1,this.lastValue=0,this.frames=[],this.pendingResolve=!1,this.timestamps=new Map}getTimestampFrames(){return this.frames}getTimestamp(e){let t=this.timestamps.get(e);return t===void 0&&(T(`TimestampQueryPool: No timestamp available for uid ${e}.`),t=0),t}hasTimestampQuery(e){return this.timestamps.has(e)}allocateQueriesForContext(){}async resolveQueriesAsync(){}dispose(){}},gD=class extends hD{constructor(e,t,n=2048){if(super(n),this.gl=e,this.type=t,this.ext=e.getExtension(`EXT_disjoint_timer_query_webgl2`)||e.getExtension(`EXT_disjoint_timer_query`),!this.ext){T(`EXT_disjoint_timer_query not supported; timestamps will be disabled.`),this.trackTimestamp=!1;return}this.queries=[];for(let t=0;t<this.maxQueries;t++)this.queries.push(e.createQuery());this.activeQuery=null,this.queryStates=new Map}allocateQueriesForContext(e){if(!this.trackTimestamp)return null;if(this.currentQueryIndex+2>this.maxQueries)return Qn(`WebGLTimestampQueryPool [${this.type}]: Maximum number of queries exceeded, when using trackTimestamp it is necessary to resolves the queries via renderer.resolveTimestampsAsync( THREE.TimestampQuery.${this.type.toUpperCase()} ).`),null;let t=this.currentQueryIndex;return this.currentQueryIndex+=2,this.queryStates.set(t,`inactive`),this.queryOffsets.set(e,t),t}beginQuery(e){if(!this.trackTimestamp||this.isDisposed)return;let t=this.queryOffsets.get(e);if(t==null||this.activeQuery!==null)return;let n=this.queries[t];if(n)try{this.queryStates.get(t)===`inactive`&&(this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,n),this.activeQuery=t,this.queryStates.set(t,`started`))}catch(e){C(`Error in beginQuery:`,e),this.activeQuery=null,this.queryStates.set(t,`inactive`)}}endQuery(e){if(!this.trackTimestamp||this.isDisposed)return;let t=this.queryOffsets.get(e);if(t!=null&&this.activeQuery===t)try{this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this.queryStates.set(t,`ended`),this.activeQuery=null}catch(e){C(`Error in endQuery:`,e),this.queryStates.set(t,`inactive`),this.activeQuery=null}}async resolveQueriesAsync(){if(!this.trackTimestamp||this.pendingResolve)return this.lastValue;this.pendingResolve=!0;try{let e=new Map;for(let[t,n]of this.queryOffsets)if(this.queryStates.get(n)===`ended`){let r=this.queries[n];e.set(t,this.resolveQuery(r))}if(e.size===0)return this.lastValue;let t={},n=[];for(let[r,i]of e){let e=r.match(/^(.*):f(\d+)$/),a=parseInt(e[2]);n.includes(a)===!1&&n.push(a),t[a]===void 0&&(t[a]=0);let o=await i;this.timestamps.set(r,o),t[a]+=o}let r=t[n[n.length-1]];return this.lastValue=r,this.frames=n,this.currentQueryIndex=0,this.queryOffsets.clear(),this.queryStates.clear(),this.activeQuery=null,r}catch(e){return C(`Error resolving queries:`,e),this.lastValue}finally{this.pendingResolve=!1}}async resolveQuery(e){return new Promise(t=>{if(this.isDisposed){t(this.lastValue);return}let n,r=!1,i=()=>{n&&=(clearTimeout(n),null)},a=e=>{r||(r=!0,i(),t(e))},o=()=>{if(this.isDisposed){a(this.lastValue);return}try{if(this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)){a(this.lastValue);return}if(!this.gl.getQueryParameter(e,this.gl.QUERY_RESULT_AVAILABLE)){n=setTimeout(o,1);return}let r=this.gl.getQueryParameter(e,this.gl.QUERY_RESULT);t(Number(r)/1e6)}catch(e){C(`Error checking query:`,e),t(this.lastValue)}};o()})}dispose(){if(!this.isDisposed&&(this.isDisposed=!0,this.trackTimestamp)){for(let e of this.queries)this.gl.deleteQuery(e);this.queries=[],this.queryStates.clear(),this.queryOffsets.clear(),this.lastValue=0,this.activeQuery=null}}},_D=class extends ZE{constructor(e={}){super(e),this.isWebGLBackend=!0,this.attributeUtils=null,this.extensions=null,this.capabilities=null,this.textureUtils=null,this.bufferRenderer=null,this.gl=null,this.state=null,this.utils=null,this.vaoCache={},this.transformFeedbackCache={},this.discard=!1,this.disjoint=null,this.parallel=null,this._currentContext=null,this._knownBindings=new WeakSet,this._supportsInvalidateFramebuffer=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),this._xrFramebuffer=null}init(e){super.init(e);let t=this.parameters,n={antialias:e.currentSamples>0,alpha:!0,depth:e.depth,stencil:e.stencil},r=t.context===void 0?e.domElement.getContext(`webgl2`,n):t.context;function i(t){t.preventDefault();let n={api:`WebGL`,message:t.statusMessage||`Unknown reason`,reason:null,originalEvent:t};e.onDeviceLost(n)}this._onContextLost=i,e.domElement.addEventListener(`webglcontextlost`,i,!1),this.gl=r,this.extensions=new dD(this),this.capabilities=new fD(this),this.attributeUtils=new eD(this),this.textureUtils=new lD(this),this.bufferRenderer=new mD(this),this.state=new rD(this),this.utils=new iD(this),this.extensions.get(`EXT_color_buffer_float`),this.extensions.get(`WEBGL_clip_cull_distance`),this.extensions.get(`OES_texture_float_linear`),this.extensions.get(`EXT_color_buffer_half_float`),this.extensions.get(`WEBGL_multisampled_render_to_texture`),this.extensions.get(`WEBGL_render_shared_exponent`),this.extensions.get(`WEBGL_multi_draw`),this.extensions.get(`OVR_multiview2`),this.extensions.get(`EXT_clip_control`),this.disjoint=this.extensions.get(`EXT_disjoint_timer_query_webgl2`),this.parallel=this.extensions.get(`KHR_parallel_shader_compile`),this.drawBuffersIndexedExt=this.extensions.get(`OES_draw_buffers_indexed`),t.reversedDepthBuffer&&(this.extensions.has(`EXT_clip_control`)?e.reversedDepthBuffer=!0:(T(`WebGPURenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),e.reversedDepthBuffer=!1)),e.reversedDepthBuffer&&this.state.setReversedDepth(!0)}get coordinateSystem(){return zn}get hasTimestamp(){return this.disjoint!==null}async getArrayBufferAsync(e,t=null,n=0,r=-1){return await this.attributeUtils.getArrayBufferAsync(e,t,n,r)}async makeXRCompatible(){this.gl.getContextAttributes().xrCompatible!==!0&&await this.gl.makeXRCompatible()}setXRTarget(e){this._xrFramebuffer=e}setXRRenderTargetTextures(e,t,n=null){let r=this.gl;if(this.set(e.texture,{textureGPU:t,glInternalFormat:r.RGBA8}),n!==null){let t=e.stencilBuffer?r.DEPTH24_STENCIL8:r.DEPTH_COMPONENT24;this.set(e.depthTexture,{textureGPU:n,glInternalFormat:t}),this.extensions.has(`WEBGL_multisampled_render_to_texture`)===!0&&e._autoAllocateDepthBuffer===!0&&e.multiview===!1&&T(`WebGLBackend: Render-to-texture extension was disabled because an external texture was provided`),e._autoAllocateDepthBuffer=!1}}initTimestampQuery(e,t){if(!this.disjoint||!this.trackTimestamp)return;this.timestampQueryPool[e]||(this.timestampQueryPool[e]=new gD(this.gl,e,2048));let n=this.timestampQueryPool[e];n.allocateQueriesForContext(t)!==null&&n.beginQuery(t)}prepareTimestampBuffer(e,t){this.disjoint&&this.trackTimestamp&&this.timestampQueryPool[e].endQuery(t)}getContext(){return this.gl}beginRender(e){let{state:t}=this,n=this.get(e);if(e.viewport)this.updateViewport(e);else{let{width:e,height:n}=this.getDrawingBufferSize();t.viewport(0,0,e,n)}if(e.scissor)this.updateScissor(e);else{let{width:e,height:n}=this.getDrawingBufferSize();t.scissor(0,0,e,n)}this.initTimestampQuery(Tn.RENDER,this.getTimestampUID(e)),n.previousContext=this._currentContext,this._currentContext=e,this._setFramebuffer(e),this.clear(e.clearColor,e.clearDepth,e.clearStencil,e,!1);let r=e.occlusionQueryCount;r>0&&(n.currentOcclusionQueries=n.occlusionQueries,n.currentOcclusionQueryObjects=n.occlusionQueryObjects,n.lastOcclusionObject=null,n.occlusionQueries=Array(r),n.occlusionQueryObjects=Array(r),n.occlusionQueryIndex=0)}finishRender(e){let{gl:t,state:n}=this,r=this.get(e),i=r.previousContext;n.resetVertexState();let a=e.occlusionQueryCount;a>0&&(a>r.occlusionQueryIndex&&t.endQuery(t.ANY_SAMPLES_PASSED),this.resolveOccludedAsync(e));let o=e.textures;if(o!==null)for(let e=0;e<o.length;e++){let t=o[e];t.generateMipmaps&&this.generateMipmaps(t)}if(this._currentContext=i,this._resolveRenderTarget(e),i!==null){if(this._setFramebuffer(i),i.viewport)this.updateViewport(i);else{let{width:e,height:t}=this.getDrawingBufferSize();n.viewport(0,0,e,t)}if(i.scissor)this.updateScissor(i);else{let{width:e,height:t}=this.getDrawingBufferSize();n.scissor(0,0,e,t)}}this.prepareTimestampBuffer(Tn.RENDER,this.getTimestampUID(e))}resolveOccludedAsync(e){let t=this.get(e),{currentOcclusionQueries:n,currentOcclusionQueryObjects:r}=t;if(n&&r){let e=new WeakSet,{gl:i}=this;t.currentOcclusionQueryObjects=null,t.currentOcclusionQueries=null;let a=()=>{let o=0;for(let t=0;t<n.length;t++){let a=n[t];a!==null&&i.getQueryParameter(a,i.QUERY_RESULT_AVAILABLE)&&(i.getQueryParameter(a,i.QUERY_RESULT)===0&&e.add(r[t]),n[t]=null,i.deleteQuery(a),o++)}o<n.length?requestAnimationFrame(a):t.occluded=e};a()}}isOccluded(e,t){let n=this.get(e);return n.occluded&&n.occluded.has(t)}updateViewport(e){let{state:t}=this,{x:n,y:r,width:i,height:a}=e.viewportValue;t.viewport(n,e.height-a-r,i,a)}updateScissor(e){let{state:t}=this,{x:n,y:r,width:i,height:a}=e.scissorValue;t.scissor(n,e.height-a-r,i,a)}setScissorTest(e){this.state.setScissorTest(e)}getClearColor(){let e=super.getClearColor();return e.r*=e.a,e.g*=e.a,e.b*=e.a,e}clear(e,t,n,r=null,i=!0,a=!0){let{gl:o,renderer:s}=this;r===null&&(r={textures:null,clearColorValue:this.getClearColor()});let c=0;if(e&&(c|=o.COLOR_BUFFER_BIT),t&&(c|=o.DEPTH_BUFFER_BIT),n&&(c|=o.STENCIL_BUFFER_BIT),c!==0){let l;l=r.clearColorValue?r.clearColorValue:this.getClearColor();let u=s.getClearDepth(),d=s.getClearStencil();if(t&&this.state.setDepthMask(!0),r.textures===null)o.clearColor(l.r,l.g,l.b,l.a),o.clear(c);else{if(i&&this._setFramebuffer(r),e)for(let e=0;e<r.textures.length;e++)e===0?o.clearBufferfv(o.COLOR,e,[l.r,l.g,l.b,l.a]):o.clearBufferfv(o.COLOR,e,[0,0,0,1]);t&&n?o.clearBufferfi(o.DEPTH_STENCIL,0,u,d):t?o.clearBufferfv(o.DEPTH,0,[u]):n&&o.clearBufferiv(o.STENCIL,0,[d]),i&&a&&this._resolveRenderTarget(r),i&&this._currentContext!==null&&this._currentContext!==r&&this._setFramebuffer(this._currentContext)}}}beginCompute(e){let{state:t,gl:n}=this;t.bindFramebuffer(n.FRAMEBUFFER,null),this.initTimestampQuery(Tn.COMPUTE,this.getTimestampUID(e))}compute(e,t,n,r,i=null){let{state:a,gl:o}=this;this.discard===!1&&(a.enable(o.RASTERIZER_DISCARD),this.discard=!0);let{programGPU:s,transformBuffers:c,attributes:l}=this.get(r),u=this._getVaoKey(l),d=this.vaoCache[u];d===void 0?this.vaoCache[u]=this._createVao(l):a.setVertexState(d),a.useProgram(s),this._bindUniforms(n);let f=this._getTransformFeedback(c);o.bindTransformFeedback(o.TRANSFORM_FEEDBACK,f),o.beginTransformFeedback(o.POINTS),i=i===null?t.count:i,Array.isArray(i)?(Qn(`WebGLBackend.compute(): The count parameter must be a single number, not an array.`),i=i[0]):i&&typeof i==`object`&&i.isIndirectStorageBufferAttribute&&(Qn(`WebGLBackend.compute(): The count parameter must be a single number, not IndirectStorageBufferAttribute`),i=t.count),l[0].isStorageInstancedBufferAttribute?o.drawArraysInstanced(o.POINTS,0,1,i):o.drawArrays(o.POINTS,0,i),o.endTransformFeedback(),o.bindTransformFeedback(o.TRANSFORM_FEEDBACK,null);for(let e=0;e<c.length;e++){let t=c[e];t.pbo&&this.has(t.pbo)&&this.textureUtils.copyBufferToTexture(t.transformBuffer,t.pbo),t.switchBuffers()}}finishCompute(e){let{state:t,gl:n}=this;this.discard=!1,t.disable(n.RASTERIZER_DISCARD),this.prepareTimestampBuffer(Tn.COMPUTE,this.getTimestampUID(e)),this._currentContext&&this._setFramebuffer(this._currentContext)}_isRenderCameraDepthArray(e){return e.depthTexture&&e.depthTexture.isArrayTexture&&e.camera.isArrayCamera}_draw(e,t,n,r,i,a){if(e.isBatchedMesh){if(this.hasFeature(`WEBGL_multi_draw`)===!1){let{gl:n}=this,r=n.getUniformLocation(a,`nodeUniformDrawId`),i=e._multiDrawStarts,o=e._multiDrawCounts,s=e._multiDrawCount;for(let e=0;e<s;e++)n.uniform1ui(r,e),t.render(i[e],o[e])}else t.renderMultiDraw(e._multiDrawStarts,e._multiDrawCounts,e._multiDrawCount)}else i>1?t.renderInstances(n,r,i):t.render(n,r)}draw(e){let{object:t,pipeline:n,material:r,context:i,hardwareClippingPlanes:a}=e,{programGPU:o}=this.get(n),{gl:s,state:c}=this,l=this.get(i),u=e.getDrawParameters();if(u===null)return;this._bindUniforms(e.getBindings());let d=t.isMesh&&t.matrixWorld.determinantAffine()<0;c.setMaterial(r,d,a),i.mrt!==null&&i.textures!==null&&c.setMRTBlending(i.textures,i.mrt,r),c.useProgram(o);let f=e.getAttributes(),p=this.get(f),m=p.vaoGPU;if(m===void 0){let e=this._getVaoKey(f);m=this.vaoCache[e],m===void 0&&(m=this._createVao(f),this.vaoCache[e]=m,p.vaoGPU=m)}let h=e.getIndex(),g=h===null?null:this.get(h).bufferGPU;c.setVertexState(m,g);let _=l.lastOcclusionObject;if(_!==t&&_!==void 0){if(_!==null&&_.occlusionTest===!0&&(s.endQuery(s.ANY_SAMPLES_PASSED),l.occlusionQueryIndex++),t.occlusionTest===!0){let e=s.createQuery();s.beginQuery(s.ANY_SAMPLES_PASSED,e),l.occlusionQueries[l.occlusionQueryIndex]=e,l.occlusionQueryObjects[l.occlusionQueryIndex]=t}l.lastOcclusionObject=t}let v=this.bufferRenderer;t.isPoints?v.mode=s.POINTS:t.isLineSegments?v.mode=s.LINES:t.isLine?v.mode=s.LINE_STRIP:t.isLineLoop?v.mode=s.LINE_LOOP:r.wireframe===!0?(c.setLineWidth(r.wireframeLinewidth*this.renderer.getPixelRatio()),v.mode=s.LINES):v.mode=s.TRIANGLES;let{vertexCount:y,instanceCount:b}=u,{firstVertex:x}=u;if(v.object=t,h!==null){x*=h.array.BYTES_PER_ELEMENT;let e=this.get(h);v.index=h.count,v.type=e.type}else v.index=0;if(e.camera.isArrayCamera===!0&&e.camera.cameras.length>0&&e.camera.isMultiViewCamera===!1){let n=this.get(e.camera),r=e.camera.cameras,i=e.getBindingGroup(`cameraIndex`).bindings[0];if(n.indexesGPU===void 0||n.indexesGPU.length!==r.length){let e=new Uint32Array([0,0,0,0]),t=[];for(let n=0,i=r.length;n<i;n++){let r=s.createBuffer();e[0]=n,s.bindBuffer(s.UNIFORM_BUFFER,r),s.bufferData(s.UNIFORM_BUFFER,e,s.STATIC_DRAW),t.push(r)}n.indexesGPU=t}let a=0;bindingsSearch:for(let t of e.getBindings())for(let e of t.bindings){if(e===i)break bindingsSearch;(e.isUniformsGroup||e.isUniformBuffer)&&a++}let l=this.renderer.getPixelRatio(),u=this._currentContext.renderTarget,d=this._isRenderCameraDepthArray(this._currentContext),f=this._currentContext.activeCubeFace;if(d){let e=this.get(u.depthTexture);if(e.clearedRenderId!==this.renderer._nodes.nodeFrame.renderId){e.clearedRenderId=this.renderer._nodes.nodeFrame.renderId;let{stencilBuffer:t}=u;for(let e=0,n=r.length;e<n;e++)this.renderer._activeCubeFace=e,this._currentContext.activeCubeFace=e,this._setFramebuffer(this._currentContext),this.clear(!1,!0,t,this._currentContext,!1,!1);this.renderer._activeCubeFace=f,this._currentContext.activeCubeFace=f}}for(let i=0,u=r.length;i<u;i++){let u=r[i];if(t.layers.test(u.layers)){d&&(this.renderer._activeCubeFace=i,this._currentContext.activeCubeFace=i,this._setFramebuffer(this._currentContext));let r=u.viewport;if(r!==void 0){let t=r.x*l,n=r.y*l,i=r.width*l,a=r.height*l;c.viewport(Math.floor(t),Math.floor(e.context.height-a-n),Math.floor(i),Math.floor(a))}c.bindBufferBase(s.UNIFORM_BUFFER,a,n.indexesGPU[i]),this._draw(t,v,x,y,b,o)}this._currentContext.activeCubeFace=f,this.renderer._activeCubeFace=f}}else this._draw(t,v,x,y,b,o)}needsRenderUpdate(){return!1}getRenderCacheKey(){return``}createDefaultTexture(e){this.textureUtils.createDefaultTexture(e)}createTexture(e,t){this.textureUtils.createTexture(e,t)}updateTexture(e,t){this.textureUtils.updateTexture(e,t)}generateMipmaps(e){this.textureUtils.generateMipmaps(e)}destroyTexture(e,t=!1){this.textureUtils.destroyTexture(e,t)}async copyTextureToBuffer(e,t,n,r,i,a){return this.textureUtils.copyTextureToBuffer(e,t,n,r,i,a)}updateSampler(){return``}createNodeBuilder(e,t){return new JE(e,t)}createProgram(e){let t=this.gl,{stage:n,code:r}=e,i=n===`fragment`?t.createShader(t.FRAGMENT_SHADER):t.createShader(t.VERTEX_SHADER);t.shaderSource(i,r),t.compileShader(i),this.set(e,{shaderGPU:i})}destroyProgram(e){this.delete(e)}createRenderPipeline(e,t){let n=this.gl,r=e.pipeline,{fragmentProgram:i,vertexProgram:a}=r,o=n.createProgram(),s=this.get(i).shaderGPU,c=this.get(a).shaderGPU;if(n.attachShader(o,s),n.attachShader(o,c),n.linkProgram(o),this.set(r,{programGPU:o,fragmentShader:s,vertexShader:c}),t!==null&&this.parallel){let i=new Promise(t=>{let i=this.parallel,a=()=>{n.getProgramParameter(o,i.COMPLETION_STATUS_KHR)?(this._completeCompile(e,r),t()):requestAnimationFrame(a)};a()});t.push(i);return}this._completeCompile(e,r)}_handleSource(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}_getShaderErrors(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+this._handleSource(e.getShaderSource(t),r)}return i}_logProgramError(e,t,n){if(this.renderer.debug.checkShaderErrors){let r=this.gl,i=(r.getProgramInfoLog(e)||``).trim();if(r.getProgramParameter(e,r.LINK_STATUS)===!1){if(typeof this.renderer.debug.onShaderError==`function`)this.renderer.debug.onShaderError(r,e,n,t);else{let a=this._getShaderErrors(r,n,`vertex`),o=this._getShaderErrors(r,t,`fragment`);C(`WebGLProgram: Shader Error `+r.getError()+` - VALIDATE_STATUS `+r.getProgramParameter(e,r.VALIDATE_STATUS)+`

Program Info Log: `+i+`
`+a+`
`+o)}}else i!==``&&T(`WebGLProgram: Program Info Log:`,i)}}_completeCompile(e,t){let{state:n,gl:r}=this,{programGPU:i,fragmentShader:a,vertexShader:o}=this.get(t);r.getProgramParameter(i,r.LINK_STATUS)===!1&&this._logProgramError(i,a,o),n.useProgram(i);let s=e.getBindings();this._setupBindings(s,i),this.set(t,{programGPU:i,pipeline:i})}createComputePipeline(e,t){let{state:n,gl:r}=this,i={stage:`fragment`,code:`#version 300 es
precision highp float;
void main() {}`};this.createProgram(i);let{computeProgram:a}=e,o=r.createProgram(),s=this.get(i).shaderGPU,c=this.get(a).shaderGPU,l=a.transforms,u=[],d=[];for(let e=0;e<l.length;e++){let t=l[e];u.push(t.varyingName),d.push(t.attributeNode)}r.attachShader(o,s),r.attachShader(o,c),r.transformFeedbackVaryings(o,u,r.SEPARATE_ATTRIBS),r.linkProgram(o),r.getProgramParameter(o,r.LINK_STATUS)===!1&&this._logProgramError(o,s,c),n.useProgram(o),this._setupBindings(t,o);let f=a.attributes,p=[],m=[];for(let e=0;e<f.length;e++){let t=f[e].node.attribute;p.push(t),this.has(t)||this.attributeUtils.createAttribute(t,r.ARRAY_BUFFER)}for(let e=0;e<d.length;e++){let t=d[e].attribute;this.has(t)||this.attributeUtils.createAttribute(t,r.ARRAY_BUFFER);let n=this.get(t);m.push(n)}this.set(e,{programGPU:o,transformBuffers:m,attributes:p})}createBindings(e,t){if(this._knownBindings.has(t)===!1){this._knownBindings.add(t);let e=0,n=0;for(let r of t){this.set(r,{textures:n,uniformBuffers:e});for(let t of r.bindings)t.isUniformBuffer&&e++,t.isSampledTexture&&n++}}this.updateBindings(e,t)}updateBindings(e){let{gl:t}=this;for(let n of e.bindings){let e=this.get(n);if(n.isUniformsGroup||n.isUniformBuffer){let r=n.buffer,i=e.bufferGPU;t.bindBuffer(t.UNIFORM_BUFFER,i);let a=n.updateRanges;if(t.bindBuffer(t.UNIFORM_BUFFER,i),a.length===0)t.bufferData(t.UNIFORM_BUFFER,r,t.DYNAMIC_DRAW);else{let e=It(r),n=e?1:r.BYTES_PER_ELEMENT;for(let i=0,o=a.length;i<o;i++){let o=a[i],s=o.start*n,c=o.count*n,l=s*(e?r.BYTES_PER_ELEMENT:1);t.bufferSubData(t.UNIFORM_BUFFER,l,r,s,c)}}this.set(n,e)}else if(n.isSampledTexture){let{textureGPU:t,glTextureType:r}=this.get(n.texture);e.textureGPU=t,e.glTextureType=r,this.set(n,e)}}}updateBinding(e){let t=this.gl;if(e.isUniformsGroup||e.isUniformBuffer){let n=this.get(e).bufferGPU,r=e.buffer,i=e.updateRanges;if(t.bindBuffer(t.UNIFORM_BUFFER,n),i.length===0)t.bufferData(t.UNIFORM_BUFFER,r,t.DYNAMIC_DRAW);else{let e=It(r),n=e?1:r.BYTES_PER_ELEMENT,a=i[0].start;for(let o=0,s=i.length;o<s;o++){let s=i[o],c=i[o+1],l=s.start+s.count;if(c!==void 0&&c.start===l)continue;let u=a*n,d=(l-a)*n,f=u*(e?r.BYTES_PER_ELEMENT:1);t.bufferSubData(t.UNIFORM_BUFFER,f,r,u,d),c!==void 0&&(a=c.start)}}}}createUniformBuffer(e){let t=this.get(e);if(t.bufferGPU===void 0){let n=this.gl,r=e.buffer;t.bufferGPU=n.createBuffer(),n.bindBuffer(n.UNIFORM_BUFFER,t.bufferGPU),n.bufferData(n.UNIFORM_BUFFER,r.byteLength,n.DYNAMIC_DRAW)}}destroyUniformBuffer(e){let t=this.get(e);this.gl.deleteBuffer(t.bufferGPU),this.delete(e)}createIndexAttribute(e){let t=this.gl;this.attributeUtils.createAttribute(e,t.ELEMENT_ARRAY_BUFFER)}createAttribute(e){if(this.has(e))return;let t=this.gl;this.attributeUtils.createAttribute(e,t.ARRAY_BUFFER)}createStorageAttribute(e){if(this.has(e))return;let t=this.gl;this.attributeUtils.createAttribute(e,t.ARRAY_BUFFER)}updateAttribute(e){this.attributeUtils.updateAttribute(e)}destroyAttribute(e){this.attributeUtils.destroyAttribute(e)}hasFeature(e){let t=Object.keys(pD).filter(t=>pD[t]===e),n=this.extensions;for(let e=0;e<t.length;e++)if(n.has(t[e]))return!0;return!1}copyTextureToTexture(e,t,n=null,r=null,i=0,a=0){this.textureUtils.copyTextureToTexture(e,t,n,r,i,a)}copyFramebufferToTexture(e,t,n){this.textureUtils.copyFramebufferToTexture(e,t,n)}hasCompatibility(e){return e===ce.TEXTURE_COMPARE||super.hasCompatibility(e)}initRenderTarget(e){let{gl:t,state:n}=this;this._setFramebuffer(e),n.bindFramebuffer(t.FRAMEBUFFER,null)}_setFramebuffer(e){let{gl:t,state:n}=this,r=null;if(e.textures!==null){let i=e.renderTarget,a=this.get(i),{samples:o,depthBuffer:s,stencilBuffer:c}=i,l=i.isCubeRenderTarget===!0,u=i.isRenderTarget3D===!0,d=i.depth>1,f=i.isXRRenderTarget===!0,p=f===!0&&i._hasExternalTextures===!0,m=a.msaaFrameBuffer,h=a.depthRenderbuffer,g=this.extensions.get(`WEBGL_multisampled_render_to_texture`),_=this.extensions.get(`OVR_multiview2`),v=this._useMultisampledExtension(i),y=K_(e),b;if(l?(a.cubeFramebuffers||={},b=a.cubeFramebuffers[y]):f&&p===!1?b=this._xrFramebuffer:(a.framebuffers||={},b=a.framebuffers[y]),b===void 0){b=t.createFramebuffer(),n.bindFramebuffer(t.FRAMEBUFFER,b);let r=e.textures,s=[];if(l){a.cubeFramebuffers[y]=b;let{textureGPU:e}=this.get(r[0]),n=this.renderer._activeCubeFace,i=this.renderer._activeMipmapLevel;t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+n,e,i)}else{a.framebuffers[y]=b;for(let n=0;n<r.length;n++){let a=r[n],s=this.get(a);s.renderTarget=e.renderTarget,s.cacheKey=y;let c=t.COLOR_ATTACHMENT0+n;if(i.multiview)_.framebufferTextureMultisampleMultiviewOVR(t.FRAMEBUFFER,c,s.textureGPU,0,o,0,2);else if(u||d){let e=this.renderer._activeCubeFace,n=this.renderer._activeMipmapLevel;t.framebufferTextureLayer(t.FRAMEBUFFER,c,s.textureGPU,n,e)}else if(v)g.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,c,t.TEXTURE_2D,s.textureGPU,0,o);else{let e=this.renderer._activeMipmapLevel;t.framebufferTexture2D(t.FRAMEBUFFER,c,t.TEXTURE_2D,s.textureGPU,e)}}}let f=c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;if(i._autoAllocateDepthBuffer===!0){let n=t.createRenderbuffer();this.textureUtils.setupRenderBufferStorage(n,e,0,v),a.xrDepthRenderbuffer=n,s.push(c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT),t.bindRenderbuffer(t.RENDERBUFFER,n),t.framebufferRenderbuffer(t.FRAMEBUFFER,f,t.RENDERBUFFER,n)}else if(e.depthTexture!==null){s.push(c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT);let n=this.get(e.depthTexture);if(n.renderTarget=e.renderTarget,n.cacheKey=y,i.multiview)_.framebufferTextureMultisampleMultiviewOVR(t.FRAMEBUFFER,f,n.textureGPU,0,o,0,2);else if(p&&v)g.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,f,t.TEXTURE_2D,n.textureGPU,0,o);else if(e.depthTexture.isArrayTexture){let e=this.renderer._activeCubeFace;t.framebufferTextureLayer(t.FRAMEBUFFER,f,n.textureGPU,0,e)}else if(e.depthTexture.isCubeTexture){let e=this.renderer._activeCubeFace;t.framebufferTexture2D(t.FRAMEBUFFER,f,t.TEXTURE_CUBE_MAP_POSITIVE_X+e,n.textureGPU,0)}else t.framebufferTexture2D(t.FRAMEBUFFER,f,t.TEXTURE_2D,n.textureGPU,0)}a.depthInvalidationArray=s}else{if(this._isRenderCameraDepthArray(e)){n.bindFramebuffer(t.FRAMEBUFFER,b);let r=this.renderer._activeCubeFace,i=this.get(e.depthTexture),a=c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;t.framebufferTextureLayer(t.FRAMEBUFFER,a,i.textureGPU,0,r)}if((f||v||i.multiview)&&i._isOpaqueFramebuffer!==!0){n.bindFramebuffer(t.FRAMEBUFFER,b);let r=this.get(e.textures[0]);i.multiview?_.framebufferTextureMultisampleMultiviewOVR(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,r.textureGPU,0,o,0,2):v?g.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,r.textureGPU,0,o):t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,r.textureGPU,0);let s=c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;if(i._autoAllocateDepthBuffer===!0){let e=a.xrDepthRenderbuffer;t.bindRenderbuffer(t.RENDERBUFFER,e),t.framebufferRenderbuffer(t.FRAMEBUFFER,s,t.RENDERBUFFER,e)}else{let n=this.get(e.depthTexture);i.multiview?_.framebufferTextureMultisampleMultiviewOVR(t.FRAMEBUFFER,s,n.textureGPU,0,o,0,2):v?g.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,s,t.TEXTURE_2D,n.textureGPU,0,o):t.framebufferTexture2D(t.FRAMEBUFFER,s,t.TEXTURE_2D,n.textureGPU,0)}}}if(o>0&&v===!1&&!i.multiview){if(m===void 0){let r=[];m=t.createFramebuffer(),n.bindFramebuffer(t.FRAMEBUFFER,m);let i=[],l=e.textures;for(let n=0;n<l.length;n++){i[n]=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,i[n]),r.push(t.COLOR_ATTACHMENT0+n);let a=e.textures[n],s=this.get(a);t.renderbufferStorageMultisample(t.RENDERBUFFER,o,s.glInternalFormat,e.width,e.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+n,t.RENDERBUFFER,i[n])}if(t.bindRenderbuffer(t.RENDERBUFFER,null),a.msaaFrameBuffer=m,a.msaaRenderbuffers=i,s&&h===void 0){h=t.createRenderbuffer(),this.textureUtils.setupRenderBufferStorage(h,e,o),a.depthRenderbuffer=h;let n=c?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;r.push(n)}a.invalidationArray=r}r=a.msaaFrameBuffer}else r=b;n.drawBuffers(e,b)}n.bindFramebuffer(t.FRAMEBUFFER,r)}_getVaoKey(e){let t=``;for(let n=0;n<e.length;n++){let r=this.get(e[n]);t+=`:`+r.id}return t}_createVao(e){let{gl:t}=this,n=t.createVertexArray();t.bindVertexArray(n);for(let n=0;n<e.length;n++){let r=e[n],i=this.get(r);t.bindBuffer(t.ARRAY_BUFFER,i.bufferGPU),t.enableVertexAttribArray(n);let a,o;r.isInterleavedBufferAttribute===!0?(a=r.data.stride*i.bytesPerElement,o=r.offset*i.bytesPerElement):(a=0,o=0),i.isInteger?t.vertexAttribIPointer(n,r.itemSize,i.type,a,o):t.vertexAttribPointer(n,r.itemSize,i.type,r.normalized,a,o),r.isInstancedBufferAttribute&&!r.isInterleavedBufferAttribute?t.vertexAttribDivisor(n,r.meshPerAttribute):r.isInterleavedBufferAttribute&&r.data.isInstancedInterleavedBuffer&&t.vertexAttribDivisor(n,r.data.meshPerAttribute)}return t.bindBuffer(t.ARRAY_BUFFER,null),n}_getTransformFeedback(e){let t=``;for(let n=0;n<e.length;n++)t+=`:`+e[n].id;let n=this.transformFeedbackCache[t];if(n!==void 0)return n;let{gl:r}=this;n=r.createTransformFeedback(),r.bindTransformFeedback(r.TRANSFORM_FEEDBACK,n);for(let t=0;t<e.length;t++){let n=e[t];r.bindBufferBase(r.TRANSFORM_FEEDBACK_BUFFER,t,n.transformBuffer)}return r.bindTransformFeedback(r.TRANSFORM_FEEDBACK,null),this.transformFeedbackCache[t]=n,n}_setupBindings(e,t){let n=this.gl,r=0,i=0;for(let a of e)for(let e of a.bindings)if(e.isUniformsGroup||e.isUniformBuffer){let i=r++,a=n.getUniformBlockIndex(t,e.name);n.uniformBlockBinding(t,a,i)}else if(e.isSampledTexture){let r=i++,a=n.getUniformLocation(t,e.name);n.uniform1i(a,r)}}_bindUniforms(e){let{gl:t,state:n}=this,r=0,i=0;for(let a of e)for(let e of a.bindings){let a=this.get(e);if(e.isUniformsGroup||e.isUniformBuffer){let e=r++;n.bindBufferBase(t.UNIFORM_BUFFER,e,a.bufferGPU)}else if(e.isSampledTexture){let e=i++;n.bindTexture(a.glTextureType,a.textureGPU,t.TEXTURE0+e)}}}_resolveRenderTarget(e){let{gl:t,state:n}=this,r=e.renderTarget;if(e.textures!==null&&r){let i=this.get(r);if(r.samples>0&&this._useMultisampledExtension(r)===!1){let a=i.framebuffers[e.getCacheKey()],o=t.COLOR_BUFFER_BIT;r.resolveDepthBuffer&&(r.depthBuffer&&(o|=t.DEPTH_BUFFER_BIT),r.stencilBuffer&&r.resolveStencilBuffer&&(o|=t.STENCIL_BUFFER_BIT));let s=i.msaaFrameBuffer,c=i.msaaRenderbuffers,l=e.textures,u=l.length>1;if(n.bindFramebuffer(t.READ_FRAMEBUFFER,s),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,a),u)for(let e=0;e<l.length;e++)t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0+e,t.RENDERBUFFER,null),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+e,t.TEXTURE_2D,null,0);for(let n=0;n<l.length;n++){if(u){let{textureGPU:e}=this.get(l[n]);t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.RENDERBUFFER,c[n]),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,e,0)}if(e.scissor){let{x:n,y:r,width:i,height:a}=e.scissorValue,s=e.height-a-r;t.blitFramebuffer(n,s,n+i,s+a,n,s,n+i,s+a,o,t.NEAREST)}else t.blitFramebuffer(0,0,e.width,e.height,0,0,e.width,e.height,o,t.NEAREST)}if(u)for(let e=0;e<l.length;e++){let{textureGPU:n}=this.get(l[e]);t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0+e,t.RENDERBUFFER,c[e]),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+e,t.TEXTURE_2D,n,0)}this._supportsInvalidateFramebuffer===!0&&t.invalidateFramebuffer(t.READ_FRAMEBUFFER,i.invalidationArray)}else if(r.resolveDepthBuffer===!1&&i.framebuffers){let r=i.framebuffers[e.getCacheKey()];n.bindFramebuffer(t.DRAW_FRAMEBUFFER,r),t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,i.depthInvalidationArray)}}}_useMultisampledExtension(e){return e.multiview===!0||e.samples>0&&this.extensions.has(`WEBGL_multisampled_render_to_texture`)===!0&&e._autoAllocateDepthBuffer!==!1}dispose(){this.textureUtils!==null&&this.textureUtils.dispose();let e=this.extensions.get(`WEBGL_lose_context`);e&&e.loseContext(),this.renderer.domElement.removeEventListener(`webglcontextlost`,this._onContextLost)}},vD={PointList:`point-list`,LineList:`line-list`,LineStrip:`line-strip`,TriangleList:`triangle-list`},yD=typeof self<`u`&&self.GPUShaderStage?self.GPUShaderStage:{VERTEX:1,FRAGMENT:2,COMPUTE:4},bD={Never:`never`,Less:`less`,Equal:`equal`,LessEqual:`less-equal`,Greater:`greater`,NotEqual:`not-equal`,GreaterEqual:`greater-equal`,Always:`always`},xD={Store:`store`},SD={Load:`load`,Clear:`clear`},CD={CCW:`ccw`,CW:`cw`},wD={None:`none`,Back:`back`},TD={Uint16:`uint16`,Uint32:`uint32`},Q={R8Unorm:`r8unorm`,R8Snorm:`r8snorm`,R8Uint:`r8uint`,R8Sint:`r8sint`,R16Uint:`r16uint`,R16Sint:`r16sint`,R16Float:`r16float`,RG8Unorm:`rg8unorm`,RG8Snorm:`rg8snorm`,RG8Uint:`rg8uint`,RG8Sint:`rg8sint`,R16Unorm:`r16unorm`,R16Snorm:`r16snorm`,R32Uint:`r32uint`,R32Sint:`r32sint`,R32Float:`r32float`,RG16Uint:`rg16uint`,RG16Sint:`rg16sint`,RG16Float:`rg16float`,RGBA8Unorm:`rgba8unorm`,RGBA8UnormSRGB:`rgba8unorm-srgb`,RGBA8Snorm:`rgba8snorm`,RGBA8Uint:`rgba8uint`,RGBA8Sint:`rgba8sint`,BGRA8Unorm:`bgra8unorm`,BGRA8UnormSRGB:`bgra8unorm-srgb`,RG16Unorm:`rg16unorm`,RG16Snorm:`rg16snorm`,RGB9E5UFloat:`rgb9e5ufloat`,RGB10A2Unorm:`rgb10a2unorm`,RG11B10UFloat:`rg11b10ufloat`,RG32Uint:`rg32uint`,RG32Sint:`rg32sint`,RG32Float:`rg32float`,RGBA16Uint:`rgba16uint`,RGBA16Sint:`rgba16sint`,RGBA16Float:`rgba16float`,RGBA16Unorm:`rgba16unorm`,RGBA16Snorm:`rgba16snorm`,RGBA32Uint:`rgba32uint`,RGBA32Sint:`rgba32sint`,RGBA32Float:`rgba32float`,Depth16Unorm:`depth16unorm`,Depth24Plus:`depth24plus`,Depth24PlusStencil8:`depth24plus-stencil8`,Depth32Float:`depth32float`,Depth32FloatStencil8:`depth32float-stencil8`,BC1RGBAUnorm:`bc1-rgba-unorm`,BC1RGBAUnormSRGB:`bc1-rgba-unorm-srgb`,BC2RGBAUnorm:`bc2-rgba-unorm`,BC2RGBAUnormSRGB:`bc2-rgba-unorm-srgb`,BC3RGBAUnorm:`bc3-rgba-unorm`,BC3RGBAUnormSRGB:`bc3-rgba-unorm-srgb`,BC4RUnorm:`bc4-r-unorm`,BC4RSnorm:`bc4-r-snorm`,BC5RGUnorm:`bc5-rg-unorm`,BC5RGSnorm:`bc5-rg-snorm`,BC6HRGBUFloat:`bc6h-rgb-ufloat`,BC6HRGBFloat:`bc6h-rgb-float`,BC7RGBAUnorm:`bc7-rgba-unorm`,BC7RGBAUnormSRGB:`bc7-rgba-unorm-srgb`,ETC2RGB8Unorm:`etc2-rgb8unorm`,ETC2RGB8UnormSRGB:`etc2-rgb8unorm-srgb`,ETC2RGB8A1Unorm:`etc2-rgb8a1unorm`,ETC2RGB8A1UnormSRGB:`etc2-rgb8a1unorm-srgb`,ETC2RGBA8Unorm:`etc2-rgba8unorm`,ETC2RGBA8UnormSRGB:`etc2-rgba8unorm-srgb`,EACR11Unorm:`eac-r11unorm`,EACR11Snorm:`eac-r11snorm`,EACRG11Unorm:`eac-rg11unorm`,EACRG11Snorm:`eac-rg11snorm`,ASTC4x4Unorm:`astc-4x4-unorm`,ASTC4x4UnormSRGB:`astc-4x4-unorm-srgb`,ASTC5x4Unorm:`astc-5x4-unorm`,ASTC5x4UnormSRGB:`astc-5x4-unorm-srgb`,ASTC5x5Unorm:`astc-5x5-unorm`,ASTC5x5UnormSRGB:`astc-5x5-unorm-srgb`,ASTC6x5Unorm:`astc-6x5-unorm`,ASTC6x5UnormSRGB:`astc-6x5-unorm-srgb`,ASTC6x6Unorm:`astc-6x6-unorm`,ASTC6x6UnormSRGB:`astc-6x6-unorm-srgb`,ASTC8x5Unorm:`astc-8x5-unorm`,ASTC8x5UnormSRGB:`astc-8x5-unorm-srgb`,ASTC8x6Unorm:`astc-8x6-unorm`,ASTC8x6UnormSRGB:`astc-8x6-unorm-srgb`,ASTC8x8Unorm:`astc-8x8-unorm`,ASTC8x8UnormSRGB:`astc-8x8-unorm-srgb`,ASTC10x5Unorm:`astc-10x5-unorm`,ASTC10x5UnormSRGB:`astc-10x5-unorm-srgb`,ASTC10x6Unorm:`astc-10x6-unorm`,ASTC10x6UnormSRGB:`astc-10x6-unorm-srgb`,ASTC10x8Unorm:`astc-10x8-unorm`,ASTC10x8UnormSRGB:`astc-10x8-unorm-srgb`,ASTC10x10Unorm:`astc-10x10-unorm`,ASTC10x10UnormSRGB:`astc-10x10-unorm-srgb`,ASTC12x10Unorm:`astc-12x10-unorm`,ASTC12x10UnormSRGB:`astc-12x10-unorm-srgb`,ASTC12x12Unorm:`astc-12x12-unorm`,ASTC12x12UnormSRGB:`astc-12x12-unorm-srgb`},ED={ClampToEdge:`clamp-to-edge`,Repeat:`repeat`,MirrorRepeat:`mirror-repeat`},DD={Linear:`linear`,Nearest:`nearest`},OD={Zero:`zero`,One:`one`,Src:`src`,OneMinusSrc:`one-minus-src`,SrcAlpha:`src-alpha`,OneMinusSrcAlpha:`one-minus-src-alpha`,Dst:`dst`,OneMinusDst:`one-minus-dst`,DstAlpha:`dst-alpha`,OneMinusDstAlpha:`one-minus-dst-alpha`,SrcAlphaSaturated:`src-alpha-saturated`,Constant:`constant`,OneMinusConstant:`one-minus-constant`},kD={Add:`add`,Subtract:`subtract`,ReverseSubtract:`reverse-subtract`,Min:`min`,Max:`max`},AD={None:0,All:15},jD={Keep:`keep`,Zero:`zero`,Replace:`replace`,Invert:`invert`,IncrementClamp:`increment-clamp`,DecrementClamp:`decrement-clamp`,IncrementWrap:`increment-wrap`,DecrementWrap:`decrement-wrap`},MD={Storage:`storage`,ReadOnlyStorage:`read-only-storage`},ND={WriteOnly:`write-only`,ReadOnly:`read-only`,ReadWrite:`read-write`},PD={NonFiltering:`non-filtering`,Comparison:`comparison`},FD={Float:`float`,UnfilterableFloat:`unfilterable-float`,Depth:`depth`,SInt:`sint`,UInt:`uint`},ID={TwoD:`2d`,ThreeD:`3d`},LD={TwoD:`2d`,TwoDArray:`2d-array`,Cube:`cube`,ThreeD:`3d`},RD={All:`all`},zD={Vertex:`vertex`,Instance:`instance`},BD={CoreFeaturesAndLimits:`core-features-and-limits`,DepthClipControl:`depth-clip-control`,Depth32FloatStencil8:`depth32float-stencil8`,TextureCompressionBC:`texture-compression-bc`,TextureCompressionBCSliced3D:`texture-compression-bc-sliced-3d`,TextureCompressionETC2:`texture-compression-etc2`,TextureCompressionASTC:`texture-compression-astc`,TextureCompressionASTCSliced3D:`texture-compression-astc-sliced-3d`,TimestampQuery:`timestamp-query`,IndirectFirstInstance:`indirect-first-instance`,ShaderF16:`shader-f16`,RG11B10UFloat:`rg11b10ufloat-renderable`,BGRA8UNormStorage:`bgra8unorm-storage`,Float32Filterable:`float32-filterable`,Float32Blendable:`float32-blendable`,ClipDistances:`clip-distances`,DualSourceBlending:`dual-source-blending`,Subgroups:`subgroups`,TextureFormatsTier1:`texture-formats-tier1`,TextureFormatsTier2:`texture-formats-tier2`},VD={"texture-compression-s3tc":`texture-compression-bc`,"texture-compression-etc1":`texture-compression-etc2`},HD=class extends FE{constructor(e,t,n){super(e,t?t.value:null),this.textureNode=t,this.groupNode=n}update(){let{textureNode:e}=this;return this.texture===e.value?super.update():(this.texture=e.value,!0)}},UD=class extends EE{constructor(e,t){super(e,t?t.array:null),this._attribute=t,this.isStorageBuffer=!0}get attribute(){return this._attribute}},WD=0,GD=class extends UD{constructor(e,t){super(`StorageBuffer_`+WD++,e?e.value:null),this.nodeUniform=e,this.access=e?e.access:Mr.READ_WRITE,this.groupNode=t}get attribute(){return this.nodeUniform.value}get buffer(){return this.nodeUniform.value.array}},KD=[null],qD=class{constructor(e){this.backend=e,this._preferredCanvasFormat=null}getCurrentDepthStencilFormat(e){let t;return e.depth&&(t=e.depthTexture===null?e.stencil?this.backend.renderer.reversedDepthBuffer===!0?Q.Depth32FloatStencil8:Q.Depth24PlusStencil8:this.backend.renderer.reversedDepthBuffer===!0?Q.Depth32Float:Q.Depth24Plus:this.getTextureFormatGPU(e.depthTexture)),t}getTextureFormatGPU(e){return this.backend.get(e).format}getTextureSampleData(e){let t;if(e.isFramebufferTexture)t=1;else if(e.isDepthTexture&&!e.renderTarget){let e=this.backend.renderer,n=e.getRenderTarget();t=n?n.samples:e.currentSamples}else e.renderTarget&&(t=e.renderTarget.samples);t=this.getSampleCount(t||1);let n=t>1&&e.renderTarget!==null&&e.isDepthTexture!==!0&&e.isFramebufferTexture!==!0;return{samples:t,primarySamples:n?1:t,isMSAA:n}}getCurrentColorFormat(e){let t;return t=e.textures===null?this.getPreferredCanvasFormat():this.getTextureFormatGPU(e.textures[0]),t}getCurrentColorFormats(e){return e.textures===null?[this.getPreferredCanvasFormat()]:e.textures.map(e=>this.getTextureFormatGPU(e))}getCurrentColorSpace(e){return e.textures===null?this.backend.renderer.outputColorSpace:e.textures[0].colorSpace}getPrimitiveTopology(e,t){if(e.isPoints)return vD.PointList;if(e.isLineSegments||e.isMesh&&t.wireframe===!0)return vD.LineList;if(e.isLine)return vD.LineStrip;if(e.isMesh)return vD.TriangleList}getSampleCount(e){return e>=4?4:1}getSampleCountRenderContext(e){return e.textures===null?this.getSampleCount(this.backend.renderer.currentSamples):this.getSampleCount(e.sampleCount)}getPreferredCanvasFormat(){let e=this.backend.parameters.outputType;if(e===void 0)return this._preferredCanvasFormat===null&&(this._preferredCanvasFormat=navigator.gpu.getPreferredCanvasFormat()),this._preferredCanvasFormat;if(e===1009)return Q.BGRA8Unorm;if(e===1016)return Q.RGBA16Float;throw Error(`THREE.WebGPUUtils: Unsupported output buffer type.`)}};function JD(e,t){KD[0]=t,e.queue.submit(KD),KD[0]=null}var YD=class{constructor(){this.label=``,this.layout=null,this.entries=[]}reset(){this.label=``,this.layout=null,this.entries.length=0}},XD=class{constructor(){this.label=``,this.size=0,this.usage=0,this.mappedAtCreation=!1}reset(){this.label=``,this.size=0,this.usage=0,this.mappedAtCreation=!1}},ZD=class{constructor(){this.label=``}reset(){this.label=``}},QD=class{constructor(){this.label=``,this.colorFormats=null,this.depthStencilFormat=void 0,this.sampleCount=1,this.depthReadOnly=!1,this.stencilReadOnly=!1}reset(){this.label=``,this.colorFormats=null,this.depthStencilFormat=void 0,this.sampleCount=1,this.depthReadOnly=!1,this.stencilReadOnly=!1}},$D=class{constructor(){this.view=null,this.depthSlice=void 0,this.resolveTarget=void 0,this.clearValue=void 0,this.loadOp=void 0,this.storeOp=void 0}reset(){this.view=null,this.depthSlice=void 0,this.resolveTarget=void 0,this.clearValue=void 0,this.loadOp=void 0,this.storeOp=void 0}},eO=class{constructor(){this.label=``,this.colorAttachments=[],this.depthStencilAttachment=void 0,this.occlusionQuerySet=void 0,this.timestampWrites=void 0,this.maxDrawCount=5e7}reset(){this.label=``,this.colorAttachments.length=0,this.depthStencilAttachment=void 0,this.occlusionQuerySet=void 0,this.timestampWrites=void 0,this.maxDrawCount=5e7}},tO=class{constructor(){this.label=``,this.layout=null,this.vertex=null,this.primitive={},this.depthStencil=void 0,this.multisample=new nO,this.fragment=null}reset(){this.label=``,this.layout=null,this.vertex=null,this.primitive={},this.depthStencil=void 0,this.multisample.reset(),this.fragment=null}},nO=class{constructor(){this.count=1,this.mask=4294967295,this.alphaToCoverageEnabled=!1}reset(){this.count=1,this.mask=4294967295,this.alphaToCoverageEnabled=!1}},rO=class{constructor(){this.label=``,this.code=``,this.compilationHints=[]}reset(){this.label=``,this.code=``,this.compilationHints.length=0}},iO=class{constructor(){this.label=``,this.size={width:0,height:1,depthOrArrayLayers:1},this.mipLevelCount=1,this.sampleCount=1,this.dimension=`2d`,this.format=void 0,this.usage=void 0,this.viewFormats=[],this.textureBindingViewDimension=void 0}reset(){this.label=``,this.size.width=0,this.size.height=1,this.size.depthOrArrayLayers=1,this.mipLevelCount=1,this.sampleCount=1,this.dimension=`2d`,this.format=void 0,this.usage=void 0,this.viewFormats.length=0,this.textureBindingViewDimension=void 0}},aO=class{constructor(){this.label=``,this.format=void 0,this.dimension=void 0,this.usage=0,this.aspect=`all`,this.baseMipLevel=0,this.mipLevelCount=void 0,this.baseArrayLayer=0,this.arrayLayerCount=void 0,this.swizzle=`rgba`}reset(){this.label=``,this.format=void 0,this.dimension=void 0,this.usage=0,this.aspect=`all`,this.baseMipLevel=0,this.mipLevelCount=void 0,this.baseArrayLayer=0,this.arrayLayerCount=void 0,this.swizzle=`rgba`}},oO=new YD,sO=new XD,cO=new ZD,lO=new QD,uO=new eO,dO=new tO,fO=new $D,pO=new rO,mO=new iO,hO=new aO,gO=class extends y_{constructor(e){super(),this.device=e,this.mipmapSampler=e.createSampler({minFilter:DD.Linear}),this.flipYSampler=e.createSampler({minFilter:DD.Nearest}),sO.size=4,sO.usage=GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,this.flipUniformBuffer=e.createBuffer(sO),sO.reset(),e.queue.writeBuffer(this.flipUniformBuffer,0,new Uint32Array([1])),sO.size=4,sO.usage=GPUBufferUsage.UNIFORM,this.noFlipUniformBuffer=e.createBuffer(sO),sO.reset(),this.transferPipelines={},pO.label=`mipmap`,pO.code=`
struct VarysStruct {
	@builtin( position ) Position: vec4f,
	@location( 0 ) vTex : vec2f,
	@location( 1 ) @interpolate(flat, either) vBaseArrayLayer: u32,
};

@group( 0 ) @binding ( 2 )
var<uniform> flipY: u32;

@vertex
fn mainVS(
		@builtin( vertex_index ) vertexIndex : u32,
		@builtin( instance_index ) instanceIndex : u32 ) -> VarysStruct {

	var Varys : VarysStruct;

	var pos = array(
		vec2f( -1, -1 ),
		vec2f( -1,  3 ),
		vec2f(  3, -1 ),
	);

	let p = pos[ vertexIndex ];
	let mult = select( vec2f( 0.5, -0.5 ), vec2f( 0.5, 0.5 ), flipY != 0 );
	Varys.vTex = p * mult + vec2f( 0.5 );
	Varys.Position = vec4f( p, 0, 1 );
	Varys.vBaseArrayLayer = instanceIndex;

	return Varys;

}

@group( 0 ) @binding( 0 )
var imgSampler : sampler;

@group( 0 ) @binding( 1 )
var img2d : texture_2d<f32>;

@fragment
fn main_2d( Varys: VarysStruct ) -> @location( 0 ) vec4<f32> {

	return textureSample( img2d, imgSampler, Varys.vTex );

}

@group( 0 ) @binding( 1 )
var img2dArray : texture_2d_array<f32>;

@fragment
fn main_2d_array( Varys: VarysStruct ) -> @location( 0 ) vec4<f32> {

	return textureSample( img2dArray, imgSampler, Varys.vTex, Varys.vBaseArrayLayer );

}

const faceMat = array(
  mat3x3f(  0,  0,  -2,  0, -2,   0,  1,  1,   1 ),   // pos-x
  mat3x3f(  0,  0,   2,  0, -2,   0, -1,  1,  -1 ),   // neg-x
  mat3x3f(  2,  0,   0,  0,  0,   2, -1,  1,  -1 ),   // pos-y
  mat3x3f(  2,  0,   0,  0,  0,  -2, -1, -1,   1 ),   // neg-y
  mat3x3f(  2,  0,   0,  0, -2,   0, -1,  1,   1 ),   // pos-z
  mat3x3f( -2,  0,   0,  0, -2,   0,  1,  1,  -1 ),   // neg-z
);

@group( 0 ) @binding( 1 )
var imgCube : texture_cube<f32>;

@fragment
fn main_cube( Varys: VarysStruct ) -> @location( 0 ) vec4<f32> {

	return textureSample( imgCube, imgSampler, faceMat[ Varys.vBaseArrayLayer ] * vec3f( fract( Varys.vTex ), 1 ) );

}
`,this.mipmapShaderModule=e.createShaderModule(pO),pO.reset()}getTransferPipeline(e,t){t||=`2d-array`;let n=`${e}-${t}`,r=this.transferPipelines[n];return r===void 0&&(dO.label=`mipmap-${e}-${t}`,dO.vertex={module:this.mipmapShaderModule},dO.fragment={module:this.mipmapShaderModule,entryPoint:`main_${t.replace(`-`,`_`)}`,targets:[{format:e}]},dO.layout=`auto`,r=this.device.createRenderPipeline(dO),dO.reset(),this.transferPipelines[n]=r),r}flipY(e,t,n=0){let r=t.format,{width:i,height:a}=t.size;mO.size.width=i,mO.size.height=a,mO.format=r,mO.usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;let o=this.device.createTexture(mO);mO.reset();let s=this.getTransferPipeline(r,e.textureBindingViewDimension),c=this.getTransferPipeline(r,o.textureBindingViewDimension),l=this.device.createCommandEncoder(cO),u=(e,t,n,r,i,a)=>{let o=e.getBindGroupLayout(0);hO.dimension=t.textureBindingViewDimension||`2d-array`,hO.mipLevelCount=1;let s=t.createView(hO);hO.reset(),oO.layout=o,oO.entries.push({binding:0,resource:this.flipYSampler},{binding:1,resource:s},{binding:2,resource:{buffer:a?this.flipUniformBuffer:this.noFlipUniformBuffer}});let c=this.device.createBindGroup(oO);oO.reset(),hO.dimension=`2d`,hO.mipLevelCount=1,hO.baseArrayLayer=i,hO.arrayLayerCount=1;let u=r.createView(hO);hO.reset(),fO.view=u,fO.loadOp=SD.Clear,fO.storeOp=xD.Store,uO.colorAttachments.push(fO);let d=l.beginRenderPass(uO);uO.reset(),fO.reset(),d.setPipeline(e),d.setBindGroup(0,c),d.draw(3,1,0,n),d.end()};u(s,e,n,o,0,!1),u(c,o,0,e,n,!0),JD(this.device,l.finish()),o.destroy()}generateMipmaps(e,t=null){let n=this.get(e),r=n.layers||this._mipmapCreateBundles(e),i=t;i===null&&(cO.label=`mipmapEncoder`,i=this.device.createCommandEncoder(cO),cO.reset()),this._mipmapRunBundles(i,r),t===null&&JD(this.device,i.finish()),n.layers=r}_mipmapCreateBundles(e){let t=e.textureBindingViewDimension||`2d-array`,n=this.getTransferPipeline(e.format,t),r=n.getBindGroupLayout(0),i=[];for(let a=1;a<e.mipLevelCount;a++)for(let o=0;o<e.depthOrArrayLayers;o++){hO.dimension=t,hO.baseMipLevel=a-1,hO.mipLevelCount=1;let s=e.createView(hO);hO.reset(),oO.layout=r,oO.entries.push({binding:0,resource:this.mipmapSampler},{binding:1,resource:s},{binding:2,resource:{buffer:this.noFlipUniformBuffer}});let c=this.device.createBindGroup(oO);oO.reset(),hO.dimension=`2d`,hO.baseMipLevel=a,hO.mipLevelCount=1,hO.baseArrayLayer=o,hO.arrayLayerCount=1;let l=e.createView(hO);hO.reset();let u=new $D;u.view=l,u.loadOp=SD.Clear,u.storeOp=xD.Store;let d=new eO;d.colorAttachments.push(u),lO.colorFormats=[e.format];let f=this.device.createRenderBundleEncoder(lO);lO.reset(),f.setPipeline(n),f.setBindGroup(0,c),f.draw(3,1,0,o),i.push({renderBundles:[f.finish()],passDescriptor:d})}return i}_mipmapRunBundles(e,t){let n=t.length;for(let r=0;r<n;r++){let n=t[r],i=e.beginRenderPass(n.passDescriptor);i.executeBundles(n.renderBundles),i.end()}}},_O=class{constructor(){this.label=``,this.addressModeU=`clamp-to-edge`,this.addressModeV=`clamp-to-edge`,this.addressModeW=`clamp-to-edge`,this.magFilter=`nearest`,this.minFilter=`nearest`,this.mipmapFilter=`nearest`,this.lodMinClamp=0,this.lodMaxClamp=32,this.compare=void 0,this.maxAnisotropy=1}reset(){this.label=``,this.addressModeU=`clamp-to-edge`,this.addressModeV=`clamp-to-edge`,this.addressModeW=`clamp-to-edge`,this.magFilter=`nearest`,this.minFilter=`nearest`,this.mipmapFilter=`nearest`,this.lodMinClamp=0,this.lodMaxClamp=32,this.compare=void 0,this.maxAnisotropy=1}},vO=class{constructor(){this.texture=null,this.mipLevel=0,this.origin={x:0,y:0,z:0},this.aspect=`all`}reset(){this.texture=null,this.mipLevel=0,this.origin.x=0,this.origin.y=0,this.origin.z=0,this.aspect=`all`}},yO=class{constructor(){this.buffer=null,this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}reset(){this.buffer=null,this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}},bO=class{constructor(){this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}reset(){this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}},xO=class{constructor(){this.source=null,this.origin={x:0,y:0},this.flipY=!1}reset(){this.source=null,this.origin.x=0,this.origin.y=0,this.flipY=!1}},SO=class extends vO{constructor(){super(),this.colorSpace=`srgb`,this.premultipliedAlpha=!1}reset(){super.reset(),this.colorSpace=`srgb`,this.premultipliedAlpha=!1}},CO=class{constructor(){this.width=0,this.height=1,this.depthOrArrayLayers=1}reset(){this.width=0,this.height=1,this.depthOrArrayLayers=1}},wO=new XD,TO=new ZD,EO=new _O,DO=new vO,OO=new yO,kO=new bO,AO=new xO,jO=new SO,MO=new iO,NO=new CO,PO={512:`never`,513:`less`,514:`equal`,515:`less-equal`,516:`greater`,518:`greater-equal`,519:`always`,517:`not-equal`},FO=[0,1,3,2,4,5];function IO(e,t,n,r,i,a,o,s,c,l){DO.texture=t,DO.mipLevel=n,DO.origin.z=r,kO.offset=r*a,kO.bytesPerRow=o,kO.rowsPerImage=s,NO.width=c,NO.height=l,e.queue.writeTexture(DO,i.data,kO,NO),DO.reset(),kO.reset(),NO.reset()}var LO=class{constructor(e){this.backend=e,this._passUtils=null,this.defaultTexture={},this.defaultCubeTexture={},this.defaultVideoFrame=null,this._samplerCache=new Map}updateSampler(e){let t=this.backend,n=e.texture,r=e.textureNode,i=n.minFilter+`-`+n.magFilter+`-`+n.wrapS+`-`+n.wrapT+`-`+(n.wrapR||`0`)+`-`+n.anisotropy+`-`+ +(n.isDepthTexture===!0)+`-`+(n.compareFunction!==null&&r.compareNode!==null?n.compareFunction:0),a=this._samplerCache.get(i);if(a===void 0){EO.addressModeU=this._convertAddressMode(n.wrapS),EO.addressModeV=this._convertAddressMode(n.wrapT),EO.addressModeW=this._convertAddressMode(n.wrapR),EO.magFilter=this._convertFilterMode(n.magFilter),EO.minFilter=this._convertFilterMode(n.minFilter),EO.mipmapFilter=this._convertMipmapFilterMode(n.minFilter),n.isDepthTexture&&(n.compareFunction===null||r.compareNode===null)&&(EO.magFilter=DD.Nearest,EO.minFilter=DD.Nearest,EO.mipmapFilter=DD.Nearest),EO.magFilter===DD.Linear&&EO.minFilter===DD.Linear&&EO.mipmapFilter===DD.Linear&&(EO.maxAnisotropy=n.anisotropy),n.isDepthTexture&&n.compareFunction!==null&&r.compareNode!==null&&t.hasCompatibility(ce.TEXTURE_COMPARE)&&(EO.compare=PO[n.compareFunction]);let e=t.device.createSampler(EO);EO.reset(),a={sampler:e,usedTimes:0},this._samplerCache.set(i,a)}let o=t.get(e);return o.sampler!==a.sampler&&(this._releaseSampler(o),o.samplerKey=i,o.sampler=a.sampler,a.usedTimes++),i}destroySampler(e){this._releaseSampler(this.backend.get(e))}_releaseSampler(e){if(e.sampler!==void 0){let t=this._samplerCache.get(e.samplerKey);t.usedTimes--,t.usedTimes===0&&this._samplerCache.delete(e.samplerKey),e.sampler=void 0,e.samplerKey=void 0}}createDefaultTexture(e){let t,n=RO(e,this.backend.device);t=e.isCubeTexture?this._getDefaultCubeTextureGPU(n):this._getDefaultTextureGPU(n),this.backend.get(e).texture=t}createTexture(e,t={}){let n=this.backend,r=n.get(e);if(r.initialized){if(r.externalTexture===!0)return;throw Error(`THREE.WebGPUTextureUtils: Texture already initialized.`)}if(e.isExternalTexture){r.texture=e.sourceTexture,r.initialized=!0;return}t.needsMipmaps===void 0&&(t.needsMipmaps=!1),t.levels===void 0&&(t.levels=1),t.depth===void 0&&(t.depth=1);let{width:i,height:a,depth:o,levels:s}=t;e.isFramebufferTexture&&(t.format=t.renderTarget?this.backend.utils.getCurrentColorFormat(t.renderTarget):this.backend.utils.getPreferredCanvasFormat());let c=this._getDimension(e),l=e.internalFormat||t.format||RO(e,n.device);r.format=l;let{samples:u,primarySamples:d,isMSAA:f}=n.utils.getTextureSampleData(e),p=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC;e.isStorageTexture===!0&&(p|=GPUTextureUsage.STORAGE_BINDING),e.isCompressedTexture!==!0&&e.isCompressedArrayTexture!==!0&&l!==Q.RGB9E5UFloat&&(p|=GPUTextureUsage.RENDER_ATTACHMENT);let m=new iO;if(m.label=e.name,m.size.width=i,m.size.height=a,m.size.depthOrArrayLayers=o,m.mipLevelCount=s,m.sampleCount=d,m.dimension=c,m.format=l,m.usage=p,l===void 0){T(`WebGPURenderer: Texture format not supported.`),this.createDefaultTexture(e);return}e.isCubeTexture&&(m.textureBindingViewDimension=LD.Cube);try{r.texture=n.device.createTexture(m)}catch{T(`WebGPURenderer: Failed to create texture with descriptor:`,m),this.createDefaultTexture(e);return}if(f){let e=Object.assign({},m);e.label+=`-msaa`,e.sampleCount=u,e.mipLevelCount=1,r.msaaTexture=n.device.createTexture(e)}r.initialized=!0,r.textureDescriptorGPU=m}destroyTexture(e,t=!1){let n=this.backend,r=n.get(e);r.texture!==void 0&&t===!1&&e.isExternalTexture!==!0&&r.texture.destroy(),r.msaaTexture!==void 0&&r.msaaTexture.destroy(),n.delete(e)}generateMipmaps(e,t=null){let n=this.backend.get(e);this._generateMipmaps(n.texture,t)}getColorBuffer(){let e=this.backend,t=e.renderer.getCanvasTarget(),{width:n,height:r}=e.getDrawingBufferSize(),i=e.renderer.currentSamples,a=t.colorTexture,o=e.get(a);if(a.width===n&&a.height===r&&a.samples===i)return o.texture;let s=o.texture;return s&&s.destroy(),MO.label=`colorBuffer`,MO.size.width=n,MO.size.height=r,MO.sampleCount=e.utils.getSampleCount(e.renderer.currentSamples),MO.format=e.utils.getPreferredCanvasFormat(),MO.usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC,s=e.device.createTexture(MO),MO.reset(),a.source.width=n,a.source.height=r,a.samples=i,o.texture=s,s}getDepthBuffer(e=!0,t=!1){let n=this.backend,r=n.renderer.getCanvasTarget(),{width:i,height:a}=n.getDrawingBufferSize(),o=n.renderer.currentSamples,s=r.depthTexture;if(s.width===i&&s.height===a&&s.samples===o&&s.depth===e&&s.stencil===t)return n.get(s).texture;let c=n.get(s).texture,l,u;if(t?(l=vn,u=n.renderer.reversedDepthBuffer===!0?lt:Ot):e&&(l=mt,u=n.renderer.reversedDepthBuffer===!0?lt:dn),c!==void 0){if(s.image.width===i&&s.image.height===a&&s.format===l&&s.type===u&&s.samples===o)return c;this.destroyTexture(s)}return s.name=`depthBuffer`,s.format=l,s.type=u,s.image.width=i,s.image.height=a,s.samples=o,this.createTexture(s,{width:i,height:a}),n.get(s).texture}updateTexture(e,t){let n=this.backend.get(e),r=e.mipmaps,{textureDescriptorGPU:i}=n;if(!(e.isRenderTargetTexture||i===void 0)){if(e.isDataTexture){if(r.length>0)for(let t=0,a=r.length;t<a;t++){let a=r[t];this._copyBufferToTexture(a,n.texture,i,0,e.flipY,0,t)}else this._copyBufferToTexture(t.image,n.texture,i,0,e.flipY)}else if(e.isArrayTexture||e.isDataArrayTexture||e.isData3DTexture){if(e.layerUpdates&&e.layerUpdates.size>0){for(let r of e.layerUpdates)this._copyBufferToTexture(t.image,n.texture,i,r,e.flipY,r);e.clearLayerUpdates()}else for(let r=0;r<t.image.depth;r++)this._copyBufferToTexture(t.image,n.texture,i,r,e.flipY,r)}else if(e.isCompressedTexture||e.isCompressedArrayTexture)e.isCompressedArrayTexture&&e.layerUpdates.size>0?(this._copyCompressedBufferToTexture(e.mipmaps,n.texture,i,e.layerUpdates),e.clearLayerUpdates()):this._copyCompressedBufferToTexture(e.mipmaps,n.texture,i);else if(e.isCubeTexture)this._copyCubeMapToTexture(e,n.texture,i);else if(e.isHTMLTexture){let t=this.backend.device,r=this.backend.renderer.domElement,a=e.image;if(typeof t.queue.copyElementImageToTexture!=`function`)return;if(!n.hasPaintCallback){n.hasPaintCallback=!0,r.requestPaint();return}let o=i.size.width,s=i.size.height;t.queue.copyElementImageToTexture.length===2?t.queue.copyElementImageToTexture({source:a},{destination:{texture:n.texture},width:o,height:s}):t.queue.copyElementImageToTexture(a,o,s,{texture:n.texture}),e.flipY&&this._flipY(n.texture,i)}else if(r.length>0)for(let t=0,a=r.length;t<a;t++){let a=r[t];this._copyImageToTexture(a,n.texture,i,0,e.flipY,e.premultiplyAlpha,t)}else this._copyImageToTexture(t.image,n.texture,i,0,e.flipY,e.premultiplyAlpha);n.version=e.version}}async copyTextureToBuffer(e,t,n,r,i,a){let o=this.backend.device,s=this.backend.get(e),c=s.texture,l=s.textureDescriptorGPU.format,u=this._getBytesPerTexel(l),d=r*u;d=Math.ceil(d/256)*256,wO.size=(i-1)*d+r*u,wO.usage=GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ;let f=o.createBuffer(wO);wO.reset();let p=o.createCommandEncoder(TO);DO.texture=c,DO.origin.x=t,DO.origin.y=n,DO.origin.z=a,OO.buffer=f,OO.bytesPerRow=d,NO.width=r,NO.height=i,p.copyTextureToBuffer(DO,OO,NO),DO.reset(),OO.reset(),NO.reset();let m=this._getTypedArrayType(l);JD(o,p.finish()),await f.mapAsync(GPUMapMode.READ);let h=f.getMappedRange().slice();return f.destroy(),new m(h)}dispose(){this._samplerCache.clear()}_getDefaultTextureGPU(e){let t=this.defaultTexture[e];if(t===void 0){let n=new Je;n.minFilter=Ht,n.magFilter=Ht,this.createTexture(n,{width:1,height:1,format:e}),this.defaultTexture[e]=t=n}return this.backend.get(t).texture}_getDefaultCubeTextureGPU(e){let t=this.defaultCubeTexture[e];if(t===void 0){let n=new De;n.minFilter=Ht,n.magFilter=Ht,this.createTexture(n,{width:1,height:1,depth:6}),this.defaultCubeTexture[e]=t=n}return this.backend.get(t).texture}_copyCubeMapToTexture(e,t,n){let r=e.images,i=e.mipmaps;for(let a=0;a<6;a++){let o=r[a],s=e.flipY===!0?FO[a]:a;o.isDataTexture?this._copyBufferToTexture(o.image,t,n,s,e.flipY):this._copyImageToTexture(o,t,n,s,e.flipY,e.premultiplyAlpha);for(let r=0;r<i.length;r++){let o=i[r].images[a];o.isDataTexture?this._copyBufferToTexture(o.image,t,n,s,e.flipY,0,r+1):this._copyImageToTexture(o,t,n,s,e.flipY,e.premultiplyAlpha,r+1)}}}_copyImageToTexture(e,t,n,r,i,a,o=0){let s=this.backend.device,c=o>0?e.width:n.size.width,l=o>0?e.height:n.size.height;AO.source=e,AO.flipY=i,jO.texture=t,jO.mipLevel=o,jO.origin.z=r,jO.premultipliedAlpha=a,NO.width=c,NO.height=l;try{s.queue.copyExternalImageToTexture(AO,jO,NO)}catch{}finally{AO.reset(),jO.reset(),NO.reset()}}_getPassUtils(){let e=this._passUtils;return e===null&&(this._passUtils=e=new gO(this.backend.device)),e}_generateMipmaps(e,t=null){this._getPassUtils().generateMipmaps(e,t)}_flipY(e,t,n=0){this._getPassUtils().flipY(e,t,n)}_copyBufferToTexture(e,t,n,r,i,a=0,o=0){let s=this.backend.device,c=e.data,l=this._getBytesPerTexel(n.format),u=e.width*l;DO.texture=t,DO.mipLevel=o,DO.origin.z=r,kO.offset=e.width*e.height*l*a,kO.bytesPerRow=u,NO.width=e.width,NO.height=e.height,s.queue.writeTexture(DO,c,kO,NO),DO.reset(),kO.reset(),NO.reset(),i===!0&&this._flipY(t,n,r)}_copyCompressedBufferToTexture(e,t,n,r=null){let i=this.backend.device,a=this._getBlockData(n.format),o=n.size.depthOrArrayLayers>1,s=r&&r.size>0?r:null;for(let r=0;r<e.length;r++){let c=e[r],l=c.width,u=c.height,d=o?n.size.depthOrArrayLayers:1,f=Math.ceil(l/a.width)*a.byteLength,p=Math.ceil(u/a.height),m=f*p,h=Math.ceil(l/a.width)*a.width,g=p*a.height;if(s!==null)for(let e of s)IO(i,t,r,e,c,m,f,p,h,g);else for(let e=0;e<d;e++)IO(i,t,r,e,c,m,f,p,h,g)}}_getBlockData(e){if(e===Q.BC1RGBAUnorm||e===Q.BC1RGBAUnormSRGB)return{byteLength:8,width:4,height:4};if(e===Q.BC2RGBAUnorm||e===Q.BC2RGBAUnormSRGB||e===Q.BC3RGBAUnorm||e===Q.BC3RGBAUnormSRGB)return{byteLength:16,width:4,height:4};if(e===Q.BC4RUnorm||e===Q.BC4RSnorm)return{byteLength:8,width:4,height:4};if(e===Q.BC5RGUnorm||e===Q.BC5RGSnorm||e===Q.BC6HRGBUFloat||e===Q.BC6HRGBFloat||e===Q.BC7RGBAUnorm||e===Q.BC7RGBAUnormSRGB)return{byteLength:16,width:4,height:4};if(e===Q.ETC2RGB8Unorm||e===Q.ETC2RGB8UnormSRGB||e===Q.ETC2RGB8A1Unorm||e===Q.ETC2RGB8A1UnormSRGB)return{byteLength:8,width:4,height:4};if(e===Q.ETC2RGBA8Unorm||e===Q.ETC2RGBA8UnormSRGB)return{byteLength:16,width:4,height:4};if(e===Q.EACR11Unorm||e===Q.EACR11Snorm)return{byteLength:8,width:4,height:4};if(e===Q.EACRG11Unorm||e===Q.EACRG11Snorm||e===Q.ASTC4x4Unorm||e===Q.ASTC4x4UnormSRGB)return{byteLength:16,width:4,height:4};if(e===Q.ASTC5x4Unorm||e===Q.ASTC5x4UnormSRGB)return{byteLength:16,width:5,height:4};if(e===Q.ASTC5x5Unorm||e===Q.ASTC5x5UnormSRGB)return{byteLength:16,width:5,height:5};if(e===Q.ASTC6x5Unorm||e===Q.ASTC6x5UnormSRGB)return{byteLength:16,width:6,height:5};if(e===Q.ASTC6x6Unorm||e===Q.ASTC6x6UnormSRGB)return{byteLength:16,width:6,height:6};if(e===Q.ASTC8x5Unorm||e===Q.ASTC8x5UnormSRGB)return{byteLength:16,width:8,height:5};if(e===Q.ASTC8x6Unorm||e===Q.ASTC8x6UnormSRGB)return{byteLength:16,width:8,height:6};if(e===Q.ASTC8x8Unorm||e===Q.ASTC8x8UnormSRGB)return{byteLength:16,width:8,height:8};if(e===Q.ASTC10x5Unorm||e===Q.ASTC10x5UnormSRGB)return{byteLength:16,width:10,height:5};if(e===Q.ASTC10x6Unorm||e===Q.ASTC10x6UnormSRGB)return{byteLength:16,width:10,height:6};if(e===Q.ASTC10x8Unorm||e===Q.ASTC10x8UnormSRGB)return{byteLength:16,width:10,height:8};if(e===Q.ASTC10x10Unorm||e===Q.ASTC10x10UnormSRGB)return{byteLength:16,width:10,height:10};if(e===Q.ASTC12x10Unorm||e===Q.ASTC12x10UnormSRGB)return{byteLength:16,width:12,height:10};if(e===Q.ASTC12x12Unorm||e===Q.ASTC12x12UnormSRGB)return{byteLength:16,width:12,height:12}}_convertAddressMode(e){let t=ED.ClampToEdge;return e===1e3?t=ED.Repeat:e===1002&&(t=ED.MirrorRepeat),t}_convertFilterMode(e){let t=DD.Linear;return(e===1003||e===1004||e===1005)&&(t=DD.Nearest),t}_convertMipmapFilterMode(e){return e===1005||e===1008?DD.Linear:DD.Nearest}_getBytesPerTexel(e){if(e===Q.R8Unorm||e===Q.R8Snorm||e===Q.R8Uint||e===Q.R8Sint)return 1;if(e===Q.R16Uint||e===Q.R16Sint||e===Q.R16Float||e===Q.RG8Unorm||e===Q.RG8Snorm||e===Q.RG8Uint||e===Q.RG8Sint||e===Q.R16Unorm||e===Q.R16Snorm)return 2;if(e===Q.R32Uint||e===Q.R32Sint||e===Q.R32Float||e===Q.RG16Uint||e===Q.RG16Sint||e===Q.RG16Float||e===Q.RGBA8Unorm||e===Q.RGBA8UnormSRGB||e===Q.RGBA8Snorm||e===Q.RGBA8Uint||e===Q.RGBA8Sint||e===Q.BGRA8Unorm||e===Q.BGRA8UnormSRGB||e===Q.RG16Unorm||e===Q.RG16Snorm||e===Q.RGB9E5UFloat||e===Q.RGB10A2Unorm||e===Q.RG11B10UFloat||e===Q.Depth32Float||e===Q.Depth24Plus||e===Q.Depth24PlusStencil8||e===Q.Depth32FloatStencil8)return 4;if(e===Q.RG32Uint||e===Q.RG32Sint||e===Q.RG32Float||e===Q.RGBA16Uint||e===Q.RGBA16Sint||e===Q.RGBA16Float||e===Q.RGBA16Unorm||e===Q.RGBA16Snorm)return 8;if(e===Q.RGBA32Uint||e===Q.RGBA32Sint||e===Q.RGBA32Float)return 16}_getTypedArrayType(e){if(e===Q.R8Uint)return Uint8Array;if(e===Q.R8Sint)return Int8Array;if(e===Q.R8Unorm)return Uint8Array;if(e===Q.R8Snorm)return Int8Array;if(e===Q.RG8Uint)return Uint8Array;if(e===Q.RG8Sint)return Int8Array;if(e===Q.RG8Unorm)return Uint8Array;if(e===Q.RG8Snorm)return Int8Array;if(e===Q.RGBA8Uint)return Uint8Array;if(e===Q.RGBA8Sint)return Int8Array;if(e===Q.RGBA8Unorm||e===Q.RGBA8UnormSRGB)return Uint8Array;if(e===Q.RGBA8Snorm)return Int8Array;if(e===Q.R16Uint)return Uint16Array;if(e===Q.R16Sint)return Int16Array;if(e===Q.RG16Uint)return Uint16Array;if(e===Q.RG16Sint)return Int16Array;if(e===Q.RGBA16Uint)return Uint16Array;if(e===Q.RGBA16Sint)return Int16Array;if(e===Q.R16Float||e===Q.RG16Float||e===Q.RGBA16Float||e===Q.R16Unorm)return Uint16Array;if(e===Q.R16Snorm)return Int16Array;if(e===Q.RG16Unorm)return Uint16Array;if(e===Q.RG16Snorm)return Int16Array;if(e===Q.RGBA16Unorm)return Uint16Array;if(e===Q.RGBA16Snorm)return Int16Array;if(e===Q.R32Uint)return Uint32Array;if(e===Q.R32Sint)return Int32Array;if(e===Q.R32Float)return Float32Array;if(e===Q.RG32Uint)return Uint32Array;if(e===Q.RG32Sint)return Int32Array;if(e===Q.RG32Float)return Float32Array;if(e===Q.RGBA32Uint)return Uint32Array;if(e===Q.RGBA32Sint)return Int32Array;if(e===Q.RGBA32Float)return Float32Array;if(e===Q.BGRA8Unorm||e===Q.BGRA8UnormSRGB)return Uint8Array;if(e===Q.RGB10A2Unorm||e===Q.RGB9E5UFloat||e===Q.RG11B10UFloat)return Uint32Array;if(e===Q.Depth32Float)return Float32Array;if(e===Q.Depth24Plus||e===Q.Depth24PlusStencil8)return Uint32Array;if(e===Q.Depth32FloatStencil8)return Float32Array}_getDimension(e){let t;return t=e.is3DTexture||e.isData3DTexture?ID.ThreeD:ID.TwoD,t}};function RO(e,r){let i=e.format,o=e.type,c=e.normalized,l=e.colorSpace,u=Cn.getTransfer(l),d,f=!1;if(c&&(f=r.features.has(BD.TextureFormatsTier1),f===!1&&T(`WebGPURenderer: Unable to use normalized textures without texture-formats-tier1 feature.`)),e.isCompressedTexture===!0||e.isCompressedArrayTexture===!0)switch(i){case Sn:case pn:d=u===`srgb`?Q.BC1RGBAUnormSRGB:Q.BC1RGBAUnorm;break;case kn:d=u===`srgb`?Q.BC2RGBAUnormSRGB:Q.BC2RGBAUnorm;break;case qt:d=u===`srgb`?Q.BC3RGBAUnormSRGB:Q.BC3RGBAUnorm;break;case Te:d=Q.BC4RUnorm;break;case h:d=Q.BC4RSnorm;break;case xe:d=Q.BC5RGUnorm;break;case v:d=Q.BC5RGSnorm;break;case Oe:d=u===`srgb`?Q.BC7RGBAUnormSRGB:Q.BC7RGBAUnorm;break;case Nn:d=Q.BC6HRGBFloat;break;case St:d=Q.BC6HRGBUFloat;break;case Vn:case an:d=u===`srgb`?Q.ETC2RGB8UnormSRGB:Q.ETC2RGB8Unorm;break;case t:d=u===`srgb`?Q.ETC2RGBA8UnormSRGB:Q.ETC2RGBA8Unorm;break;case Xt:d=Q.EACR11Unorm;break;case ze:d=Q.EACR11Snorm;break;case x:d=Q.EACRG11Unorm;break;case Ce:d=Q.EACRG11Snorm;break;case qe:d=u===`srgb`?Q.ASTC4x4UnormSRGB:Q.ASTC4x4Unorm;break;case ee:d=u===`srgb`?Q.ASTC5x4UnormSRGB:Q.ASTC5x4Unorm;break;case fe:d=u===`srgb`?Q.ASTC5x5UnormSRGB:Q.ASTC5x5Unorm;break;case wn:d=u===`srgb`?Q.ASTC6x5UnormSRGB:Q.ASTC6x5Unorm;break;case le:d=u===`srgb`?Q.ASTC6x6UnormSRGB:Q.ASTC6x6Unorm;break;case tt:d=u===`srgb`?Q.ASTC8x5UnormSRGB:Q.ASTC8x5Unorm;break;case Ze:d=u===`srgb`?Q.ASTC8x6UnormSRGB:Q.ASTC8x6Unorm;break;case it:d=u===`srgb`?Q.ASTC8x8UnormSRGB:Q.ASTC8x8Unorm;break;case rr:d=u===`srgb`?Q.ASTC10x5UnormSRGB:Q.ASTC10x5Unorm;break;case s:d=u===`srgb`?Q.ASTC10x6UnormSRGB:Q.ASTC10x6Unorm;break;case We:d=u===`srgb`?Q.ASTC10x8UnormSRGB:Q.ASTC10x8Unorm;break;case je:d=u===`srgb`?Q.ASTC10x10UnormSRGB:Q.ASTC10x10Unorm;break;case re:d=u===`srgb`?Q.ASTC12x10UnormSRGB:Q.ASTC12x10Unorm;break;case Ve:d=u===`srgb`?Q.ASTC12x12UnormSRGB:Q.ASTC12x12Unorm;break;case oe:d=u===`srgb`?Q.RGBA8UnormSRGB:Q.RGBA8Unorm;break;default:C(`WebGPURenderer: Unsupported texture format.`,i)}else switch(i){case oe:switch(o){case ne:d=Q.RGBA8Snorm;break;case Ee:d=f?Q.RGBA16Snorm:Q.RGBA16Sint;break;case dt:d=f?Q.RGBA16Unorm:Q.RGBA16Uint;break;case dn:d=Q.RGBA32Uint;break;case a:d=Q.RGBA32Sint;break;case ke:d=u===`srgb`?Q.RGBA8UnormSRGB:Q.RGBA8Unorm;break;case Ie:d=Q.RGBA16Float;break;case lt:d=Q.RGBA32Float;break;default:C(`WebGPURenderer: Unsupported texture type with RGBAFormat.`,o)}break;case pt:switch(o){case Fn:d=Q.RGB9E5UFloat;break;case n:d=Q.RG11B10UFloat;break;default:C(`WebGPURenderer: Unsupported texture type with RGBFormat.`,o)}break;case er:switch(o){case ne:d=Q.R8Snorm;break;case Ee:d=f?Q.R16Snorm:Q.R16Sint;break;case dt:d=f?Q.R16Unorm:Q.R16Uint;break;case dn:d=Q.R32Uint;break;case a:d=Q.R32Sint;break;case ke:d=Q.R8Unorm;break;case Ie:d=Q.R16Float;break;case lt:d=Q.R32Float;break;default:C(`WebGPURenderer: Unsupported texture type with RedFormat.`,o)}break;case ln:switch(o){case ne:d=Q.RG8Snorm;break;case Ee:d=f?Q.RG16Snorm:Q.RG16Sint;break;case dt:d=f?Q.RG16Unorm:Q.RG16Uint;break;case dn:d=Q.RG32Uint;break;case a:d=Q.RG32Sint;break;case ke:d=Q.RG8Unorm;break;case Ie:d=Q.RG16Float;break;case lt:d=Q.RG32Float;break;default:C(`WebGPURenderer: Unsupported texture type with RGFormat.`,o)}break;case mt:switch(o){case dt:d=Q.Depth16Unorm;break;case dn:d=Q.Depth24Plus;break;case lt:d=Q.Depth32Float;break;default:C(`WebGPURenderer: Unsupported texture type with DepthFormat.`,o)}break;case vn:switch(o){case Ot:d=Q.Depth24PlusStencil8;break;case lt:r&&r.features.has(BD.Depth32FloatStencil8)===!1&&C(`WebGPURenderer: Depth textures with DepthStencilFormat + FloatType can only be used with the "depth32float-stencil8" GPU feature.`),d=Q.Depth32FloatStencil8;break;default:C(`WebGPURenderer: Unsupported texture type with DepthStencilFormat.`,o)}break;case _t:switch(o){case a:d=Q.R32Sint;break;case dn:d=Q.R32Uint;break;default:C(`WebGPURenderer: Unsupported texture type with RedIntegerFormat.`,o)}break;case Ut:switch(o){case a:d=Q.RG32Sint;break;case dn:d=Q.RG32Uint;break;default:C(`WebGPURenderer: Unsupported texture type with RGIntegerFormat.`,o)}break;case me:switch(o){case a:d=Q.RGBA32Sint;break;case dn:d=Q.RGBA32Uint;break;default:C(`WebGPURenderer: Unsupported texture type with RGBAIntegerFormat.`,o)}break;default:C(`WebGPURenderer: Unsupported texture format.`,i)}return d}var zO=/^[fn]*\s*([a-z_0-9]+)?\s*\(([\s\S]*?)\)\s*[\-\>]*\s*([a-z_0-9]+(?:<[\s\S]+?>)?)/i,BO=/([a-z_0-9]+)\s*:\s*([a-z_0-9]+(?:<[\s\S]+?>)?)/gi,VO={f32:`float`,i32:`int`,u32:`uint`,bool:`bool`,"vec2<f32>":`vec2`,"vec2<i32>":`ivec2`,"vec2<u32>":`uvec2`,"vec2<bool>":`bvec2`,vec2f:`vec2`,vec2i:`ivec2`,vec2u:`uvec2`,vec2b:`bvec2`,"vec3<f32>":`vec3`,"vec3<i32>":`ivec3`,"vec3<u32>":`uvec3`,"vec3<bool>":`bvec3`,vec3f:`vec3`,vec3i:`ivec3`,vec3u:`uvec3`,vec3b:`bvec3`,"vec4<f32>":`vec4`,"vec4<i32>":`ivec4`,"vec4<u32>":`uvec4`,"vec4<bool>":`bvec4`,vec4f:`vec4`,vec4i:`ivec4`,vec4u:`uvec4`,vec4b:`bvec4`,"mat2x2<f32>":`mat2`,mat2x2f:`mat2`,"mat3x3<f32>":`mat3`,mat3x3f:`mat3`,"mat4x4<f32>":`mat4`,mat4x4f:`mat4`,sampler:`sampler`,texture_1d:`texture`,texture_2d:`texture`,texture_2d_array:`texture`,texture_multisampled_2d:`cubeTexture`,texture_depth_2d:`depthTexture`,texture_depth_2d_array:`depthTexture`,texture_depth_multisampled_2d:`depthTexture`,texture_depth_cube:`depthTexture`,texture_depth_cube_array:`depthTexture`,texture_3d:`texture3D`,texture_cube:`cubeTexture`,texture_cube_array:`cubeTexture`,texture_storage_1d:`storageTexture`,texture_storage_2d:`storageTexture`,texture_storage_2d_array:`storageTexture`,texture_storage_3d:`storageTexture`},HO=e=>{e=e.trim();let t=e.match(zO);if(t!==null&&t.length===4){let n=t[2],r=[],i=null;for(;(i=BO.exec(n))!==null;)r.push({name:i[1],type:i[2]});let a=[];for(let e=0;e<r.length;e++){let{name:t,type:n}=r[e],i=n;i.startsWith(`ptr`)?i=`pointer`:(i.startsWith(`texture`)&&(i=n.split(`<`)[0]),i=VO[i]),a.push(new xT(i,t))}let o=e.substring(t[0].length),s=t[3]||`void`,c=t[1]===void 0?``:t[1];return{type:VO[s]||s,inputs:a,name:c,inputsCode:n,blockCode:o,outputType:s}}throw Error(`THREE.WGSLNodeFunction: Function is not a WGSL code.`)},UO=class extends FT{constructor(e){let{type:t,inputs:n,name:r,inputsCode:i,blockCode:a,outputType:o}=HO(e);super(t,n,r),this.inputsCode=i,this.blockCode=a,this.outputType=o}getCode(e=this.name){let t=this.outputType===`void`?``:`-> `+this.outputType;return`fn ${e} ( ${this.inputsCode.trim()} ) ${t}`+this.blockCode}},WO=class extends PT{parseFunction(e){return new UO(e)}},GO={[Mr.READ_ONLY]:`read`,[Mr.WRITE_ONLY]:`write`,[Mr.READ_WRITE]:`read_write`},KO={[Fe]:`repeat`,[S]:`clamp`,[cn]:`mirror`},qO={vertex:yD.VERTEX,fragment:yD.FRAGMENT,compute:yD.COMPUTE},JO={instance:!0,swizzleAssign:!1,storageBuffer:!0},YO={"^^":`tsl_xor`},XO={float:`f32`,int:`i32`,uint:`u32`,bool:`bool`,color:`vec3<f32>`,vec2:`vec2<f32>`,ivec2:`vec2<i32>`,uvec2:`vec2<u32>`,bvec2:`vec2<bool>`,vec3:`vec3<f32>`,ivec3:`vec3<i32>`,uvec3:`vec3<u32>`,bvec3:`vec3<bool>`,vec4:`vec4<f32>`,ivec4:`vec4<i32>`,uvec4:`vec4<u32>`,bvec4:`vec4<bool>`,mat2:`mat2x2<f32>`,mat3:`mat3x3<f32>`,mat4:`mat4x4<f32>`},ZO={},QO={tsl_xor:new Rb(`fn tsl_xor( a : bool, b : bool ) -> bool { return ( a || b ) && !( a && b ); }`),mod_float:new Rb(`fn tsl_mod_float( x : f32, y : f32 ) -> f32 { return x - y * floor( x / y ); }`),mod_vec2:new Rb(`fn tsl_mod_vec2( x : vec2f, y : vec2f ) -> vec2f { return x - y * floor( x / y ); }`),mod_vec3:new Rb(`fn tsl_mod_vec3( x : vec3f, y : vec3f ) -> vec3f { return x - y * floor( x / y ); }`),mod_vec4:new Rb(`fn tsl_mod_vec4( x : vec4f, y : vec4f ) -> vec4f { return x - y * floor( x / y ); }`),equals_bool:new Rb(`fn tsl_equals_bool( a : bool, b : bool ) -> bool { return a == b; }`),equals_bvec2:new Rb(`fn tsl_equals_bvec2( a : vec2f, b : vec2f ) -> vec2<bool> { return vec2<bool>( a.x == b.x, a.y == b.y ); }`),equals_bvec3:new Rb(`fn tsl_equals_bvec3( a : vec3f, b : vec3f ) -> vec3<bool> { return vec3<bool>( a.x == b.x, a.y == b.y, a.z == b.z ); }`),equals_bvec4:new Rb(`fn tsl_equals_bvec4( a : vec4f, b : vec4f ) -> vec4<bool> { return vec4<bool>( a.x == b.x, a.y == b.y, a.z == b.z, a.w == b.w ); }`),repeatWrapping_float:new Rb(`fn tsl_repeatWrapping_float( coord: f32 ) -> f32 { return fract( coord ); }`),mirrorWrapping_float:new Rb(`fn tsl_mirrorWrapping_float( coord: f32 ) -> f32 { let mirrored = fract( coord * 0.5 ) * 2.0; return 1.0 - abs( 1.0 - mirrored ); }`),clampWrapping_float:new Rb(`fn tsl_clampWrapping_float( coord: f32 ) -> f32 { return clamp( coord, 0.0, 1.0 ); }`),inverse_mat2:new Rb(`
fn tsl_inverse_mat2( m : mat2x2<f32> ) -> mat2x2<f32> {

	let det = m[ 0 ][ 0 ] * m[ 1 ][ 1 ] - m[ 0 ][ 1 ] * m[ 1 ][ 0 ];

	return mat2x2<f32>(
		m[ 1 ][ 1 ], - m[ 0 ][ 1 ],
		- m[ 1 ][ 0 ], m[ 0 ][ 0 ]
	) * ( 1.0 / det );

}
`),inverse_mat3:new Rb(`
fn tsl_inverse_mat3( m : mat3x3<f32> ) -> mat3x3<f32> {

	let a00 = m[ 0 ][ 0 ]; let a01 = m[ 0 ][ 1 ]; let a02 = m[ 0 ][ 2 ];
	let a10 = m[ 1 ][ 0 ]; let a11 = m[ 1 ][ 1 ]; let a12 = m[ 1 ][ 2 ];
	let a20 = m[ 2 ][ 0 ]; let a21 = m[ 2 ][ 1 ]; let a22 = m[ 2 ][ 2 ];

	let b01 = a22 * a11 - a12 * a21;
	let b11 = - a22 * a10 + a12 * a20;
	let b21 = a21 * a10 - a11 * a20;

	let det = a00 * b01 + a01 * b11 + a02 * b21;

	return mat3x3<f32>(
		b01, ( - a22 * a01 + a02 * a21 ), ( a12 * a01 - a02 * a11 ),
		b11, ( a22 * a00 - a02 * a20 ), ( - a12 * a00 + a02 * a10 ),
		b21, ( - a21 * a00 + a01 * a20 ), ( a11 * a00 - a01 * a10 )
	) * ( 1.0 / det );

}
`),inverse_mat4:new Rb(`
fn tsl_inverse_mat4( m : mat4x4<f32> ) -> mat4x4<f32> {

	let a00 = m[ 0 ][ 0 ]; let a01 = m[ 0 ][ 1 ]; let a02 = m[ 0 ][ 2 ]; let a03 = m[ 0 ][ 3 ];
	let a10 = m[ 1 ][ 0 ]; let a11 = m[ 1 ][ 1 ]; let a12 = m[ 1 ][ 2 ]; let a13 = m[ 1 ][ 3 ];
	let a20 = m[ 2 ][ 0 ]; let a21 = m[ 2 ][ 1 ]; let a22 = m[ 2 ][ 2 ]; let a23 = m[ 2 ][ 3 ];
	let a30 = m[ 3 ][ 0 ]; let a31 = m[ 3 ][ 1 ]; let a32 = m[ 3 ][ 2 ]; let a33 = m[ 3 ][ 3 ];

	let b00 = a00 * a11 - a01 * a10;
	let b01 = a00 * a12 - a02 * a10;
	let b02 = a00 * a13 - a03 * a10;
	let b03 = a01 * a12 - a02 * a11;
	let b04 = a01 * a13 - a03 * a11;
	let b05 = a02 * a13 - a03 * a12;
	let b06 = a20 * a31 - a21 * a30;
	let b07 = a20 * a32 - a22 * a30;
	let b08 = a20 * a33 - a23 * a30;
	let b09 = a21 * a32 - a22 * a31;
	let b10 = a21 * a33 - a23 * a31;
	let b11 = a22 * a33 - a23 * a32;

	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	return mat4x4<f32>(
		a11 * b11 - a12 * b10 + a13 * b09,
		a02 * b10 - a01 * b11 - a03 * b09,
		a31 * b05 - a32 * b04 + a33 * b03,
		a22 * b04 - a21 * b05 - a23 * b03,
		a12 * b08 - a10 * b11 - a13 * b07,
		a00 * b11 - a02 * b08 + a03 * b07,
		a32 * b02 - a30 * b05 - a33 * b01,
		a20 * b05 - a22 * b02 + a23 * b01,
		a10 * b10 - a11 * b08 + a13 * b06,
		a01 * b08 - a00 * b10 - a03 * b06,
		a30 * b04 - a31 * b02 + a33 * b00,
		a21 * b02 - a20 * b04 - a23 * b00,
		a11 * b07 - a10 * b09 - a12 * b06,
		a00 * b09 - a01 * b07 + a02 * b06,
		a31 * b01 - a30 * b03 - a32 * b00,
		a20 * b03 - a21 * b01 + a22 * b00
	) * ( 1.0 / det );

}
`),biquadraticTexture:new Rb(`
fn tsl_biquadraticTexture( map : texture_2d<f32>, coord : vec2f, iRes : vec2u, level : u32 ) -> vec4f {

	let res = vec2f( iRes );

	let uvScaled = coord * res;
	let uvWrapping = ( ( uvScaled % res ) + res ) % res;

	// https://www.shadertoy.com/view/WtyXRy

	let uv = uvWrapping - 0.5;
	let iuv = floor( uv );
	let f = fract( uv );

	let rg1 = textureLoad( map, vec2u( iuv + vec2( 0.5, 0.5 ) ) % iRes, level );
	let rg2 = textureLoad( map, vec2u( iuv + vec2( 1.5, 0.5 ) ) % iRes, level );
	let rg3 = textureLoad( map, vec2u( iuv + vec2( 0.5, 1.5 ) ) % iRes, level );
	let rg4 = textureLoad( map, vec2u( iuv + vec2( 1.5, 1.5 ) ) % iRes, level );

	return mix( mix( rg1, rg2, f.x ), mix( rg3, rg4, f.x ), f.y );

}
`),biquadraticTextureArray:new Rb(`
fn tsl_biquadraticTexture_array( map : texture_2d_array<f32>, coord : vec2f, iRes : vec2u, layer : u32, level : u32 ) -> vec4f {

	let res = vec2f( iRes );

	let uvScaled = coord * res;
	let uvWrapping = ( ( uvScaled % res ) + res ) % res;

	// https://www.shadertoy.com/view/WtyXRy

	let uv = uvWrapping - 0.5;
	let iuv = floor( uv );
	let f = fract( uv );

	let rg1 = textureLoad( map, vec2u( iuv + vec2( 0.5, 0.5 ) ) % iRes, layer, level );
	let rg2 = textureLoad( map, vec2u( iuv + vec2( 1.5, 0.5 ) ) % iRes, layer, level );
	let rg3 = textureLoad( map, vec2u( iuv + vec2( 0.5, 1.5 ) ) % iRes, layer, level );
	let rg4 = textureLoad( map, vec2u( iuv + vec2( 1.5, 1.5 ) ) % iRes, layer, level );

	return mix( mix( rg1, rg2, f.x ), mix( rg3, rg4, f.x ), f.y );

}
`)},$O={dFdx:`dpdx`,dFdy:`- dpdy`,mod_float:`tsl_mod_float`,mod_vec2:`tsl_mod_vec2`,mod_vec3:`tsl_mod_vec3`,mod_vec4:`tsl_mod_vec4`,equals_bool:`tsl_equals_bool`,equals_bvec2:`tsl_equals_bvec2`,equals_bvec3:`tsl_equals_bvec3`,equals_bvec4:`tsl_equals_bvec4`,inverse_mat2:`tsl_inverse_mat2`,inverse_mat3:`tsl_inverse_mat3`,inverse_mat4:`tsl_inverse_mat4`,inversesqrt:`inverseSqrt`,bitcast:`bitcast<f32>`,floatpack_snorm_2x16:`pack2x16snorm`,floatpack_unorm_2x16:`pack2x16unorm`,floatpack_float16_2x16:`pack2x16float`,floatunpack_snorm_2x16:`unpack2x16snorm`,floatunpack_unorm_2x16:`unpack2x16unorm`,floatunpack_float16_2x16:`unpack2x16float`},ek=``;(typeof navigator<`u`&&/Firefox|Deno/g.test(navigator.userAgent))!==!0&&(ek+=`diagnostic( off, derivative_uniformity );
`);var tk=class extends yT{constructor(e,t){super(e,t,new WO),this.uniformGroups={},this.uniformGroupsBindings={},this.builtins={},this.directives={},this.scopedArrays=new Map,this.allowEarlyReturns=!0,this.allowGlobalVariables=!0}_generateTextureSample(e,t,n,r,i,a=this.shaderStage){return a===`fragment`?r?i?`textureSample( ${t}, ${t}_sampler, ${n}, ${r}, ${i} )`:`textureSample( ${t}, ${t}_sampler, ${n}, ${r} )`:i?`textureSample( ${t}, ${t}_sampler, ${n}, ${i} )`:`textureSample( ${t}, ${t}_sampler, ${n} )`:this.generateTextureSampleLevel(e,t,n,`0`,r)}generateTextureSampleLevel(e,t,n,r,i,a){return this.isUnfilterable(e)===!1?i?a?`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${i}, ${r}, ${a} )`:`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${i}, ${r} )`:a?`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${r}, ${a} )`:`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${r} )`:this.isFilteredTexture(e)?this.generateFilteredTexture(e,t,n,a,r,i):this.generateTextureLod(e,t,n,i,a,r)}generateWrapFunction(e){let t=`tsl_coord_${KO[e.wrapS]}S_${KO[e.wrapT]}T_${e.is3DTexture||e.isData3DTexture?`3d`:`2d`}`,n=ZO[t];if(n===void 0){let r=[],i=e.is3DTexture||e.isData3DTexture?`vec3f`:`vec2f`,a=`fn ${t}( coord : ${i} ) -> ${i} {\n\n\treturn ${i}(\n`,o=(e,t)=>{e===1e3?(r.push(QO.repeatWrapping_float),a+=`\t\ttsl_repeatWrapping_float( coord.${t} )`):e===1001?(r.push(QO.clampWrapping_float),a+=`\t\ttsl_clampWrapping_float( coord.${t} )`):e===1002?(r.push(QO.mirrorWrapping_float),a+=`\t\ttsl_mirrorWrapping_float( coord.${t} )`):(a+=`\t\tcoord.${t}`,T(`WebGPURenderer: Unsupported texture wrap type "${e}" for vertex shader.`))};o(e.wrapS,`x`),a+=`,
`,o(e.wrapT,`y`),(e.is3DTexture||e.isData3DTexture)&&(a+=`,
`,o(e.wrapR,`z`)),a+=`
	);

}
`,ZO[t]=n=new Rb(a,r)}return n.build(this),t}generateArrayDeclaration(e,t){return`array< ${this.getType(e)}, ${t} >`}generateTextureDimension(e,t,n){let r=this.getDataFromNode(e,this.shaderStage,this.cache);r.dimensionsSnippet===void 0&&(r.dimensionsSnippet={});let i=r.dimensionsSnippet[n];if(r.dimensionsSnippet[n]===void 0){let a,o,{primarySamples:s}=this.renderer.backend.utils.getTextureSampleData(e),c=s>1;o=e.is3DTexture||e.isData3DTexture?`vec3<u32>`:`vec2<u32>`,a=c||e.isStorageTexture?t:`${t}${n?`, u32( ${n} )`:``}`,i=new Xs(new Gc(`textureDimensions( ${a} )`,o)),r.dimensionsSnippet[n]=i,(e.isArrayTexture||e.isDataArrayTexture||e.is3DTexture||e.isData3DTexture)&&(r.arrayLayerCount=new Xs(new Gc(`textureNumLayers(${t})`,`u32`))),e.isTextureCube&&(r.cubeFaceCount=new Xs(new Gc(`6u`,`u32`)))}return i.build(this)}generateFilteredTexture(e,t,n,r,i=`0u`,a){let o=this.generateWrapFunction(e),s=this.generateTextureDimension(e,t,i);return r&&(n=`${n} + vec2<f32>(${r}) / ${s}`),a?(this._include(`biquadraticTextureArray`),`tsl_biquadraticTexture_array( ${t}, ${o}( ${n} ), ${s}, u32( ${a} ), u32( ${i} ) )`):(this._include(`biquadraticTexture`),`tsl_biquadraticTexture( ${t}, ${o}( ${n} ), ${s}, u32( ${i} ) )`)}generateTextureLod(e,t,n,r,i,a=`0u`){if(e.isCubeTexture===!0){i&&(n=`${n} + vec3<f32>(${i})`);let r=e.isDepthTexture?`u32`:`f32`;return`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${r}( ${a} ) )`}let o=this.generateWrapFunction(e),s=this.generateTextureDimension(e,t,a),c=e.is3DTexture||e.isData3DTexture?`vec3`:`vec2`,l=c===`vec3`?`vec3<u32>( 1, 1, 1 )`:`vec2<u32>( 1, 1 )`;i&&(n=`${n} + ${c}<f32>(${i}) / ${c}<f32>( ${s} )`);let u=`${c}<f32>( 0 )`,d=`${c}<f32>( ${s} - ${l} )`;return n=`${c}<u32>( clamp( floor( ${o}( ${n} ) * ${c}<f32>( ${s} ) ), ${u}, ${d} ) )`,this.generateTextureLoad(e,t,n,a,r,null)}generateStorageTextureLoad(e,t,n,r,i,a){a&&(n=`${n} + ${a}`);let o;return o=i?`textureLoad( ${t}, ${n}, ${i} )`:`textureLoad( ${t}, ${n} )`,o}generateTextureLoad(e,t,n,r,i,a){r===null&&(r=`0u`),a&&(n=`${n} + ${a}`);let o;return i?o=`textureLoad( ${t}, ${n}, ${i}, u32( ${r} ) )`:(o=`textureLoad( ${t}, ${n}, u32( ${r} ) )`,this.renderer.backend.compatibilityMode&&e.isDepthTexture&&(o+=`.x`)),o}generateTextureStore(e,t,n,r,i){let a;return a=r?`textureStore( ${t}, ${n}, ${r}, ${i} )`:`textureStore( ${t}, ${n}, ${i} )`,a}isSampleCompare(e){return e.isDepthTexture===!0&&e.compareFunction!==null&&this.renderer.hasCompatibility(ce.TEXTURE_COMPARE)}isUnfilterable(e){return this.getComponentTypeFromTexture(e)!==`float`||!this.isAvailable(`float32Filterable`)&&e.type===1015||this.isSampleCompare(e)===!1&&e.minFilter===1003&&e.magFilter===1003||this.renderer.backend.utils.getTextureSampleData(e).primarySamples>1}generateTexture(e,t,n,r,i,a=this.shaderStage){let o=null;return o=this.isUnfilterable(e)?this.generateTextureLod(e,t,n,r,i,`0`,a):this._generateTextureSample(e,t,n,r,i,a),o}generateTextureGrad(e,t,n,r,i,a,o=this.shaderStage){if(o===`fragment`)return i?a?`textureSampleGrad( ${t}, ${t}_sampler, ${n}, ${i}, ${r[0]}, ${r[1]}, ${a} )`:`textureSampleGrad( ${t}, ${t}_sampler, ${n}, ${i}, ${r[0]}, ${r[1]} )`:a?`textureSampleGrad( ${t}, ${t}_sampler, ${n}, ${r[0]}, ${r[1]}, ${a} )`:`textureSampleGrad( ${t}, ${t}_sampler, ${n}, ${r[0]}, ${r[1]} )`;C(`WebGPURenderer: THREE.TextureNode.gradient() does not support ${o} shader.`)}generateTextureCompare(e,t,n,r,i,a,o=this.shaderStage){if(o===`fragment`)return e.isDepthTexture===!0&&e.isArrayTexture===!0?a?`textureSampleCompare( ${t}, ${t}_sampler, ${n}, ${i}, ${r}, ${a} )`:`textureSampleCompare( ${t}, ${t}_sampler, ${n}, ${i}, ${r} )`:a?`textureSampleCompare( ${t}, ${t}_sampler, ${n}, ${r}, ${a} )`:`textureSampleCompare( ${t}, ${t}_sampler, ${n}, ${r} )`;C(`WebGPURenderer: THREE.DepthTexture.compareFunction() does not support ${o} shader.`)}generateTextureGather(e,t,n,r,i,a){let o=e.isDepthTexture===!0?``:`${r}, `;return i?a?`textureGather( ${o}${t}, ${t}_sampler, ${n}, ${i}, ${a} )`:`textureGather( ${o}${t}, ${t}_sampler, ${n}, ${i} )`:a?`textureGather( ${o}${t}, ${t}_sampler, ${n}, ${a} )`:`textureGather( ${o}${t}, ${t}_sampler, ${n})`}generateTextureGatherCompare(e,t,n,r,i,a){return i?a?`textureGatherCompare( ${t}, ${t}_sampler, ${n}, ${i}, ${r}, ${a} )`:`textureGatherCompare( ${t}, ${t}_sampler, ${n}, ${i}, ${r})`:a?`textureGatherCompare( ${t}, ${t}_sampler, ${n}, ${r}, ${a} )`:`textureGatherCompare( ${t}, ${t}_sampler, ${n}, ${r})`}generateTextureLevel(e,t,n,r,i,a){return this.isUnfilterable(e)===!1?i?a?`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${i}, ${r}, ${a} )`:`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${i}, ${r} )`:a?`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${r}, ${a} )`:`textureSampleLevel( ${t}, ${t}_sampler, ${n}, ${r} )`:this.isFilteredTexture(e)?this.generateFilteredTexture(e,t,n,a,r,i):this.generateTextureLod(e,t,n,i,a,r)}generateTextureBias(e,t,n,r,i,a,o=this.shaderStage){if(o===`fragment`)return i?a?`textureSampleBias( ${t}, ${t}_sampler, ${n}, ${i}, ${r}, ${a} )`:`textureSampleBias( ${t}, ${t}_sampler, ${n}, ${i}, ${r} )`:a?`textureSampleBias( ${t}, ${t}_sampler, ${n}, ${r}, ${a} )`:`textureSampleBias( ${t}, ${t}_sampler, ${n}, ${r} )`;C(`WebGPURenderer: THREE.TextureNode.biasNode does not support ${o} shader.`)}getPropertyName(e,t=this.shaderStage){if(e.isNodeVarying===!0&&e.needsInterpolation===!0){if(t===`vertex`)return`varyings.${e.name}`}else if(e.isNodeUniform===!0){let t=e.name,n=e.type;return n===`texture`||n===`cubeTexture`||n===`cubeDepthTexture`||n===`storageTexture`||n===`texture3D`?t:n===`buffer`||n===`storageBuffer`||n===`indirectStorageBuffer`?this.isCustomStruct(e)?t:t+`.value`:e.groupNode.name+`.`+t}return super.getPropertyName(e)}getOutputStructName(){return`output`}getFunctionOperator(e){let t=YO[e];return t===void 0?null:(this._include(t),t)}getNodeAccess(e,t){return t===`compute`?e.access:e.isAtomic===!0?(T(`WebGPURenderer: Atomic operations are only supported in compute shaders.`),Mr.READ_WRITE):Mr.READ_ONLY}getStorageAccess(e,t){return GO[this.getNodeAccess(e,t)]}getUniformFromNode(e,t,n,r=null){let i=super.getUniformFromNode(e,t,n,r),a=this.getDataFromNode(e,n,this.globalCache);if(a.uniformGPU===void 0){let o,s=e.groupNode,c=s.name,l=this.getBindGroupArray(c,n);if(t===`texture`||t===`cubeTexture`||t===`cubeDepthTexture`||t===`storageTexture`||t===`texture3D`){let r=null,a=this.getNodeAccess(e,n);if(t===`texture`||t===`storageTexture`?r=e.value.is3DTexture===!0?new BE(i.name,i.node,s,a):new RE(i.name,i.node,s,a):t===`cubeTexture`||t===`cubeDepthTexture`?r=new zE(i.name,i.node,s,a):t===`texture3D`&&(r=new BE(i.name,i.node,s,a)),r.store=e.isStorageTextureNode===!0,r.mipLevel=r.store?e.mipLevel:0,r.setVisibility(qO[n]),e.value.isCubeTexture===!0||this.isUnfilterable(e.value)===!1&&r.store===!1||e.gatherNode!==null){let e=new HD(`${i.name}_sampler`,i.node,s);e.setVisibility(qO[n]),l.push(e,r),o=[e,r]}else l.push(r),o=[r]}else if(t===`buffer`||t===`storageBuffer`||t===`indirectStorageBuffer`){let a=this.getSharedDataFromNode(e),c=a.buffer;c===void 0&&(c=new(t===`buffer`?kE:GD)(e,s),a.buffer=c),c.setVisibility(c.getVisibility()|qO[n]),l.push(c),o=c,i.name=r||`NodeBuffer_`+i.id}else{let e=this.uniformGroups[c];e===void 0&&(e=new PE(c,s),e.setVisibility(yD.VERTEX|yD.FRAGMENT|yD.COMPUTE),this.uniformGroups[c]=e),l.indexOf(e)===-1&&l.push(e),o=this.getNodeUniform(i,t);let n=o.name;e.uniforms.some(e=>e.name===n)||e.addUniform(o)}a.uniformGPU=o}return i}getBuiltin(e,t,n,r=this.shaderStage){let i=this.builtins[r]||(this.builtins[r]=new Map);return i.has(e)===!1&&i.set(e,{name:e,property:t,type:n}),t}hasBuiltin(e,t=this.shaderStage){return this.builtins[t]!==void 0&&this.builtins[t].has(e)}getVertexIndex(){return this.shaderStage===`vertex`?this.getBuiltin(`vertex_index`,`vertexIndex`,`u32`,`attribute`):`vertexIndex`}buildFunctionCode(e){let t=e.layout,n=this.flowShaderNode(e),r=[];for(let e of t.inputs)r.push(e.name+` : `+this.getType(e.type));let i=`fn ${t.name}( ${r.join(`, `)} ) -> ${this.getType(t.type)} {
${n.vars}
${n.code}
`;return n.result&&(i+=`\treturn ${n.result};\n`),i+=`
}
`,i}getInstanceIndex(){return this.shaderStage===`vertex`?this.getBuiltin(`instance_index`,`instanceIndex`,`u32`,`attribute`):`instanceIndex`}getInvocationLocalIndex(){return this.getBuiltin(`local_invocation_index`,`invocationLocalIndex`,`u32`,`attribute`)}getSubgroupSize(){return this.enableSubGroups(),this.getBuiltin(`subgroup_size`,`subgroupSize`,`u32`,`attribute`)}getInvocationSubgroupIndex(){return this.enableSubGroups(),this.getBuiltin(`subgroup_invocation_id`,`invocationSubgroupIndex`,`u32`,`attribute`)}getSubgroupIndex(){return this.enableSubGroups(),this.getBuiltin(`subgroup_id`,`subgroupIndex`,`u32`,`attribute`)}getDrawIndex(){return null}getFrontFacing(){return this.getBuiltin(`front_facing`,`isFront`,`bool`)}getFragCoord(){return this.getBuiltin(`position`,`fragCoord`,`vec4<f32>`)+`.xy`}getFragDepth(){return`output.`+this.getBuiltin(`frag_depth`,`depth`,`f32`,`output`)}getClipDistance(){return`varyings.hw_clip_distances`}isFlipY(){return!1}enableDirective(e,t=this.shaderStage){(this.directives[t]||(this.directives[t]=new Set)).add(e)}getDirectives(e){let t=[],n=this.directives[e];if(n!==void 0)for(let e of n)t.push(`enable ${e};`);return t.join(`
`)}enableSubGroups(){this.enableDirective(`subgroups`)}enableSubgroupsF16(){this.enableDirective(`subgroups-f16`)}enableClipDistances(){this.enableDirective(`clip_distances`)}enableShaderF16(){this.enableDirective(`f16`)}enableDualSourceBlending(){this.enableDirective(`dual_source_blending`)}enableHardwareClipping(e){this.enableClipDistances(),this.getBuiltin(`clip_distances`,`hw_clip_distances`,`array<f32, ${e} >`,`vertex`)}getBuiltins(e){let t=[],n=this.builtins[e];if(n!==void 0)for(let{name:e,property:r,type:i}of n.values())t.push(`@builtin( ${e} ) ${r} : ${i}`);return t.join(`,
	`)}getScopedArray(e,t,n,r){return this.scopedArrays.has(e)===!1&&this.scopedArrays.set(e,{name:e,scope:t,bufferType:n,bufferCount:r}),e}getScopedArrays(e){if(e!==`compute`)return;let t=[];for(let{name:e,scope:n,bufferType:r,bufferCount:i}of this.scopedArrays.values()){let a=this.getType(r);t.push(`var<${n}> ${e}: array< ${a}, ${i} >;`)}return t.join(`
`)}getAttributes(e){let t=[];if(e===`compute`&&(this.getBuiltin(`global_invocation_id`,`globalId`,`vec3<u32>`,`attribute`),this.getBuiltin(`workgroup_id`,`workgroupId`,`vec3<u32>`,`attribute`),this.getBuiltin(`local_invocation_id`,`localId`,`vec3<u32>`,`attribute`),this.getBuiltin(`num_workgroups`,`numWorkgroups`,`vec3<u32>`,`attribute`),this.renderer.hasFeature(`subgroups`)&&(this.enableDirective(`subgroups`,e),this.getBuiltin(`subgroup_size`,`subgroupSize`,`u32`,`attribute`))),e===`vertex`||e===`compute`){let e=this.getBuiltins(`attribute`);e&&t.push(e);let n=this.getAttributesArray();for(let e=0,r=n.length;e<r;e++){let r=n[e],i=r.name,a=this.getType(r.type);t.push(`@location( ${e} ) ${i} : ${a}`)}}return t.join(`,
	`)}getStructMembers(e){let t=[];for(let n of e.members){let r=e.output?`@location( `+n.index+` ) `:``,i=this.getType(n.type);n.atomic&&(i=`atomic< `+i+` >`),t.push(`\t${r+n.name} : ${i}`)}return e.output&&t.push(`\t${this.getBuiltins(`output`)}`),t.join(`,
`)}getStructs(e){let t=``,n=this.structs[e];if(n.length>0){let e=[];for(let t of n){let n=`struct ${t.name} {\n`;n+=this.getStructMembers(t),n+=`
};`,e.push(n)}t=`
`+e.join(`

`)+`
`}return t}getVar(e,t,n=null,r=``){let i=`var${r} ${t} : `;return i+=n===null?this.getType(e):this.generateArrayDeclaration(e,n),i}getVars(e,t=!1){let n=``;t&&(n=`<private>`);let r=[],i=this.vars[e];if(i!==void 0)for(let e of i)r.push(`${this.getVar(e.type,e.name,e.count,n)};`);return t?r.join(`
`):`\n\t${r.join(`
	`)}\n`}getVaryings(e){let t=[];if(e===`vertex`&&this.getBuiltin(`position`,`builtinClipSpace`,`vec4<f32>`,`vertex`),e===`vertex`||e===`fragment`){let n=this.varyings,r=this.vars[e],i=0;for(let a=0;a<n.length;a++){let o=n[a];if(o.needsInterpolation){let e=`@location( ${i++} )`;if(o.interpolationType){let t=o.interpolationSampling===null?` )`:`, ${o.interpolationSampling} )`;e+=` @interpolate( ${o.interpolationType}${t}`}else/^(int|uint|ivec|uvec)/.test(o.type)&&(e+=` @interpolate(flat, either)`);t.push(`${e} ${o.name} : ${this.getType(o.type)}`)}else e===`vertex`&&r.includes(o)===!1&&r.push(o)}}let n=this.getBuiltins(e);n&&t.push(n);let r=t.join(`,
	`);return e===`vertex`?this._getWGSLStruct(`VaryingsStruct`,`	`+r):r}isCustomStruct(e){let t=e.value,n=e.node,r=(t.isBufferAttribute||t.isInstancedBufferAttribute)&&n.structTypeNode!==null,i=n.value&&n.value.array&&typeof n.value.itemSize==`number`&&n.value.array.length>n.value.itemSize;return r&&!i}getUniforms(e){let t=this.renderer.backend,n=this.uniforms[e],r=[],i=[],a=[],o={};for(let a of n){let n=a.groupNode.name,s=this.bindingsIndexes[n];if(a.type===`texture`||a.type===`cubeTexture`||a.type===`cubeDepthTexture`||a.type===`storageTexture`||a.type===`texture3D`){let n=a.node,i=n.value;(i.isCubeTexture===!0||this.isUnfilterable(i)===!1&&n.isStorageTextureNode!==!0||n.gatherNode!==null)&&(this.isSampleCompare(i)&&n.compareNode!==null?r.push(`@binding( ${s.binding++} ) @group( ${s.group} ) var ${a.name}_sampler : sampler_comparison;`):r.push(`@binding( ${s.binding++} ) @group( ${s.group} ) var ${a.name}_sampler : sampler;`));let o,c=``,{primarySamples:l}=t.utils.getTextureSampleData(i);if(l>1&&(c=`_multisampled`),i.isCubeTexture===!0&&i.isDepthTexture===!0)o=`texture_depth_cube`;else if(i.isCubeTexture===!0)o=`texture_cube<f32>`;else if(i.isDepthTexture===!0)o=t.compatibilityMode&&i.compareFunction===null?`texture${c}_2d<f32>`:`texture_depth${c}_2d${i.isArrayTexture===!0?`_array`:``}`;else if(a.node.isStorageTextureNode===!0){let n=RO(i,t.device),r=this.getStorageAccess(a.node,e),s=a.node.value.is3DTexture,c=a.node.value.isArrayTexture;o=`texture_storage_${s?`3d`:`2d${c?`_array`:``}`}<${n}, ${r}>`}else if(i.isArrayTexture===!0||i.isDataArrayTexture===!0||i.isCompressedArrayTexture===!0)o=`texture_2d_array<f32>`;else if(i.is3DTexture===!0||i.isData3DTexture===!0)o=`texture_3d<f32>`;else{let e=this.getComponentTypeFromTexture(i).charAt(0);o=`texture${c}_2d<${e}32>`}r.push(`@binding( ${s.binding++} ) @group( ${s.group} ) var ${a.name} : ${o};`)}else if(a.type===`buffer`||a.type===`storageBuffer`||a.type===`indirectStorageBuffer`){let t=a.node,n=this.getType(t.getNodeType(this)),r=t.bufferCount,o=r>0&&a.type===`buffer`?`, `+r:``,c=t.isStorageBufferNode?`storage, ${this.getStorageAccess(t,e)}`:`uniform`;if(this.isCustomStruct(a))i.push(`@binding( ${s.binding++} ) @group( ${s.group} ) var<${c}> ${a.name} : ${n};`);else{let e=`\tvalue : array< ${t.isAtomic?`atomic<${n}>`:`${n}`}${o} >`;i.push(this._getWGSLStructBinding(a.name,e,c,s.binding++,s.group))}}else{let e=a.groupNode.name;if(o[e]===void 0){let t=this.uniformGroups[e];if(t!==void 0){let n=[];for(let e of t.uniforms){let t=e.getType(),r=this.getType(this.getVectorType(t));n.push(`\t${e.name} : ${r}`)}let r=this.uniformGroupsBindings[e];r===void 0&&(r={index:s.binding++,id:s.group},this.uniformGroupsBindings[e]=r),o[e]={index:r.index,id:r.id,snippets:n}}}}}for(let e in o){let t=o[e];a.push(this._getWGSLStructBinding(e,t.snippets.join(`,
`),`uniform`,t.index,t.id))}return[...r,...i,...a].join(`
`)}buildCode(){let e=this.material===null?{compute:{}}:{fragment:{},vertex:{}};this.sortBindingGroups();for(let t in e){this.shaderStage=t;let n=this.allowGlobalVariables,r=e[t];r.uniforms=this.getUniforms(t),r.attributes=this.getAttributes(t),r.varyings=this.getVaryings(t),r.structs=this.getStructs(t),r.vars=this.getVars(t,n),r.codes=this.getCodes(t),r.directives=this.getDirectives(t),r.scopedArrays=this.getScopedArrays(t);let i=`// code

`;i+=this.flowCode[t];let a=this.flowNodes[t],o=a[a.length-1],s=o.outputNode,c=s!==void 0&&s.isOutputStructNode===!0;for(let e of a){let n=this.getFlowData(e),a=e.name;if(a&&(i.length>0&&(i+=`
`),i+=`\t// flow -> ${a}\n`),i+=`${n.code}\n\t`,e===o&&t!==`compute`){if(i+=`// result

	`,t===`vertex`)i+=`varyings.builtinClipSpace = ${n.result};`;else if(t===`fragment`){if(c)r.returnType=s.getNodeType(this),r.structs+=`var<private> output : `+r.returnType+`;`,i+=`return ${n.result};`;else{let e=`\t@location( 0 ) color: ${this.getType(this.getOutputType())}`,t=this.getBuiltins(`output`);t&&(e+=`,
	`+t),r.returnType=`OutputStruct`,r.structs+=this._getWGSLStruct(`OutputStruct`,e),r.structs+=`
var<private> output : OutputStruct;`,i+=`output.color = ${this.format(n.result,o.getNodeType(this),this.getOutputType())};\n\n\treturn output;`}}}}r.flow=i}if(this.shaderStage=null,this.material!==null)this.vertexShader=this._getWGSLVertexCode(e.vertex),this.fragmentShader=this._getWGSLFragmentCode(e.fragment);else{let t=this.object.workgroupSize;this.computeShader=this._getWGSLComputeCode(e.compute,t)}}getMethod(e,t=null){let n;return t!==null&&(n=this._getWGSLMethod(e+`_`+t)),n===void 0&&(n=this._getWGSLMethod(e)),n||e}getBitcastMethod(e){return`bitcast<${this.getType(e)}>`}getFloatPackingMethod(e){return this.getMethod(`floatpack_${e}_2x16`)}getFloatUnpackingMethod(e){return this.getMethod(`floatunpack_${e}_2x16`)}getTernary(e,t,n){return`select( ${n}, ${t}, ${e} )`}getType(e){return XO[e]||e}isAvailable(e){let t=JO[e];return t===void 0&&(e===`float32Filterable`?t=this.renderer.hasFeature(`float32-filterable`):e===`clipDistance`&&(t=this.renderer.hasFeature(`clip-distances`)),JO[e]=t),t}_getWGSLMethod(e){return QO[e]!==void 0&&this._include(e),$O[e]}_include(e){let t=QO[e];return t.build(this),this.addInclude(t),t}_getWGSLVertexCode(e){return`${this.getSignature()}
// directives
${e.directives}

// structs
${e.structs}

// uniforms
${e.uniforms}

// varyings
${e.varyings}
var<private> varyings : VaryingsStruct;

// vars
${e.vars}

// codes
${e.codes}

@vertex
fn main( ${e.attributes} ) -> VaryingsStruct {

	// flow
	${e.flow}

	return varyings;

}
`}_getWGSLFragmentCode(e){return`${this.getSignature()}
// global
${ek}

// structs
${e.structs}

// uniforms
${e.uniforms}

// vars
${e.vars}

// codes
${e.codes}

@fragment
fn main( ${e.varyings} ) -> ${e.returnType} {

	// flow
	${e.flow}

}
`}_getWGSLComputeCode(e,t){let[n,r,i]=t;return`${this.getSignature()}
// directives
${e.directives}

// system
var<private> instanceIndex : u32;

// locals
${e.scopedArrays}

// structs
${e.structs}

// uniforms
${e.uniforms}

// vars
${this.allowGlobalVariables?e.vars:``}

// codes
${e.codes}

@compute @workgroup_size( ${n}, ${r}, ${i} )
fn main( ${e.attributes} ) {

	// local vars
	${this.allowGlobalVariables?``:e.vars}

	// system
	instanceIndex = globalId.x
		+ globalId.y * ( ${n} * numWorkgroups.x )
		+ globalId.z * ( ${n} * numWorkgroups.x ) * ( ${r} * numWorkgroups.y );

	// flow
	${e.flow}

}
`}_getWGSLStruct(e,t){return`
struct ${e} {
${t}
};`}_getWGSLStructBinding(e,t,n,r=0,i=0){let a=e+`Struct`;return`${this._getWGSLStruct(a,t)}
@binding( ${r} ) @group( ${i} )
var<${n}> ${e} : ${a};`}},nk=new XD,rk=new ZD,ik=new Map([[Int8Array,[`sint8`,`snorm8`]],[Uint8Array,[`uint8`,`unorm8`]],[Int16Array,[`sint16`,`snorm16`]],[Uint16Array,[`uint16`,`unorm16`]],[Int32Array,[`sint32`,`snorm32`]],[Uint32Array,[`uint32`,`unorm32`]],[Float32Array,[`float32`]]]);typeof Float16Array<`u`&&ik.set(Float16Array,[`float16`]);var ak=new Map([[Wt,[`float16`]]]),ok=new Map([[Int32Array,`sint32`],[Int16Array,`sint32`],[Uint32Array,`uint32`],[Uint16Array,`uint32`],[Float32Array,`float32`]]),sk=class{constructor(e){this.backend=e}createAttribute(e,t){let n=this._getBufferAttribute(e),r=this.backend,i=r.get(n),a=i.buffer;if(a===void 0){let o=r.device,s=n.array;if(e.normalized===!1){if(s.constructor===Int16Array||s.constructor===Int8Array)s=new Int32Array(s);else if((s.constructor===Uint16Array||s.constructor===Uint8Array)&&(s=new Uint32Array(s),t&GPUBufferUsage.INDEX))for(let e=0;e<s.length;e++)s[e]===65535&&(s[e]=4294967295)}n.array=s;let c;if((n.isStorageBufferAttribute||n.isStorageInstancedBufferAttribute)&&n.itemSize===3)c=4;else if(n.itemSize>1&&n.itemSize*s.BYTES_PER_ELEMENT%4!=0){let e=n.itemSize*s.BYTES_PER_ELEMENT;c=Math.floor((e+3)/4)*4/s.BYTES_PER_ELEMENT}if(c!==void 0){let e=n.itemSize,t=new s.constructor(n.count*c);for(let r=0;r<n.count;r++)t.set(s.subarray(r*e,r*e+e),r*c);(n.isStorageBufferAttribute||n.isStorageInstancedBufferAttribute)&&(n.itemSize=c,n.array=t),s=t,i._itemSize=e,i._paddedItemSize=c}let l=s.byteLength,u=l+(4-l%4)%4;nk.label=n.name,nk.size=u,nk.usage=t,nk.mappedAtCreation=!0,a=o.createBuffer(nk),nk.reset(),new s.constructor(a.getMappedRange()).set(s),a.unmap(),i.buffer=a}}updateAttribute(e){let t=this._getBufferAttribute(e),n=this.backend,r=n.device,i=n.get(t),a=n.get(t).buffer,o=t.array,s=i._itemSize,c=i._paddedItemSize;if(c!==void 0){o=new o.constructor(t.count*c);for(let e=0;e<t.count;e++)o.set(t.array.subarray(e*s,e*s+s),e*c);(t.isStorageBufferAttribute||t.isStorageInstancedBufferAttribute)&&(t.array=o)}let l=t.updateRanges;if(l.length===0)r.queue.writeBuffer(a,0,o,0);else{let e=It(o),n=e?1:o.BYTES_PER_ELEMENT;for(let t=0,i=l.length;t<i;t++){let i=l[t],u,d;if(c!==void 0){let e=Math.floor(i.start/s),t=Math.ceil((i.start+i.count)/s)-e;u=e*c*n,d=t*c*n}else u=i.start*n,d=i.count*n;let f=u*(e?o.BYTES_PER_ELEMENT:1);r.queue.writeBuffer(a,f,o,u,d)}t.clearUpdateRanges()}}createShaderVertexBuffers(e){let t=e.getAttributes(),n=new Map;for(let e=0;e<t.length;e++){let r=t[e],i=r.array.BYTES_PER_ELEMENT,a=this._getBufferAttribute(r),o=n.get(a);if(o===void 0){let e,t;r.isInterleavedBufferAttribute===!0?(e=r.data.stride*i,t=r.data.isInstancedInterleavedBuffer?zD.Instance:zD.Vertex):(e=r.itemSize*i,t=r.isInstancedBufferAttribute?zD.Instance:zD.Vertex,r.itemSize>1&&e%4!=0&&(e=Math.floor((e+3)/4)*4)),r.normalized===!1&&(r.array.constructor===Int16Array||r.array.constructor===Uint16Array)&&(e=4),o={arrayStride:e,attributes:[],stepMode:t},n.set(a,o)}let s=this._getVertexFormat(r),c=r.isInterleavedBufferAttribute===!0?r.offset*i:0;o.attributes.push({shaderLocation:e,offset:c,format:s})}return Array.from(n.values())}destroyAttribute(e){let t=this.backend;t.get(this._getBufferAttribute(e)).buffer.destroy(),t.delete(e)}async getArrayBufferAsync(e,t=null,n=0,r=-1){let i=this.backend,a=i.device,o=i.get(this._getBufferAttribute(e)).buffer,s=r===-1?o.size-n:r,c;if(t!==null&&t.isReadbackBuffer){let e=i.get(t);if(t._mapped===!0)throw Error(`THREE.WebGPUAttributeUtils: ReadbackBuffer must be released before being used again.`);if(t._mapped=!0,e.readBufferGPU===void 0){nk.label=`${t.name}_readback`,nk.size=t.maxByteLength,nk.usage=GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,c=a.createBuffer(nk),nk.reset();let n=()=>{t.buffer=null,t._mapped=!1,c.unmap()},r=()=>{t.buffer=null,t._mapped=!1,c.destroy(),i.delete(t),t.removeEventListener(`release`,n),t.removeEventListener(`dispose`,r)};t.addEventListener(`release`,n),t.addEventListener(`dispose`,r),e.readBufferGPU=c}else c=e.readBufferGPU}else nk.label=`${e.name}_readback`,nk.size=s,nk.usage=GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,c=a.createBuffer(nk),nk.reset();rk.label=`readback_encoder_${e.name}`;let l=a.createCommandEncoder(rk);if(rk.reset(),l.copyBufferToBuffer(o,n,c,0,s),JD(a,l.finish()),await c.mapAsync(GPUMapMode.READ,0,s),t===null){let e=c.getMappedRange(0,s).slice();return c.destroy(),e}if(t.isReadbackBuffer)return t.buffer=c.getMappedRange(0,s),t;{let e=c.getMappedRange(0,s);return new Uint8Array(t).set(new Uint8Array(e)),c.destroy(),t}}_getVertexFormat(e){let{itemSize:t,normalized:n}=e,r=e.array.constructor,i=e.constructor,a;if(t===1)a=ok.get(r);else{let e=(ak.get(i)||ik.get(r))[+!!n];if(e){let n=r.BYTES_PER_ELEMENT*t,i=Math.floor((n+3)/4)*4/r.BYTES_PER_ELEMENT;if(i%1)throw Error(`THREE.WebGPUAttributeUtils: Bad vertex format item size.`);a=`${e}x${i}`}}return a||C(`WebGPUAttributeUtils: Vertex format not supported yet.`),a}_getBufferAttribute(e){return e.isInterleavedBufferAttribute&&(e=e.data),e}},ck=new YD,lk=new XD,uk=new aO,dk=class{constructor(e){this.layoutGPU=e,this.usedTimes=0}},fk=class{constructor(e){this.backend=e,this._bindGroupLayoutCache=new Map}createBindingsLayout(e){let t=this.backend,n=t.device,r=t.get(e);if(r.layout)return r.layout.layoutGPU;let i=this._createLayoutEntries(e),a=hr(JSON.stringify(i)),o=this._bindGroupLayoutCache.get(a);return o===void 0&&(o=new dk(n.createBindGroupLayout({entries:i})),this._bindGroupLayoutCache.set(a,o)),o.usedTimes++,r.layout=o,r.layoutKey=a,o.layoutGPU}createBindings(e,t,n,r=0){let{backend:i}=this,a=i.get(e),o=this.createBindingsLayout(e),s;n>0&&(a.groups===void 0&&(a.groups=[],a.versions=[]),a.versions[n]===r&&(s=a.groups[n])),s===void 0&&(s=this.createBindGroup(e,o),n>0&&(a.groups[n]=s,a.versions[n]=r)),a.group=s}updateBinding(e){let t=this.backend,n=t.device,r=e.buffer,i=t.get(e).buffer,a=e.updateRanges;if(a.length===0)n.queue.writeBuffer(i,0,r,0);else{let e=It(r),t=e?1:r.BYTES_PER_ELEMENT,o=a[0].start;for(let s=0,c=a.length;s<c;s++){let c=a[s],l=a[s+1],u=c.start+c.count;if(l!==void 0&&l.start===u)continue;let d=o*t,f=(u-o)*t,p=d*(e?r.BYTES_PER_ELEMENT:1);n.queue.writeBuffer(i,p,r,d,f),l!==void 0&&(o=l.start)}}}createBindGroupIndex(e,t){let n=this.backend.device,r=GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,i=e[0];lk.label=`bindingCameraIndex_`+i,lk.size=16,lk.usage=r;let a=n.createBuffer(lk);lk.reset(),n.queue.writeBuffer(a,0,e,0),ck.label=`bindGroupCameraIndex_`+i,ck.layout=t,ck.entries.push({binding:0,resource:{buffer:a}});let o=n.createBindGroup(ck);return ck.reset(),o}createBindGroup(e,t){let n=this.backend,r=n.device,i=0;ck.label=`bindGroup_`+e.name,ck.layout=t;for(let t of e.bindings){if(t.isUniformBuffer){let e=n.get(t);ck.entries.push({binding:i,resource:{buffer:e.buffer}})}else if(t.isStorageBuffer){let e=n.get(t.attribute).buffer;ck.entries.push({binding:i,resource:{buffer:e}})}else if(t.isSampledTexture){let e=n.get(t.texture),a;if(e.externalTexture!==void 0)a=r.importExternalTexture({source:e.externalTexture});else{let n=t.store?1:e.texture.mipLevelCount,r=t.store?t.mipLevel:0,i=`view-${e.texture.width}-${e.texture.height}`;if(e.texture.depthOrArrayLayers>1&&(i+=`-${e.texture.depthOrArrayLayers}`),i+=`-${n}-${r}`,a=e[i],a===void 0){let o=RD.All,s;s=t.isSampledCubeTexture?LD.Cube:t.texture.isArrayTexture||t.texture.isDataArrayTexture||t.texture.isCompressedArrayTexture?LD.TwoDArray:t.isSampledTexture3D?LD.ThreeD:LD.TwoD,uk.aspect=o,uk.dimension=s,uk.mipLevelCount=n,uk.baseMipLevel=r,a=e[i]=e.texture.createView(uk),uk.reset()}}ck.entries.push({binding:i,resource:a})}else if(t.isSampler){let e=n.get(t);ck.entries.push({binding:i,resource:e.sampler})}i++}let a=r.createBindGroup(ck);return ck.reset(),a}_createLayoutEntries(e){let t=[],n=0;for(let r of e.bindings){let e=this.backend,i={binding:n,visibility:r.visibility};if(r.isUniformBuffer||r.isStorageBuffer){let e={};r.isStorageBuffer&&(e.type=r.visibility&yD.COMPUTE&&(r.access===Mr.READ_WRITE||r.access===Mr.WRITE_ONLY)?MD.Storage:MD.ReadOnlyStorage),i.buffer=e}else if(r.isSampledTexture&&r.store){let e={};e.format=this.backend.get(r.texture).texture.format;let t=r.access;e.access=t===Mr.READ_WRITE?ND.ReadWrite:t===Mr.WRITE_ONLY?ND.WriteOnly:ND.ReadOnly,r.texture.isArrayTexture?e.viewDimension=LD.TwoDArray:r.texture.is3DTexture&&(e.viewDimension=LD.ThreeD),i.storageTexture=e}else if(r.isSampledTexture){let t={},{primarySamples:n}=e.utils.getTextureSampleData(r.texture);if(n>1&&(t.multisampled=!0,r.texture.isDepthTexture||(t.sampleType=FD.UnfilterableFloat)),r.texture.isDepthTexture)t.sampleType=e.compatibilityMode&&r.texture.compareFunction===null?FD.UnfilterableFloat:FD.Depth;else{let e=r.texture.type;e===1013?t.sampleType=FD.SInt:e===1014?t.sampleType=FD.UInt:e===1015&&(t.sampleType=this.backend.hasFeature(`float32-filterable`)?FD.Float:FD.UnfilterableFloat)}r.isSampledCubeTexture?t.viewDimension=LD.Cube:r.texture.isArrayTexture||r.texture.isDataArrayTexture||r.texture.isCompressedArrayTexture?t.viewDimension=LD.TwoDArray:r.isSampledTexture3D&&(t.viewDimension=LD.ThreeD),i.texture=t}else if(r.isSampler){let t={};r.texture.isDepthTexture&&(t.type=r.texture.compareFunction!==null&&r.textureNode.compareNode!==null&&e.hasCompatibility(ce.TEXTURE_COMPARE)?PD.Comparison:PD.NonFiltering),i.sampler=t}else C(`WebGPUBindingUtils: Unsupported binding "${r}".`);t.push(i),n++}return t}deleteBindGroupData(e){let{backend:t}=this,n=t.get(e);n.layout&&(n.layout.usedTimes--,n.layout.usedTimes===0&&this._bindGroupLayoutCache.delete(n.layoutKey),n.layout=void 0,n.layoutKey=void 0)}dispose(){this._bindGroupLayoutCache.clear()}},pk=class{constructor(e){this.backend=e}getMaxAnisotropy(){return 16}getUniformBufferLimit(){return this.backend.device.limits.maxUniformBufferBindingSize}},mk=class{constructor(){this.label=``,this.layout=null,this.compute=null}reset(){this.label=``,this.layout=null,this.compute=null}},hk=class{constructor(){this.label=``,this.bindGroupLayouts=null}reset(){this.label=``,this.bindGroupLayouts=null}},gk=new mk,_k=new hk,vk=new QD,yk=new tO,bk=class{constructor(e){this.backend=e}_getSampleCount(e){return this.backend.utils.getSampleCountRenderContext(e)}createRenderPipeline(e,t){let{object:n,material:r,geometry:i,pipeline:a}=e,{vertexProgram:o,fragmentProgram:s}=a,c=this.backend,l=c.device,u=c.utils,d=c.get(a),f=[];for(let t of e.getBindings()){let{layoutGPU:e}=c.get(t).layout;f.push(e)}let p=c.attributeUtils.createShaderVertexBuffers(e),m;r.blending!==0&&(r.blending!==1||r.transparent!==!1)&&(m=this._getBlending(r));let h={};r.stencilWrite===!0&&(h={compare:this._getStencilCompare(r),failOp:this._getStencilOperation(r.stencilFail),depthFailOp:this._getStencilOperation(r.stencilZFail),passOp:this._getStencilOperation(r.stencilZPass)});let g=this._getColorWriteMask(r),_=[];if(e.context.textures!==null){let t=e.context.textures,n=e.context.mrt;for(let e=0;e<t.length;e++){let r=t[e],i=u.getTextureFormatGPU(r),a;if(n!==null){if(this.backend.compatibilityMode!==!0){let e=n.getBlendMode(r.name);e.blending===6?a=m:e.blending!==0&&(a=this._getBlending(e))}else Qn(`WebGPURenderer: Multiple Render Targets (MRT) blending configuration is not fully supported in compatibility mode. The material blending will be used for all render targets.`),a=m}else a=m;_.push({format:i,blend:a,writeMask:g})}}else{let t=u.getCurrentColorFormat(e.context);_.push({format:t,blend:m,writeMask:g})}let v=c.get(o).module,y=c.get(s).module,b=this._getPrimitiveState(n,i,r),x=this._getDepthCompare(r),S=u.getCurrentDepthStencilFormat(e.context),ee=this._getSampleCount(e.context);_k.bindGroupLayouts=f;let te=l.createPipelineLayout(_k);_k.reset(),yk.label=`renderPipeline_${r.name||r.type}_${r.id}`,yk.vertex=Object.assign({},v,{buffers:p}),yk.fragment=Object.assign({},y,{targets:_}),yk.primitive=b,yk.multisample.count=ee,yk.multisample.alphaToCoverageEnabled=r.alphaToCoverage&&ee>1,yk.layout=te;let ne={},re=e.context.depth,ie=e.context.stencil;(re===!0||ie===!0)&&(re===!0&&(ne.format=S,ne.depthWriteEnabled=r.depthWrite,ne.depthCompare=x),ie===!0&&(ne.stencilFront=h,ne.stencilBack=h,ne.stencilReadMask=r.stencilFuncMask,ne.stencilWriteMask=r.stencilWriteMask),r.polygonOffset===!0&&b.topology===vD.TriangleList&&(ne.depthBias=r.polygonOffsetUnits,ne.depthBiasSlopeScale=r.polygonOffsetFactor,ne.depthBiasClamp=0),yk.depthStencil=ne),l.pushErrorScope(`validation`);let ae=[{program:o,module:v.module},{program:s,module:y.module}],oe=yk.label;if(t===null)d.pipeline=l.createRenderPipeline(yk),yk.reset(),l.popErrorScope().then(e=>{e!==null&&(d.error=!0,C(`WebGPURenderer: Render pipeline creation failed (${oe}): ${e.message}`),this._reportShaderDiagnostics(ae,oe))});else{let e=new Promise(async e=>{try{let e=null,t=null;try{t=l.createRenderPipelineAsync(yk)}catch(t){e=t}if(yk.reset(),t!==null)try{d.pipeline=await t}catch(t){e=t}let n=await l.popErrorScope();if(n!==null||e!==null){d.error=!0;let t=n&&n.message||e&&e.message||`unknown`;C(`WebGPURenderer: Async render pipeline creation failed (${oe}): ${t}`),await this._reportShaderDiagnostics(ae,oe)}}finally{e()}});t.push(e)}}createBundleEncoder(e,t=`renderBundleEncoder`){let{utils:n,device:r}=this.backend,i=n.getCurrentDepthStencilFormat(e),a=n.getCurrentColorFormats(e),o=this._getSampleCount(e);vk.label=t,vk.colorFormats=a,vk.depthStencilFormat=i,vk.sampleCount=o;let s=r.createRenderBundleEncoder(vk);return vk.reset(),s}createComputePipeline(e,t){let n=this.backend,r=n.device,i=n.get(e.computeProgram).module,a=n.get(e),o=[];for(let e of t){let{layoutGPU:t}=n.get(e).layout;o.push(t)}let s=e.computeProgram,c=`computePipeline_${s.stage}${s.name?`_${s.name}`:``}`;r.pushErrorScope(`validation`),_k.bindGroupLayouts=o;let l=r.createPipelineLayout(_k);_k.reset(),gk.label=c,gk.compute=i,gk.layout=l,a.pipeline=r.createComputePipeline(gk),gk.reset(),r.popErrorScope().then(e=>{e!==null&&(a.error=!0,C(`WebGPURenderer: Compute pipeline creation failed (${c}): ${e.message}`),this._reportShaderDiagnostics([{program:s,module:i.module}],c))})}async _reportShaderDiagnostics(e,t){for(let{program:n,module:r}of e){let e=await r.getCompilationInfo();if(e.messages.length===0)continue;let i=n.code.split(`
`);for(let r of e.messages){let e=r.lineNum>0?` at line ${r.lineNum}${r.linePos>0?`:${r.linePos}`:``}`:``,a=`WebGPURenderer [${t} / ${n.stage} ${r.type}]${e}: ${r.message}`,o=``;r.lineNum>0&&r.lineNum<=i.length&&(o=`\n  ${i[r.lineNum-1]}`,r.linePos>0&&(o+=`\n  ${` `.repeat(r.linePos-1)}^`)),(r.type===`error`?C:T)(a+o)}}}_getBlending(e){let t,n,r=e.blending,i=e.blendSrc,a=e.blendDst,o=e.blendEquation;if(r===5){let r=e.blendSrcAlpha===null?i:e.blendSrcAlpha,s=e.blendDstAlpha===null?a:e.blendDstAlpha,c=e.blendEquationAlpha===null?o:e.blendEquationAlpha;t={srcFactor:this._getBlendFactor(i),dstFactor:this._getBlendFactor(a),operation:this._getBlendOperation(o)},n={srcFactor:this._getBlendFactor(r),dstFactor:this._getBlendFactor(s),operation:this._getBlendOperation(c)}}else{let i=e.premultipliedAlpha,a=(e,r,i,a)=>{t={srcFactor:e,dstFactor:r,operation:kD.Add},n={srcFactor:i,dstFactor:a,operation:kD.Add}};if(i)switch(r){case 1:a(OD.One,OD.OneMinusSrcAlpha,OD.One,OD.OneMinusSrcAlpha);break;case 2:a(OD.One,OD.One,OD.One,OD.One);break;case 3:a(OD.Zero,OD.OneMinusSrc,OD.Zero,OD.One);break;case 4:a(OD.Dst,OD.OneMinusSrcAlpha,OD.Zero,OD.One)}else switch(r){case 1:a(OD.SrcAlpha,OD.OneMinusSrcAlpha,OD.One,OD.OneMinusSrcAlpha);break;case 2:a(OD.SrcAlpha,OD.One,OD.One,OD.One);break;case 3:C(`WebGPURenderer: "SubtractiveBlending" requires "${e.isMaterial?`material`:`blendMode`}.premultipliedAlpha = true".`);break;case 4:C(`WebGPURenderer: "MultiplyBlending" requires "${e.isMaterial?`material`:`blendMode`}.premultipliedAlpha = true".`)}}if(t!==void 0&&n!==void 0)return{color:t,alpha:n};C(`WebGPURenderer: Invalid blending: `,r)}_getBlendFactor(e){let t;switch(e){case 200:t=OD.Zero;break;case 201:t=OD.One;break;case 202:t=OD.Src;break;case 203:t=OD.OneMinusSrc;break;case 204:t=OD.SrcAlpha;break;case 205:t=OD.OneMinusSrcAlpha;break;case 208:t=OD.Dst;break;case 209:t=OD.OneMinusDst;break;case 206:t=OD.DstAlpha;break;case 207:t=OD.OneMinusDstAlpha;break;case 210:t=OD.SrcAlphaSaturated;break;case S_:t=OD.Constant;break;case C_:t=OD.OneMinusConstant;break;default:C(`WebGPURenderer: Blend factor not supported.`,e)}return t}_getStencilCompare(e){let t,n=e.stencilFunc;switch(n){case 512:t=bD.Never;break;case 519:t=bD.Always;break;case 513:t=bD.Less;break;case 515:t=bD.LessEqual;break;case 514:t=bD.Equal;break;case 518:t=bD.GreaterEqual;break;case 516:t=bD.Greater;break;case 517:t=bD.NotEqual;break;default:C(`WebGPURenderer: Invalid stencil function.`,n)}return t}_getStencilOperation(e){let t;switch(e){case ge:t=jD.Keep;break;case 0:t=jD.Zero;break;case d:t=jD.Replace;break;case se:t=jD.Invert;break;case Be:t=jD.IncrementClamp;break;case An:t=jD.DecrementClamp;break;case y:t=jD.IncrementWrap;break;case Jt:t=jD.DecrementWrap;break;default:C(`WebGPURenderer: Invalid stencil operation.`,t)}return t}_getBlendOperation(e){let t;switch(e){case 100:t=kD.Add;break;case 101:t=kD.Subtract;break;case 102:t=kD.ReverseSubtract;break;case 103:t=kD.Min;break;case 104:t=kD.Max;break;default:C(`WebGPUPipelineUtils: Blend equation not supported.`,e)}return t}_getPrimitiveState(e,t,n){let r={};r.topology=this.backend.utils.getPrimitiveTopology(e,n),t.index!==null&&e.isLine===!0&&e.isLineSegments!==!0&&(r.stripIndexFormat=t.index.array instanceof Uint16Array?TD.Uint16:TD.Uint32);let i=n.side===1;return e.isMesh&&e.matrixWorld.determinantAffine()<0&&(i=!i),r.frontFace=i===!0?CD.CW:CD.CCW,r.cullMode=n.side===2?wD.None:wD.Back,r}_getColorWriteMask(e){return e.colorWrite===!0?AD.All:AD.None}_getDepthCompare(e){let t;if(e.depthTest===!1)t=bD.Always;else{let n=this.backend.parameters.reversedDepthBuffer?qn[e.depthFunc]:e.depthFunc;switch(n){case 0:t=bD.Never;break;case 1:t=bD.Always;break;case 2:t=bD.Less;break;case 3:t=bD.LessEqual;break;case 4:t=bD.Equal;break;case 5:t=bD.GreaterEqual;break;case 6:t=bD.Greater;break;case 7:t=bD.NotEqual;break;default:C(`WebGPUPipelineUtils: Invalid depth function.`,n)}}return t}},xk=class{constructor(){this.label=``,this.type=void 0,this.count=0}reset(){this.label=``,this.type=void 0,this.count=0}},Sk=new XD,Ck=new ZD,wk=new xk,Tk=class extends hD{constructor(e,t,n=2048){super(n),this.device=e,this.type=t,wk.label=`queryset_global_timestamp_${t}`,wk.type=`timestamp`,wk.count=this.maxQueries,this.querySet=this.device.createQuerySet(wk),wk.reset();let r=this.maxQueries*8;Sk.label=`buffer_timestamp_resolve_${t}`,Sk.size=r,Sk.usage=GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC,this.resolveBuffer=this.device.createBuffer(Sk),Sk.reset(),Sk.label=`buffer_timestamp_result_${t}`,Sk.size=r,Sk.usage=GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,this.resultBuffer=this.device.createBuffer(Sk),Sk.reset()}allocateQueriesForContext(e){if(!this.trackTimestamp||this.isDisposed)return null;if(this.currentQueryIndex+2>this.maxQueries)return Qn(`WebGPUTimestampQueryPool [${this.type}]: Maximum number of queries exceeded, when using trackTimestamp it is necessary to resolves the queries via renderer.resolveTimestampsAsync( THREE.TimestampQuery.${this.type.toUpperCase()} ).`),null;let t=this.currentQueryIndex;return this.currentQueryIndex+=2,this.queryOffsets.set(e,t),t}async resolveQueriesAsync(){if(!this.trackTimestamp||this.currentQueryIndex===0||this.isDisposed)return this.lastValue;if(this.pendingResolve)return this.pendingResolve;this.pendingResolve=this._resolveQueries();try{return await this.pendingResolve}finally{this.pendingResolve=null}}async _resolveQueries(){if(this.isDisposed)return this.lastValue;try{if(this.resultBuffer.mapState!==`unmapped`)return this.lastValue;let e=new Map(this.queryOffsets),t=this.currentQueryIndex,n=t*8;this.currentQueryIndex=0,this.queryOffsets.clear();let r=this.device.createCommandEncoder(Ck);r.resolveQuerySet(this.querySet,0,t,this.resolveBuffer,0),r.copyBufferToBuffer(this.resolveBuffer,0,this.resultBuffer,0,n);let i=r.finish();if(JD(this.device,i),this.resultBuffer.mapState!==`unmapped`)return this.lastValue;if(await this.resultBuffer.mapAsync(GPUMapMode.READ,0,n),this.isDisposed)return this.resultBuffer.mapState===`mapped`&&this.resultBuffer.unmap(),this.lastValue;let a=new BigUint64Array(this.resultBuffer.getMappedRange(0,n)),o={},s=[];for(let[t,n]of e){let e=t.match(/^(.*):f(\d+)$/),r=parseInt(e[2]);s.includes(r)===!1&&s.push(r),o[r]===void 0&&(o[r]=0);let i=a[n],c=a[n+1],l=Number(c-i)/1e6;this.timestamps.set(t,l),o[r]+=l}let c=o[s[s.length-1]];return this.resultBuffer.unmap(),this.lastValue=c,this.frames=s,c}catch(e){return C(`Error resolving queries:`,e),this.resultBuffer.mapState===`mapped`&&this.resultBuffer.unmap(),this.lastValue}}async dispose(){if(!this.isDisposed){if(this.isDisposed=!0,this.pendingResolve)try{await this.pendingResolve}catch(e){C(`Error waiting for pending resolve:`,e)}if(this.resultBuffer&&this.resultBuffer.mapState===`mapped`)try{this.resultBuffer.unmap()}catch(e){C(`Error unmapping buffer:`,e)}this.querySet&&=(this.querySet.destroy(),null),this.resolveBuffer&&=(this.resolveBuffer.destroy(),null),this.resultBuffer&&=(this.resultBuffer.destroy(),null),this.queryOffsets.clear(),this.pendingResolve=null}}},Ek=class{constructor(){this.label=``,this.timestampWrites=void 0}reset(){this.label=``,this.timestampWrites=void 0}},Dk=class{constructor(){this.view=null,this.depthLoadOp=void 0,this.depthStoreOp=void 0,this.depthClearValue=void 0,this.depthReadOnly=!1,this.stencilLoadOp=void 0,this.stencilStoreOp=void 0,this.stencilClearValue=0,this.stencilReadOnly=!1}reset(){this.view=null,this.depthLoadOp=void 0,this.depthStoreOp=void 0,this.depthClearValue=void 0,this.depthReadOnly=!1,this.stencilLoadOp=void 0,this.stencilStoreOp=void 0,this.stencilClearValue=0,this.stencilReadOnly=!1}},Ok=class{constructor(){this.querySet=null,this.beginningOfPassWriteIndex=void 0,this.endOfPassWriteIndex=void 0}reset(){this.querySet=null,this.beginningOfPassWriteIndex=void 0,this.endOfPassWriteIndex=void 0}},kk={r:0,g:0,b:0,a:1},Ak=new XD,jk=new ZD,Mk=new Ek,Nk=new xk,Pk=new rO,Fk=new Ok,Ik=new vO,Lk=new vO,Rk=new aO,zk=new CO,Bk=class extends ZE{constructor(e={}){super(e),this.isWebGPUBackend=!0,this.parameters.alpha=e.alpha===void 0||e.alpha,this.parameters.requiredLimits=e.requiredLimits===void 0?{}:e.requiredLimits,this.compatibilityMode=null,this.device=null,this.defaultRenderPassdescriptor=null,this.utils=new qD(this),this.attributeUtils=new sk(this),this.bindingUtils=new fk(this),this.capabilities=new pk(this),this.pipelineUtils=new bk(this),this.textureUtils=new LO(this),this.occludedResolveCache=new Map;let t=typeof navigator>`u`||/Android/.test(navigator.userAgent)===!1;this._compatibility={[ce.TEXTURE_COMPARE]:t}}async init(e){await super.init(e);let t=this.parameters,n;if(t.device===void 0){let r={powerPreference:t.powerPreference,featureLevel:`compatibility`,xrCompatible:e.xr.enabled},i=typeof navigator<`u`?await navigator.gpu.requestAdapter(r):null;if(i===null)throw Error(`THREE.WebGPUBackend: Unable to create WebGPU adapter.`);let a=Object.values(BD),o=[];for(let e of a)i.features.has(e)&&o.push(e);let s={requiredFeatures:o,requiredLimits:t.requiredLimits};n=await i.requestDevice(s)}else n=t.device;this.compatibilityMode=!n.features.has(`core-features-and-limits`),this.compatibilityMode&&(e._samples=0),n.lost.then(t=>{if(t.reason===`destroyed`)return;let n={api:`WebGPU`,message:t.message||`Unknown reason`,reason:t.reason||null,originalEvent:t};e.onDeviceLost(n)}),n.onuncapturederror=t=>{let n=t.error,r=n&&n.constructor?n.constructor.name:`GPUError`,i=n&&n.message||`Unknown uncaptured GPU error`;e.onError({api:`WebGPU`,type:r,message:i,originalEvent:t})},this.device=n,this.trackTimestamp=this.trackTimestamp&&this.hasFeature(BD.TimestampQuery),this.updateSize()}setXRRenderTargetTextures(e,t,n=null){this.set(e.texture,{texture:t,format:t.format,externalTexture:!0,xrViewDescriptors:n,initialized:!0})}get context(){let e=this.renderer.getCanvasTarget(),t=this.get(e),n=t.context;if(n===void 0){let r=this.parameters;n=e.isDefaultCanvasTarget===!0&&r.context!==void 0?r.context:e.domElement.getContext(`webgpu`),`setAttribute`in e.domElement&&e.domElement.setAttribute(`data-engine`,`three.js r185 webgpu`);let i=r.alpha?`premultiplied`:`opaque`,a=r.outputType===1016?`extended`:`standard`;n.configure({device:this.device,format:this.utils.getPreferredCanvasFormat(),usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC,alphaMode:i,toneMapping:{mode:a}}),t.context=n}return n}get coordinateSystem(){return Tt}get hasTimestamp(){return!0}async getArrayBufferAsync(e,t=null,n=0,r=-1){return await this.attributeUtils.getArrayBufferAsync(e,t,n,r)}getContext(){return this.context}_getDefaultRenderPassDescriptor(){let e=this.renderer,t=e.getCanvasTarget(),n=this.get(t),r=e.currentSamples,i=n.descriptor;if(i===void 0||n.samples!==r){if(i=new eO,i.colorAttachments.push(new $D),e.depth===!0||e.stencil===!0){let t=new Dk;t.view=this.textureUtils.getDepthBuffer(e.depth,e.stencil).createView(),i.depthStencilAttachment=t}let t=i.colorAttachments[0];r>0?t.view=this.textureUtils.getColorBuffer().createView():t.resolveTarget=void 0,n.descriptor=i,n.samples=r}let a=i.colorAttachments[0];return r>0?a.resolveTarget=this.context.getCurrentTexture().createView():a.view=this.context.getCurrentTexture().createView(),i}_isRenderCameraDepthArray(e){let t=e.camera;return e.depthTexture&&e.depthTexture.isArrayTexture===!0&&t!==null&&t.isArrayCamera===!0}_hasExternalTexture(e){let t=e.textures;if(t===null)return!1;for(let e=0;e<t.length;e++)if(this.get(t[e]).externalTexture===!0)return!0;return!1}_createExternalTextureViews(e,t){let n=[],r=e.camera;if(t.xrViewDescriptors&&r!==null&&r.isArrayCamera===!0)for(let e=0;e<t.xrViewDescriptors.length;e++)n.push({view:t.texture.createView(t.xrViewDescriptors[e]),resolveTarget:void 0,depthSlice:void 0});else n.push({view:t.texture.createView({dimension:LD.TwoD,baseArrayLayer:e.activeCubeFace,arrayLayerCount:1}),resolveTarget:void 0,depthSlice:void 0});return n}_getRenderPassDescriptor(e,t={}){let n=e.renderTarget,r=this.get(n),i=this._hasExternalTexture(e),a=r.descriptors;(a===void 0||r.width!==n.width||r.height!==n.height||r.samples!==n.samples||i)&&(a={},r.descriptors=a);let o=e.getCacheKey(),s=a[o];if(s===void 0||i){let t=e.textures,i=[],c,l=this._isRenderCameraDepthArray(e);for(let r=0;r<t.length;r++){let a=this.get(t[r]);if(a.externalTexture===!0){i.push(...this._createExternalTextureViews(e,a));continue}if(Rk.label=`colorAttachment_${r}`,Rk.baseMipLevel=e.activeMipmapLevel,Rk.mipLevelCount=1,Rk.baseArrayLayer=e.activeCubeFace,Rk.arrayLayerCount=1,Rk.dimension=LD.TwoD,n.isRenderTarget3D)c=e.activeCubeFace,Rk.baseArrayLayer=0,Rk.dimension=LD.ThreeD;else if(n.isRenderTarget&&t[r].image.depth>1){if(l===!0){let t=e.camera.cameras;for(let e=0;e<t.length;e++){Rk.baseArrayLayer=e,Rk.arrayLayerCount=1,Rk.dimension=LD.TwoD;let t=a.texture.createView(Rk);i.push({view:t,resolveTarget:void 0,depthSlice:void 0})}}else Rk.dimension=LD.TwoDArray}if(l!==!0){let e=a.texture.createView(Rk),t,n;a.msaaTexture===void 0?(t=e,n=void 0):(t=a.msaaTexture.createView(),n=e),i.push({view:t,resolveTarget:n,depthSlice:c})}Rk.reset()}let u=[];for(let e=0;e<i.length;e++){let t=i[e],n=new $D;n.view=t.view,n.depthSlice=t.depthSlice,n.resolveTarget=t.resolveTarget,u.push(n)}if(s={textureViews:i,colorAttachments:u,descriptor:new eO},e.depth){let t=this.get(e.depthTexture);(e.depthTexture.isArrayTexture||e.depthTexture.isCubeTexture)&&(Rk.dimension=LD.TwoD,Rk.arrayLayerCount=1,Rk.baseArrayLayer=e.activeCubeFace);let n=new Dk;n.view=t.texture.createView(Rk),s.depthStencilAttachment=n,Rk.reset()}a[o]=s,r.width=n.width,r.height=n.height,r.samples=n.samples,r.activeMipmapLevel=e.activeMipmapLevel,r.activeCubeFace=e.activeCubeFace}let c=s.descriptor;c.reset();for(let e=0;e<s.colorAttachments.length;e++){let n=s.colorAttachments[e],r={r:0,g:0,b:0,a:1};e===0&&t.clearValue&&(r=t.clearValue),n.loadOp=t.loadOp||SD.Load,n.storeOp=t.storeOp||xD.Store,n.clearValue=r,c.colorAttachments.push(n)}return s.depthStencilAttachment&&(c.depthStencilAttachment=s.depthStencilAttachment),c}beginRender(e){let t=this.get(e),n=this.device,r=e.occlusionQueryCount,i;r>0&&(t.currentOcclusionQuerySet&&t.currentOcclusionQuerySet.destroy(),t.currentOcclusionQueryBuffer&&t.currentOcclusionQueryBuffer.destroy(),t.currentOcclusionQuerySet=t.occlusionQuerySet,t.currentOcclusionQueryBuffer=t.occlusionQueryBuffer,t.currentOcclusionQueryObjects=t.occlusionQueryObjects,Nk.label=`occlusionQuerySet_${e.id}`,Nk.type=`occlusion`,Nk.count=r,i=n.createQuerySet(Nk),Nk.reset(),t.occlusionQuerySet=i,t.occlusionQueryIndex=0,t.occlusionQueryObjects=Array(r),t.lastOcclusionObject=null);let a;a=e.textures===null?this._getDefaultRenderPassDescriptor():this._getRenderPassDescriptor(e,{loadOp:SD.Load}),this.initTimestampQuery(Tn.RENDER,this.getTimestampUID(e),a),a.occlusionQuerySet=i;let o=a.depthStencilAttachment;if(e.textures!==null){let t=a.colorAttachments;for(let n=0;n<t.length;n++){let r=t[n];e.clearColor?(n===0?r.clearValue=e.clearColorValue:(kk.r=0,kk.g=0,kk.b=0,kk.a=1,r.clearValue=kk),r.loadOp=SD.Clear):r.loadOp=SD.Load,r.storeOp=xD.Store}}else{let t=a.colorAttachments[0];e.clearColor?(t.clearValue=e.clearColorValue,t.loadOp=SD.Clear):t.loadOp=SD.Load,t.storeOp=xD.Store}e.depth&&(e.clearDepth?(o.depthClearValue=e.clearDepthValue,o.depthLoadOp=SD.Clear):o.depthLoadOp=SD.Load,o.depthStoreOp=xD.Store),e.stencil&&(e.clearStencil?(o.stencilClearValue=e.clearStencilValue,o.stencilLoadOp=SD.Clear):o.stencilLoadOp=SD.Load,o.stencilStoreOp=xD.Store),jk.label=`renderContext_`+e.id;let s=n.createCommandEncoder(jk);if(jk.reset(),this._isRenderCameraDepthArray(e)===!0){let n=e.camera.cameras;!t.layerDescriptors||t.layerDescriptors.length!==n.length?this._createArrayCameraLayerDescriptors(e,t,a,n):this._updateArrayCameraLayerDescriptors(e,t,n),t.bundleEncoders=[],t.bundleSets=[];for(let r=0;r<n.length;r++){let n=this.pipelineUtils.createBundleEncoder(e,`renderBundleArrayCamera_`+r);t.bundleEncoders.push(n),t.bundleSets.push({attributes:{},bindingGroups:[],pipeline:null,index:null})}t.currentPass=null}else t.currentPass=s.beginRenderPass(a),e.viewport&&this.updateViewport(e),e.scissor&&this.updateScissor(e);t.descriptor=a,t.encoder=s,t.currentSets={attributes:{},bindingGroups:[],pipeline:null,index:null},t.renderBundles=[]}_createArrayCameraLayerDescriptors(e,t,n,r){let i=n.depthStencilAttachment;t.layerDescriptors=[];let a=this.get(e.depthTexture);a.viewCache||=[];for(let o=0;o<r.length;o++){let r=n.colorAttachments[0],s=new $D;s.view=n.colorAttachments[o].view,s.depthSlice=r.depthSlice,s.resolveTarget=r.resolveTarget,s.loadOp=r.loadOp,s.storeOp=r.storeOp,s.clearValue=r.clearValue;let c=new eO;if(c.label=n.label,c.occlusionQuerySet=n.occlusionQuerySet,c.timestampWrites=n.timestampWrites,c.colorAttachments.push(s),n.depthStencilAttachment){let t=o;a.viewCache[t]||(Rk.dimension=LD.TwoD,Rk.baseArrayLayer=o,Rk.arrayLayerCount=1,a.viewCache[t]=a.texture.createView(Rk),Rk.reset());let n=new Dk;n.view=a.viewCache[t],n.depthLoadOp=i.depthLoadOp||SD.Clear,n.depthStoreOp=i.depthStoreOp||xD.Store,n.depthClearValue=i.depthClearValue||1,e.stencil&&(n.stencilLoadOp=i.stencilLoadOp,n.stencilStoreOp=i.stencilStoreOp,n.stencilClearValue=i.stencilClearValue),c.depthStencilAttachment=n}else{let e=new Dk;e.view=i.view,e.depthLoadOp=i.depthLoadOp,e.depthStoreOp=i.depthStoreOp,e.depthClearValue=i.depthClearValue,e.depthReadOnly=i.depthReadOnly,e.stencilLoadOp=i.stencilLoadOp,e.stencilStoreOp=i.stencilStoreOp,e.stencilClearValue=i.stencilClearValue,e.stencilReadOnly=i.stencilReadOnly,c.depthStencilAttachment=e}t.layerDescriptors.push(c)}}_updateArrayCameraLayerDescriptors(e,t,n){for(let r=0;r<n.length;r++){let n=t.layerDescriptors[r];if(n.depthStencilAttachment){let t=n.depthStencilAttachment;e.depth&&(e.clearDepth?(t.depthClearValue=e.clearDepthValue,t.depthLoadOp=SD.Clear):t.depthLoadOp=SD.Load),e.stencil&&(e.clearStencil?(t.stencilClearValue=e.clearStencilValue,t.stencilLoadOp=SD.Clear):t.stencilLoadOp=SD.Load)}}}finishRender(e){let t=this.get(e),n=e.occlusionQueryCount;t.renderBundles.length>0&&t.currentPass.executeBundles(t.renderBundles),n>t.occlusionQueryIndex&&t.currentPass.endOcclusionQuery();let r=t.encoder;if(this._isRenderCameraDepthArray(e)===!0){let n=[];for(let e=0;e<t.bundleEncoders.length;e++){let r=t.bundleEncoders[e];n.push(r.finish())}for(let i=0;i<t.layerDescriptors.length;i++)if(i<n.length){let a=t.layerDescriptors[i],o=r.beginRenderPass(a);if(e.viewport){let{x:t,y:n,width:r,height:i,minDepth:a,maxDepth:s}=e.viewportValue;o.setViewport(t,n,r,i,a,s)}if(e.scissor){let{x:t,y:n,width:r,height:i}=e.scissorValue;o.setScissorRect(t,n,r,i)}o.executeBundles([n[i]]),o.end()}}else t.currentPass&&t.currentPass.end();if(n>0){let r=n*8,i=this.occludedResolveCache.get(r);i===void 0&&(Ak.size=r,Ak.usage=GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC,i=this.device.createBuffer(Ak),Ak.reset(),this.occludedResolveCache.set(r,i)),Ak.size=r,Ak.usage=GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ;let a=this.device.createBuffer(Ak);Ak.reset(),t.encoder.resolveQuerySet(t.occlusionQuerySet,0,n,i,0),t.encoder.copyBufferToBuffer(i,0,a,0,r),t.occlusionQueryBuffer=a,this.resolveOccludedAsync(e)}if(JD(this.device,t.encoder.finish()),e.textures!==null){let t=e.textures;for(let e=0;e<t.length;e++){let n=t[e];n.generateMipmaps===!0&&this.textureUtils.generateMipmaps(n)}}}isOccluded(e,t){let n=this.get(e);return n.occluded&&n.occluded.has(t)}async resolveOccludedAsync(e){let t=this.get(e),{currentOcclusionQueryBuffer:n,currentOcclusionQueryObjects:r}=t;if(n&&r){let e=new WeakSet;t.currentOcclusionQueryObjects=null,t.currentOcclusionQueryBuffer=null,await n.mapAsync(GPUMapMode.READ);let i=n.getMappedRange(),a=new BigUint64Array(i);for(let t=0;t<r.length;t++)a[t]===BigInt(0)&&e.add(r[t]);n.destroy(),t.occluded=e}}updateViewport(e){let{currentPass:t}=this.get(e),{x:n,y:r,width:i,height:a,minDepth:o,maxDepth:s}=e.viewportValue;t.setViewport(n,r,i,a,o,s)}updateScissor(e){let{currentPass:t}=this.get(e),{x:n,y:r,width:i,height:a}=e.scissorValue;t.setScissorRect(n,r,i,a)}getClearColor(){let e=super.getClearColor();return this.renderer.alpha===!0&&(e.r*=e.a,e.g*=e.a,e.b*=e.a),e}clear(e,t,n,r=null){let i=this.device,a=this.renderer,o=[],s,c,l;if(e){let e=this.getClearColor();kk.r=e.r,kk.g=e.g,kk.b=e.b,kk.a=e.a}if(r===null){c=a.depth,l=a.stencil;let t=this._getDefaultRenderPassDescriptor();if(e){o=t.colorAttachments;let e=o[0];e.clearValue=kk,e.loadOp=SD.Clear,e.storeOp=xD.Store}(c||l)&&(s=t.depthStencilAttachment)}else{c=r.depth,l=r.stencil;let i={loadOp:e?SD.Clear:SD.Load,clearValue:e?kk:void 0};c&&(i.depthLoadOp=t?SD.Clear:SD.Load,i.depthClearValue=t?a.getClearDepth():void 0,i.depthStoreOp=xD.Store),l&&(i.stencilLoadOp=n?SD.Clear:SD.Load,i.stencilClearValue=n?a.getClearStencil():void 0,i.stencilStoreOp=xD.Store);let u=this._getRenderPassDescriptor(r,i);o=u.colorAttachments,s=u.depthStencilAttachment}c&&s&&(t?(s.depthLoadOp=SD.Clear,s.depthClearValue=a.getClearDepth(),s.depthStoreOp=xD.Store):(s.depthLoadOp=SD.Load,s.depthStoreOp=xD.Store)),l&&s&&(n?(s.stencilLoadOp=SD.Clear,s.stencilClearValue=a.getClearStencil(),s.stencilStoreOp=xD.Store):(s.stencilLoadOp=SD.Load,s.stencilStoreOp=xD.Store)),jk.label=`clear`;let u=i.createCommandEncoder(jk);jk.reset(),u.beginRenderPass({colorAttachments:o,depthStencilAttachment:s}).end(),JD(i,u.finish())}beginCompute(e){let t=this.get(e),n=`computeGroup_`+e.id;Mk.label=n,jk.label=n,this.initTimestampQuery(Tn.COMPUTE,this.getTimestampUID(e),Mk),t.cmdEncoderGPU=this.device.createCommandEncoder(jk),t.passEncoderGPU=t.cmdEncoderGPU.beginComputePass(Mk),t.currentPipeline=null,jk.reset(),Mk.reset()}compute(e,t,n,r,i=null){let a=this.get(t),o=this.get(e),{passEncoderGPU:s}=o,c=this.get(r).pipeline;o.currentPipeline!==c&&(s.setPipeline(c),o.currentPipeline=c);for(let e=0,t=n.length;e<t;e++){let t=n[e],r=this.get(t);s.setBindGroup(e,r.group)}if(i===null&&(i=t.dispatchSize||t.count),i&&i.isIndirectStorageBufferAttribute){let e=this.get(i).buffer;s.dispatchWorkgroupsIndirect(e,0);return}if(typeof i==`number`){let e=i;if(a.dispatchSize===void 0||a.count!==e){a.dispatchSize=[0,1,1],a.count=e;let n=t.workgroupSize,r=n[0];for(let e=1;e<n.length;e++)r*=n[e];let o=Math.ceil(e/r),s=this.device.limits.maxComputeWorkgroupsPerDimension;i=[o,1,1],o>s&&(i[0]=Math.min(o,s),i[1]=Math.ceil(o/s)),a.dispatchSize=i}i=a.dispatchSize}s.dispatchWorkgroups(i[0],i[1]||1,i[2]||1)}finishCompute(e){let t=this.get(e);t.passEncoderGPU.end(),JD(this.device,t.cmdEncoderGPU.finish())}_draw(e,t,n,r,i,a,o,s,c){let{object:l,material:u,context:d}=e,f=e.getIndex(),p=f!==null;c.pipeline!==r&&(s.setPipeline(r),c.pipeline=r);let m=c.bindingGroups;for(let e=0,t=i.length;e<t;e++){let t=i[e];if(m[e]!==t.id){let n=this.get(t);s.setBindGroup(e,n.group),m[e]=t.id}}if(p===!0&&c.index!==f){let e=this.get(f).buffer,t=f.array instanceof Uint16Array?TD.Uint16:TD.Uint32;s.setIndexBuffer(e,t),c.index=f}for(let e=0,t=a.length;e<t;e++){let t=a[e];if(c.attributes[e]!==t){let n=this.get(t).buffer;s.setVertexBuffer(e,n),c.attributes[e]=t}}if(d.stencil===!0&&u.stencilWrite===!0&&n.currentStencilRef!==u.stencilRef&&(s.setStencilReference(u.stencilRef),n.currentStencilRef=u.stencilRef),l.isBatchedMesh===!0){let e=l._multiDrawStarts,n=l._multiDrawCounts,r=l._multiDrawCount,i=p===!0?f.array.BYTES_PER_ELEMENT:1;u.wireframe&&(i=l.geometry.attributes.position.count>65535?4:2);for(let a=0;a<r;a++)p===!0?s.drawIndexed(n[a],1,e[a]/i,0,a):s.draw(n[a],1,e[a],a),t.update(l,n[a],1)}else if(p===!0){let{vertexCount:n,instanceCount:r,firstVertex:i}=o,a=e.getIndirect();if(a!==null){let t=this.get(a).buffer,n=e.getIndirectOffset(),r=Array.isArray(n)?n:[n];for(let e=0;e<r.length;e++)s.drawIndexedIndirect(t,r[e])}else s.drawIndexed(n,r,i,0,0);t.update(l,n,r)}else{let{vertexCount:n,instanceCount:r,firstVertex:i}=o,a=e.getIndirect();if(a!==null){let t=this.get(a).buffer,n=e.getIndirectOffset(),r=Array.isArray(n)?n:[n];for(let e=0;e<r.length;e++)s.drawIndirect(t,r[e])}else s.draw(n,r,i,0);t.update(l,n,r)}}draw(e,t){let{object:n,context:r,pipeline:i}=e,a=this.get(r),o=this.get(i),s=o.pipeline;if(o.error===!0)return;let c=e.getDrawParameters();if(c===null)return;let l=e.getBindings(),u=e.getVertexBuffers();if(e.camera.isArrayCamera&&e.camera.cameras.length>0){let i=this.get(e.camera),o=e.camera.cameras,d=e.getBindingGroup(`cameraIndex`);if(i.indexesGPU===void 0||i.indexesGPU.length!==o.length){let e=this.get(d),t=[],n=new Uint32Array([0,0,0,0]);for(let r=0,i=o.length;r<i;r++){n[0]=r;let{layoutGPU:i}=e.layout,a=this.bindingUtils.createBindGroupIndex(n,i);t.push(a)}i.indexesGPU=t}let f=this.renderer.getPixelRatio();for(let p=0,m=o.length;p<m;p++){let m=o[p];if(n.layers.test(m.layers)){let n=m.viewport,o=a.currentPass,h=a.currentSets,g=a.bundleEncoders!==void 0;if(g){let e=a.bundleEncoders[p],t=a.bundleSets[p];o=e,h=t}if(n&&!g&&o.setViewport(Math.floor(n.x*f),Math.floor(n.y*f),Math.floor(n.width*f),Math.floor(n.height*f),r.viewportValue.minDepth,r.viewportValue.maxDepth),d&&i.indexesGPU){let e=l.indexOf(d);o.setBindGroup(e,i.indexesGPU[p]),h.bindingGroups[e]=d.id}this._draw(e,t,a,s,l,u,c,o,h)}}}else if(a.currentPass){if(a.occlusionQuerySet!==void 0){let e=a.lastOcclusionObject;e!==n&&(e!==null&&e.occlusionTest===!0&&(a.currentPass.endOcclusionQuery(),a.occlusionQueryIndex++),n.occlusionTest===!0&&(a.currentPass.beginOcclusionQuery(a.occlusionQueryIndex),a.occlusionQueryObjects[a.occlusionQueryIndex]=n),a.lastOcclusionObject=n)}this._draw(e,t,a,s,l,u,c,a.currentPass,a.currentSets)}}needsRenderUpdate(e){let t=this.get(e),{object:n,material:r}=e,i=this.utils,a=i.getSampleCountRenderContext(e.context),o=i.getCurrentColorSpace(e.context),s=i.getCurrentColorFormat(e.context),c=i.getCurrentDepthStencilFormat(e.context),l=i.getPrimitiveTopology(n,r),u=n.isMesh&&n.matrixWorld.determinantAffine()<0,d=!1;return(t.material!==r||t.materialVersion!==r.version||t.transparent!==r.transparent||t.blending!==r.blending||t.premultipliedAlpha!==r.premultipliedAlpha||t.blendSrc!==r.blendSrc||t.blendDst!==r.blendDst||t.blendEquation!==r.blendEquation||t.blendSrcAlpha!==r.blendSrcAlpha||t.blendDstAlpha!==r.blendDstAlpha||t.blendEquationAlpha!==r.blendEquationAlpha||t.colorWrite!==r.colorWrite||t.depthWrite!==r.depthWrite||t.depthTest!==r.depthTest||t.depthFunc!==r.depthFunc||t.stencilWrite!==r.stencilWrite||t.stencilFunc!==r.stencilFunc||t.stencilFail!==r.stencilFail||t.stencilZFail!==r.stencilZFail||t.stencilZPass!==r.stencilZPass||t.stencilFuncMask!==r.stencilFuncMask||t.stencilWriteMask!==r.stencilWriteMask||t.side!==r.side||t.alphaToCoverage!==r.alphaToCoverage||t.sampleCount!==a||t.colorSpace!==o||t.colorFormat!==s||t.depthStencilFormat!==c||t.primitiveTopology!==l||t.frontFaceCW!==u||t.clippingContextCacheKey!==e.clippingContextCacheKey)&&(t.material=r,t.materialVersion=r.version,t.transparent=r.transparent,t.blending=r.blending,t.premultipliedAlpha=r.premultipliedAlpha,t.blendSrc=r.blendSrc,t.blendDst=r.blendDst,t.blendEquation=r.blendEquation,t.blendSrcAlpha=r.blendSrcAlpha,t.blendDstAlpha=r.blendDstAlpha,t.blendEquationAlpha=r.blendEquationAlpha,t.colorWrite=r.colorWrite,t.depthWrite=r.depthWrite,t.depthTest=r.depthTest,t.depthFunc=r.depthFunc,t.stencilWrite=r.stencilWrite,t.stencilFunc=r.stencilFunc,t.stencilFail=r.stencilFail,t.stencilZFail=r.stencilZFail,t.stencilZPass=r.stencilZPass,t.stencilFuncMask=r.stencilFuncMask,t.stencilWriteMask=r.stencilWriteMask,t.side=r.side,t.alphaToCoverage=r.alphaToCoverage,t.sampleCount=a,t.colorSpace=o,t.colorFormat=s,t.depthStencilFormat=c,t.primitiveTopology=l,t.frontFaceCW=u,t.clippingContextCacheKey=e.clippingContextCacheKey,d=!0),d}getRenderCacheKey(e){let{object:t,material:n}=e,r=this.utils,i=e.context,a=t.isMesh&&t.matrixWorld.determinantAffine()<0;return[n.transparent,n.blending,n.premultipliedAlpha,n.blendSrc,n.blendDst,n.blendEquation,n.blendSrcAlpha,n.blendDstAlpha,n.blendEquationAlpha,n.colorWrite,n.depthWrite,n.depthTest,n.depthFunc,n.stencilWrite,n.stencilFunc,n.stencilFail,n.stencilZFail,n.stencilZPass,n.stencilFuncMask,n.stencilWriteMask,n.side,a,r.getSampleCountRenderContext(i),r.getCurrentColorSpace(i),r.getCurrentColorFormat(i),r.getCurrentDepthStencilFormat(i),r.getPrimitiveTopology(t,n),e.getGeometryCacheKey(),e.clippingContextCacheKey].join()}updateSampler(e){return this.textureUtils.updateSampler(e)}destroySampler(e){this.textureUtils.destroySampler(e)}createDefaultTexture(e){return this.textureUtils.createDefaultTexture(e)}createTexture(e,t){this.textureUtils.createTexture(e,t)}updateTexture(e,t){this.textureUtils.updateTexture(e,t)}generateMipmaps(e){this.textureUtils.generateMipmaps(e)}destroyTexture(e,t=!1){this.textureUtils.destroyTexture(e,t)}async copyTextureToBuffer(e,t,n,r,i,a){return this.textureUtils.copyTextureToBuffer(e,t,n,r,i,a)}initTimestampQuery(e,t,n){if(!this.trackTimestamp)return;this.timestampQueryPool[e]||(this.timestampQueryPool[e]=new Tk(this.device,e,2048));let r=this.timestampQueryPool[e],i=r.allocateQueriesForContext(t);Fk.querySet=r.querySet,Fk.beginningOfPassWriteIndex=i,Fk.endOfPassWriteIndex=i+1,n.timestampWrites=Fk}createNodeBuilder(e,t){return new tk(e,t)}createProgram(e){let t=this.get(e);Pk.label=e.stage+(e.name===``?``:`_${e.name}`),Pk.code=e.code,t.module={module:this.device.createShaderModule(Pk),entryPoint:`main`},Pk.reset()}destroyProgram(e){this.delete(e)}createRenderPipeline(e,t){this.pipelineUtils.createRenderPipeline(e,t)}createComputePipeline(e,t){this.pipelineUtils.createComputePipeline(e,t)}beginBundle(e){let t=this.get(e);t._currentPass=t.currentPass,t._currentSets=t.currentSets,t.currentSets={attributes:{},bindingGroups:[],pipeline:null,index:null},t.currentPass=this.pipelineUtils.createBundleEncoder(e)}finishBundle(e,t){let n=this.get(e),r=n.currentPass.finish();this.get(t).bundleGPU=r,n.currentSets=n._currentSets,n.currentPass=n._currentPass}addBundle(e,t){this.get(e).renderBundles.push(this.get(t).bundleGPU)}createUniformBuffer(e){let t=this.get(e);if(t.buffer===void 0){let n=e.byteLength,r=GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,i=[];e.visibility&yD.VERTEX&&i.push(`vertex`),e.visibility&yD.FRAGMENT&&i.push(`fragment`),e.visibility&yD.COMPUTE&&i.push(`compute`);let a=`(${i.join(`,`)})`;Ak.label=`bindingBuffer${e.id}_${e.name}_${a}`,Ak.size=n,Ak.usage=r;let o=this.device.createBuffer(Ak);Ak.reset(),t.buffer=o}}destroyUniformBuffer(e){this.get(e).buffer.destroy(),this.delete(e)}createBindings(e,t,n,r){this.bindingUtils.createBindings(e,t,n,r)}updateBindings(e,t,n,r){this.bindingUtils.createBindings(e,t,n,r)}updateBinding(e){this.bindingUtils.updateBinding(e)}deleteBindGroupData(e){this.bindingUtils.deleteBindGroupData(e)}createIndexAttribute(e){let t=GPUBufferUsage.INDEX|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST;(e.isStorageBufferAttribute||e.isStorageInstancedBufferAttribute)&&(t|=GPUBufferUsage.STORAGE),this.attributeUtils.createAttribute(e,t)}createAttribute(e){this.attributeUtils.createAttribute(e,GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST)}createStorageAttribute(e){this.attributeUtils.createAttribute(e,GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST)}createIndirectStorageAttribute(e){this.attributeUtils.createAttribute(e,GPUBufferUsage.STORAGE|GPUBufferUsage.INDIRECT|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST)}updateAttribute(e){this.attributeUtils.updateAttribute(e)}destroyAttribute(e){this.attributeUtils.destroyAttribute(e)}updateSize(){this.delete(this.renderer.getCanvasTarget())}hasFeature(e){return VD[e]!==void 0&&(e=VD[e]),this.device.features.has(e)}copyTextureToTexture(e,t,n=null,r=null,i=0,a=0){let o=0,s=0,c=0,l=0,u=0,d=0,f=e.image.width,p=e.image.height,m=1;n!==null&&(n.isBox3===!0?(l=n.min.x,u=n.min.y,d=n.min.z,f=n.max.x-n.min.x,p=n.max.y-n.min.y,m=n.max.z-n.min.z):(l=n.min.x,u=n.min.y,f=n.max.x-n.min.x,p=n.max.y-n.min.y,m=1)),r!==null&&(o=r.x,s=r.y,c=r.z||0),jk.label=`copyTextureToTexture_`+e.id+`_`+t.id;let h=this.device.createCommandEncoder(jk);jk.reset();let g=this.get(e).texture,_=this.get(t).texture;Ik.texture=g,Ik.mipLevel=i,Ik.origin.x=l,Ik.origin.y=u,Ik.origin.z=d,Lk.texture=_,Lk.mipLevel=a,Lk.origin.x=o,Lk.origin.y=s,Lk.origin.z=c,zk.width=f,zk.height=p,zk.depthOrArrayLayers=m,h.copyTextureToTexture(Ik,Lk,zk),Ik.reset(),Lk.reset(),zk.reset(),JD(this.device,h.finish()),a===0&&t.generateMipmaps&&this.textureUtils.generateMipmaps(t)}copyFramebufferToTexture(e,t,n){let r=this.get(t),i=null;i=t.renderTarget?e.isDepthTexture?this.get(t.depthTexture).texture:this.get(t.textures[0]).texture:e.isDepthTexture?this.textureUtils.getDepthBuffer(t.depth,t.stencil):this.context.getCurrentTexture();let a=this.get(e).texture;if(i.format!==a.format){C(`WebGPUBackend: copyFramebufferToTexture: Source and destination formats do not match.`,i.format,a.format);return}let o;if(r.currentPass?(r.currentPass.end(),o=r.encoder):(jk.label=`copyFramebufferToTexture_`+e.id,o=this.device.createCommandEncoder(jk),jk.reset()),Ik.texture=i,Ik.origin.x=n.x,Ik.origin.y=n.y,Lk.texture=a,zk.width=n.z,zk.height=n.w,o.copyTextureToTexture(Ik,Lk,zk),Ik.reset(),Lk.reset(),zk.reset(),e.generateMipmaps&&this.textureUtils.generateMipmaps(e,o),r.currentPass){let{descriptor:e}=r;for(let t=0;t<e.colorAttachments.length;t++)e.colorAttachments[t].loadOp=SD.Load;t.depth&&(e.depthStencilAttachment.depthLoadOp=SD.Load),t.stencil&&(e.depthStencilAttachment.stencilLoadOp=SD.Load),r.currentPass=o.beginRenderPass(e),r.currentSets={attributes:{},bindingGroups:[],pipeline:null,index:null},t.viewport&&this.updateViewport(t),t.scissor&&this.updateScissor(t)}else JD(this.device,o.finish())}hasCompatibility(e){return this._compatibility[e]===void 0?super.hasCompatibility(e):this._compatibility[e]}dispose(){if(this.bindingUtils.dispose(),this.textureUtils.dispose(),this.occludedResolveCache){for(let e of this.occludedResolveCache.values())e.destroy();this.occludedResolveCache.clear()}if(this.timestampQueryPool)for(let e of Object.values(this.timestampQueryPool))e!==null&&e.dispose();this.parameters.device===void 0&&this.device!==null&&this.device.destroy()}},Vk=class extends c{constructor(e,t,n,r,i,a){super(e,t,n,r,i,a),this.iesMap=null}copy(e,t){return super.copy(e,t),this.iesMap=e.iesMap,this}},Hk=class extends c{constructor(e,t,n,r,i,a){super(e,t,n,r,i,a),this.aspect=null}copy(e,t){return super.copy(e,t),this.aspect=e.aspect,this}},Uk=class extends ZT{constructor(){super(),this.addMaterial(Um,`MeshPhongMaterial`),this.addMaterial(Gg,`MeshStandardMaterial`),this.addMaterial(qg,`MeshPhysicalMaterial`),this.addMaterial(Zg,`MeshToonMaterial`),this.addMaterial(Nm,`MeshBasicMaterial`),this.addMaterial(Vm,`MeshLambertMaterial`),this.addMaterial(vm,`MeshNormalMaterial`),this.addMaterial(e_,`MeshMatcapMaterial`),this.addMaterial(cm,`LineBasicMaterial`),this.addMaterial(um,`LineDashedMaterial`),this.addMaterial(o_,`PointsMaterial`),this.addMaterial(r_,`SpriteMaterial`),this.addMaterial(u_,`ShadowMaterial`),this.addLight(iC,Re),this.addLight(CT,Ct),this.addLight(NT,Un),this.addLight(TT,c),this.addLight(ST,be),this.addLight(wT,f),this.addLight(DT,ar),this.addLight(ET,Vk),this.addLight(kT,Hk),this.addToneMapping(Ob,1),this.addToneMapping(kb,2),this.addToneMapping(Ab,3),this.addToneMapping(Mb,4),this.addToneMapping(Ib,6),this.addToneMapping(Lb,7)}},Wk=class extends CE{constructor(e={}){let t;e.forceWebGL?t=_D:(t=Bk,e.getFallback=()=>(T(`WebGPURenderer: WebGPU is not available, running under WebGL2 backend.`),new _D(e)));let n=new t(e);super(n,e),this.library=new Uk,this.isWebGPURenderer=!0,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}},Gk={type:`change`},Kk={type:`start`},qk={type:`end`},Jk=new Rt,Yk=new u,Xk=Math.cos(70*In.DEG2RAD),Zk=new w,Qk=2*Math.PI,$k={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},eA=1e-6,tA=class extends et{constructor(e,t=null){super(e,t),this.state=$k.NONE,this.target=new w,this.cursor=new w,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:`ArrowLeft`,UP:`ArrowUp`,RIGHT:`ArrowRight`,BOTTOM:`ArrowDown`},this.mouseButtons={LEFT:r.ROTATE,MIDDLE:r.DOLLY,RIGHT:r.PAN},this.touches={ONE:He.ROTATE,TWO:He.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle=`auto`,this._domElementKeyEvents=null,this._lastPosition=new w,this._lastQuaternion=new en,this._lastTargetPosition=new w,this._quat=new en().setFromUnitVectors(e.up,new w(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ir,this._sphericalDelta=new ir,this._scale=1,this._panOffset=new w,this._rotateStart=new hn,this._rotateEnd=new hn,this._rotateDelta=new hn,this._panStart=new hn,this._panEnd=new hn,this._panDelta=new hn,this._dollyStart=new hn,this._dollyEnd=new hn,this._dollyDelta=new hn,this._dollyDirection=new w,this._mouse=new hn,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=rA.bind(this),this._onPointerDown=nA.bind(this),this._onPointerUp=iA.bind(this),this._onContextMenu=dA.bind(this),this._onMouseWheel=sA.bind(this),this._onKeyDown=cA.bind(this),this._onTouchStart=lA.bind(this),this._onTouchMove=uA.bind(this),this._onMouseDown=aA.bind(this),this._onMouseMove=oA.bind(this),this._interceptControlDown=fA.bind(this),this._interceptControlUp=pA.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e===`grab`?this.domElement.style.cursor=`grab`:this.domElement.style.cursor=`auto`}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener(`pointerdown`,this._onPointerDown),this.domElement.addEventListener(`pointercancel`,this._onPointerUp),this.domElement.addEventListener(`contextmenu`,this._onContextMenu),this.domElement.addEventListener(`wheel`,this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener(`keydown`,this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction=`none`}disconnect(){this.domElement.removeEventListener(`pointerdown`,this._onPointerDown),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.domElement.removeEventListener(`pointercancel`,this._onPointerUp),this.domElement.removeEventListener(`wheel`,this._onMouseWheel),this.domElement.removeEventListener(`contextmenu`,this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener(`keydown`,this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=``}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Gk),this.update(),this.state=$k.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;Zk.copy(t).sub(this.target),Zk.applyQuaternion(this._quat),this._spherical.setFromVector3(Zk),this.autoRotate&&this.state===$k.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=Qk:n>Math.PI&&(n-=Qk),r<-Math.PI?r+=Qk:r>Math.PI&&(r-=Qk),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let i=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let e=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),i=e!=this._spherical.radius}if(Zk.setFromSpherical(this._spherical),Zk.applyQuaternion(this._quatInverse),t.copy(this.target).add(Zk),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let e=null;if(this.object.isPerspectiveCamera){let t=Zk.length();e=this._clampDistance(t*this._scale);let n=t-e;this.object.position.addScaledVector(this._dollyDirection,n),this.object.updateMatrixWorld(),i=!!n}else if(this.object.isOrthographicCamera){let t=new w(this._mouse.x,this._mouse.y,0);t.unproject(this.object);let n=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),i=n!==this.object.zoom;let r=new w(this._mouse.x,this._mouse.y,0);r.unproject(this.object),this.object.position.sub(r).add(t),this.object.updateMatrixWorld(),e=Zk.length()}else console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.`),this.zoomToCursor=!1;e!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position):(Jk.origin.copy(this.object.position),Jk.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Jk.direction))<Xk?this.object.lookAt(this.target):(Yk.setFromNormalAndCoplanarPoint(this.object.up,this.target),Jk.intersectPlane(Yk,this.target))))}else if(this.object.isOrthographicCamera){let e=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),e!==this.object.zoom&&(this.object.updateProjectionMatrix(),i=!0)}return this._scale=1,this._performCursorZoom=!1,i||this._lastPosition.distanceToSquared(this.object.position)>eA||8*(1-this._lastQuaternion.dot(this.object.quaternion))>eA||this._lastTargetPosition.distanceToSquared(this.target)>eA?(this.dispatchEvent(Gk),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e===null?Qk/60/60*this.autoRotateSpeed:Qk/60*this.autoRotateSpeed*e}_getZoomScale(e){let t=Math.abs(e*.01);return .95**(this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Zk.setFromMatrixColumn(t,0),Zk.multiplyScalar(-e),this._panOffset.add(Zk)}_panUp(e,t){this.screenSpacePanning===!0?Zk.setFromMatrixColumn(t,1):(Zk.setFromMatrixColumn(t,0),Zk.crossVectors(this.object.up,Zk)),Zk.multiplyScalar(e),this._panOffset.add(Zk)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;Zk.copy(r).sub(this.target);let i=Zk.length();i*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*i/n.clientHeight,this.object.matrix),this._panUp(2*t*i/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.`),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),r=e-n.left,i=t-n.top,a=n.width,o=n.height;this._mouse.x=r/a*2-1,this._mouse.y=-(i/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Qk*this._rotateDelta.x/t.clientHeight),this._rotateUp(Qk*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Qk*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Qk*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Qk*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Qk*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(n,r)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyStart.set(0,i)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateEnd.set(n,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Qk*this._rotateDelta.x/t.clientHeight),this._rotateUp(Qk*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,i),this._dollyDelta.set(0,(this._dollyEnd.y/this._dollyStart.y)**+this.zoomSpeed),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new hn,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function nA(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.ownerDocument.addEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.addEventListener(`pointerup`,this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType===`touch`?this._onTouchStart(e):this._onMouseDown(e),this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grabbing`)))}function rA(e){this.enabled!==!1&&(e.pointerType===`touch`?this._onTouchMove(e):this._onMouseMove(e))}function iA(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.dispatchEvent(qk),this.state=$k.NONE,this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grab`);break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y})}}function aA(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case r.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=$k.DOLLY;break;case r.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=$k.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=$k.ROTATE}break;case r.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=$k.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=$k.PAN}break;default:this.state=$k.NONE}this.state!==$k.NONE&&this.dispatchEvent(Kk)}function oA(e){switch(this.state){case $k.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case $k.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case $k.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e)}}function sA(e){this.enabled!==!1&&this.enableZoom!==!1&&this.state===$k.NONE&&(e.preventDefault(),this.dispatchEvent(Kk),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(qk))}function cA(e){this.enabled!==!1&&this._handleKeyDown(e)}function lA(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case He.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=$k.TOUCH_ROTATE;break;case He.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=$k.TOUCH_PAN;break;default:this.state=$k.NONE}break;case 2:switch(this.touches.TWO){case He.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=$k.TOUCH_DOLLY_PAN;break;case He.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=$k.TOUCH_DOLLY_ROTATE;break;default:this.state=$k.NONE}break;default:this.state=$k.NONE}this.state!==$k.NONE&&this.dispatchEvent(Kk)}function uA(e){switch(this._trackPointer(e),this.state){case $k.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case $k.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case $k.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case $k.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=$k.NONE}}function dA(e){this.enabled!==!1&&e.preventDefault()}function fA(e){e.key===`Control`&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function pA(e){e.key===`Control`&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}Z.BRDF_GGX,Z.BRDF_Lambert,Z.BasicPointShadowFilter,Z.BasicShadowFilter;var mA=Z.Break;Z.Const,Z.Continue,Z.DFGLUT,Z.D_GGX,Z.Discard,Z.EPSILON,Z.F_Schlick;var hA=Z.Fn;Z.INFINITY;var gA=Z.If,_A=Z.Loop;Z.NodeAccess,Z.NodeShaderStage,Z.NodeType,Z.NodeUpdateType,Z.PCFShadowFilter,Z.PCFSoftShadowFilter,Z.PI,Z.PI2,Z.TWO_PI,Z.HALF_PI,Z.PointShadowFilter;var vA=Z.Return;Z.Schlick_to_F0,Z.ShaderNode,Z.Stack,Z.Switch,Z.TBNViewMatrix,Z.VSMShadowFilter,Z.V_GGX_SmithCorrelated,Z.Var,Z.VarIntent,Z.abs,Z.acesFilmicToneMapping,Z.acos,Z.acosh,Z.add,Z.addMethodChaining,Z.addNodeElement,Z.agxToneMapping,Z.all,Z.alphaT,Z.ambientOcclusion,Z.and,Z.anisotropy,Z.anisotropyB,Z.anisotropyT,Z.any,Z.append,Z.array,Z.asin,Z.asinh,Z.assign,Z.atan,Z.atanh,Z.atomicAdd,Z.atomicAnd,Z.atomicFunc,Z.atomicLoad,Z.atomicMax,Z.atomicMin,Z.atomicOr,Z.atomicStore,Z.atomicSub,Z.atomicXor,Z.attenuationColor,Z.attenuationDistance,Z.attribute;var yA=Z.attributeArray;Z.backgroundBlurriness,Z.backgroundIntensity,Z.backgroundRotation,Z.batch,Z.bentNormalView,Z.billboarding,Z.bitAnd,Z.bitNot,Z.bitOr,Z.bitXor,Z.bitangentGeometry,Z.bitangentLocal,Z.bitangentView,Z.bitangentWorld,Z.bitcast,Z.blendBurn,Z.blendColor,Z.blendDodge,Z.blendOverlay,Z.blendScreen,Z.blur,Z.bool,Z.buffer,Z.bufferAttribute,Z.bumpMap,Z.builtin,Z.builtinAOContext,Z.builtinShadowContext,Z.bvec2,Z.bvec3,Z.bvec4,Z.bypass,Z.cache,Z.call,Z.cameraFar,Z.cameraIndex,Z.cameraNear,Z.cameraNormalMatrix,Z.cameraPosition,Z.cameraProjectionMatrix;var bA=Z.cameraProjectionMatrixInverse;Z.cameraViewMatrix,Z.cameraViewport;var xA=Z.cameraWorldMatrix;Z.cbrt,Z.cdl,Z.ceil,Z.checker,Z.cineonToneMapping;var SA=Z.clamp;Z.clearcoat,Z.clearcoatNormalView,Z.clearcoatRoughness,Z.clipSpace,Z.code;var CA=Z.color;Z.colorSpaceToWorking,Z.colorToDirection,Z.compute,Z.computeKernel,Z.computeSkinning,Z.context,Z.convert,Z.convertColorSpace,Z.convertToTexture,Z.countLeadingZeros,Z.countOneBits,Z.countTrailingZeros,Z.cos,Z.cosh,Z.cross;var wA=Z.cubeTexture;Z.cubeTextureBase,Z.dFdx,Z.dFdy,Z.dashSize,Z.debug,Z.decrement,Z.decrementBefore,Z.defaultBuildStages,Z.defaultShaderStages,Z.defined,Z.degrees,Z.deltaTime,Z.densityFog,Z.densityFogFactor,Z.depth,Z.depthPass,Z.determinant,Z.difference,Z.diffuseColor;var TA=Z.directPointLight;Z.directionToColor,Z.directionToFaceDirection,Z.dispersion,Z.distance,Z.div;var EA=Z.dot;Z.drawIndex,Z.dynamicBufferAttribute,Z.element,Z.emissive,Z.equal,Z.equirectDirection,Z.equirectUV,Z.exp,Z.exp2,Z.exponentialHeightFogFactor,Z.expression,Z.faceDirection,Z.faceForward,Z.faceforward;var DA=Z.float;Z.floatBitsToInt,Z.floatBitsToUint,Z.floor,Z.fog,Z.fract,Z.frameGroup,Z.frameId,Z.frontFacing,Z.fwidth,Z.gain,Z.gapSize,Z.getConstNodeType,Z.getCurrentStack,Z.getDirection,Z.getDistanceAttenuation,Z.getGeometryRoughness,Z.getNormalFromDepth,Z.interleavedGradientNoise,Z.vogelDiskSample,Z.getParallaxCorrectNormal,Z.getRoughness,Z.getScreenPosition,Z.getShIrradianceAt,Z.getShadowMaterial,Z.getShadowRenderObjectFunction,Z.getTextureIndex,Z.getViewPosition,Z.globalId,Z.glsl,Z.glslFn,Z.grayscale,Z.greaterThan,Z.greaterThanEqual,Z.hash,Z.highpModelNormalViewMatrix,Z.highpModelViewMatrix,Z.hue,Z.increment,Z.incrementBefore,Z.instance;var OA=Z.instanceIndex;Z.instancedArray,Z.instancedBufferAttribute,Z.instancedDynamicBufferAttribute,Z.instancedMesh;var $=Z.int;Z.intBitsToFloat,Z.inverse,Z.inverseSqrt,Z.inversesqrt,Z.invocationLocalIndex,Z.invocationSubgroupIndex,Z.ior,Z.iridescence,Z.iridescenceIOR,Z.iridescenceThickness;var kA=Z.ivec2;Z.ivec3;var AA=Z.ivec4;Z.js,Z.label,Z.length,Z.lengthSq,Z.lessThan,Z.lessThanEqual,Z.lightPosition,Z.lightProjectionUV,Z.lightShadowMatrix,Z.lightTargetDirection,Z.lightTargetPosition,Z.lightViewPosition,Z.lightingContext,Z.lights,Z.linearDepth,Z.linearToneMapping,Z.localId;var jA=Z.log;Z.log2,Z.logarithmicDepthToViewZ,Z.luminance,Z.mat2,Z.mat3,Z.mat4,Z.matcapUV,Z.materialAO,Z.materialAlphaTest,Z.materialAnisotropy,Z.materialAnisotropyVector,Z.materialAttenuationColor,Z.materialAttenuationDistance,Z.materialClearcoat,Z.materialClearcoatNormal,Z.materialClearcoatRoughness,Z.materialColor,Z.materialDispersion,Z.materialEmissive,Z.materialEnvIntensity,Z.materialEnvRotation,Z.materialIOR,Z.materialIridescence,Z.materialIridescenceIOR,Z.materialIridescenceThickness,Z.materialLightMap,Z.materialLineDashOffset,Z.materialLineDashSize,Z.materialLineGapSize,Z.materialLineScale,Z.materialLineWidth,Z.materialMetalness,Z.materialNormal,Z.materialOpacity,Z.materialPointSize,Z.materialReference,Z.materialReflectivity,Z.materialRefractionRatio,Z.materialRotation,Z.materialRoughness,Z.materialSheen,Z.materialSheenRoughness,Z.materialShininess,Z.materialSpecular,Z.materialSpecularColor,Z.materialSpecularIntensity,Z.materialSpecularStrength,Z.materialThickness,Z.materialTransmission;var MA=Z.max;Z.maxMipLevel,Z.mediumpModelViewMatrix,Z.metalness;var NA=Z.min,PA=Z.mix;Z.mixElement,Z.mod,Z.modelDirection,Z.modelNormalMatrix,Z.modelPosition,Z.modelRadius,Z.modelScale,Z.modelViewMatrix,Z.modelViewPosition,Z.modelViewProjection,Z.modelWorldMatrix,Z.modelWorldMatrixInverse,Z.morphReference,Z.mrt,Z.mul,Z.mx_aastep,Z.mx_add,Z.mx_atan2,Z.mx_cell_noise_float,Z.mx_contrast,Z.mx_divide,Z.mx_fractal_noise_float,Z.mx_fractal_noise_vec2,Z.mx_fractal_noise_vec3,Z.mx_fractal_noise_vec4,Z.mx_frame,Z.mx_heighttonormal,Z.mx_hsvtorgb,Z.mx_ifequal,Z.mx_ifgreater,Z.mx_ifgreatereq,Z.mx_invert,Z.mx_modulo,Z.mx_multiply,Z.mx_noise_float,Z.mx_noise_vec3,Z.mx_noise_vec4,Z.mx_place2d,Z.mx_power,Z.mx_ramp4,Z.mx_ramplr,Z.mx_ramptb,Z.mx_rgbtohsv,Z.mx_rotate2d,Z.mx_rotate3d,Z.mx_safepower,Z.mx_separate,Z.mx_splitlr,Z.mx_splittb,Z.mx_srgb_texture_to_lin_rec709,Z.mx_subtract,Z.mx_timer,Z.mx_transform_uv,Z.mx_unifiednoise2d,Z.mx_unifiednoise3d,Z.mx_worley_noise_float,Z.mx_worley_noise_vec2,Z.mx_worley_noise_vec3,Z.negate,Z.negateOnBackSide,Z.neutralToneMapping,Z.nodeArray,Z.nodeImmutable,Z.nodeObject,Z.nodeObjectIntent,Z.nodeObjects,Z.nodeProxy,Z.nodeProxyIntent,Z.normalFlat,Z.normalGeometry,Z.normalLocal,Z.normalMap,Z.normalView,Z.normalViewGeometry,Z.normalWorld,Z.normalWorldGeometry,Z.normalize,Z.not,Z.notEqual,Z.numWorkgroups,Z.objectDirection,Z.objectGroup,Z.objectPosition,Z.objectRadius,Z.objectScale,Z.objectViewPosition,Z.objectWorldMatrix,Z.OnBeforeObjectUpdate,Z.OnBeforeMaterialUpdate,Z.OnObjectUpdate,Z.OnMaterialUpdate,Z.oneMinus,Z.or,Z.orthographicDepthToViewZ,Z.oscSawtooth,Z.oscSine,Z.oscSquare,Z.oscTriangle;var FA=Z.output;Z.outputStruct,Z.overloadingFn,Z.overrideNode,Z.overrideNodes,Z.packHalf2x16,Z.packSnorm2x16,Z.packUnorm2x16,Z.packNormalToRGB,Z.parabola,Z.parallaxDirection,Z.parallaxUV,Z.parameter,Z.pass,Z.passTexture,Z.pcurve,Z.perspectiveDepthToViewZ,Z.pmremTexture,Z.pointShadow,Z.pointUV,Z.pointWidth,Z.positionGeometry,Z.positionLocal,Z.positionPrevious;var IA=Z.positionView;Z.positionViewDirection;var LA=Z.positionWorld;Z.positionWorldDirection,Z.posterize;var RA=Z.pow;Z.pow2,Z.pow3,Z.pow4,Z.premultiplyAlpha,Z.property,Z.radians,Z.rand,Z.range,Z.rangeFog,Z.rangeFogFactor,Z.reciprocal,Z.reference,Z.referenceBuffer,Z.reflect,Z.reflectVector,Z.reflectView,Z.reflector,Z.refract,Z.refractVector,Z.refractView,Z.reinhardToneMapping,Z.remap,Z.remapClamp;var zA=Z.renderGroup;Z.renderOutput,Z.rendererReference,Z.replaceDefaultUV,Z.rotate,Z.rotateUV,Z.roughness,Z.round,Z.rtt,Z.sRGBTransferEOTF,Z.sRGBTransferOETF,Z.sample;var BA=Z.sampler;Z.samplerComparison,Z.saturate,Z.saturation,Z.screen;var VA=Z.screenCoordinate;Z.screenDPR,Z.screenSize;var HA=Z.screenUV;Z.select,Z.setCurrentStack,Z.setName,Z.shaderStages,Z.shadow,Z.shadowPositionWorld,Z.shapeCircle,Z.sharedUniformGroup,Z.sheen,Z.sheenRoughness,Z.shiftLeft,Z.shiftRight,Z.shininess,Z.sign,Z.sin,Z.sinh,Z.sinc,Z.skinning,Z.smoothstep,Z.smoothstepElement,Z.specularColor,Z.specularF90,Z.spherizeUV,Z.split,Z.spritesheetUV,Z.sqrt,Z.stack,Z.step,Z.stepElement,Z.storage,Z.storageBarrier,Z.storageTexture,Z.storageTexture3D,Z.struct,Z.sub,Z.subgroupAdd,Z.subgroupAll,Z.subgroupAnd,Z.subgroupAny,Z.subgroupBallot,Z.subgroupBroadcast,Z.subgroupBroadcastFirst,Z.subBuild,Z.subgroupElect,Z.subgroupExclusiveAdd,Z.subgroupExclusiveMul,Z.subgroupInclusiveAdd,Z.subgroupInclusiveMul,Z.subgroupIndex,Z.subgroupMax,Z.subgroupMin,Z.subgroupMul,Z.subgroupOr,Z.subgroupShuffle,Z.subgroupShuffleDown,Z.subgroupShuffleUp,Z.subgroupShuffleXor,Z.subgroupSize,Z.subgroupXor,Z.tan,Z.tanh,Z.tangentGeometry,Z.tangentLocal,Z.tangentView,Z.tangentWorld;var UA=Z.texture,WA=Z.texture3D;Z.textureBarrier,Z.textureBicubic,Z.textureBicubicLevel,Z.textureCubeUV;var GA=Z.textureLoad;Z.textureSize,Z.textureLevel,Z.textureStore,Z.thickness,Z.time,Z.toneMapping,Z.toneMappingExposure,Z.toonOutlinePass,Z.transformDirection,Z.transformNormal,Z.transformNormalByInverseViewMatrix,Z.transformNormalByViewMatrix,Z.transformNormalToView,Z.transformedClearcoatNormalView,Z.transformedNormalView,Z.transformedNormalWorld,Z.transmission,Z.transpose,Z.triNoise3D,Z.triplanarTexture,Z.triplanarTextures,Z.trunc,Z.uint,Z.uintBitsToFloat;var KA=Z.uniform;Z.uniformArray,Z.uniformCubeTexture,Z.uniformGroup,Z.uniformFlow,Z.uniformTexture,Z.unpackHalf2x16,Z.unpackSnorm2x16,Z.unpackUnorm2x16,Z.unpackRGBToNormal,Z.unpremultiplyAlpha,Z.userData,Z.uv,Z.uvec2,Z.uvec3,Z.uvec4,Z.varying,Z.varyingProperty,Z.vec2;var qA=Z.vec3,JA=Z.vec4;Z.vectorComponents,Z.velocity,Z.vertexColor,Z.vertexIndex,Z.vertexStage,Z.vibrance,Z.viewZToLogarithmicDepth,Z.viewZToOrthographicDepth,Z.viewZToPerspectiveDepth,Z.viewZToReversedOrthographicDepth,Z.viewZToReversedPerspectiveDepth,Z.viewport,Z.viewportCoordinate;var YA=Z.viewportDepthTexture;Z.viewportLinearDepth,Z.viewportMipTexture,Z.viewportOpaqueMipTexture,Z.viewportResolution,Z.viewportSafeUV,Z.viewportSharedTexture,Z.viewportSize,Z.viewportTexture,Z.viewportUV;var XA=Z.wgsl,ZA=Z.wgslFn;Z.workgroupArray,Z.workgroupBarrier,Z.workgroupId,Z.workingToColorSpace,Z.xor;var QA=new w,$A=new hn,ej=class extends pS{static get type(){return`ClusteredLightsNode`}constructor(e=1024,t=32,n=24,r=64){super(),this.materialLights=[],this.clusteredLights=[],this._allLights=[],this.maxLights=e,this.tileSize=t,this.zSlices=n,this.maxLightsPerCluster=r,this._chunksPerCluster=Math.ceil(r/4),this._bufferSize=null,this._lightIndexes=null,this._screenClusterIndex=null,this._compute=null,this._lightsTexture=null,this._zSliceRangesTexture=null,this._zSliceRangesData=null,this._lightViewZ=new Float32Array(e),this._lightSortOrder=[],this._lightsCount=KA(0,`int`),this._cameraNear=KA(0).setName(`clusteredCameraNear`).setGroup(zA),this._cameraFar=KA(0).setName(`clusteredCameraFar`).setGroup(zA),this._cameraViewMatrix=KA(`mat4`).setName(`clusteredCameraViewMatrix`).setGroup(zA),this._cameraProjectionMatrix=KA(`mat4`).setName(`clusteredCameraProjectionMatrix`).setGroup(zA),this._gridDimensions=KA(new hn),this.updateBeforeType=E.RENDER}customCacheKey(){return(this._compute?this._compute.getCacheKey():0)+super.customCacheKey()}updateLightsTexture(e){let{_lightsTexture:t,clusteredLights:n}=this,r=t.image.data,i=t.image.width*4,a=n.length;this._lightsCount.value=a;let o=this._lightViewZ,s=this._lightSortOrder;for(let t=0;t<a;t++)QA.setFromMatrixPosition(n[t].matrixWorld),QA.applyMatrix4(e.matrixWorldInverse),o[t]=QA.z,s[t]=t;s.length=a,s.sort((e,t)=>o[e]-o[t]);for(let e=0;e<a;e++){let t=n[s[e]];QA.setFromMatrixPosition(t.matrixWorld);let a=e*4;r[a+0]=QA.x,r[a+1]=QA.y,r[a+2]=QA.z,r[a+3]=t.distance,r[i+a+0]=t.color.r*t.intensity,r[i+a+1]=t.color.g*t.intensity,r[i+a+2]=t.color.b*t.intensity,r[i+a+3]=t.decay}t.needsUpdate=!0;let c=this._zSliceRangesData;if(c===null)return;let l=e.near,u=e.far,d=this.zSlices;for(let e=0;e<d;e++){let t=-(l*(u/l)**+(e/d)),r=-(l*(u/l)**+((e+1)/d)),i=a,f=0;for(let e=0;e<a;e++){let a=o[s[e]],c=n[s[e]].distance,l=c>0?c:u;a+l>=r&&a-l<=t&&(e<i&&(i=e),e+1>f&&(f=e+1))}i>=a&&(i=0,f=0),c[e*4]=i,c[e*4+1]=f}this._zSliceRangesTexture.needsUpdate=!0}updateBefore(e){let{renderer:t,camera:n}=e;this.updateProgram(t),this.updateLightsTexture(n),this._cameraNear.value=n.near,this._cameraFar.value=n.far,this._cameraViewMatrix.value=n.matrixWorldInverse,this._cameraProjectionMatrix.value=n.projectionMatrix,t.compute(this._compute)}setLights(e){this._allLights=e;let{clusteredLights:t,materialLights:n}=this,r=0,i=0;for(let a of e)a.isPointLight===!0&&a.castShadow!==!0?t[i++]=a:n[r++]=a;return n.length=r,t.length=i,super.setLights(n)}getLights(){return this._allLights}getBlock(){return this._lightIndexes.element(this._screenClusterIndex.mul($(this._chunksPerCluster)))}getTile(e){e=$(e);let t=$(4),n=e.div(t),r=this._screenClusterIndex.mul($(this._chunksPerCluster)).add(n);return this._lightIndexes.element(r).element(e.mod(t))}getClusterLightCount(e){return hA(([e])=>{let t=$(0).toVar(),n=this._screenClusterIndex.toVar();return gA(e.greaterThanEqual($(0)),()=>{let t=$(this.tileSize),r=VA.div(t).floor(),i=$(this._gridDimensions.x),a=$(this._gridDimensions.y);n.assign($(r.x).add($(r.y).mul(i)).add(e.mul(i.mul(a))))}),_A(this.maxLightsPerCluster,({i:e})=>{let r=$(e),i=$(4),a=r.div(i),o=n.mul($(this._chunksPerCluster)).add(a);gA(this._lightIndexes.element(o).element(r.mod(i)).equal($(0)),()=>{mA()}),t.addAssign($(1))}),t})(e)}getLightData(e){e=$(e);let t=GA(this._lightsTexture,kA(e,0)),n=GA(this._lightsTexture,kA(e,1)),r=t.xyz;return{position:r,viewPosition:this._cameraViewMatrix.mul(JA(r,1)).xyz,distance:t.w,color:n.rgb,decay:n.w}}setupLights(e,t){this.updateProgram(e.renderer);let n=e.context.reflectedLight;n.directDiffuse.toStack(),n.directSpecular.toStack(),super.setupLights(e,t),hA(()=>{_A(this.maxLightsPerCluster,({i:t})=>{let n=this.getTile(t);gA(n.equal($(0)),()=>{mA()});let{color:r,decay:i,viewPosition:a,distance:o}=this.getLightData(n.sub(1)),s=a.sub(IA);gA(o.equal(0).or(EA(s,s).lessThanEqual(o.mul(o))),()=>{e.lightsNode.setupDirectLight(e,this,TA({color:r,lightVector:s,cutoffDistance:o,decayExponent:i}))})})},`void`)()}getBufferFitSize(e){let t=this.tileSize;return Math.ceil(e/t)*t}setSize(e,t){return e=this.getBufferFitSize(e),t=this.getBufferFitSize(t),(!this._bufferSize||this._bufferSize.width!==e||this._bufferSize.height!==t)&&this.create(e,t),this}updateProgram(e){e.getDrawingBufferSize($A);let t=this.getBufferFitSize($A.width),n=this.getBufferFitSize($A.height);(this._bufferSize===null||this._bufferSize.width!==t||this._bufferSize.height!==n)&&this.create(t,n)}create(e,t){let{tileSize:n,maxLights:r,zSlices:i,maxLightsPerCluster:a,_chunksPerCluster:o}=this,s=new hn(e,t),c=Math.floor(s.width/n),l=Math.floor(s.height/n),u=i,d=c*l*u;this._gridDimensions.value.set(c,l);let f=new Float32Array(r*4*2),p=new Ln(f,f.length/8,2,oe,lt),m=new Float32Array(u*4),h=new Ln(m,u,1,oe,lt),g=yA(new Int32Array(d*o*4),`ivec4`).setName(`lightIndexes`),_=e=>{let t=OA.mul($(o)).add($(e));return g.element(t)},v=e=>{e=$(e);let t=$(4),n=e.div(t),r=OA.mul($(o)).add(n);return g.element(r).element(e.mod(t))},y=hA(()=>{let e=DA(1).div(this._cameraProjectionMatrix.element(0).element(0)),t=DA(1).div(this._cameraProjectionMatrix.element(1).element(1)),n=OA.mod(c),r=OA.div(c).mod(l),i=OA.div(c*l),s=DA(n).mul(2/c).sub(1),d=DA(n.add($(1))).mul(2/c).sub(1),f=DA(1).sub(DA(r).mul(2/l)),p=DA(1).sub(DA(r.add($(1))).mul(2/l)),m=this._cameraFar.div(this._cameraNear),g=this._cameraNear.mul(RA(m,DA(i).mul(1/u))).negate(),y=this._cameraNear.mul(RA(m,DA(i.add($(1))).mul(1/u))).negate(),b=g.negate().mul(e),x=y.negate().mul(e),S=g.negate().mul(t),ee=y.negate().mul(t),te=s.mul(b),ne=d.mul(b),re=s.mul(x),ie=d.mul(x),ae=p.mul(S),oe=f.mul(S),se=p.mul(ee),ce=f.mul(ee),le=NA(te,re),ue=MA(ne,ie),de=NA(ae,se),fe=MA(oe,ce),pe=qA(le,de,y),me=qA(ue,fe,g);_A(o,({i:e})=>{_(e).assign(AA(0))});let he=$(0).toVar(),ge=GA(h,kA(i,0)),_e=$(ge.x),ve=$(ge.y);_A(this.maxLights,({i:e})=>{let t=_e.add(e);gA(he.greaterThanEqual($(a)).or(t.greaterThanEqual(ve)),()=>{vA()});let{viewPosition:n,distance:r}=this.getLightData(t),i=n.xyz,o=MA(pe,NA(i,me)),s=i.sub(o);gA(EA(s,s).lessThanEqual(r.mul(r)),()=>{v(he).assign(t.add($(1))),he.addAssign($(1))})})})().compute(d).setName(`Update Clustered Lights`),b=hA(()=>{let e=VA.div(n).floor(),t=IA.z.negate(),r=DA(1).div(jA(this._cameraFar.div(this._cameraNear))),i=SA(jA(t.div(this._cameraNear)).mul(r).mul(DA(u)).floor(),DA(0),DA(u-1));return $(e.x).add($(e.y).mul($(c))).add($(i).mul($(c*l)))})().toVar();this._bufferSize=s,this._lightIndexes=g,this._screenClusterIndex=b,this._compute=y,this._lightsTexture=p,this._zSliceRangesTexture=h,this._zSliceRangesData=m}get hasLights(){return super.hasLights||this.clusteredLights.length>0}},tj=class extends eE{constructor(e=1024,t=32,n=24,r=64){super(),this.maxLights=e,this.tileSize=t,this.zSlices=n,this.maxLightsPerCluster=r}createNode(e=[]){return new ej(this.maxLights,this.tileSize,this.zSlices,this.maxLightsPerCluster).setLights(e)}},nj=2e6,rj=class e{rows=new Map;static key(e,t){return(e+33554432)*67108864+t+33554432}get(t,n,r){return this.rows.get(t)?.get(e.key(n,r))}set(t,n,r,i){let a=this.rows.get(t);a||this.rows.set(t,a=new Map),a.set(e.key(n,r),i)}get size(){let e=0;for(let t of this.rows.values())e+=t.size;return e}*values(){for(let e of this.rows.values())yield*e.values()}},ij=class{coverage=new WeakMap;previous=[];result={records:new ArrayBuffer(48),count:0};spacing;constructor(e){this.spacing=[...e]}prepare(e){let t=this.spacing,n=e.filter(e=>e.shape===`mesh`);if(n.length===this.previous.length&&n.every((e,t)=>{let n=this.previous[t];return e.samples===n.samples&&e.surfaceArea===n.surfaceArea&&e.flame===n.flame&&e.heatRate===n.heatRate&&e.smokeRate===n.smokeRate&&e.fuelRate===n.fuelRate&&e.velocityResponse===n.velocityResponse&&e.velocity.every((e,t)=>e===n.velocity[t])}))return this.result;let r=new rj,i=(t[0]*t[1]+t[1]*t[2]+t[2]*t[0])/3,a=0;for(let e of n){if(!e.samples||!e.surfaceArea||e.surfaceArea<=0)throw Error(`Mesh sources require surface samples and a positive surface area.`);if(a+=e.samples.length*8,a>nj)throw Error(`Mesh source sampling exceeds two million cell visits.`);let n=this.coverage.get(e.samples),o=n?.cells;if(!o||n.area!==e.surfaceArea){o=new rj;for(let n of e.samples){let r=n.position.map((e,n)=>e/t[n]-.5),a=r.map(Math.floor),s=r.map((e,t)=>e-a[t]);for(let t=0;t<2;t++)for(let r=0;r<2;r++)for(let c=0;c<2;c++){let l=a[0]+c,u=a[1]+r,d=a[2]+t,f=(c?s[0]:1-s[0])*(r?s[1]:1-s[1])*(t?s[2]:1-s[2]),p=n.weight*e.surfaceArea*f/i,m=o.get(l,u,d);m?m.value+=p:o.set(l,u,d,{x:l,y:u,z:d,value:p})}}this.coverage.set(e.samples,{area:e.surfaceArea,cells:o})}for(let t of o.values()){let n=Math.min(1,t.value);if(n<=0)continue;let i=r.get(t.x,t.y,t.z);i||(i={x:t.x,y:t.y,z:t.z,flame:0,heat:0,smoke:0,fuel:0,motionX:0,motionY:0,motionZ:0,response:0},r.set(t.x,t.y,t.z,i)),i.flame=Math.max(i.flame,e.flame*n),i.heat+=e.heatRate*n,i.smoke+=e.smokeRate*n,i.fuel+=(e.fuelRate??0)*n;let a=e.velocityResponse*n;i.motionX+=e.velocity[0]*a,i.motionY+=e.velocity[1]*a,i.motionZ+=e.velocity[2]*a,i.response+=a}}let o=new ArrayBuffer(Math.max(1,r.size+1)*48),s=new Int32Array(o),c=new Float32Array(o),l=1;for(let e of r.values()){let t=l*12;s.set([e.x,e.y,e.z,0],t),c.set([e.flame,e.heat,e.smoke,e.fuel],t+4),c.set([e.motionX,e.motionY,e.motionZ,e.response],t+8),l++}return this.previous=n.map(e=>({...e,velocity:[...e.velocity]})),this.result={records:o,count:r.size},this.result}},aj=5,oj=2,sj=4294967295,cj=class{rasterizer;previous=[];version=-1;bricks=0;coverage=new Uint32Array(1).fill(sj);spacing;brickCells;constructor(e,t=8){this.brickCells=t,this.spacing=[...e],this.rasterizer=new ij(e)}prepare(e,t,n,r){let i=e.reduce((e,t)=>e+(t.sources?.filter(e=>e.shape!==`mesh`).length??0),0),a=new Float32Array(Math.max(1,e.length*aj+i*oj)*4),o=e.length*aj,s=[];return e.forEach((e,t)=>{let n=e.sources?.filter(e=>e.shape!==`mesh`)??[];a.set([...e.vector,e.strength,...e.center,[`wind`,`turbulence`,`vortex`,`radial`].indexOf(e.type),e.scale,e.lift,e.inward,0,o,n.length,+!!e.sources?.some(e=>e.shape===`mesh`),e.sources===void 0?0:1],t*aj*4);let r,i=(e,t)=>{r=r?{lo:r.lo.map((t,n)=>Math.min(t,e[n])),hi:r.hi.map((e,n)=>Math.max(e,t[n]))}:{lo:e,hi:t}};for(let e of n){a.set([...e.position,e.shape===`box`?3:1,...e.size,0],o*4),o+=oj;let t=e.size.map(e=>Math.max(e,.03));i(e.position.map((e,n)=>e-t[n]),e.position.map((e,n)=>e+t[n]))}for(let t of e.sources??[]){if(t.shape!==`mesh`||!t.samples?.length)continue;let e=[1/0,1/0,1/0],n=[-1/0,-1/0,-1/0];for(let{position:r}of t.samples)for(let t=0;t<3;t++)e[t]=Math.min(e[t],r[t]-this.spacing[t]),n[t]=Math.max(n[t],r[t]+this.spacing[t]);i(e,n)}s.push(e.sources===void 0?void 0:r??{lo:[0,0,0],hi:[-1,-1,-1]})}),{data:a,reach:s,coverage:this.prepareCoverage(e,t,n,r)}}prepareCoverage(e,t,n,r){let i=e.flatMap((e,t)=>(e.sources??[]).filter(e=>e.shape===`mesh`).map(e=>({index:t,source:e})));if(n===this.version&&t===this.bricks&&i.length===this.previous.length&&i.every((e,t)=>{let n=this.previous[t];return e.index===n.index&&e.source.samples===n.source.samples&&e.source.surfaceArea===n.source.surfaceArea}))return this.coverage;this.previous=i,this.version=n,this.bricks=t;let a=1+Math.ceil(this.brickCells**3/32),o=this.brickCells-1,s=Math.log2(this.brickCells),c=new Map;for(let{index:e,source:t}of i){let{records:n,count:i}=this.rasterizer.prepare([{...t,flame:1}]),l=new Int32Array(n);for(let t=1;t<=i;t++){let n=[0,1,2].map(e=>l[t*12+e]),i=r(n.map(e=>e>>s));if(i<0)continue;let u=c.get(i);u||c.set(i,u=new Map);let d=u.get(e);d||u.set(e,d=new Uint32Array(a-1));let f=((n[2]&o)*this.brickCells+(n[1]&o))*this.brickCells+(n[0]&o);d[f>>5]|=1<<(f&31)>>>0}}let l=t;for(let e of c.values())l+=1+e.size*a;let u=new Uint32Array(Math.max(1,l)).fill(sj,0,t),d=t;for(let[e,t]of c){u[e]=d,u[d++]=t.size;for(let[e,n]of t)u[d++]=e,u.set(n,d),d+=n.length}return this.coverage=u,u}},lj=class{queue;previous=new WeakMap;constructor(e){this.queue=e}write(e,t){let n=ArrayBuffer.isView(t)?new Uint8Array(t.buffer,t.byteOffset,t.byteLength):new Uint8Array(t),r=this.previous.get(e);return r?.length===n.length&&n.every((e,t)=>e===r[t])?!1:(this.queue.writeBuffer(e,0,n),this.previous.set(e,n.slice()),!0)}},uj=[`smoke`,`heat`,`expansion`],dj={lifespan:1.2,smokeRate:2,heatRate:4,expansionRate:1,ramps:{smoke:[[0,0],[.2,1],[.5,0],[1,0]],heat:[[0,0],[.2,1],[1,1]],expansion:[[0,0],[.5,0],[.75,1],[1,1]]}};function fj(e,t){let n=(e,t)=>{if(!Number.isFinite(t)||!Number.isFinite(Math.fround(t)))throw Error(`${e} must be finite in f32.`);return Math.fround(t)},r=n(`Flame timestep`,t),i=n(`Flame lifespan`,e.lifespan);if(r<=0||i<=0)throw Error(`Flame timestep and lifespan must be positive in f32.`);n(`Lifetime decrement`,r/i);let a=n(`Smoke rate`,e.smokeRate),o=n(`Heat rate`,e.heatRate),s=n(`Expansion rate`,e.expansionRate);if(a<0||o<0)throw Error(`Smoke and heat rates must be nonnegative.`);for(let e of[a,o,s])n(`Integrated flame output`,e*i);let c=new ArrayBuffer(48),l=new Float32Array(c),u=new Uint32Array(c,32,4);l.set([r,i,a,o,s,0,0,0]);let d=new Float32Array(uj.length*8*2);return uj.forEach((t,r)=>{let i=e.ramps?.[t];if(!Array.isArray(i)||i.length<2||i.length>8)throw Error(`${t} ramp needs 2–8 knots.`);let a=-1;i.forEach((e,o)=>{if(!Array.isArray(e)||e.length!==2)throw Error(`${t} ramp needs [lifetime,response] pairs.`);let s=n(`${t} lifetime`,e[0]),c=n(`${t} response`,e[1]);if(s<0||s>1||c<0||c>1||s<=a)throw Error(`${t} knots must increase in f32 with coordinates in [0,1].`);if(o===0&&s!==0||o===i.length-1&&s!==1)throw Error(`${t} ramp must span lifetime 0–1.`);d.set([s,c],(r*8+o)*2),a=s}),u[r]=i.length}),{uniform:c,ramps:d}}var pj=`enable f16;
// Geometric multigrid for the pressure on the velocity grid: weighted Jacobi smoothing,
// residual restriction and trilinear correction. Levels are stored only where there are
// bricks. Each brick holds successive levels down to 2³ velocity cells. The next
// three levels hold 4³, 2³ and one cell in each tile of 4x4x4 bricks (tiles.wgsl).
// Level cells span \`2^level\` finest velocity cells on each axis.
// Values are half precision; loads promote to f32 and only stores round.
// Per dispatch: the input, output and coarse levels and the bottom solve's iterations;
// the brick ids and how the brick list is read (bricks.w: words per entry, or 0 for every
// brick id); the tile slots.
struct Dimensions {
  levels: vec4u,
  bricks: vec4u,
  tiles: vec4u
};

@group(0) @binding(6) var<uniform> dimensions: Dimensions;
fn inputLevel() -> u32 {
  return dimensions.levels.x;
}

fn outputLevel() -> u32 {
  return dimensions.levels.y;
}

fn coarseLevel() -> u32 {
  return dimensions.levels.z;
}

// The fluid solver's parameters for the velocity grid (fluid-common.wgsl).
struct Params {
  grid: vec4f,
  forces: vec4f,
  dynamics: vec4f,
  noise: vec4f,
  counts: vec4f,
  velocityGrid: vec4f,
  fieldGrid: vec4f,
  pool: vec4f,
  bricks: vec4f,
};

@group(0) @binding(0) var<uniform> u: Params;
@group(0) @binding(1) var<storage, read> pressure: array<f16>;
@group(0) @binding(2) var<storage, read> rhs: array<f16>;
@group(0) @binding(3) var<storage, read> coarse: array<f16>;
@group(0) @binding(4) var<storage, read_write> outputPressure: array<f16>;
@group(0) @binding(11) var<storage, read_write> coarseFirst: array<f16>;
@group(0) @binding(8) var<storage, read> topology: array<u32>;
@group(0) @binding(9) var<storage, read> coarseTopology: array<u32>;
@group(0) @binding(10) var<storage, read_write> outputTopology: array<u32>;
// The listed bricks, or the bricks zeroed this step (fluid-zeroing.wgsl). Pages and whether bricks
// compute come from the tile directory (tiles.wgsl).
@group(0) @binding(12) var<storage, read> brickList: array<u32>;
// Finest velocity cells per brick side, as a power of two.
fn velocityBrickShift() -> u32 {
  return u32(u.velocityGrid.w);
}

fn levelShift(level: u32) -> u32 {
  if level < velocityBrickShift() {
    return velocityBrickShift() - level;
  }
  return velocityBrickShift() + 2u - level;
}

fn levelSide(level: u32) -> u32 {
  return 1u << levelShift(level);
}

// Where a level stores cell \`p\`: in a brick slot until one cell covers a whole brick,
// then in a tile. -1 without storage.
fn cellAddress(p: vec3i, level: u32) -> i32 {
  let shift = levelShift(level);
  let side = 1u << shift;
  let local = vec3u(p & vec3i(i32(side) - 1));
  var owner: u32;
  if level < velocityBrickShift() {
    let page = brickPage(p >> vec3u(shift));
    if page < 0 {
      return -1;
    }
    owner = poolSlot(page, u.pool.xy);
  } else {
    let tile = tileAt(p >> vec3u(shift));
    if tile < 0 {
      return -1;
    }
    owner = u32(tile);
  }
  return i32(owner * side * side * side + (local.z * side + local.y) * side + local.x);
}

fn brickActive(b: vec3i) -> bool {
  return entryComputes(brickEntry(b));
}

// Pressure unknowns. A finest-level cell needs its own brick and the bricks of its
// negative neighbors active, so projection updates all six of its faces. A coarse cell
// is an unknown only when every finest cell under it is one, which keeps each level's
// open boundary where the finest level has it (McAdams et al. 2010). All other cells
// hold zero pressure, an open boundary for their neighbors. Below the ground is solid, so
// no brick there needs to compute.
fn activeCell(p: vec3i, level: u32) -> bool {
  // A tile level's cell covers whole bricks: each one's record says whether all its cells are.
  if level >= velocityBrickShift() {
    let n = 1 << (level - velocityBrickShift());
    for (var z = 0; z < n; z++) {
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          let id = brickId(p * n + vec3i(x, y, z));
          if id < 0 || entryById(u32(id)) < 0 || recordWord(u32(id), BRICK_PRESSURE_FLAG) == 0 {
            return false;
          }
        }
      }
    }
    return true;
  }
  let span = 1 << level;
  var lo = (p * span - 1) >> vec3u(velocityBrickShift());
  if u.counts.w > .5 {
    lo.y = max(lo.y, 0);
  }
  let hi = (p * span + span - 1) >> vec3u(velocityBrickShift());
  for (var z = lo.z; z <= hi.z; z++) {
    for (var y = lo.y; y <= hi.y; y++) {
      for (var x = lo.x; x <= hi.x; x++) {
        if !brickActive(vec3i(x, y, z)) {
          return false;
        }
      }
    }
  }
  return true;
}

// A brick has a slot only while it computes (fluid-allocation.wgsl allocateBricks).
fn readPressure(p: vec3i) -> f32 {
  let a = cellAddress(p, inputLevel());
  if a < 0 {
    return 0.0;
  }
  return f32(pressure[a]);
}

fn readRhs(p: vec3i) -> f32 {
  let a = cellAddress(p, inputLevel());
  if a < 0 {
    return 0.0;
  }
  return f32(rhs[a]);
}

fn readCoarse(p: vec3i) -> f32 {
  let a = cellAddress(p, coarseLevel());
  if a < 0 {
    return 0.0;
  }
  return f32(coarse[a]);
}

fn writePressure(p: vec3i, value: f32) {
  let a = cellAddress(p, outputLevel());
  if a >= 0 {
    outputPressure[a] = f16(value);
  }
}

// Stored flags are one byte per cell, four cells per word in storage order.
// Bits 0..5 mark sides that are not blocked and bit 6 marks a solid cell.
const STORED_SOLID = 64u;
fn storedFlags(word: u32, address: u32) -> u32 {
  return (word >> ((address & 3u) * 8u)) & 0xffu;
}

// Expanded flags: bits 0..5 are open sides and bit 10 is solid. An open side's neighbor
// may hold no storage; it reads zero pressure, like every cell that is not an unknown.
const SOLID = 1024u;
fn expandFlags(stored: u32) -> u32 {
  if (stored & STORED_SOLID) != 0u {
    return SOLID;
  }
  return stored & 63u;
}

fn flagsAt(p: vec3i) -> u32 {
  let a = cellAddress(p, inputLevel());
  if a < 0 {
    return SOLID;
  }
  return expandFlags(storedFlags(topology[u32(a) >> 2u], u32(a)));
}

fn coarseSolid(p: vec3i) -> bool {
  let a = cellAddress(p, coarseLevel());
  if a < 0 {
    return false;
  }
  return (storedFlags(coarseTopology[u32(a) >> 2u], u32(a)) & STORED_SOLID) != 0u;
}

const OFFSETS = array<vec3i, 6>(vec3i(1, 0, 0),
  vec3i(-1, 0, 0),
  vec3i(0, 1, 0),
  vec3i(0, -1, 0),
  vec3i(0, 0, 1),
  vec3i(0, 0, -1));
// Whether a level's cell is solid: its center's field cell, as the fluid solver tests it.
fn blockedAt(p: vec3i, level: u32) -> bool {
  return solidAt((vec3f(p) + .5) * u.grid.xyz * f32(1u << level));
}

// Exterior colliders are tested before the ambient outlet, just like the operator.
fn cellTopology(p: vec3i, level: u32) -> u32 {
  if blockedAt(p, level) {
    return STORED_SOLID;
  }
  var flags = 0u;
  for (var side = 0u; side < 6u; side++) {
    if !blockedAt(p + OFFSETS[side], level) {
      flags |= 1u << side;
    }
  }
  return flags;
}

// The brick whose slot levels a topology dispatch builds, and its slot: from the list,
// or every brick id; the slot is -1 without one. A brick freed this step has none, and
// may have passed its slot to a fresh brick on the same list.
struct TopologyBrick {
  brick: vec3i,
  slot: i32
};

fn topologyBrick(group: vec3u) -> TopologyBrick {
  let stride = dimensions.bricks.w;
  var id: u32;
  if stride == 0u {
    id = group.x + group.y * BRICK_LIST_SPLIT;
    if id >= dimensions.bricks.x || tileRecord(id >> 6u).w == 0 {
      return TopologyBrick(vec3i(0), -1);
    }
  } else {
    let index = listedBrick(group);
    if index >= brickList[0] {
      return TopologyBrick(vec3i(0), -1);
    }
    id = brickList[1u + stride * index];
  }
  let page = entryPage(entryById(id));
  if page < 0 {
    return TopologyBrick(vec3i(0), -1);
  }
  return TopologyBrick(brickOf(id), i32(poolSlot(page, u.pool.xy)));
}

// One workgroup builds a brick's flags at the output level, a whole word per invocation.
@compute @workgroup_size(64)
fn buildBrickTopology(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let brick = topologyBrick(group);
  if brick.slot < 0 {
    return;
  }
  let level = outputLevel();
  let side = levelSide(level);
  let cells = side * side * side;
  for (var word = lane; word * 4u < cells; word += 64u) {
    var packed = 0u;
    for (var k = 0u; k < 4u; k++) {
      let offset = word * 4u + k;
      let local = vec3u(offset % side, (offset / side) % side, offset / (side * side));
      packed |= cellTopology(brick.brick * i32(side) + vec3i(local), level) << (k * 8u);
    }
    outputTopology[u32(brick.slot) * cells / 4u + word] = packed;
  }
}

// Every tile slot's flags at the output level, a whole word per invocation.
@compute @workgroup_size(256)
fn buildTileTopology(@builtin(global_invocation_id) id: vec3u) {
  let level = outputLevel();
  let side = levelSide(level);
  let cells = side * side * side;
  let total = dimensions.tiles.x * cells;
  if id.x * 4u >= total {
    return;
  }
  var packed = 0u;
  for (var k = 0u; k < 4u; k++) {
    let address = id.x * 4u + k;
    if address >= total {
      break;
    }
    let tile = tileRecord(address / cells);
    if tile.w == 0 {
      continue;
    }
    let offset = address % cells;
    let local = vec3u(offset % side, (offset / side) % side, offset / (side * side));
    packed |= cellTopology(tile.xyz * i32(side) + vec3i(local), level) << (k * 8u);
  }
  outputTopology[id.x] = packed;
}

fn axisDiagonal(flags: u32, side: u32) -> f32 {
  return f32((flags >> side) & 1u) + f32((flags >> (side + 1u)) & 1u);
}

fn axisWeights() -> vec3f {
  let inverseSpacing = 1.0 / u.grid.xyz;
  let reference = 1.0 / max(inverseSpacing.x, max(inverseSpacing.y, inverseSpacing.z));
  let normalized = reference * inverseSpacing;
  return normalized * normalized;
}

// Where a level keeps a cell that has storage, found once: its address, the first address
// of its brick or tile, and its place there. Neighbors in the same brick or tile are then
// read without another page lookup, and without checking the brick computes: callers
// reach them only from an unknown, whose brick computes, or on the tile levels.
struct PressureCellAddress {
  address: u32,
  origin: u32,
  local: vec3u,
  side: u32
};

fn pressureCellAddress(p: vec3i, level: u32) -> PressureCellAddress {
  let side = levelSide(level);
  let local = vec3u(p & vec3i(i32(side) - 1));
  let address = u32(cellAddress(p, level));
  return PressureCellAddress(address,
    address - (local.z * side + local.y) * side - local.x,
    local,
    side);
}

fn nearPressure(here: PressureCellAddress, p: vec3i, side: u32, level: u32) -> f32 {
  let q = vec3i(here.local) + OFFSETS[side];
  if all(q >= vec3i(0)) && all(q < vec3i(i32(here.side))) {
    let c = vec3u(q);
    return f32(pressure[here.origin + (c.z * here.side + c.y) * here.side + c.x]);
  }
  return readPressure(p + OFFSETS[side]);
}

fn flagsHere(here: PressureCellAddress) -> u32 {
  return expandFlags(storedFlags(topology[here.address >> 2u], here.address));
}

// Whether a cell with storage is an unknown. In a brick that computes, a cell past the
// first layer on every axis needs no other brick (activeCell).
fn unknownHere(here: PressureCellAddress, p: vec3i, level: u32, computing: bool) -> bool {
  if computing && level < velocityBrickShift() && all(here.local > vec3u(0)) {
    return true;
  }
  return activeCell(p, level);
}

fn nearValue(here: PressureCellAddress, p: vec3i, flags: u32, side: u32, level: u32) -> f32 {
  if (flags & (1u << side)) == 0u {
    return 0;
  }
  return nearPressure(here, p, side, level);
}

// The cached flags preserve zero-flux solids and half-cell ambient outlets.
// The diagonal uses per-axis cell spacing.
fn stencil(here: PressureCellAddress, p: vec3i, flags: u32, level: u32) -> vec2f {
  let weights = axisWeights();
  let sum = weights.x * (nearValue(here,
      p,
      flags,
      0u,
      level) + nearValue(here,
      p,
      flags,
      1u,
      level)) + weights.y * (nearValue(here,
      p,
      flags,
      2u,
      level) + nearValue(here,
      p,
      flags,
      3u,
      level)) + weights.z * (nearValue(here,
      p,
      flags,
      4u,
      level) + nearValue(here,
      p,
      flags,
      5u,
      level));
  let diagonal = weights.x * axisDiagonal(flags,
    0u) + weights.y * axisDiagonal(flags,
    2u) + weights.z * axisDiagonal(flags,
    4u);
  return vec2f(sum, diagonal);
}

// Cells of the dispatch. Level 0 uses 128-cell chunks; coarser brick levels use
// 64-cell chunks, packing eight 2³-cell bricks into a group. Tile levels use one
// workgroup per tile slot. \`computing\` marks dispatches over computing bricks. The
// brick or tile becomes home (tiles.wgsl); a workgroup inside one brick shares its record.
// Every lane must call these, before any return.
struct LevelCell {
  id: vec3i,
  valid: bool
};

// Listed brick \`index\` becomes home, if listed; \`whole\` when it fills the workgroup.
fn enterListed(index: u32, lane: u32, whole: bool) -> bool {
  let listed = index < brickList[0];
  var id = 0u;
  if listed {
    id = brickList[index + 1u];
  }
  loadHomeRecord(id, lane, listed && whole);
  if !listed {
    return false;
  }
  enterBrick(id, true);
  home.inWorkgroup = whole;
  return true;
}

fn fineCell(group: vec3u, local: vec3u) -> LevelCell {
  let lane = (local.z * 4u + local.y) * 8u + local.x;
  if !enterListed(listedBrick(group), lane, true) {
    return LevelCell(vec3i(0), false);
  }
  let side = levelSide(0u);
  let index = group.x * 128u + lane;
  let offset = vec3u(index % side, (index / side) % side, index / (side * side));
  return LevelCell(home.brick * i32(side) + vec3i(offset), index < side * side * side);
}

fn brickCell(group: vec3u, lane: u32, level: u32) -> LevelCell {
  let side = levelSide(level);
  let cells = side * side * side;
  let whole = cells >= 64u;
  var index = listedBrick(group);
  var offset = group.x * 64u + lane;
  if !whole {
    index = index * 8u + lane / 8u;
    offset = lane % 8u;
  }
  if !enterListed(index, lane, whole) {
    return LevelCell(vec3i(0), false);
  }
  let local = vec3u(offset % side, (offset / side) % side, offset / (side * side));
  return LevelCell(home.brick * i32(side) + vec3i(local), offset < cells);
}

fn tileCell(group: vec3u, lane: u32, level: u32) -> LevelCell {
  let side = levelSide(level);
  if lane >= side * side * side || tileRecord(group.x).w == 0 {
    return LevelCell(vec3i(0), false);
  }
  enterTile(group.x);
  let local = vec3u(lane % side, (lane / side) % side, lane / (side * side));
  return LevelCell(home.tileCoord * i32(side) + vec3i(local), true);
}

fn relaxCell(p: vec3i, computing: bool) {
  let level = outputLevel();
  let here = pressureCellAddress(p, level);
  let flags = flagsHere(here);
  if (flags & SOLID) != 0u || !unknownHere(here, p, level, computing) {
    outputPressure[here.address] = 0h;
    return;
  }
  let coefficients = stencil(here, p, flags, level);
  let candidate = (coefficients.x - f32(rhs[here.address])) / max(coefficients.y, 1e-12);
  outputPressure[here.address] = f16(mix(f32(pressure[here.address]), candidate, .8));
}

// The first finest-grid Jacobi iteration starts from zero every timestep. Its
// pressure neighbors and center are all zero, so initialize the iterate directly
// from the RHS and diagonal. This replaces a full-capacity reset and its following
// relaxation without changing the arithmetic or half-precision rounding.
@compute @workgroup_size(8, 4, 4)
fn initializePressure(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = fineCell(group, local);
  if !cell.valid {
    return;
  }
  let level = outputLevel();
  let here = pressureCellAddress(cell.id, level);
  let flags = flagsHere(here);
  var first = 0.0;
  if (flags & SOLID) == 0u && unknownHere(here, cell.id, level, true) {
    let weights = axisWeights();
    let diagonal = weights.x * axisDiagonal(flags,
      0u) + weights.y * axisDiagonal(flags,
      2u) + weights.z * axisDiagonal(flags,
      4u);
    first = mix(0.0, (0.0 - f32(rhs[here.address])) / max(diagonal, 1e-12), .8);
  }
  outputPressure[here.address] = f16(first);
}

@compute @workgroup_size(8, 4, 4)
fn relaxBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = fineCell(group, local);
  if cell.valid {
    relaxCell(cell.id, true);
  }
}

@compute @workgroup_size(64)
fn relaxCoarseBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = brickCell(group, lane, outputLevel());
  if cell.valid {
    relaxCell(cell.id, true);
  }
}

@compute @workgroup_size(64)
fn relaxTiles(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_index) lane: u32) {
  let cell = tileCell(group, lane, outputLevel());
  if cell.valid {
    relaxCell(cell.id, false);
  }
}

// The bottom level, one cell per tile: up to 256 tile slots fit this shared array, and one
// workgroup runs every iteration, a tile slot per lane. Every lane reaches both barriers,
// including lanes past the tiles and solid cells. Round each iterate just like the f16
// ping-pong storage.
var<workgroup> coarsePressure: array<f32, 256>;
fn sharedNeighbor(lane: u32, flags: u32, side: u32) -> f32 {
  if (flags & (1u << side)) == 0u {
    return 0.0;
  }
  let neighbor = tileNeighbor(lane, neighborIndex(OFFSETS[side]));
  if neighbor < 0 {
    return 0.0;
  }
  return coarsePressure[neighbor];
}

@compute @workgroup_size(256)
fn relaxCoarse(@builtin(local_invocation_index) lane: u32) {
  let valid = lane < dimensions.tiles.x && tileRecord(lane).w != 0;
  var p = vec3i(0);
  if valid {
    enterTile(lane);
    p = home.tileCoord;
  }
  var flags = SOLID;
  var source = 0.0;
  var value = 0.0;
  if valid && activeCell(p, outputLevel()) {
    flags = flagsAt(p);
    source = readRhs(p);
    value = readPressure(p);
  }
  coarsePressure[lane] = value;
  workgroupBarrier();
  for (var iteration = 0u; iteration < dimensions.levels.w; iteration++) {
    var next = 0.0;
    if valid && (flags & SOLID) == 0u {
      let weights = axisWeights();
      let sum = weights.x * (sharedNeighbor(lane,
          flags,
          0u) + sharedNeighbor(lane,
          flags,
          1u)) + weights.y * (sharedNeighbor(lane,
          flags,
          2u) + sharedNeighbor(lane,
          flags,
          3u)) + weights.z * (sharedNeighbor(lane,
          flags,
          4u) + sharedNeighbor(lane,
          flags,
          5u));
      let diagonal = weights.x * axisDiagonal(flags,
        0u) + weights.y * axisDiagonal(flags,
        2u) + weights.z * axisDiagonal(flags,
        4u);
      let candidate = (sum - source) / max(diagonal, 1e-12);
      next = quantizeToF16(mix(value, candidate, .8));
    }
    workgroupBarrier();
    coarsePressure[lane] = next;
    value = next;
    workgroupBarrier();
  }
  if valid {
    writePressure(p, value);
  }
}

fn restrictCell(id: vec3i, computing: bool) {
  let fine = inputLevel();
  var residual = 0.0;
  // A coarse cell is an unknown exactly when its eight fine cells are (activeCell).
  var everyUnknown = true;
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let p = id * 2 + vec3i(x, y, z);
        // On the brick levels the fine cells lie in the coarse cell's brick, which computes.
        var unknown = computing && fine < velocityBrickShift() && all((p & vec3i(i32(levelSide(fine)) - 1)) > vec3i(0));
        if !unknown {
          unknown = activeCell(p, fine);
        }
        everyUnknown = everyUnknown && unknown;
        if unknown {
          let here = pressureCellAddress(p, fine);
          let flags = flagsHere(here);
          if (flags & SOLID) == 0u {
            let coefficients = stencil(here, p, flags, fine);
            residual += f32(rhs[here.address]) - (coefficients.x - coefficients.y * f32(pressure[here.address]));
          }
        }
      }
    }
  }
  // Coarse cells are twice as wide: h_coarse^2 / h_fine^2 = 4.
  let rhs = residual * .5;
  let level = outputLevel();
  let out = pressureCellAddress(id, level);
  outputPressure[out.address] = f16(rhs);
  // The coarse level's first Jacobi iterate from a zero guess, as relaxCell computes it:
  // every neighbor holds zero, so only the cell's own right-hand side contributes.
  var first = 0.0;
  if everyUnknown {
    let flags = expandFlags(storedFlags(coarseTopology[out.address >> 2u], out.address));
    if (flags & SOLID) == 0u {
      let weights = axisWeights();
      let diagonal = weights.x * axisDiagonal(flags,
        0u) + weights.y * axisDiagonal(flags,
        2u) + weights.z * axisDiagonal(flags,
        4u);
      first = mix(0.0, (0.0 - f32(f16(rhs))) / max(diagonal, 1e-12), .8);
    }
  }
  coarseFirst[out.address] = f16(first);
}

@compute @workgroup_size(64)
fn restrictBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = brickCell(group, lane, outputLevel());
  if cell.valid {
    restrictCell(cell.id, true);
  }
}

@compute @workgroup_size(64)
fn restrictTiles(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = tileCell(group, lane, outputLevel());
  if cell.valid {
    restrictCell(cell.id, false);
  }
}

// Solid cells have no pressure unknown. Interpolate Neumann ghost values from
// adjacent fluid cells instead of treating stored solid zeros as a pressure sink. Below
// the ground, the first layer mirrors: no flux through the floor.
fn coarseValue(p: vec3i) -> f32 {
  let ground = select(-0x7fffffff, 0, u.counts.w > .5);
  let c = vec3i(p.x, max(p.y, ground), p.z);
  if !coarseSolid(c) {
    return readCoarse(c);
  }
  var sum = 0.0;
  var count = 0.0;
  for (var axis = 0u; axis < 3u; axis++) {
    for (var side = -1; side <= 1; side += 2) {
      var offset = vec3i(0);
      offset[axis] = side;
      var q = c + offset;
      q.y = max(q.y, ground);
      if !coarseSolid(q) {
        sum += readCoarse(q);
        count += 1.0;
      }
    }
  }
  return sum / max(count, 1.0);
}

// The coarse cells around a fine cell of a computing brick: on a brick level, those in the
// same brick are read without a page lookup.
struct CoarseStencil {
  origin: u32,
  corner: vec3i,
  side: u32,
  near: bool
};

fn coarsePlace(here: PressureCellAddress,
  p: vec3i,
  level: u32,
  computing: bool) -> CoarseStencil {
  if !computing || level + 1u >= velocityBrickShift() {
    return CoarseStencil(0u, vec3i(0), 0u, false);
  }
  let side = here.side / 2u;
  let slot = here.origin / (here.side * here.side * here.side);
  let corner = (p >> vec3u(countTrailingZeros(here.side))) * i32(side);
  return CoarseStencil(slot * side * side * side, corner, side, true);
}

fn coarseAt(home: CoarseStencil, c: vec3i) -> f32 {
  if home.near {
    let q = c - home.corner;
    if all(q >= vec3i(0)) && all(q < vec3i(i32(home.side))) {
      let l = vec3u(q);
      return f32(coarse[home.origin + (l.z * home.side + l.y) * home.side + l.x]);
    }
  }
  return readCoarse(c);
}

fn prolongateCell(p: vec3i, computing: bool) {
  let level = outputLevel();
  let here = pressureCellAddress(p, level);
  let flags = flagsHere(here);
  if (flags & SOLID) != 0u || !unknownHere(here, p, level, computing) {
    outputPressure[here.address] = 0h;
    return;
  }
  let q = (vec3f(p) + .5) * .5 - .5;
  let i = vec3i(floor(q));
  let f = fract(q);
  // Ordinary coarse cells need no ghost extrapolation or collider tests.
  // Keep the original interpolation order and the full boundary path.
  var correction: f32;
  if u.counts.y == 0 && (u.counts.w == 0 || i.y >= 0) {
    let home = coarsePlace(here, p, level, computing);
    correction = mix(mix(mix(coarseAt(home, i), coarseAt(home, i + vec3i(1, 0, 0)), f.x), mix(coarseAt(home, i + vec3i(0, 1, 0)), coarseAt(home, i + vec3i(1, 1, 0)), f.x), f.y),
      mix(mix(coarseAt(home, i + vec3i(0, 0, 1)), coarseAt(home, i + vec3i(1, 0, 1)), f.x),
        mix(coarseAt(home, i + vec3i(0, 1, 1)), coarseAt(home, i + vec3i(1, 1, 1)), f.x),
        f.y),
      f.z);
  } else {
    correction = mix(mix(mix(coarseValue(i), coarseValue(i + vec3i(1, 0, 0)), f.x), mix(coarseValue(i + vec3i(0, 1, 0)), coarseValue(i + vec3i(1, 1, 0)), f.x), f.y),
      mix(mix(coarseValue(i + vec3i(0, 0, 1)), coarseValue(i + vec3i(1, 0, 1)), f.x),
        mix(coarseValue(i + vec3i(0, 1, 1)), coarseValue(i + vec3i(1, 1, 1)), f.x),
        f.y),
      f.z);
  }
  outputPressure[here.address] = f16(f32(pressure[here.address]) + correction);
}

@compute @workgroup_size(8, 4, 4)
fn prolongateBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = fineCell(group, local);
  if cell.valid {
    prolongateCell(cell.id, true);
  }
}

@compute @workgroup_size(64)
fn prolongateCoarseBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = brickCell(group, lane, outputLevel());
  if cell.valid {
    prolongateCell(cell.id, true);
  }
}

@compute @workgroup_size(64)
fn prolongateTiles(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = tileCell(group, lane, outputLevel());
  if cell.valid {
    prolongateCell(cell.id, false);
  }
}
`,mj=`// Sparse execution runs kernels over a list of bricks of 8x8x8 velocity cells. A list holds
// its count, then the id of each brick (tiles.wgsl), or for the zeroed bricks an id and a
// page. Dispatch X indexes the workgroup tiles of one brick; Y and Z index the listed brick.
const BRICK_LIST_SPLIT: u32 = 65535u;
fn listedBrick(group: vec3u) -> u32 {
  return group.y + group.z * BRICK_LIST_SPLIT;
}

fn brickTileCell(brick: vec3i, tile: u32, size: u32, workgroup: vec3u, local: vec3u) -> vec3i {
  let tiles = max(vec3u(1u), vec3u(size) / workgroup);
  let t = vec3u(tile % tiles.x, (tile / tiles.x) % tiles.y, tile / (tiles.x * tiles.y));
  return brick * i32(size) + vec3i(t * workgroup + local);
}
`,hj=`// Brick pools: sparse storage for grids that hold content in only a few of their bricks.
// Each brick with a slot owns one slot of a pool texture, a brick of \`1 << shift\` cells per
// side plus one texel per side: the brick's own cells, then one apron layer holding the
// first cells of the bricks after it on each axis, so a filtered sample based in a brick
// never leaves its slot. A brick's page is where its slot sits in the pool, in slots and
// packed eight bits an axis (x | y << 8 | z << 16), or -1 when the brick has no slot. The
// simulation finds pages through its tile directory (tiles.wgsl), the renderer through the
// page tables of its boxes (volume-bricks.wgsl). Pages and power-of-two bricks keep every
// address to shifts and multiplies: integer division is slow on GPUs.
// The slot at \`page\`, in a pool of \`side.x\` slots a row and \`side.y\` rows a layer: the
// slot's index in the free list and in every per-slot buffer.
fn poolSlot(page: i32, side: vec2f) -> u32 {
  let p = u32(page);
  return ((p >> 16u) * u32(side.y) + ((p >> 8u) & 255u)) * u32(side.x) + (p & 255u);
}

// The first texel of the slot at \`page\`, in a pool of bricks \`1 << shift\` cells wide.
fn poolOrigin(page: i32, shift: u32) -> vec3i {
  let p = u32(page);
  return vec3i(vec3u(p & 255u, (p >> 8u) & 255u, p >> 16u) * ((1u << shift) + 1u));
}
`,gj=`// Tiles: the sparse grid's directory (TileDirectory.ts). A tile is 4x4x4 bricks at integer
// coordinates of the world lattice: brick \`b\` lies in tile \`b >> 2\`. Each tile owns a tile
// slot; a brick's id is its tile slot * 64 plus its place in the tile, and indexes every
// per-brick array. The directory is read through integer textures, which leave a kernel's
// storage buffers to its fields: WebGPU allows only eight per stage by default.
// Every tile slot's record, a row of 8 texels: the tile's coordinates and state (0 free,
// 1 live, 2 closing: its bricks give up their slots this step), then its 27 neighbors'
// slots, -1 where there is no tile.
@group(0) @binding(63) var tileRecords: texture_2d<i32>;
// Tile coordinates hashed with open addressing, 256 entries a row: x, y, z and the tile
// slot, -1 when empty.
@group(0) @binding(64) var tileTable: texture_2d<i32>;
// Each brick id's entry, 64 a row (a tile slot's bricks): its page (pool.wgsl, 24 bits)
// with a flag for a slot given this step, or -1 without a slot. A brick computes exactly
// while it has a slot. Written by every step's allocation.
@group(0) @binding(65) var brickEntries: texture_2d<i32>;
// Each brick id's record, 7 texels per brick and a tile slot's bricks per row: its
// 27 neighbor entries and whether all its velocity cells are pressure unknowns. Built
// after allocation for every slotted brick; a released brick keeps its last record.
const BRICK_RECORD_TEXELS: u32 = 7u;
const BRICK_PRESSURE_FLAG: u32 = 27u;
@group(0) @binding(66) var brickRecords: texture_2d<i32>;
// A slot given this step: its apron does not copy its neighbors yet (fluid-zeroing.wgsl).
const FRESH_ENTRY: i32 = 0x2000000;
fn entryPage(entry: i32) -> i32 {
  return select(entry & 0xffffff, -1, entry < 0);
}

fn entryComputes(entry: i32) -> bool {
  return entry >= 0;
}

fn entryFresh(entry: i32) -> bool {
  return entry >= 0 && (entry & FRESH_ENTRY) != 0;
}

// The place of offset \`d\`, each axis -1 to 1, in a table of 27 neighbors.
fn neighborIndex(d: vec3i) -> u32 {
  return u32((d.z + 1) * 9 + (d.y + 1) * 3 + d.x + 1);
}

// Coordinates and state of the tile in slot \`tile\`.
fn tileRecord(tile: u32) -> vec4i {
  return textureLoad(tileRecords, vec2u(0u, tile), 0);
}

// The slot of neighbor \`n\` of the tile in slot \`tile\`.
fn tileNeighbor(tile: u32, n: u32) -> i32 {
  return textureLoad(tileRecords, vec2u(1u + n / 4u, tile), 0)[n % 4u];
}

fn tileHash(t: vec3i) -> u32 {
  let c = bitcast<vec3u>(t);
  return (c.x * 73856093u) ^ (c.y * 19349663u) ^ (c.z * 83492791u);
}

// The slot of the tile at \`t\`, or -1. The table is at most half full.
fn findTile(t: vec3i) -> i32 {
  let size = textureDimensions(tileTable);
  let mask = size.x * size.y - 1u;
  var h = tileHash(t) & mask;
  for (var probe = 0u; probe <= mask; probe++) {
    let entry = textureLoad(tileTable, vec2u(h & 255u, h >> 8u), 0);
    if entry.w < 0 {
      break;
    }
    if all(entry.xyz == t) {
      return entry.w;
    }
    h = (h + 1u) & mask;
  }
  return -1;
}

fn brickLocal(b: vec3i) -> u32 {
  let l = vec3u(b & vec3i(3));
  return (l.z * 4u + l.y) * 4u + l.x;
}

// The world brick of brick id \`id\`.
fn brickOf(id: u32) -> vec3i {
  let l = id & 63u;
  return tileRecord(id >> 6u).xyz * 4 + vec3i(vec3u(l & 3u, (l >> 2u) & 3u, l >> 4u));
}

fn entryById(id: u32) -> i32 {
  return textureLoad(brickEntries, vec2u(id & 63u, id >> 6u), 0).x;
}

// Word \`k\` of brick id \`id\`'s record.
fn recordWord(id: u32, k: u32) -> i32 {
  return textureLoad(brickRecords,
    vec2u((id & 63u) * BRICK_RECORD_TEXELS + k / 4u, id >> 6u),
    0)[k % 4u];
}

// Where an invocation works: a brick and its tile. Lookups within a brick of the home brick
// read its record, and lookups within a tile of the home tile read the tile's neighbors;
// the rest search the directory. \`id\` is -1 without a home brick, \`tile\` -1 without a home.
// \`inWorkgroup\` when the workgroup holds the home brick's record in \`homeRecord\`.
struct Home {
  brick: vec3i,
  id: i32,
  tileCoord: vec3i,
  tile: i32,
  inWorkgroup: bool
};

var<private> home: Home = Home(vec3i(0), -1, vec3i(0), -1, false);
// The home brick's record, loaded once by a workgroup that lies inside one brick.
var<workgroup> homeRecord: array<i32, 28>;
// Make brick id \`id\` home; \`recorded\` when its record describes its neighbors.
fn enterBrick(id: u32, recorded: bool) {
  let tile = id >> 6u;
  home = Home(brickOf(id), select(-1, i32(id), recorded), tileRecord(tile).xyz, i32(tile), false);
}

// Make tile slot \`tile\` home, without a home brick.
fn enterTile(tile: u32) {
  home = Home(vec3i(0), -1, tileRecord(tile).xyz, i32(tile), false);
}

// Load brick id \`id\`'s record into \`homeRecord\`: lane \`lane\` of the workgroup loads its
// texel, if \`load\`. Every lane must call this, then may read it.
fn loadHomeRecord(id: u32, lane: u32, load: bool) {
  if load && lane < 7u {
    let words = textureLoad(brickRecords,
      vec2u((id & 63u) * BRICK_RECORD_TEXELS + lane, id >> 6u),
      0);
    for (var k = 0u; k < 4u; k++) {
      homeRecord[lane * 4u + k] = words[k];
    }
  }
  workgroupBarrier();
}

// The slot of the tile at \`t\`, or -1.
fn tileAt(t: vec3i) -> i32 {
  if home.tile >= 0 {
    let d = t - home.tileCoord;
    if all(d == vec3i(0)) {
      return home.tile;
    }
    if all(abs(d) <= vec3i(1)) {
      return tileNeighbor(u32(home.tile), neighborIndex(d));
    }
  }
  return findTile(t);
}

// The id of world brick \`b\`, or -1 outside every tile.
fn brickId(b: vec3i) -> i32 {
  let tile = tileAt(b >> vec3u(2u));
  if tile < 0 {
    return -1;
  }
  return tile * 64 + i32(brickLocal(b));
}

// The entry of world brick \`b\`.
fn brickEntry(b: vec3i) -> i32 {
  if home.id >= 0 {
    let d = b - home.brick;
    if all(abs(d) <= vec3i(1)) {
      if home.inWorkgroup {
        return homeRecord[neighborIndex(d)];
      }
      return recordWord(u32(home.id), neighborIndex(d));
    }
  }
  let id = brickId(b);
  if id < 0 {
    return -1;
  }
  return entryById(u32(id));
}

// The page of world brick \`b\`, or -1 without a slot.
fn brickPage(b: vec3i) -> i32 {
  return entryPage(brickEntry(b));
}
`,_j=`// Solid cells: one bit per field cell of every brick with a slot, at the slot's place in
// the pool (fluid-allocation.wgsl buildSolids), so a solid test is a single read. Colliders are drawn
// into them; the ground is the half-space below world y = 0, in whole cells. Cells of
// bricks without a slot are open.
@group(0) @binding(71) var<storage, read> solids: array<u32>;
// The field cell holding world position \`w\`. On a coarser velocity grid a velocity cell's
// center lies exactly on a corner shared by field cells; the quarter-cell bias picks the
// same one in the fluid solver and the pressure solver, whatever the rounding.
fn fieldCell(w: vec3f) -> vec3i {
  return vec3i(floor(w / u.fieldGrid.xyz + .25));
}

// Whether field cell \`c\` is solid. \`u.counts.y\` counts the colliders, \`u.counts.w\` turns
// the ground on.
fn solidCell(c: vec3i) -> bool {
  if u.counts.w > .5 && c.y < 0 {
    return true;
  }
  if u.counts.y == 0.0 {
    return false;
  }
  let shift = u32(u.pool.w);
  let page = brickPage(c >> vec3u(shift));
  if page < 0 {
    return false;
  }
  let local = vec3u(c & vec3i((1 << shift) - 1));
  let bit = (((local.z << shift) | local.y) << shift) | local.x;
  let words = 1u << (3u * shift - 5u);
  return ((solids[poolSlot(page, u.pool.xy) * words + (bit >> 5u)] >> (bit & 31u)) & 1u) != 0u;
}

// Whether world position \`w\` lies in a solid cell.
fn solidAt(w: vec3f) -> bool {
  return solidCell(fieldCell(w));
}
`,vj={initializePressure:[0,2,4,6,8,12,63,64,65,66],relaxBricks:[0,1,2,4,6,8,12,63,64,65,66],relaxCoarseBricks:[0,1,2,4,6,8,12,63,64,65,66],relaxTiles:[0,1,2,4,6,8,63,64,65,66],relaxCoarse:[0,1,2,4,6,8,63,64,65,66],restrictBricks:[0,1,2,4,6,8,9,11,12,63,64,65,66],restrictTiles:[0,1,2,4,6,8,9,11,63,64,65,66],prolongateBricks:[0,1,3,4,6,8,9,12,63,64,65,66],prolongateCoarseBricks:[0,1,3,4,6,8,9,12,63,64,65,66],prolongateTiles:[0,1,3,4,6,8,9,63,64,65,66],buildBrickTopology:[0,6,10,12,63,64,65,66,71],buildTileTopology:[0,6,10,63,64,65,66,71]};function yj(e){let t={binding:e,visibility:GPUShaderStage.COMPUTE};return[0,6].includes(e)?t.buffer={type:`uniform`}:[4,10,11].includes(e)?t.buffer={type:`storage`}:e>=63&&e<=66?t.texture={sampleType:`sint`,viewDimension:`2d`}:t.buffer={type:`read-only-storage`},t}var bj=256,xj=65535,Sj=class e{device;uniform;pipelines=new Map;groups=new Map;uniforms=new Map;plans=new Map;levels=[];fineTopology;brickStorage=[];tileStorage=[];ids=new WeakMap;nextId=0;geometryDirty=!0;bricks;tiles=0;brickLevels;bottom;cells;constructor(e,t,n){this.device=e,this.uniform=t,this.brickLevels=Math.log2(n),this.bottom=this.brickLevels+2,this.cells=[...Array.from({length:this.brickLevels},(e,t)=>(n/2**t)**3),64,8,1]}static async create(t,n,r=8){let i=new e(t,n,r),a=t.createShaderModule({label:`Multigrid pressure solver`,code:[pj,mj,hj,gj,_j].join(`
`)}),o=(await a.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(o.length)throw Error(o.map(e=>`Pressure WGSL ${e.lineNum}: ${e.message}`).join(`
`));return await Promise.all(Object.entries(vj).map(async([e,n])=>{let r=t.createBindGroupLayout({entries:n.map(yj)});i.pipelines.set(e,await t.createComputePipelineAsync({label:`Multigrid ${e}`,layout:t.createPipelineLayout({bindGroupLayouts:[r]}),compute:{module:a,entryPoint:e}}))})),i}invalidateGeometry(){this.geometryDirty=!0}setBricks(e){let t=this.bricks?.slots;this.bricks=e,e.slots!==t&&this.allocateBricks(e.slots),e.tiles!==this.tiles&&this.allocateTiles(e.tiles),this.resetPlans()}resetPlans(){for(let e of this.uniforms.values())e.destroy();this.uniforms.clear(),this.groups.clear(),this.plans.clear(),this.geometryDirty=!0}storage(e,t,n){let r=this.device.createBuffer({label:t,size:Math.max(4,Math.ceil(n/4)*4),usage:GPUBufferUsage.STORAGE});return e.push(r),r}level(e,t,n){let r=n*this.cells[t],i=n=>this.storage(e,`Pressure level ${t} ${n}`,r*2);return{p:[i(`A`),i(`B`)],rhs:i(`right-hand side`),topology:this.storage(e,`Pressure level ${t} topology`,r),current:0}}allocateBricks(e){for(let e of this.brickStorage)e.destroy();this.brickStorage=[],this.fineTopology=this.storage(this.brickStorage,`Pressure level 0 topology`,e*this.cells[0]);for(let t=1;t<this.brickLevels;t++)this.levels[t]=this.level(this.brickStorage,t,e)}allocateTiles(e){for(let e of this.tileStorage)e.destroy();this.tileStorage=[];for(let t=this.brickLevels;t<=this.bottom;t++)this.levels[t]=this.level(this.tileStorage,t,e);this.tiles=e}get memoryBytes(){return[...this.brickStorage,...this.tileStorage,...this.uniforms.values()].reduce((e,t)=>e+t.size,0)}id(e){let t=this.ids.get(e);return t===void 0&&this.ids.set(e,t=this.nextId++),t}dimensions(e,t){let n=[...e,t].join(`/`),r=this.uniforms.get(n);return r||(r=this.device.createBuffer({label:`Pressure dimensions ${n}`,size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.device.queue.writeBuffer(r,0,new Uint32Array([...e,this.tiles*64,0,0,t,this.tiles,0,0,0])),this.uniforms.set(n,r)),r}prepare(e,t,n,r,i=1){let a=this.bricks,o={0:this.uniform,6:this.dimensions(t,i),12:i===2?a.zeroed:a.list,71:a.solids,63:a.directory.tiles,64:a.directory.table,65:a.directory.entries,66:a.directory.bricks,...n},s=vj[e],c=e+`:`+s.map(e=>this.id(o[e])).join(`|`),l=this.pipelines.get(e),u=this.groups.get(c);return u||(u=this.device.createBindGroup({label:`Multigrid ${e}`,layout:l.getBindGroupLayout(0),entries:s.map(e=>({binding:e,resource:yj(e).texture?o[e].createView():{buffer:o[e]}}))}),this.groups.set(c,u)),{pipeline:l,group:u,workgroups:r}}topology(e){return e===0?this.fineTopology:this.levels[e].topology}buildTopology(e){let t=this.tiles*64,n=[Math.min(t,xj),Math.ceil(t/xj),1];for(let t=0;t<this.brickLevels;t++)e(this.prepare(`buildBrickTopology`,[t,t,t,0],{10:this.topology(t)},n,0));for(let t=this.brickLevels;t<=this.bottom;t++)e(this.prepare(`buildTileTopology`,[t,t,t,0],{10:this.topology(t)},[Math.ceil(this.tiles*this.cells[t]/4/256),1,1]))}plan(e){let t=this.bricks,n=[],r=e=>({buffer:t.dispatch,offset:e}),i=(e,n)=>e===`initializePressure`||e===`relaxBricks`||e===`prolongateBricks`?r(t.offsets.tiles):e.endsWith(`Bricks`)?r(this.cells[n]===8?t.offsets.octets:t.offsets.coarse[n-1]):e===`relaxCoarse`?[1,1,1]:[this.tiles,1,1],a=(e,t,r)=>n.push(this.prepare(e,t,r,i(e,t[1])));for(let e=0;e<this.brickLevels;e++)n.push(this.prepare(`buildBrickTopology`,[e,e,e,0],{10:this.topology(e)},r(t.offsets.zeroed),2));let o=e=>e===0?`relaxBricks`:e<this.brickLevels?`relaxCoarseBricks`:`relaxTiles`,s=!0,c=(e,t)=>{let n=this.levels[e];for(let r=0;r<t;r++){let t=e===0&&s;a(t?`initializePressure`:o(e),[e,e,e,0],{1:n.p[n.current],2:n.rhs,4:n.p[1-n.current],8:n.topology}),n.current=1-n.current,t&&(s=!1)}},l=e=>{let t=this.levels[e];if(e===this.bottom){this.tiles<=bj?(a(`relaxCoarse`,[e,e,e,19],{1:t.p[t.current],2:t.rhs,4:t.p[1-t.current],8:t.topology}),t.current=1-t.current):c(e,19);return}c(e,e>0?2:1);let n=this.levels[e+1];a(e+1<this.brickLevels?`restrictBricks`:`restrictTiles`,[e,e+1,e+1,0],{1:t.p[t.current],2:t.rhs,4:n.rhs,8:t.topology,9:n.topology,11:n.p[1]}),n.current=1,l(e+1),a(e===0?`prolongateBricks`:e<this.brickLevels?`prolongateCoarseBricks`:`prolongateTiles`,[e,e,e+1,0],{1:t.p[t.current],3:n.p[n.current],4:t.p[1-t.current],8:t.topology,9:n.topology}),t.current=1-t.current,c(e,3)};for(let t=0;t<e;t++)l(0);return{commands:n,current:this.levels[0].current}}solve(e,t,n,r){if(!this.bricks)throw Error(`Set the bricks before solving.`);this.levels[0]={p:t,rhs:n,topology:this.fineTopology,current:0};let i=un(this.device,e,{label:`Multigrid V-cycles`}),a=({pipeline:e,group:t,workgroups:n})=>{i.setPipeline(e),i.setBindGroup(0,t),Array.isArray(n)?i.dispatchWorkgroups(...n):i.dispatchWorkgroupsIndirect(n.buffer,n.offset)};this.geometryDirty&&=(this.buildTopology(a),!1);let o=`${r}/${this.id(t[0])}/${this.id(t[1])}/${this.id(n)}`,s=this.plans.get(o);s||(s=this.plan(r),this.plans.set(o,s));for(let e of s.commands)a(e);return i.end(),t[s.current]}dispose(){for(let e of[...this.brickStorage,...this.tileStorage])e.destroy();this.brickStorage=[],this.tileStorage=[],this.levels=[],this.fineTopology=void 0,this.tiles=0,this.bricks=void 0,this.resetPlans(),this.pipelines.clear()}},Cj=`fn hash(p: vec3f) -> f32 {
  var v = (bitcast<vec3u>(vec3i(p)) & vec3u(15u)) * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> vec3u(16u);
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return f32(v.x >> 8u) / 16777216.0;
}

fn noiseGradient(p: vec3f) -> vec3f {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let ds = 30.0 * f * f * (f - 1.0) * (f - 1.0);
  let a = hash(i);
  let b = hash(i + vec3f(1, 0, 0));
  let c = hash(i + vec3f(0, 1, 0));
  let d = hash(i + vec3f(1, 1, 0));
  let e = hash(i + vec3f(0, 0, 1));
  let f1 = hash(i + vec3f(1, 0, 1));
  let g = hash(i + vec3f(0, 1, 1));
  let h = hash(i + vec3f(1, 1, 1));
  return vec3f(
    mix(mix(b - a, d - c, s.y), mix(f1 - e, h - g, s.y), s.z),
    mix(mix(c - a, d - b, s.x), mix(g - e, h - f1, s.x), s.z),
    mix(mix(e - a, f1 - b, s.x), mix(g - c, h - d, s.x), s.y)
  ) * ds;
}

@group(0) @binding(0) var outputNoise: texture_storage_3d<rgba16float, write>;
@compute @workgroup_size(8, 4, 4)
fn buildNoise(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(outputNoise);
  if any(id >= size) {
    return;
  }
  let p = (vec3f(id) + .5) / vec3f(size) * 16.0;
  let dx = noiseGradient(p);
  let dy = noiseGradient(p + vec3f(7.1, 3.7, 11.3));
  let dz = noiseGradient(p + vec3f(5.2, 7.9, 9.5));
  textureStore(outputNoise, id, vec4f(dz.y - dy.z, dx.z - dz.x, dy.x - dx.y, 0));
}
`;async function wj(e){let t=e.createShaderModule({label:`Periodic curl noise`,code:Cj}),n=(await t.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(n.length)throw Error(n.map(e=>`Noise WGSL ${e.lineNum}: ${e.message}`).join(`
`));let r=await e.createComputePipelineAsync({label:`Generate curl noise`,layout:`auto`,compute:{module:t,entryPoint:`buildNoise`}}),i=e.createTexture({label:`Periodic curl noise (2 MiB)`,dimension:`3d`,size:[64,64,64],format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});try{let t=e.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:i.createView()}]}),n=e.createCommandEncoder(),a=un(e,n,{label:`Generate curl noise`});return a.setPipeline(r),a.setBindGroup(0,t),a.dispatchWorkgroups(8,16,16),a.end(),e.queue.submit([n.finish()]),{texture:i,sampler:e.createSampler({minFilter:`linear`,magFilter:`linear`,addressModeU:`repeat`,addressModeV:`repeat`,addressModeW:`repeat`})}}catch(e){throw i.destroy(),e}}var Tj=`// Shared MAC velocity sampling, RK2 traces, and packed donor addresses.
// Assembled with the other fluid modules by ShaderSources.ts.
// MAC velocity sampling and cached RK2 traces
// Bricks without a slot hold still air, and nothing lies below the ground.
fn cellVelocity(p: vec3i) -> vec3f {
  return loadCell(velocity, p, u.velocityGrid.xyz).xyz;
}

// Velocity components live on each cell's positive faces (a staggered MAC grid).
fn velocityComponentAt(position: vec3f, component: u32) -> f32 {
  let spacing = u.velocityGrid.xyz;
  var faceOffset = vec3f(0);
  faceOffset[component] = .5 * spacing[component];
  return sampleAt(velocity, position - faceOffset, spacing)[component];
}

fn velocityAt(position: vec3f) -> vec3f {
  return vec3f(velocityComponentAt(position, 0u),
    velocityComponentAt(position, 1u),
    velocityComponentAt(position, 2u));
}

// At a MAC face its normal component is already stored in this cell. Reuse it;
// only the two tangential components need interpolation. Work in cell coordinates
// so constructing these exact half-cell offsets does not round through world space.
fn velocityOnFace(id: vec3i, component: u32, originalVelocity: vec3f) -> vec3f {
  var facePosition = vec3f(id) + .5;
  facePosition[component] += .5;
  if component == 0u {
    return vec3f(originalVelocity.x,
      sampleCells(velocity, facePosition - vec3f(0, .5, 0), u.velocityGrid.xyz).y,
      sampleCells(velocity, facePosition - vec3f(0, 0, .5), u.velocityGrid.xyz).z);
  }
  if component == 1u {
    return vec3f(sampleCells(velocity, facePosition - vec3f(.5, 0, 0), u.velocityGrid.xyz).x,
      originalVelocity.y, sampleCells(velocity,
        facePosition - vec3f(0, 0, .5),
        u.velocityGrid.xyz).z);
  }
  return vec3f(sampleCells(velocity, facePosition - vec3f(.5, 0, 0), u.velocityGrid.xyz).x,
    sampleCells(velocity,
      facePosition - vec3f(0, .5, 0),
      u.velocityGrid.xyz).y, originalVelocity.z);
}

// A cell's RK2 traces over one step from its center: back to its donors, and forward for
// the MacCormack reverse sample. Both start from the velocity at the center, sampled when
// first needed.
struct CellTrace {
  position: vec3f,
  velocity: vec3f,
  velocitySampled: bool
};

fn cellTrace(id: vec3i) -> CellTrace {
  return CellTrace(center(id), vec3f(0), false);
}

fn traceVelocity(trace: ptr<function, CellTrace>) -> vec3f {
  if !(*trace).velocitySampled {
    (*trace).velocity = velocityAt((*trace).position);
    (*trace).velocitySampled = true;
  }
  return (*trace).velocity;
}

fn traceBack(trace: ptr<function, CellTrace>) -> vec3f {
  let centerVelocity = traceVelocity(trace);
  return (*trace).position - u.grid.w * velocityAt((*trace).position - .5 * u.grid.w * centerVelocity);
}

fn traceForward(trace: ptr<function, CellTrace>) -> vec3f {
  let centerVelocity = traceVelocity(trace);
  return (*trace).position + u.grid.w * velocityAt((*trace).position + .5 * u.grid.w * centerVelocity);
}

// Where a backward trace landed: the base cell of its trilinear sample, whose donors bound
// the correction. The advection kernels store it as an offset from the cell that traced,
// \`bits\` bits an axis, so the corrections need not trace back again. Past that range they
// store noDonor(bits), and the correction traces again.
// Velocity u16: [15: retrace][14..10: Z][9..5: Y][4..0: X]. X/Y faces share
// one u32; the Z face uses the next u32. Offsets are biased signed integers.
const VELOCITY_DONOR_BITS: u32 = 5u;
fn noDonor(bits: u32) -> u32 {
  return 1u << (3u * bits);
}

fn packDonor(offset: vec3i, bits: u32) -> u32 {
  let biased = offset + (1 << (bits - 1u));
  if any(biased < vec3i(0)) || any(biased >= vec3i(1 << bits)) {
    return noDonor(bits);
  }
  let b = vec3u(biased);
  return b.x | (b.y << bits) | (b.z << (2u * bits));
}

fn unpackDonor(word: u32, bits: u32) -> vec3i {
  let axes = vec3u(word, word >> bits, word >> (2u * bits)) & vec3u((1u << bits) - 1u);
  return vec3i(axes) - (1 << (bits - 1u));
}
`,Ej=`// Deterministic slot allocation, neighbor records, collider masks, and dispatch lists.
// Assembled with the other fluid modules by ShaderSources.ts.
// A brick holds a slot while it computes: when occupied cells request it for their
// stencil/motion halo, or an emitter requests it. Mesh emitters retain a full-brick
// margin. A slot given this step starts as still, empty
// air, and its apron does not copy its neighbors until they next write: for that step its
// entry is marked fresh (tiles.wgsl), and samples reaching its apron read cell by cell.
// Bricks of closing tiles give up their slots, and every brick of a held tile computes.
// Flags: bit 0 makes every brick compute, bit 1 treats every brick as computing last
// step, so all others are zeroed.
@group(0) @binding(41) var<storage, read_write> activeBricks: array<atomic<u32>>;
@group(0) @binding(43) var<storage, read_write> dispatchArgs: array<u32>;
// Each brick id's page, or -1, which the allocator keeps; it publishes them with whether
// each brick computes as the directory's entries (tiles.wgsl).
@group(0) @binding(45) var<storage, read_write> pagesOut: array<i32>;
@group(0) @binding(69) var entriesOut: texture_storage_2d<r32sint, write>;
// A stack of free slots: \`free\` counts them, and \`failures\` counts the slots the pool
// could not grant since the host last read it.
@group(0) @binding(46) var<storage, read_write> freeSlots: array<u32>;
struct PoolState {
  free: atomic<i32>,
  failures: atomic<u32>,
  reserved: vec2u
};

@group(0) @binding(47) var<storage, read_write> poolState: PoolState;
// Bricks whose slots are zeroed this step: a count, then each brick id and its page.
// FRESH_SLOT marks a slot just allocated, whose apron is zeroed too.
@group(0) @binding(48) var<storage, read_write> zeroBricks: array<atomic<u32>>;
const FRESH_SLOT: u32 = 0x80000000u;
// Slots are freed and taken in brick id order (tile slot, then brick), so a run hands out
// the same slots every time: filtered samples round a little differently in different
// slots. Each block of bricks counts the slots its bricks free and request. A block's
// first ranks are the sums of the counts before it.
const RANK_BLOCK: u32 = 256u;
@group(0) @binding(57) var<storage, read_write> blockRanks: array<vec2u>;
var<workgroup> rankScan: array<vec2u, 256>;
// Brick state: bit 0 computes, 2 computed last step, 3 frees its slot, 4 requests one;
// bits 8 to 15 and 16 to 23 rank the free and the request in its block.
const BRICK_FREES: u32 = 8u;
const BRICK_REQUESTS: u32 = 16u;
fn brickCount() -> u32 {
  return u32(u.bricks.x);
}

fn rankBlocks() -> u32 {
  return (brickCount() + RANK_BLOCK - 1u) / RANK_BLOCK;
}

struct WorkgroupScan {
  before: vec2u,
  total: vec2u
};

// The sum of \`value\` over the lanes before this one, and over all of them. Every lane of
// a 256-lane workgroup must call it.
fn scanWorkgroup(value: vec2u, lane: u32) -> WorkgroupScan {
  rankScan[lane] = value;
  workgroupBarrier();
  for (var offset = 1u; offset < RANK_BLOCK; offset <<= 1u) {
    var sum = rankScan[lane];
    if lane >= offset {
      sum += rankScan[lane - offset];
    }
    workgroupBarrier();
    rankScan[lane] = sum;
    workgroupBarrier();
  }
  let total = rankScan[RANK_BLOCK - 1u];
  let result = WorkgroupScan(rankScan[lane] - value, total);
  workgroupBarrier();
  return result;
}

// A brick's rank among the frees (x) or requests (y) of the step.
fn brickRank(index: u32, state: u32) -> vec2u {
  return vec2u((state >> 8u) & 255u, (state >> 16u) & 255u) + blocksBefore(index / RANK_BLOCK);
}

// The frees (x) and requests (y) of the blocks before \`block\`; of them all at rankBlocks().
fn blocksBefore(block: u32) -> vec2u {
  var sum = vec2u(0);
  for (var i = 0u; i < block; i++) {
    sum += blockRanks[i];
  }
  return sum;
}

// Source coverage with the same stencil/motion margin used for occupied cells.
fn sourceNear(b: vec3i) -> bool {
  let size = f32(1u << u32(u.pool.w)) * u.fieldGrid.xyz;
  let lo = vec3f(b) * size;
  let hi = (vec3f(b) + 1.0) * size;
  let list = tileList(EMITTERS);
  for (var i = 0u; i < list.y; i++) {
    let e = emitters[tileLists[list.x + i]];
    if e.position.w < .5 {
      continue;
    }
    let motion = abs(e.velocity.xyz) + abs(e.velocity.w);
    let pad = min(size, 2.0 * u.velocityGrid.xyz + motion * u.grid.w);
    let extent = max(e.size.xyz, vec3f(.03)) + pad;
    if all(e.position.xyz + extent > lo) && all(e.position.xyz - extent < hi) {
      return true;
    }
  }
  return false;
}

fn zeroBrick(id: u32, payload: u32) {
  let i = atomicAdd(&zeroBricks[0], 1u);
  atomicStore(&zeroBricks[1u + 2u * i], id);
  atomicStore(&zeroBricks[2u + 2u * i], payload);
}

// The page of free-list slot \`slot\` (pool.wgsl).
fn slotPage(slot: u32) -> i32 {
  let row = u32(u.pool.x);
  let rows = u32(u.pool.y);
  return i32((slot % row) | (((slot / row) % rows) << 8u) | ((slot / (row * rows)) << 16u));
}

// Free slots the voxel budget holds back: the bottom of the stack.
fn heldSlots() -> i32 {
  return i32(u.pool.z);
}

// Decides each brick's state, and ranks the slots bricks free and request.
@compute @workgroup_size(256)
fn buildBricks(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(local_invocation_index) lane: u32,
  @builtin(workgroup_id) group: vec3u
) {
  let index = gid.x;
  var state = 0u;
  if index < brickCount() && tileRecord(index >> 6u).w != 0 {
    enterBrick(index, false);
    let b = home.brick;
    let open = tileRecord(index >> 6u).w != 2;
    var listed = false;
    for (var z = -1; z <= 1 && open && !listed; z++) {
      for (var y = -1; y <= 1 && !listed; y++) {
        for (var x = -1; x <= 1 && !listed; x++) {
          let neighbor = brickId(b + vec3i(x, y, z));
          if neighbor < 0 {
            continue;
          }
          let toward = neighborIndex(-vec3i(x, y, z));
          listed = ((atomicLoad(&activity[neighbor]) >> 3u) & (1u << toward)) != 0u || meshTable(neighbor) >= 0;
        }
      }
    }
    if open && !listed {
      listed = sourceNear(b);
    }
    let page = pagesOut[index];
    let wasListed = (brickState[index] & 1u) != 0u;
    state = u32(listed) | (u32(wasListed) << 2u);
    if !listed && page >= 0 {
      state |= BRICK_FREES;
    }
    if listed && page < 0 {
      state |= BRICK_REQUESTS;
    }
  }
  let ranks = scanWorkgroup(vec2u(u32((state & BRICK_FREES) != 0u), u32((state & BRICK_REQUESTS) != 0u)),
    lane);
  if lane == 0u {
    blockRanks[group.x] = ranks.total;
  }
  if index < brickCount() {
    brickState[index] = state | (ranks.before.x << 8u) | (ranks.before.y << 16u);
  }
}

// Bricks that stop computing push their slots onto the stack in brick order, and are
// zeroed: their interior, and the aprons of the bricks before them.
@compute @workgroup_size(64)
fn freeBricks(@builtin(global_invocation_id) gid: vec3u) {
  let index = gid.x;
  if index >= brickCount() {
    return;
  }
  let state = brickState[index];
  if (state & BRICK_FREES) == 0u {
    return;
  }
  let page = pagesOut[index];
  freeSlots[u32(atomicLoad(&poolState.free)) + brickRank(index, state).x] = pageSlot(page);
  if (state & 4u) != 0u {
    zeroBrick(index, u32(page));
  }
  pagesOut[index] = -1;
}

// Gives the bricks that compute slots from the top of the stack in brick order, then lists
// them and the fresh slots to zero. Requests past the free slots, down to the held-back
// ones, fail, and those bricks do not compute.
@compute @workgroup_size(64)
fn allocateBricks(@builtin(global_invocation_id) gid: vec3u) {
  let index = gid.x;
  if index >= brickCount() {
    return;
  }
  let state = brickState[index];
  let listed = (state & 1u) != 0u;
  var page = pagesOut[index];
  var fresh = false;
  if (state & BRICK_REQUESTS) != 0u {
    let freed = i32(blocksBefore(rankBlocks()).x);
    let top = atomicLoad(&poolState.free) + freed - i32(brickRank(index, state).y);
    if top > heldSlots() {
      page = slotPage(freeSlots[u32(top - 1)]);
      pagesOut[index] = page;
      zeroBrick(index, u32(page) | FRESH_SLOT);
      fresh = true;
    }
  }
  if page >= 0 {
    atomicStore(&activeBricks[atomicAdd(&activeBricks[0], 1u) + 1u], index);
  }
  brickState[index] = u32(page >= 0);
  let entry = select(-1, page | select(0, FRESH_ENTRY, fresh), page >= 0);
  textureStore(entriesOut, vec2u(index & 63u, index >> 6u), vec4i(entry, 0, 0, 0));
  // This step's evolution records content and expansion afresh. A brick whose last
  // evolution produced expansion may still hold it.
  let flags = atomicLoad(&activity[index]);
  atomicStore(&activity[index], select(0u, MAY_EXPAND, (flags & EXPANDS) != 0u));
}

// Each slotted brick's record: 27 neighbor entries and the pressure-unknown flag.
@group(0) @binding(67) var recordsOut: texture_storage_2d<rgba32sint, write>;
@compute @workgroup_size(64)
fn linkBricks(@builtin(global_invocation_id) gid: vec3u) {
  let index = gid.x;
  if index >= brickCount() || entryById(index) < 0 {
    return;
  }
  enterBrick(index, false);
  var words: array<i32, 28>;
  for (var k = 0u; k < 27u; k++) {
    let d = vec3i(i32(k % 3u), i32((k / 3u) % 3u), i32(k / 9u)) - 1;
    let neighbor = brickId(home.brick + d);
    words[k] = select(-1, entryById(u32(max(neighbor, 0))), neighbor >= 0);
  }
  // Whether every velocity cell of the brick is a pressure unknown (pressure.wgsl
  // activeCell): it and its negative neighbors compute, those below the ground aside.
  var unknowns = 1;
  for (var k = 0u; k < 8u; k++) {
    let d = -vec3i(vec3u(k, k >> 1u, k >> 2u) & vec3u(1u));
    if u.counts.w > .5 && home.brick.y + d.y < 0 {
      continue;
    }
    if words[neighborIndex(d)] < 0 {
      unknowns = 0;
    }
  }
  words[BRICK_PRESSURE_FLAG] = unknowns;
  let row = index >> 6u;
  let column = (index & 63u) * BRICK_RECORD_TEXELS;
  for (var t = 0u; t < 7u; t++) {
    let k = t * 4u;
    textureStore(recordsOut,
      vec2u(column + t, row),
      vec4i(words[k], words[k + 1u], words[k + 2u], words[k + 3u]));
  }
}

// Draws the colliders into the solids (solids.wgsl) of the bricks given slots this step,
// from the zeroed list, or of every brick with a slot when \`u.counts.x\` is set, after the
// colliders changed. A workgroup per brick, a word of 32 cells per lane and pass.
@group(0) @binding(72) var<storage, read_write> solidsOut: array<u32>;
fn insideCollider(c: Collider, cell: vec3i) -> bool {
  let kind = u32(c.center.w);
  if kind == 2u {
    let q = cell - c.lo.xyz;
    if any(q < vec3i(0)) || any(q >= c.size.xyz) {
      return false;
    }
    let index = u32((q.z * c.size.y + q.y) * c.size.x + q.x);
    return ((colliderMasks[u32(c.lo.w) + (index >> 5u)] >> (index & 31u)) & 1u) != 0u;
  }
  let w = (vec3f(cell) + .5) * u.fieldGrid.xyz;
  let d = abs((transpose(c.axes) * (w - c.center.xyz)) / c.extent.xyz);
  if kind == 1u {
    return all(d < vec3f(1));
  }
  return dot(d, d) < 1.0;
}

@compute @workgroup_size(64)
fn buildSolids(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  var id: u32;
  var page: i32;
  if u.counts.x > .5 {
    id = group.x + group.y * BRICK_LIST_SPLIT;
    if id >= brickCount() {
      return;
    }
    page = entryPage(entryById(id));
  } else {
    let index = listedBrick(group);
    if index >= zeroList[0] {
      return;
    }
    id = zeroList[1u + 2u * index];
    let payload = zeroList[2u + 2u * index];
    if (payload & FRESH_SLOT) == 0u {
      return;
    }
    page = i32(payload & 0xffffffu);
  }
  if page < 0 {
    return;
  }
  enterBrick(id, false);
  let shift = u32(u.pool.w);
  let side = 1u << shift;
  let words = 1u << (3u * shift - 5u);
  let first = poolSlot(page, u.pool.xy) * words;
  let origin = home.brick * i32(side);
  let list = tileList(COLLIDERS);
  for (var word = lane; word < words; word += 64u) {
    var bits = 0u;
    for (var k = 0u; k < 32u; k++) {
      let bit = word * 32u + k;
      let cell = origin + vec3i(vec3u(bit & (side - 1u),
          (bit >> shift) & (side - 1u),
          bit >> (2u * shift)));
      for (var i = 0u; i < list.y; i++) {
        if insideCollider(colliders[tileLists[list.x + i]], cell) {
          bits |= 1u << k;
          break;
        }
      }
    }
    solidsOut[first + word] = bits;
  }
}

fn writeDispatch(offset: u32, tiles: u32, count: u32) {
  dispatchArgs[offset] = tiles;
  dispatchArgs[offset + 1u] = min(count, BRICK_LIST_SPLIT);
  dispatchArgs[offset + 2u] = (count + BRICK_LIST_SPLIT - 1u) / BRICK_LIST_SPLIT;
}

// Commits the step's frees and grants to the stack, then writes indirect dispatch sizes:
// active bricks for 8x4x4 and 8x8x4 velocity kernels and 8x4x4 field kernels, then
// zeroed bricks for velocity and field kernels.
@compute @workgroup_size(1)
fn finishBricks() {
  let totals = blocksBefore(rankBlocks());
  let free = atomicLoad(&poolState.free) + i32(totals.x);
  let granted = min(i32(totals.y), max(free - heldSlots(), 0));
  atomicStore(&poolState.free, free - granted);
  atomicAdd(&poolState.failures, totals.y - u32(granted));
  for (var i = 0u; i < rankBlocks(); i++) {
    blockRanks[i] = vec2u(0);
  }
  let listed = atomicLoad(&activeBricks[0]);
  let zeroed = atomicLoad(&zeroBricks[0]);
  let side = 1u << u32(u.velocityGrid.w);
  let velocityTiles = max(1u, side / 8u) * max(1u, side / 4u) * max(1u, side / 4u);
  let tallTiles = max(1u, side / 8u) * max(1u, side / 8u) * max(1u, side / 4u);
  let fieldTiles = (1u << (3u * u32(u.pool.w))) / 128u;
  writeDispatch(0u, velocityTiles, listed);
  writeDispatch(3u, tallTiles, listed);
  writeDispatch(6u, fieldTiles, listed);
  // Independent 64-lane chunks include the coarse smoke cache's apron.
  let smokeEdge = (1u << u32(u.noise.w)) + 1u;
  writeDispatch(36u, (smokeEdge * smokeEdge * smokeEdge + 63u) / 64u, listed);
  writeDispatch(9u, velocityTiles, zeroed);
  writeDispatch(12u, fieldTiles, zeroed);
  // For the pressure levels in each brick's slot (pressure.wgsl): a workgroup per listed
  // brick, per zeroed brick, and per eight listed bricks.
  writeDispatch(15u, 1u, listed);
  writeDispatch(18u, 1u, zeroed);
  writeDispatch(21u, 1u, (listed + 7u) / 8u);
  // 64-lane chunks for each possible coarse slot level. The 2³ level uses octets.
  for (var level = 1u; level < 5u; level++) {
    let shift = u32(u.velocityGrid.w) - min(level, u32(u.velocityGrid.w));
    let cells = 1u << (3u * shift);
    writeDispatch(24u + (level - 1u) * 3u, max(1u, cells / 64u), listed);
  }
}
`,Dj=`// Shared fluid records, resource bindings, and numerical helpers.
// Assembled with the other fluid modules by ShaderSources.ts.
// Specialized at pipeline creation: disabled scalar kernels omit correction work.
override SCALAR_MACCORMACK: bool = true;
// 0.1% of one authored scalar unit. A joint smoke, heat and fuel floor clears numerical
// tails without cutting active flames or preventing weak sources accumulating.
const DORMANT_CUTOFF: f32 = 0.001;
fn clearDormant(v: vec4f, injected: bool) -> vec4f {
  if !injected && v.z == 0.0 && all(v.xyw < vec3f(DORMANT_CUTOFF)) {
    return vec4f(0);
  }
  return v;
}

// Host records and resource bindings
// All host-visible records use vec4 slots: no implicit vec3 padding.
// The grids are lattices of world space: cell \`c\` of a grid with cell size \`s\` spans
// \`c * s\` to \`(c + 1) * s\` meters. Velocity and pressure may use a coarser grid than the
// flame, heat, smoke and fuel fields. \`grid\` is the grid a kernel writes; the other two
// name both grids.
struct Params {
  grid: vec4f, // cell size in meters, dt
  forces: vec4f, // buoyancy, cooling, smoke weight, velocity damping
  dynamics: vec4f, // dissipation, vorticity, content cutoff, lifetime known to be zero
  noise: vec4f, // time, seed, smoke divisor, log2 smoke cells per brick
  counts: vec4f, // solids of every brick (buildSolids), colliders, mesh source records, ground
  velocityGrid: vec4f, // velocity and pressure cell size, log2 velocity cells per brick
  fieldGrid: vec4f, // flame, heat, smoke and fuel cell size
  pool: vec4f, // slots per row and rows per layer of the brick pools (pool.wgsl), held-back slots, log2 of the field brick size
  bricks: vec4f, // brick ids (tile slots * 64)
  fuel: vec4f, // ignition heat, burn rate (1/s), fuel enabled, predictor borrowed by rendering
};

struct Emitter {
  position: vec4f,
  size: vec4f,
  rates: vec4f,
  velocity: vec4f,
  variation: vec4f, // Perlin period (meters), strength, fuel rate, reserved
};

// A collider in world space. \`center.w\` is its kind: 0 an ellipsoid of radii \`extent\`, 1 a
// box of half extents \`extent\` along the columns of \`axes\`, 2 mesh occupancy of \`size\`
// lattice cells from cell \`lo\`, whose first word in \`colliderMasks\` is \`lo.w\`.
struct Collider {
  center: vec4f,
  extent: vec4f,
  axes: mat3x3f,
  lo: vec4i,
  size: vec4i
};

struct MeshSource {
  cell: vec4i,
  scalar: vec4f,
  motion: vec4f
}; // cell: lattice cell
@group(0) @binding(0) var<uniform> u: Params;
@group(0) @binding(1) var velocity: texture_3d<f32>;
// Scalar channels: X smoke, Y heat, Z remaining flame lifetime, W fuel.
// With coarse smoke, X stages source production; smokeDensity owns the density.
@group(0) @binding(2) var fields: texture_3d<f32>;
// Per-pass input: velocity predictor for correction, scalar predictor for
// evolution, or curl XYZ / magnitude W for forces (FluidSimulation.step).
@group(0) @binding(3) var auxiliary: texture_3d<f32>;
@group(0) @binding(6) var outputVector: texture_storage_3d<rgba16float, write>;
@group(0) @binding(8) var linearSampler: sampler;
@group(0) @binding(9) var<storage, read> emitters: array<Emitter>;
@group(0) @binding(10) var<storage, read> colliders: array<Collider>;
@group(0) @binding(11) var turbulenceNoise: texture_3d<f32>;
@group(0) @binding(12) var repeatSampler: sampler;
@group(0) @binding(15) var expansionRate: texture_3d<f32>;
@group(0) @binding(16) var outputExpansion: texture_storage_3d<r16float, write>;
@group(0) @binding(19) var outputVelocityMax: texture_storage_3d<rgba16float, write>;
@group(0) @binding(20) var velocityMin: texture_3d<f32>;
@group(0) @binding(21) var velocityMax: texture_3d<f32>;
@group(0) @binding(22) var<uniform> flameParams: FlameParams;
@group(0) @binding(23) var<storage, read> flameKnots: array<vec2f>;
// Mesh colliders' occupancy, one bit per lattice cell, with each mask word-aligned.
@group(0) @binding(25) var<storage, read> colliderMasks: array<u32>;
// Mesh emission by brick: each brick id's table, or -1, then the tables, which hold each
// field cell's record in \`meshSources\` (0 for none).
@group(0) @binding(26) var<storage, read> meshTables: array<i32>;
@group(0) @binding(27) var<storage, read> meshSources: array<MeshSource>;
// What reaches each tile slot: 8 words a tile, the first index and count of its emitters,
// forces and colliders in the rest of the array, which lists their indices.
@group(0) @binding(70) var<storage, read> tileLists: array<u32>;
const EMITTERS: u32 = 0u;
const FORCES: u32 = 1u;
const COLLIDERS: u32 = 2u;
// The home tile's list of \`kind\`: its first index and count.
fn tileList(kind: u32) -> vec2u {
  let header = u32(home.tile) * 8u + kind * 2u;
  return vec2u(tileLists[header], tileLists[header + 1u]);
}

@group(0) @binding(29) var outputVelocityMin: texture_storage_3d<rgba16float, write>;
// Where each cell's backward trace landed (packDonor). Velocity correction finishes
// before scalar advection starts, so both reuse one compact pool with no aprons.
// Scalars store four words of packed half bounds. Velocity
// packs its three u16 donors into two texels' X words in either pool format.
@group(0) @binding(5) var donorCells: texture_3d<u32>;
@group(0) @binding(13) var outputScalarDonors: texture_storage_3d<rgba32uint, write>;
// The active bricks this dispatch covers. Every 3D field and velocity texture is a brick
// pool (pool.wgsl), whose slots the tile directory finds (tiles.wgsl).
@group(0) @binding(37) var<storage, read> brickList: array<u32>;
// Rounds to half precision toward zero, as storing to a half-float texture does on Apple
// GPUs: values that skip a texture between kernels keep the same precision.
fn truncateHalf(v: vec4f) -> vec4f {
  // Below 2^-14 halves are subnormal, multiples of 2^-24; above, ten mantissa bits remain.
  let subnormal = trunc(v * 16777216.0) / 16777216.0;
  let normal = bitcast<vec4f>(bitcast<vec4u>(v) & vec4u(0xffffe000u));
  return select(normal, subnormal, abs(v) < vec4f(6.103515625e-5));
}
`,Oj=`// Content flags and motion support that keep sparse bricks active.
// Assembled with the other fluid modules by ShaderSources.ts.
// Content tracking and sparse brick allocation
// Cells that still hold flame, smoke or fuel above the cutoff. Their bricks
// request padding from the occupied cells, not the entire brick. Their tiles stay
// with a tile of margin. Each
// workgroup reduces first, so the global atomics see one update per group.
// Flags per brick: CONTENT, this step's evolution found content; EXPANDS, it produced a
// nonzero expansion rate; MAY_EXPAND, the brick's slot may still hold one, so evolution
// stores it even where it is zero.
const CONTENT: u32 = 1u;
const EXPANDS: u32 = 2u;
const MAY_EXPAND: u32 = 4u;
// Bits 3..29 request one of the 27 neighboring bricks (including self).
// The flags of every brick id; then per tile slot the bricks this step found content in,
// for the host's tile directory and the renderer's boxes: bits x, 4 + y and 8 + z for a
// brick at (x, y, z) in its tile.
@group(0) @binding(36) var<storage, read_write> activity: array<atomic<u32>>;
// Workgroup memory starts zeroed.
var<workgroup> groupBusy: atomic<u32>;
var<workgroup> groupExpands: atomic<u32>;
fn holdsContent(f: vec4f) -> bool {
  return max(max(select(f.x, 0.0, coarseSmoke()), f.z), f.w) > u.dynamics.z;
}

// Two velocity cells cover local interpolation/derivative stencils. Add a step of
// motion, up to the previous full-brick margin. The pressure solve uses the same
// open boundary, now closer to the material. No field value or cutoff is changed.
fn contentSupport(id: vec3i, velocity: vec3f) -> u32 {
  let ratio = u.velocityGrid.xyz / u.grid.xyz;
  let side = vec3f(f32(brickSize()));
  let local = vec3f(id & vec3i(vec3u(side) - 1u)) + .5;
  let pad = min(side, max(vec3f(2), vec3f(2) * ratio) + abs(velocity) * u.grid.w / u.grid.xyz);
  let low = local < pad;
  let high = local + pad >= side;
  let row = 2u | select(0u, 1u, low.x) | select(0u, 4u, high.x);
  let plane = (row << 3u) | select(0u, row, low.y) | select(0u, row << 6u, high.y);
  return (plane << 9u) | select(0u, plane, low.z) | select(0u, plane << 18u, high.z);
}

// Every lane of the workgroup must call this, listed or not; a workgroup lies inside
// one brick. Lanes that produced a nonzero expansion rate called noteExpansion first.
fn recordContent(brick: u32, listed: bool, support: u32, lane: u32) {
  if support != 0u {
    atomicOr(&groupBusy, support);
  }
  workgroupBarrier();
  if !listed || lane != 0u {
    return;
  }
  var flags = 0u;
  if atomicLoad(&groupBusy) != 0u {
    flags = CONTENT | (atomicLoad(&groupBusy) << 3u);
    let local = brick & 63u;
    let bits = (1u << (local & 3u)) | (16u << ((local >> 2u) & 3u)) | (256u << (local >> 4u));
    atomicOr(&activity[brickCount() + (brick >> 6u)], bits);
  }
  if atomicLoad(&groupExpands) != 0u {
    flags |= EXPANDS;
  }
  if flags != 0u {
    atomicOr(&activity[brick], flags);
  }
}

fn noteExpansion() {
  atomicStore(&groupExpands, 1u);
}

// Whether the cell's brick may hold a nonzero expansion rate from an earlier step. Where
// it holds none, storing a zero rate would change nothing.
fn mayExpand(brick: u32) -> bool {
  return (atomicLoad(&activity[brick]) & MAY_EXPAND) != 0u;
}
`,kj=`// Corrected scalar evolution: emission, combustion, cooling, dissipation, and expansion.
// Assembled with the other fluid modules by ShaderSources.ts.
struct FieldEvolution {
  value: vec4f,
  expansion: f32,
  injected: bool
};

fn evolvedFields(id: vec3i, trace: ptr<function, CellTrace>) -> FieldEvolution {
  let position = center(id);
  if solidAt(position) {
    return FieldEvolution(vec4f(0), 0, false);
  }
  // The corrected scalars, rounded to half precision as the field textures held them.
  let transported = truncateHalf(correctedScalars(id, trace));
  let timeStep = u.grid.w;
  var lifetime = transported.z;
  var sourceProducts = vec2f(0);
  var injectedFuel = 0.0;
  let list = tileList(EMITTERS);
  for (var i = 0u; i < list.y; i++) {
    let e = emitters[tileLists[list.x + i]];
    let weight = emitterWeight(e, position);
    if weight == 0.0 {
      continue;
    }
    let variation = burstVariation(e, position); // heat, remaining lifetime
    // Max replenishment is a prescribed lifetime, not fuel concentration.
    lifetime = max(lifetime, e.rates.x * weight * variation.y);
    sourceProducts += vec2f(e.rates.z, e.rates.y * variation.x) * weight * timeStep;
    injectedFuel += e.variation.z * weight * timeStep;
  }
  let mesh = meshSourceAt(position);
  lifetime = max(lifetime, mesh.scalar.x);
  sourceProducts += vec2f(mesh.scalar.z, mesh.scalar.y) * timeStep;
  injectedFuel += mesh.scalar.w * timeStep;
  // Fuel in a voxel hot enough to ignite it is flame: its amount, up to 1, is the flame's
  // lifetime, as an emitter's flame setting is, and the flame produces heat, smoke and
  // expansion. It burns away at the burn rate, and the gas expands as it burns: the
  // expansion rate for each unit of fuel burned a second. Without fuel, sources add none.
  var remaining = 0.0;
  var burned = 0.0;
  if u.fuel.z > .5 {
    remaining = transported.w + injectedFuel;
    if transported.y + sourceProducts.y >= u.fuel.x {
      lifetime = max(lifetime, min(remaining, 1.0));
      let unburned = remaining * exp(-u.fuel.y * timeStep);
      burned = remaining - unburned;
      remaining = unburned;
    }
  }
  let flame = evaluateFlame(clamp(lifetime, 0.0, 1.0));
  let expansion = flame.products.z + flameParams.extra.x * burned / timeStep;
  let losses = vec2f(u.dynamics.x, u.forces.y);
  // Symmetric exponential loss around this step's additive outputs. Exact
  // piecewise-linear flame integrals carry no extra dt.
  let densityAndHeat = transported.xy * exp(-losses * timeStep) + (sourceProducts + flame.products.xy) * exp(-losses * timeStep * .5);
  return FieldEvolution(vec4f(max(densityAndHeat, vec2f(0)), flame.lifetime, remaining),
    expansion,
    any(sourceProducts > vec2f(0)) || lifetime > transported.z || injectedFuel > 0.0);
}

@compute @workgroup_size(8, 4, 4)
fn evolveFields(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_id) local: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  var support = 0u;
  if cell.listed {
    var trace = cellTrace(cell.id);
    let result = evolvedFields(cell.id, &trace);
    let value = clearDormant(result.value, result.injected);
    storeVector(cell.id, value);
    if result.expansion != 0.0 {
      noteExpansion();
    }
    if result.expansion != 0.0 || mayExpand(cell.brick) {
      storeExpansion(cell.id, result.expansion);
    }
    if holdsContent(value) {
      support = contentSupport(cell.id, traceVelocity(&trace));
    }
  }
  recordContent(cell.brick, cell.listed, support, lane);
}
`,Aj=`// Curl, source/external forces, divergence, and pressure projection.
// Assembled with the other fluid modules by ShaderSources.ts.
fn curlNoise(p: vec3f) -> vec3f {
  let rotation = mat3x3f(vec3f(.36, -.8, .48), vec3f(.48, .6, .64), vec3f(-.8, 0, .6));
  return transpose(rotation) * textureSampleLevel(turbulenceNoise,
    repeatSampler,
    rotation * p / 16.0,
    0).xyz;
}

fn curlMagnitude(p: vec3i) -> f32 {
  return load(auxiliary, p).w;
}

fn enforceFaces(input: vec3f, w: vec3f) -> vec3f {
  let cell = u.grid.xyz;
  if solidAt(w) {
    return vec3f(0);
  }
  var v = input;
  if solidAt(w + vec3f(cell.x, 0, 0)) {
    v.x = 0;
  }
  if solidAt(w + vec3f(0, cell.y, 0)) {
    v.y = 0;
  }
  if solidAt(w + vec3f(0, 0, cell.z)) {
    v.z = 0;
  }
  return v;
}

// Curl, external forces, divergence, and pressure projection
// Curl uses only off-axis derivatives of centered MAC components. Their source
// cells fit in a one-cell halo: share 360 velocity loads across 128 cells instead
// of reconstructing six centered vectors independently in every invocation.
// Keep f32 values and the original arithmetic order, including the .5 average.
var<workgroup> curlTile: array<vec4f, 360>;
fn curlCentered(p: vec3u, component: u32) -> f32 {
  var before = p;
  before[component] -= 1u;
  let a = curlTile[(p.z * 6u + p.y) * 10u + p.x][component];
  let b = curlTile[(before.z * 6u + before.y) * 10u + before.x][component];
  return .5 * (a + b);
}

@compute @workgroup_size(8, 4, 4)
fn computeCurl(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_id) local: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if cell.listed {
    let first = cell.id - vec3i(local) - 1;
    for (var i = lane; i < 360u; i += 128u) {
      let offset = vec3i(vec3u(i % 10u, (i / 10u) % 6u, i / 60u));
      curlTile[i] = load(velocity, first + offset);
    }
  }
  workgroupBarrier();
  if !cell.listed || !cell.interior {
    return;
  }
  let p = local + 1u;
  let h = .5 / u.grid.xyz;
  let x = vec3u(1, 0, 0);
  let y = vec3u(0, 1, 0);
  let z = vec3u(0, 0, 1);
  let dx = vec2f(curlCentered(p + x, 1u) - curlCentered(p - x, 1u),
    curlCentered(p + x, 2u) - curlCentered(p - x, 2u)) * h.x;
  let dy = vec2f(curlCentered(p + y, 0u) - curlCentered(p - y, 0u),
    curlCentered(p + y, 2u) - curlCentered(p - y, 2u)) * h.y;
  let dz = vec2f(curlCentered(p + z, 0u) - curlCentered(p - z, 0u),
    curlCentered(p + z, 1u) - curlCentered(p - z, 1u)) * h.z;
  let c = vec3f(dy.y - dz.y, dz.x - dx.y, dx.x - dy.x);
  storeLoaded(cell.id, vec4f(c, length(c)));
}

// Forces live at cell centers. Transfer to staggered faces by averaging,
// as in Fedkiw/Stam/Jensen 2001 Appendix A; never shift all components alike.
fn centerForce(p: vec3i) -> vec3f {
  let w = center(p);
  if solidAt(w) {
    return vec3f(0);
  }
  let f = velocityCellAverage(fields, p);
  var density = f.x;
  if coarseSmoke() {
    density = smokeVelocityAverage(p);
  }
  var confinement = vec3f(0);
  if u.dynamics.y != 0.0 {
    let c = load(auxiliary, p).xyz;
    let eta = vec3f(curlMagnitude(p + vec3i(1, 0, 0)) - curlMagnitude(p - vec3i(1, 0, 0)),
      curlMagnitude(p + vec3i(0, 1, 0)) - curlMagnitude(p - vec3i(0, 1, 0)),
      curlMagnitude(p + vec3i(0, 0, 1)) - curlMagnitude(p - vec3i(0, 0, 1)));
    let spacing = u.grid.xyz;
    confinement = cross(eta / (length(eta) + .0001),
      c) * u.dynamics.y * min(spacing.x,
      min(spacing.y, spacing.z));
  }
  return confinement + externalForces(p,
    w) + vec3f(0,
    u.forces.x * f.y - u.forces.z * density,
    0);
}

// Whether the brick of velocity cell \`p\` computes.
fn computesAt(p: vec3i) -> bool {
  return entryComputes(brickEntry(p >> vec3u(u32(u.velocityGrid.w))));
}

// The force at cell \`p\`. Bricks that compute have forces, the rest none; rounded toward
// zero to half precision, as the half-float force pool held them.
fn cellForce(p: vec3i) -> vec3f {
  if !computesAt(p) {
    return vec3f(0);
  }
  return truncateHalf(vec4f(centerForce(p), 0)).xyz;
}

// The tile's forces and those of the cells after it on each axis, which its faces average.
var<workgroup> forceTile: array<vec3f, 225>;
fn sourceVelocity(value: f32, face: vec3f, component: u32) -> f32 {
  var result = value;
  let list = tileList(EMITTERS);
  for (var i = 0u; i < list.y; i++) {
    let e = emitters[tileLists[list.x + i]];
    if e.rates.w == 0.0 {
      continue;
    }
    let weight = emitterWeight(e, face);
    if weight == 0.0 {
      continue;
    }
    var radial = vec3f(0);
    if e.velocity.w != 0.0 {
      let d = face - e.position.xyz;
      radial = d / max(length(d), 1e-6) * e.velocity.w;
    }
    result = mix(result,
      e.velocity[component] + radial[component],
      1.0 - exp(-e.rates.w * weight * u.grid.w));
  }
  let mesh = meshSourceAt(face);
  if mesh.motion.w > 0.0 {
    result = mix(result, mesh.motion[component] / mesh.motion.w,
      1.0 - exp(-mesh.motion.w * u.grid.w));
  }
  return result;
}

@compute @workgroup_size(8, 4, 4)
fn applyForces(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_id) local: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if cell.listed {
    let origin = cell.id - vec3i(local);
    for (var i = lane; i < 225u; i += 128u) {
      let q = vec3u(i % 9u, (i / 9u) % 5u, i / 45u);
      // Only cells past the tile on one axis are read.
      if dot(vec3u(q >= vec3u(8u, 4u, 4u)), vec3u(1u)) < 2u {
        forceTile[i] = cellForce(origin + vec3i(q));
      }
    }
  }
  workgroupBarrier();
  if !cell.listed || !cell.interior {
    return;
  }
  let p = cell.id;
  let pos = center(p);
  let halfCell = .5 * u.grid.xyz;
  let t = local.x + 9u * (local.y + 5u * local.z);
  let centered = forceTile[t];
  let force = .5 * (centered + vec3f(forceTile[t + 1u].x,
      forceTile[t + 9u].y,
      forceTile[t + 45u].z));
  let v = cellVelocity(p) * exp(-u.forces.w * u.grid.w) + u.grid.w * force;
  let sourced = vec3f(sourceVelocity(v.x, pos + vec3f(halfCell.x, 0, 0), 0u),
    sourceVelocity(v.y, pos + vec3f(0, halfCell.y, 0), 1u),
    sourceVelocity(v.z, pos + vec3f(0, 0, halfCell.z), 2u));
  storeLoaded(p, vec4f(enforceFaces(sourced, pos), 0));
}

@compute @workgroup_size(8, 4, 4)
fn computeDivergence(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if !cell.listed || !cell.interior {
    return;
  }
  let p = cell.id;
  let h = u.grid.xyz;
  let reference = min(h.x, min(h.y, h.z));
  let centered = cellVelocity(p);
  let divergence = (centered.x - cellVelocity(p - vec3i(1,
        0,
        0)).x) / h.x + (centered.y - cellVelocity(p - vec3i(0,
        1,
        0)).y) / h.y + (centered.z - cellVelocity(p - vec3i(0,
        0,
        1)).z) / h.z;
  writeScalar(p, reference * reference * (divergence - velocityCellAverage(expansionRate, p).x));
}

// Pressure unknowns, as the pressure solver's finest level defines them: cells whose
// own brick and the bricks of their negative neighbors compute. Around them lies a
// one-cell ring of still, ambient air at zero pressure. Below the ground is solid, so no
// brick there needs to compute.
@group(0) @binding(39) var<storage, read_write> brickState: array<u32>;
fn pressureUnknown(p: vec3i) -> bool {
  var lo = (p - 1) >> vec3u(u32(u.velocityGrid.w));
  if u.counts.w > .5 {
    lo.y = max(lo.y, 0);
  }
  let hi = p >> vec3u(u32(u.velocityGrid.w));
  for (var z = lo.z; z <= hi.z; z++) {
    for (var y = lo.y; y <= hi.y; y++) {
      for (var x = lo.x; x <= hi.x; x++) {
        if !entryComputes(brickEntry(vec3i(x, y, z))) {
          return false;
        }
      }
    }
  }
  return true;
}

fn projectComponent(p: vec3i,
  offset: vec3i,
  axis: u32,
  centerPressure: f32,
  value: f32) -> f32 {
  let neighbor = p + offset;
  if solidAt(center(neighbor)) {
    return 0;
  }
  // Faces with no pressure unknown on either side belong to the ambient ring.
  if !pressureUnknown(p) && !pressureUnknown(neighbor) {
    return 0;
  }
  return value - (cellPressure(neighbor) - centerPressure) / u.grid[axis];
}

@compute @workgroup_size(8, 4, 4)
fn project(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_id) local: vec3u) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if !cell.listed || !cell.interior {
    return;
  }
  let p = cell.id;
  if solidAt(center(p)) {
    storeVector(p, vec4f(0));
    return;
  }
  let centerPressure = cellPressure(p);
  let v = cellVelocity(p);
  // Each face's solid test also enforces zero flux: no second geometry traversal.
  let projected = vec3f(projectComponent(p, vec3i(1, 0, 0), 0u, centerPressure, v.x),
    projectComponent(p, vec3i(0, 1, 0), 1u, centerPressure, v.y),
    projectComponent(p, vec3i(0, 0, 1), 2u, centerPressure, v.z));
  storeVector(p, vec4f(projected, 0));
}
`,jj=`// Pool growth.
// Assembled with the other fluid modules by ShaderSources.ts.
// The slots a grown pool added: the first new slot and the new slot count.
struct PoolGrowth {
  slots: vec4u,
};

@group(0) @binding(51) var<uniform> growth: PoolGrowth;
// The pool grew: its new slots go under the free stack, which the host moved up to make
// room, so the stack's top, and the slots the next steps take, do not depend on when the
// pool grew.
@compute @workgroup_size(64)
fn growFreeList(@builtin(global_invocation_id) id: vec3u) {
  let added = growth.slots.y;
  if id.x < added {
    freeSlots[id.x] = growth.slots.x + added - 1u - id.x;
  }
  if id.x == 0u {
    atomicAdd(&poolState.free, i32(added));
  }
}
`,Mj=`enable f16;
// Pressure and the Poisson RHS live in the independently sized velocity brick slots, in
// half precision (pressure.wgsl). Loads promote to f32 for divergence and projection;
// only stores round to half precision.
@group(0) @binding(4) var<storage, read> pressure: array<f16>;
@group(0) @binding(7) var<storage, read_write> outputScalar: array<f16>;
// The velocity cell \`p\`'s place in the slot at \`page\`.
fn scalarIndex(p: vec3i, page: i32) -> u32 {
  let side = 1u << u32(u.velocityGrid.w);
  let local = vec3u(p & vec3i(i32(side) - 1));
  return pageSlot(page) * side * side * side + (local.z * side + local.y) * side + local.x;
}

// Cells of bricks without a slot hold zero pressure.
fn cellPressure(p: vec3i) -> f32 {
  let page = brickPage(p >> vec3u(u32(u.velocityGrid.w)));
  if page < 0 {
    return 0.0;
  }
  return f32(pressure[scalarIndex(p, page)]);
}

fn writeScalar(p: vec3i, value: f32) {
  let page = brickPage(p >> vec3u(u32(u.velocityGrid.w)));
  if page >= 0 {
    outputScalar[scalarIndex(p, page)] = f16(value);
  }
}

// Zero both pressures and the divergence in the cells of bricks that stopped computing
// or got a fresh slot.
@group(0) @binding(60) var<storage, read_write> secondScalar: array<f16>;
@group(0) @binding(61) var<storage, read_write> thirdScalar: array<f16>;
fn zeroScalars(p: vec3i, page: i32) {
  let index = scalarIndex(p, page);
  outputScalar[index] = 0h;
  secondScalar[index] = 0h;
  thirdScalar[index] = 0h;
}

// Debug views: a listed brick's pressure or divergence, whichever binding 4 holds, into its
// fine correction-scratch slot, using the velocity cells plus their one-cell apron.
// At coarse velocity resolutions this fits entirely inside the fine slot interior,
// preserving fine-grid aprons for later scalar transport. Each brick writes its own
// apron from its positive neighbors, or zero where they have no slot.
@compute @workgroup_size(8, 4, 4)
fn exportScalars(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if !cell.listed || !cell.interior {
    return;
  }
  let texel = velocityScratchTexel(cell.id, cellPage(cell.id));
  textureStore(outputVector, texel, vec4f(cellPressure(cell.id), 0, 0, 0));
  let last = (cell.id & cellMask()) == cellMask();
  for (var m = 1u; m < 8u; m++) {
    let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
    if any(axes & !last) {
      continue;
    }
    let step = select(vec3i(0), vec3i(1), axes);
    textureStore(outputVector, texel + step, vec4f(cellPressure(cell.id + step), 0, 0, 0));
  }
}
`,Nj=`// Sparse grid addressing, interpolation, and interior/apron writes.
// Assembled with the other fluid modules by ShaderSources.ts.
// Sparse pool addressing and interpolation
// Each grid shares the fine brick footprint, with its own cells per side.
fn brickShift(spacing: vec3f) -> u32 {
  if spacing.x == u.velocityGrid.x {
    return u32(u.velocityGrid.w);
  }
  if spacing.x == u.fieldGrid.x {
    return u32(u.pool.w);
  }
  return u32(u.noise.w);
}

fn coarseSmoke() -> bool {
  return u.noise.z > 1.0;
}

fn smokeSpacing() -> vec3f {
  return u.fieldGrid.xyz * max(1.0, u.noise.z);
}

@group(0) @binding(73) var smokeDensity: texture_3d<f32>;
fn gridShift() -> u32 {
  return brickShift(u.grid.xyz);
}

fn brickSize() -> u32 {
  return 1u << gridShift();
}

fn cellMask() -> vec3i {
  return vec3i(i32(brickSize()) - 1);
}

// The slot at \`page\` (pool.wgsl).
fn pageSlot(page: i32) -> u32 {
  return poolSlot(page, u.pool.xy);
}

// A listed brick's cell; the brick becomes home (tiles.wgsl), its record shared by the
// workgroup. Every lane must call this, before any return.
struct ListedCell {
  id: vec3i,
  brick: u32,
  listed: bool,
  interior: bool
};

fn listedCell(group: vec3u, local: vec3u, workgroup: vec3u) -> ListedCell {
  let index = listedBrick(group);
  let listed = index < brickList[0];
  var id = 0u;
  if listed {
    id = brickList[index + 1u];
  }
  loadHomeRecord(id, (local.z * workgroup.y + local.y) * workgroup.x + local.x, listed);
  if !listed {
    return ListedCell(vec3i(0), 0u, false, false);
  }
  enterBrick(id, true);
  home.inWorkgroup = true;
  return ListedCell(brickTileCell(home.brick, group.x, brickSize(), workgroup, local),
    id, true, all(local < vec3u(brickSize())));
}

// Cell \`p\` of a pool on a grid of cells \`spacing\` meters wide: zero in a brick without a slot.
fn loadCell(t: texture_3d<f32>, p: vec3i, spacing: vec3f) -> vec4f {
  let shift = brickShift(spacing);
  let page = brickPage(p >> vec3u(shift));
  if page < 0 {
    return vec4f(0);
  }
  return textureLoad(t, poolOrigin(page, shift) + (p & vec3i((1 << shift) - 1)), 0);
}

// Cell \`p\` of a pool on the grid this kernel writes.
fn load(t: texture_3d<f32>, p: vec3i) -> vec4f {
  return loadCell(t, p, u.grid.xyz);
}

// A trilinear sample at \`position\`, in cells of a grid with cell centers at .5. A sample
// based in a brick with a slot is one filtered fetch inside that slot; its apron supplies
// the neighbors past the brick.
fn sampleCells(field: texture_3d<f32>, position: vec3f, spacing: vec3f) -> vec4f {
  let shift = brickShift(spacing);
  let base = vec3i(floor(position - .5));
  let brick = base >> vec3u(shift);
  let entry = brickEntry(brick);
  let page = entryPage(entry);
  let last = (1 << shift) - 1;
  // Whether the sample reaches the cells after the base brick, which its apron copies.
  let apron = any((base & vec3i(last)) == vec3i(last));
  if page >= 0 && !(apron && entryFresh(entry)) {
    let texel = vec3f(poolOrigin(page, shift)) + position - vec3f(brick << vec3u(shift));
    return textureSampleLevel(field, linearSampler, texel / vec3f(textureDimensions(field)), 0);
  }
  // An empty base brick reads zero unless the sample reaches past it. Past a fresh slot or
  // an empty brick, interpolate cell by cell.
  if page < 0 && !apron {
    return vec4f(0);
  }
  let fraction = position - .5 - vec3f(base);
  var value = vec4f(0);
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let weights = mix(1.0 - fraction, fraction, vec3f(f32(x), f32(y), f32(z)));
        value += loadCell(field, base + vec3i(x, y, z), spacing) * (weights.x * weights.y * weights.z);
      }
    }
  }
  return value;
}

// A trilinear sample at world position \`w\`.
fn sampleAt(field: texture_3d<f32>, position: vec3f, spacing: vec3f) -> vec4f {
  return sampleCells(field, position / spacing, spacing);
}

// The cells from \`base\` to \`base + extent\` of a pool on the grid this kernel writes, read
// with one page lookup. Within one brick and its apron, they lie in one slot. Mode 1 reads
// that slot from \`texel\`, 2 reads zero (an empty brick the block stays inside), and 0
// reads cell by cell.
const BLOCK_CELL_LOOKUPS: u32 = 0u;
const BLOCK_SLOT_LOOKUP: u32 = 1u;
const BLOCK_EMPTY: u32 = 2u;
struct SampleBlock {
  texel: vec3i,
  mode: u32
};

fn blockAt(base: vec3i, extent: vec3i) -> SampleBlock {
  let size = i32(brickSize());
  let local = base & vec3i(size - 1);
  if any(local + extent > vec3i(size)) {
    return SampleBlock(vec3i(0), BLOCK_CELL_LOOKUPS);
  }
  let entry = brickEntry(base >> vec3u(gridShift()));
  let page = entryPage(entry);
  // Whether the block reaches the brick's apron, which a fresh slot does not copy yet.
  let apron = any(local + extent == vec3i(size));
  if page >= 0 && !(apron && entryFresh(entry)) {
    return SampleBlock(poolOrigin(page, gridShift()) + local, BLOCK_SLOT_LOOKUP);
  }
  if page < 0 && !apron {
    return SampleBlock(vec3i(0), BLOCK_EMPTY);
  }
  return SampleBlock(vec3i(0), BLOCK_CELL_LOOKUPS);
}

fn blockLoad(t: texture_3d<f32>, block: SampleBlock, base: vec3i, offset: vec3i) -> vec4f {
  if block.mode == BLOCK_SLOT_LOOKUP {
    return textureLoad(t, block.texel + offset, 0);
  }
  if block.mode == BLOCK_EMPTY {
    return vec4f(0);
  }
  return load(t, base + offset);
}

// Stores of the grid this kernel writes. A cell goes to its brick's slot, and to the
// apron of every brick before it whose apron copies the cell: cells on a brick's first
// layer on any axis. \`page\` is the cell's brick's page.
fn apronCopies(cell: vec3i) -> bool {
  return any((cell & cellMask()) == vec3i(0));
}

fn apronStep(cell: vec3i, m: u32) -> vec3i {
  let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
  if any(axes & ((cell & cellMask()) != vec3i(0))) {
    return vec3i(0);
  }
  return select(vec3i(0), vec3i(1), axes);
}

fn slotTexel(cell: vec3i, page: i32) -> vec3i {
  return poolOrigin(page, gridShift()) + (cell & cellMask());
}

fn cellPage(cell: vec3i) -> i32 {
  return brickPage(cell >> vec3u(gridShift()));
}

// A donor slot has fineBrickCells^3 words, doubled when velocity uses the fine grid.
// Flatten the current grid's cells into it;
// velocity uses two adjacent words, with the first always aligned to an even X.
fn donorTexel(cell: vec3i, wordsShift: u32) -> vec3i {
  let shift = u32(u.pool.w);
  let widthShift = shift + select(0u, 1u, u.velocityGrid.x == u.fieldGrid.x);
  let dimensions = vec3u(1u << widthShift, 1u << shift, 1u << shift);
  let local = vec3u(cell & cellMask());
  let size = brickSize();
  let index = ((local.z * size + local.y) * size + local.x) << wordsShift;
  let page = u32(cellPage(cell));
  let origin = vec3u(page & 255u, (page >> 8u) & 255u, page >> 16u) * dimensions;
  let offset = vec3u(index & (dimensions.x - 1u),
    (index >> widthShift) & (dimensions.y - 1u),
    index >> (widthShift + shift));
  return vec3i(origin + offset);
}

fn writeVector(cell: vec3i, page: i32, value: vec4f) {
  textureStore(outputVector, slotTexel(cell, page), value);
  if !apronCopies(cell) {
    return;
  }
  let brick = cell >> vec3u(gridShift());
  for (var m = 1u; m < 8u; m++) {
    let step = apronStep(cell, m);
    if all(step == vec3i(0)) {
      continue;
    }
    let neighbor = brickPage(brick - step);
    if neighbor >= 0 {
      textureStore(outputVector, slotTexel(cell, neighbor) + step * i32(brickSize()), value);
    }
  }
}

fn storeVector(cell: vec3i, value: vec4f) {
  let page = cellPage(cell);
  if page >= 0 {
    writeVector(cell, page, value);
  }
}

// Stores of a pool that is only loaded cell by cell, never filtered, which needs no apron.
fn storeLoaded(cell: vec3i, value: vec4f) {
  let page = cellPage(cell);
  if page >= 0 {
    textureStore(outputVector, slotTexel(cell, page), value);
  }
}

fn writeExpansion(cell: vec3i, page: i32, value: f32) {
  textureStore(outputExpansion, slotTexel(cell, page), vec4f(value, 0, 0, 0));
  if !apronCopies(cell) {
    return;
  }
  let brick = cell >> vec3u(gridShift());
  for (var m = 1u; m < 8u; m++) {
    let step = apronStep(cell, m);
    if all(step == vec3i(0)) {
      continue;
    }
    let neighbor = brickPage(brick - step);
    if neighbor >= 0 {
      textureStore(outputExpansion,
        slotTexel(cell, neighbor) + step * i32(brickSize()),
        vec4f(value, 0, 0, 0));
    }
  }
}

fn storeExpansion(cell: vec3i, value: f32) {
  let page = cellPage(cell);
  if page >= 0 {
    writeExpansion(cell, page, value);
  }
}

// The world position of the center of cell \`id\` of the grid this kernel writes.
fn center(id: vec3i) -> vec3f {
  return (vec3f(id) + .5) * u.grid.xyz;
}

// Box average of the field cells under one velocity cell. Each linear sample sits
// on the shared corner of a 2x2x2 block of field cells and returns its exact mean.
fn velocityCellAverage(t: texture_3d<f32>, id: vec3i) -> vec4f {
  let ratio = u.velocityGrid.x / u.fieldGrid.x;
  if ratio < 1.5 {
    return loadCell(t, id, u.fieldGrid.xyz);
  }
  let blocks = u32(ratio) / 2u;
  var sum = vec4f(0);
  for (var z = 0u; z < blocks; z++) {
    for (var y = 0u; y < blocks; y++) {
      for (var x = 0u; x < blocks; x++) {
        let corner = vec3f(id) * ratio + 1.0 + 2.0 * vec3f(f32(x), f32(y), f32(z));
        sum += sampleCells(t, corner, u.fieldGrid.xyz);
      }
    }
  }
  return sum / f32(blocks * blocks * blocks);
}
`,Pj=`// Scalar predictor and bounded transport correction for heat, smoke, lifetime, and fuel.
// Assembled with the other fluid modules by ShaderSources.ts.
// Scalar predictor, bounded correction, and combustion
// Scalars flow in as zero from bricks without a slot. The closed floor and collider cells
// are cleared by scalar evolution. No per-frame boundary fade changes lifetime.
fn sampleScalarsExplicit(t: texture_3d<f32>, grid: vec3f) -> vec4f {
  // Lifetime needs f32 interpolation. Reuse its eight RGBA reads for every channel.
  let base = vec3i(floor(grid));
  let fraction = fract(grid);
  let block = blockAt(base, vec3i(1));
  var value = vec4f(0);
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let weights = mix(1.0 - fraction, fraction, vec3f(f32(x), f32(y), f32(z)));
        value += blockLoad(t, block, base, vec3i(x, y, z)) * weights.x * weights.y * weights.z;
      }
    }
  }
  return value;
}

// The eight donors of a trilinear sample from \`base\`: the range of their smoke, heat and
// fuel (x, y, w), which share the bounds test, and of their lifetime, which starts as the
// empty [1, 0].
struct ScalarDonorRange {
  minimum: vec3h,
  maximum: vec3h,
  lifetimeMinimum: f16,
  lifetimeMaximum: f16
};

struct ScalarPrediction {
  value: vec4f,
  donors: ScalarDonorRange
};

fn predictScalarsWithBounds(base: vec3i, fraction: vec3f) -> ScalarPrediction {
  let block = blockAt(base, vec3i(1));
  if block.mode == BLOCK_EMPTY {
    return ScalarPrediction(vec4f(0), ScalarDonorRange(vec3h(0), vec3h(0), 0.0h, 0.0h));
  }
  // Donors come from rgba16float: half bounds retain their exact stored values.
  // Interpolate all channels from the same reads; only the extrema use half precision.
  var donors = ScalarDonorRange(vec3h(65504.0), vec3h(-65504.0), 1.0h, 0.0h);
  var value = vec4f(0);
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let sample = blockLoad(fields, block, base, vec3i(x, y, z));
        let boundsSample = vec4h(sample);
        donors.minimum = min(donors.minimum, boundsSample.xyw);
        donors.maximum = max(donors.maximum, boundsSample.xyw);
        donors.lifetimeMinimum = min(donors.lifetimeMinimum, boundsSample.z);
        donors.lifetimeMaximum = max(donors.lifetimeMaximum, boundsSample.z);
        let interpolationWeights = mix(1.0 - fraction, fraction, vec3f(f32(x), f32(y), f32(z)));
        value += sample * interpolationWeights.x * interpolationWeights.y * interpolationWeights.z;
      }
    }
  }
  return ScalarPrediction(value, donors);
}

// A constant donor stencil leaves only its own value.
fn sameDonors(donors: ScalarDonorRange) -> bool {
  return all(donors.minimum == donors.maximum) && donors.lifetimeMinimum == donors.lifetimeMaximum;
}

// Eight exact half bounds in four words: min smoke/heat, min fuel/lifetime,
// max smoke/heat, max fuel/lifetime. No donor address or trace flags are needed.
fn packScalarBounds(donors: ScalarDonorRange) -> vec4u {
  return vec4u(pack2x16float(vec2f(donors.minimum.xy)),
    pack2x16float(vec2f(vec2h(donors.minimum.z, donors.lifetimeMinimum))),
    pack2x16float(vec2f(donors.maximum.xy)),
    pack2x16float(vec2f(vec2h(donors.maximum.z, donors.lifetimeMaximum))));
}

fn unpackScalarBounds(words: vec4u) -> ScalarDonorRange {
  let minimum = vec2h(unpack2x16float(words.x));
  let minimumFuelLifetime = vec2h(unpack2x16float(words.y));
  let maximum = vec2h(unpack2x16float(words.z));
  let maximumFuelLifetime = vec2h(unpack2x16float(words.w));
  return ScalarDonorRange(vec3h(minimum, minimumFuelLifetime.x),
    vec3h(maximum, maximumFuelLifetime.x), minimumFuelLifetime.y,
    maximumFuelLifetime.y);
}

// Rendering borrows the scalar predictor between steps and smooths density into
// its apron, including past the sparse domain. Existing neighbor cells replace
// their apron copies during advection; absent neighbors have no invocation, so
// the last interior cell explicitly restores those apron texels to empty air.
fn clearMissingPredictorApron(cell: vec3i) {
  if u.fuel.w < .5 {
    return;
  }
  let last = (cell & cellMask()) == cellMask();
  if !any(last) {
    return;
  }
  let brick = cell >> vec3u(gridShift());
  let texel = slotTexel(cell, cellPage(cell));
  for (var m = 1u; m < 8u; m++) {
    let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
    if any(axes & !last) {
      continue;
    }
    let step = select(vec3i(0), vec3i(1), axes);
    if brickPage(brick + step) < 0 {
      textureStore(outputVector, texel + step, vec4f(0));
    }
  }
}

// Corrected transport computes its predictor and cached bounds from one donor scan.
// First-order transport uses hardware interpolation and writes no correction metadata.
@compute @workgroup_size(8, 4, 4)
fn advectScalars(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = listedCell(group, local, vec3u(8, 4, 4));
  if !cell.listed {
    return;
  }
  var trace = cellTrace(cell.id);
  let departure = traceBack(&trace);
  if !SCALAR_MACCORMACK {
    let sampled = sampleAt(fields, departure, u.grid.xyz);
    let predicted = vec4f(select(sampled.x, 0.0, coarseSmoke()), sampled.yzw);
    storeVector(cell.id, vec4f(predicted.xy, clamp(predicted.z, 0.0, 1.0), predicted.w));
    clearMissingPredictorApron(cell.id);
    return;
  }
  // A still trace must stay exactly at its voxel center. Dividing its world position
  // back into grid coordinates can round an edge sample into the empty neighbor.
  let departureCell = vec3f(cell.id) + (departure - trace.position) / u.grid.xyz;
  let donorBase = vec3i(floor(departureCell));
  let prediction = predictScalarsWithBounds(donorBase, fract(departureCell));
  let predicted = vec4f(select(prediction.value.x, 0.0, coarseSmoke()), prediction.value.yzw);
  let lifetime = select(predicted.z, 0.0, u.dynamics.w > .5);
  storeVector(cell.id, vec4f(predicted.xy, lifetime, predicted.w));
  textureStore(outputScalarDonors, donorTexel(cell.id, 0u), packScalarBounds(prediction.donors));
  clearMissingPredictorApron(cell.id);
}

fn correctedFineScalars(id: vec3i, trace: ptr<function, CellTrace>) -> vec4f {
  // Advection stored the exact half bounds; no source donor addressing or scan remains.
  let texel = slotTexel(id, cellPage(id));
  let donors = unpackScalarBounds(textureLoad(donorCells, donorTexel(id, 0u), 0));
  if sameDonors(donors) {
    return vec4f(vec2f(donors.minimum.xy),
      clamp(f32(donors.lifetimeMinimum), 0.0, 1.0),
      f32(donors.minimum.z));
  }
  let advected = textureLoad(auxiliary, texel, 0);
  // Coarse smoke discards the fine X channel after this function. Variation in
  // that temporary source channel must not force reverse traces when the retained
  // heat/lifetime/fuel are constant. Require the stored predictor to match too:
  // f32 lifetime interpolation followed by a half store can round below the donors.
  let retainedDonors = vec3f(vec3h(donors.minimum.y, donors.lifetimeMinimum, donors.minimum.z));
  if coarseSmoke() && all(donors.minimum.yz == donors.maximum.yz) && donors.lifetimeMinimum == donors.lifetimeMaximum && all(advected.yzw == retainedDonors) {
    return vec4f(advected.xy, clamp(advected.z, 0.0, 1.0), advected.w);
  }
  let forward = traceForward(trace);
  let original = textureLoad(fields, texel, 0);
  // Where the donors' lifetime is constant and the advected lifetime matches it, that is
  // the result: a correction either equals it or reverts to it. Smoke without flame
  // skips the reverse lifetime trace.
  var lifetime = advected.z;
  var reversed: vec3f;
  if donors.lifetimeMinimum != donors.lifetimeMaximum || advected.z != f32(donors.lifetimeMinimum) {
    let forwardCell = vec3f(id) + (forward - (*trace).position) / u.grid.xyz;
    let reversedScalars = sampleScalarsExplicit(auxiliary, forwardCell);
    reversed = reversedScalars.xyw;
    let correctedLifetime = advected.z + .5 * (original.z - reversedScalars.z);
    lifetime = select(correctedLifetime,
      advected.z,
      correctedLifetime < f32(donors.lifetimeMinimum) || correctedLifetime > f32(donors.lifetimeMaximum));
  } else {
    // Without a lifetime correction, hardware filtering remains the cheaper sample.
    reversed = sampleAt(auxiliary, forward, u.grid.xyz).xyw;
  }
  // Use first-order transport where the correction leaves the donor range, like
  // velocity. Clamping there left one-voxel ridges and hard zero edges in smoke.
  let corrected = advected.xyw + .5 * (original.xyw - reversed);
  let bounded = select(corrected,
    advected.xyw,
    (corrected < vec3f(donors.minimum)) | (corrected > vec3f(donors.maximum)));
  return vec4f(bounded.xy, clamp(lifetime, 0.0, 1.0), bounded.z);
}

// Smoke transport uses its own coarse grid; the fine X channel only stages this
// step's integrated source output for volume averaging, never persistent density.
fn correctedScalars(id: vec3i, trace: ptr<function, CellTrace>) -> vec4f {
  if !SCALAR_MACCORMACK {
    let transported = load(auxiliary, id);
    return vec4f(select(transported.x, 0.0, coarseSmoke()), transported.yzw);
  }
  let corrected = correctedFineScalars(id, trace);
  return vec4f(select(corrected.x, 0.0, coarseSmoke()), corrected.yzw);
}
`,Fj=`// Emitter masks, mesh emission lookup, and seeded burst variation.
// Assembled with the other fluid modules by ShaderSources.ts.
// The table of mesh emission of brick id \`id\`, or -1.
fn meshTable(id: i32) -> i32 {
  return select(-1, meshTables[max(id, 0)], id >= 0);
}

// Mesh emission is indexed on the field grid, like the solids (solids.wgsl).
fn meshSourceAt(w: vec3f) -> MeshSource {
  if u.counts.z == 0.0 {
    return MeshSource(vec4i(0), vec4f(0), vec4f(0));
  }
  let cell = fieldCell(w);
  let shift = u32(u.pool.w);
  let table = meshTable(brickId(cell >> vec3u(shift)));
  if table < 0 {
    return MeshSource(vec4i(0), vec4f(0), vec4f(0));
  }
  let local = vec3u(cell & vec3i((1 << shift) - 1));
  let index = (((((u32(table) << shift) | local.z) << shift) | local.y) << shift) | local.x;
  return meshSources[meshTables[brickCount() + index]];
}

fn emitterWeight(e: Emitter, p: vec3f) -> f32 {
  let d = (p - e.position.xyz) / max(e.size.xyz, vec3f(.03));
  var r: f32;
  if e.size.w > .5 {
    r = max(abs(d.x), max(abs(d.y), abs(d.z)));
  } else {
    r = length(d);
  }
  if r >= 1.0 || e.position.w < .5 {
    return 0;
  }
  // Authored compact source mask. Active intervals are resolved by the host.
  return 1.0 - smoothstep(.5, 1.0, r);
}

// Seeded 3D gradient Perlin noise: corner dot products with quintic interpolation.
// Unlike the velocity curl texture, this is sampled only during burst injection.
fn burstGradient(cell: vec3i, offset: vec3f) -> f32 {
  let c = bitcast<vec3u>(cell);
  var h = c.x * 374761393u + c.y * 668265263u + c.z * 2246822519u + bitcast<u32>(u.noise.y) * 3266489917u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  h = (h ^ (h >> 16u)) & 15u;
  let a = select(offset.y, offset.x, h < 8u);
  let b = select(select(offset.z, offset.x, h == 12u || h == 14u), offset.y, h < 4u);
  return select(-a, a, (h & 1u) == 0u) + select(-b, b, (h & 2u) == 0u);
}

fn burstPerlin(p: vec3f) -> f32 {
  let cell = vec3i(floor(p));
  let f = fract(p);
  let s = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let a = burstGradient(cell, f);
  let b = burstGradient(cell + vec3i(1, 0, 0), f - vec3f(1, 0, 0));
  let c = burstGradient(cell + vec3i(0, 1, 0), f - vec3f(0, 1, 0));
  let d = burstGradient(cell + vec3i(1, 1, 0), f - vec3f(1, 1, 0));
  let e = burstGradient(cell + vec3i(0, 0, 1), f - vec3f(0, 0, 1));
  let g = burstGradient(cell + vec3i(1, 0, 1), f - vec3f(1, 0, 1));
  let h = burstGradient(cell + vec3i(0, 1, 1), f - vec3f(0, 1, 1));
  let j = burstGradient(cell + vec3i(1, 1, 1), f - vec3f(1, 1, 1));
  return mix(mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
    mix(mix(e, g, s.x), mix(h, j, s.x), s.y),
    s.z);
}

fn burstPattern(p: vec3f) -> f32 {
  let n = (burstPerlin(p) + .35 * burstPerlin(p * 2.0 + vec3f(5.2, 9.7, 3.1))) / 1.35;
  return clamp(.5 + .5 * n, 0.0, 1.0);
}

fn burstVariation(e: Emitter, p: vec3f) -> vec2f {
  if e.variation.y == 0.0 {
    return vec2f(1);
  }
  // Source-relative coordinates make translated bursts share the same material
  // pattern. Fixed offsets decorrelate heat and lifetime; neither animates in time.
  let q = (p - e.position.xyz) / e.variation.x + vec3f(3.17, 7.53, 11.29);
  return vec2f(1) - e.variation.y * vec2f(burstPattern(q),
    burstPattern(q + vec3f(17.3, 2.8, 8.6)));
}
`,Ij=`// Velocity predictor, donor bounds, and bounded MacCormack correction.
// Assembled with the other fluid modules by ShaderSources.ts.
// Bounds borrow the fine scalar scratch. Keep the velocity cells inside each
// fine slot, away from its apron and every other slot. They are point-loaded, and
// every active brick rewrites them before correction, so no clearing is needed.
fn velocityScratchTexel(cell: vec3i, page: i32) -> vec3i {
  return poolOrigin(page, u32(u.pool.w)) + (cell & vec3i(i32(1u << u32(u.velocityGrid.w)) - 1));
}

fn storeVelocityBounds(cell: vec3i, lo: vec3f, hi: vec3f) {
  let page = cellPage(cell);
  if page < 0 {
    return;
  }
  textureStore(outputVelocityMin, velocityScratchTexel(cell, page), vec4f(lo, 0));
  textureStore(outputVelocityMax, velocityScratchTexel(cell, page), vec4f(hi, 0));
}

// Velocity predictor and bounded MacCormack correction
// Traces into bricks without a slot carry still, empty air: open-air inflow takes the
// ambient momentum, not a copy of the outgoing flow (Bridson 2007 notes, section 3.1).
// The component of cell \`id\` at \`w\`, and where its trace landed for correctVelocity.
struct AdvectedComponent {
  value: f32,
  donor: u32
};

fn advectVelocityComponent(id: vec3i,
  position: vec3f,
  component: u32,
  original: vec3f) -> AdvectedComponent {
  var faceOffset = vec3f(0);
  faceOffset[component] = .5 * u.grid[component];
  let facePosition = position + faceOffset;
  let faceVelocity = velocityOnFace(id, component, original);
  let midpoint = facePosition - .5 * u.grid.w * faceVelocity;
  let departure = facePosition - u.grid.w * velocityAt(midpoint);
  let donorBase = vec3i(floor((departure - faceOffset) / u.grid.xyz - .5));
  return AdvectedComponent(velocityComponentAt(departure, component),
    packDonor(donorBase - id, VELOCITY_DONOR_BITS));
}

fn writeAdvectedVelocity(id: vec3i, original: vec3f) {
  let position = center(id);
  if solidAt(position) {
    storeVector(id, vec4f(0));
    return;
  }
  // Constant component arguments let the compiler specialize MAC offsets without
  // dynamic vector indexing in a component loop.
  let x = advectVelocityComponent(id, position, 0u, original);
  let y = advectVelocityComponent(id, position, 1u, original);
  let z = advectVelocityComponent(id, position, 2u, original);
  storeVector(id, vec4f(x.value, y.value, z.value, 0));
  // Solid cells skip correction: they store no donors.
  let donor = donorTexel(id, 1u);
  textureStore(outputScalarDonors, donor, vec4u(x.donor | (y.donor << 16u), 0u, 0u, 0u));
  textureStore(outputScalarDonors, donor + vec3i(1, 0, 0), vec4u(z.donor, 0u, 0u, 0u));
}

// All three MAC components reuse these donor bounds. Values are selected from
// half-float inputs, so writing the min/max to half-float loses no precision.
// An 8x8x4 group shares its one-cell positive halo: 405 loads for 256 cells,
// instead of eight loads per cell. All invocations must reach the barrier.
var<workgroup> boundsTile: array<vec4f, 405>;
@compute @workgroup_size(8, 8, 4)
fn advectVelocityWithBounds(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  // The list count is not uniform to the compiler: every lane reaches the barrier.
  let cell = listedCell(group, local, vec3u(8, 8, 4));
  let id = cell.id;
  let origin = id - vec3i(local);
  if cell.listed {
    // The tile and its halo lie in one brick and its apron.
    let block = blockAt(origin, vec3i(8, 8, 4));
    for (var i = lane; i < 405u; i += 256u) {
      let p = vec3i(vec3u(i % 9u, (i / 9u) % 9u, i / 81u));
      boundsTile[i] = blockLoad(velocity, block, origin, p);
    }
  }
  workgroupBarrier();
  if !cell.listed || !cell.interior {
    return;
  }
  writeAdvectedVelocity(id, boundsTile[(local.z * 9u + local.y) * 9u + local.x].xyz);
  var lo = vec3f(1e5);
  var hi = vec3f(-1e5);
  for (var z = 0u; z < 2u; z++) {
    for (var y = 0u; y < 2u; y++) {
      for (var x = 0u; x < 2u; x++) {
        let p = local + vec3u(x, y, z);
        let v = boundsTile[(p.z * 9u + p.y) * 9u + p.x].xyz;
        lo = min(lo, v);
        hi = max(hi, v);
      }
    }
  }
  storeVelocityBounds(id, lo, hi);
}

// Both bounds textures share the same atlas layout: resolve their slot once.
// Bricks without a slot contribute the ambient range [0, 0].
fn velocityBoundsAt(base: vec3i, component: u32) -> vec2f {
  let page = cellPage(base);
  if page < 0 {
    return vec2f(0);
  }
  let texel = velocityScratchTexel(base, page);
  return vec2f(textureLoad(velocityMin, texel, 0)[component],
    textureLoad(velocityMax, texel, 0)[component]);
}

fn correctVelocityComponent(
  id: vec3i,
  position: vec3f,
  component: u32,
  original: vec3f,
  predicted: f32,
  packedDonor: u32
) -> f32 {
  var faceOffset = vec3f(0);
  faceOffset[component] = .5 * u.grid[component];
  let facePosition = position + faceOffset;
  // Use the predictor's cached departure cell. Only traces outside the packed
  // offset range need another backward RK2 trace.
  var donorBase = id + unpackDonor(packedDonor, VELOCITY_DONOR_BITS);
  var faceVelocity = vec3f(0);
  let needsRetrace = packedDonor == noDonor(VELOCITY_DONOR_BITS);
  if needsRetrace {
    faceVelocity = velocityOnFace(id, component, original);
    let backwardMidpoint = facePosition - .5 * u.grid.w * faceVelocity;
    let departure = facePosition - u.grid.w * velocityAt(backwardMidpoint) - faceOffset;
    donorBase = vec3i(floor(departure / u.grid.xyz - .5));
  }
  let bounds = velocityBoundsAt(donorBase, component);
  // A singleton donor range with an identical predictor cannot change: every
  // correction either equals that value or falls back to the predictor. Checking
  // predictor equality preserves half-store rounding and fresh-slot interpolation.
  // Quiet/constant regions skip the face sample, forward RK2 trace and reverse fetch.
  if bounds.x == bounds.y && predicted == bounds.x {
    return predicted;
  }
  // Both RK2 traces start at the same face; share its velocity if we retraced.
  if !needsRetrace {
    faceVelocity = velocityOnFace(id, component, original);
  }
  let reverseDt = -u.grid.w;
  let forwardMidpoint = facePosition - .5 * reverseDt * faceVelocity;
  let forward = facePosition - reverseDt * velocityAt(forwardMidpoint) - faceOffset;
  let reversed = sampleAt(auxiliary, forward, u.grid.xyz)[component];
  let corrected = predicted + .5 * (original[component] - reversed);
  // Revert to first-order transport at extrema instead of introducing new peaks.
  return select(corrected, predicted, corrected < bounds.x || corrected > bounds.y);
}

@compute @workgroup_size(8, 8, 4)
fn correctVelocity(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = listedCell(group, local, vec3u(8, 8, 4));
  if !cell.listed || !cell.interior {
    return;
  }
  let id = cell.id;
  let w = center(id);
  if solidAt(w) {
    storeLoaded(id, vec4f(0));
    return;
  }
  let advected = load(auxiliary, id).xyz;
  let original = load(velocity, id).xyz;
  let donor = donorTexel(id, 1u);
  let xy = textureLoad(donorCells, donor, 0).x;
  let z = textureLoad(donorCells, donor + vec3i(1, 0, 0), 0).x;
  let result = vec3f(correctVelocityComponent(id, w, 0u, original, advected.x, xy & 65535u),
    correctVelocityComponent(id, w, 1u, original, advected.y, xy >> 16u),
    correctVelocityComponent(id, w, 2u, original, advected.z, z));
  storeLoaded(id, vec4f(result, 0));
}
`,Lj=`// Clear new or retired slots and their apron copies before reuse.
// Assembled with the other fluid modules by ShaderSources.ts.
// Zeroing. Every cell of a listed slot, so the slot never holds stale values; a fresh
// slot's apron too. Zeroed cells also reach the aprons that copy them.
@group(0) @binding(49) var<storage, read> zeroList: array<u32>;
struct ZeroCell {
  id: vec3i,
  page: i32,
  fresh: bool,
  listed: bool
};

fn zeroCell(group: vec3u, local: vec3u, workgroup: vec3u) -> ZeroCell {
  let index = listedBrick(group);
  if index >= zeroList[0] {
    return ZeroCell(vec3i(0), -1, false, false);
  }
  let brick = zeroList[1u + 2u * index];
  let payload = zeroList[2u + 2u * index];
  let page = i32(payload & 0xffffffu);
  // A brick that gave up its slot zeroes the aprons its last step's neighbors copy it to.
  enterBrick(brick, true);
  let id = brickTileCell(home.brick, group.x, brickSize(), workgroup, local);
  return ZeroCell(id, page, (payload & FRESH_SLOT) != 0u, all(local < vec3u(brickSize())));
}

// The apron texels a cell on a brick's last layer owns: past it on those axes.
fn apronTexel(cell: ZeroCell, m: u32) -> vec4i {
  let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
  let last = (cell.id & cellMask()) == cellMask();
  if any(axes & !last) {
    return vec4i(0);
  }
  return vec4i(slotTexel(cell.id, cell.page) + select(vec3i(0), vec3i(1), axes), 1);
}

// The three vector pools of a grid, zeroed together.
@group(0) @binding(58) var secondVector: texture_storage_3d<rgba16float, write>;
@group(0) @binding(59) var thirdVector: texture_storage_3d<rgba16float, write>;
fn zeroVectorTexel(texel: vec3i) {
  textureStore(outputVector, texel, vec4f(0));
  textureStore(secondVector, texel, vec4f(0));
  textureStore(thirdVector, texel, vec4f(0));
}

// The cell's texels in every pool, as writeVector stores them, and on a fresh slot the
// apron texels it owns.
fn zeroVectors(cell: ZeroCell) {
  zeroVectorTexel(slotTexel(cell.id, cell.page));
  if apronCopies(cell.id) {
    let brick = cell.id >> vec3u(gridShift());
    for (var m = 1u; m < 8u; m++) {
      let step = apronStep(cell.id, m);
      if all(step == vec3i(0)) {
        continue;
      }
      let neighbor = brickPage(brick - step);
      if neighbor >= 0 {
        zeroVectorTexel(slotTexel(cell.id, neighbor) + step * i32(brickSize()));
      }
    }
  }
  if !cell.fresh {
    return;
  }
  for (var m = 1u; m < 8u; m++) {
    let texel = apronTexel(cell, m);
    if texel.w != 0 {
      zeroVectorTexel(texel.xyz);
    }
  }
}

// The velocity grid's vector pools, and its pressure and divergence.
@compute @workgroup_size(8, 4, 4)
fn zeroVelocityBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = zeroCell(group, local, vec3u(8, 4, 4));
  if !cell.listed {
    return;
  }
  zeroVectors(cell);
  zeroScalars(cell.id, cell.page);
}

// The field grid's vector pools and its expansion rate.
@compute @workgroup_size(8, 4, 4)
fn zeroFieldBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_id) local: vec3u) {
  let cell = zeroCell(group, local, vec3u(8, 4, 4));
  if !cell.listed {
    return;
  }
  zeroVectors(cell);
  writeExpansion(cell.id, cell.page, 0.0);
  if !cell.fresh {
    return;
  }
  for (var m = 1u; m < 8u; m++) {
    let texel = apronTexel(cell, m);
    if texel.w != 0 {
      textureStore(outputExpansion, texel.xyz, vec4f(0));
    }
  }
}
`,Rj=`// Forces as rows of vec4s (ForceFields.ts): five per force, then the regions of the
// emitters that targeted forces follow, two each. Directions and centers are in world
// space. A tile lists the forces that reach it (fluid-common.wgsl tileList).
struct ForceField {
  axis: vec4f, // direction/axis xyz, acceleration strength
  center: vec4f, // center xyz, kind: wind=0, turbulence=1, vortex=2, radial=3
  settings: vec4f, // scale/radius, lift, inward pull, reserved
  source: vec4f, // first region row, region count, has mesh targets, targeted
  size: vec4f, // reserved
};

@group(0) @binding(30) var<storage, read> forceData: array<vec4f>;
// Velocity cells that mesh targets cover, by brick: each brick id's first entry, or
// NO_COVERAGE, then for each such brick a count and its entries: a force's index and one
// bit per velocity cell of the brick.
@group(0) @binding(31) var<storage, read> forceCoverage: array<u32>;
const NO_COVERAGE: u32 = 0xffffffffu;
fn forceRecord(index: u32) -> ForceField {
  let row = index * 5u;
  return ForceField(forceData[row],
    forceData[row + 1u],
    forceData[row + 2u],
    forceData[row + 3u],
    forceData[row + 4u]);
}

// Whether mesh targets of force \`index\` cover velocity cell \`cell\`.
fn meshCovers(index: u32, cell: vec3i) -> bool {
  let shift = u32(u.velocityGrid.w);
  let side = 1u << shift;
  let id = brickId(cell >> vec3u(shift));
  if id < 0 {
    return false;
  }
  let first = forceCoverage[id];
  if first == NO_COVERAGE {
    return false;
  }
  let local = vec3u(cell & vec3i(i32(side) - 1));
  let bit = (local.z * side + local.y) * side + local.x;
  for (var entry = 0u; entry < forceCoverage[first]; entry++) {
    let row = first + 1u + entry * (1u + (side * side * side + 31u) / 32u);
    if forceCoverage[row] == index {
      return ((forceCoverage[row + 1u + (bit >> 5u)] >> (bit & 31u)) & 1u) != 0u;
    }
  }
  return false;
}

fn coverage(f: ForceField, index: u32, cell: vec3i, p: vec3f) -> f32 {
  if f.source.w == 0.0 {
    return 1.0;
  }
  if f.source.z == 1.0 && meshCovers(index, cell) {
    return 1.0;
  }
  var covered = 0.0;
  for (var i = 0u; i < u32(f.source.y); i++) {
    let row = u32(f.source.x) + 2u * i;
    let center = forceData[row];
    let delta = abs((p - center.xyz) / max(forceData[row + 1u].xyz, vec3f(.03)));
    let distance = select(length(delta), max(delta.x, max(delta.y, delta.z)), center.w == 3.0);
    covered = max(covered, 1.0 - smoothstep(.5, 1.0, distance));
  }
  return covered;
}

fn externalForces(cell: vec3i, p: vec3f) -> vec3f {
  var result = vec3f(0);
  let list = tileList(FORCES);
  for (var i = 0u; i < list.y; i++) {
    let index = tileLists[list.x + i];
    let f = forceRecord(index);
    let weight = coverage(f, index, cell, p);
    if weight == 0.0 {
      continue;
    }
    var acceleration = f.axis.xyz * f.axis.w;
    if f.center.w == 1.0 {
      let q = p * f.settings.x * .65 + vec3f(u.noise.y, -u.noise.x * .7, u.noise.y * .25);
      acceleration = (curlNoise(q) + .45 * curlNoise(q * 2.03 + vec3f(13.7, 5.3, 19.1))) * f.axis.w;
    } else if f.center.w >= 2.0 {
      let delta = p - f.center.xyz;
      var radial = delta;
      if f.center.w == 2.0 {
        radial -= f.axis.xyz * dot(delta, f.axis.xyz);
      }
      let distance = length(radial);
      let radius = max(f.settings.x, .01);
      // Finite at the axis/center and smoothly localized around the radius.
      let direction = radial / max(distance, radius * .25);
      let falloff = 1.0 / (1.0 + dot(radial, radial) / (radius * radius));
      if f.center.w == 2.0 {
        acceleration = (cross(f.axis.xyz,
            direction) * f.axis.w - direction * f.settings.z + f.axis.xyz * f.settings.y) * falloff;
      } else {
        acceleration = direction * f.axis.w * falloff;
      }
    }
    result += acceleration * weight;
  }
  return result;
}
`,zj=`// Sparse audio probes. One thread per probe, in workgroups of 16 (up to 32 probes).
// Each probe reads one heat cell and the velocity cell under it plus that cell's six
// neighbors. Nothing here sums the grid, and nothing here writes a field.
@group(0) @binding(80) var<storage, read> audioProbePositions: array<vec4f>;
// xyzw: heat (empty unit), speed (m/s), vorticity (1/s), 1 when the field brick has a slot.
@group(0) @binding(81) var<storage, read_write> audioProbeResults: array<vec4f>;

@compute @workgroup_size(16)
fn sampleAudioProbes(@builtin(global_invocation_id) id: vec3u) {
  if id.x >= arrayLength(&audioProbePositions) {
    return;
  }
  let world = audioProbePositions[id.x].xyz;
  let fieldSpacing = u.fieldGrid.xyz;
  let velocitySpacing = u.velocityGrid.xyz;
  if fieldSpacing.x <= 0.0 || velocitySpacing.x <= 0.0 {
    audioProbeResults[id.x] = vec4f(0.0);
    return;
  }
  let fieldCell = vec3i(floor(world / fieldSpacing));
  let page = brickPage(fieldCell >> vec3u(brickShift(fieldSpacing)));
  let live = select(0.0, 1.0, page >= 0);
  let heat = loadCell(fields, fieldCell, fieldSpacing).y;

  let velocityCell = vec3i(floor(world / velocitySpacing));
  // Center, then +x, -x, +y, -y, +z, -z. Empty bricks load as zero.
  var sampled: array<vec3f, 7>;
  sampled[0] = loadCell(velocity, velocityCell, velocitySpacing).xyz;
  sampled[1] = loadCell(velocity, velocityCell + vec3i(1, 0, 0), velocitySpacing).xyz;
  sampled[2] = loadCell(velocity, velocityCell + vec3i(-1, 0, 0), velocitySpacing).xyz;
  sampled[3] = loadCell(velocity, velocityCell + vec3i(0, 1, 0), velocitySpacing).xyz;
  sampled[4] = loadCell(velocity, velocityCell + vec3i(0, -1, 0), velocitySpacing).xyz;
  sampled[5] = loadCell(velocity, velocityCell + vec3i(0, 0, 1), velocitySpacing).xyz;
  sampled[6] = loadCell(velocity, velocityCell + vec3i(0, 0, -1), velocitySpacing).xyz;
  var speed = 0.0;
  for (var i = 0u; i < 7u; i++) {
    speed = max(speed, length(sampled[i]));
  }
  // Same central difference as the vorticity debug view in scene-volume.wgsl.
  let scale = 1.0 / (2.0 * velocitySpacing);
  let dx = (sampled[1] - sampled[2]) * scale.x;
  let dy = (sampled[3] - sampled[4]) * scale.y;
  let dz = (sampled[5] - sampled[6]) * scale.z;
  let vorticity = length(vec3f(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x));
  audioProbeResults[id.x] = vec4f(heat, speed, vorticity, live);
}
`,Bj=`// FLAME-LIFETIME-001 equations used by the fluid solver.
struct FlameParams {
  rates: vec4f, // dt, lifespan, smoke/sec, heat/sec
  extra: vec4f, // authored target divergence (1/sec), padding
  counts: vec4u, // smoke, heat, expansion knot counts, reserved
};

// Products: smoke, heat and expansion.
struct FlameResult {
  lifetime: f32,
  products: vec3f
};

fn rampIntegral(channel: u32, lo: f32, hi: f32) -> f32 {
  var area = 0.0;
  for (var i = 1u; i < flameParams.counts[channel]; i++) {
    let a = flameKnots[channel * 8u + i - 1u];
    let b = flameKnots[channel * 8u + i];
    let left = max(lo, a.x);
    let right = min(hi, b.x);
    if right > left {
      let y0 = mix(a.y, b.y, (left - a.x) / (b.x - a.x));
      let y1 = mix(a.y, b.y, (right - a.x) / (b.x - a.x));
      area += (right - left) * (y0 + y1) * 0.5;
    }
  }
  return area;
}

fn evaluateFlame(before: f32) -> FlameResult {
  if before <= 0.0 {
    return FlameResult(0.0, vec3f(0));
  }
  let after = max(0.0, before - flameParams.rates.x / flameParams.rates.y);
  let smoke = flameParams.rates.z * flameParams.rates.y * rampIntegral(0u, after, before);
  let heat = flameParams.rates.w * flameParams.rates.y * rampIntegral(1u, after, before);
  // Average across the full step, including any inactive time after expiry.
  let expansion = flameParams.extra.x * (flameParams.rates.y * rampIntegral(2u,
      after,
      before) / flameParams.rates.x);
  return FlameResult(after, vec3f(smoke, heat, expansion));
}
`,Vj=`// Optional coarse smoke transport. Smoke is a cell-centered concentration, not a
// per-cell amount: source restriction averages fine-cell production by volume.
// Full-resolution smoke stays in the shared scalar transport path.
fn smokeVelocityAverage(p: vec3i) -> f32 {
  let ratio = max(1u, u32(round(u.velocityGrid.x / smokeSpacing().x)));
  if ratio == 1u {
    return sampleAt(smokeDensity, center(p), smokeSpacing()).x;
  }
  let first = vec3f(p) * f32(ratio);
  var density = 0.0;
  for (var z = 0u; z < ratio; z += 2u) {
    for (var y = 0u; y < ratio; y += 2u) {
      for (var x = 0u; x < ratio; x += 2u) {
        density += sampleCells(smokeDensity,
          first + vec3f(f32(x + 1u), f32(y + 1u), f32(z + 1u)),
          smokeSpacing()).x;
      }
    }
  }
  return density / f32(ratio * ratio * ratio / 8u);
}

// Exact box average using the texture unit to average each 2x2x2 fine-cell block.
fn smokeProduction(cell: vec3i) -> vec4f {
  let ratio = u32(u.noise.z);
  let first = vec3f(cell) * f32(ratio);
  var sum = vec4f(0);
  for (var z = 0u; z < ratio; z += 2u) {
    for (var y = 0u; y < ratio; y += 2u) {
      for (var x = 0u; x < ratio; x += 2u) {
        sum += sampleCells(fields,
          first + vec3f(f32(x + 1u), f32(y + 1u), f32(z + 1u)),
          u.fieldGrid.xyz);
      }
    }
  }
  return sum / f32(ratio * ratio * ratio / 8u);
}

fn smokeWork(group: vec3u, lane: u32) -> ListedCell {
  let index = listedBrick(group);
  let listed = index < brickList[0];
  var id = 0u;
  if listed {
    id = brickList[index + 1u];
  }
  loadHomeRecord(id, lane, listed);
  if !listed {
    return ListedCell(vec3i(0), 0u, false, false);
  }
  enterBrick(id, true);
  home.inWorkgroup = true;
  return ListedCell(home.brick * i32(brickSize()), id, true, true);
}

fn smokeCell(first: vec3i, index: u32) -> vec3i {
  let side = brickSize();
  return first + vec3i(vec3u(index % side, (index / side) % side, index / (side * side)));
}

fn smokeDonorBounds(base: vec3i) -> vec2f {
  let donors = blockAt(base, vec3i(1));
  if donors.mode == BLOCK_EMPTY {
    return vec2f(0);
  }
  var minimumDensity = 1e30;
  var maximumDensity = 0.0;
  for (var k = 0u; k < 8u; k++) {
    let offset = vec3i(vec3u(k, k >> 1u, k >> 2u) & vec3u(1u));
    let value = blockLoad(smokeDensity, donors, base, offset).x;
    minimumDensity = min(minimumDensity, value);
    maximumDensity = max(maximumDensity, value);
  }
  return vec2f(minimumDensity, maximumDensity);
}

// Rendering smooths into the predictor, including its sparse-domain aprons.
// Neighbor invocations restore populated aprons; these cells clear absent ones.
fn clearMissingSmokePredictorApron(cell: vec3i) {
  if u.fuel.w < .5 {
    return;
  }
  let last = (cell & cellMask()) == cellMask();
  if !any(last) {
    return;
  }
  let brick = cell >> vec3u(gridShift());
  let texel = slotTexel(cell, cellPage(cell));
  for (var m = 1u; m < 8u; m++) {
    let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
    if any(axes & !last) {
      continue;
    }
    let step = select(vec3i(0), vec3i(1), axes);
    if brickPage(brick + step) < 0 {
      textureStore(outputExpansion, texel + step, vec4f(0));
    }
  }
}

@compute @workgroup_size(64)
fn advectSmoke(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let work = smokeWork(group, lane);
  if !work.listed {
    return;
  }
  let side = brickSize();
  for (var index = lane; index < side * side * side; index += 64u) {
    let id = smokeCell(work.id, index);
    var trace = cellTrace(id);
    var density = 0.0;
    if !solidAt(center(id)) {
      let departure = traceBack(&trace);
      density = sampleAt(smokeDensity, departure, u.grid.xyz).x;
      if SCALAR_MACCORMACK {
        let base = vec3i(floor(departure / u.grid.xyz - .5));
        let bounds = smokeDonorBounds(base);
        textureStore(outputScalarDonors, donorTexel(id, 0u),
          vec4u(pack2x16float(bounds), 0u, 0u, 0u));
      }
    }
    storeExpansion(id, density);
    clearMissingSmokePredictorApron(id);
  }
}

@compute @workgroup_size(64)
fn evolveSmoke(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let work = smokeWork(group, lane);
  let side = brickSize();
  var support = 0u;
  if work.listed {
    for (var index = lane; index < side * side * side; index += 64u) {
      let id = smokeCell(work.id, index);
      var trace = cellTrace(id);
      var density = 0.0;
      if !solidAt(center(id)) {
        let predictor = load(auxiliary, id).x;
        var bounded = predictor;
        if SCALAR_MACCORMACK {
          let bounds = unpack2x16float(textureLoad(donorCells, donorTexel(id, 0u), 0).x);
          let minimumDensity = bounds.x;
          let maximumDensity = bounds.y;
          // A singleton donor range can only retain that value or fall back to the
          // predictor. When both are equal, reverse tracing cannot change the result.
          // Requiring predictor equality also preserves fresh-apron interpolation and
          // half-store rounding; no density cutoff or approximation is introduced.
          if minimumDensity != maximumDensity || predictor != minimumDensity {
            let original = load(smokeDensity, id).x;
            let reversedDensity = sampleAt(auxiliary, traceForward(&trace), u.grid.xyz).x;
            let corrected = predictor + .5 * (original - reversedDensity);
            bounded = select(corrected,
              predictor,
              corrected < minimumDensity || corrected > maximumDensity);
          }
        }
        let transported = truncateHalf(vec4f(bounded, 0, 0, 0)).x;
        // Fine evolution already applied half-step dissipation to source production.
        let produced = smokeProduction(id);
        density = max(0.0, transported * exp(-u.dynamics.x * u.grid.w) + produced.x);
        if produced.x == 0.0 && produced.z == 0.0 && max(density,
          max(produced.y, produced.w)) < DORMANT_CUTOFF {
          density = 0.0;
        }
        if density > u.dynamics.z {
          support |= contentSupport(id, traceVelocity(&trace));
        }
      }
      storeExpansion(id, density);
    }
  }
  recordContent(work.brick, work.listed, support, lane);
}

@group(0) @binding(74) var secondSmoke: texture_storage_3d<r16float, write>;
@group(0) @binding(75) var thirdSmoke: texture_storage_3d<r16float, write>;
fn zeroSmokeTexel(texel: vec3i) {
  textureStore(outputExpansion, texel, vec4f(0));
  textureStore(secondSmoke, texel, vec4f(0));
  textureStore(thirdSmoke, texel, vec4f(0));
}

@compute @workgroup_size(64)
fn zeroSmokeBricks(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let index = listedBrick(group);
  if index >= zeroList[0] {
    return;
  }
  let brick = zeroList[1u + 2u * index];
  let payload = zeroList[2u + 2u * index];
  let page = i32(payload & 0xffffffu);
  enterBrick(brick, true);
  let side = brickSize();
  let first = home.brick * i32(side);
  for (var i = lane; i < side * side * side; i += 64u) {
    let id = smokeCell(first, i);
    zeroSmokeTexel(slotTexel(id, page));
    if apronCopies(id) {
      for (var m = 1u; m < 8u; m++) {
        let step = apronStep(id, m);
        if all(step == vec3i(0)) {
          continue;
        }
        let neighbor = brickPage(home.brick - step);
        if neighbor >= 0 {
          zeroSmokeTexel(slotTexel(id, neighbor) + step * i32(side));
        }
      }
    }
    if (payload & FRESH_SLOT) != 0u {
      let cell = ZeroCell(id, page, true, true);
      for (var m = 1u; m < 8u; m++) {
        let texel = apronTexel(cell, m);
        if texel.w != 0 {
          zeroSmokeTexel(texel.xyz);
        }
      }
    }
  }
}
`,Hj=[`fluid-common.wgsl`,`fluid-sampling.wgsl`,`fluid-sources.wgsl`,`fluid-advection.wgsl`,`fluid-velocity-transport.wgsl`,`fluid-forces.wgsl`,`fluid-scalar-transport.wgsl`,`fluid-field-evolution.wgsl`,`fluid-content.wgsl`,`fluid-allocation.wgsl`,`fluid-zeroing.wgsl`,`fluid-pool-growth.wgsl`],Uj=Object.assign({"./shaders/fluid-advection.wgsl":Tj,"./shaders/fluid-allocation.wgsl":Ej,"./shaders/fluid-common.wgsl":Dj,"./shaders/fluid-content.wgsl":Oj,"./shaders/fluid-field-evolution.wgsl":kj,"./shaders/fluid-forces.wgsl":Aj,"./shaders/fluid-pool-growth.wgsl":jj,"./shaders/fluid-pressure-buffers.wgsl":Mj,"./shaders/fluid-sampling.wgsl":Nj,"./shaders/fluid-scalar-transport.wgsl":Pj,"./shaders/fluid-sources.wgsl":Fj,"./shaders/fluid-velocity-transport.wgsl":Ij,"./shaders/fluid-zeroing.wgsl":Lj}),Wj=Hj.map(e=>Uj[`./shaders/${e}`]).join(`
`),Gj=Mj+mj+hj+gj+_j+Bj+Wj+Vj+Rj+zj,Kj=Gj.replace(`var outputScalarDonors: texture_storage_3d<rgba32uint, write>`,`var outputScalarDonors: texture_storage_3d<r32uint, write>`),qj=60,Jj=0,Yj=1,Xj=2;function Zj(e,t,n){return(Math.imul(e,73856093)^Math.imul(t,19349663)^Math.imul(n,83492791))>>>0}var Qj=class{tiles=new Map;slots=[];dirty=!0;capacity=0;created=[];snapshot=[];ground=!0;version=0;get count(){return this.tiles.size}get changed(){return this.dirty}need(e,t,n){for(let r=e[2];r<=t[2];r++)for(let i=this.ground?Math.max(0,e[1]):e[1];i<=t[1];i++)for(let a=e[0];a<=t[0];a++){let e=`${a},${i},${r}`,t=this.tiles.get(e);if(t){t.needed=n,t.closing&&(t.closing=!1,this.dirty=!0);continue}let o=this.slots.indexOf(void 0);o<0&&(o=this.slots.length);let s={coord:[a,i,r],slot:o,needed:n,closing:!1};this.slots[o]=s,this.tiles.set(e,s),this.created.push(o),this.dirty=!0}}retire(e){for(let[t,n]of this.tiles)n.closing?(this.tiles.delete(t),this.slots[n.slot]=void 0,this.dirty=!0):e-n.needed>qj&&(n.closing=!0,this.dirty=!0);for(;this.slots.length&&!this.slots[this.slots.length-1];)this.slots.pop()}clear(){this.tiles.clear(),this.slots.length=0,this.created=[],this.dirty=!0}slotAt(e){return this.tiles.get(`${e[0]},${e[1]},${e[2]}`)?.slot??-1}get slotsUsed(){return this.slots.length}takeCreated(){let e=this.created.filter(e=>this.slots[e]);return this.created=[],e}get coordinates(){return this.snapshot}tables(e){if(e<this.slots.length)throw Error(`Tile capacity is below the tiles in use.`);this.capacity=e;let t=new Int32Array(e*32).fill(-1),n=256;for(;n<this.tiles.size*2;)n*=2;let r=new Int32Array(n*4).fill(-1);for(let n=0;n<e;n++)t.set([0,0,0,Jj],n*32);for(let e of this.tiles.values()){let[i,a,o]=e.coord,s=e.slot*32;t.set([i,a,o,e.closing?Xj:Yj],s);let c=Zj(i,a,o)&n-1;for(;r[c*4+3]>=0;)c=c+1&n-1;r.set([i,a,o,e.slot],c*4);for(let e=-1;e<=1;e++)for(let n=-1;n<=1;n++)for(let r=-1;r<=1;r++){let c=this.tiles.get(`${i+r},${a+n},${o+e}`);c&&(t[s+4+(e+1)*9+(n+1)*3+r+1]=c.slot)}}let{clusters:i,clusterOf:a}=this.clusters(),o=new Int32Array(e*4);for(let t=0;t<e;t++){let e=this.slots[t];o.set(e?[...e.coord,a.get(e)]:[0,0,0,-1],t*4)}return this.snapshot=this.slots.map(e=>e&&[...e.coord]),this.dirty=!1,this.version++,{records:t,hash:r,clusters:i,tiles:o}}clusters(){let e=new Map,t=[];for(let n of this.tiles.values()){if(e.has(n))continue;let r=t.length,i={lo:[...n.coord],hi:[...n.coord]};e.set(n,r);let a=[n];for(;a.length;){let[t,n,o]=a.pop().coord;for(let[e,r]of[t,n,o].entries())i.lo[e]=Math.min(i.lo[e],r),i.hi[e]=Math.max(i.hi[e],r);for(let i=-1;i<=1;i++)for(let s=-1;s<=1;s++)for(let c=-1;c<=1;c++){let l=this.tiles.get(`${t+c},${n+s},${o+i}`);l&&!e.has(l)&&(e.set(l,r),a.push(l))}}t.push(i)}let n=t.map((e,t)=>t),r=e=>n[e]===e?e:n[e]=r(n[e]);for(let e=!0;e;){e=!1;for(let i=0;i<t.length;i++)for(let a=i+1;a<t.length;a++){let o=r(i),s=r(a);o!==s&&$j(t[o],t[s])&&(t[o]={lo:t[o].lo.map((e,n)=>Math.min(e,t[s].lo[n])),hi:t[o].hi.map((e,n)=>Math.max(e,t[s].hi[n]))},n[s]=o,e=!0)}}let i=[],a=new Map;for(let e=0;e<t.length;e++)r(e)===e&&(a.set(e,i.length),i.push(t[e]));let o=new Map;for(let[t,n]of e)o.set(t,a.get(r(n)));return{clusters:i,clusterOf:o}}};function $j(e,t){return e.lo.every((n,r)=>n<=t.hi[r]&&t.lo[r]<=e.hi[r])}var eM=[`advectVelocityWithBounds`,`correctVelocity`,`computeCurl`,`applyForces`,`computeDivergence`,`project`,`evolveFields`,`advectScalars`,`exportScalars`],tM=[`applyForces`,`evolveFields`],nM=[`applyForces`,`evolveFields`],rM=[`advectVelocityWithBounds`,`correctVelocity`,`applyForces`,`project`,`evolveFields`],iM=[63,64,65,66];function aM(){let e={advectVelocityWithBounds:[0,1,6,8,13,19,29],correctVelocity:[0,1,3,5,6,8,20,21],computeCurl:[0,1,6],applyForces:[0,1,2,3,6,8,11,12,30,31,73],computeDivergence:[0,1,7,8,15],project:[0,1,4,6],evolveFields:[0,1,2,3,5,6,8,16,22,23,36],advectScalars:[0,1,2,6,8,13],exportScalars:[0,4,6]};for(let t of rM)e[t].push(71);for(let t of nM)e[t].push(9,70);for(let t of tM)e[t].push(26,27);for(let t of eM)e[t].push(37,...iM);let t=[0,49,...iM];Object.assign(e,{advectSmoke:[0,1,8,13,16,37,71,73,...iM],evolveSmoke:[0,1,2,3,5,8,16,36,37,71,73,...iM],zeroSmokeBricks:[0,16,49,74,75,...iM],buildBricks:[0,9,26,36,39,45,57,63,64,70],freeBricks:[0,39,45,46,47,48,57],allocateBricks:[0,36,39,41,45,46,47,48,57,69],linkBricks:[0,63,64,65,67],buildSolids:[0,10,25,49,63,65,70,72],finishBricks:[0,41,43,47,48,57],zeroVelocityBricks:[...t,6,7,58,59,60,61],zeroFieldBricks:[...t,6,16,58,59],growFreeList:[46,47,51],sampleAudioProbes:[0,1,2,63,64,65,66,80,81]});for(let t of Object.values(e))t.sort((e,t)=>e-t);return e}var oM=aM(),sM=new Set([`advectScalars`,`evolveFields`,`advectSmoke`,`evolveSmoke`]),cM=new Set(eM),lM=new Set([`zeroVelocityBricks`,`zeroFieldBricks`]),uM=new Set([`advectVelocityWithBounds`,`correctVelocity`,`computeCurl`,`applyForces`,`computeDivergence`,`project`,`exportScalars`]),dM=new Set([`advectSmoke`,`evolveSmoke`,`zeroSmokeBricks`]),fM=new Set([0,22,51]),pM=new Set([4,9,10,23,25,26,27,30,31,37,49,70,71,80]),mM=new Set([7,36,39,41,43,45,46,47,48,57,60,61,72,81]),hM=new Set([8,12]),gM={6:`rgba16float`,13:`rgba32uint`,16:`r16float`,19:`rgba16float`,29:`rgba16float`,58:`rgba16float`,59:`rgba16float`,67:`rgba32sint`,69:`r32sint`,74:`r16float`,75:`r16float`},_M=new Set([...iM,67,69]),vM=new Set([5]);function yM(e){let t={binding:e,visibility:GPUShaderStage.COMPUTE};return fM.has(e)?t.buffer={type:`uniform`}:pM.has(e)?t.buffer={type:`read-only-storage`}:mM.has(e)?t.buffer={type:`storage`}:hM.has(e)?t.sampler={type:`filtering`}:e in gM?t.storageTexture={access:`write-only`,format:gM[e],viewDimension:_M.has(e)?`2d`:`3d`}:t.texture=_M.has(e)?{viewDimension:`2d`,sampleType:`sint`}:vM.has(e)?{viewDimension:`3d`,sampleType:`uint`}:{viewDimension:`3d`,sampleType:`float`},t}function bM(e){return fM.has(e)||pM.has(e)||mM.has(e)}var xM=1,SM={velocity:0,velocityTall:12,field:24,zeroedVelocity:36,zeroedField:48,brick:60,zeroedBrick:72,brickOctet:84,smokeRender:144},CM=65535,wM=16,TM=16,EM=[`emitters`,`colliders`,`occupancy`,`meshTables`,`meshSources`,`forces`,`coverage`,`tileLists`],DM={emitters:9,colliders:10,occupancy:25,meshTables:26,meshSources:27,forces:30,coverage:31,tileLists:70},OM={emitters:80,colliders:112,occupancy:4,meshTables:4,meshSources:48,forces:16,coverage:4,tileLists:4},kM=[[1,0,0],[0,1,0],[0,0,1]],AM=28,jM=8;function MM(e,t){return e?{lo:e.lo.map((e,n)=>Math.min(e,t.lo[n])),hi:e.hi.map((e,n)=>Math.max(e,t.hi[n]))}:t}var NM=2,PM=28,FM=class e{device;voxelSize;velocityDivisor;smokeDivisor;scalarMacCormack;smokeBrickCells;smokePools=[];get smoke(){return this.smokePools[0]??this.field}get renderScratch(){return this.predictorApronDirty=!0,this.fieldForward}get renderSmokeScratch(){return this.smokePools.length?(this.smokePredictorApronDirty=!0,this.smokePools[1]):this.renderScratch}brickCells;brickShift;velocityBrickCells;velocityBrickShift;poolSide;voxelBudget=1/0;poolSlots=0;usedSlots=0;sourceIds=new Set;poolLimited=!1;cutoff=0;activeBrickCount=0;time=0;steps=0;field;velocity;expansionRate;velocityBack;fieldForward;predictorApronDirty=!1;smokePredictorApronDirty=!1;fieldCorrected;get velocityScratch(){return[this.fieldForward,this.fieldCorrected]}donors;curl;poolRows=0;maxSlots;freeSlots;pressure;divergence;poolState;poolTarget=0;poolGrownAt=0;directory=new Qj;tiles;tileTable;clusters=[];clusterTiles=new Int32Array;contentTiles=[];contentStep=-1;renderBoxes=[];renderClusters=[];renderTiles=new Int32Array;renderVersion=0;renderStale=!0;dispatchArgs;latestPressure;activityReads=[];activityBuffers=new Set;audioProbePositions;audioProbeResults;audioProbeReads=[];audioProbeBuffers=new Set;audioProbeLatest=null;audioProbeSerial=0;audioProbeUpload=new Float32Array(128);audioProbeBytes=0;epoch=0;pipelines=new Map;pressureSolver;bindings=new Map;ids=new WeakMap;nextId=0;forceFields;fieldUniform;smokeUniform;velocityUniform;growthUniform;flameUniform;flameRamps;scene=new Map;solids;solidsStale=!0;occupancy=[];occupancyOffsets=[];meshRecords;meshVersion=-1;meshCount=0;meshBounds=new WeakMap;uploads;meshRasterizer;sampler;noise;uniformData=new Float32Array(48);mayHaveFlame=!1;ground=!0;colliderCount=0;constructor(e,t){if(this.device=e,this.uploads=new lj(e.queue),!Number.isFinite(t.voxelSize)||t.voxelSize<1e-4||t.voxelSize>16)throw Error(`voxelSize must be from 0.0001 to 16 meters.`);if(this.voxelSize=t.voxelSize,this.velocityDivisor=t.velocityDivisor??1,!Ne.includes(this.velocityDivisor))throw Error(`velocityDivisor must be 1, 2 or 4.`);if(this.brickCells=t.brickSize??16,!Hn.includes(this.brickCells))throw Error(`brickSize must be 8, 16 or 32 fine cells.`);if(this.brickShift=Math.log2(this.brickCells),this.velocityBrickCells=this.brickCells/this.velocityDivisor,this.velocityBrickShift=Math.log2(this.velocityBrickCells),this.smokeDivisor=t.smokeDivisor??1,this.scalarMacCormack=t.scalarMacCormack??!0,typeof this.scalarMacCormack!=`boolean`)throw Error(`scalarMacCormack must be a boolean.`);if(!Jn.includes(this.smokeDivisor))throw Error(`smokeDivisor must be 1, 2 or 4.`);this.smokeBrickCells=this.brickCells/this.smokeDivisor,this.poolSide=p(this.velocityDivisor,e.limits,this.brickCells),this.maxSlots=this.poolSide**2*$t(this.brickCells,e.limits);let n=[t.voxelSize,t.voxelSize,t.voxelSize];this.meshRasterizer=new ij(n),this.forceFields=new cj(n.map(e=>e*this.velocityDivisor),this.velocityBrickCells);let r=(t,n,r)=>e.createBuffer({label:t,size:n,usage:r|GPUBufferUsage.COPY_DST});this.fieldUniform=r(`Field grid parameters`,192,GPUBufferUsage.UNIFORM),this.smokeUniform=r(`Smoke grid parameters`,192,GPUBufferUsage.UNIFORM),this.velocityUniform=r(`Velocity grid parameters`,192,GPUBufferUsage.UNIFORM),this.growthUniform=r(`Pool growth`,16,GPUBufferUsage.UNIFORM),this.flameUniform=r(`Flame evolution parameters`,48,GPUBufferUsage.UNIFORM),this.flameRamps=r(`Flame response ramps`,uj.length*8*8,GPUBufferUsage.STORAGE);for(let e of EM)this.upload(e,new Uint32Array(4));this.dispatchArgs=r(`Brick dispatch sizes`,156,GPUBufferUsage.STORAGE|GPUBufferUsage.INDIRECT),this.sampler=e.createSampler({label:`Trilinear advection`,minFilter:`linear`,magFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),this.allocate()}static async create(t,n){for(let e of[`shader-f16`,`texture-formats-tier1`])if(!t.features.has(e))throw Error(`Fire Pro requires the WebGPU device feature "${e}" for 16-bit simulation storage.`);let r=new e(t,n);try{let e=t.createShaderModule({label:`Three.js Fire Pro fluid solver`,code:r.scalarMacCormack?Gj:Kj}),n=(await e.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(n.length)throw Error(n.map(e=>`Fluid WGSL ${e.lineNum}: ${e.message}`).join(`
`));return await Promise.all(Object.entries(oM).map(async([n,i])=>{let a=t.createPipelineLayout({bindGroupLayouts:[t.createBindGroupLayout({entries:i.map(e=>{let t=yM(e);return e===13&&!r.scalarMacCormack&&(t.storageTexture.format=`r32uint`),t})})]});r.pipelines.set(n,await t.createComputePipelineAsync({label:n,layout:a,compute:{module:e,entryPoint:n,...sM.has(n)?{constants:{SCALAR_MACCORMACK:Number(r.scalarMacCormack)}}:{}}}))})),r.pressureSolver=await Sj.create(t,r.velocityUniform,r.velocityBrickCells),r.pressureSolver.setBricks(r.pressureBricks()),r.noise=await wj(t),r}catch(e){throw r.dispose(),e}}get velocitySpacing(){return this.voxelSize*this.velocityDivisor}get tileSize(){return 4*this.brickCells*this.voxelSize}sourceBricks(e,t){let n=this.brickCells*this.voxelSize;return e.size.reduce((r,i,a)=>{let o=Math.abs(e.velocity[a])+Math.abs(e.outwardSpeed),s=Math.min(n,2*this.velocitySpacing+o*t);return r*(Math.ceil(2*(Math.max(i,.03)+s)/n)+1)},1)}allocate(){this.predictorApronDirty=!1,this.smokePredictorApronDirty=!1;let e=l(this.poolSide,this.slotLimit());this.poolRows=_(e,this.poolSide),this.poolSlots=e,this.usedSlots=0,this.poolTarget=0,this.sourceIds.clear(),this.poolLimited=!1,this.velocity=this.poolTexture(`Velocity A`,`velocity`),this.velocityBack=this.poolTexture(`Velocity B`,`velocity`),this.curl=this.poolTexture(`Curl`,`velocity`),this.field=this.poolTexture(`Smoke output heat lifetime fuel`,`field`),this.smokePools=this.smokeDivisor===1?[]:[`Smoke A`,`Smoke predictor`,`Smoke B`].map(e=>this.poolTexture(e,`smoke`,`r16float`)),this.fieldForward=this.poolTexture(`Advected fields`,`field`),this.fieldCorrected=this.poolTexture(`Corrected fields`,`field`),this.expansionRate=this.poolTexture(`Flame target divergence`,`field`,`r16float`),this.createDonors(),this.freeSlots=this.device.createBuffer({label:`Free slots`,size:e*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.device.queue.writeBuffer(this.freeSlots,0,Uint32Array.from({length:e},(t,n)=>e-1-n)),this.poolState=this.device.createBuffer({label:`Free slot count and failed allocations`,size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.device.queue.writeBuffer(this.poolState,0,new Int32Array([e,0,0,0])),this.pressure=[this.slotScalars(`Pressure A`,e),this.slotScalars(`Pressure B`,e)],this.divergence=this.slotScalars(`Divergence`,e),this.latestPressure=this.pressure[0],this.solids=this.slotSolids(e),this.solidsStale=!0,this.directory.clear(),this.contentTiles=[],this.contentStep=-1,this.tiles=this.createTiles(wM),this.applyTiles(),this.updateBoxes([]),this.bindings.clear()}poolTexture(e,t,n=`rgba16float`,r=this.poolRows){let i=(t===`field`?this.brickCells:t===`smoke`?this.smokeBrickCells:this.velocityBrickCells)+1;return this.device.createTexture({label:`${e} pool`,size:Se(r,this.poolSide,i),dimension:`3d`,format:n,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST})}createDonors(e=this.poolRows){let t=Se(e,this.poolSide,this.brickCells);this.velocityDivisor===1&&(t[0]*=2),this.donors=this.device.createTexture({label:this.scalarMacCormack?`Shared compact donor bounds`:`Velocity trace donors`,size:t,dimension:`3d`,format:this.scalarMacCormack?`rgba32uint`:`r32uint`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING})}slotScalars(e,t){return this.device.createBuffer({label:e,size:t*this.velocityBrickCells**3*2,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})}slotSolids(e){return this.device.createBuffer({label:`Solid cells`,size:e*this.brickCells**3/8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})}upload(e,t){let n=Math.max(16,OM[e],Math.ceil(t.byteLength/4)*4),r=this.scene.get(e);if(!r||r.size<n){if(n>this.device.limits.maxStorageBufferBindingSize)throw Error(`The scene's ${e} exceed the GPU storage-buffer limit.`);r?.destroy(),r=this.device.createBuffer({label:`Scene ${e}`,size:Math.min(this.device.limits.maxStorageBufferBindingSize,Math.ceil(n*1.5/16)*16),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.scene.set(e,r),this.bindings.clear()}return this.uploads.write(r,t)}directoryTexture(e,t,n){return this.device.createTexture({label:e,size:n,format:t,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST})}clearEntries(e,t,n){n<=t||this.device.queue.writeTexture({texture:e,origin:[0,t]},new Int32Array((n-t)*64).fill(-1),{bytesPerRow:256},[64,n-t])}createTiles(e){let t=this.device.limits.maxTextureDimension2D;if(e>t)throw Error(`The simulation needs more than ${t} tiles.`);let n=e*64,r=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,i=(e,t)=>this.device.createBuffer({label:e,size:t,usage:r}),a=i(`Brick pages`,n*4);this.device.queue.writeBuffer(a,0,new Int32Array(n).fill(-1));let o=this.directoryTexture(`Brick entries`,`r32sint`,[64,e]);return this.clearEntries(o,0,e),{capacity:e,records:this.directoryTexture(`Tile records`,`rgba32sint`,[8,e]),entries:o,brickRecords:this.directoryTexture(`Brick records`,`rgba32sint`,[64*PM/4,e]),pages:a,activity:i(`Brick and tile content`,(n+e)*4),brickState:i(`Brick state`,n*4),activeBricks:i(`Active bricks`,(n+1)*4),zeroBricks:i(`Zeroed bricks`,(4*n+1)*4),blockRanks:i(`Slot ranks per block of bricks`,Math.ceil(n/256)*8)}}destroyTiles(e){for(let[t,n]of Object.entries(e))t!==`capacity`&&n.destroy()}applyTiles(){let e=this.directory,t=Math.max(wM,e.slotsUsed);if(t>this.tiles.capacity){let e=this.tiles.capacity;for(;e<t;)e*=2;let n=this.tiles,r=this.createTiles(e),i=this.device.createCommandEncoder({label:`Grow tiles`}),a=n.capacity*64*4;for(let e of[`pages`,`brickState`,`activity`])i.copyBufferToBuffer(n[e],0,r[e],0,a);for(let e of[`entries`,`brickRecords`])i.copyTextureToTexture({texture:n[e]},{texture:r[e]},[n[e].width,n.capacity]);this.device.queue.submit([i.finish()]),this.destroyTiles(n),this.tiles=r}let n=e.tables(this.tiles.capacity);this.clusters=n.clusters,this.clusterTiles=n.tiles,this.renderStale=!0;let r=this.device.queue;r.writeTexture({texture:this.tiles.records},n.records,{bytesPerRow:128},[8,this.tiles.capacity]);let i=n.hash.length/4/256;this.tileTable?.height!==i&&(this.tileTable?.destroy(),this.tileTable=this.directoryTexture(`Tile hash`,`rgba32sint`,[256,i])),r.writeTexture({texture:this.tileTable},n.hash,{bytesPerRow:4096},[256,i]);let a=new Int32Array(64).fill(-1),o=new Uint32Array(64);for(let t of e.takeCreated()){let e=t*64*4;r.writeBuffer(this.tiles.pages,e,a),r.writeBuffer(this.tiles.brickState,e,o),r.writeBuffer(this.tiles.activity,e,o),this.clearEntries(this.tiles.entries,t,t+1)}this.bindings.clear(),this.pressureSolver?.setBricks(this.pressureBricks())}pressureBricks(){return{list:this.tiles.activeBricks,zeroed:this.tiles.zeroBricks,dispatch:this.dispatchArgs,offsets:{tiles:SM.velocity,octets:SM.brickOctet,zeroed:SM.zeroedBrick,coarse:[96,108,120,132]},solids:this.solids,directory:{tiles:this.tiles.records,table:this.tileTable,entries:this.tiles.entries,bricks:this.tiles.brickRecords},tiles:this.tiles.capacity,slots:this.poolSlots}}slotLimit(){let e=Math.min(this.voxelBudget,Gn(this.velocityDivisor,this.device.limits,this.brickCells));return Math.max(1,Math.min(this.maxSlots,Math.floor(e/this.brickCells**3)))}reset(){this.epoch++,this.releaseActivityReads(),this.releaseAudioProbeReads(),this.releasePools(),this.destroyTiles(this.tiles),this.allocate(),this.time=0,this.steps=0,this.mayHaveFlame=!1,this.poolGrownAt=0,this.activeBrickCount=0}get renderBricks(){return{version:this.renderVersion,boxes:this.renderBoxes,tiles:this.renderTiles,pages:this.tiles.pages,active:this.tiles.activeBricks,zeroed:this.tiles.zeroBricks,dispatch:this.dispatchArgs,activeOffset:SM.brick,zeroedOffset:SM.zeroedBrick,fieldOffset:SM.field,smokeOffset:SM.smokeRender}}get memoryBytes(){let e=(e,t)=>e.width*e.height*e.depthOrArrayLayers*t,t=new Set([this.velocity,this.velocityBack,this.curl,this.field,this.fieldForward,this.fieldCorrected]),n=e(this.expansionRate,2)+e(this.donors,this.scalarMacCormack?16:4);for(let r of t)n+=e(r,8);for(let t of this.smokePools)n+=e(t,2);for(let e of[...this.pressure,this.divergence,this.solids,this.freeSlots,this.poolState,this.fieldUniform,this.smokeUniform,this.velocityUniform,this.growthUniform,this.flameUniform,this.flameRamps,this.dispatchArgs,this.tiles.pages,this.tiles.brickState,this.tiles.activity,this.tiles.activeBricks,this.tiles.zeroBricks,this.tiles.blockRanks,...this.activityBuffers])n+=e.size;n+=e(this.tiles.records,16)+e(this.tiles.entries,4)+e(this.tiles.brickRecords,16)+e(this.tileTable,16);for(let e of[`emitters`,`colliders`,`occupancy`,`tileLists`])n+=this.scene.get(e).size;return n+=this.pressureSolver?.memoryBytes??0,this.noise&&(n+=e(this.noise.texture,8)),n}get forceMemoryBytes(){return this.scene.get(`forces`).size+this.scene.get(`coverage`).size}get meshMemoryBytes(){return this.scene.get(`meshSources`).size+this.scene.get(`meshTables`).size}needBox(e,t,n){let r=this.tileSize;this.directory.need(e.map(e=>Math.floor((e-n)/r)),t.map(e=>Math.floor((e+n)/r)),this.steps)}bricksOver(e,t){let n=this.brickCells*this.voxelSize;return{lo:e.map(e=>Math.floor(e/n)),hi:t.map(e=>Math.floor(e/n))}}updateTiles(e){this.directory.retire(this.steps);let t=2*this.brickCells*this.voxelSize+this.tileSize,n=[];for(let r of e){if(r.samples?.length){let e=this.meshBounds.get(r.samples);if(!e){let t=[1/0,1/0,1/0],n=[-1/0,-1/0,-1/0];for(let{position:e}of r.samples)for(let r=0;r<3;r++)t[r]=Math.min(t[r],e[r]),n[r]=Math.max(n[r],e[r]);e={lo:t,hi:n},this.meshBounds.set(r.samples,e)}this.needBox(e.lo,e.hi,t+this.voxelSize),n.push(this.bricksOver(e.lo,e.hi));continue}let e=Math.max(...r.size,.03)+r.outwardSpeed*.25,i=r.position.map(t=>t-e),a=r.position.map(t=>t+e);this.needBox(i,a,t),n.push(this.bricksOver(i,a))}for(let{tile:e}of this.contentTiles)this.directory.need(e.map(e=>e-1),e.map(e=>e+1),this.steps);this.directory.changed&&this.applyTiles(),this.updateBoxes(n)}updateBoxes(e){let t=new Map,n=e=>{let n=e.lo.map((t,n)=>Math.floor((t+e.hi[n])/2));this.ground&&(n[1]=Math.max(0,n[1]));let r=this.directory.slotAt(n.map(e=>Math.floor(e/4)));if(r<0)return;let i=this.clusterTiles[r*4+3];t.set(i,MM(t.get(i),e))};for(let{tile:e,bricks:t}of this.contentTiles){let r=[0,1,2].map(e=>t>>e*4&15);n({lo:e.map((e,t)=>e*4+Math.log2(r[t]&-r[t])),hi:e.map((e,t)=>e*4+Math.floor(Math.log2(r[t])))})}for(let t of e)n(t);let r=[...t.keys()].sort((e,t)=>e-t),i=r.map(e=>{let n=t.get(e),r=this.clusters[e];return{lo:n.lo.map((e,t)=>Math.max(e-NM,r.lo[t]*4)),hi:n.hi.map((e,t)=>Math.min(e+NM,(r.hi[t]+1)*4-1))}});if(!(r.length===this.renderClusters.length&&r.every((e,t)=>e===this.renderClusters[t])&&i.every((e,t)=>[0,1,2].every(n=>e.lo[n]===this.renderBoxes[t].lo[n]&&e.hi[n]===this.renderBoxes[t].hi[n]))&&!this.renderStale)){this.renderStale=!1,this.renderBoxes=i,this.renderClusters=r,this.renderTiles=this.clusterTiles.slice();for(let e=3;e<this.renderTiles.length;e+=4)this.renderTiles[e]>=0&&(this.renderTiles[e]=r.indexOf(this.renderTiles[e]));this.renderVersion++}}encodeAllocation(e,t){for(let t of[`buildBricks`,`freeBricks`,`allocateBricks`,`linkBricks`,`finishBricks`])this.encode(e,t);(t||this.solidsStale)&&this.encode(e,`buildSolids`)}encodeZeroing(e){let[t,n]=this.pressure;this.encode(e,`zeroVelocityBricks`,{6:this.velocity,58:this.velocityBack,59:this.curl,7:t,60:n,61:this.divergence},{grid:`velocity`}),this.encode(e,`zeroFieldBricks`,{6:this.field,58:this.fieldForward,59:this.fieldCorrected,16:this.expansionRate},{grid:`field`}),this.smokeDivisor>1&&this.encode(e,`zeroSmokeBricks`,{16:this.smokePools[0],74:this.smokePools[1],75:this.smokePools[2]})}growPool(e){let t=this.slotLimit(),n=_(Math.min(e,t),this.poolSide),r=Math.min(t,n*this.poolSide);if(r<=this.poolSlots)return;let i=this.device.createCommandEncoder({label:`Grow brick pools`}),a=[],o=(e,t,r=!1)=>{let o=this.poolTexture(e.label.replace(/ pool$/,``),t,e.format,n);return r&&i.copyTextureToTexture({texture:e},{texture:o},[e.width,e.height,e.depthOrArrayLayers]),a.push(e),o};this.velocity=o(this.velocity,`velocity`,!0),this.velocityBack=o(this.velocityBack,`velocity`),this.curl=o(this.curl,`velocity`),this.field=o(this.field,`field`,!0),this.fieldForward=o(this.fieldForward,`field`),this.fieldCorrected=o(this.fieldCorrected,`field`),this.expansionRate=o(this.expansionRate,`field`,!0),this.smokePools=this.smokePools.map((e,t)=>o(e,`smoke`,t===0)),a.push(this.donors),this.createDonors(n);let s=[this.slotScalars(`Pressure A`,r),this.slotScalars(`Pressure B`,r)],c=this.pressure.indexOf(this.latestPressure);i.copyBufferToBuffer(this.latestPressure,0,s[c],0,this.latestPressure.size),a.push(...this.pressure,this.divergence),this.pressure=s,this.latestPressure=s[c],this.divergence=this.slotScalars(`Divergence`,r);let l=this.slotSolids(r);i.copyBufferToBuffer(this.solids,0,l,0,this.solids.size),a.push(this.solids),this.solids=l;let u=r-this.poolSlots,d=this.device.createBuffer({label:`Free slots`,size:r*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});i.copyBufferToBuffer(this.freeSlots,0,d,u*4,this.poolSlots*4),a.push(this.freeSlots),this.freeSlots=d,this.device.queue.writeBuffer(this.growthUniform,0,new Uint32Array([this.poolSlots,u,0,0])),this.bindings.clear();let f=un(this.device,i,{label:`Grow free list`});this.encode(f,`growFreeList`,{},{workgroups:[Math.ceil(u/64),1,1]}),f.end(),this.device.queue.submit([i.finish()]);for(let e of a)e.destroy();this.predictorApronDirty=!1,this.smokePredictorApronDirty=!1,this.poolRows=n,this.poolSlots=r,this.poolGrownAt=this.steps,this.pressureSolver?.setBricks(this.pressureBricks())}releasePools(){for(let e of[...this.pressure,this.divergence,this.solids])e.destroy();for(let e of new Set([this.velocity,this.velocityBack,this.curl,this.field,this.fieldForward,this.fieldCorrected,this.expansionRate,this.donors,...this.smokePools]))e.destroy();this.freeSlots.destroy(),this.poolState.destroy(),this.bindings.clear()}writeUniforms(){let e=this.uniformData;e[14]=this.smokeDivisor,e[15]=Math.log2(this.smokeBrickCells);let t=this.velocitySpacing;e.set([t,t,t,this.velocityBrickShift],20),e.set([this.voxelSize,this.voxelSize,this.voxelSize],24);let n=Math.max(0,this.poolSlots-this.slotLimit());e.set([this.poolSide,this.poolSide,n,this.brickShift],28),e.set([this.tiles.capacity*64,0,0,0],32),e.set([this.voxelSize,this.voxelSize,this.voxelSize],0),e[39]=Number(this.predictorApronDirty),this.device.queue.writeBuffer(this.fieldUniform,0,e),e.set([t,t,t],0),this.device.queue.writeBuffer(this.velocityUniform,0,e),e.set([1,1,1].map(()=>this.voxelSize*this.smokeDivisor),0),e[39]=Number(this.smokePredictorApronDirty),this.device.queue.writeBuffer(this.smokeUniform,0,e),e[39]=Number(this.predictorApronDirty)}brickId(e){let t=this.directory.slotAt(e.map(e=>Math.floor(e/4)));if(t<0)return-1;let[n,r,i]=e.map(e=>e&3);return t*64+(i*4+r)*4+n}packScene(e){let t=this.tileSize,n=this.brickCells*this.voxelSize,r=this.tiles.capacity,i=this.directory.coordinates,a=[0,1,2].map(()=>Array.from({length:r},()=>[])),o=(e,n,r)=>{let o=r?.lo.map(e=>Math.floor(e/t)),s=r?.hi.map(e=>Math.floor(e/t));if((o&&s?s.reduce((e,t,n)=>e*Math.max(0,t-o[n]+1),1):1/0)>this.directory.count){i.forEach((t,r)=>{t&&(!o||t.every((e,t)=>e>=o[t]&&e<=s[t]))&&a[e][r].push(n)});return}for(let t=o[2];t<=s[2];t++)for(let r=o[1];r<=s[1];r++)for(let i=o[0];i<=s[0];i++){let o=this.directory.slotAt([i,r,t]);o>=0&&a[e][o].push(n)}},s=(e,t,n)=>({lo:e.map(e=>e-n),hi:t.map(e=>e+n)}),c=e.sources.filter(e=>e.shape!==`mesh`),l=new Float32Array(Math.max(1,c.length)*20);c.forEach((e,t)=>{l.set([...e.position,1,...e.size,Number(e.shape===`box`),e.flame,e.heatRate,e.smokeRate,e.velocityResponse,...e.velocity,e.outwardSpeed,e.variation?.period??.5,e.variation?.strength??0,e.fuelRate??0,0],t*20);let r=e.size.map(e=>Math.max(e,.03));o(0,t,s(e.position.map((e,t)=>e-r[t]),e.position.map((e,t)=>e+r[t]),2*n))}),this.upload(`emitters`,l);let u=e.colliders.flatMap(e=>e.shape===`mesh`?[e.occupancy]:[]),d=!1;if(u.length!==this.occupancy.length||u.some((e,t)=>e!==this.occupancy[t])){this.occupancyOffsets=[];let e=0;for(let t of u){if(t.mask.length!==t.size.reduce((e,t)=>e*t,1))throw Error(`Mesh collider occupancy does not match its size.`);this.occupancyOffsets.push(e),e+=Math.ceil(t.mask.length/32)}let t=new Uint32Array(Math.max(1,e));u.forEach(({mask:e},n)=>{let r=this.occupancyOffsets[n];for(let n=0;n<e.length;n++)e[n]!==0&&(t[r+(n>>>5)]|=1<<(n&31))}),this.upload(`occupancy`,t),this.occupancy=u,d=!0}let f=new ArrayBuffer(Math.max(1,e.colliders.length)*AM*4),p=new Float32Array(f),m=new Int32Array(f),h=0;e.colliders.forEach((e,t)=>{let n=t*AM;if(e.shape===`mesh`){let{lo:r,size:i}=e.occupancy;p.set([0,0,0,2,1,1,1,0,1,0,0,0,0,1,0,0,0,0,1,0],n),m.set([...r,this.occupancyOffsets[h++],...i,0],n+20),o(2,t,{lo:r.map(e=>e*this.voxelSize),hi:r.map((e,t)=>(e+i[t])*this.voxelSize)});return}let[r,i,a]=e.axes??kM;p.set([...e.position,+(e.shape===`box`),...e.size,0,...r,0,...i,0,...a,0],n);let s=e.shape===`box`?[0,1,2].map(t=>Math.abs(r[t])*e.size[0]+Math.abs(i[t])*e.size[1]+Math.abs(a[t])*e.size[2]):e.size;o(2,t,{lo:e.position.map((e,t)=>e-s[t]),hi:e.position.map((e,t)=>e+s[t])})}),(this.upload(`colliders`,new Uint8Array(f))||e.colliders.length!==this.colliderCount)&&(d=!0),this.colliderCount=e.colliders.length,d&&(this.solidsStale=!0,this.pressureSolver.invalidateGeometry());let g=r*64,_=this.forceFields.prepare(e.forces??[],g,this.directory.version,e=>this.brickId(e));this.upload(`forces`,_.data),this.upload(`coverage`,_.coverage),_.reach.forEach((e,t)=>o(1,t,e&&s(e.lo,e.hi,n)));let v=this.meshRasterizer.prepare(e.sources);if(v.records!==this.meshRecords&&this.upload(`meshSources`,new Uint8Array(v.records)),v.records!==this.meshRecords||this.directory.version!==this.meshVersion||g!==this.meshCount){this.meshRecords=v.records,this.meshVersion=this.directory.version,this.meshCount=g;let e=new Int32Array(v.records),t=this.brickShift,n=this.brickCells-1,r=new Map,i=[];for(let a=1;a<=v.count;a++){let o=[0,1,2].map(t=>e[a*12+t]),s=this.brickId(o.map(e=>e>>t));if(s<0)continue;let c=r.get(s);c===void 0&&r.set(s,c=r.size),i.push([((c<<t|o[2]&n)<<t|o[1]&n)<<t|o[0]&n,a])}let a=new Int32Array(g+r.size*this.brickCells**3);a.fill(-1,0,g);for(let[e,t]of r)a[e]=t;for(let[e,t]of i)a[g+e]=t;this.upload(`meshTables`,a)}let y=r*jM;for(let e of a)for(let t of e)y+=t.length;let b=new Uint32Array(y),x=r*jM;for(let e=0;e<r;e++)a.forEach((t,n)=>{b.set([x,t[e].length],e*jM+2*n),b.set(t[e],x),x+=t[e].length});return this.upload(`tileLists`,b),{colliders:e.colliders.length,meshRecords:v.count}}step(e,t=ht){if(!Number.isFinite(t)||t<=0||t>1/30)throw Error(`Simulation step must be in (0, 1/30]. Use fixed substeps.`);this.substep(e,t),this.time+=t,this.steps++}substep(e,t){this.directory.ground!==this.ground&&(this.directory.ground=this.ground,this.pressureSolver.invalidateGeometry()),this.updateTiles(e.sources);let n=0;for(let r of e.sources)r.shape!==`mesh`&&!this.sourceIds.has(r.id)&&(n+=this.sourceBricks(r,t));this.sourceIds=new Set(e.sources.map(e=>e.id)),n>0&&(this.poolTarget=Math.max(this.poolTarget,Math.ceil((this.usedSlots+n)*1.5))),this.poolTarget>this.poolSlots&&this.growPool(this.poolTarget);let r=e.simulation,i=this.packScene(e),a=fj(e.combustion,t),o=e.fuel??Yt;this.mayHaveFlame||=o.enabled||e.sources.some(e=>e.flame>0),this.uniformData.set([0,0,0,t,r.buoyancy,r.cooling,r.smokeWeight,r.velocityDamping,r.dissipation,r.vorticity,this.cutoff,Number(!this.mayHaveFlame),this.time,r.seed,0,0,Number(this.solidsStale),i.colliders,i.meshRecords,Number(this.ground),0,0,0,0,0,0,0,0]),this.uniformData.set([o.ignitionHeat,o.burnRate,Number(o.enabled),Number(this.predictorApronDirty)],36),this.writeUniforms(),this.uploads.write(this.flameUniform,a.uniform),this.uploads.write(this.flameRamps,a.ramps);let s=new Uint32Array([0]);this.device.queue.writeBuffer(this.tiles.activeBricks,0,s),this.device.queue.writeBuffer(this.tiles.zeroBricks,0,s);let c=this.tiles.capacity*64;this.device.queue.writeBuffer(this.tiles.activity,c*4,new Uint32Array(this.tiles.capacity));let l=this.device.createCommandEncoder({label:`Fluid step ${this.steps}`}),u=un(this.device,l,{label:`Brick allocation`}),d=(e,t={},n={})=>this.encode(u,e,t,n);this.encodeAllocation(u,i.colliders>0),u.end(),this.solidsStale=!1,u=un(this.device,l,{label:`Fluid transport and forces`}),this.encodeZeroing(u);let f=this.velocityScratch;d(`advectVelocityWithBounds`,{6:this.velocityBack,13:this.donors,19:f[1],29:f[0]}),d(`correctVelocity`,{3:this.velocityBack,5:this.donors,6:this.curl,20:f[0],21:f[1]});let p=this.curl,m=this.velocity,h=this.velocityBack;d(`advectScalars`,{6:this.fieldForward,13:this.donors}),d(`evolveFields`,{3:this.fieldForward,5:this.donors,6:this.fieldCorrected,16:this.expansionRate}),[this.field,this.fieldCorrected]=[this.fieldCorrected,this.field],this.smokeDivisor>1&&(d(`advectSmoke`,{13:this.donors,16:this.smokePools[1]}),d(`evolveSmoke`,{3:this.smokePools[1],5:this.donors,16:this.smokePools[2]}),[this.smokePools[0],this.smokePools[2]]=[this.smokePools[2],this.smokePools[0]]),r.vorticity!==0&&d(`computeCurl`,{1:p,6:m}),d(`applyForces`,{1:p,3:m,6:h}),d(`computeDivergence`,{1:h,7:this.divergence}),u.end();let[g,_]=this.pressure;this.latestPressure=this.pressureSolver.solve(l,[this.latestPressure,this.latestPressure===g?_:g],this.divergence,xM),u=un(this.device,l,{label:`Fluid projection`});let v=this.curl;d(`project`,{1:h,4:this.latestPressure,6:v}),u.end(),this.curl=this.velocity,this.velocity=v;let y=this.activityRead();l.copyBufferToBuffer(this.tiles.activeBricks,0,y,0,4),l.copyBufferToBuffer(this.poolState,0,y,4,8),l.copyBufferToBuffer(this.tiles.activity,c*4,y,TM,this.tiles.capacity*4),this.encodeSolverField(l),l.clearBuffer(this.poolState,4,4),this.device.queue.submit([l.finish()]),this.predictorApronDirty=!1,this.smokePredictorApronDirty=!1,this.readActivity(y)}solverField;get solverFieldTexture(){return this.velocityScratch[1]}showSolverField(e){if(this.solverField=e,!e||!this.steps)return;let t=this.device.createCommandEncoder({label:`Solver field view`});this.encodeSolverField(t),this.device.queue.submit([t.finish()])}encodeSolverField(e){if(!this.solverField)return;let t=un(this.device,e,{label:`Solver field view`});this.encode(t,`exportScalars`,{4:this.solverField===`pressure`?this.latestPressure:this.divergence,6:this.velocityScratch[1]}),t.end()}encode(e,t,n={},r={}){let i=this.pipelines.get(t),a=r.grid===`smoke`||dM.has(t),o=r.grid?r.grid===`velocity`:uM.has(t),s=this.tiles,c={...Object.fromEntries(EM.map(e=>[DM[e],this.scene.get(e)])),0:a?this.smokeUniform:o?this.velocityUniform:this.fieldUniform,1:this.velocity,2:this.field,3:this.curl,4:this.latestPressure,8:this.sampler,11:this.noise?.texture,12:this.noise?.sampler,15:this.expansionRate,73:this.smoke,22:this.flameUniform,23:this.flameRamps,36:s.activity,37:s.activeBricks,39:s.brickState,41:s.activeBricks,43:this.dispatchArgs,44:s.pages,45:s.pages,46:this.freeSlots,47:this.poolState,48:s.zeroBricks,49:s.zeroBricks,51:this.growthUniform,57:s.blockRanks,63:s.records,64:this.tileTable,65:s.entries,66:s.brickRecords,71:this.solids,72:this.solids,67:s.brickRecords,69:s.entries,...n},l=oM[t],u=t+`:`+l.map(e=>this.id(c[e])).join(`|`),d=this.bindings.get(u);d||(d=this.device.createBindGroup({label:t,layout:i.getBindGroupLayout(0),entries:l.map(e=>{let n=c[e];if(!n)throw Error(`${t} has nothing bound at ${e}.`);return{binding:e,resource:bM(e)?{buffer:n}:yM(e).sampler?n:n.createView()}})}),this.bindings.set(u,d)),e.setPipeline(i),e.setBindGroup(0,d);let f=s.capacity*64;if(r.workgroups)e.dispatchWorkgroups(...r.workgroups);else if(dM.has(t))e.dispatchWorkgroupsIndirect(this.dispatchArgs,t===`zeroSmokeBricks`?SM.zeroedBrick:SM.brick);else if(cM.has(t)){let n=t===`advectVelocityWithBounds`||t===`correctVelocity`;e.dispatchWorkgroupsIndirect(this.dispatchArgs,o?n?SM.velocityTall:SM.velocity:SM.field)}else lM.has(t)?e.dispatchWorkgroupsIndirect(this.dispatchArgs,o?SM.zeroedVelocity:SM.zeroedField):t===`buildBricks`?e.dispatchWorkgroups(Math.ceil(f/256)):t===`finishBricks`?e.dispatchWorkgroups(1):t===`buildSolids`?this.solidsStale?e.dispatchWorkgroups(Math.min(f,CM),Math.ceil(f/CM)):e.dispatchWorkgroupsIndirect(this.dispatchArgs,SM.zeroedBrick):e.dispatchWorkgroups(Math.ceil(f/64))}id(e){if(!e)return-1;let t=this.ids.get(e);return t===void 0&&this.ids.set(e,t=this.nextId++),t}activityRead(){let e=TM+this.tiles.capacity*4;this.activityReads=this.activityReads.filter(t=>t.size===e||(this.discardActivityRead(t),!1));let t=this.activityReads.pop();if(t)return t;let n=this.device.createBuffer({label:`Activity readback`,size:e,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});return this.activityBuffers.add(n),n}discardActivityRead(e){this.activityBuffers.delete(e),e.destroy()}releaseActivityReads(){for(let e of this.activityBuffers)e.destroy();this.activityBuffers.clear(),this.activityReads=[]}readActivity(e){let t=this.steps,n=this.directory.coordinates,r=this.poolSlots,i=this.epoch;e.mapAsync(GPUMapMode.READ).then(()=>{if(i!==this.epoch){this.discardActivityRead(e);return}let a=e.getMappedRange(),[o]=new Uint32Array(a,0,1),[s,c]=new Int32Array(a,4,2),l=new Uint32Array(a,TM),u=[];for(let e=0;e<l.length;e++){let t=n[e];l[e]&&t&&u.push({tile:t,bricks:l[e]})}if(e.unmap(),this.activityReads.length<8&&e.size===TM+this.tiles.capacity*4?this.activityReads.push(e):this.discardActivityRead(e),t<this.contentStep||(this.contentStep=t,this.contentTiles=u,this.activeBrickCount=o,t<this.poolGrownAt))return;this.usedSlots=r-s;let d=this.slotLimit();this.poolLimited=c>0&&r>=d,c>0&&r<d&&(this.poolTarget=Math.max(this.poolTarget,Math.ceil((this.usedSlots+c)*1.5),r+this.poolSide))}).catch(()=>this.discardActivityRead(e))}async readBricks(){let e=this.directory.coordinates,t=this.tiles.capacity*64,n=this.brickCells*this.voxelSize,r=this.device.createBuffer({label:`Brick readback`,size:t*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),i=this.device.createCommandEncoder({label:`Read bricks`});i.copyBufferToBuffer(this.tiles.pages,0,r,0,t*4),this.device.queue.submit([i.finish()]);try{await r.mapAsync(GPUMapMode.READ);let i=new Int32Array(r.getMappedRange().slice(0));r.unmap();let a=[];for(let r=0;r<t;r++){let t=e[Math.floor(r/64)];if(!t||i[r]<0)continue;let o=r%64,s=[o&3,o>>2&3,o>>4].map((e,r)=>(t[r]*4+e)*n);a.push({min:s,max:s.map(e=>e+n)})}return a}finally{r.destroy()}}sampleAudioProbes(e){let t=e.length;if(t<4||t>32)throw Error(`Audio probes expect 4–32 positions.`);if(this.steps===0)return this.audioProbeSnapshot();this.ensureAudioProbeBuffers(t);let n=this.takeAudioProbeRead();if(!n)return this.audioProbeSnapshot();for(let n=0;n<t;n++){let t=e[n];this.audioProbeUpload[n*4]=t[0],this.audioProbeUpload[n*4+1]=t[1],this.audioProbeUpload[n*4+2]=t[2],this.audioProbeUpload[n*4+3]=0}this.device.queue.writeBuffer(this.audioProbePositions,0,this.audioProbeUpload.subarray(0,t*4));let r=this.device.createCommandEncoder({label:`Audio probes`}),i=un(this.device,r,{label:`Audio probes`});return this.encode(i,`sampleAudioProbes`,{80:this.audioProbePositions,81:this.audioProbeResults},{workgroups:[Math.ceil(t/16),1,1]}),i.end(),r.copyBufferToBuffer(this.audioProbeResults,0,n,0,t*16),this.device.queue.submit([r.finish()]),this.mapAudioProbes(n),this.audioProbeSnapshot()}audioProbeSnapshot(){return this.audioProbeLatest?{serial:this.audioProbeSerial,values:this.audioProbeLatest}:null}ensureAudioProbeBuffers(e){let t=e*16;if(!(this.audioProbePositions&&this.audioProbeBytes===t)){this.releaseAudioProbes();for(let e of[...this.bindings.keys()])e.startsWith(`sampleAudioProbes:`)&&this.bindings.delete(e);this.audioProbeBytes=t,this.audioProbePositions=this.device.createBuffer({label:`Audio probe positions`,size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.audioProbeResults=this.device.createBuffer({label:`Audio probe results`,size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC})}}takeAudioProbeRead(){let e=this.audioProbeReads.pop();if(e&&e.size===this.audioProbeBytes)return e;if(e&&this.discardAudioProbe(e),this.audioProbeBuffers.size>=3)return;let t=this.device.createBuffer({label:`Audio probe readback`,size:this.audioProbeBytes,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});return this.audioProbeBuffers.add(t),t}mapAudioProbes(e){let t=this.epoch;e.mapAsync(GPUMapMode.READ).then(()=>{if(t!==this.epoch||!this.audioProbeBuffers.has(e)){this.discardAudioProbe(e);return}let n=new Float32Array(e.getMappedRange().slice(0));if(e.unmap(),t!==this.epoch||e.size!==this.audioProbeBytes){this.discardAudioProbe(e);return}this.audioProbeReads.length<3?this.audioProbeReads.push(e):this.discardAudioProbe(e),this.audioProbeLatest=n,this.audioProbeSerial++}).catch(()=>this.discardAudioProbe(e))}discardAudioProbe(e){this.audioProbeBuffers.delete(e)&&e.destroy()}releaseAudioProbeReads(){this.audioProbeLatest=null;for(let e of this.audioProbeBuffers)e.destroy();this.audioProbeBuffers.clear(),this.audioProbeReads=[]}releaseAudioProbes(){this.releaseAudioProbeReads(),this.audioProbePositions?.destroy(),this.audioProbeResults?.destroy(),this.audioProbePositions=void 0,this.audioProbeResults=void 0,this.audioProbeBytes=0}dispose(){this.epoch++,this.releaseActivityReads(),this.releaseAudioProbes(),this.pressureSolver?.dispose(),this.tiles&&(this.releasePools(),this.destroyTiles(this.tiles),this.tileTable.destroy()),this.noise?.texture.destroy();for(let e of[this.fieldUniform,this.smokeUniform,this.velocityUniform,this.growthUniform,this.flameUniform,this.flameRamps,...this.scene.values(),this.dispatchArgs])e.destroy();this.pipelines.clear()}},IM=class{geometry;positions;indices;positionVersion;indexVersion;vertices;cacheKey=``;cached;constructor(e){let t=e.geometry,n=t.getAttribute(`position`),r=t.index;if(e.type===`SkinnedMesh`||e.type===`InstancedMesh`||Object.keys(t.morphAttributes).length)throw Error(`Mesh colliders require rigid, non-instanced geometry without morph targets.`);if(!n||n.itemSize!==3||t.drawRange.start!==0||Number.isFinite(t.drawRange.count))throw Error(`Mesh colliders require complete triangle geometry with three-component positions.`);let i=r?.count??n.count;if(!i||i%3)throw Error(`Mesh collider geometry must contain complete triangles.`);this.geometry=t,this.positions=n,this.indices=r,this.positionVersion=`isInterleavedBufferAttribute`in n?n.data.version:n.version,this.indexVersion=r?.version??0,this.vertices=new Float64Array(i*3);let a=new Map,o=new w,s=new w,c=new w,l=0;for(let e=0;e<i;e+=3){let t=[];for(let i=0;i<3;i++){let a=r?r.getX(e+i):e+i;if(!Number.isInteger(a)||a<0||a>=n.count)throw Error(`Mesh collider contains an invalid triangle index.`);let o=[n.getX(a),n.getY(a),n.getZ(a)];if(!o.every(Number.isFinite))throw Error(`Mesh collider contains nonfinite positions.`);this.vertices.set(o,(e+i)*3),t.push(o.join(`,`))}if(o.fromArray(this.vertices,e*3),s.fromArray(this.vertices,(e+1)*3),c.fromArray(this.vertices,(e+2)*3),s.sub(o).cross(c.sub(o)).lengthSq()!==0){l++;for(let e=0;e<3;e++){let n=t[e],r=t[(e+1)%3],i=n<r,o=i?`${n}|${r}`:`${r}|${n}`,s=a.get(o)??{count:0,winding:0};s.count++,s.winding+=i?1:-1,a.set(o,s)}}}if(!l||[...a.values()].some(e=>e.count!==2||e.winding!==0))throw Error(`Mesh colliders require closed, consistently wound manifold surfaces. Weld matching seam positions and close open edges.`)}voxelize(e,t,n,r){let i=e.geometry.getAttribute(`position`),a=i&&(`isInterleavedBufferAttribute`in i?i.data.version:i.version);if(e.geometry!==this.geometry||i!==this.positions||a!==this.positionVersion||e.geometry.index!==this.indices||(e.geometry.index?.version??0)!==this.indexVersion||e.geometry.drawRange.start!==0||Number.isFinite(e.geometry.drawRange.count))throw Error(`Mesh collider geometry changed. Remove and recreate the collider after editing geometry.`);let o=[...n,...r,...t.elements].join(`,`);if(o===this.cacheKey)return this.cached;let[s,c,l]=r,u=n.map((e,t)=>e/r[t]),d=Array.from({length:s*c},()=>[]),f=this.vertices.slice(),p=new w;for(let e=0;e<f.length;e+=3)p.fromArray(f,e).applyMatrix4(t),f[e]=(p.x+n[0]/2)/u[0],f[e+1]=p.y/u[1],f[e+2]=(p.z+n[2]/2)/u[2];let m=(e,t,n,r)=>(e[0]-n)*(t[1]-r)-(e[1]-r)*(t[0]-n),h=(e,t)=>t[1]>e[1]||t[1]===e[1]&&t[0]<e[0];for(let e=0;e<f.length;e+=9){let t=Array.from(f.subarray(e,e+3)),n=Array.from(f.subarray(e+3,e+6)),r=Array.from(f.subarray(e+6,e+9)),i=m(t,n,r[0],r[1]);if(i===0)continue;let a=Math.sign(i);i<0&&([n,r]=[r,n],i=-i);let o=Math.max(0,Math.ceil(Math.min(t[0],n[0],r[0])-.5)),l=Math.min(s-1,Math.floor(Math.max(t[0],n[0],r[0])-.5)),u=Math.max(0,Math.ceil(Math.min(t[1],n[1],r[1])-.5)),p=Math.min(c-1,Math.floor(Math.max(t[1],n[1],r[1])-.5));for(let e=u;e<=p;e++)for(let c=o;c<=l;c++){let o=[m(n,r,c+.5,e+.5),m(r,t,c+.5,e+.5),m(t,n,c+.5,e+.5)];o.some((e,i)=>e<0||e===0&&!h([n,r,t][i],[r,t,n][i]))||d[e*s+c].push({z:(o[0]*t[2]+o[1]*n[2]+o[2]*r[2])/i,sign:a})}}let g=new Uint32Array(s*c*l);return d.forEach((e,t)=>{e.sort((e,t)=>e.z-t.z);let n=0,r=0;for(let i=0;i<l;i++){for(;r<e.length&&e[r].z<=i+.5;)n+=e[r++].sign;n!==0&&(g[i*s*c+t]=1)}}),this.cacheKey=o,this.cached=g,g}},LM=class{samples;surfaceArea;geometry;positions;positionVersion;indices;indexVersion;constructor(e,t,n){let r=e.geometry,i=r.getAttribute(`position`);if(e.type===`SkinnedMesh`||e.type===`InstancedMesh`||Object.keys(r.morphAttributes).length)throw Error(`Mesh emitters require a rigid, non-instanced mesh without morph targets.`);if(!i||i.itemSize!==3)throw Error(`Mesh emitter geometry needs a three-component position attribute.`);this.geometry=r,this.positions=i,this.positionVersion=`isInterleavedBufferAttribute`in i?i.data.version:i.version,this.indices=r.getIndex(),this.indexVersion=this.indices?.version??0;let a=this.indices?.count??i.count;if(a%3!=0)throw Error(`Mesh emitter geometry must contain complete triangles.`);if(r.drawRange.start!==0||Number.isFinite(r.drawRange.count))throw Error(`Mesh emitters require complete geometry with no active draw range.`);let o=new Float64Array(a/3),s=new w,c=new w,l=new w,u=new w,d=new w,f=e=>{let t=e*3;s.fromBufferAttribute(i,this.indices?this.indices.getX(t):t),c.fromBufferAttribute(i,this.indices?this.indices.getX(t+1):t+1),l.fromBufferAttribute(i,this.indices?this.indices.getX(t+2):t+2),u.subVectors(c,s).cross(d.subVectors(l,s))},p=e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.z),m=0;for(let e=0;e<o.length;e++){if(f(e),!p(s)||!p(c)||!p(l))throw Error(`Mesh emitter geometry contains nonfinite positions.`);let t=u.length()*.5;if(!Number.isFinite(t))throw Error(`Mesh emitter triangle area exceeds the supported numeric range.`);t>1e-12&&(m+=t),o[e]=m}if(!(m>0))throw Error(`Mesh emitter geometry has no nondegenerate triangles.`);this.surfaceArea=m;let h=Math.min(8192,Math.max(256,Math.ceil(m/t**2*8))),g=n>>>0,_=()=>(g=Math.imul(g,1664525)+1013904223>>>0,g/4294967296);this.samples=[];let v=0;for(let e=0;e<h;e++){let n=(e+.5)/h*m;for(;o[v]<n;)v++;f(v),u.normalize();let r=Math.sqrt(_()),i=_(),a=s.clone().multiplyScalar(1-r).addScaledVector(c,r*(1-i)).addScaledVector(l,r*i).addScaledVector(u,t*.75);this.samples.push({position:a,weight:1/h})}}assertUnchanged(e){let t=e.geometry.getAttribute(`position`),n=t&&(`isInterleavedBufferAttribute`in t?t.data.version:t.version);if(e.geometry!==this.geometry||t!==this.positions||n!==this.positionVersion||e.geometry.index!==this.indices||(e.geometry.index?.version??0)!==this.indexVersion||e.geometry.drawRange.start!==0||Number.isFinite(e.geometry.drawRange.count))throw Error(`Mesh emitter geometry changed. Recreate the emitter after editing geometry.`)}};function RM(e){let t=structuredClone(e),n=e=>{e&&typeof e==`object`&&(Object.values(e).forEach(n),Object.freeze(e))};return n(t),t}function zM(e,t){e.updateWorldMatrix(!0,!1);let n=e.matrixWorld.elements;if(!n.every(Number.isFinite))throw Error(`${t} has a nonfinite transform.`);let r=[0,4,8].map(e=>new w(n[e],n[e+1],n[e+2])),i=r.some(e=>Math.abs(e.lengthSq()-1)>1e-5),a=Math.abs(r[0].dot(r[1]))+Math.abs(r[0].dot(r[2]))+Math.abs(r[1].dot(r[2]))>1e-5;if(i||a||e.matrixWorld.determinant()<0)throw Error(`${t} requires unit world scale without reflection or shear. Set dimensions through options.`)}var BM=class{removed=!1;host;constructor(e){this.host=e}assertAlive(){if(this.host.assertAlive(),this.removed)throw Error(`This Fire Pro handle has been removed.`)}},VM=class extends BM{object=new $n;forces=new Set;options;mesh;surface;transformCache;cachedSamples;cellSize;id;constructor(e,t,n,r,i=.1,a=1){super(e),this.id=t,this.cellSize=i,this.options=jt(n,r,!0),this.object.name=`Fire Pro ${t}`,n.shape?.type===`mesh`&&(this.mesh=n.shape.object,zM(this.mesh,`Mesh source`),this.surface=new LM(this.mesh,i,a),this.mesh.add(this.object))}getOptions(){return this.assertAlive(),RM(this.options)}configure(e){return this.assertAlive(),this.options=jt(e,this.options),this}start(){return this.assertAlive(),this.options.active=!0,this}stop(){return this.assertAlive(),this.options.active=!1,this}remove(){if(!this.removed){for(let e of this.forces)e.detachTarget(this);this.forces.clear(),this.removed=!0,this.object.removeFromParent(),this.host.detach(this)}}source(e=!1){if(this.assertAlive(),!this.options.active&&!e)return;zM(this.object,`Emitter`);let t=this.object.matrixWorld,n=new w().setFromMatrixPosition(t),r=new w;this.options.velocity&&r.fromArray(this.options.velocity.direction).transformDirection(t).multiplyScalar(this.options.velocity.speed),this.mesh&&this.surface.assertUnchanged(this.mesh);let i=!this.transformCache||t.elements.some((e,t)=>e!==this.transformCache[t]);this.mesh&&i&&(this.transformCache=[...t.elements],this.cachedSamples=this.surface.samples.map(e=>({position:e.position.clone().applyMatrix4(t).toArray(),weight:e.weight})));let a=this.options.shape.type===`sphere`?[this.options.shape.radius,this.options.shape.radius,this.options.shape.radius]:[this.cellSize,this.cellSize,this.cellSize];return{id:this.id,shape:this.options.shape.type,position:n.toArray(),size:a,...this.options.emission,velocity:r.toArray(),velocityResponse:this.options.velocity?60:0,outwardSpeed:0,samples:this.cachedSamples,surfaceArea:this.surface?.surfaceArea}}},HM=class extends BM{object=new $n;options;id;constructor(e,t,n={}){super(e),this.id=t,this.options=yn(n),this.object.name=`Fire Pro ${t}`}configure(e){return this.assertAlive(),this.options=yn(e,this.options),this}getOptions(){return this.assertAlive(),RM(this.options)}trigger(e={}){this.assertAlive(),this.host.assertReady(),nn(e,[`worldPosition`],`trigger`),zM(this.object,`Explosion`);let t=e.worldPosition===void 0?new w().setFromMatrixPosition(this.object.matrixWorld).toArray():ot(e.worldPosition,`worldPosition`);return this.host.queueExplosion(this,t,structuredClone(this.options)),this}remove(){this.removed||(this.removed=!0,this.object.removeFromParent(),this.host.detach(this))}},UM=class extends BM{options;targets;constructor(e,t,n){super(e),this.targets=n===void 0?void 0:[...new Set(n)],this.options=sn(t)}configure(e){return this.assertAlive(),this.options=sn(e,this.options),this}getOptions(){return this.assertAlive(),RM(this.options)}frame(){if(!this.options.active)return;let e=this.options,t=new w().fromArray(`center`in e?e.center:[0,0,0]),n=new w().fromArray(e.type===`wind`?e.direction:e.type===`vortex`?e.axis:[0,1,0]).normalize();return{type:e.type,sources:this.targets?.map(e=>e.source(!0)),center:t.toArray(),vector:n.toArray(),strength:e.strength,scale:e.type===`turbulence`?e.scale:`radius`in e?e.radius:1,lift:e.type===`vortex`?e.lift:0,inward:e.type===`vortex`?e.inward:0}}detachTarget(e){this.targets=this.targets?.filter(t=>t!==e),e.forces.delete(this)}remove(){this.removed||(this.removed=!0,this.targets?.forEach(e=>e.forces.delete(this)),this.host.detach(this))}},WM=class extends BM{options;meshCollider;maskKey=``;cachedMask;constructor(e,t){super(e),this.options=t,zM(t.object,`Collider`),t.shape.type===`mesh`&&(this.meshCollider=new IM(t.object))}meshMask(e){zM(this.options.object,`Mesh collider`);let t=this.options.object,n=t.matrixWorld,r=[...n.elements,...e].join(`,`);if(r===this.maskKey)return this.cachedMask;t.geometry.computeBoundingBox();let i=new Ae().copy(t.geometry.boundingBox).applyMatrix4(n),a=[0,1,2].map(t=>Math.floor(i.min.getComponent(t)/e[t])-1),o=[0,1,2].map(t=>Math.ceil(i.max.getComponent(t)/e[t])+1-a[t]),s=new Kt().makeTranslation(-(a[0]+o[0]/2)*e[0],-a[1]*e[1],-(a[2]+o[2]/2)*e[2]).multiply(n),c=o.map((t,n)=>t*e[n]);return this.cachedMask={mask:this.meshCollider.voxelize(t,s,c,o),lo:a,size:o},this.maskKey=r,this.cachedMask}frame(e){let t=this.options.shape;if(t.type===`mesh`)return{shape:`mesh`,occupancy:this.meshMask(e)};zM(this.options.object,`Collider`);let n=this.options.object.matrixWorld,r=[0,1,2].map(e=>new w().setFromMatrixColumn(n,e).toArray()),i=t.type===`sphere`?[t.radius,t.radius,t.radius]:t.size.map(e=>e*.5);return{shape:t.type,position:new w().setFromMatrixPosition(n).toArray(),size:i,axes:r}}remove(){this.removed||(this.removed=!0,this.host.detach(this))}},GM=`// The renderer's compute passes: the lighting and occupancy pools (lighting.wgsl) and the
// scene lights (scene-lights.wgsl). They read the field pool through the boxes'
// page tables (volume-bricks.wgsl), and the simulation's bricks directly.
struct RenderParams {
  grid: vec4f, // voxel size, log2 of the field brick size, shadow samples, flame opacity
  optical: vec4f, // smoke extinction, fire brightness, shadow extinction, anisotropy
  light: vec4f, // directional light direction, intensity
  smoke: vec4f, // smoke albedo RGB, hot-soot contribution
  fire: vec4f, // fire tint RGB, artistic temperature mapping
};

@group(0) @binding(0) var<uniform> u: RenderParams;
@group(0) @binding(1) var fields: texture_3d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(8) var smokeDensity: texture_3d<f32>;
@group(0) @binding(9) var pages: texture_2d<f32>;
@group(0) @binding(10) var boxes: texture_2d<f32>;
@group(0) @binding(11) var blackbodyLut: texture_2d<f32>;
// The simulation's bricks (FluidSimulation.ts RenderBricks): each brick id's page, every
// tile slot's coordinates and box, and the bricks that computed in the latest step, a
// workgroup each (bricks.wgsl).
@group(0) @binding(12) var<storage, read> brickPages: array<i32>;
@group(0) @binding(13) var<storage, read> tileBoxes: array<vec4i>;
@group(0) @binding(14) var<storage, read> activeBricks: array<u32>;
fn fieldShift() -> u32 {
  return u32(u.grid.y);
}

// A brick's edge in meters.
fn brickSize() -> f32 {
  return u.grid.x * exp2(u.grid.y);
}

// The world brick of brick id \`id\`, in a tile slot whose coordinates are \`tile\`.
fn brickOfId(id: u32, tile: vec3i) -> vec3i {
  let l = id & 63u;
  return tile * 4 + vec3i(vec3u(l & 3u, (l >> 2u) & 3u, l >> 4u));
}

// A filtered field sample at world point \`p\`, or zero outside \`box\`.
fn sampleWorld(box: FireProBox, p: vec3f) -> vec4f {
  let size = brickSize();
  if any(p < vec3f(box.origin) * size) || any(p > vec3f(box.origin + box.size) * size) {
    return vec4f(0);
  }
  var f = fireProField(fields, linearSampler, pages, box, fieldShift(), p / u.grid.x);
  if renderSmokeShift() < fieldShift() {
    f.x = renderSmokeAt(box, p / u.grid.x);
  }
  return f;
}

// Integral of Beer transmission over a homogeneous segment. The series handles
// vacuum/emission-only passes and avoids cancellation for optically thin wisps.
fn integratedTransmission(extinction: f32, distance: f32, attenuation: f32) -> f32 {
  let opticalDepth = extinction * distance;
  if opticalDepth < .001 {
    return distance * (1.0 - .5 * opticalDepth + opticalDepth * opticalDepth / 6.0);
  }
  return (1.0 - attenuation) / extinction;
}

fn emissionAt(f: vec4f) -> vec3f {
  return fireProEmission(f, u.smoke, u.fire, u.optical, u.grid.w, blackbodyLut, linearSampler);
}

// Field and smoke pools share slot coordinates, with different cell counts per slot.
// Infer the smoke lattice from their exact integer dimensions; no extra uniform is
// needed by the scene-light and volume-light caches.
fn renderSmokeShift() -> u32 {
  return fireProSmokeShift(fields, smokeDensity, fieldShift());
}

fn renderSmokeAt(box: FireProBox, fieldPosition: vec3f) -> f32 {
  let shift = renderSmokeShift();
  let ratio = f32(1u << (fieldShift() - shift));
  return fireProField(smokeDensity, linearSampler, pages, box, shift, fieldPosition / ratio).x;
}
`,KM=`// Shared by the camera raymarch, volume lighting and surface-light reduction.
// The lifetime/heat state is normalized VFX data. These coefficients are an artist
// display mapping, while Planck/CIE spectra and volume transport remain separate.
// Burning activity is a proxy for unresolved hot absorbing particles. Use the
// same coefficient in j = sigma_a * B(T) and in Beer attenuation (Kirchhoff's
// law); adding blackbody emission with zero absorption made thick fire additive.
// The fields hold smoke, heat, flame lifetime and fuel; fuel is never drawn.
// A flame's glow, from 0 to 1, at lifetime \`life\`: full until the last fifth of its life,
// then fading out with it.
fn fireProGlow(life: f32) -> f32 {
  return clamp(life * 5.0, 0.0, 1.0);
}

fn fireProFlameAbsorption(field: vec4f, flameOpacity: f32) -> f32 {
  return fireProGlow(field.z) * flameOpacity;
}

fn fireProExtinction(field: vec4f, optical: vec4f, flameOpacity: f32) -> f32 {
  return max(0.0, field.x) * optical.x + fireProFlameAbsorption(field, flameOpacity);
}

fn fireProEmission(
  field: vec4f,
  smoke: vec4f,
  fire: vec4f,
  optical: vec4f,
  flameOpacity: f32,
  lut: texture_2d<f32>,
  linearSampler: sampler
) -> vec3f {
  if optical.y <= 0.0 {
    return vec3f(0);
  }
  // Smoke albedo splits its extinction into scattering and absorption. Burning
  // particles add absorption/emission only; they do not scatter ambient light.
  let absorption = (1.0 - smoke.xyz) * max(0.0, field.x) * optical.x;
  let source = absorption * smoke.w + fireProFlameAbsorption(field, flameOpacity);
  if all(source == vec3f(0)) {
    return vec3f(0);
  }
  // Heat is normalized VFX state. A saturating response retains gradients in
  // concentrated sources; the temperature setting is the asymptotic ceiling.
  let heat = max(0.0, field.y);
  let kelvin = 800.0 + heat / (heat + 2.0) * (fire.w - 800.0);
  let size = f32(textureDimensions(lut).x);
  let coordinate = (clamp((kelvin - 500.0) / 9500.0, 0.0, 1.0) * (size - 1.0) + .5) / size;
  let spectrum = textureSampleLevel(lut, linearSampler, vec2f(coordinate, .5), 0);
  let thermal = spectrum.rgb * exp2(clamp(spectrum.a, -24.0, 10.0));
  // White retains the natural spectrum. Saturated artist colors progressively
  // replace its chromaticity, without claiming to model chemical line spectra.
  let tintPeak = max(fire.x, max(fire.y, fire.z));
  let saturation = 1.0 - min(fire.x, min(fire.y, fire.z)) / max(tintPeak, .000001);
  let peak = max(thermal.x, max(thermal.y, thermal.z));
  let colored = mix(thermal * tintPeak, fire.xyz * peak, saturation);
  return colored * source * optical.y;
}
`,qM=`// The renderer's view of the bricks (VolumeLighting.ts). It marches boxes of bricks, one
// for each cluster of touching tiles with something to draw, none overlapping another.
// Each box has a page table: the pages of its bricks (pool.wgsl), x fastest, from the
// box's first entry of a 2D texture. Positions are in cells of the world lattice with
// centers at .5: field cell c holds world points from c to c + 1 voxels.
// \`size\` bricks from brick \`origin\`, their pages from page table entry \`first\`.
struct FireProBox {
  origin: vec3i,
  first: i32,
  size: vec3i
};

// Boxes per row of the box texture, two texels each (VolumeLighting.ts BOX_ROW).
const FIRE_PRO_BOX_ROW: u32 = 256u;
// log2 of the entries per row of the page table (VolumeLighting.ts PAGE_ROW).
const FIRE_PRO_PAGE_ROW: u32 = 12u;
fn fireProBox(boxes: texture_2d<f32>, index: u32) -> FireProBox {
  let texel = vec2u((index % FIRE_PRO_BOX_ROW) * 2u, index / FIRE_PRO_BOX_ROW);
  let a = textureLoad(boxes, texel, 0);
  let b = textureLoad(boxes, texel + vec2u(1u, 0u), 0);
  return FireProBox(vec3i(a.xyz), i32(a.w), vec3i(b.xyz));
}

// The page of brick \`brick\`, or -1 outside the box or without a slot.
fn fireProPage(pages: texture_2d<f32>, box: FireProBox, brick: vec3i) -> i32 {
  let local = brick - box.origin;
  if any(local < vec3i(0)) || any(local >= box.size) {
    return -1;
  }
  let entry = u32(box.first + (local.z * box.size.y + local.y) * box.size.x + local.x);
  let column = entry & ((1u << FIRE_PRO_PAGE_ROW) - 1u);
  return i32(textureLoad(pages, vec2u(column, entry >> FIRE_PRO_PAGE_ROW), 0).x);
}

// The value of cell \`cell\` of a pool of \`1 << shift\`-cell bricks: zero in a brick without
// a slot.
fn fireProLoad(
  pool: texture_3d<f32>,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  cell: vec3i
) -> vec4f {
  let page = fireProPage(pages, box, cell >> vec3u(shift));
  if page < 0 {
    return vec4f(0);
  }
  return textureLoad(pool, poolOrigin(page, shift) + (cell & vec3i((1 << shift) - 1)), 0);
}

// A trilinear sample of a pool of \`1 << shift\`-cell bricks at \`position\`, in cells. A
// sample based in a brick with a slot is one filtered fetch inside that slot; its apron
// supplies the neighbors past the brick.
fn fireProSample(
  pool: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  position: vec3f
) -> vec4f {
  let base = vec3i(floor(position - .5));
  let brick = base >> vec3u(shift);
  let page = fireProPage(pages, box, brick);
  if page >= 0 {
    let texel = vec3f(poolOrigin(page, shift)) + position - vec3f(brick * (1 << shift));
    return textureSampleLevel(pool, linearSampler, texel / vec3f(textureDimensions(pool)), 0);
  }
  // The base brick has no slot. Unless the sample reaches the cells after it, so is the
  // sample empty; otherwise interpolate cell by cell.
  let last = (1 << shift) - 1;
  if all((base & vec3i(last)) < vec3i(last)) {
    return vec4f(0);
  }
  let f = position - .5 - vec3f(base);
  var value = vec4f(0);
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let w = mix(1.0 - f, f, vec3f(f32(x), f32(y), f32(z)));
        value += fireProLoad(pool, pages, box, shift, base + vec3i(x, y, z)) * (w.x * w.y * w.z);
      }
    }
  }
  return value;
}

// A filtered sample at \`position\`, in cells of \`1 << shift\`-cell bricks, clamped to the
// box's outer cell centers like a clamp-to-edge sampler.
fn fireProField(
  fields: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  position: vec3f
) -> vec4f {
  let size = f32(1 << shift);
  let lo = vec3f(box.origin) * size + .5;
  let hi = vec3f(box.origin + box.size) * size - .5;
  return fireProSample(fields, linearSampler, pages, box, shift, clamp(position, lo, hi));
}

// Field and smoke pools share slots. Their dimensions identify the smoke lattice.
fn fireProPoolShift(fieldWidth: u32, width: u32, shift: u32) -> u32 {
  let slots = fieldWidth / ((1u << shift) + 1u);
  return firstLeadingBit(width / slots - 1u);
}

fn fireProSmokeShift(fields: texture_3d<f32>, smoke: texture_3d<f32>, shift: u32) -> u32 {
  return fireProPoolShift(textureDimensions(fields).x, textureDimensions(smoke).x, shift);
}

// Pressure/divergence use velocity cells plus their apron inside a fine-grid
// scratch slot. Logical brick size is independent of physical slot stride.
// Clamp to the box as fireProField does, and interpolate missing base bricks explicitly.
fn fireProSolverField(
  pool: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  poolShift: u32,
  velocityShift: u32,
  position: vec3f
) -> f32 {
  let side = i32(1u << velocityShift);
  let lo = vec3f(box.origin * side) + .5;
  let hi = vec3f((box.origin + box.size) * side) - .5;
  let p = clamp(position, lo, hi);
  let base = vec3i(floor(p - .5));
  let brick = base >> vec3u(velocityShift);
  let page = fireProPage(pages, box, brick);
  if page >= 0 {
    let texel = vec3f(poolOrigin(page, poolShift)) + p - vec3f(brick * side);
    return textureSampleLevel(pool, linearSampler, texel / vec3f(textureDimensions(pool)), 0).x;
  }
  let f = p - .5 - vec3f(base);
  var value = 0.0;
  for (var z = 0; z < 2; z++) {
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        let cell = base + vec3i(x, y, z);
        let neighbor = fireProPage(pages, box, cell >> vec3u(velocityShift));
        if neighbor >= 0 {
          let texel = poolOrigin(neighbor, poolShift) + (cell & vec3i(side - 1));
          let w = mix(1.0 - f, f, vec3f(f32(x), f32(y), f32(z)));
          value += textureLoad(pool, texel, 0).x * (w.x * w.y * w.z);
        }
      }
    }
  }
  return value;
}

// Incident light at \`position\`, in lighting texels at the selected resolution, in a pool of
// \`1 << shift\`-texel bricks (lighting.wgsl buildLighting). A sample based in a brick
// without a slot is unlit and unshadowed: such bricks hold no smoke.
fn fireProLight(
  lighting: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  position: vec3f
) -> vec4f {
  let size = f32(1 << shift);
  let lo = vec3f(box.origin) * size + .5;
  let p = clamp(position, lo, vec3f(box.origin + box.size) * size - .5);
  let brick = vec3i(floor(p - .5)) >> vec3u(shift);
  let page = fireProPage(pages, box, brick);
  if page < 0 {
    return vec4f(0, 0, 0, 1);
  }
  let texel = vec3f(poolOrigin(page, shift)) + p - vec3f(brick * (1 << shift));
  return textureSampleLevel(lighting,
    linearSampler,
    texel / vec3f(textureDimensions(lighting)),
    0);
}

// Whether samples in the 8-cell block of field cell \`cell\`, in a brick of \`1 << shift\`
// cells at \`page\`, can find flame (x) and anything visible (y): the block's flags in the
// brick's slot of the occupancy pool (lighting.wgsl buildOccupancy).
fn fireProOccupancy(occupancy: texture_3d<f32>, page: i32, shift: u32, cell: vec3i) -> vec2f {
  let p = u32(page);
  let slot = vec3u(p & 255u, (p >> 8u) & 255u, p >> 16u);
  let block = vec3u(cell & vec3i((1 << shift) - 1)) >> vec3u(3u);
  return textureLoad(occupancy, slot * (1u << (shift - 3u)) + block, 0).xy;
}
`,JM=`// volume-common.wgsl supplies the shared uniform, field, sampler, bricks and optical model.
@group(0) @binding(3) var lightOutput: texture_storage_3d<rgba16float, write>;
@group(0) @binding(4) var occupancyOutput: texture_storage_3d<rg16float, write>;
@group(0) @binding(5) var pageOutput: texture_storage_2d<r32float, write>;
@group(0) @binding(7) var renderFieldOutput: texture_storage_3d<rgba16float, write>;
@group(0) @binding(17) var renderSmokeOutput: texture_storage_3d<r16float, write>;
// Write each brick's page into the page table of its box, every brick id a lane in rows of
// 65535 workgroups. Bricks outside every box keep the -1 their entries start with.
@compute @workgroup_size(64)
fn exportPages(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(num_workgroups) groups: vec3u
) {
  let id = gid.x + gid.y * groups.x * 64u;
  if id >= arrayLength(&brickPages) {
    return;
  }
  let tile = tileBoxes[id >> 6u];
  if tile.w < 0 {
    return;
  }
  let box = fireProBox(boxes, u32(tile.w));
  let local = brickOfId(id, tile.xyz) - box.origin;
  if any(local < vec3i(0)) || any(local >= box.size) {
    return;
  }
  let entry = u32(box.first + (local.z * box.size.y + local.y) * box.size.x + local.x);
  let column = entry & ((1u << FIRE_PRO_PAGE_ROW) - 1u);
  textureStore(
    pageOutput, vec2u(column, entry >> FIRE_PRO_PAGE_ROW), vec4f(f32(brickPages[id]), 0, 0, 0),
  );
}

// A brick with a slot inside its box: its id, page, box and world brick.
struct ListedBrick {
  id: u32,
  page: i32,
  box: FireProBox,
  brick: vec3i
};

// Brick \`id\`'s slot, box and place; false when it has no slot or lies in no box.
fn slotted(id: u32, result: ptr<function, ListedBrick>) -> bool {
  let page = brickPages[id];
  let tile = tileBoxes[id >> 6u];
  if page < 0 || tile.w < 0 {
    return false;
  }
  let box = fireProBox(boxes, u32(tile.w));
  let brick = brickOfId(id, tile.xyz);
  let local = brick - box.origin;
  if any(local < vec3i(0)) || any(local >= box.size) {
    return false;
  }
  *result = ListedBrick(id, page, box, brick);
  return true;
}

// The active brick of workgroup \`group\`, if it has a slot in a box.
fn listed(group: vec3u, result: ptr<function, ListedBrick>) -> bool {
  let index = listedBrick(group);
  return index < activeBricks[0] && slotted(activeBricks[1u + index], result);
}

// A rendering-only copy: smoke gets the separable [1,2,1]/4 filter in each axis;
// heat, flame lifetime and fuel retain their original values. Eight half-cell-offset
// trilinear fetches evaluate the 27-cell stencil. Read world neighbors through the
// page table, never adjacent pool slots. Write each slot's apron too so subsequent
// camera and shadow sampling needs only the usual single filtered fetch.
@compute @workgroup_size(64)
fn smoothSmoke(
  @builtin(workgroup_id) group: vec3u,
  @builtin(num_workgroups) groups: vec3u,
  @builtin(local_invocation_index) lane: u32
) {
  var work: ListedBrick;
  if !listed(group, &work) {
    return;
  }
  let shift = fieldShift();
  let side = 1u << shift;
  let edge = side + 1u;
  let origin = poolOrigin(work.page, shift);
  let first = work.brick * i32(side);
  // Fine-grid dispatches distribute independent outputs across groups in X;
  // Y/Z still identify the brick. Each texel keeps its original eight-tap sum.
  for (var index = group.x * 64u + lane; index < edge * edge * edge; index += groups.x * 64u) {
    let local = vec3i(vec3u(index % edge, (index / edge) % edge, index / (edge * edge)));
    let cell = first + local;
    let original = fireProLoad(fields, pages, work.box, shift, cell);
    var density = 0.0;
    for (var corner = 0u; corner < 8u; corner++) {
      let offset = vec3f(vec3u(corner, corner >> 1u, corner >> 2u) & vec3u(1u));
      density += fireProField(smokeDensity,
        linearSampler,
        pages,
        work.box,
        shift,
        vec3f(cell) + offset).x;
    }
    textureStore(renderFieldOutput, origin + local, vec4f(max(0.0, density * .125), original.yzw));
  }
}

// The same [1,2,1]/4 filter evaluated at coarse smoke cell centers, including aprons.
// Independent 64-lane chunks avoid smoothing and copying every fine-grid cell.
@compute @workgroup_size(64)
fn smoothCoarseSmoke(
  @builtin(workgroup_id) group: vec3u,
  @builtin(num_workgroups) groups: vec3u,
  @builtin(local_invocation_index) lane: u32
) {
  var work: ListedBrick;
  if !listed(group, &work) {
    return;
  }
  let shift = renderSmokeShift();
  let side = 1u << shift;
  let edge = side + 1u;
  let origin = poolOrigin(work.page, shift);
  let first = work.brick * i32(side);
  for (var index = group.x * 64u + lane; index < edge * edge * edge; index += groups.x * 64u) {
    let local = vec3i(vec3u(index % edge, (index / edge) % edge, index / (edge * edge)));
    let cell = first + local;
    var density = 0.0;
    for (var corner = 0u; corner < 8u; corner++) {
      let offset = vec3f(vec3u(corner, corner >> 1u, corner >> 2u) & vec3u(1u));
      density += fireProField(smokeDensity, linearSampler, pages, work.box, shift,
        vec3f(cell) + offset).x;
    }
    textureStore(renderSmokeOutput, origin + local, vec4f(max(0.0, density * .125), 0, 0, 0));
  }
}

// Smoothing can put density into a populated slot's apron even when the brick it
// represents has no slot. Include those donors in the conservative occupancy bound.
fn cachedSmokeCell(box: FireProBox, shift: u32, cell: vec3i) -> f32 {
  let brick = cell >> vec3u(shift);
  let local = cell & vec3i((1 << shift) - 1);
  let page = fireProPage(pages, box, brick);
  if page >= 0 {
    return textureLoad(smokeDensity, poolOrigin(page, shift) + local, 0).x;
  }
  for (var m = 1u; m < 8u; m++) {
    let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
    if any(axes & (local != vec3i(0))) {
      continue;
    }
    let step = select(vec3i(0), vec3i(1), axes);
    let previous = fireProPage(pages, box, brick - step);
    if previous >= 0 {
      return textureLoad(smokeDensity,
        poolOrigin(previous, shift) + local + step * (1 << shift), 0).x;
    }
  }
  return 0.0;
}

// A workgroup per active brick classifies its 8-cell blocks, each with the cubic
// reconstruction's two-cell halo: x is 1 when any cell has flame glow above the camera's
// .002 cutoff, y conservatively bounds smoke + glow on their respective grids. Positive reconstruction
// weights cannot exceed the largest donor, and glow only rises with lifetime, so the
// camera skips blocks with
// y = 0 and reconstructs flame-free fields (x = 0) with trilinear filtering. The halo
// is whole 2³-cell units, which never straddle bricks. Workgroup memory starts zeroed.
var<workgroup> occupied: atomic<u32>;
var<workgroup> smokeMaximum: atomic<u32>;
var<workgroup> glowMaximum: atomic<u32>;
@compute @workgroup_size(64)
fn buildOccupancy(
  @builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32
) {
  var work: ListedBrick;
  // Every lane takes the same branch: the brick is the workgroup's.
  if !listed(group, &work) {
    return;
  }
  let shift = fieldShift();
  let smokeShift = renderSmokeShift();
  let coarse = smokeShift < shift;
  let ratio = f32(1u << (shift - smokeShift));
  let perSide = 1u << (shift - 3u);
  let p = u32(work.page);
  let slot = vec3u(p & 255u, (p >> 8u) & 255u, p >> 16u) * perSide;
  let first = work.brick * (1 << shift);
  for (var block = 0u; block < perSide * perSide * perSide; block++) {
    let b = vec3u(block % perSide, (block / perSide) % perSide, block / (perSide * perSide));
    // Six units of 2³ cells per axis: the block's four and one each side.
    let origin = first + vec3i(b * 8u) - 2;
    var laneGlow = 0.0;
    for (var unit = lane; unit < 216u; unit += 64u) {
      // Both flags set: nothing left to find.
      if atomicLoad(&occupied) == 3u {
        break;
      }
      let cell = origin + vec3i(vec3u(unit % 6u, (unit / 6u) % 6u, unit / 36u) * 2u);
      let page = fireProPage(pages, work.box, cell >> vec3u(shift));
      if page < 0 {
        continue;
      }
      let texel = poolOrigin(page, shift) + (cell & vec3i((1 << shift) - 1));
      var flags = 0u;
      for (var corner = 0u; corner < 8u; corner++) {
        let offset = vec3i(vec3u(corner, corner >> 1u, corner >> 2u) & vec3u(1u));
        let f = textureLoad(fields, texel + offset, 0);
        let glow = fireProGlow(f.z);
        let smoke = select(f.x, 0.0, coarse);
        flags |= select(0u, 1u, glow > .002) | select(0u, 2u, smoke + glow > .002);
        if coarse {
          laneGlow = max(laneGlow, glow);
        }
      }
      if flags != 0u {
        atomicOr(&occupied, flags);
      }
    }
    if coarse {
      if laneGlow > 0.0 {
        atomicMax(&glowMaximum, bitcast<u32>(laneGlow));
      }
      // Every trilinear smoke donor in the block/halo. A sum of independent maxima
      // is conservative even when smoke and flame peak at different positions.
      let lo = vec3i(floor(vec3f(origin) / ratio - .5));
      let hi = vec3i(floor(vec3f(origin + 12) / ratio - .5)) + 1;
      let size = vec3u(hi - lo + 1);
      let smokeSide = 1 << smokeShift;
      let boxLo = work.box.origin * smokeSide;
      let boxHi = (work.box.origin + work.box.size) * smokeSide - 1;
      var laneSmoke = 0.0;
      for (var i = lane; i < size.x * size.y * size.z; i += 64u) {
        let cell = lo + vec3i(vec3u(i % size.x, (i / size.x) % size.y, i / (size.x * size.y)));
        let density = cachedSmokeCell(work.box, smokeShift, clamp(cell, boxLo, boxHi));
        laneSmoke = max(laneSmoke, density);
      }
      if laneSmoke > 0.0 {
        atomicMax(&smokeMaximum, bitcast<u32>(laneSmoke));
      }
    }
    workgroupBarrier();
    if lane == 0u {
      var flags = atomicLoad(&occupied);
      let maxSmoke = bitcast<f32>(atomicLoad(&smokeMaximum));
      let maxGlow = bitcast<f32>(atomicLoad(&glowMaximum));
      if coarse && maxSmoke + maxGlow > .002 {
        flags |= 2u;
      }
      textureStore(occupancyOutput, slot + b, vec4f(f32(flags & 1u), f32(flags >> 1u), 0, 0));
      atomicStore(&occupied, 0u);
      atomicStore(&smokeMaximum, 0u);
      atomicStore(&glowMaximum, 0u);
    }
    workgroupBarrier();
  }
}

// How far \`p\` lies from the box's faces along \`direction\`.
fn exitDistance(box: FireProBox, p: vec3f, direction: vec3f) -> f32 {
  let size = brickSize();
  let edge = select(vec3f(box.origin), vec3f(box.origin + box.size), direction > vec3f(0)) * size;
  // A parallel axis cannot limit the exit distance. Substituting a positive
  // epsilon made axis-aligned lights exit immediately through the wrong face.
  let moving = abs(direction) > vec3f(.000001);
  let distances = select(vec3f(1e30), (edge - p) / select(vec3f(1), direction, moving), moving);
  return max(0.0, min(distances.x, min(distances.y, distances.z)));
}

// Incident light at the center of a lighting texel at world point \`p\`: the sun's
// transmittance through the box to its edge, and a coarse isotropic glow from the fire
// around it.
fn incidentLight(box: FireProBox, p: vec3f) -> vec4f {
  let localField = sampleWorld(box, p);
  if localField.x + fireProGlow(localField.z) < .00001 {
    return vec4f(0, 0, 0, 1);
  }
  let sun = normalize(u.light.xyz);
  let count = u32(u.grid.z);
  let ds = exitDistance(box, p, sun) / f32(count);
  var opticalDepth = 0.0;
  if u.light.w > 0.0 {
    for (var i = 0u; i < count; i++) {
      let f = sampleWorld(box, p + sun * ((f32(i) + .5) * ds));
      opticalDepth += (max(0.0, f.x) * u.optical.z + fireProFlameAbsorption(f, u.grid.w)) * ds;
      if opticalDepth > 9.0 {
        break;
      }
    }
  }
  // Coarse isotropic incident fire radiance. Six rotated directions, growing
  // integration intervals, and Beer attenuation; this is a local approximation.
  let directions = array<vec3f, 6>(
    vec3f(.36, .48, -.8), vec3f(-.36, -.48, .8),
    vec3f(-.8, .6, 0), vec3f(.8, -.6, 0),
    vec3f(.48, .64, .6), vec3f(-.48, -.64, -.6)
  );
  var glow = vec3f(0);
  if u.optical.y > 0.0 && localField.x > .00001 {
    for (var direction = 0u; direction < 6u; direction++) {
      var t = 0.0;
      var interval = .075;
      var transmission = 1.0;
      for (var step = 0u; step < 6u; step++) {
        let f = sampleWorld(box, p + directions[direction] * (t + interval * .5));
        let extinction = fireProExtinction(f, u.optical, u.grid.w);
        let attenuation = exp(-extinction * interval);
        glow += transmission * emissionAt(f) * integratedTransmission(extinction,
          interval,
          attenuation) / 6.0;
        transmission *= attenuation;
        t += interval;
        interval *= 1.65;
      }
    }
  }
  return vec4f(glow, exp(-opticalDepth));
}

// Light a brick's slot of the selected lighting lattice, with an apron
// holding the first texels of the bricks after it, so the camera's filtered samples stay
// in the slot (volume-bricks.wgsl fireProLight). The workgroup's lanes share the texels.
// A build of every brick lights each texel once: a brick's first texels also fill the
// aprons of the bricks before it, and its apron takes only texels of bricks without a slot.
fn lightSlot(work: ListedBrick, lane: u32, every: bool) {
  let shift = fireProPoolShift(textureDimensions(fields).x, textureDimensions(lightOutput).x, fieldShift());
  let side = 1u << shift;
  let edge = side + 1u;
  let origin = poolOrigin(work.page, shift);
  let first = work.brick * i32(side);
  let texel = u.grid.x * f32(1u << (fieldShift() - shift));
  for (var index = lane; index < edge * edge * edge; index += 64u) {
    let local = vec3u(index % edge, (index / edge) % edge, index / (edge * edge));
    let past = vec3i(local == vec3u(side));
    if every && any(past != vec3i(0)) && fireProPage(pages, work.box, work.brick + past) >= 0 {
      continue;
    }
    let light = incidentLight(work.box, (vec3f(first + vec3i(local)) + .5) * texel);
    textureStore(lightOutput, origin + vec3i(local), light);
    if !every || any(past != vec3i(0)) {
      continue;
    }
    for (var m = 1u; m < 8u; m++) {
      let axes = (vec3u(m) & vec3u(1u, 2u, 4u)) != vec3u(0);
      if any(axes & (local != vec3u(0))) {
        continue;
      }
      let step = select(vec3i(0), vec3i(1), axes);
      let page = fireProPage(pages, work.box, work.brick - step);
      if page >= 0 {
        textureStore(lightOutput, poolOrigin(page, shift) + vec3i(local) + step * i32(side), light);
      }
    }
  }
}

// A workgroup per active brick.
@compute @workgroup_size(64)
fn buildLighting(
  @builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32
) {
  var work: ListedBrick;
  if listed(group, &work) {
    lightSlot(work, lane, true);
  }
}

// The bricks the latest step zeroed, a workgroup each: a count, then each brick's id and
// its page, the top bit marking a slot given that step (fluid-allocation.wgsl zeroBrick).
@group(0) @binding(6) var<storage, read> zeroedBricks: array<u32>;
// Light the slots the latest step gave out at once: until the next full build they would
// hold the light of the bricks that had them before.
@compute @workgroup_size(64)
fn lightFresh(
  @builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32
) {
  let index = listedBrick(group);
  if index >= zeroedBricks[0] || (zeroedBricks[2u + 2u * index] & 0x80000000u) == 0u {
    return;
  }
  var work: ListedBrick;
  if slotted(zeroedBricks[1u + 2u * index], &work) {
    lightSlot(work, lane, false);
  }
}
`,YM={exportPages:[5,10,12,13],smoothSmoke:[0,1,2,7,8,9,10,12,13,14],smoothCoarseSmoke:[0,1,2,8,9,10,12,13,14,17],buildOccupancy:[0,1,4,8,9,10,12,13,14],buildLighting:[0,1,2,3,8,9,10,11,12,13,14],lightFresh:[0,1,2,3,6,8,9,10,11,12,13]},XM={collectLights:[0,1,2,8,11,12,13,14,15,16]},ZM=new Set([6,12,13,14,15]),QM={3:[`rgba16float`,`3d`],4:[`rg16float`,`3d`],5:[`r32float`,`2d`],7:[`rgba16float`,`3d`],17:[`r16float`,`3d`]};function $M(e){let t={binding:e,visibility:GPUShaderStage.COMPUTE};if(e===0)t.buffer={type:`uniform`};else if(e===16)t.buffer={type:`storage`};else if(ZM.has(e))t.buffer={type:`read-only-storage`};else if(e===2)t.sampler={type:`filtering`};else if(e in QM){let[n,r]=QM[e];t.storageTexture={access:`write-only`,format:n,viewDimension:r}}else if(e===1||e===8)t.texture={viewDimension:`3d`};else if(e===9||e===10)t.texture={viewDimension:`2d`,sampleType:`unfilterable-float`};else if(e===11)t.texture={viewDimension:`2d`};else throw Error(`Unknown render binding ${e}.`);return t}function eN(e,t,n,r){let i=e.createBindGroupLayout({label:n,entries:r.map($M)});return e.createComputePipelineAsync({label:n,layout:e.createPipelineLayout({bindGroupLayouts:[i]}),compute:{module:t,entryPoint:n}})}var tN=256,nN=4096,rN=65535,iN=class e{device;uniform;sampler;blackbodyTexture;boxes;pages;tiles;occupancy;light;fields;smoke;boxList=[];version=-1;pipelines;stale=!0;lastStep=-1;lastLightStep=-1;occupancyStep=-1;lastSettings=``;groups=new Map;constructor(e,t,n,r){this.device=e,this.uniform=t,this.sampler=n,this.blackbodyTexture=r}static async create(t,n,r,i){let a=new e(t,n,r,i),o=t.createShaderModule({label:`Volume lighting and occupancy`,code:[KM,hj,qM,mj,GM,JM].join(`
`)}),s=(await o.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(s.length)throw Error(s.map(e=>`Lighting WGSL ${e.lineNum}: ${e.message}`).join(`
`));let c=Object.keys(YM),l=await Promise.all(c.map(e=>eN(t,o,e,YM[e])));return a.pipelines=Object.fromEntries(c.map((e,t)=>[e,l[t]])),a}invalidate(){this.lastSettings=``}get memoryBytes(){let e=(e,t)=>e?e.width*e.height*e.depthOrArrayLayers*t:0;return e(this.boxes,16)+e(this.pages,4)+e(this.occupancy,4)+e(this.light,8)+(this.tiles?.size??0)}sync(e){let t=e.renderBricks;if(t.version===this.version)return!1;this.version=t.version,this.boxList=t.boxes;let n=this.device,r=Math.max(1,Math.ceil(t.boxes.length/tN));this.boxes?.height!==r&&(this.boxes?.destroy(),this.boxes=n.createTexture({label:`Render boxes`,size:[tN*2,r],format:`rgba32float`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}));let i=new Float32Array(tN*8*r),a=0;t.boxes.forEach((e,t)=>{let n=e.hi.map((t,n)=>t-e.lo[n]+1);i.set([...e.lo,a,...n,0],t*8),a+=n[0]*n[1]*n[2]}),n.queue.writeTexture({texture:this.boxes},i,{bytesPerRow:tN*32},[tN*2,r]);let o=Math.max(1,Math.ceil(a/nN));if(o>n.limits.maxTextureDimension2D)throw Error(`The simulation spans more bricks than the renderer can address.`);return(!this.pages||this.pages.height<o)&&(this.pages?.destroy(),this.pages=n.createTexture({label:`Render page tables`,size:[nN,o],format:`r32float`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST})),n.queue.writeTexture({texture:this.pages},new Float32Array(nN*o).fill(-1),{bytesPerRow:nN*4},[nN,o]),(!this.tiles||this.tiles.size<t.tiles.byteLength)&&(this.tiles?.destroy(),this.tiles=n.createBuffer({label:`Render tiles`,size:Math.max(16,t.tiles.byteLength),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})),n.queue.writeBuffer(this.tiles,0,t.tiles),this.groups.clear(),this.stale=!0,!0}sizePools(e,t){let{field:n,brickCells:r}=e,i=r+1,a=[n.width,n.height,n.depthOrArrayLayers].map(e=>e/i),o=(e,t,n)=>this.device.createTexture({label:e,dimension:`3d`,size:a.map(e=>e*t),format:n,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),s=(e,t)=>e?.width===a[0]*t&&e.height===a[1]*t&&e.depthOrArrayLayers===a[2]*t,c=!1,l=e.smoke!==n,u=l?n:e.renderScratch,d=l?e.renderSmokeScratch:u;if(this.fields!==u||this.smoke!==d){let e=(e,t)=>e?.width===t.width&&e.height===t.height&&e.depthOrArrayLayers===t.depthOrArrayLayers;c=!e(this.fields,u)||!e(this.smoke,d)||this.fields===this.smoke!=(u===d),this.smoke!==d&&this.groups.clear(),this.fields=u,this.smoke=d}let f=r/8;s(this.occupancy,f)||(this.occupancy?.destroy(),this.occupancy=o(`Brick block flags`,f,`rg16float`),c=!0);let p=r/t+1;return s(this.light,p)||(this.light?.destroy(),this.light=o(`Incident volume lighting`,p,`rgba16float`),c=!0),c&&this.groups.clear(),c}encode(e,t,n,r=``,i=4){this.sync(t);let a=this.sizePools(t,i),o=this.stale,s=t.renderBricks,c=t.steps,l=[n.smokeDensity,n.shadowDensity,n.fireIntensity,n.flameOpacity,n.temperature,...n.fireColor,...n.smokeColor,n.sootGlow,r].join(`,`),u=c!==this.lastStep,d=o||a,f=u||d,p=u||o,m=this.occupancyStep!==c||d,h=c<this.lastLightStep||c-this.lastLightStep>=2,g=u&&h||d||l!==this.lastSettings,_=u&&!g;if(!s.boxes.length||!f&&!p&&!m&&!g&&!_)return!1;let v=t.smoke!==t.field,y=this.groups.get(t.field);y||(y=new Map,this.groups.set(t.field,y));let b=y.get(t.smoke);if(!b){let e={0:{buffer:this.uniform},1:t.field.createView(),2:this.sampler,3:this.light.createView(),4:this.occupancy.createView(),5:this.pages.createView(),6:{buffer:s.zeroed},7:this.fields.createView(),8:t.smoke.createView(),9:this.pages.createView(),10:this.boxes.createView(),11:this.blackbodyTexture.createView(),12:{buffer:s.pages},13:{buffer:this.tiles},14:{buffer:s.active},17:this.smoke.createView()};b=Object.fromEntries(Object.entries(YM).filter(([e])=>e!==(v?`smoothSmoke`:`smoothCoarseSmoke`)).map(([t,n])=>[t,this.device.createBindGroup({label:t,layout:this.pipelines[t].getBindGroupLayout(0),entries:n.map(n=>({binding:n,resource:n===1&&!t.startsWith(`smooth`)?this.fields.createView():n===8&&!t.startsWith(`smooth`)?this.smoke.createView():e[n]}))})])),y.set(t.smoke,b)}let x=un(this.device,e,{label:`Volume lighting and occupancy`},`lighting`),S=e=>{x.setPipeline(this.pipelines[e]),x.setBindGroup(0,b[e])};if(p){S(`exportPages`);let e=Math.ceil(s.pages.size/4/64);x.dispatchWorkgroups(Math.min(e,rN),Math.ceil(e/rN))}return f&&(S(v?`smoothCoarseSmoke`:`smoothSmoke`),x.dispatchWorkgroupsIndirect(s.dispatch,v?s.smokeOffset:s.fieldOffset)),m&&(S(`buildOccupancy`),x.dispatchWorkgroupsIndirect(s.dispatch,s.activeOffset),this.occupancyStep=c),g?(S(`buildLighting`),x.dispatchWorkgroupsIndirect(s.dispatch,s.activeOffset),this.lastLightStep=c,this.lastSettings=l):_&&(S(`lightFresh`),x.dispatchWorkgroupsIndirect(s.dispatch,s.zeroedOffset)),x.end(),this.lastStep=c,this.stale=!1,!0}dispose(){this.boxes?.destroy(),this.pages?.destroy(),this.tiles?.destroy(),this.light?.destroy(),this.occupancy?.destroy(),this.groups.clear()}},aN=`// Separable field reconstruction. Modes match RenderingOptions.filter order.
// B-splines use paired linear samples (Sigg/Hadwiger, GPU Gems 2 ch.20).
// \`position\` is in field cells; \`fields\` is a pool of \`1 << shift\`-cell bricks, sampled
// within \`box\` (volume-bricks.wgsl).
fn fireProReconstruct(
  fields: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  position: vec3f,
  mode: f32
) -> vec4f {
  if mode < .5 {
    return fireProField(fields, linearSampler, pages, box, shift, position);
  }
  let grid = position - .5;
  let base = floor(grid);
  let q = fract(grid);
  var positions: array<vec3f, 2>;
  var weights: array<vec3f, 2>;
  if mode < 1.5 {
    let center = floor(grid + .5);
    let delta = grid - center;
    let w0 = .5 * (.5 - delta) * (.5 - delta);
    let w1 = .75 - delta * delta;
    let w2 = .5 * (.5 + delta) * (.5 + delta);
    weights[0] = w0 + w1;
    weights[1] = w2;
    positions[0] = center - .5 + w1 / weights[0];
    positions[1] = center + 1.5;
  } else {
    let inv = 1 - q;
    let w0 = inv * inv * inv / 6;
    let w1 = (3 * q * q * q - 6 * q * q + 4) / 6;
    let w2 = (-3 * q * q * q + 3 * q * q + 3 * q + 1) / 6;
    let w3 = q * q * q / 6;
    weights[0] = w0 + w1;
    weights[1] = w2 + w3;
    positions[0] = base - .5 + w1 / weights[0];
    positions[1] = base + 1.5 + w3 / weights[1];
  }
  var value = vec4f(0);
  // Constant indices let the compiler keep positions/weights in registers.
  // Preserve the original accumulation order and all eight filtered samples.
  value += weights[0].x * weights[0].y * weights[0].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[0].x, positions[0].y, positions[0].z));
  value += weights[0].x * weights[0].y * weights[1].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[0].x, positions[0].y, positions[1].z));
  value += weights[0].x * weights[1].y * weights[0].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[0].x, positions[1].y, positions[0].z));
  value += weights[0].x * weights[1].y * weights[1].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[0].x, positions[1].y, positions[1].z));
  value += weights[1].x * weights[0].y * weights[0].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[1].x, positions[0].y, positions[0].z));
  value += weights[1].x * weights[0].y * weights[1].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[1].x, positions[0].y, positions[1].z));
  value += weights[1].x * weights[1].y * weights[0].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[1].x, positions[1].y, positions[0].z));
  value += weights[1].x * weights[1].y * weights[1].z * fireProField(fields,
    linearSampler,
    pages,
    box,
    shift,
    vec3f(positions[1].x, positions[1].y, positions[1].z));
  return max(value, vec4f(0));
}

// Smoke has already been smoothed on its own lattice. Reconstruct fine heat/flame/fuel
// with the authored filter, then sample coarse density once at the camera position.
// Full-resolution smoke is packed into the fine render field and needs no extra fetch.
fn fireProRenderField(
  fields: texture_3d<f32>,
  smoke: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  shift: u32,
  position: vec3f,
  mode: f32
) -> vec4f {
  var f = fireProReconstruct(fields, linearSampler, pages, box, shift, position, mode);
  let smokeShift = fireProSmokeShift(fields, smoke, shift);
  if smokeShift < shift {
    let ratio = f32(1u << (shift - smokeShift));
    f.x = fireProField(smoke, linearSampler, pages, box, smokeShift, position / ratio).x;
  }
  return f;
}
`,oN=`// Camera raymarch shared by the full-resolution volume draw and the half-resolution depth
// slices. Rays are in world meters and march the renderer's boxes (volume-bricks.wgsl) in
// order along the ray. \`grid\` holds the voxel size in meters, log2 of the field cells per
// brick and the number of boxes.
// Samples per voxel along a ray, unless the ray's length in the boxes needs more than
// \`raySteps\` of them.
const FIRE_PRO_STEP_VOXELS: f32 = .5;
fn min3(v: vec3f) -> f32 {
  return min(v.x, min(v.y, v.z));
}

// A pixel's view ray from the near plane.
struct FireProRay {
  origin: vec3f,
  direction: vec3f
};

fn fireProRay(inverseViewProjection: mat4x4f, uv: vec2f) -> FireProRay {
  let clip = uv * vec2f(2, -2) + vec2f(-1, 1);
  let nearH = inverseViewProjection * vec4f(clip, 0, 1);
  let farH = inverseViewProjection * vec4f(clip, .99999, 1);
  let ro = nearH.xyz / nearH.w;
  return FireProRay(ro, normalize(farH.xyz / farH.w - ro));
}

// Where the ray enters and leaves a box of bricks \`brickSize\` meters wide, from t = 0. The
// exit comes before the entry when the ray misses.
fn fireProHit(ray: FireProRay, box: FireProBox, brickSize: f32) -> vec2f {
  let safeRay = select(vec3f(.000001), ray.direction, abs(ray.direction) > vec3f(.000001));
  let a = (vec3f(box.origin) * brickSize - ray.origin) / safeRay;
  let b = (vec3f(box.origin + box.size) * brickSize - ray.origin) / safeRay;
  let lo = min(a, b);
  let hi = max(a, b);
  return vec2f(max(0.0, max(lo.x, max(lo.y, lo.z))), min3(hi));
}

// The ray's first entry into a box, its last exit, and its length inside every box. The
// entry follows the exit when it misses them all.
fn fireProSpan(ray: FireProRay, boxes: texture_2d<f32>, count: u32, brickSize: f32) -> vec3f {
  var span = vec3f(1e30, 0, 0);
  for (var i = 0u; i < count; i++) {
    let hit = fireProHit(ray, fireProBox(boxes, i), brickSize);
    if hit.y > hit.x {
      span = vec3f(min(span.x, hit.x), max(span.y, hit.y), span.z + hit.y - hit.x);
    }
  }
  return span;
}

// The box the ray is in at \`t\`, or the next one it enters: its entry, exit and index, or
// index -1. Boxes never overlap, so of the boxes the ray has not left yet, the one it
// enters first is the one.
fn fireProNext(
  ray: FireProRay,
  boxes: texture_2d<f32>,
  count: u32,
  brickSize: f32,
  t: f32
) -> vec3f {
  var next = vec3f(1e30, 0, -1);
  for (var i = 0u; i < count; i++) {
    let hit = fireProHit(ray, fireProBox(boxes, i), brickSize);
    if hit.y > hit.x && hit.y > t && hit.x < next.x {
      next = vec3f(hit, f32(i));
    }
  }
  return next;
}

// The step length of a ray \`length\` meters long inside the boxes.
fn fireProStep(grid: vec4f, length: f32, raySteps: f32) -> f32 {
  return max(grid.x * FIRE_PRO_STEP_VOXELS, length / raySteps);
}

// Distance to the opaque scene along the ray, or \`exit\` when the depth is empty.
fn fireProSceneDistance(
  inverseViewProjection: mat4x4f,
  uv: vec2f,
  ray: FireProRay,
  exit: f32,
  sceneDepth: f32
) -> f32 {
  if sceneDepth >= .999999 {
    return exit;
  }
  let clip = uv * vec2f(2, -2) + vec2f(-1, 1);
  let hit = inverseViewProjection * vec4f(clip, sceneDepth, 1);
  return min(exit, dot(hit.xyz / hit.w - ray.origin, ray.direction));
}

// Per-pixel noise in [0, 1) that offsets each sample inside its interval.
fn fireProJitter(pixel: vec2u, time: f32) -> f32 {
  var seed = vec3u(pixel, u32(time * 60.0)) * 1664525u + 1013904223u;
  seed.x += seed.y * seed.z;
  seed.y += seed.z * seed.x;
  seed.z += seed.x * seed.y;
  seed ^= seed >> vec3u(16u);
  seed.x += seed.y * seed.z;
  return f32(seed.x >> 8u) / 16777216.0;
}

// Source radiance (scattering + emission) and extinction of one visible sample at \`cell\`,
// in field cells of \`1 << shift\`-cell bricks.
fn fireProShade(
  f: vec4f,
  cell: vec3f,
  direct: vec3f,
  lighting: texture_3d<f32>,
  linearSampler: sampler,
  pages: texture_2d<f32>,
  box: FireProBox,
  lightShift: u32,
  lightRatio: f32,
  lut: texture_2d<f32>,
  optical: vec4f,
  smoke: vec4f,
  fire: vec4f,
  sootGlow: f32,
  ambientLight: vec4f
) -> vec4f {
  let glow = fireProEmission(f,
    vec4f(smoke.xyz, sootGlow),
    fire,
    optical,
    smoke.w,
    lut,
    linearSampler);
  let density = max(0.0, f.x) * optical.x;
  var scattering = vec3f(0);
  if density > 0.0 {
    let incident = fireProLight(lighting, linearSampler, pages, box, lightShift, cell / lightRatio);
    scattering = smoke.xyz * (ambientLight.xyz + direct * incident.w + incident.rgb * .65) * density;
  }
  return vec4f(scattering + glow, fireProExtinction(f, optical, smoke.w));
}

// The sun term's sample-independent factors, applied once per ray.
fn fireProDirect(direction: vec3f, optical: vec4f, light: vec4f, sceneLight: vec4f) -> vec3f {
  let g = optical.w;
  let mu = dot(direction, normalize(light.xyz));
  let phase = (1 - g * g) / pow(max(.05, 1 + g * g - 2 * g * mu), 1.5);
  return sceneLight.xyz * light.w * (.35 + phase * .3);
}

// Radiance and transmittance accumulated from the ray start up to \`t\`.
struct FireProMarch {
  t: f32,
  transmittance: f32,
  radiance: vec3f
};

// Where a march stands: the box it is in, and that box's exit.
struct FireProCursor {
  box: FireProBox,
  exit: f32
};

// The cursor at \`t\`: the box holding it, or else the next box and its entry in \`t\`.
// False past the last box.
fn fireProEnter(
  cursor: ptr<function, FireProCursor>,
  t: ptr<function, f32>,
  ray: FireProRay,
  boxes: texture_2d<f32>,
  grid: vec4f
) -> bool {
  let next = fireProNext(ray, boxes, u32(grid.z), grid.x * exp2(grid.y), *t);
  if next.z < 0.0 {
    return false;
  }
  *cursor = FireProCursor(fireProBox(boxes, u32(next.z)), next.y);
  *t = max(*t, next.x);
  return true;
}

// Integrate [state.t, end) through the boxes. Samples sit on a lattice of \`stepSize\` from
// where the march enters each box, jittered inside each interval; steps end at the box's
// exit. Jitter never moves the integration bounds: moving the start drops energy and can
// erase thin depth-clipped slices.
fn fireProMarch(
  state: ptr<function, FireProMarch>,
  end: f32,
  ray: FireProRay,
  stepSize: f32,
  jitter: f32,
  fields: texture_3d<f32>,
  smokeField: texture_3d<f32>,
  pages: texture_2d<f32>,
  boxes: texture_2d<f32>,
  grid: vec4f,
  reconstructionFilter: f32,
  linearSampler: sampler,
  lighting: texture_3d<f32>,
  occupancy: texture_3d<f32>,
  lut: texture_2d<f32>,
  optical: vec4f,
  light: vec4f,
  smoke: vec4f,
  fire: vec4f,
  sootGlow: f32,
  sceneLight: vec4f,
  ambientLight: vec4f
) {
  let rd = ray.direction;
  let safeRay = select(vec3f(.000001), rd, abs(rd) > vec3f(.000001));
  let exitSide = select(vec3f(0), vec3f(1), rd > vec3f(0));
  let voxel = grid.x;
  let shift = u32(grid.y);
  let lightShift = fireProPoolShift(textureDimensions(fields).x, textureDimensions(lighting).x, shift);
  let lightRatio = f32(1u << (shift - lightShift));
  let brickSize = voxel * exp2(grid.y);
  let direct = fireProDirect(rd, optical, light, sceneLight);
  var t = (*state).t;
  var transmittance = (*state).transmittance;
  var radiance = (*state).radiance;
  var cursor = FireProCursor(FireProBox(vec3i(0), 0, vec3i(0)), t);
  loop {
    if t >= end || transmittance < .008 {
      break;
    }
    if t >= cursor.exit {
      if !fireProEnter(&cursor, &t, ray, boxes, grid) {
        break;
      }
      continue;
    }
    let ds = min(stepSize, min(end, cursor.exit) - t);
    let p = ray.origin + rd * (t + jitter * ds);
    let cell = p / voxel;
    // A brick without a slot holds nothing. In one with a slot, the sample's 8-cell
    // block says whether it can find anything, and flame.
    let c = vec3i(floor(cell));
    let page = fireProPage(pages, cursor.box, c >> vec3u(shift));
    var size = brickSize;
    var flags = vec2f(0);
    if page >= 0 {
      flags = fireProOccupancy(occupancy, page, shift, c);
      size = voxel * 8.0;
    }
    if flags.y == 0.0 {
      // Skip whole steps past the empty block, keeping the lattice.
      let edge = (floor(p / size) + exitSide) * size;
      let distance = min3((edge - p) / safeRay);
      t = min(t + max(1.0, floor(distance / stepSize) + 1.0) * stepSize, cursor.exit);
      continue;
    }
    // Smoke was smoothed once on its own lattice. Flame keeps the authored filter.
    let f = fireProRenderField(
      fields, smokeField, linearSampler, pages, cursor.box, shift, cell,
      select(0.0, reconstructionFilter, flags.x > 0.0),
    );
    if f.x + fireProGlow(f.z) > .002 {
      let sample = fireProShade(
        f, cell, direct, lighting, linearSampler, pages, cursor.box, lightShift, lightRatio, lut, optical, smoke,
        fire, sootGlow, ambientLight,
      );
      let tau = sample.w * ds;
      var integral = ds * (1 - .5 * tau + tau * tau / 6);
      if tau >= .001 {
        integral = (1 - exp(-tau)) / sample.w;
      }
      radiance += transmittance * sample.rgb * integral;
      transmittance *= 1 - min(1.0, sample.w * integral);
    }
    // A step cut short by \`end\` stops exactly there, so a later call resumes
    // without a gap.
    t += ds;
  }
  *state = FireProMarch(t, transmittance, radiance);
}

// Debug views' colors, as linear radiance: a heat map of 0 to 1 (Google's Turbo, fitted by
// polynomials), and the sign of a signed value: blue below zero, red above. Opacity shows
// a signed value's size, so values near zero stay clear.
fn fireProHeatMap(x: f32) -> vec3f {
  let a = vec4f(1, x, x * x, x * x * x);
  let b = a.zw * a.z;
  let srgb = vec3f(
    dot(a,
      vec4f(.13572138, 4.6153926, -42.66032258, 132.13108234)) + dot(b,
      vec2f(-152.94239396, 59.28637943)),
    dot(a,
      vec4f(.09140261, 2.19418839, 4.84296658, -14.18503333)) + dot(b,
      vec2f(4.27729857, 2.82956604)),
    dot(a,
      vec4f(.1066733, 12.64194608, -60.58204836, 110.36276771)) + dot(b,
      vec2f(-89.90310912, 27.34824973)),
  );
  return pow(clamp(srgb, vec3f(0), vec3f(1)), vec3f(2.2));
}

fn fireProSignMap(x: f32) -> vec3f {
  return pow(select(vec3f(.85, .1, .16), vec3f(.23, .35, .9), x < 0.0), vec3f(2.2));
}
`,sN=`// Half-resolution camera march. Each texel stores the radiance and opacity accumulated
// from the first box entry to (k + 1) / count of the way to the last box exit, so the
// full-resolution volume draw can resume from the last depth in front of the scene.
struct SliceParams {
  inverseViewProjection: mat4x4f,
  optical: vec4f,
  light: vec4f,
  smoke: vec4f,
  fire: vec4f,
  grid: vec4f, // voxel size, log2 of the field brick size, box count
  sceneLight: vec4f,
  ambientLight: vec4f,
  sampling: vec4f, // ray steps, simulation time, reconstruction filter, soot glow
};

@group(0) @binding(0) var<uniform> params: SliceParams;
@group(0) @binding(1) var fields: texture_3d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var lighting: texture_3d<f32>;
@group(0) @binding(4) var occupancy: texture_3d<f32>;
@group(0) @binding(5) var lut: texture_2d<f32>;
@group(0) @binding(6) var slices: texture_storage_3d<rgba16float, write>;
@group(0) @binding(7) var pages: texture_2d<f32>;
@group(0) @binding(8) var boxes: texture_2d<f32>;
@group(0) @binding(9) var smokeField: texture_3d<f32>;
// One loop per ray records each depth as the march passes it. Separate marches per
// depth would make every lane wait for the slowest lane at each depth.
@compute @workgroup_size(8, 8)
fn buildSlices(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(slices);
  if any(id.xy >= size.xy) {
    return;
  }
  let uv = (vec2f(id.xy) + .5) / vec2f(size.xy);
  let ray = fireProRay(params.inverseViewProjection, uv);
  let grid = params.grid;
  let span = fireProSpan(ray, boxes, u32(grid.z), grid.x * exp2(grid.y));
  let count = size.z;
  let spacing = max(span.y - span.x, 0.0) / f32(count);
  let stepSize = fireProStep(grid, span.z, params.sampling.x);
  let jitter = fireProJitter(id.xy, params.sampling.y);
  let rd = ray.direction;
  let safeRay = select(vec3f(.000001), rd, abs(rd) > vec3f(.000001));
  let exitSide = select(vec3f(0), vec3f(1), rd > vec3f(0));
  let voxel = grid.x;
  let shift = u32(grid.y);
  let lightShift = fireProPoolShift(textureDimensions(fields).x, textureDimensions(lighting).x, shift);
  let lightRatio = f32(1u << (shift - lightShift));
  let brickSize = voxel * exp2(grid.y);
  let direct = fireProDirect(rd, params.optical, params.light, params.sceneLight);
  var t = span.x;
  var transmittance = 1.0;
  var radiance = vec3f(0);
  var recorded = 0u;
  var depth = span.x + spacing;
  var cursor = FireProCursor(FireProBox(vec3i(0), 0, vec3i(0)), t);
  loop {
    if recorded >= count || t >= span.y || transmittance < .008 {
      break;
    }
    if t >= cursor.exit {
      if !fireProEnter(&cursor, &t, ray, boxes, grid) {
        break;
      }
    } else {
      // Steps stop at the next recorded depth so each slice is exact, and at the box's
      // exit.
      let ds = min(stepSize, min(depth, cursor.exit) - t);
      let p = ray.origin + rd * (t + jitter * ds);
      let cell = p / voxel;
      let c = vec3i(floor(cell));
      let page = fireProPage(pages, cursor.box, c >> vec3u(shift));
      var size = brickSize;
      var flags = vec2f(0);
      var skip = 0.0;
      if page >= 0 {
        flags = fireProOccupancy(occupancy, page, shift, c);
        size = voxel * 8.0;
      }
      if flags.y == 0.0 {
        let edge = (floor(p / size) + exitSide) * size;
        skip = max(1.0, floor(min3((edge - p) / safeRay) / stepSize) + 1.0) * stepSize;
      }
      if skip > 0.0 {
        t = min(t + skip, cursor.exit);
      } else {
        let f = fireProRenderField(
          fields, smokeField, linearSampler, pages, cursor.box, shift, cell,
          select(0.0, params.sampling.z, flags.x > 0.0),
        );
        if f.x + fireProGlow(f.z) > .002 {
          let sample = fireProShade(
            f, cell, direct, lighting, linearSampler, pages, cursor.box, lightShift, lightRatio, lut,
            params.optical, params.smoke, params.fire, params.sampling.w, params.ambientLight,
          );
          let tau = sample.w * ds;
          var integral = ds * (1 - .5 * tau + tau * tau / 6);
          if tau >= .001 {
            integral = (1 - exp(-tau)) / sample.w;
          }
          radiance += transmittance * sample.rgb * integral;
          transmittance *= 1 - min(1.0, sample.w * integral);
        }
        t += ds;
      }
    }
    // A skip or a jump between boxes can pass several depths; each keeps the current
    // values.
    loop {
      if recorded >= count || t < depth {
        break;
      }
      textureStore(slices, vec3u(id.xy, recorded), vec4f(radiance, 1 - transmittance));
      recorded++;
      depth = span.x + spacing * f32(recorded + 1u);
    }
  }
  // Depths past the exit or an opaque ray hold the final values.
  for (var slice = recorded; slice < count; slice++) {
    textureStore(slices, vec3u(id.xy, slice), vec4f(radiance, 1 - transmittance));
  }
}
`,cN=8,lN=class e{device;sampler;pipeline;uniform;targets=new Map;retireBefore=-1/0;cleanupScheduled=!1;constructor(e,t){this.device=e,this.sampler=t,this.uniform=e.createBuffer({label:`Half-resolution volume parameters`,size:192,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}static async create(t,n){let r=new e(t,n),i=t.createShaderModule({label:`Half-resolution volume march`,code:[KM,hj,qM,aN,oN,sN].join(`
`)}),a=(await i.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(a.length)throw Error(a.map(e=>`Slices WGSL ${e.lineNum}: ${e.message}`).join(`
`));return r.pipeline=await t.createComputePipelineAsync({label:`buildSlices`,layout:`auto`,compute:{module:i,entryPoint:`buildSlices`}}),r}march(e){this.beginFrame(e.frame);let t=Math.max(1,Math.ceil(e.width/2)),n=Math.max(1,Math.ceil(e.height/2)),r=`${t}x${n}`,i=this.targets.get(r);i||(i={texture:this.device.createTexture({label:`Volume depth slices ${r}`,size:[t,n,cN],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),frame:e.frame},this.targets.set(r,i)),i.frame=e.frame;let a=i.texture;this.device.queue.writeBuffer(this.uniform,0,e.params);let o=this.device.createCommandEncoder({label:`Half-resolution volume`}),s=un(this.device,o,{label:`Half-resolution volume march`},`lighting`);return s.setPipeline(this.pipeline),s.setBindGroup(0,this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:e.fields.createView()},{binding:2,resource:this.sampler},{binding:3,resource:e.lighting.createView()},{binding:4,resource:e.occupancy.createView()},{binding:5,resource:e.lut.createView()},{binding:6,resource:a.createView()},{binding:7,resource:e.pages.createView()},{binding:8,resource:e.boxes.createView()},{binding:9,resource:e.smokeField.createView()}]})),s.dispatchWorkgroups(Math.ceil(t/8),Math.ceil(n/8)),s.end(),this.device.queue.submit([o.finish()]),a}beginFrame(e,t=!0){this.retireBefore=t?e-1:1/0,!this.cleanupScheduled&&(this.cleanupScheduled=!0,queueMicrotask(()=>{this.cleanupScheduled=!1;for(let[e,t]of this.targets)t.frame<this.retireBefore&&(t.texture.destroy(),this.targets.delete(e))}))}*textures(){for(let e of this.targets.values())yield e.texture}get memoryBytes(){let e=this.uniform.size;for(let{texture:t}of this.targets.values())e+=t.width*t.height*t.depthOrArrayLayers*8;return e}dispose(){for(let{texture:e}of this.targets.values())e.destroy();this.targets.clear(),this.uniform.destroy()}},uN=[[[.362,442,.0624,.0374],[1.056,599.8,.0264,.0323],[-.065,501.1,.049,.0382]],[[.821,568.8,.0213,.0247],[.286,530.9,.0613,.0322]],[[1.217,437,.0845,.0278],[.681,459,.0385,.0725]]],dN=Array.from({length:95},(e,t)=>{let n=360+t*5;return{wavelength:n,xyz:uN.map(e=>e.reduce((e,[t,r,i,a])=>{let o=(n-r)*(n<r?i:a);return e+t*Math.exp(-.5*o*o)},0))}});function fN(e,t){if(!Number.isFinite(e)||e<=0||!Number.isFinite(t)||t<=0)throw Error(`Wavelength and temperature must be positive and finite.`);let n=e*1e-9,r=662607015e-42,i=299792458;return 2*r*i*i/(n**5*Math.expm1(r*i/(n*1380649e-29*t)))}function pN(e){let t=[0,0,0];for(let n of dN){let r=fN(n.wavelength,e)*5e-9;for(let e=0;e<3;e++)t[e]+=n.xyz[e]*r}return t}function mN([e,t,n]){return[3.2406*e-1.5372*t-.4986*n,-.9689*e+1.8758*t+.0415*n,.0557*e-.204*t+1.057*n].map(e=>Math.max(0,e))}var hN=500,gN=Math.max(...mN(pN(1800)));function _N(e){let t=mN(pN(e)),n=Math.max(...t);return n<=0?[0,0,0,-32]:[...t.map(e=>e/n),Math.max(-32,Math.log2(n/gN))]}var vN;function yN(){if(!vN){vN=new Float32Array(2048);for(let e=0;e<512;e++)vN.set(_N(hN+9500*e/511),e*4)}return vN}function bN(e){let t=yN(),n=new Uint16Array(t.length);for(let e=0;e<n.length;e++)n[e]=mn.toHalfFloat(t[e]);let r=e.createTexture({label:`Blackbody spectrum (4 KiB)`,size:[512,1],format:`rgba16float`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});return e.queue.writeTexture({texture:r},n,{bytesPerRow:4096},[512,1]),r}var xN=`// Scene lights: every brick that computed adds the light of its flames to the anchor
// nearest it, an emitter or a burning explosion (SceneLights.ts). A workgroup per active
// brick samples its cells on a 4³ lattice, sums their emission, and adds the sums to its
// anchor's totals; the host reads the totals back and places each anchor's light at the
// centroid of its emission. This lights scene surfaces; it is not volumetric GI or
// geometry shadow transport. volume-common.wgsl supplies the uniform, fields, bricks and
// emission.
// The number of anchors, then each anchor's world position.
@group(0) @binding(15) var<storage, read> anchors: array<vec4f>;
// Eight floats an anchor, as bits: the emission's luminance, its luminance-weighted offset
// from the anchor, and its RGB, summed over the samples. Zeroed before each collection.
@group(0) @binding(16) var<storage, read_write> sums: array<atomic<u32>>;
var<workgroup> nearest: array<vec2f, 64>;
var<workgroup> positions: array<vec4f, 64>;
var<workgroup> colors: array<vec4f, 64>;
// Flames rise from their source: height above an anchor counts a quarter, below it in
// full.
fn anchorDistance(p: vec3f, anchor: vec3f) -> f32 {
  let d = p - anchor;
  let rise = select(d.y, d.y * .25, d.y > 0.0);
  return d.x * d.x + d.z * d.z + rise * rise;
}

fn addFloat(index: u32, value: f32) {
  var old = atomicLoad(&sums[index]);
  loop {
    let sum = bitcast<u32>(bitcast<f32>(old) + value);
    let exchange = atomicCompareExchangeWeak(&sums[index], old, sum);
    if exchange.exchanged {
      break;
    }
    old = exchange.old_value;
  }
}

@compute @workgroup_size(64)
fn collectLights(@builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) lane: u32) {
  let index = listedBrick(group);
  let count = u32(anchors[0].x);
  // Every lane takes the same branch: the brick is the workgroup's.
  if index >= activeBricks[0] || count == 0u {
    return;
  }
  let id = activeBricks[1u + index];
  let page = brickPages[id];
  if page < 0 {
    return;
  }
  let shift = fieldShift();
  let brick = brickOfId(id, tileBoxes[id >> 6u].xyz);
  let stride = 1u << (shift - 2u);
  let local = vec3u(lane & 3u, (lane >> 2u) & 3u, lane >> 4u) * stride + stride / 2u;
  var f = textureLoad(fields, poolOrigin(page, shift) + vec3i(local), 0);
  let smokeShift = renderSmokeShift();
  let ratio = f32(1u << (shift - smokeShift));
  let smokeTexel = vec3f(poolOrigin(page, smokeShift)) + (vec3f(local) + .5) / ratio;
  f.x = textureSampleLevel(smokeDensity,
    linearSampler,
    smokeTexel / vec3f(textureDimensions(smokeDensity)),
    0).x;
  let rgb = emissionAt(f);
  let luminance = dot(rgb, vec3f(.2126, .7152, .0722));
  // The anchor nearest the brick's center, the lanes taking turns through the anchors;
  // ties go to the first.
  let center = (vec3f(brick) + .5) * brickSize();
  var best = vec2f(1e38, 0);
  for (var i = lane; i < count; i += 64u) {
    let d = anchorDistance(center, anchors[1u + i].xyz);
    if d < best.x {
      best = vec2f(d, f32(i));
    }
  }
  nearest[lane] = best;
  workgroupBarrier();
  for (var reach = 32u; reach > 0u; reach >>= 1u) {
    if lane < reach {
      let other = nearest[lane + reach];
      let mine = nearest[lane];
      if other.x < mine.x || (other.x == mine.x && other.y < mine.y) {
        nearest[lane] = other;
      }
    }
    workgroupBarrier();
  }
  let anchor = u32(nearest[0].y);
  let p = (vec3f(brick * (1 << shift) + vec3i(local)) + .5) * u.grid.x;
  positions[lane] = vec4f(luminance, (p - anchors[1u + anchor].xyz) * luminance);
  colors[lane] = vec4f(rgb, 0);
  workgroupBarrier();
  for (var reach = 32u; reach > 0u; reach >>= 1u) {
    if lane < reach {
      positions[lane] += positions[lane + reach];
      colors[lane] += colors[lane + reach];
    }
    workgroupBarrier();
  }
  // Seven lanes add a total each.
  if lane < 7u {
    var totals = array<f32, 7>(
      positions[0].x, positions[0].y, positions[0].z, positions[0].w,
      colors[0].x, colors[0].y, colors[0].z,
    );
    addFloat(anchor * 8u + lane, totals[lane]);
  }
}
`,SN=8,CN=.01,wN=4,TN=10,EN=.01,DN=class e{device;parent;renderer;measured=new Map;fixed=[];pipeline;anchors;sums;readback;pending=!1;deferred;disposed=!1;generation=0;viewer=new w;constructor(e,t,n){this.device=e,this.parent=t,this.renderer=n}static async create(t,n,r){let i=new e(t,n,r);return i.pipeline=await eN(t,t.createShaderModule({label:`Scene lights`,code:[KM,hj,qM,mj,GM,xN].join(`
`)}),`collectLights`,XM.collectLights),i}get clustered(){return this.renderer.lighting instanceof tj}get memoryBytes(){return(this.anchors?.size??0)+(this.sums?.size??0)+(this.readback?.size??0)}finished(e){let t=this.measured.get(e);return!!(t?.transient&&t.readings>=TN&&t.intensity<=t.peak*EN)}sample(e){if(this.disposed)return;if(this.pending){this.deferred=e;return}let{simulation:t,lighting:n,anchors:r}=e,i=t.renderBricks;if(!r.length||!i.boxes.length){this.apply(e,new Float32Array(r.length*SN));return}n.sync(t);let a=this.device,o=r.length*SN*4,s=(r.length+1)*16;(!this.anchors||this.anchors.size<s)&&(this.anchors?.destroy(),this.anchors=a.createBuffer({label:`Scene light anchors`,size:s*2,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})),(!this.sums||this.sums.size<o)&&(this.sums?.destroy(),this.readback?.destroy(),this.sums=a.createBuffer({label:`Scene light totals`,size:o*2,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.readback=a.createBuffer({label:`Scene light readback`,size:o*2,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}));let c=new Float32Array(s/4);c[0]=r.length,r.forEach((e,t)=>c.set(e.position,(t+1)*4)),a.queue.writeBuffer(this.anchors,0,c);let l={0:{buffer:e.params},1:t.field.createView(),8:t.smoke.createView(),2:e.sampler,11:e.lut.createView(),12:{buffer:i.pages},13:{buffer:n.tiles},14:{buffer:i.active},15:{buffer:this.anchors},16:{buffer:this.sums}},u=a.createBindGroup({label:`Scene lights`,layout:this.pipeline.getBindGroupLayout(0),entries:XM.collectLights.map(e=>({binding:e,resource:l[e]}))}),d=a.createCommandEncoder({label:`Collect scene light`});d.clearBuffer(this.sums,0,o);let f=un(a,d,{label:`Scene lights`},`lighting`);f.setPipeline(this.pipeline),f.setBindGroup(0,u),f.dispatchWorkgroupsIndirect(i.dispatch,i.activeOffset),f.end();let p=this.readback;d.copyBufferToBuffer(this.sums,0,p,0,o),a.queue.submit([d.finish()]),this.pending=!0;let m=this.generation;p.mapAsync(GPUMapMode.READ,0,o).then(()=>{let t=new Float32Array(p.getMappedRange(0,o).slice(0));p.unmap(),!this.disposed&&m===this.generation&&this.apply(e,t)}).catch(()=>{this.disposed||this.reset()}).finally(()=>{this.pending=!1;let e=this.deferred;this.deferred=void 0,e&&!this.disposed&&this.sample(e)})}apply(e,t){let{anchors:n,intensity:r}=e,i=e.simulation.brickCells/4*e.voxelSize,a=new Set;n.forEach((e,n)=>{a.add(e.id);let[o,s,c,l,u,d,f]=t.subarray(n*SN,n*SN+7),p=this.measured.get(e.id);p||(p={position:new w,color:new de,intensity:0,transient:e.transient,peak:0,readings:0},this.measured.set(e.id,p));let m=Math.max(0,o)*i**3;p.position.set(...e.position),o>0&&p.position.add(new w(s,c,l).divideScalar(o));let h=Math.max(u,d,f,1e-8);p.color.setRGB(u/h,d/h,f/h),p.intensity=Math.min(400,m*2*r),p.peak=Math.max(p.peak,p.intensity),p.readings++});for(let[e,t]of this.measured)a.has(e)||(this.release(t),this.measured.delete(e));this.place()}place(){let e=[...this.measured.values()].filter(e=>e.intensity>0);if(this.clustered){for(let e of this.fixed.splice(0))this.remove(e);for(let e of this.measured.values()){if(e.intensity<=0){this.release(e);continue}e.light??=this.add(),this.copy(e,e.light)}return}for(let e of this.measured.values())this.release(e);for(;this.fixed.length<wN;)this.fixed.push(this.add());let t=e.map(e=>({measured:e,light:e.intensity/Math.max(1e-6,e.position.distanceToSquared(this.viewer))})).sort((e,t)=>t.light-e.light);this.fixed.forEach((e,n)=>{let r=t[n];r?this.copy(r.measured,e):e.intensity=0})}copy(e,t){t.position.copy(e.position),t.color.copy(e.color),t.intensity=e.intensity,t.distance=Math.sqrt(e.intensity/CN)}add(){let e=new Re(16777215,0);return e.name=`Fire Pro flame light`,e.castShadow=!1,e.userData.fireProOwnedLight=!0,this.parent.add(e),e}remove(e){e.removeFromParent(),e.dispose()}release(e){e.light&&=(this.remove(e.light),void 0)}reset(){this.generation++,this.deferred=void 0;for(let e of this.measured.values())this.release(e);this.measured.clear();for(let e of this.fixed)e.intensity=0}dispose(){if(!this.disposed){this.reset(),this.disposed=!0;for(let e of this.fixed.splice(0))this.remove(e);this.anchors?.destroy(),this.sums?.destroy(),this.readback?.destroy()}}},ON=`// Native function used by a Three.js NodeMaterial. TSL supplies resource bindings
// and fragment IO; the matrix maps viewport clip coordinates into world space.
// TSL reads the parameters up to the first closing parenthesis: keep them out of the
// parameter comments.
// volume-march.wgsl supplies the ray setup and the camera march.
fn fireProSceneVolume(
  fields: texture_3d<f32>,
  smokeField: texture_3d<f32>,
  smokeDivisor: f32,
  velocityDivisor: f32,
  pages: texture_2d<f32>,
  boxes: texture_2d<f32>,
  grid: vec4f, // voxel size, log2 of the field brick size, box count
  reconstructionFilter: f32,
  velocityField: texture_3d<f32>,
  solverField: texture_3d<f32>,
  linearSampler: sampler,
  lighting: texture_3d<f32>,
  occupancy: texture_3d<f32>,
  lut: texture_2d<f32>,
  slices: texture_3d<f32>,
  halfResolution: f32,
  inverseViewProjection: mat4x4f,
  optical: vec4f,
  light: vec4f,
  smoke: vec4f,
  fire: vec4f,
  sootGlow: f32,
  sampling: vec2f,
  viewport: vec2f,
  sceneDepth: f32,
  uv: vec2f,
  sceneLight: vec4f,
  ambientLight: vec4f,
  displayField: f32,
  debugScale: vec2f
) -> vec4f {
  let ray = fireProRay(inverseViewProjection, uv);
  let span = fireProSpan(ray, boxes, u32(grid.z), grid.x * exp2(grid.y));
  if span.x >= span.y {
    return vec4f(0);
  }
  let end = fireProSceneDistance(inverseViewProjection, uv, ray, span.y, sceneDepth);
  if end <= span.x {
    return vec4f(0);
  }
  let stepSize = fireProStep(grid, span.z, sampling.x);
  let jitter = fireProJitter(vec2u(uv * viewport), sampling.y);
  if displayField > .5 {
    let shift = u32(grid.y);
    var t = span.x;
    var transmittance = 1.0;
    var radiance = vec3f(0);
    var cursor = FireProCursor(FireProBox(vec3i(0), 0, vec3i(0)), t);
    loop {
      if t >= end || transmittance < .008 {
        break;
      }
      if t >= cursor.exit {
        if !fireProEnter(&cursor, &t, ray, boxes, grid) {
          break;
        }
        continue;
      }
      let ds = min(stepSize, min(end, cursor.exit) - t);
      let cell = (ray.origin + ray.direction * (t + jitter * ds)) / grid.x;
      // Velocity spacing and brick footprint are independent.
      let velocityShift = shift - u32(log2(velocityDivisor));
      let velocityCell = cell / velocityDivisor;
      let spacing = grid.x * velocityDivisor;
      var scalar = 0.0;
      if displayField > 3.5 && displayField < 4.5 {
        scalar = length(
          fireProField(velocityField, linearSampler, pages, cursor.box, velocityShift, velocityCell).xyz,
        );
      } else if displayField > 6.5 && displayField < 7.5 {
        // Vorticity: the magnitude of the velocity's curl, by central differences over a cell.
        var d: array<vec3f, 3>;
        for (var axis = 0; axis < 3; axis++) {
          var offset = vec3f(0);
          offset[axis] = 1.0;
          let ahead = fireProField(
            velocityField, linearSampler, pages, cursor.box, velocityShift, velocityCell + offset,
          ).xyz;
          let behind = fireProField(
            velocityField, linearSampler, pages, cursor.box, velocityShift, velocityCell - offset,
          ).xyz;
          d[axis] = (ahead - behind) / (2.0 * spacing);
        }
        scalar = length(vec3f(d[1].z - d[2].y, d[2].x - d[0].z, d[0].y - d[1].x));
      } else if displayField > 7.5 && displayField < 8.5 {
        // The flames' target divergence, on the field grid.
        scalar = fireProField(solverField, linearSampler, pages, cursor.box, shift, cell).x;
      } else if displayField > 8.5 {
        // The solver's pressure, a velocity times a cell, and the divergence it solved for,
        // 1/s times a cell squared, on the velocity grid.
        let raw = fireProSolverField(solverField,
          linearSampler,
          pages,
          cursor.box,
          shift,
          velocityShift,
          velocityCell);
        scalar = select(raw / (spacing * spacing), raw / spacing, displayField < 9.5);
      } else {
        let f = fireProReconstruct(
          fields, linearSampler, pages, cursor.box, shift, cell, reconstructionFilter,
        );
        if displayField < 1.5 {
          scalar = f.z;
        } else if displayField < 2.5 {
          scalar = f.y;
        } else if displayField < 3.5 {
          scalar = fireProField(smokeField,
            linearSampler,
            pages,
            cursor.box,
            shift - u32(log2(smokeDivisor)),
            cell / smokeDivisor).x;
        } else if displayField < 5.5 {
          scalar = fireProGlow(f.z);
        } else {
          scalar = f.w;
        }
      }
      // A heat map of 0 to debugScale.x, or when debugScale.y is 1 the sign of a value from
      // -debugScale.x to debugScale.x. Opacity grows with the magnitude: a full-scale voxel
      // blocks a fifth of the light.
      let level = scalar / debugScale.x;
      var color: vec3f;
      var amount: f32;
      if debugScale.y > .5 {
        amount = min(abs(level), 1.0);
        color = fireProSignMap(level);
      } else {
        amount = clamp(level, 0.0, 1.0);
        color = fireProHeatMap(amount);
      }
      let alpha = 1 - exp(-amount * ds / grid.x * .2);
      radiance += transmittance * color * alpha;
      transmittance *= 1 - alpha;
      t += ds;
    }
    return vec4f(radiance, 1 - transmittance);
  }
  var state = FireProMarch(span.x, 1.0, vec3f(0));
  if halfResolution > .5 {
    // The half-resolution pass stored the march up to evenly spaced depths from the first
    // box entry to the last exit. Resume from the last one in front of the scene and
    // march the rest at full resolution, so opaque geometry inside the volume still clips
    // exactly.
    let count = f32(textureDimensions(slices).z);
    let slice = floor((end - span.x) / (span.y - span.x) * count);
    if slice >= 1.0 {
      let stored = textureSampleLevel(
        slices, linearSampler, vec3f(uv, (min(slice, count) - .5) / count), 0,
      );
      let t = span.x + (span.y - span.x) * min(slice, count) / count;
      state = FireProMarch(t, 1.0 - stored.a, stored.rgb);
    }
  }
  fireProMarch(
    &state, end, ray, stepSize, jitter, fields, smokeField, pages, boxes, grid, reconstructionFilter,
    linearSampler, lighting, occupancy, lut, optical, light, smoke, fire, sootGlow, sceneLight,
    ambientLight,
  );
  return vec4f(state.radiance, 1 - state.transmittance);
}
`,kN=XA(KM),AN=ZA(ON.slice(ON.indexOf(`fn fireProSceneVolume`)),[kN,XA(hj),XA(qM),XA(aN),XA(oN)]),jN=class e extends ft{owner;simulation;options;anchors;params;values=new Float32Array(20);gpuSampler;blackbody;lighting;slicer;emptySlices;sliceParams=new Float32Array(48);uploads;sceneLights;wrappers=new Map;field=WA(null);pages=UA(null);boxes=UA(null);smokeField=WA(null);smokeDivisor=KA(1);velocityDivisor=KA(1);velocity=WA(null);solverField=WA(null);debugField=`beauty`;incident=WA(null);occupancy=WA(null);slices=WA(null);halfResolution=KA(0);grid=KA(new bt);inverseVP=KA(new Kt);optical=KA(new bt);light=KA(new bt);smoke=KA(new bt);fire=KA(new bt);sootGlow=KA(.25);sampling=KA(new hn);viewport=KA(new hn);sceneLight=KA(new bt);ambient=KA(new bt);displayField=KA(0);debugScale=KA(new hn(1,0));reconstructionFilter=KA(2);depth=new Pn;direction=new w;disposed=!1;lastLightStep=-1;previousField;previousSmoke;fitted=-1;constructor(e,t,n,r){let i=new nr(1,1,1),a=new om;Object.assign(a,{transparent:!0,depthWrite:!1,depthTest:!1,side:1,blending:5,blendSrc:201,blendDst:205,blendSrcAlpha:201,blendDstAlpha:205}),super(i,a),this.owner=e,this.simulation=t,this.options=n,this.anchors=r,this.name=`Fire Pro volume rendering`,this.visible=!1;let o=t.device;this.params=o.createBuffer({label:`Scene volume parameters`,size:this.values.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.gpuSampler=o.createSampler({minFilter:`linear`,magFilter:`linear`}),this.blackbody=bN(o),this.emptySlices=o.createTexture({label:`Empty depth slices`,size:[1,1,1],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.TEXTURE_BINDING}),a.fragmentNode=AN({fields:this.field,smokeField:this.smokeField,smokeDivisor:this.smokeDivisor,velocityDivisor:this.velocityDivisor,pages:this.pages,boxes:this.boxes,grid:this.grid,reconstructionFilter:this.reconstructionFilter,velocityField:this.velocity,solverField:this.solverField,linearSampler:BA(this.field),lighting:this.incident,occupancy:this.occupancy,lut:UA(this.wrap(this.blackbody)),slices:this.slices,halfResolution:this.halfResolution,inverseViewProjection:this.inverseVP,optical:this.optical,light:this.light,smoke:this.smoke,fire:this.fire,sootGlow:this.sootGlow,sampling:this.sampling,viewport:this.viewport,sceneDepth:YA(HA,null,this.depth),uv:HA,sceneLight:this.sceneLight,ambientLight:this.ambient,displayField:this.displayField,debugScale:this.debugScale}),this.onBeforeRender=(e,t,n)=>{if(!this.disposed){if(e!==this.owner)throw Error(`Render FireSimulation with its initialization renderer.`);this.prepare(n,t)}}}static async create(t,n,r,i,a,o){let s=new e(t,n,i,a);try{return s.lighting=await iN.create(n.device,s.params,s.gpuSampler,s.blackbody),s.slicer=await lN.create(n.device,s.gpuSampler),s.sceneLights=await DN.create(n.device,r,t),s.setDebug(o),s.update(),s}catch(e){throw s.dispose(),e}}fit(){if(this.lighting.sync(this.simulation),this.lighting.version===this.fitted)return;this.fitted=this.lighting.version;let e=this.lighting.boxList;if(this.visible=e.length>0,!e.length)return;let t=this.simulation.brickCells*this.simulation.voxelSize,n=[0,1,2].map(n=>Math.min(...e.map(e=>e.lo[n]))*t),r=[0,1,2].map(n=>(Math.max(...e.map(e=>e.hi[n]))+1)*t);this.position.set(...n.map((e,t)=>(e+r[t])/2)),this.scale.set(...r.map((e,t)=>e-n[t])),this.updateMatrix()}setDebug(e){if(this.debugField=e,this.displayField.value=Dn.indexOf(e),e!==`beauty`){let{range:t,signed:n}=Gt[e];this.debugScale.value.set(t,Number(n))}}invalidate(){this.lighting.invalidate(),this.lastLightStep=-1}reset(){this.sceneLights?.reset(),this.invalidate()}wrap(e){let t=this.wrappers.get(e);if(!t){let n=e.format===`r32float`||e.format===`rgba32float`;t=new Pt(e),Object.assign(t,{is3DTexture:e.dimension===`3d`,image:{width:e.width,height:e.height,depth:e.depthOrArrayLayers},type:n?lt:Ie,...[`r32float`,`r16float`].includes(e.format)?{format:er}:{},minFilter:n?Ht:te,magFilter:n?Ht:te,generateMipmaps:!1}),t.needsUpdate=!0,this.wrappers.set(e,t)}return t}renderSettings(){let{flame:e,smoke:t}=this.options();return{fireIntensity:e.brightness,flameOpacity:e.opacity,smokeDensity:t.density,scattering:t.scattering,shadowDensity:t.shadowDensity,temperature:e.temperature,smokeColor:new de(t.color).toArray(),fireColor:new de(e.color).toArray(),sootGlow:e.sootGlow}}readSceneLighting(e){this.direction.set(0,1,0),this.sceneLight.value.set(0,0,0,0),this.ambient.value.set(0,0,0,0);let t=0;e?.traverseVisible(e=>{if(!e.userData.fireProOwnedLight){if(`isAmbientLight`in e){let t=e;this.ambient.value.x+=t.color.r*t.intensity,this.ambient.value.y+=t.color.g*t.intensity,this.ambient.value.z+=t.color.b*t.intensity}if(`isDirectionalLight`in e){let n=e;if(n.intensity<=t)return;n.updateWorldMatrix(!0,!1),n.target.updateWorldMatrix(!0,!1),this.direction.setFromMatrixPosition(n.matrixWorld).sub(new w().setFromMatrixPosition(n.target.matrixWorld)),this.direction.lengthSq()<1e-12&&this.direction.set(0,1,0),t=n.intensity,this.sceneLight.value.set(n.color.r,n.color.g,n.color.b,0)}}}),this.light.value.set(this.direction.x,this.direction.y,this.direction.z,t)}writeParameters(e){let t=this.simulation;this.values.set([t.voxelSize,t.brickShift,32,e.flameOpacity,e.smokeDensity,e.fireIntensity,e.shadowDensity,e.scattering,...this.light.value.toArray(),...e.smokeColor,e.sootGlow,...e.fireColor,e.temperature]),this.uploads??=new lj(t.device.queue),this.uploads.write(this.params,this.values)}update(){if(this.disposed||!this.sceneLights)return;this.slicer.beginFrame(this.owner.info.frame,this.options().rendering.halfResolution),this.fit();let e=this.simulation,t=this.options().lighting;if(!t.illuminateScene){this.sceneLights.reset(),this.lastLightStep=-1;return}e.steps!==this.lastLightStep&&(this.writeParameters(this.renderSettings()),this.sceneLights.sample({simulation:e,lighting:this.lighting,params:this.params,sampler:this.gpuSampler,lut:this.blackbody,anchors:this.anchors(),intensity:t.intensity,voxelSize:e.voxelSize}),this.lastLightStep=e.steps)}lightFinished(e){return this.sceneLights?.finished(e)??!1}get memoryBytes(){let e=e=>e.width*e.height*e.depthOrArrayLayers*8;return this.params.size+e(this.blackbody)+e(this.emptySlices)+(this.lighting?.memoryBytes??0)+(this.slicer?.memoryBytes??0)+(this.sceneLights?.memoryBytes??0)}prepare(e,t){let n=this.simulation,r=this.renderSettings(),{filter:i,raySteps:a,halfResolution:o,lightingDivisor:s}=this.options().rendering;this.slicer.beginFrame(this.owner.info.frame,o),this.reconstructionFilter.value=[`trilinear`,`quadratic`,`cubic`].indexOf(i),this.fit(),this.readSceneLighting(t),this.writeParameters(r);let c=n.device.createCommandEncoder({label:`Prepare volume lighting`}),l=[this.light.value.x,this.light.value.y,this.light.value.z,Number(this.light.value.w>0)].join(`,`);this.lighting.encode(c,n,r,l,s)&&n.device.queue.submit([c.finish()]);let u=this.lighting;this.field.value=this.wrap(this.debugField===`beauty`?u.fields:n.field),this.smokeField.value=this.wrap(this.debugField===`beauty`?u.smoke:n.smoke),this.smokeDivisor.value=n.smokeDivisor,this.velocityDivisor.value=n.velocityDivisor,this.pages.value=this.wrap(u.pages),this.boxes.value=this.wrap(u.boxes),this.velocity.value=this.wrap(n.velocity);let d=this.debugField===`expansion`?n.expansionRate:n.solverFieldTexture;this.solverField.value=this.wrap(d),this.incident.value=this.wrap(u.light),this.occupancy.value=this.wrap(u.occupancy),this.grid.value.set(n.voxelSize,n.brickShift,u.boxList.length,0),this.optical.value.set(r.smokeDensity,r.fireIntensity,r.shadowDensity,r.scattering),this.smoke.value.set(...r.smokeColor,r.flameOpacity),this.fire.value.set(...r.fireColor,r.temperature),this.sootGlow.value=r.sootGlow,this.sampling.value.set(a,n.time),e&&(this.inverseVP.value.copy(e.matrixWorld).multiply(e.projectionMatrixInverse),this.owner.getDrawingBufferSize(this.viewport.value),this.sceneLights?.viewer.setFromMatrixPosition(e.matrixWorld));let f=this.emptySlices,p=this.owner.getRenderTarget(),m=p?new hn(p.width,p.height):this.viewport.value;if(o&&e&&m.x*m.y>=this.viewport.value.x*this.viewport.value.y){let e=this.sliceParams;e.set(this.inverseVP.value.elements,0);for(let[t,n]of[[16,this.optical.value],[20,this.light.value],[24,this.smoke.value],[28,this.fire.value],[32,this.grid.value],[36,this.sceneLight.value],[40,this.ambient.value]])e.set([n.x,n.y,n.z,n.w],t);e.set([a,n.time,this.reconstructionFilter.value,r.sootGlow],44),f=this.slicer.march({frame:this.owner.info.frame,width:m.x,height:m.y,params:e,fields:u.fields,smokeField:u.smoke,pages:u.pages,boxes:u.boxes,lighting:u.light,occupancy:u.occupancy,lut:this.blackbody})}this.halfResolution.value=Number(f!==this.emptySlices),this.slices.value=this.wrap(f);let h=new Set([n.field,n.smoke,...this.previousSmoke?[this.previousSmoke]:[],...this.previousField?[this.previousField]:[],n.velocity,d,this.blackbody,u.pages,u.boxes,u.light,u.fields,u.smoke,u.occupancy,this.emptySlices,...this.slicer.textures()]);for(let[e,t]of this.wrappers)h.has(e)||(t.dispose(),this.wrappers.delete(e));this.previousField=n.field,this.previousSmoke=n.smoke}dispose(){if(!this.disposed){this.disposed=!0,this.removeFromParent(),this.geometry.dispose(),this.material.dispose(),this.depth.dispose();for(let e of this.wrappers.values())e.dispose();this.wrappers.clear(),this.sceneLights?.dispose(),this.lighting?.dispose(),this.slicer?.dispose(),this.blackbody.destroy(),this.emptySlices.destroy(),this.params.destroy()}}},MN=[[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]];function NN(e){return e===`pressure`||e===`divergence`?e:void 0}var PN=class extends $n{isFireSimulation=!0;options;host={assertAlive:()=>this.assertAlive(),assertReady:()=>this.assertReady(),detach:e=>this.detach(e),queueExplosion:(e,t,n)=>this.queueExplosion(e,t,n)};emitters=new Set;explosions=new Set;forces=new Set;colliders=new Set;pending=[];owner;initialization;fluid;surface;bursts=[];brickView;brickRead={at:-1/0,pending:!1};debugField=`beauty`;accumulator=0;droppedTime=0;disposed=!1;nextHandle=1;nextEvent=1;constructor(e={}){super(),this.name=`Fire Simulation`,this.options=Ft(e)}assertAlive(){if(this.disposed)throw Error(`This FireSimulation has been disposed.`)}assertReady(){if(this.assertAlive(),!this.fluid||!this.surface)throw Error(`Await simulation.initialize(renderer) before updating or triggering effects.`)}initialize(e){return this.assertAlive(),this.owner&&this.owner!==e?Promise.reject(Error(`FireSimulation is already associated with another renderer.`)):this.initialization?this.initialization:(this.owner=e,this.initialization=this.initializeResources(e),this.initialization)}async initializeResources(e){if(e.reversedDepthBuffer||e.logarithmicDepthBuffer)throw Error(`FireSimulation requires conventional depth; reversed and logarithmic depth are not supported.`);if(typeof e.init!=`function`)throw Error(`FireSimulation requires THREE.WebGPURenderer.`);await e.init(),this.assertAlive();let t=e.backend.device;if(!t)throw Error(`FireSimulation requires a WebGPURenderer running the WebGPU backend.`);let n,r;try{n=await FM.create(t,{voxelSize:this.options.voxelSize,velocityDivisor:this.options.velocityDivisor,brickSize:this.options.brickSize,smokeDivisor:this.options.smokeDivisor,scalarMacCormack:this.options.scalarMacCormack}),this.assertAlive(),n.showSolverField(NN(this.debugField)),r=await jN.create(e,n,this,()=>this.options,()=>this.lightAnchors(),this.debugField),this.assertAlive(),this.fluid=n,this.surface=r,this.add(r)}catch(e){throw r?.dispose(),n?.dispose(),e}}addFire(e={}){return this.addContinuous(`fire`,e)}addFlameJet(e={}){return this.addContinuous(`jet`,e)}addSmoke(e={}){return this.addContinuous(`smoke`,e)}addEmitter(e={}){return this.addContinuous(`emitter`,e)}addContinuous(e,t){this.assertAlive();let n=new VM(this.host,`emitter-${this.nextHandle}`,t,yt(e),this.options.voxelSize,this.options.seed+this.nextHandle>>>0);return n.object.parent||this.add(n.object),this.emitters.add(n),this.nextHandle++,n}addExplosion(e={}){this.assertAlive();let t=new HM(this.host,`explosion-${this.nextHandle}`,e);return this.add(t.object),this.explosions.add(t),this.nextHandle++,t}addForce(e,t){if(this.assertAlive(),t?.some(e=>!this.emitters.has(e)))throw Error(`Force target must be a live emitter owned by this simulation.`);let n=new UM(this.host,e,t);return this.forces.add(n),t?.forEach(e=>e.forces.add(n)),n}addCollider(e){this.assertAlive();let t=new WM(this.host,wt(e));return this.colliders.add(t),t}configure(e){this.assertAlive(),nn(e,ut,`simulation.configure`);let t={...this.options,...Bt(e,this.options)};return this.options=t,this.surface?.invalidate(),this.surface?.update(),this}getOptions(){return this.assertAlive(),RM(this.options)}get stats(){this.assertAlive();let e=this.fluid,t=this.options.velocityDivisor,n=this.options.brickSize,r=e?.poolSlots??l(p(t,Zn,n),Math.max(1,Math.floor(this.options.grid.maxVoxels/n**3))),a=e?e.memoryBytes+e.meshMemoryBytes+e.forceMemoryBytes:Le(r,t,16,this.options.smokeDivisor,this.options.scalarMacCormack,n)+544,o=(e?.renderBricks.boxes??[]).reduce((e,t)=>e+t.hi.reduce((e,n,r)=>e*(n-t.lo[r]+1),1),0);return RM({simulationTime:e?.time??0,droppedTime:this.droppedTime,gridLimited:!!e?.poolLimited,activeVoxels:(e?.activeBrickCount??0)*n**3,estimatedMemoryBytes:a+(this.surface?.memoryBytes??i(r,n,o,this.options.rendering.lightingDivisor))})}debug(e){this.assertAlive(),nn(e,[`bricks`,`field`],`debug`);let t=e.bricks===void 0?this.brickView?.visible??!1:jn(e.bricks,`debug.bricks`),n=e.field??this.debugField;if(!Dn.includes(n))throw Error(`Unknown debug field.`);return t&&!this.brickView&&(this.brickView=new Ye(new Ue().setAttribute(`position`,new o(new Float32Array,3)),new Ke({color:6280388,transparent:!0,opacity:.6})),this.brickView.name=`Fire Pro bricks`,this.add(this.brickView)),this.brickView&&(this.brickView.visible=t),this.brickRead.at=-1/0,this.debugField=n,this.fluid?.showSolverField(NN(n)),this.surface?.setDebug(n),this.refreshBricks(),this}refreshBricks(){let e=this.brickView,t=performance.now();!e?.visible||!this.fluid||this.brickRead.pending||t-this.brickRead.at<250||(this.brickRead={at:t,pending:!0},this.fluid.readBricks().then(t=>{if(this.disposed||e!==this.brickView)return;let n=new Float32Array(t.length*72),r=0;for(let{min:e,max:i}of t)for(let[t,a]of MN)n.set(t.map((t,n)=>(t?i:e)[n]),r),n.set(a.map((t,n)=>(t?i:e)[n]),r+3),r+=6;e.geometry.dispose(),e.geometry=new Ue().setAttribute(`position`,new o(n,3))}).catch(()=>{}).finally(()=>this.brickRead.pending=!1))}lightAnchors(){let e=new w;return[...[...this.emitters].map(t=>(t.object.updateWorldMatrix(!0,!1),{id:t.id,position:e.setFromMatrixPosition(t.object.matrixWorld).toArray(),transient:!1})),...this.bursts.map(e=>e.anchor)]}queueExplosion(e,t,n){this.pending.push({owner:e,position:[...t],options:n,id:this.nextEvent++})}detach(e){e instanceof VM?this.emitters.delete(e):e instanceof HM?(this.explosions.delete(e),this.pending=this.pending.filter(t=>t.owner!==e),this.bursts=this.bursts.filter(t=>t.owner!==e)):e instanceof UM?this.forces.delete(e):this.colliders.delete(e)}update(e){if(this.assertReady(),Rn(e,`update deltaSeconds`,0,Number.MAX_VALUE),IN(this),this.accumulator+=e,this.accumulator+1e-12>=.016666666666666666){this.accumulator=Math.max(0,this.accumulator-ht);let e=Math.floor((this.accumulator+1e-12)/ht)*ht;this.accumulator=Math.max(0,this.accumulator-e),this.droppedTime+=e,this.step()}let t=this.surface;t.update(),this.bursts=this.options.lighting.illuminateScene?this.bursts.filter(e=>!t.lightFinished(e.anchor.id)):[],this.refreshBricks()}step(){let e=this.fluid;e.cutoff=this.options.grid.cutoff,e.voxelBudget=this.options.grid.maxVoxels,e.ground=this.options.grid.ground;let t=[...this.emitters].flatMap(e=>{let t=e.source();return t?[t]:[]}),n=[...this.forces].flatMap(e=>{let t=e.frame();return t?[t]:[]}),r=this.options.voxelSize,i=[...this.colliders].map(e=>e.frame([r,r,r]));for(let e of this.pending){let n=e.options.radius,r=`${e.owner.id}-burst-${e.id}`;this.options.lighting.illuminateScene&&this.bursts.push({owner:e.owner,anchor:{id:r,position:[...e.position],transient:!0}}),t.push({id:r,shape:`sphere`,position:[...e.position],size:[n,n,n],flame:e.options.charge.flame,heatRate:e.options.charge.heat/ht,smokeRate:e.options.charge.smoke/ht,fuelRate:e.options.charge.fuel/ht,velocity:[0,0,0],velocityResponse:e.options.outwardSpeed>0?60:0,outwardSpeed:e.options.outwardSpeed,variation:e.options.variation})}let{flame:a,motion:o}=this.options,s={simulation:{buoyancy:o.buoyancy,smokeWeight:o.smokeWeight,velocityDamping:o.damping,cooling:a.cooling,dissipation:this.options.smoke.dissipation,vorticity:o.vorticity,seed:this.options.seed},combustion:{lifespan:a.lifespan,smokeRate:a.smokeRate,heatRate:a.heatRate,expansionRate:a.expansionRate,ramps:dj.ramps},fuel:this.options.fuel,sources:t,forces:n,colliders:i};e.step(s,ht),this.pending=[]}sampleAudioField(e){this.assertReady();let t=this.fluid.sampleAudioProbes(e);if(!t)return null;let n=[];for(let e=0;e<t.values.length;e+=4)n.push({heat:t.values[e]||0,speed:t.values[e+1]||0,vorticity:t.values[e+2]||0,live:t.values[e+3]>=.5});return{serial:t.serial,samples:n}}reset(){this.assertReady(),this.fluid.reset(),this.surface.reset(),this.pending=[],this.bursts=[],this.accumulator=0,this.droppedTime=0,this.nextEvent=1}dispose(){if(!this.disposed){for(let e of this.emitters)e.remove();for(let e of this.explosions)e.remove();for(let e of this.forces)e.remove();for(let e of this.colliders)e.remove();this.disposed=!0,this.pending=[],this.surface?.dispose(),this.fluid?.dispose(),this.brickView?.removeFromParent(),this.brickView?.geometry.dispose(),this.brickView?.material.dispose(),this.removeFromParent()}}},FN=new Kt;function IN(e){if(e.updateWorldMatrix(!0,!1),!e.matrixWorld.equals(FN))throw Error(`FireSimulation runs in world space. Add it to the scene without moving, rotating or scaling it or its parents.`)}export{JA as _,bA as a,Wk as b,wA as c,IA as d,LA as f,qA as g,KA as h,tj as i,PA as l,UA as m,VM as n,xA as o,HA as p,HM as r,CA as s,PN as t,FA as u,tA as v,Gg as y};