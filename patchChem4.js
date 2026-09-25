const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1993 = bank.filter(q => q.section === "1993 Paper");
const y1994 = bank.filter(q => q.section === "1994 Paper");
const y1995 = bank.filter(q => q.section === "1995 Paper");

// --- 1993 ---
y1993[8].options = [
  "deliquescence", "hygroscopy", "effervescence", "efflorescence"
];
y1993[10].options = [
  "-1, +5 and +7",
  "-1, -5 and +7",
  "+1, +3 and +4",
  "+1, +5 and +7"
];
y1993[21].options = [
  "dimethylhexane",
  "3,5-dimethylpentane",
  "1,1-dimethyl-3-methylpentane",
  "2,4-dimethylhexane"
];
y1993[27].options = [
  "the sugar content is converted into alcohol",
  "the carbon(IV) oxide formed during fermentation has a sour taste",
  "it is commonly adulterated by tappers and sellers",
  "microbial activity results in the production of organic acids within it"
];

// --- 1994 ---
y1994[2].options = ["298 K", "546 K", "819 K", "1092 K"];
y1994[6].options = [
  "trigonal planar", "octahedral", "square planar", "tetrahedral"
];
y1994[21].options = ["Aluminium", "Zinc", "Tin", "Iron"];
y1994[22].options = [
  "the bleach decolourizes the clothes",
  "chlorine reacts with fabrics during bleaching",
  "the clothes are sterilized during bleaching",
  "hydrogen chloride solution is produced during bleaching"
];
y1994[33].options = [
  "sodium hydroxide and water",
  "sodium hydroxide and hydrogen",
  "sodium ethoxide and water",
  "sodium ethoxide and hydrogen"
];

// --- 1995 ---
y1995[5].options = [
  "They have the same number of electrons in their outermost shells",
  "they have different atomic masses",
  "They have the same atomic number and the same number of electrons",
  "they have the same atomic number but different number of electrons"
];
y1995[17].options = [
  "release CO2 for the reaction",
  "reduce the iron",
  "increase the strength of iron",
  "remove impurities"
];
y1995[24].options = [
  "ionic bonding",
  "aromatic character",
  "covalent bonding",
  "hydrogen bonding"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 12 questions");
