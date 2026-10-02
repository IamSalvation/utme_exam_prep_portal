#!/usr/bin/env node
/**
 * reconstruct-biology-columns.js
 * Node.js port of reconstruct-biology-columns.py
 * 
 * Original Python used PyMuPDF (fitz) get_text("blocks") with x0,y0,x1,y1.
 * Node port uses pdfjs-dist (Mozilla PDF.js) to get text items with transforms.
 * 
 * Logic preserved:
 * - Detect year headers "Biology YYYY"
 * - Split page into L/R columns by x midpoint 290 (PDF points)
 * - Sort each column by y0 then x0
 * - Handle year boundaries where one column is previous year tail and other is next year header
 * - Output @@YEAR:####@@ markers + reconstructed text
 * 
 * Usage:
 *   npm install pdfjs-dist
 *   node reconstruct-biology-columns.js input.pdf biology-column-clean.txt
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = process.argv[2] || '/mnt/data/JAMB Biology Past Questions 1983 - 2004(1)_2.pdf';
  const outPath = process.argv[3] || '/mnt/data/biology-column-clean-node.txt';

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    console.error('Place your JAMB PDF at that path or pass path as first arg.');
    process.exit(1);
  }

  // Lazy import pdfjs-dist
  let pdfjsLib;
  try {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    try {
      pdfjsLib = await import('pdfjs-dist');
    } catch (e) {
      console.error('Please install pdfjs-dist: npm install pdfjs-dist');
      throw e;
    }
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const years = {}; // year -> array of text lines
  let currentYear = null;

  // Helper: group text items into blocks by y proximity
  function groupIntoBlocks(items, pageHeight) {
    // items: [{x, y, str, width}]
    // Sort by y desc (PDF origin bottom-left, but pdfjs y is transformed top)
    // We'll use y for vertical grouping
    const blocks = [];
    const threshold = 4; // y tolerance

    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    for (const it of sorted) {
      let placed = false;
      for (const bl of blocks) {
        if (Math.abs(bl.y - it.y) < threshold && Math.abs(bl.x - it.x) < 200) {
          bl.items.push(it);
          bl.x = Math.min(bl.x, it.x);
          placed = true;
          break;
        }
      }
      if (!placed) {
        blocks.push({ x: it.x, y: it.y, y0: pageHeight - it.y, x0: it.x, x1: it.x + it.width, items: [it] });
      }
    }
    // Convert blocks to text
    return blocks.map(bl => {
      const txt = bl.items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim();
      const x0 = Math.min(...bl.items.map(i => i.x));
      const x1 = Math.max(...bl.items.map(i => i.x + i.width));
      const y0 = bl.y0;
      return { x0, y0, x1, y1: y0 + 10, txt };
    }).filter(b => b.txt);
  }

  for (let pi = 1; pi <= doc.numPages; pi++) {
    const page = await doc.getPage(pi);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = textContent.items.map(it => {
      const tx = it.transform;
      const x = tx[4];
      const y = tx[5];
      return { x, y, str: it.str, width: it.width || 0 };
    }).filter(it => it.str.trim());

    const blocksRaw = groupIntoBlocks(items, viewport.height);

    const blocks = blocksRaw
      .filter(b => b.txt && b.y0 > 15 && b.y0 < 780) // skip headers/footers like python did (y1<15 or y0>780)
      .map(b => {
        const col = b.x1 <= 290 || (b.x0 + b.x1) / 2 < 290 ? 'L' : 'R';
        return { col, y0: b.y0, x0: b.x0, txt: b.txt };
      });

    const L = blocks.filter(b => b.col === 'L').sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    const R = blocks.filter(b => b.col === 'R').sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);

    // Detect year headers
    const yearHeaderRe = /Biology\s+(19\d{2}|20\d{2})/i;
    const headers = [];
    for (const colName of ['L', 'R']) {
      const arr = colName === 'L' ? L : R;
      for (let idx = 0; idx < arr.length; idx++) {
        const b = arr[idx];
        const m = b.txt.match(yearHeaderRe);
        if (m) {
          // Determine if it's wide header spanning page (W)
          const isWide = b.x0 < 100 && b.txt.length > 10 && b.txt.includes('Biology');
          headers.push({ col: isWide ? 'W' : colName, idx, y0: b.y0, year: parseInt(m[1], 10), txt: b.txt });
        }
      }
    }

    function addToYear(y, arr) {
      if (!(y in years)) years[y] = [];
      for (const b of arr) {
        let txt = b.txt.replace(yearHeaderRe, '').trim();
        if (txt) years[y].push(txt);
      }
    }

    if (headers.length === 0) {
      if (currentYear) {
        addToYear(currentYear, L);
        addToYear(currentYear, R);
      }
    } else {
      // Sort headers by y0
      headers.sort((a, b) => a.y0 - b.y0);
      const h = headers[0];
      const newYear = h.year;

      if (h.col === 'W') {
        if (currentYear) {
          addToYear(currentYear, L.filter(b => b.y0 < h.y0));
          addToYear(currentYear, R.filter(b => b.y0 < h.y0));
        }
        currentYear = newYear;
        addToYear(currentYear, L.filter(b => b.y0 > h.y0));
        addToYear(currentYear, R.filter(b => b.y0 > h.y0));
      } else if (h.col === 'R') {
        if (currentYear) {
          addToYear(currentYear, L);
          addToYear(currentYear, R.slice(0, h.idx));
        }
        currentYear = newYear;
        addToYear(currentYear, R.slice(h.idx + 1));
      } else {
        // L header
        if (currentYear) {
          addToYear(currentYear, L.filter(b => b.y0 < h.y0));
          addToYear(currentYear, R.filter(b => b.y0 < h.y0));
        }
        currentYear = newYear;
        addToYear(currentYear, L.filter(b => b.y0 > h.y0));
        addToYear(currentYear, R.filter(b => b.y0 > h.y0));
      }
    }
  }

  // Write output in same format as python version: @@YEAR:####@@ markers
  const outLines = [];
  for (const y of Object.keys(years).map(Number).sort((a, b) => a - b)) {
    outLines.push(`@@YEAR:${y}@@`);
    for (const t of years[y]) outLines.push(t);
  }

  fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log('Years:', Object.keys(years).map(Number).sort((a, b) => a - b));
  console.log('Total lines:', outLines.length);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
