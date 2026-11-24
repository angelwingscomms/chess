// Runs beside Conformer so downloads, startup and crashes cannot interrupt it.
export function start_canary(runtime) {
  let worker;
  let ready = false;
  let finish;
  function stop() {
    ready = false;
    worker?.terminate();
    finish?.();
  }
  try {
    worker = new Worker(new URL('./canary.worker.js', import.meta.url));
    worker.onerror = stop;
    worker.onmessageerror = stop;
    worker.onmessage = ({ data }) => {
      if (data.failed) stop();
      else if (data.ready) ready = true;
      else finish?.(data.text);
    };
    worker.postMessage({ r: runtime });
  } catch {
    stop();
  }
  return async pcm => {
    if (!ready) return;
    const copy = pcm.slice();
    return new Promise(resolve => {
      const timeout = setTimeout(stop, 30_000);
      finish = text => {
        finish = undefined;
        clearTimeout(timeout);
        resolve(text);
      };
      try {
        worker.postMessage({ pcm: copy }, [copy.buffer]);
      } catch {
        stop();
      }
    });
  };
}
