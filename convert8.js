/* =========================================================
   convert8.js — Multi-subject parser v6
   Fix: properly matches singular + plural subject names
   (e.g., "Principles of Account 1995" and "Principles of Accounts 1994")
   Usage: node convert8.js <input.txt> "<Subject>" "<outputBase>"
   ========================================================= */

const fs = require("fs");

const inputFile = process.argv[2];
const subjectName = process.argv[3] || "Government";
const outputBase = process.argv[4] || "government-1983-2004";

if (!inputFile) {
    console.error('Usage: node convert8.js <input.txt> "<Subject>" "<outputBase>"');
    process.exit(1);
}

// Strip trailing 's' so the regex can match both singular and plural forms
const baseName = subjectName.replace(/s$/, "");

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
        .replace(/Â£/g, "#")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ");
}
raw = cleanOCR(raw);

/* ---------- 2. Split by year (handles singular + plural) ---------- */
const yearHeaderRe = new RegExp(
    "\\b" + baseName.replace(/\s+/g, "\\s+") + "s?\\s+(19\\d{2}|20\\d{2})\\b",
    "gi"
);
const yearSplits = [];
let m;
while ((m = yearHeaderRe.exec(raw)) !== null) {
    yearSplits.push({ year: m[1], start: m.index });
}
yearSplits.push({ year: "END", start: raw.length });

console.log("Found " + (yearSplits.length - 1) + " year sections");

/* ---------- 3. Split merged options ---------- */
function splitMergedOptions(text) {
    const parts = [];
    const re = /([A-E])[\.\)]\s*([^A-E]*?)(?=\s+[A-E][\.\)]\s|$)/g;
    let match;
    while ((match = re.exec(text)) !== null) {
        const letter = match[1];
        let value = match[2].trim();
        if (value.length > 0) {
            parts.push({ letter, value });
        }
    }
    return parts;
}

/* ---------- 4. Strip trailing question text ---------- */
function stripTrailingQuestion(text) {
    const patterns = [
        /\s+[A-Z][a-z]+\s+[a-z]+\s+[a-z]+\s+(?:is|are|was|were|the|a|an)\s+[a-z].*$/,
        /\s*Questions?\s+\d+\s+(?:an|and|to)\s+\d+\s+are\s+based\s+on.*$/i,
        /\s+\d{1,3}[\.\)]\s+\S+.*$/,
        /\s*(?:Government|CHRISTIAN\s+RELIGIOUS\s+KNOWLEDGE|Commerce|LITERATURE|Principles\s+of\s+Accounts?)\s+\d{4}.*$/i,
    ];
    let out = text;
    patterns.forEach(p => { out = out.replace(p, ""); });
    return out.trim();
}

/* ---------- 5. Fix question merge ---------- */
function fixQuestionMerge(text) {
    let out = text
        .replace(/\s+[A-E]\s+(?=[a-z])/g, " ")
        .replace(/\s+[A-E]\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
    return out;
}

/* ---------- 6. Parse one year ---------- */
function parseYear(block) {
    const lines = block.split("\n").map(l => l.trim());

    const joined = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^[A-E][\.\)]?$/.test(line)) {
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
    let lastQuestionNumber = 0;

    for (let i = 0; i < joined.length; i++) {
        const line = joined[i];
        if (!line) continue;

        // Skip year headers (handles singular + plural)
        if (new RegExp("^" + baseName.replace(/\s+/g, "\\s+") + "s?\\s*\\d{4}$", "i").test(line)) continue;
        if (/^\d{4}$/.test(line)) continue;

        const bareNum = line.match(/^(\d{1,3})[\.\)]?$/);
        if (bareNum) {
            const num = parseInt(bareNum[1], 10);
            if (num >= 1 && num <= 60) {
                if (current && current.options.length >= 2) {
                    if (currentOpt) current.options.push(currentOpt);
                    questions.push(current);
                }
                current = { num, question: "", options: [] };
                currentOpt = null;
                lastQuestionNumber = num;
                continue;
            }
        }

        const inlineNum = line.match(/^(\d{1,3})[\.\)]\s+(.+)$/);
        if (inlineNum) {
            const num = parseInt(inlineNum[1], 10);
            if (num >= 1 && num <= 60 && num === lastQuestionNumber + 1) {
                if (current && current.options.length >= 2) {
                    if (currentOpt) current.options.push(currentOpt);
                    questions.push(current);
                }
                current = { num, question: inlineNum[2], options: [] };
                currentOpt = null;
                lastQuestionNumber = num;
                continue;
            }
        }

        const multiOpt = splitMergedOptions(line);
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

        const singleOpt = line.match(/^([A-E])[\.\)]\s*(.+)$/);
        if (singleOpt && current) {
            const letter = singleOpt[1].toUpperCase();
            if (!current.options.find(x => x.letter === letter)) {
                if (currentOpt) current.options.push(currentOpt);
                currentOpt = { letter, value: singleOpt[2].trim() };
            }
            continue;
        }

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

/* ---------- 7. Process each year ---------- */
const allQuestions = [];

yearSplits.forEach((section, i) => {
    if (section.year === "END") return;

    const nextStart = yearSplits[i + 1].start;
    const blockText = raw.substring(section.start, nextStart);

    const parsed = parseYear(blockText);

    if (parsed.length < 5) {
        console.log("Year " + section.year + ": skipped (only " + parsed.length + " questions)");
        return;
    }

    let accepted = 0, rejected = 0;
    parsed.forEach(q => {
        let qText = q.question.replace(/\s+/g, " ").trim();
        qText = fixQuestionMerge(qText);
        qText = stripTrailingQuestion(qText);

        if (!qText || qText.length < 8) { rejected++; return; }
        if (!/^[A-Z0-9("']/i.test(qText)) { rejected++; return; }

        const opts = q.options
            .map(o => ({
                letter: o.letter,
                value: stripTrailingQuestion(o.value.replace(/\s+/g, " ").trim())
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
            subject: subjectName,
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

/* ---------- 8. Write output ---------- */
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