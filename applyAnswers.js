/* =========================================================
   applyAnswers.js — Merge answers into question bank
   Usage: node applyAnswers.js <answers.txt> <questions.js>
   ========================================================= */

const fs = require("fs");

const answersFile   = process.argv[2];
const questionsFile = process.argv[3];

if (!answersFile || !questionsFile) {
  console.error("Usage: node applyAnswers.js <answers.txt> <questions.js>");
  process.exit(1);
}

const answersRaw   = fs.readFileSync(answersFile,   "utf-8");
const questionsRaw = fs.readFileSync(questionsFile, "utf-8");

// Parse answers: lines like "1. B", tracking section headers "### 1984 Paper"
const answerMap = new Map();   // "section::index" -> letter
let currentSection = null;

answersRaw.split("\n").forEach(line => {
  const trimmed = line.trim();

  const secMatch = trimmed.match(/^###\s+(.+)$/);
  if (secMatch) {
    currentSection = secMatch[1].trim();
    return;
  }

  if (!trimmed || trimmed.startsWith("#")) return;

  const m = trimmed.match(/^(\d{1,4})\.\s*([A-E])/);
  if (m && currentSection) {
    answerMap.set(currentSection + "::" + m[1], m[2].toUpperCase());
  }
});

console.log("Parsed " + answerMap.size + " answers");

const match = questionsRaw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!match) {
  console.error("Could not find questionBank in " + questionsFile);
  process.exit(1);
}

const bank = eval(match[1]);

const LETTERS = "ABCDE".split("");
let applied = 0;
const sectionCounters = new Map();

bank.forEach(q => {
  const key = q.section;
  const idx = (sectionCounters.get(key) || 0) + 1;
  sectionCounters.set(key, idx);

  const letter = answerMap.get(key + "::" + idx);
  if (letter) {
    const answerIdx = LETTERS.indexOf(letter);
    if (answerIdx >= 0 && answerIdx < q.options.length) {
      q.answer = answerIdx;
      q.needsAnswer = false;
      applied++;
    }
  }
});

const output =
  "/* Updated with answers on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(questionsFile, output, "utf-8");

console.log("Applied " + applied + " answers");
console.log("Updated: " + questionsFile);
