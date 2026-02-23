/* eslint-disable no-control-regex */

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      header: [],
      rows: [],
    };
  }

  const header = parseCsvLine(lines[0]).map((item) => item.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = String(values[i] ?? '').trim();
    }
    return row;
  });

  return { header, rows };
}

function csvLine(cells) {
  return cells
    .map((cell) => {
      const raw = String(cell ?? '');
      if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    })
    .join(',');
}

module.exports = {
  parseCsv,
  csvLine,
};
