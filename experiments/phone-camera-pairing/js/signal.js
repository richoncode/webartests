// WebRTC data channel between the laptop page and the phone page.
//
// There is no signaling server. The offer and answer are compressed SDP blobs
// passed by QR or paste. Once the channel is open, samples move peer-to-peer
// (a STUN lookup can add a server-reflexive address for same-Wi-Fi NAT).
//
// BroadcastChannel is intentionally not used. It cannot leave the browser
// profile, so it cannot reach a phone.

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

function bytesToB64url(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    bin += String.fromCharCode.apply(null, slice);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToBytes(text) {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function packSdp(sdp) {
  if (typeof CompressionStream === 'undefined') {
    return 'r.' + bytesToB64url(new TextEncoder().encode(sdp));
  }
  const stream = new Blob([sdp]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  return 'z.' + bytesToB64url(buf);
}

export async function unpackSdp(token) {
  const raw = String(token || '').trim().replace(/^A\./, '');
  if (raw.startsWith('z.')) {
    const bytes = b64urlToBytes(raw.slice(2));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }
  if (raw.startsWith('r.')) return new TextDecoder().decode(b64urlToBytes(raw.slice(2)));
  throw new Error('That token is not a session offer or answer.');
}

function waitForIce(pc, timeoutMs = 2500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    function onChange() {
      if (pc.iceGatheringState === 'complete') finish();
    }
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

function sendJson(channel, obj) {
  if (!channel || channel.readyState !== 'open') return false;
  if (channel.bufferedAmount > 500000) return false;
  channel.send(JSON.stringify(obj));
  return true;
}

function watch(pc, channel, handlers) {
  const report = (state) => handlers.onState?.(state);
  pc.addEventListener('connectionstatechange', () => report(pc.connectionState));
  pc.addEventListener('iceconnectionstatechange', () => {
    if (pc.iceConnectionState === 'failed') report('failed');
  });
  if (!channel) return;
  channel.addEventListener('open', () => report('open'));
  channel.addEventListener('close', () => report('closed'));
  channel.addEventListener('message', (event) => {
    try {
      handlers.onMessage?.(JSON.parse(event.data));
    } catch {
      /* ignore a bad frame */
    }
  });
}

export async function createHostSession(handlers = {}) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const channel = pc.createDataChannel('imu');
  watch(pc, channel, handlers);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  const sdp = pc.localDescription.sdp;
  return {
    pc,
    sdp,
    token: await packSdp(sdp),
    send(obj) {
      return sendJson(channel, obj);
    },
    async acceptAnswer(tokenOrSdp) {
      const text = String(tokenOrSdp || '').trim();
      const remote = text.includes('v=0') ? text : await unpackSdp(text);
      await pc.setRemoteDescription({ type: 'answer', sdp: remote });
    },
    close() {
      channel.close();
      pc.close();
    },
  };
}

export async function createPhoneSession(offerToken, handlers = {}) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  let channel = null;
  pc.ondatachannel = (event) => {
    channel = event.channel;
    watch(pc, channel, handlers);
  };
  watch(pc, null, handlers);
  const offerSdp = await unpackSdp(offerToken);
  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);
  const sdp = pc.localDescription.sdp;
  return {
    pc,
    sdp,
    token: await packSdp(sdp),
    send(obj) {
      return sendJson(channel, obj);
    },
    close() {
      if (channel) channel.close();
      pc.close();
    },
  };
}
