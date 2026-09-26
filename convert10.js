/* =========================================================
   convert10.js — JAMB 2020-2024 combined-format parser
   Handles:
   - No year headers (single year group per file)
   - Column-split options: (A)(B)(C)(D)(E) on lines, then values
   - 4 or 5 options
   Usage: node convert10.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Subject";
const outputBase = process.argv[4] || "subject-2020-2024";

if (!inputFile) {
    console.error('Usage: node convert10.js <input.txt> "<Subject>" "<outputBase>"');
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
let mode = "question"; // "question" or "options"
let pendingLetters = []; // for column-split options

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip header lines
    if (new RegExp("^" + subjectName, "i").test(line)) continue;

    // Question number alone
    const numAlone = line.match(/^(\d{1,3})[\.\)]?$/);
    if (numAlone) {
        const num = parseInt(numAlone[1], 10);
        if (num >= 1 && num <= 100) {
            if (current && current.options.length >= 2) {
                // finalize previous
                if (pendingLetters.length > 0) {
                    // handle column-split: pair letters with values
                    // This will be handled below when values arrive
                }
                questions.push(current);
            }
            current = { num, question: "", options: [] };
            pendingLetters = [];
            mode = "question";
            continue;
        }
    }

    // Question with inline text: "1. Text"
    const inlineNum = line.match(/^(\d{1,3})[\.\)]\s+(.+)$/);
    if (inlineNum) {
        const num = parseInt(inlineNum[1], 10);
        if (num >= 1 && num <= 100) {
            if (current && current.options.length >= 2) {
                questions.push(current);
            }
            current = { num, question: inlineNum[2], options: [] };
            pendingLetters = [];
            mode = "question";
            continue;
        }
    }

    // Detect column-split letters: (A) (B) (C) (D) (E) — each alone or multiple on one line
    const letterMatches = [...line.matchAll(/\(([A-E])\)/g)];
    if (letterMatches.length >= 1 && current && mode === "question" && current.question) {
        letterMatches.forEach(m => pendingLetters.push(m[1]));
        mode = "options";
        continue;
    }

    // Detect column-split values: single short value on its own line
    if (mode === "options" && pendingLetters.length > 0 && current) {
        // Each line is a value corresponding to the next pending letter
        // Skip if it looks like a new question number
        if (/^\d{1,3}[\.\)]/.test(line)) {
            // New question — process leftover first
            if (current && current.options.length >= 2) {
                questions.push(current);
            }
            pendingLetters = [];
            mode = "question";
            i--; // reprocess this line
            continue;
        }

        // Add value to current option
        const letter = pendingLetters.shift();
        const value = line.trim();
        if (value.length > 0 && value.length < 120) {
            current.options.push({ letter, value });
        }

        if (pendingLetters.length === 0) {
            mode = "question";
        }
        continue;
    }

    // Continuation text
    if (current && mode === "question") {
        current.question = (current.question + " " + line).trim();
    }
}

// Finalize last question
if (current && current.options.length >= 2) {
    questions.push(current);
}

// Process — keep only valid questions
const allQuestions = [];
questions.forEach(q => {
    const qText = q.question.replace(/\s+/g, " ").trim();
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