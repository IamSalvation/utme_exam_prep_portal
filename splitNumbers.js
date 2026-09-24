/* =========================================================
   splitNumbers.js — Force every "N." question marker onto its own line
   Handles both "N. text" and "N.text" patterns.
   Usage: node splitNumbers.js <input.txt> <output.txt>
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const outputFile = process.argv[3] || "split.txt";

if (!inputFile) {
    console.error("Usage: node splitNumbers.js <input.txt> <output.txt>");
    process.exit(1);
}

let text = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

text = text.replace(
    /(^|[^A-D\d])\s*(\d{1,3})\.\s*([A-Z])/gm,
    (m, pre, num, firstLetter) => pre + "\n" + num + ". " + firstLetter
);

text = text.replace(/\n{3,}/g, "\n\n");

fs.writeFileSync(outputFile, text, "utf-8");

const lineCount = text.split("\n").length;
console.log("Wrote " + lineCount + " lines to " + outputFile);