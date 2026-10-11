/** Only loaded by the admin upload flow. Inference runs off the UI thread. */
export function removeProductBackground(file: File, onProgress?: (text: string) => void, signal?: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../js/product-cutout-worker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => finish(new Error('Recorte demorou demais. Use a original ou tente novamente.')), 90000);
    let done = false;
    const abort = () => finish(new Error('Recorte cancelado.'));
    signal?.addEventListener('abort', abort, { once: true });
    function finish(error?: Error, blob?: Blob) {
      if (done) return;
      done = true;
      signal?.removeEventListener('abort', abort);
      clearTimeout(timer); worker.terminate();
      if (error) reject(error); else resolve(blob!);
    }
    worker.onmessage = ({ data }) => {
      if (data.status) onProgress?.(data.status);
      else if (data.error) finish(new Error(data.error));
      else if (data.blob instanceof Blob) finish(undefined, data.unchanged ? file : data.blob);
      else finish(new Error('Recorte inválido.'));
    };
    worker.onerror = () => finish(new Error('Recorte indisponível neste navegador. Use a original.'));
    if (signal?.aborted) abort(); else worker.postMessage(file);
  });
}
