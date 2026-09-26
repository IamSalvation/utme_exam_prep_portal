/* =========================================================
   convert11.js — JAMB 2020-2024 column-split + inline parser
   Handles:
   - Column-split: (A) (B) (C) (D) on lines, then values
   - Inline: (A) value on same line
   - Mixed formats in same file
   Usage: node convert11.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Subject";
const outputBase = process.argv[4] || "subject-2020-2024";

if (!inputFile) {
    console.error('Usage: node convert11.js <input.txt> "<Subject>" "<outputBase>"');
    process.exit(1);
}

let raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

function cleanOCR(t) {
    return t
        .replace(/â€"/g, "-")
        .replace(/â€"/g, "-")
        .replace(/â€˜/g, "'")
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€ž/g, '"')
        .replace(/â€/g, '"')
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ");
}
raw = cleanOCR(raw);

const lines = raw.split("\n").map(l => l.trim());

const questions = [];
let current = null;
let state = "idle"; // "idle", "reading-letters", "reading-values"
let pendingLetters = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip subject header at top
    if (new RegExp("^" + subjectName + "$", "i").test(line)) continue;

    // Skip noise lines
    if (/^(M\s*M\s*CY\s*BE\s*RC\s*ON\s*ET|MMCYBERCONET)$/i.test(line)) continue;

    // Detect question number alone ("1." or "1")
    const numAlone = line.match(/^(\d{1,3})[\.\)]?$/);
    if (numAlone) {
        const num = parseInt(numAlone[1], 10);
        if (num >= 1 && num <= 100) {
            if (current && current.options.length >= 2) {
                questions.push(current);
            }
            current = { num, question: "", options: [] };
            pendingLetters = [];
            state = "idle";
            continue;
        }
    }

    // Detect question with inline text ("1. Text")
    const inlineNum = line.match(/^(\d{1,3})[\.\)]\s+(.+)$/);
    if (inlineNum) {
        const num = parseInt(inlineNum[1], 10);
        if (num >= 1 && num <= 100) {
            if (current && current.options.length >= 2) {
                questions.push(current);
            }
            current = { num, question: inlineNum[2], options: [] };
            pendingLetters = [];
            state = "idle";
            continue;
        }
    }

    if (!current) continue;

    // Detect inline option: "(A) value" on same line
    const inlineOpt = line.match(/^\(([A-E])\)\s*(.+)$/);
    if (inlineOpt) {
        const letter = inlineOpt[1];
        const value = inlineOpt[2].trim();
        if (value.length > 0 && !current.options.find(o => o.letter === letter)) {
            current.options.push({ letter, value });
        }
        state = "idle";
        continue;
    }

    // Detect block of letters: lines that are exactly "(A)", "(B)", etc.
    const letterLine = line.match(/^\(([A-E])\)$/);
    if (letterLine) {
        state = "reading-letters";
        pendingLetters.push(letterLine[1]);
        continue;
    }

    // If we were reading letters and got a non-letter line, transition to reading values
    if (state === "reading-letters") {
        if (pendingLetters.length >= 2) {
            state = "reading-values";
            // Don't advance i — process this line as first value
        } else {
            current.question = (current.question + " " + line).trim();
            continue;
        }
    }

    // Reading values
    if (state === "reading-values" && pendingLetters.length > 0) {
        const letter = pendingLetters.shift();
        const value = line.trim();
        if (value.length > 0 && value.length < 150) {
            current.options.push({ letter, value });
        }
        if (pendingLetters.length === 0) {
            state = "idle";
        }
        continue;
    }

    // Otherwise, continuation of question
    if (state === "idle") {
        current.question = (current.question + " " + line).trim();
    }
}

// Finalize last question
if (current && current.options.length >= 2) {
    questions.push(current);
}

// Build clean question bank
const allQuestions = [];
questions.forEach(q => {
    let qText = q.question.replace(/\s+/g, " ").trim();
    qText = qText.replace(/\s*M\s*M\s*CY\s*BE\s*RC\s*ON\s*ET\s*/gi, " ");
    qText = qText.replace(/\s+/g, " ").trim();

    if (!qText || qText.length < 8) return;

    const opts = q.options
        .map(o => ({ letter: o.letter, value: o.value.replace(/\s+/g, " ").trim() }))
        .filter(o => o.value.length > 0);

    const seen = new Set();
    const unique = [];
    opts.sort((a, b) => a.letter.localeCompare(b.letter));
    opts.forEach(o => {
        if (!seen.has(o.letter)) {
            seen.add(o.letter);
            unique.push(o);
        }
    });

    if (unique.length < 2) return;

    allQuestions.push({
        id: allQuestions.length + 1,
        subject: subjectName,
        section: "2020-2024 Paper",
        year: "2020-2024",
        question: qText,
        options: unique.map(o => o.value),
        answer: null,
        needsAnswer: true,
        explanation: "No explanation provided."
    });
});

fs.mkdirSync("js", { recursive: true });
fs.mkdirSync("answers", { recursive: true });

const qOutFile = "js/questions-" + outputBase + "-all.js";
fs.writeFileSync(
    qOutFile,
    "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
    "const questionBank = " + JSON.stringify(allQuestions, null, 2) + ";\n"
);

const answerLines = ["# " + subjectName + " " + outputBase + " answers", ""];
answerLines.push("### 2020-2024 Paper");
allQuestions.forEach((q, i) => {
    answerLines.push((i + 1) + ".");
});

fs.writeFileSync("answers/" + outputBase + ".txt", answerLines.join("\n"));

console.log("TOTAL: " + allQuestions.length + " questions");
console.log("Saved to: " + qOutFile);