/* =========================================================
   convert4.js — JAMB 1983-2004 format converter
   Usage: node convert4.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Biology";
const outputBase = process.argv[4] || "biology-1983-2004";

if (!inputFile) {
  console.error('Usage: node convert4.js <input.txt> "<Subject>" "<outputBase>"');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

const yearHeaderRe = new RegExp(
  "\\b" + subjectName + "\\s*(19\\d{2}|20\\d{2})\\b",
  "gi"
);

const yearSplits = [];
let m;
while ((m = yearHeaderRe.exec(raw)) !== null) {
  yearSplits.push({ year: m[1], start: m.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

function cleanText(t) {
  return t
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¦/g, "...")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

const LETTERS = "ABCDE".split("");

function parseBlock(block) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const firstMatch = lines[0].match(/^(\d{1,4})[\.\)]\s*(.*)$/);
  if (!firstMatch) return null;

  const num = parseInt(firstMatch[1], 10);

  const qParts = [];
  if (firstMatch[2]) qParts.push(firstMatch[2]);

  let restStart = 1;
  while (restStart < lines.length && !/^\(?[A-E][\.\)]\s/.test(lines[restStart])) {
    if (!/^(Use |Fig|Table|The diagram)/i.test(lines[restStart])) {
      qParts.push(lines[restStart]);
    }
    restStart++;
  }

  const questionText = cleanText(qParts.join(" "));
  if (questionText.length < 5) return null;

  const rest = lines.slice(restStart).join(" ");
  const opts = [];
  const seenLetters = new Set();
  const optRe = /\(?([A-E])[\.\)]\s*([^()\n]+?)(?=\s*\(?[A-E][\.\)]\s|\s*$)/g;
  let om;
  while ((om = optRe.exec(rest)) !== null) {
    const letter = om[1].toUpperCase();
    const value = cleanText(om[2]);
    if (seenLetters.has(letter)) break;
    if (LETTERS.includes(letter) && value && value.length > 0) {
      seenLetters.add(letter);
      opts.push({ letter, value });
    }
    if (letter === "E") break;
  }

  if (opts.length < 3) return null;

  return {
    _num: num,
    question: questionText,
    options: opts.map(o => o.value)
  };
}

const allQuestions = [];

yearSplits.forEach((section, i) => {
  if (section.year === "END") return;
  const nextStart = yearSplits[i + 1].start;
  const blockText = raw.substring(section.start, nextStart);

  const blocks = blockText
    .split(/\n(?=\s*\d{1,3}[\.\)]\s)/)
    .map(b => b.trim())
    .filter(Boolean);

  const parsed = blocks.map(parseBlock).filter(Boolean);

  console.log("Year " + section.year + ": " + parsed.length + " questions parsed");

  parsed.forEach((q, qIndex) => {
    allQuestions.push({
      id: allQuestions.length + 1,
      subject: subjectName,
      section: section.year + " Paper",
      year: section.year,
      question: q.question,
      options: q.options,
      answer: null,
      needsAnswer: true,
      explanation: "No explanation provided."
    });
  });
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

const answerLines = ["# " + subjectName + " " + outputBase + " answers",
  "# Format: <questionNumber>. <LETTER>  (e.g. 1. B)",
  "# Leave blank to skip.", ""];

let lastSection = null;
let counter = 0;
allQuestions.forEach(q => {
  if (q.section !== lastSection) {
    answerLines.push("");
    answerLines.push("### " + q.section);
    lastSection = q.section;
    counter = 0;
  }
  counter++;
  answerLines.push(counter + ".");
});

const aOutFile = "answers/" + outputBase + ".txt";
fs.writeFileSync(aOutFile, answerLines.join("\n"), "utf-8");

console.log("");
console.log("TOTAL: " + allQuestions.length + " questions");
console.log("Saved to: " + qOutFile);
console.log("Blank answers: " + aOutFile);
