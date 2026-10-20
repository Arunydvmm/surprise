/** Small request guards shared by cookie-authenticated API routes. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE. If it is missing, only accept
  // requests the browser itself marks as same-origin (or non-browser clients that send no Sec-Fetch-Site).
  if (!origin) {
    const site = request.headers.get("sec-fetch-site");
    return !site || site === "same-origin" || site === "none";
  }
  try {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJsonLimited<T = unknown>(request: Request, maxBytes: number): Promise<T | null> {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; }
  catch { return null; }
}

/** Validate the file's signature instead of relying on the client MIME header. */
export function hasAllowedFileSignature(data: Buffer, mime: string, bucket: "memory-photos" | "surprise-music"): boolean {
  if (bucket === "memory-photos") {
    if (mime === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (mime === "image/png") return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === "image/gif") return data.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/) !== null;
    if (mime === "image/webp") return data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
    return false;
  }
  // Common signatures for the audio types accepted by FILE_BUCKETS.
  const ascii = data.subarray(0, 12).toString("ascii");
  const isMp3 = data.subarray(0, 3).toString("ascii") === "ID3" || (data.length > 1 && data[0] === 0xff && (data[1] & 0xe0) === 0xe0);
  const isMp4 = data.length >= 8 && data.toString("ascii", 4, 8) === "ftyp";
  const isWav = ascii.startsWith("RIFF") && data.toString("ascii", 8, 12) === "WAVE";
  const isOgg = ascii.startsWith("OggS");
  const isWebm = data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const isAac = data.length > 1 && data[0] === 0xff && (data[1] & 0xf6) === 0xf0;
  const isFlac = ascii.startsWith("fLaC");
  if (["audio/mpeg"].includes(mime)) return isMp3;
  if (["audio/mp4", "audio/x-m4a", "audio/m4a"].includes(mime)) return isMp4;
  if (["audio/wav", "audio/x-wav"].includes(mime)) return isWav;
  if (mime === "audio/ogg") return isOgg;
  if (mime === "audio/webm") return isWebm;
  if (mime === "audio/aac") return isAac;
  return isMp3 || isMp4 || isWav || isOgg || isWebm || isAac || isFlac;
}


/** Read a binary request body while enforcing a hard byte ceiling. */
export async function readBytesLimited(request: Request, maxBytes: number): Promise<Uint8Array> {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
