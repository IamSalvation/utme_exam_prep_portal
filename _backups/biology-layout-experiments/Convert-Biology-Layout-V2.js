#!/usr/bin/env node
/**
 * convert-biology-layout-v2.js
 * Fixes v1 bugs:
 * - v1 used /i and matched article "a" as option A -> stem truncated to "In"
 * - v2 is CASE-SENSITIVE and requires dot: /\b[A-E]\.\s+/
 * - Handles number-alone-on-line: "5.\nIn a dicot..."
 * - Handles multiple options on same line: "C. are smaller   D. contain..."
 * - Handles numbered sub-items (1. 2. 3. 4.) inside stems by merging
 * - Guards against out-of-order column bug (1987 Q17/Q26 interleaving)
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || '/mnt/data/biology-column-clean.txt';
const outJs = process.argv[3] || '/mnt/data/questions-biology-1983-2004-LAYOUT-V2.js';
const outAudit = process.argv[4] || '/mnt/data/biology-1983-2004-LAYOUT-V2-AUDIT.json';

let raw = fs.readFileSync(inputPath, 'utf8');
// Normalize OCR glitches: "A.Vitamin" -> "A. Vitamin", "A.I" -> "A. I"
raw = raw.replace(/([A-E])\.([A-Za-z])/g, '$1. $2');
// Also "A.  Vitamin" double spaces handled by clean()

function clean(s) {
  return s
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

// Split by @@YEAR:####@@ markers
const yearSections = {};
const yearRegex = /@@YEAR:(\d{4})@@/g;
let m;
let lastYear = null;
let lastIndex = 0;
const parts = raw.split(yearRegex); // [pre, year1, text1, year2, text2...]
for (let i = 1; i < parts.length; i += 2) {
  const y = parseInt(parts[i], 10);
  const txt = parts[i + 1] || '';
  if (!yearSections[y]) yearSections[y] = '';
  yearSections[y] += txt + '\n';
}

function extractAnchors(lines) {
  const anchors = [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    // Case 1: "5." alone or "5. " alone
    let mm = s.match(/^(\d{1,2})\.\s*$/);
    if (mm) {
      anchors.push({ i, n: +mm[1], raw: s });
      continue;
    }
    // Case 2: "5. In a dicot..."  or "5  Which..." (OCR missing dot)
    mm = s.match(/^(\d{1,2})\.\s+(.{3,})$/);
    if (mm) {
      // Avoid matching figure refs like "Fig 1." - but question numbers are at start
      // Filter: if after number the text starts with lowercase and anchor looks like sub-item inside options, we still collect but later merge logic handles
      anchors.push({ i, n: +mm[1], raw: s });
      continue;
    }
    mm = s.match(/^(\d{1,2})\s+(.{8,})$/); // OCR dropped dot
    if (mm) {
      const num = +mm[1];
      if (num >= 1 && num <= 50) {
        anchors.push({ i, n: num, raw: s });
      }
    }
  }
  return anchors;
}

function countOptionLabels(block) {
  // CASE-SENSITIVE, requires DOT + SPACE - normalized beforehand to fix "A.Vitamin" OCR
  const re = /(?<![A-Za-z0-9])([A-E])\.\s+/g;
  let count = 0;
  let hasA = false;
  let mm;
  while ((mm = re.exec(block))) {
    count++;
    if (mm[1] === 'A') hasA = true;
  }
  return { count, hasA };
}

function parseOptions(blockText) {
  // Find all CASE-SENSITIVE [A-E]. positions - dot required, but pre-normalized
  const re = /(?<![A-Za-z0-9])([A-E])\.\s+/g;
  const hits = [];
  let mm;
  while ((mm = re.exec(blockText))) {
    hits.push({ label: mm[1], pos: mm.index, end: re.lastIndex });
  }
  // Need at least A-D in order
  // Find best sequence starting at A
  let bestSeq = [];
  for (let i = 0; i < hits.length; i++) {
    if (hits[i].label !== 'A') continue;
    const seq = [hits[i]];
    let expected = 'B';
    for (let k = i + 1; k < hits.length; k++) {
      if (hits[k].label === expected) {
        // Prevent huge gaps (>1500 chars) from being considered same question
        if (hits[k].pos - seq[seq.length - 1].pos > 2000) break;
        seq.push(hits[k]);
        expected = String.fromCharCode(expected.charCodeAt(0) + 1);
        if (expected > 'E') break;
      } else if (hits[k].label === seq[seq.length - 1].label) {
        // duplicate label, skip
        continue;
      } else if (hits[k].label < expected) {
        // out of order, could be noise, continue searching
        continue;
      } else {
        // expected C but got E - allow gap? For missing D case (1983 Q19) we should allow skipping
        // If gap is 1 (e.g., A,B,C,E) allow it
        const gap = hits[k].label.charCodeAt(0) - expected.charCodeAt(0);
        if (gap === 1) {
          // missing one, accept
          seq.push(hits[k]);
          expected = String.fromCharCode(hits[k].label.charCodeAt(0) + 1);
          if (expected > 'F') break;
        } else if (gap > 1) {
          break;
        }
      }
    }
    if (seq.length > bestSeq.length) bestSeq = seq;
  }

  if (bestSeq.length < 2) {
    // No viable option sequence
    const stemRaw = blockText.replace(/^\s*\d{1,2}\s*\.?\s*/, '').replace(/\n/g, ' ');
    return { stem: clean(stemRaw), options: [], labels: [] };
  }

  // Stem = from start to first label pos
  let stemRaw = blockText.slice(0, bestSeq[0].pos);
  stemRaw = stemRaw.replace(/^\s*\d{1,2}\s*\.?\s*/, ''); // remove leading "5."
  stemRaw = stemRaw.replace(/\n/g, ' ');

  // Special fix for 1987 interleaving: if stem contains "\n26.\n" pattern inside, remove it
  // Actually block should not contain next question number if we sliced correctly, but keep guard

  const options = [];
  for (let i = 0; i < bestSeq.length; i++) {
    const start = bestSeq[i].end;
    const end = i + 1 < bestSeq.length ? bestSeq[i + 1].pos : blockText.length;
    let opt = blockText.slice(start, end);
    // Remove trailing question number that leaked from next block (e.g., "\n27. Sclerenchyma...")
    opt = opt.split(/\n\s*\d{1,2}\.\s+/)[0];
    opt = opt.replace(/\n/g, ' ');
    options.push(clean(opt));
  }

  return { stem: clean(stemRaw), options, labels: bestSeq.map(x => x.label) };
}

function extractQuestionBlocksV2(text) {
  const lines = text.split('\n');
  const anchors = extractAnchors(lines);

  // Build blocks, handling sub-items (1.,2.,3.,4.) inside question stems like Q40 fibrinogen
  const blocks = [];
  let i = 0;
  while (i < anchors.length) {
    const a = anchors[i];
    let endIdx = i + 1;
    // Look ahead for sub-items: if next anchor numbers are small (<=6) and current is larger (>=10) then they are sub-items
    // Merge through them if intermediate blocks have no options
    let mergedLinesEnd = null;

    // Determine tentative block end line
    const nextAnchor = anchors[endIdx];
    let blockText = lines.slice(a.i, nextAnchor ? nextAnchor.i : lines.length).join('\n');
    let { count } = countOptionLabels(blockText);

    // If this block has no options and it's a small number, it is likely a sub-item - should have been merged into previous
    // So skip it as standalone
    if (a.n <= 6 && count < 2 && blocks.length > 0) {
      // Check if previous block is a question that expects sub-items (like Q40)
      const prev = blocks[blocks.length - 1];
      if (prev.n >= 10) {
        // Merge this sub-item into previous block
        // Extend previous block's end to next anchor
        prev.rawEndLine = nextAnchor ? nextAnchor.i : lines.length;
        prev.text = lines.slice(prev.rawStartLine, prev.rawEndLine).join('\n');
        i++;
        continue;
      }
    }

    if (count < 2) {
      // No options found - might be a question whose options are further down due to figure or sub-items
      // Try to extend through small-numbered anchors (sub-items)
      let j = endIdx;
      while (j < anchors.length) {
        const cand = anchors[j];
        if (cand.n <= 6 && cand.n <= a.n) {
          // sub-item, merge
          j++;
          const extendedEnd = anchors[j] ? anchors[j].i : lines.length;
          blockText = lines.slice(a.i, extendedEnd).join('\n');
          const c2 = countOptionLabels(blockText);
          if (c2.count >= 2) {
            endIdx = j;
            break;
          }
        } else {
          break;
        }
      }
    }

    // Special guard for out-of-order column bug: if next anchor number is much smaller but >6 (e.g., 25 -> 17), don't merge
    // Just treat current as separate
    const finalEnd = anchors[endIdx] ? anchors[endIdx].i : lines.length;
    blocks.push({
      n: a.n,
      rawStartLine: a.i,
      rawEndLine: finalEnd,
      text: lines.slice(a.i, finalEnd).join('\n'),
    });
    i = endIdx;
  }

  // Second pass: handle 1987 interleaving where Q26 was inserted inside Q17 stem
  // Heuristic: if a block's text contains "\n26.\n" in middle of a sentence (no options before it), split and re-stitch
  // For simplicity, we will re-extract using the file-order but also check for embedded question numbers inside stem that look like real questions
  const fixedBlocks = [];
  for (const b of blocks) {
    // If block for 17 contains "26." inside and has no options, try to reconstruct by looking ahead
    if (b.text.split('\n').length > 2) {
      const innerMatch = b.text.match(/\n\s*(\d{1,2})\.\s*\n/);
      if (innerMatch) {
        const innerNum = +innerMatch[1];
        // If innerNum is a valid question number and different from b.n, this is column bug
        if (innerNum !== b.n && innerNum >= 1 && innerNum <= 50) {
          // Split b into two parts at innerNum position
          const splitPos = b.text.indexOf(`\n${innerNum}.`);
          if (splitPos > 0) {
            const part1 = b.text.slice(0, splitPos);
            const part2 = b.text.slice(splitPos);
            // Keep part1 as extended with next block's continuation later - for now push part1 as incomplete
            // We'll handle stitching in final dedup phase
            // Instead, push both as separate raw blocks and let dedup keep best
            fixedBlocks.push({ n: b.n, rawStartLine: b.rawStartLine, rawEndLine: b.rawEndLine, text: part1 + '\n' + lines.slice(b.rawEndLine, b.rawEndLine + 5).join('\n') });
            // The inner question will be found as its own anchor anyway, so skip double counting
            // Just push current as truncated and let next iteration handle inner
            const innerBlockText = part2;
            fixedBlocks.push({ n: innerNum, rawStartLine: b.rawStartLine, rawEndLine: b.rawEndLine, text: innerBlockText });
            continue;
          }
        }
      }
    }
    fixedBlocks.push(b);
  }

  return fixedBlocks.length ? fixedBlocks : blocks;
}

const out = [];
const report = { years: {}, total: 0, expectedAvailable: 0, missingTotal: 0 };
const allAnomalies = [];

for (const year of Object.keys(yearSections).map(Number).sort((a, b) => a - b)) {
  if (year === 1996) continue; // partial tail
  const text = yearSections[year];
  const rawBlocks = extractQuestionBlocksV2(text);

  const byNum = new Map();
  for (const b of rawBlocks) {
    const p = parseOptions(b.text);
    // Filter out obvious non-questions: stem <3 chars and no options, or stem is "Use Fig..."
    if (p.stem.length < 3 && p.options.length === 0) continue;
    if (/^Use Fig\./i.test(p.stem) && p.options.length === 0) continue;
    if (/^Fig\s*\d+/i.test(p.stem) && p.options.length === 0) continue;

    const rec = {
      id: `bio-${year}-q${b.n}`,
      year,
      number: b.n,
      question: p.stem,
      options: p.options,
      optionLabels: p.labels,
      _rawLen: b.text.length,
    };
    const prev = byNum.get(b.n);
    // Keep version with more options, or longer stem if options equal
    if (!prev || rec.options.length > prev.options.length || (rec.options.length === prev.options.length && rec.question.length > prev.question.length)) {
      byNum.set(b.n, rec);
    }
  }

  const qs = [...byNum.values()].sort((a, b) => a.number - b.number);
  report.years[year] = { extracted: qs.length, missing: [], optionDistribution: {}, incomplete: [] };

  for (let n = 1; n <= 50; n++) {
    const q = byNum.get(n);
    if (!q) {
      report.years[year].missing.push(n);
      continue;
    }
    const k = q.options.length;
    report.years[year].optionDistribution[k] = (report.years[year].optionDistribution[k] || 0) + 1;
    if (k < 4 || q.question.length < 10) {
      report.years[year].incomplete.push({ n, options: k, stem: q.question.slice(0, 120) });
    }
    // Strip internal helper
    delete q._rawLen;
    out.push(q);
    report.total++;
  }
}

report.expectedAvailable = Object.keys(report.years).length * 50;
report.missingTotal = report.expectedAvailable - report.total;

for (const [y, r] of Object.entries(report.years)) {
  if (r.missing.length || r.incomplete.length) {
    allAnomalies.push({ year: +y, missing: r.missing, incomplete: r.incomplete, dist: r.optionDistribution });
  }
}

fs.writeFileSync(outJs, 'const questionBank = ' + JSON.stringify(out, null, 2) + ';\nmodule.exports = questionBank;\n', 'utf8');
fs.writeFileSync(outAudit, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync('/mnt/data/biology-layout-anomalies-V2.json', JSON.stringify(allAnomalies, null, 2), 'utf8');

console.log('V2 Parser Results:');
console.log(JSON.stringify(report, null, 2));

// Show fixed examples
function show(y, n) {
  const q = out.find(x => x.year === y && x.number === n);
  console.log(`\n=== ${y} Q${n} ===`);
  console.log('Q:', q ? q.question : 'NOT FOUND');
  console.log('Opts:', q ? q.options : []);
}
show(1983, 5);
show(1983, 19);
show(1984, 3);
show(1987, 17);
show(1987, 26);
