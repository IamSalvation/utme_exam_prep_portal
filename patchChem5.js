const fs = require("fs");
const file = "js/questions-chemistry-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.error("No bank"); process.exit(1); }

const bank = eval(m[1]);
const y1997 = bank.filter(q => q.section === "1997 Paper");
const y1998 = bank.filter(q => q.section === "1998 Paper");
const y1999 = bank.filter(q => q.section === "1999 Paper");
const y2000 = bank.filter(q => q.section === "2000 Paper");
const y2001 = bank.filter(q => q.section === "2001 Paper");
const y2002 = bank.filter(q => q.section === "2002 Paper");
const y2003 = bank.filter(q => q.section === "2003 Paper");
const y2004 = bank.filter(q => q.section === "2004 Paper");

// 1997
y1997[1].options = ["Atomic number", "Electron affinity", "Ionization potential", "Atomic radius"];
y1997[5].options = ["Hydrogen sulphide", "Carbon(IV) oxide", "Sulphur(IV) oxide", "Carbon(II) oxide"];
y1997[10].options = ["34.0", "31.0", "20.0", "14.0"];
y1997[13].options = ["13.0", "7.0", "6.5", "3.0"];
y1997[16].options = ["manufacture of tooth pastes", "treatment of simple goiter", "vulcanization of rubber", "sterilization of water"];
y1997[19].options = ["nitrogen", "air", "argon", "methane"];
y1997[23].options = ["Silicon", "Sulphur and phosphorus", "Carbon", "Chromium and nickel"];
y1997[27].options = ["Teflon", "Isoprene", "Polythene", "Neoprene"];

// 1998
y1998[3].options = ["Liquid is dispersed in gas", "Solid is dispersed in liquid", "Gas is dispersed in liquid", "Liquid is dispersed in liquid"];
y1998[4].options = ["1.3", "7.0", "9.7", "12.7"];
y1998[18].options = ["carbon(IV) oxide and alkyne", "carbon(II) oxide and alkane", "hydrogen gas and alkane", "hydrogen gas and alkene"];
y1998[24].options = ["alkanone", "alkane", "alkene", "alkyne"];

// 1999
y1999[3].options = ["distillation", "fractional distillation", "crystallization", "fractional crystallization"];
y1999[9].options = ["white precipitate is formed", "a green precipitate is formed", "The mixture remains colourless", "The mixture turns reddish-brown"];
y1999[12].options = ["Electropositivity of metals increases down the series", "Electropositivity of non-metals decreases down the series", "Electronegativity of non-metals increases down the series", "Electropositivity of metals decreases down the series"];
y1999[28].options = ["alkenes", "alkanal", "alkanone", "alkanoic acid"];

// 2000
y2000[12].options = ["+3000 kJ mol-1", "+300 kJ mol-1", "-300 kJ mol-1", "-3000 kJ mol-1"];

// 2001
y2001[3].options = ["x-rays", "beta-rays", "alpha-rays", "gamma-rays"];
y2001[5].options = ["20", "32", "14", "12"];
y2001[13].options = ["zero", "indeterminate", "positive", "negative"];
y2001[15].options = ["2NO(g) + Br2(l) -> 2NOBr(l)", "FeSO4(aq) + NO(g) -> Fe(NO)SO4(s)", "2NO(g) + Cl2(g) -> 2NOCl(l)", "2NO(g) + O2(g) -> 2NO2(g)"];
y2001[17].options = ["M is more electronegative than zinc", "Zinc is above hydrogen in the series", "Electron flow from zinc to M", "M is more electropositive than zinc"];
y2001[21].options = ["lengthen the chain of rubber", "break down rubber polymer", "act as a catalyst", "bind rubber molecules together"];
y2001[25].options = ["Cyclohexene", "Oil", "Margarine", "Cyclohexane"];

// 2002
y2002[7].options = ["distillation of starch solution", "catalytic oxidation of methane", "destructive distillation of wood", "fermentation of starch"];
y2002[19].options = ["uranium", "lead compounds", "organophosphorus compounds", "silicate minerals"];
y2002[20].options = ["ionic character", "boiling point", "covalent nature", "hydrogen bonding"];

// 2003
y2003[5].options = ["some of its molecules are moving faster than others", "of the collision of the molecules with each other", "of the mass of the molecules of gas", "the molecules of a gas collide with walls of the container"];
y2003[6].options = ["ionic", "covalent", "coordinate covalent", "Van der Waals"];
y2003[7].options = ["air pollution", "water pollution", "increased humidity", "flooding"];
y2003[9].options = ["L", "M", "N", "P"];
y2003[17].options = ["pink", "colourless", "red", "dark blue"];

// 2004
y2004[4].options = ["C2H5COOH", "CH4", "CH3OCH3", "C2H4"];
y2004[15].options = ["dye", "dispersant", "salt", "mordant"];
y2004[17].options = ["soot", "lampblack", "graphite", "charcoal"];
y2004[19].options = ["is reduced by atmospheric nitrogen", "readily reacts with water", "reacts with oxygen and carbon(IV) oxide", "reacts vigorously on exposure to air"];

const output =
  "/* Patched on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n";

fs.writeFileSync(file, output, "utf-8");
console.log("Patched 36 questions");
