export const VERSION = '1.2.3';

export const PALETTE_FILES = ['laFont-1000lpcm', 'rr-lines-40-200-step-5'];

export const FALLBACK_PALETTES = {
  'laFont-1000lpcm': {
    id:'laFont-1000lpcm', name:'LaFont SS304 IR',
    description:'Brushed SS304, 1000 LPCM, 200 mm/s',
    speed:200, lpcm:1000, laser:'ir',
    entries:[
      {label:'Pale Straw',    power:16, rgb:'#d4bc4a'},
      {label:'Straw Gold',    power:18, rgb:'#d4a018'},
      {label:'Gold',          power:20, rgb:'#c88010'},
      {label:'Deep Gold',     power:22, rgb:'#c07010'},
      {label:'Amber',         power:24, rgb:'#b06030'},
      {label:'Copper Rose',   power:26, rgb:'#984050'},
      {label:'Magenta',       power:28, rgb:'#881870'},
      {label:'Violet',        power:30, rgb:'#601098'},
      {label:'Blue-Violet',   power:32, rgb:'#4010b8'},
      {label:'Indigo',        power:34, rgb:'#2018c8'},
      {label:'Royal Blue',    power:36, rgb:'#1038c0'},
      {label:'Blue',          power:38, rgb:'#0858b8'},
      {label:'Sky Blue',      power:40, rgb:'#0878b0'},
      {label:'Azure',         power:42, rgb:'#0898a8'},
      {label:'Teal Blue',     power:44, rgb:'#10a898'},
      {label:'Teal',          power:46, rgb:'#18a090'},
      {label:'Muted Teal',    power:48, rgb:'#209888'},
      {label:'Steel Teal',    power:50, rgb:'#288080'},
      {label:'Blue-Grey',     power:52, rgb:'#306068'},
      {label:'Dark Grey-Blue',power:54, rgb:'#384858'},
      {label:'Near Grey',     power:56, rgb:'#3a3c48'},
    ]
  },
  'rr-lines-40-200-step-5': {
    id:'rr-lines-40-200-step-5', name:'RR Lines 40-200 mm/s step 5',
    description:'IR at 100% power, variable speed from 40 to 200 mm/s. Used for Rich/Reflective (RR) color calibration on SS304.',
    speed:100, lpcm:1000, laser:'ir',
    entries: [
      { label: "40 mm/s", speed: 40, power: 100, rgb: "#0032fa" },
      { label: "45 mm/s", speed: 45, power: 100, rgb: "#0036f6" },
      { label: "50 mm/s", speed: 50, power: 100, rgb: "#003bf3" },
      { label: "55 mm/s", speed: 55, power: 100, rgb: "#0040f0" },
      { label: "60 mm/s", speed: 60, power: 100, rgb: "#0044ed" },
      { label: "65 mm/s", speed: 65, power: 100, rgb: "#0049ea" },
      { label: "70 mm/s", speed: 70, power: 100, rgb: "#004ee7" },
      { label: "75 mm/s", speed: 75, power: 100, rgb: "#0052e4" },
      { label: "80 mm/s", speed: 80, power: 100, rgb: "#0057e1" },
      { label: "85 mm/s", speed: 85, power: 100, rgb: "#005cdd" },
      { label: "90 mm/s", speed: 90, power: 100, rgb: "#0060da" },
      { label: "95 mm/s", speed: 95, power: 100, rgb: "#0065d7" },
      { label: "100 mm/s", speed: 100, power: 100, rgb: "#006ad4" },
      { label: "105 mm/s", speed: 105, power: 100, rgb: "#006ed1" },
      { label: "110 mm/s", speed: 110, power: 100, rgb: "#0073ce" },
      { label: "115 mm/s", speed: 115, power: 100, rgb: "#0078cb" },
      { label: "120 mm/s", speed: 120, power: 100, rgb: "#007dc8" },
      { label: "125 mm/s", speed: 125, power: 100, rgb: "#0081c4" },
      { label: "130 mm/s", speed: 130, power: 100, rgb: "#0086c1" },
      { label: "135 mm/s", speed: 135, power: 100, rgb: "#008bbe" },
      { label: "140 mm/s", speed: 140, power: 100, rgb: "#008fbb" },
      { label: "145 mm/s", speed: 145, power: 100, rgb: "#0094b8" },
      { label: "150 mm/s", speed: 150, power: 100, rgb: "#0099b5" },
      { label: "155 mm/s", speed: 155, power: 100, rgb: "#009db2" },
      { label: "160 mm/s", speed: 160, power: 100, rgb: "#00a2af" },
      { label: "165 mm/s", speed: 165, power: 100, rgb: "#00a7ab" },
      { label: "170 mm/s", speed: 170, power: 100, rgb: "#00aba8" },
      { label: "175 mm/s", speed: 175, power: 100, rgb: "#00b0a5" },
      { label: "180 mm/s", speed: 180, power: 100, rgb: "#00b5a2" },
      { label: "185 mm/s", speed: 185, power: 100, rgb: "#00b99f" },
      { label: "190 mm/s", speed: 190, power: 100, rgb: "#00be9c" },
      { label: "195 mm/s", speed: 195, power: 100, rgb: "#00c399" },
      { label: "200 mm/s", speed: 200, power: 100, rgb: "#00c896" }
    ]
  }
};

export const PAD = 20;
