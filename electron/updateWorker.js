const { parentPort, workerData } = require('worker_threads');
const { setPaths, runUpdates } = require('./update');

// Runs the book install pipeline off the main process so a large update can no
// longer freeze the UI. Progress messages are forwarded to main via parentPort;
// main re-broadcasts them to the renderer.
function sendAndExit(msg, code = 0) {
  parentPort.postMessage(msg);
  // update.js keeps a keep-alive https agent, so the worker would not drain on
  // its own; give the message queue a tick to flush, then exit explicitly.
  setTimeout(() => process.exit(code), 100);
}

async function main() {
  const { tmpDir, dbPath, books } = workerData || {};
  if (!tmpDir || !dbPath || !Array.isArray(books)) {
    sendAndExit({ type: 'error', message: 'update worker: invalid args' }, 1);
    return;
  }
  setPaths(tmpDir, dbPath);
  const onProgress = (msg, current, total) => {
    parentPort.postMessage({ type: 'progress', msg, current, total });
  };
  try {
    await runUpdates(books, onProgress);
    sendAndExit({ type: 'done' });
  } catch (e) {
    console.error('Update worker error:', e);
    sendAndExit({ type: 'error', message: e.message || String(e) }, 1);
  }
}

main();
