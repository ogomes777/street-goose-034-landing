// Self-host the pinned model/runtime: uploads never leave the browser for inference.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
const out = new URL('../public/product-cutout/', import.meta.url);
const hash = '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
await mkdir(out, { recursive: true });
const target = new URL('u2netp.onnx', out);
let data;
try { data = await readFile(target); } catch { /* first build */ }
if (!data || createHash('sha256').update(data).digest('hex') !== hash) {
  const res = await fetch('https://huggingface.co/edgetools/u2netp/resolve/25dee37ab19c5b6ad64ba6578eba63f1ae07720c/u2netp.onnx', { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error('Could not prepare product background removal model');
  data = Buffer.from(await res.arrayBuffer());
  if (createHash('sha256').update(data).digest('hex') !== hash) throw new Error('Product model checksum mismatch');
  await writeFile(target, data);
}
for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(new URL('../node_modules/onnxruntime-web/dist/' + file, import.meta.url), new URL(file, out));
}
console.log('Product cutout model and WASM ready (verified).');

await copyFile(new URL('./product-cutout-notices.txt', import.meta.url), new URL('notices.txt', out));
