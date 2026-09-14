#pragma once
// Minimal Tuya LAN protocol 3.1/3.3 client.
//
// There is no Arduino library for this, so the wire format is implemented here:
//
//   0x000055AA | seq(4) | cmd(4) | len(4) | payload | crc32(4) | 0x0000AA55
//
// For 3.3 the payload is AES-128-ECB with PKCS#7 under the device's local key.
// Commands other than DP_QUERY also carry a 15-byte version header ("3.3" plus
// twelve zero bytes) ahead of the ciphertext.
//
// One rule matters more than the protocol: these bulbs accept exactly ONE local
// connection and hold a dead socket for a while afterwards. Connect once per
// device and keep it. Opening a second connection looks exactly like a wrong
// key or a wrong protocol version, which is how half a diagnosis gets wasted.

#include <WiFi.h>
#include <ArduinoJson.h>
#include "mbedtls/aes.h"

#define TUYA_CMD_CONTROL   0x07
#define TUYA_CMD_STATUS    0x08
#define TUYA_CMD_DP_QUERY  0x0A

class TuyaDevice {
public:
  void configure(const char *id, const char *ip, const char *key, float ver) {
    _id = id; _ip = ip; _key = key; _ver = ver;
  }
  const char *ip() const { return _ip; }
  bool connected() { return _sock.connected(); }

  bool ensureConnected(uint32_t timeoutMs = 2500) {
    if (_sock.connected()) return true;
    _sock.stop();
    _sock.setTimeout(timeoutMs / 1000 ? timeoutMs / 1000 : 1);
    if (!_sock.connect(_ip, 6668, timeoutMs)) return false;
    _sock.setNoDelay(true);
    _seq = 1;
    return true;
  }
  void disconnect() { _sock.stop(); }

  // Reads the device's current datapoints into doc["dps"].
  bool status(JsonDocument &doc) {
    char body[160];
    snprintf(body, sizeof(body), "{\"gwId\":\"%s\",\"devId\":\"%s\"}", _id, _id);
    return exchange(TUYA_CMD_DP_QUERY, body, doc);
  }

  bool setBool(int dp, bool v)  { char b[24]; snprintf(b, sizeof(b), "%s", v ? "true" : "false"); return setRaw(dp, b); }
  bool setInt(int dp, int v)    { char b[24]; snprintf(b, sizeof(b), "%d", v); return setRaw(dp, b); }
  bool setStr(int dp, const char *v) { char b[80]; snprintf(b, sizeof(b), "\"%s\"", v); return setRaw(dp, b); }

private:
  WiFiClient _sock;
  const char *_id = "", *_ip = "", *_key = "";
  float _ver = 3.3f;
  uint32_t _seq = 1;

  bool setRaw(int dp, const char *jsonValue) {
    char body[220];
    snprintf(body, sizeof(body),
             "{\"devId\":\"%s\",\"uid\":\"%s\",\"t\":\"%lu\",\"dps\":{\"%d\":%s}}",
             _id, _id, (unsigned long)time(nullptr), dp, jsonValue);
    JsonDocument reply;
    return exchange(TUYA_CMD_CONTROL, body, reply);
  }

  // ── AES-128-ECB with PKCS#7 ───────────────────────────────────────────────
  size_t encrypt(const uint8_t *in, size_t n, uint8_t *out) {
    size_t pad = 16 - (n % 16), total = n + pad;
    static uint8_t buf[512];
    if (total > sizeof(buf)) return 0;
    memcpy(buf, in, n); memset(buf + n, (uint8_t)pad, pad);
    mbedtls_aes_context a; mbedtls_aes_init(&a);
    mbedtls_aes_setkey_enc(&a, (const uint8_t *)_key, 128);
    for (size_t i = 0; i < total; i += 16)
      mbedtls_aes_crypt_ecb(&a, MBEDTLS_AES_ENCRYPT, buf + i, out + i);
    mbedtls_aes_free(&a);
    return total;
  }
  size_t decrypt(const uint8_t *in, size_t n, uint8_t *out) {
    if (n == 0 || n % 16) return 0;
    mbedtls_aes_context a; mbedtls_aes_init(&a);
    mbedtls_aes_setkey_dec(&a, (const uint8_t *)_key, 128);
    for (size_t i = 0; i < n; i += 16)
      mbedtls_aes_crypt_ecb(&a, MBEDTLS_AES_DECRYPT, in + i, out + i);
    mbedtls_aes_free(&a);
    uint8_t pad = out[n - 1];
    return (pad >= 1 && pad <= 16 && pad <= n) ? n - pad : n;
  }

  static uint32_t crc32(const uint8_t *d, size_t n) {
    uint32_t c = 0xFFFFFFFF;
    for (size_t i = 0; i < n; i++) {
      c ^= d[i];
      for (int k = 0; k < 8; k++) c = (c >> 1) ^ (0xEDB88320 & (-(int32_t)(c & 1)));
    }
    return ~c;
  }
  static void be32(uint8_t *p, uint32_t v) { p[0]=v>>24; p[1]=v>>16; p[2]=v>>8; p[3]=v; }
  static uint32_t rd32(const uint8_t *p) { return ((uint32_t)p[0]<<24)|((uint32_t)p[1]<<16)|((uint32_t)p[2]<<8)|p[3]; }

  bool exchange(uint32_t cmd, const char *json, JsonDocument &out) {
    if (!ensureConnected()) return false;

    static uint8_t payload[640], frame[720];
    size_t plen = 0;

    // Commands other than DP_QUERY carry the version header before the ciphertext.
    bool wantHeader = (_ver >= 3.3f && cmd != TUYA_CMD_DP_QUERY);
    if (wantHeader) { memcpy(payload, "3.3", 3); memset(payload + 3, 0, 12); plen = 15; }
    size_t enc = encrypt((const uint8_t *)json, strlen(json), payload + plen);
    if (!enc) return false;
    plen += enc;

    size_t i = 0;
    be32(frame + i, 0x000055AA); i += 4;
    be32(frame + i, _seq++);     i += 4;
    be32(frame + i, cmd);        i += 4;
    be32(frame + i, plen + 8);   i += 4;
    memcpy(frame + i, payload, plen); i += plen;
    be32(frame + i, crc32(frame, i)); i += 4;
    be32(frame + i, 0x0000AA55);      i += 4;

    if (_sock.write(frame, i) != i) { _sock.stop(); return false; }

    // ── read the reply ──────────────────────────────────────────────────────
    static uint8_t rx[900];
    size_t got = 0; uint32_t t0 = millis();
    while (millis() - t0 < 3000) {
      while (_sock.available() && got < sizeof(rx)) rx[got++] = _sock.read();
      if (got >= 20 && rd32(rx + 12) + 16 <= got) break;
      delay(5);
    }
    if (got < 24 || rd32(rx) != 0x000055AA) return false;

    uint32_t retcode = rd32(rx + 16);
    size_t bodyLen = rd32(rx + 12);
    if (bodyLen < 12) return false;
    // payload sits between the return code and the trailing crc + suffix
    const uint8_t *body = rx + 20;
    size_t n = bodyLen - 12;
    if (retcode != 0 && n == 0) return false;

    static uint8_t plain[640];
    // some firmwares repeat the version header on the way back
    if (n > 15 && memcmp(body, "3.3", 3) == 0) { body += 15; n -= 15; }
    size_t m = decrypt(body, n, plain);
    if (!m) return cmd == TUYA_CMD_CONTROL;      // a control ack may carry no body
    plain[m] = 0;
    return deserializeJson(out, (const char *)plain) == DeserializationError::Ok;
  }
};
