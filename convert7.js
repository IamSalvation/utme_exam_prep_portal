/* =========================================================
   convert7.js — Math-tuned parser
   Usage: node convert7.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Mathematics";
const outputBase = process.argv[4] || "math-1983-2004";

if (!inputFile) {
    console.error('Usage: node convert7.js <input.txt> "<Subject>" "<outputBase>"');
    process.exit(1);
}

let raw = fs.readFileSync(inputFile, "utf-8").replace(/\r\n/g, "\n");

/* ---------- 1. Pre-clean OCR artifacts ---------- */
function cleanOCR(t) {
    return t
        .replace(/â€"/g, "-")
        .replace(/â€"/g, "-")
        .replace(/â€˜/g, "'")
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/ïƒ–/g, "sqrt")
        .replace(/Ã·/g, "/")
        .replace(/Ã—/g, "*")
        .replace(/Â£/g, "#")
        .replace(/Â°/g, "deg")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ");
}

raw = cleanOCR(raw);

/* ---------- 2. Split by year ---------- */
const yearHeaderRe = /Mathematics\s*(\d{4})/gi;
const yearSplits = [];
let m;
while ((m = yearHeaderRe.exec(raw)) !== null) {
    yearSplits.push({ year: m[1], start: m.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

const LETTERS = "ABCDE".split("");

/* ---------- 3. Parse one year ---------- */
function parseYear(block) {
    const lines = block.split("\n").map(l => l.trim());
    const questions = [];
    let current = null;
    let currentOpt = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Skip year headers
        if (/^Mathematics\s*\d{4}$/i.test(line)) continue;

        // Bare question number: "18." or "18"
        const bareNum = line.match(/^(\d{1,3})\.?$/);
        if (bareNum && parseInt(bareNum[1]) >= 1 && parseInt(bareNum[1]) <= 60) {
            if (current && current.options.length >= 2) {
                if (currentOpt) current.options.push(currentOpt);
                questions.push(current);
            }
            current = { num: parseInt(bareNum[1]), question: "", options: [] };
            currentOpt = null;
            continue;
        }

        // Question with inline text: "18. Find the value of x"
        const inlineNum = line.match(/^(\d{1,3})\.\s*(.+)$/);
        if (inlineNum && parseInt(inlineNum[1]) <= 60 && !current) {
            current = { num: parseInt(inlineNum[1]), question: inlineNum[2], options: [] };
            currentOpt = null;
            continue;
        }
        if (inlineNum && parseInt(inlineNum[1]) <= 60 && current && current.options.length >= 2) {
            if (currentOpt) current.options.push(currentOpt);
            questions.push(current);
            current = { num: parseInt(inlineNum[1]), question: inlineNum[2], options: [] };
            currentOpt = null;
            continue;
        }

        // Options on one line: "A. 15 B. 10 C. 18"
        const multiOpt = [];
        const optRe = /(?:^|\s)\(?([A-E])[\.\)]\s*([^A-E]*?)(?=\s*\(?[A-E][\.\)]|$)/g;
        let om;
        while ((om = optRe.exec(line)) !== null) {
            const val = om[2].trim();
            if (val.length > 0 && val.length < 80) {
                multiOpt.push({ letter: om[1].toUpperCase(), value: val });
            }
        }

        if (multiOpt.length >= 2 && current) {
            if (currentOpt) current.options.push(currentOpt);
            currentOpt = null;
            multiOpt.forEach(o => {
                if (!current.options.find(x => x.letter === o.letter)) {
                    current.options.push(o);
                }
            });
            continue;
        }

        // Single option: "A. 15"
        const singleOpt = line.match(/^\(?([A-E])[\.\)]\s+(.+)$/);
        if (singleOpt && current) {
            const letter = singleOpt[1].toUpperCase();
            if (!current.options.find(x => x.letter === letter)) {
                if (currentOpt) current.options.push(currentOpt);
                currentOpt = { letter, value: singleOpt[2].trim() };
            }
            continue;
        }

        // Continuation text
        if (currentOpt) {
            currentOpt.value = (currentOpt.value + " " + line).trim();
        } else if (current) {
            current.question = (current.question + " " + line).trim();
        }
    }

    if (currentOpt) current.options.push(currentOpt);
    if (current && current.options.length >= 2) questions.push(current);

    return questions;
}

/* ---------- 4. Process each year ---------- */
const allQuestions = [];

yearSplits.forEach((section, i) => {
    if (section.year === "END") return;
    const nextStart = yearSplits[i + 1].start;
    const blockText = raw.substring(section.start, nextStart);

    const parsed = parseYear(blockText);

    let accepted = 0, rejected = 0;
    parsed.forEach(q => {
        const qText = q.question.replace(/\s+/g, " ").trim();
        if (!qText || qText.length < 8) { rejected++; return; }
        if (!/^[A-Z0-9(]/.test(qText)) { rejected++; return; }

        const opts = q.options
            .map(o => ({ letter: o.letter, value: o.value.replace(/\s+/g, " ").trim() }))
            .filter(o => o.value.length > 0 && o.value.length < 100);

        const unique = new Set(opts.map(o => o.value.toLowerCase()));
        if (opts.length < 3 || unique.size < 3) { rejected++; return; }

        allQuestions.push({
            id: allQuestions.length + 1,
            subject: subjectName,
            section: section.year + " Paper",
            year: section.year,
            question: qText,
            options: opts.map(o => o.value),
            answer: null,
            needsAnswer: true,
            explanation: "No explanation provided."
        });
        accepted++;
    });

    console.log("Year " + section.year + ": " + accepted + " accepted, " + rejected + " rejected");
});

/* ---------- 5. Write output ---------- */
fs.mkdirSync("js", { recursive: true });
fs.mkdirSync("answers", { recursive: true });

const qOutFile = "js/questions-" + outputBase + "-all.js";
fs.writeFileSync(
    qOutFile,
    "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
    "const questionBank = " + JSON.stringify(allQuestions, null, 2) + ";\n"
);

const answerLines = ["# " + subjectName + " " + outputBase + " answers", ""];
let lastSection = null, counter = 0;
allQuestions.forEach(q => {
    if (q.section !== lastSection) {
        answerLines.push(""); answerLines.push("### " + q.section);
        lastSection = q.section; counter = 0;
    }
    counter++;
    answerLines.push(counter + ".");
});

fs.writeFileSync("answers/" + outputBase + ".txt", answerLines.join("\n"));

console.log("");
console.log("TOTAL: " + allQuestions.length + " questions");
console.log("Saved to: " + qOutFile);