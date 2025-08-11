/*
  Splits the master CSV into per-category CSVs with a global running ID.
  Output: backend/categories/<Category>.csv containing columns: id,name
*/

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function sanitizeFilename(input) {
  // Match category name exactly except replace POSIX path separator '/' with a fullwidth slash to remain a single file
  // Keep all other characters as-is
  return input.replace(/[\/]/g, '／').trim();
}

function cleanOutputDirectory(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
      fs.unlinkSync(path.join(directoryPath, entry.name));
    }
  }
}

function csvEscape(value) {
  if (value == null) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function main() {
  const dataFilePath = path.resolve(__dirname, '..', 'data', 'truefood_products_full.csv');
  const outputDir = path.resolve(__dirname, '..', 'categories');

  ensureDirectoryExists(outputDir);
  cleanOutputDirectory(outputDir);

  const csvContent = fs.readFileSync(dataFilePath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const nameColumn = 'name';
  const categoryColumn = 'harmonized single category';

  // Validate columns
  if (records.length === 0) {
    console.error('No records found in CSV.');
    process.exit(1);
  }
  if (!(nameColumn in records[0]) || !(categoryColumn in records[0])) {
    console.error(`Expected columns not found. Needed: "${nameColumn}", "${categoryColumn}"`);
    process.exit(1);
  }

  // Assign global IDs in the order rows appear; group by category
  const categoryToRows = new Map();
  let globalId = 1;

  for (const row of records) {
    const category = row[categoryColumn] || 'Uncategorized';
    const name = row[nameColumn] || '';
    if (!categoryToRows.has(category)) {
      categoryToRows.set(category, []);
    }
    categoryToRows.get(category).push({ id: globalId, name });
    globalId += 1;
  }

  // Write per-category CSVs
  for (const [category, rows] of categoryToRows.entries()) {
    const fileName = sanitizeFilename(`${category}.csv`);
    const filePath = path.join(outputDir, fileName);

    const lines = ['id,name'];
    for (const { id, name } of rows) {
      lines.push(`${id},${csvEscape(name)}`);
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Wrote ${rows.length} rows to ${filePath}`);
  }

  console.log(`Done. Total rows processed: ${globalId - 1}. Categories: ${categoryToRows.size}.`);
}

main();


