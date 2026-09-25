const fs = require("fs");
const file = "js/questions-physics-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1985 = bank.filter(q => q.section === "1985 Paper");

// 1985 #41 — "Which of the following statements is NOT correct?"
y1985[40].options = [
  "A galvanometer can be converted to an ammeter with a different range by connecting a high resistance in series",
  "An electric current always produces a magnetic field",
  "Maxwell's screw rule states that if a corkscrew moves in the direction of the current, the hand turns in the direction of the lines of force",
  "Electromagnets are used in electric bells and telephone receivers",
  "The lines of force round a straight current carrying conductor are circular"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 1 question");
