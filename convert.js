/* =========================================================
   convert.js — PDF-extracted text to questions.js format
   Usage: node convert.js <input.txt> "<Section>" "<Subject>"
   ========================================================= */

const fs = require("fs");
const path = require("path");

const inputFile   = process.argv[2];
const sectionName = process.argv[3] || "Past Questions";
const subject     = process.argv[4] || "General";

if (!inputFile) {
  console.error('Usage: node convert.js <input.txt> "<Section>" "<Subject>"');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8");

let text = raw
  .replace(/\r\n/g, "\n")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/\u00A0/g, " ");

const blocks = text
  .split(/\n(?=\s*\d{1,4}\.\s)/)
  .map(b => b.trim())
  .filter(Boolean);

const LETTERS = "ABCDEF".split("");

function parseBlock(block, index) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const firstMatch = lines.shift().match(/^(\d{1,4})\.\s*(.+)$/);
  if (!firstMatch) return null;

  const questionText = firstMatch[2].trim();
  const options      = [];
  let   answerLetter = null;
  let   explanation  = "";

  const joined = lines.join(" ");
  const optionRegex = /\(?([A-F])[\.\)]\s*([^(\n]+?)(?=\s*\(?[A-F][\.\)]|\s*$)/g;

  let m;
  while ((m = optionRegex.exec(joined)) !== null) {
    const letter = m[1].toUpperCase();
    const value  = m[2].trim().replace(/\s+/g, " ");
    if (LETTERS.includes(letter) && value) options.push(value);
  }

  const ansMatch = block.match(/(?:Answer|Ans|Correct answer)\s*[:\-]?\s*\(?([A-F])\)?/i);
  if (ansMatch) answerLetter = ansMatch[1].toUpperCase();

  const expMatch = block.match(/(?:Explanation|Reason)\s*[:\-]?\s*(.+?)(?:\n|$)/i);
  if (expMatch) explanation = expMatch[1].trim();

  if (options.length < 2 || !answerLetter) return null;

  const answerIndex = LETTERS.indexOf(answerLetter);
  if (answerIndex === -1) return null;

  return {
    id: index + 1,
    subject,
    section: sectionName,
    question: questionText,
    options,
    answer: answerIndex,
    explanation: explanation || "No explanation provided."
  };
}

const questionBank = blocks.map((b, i) => parseBlock(b, i)).filter(Boolean);

const baseName = path.basename(inputFile, ".txt");
const outFile  = "js/questions-" + baseName + ".js";

const output =
  "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(questionBank, null, 2) + ";\n";

fs.writeFileSync(outFile, output, "utf-8");

console.log("Converted " + questionBank.length + " of " + blocks.length + " blocks");
console.log("Saved to: " + outFile);
