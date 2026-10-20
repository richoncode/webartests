// Rebuilds player/runner.js from ../artifact-type/app.js (run from this folder: node extract-runner.js).
// It joins the same in-frame runtime sources, in the same order, that the /motion player puts in its film iframe.
const fs=require('fs');const src=fs.readFileSync('../artifact-type/app.js','utf8');
function tpl(name){const k='var '+name+'=`';let i=src.indexOf(k);if(i<0)throw name;i+=k.length;let j=i;for(;;j++){const c=src[j];if(c==='\\'){j++;continue}if(c==='`')break;if(c==='$'&&src[j+1]==='{')throw 'interp in '+name}return eval('`'+src.slice(i,j)+'`')}
const names=['_H0','pH0','OM0','PE','RM0','hM0','bM0','EM0'];const parts=names.map(tpl);
const runner=(parts.slice(0,7).join('\n;\n')+'\n;\n'+parts[7]).replace(/<\/(script)/gi,'<\\/$1');
fs.writeFileSync('runner.js',runner);
