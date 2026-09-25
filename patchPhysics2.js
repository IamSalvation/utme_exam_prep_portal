const fs = require("fs");
const file = "js/questions-physics-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1988 = bank.filter(q => q.section === "1988 Paper");

// 1988 #6 — Two forces resultant 100N, one makes 30° with resultant
y1988[5].options = [
  "8.66 N",
  "50.0 N",
  "57.7 N",
  "86.6 N"
];

// 1988 #12 — Body floats when immersed, find density
y1988[11].options = [
  "4.0 x 10^2 kg/m^3",
  "4.0 x 10^3 kg/m^3",
  "1.0 x 10^3 kg/m^3",
  "1.0 x 10^6 kg/m^3"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 2 questions");
