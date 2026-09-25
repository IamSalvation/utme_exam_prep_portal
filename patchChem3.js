const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1990 = bank.filter(q => q.section === "1990 Paper");
const y1991 = bank.filter(q => q.section === "1991 Paper");
const y1992 = bank.filter(q => q.section === "1992 Paper");

// --- 1990 ---
y1990[6].options = [
  "ionization energy", "sublimation energy", "lattice energy", "electron affinity"
];
y1990[7].options = [
  "50.2", "47.0", "4.70", "0.47"
];
y1990[13].options = [
  "5 g of lumps of CaCO3 at 25°C",
  "5 g of powdered CaCO3 at 25°C",
  "5 g of lumps of CaCO3 at 50°C",
  "5 g of powdered CaCO3 at 50°C"
];
y1990[14].options = ["NO", "H2", "NH3", "Cl2"];
y1990[18].options = ["potassium", "barium", "zinc", "copper"];
y1990[19].options = ["(NH4)2CO3", "ZnCO3", "Al2(SO4)3", "PbCO3"];
y1990[22].options = [
  "an alloy of calcium and iron",
  "coke",
  "impure iron",
  "calcium trioxosilicate(V)"
];

// --- 1991 ---
y1991[6].options = ["10 and 10", "9 and 9", "11 and 9", "9 and 11"];
y1991[22].options = ["20 g", "40 g", "60 g", "80 g"];
y1991[28].options = [
  "CH3CH2CH2CH2OH",
  "CH3CH2CHOHCH3",
  "CH3CHOHCH2CH3",
  "CH3OCH2CH2OH"
];

// --- 1992 ---
y1992[4].options = ["P", "Q", "R", "S"];
y1992[6].options = ["Volume", "Mass", "Pressure", "Temperature"];
y1992[8].options = [
  "Oxygen", "Carbon(II) oxide", "Nitrogen", "Sulphur(IV) oxide"
];
y1992[22].options = ["hydrogen", "nitrogen(IV) oxide", "oxygen", "ammonia"];
y1992[25].options = [
  "Ammonia",
  "Sodium chloride",
  "Calcium trioxocarbonate",
  "Sodium trioxocarbonate(IV)"
];
y1992[27].options = [
  "CH3-CH=CH-CH3",
  "CH3-CH2-CH2-CH3",
  "CH3-CH(CH3)-CH3",
  "CH3-CH2-CH(CH3)-CH3"
];
y1992[29].options = [
  "hydroxyl group",
  "carbonyl group",
  "carbonyl group (terminal)",
  "carboxy group"
];
y1992[33].options = ["dextrose", "mannose", "glucose", "starch"];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 18 questions");
