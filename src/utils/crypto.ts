/**
 * Standard SHA-256 Constants (Fractional parts of cube roots of first 64 primes)
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * Standard streaming SHA-256 implementation to hash files of size up to gigabytes
 * without exceeding memory limits or overflowing integer bitwise boundaries.
 */
class SHA256Stream {
  private h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  private pending = new Uint8Array(64);
  private pendingCount = 0;
  private totalBytes = 0;
  private w = new Uint32Array(64);

  private processBlock(block: Uint8Array, offset: number) {
    const w = this.w;
    const h = this.h;

    // Load block into first 16 words of W (big-endian 32-bit integers)
    for (let j = 0; j < 16; j++) {
      const idx = offset + j * 4;
      w[j] = (block[idx] << 24) |
             (block[idx + 1] << 16) |
             (block[idx + 2] << 8) |
             block[idx + 3];
    }

    // Extend to 64 words
    for (let j = 16; j < 64; j++) {
      const w15 = w[j - 15];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const w2 = w[j - 2];
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hVal = h[7];

    for (let j = 0; j < 64; j++) {
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));

      const t1 = (hVal + sigma1 + ch + K[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;

      hVal = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hVal) | 0;
  }

  public update(data: Uint8Array) {
    let offset = 0;
    const len = data.length;
    this.totalBytes += len;

    // Fill pending buffer first
    if (this.pendingCount > 0) {
      const fillLen = 64 - this.pendingCount;
      if (len >= fillLen) {
        this.pending.set(data.subarray(0, fillLen), this.pendingCount);
        this.processBlock(this.pending, 0);
        this.pendingCount = 0;
        offset = fillLen;
      } else {
        this.pending.set(data, this.pendingCount);
        this.pendingCount += len;
        return;
      }
    }

    // Process blocks directly from data
    while (offset + 64 <= len) {
      this.processBlock(data, offset);
      offset += 64;
    }

    // Retain remainder
    if (offset < len) {
      this.pending.set(data.subarray(offset), 0);
      this.pendingCount = len - offset;
    }
  }

  public finalize(): string {
    const bytesCount = this.totalBytes;
    const bitLength = bytesCount * 8;

    // Append single '1' bit (0x80 byte value)
    const padding = new Uint8Array([0x80]);
    this.update(padding);

    // Padding loop: Fill up with 0s until we hold exactly 56 bytes of pending data
    while (this.pendingCount !== 56) {
      if (this.pendingCount > 56) {
        const zeroPadding = new Uint8Array(64 - this.pendingCount);
        this.update(zeroPadding);
      } else {
        const zeroPadding = new Uint8Array(56 - this.pendingCount);
        this.update(zeroPadding);
      }
    }

    // Append the 64-bit length big-endian field
    const finalBytes = new Uint8Array(8);
    const highBits = Math.floor(bitLength / 0x100000000) & 0xffffffff;
    const lowBits = bitLength & 0xffffffff;

    finalBytes[0] = (highBits >>> 24) & 0xff;
    finalBytes[1] = (highBits >>> 16) & 0xff;
    finalBytes[2] = (highBits >>> 8) & 0xff;
    finalBytes[3] = highBits & 0xff;
    finalBytes[4] = (lowBits >>> 24) & 0xff;
    finalBytes[5] = (lowBits >>> 16) & 0xff;
    finalBytes[6] = (lowBits >>> 8) & 0xff;
    finalBytes[7] = lowBits & 0xff;

    this.update(finalBytes);

    // Join hash words into hex string
    return Array.from(this.h).map(val => {
      const hex = (val >>> 0).toString(16);
      return "00000000".substring(hex.length) + hex;
    }).join("");
  }
}

/**
 * Utility to calculate standard SHA-256 hash from a Blob or File.
 * Uses native SubtleCrypto if active, or falls back to standard-compliant streaming JS algorithm.
 */
export async function computeSHA256(blob: Blob): Promise<string> {
  // If SubtleCrypto is fully working and context is secure, prefer fast native hash
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.warn("SubtleCrypto failed, falling back to pure JS stream:", err);
    }
  }

  // Pure memory-safe streaming fallback. Reads bytes in chunks of 1MB to keep memory consumption low.
  const stream = new SHA256Stream();
  const chunkSize = 1024 * 1024; // 1 MB chunk-by-chunk window
  let offset = 0;

  while (offset < blob.size) {
    const slice = blob.slice(offset, offset + chunkSize);
    const arrayBuffer = await slice.arrayBuffer();
    stream.update(new Uint8Array(arrayBuffer));
    offset += chunkSize;
  }

  return stream.finalize();
}

/**
 * Format bytes into readable string (KB, MB, GB, etc.)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format speed in bytes/sec to readable speed
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}
