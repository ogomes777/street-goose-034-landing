/* Street Goose 034 — foto de produto otimizada no navegador antes do upload.
   Reduz para no máximo 1600px no lado maior e converte para WEBP (mantém
   transparência dos PNG recortados). Se o navegador não gerar WEBP ou o
   resultado ficar maior, sobe o arquivo original. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function imageProblem(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use foto JPG, PNG ou WEBP.";
  if (file.size > 25 * 1024 * 1024) return "Foto muito grande (máx. 25MB antes de otimizar).";
  return null;
}

export async function optimizeImage(file: File, maxSide = 1600): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
    if (blob && blob.type === "image/webp" && (blob.size <= file.size || file.size > MAX_IMAGE_BYTES)) return blob;
    return file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
