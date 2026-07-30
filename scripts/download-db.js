const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'shamela.db');
const DB_URL = process.env.SHAMELA_DB_URL || 'https://eshamila.net/shamela.db';

if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 1000000) {
  console.log(`✅ Database already exists at: ${DB_PATH}`);
  process.exit(0);
}

console.log(`Downloading database from ${DB_URL}...`);
console.log('This may take a while (2.1 GB)...');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const protocol = DB_URL.startsWith('https') ? https : http;

protocol.get(DB_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Server returned ${response.statusCode}`);
    process.exit(1);
  }
  const total = parseInt(response.headers['content-length'] || '0', 10);
  const stream = fs.createWriteStream(DB_PATH);
  let downloaded = 0;
  let lastReport = 0;

  response.on('data', (chunk) => {
    stream.write(chunk);
    downloaded += chunk.length;
    if (total > 0 && downloaded - lastReport > 10 * 1024 * 1024) {
      lastReport = downloaded;
      const pct = ((downloaded / total) * 100).toFixed(1);
      console.log(`  ${(downloaded / 1073741824).toFixed(2)} GB / ${(total / 1073741824).toFixed(2)} GB (${pct}%)`);
    }
  });

  response.on('end', () => {
    stream.end();
    console.log(`✅ Database downloaded: ${DB_PATH}`);
  });
}).on('error', (e) => {
  console.error(`❌ Download failed: ${e.message}`);
  process.exit(1);
});
