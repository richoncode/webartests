export const VERSION = '1.1.3';

export const PALETTE_FILES = ['laFont-1000lpcm'];

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
  }
};

export const PAD = 20;
