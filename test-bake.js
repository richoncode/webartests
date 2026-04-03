import { XCSProject, XCSText } from './laser-experiments/xcs-module/js/xcs-system.js';

const proj = new XCSProject();
const textItem = proj.addItem('TEXT', { x: 50, y: 15, text: "XCS VANTAGE", width: 80, align: "center", layerColor: "#000" });

console.log("Scale:", textItem.display.charJSONs[0].scale);
console.log("TotalAdvance:", textItem.display.charJSONs.length);
console.log("Parent Height:", textItem.display.height);
