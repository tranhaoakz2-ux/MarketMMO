const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let value = num;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return bytes;
}

export async function generateTotp(
  secret: string,
  timeStepSeconds = 30,
  digits = 6,
  timestamp = Date.now()
): Promise<string | null> {
  const keyBytes = base32Decode(secret);
  if (keyBytes.length === 0) return null;

  const counter = Math.floor(timestamp / 1000 / timeStepSeconds);
  const counterBytes = intToBytes(counter);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    counterBytes.buffer as ArrayBuffer
  );
  const hash = new Uint8Array(signature);

  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = (binary % 10 ** digits).toString().padStart(digits, "0");
  return otp;
}

export function secondsRemaining(timeStepSeconds = 30, timestamp = Date.now()) {
  const elapsed = Math.floor(timestamp / 1000) % timeStepSeconds;
  return timeStepSeconds - elapsed;
}
