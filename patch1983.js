const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");

const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank found"); process.exit(1); }

const bank = eval(m[1]);
const y1983 = bank.filter(q => q.section === "1983 Paper");

// Patch #9 — add missing option D
y1983[8].options = [
  "Decreasing the concentration of N",
  "Increasing the concentration of P",
  "Adding a suitable catalyst",
  "Decreasing the temperature"
];

// Patch #12 — add missing option E
y1983[11].options = [
  "Sodium ion loses an electron",
  "Chlorine atom gains an electron",
  "Chloride ion gains an electron",
  "Sodium ion is oxidized",
  "Chloride ion is oxidized"
];

// Patch #15 — add missing option E
y1983[14].options = [
  "All the solutions are acidic",
  "All solutions are basic",
  "Y and Z are more acidic than water",
  "Y is more acidic than X",
  "Z is the least acidic"
];

// Patch #26 — split merged option D, add option E
y1983[25].options = [
  "Addition of chloride solution",
  "Addition of trioxonitrate (V) acid (nitric acid) to distilled water",
  "Addition of trioxonitrate (V) acid (nitric acid) to tetraoxosulphate (VI) acid (sulphuric acid)",
  "Addition of trioxonitrate (V) (potassium nitrate) solution",
  "Addition of trioxonitrate (V) acid (nitric acid) to potassium hydroxide solution"
];

// Write back
const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 4 questions in " + file);
