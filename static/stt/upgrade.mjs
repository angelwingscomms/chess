// A bigger model in its own worker, beside Conformer, so downloads, startup and crashes cannot interrupt dictation.
// Until it is ready, or after it fails or takes longer than ms on one segment, it answers undefined.
export function start_upgrade(file, runtime, ms = 30_000) {
  let worker;
  let ready = false;
  let finish;
  function stop() {
    ready = false;
    worker?.terminate();
    finish?.();
  }
  try {
    worker = new Worker(new URL(file, import.meta.url));
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
  const run = async pcm => {
    if (!ready) return;
    const copy = pcm.slice();
    return new Promise(resolve => {
      const timeout = setTimeout(stop, ms);
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
  run.stop = stop;
  return run;
}
