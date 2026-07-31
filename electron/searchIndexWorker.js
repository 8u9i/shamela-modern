// Runs the book_content FTS rebuild off the main thread so the app stays
// responsive (the index can be millions of rows). Owns a private connection to
// the same database; WAL lets it write while the main process reads.
// Resumable: a partial build is detected on next startup and rebuilt from
// scratch, so interrupting the worker is always safe.
const { parentPort, workerData } = require('worker_threads');
const Database = require('better-sqlite3');

const { ensureSearchIndex, resetContentFts, buildContentFtsStep } = require('./searchIndex');

const BATCH_SIZE = workerData.batchSize || 10000;

let stop = false;
parentPort.on('message', (msg) => {
  if (msg && msg.type === 'stop') stop = true;
});

// Yields to the event loop so incoming "stop" messages are delivered between
// batches.
const sleep = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
  let db;
  try {
    db = new Database(workerData.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');
    db.pragma('cache_size = -64000');

    ensureSearchIndex(db);
    resetContentFts(db);

    const first = buildContentFtsStep(db, { batchSize: BATCH_SIZE, afterId: 0 });
    let done = first.done;
    let total = first.total;
    let lastId = first.lastId;
    parentPort.postMessage({ type: 'progress', done, total });
    await sleep();

    while (!stop && done < total) {
      const res = buildContentFtsStep(db, { batchSize: BATCH_SIZE, afterId: lastId });
      if (res.done <= done || res.lastId === lastId) break;
      done = res.done;
      lastId = res.lastId;
      total = res.total;
      parentPort.postMessage({ type: 'progress', done, total });
      await sleep();
    }

    parentPort.postMessage({ type: 'done', done, total, stopped: stop });
  } catch (e) {
    parentPort.postMessage({ type: 'error', message: e.message });
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // best effort
      }
    }
  }
})();
