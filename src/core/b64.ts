// base64 デコード(純関数)。atob(DOM API)に依存しないため core に置ける。

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const REVERSE: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) REVERSE[ALPHABET[i]] = i;

export function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (REVERSE[clean[i]] << 18) |
      (REVERSE[clean[i + 1]] << 12) |
      ((REVERSE[clean[i + 2]] ?? 0) << 6) |
      (REVERSE[clean[i + 3]] ?? 0);
    out[o++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length) out[o++] = n & 0xff;
  }
  return out;
}
