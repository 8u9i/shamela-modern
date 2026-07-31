const fs = require('fs');
const path = require('path');

// Reads PdfInfo from the eshamila.net desktop install (Files/Duser) and exports
// the idBook -> PDF catalog used by the app for pdf_path backfill and on-demand
// PDF download. Run: node scripts/export-pdf-catalog.js
//
// Overrides:
//   SHAMELA_DUSER  path to the Duser Access DB (default: ../eshamila.net/Files/Duser)
//   SHAMELA_OUT    output json path (default: resources/pdf-catalog.json)

const DEFAULT_DUSER = path.resolve(__dirname, '..', '..', 'eshamila.net', 'Files', 'Duser');
const DEFAULT_OUT = path.resolve(__dirname, '..', 'resources', 'pdf-catalog.json');

async function main() {
  const duserPath = process.env.SHAMELA_DUSER || DEFAULT_DUSER;
  const outPath = process.env.SHAMELA_OUT || DEFAULT_OUT;

  if (!fs.existsSync(duserPath)) {
    console.error(`Duser not found: ${duserPath}`);
    process.exit(1);
  }

  const { default: MDBReader } = await import('mdb-reader');
  const reader = new MDBReader(fs.readFileSync(duserPath));
  const tbl = reader.getTable('PdfInfo');
  const rows = tbl.getData({ columns: tbl.getColumnNames() });

  const byBook = new Map();
  for (const r of rows) {
    const idBook = String(r.idBook || '').trim();
    const rel = String(r.pathPdfFormShamela || '').trim();
    const url = String(r.PdfAdress || '').trim();
    if (!idBook || !rel || !url) continue;
    if (!byBook.has(idBook)) byBook.set(idBook, []);
    byBook.get(idBook).push({
      rel,
      url,
      part: Number(r.Part) || 0,
    });
  }

  const books = {};
  for (const [idBook, parts] of byBook) {
    parts.sort((a, b) => a.part - b.part);
    books[idBook] = parts;
  }

  const out = {
    generated: new Date().toISOString(),
    source: path.basename(duserPath),
    count: Object.keys(books).length,
    books,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Exported ${out.count} books (${rows.length} PDF parts) -> ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
