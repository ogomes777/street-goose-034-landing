import * as ort from 'onnxruntime-web/wasm';
import { normalizedRgb, validatedAlpha } from '../src/lib/product-cutout-math';

self.onmessage = async function (event) {
  let bitmap, session;
  try {
    const file = event.data;
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Imagem indisponível.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const source = ctx.getImageData(0, 0, width, height);
    // Already transparent: preserve the supplied alpha rather than cutting twice.
    for (let i = 3; i < source.data.length; i += 4) if (source.data[i] < 250) {
      self.postMessage({ blob: file, unchanged: true }); return;
    }
    self.postMessage({ status: 'Preparando recorte…' });
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = new URL('/product-cutout/', self.location.href).href;
    const res = await fetch('/product-cutout/u2netp.onnx');
    if (!res.ok) throw new Error('Não foi possível carregar o recorte.');
    session = await ort.InferenceSession.create(await res.arrayBuffer(), { executionProviders: ['wasm'] });
    const small = new OffscreenCanvas(320, 320);
    const smallCtx = small.getContext('2d', { willReadFrequently: true });
    smallCtx.drawImage(bitmap, 0, 0, 320, 320);
    const tensor = new ort.Tensor('float32', normalizedRgb(smallCtx.getImageData(0, 0, 320, 320).data), [1, 3, 320, 320]);
    self.postMessage({ status: 'Removendo fundo…' });
    const result = await session.run({ [session.inputNames[0]]: tensor });
    const alpha = validatedAlpha(result[session.outputNames[0]].data);
    const mask = smallCtx.createImageData(320, 320);
    for (let i = 0; i < alpha.length; i++) {
      mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = 255;
      mask.data[i * 4 + 3] = alpha[i];
    }
    smallCtx.putImageData(mask, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(small, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.94 });
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error.message || 'Não foi possível recortar esta foto.' });
  } finally {
    bitmap?.close();
    if (session) await session.release();
  }
};
