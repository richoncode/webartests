// Cloudflare Worker: forwards /v1/chat/completions to NVIDIA build.nvidia.com.
// Secret: wrangler secret put NVIDIA_API_KEY
const UPSTREAM = "https://integrate.api.nvidia.com/v1/chat/completions";
function allowed(o) {
  if (!o) return false;
  if (o === "https://richoncode.github.io") return true;
  try { const u = new URL(o); return u.hostname === "localhost" || u.hostname === "127.0.0.1"; } catch { return false; }
}
function cors(o) {
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
export default {
  async fetch(req, env) {
    const o = req.headers.get("Origin");
    if (!allowed(o)) return new Response("Forbidden origin", { status: 403 });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
    const path = new URL(req.url).pathname;
    if (req.method !== "POST" || path !== "/v1/chat/completions")
      return new Response("Not found", { status: 404, headers: cors(o) });
    const up = await fetch(UPSTREAM, { method: "POST", body: req.body,
      headers: { "Content-Type": "application/json", "Accept": req.headers.get("Accept") || "text/event-stream",
        "Authorization": "Bearer " + env.NVIDIA_API_KEY } });
    const h = new Headers(cors(o));
    h.set("Content-Type", up.headers.get("Content-Type") || "application/json");
    h.set("Cache-Control", "no-cache");
    return new Response(up.body, { status: up.status, headers: h });
  },
};
