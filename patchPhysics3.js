const fs = require("fs");
const file = "js/questions-physics-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1994 = bank.filter(q => q.section === "1994 Paper");

// 1994 #19 — Heat supplied to test tube with 100g ice, melts in 1 min, find power
y1994[18].options = [
  "336 W",
  "450 W",
  "560 W",
  "600 W"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 1 question");
