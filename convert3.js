/* =========================================================
   convert3.js — Handles multi-year, multi-format JAMB PDFs
   ========================================================= */

const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Biology";
const outputBase = process.argv[4] || "biology";

if (!inputFile) {
  console.error('Usage: node convert3.js <input.txt> "<Subject>" "<outputBase>"');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

/* ---------------------------------------------------------
   1. Split into year-blocks by "UTME YYYY SUBJECT QUESTIONS"
   --------------------------------------------------------- */
const yearHeaderRe = /UTME\s+(\d{4})\s+[A-Z]+\s+QUESTIONS/gi;
const yearSplits = [];
let match;
while ((match = yearHeaderRe.exec(raw)) !== null) {
  yearSplits.push({ year: match[1], start: match.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

/* ---------------------------------------------------------
   2. For each year, extract questions and answers
   --------------------------------------------------------- */
const LETTERS = "ABCD".split("");
const allQuestions = [];

function parseAnswersFromKey(keyBlock) {
  const map = new Map();
  const plain = [];
  let lastNumber = 0;

  keyBlock.split("\n").forEach(line => {
    const cleaned = line.replace(/ANSWER\s*KEYS?:?/i, "").trim();
    if (!cleaned) return;

    const numRe = /(\d{1,4})\s*[\.\)]\s*([A-D])\b/g;
    let m;
    let foundNumbered = false;
    while ((m = numRe.exec(cleaned)) !== null) {
      const n = parseInt(m[1], 10);
      map.set(n, m[2]);
      if (n > lastNumber) lastNumber = n;
      foundNumbered = true;
    }
    if (foundNumbered) return;

    const bareRe = /(?:^|[^A-Za-z])([A-D])(?![A-Za-z])/g;
    let b;
    while ((b = bareRe.exec(cleaned)) !== null) {
      plain.push(b[1]);
    }
  });

  return { map, plain, lastNumber };
}

function parseQuestionsFromBlock(block) {
  /* Split by leading "N." and parse each question. */
  const blocks = block
    .split(/\n(?=\s*\d{1,4}\.\s?[A-Z])/)
    .map(b => b.trim())
    .filter(Boolean);

  const result = [];

  blocks.forEach(b => {
    const lines = b.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const m = lines[0].match(/^(\d{1,4})\.\s*(.+)$/);
    if (!m) return;

    const num = parseInt(m[1], 10);

    // ---- Collect question text across multiple lines ----
    // Keep appending lines to the question text until we hit a line
    // that starts with an option letter (A., B., (A), etc.)
    const qParts = [m[2].trim()];
    let restStart = 1;
    while (restStart < lines.length &&
      !/^\(?[A-D][\.\)]\s/.test(lines[restStart])) {
      qParts.push(lines[restStart]);
      restStart++;
    }
    const qText = qParts.join(" ").replace(/\s+/g, " ").trim();

    // ---- Collect options from the remaining lines ----
    const rest = lines.slice(restStart).join(" ");
    const opts = [];
    const optRe = /(?:^|\s)\(?([A-D])[\.\)]\s*([^\n]+?)(?=\s+\(?[A-D][\.\)]\s|\s*$)/g;
    let om;
    while ((om = optRe.exec(rest)) !== null) {
      const letter = om[1].toUpperCase();
      const value = om[2].trim().replace(/\s+/g, " ");
      if (LETTERS.includes(letter) && value && value.length > 1) {
        opts.push({ letter, value });
      }
    }

    if (opts.length < 3) return;

    result.push({
      _num: num,
      question: qText,
      options: opts.map(o => o.value)
    });
  });

  return result;
}

yearSplits.forEach((section, i) => {
  if (section.year === "END") return;
  const nextStart = yearSplits[i + 1].start;
  const blockText = raw.substring(section.start, nextStart);

  const keyIdx = blockText.search(/ANSWER\s*KEYS?/i);
  let questionsPart = blockText;
  let answersPart = "";

  if (keyIdx >= 0) {
    questionsPart = blockText.substring(0, keyIdx);
    answersPart = blockText.substring(keyIdx);
  }

  const qs = parseQuestionsFromBlock(questionsPart);
  const { map, plain } = parseAnswersFromKey(answersPart);

  console.log("Year " + section.year + ": " + qs.length + " questions, " +
    map.size + " numbered answers, " + plain.length + " bare answers");

  qs.forEach((q, qIndex) => {
    let letter = null;
    if (map.size > 0) {
      letter = map.get(q._num);
      if (!letter && map.has(qIndex + 1)) letter = map.get(qIndex + 1);
    }
    if (!letter && plain.length > 0) {
      letter = plain[qIndex];
    }

    const answerIdx = letter ? LETTERS.indexOf(letter) : 0;

    allQuestions.push({
      id: allQuestions.length + 1,
      subject: subjectName,
      section: section.year + " Paper",
      year: section.year,
      question: q.question,
      options: q.options,
      answer: answerIdx,
      explanation: "No explanation provided."
    });
  });
});

/* ---------------------------------------------------------
   3. Write output
   --------------------------------------------------------- */
const withAnswers = allQuestions.filter(q => q.answer >= 0 && q.answer < 4).length;

const outFile = "js/questions-" + outputBase + "-all.js";

fs.writeFileSync(
  outFile,
  "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(allQuestions, null, 2) + ";\n",
  "utf-8"
);

console.log("");
console.log("TOTAL: " + allQuestions.length + " questions");
console.log("With answers: " + withAnswers);
console.log("Saved to: " + outFile);