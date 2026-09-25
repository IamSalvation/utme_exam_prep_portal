const fs = require("fs");
const file = "js/questions-physics-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y2003 = bank.filter(q => q.section === "2003 Paper");

// 2003 #11 — 2000W heater, 5kg metal, specific heat capacity question
y2003[10].options = [
  "250 J/kg/K",
  "300 J/kg/K",
  "450 J/kg/K",
  "500 J/kg/K"
];

// 2003 #31 — Electron accelerated, find potential difference / speed
y2003[30].options = [
  "2.0 x 10^4 V",
  "3.5 x 10^4 V",
  "5.0 x 10^4 V",
  "8.0 x 10^4 V"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 2 questions");
