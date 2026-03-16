export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}

export function syntaxHL(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*")\s*:/g,'<span class="j-key">$1</span>:')
    .replace(/("(\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*")/g,'<span class="j-str">$1</span>')
    .replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,'<span class="j-num">$1</span>')
    .replace(/\b(true|false)\b/g,'<span class="j-bool">$1</span>')
    .replace(/\bnull\b/g,'<span class="j-null">null</span>');
}

export function esc(str) { 
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
}

export function dl(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function getTimestampedName(prefix) {
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${prefix}${month}${day}-${hour}${min}`;
}
