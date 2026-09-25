const fs = require("fs");
const file = "js/questions-physics-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y2001 = bank.filter(q => q.section === "2001 Paper");

// 2001 #11 — Driving mirror, radius 1m, vehicle 4m from mirror, find image distance
y2001[10].options = [
  "8/7 m",
  "4/9 m",
  "9/2 m",
  "4/7 m"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 1 question");
