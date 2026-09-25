/* =========================================================
   patchChem.js — Add missing options to Chemistry questions
   ========================================================= */

const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1984 = bank.filter(q => q.section === "1984 Paper");
const y1985 = bank.filter(q => q.section === "1985 Paper");
const y1986 = bank.filter(q => q.section === "1986 Paper");

y1984[3].options = [
  "polymerism", "isotropy", "isomorphism", "isomerism", "allotropy"
];

y1984[5].options = [
  "spontaneous", "isothermal", "adiabatic", "exothermic", "endothermic"
];

y1985[14].options = [
  "NaGaO3", "Na2Ga(OH)2", "NaGa(OH)3", "NaGa(OH)4", "NaGaO"
];

y1985[17].options = [
  "Pink", "Purple", "Orange", "Blue-black", "Green"
];

y1985[18].options = [
  "convection currents",
  "small changes in pressure",
  "small changes in temperature",
  "a chemical reaction between the pollen grains and water",
  "the bombardment of the pollen grains by molecules of water"
];

y1985[20].options = [
  "barium oxide",
  "sodium tetraoxocarbonate(IV)",
  "sodium oxide",
  "sodium hydroxide",
  "barium tetraoxocarbonate"
];

y1985[23].options = [
  "Carbon", "Air", "Water", "Oxygen", "Hydrogen"
];

y1986[4].options = [
  "V = (kM)^1/2", "V = (kM)^2", "V = k", "V = (k/M)^1/2", "V = k/M"
];

y1986[8].options = [
  "2.00 M aqueous solution of NaOH",
  "0.01 M aqueous solution of NaOH",
  "0.01 M aqueous solution of ethanoic acid",
  "0.01 M aqueous solution of sugar",
  "0.01 M aqueous solution of NaCl"
];

y1986[9].options = [
  "3.90 x 10^2 coulombs",
  "5.50 x 10^3 coulombs",
  "6.54 x 10^3 coulombs",
  "2.34 x 10^4 coulombs"
];

y1986[10].options = [
  "AgNO3 + NaCl -> AgCl + NaNO3",
  "H2S + Pb(NO3)2 -> PbS + 2HNO3",
  "CaCO3 -> CaO + CO2",
  "Zn + 2HCl -> ZnCl2 + H2"
];

y1986[13].options = [
  "excess Mg ribbon",
  "excess cold water",
  "very hot water",
  "steam"
];

y1986[25].options = [
  "Electrolysis of the solution of its salt",
  "Decomposition of its oxide",
  "Displacement from solution by an alkali metal",
  "Electrolysis of fused salt"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 13 questions");
