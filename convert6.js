const fs = require("fs");

const inputFile   = process.argv[2];
const subjectName = process.argv[3] || "Physics";
const outputBase  = process.argv[4] || "physics-1983-2004";

if (!inputFile) {
  console.error('Usage: node convert6.js <input.txt> "<Subject>" "<outputBase>"');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

const yearHeaderRe = new RegExp("\\b" + subjectName + "\\s+(19\\d{2}|20\\d{2})\\b", "gi");
const yearSplits = [];
let m;
while ((m = yearHeaderRe.exec(raw)) !== null) {
  yearSplits.push({ year: m[1], start: m.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

const LETTERS = "ABCDE".split("");

function cleanText(t) {
  return t
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYearBlock(block) {
  // Normalize: collapse multiple blank lines, join lines that got split by OCR
  const rawLines = block.split("\n").map(l => l.trim());

  // Build a list of "tokens" — a token is either:
  // - a question number line: "N." (possibly with text after)
  // - an option line: "A. ..." possibly with multiple options on same line
  // - a body text line
  const questions = [];
  let current = null;
  let currentOption = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    // Skip headers
    if (/^(Physics|\d{4}\s*-\s*\d{4}|LASU-INFO|JAMB|Questions?|\d+)$/i.test(line)) continue;

    // Question start: line is just "N." or "N. text"
    const qm = line.match(/^(\d{1,3})\.\s*(.*)$/);
    if (qm) {
      const num = parseInt(qm[1], 10);
      // Heuristic: only treat as new question if current already has >= 2 options,
      // OR if this is the first question
      if (!current || (current.options.length >= 2)) {
        if (current && current.options.length >= 2) {
          if (currentOption) current.options.push(currentOption);
          questions.push(current);
        }
        current = { num, question: qm[2] ? cleanText(qm[2]) : "", options: [] };
        currentOption = null;
        continue;
      }
    }

    // Options on one line: "A. xxx B. yyy C. zzz ..."
    // Try to find multiple options on this line
    const allOpts = [];
    const optLineRe = /(?:^|\s)\(?([A-E])[\.\)]\s*([^A-E]*?)(?=\s*\(?[A-E][\.\)]|$)/g;
    let om;
    while ((om = optLineRe.exec(line)) !== null) {
      const letter = om[1].toUpperCase();
      const value  = cleanText(om[2]);
      if (value && value.length > 0) {
        allOpts.push({ letter, value });
      }
    }

    if (allOpts.length >= 2 && current) {
      // Treat as options line
      if (currentOption) current.options.push(currentOption);
      currentOption = null;
      allOpts.forEach(o => {
        current.options.push({ letter: o.letter, value: o.value });
      });
      continue;
    }

    // Single option on line: "A. text"
    const singleOpt = line.match(/^\(?([A-E])[\.\)]\s+(.+)$/);
    if (singleOpt && current) {
      const letter = singleOpt[1].toUpperCase();
      const value  = cleanText(singleOpt[2]);
      if (currentOption) current.options.push(currentOption);
      currentOption = { letter, value };
      continue;
    }

    // Continuation text
    if (currentOption) {
      currentOption.value = cleanText(currentOption.value + " " + line);
    } else if (current) {
      current.question = cleanText((current.question + " " + line).trim());
    }
  }

  if (currentOption) current.options.push(currentOption);
  if (current && current.options.length >= 2) questions.push(current);

  return questions;
}

const allQuestions = [];

yearSplits.forEach((section, i) => {
  if (section.year === "END") return;
  const nextStart = yearSplits[i + 1].start;
  const blockText = raw.substring(section.start, nextStart);

  const parsed = parseYearBlock(blockText);

  let accepted = 0, rejected = 0;
  parsed.forEach(q => {
    if (!q.question || q.question.length < 15) { rejected++; return; }
    if (!/^[A-Z0-9]/.test(q.question)) { rejected++; return; }

    const cleanedOptions = q.options
      .map(o => (o.value || "").trim())
      .filter(v => v.length > 0);

    if (cleanedOptions.length < 3) { rejected++; return; }

    const unique = new Set(cleanedOptions.map(v => v.toLowerCase()));
    if (unique.size < 3) { rejected++; return; }

    allQuestions.push({
      id: allQuestions.length + 1,
      subject: subjectName,
      section: section.year + " Paper",
      year: section.year,
      question: q.question,
      options: cleanedOptions,
      answer: null,
      needsAnswer: true,
      explanation: "No explanation provided."
    });
    accepted++;
  });

  console.log("Year " + section.year + ": " + accepted + " accepted, " + rejected + " rejected");
});

fs.mkdirSync("js", { recursive: true });
fs.mkdirSync("answers", { recursive: true });

const qOutFile = "js/questions-" + outputBase + "-all.js";
fs.writeFileSync(
  qOutFile,
  "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(allQuestions, null, 2) + ";\n",
  "utf-8"
);

const answerLines = ["# " + subjectName + " " + outputBase + " answers", ""];
let lastSection = null, counter = 0;
allQuestions.forEach(q => {
  if (q.section !== lastSection) {
    answerLines.push(""); answerLines.push("### " + q.section);
    lastSection = q.section; counter = 0;
  }
  counter++;
  answerLines.push(counter + ".");
});

fs.writeFileSync("answers/" + outputBase + ".txt", answerLines.join("\n"), "utf-8");

console.log("");
console.log("TOTAL: " + allQuestions.length + " questions");
console.log("Saved to: " + qOutFile);
console.log("Blank answers: answers/" + outputBase + ".txt");
