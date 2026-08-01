const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const workerPath = path.join(__dirname, 'updateWorker.js');

function spawnWorker(workerData) {
  return new Promise((resolve) => {
    const messages = [];
    const worker = new Worker(workerPath, { workerData });
    worker.on('message', (msg) => messages.push(msg));
    worker.on('error', (e) => messages.push({ type: 'error', message: e.message }));
    worker.on('exit', () => resolve(messages));
  });
}

test('updateWorker reports done for an empty install list', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'upw-'));
  const messages = await spawnWorker({
    tmpDir: path.join(tmp, 'tmp'),
    dbPath: path.join(tmp, 'shamela.db'),
    books: [],
  });
  assert.ok(messages.some((m) => m.type === 'done'));
});

test('updateWorker errors on invalid args', async () => {
  const messages = await spawnWorker({});
  assert.ok(messages.some((m) => m.type === 'error'));
});
