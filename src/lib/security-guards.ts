/* Avatar URLs and uploads must be narrowly validated before use in UI. */
export function trustedAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash) return null;
    const host = u.hostname.toLowerCase();
    const isGoogle = (host === "googleusercontent.com" || host.endsWith(".googleusercontent.com"))
      && u.pathname.length > 1;
    const isAvatarStorage = /^[a-z0-9-]+\.supabase\.co$/.test(host)
      && /^\/storage\/v1\/object\/public\/avatars\/[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/.test(u.pathname)
      && !u.search;
    return isGoogle || isAvatarStorage ? u.href : null;
  } catch {
    return null;
  }
}

export function hasImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png")
    return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
  if (mime === "image/webp")
    return bytes.length >= 12 && [82,73,70,70].every((n,i)=>bytes[i]===n) &&
      [87,69,66,80].every((n,i)=>bytes[i+8]===n);
  return false;
}

export async function isSafeAvatarBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 1 || blob.size > 2*1024*1024) return false;
  if (!["image/jpeg","image/png","image/webp"].includes(blob.type)) return false;
  try {
    const bytes = new Uint8Array(await blob.slice(0,12).arrayBuffer());
    return hasImageSignature(bytes,blob.type);
  } catch {
    return false;
  }
}
