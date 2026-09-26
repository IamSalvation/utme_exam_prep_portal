/* =========================================================
   convert9.js — Literature-in-English JAMB parser
   Handles:
   - UTME YYYY year headers
   - Group text headers (Questions X to Y are based on...)
   - Questions restarting per group
   - Merged options in question text
   - 4 options (A-D)
   - Stray page numbers
   Usage: node convert9.js <input.txt> "UTME" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "UTME";
const outputBase = process.argv[4] || "literature-2010-2018";

if (!inputFile) {
    console.error('Usage: node convert9.js <input.txt> "UTME" "<outputBase>"');
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
        .replace(/â€ž/g, '"')
        .replace(/â€/g, '"')
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ");
}
raw = cleanOCR(raw);

/* ---------- 2. Split by year (UTME YYYY) ---------- */
const yearHeaderRe = new RegExp(
    "\\b" + subjectName + "\\s+(20\\d{2})\\b",
    "gi"
);
const yearSplits = [];
let m;
while ((m = yearHeaderRe.exec(raw)) !== null) {
    yearSplits.push({ year: m[1], start: m.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

/* ---------- 3. Strip group headers from question text ---------- */
function stripGroupHeaders(text) {
    return text
        // "Questions X to Y are based on ..." or "Questions X and Y..."
        .replace(/\s*Questions?\s+\d+\s+(?:to|and)\s+\d+\s+are\s+based\s+on[^.]*\.?/gi, "")
        // "Questions X to Y: ..." 
        .replace(/\s*Questions?\s+\d+\s+(?:to|and)\s+\d+[^.]*\.?/gi, "")
        // Trailing stray numbers (page numbers)
        .replace(/\s+\d{1,3}\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* ---------- 4. Extract inline options from question text ---------- */
function extractInlineOptions(text) {
    // "... is A. epigram" → ["... is", ["A. epigram"]]
    const parts = text.split(/\s+(?=[A-D][\.\)]\s+\S)/);
    if (parts.length === 1) return { question: text, options: [] };

    const question = parts[0].trim();
    const options = [];
    for (let i = 1; i < parts.length; i++) {
        const match = parts[i].match(/^([A-D])[\.\)]\s*(.+)$/);
        if (match) {
            options.push({ letter: match[1], value: match[2].trim() });
        }
    }
    return { question, options };
}

/* ---------- 5. Parse one year ---------- */
function parseYear(block) {
    const lines = block.split("\n").map(l => l.trim());

    // Rejoin: "B." alone + next line, and other splits
    const joined = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^[A-D][\.\)]?$/.test(line)) {
            let j = i + 1;
            while (j < lines.length && !lines[j]) j++;
            if (j < lines.length) {
                joined.push(line + " " + lines[j]);
                i = j;
                continue;
            }
        }
        joined.push(line);
    }

    const questions = [];
    let current = null;
    let currentOpt = null;

    for (let i = 0; i < joined.length; i++) {
        const line = joined[i];
        if (!line) continue;

        // Skip headers
        if (/^UTME\s+\d{4}/i.test(line)) continue;
        if (/^LITERATURE/i.test(line)) continue;
        if (/^LASU-INFO$/i.test(line)) continue;
        if (/^\d{4}\s*-\s*\d{4}$/.test(line)) continue;
        if (/^Questions?\s+\d+\s+(?:to|and)\s+\d+/i.test(line)) continue;
        if (/based on/i.test(line) && line.length < 80) continue;

        // Skip stray page numbers (1-3 digits alone)
        if (/^\d{1,3}$/.test(line)) continue;

        // Skip lines that are just punctuation
        if (/^[\.\-\_,;:]+$/.test(line)) continue;

        // Question number alone: "17."
        const bareNum = line.match(/^(\d{1,3})\.?$/);
        if (bareNum) {
            const num = parseInt(bareNum[1], 10);
            if (num >= 1 && num <= 60) {
                if (current && current.options.length >= 2) {
                    if (currentOpt) current.options.push(currentOpt);
                    questions.push(current);
                }
                current = { num, question: "", options: [] };
                currentOpt = null;
                continue;
            }
        }

        // Question with inline text: "17. The Ministry of peace..."
        const inlineNum = line.match(/^(\d{1,3})\.\s+(.+)$/);
        if (inlineNum) {
            const num = parseInt(inlineNum[1], 10);
            if (num >= 1 && num <= 60) {
                if (current && current.options.length >= 2) {
                    if (currentOpt) current.options.push(currentOpt);
                    questions.push(current);
                }
                current = { num, question: inlineNum[2], options: [] };
                currentOpt = null;
                continue;
            }
        }

        // Merged option in question text: "... is A. epigram"
        if (current && !currentOpt) {
            const { question, options } = extractInlineOptions(line);
            if (options.length >= 2) {
                current.question = (current.question + " " + question).trim();
                options.forEach(o => {
                    if (!current.options.find(x => x.letter === o.letter)) {
                        current.options.push(o);
                    }
                });
                continue;
            }
        }

        // Single option: "A. instruments"
        const singleOpt = line.match(/^([A-D])[\.\)]\s*(.+)$/);
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

/* ---------- 6. Process each year ---------- */
const allQuestions = [];

yearSplits.forEach((section, i) => {
    if (section.year === "END") return;
    const nextStart = yearSplits[i + 1].start;
    const blockText = raw.substring(section.start, nextStart);

    const parsed = parseYear(blockText);

    let accepted = 0, rejected = 0;
    parsed.forEach(q => {
        let qText = stripGroupHeaders(q.question.replace(/\s+/g, " ").trim());

        if (!qText || qText.length < 8) { rejected++; return; }
        if (!/^[A-Z0-9("']/i.test(qText)) { rejected++; return; }

        const opts = q.options
            .map(o => ({
                letter: o.letter,
                value: stripGroupHeaders(o.value.replace(/\s+/g, " ").trim())
            }))
            .filter(o => o.value.length > 0 && o.value.length < 250);

        const seen = new Set();
        const unique = [];
        opts.sort((a, b) => a.letter.localeCompare(b.letter));
        opts.forEach(o => {
            if (!seen.has(o.letter)) {
                seen.add(o.letter);
                unique.push(o);
            }
        });

        if (unique.length < 2) { rejected++; return; }

        allQuestions.push({
            id: allQuestions.length + 1,
            subject: "Literature-in-English",
            section: section.year + " Paper",
            year: section.year,
            question: qText,
            options: unique.map(o => o.value),
            answer: null,
            needsAnswer: true,
            explanation: "No explanation provided."
        });
        accepted++;
    });

    console.log("Year " + section.year + ": " + accepted + " accepted, " + rejected + " rejected");
});

/* ---------- 7. Write output ---------- */
fs.mkdirSync("js", { recursive: true });
fs.mkdirSync("answers", { recursive: true });

const qOutFile = "js/questions-" + outputBase + "-all.js";
fs.writeFileSync(
    qOutFile,
    "/* Auto-generated from " + inputFile + " on " + new Date().toISOString() + " */\n" +
    "const questionBank = " + JSON.stringify(allQuestions, null, 2) + ";\n"
);

const answerLines = ["# Literature-in-English " + outputBase + " answers", ""];
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