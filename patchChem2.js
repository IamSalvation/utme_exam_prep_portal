const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1987 = bank.filter(q => q.section === "1987 Paper");
const y1988 = bank.filter(q => q.section === "1988 Paper");
const y1989 = bank.filter(q => q.section === "1989 Paper");

// --- 1987 ---
y1987[5].options = [
  "kill bacteria",
  "control the pH of water",
  "improve the taste of the water",
  "coagulate small particles of mud"
];
y1987[19].options = [
  "Phosphorus and hydrogen",
  "Oxygen and chlorine",
  "Sulphur and nitrogen",
  "Oxygen and sulphur"
];
y1987[24].options = [
  "butane, propane and kerosene",
  "butane, propane and petrol",
  "ethane, methane and benzene",
  "ethane, methane and propane"
];
y1987[27].options = [
  "propanal",
  "propan-2-ol",
  "propan-1-one",
  "propanoic acid"
];

// --- 1988 ---
y1988[1].options = [
  "Ionization potential",
  "Electron affinity",
  "Electronegativity",
  "Atomic radius"
];
y1988[5].options = [
  "water",
  "moist SO2",
  "acidified KMnO4 and water",
  "water, acidified KMnO4 and oxygen"
];
y1988[10].options = [
  "Calcium trioxocarbonate(IV)",
  "Sodium trioxocarbonate(IV)",
  "Sodium chloride",
  "Hydrochloric acid"
];
y1988[14].options = [
  "The dissolution of NaOH(s) in water is endothermic",
  "The heat of solution of NaOH(s) is positive",
  "The NaOH(s) gains heat from the surroundings",
  "The heat of solution of NaOH(s) is negative"
];
y1988[27].options = [
  "a dehydrating agent",
  "a reducing agent",
  "an oxidizing agent",
  "a catalyst"
];

// --- 1989 ---
y1989[12].options = [
  "an allotropic acid",
  "an amphoteric oxide",
  "a peroxide",
  "a dioxide"
];
y1989[17].options = [
  "I, III and IV",
  "III only",
  "II, III and IV",
  "IV only"
];
y1989[19].options = [
  "carbon(IV) oxide and ethanoic acid",
  "trioxocarbonate(IV) acid and methanoic acid",
  "producer gas and water gas",
  "coke and ammonia liquor"
];
y1989[26].options = [
  "a covalent bond",
  "an ionic bond",
  "a dative covalent bond",
  "a hydrogen bond"
];
y1989[28].options = [
  "propane-1,1,3-triol",
  "propane-1,3,3-triol",
  "propane-1,2,2-triol",
  "propane-1,2,3-triol"
];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 14 questions");
