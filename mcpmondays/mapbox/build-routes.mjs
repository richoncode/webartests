// Build step: calls the same Mapbox APIs the MCP tools wrap and saves routes.json.
// search_and_geocode_tool -> Search Box /forward ; directions_tool -> Directions v5.
// Usage: MAPBOX_ACCESS_TOKEN=... node build-routes.mjs
import fs from 'node:fs';
const T = process.env.MAPBOX_ACCESS_TOKEN; if (!T) { console.error('MAPBOX_ACCESS_TOKEN needed'); process.exit(1); }
const SF = {longitude:-122.4194, latitude:37.7749};
const presets = JSON.parse(fs.readFileSync(new URL('./presets.json', import.meta.url)));
async function geocode(q){
  const u=`https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(q)}&proximity=${SF.longitude},${SF.latitude}&limit=1&access_token=${T}`;
  const j=await (await fetch(u)).json(); const f=j.features[0];
  return {name:f.properties.name, full:f.properties.full_address||f.properties.place_formatted, longitude:f.geometry.coordinates[0], latitude:f.geometry.coordinates[1]};
}
const out=[];
for (const p of presets){
  const a=await geocode(p.from), b=await geocode(p.to);
  let u=`https://api.mapbox.com/directions/v5/mapbox/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?geometries=geojson&overview=full&steps=true&access_token=${T}`;
  if (p.exclude) u+=`&exclude=${encodeURIComponent(p.exclude)}`;
  const d=await (await fetch(u)).json(); const r=d.routes[0];
  out.push({...p, origin:a, destination:b, distance_m:Math.round(r.distance), duration_s:Math.round(r.duration),
    coords:r.geometry.coordinates, steps:r.legs[0].steps.map(s=>s.maneuver.instruction)});
  console.log(p.id, Math.round(r.distance),'m');
}
fs.writeFileSync(new URL('./routes.json', import.meta.url), JSON.stringify({built:'build-time', routes:out}));
