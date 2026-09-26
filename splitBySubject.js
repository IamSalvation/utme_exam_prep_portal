/* =========================================================
   splitBySubject.js
   Splits a combined JAMB 2020-2024 file into per-subject files
   Usage: node splitBySubject.js
   ========================================================= */

const fs = require("fs");
const path = require("path");

const inputFile = "source-text/1001604633-Jamb-2020-2024-Past-Questions-and-Answers-for-2026.txt";
const outDir = "source-text/split";

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const raw = fs.readFileSync(inputFile, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

// Subject section starts (line numbers are 1-based from Select-String)
const sections = [
    { name: "english-passage", start: 1 },
    { name: "english-objective", start: 362 },
    { name: "current-affairs", start: 1533 },
    { name: "biology", start: 2400 },
    { name: "chemistry", start: 2808 },
    { name: "commerce", start: 3215 },
    { name: "economics", start: 3636 },
    { name: "religious-studies", start: 4031 },
    { name: "geology", start: 4764 },
    { name: "government", start: 5577 },
    { name: "history", start: 6263 },
    { name: "literature", start: 6799 },
    { name: "mathematics", start: 7507 },
    { name: "physics", start: 7900 },
    { name: "yoruba", start: 8362 },
];

sections.forEach((section, i) => {
    const startLine = section.start - 1; // 0-based
    const endLine = i < sections.length - 1 ? sections[i + 1].start - 1 : lines.length;
    const block = lines.slice(startLine, endLine).join("\n");
    const outFile = path.join(outDir, section.name + "-2020-2024.txt");
    fs.writeFileSync(outFile, block);
    const lineCount = endLine - startLine;
    console.log(section.name + ": " + lineCount + " lines → " + outFile);
});

console.log("");
console.log("Done. Split files are in " + outDir + "/");