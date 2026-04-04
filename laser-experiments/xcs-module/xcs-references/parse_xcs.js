const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/richardbailey/RichardClaude/webartests/laser-experiments/xcs-module/xcs-references/XCS-FONTSIZE-REFERENCE.xcs', 'utf8'));

const items = data.canvas[0].displays.filter(d => d.type === 'TEXT');
items.forEach(it => {
  console.log(`Text: "${it.text}" | fontSize: ${it.style.fontSize.toFixed(2)} | y: ${it.y.toFixed(2)} | height: ${it.height.toFixed(2)} | offsetY: ${it.offsetY.toFixed(2)}`);
});
