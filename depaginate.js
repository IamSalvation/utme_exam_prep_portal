/* =========================================================
   depaginate.js — Un-merge two-column PDF text
   Usage: node depaginate.js <input.txt> <output.txt>
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const outputFile = process.argv[3] || "depaginated.txt";

if (!inputFile) {
    console.error("Usage: node depaginate.js <input.txt> <output.txt>");
    process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

const cleanedLines = [];

lines.forEach(line => {
    // If line has a run of 5+ spaces in the middle, split it there.
    // Emit each fragment on its own line.
    const parts = line.split(/\s{5,}/);

    parts.forEach(part => {
        const trimmed = part.replace(/\s+$/, "").replace(/^\s+/, " ");
        if (trimmed.trim().length > 0) {
            cleanedLines.push(trimmed.trim());
        }
    });
});

fs.writeFileSync(outputFile, cleanedLines.join("\n"), "utf-8");

console.log("Wrote " + cleanedLines.length + " lines to " + outputFile);