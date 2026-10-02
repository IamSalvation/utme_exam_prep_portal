/* =========================================================
   diagnose-biology-broken.js
   Lists every question in the V2 bank where the parser failed.
   Shows broken output + raw source from biology-column-clean.txt.
   ========================================================= */

const fs = require("fs");

const BANK = "Questions-Biology-1983-2004-LAYOUT-V2-FIXED.js";
const RAW  = "Biology-Column-Clean-FIXED.txt";

// Load bank (regex+eval pattern)
const bankRaw = fs.readFileSync(BANK, "utf8");
const m = bankRaw.match(/const questionBank\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error("Cannot parse bank"); process.exit(1); }
const bank = eval(m[1]);

// Load raw text, index by year
const rawText = fs.readFileSync(RAW, "utf8");
const yearSections = {};
const yearRe = /@@YEAR:(\d{4})@@/g;
const parts = rawText.split(yearRe);
for (let i = 1; i < parts.length; i += 2) {
  yearSections[parseInt(parts[i], 10)] = parts[i + 1] || "";
}

// Find broken questions
const broken = bank.filter(q => {
  if (!q.options || q.options.length < 4) return true;
  if (!q.question || q.question.length < 10) return true;
  if (q.options.some(o => !o || !o.trim())) return true;
  return false;
});

console.log("=".repeat(70));
console.log(`BROKEN QUESTIONS: ${broken.length} of ${bank.length}`);
console.log("=".repeat(70));
console.log("");

// Group by year
const byYear = {};
broken.forEach(q => {
  if (!byYear[q.year]) byYear[q.year] = [];
  byYear[q.year].push(q);
});

// Write report to file
const lines = [];
lines.push(`BIOLOGY BROKEN QUESTIONS REPORT`);
lines.push(`Total broken: ${broken.length} / ${bank.length}`);
lines.push("");

Object.keys(byYear).sort().forEach(y => {
  const qs = byYear[y];
  lines.push("");
  lines.push("#".repeat(70));
  lines.push(`# YEAR ${y} — ${qs.length} broken`);
  lines.push("#".repeat(70));

  qs.forEach(q => {
    lines.push("");
    lines.push(`--- ${y} Q${q.number} ---`);
    lines.push(`STEM: ${JSON.stringify(q.question)}`);
    lines.push(`OPTIONS (${q.options.length}):`);
    q.options.forEach((o, i) => lines.push(`  ${String.fromCharCode(65+i)}. ${JSON.stringify(o)}`));
    lines.push(`optionLabels: ${JSON.stringify(q.optionLabels)}`);
    lines.push("");
    lines.push(`RAW SOURCE:`);

    // Find this question in the raw section
    const sec = yearSections[y] || "";
    const lines_raw = sec.split("\n");
    // Find the line matching "N." or "N " at start
    const re = new RegExp(`^\\s*${q.number}\\.?\\s*$|^\\s*${q.number}\\.\\s+`);
    let startIdx = -1;
    for (let i = 0; i < lines_raw.length; i++) {
      if (re.test(lines_raw[i])) { startIdx = i; break; }
    }
    if (startIdx >= 0) {
      // Show next ~20 lines or until next question number
      let endIdx = startIdx + 1;
      while (endIdx < lines_raw.length && endIdx < startIdx + 25) {
        const t = lines_raw[endIdx].trim();
        // Stop at next question number line
        if (/^\d{1,2}\.\s*$/.test(t) || /^\d{1,2}\.\s+\S/.test(t)) {
          // Check if it's a real next question (not a sub-item 1-5)
          const num = parseInt(t.match(/^(\d{1,2})/)[1], 10);
          if (num > q.number && num <= 50) break;
        }
        endIdx++;
      }
      lines_raw.slice(startIdx, endIdx).forEach(l => lines.push("  " + l));
    } else {
      lines.push("  [COULD NOT FIND IN RAW]");
    }
  });
});

fs.writeFileSync("biology-broken-report.txt", lines.join("\n"), "utf8");

console.log(`Wrote biology-broken-report.txt (${lines.length} lines)`);
console.log("");
console.log("Broken count by year:");
Object.keys(byYear).sort().forEach(y => {
  console.log(`  ${y}: ${byYear[y].length}`);
});
console.log("");
console.log("Broken count total: " + broken.length);
console.log("");
console.log("Next: open the report in VS Code:");
console.log("  code biology-broken-report.txt");
