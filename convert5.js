/* =========================================================
   convert5.js — Chemistry-style JAMB 1983-2004 converter
   With quality filter to reject mangled questions.
   Usage: node convert5.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Chemistry";
const outputBase = process.argv[4] || "chemistry-1983-2004";

if (!inputFile) {
  console.error('Usage: node convert5.js <input.txt> "<Subject>" "<outputBase>"');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

const yearHeaderRe = new RegExp(
  "\\b" + subjectName + "\\s+(19\\d{2}|20\\d{2})\\b",
  "gi"
);

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
    .replace(/\s+/g, " ")
    .trim();
}

function parseYearBlock(block) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

  const questions = [];
  let current = null;
  let currentOption = null;
  let expectingQuestion = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^Chemistry\s+\d{4}$/i.test(line)) continue;
    if (/^Questions?$/i.test(line)) continue;
    if (/^LASU-INFO$/i.test(line)) continue;
    if (/^\d{4}-\s*\d{4}$/.test(line)) continue;

    const loneNumMatch = line.match(/^(\d{1,3})\.?$/);
    const numTextMatch = line.match(/^(\d{1,3})\.\s+(.+)$/);

    if (loneNumMatch) {
      if (current && current.options.length >= 2) {
        questions.push(current);
      }
      current = { num: parseInt(loneNumMatch[1], 10), question: "", options: [] };
      currentOption = null;
      expectingQuestion = true;
      continue;
    }

    if (numTextMatch && !expectingQuestion) {
      const num = parseInt(numTextMatch[1], 10);
      if (current && current.options.length >= 2 && num < 100) {
        questions.push(current);
        current = { num, question: numTextMatch[2], options: [] };
        currentOption = null;
        expectingQuestion = false;
        continue;
      }
    }

    const loneLetterMatch = line.match(/^\(?([A-E])[\.\)]?$/);
    if (loneLetterMatch && current) {
      const letter = loneLetterMatch[1].toUpperCase();
      if (currentOption) {
        current.options.push(currentOption);
      }
      currentOption = { letter, value: "" };
      expectingQuestion = false;
      continue;
    }

    const letterTextMatch = line.match(/^\(?([A-E])[\.\)]\s+(.+)$/);
    if (letterTextMatch && current) {
      const letter = letterTextMatch[1].toUpperCase();
      const text = letterTextMatch[2];
      if (currentOption) {
        current.options.push(currentOption);
      }
      currentOption = { letter, value: text };
      expectingQuestion = false;
      continue;
    }

    if (expectingQuestion && current && !current.question) {
      current.question = cleanText(line);
      expectingQuestion = false;
    } else if (currentOption) {
      currentOption.value = cleanText((currentOption.value + " " + line).trim());
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

  let accepted = 0;
  let rejected = 0;

  parsed.forEach(q => {
    if (!q.question || q.question.length < 15) { rejected++; return; }
    if (q.options.length < 3) { rejected++; return; }
    if (!/^[A-Z0-9]/.test(q.question)) { rejected++; return; }

    if (q.question.length < 30 &&
      !/[?.]/.test(q.question) &&
      !/\b(is|are|was|were|will|can|does|which|what|how|why|when|where)\b/i.test(q.question)) {
      rejected++; return;
    }

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