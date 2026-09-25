const fs = require("fs");
const file = "js/questions-english-1983-2004-all.js";
const raw = fs.readFileSync(file, "utf-8");
const m = raw.match(/const questionBank\s*=\s*(\[[\s\S]*\]);/);
const bank = eval(m[1]);

function unglue(s) {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\.([A-Za-z])/g, ". $1")
    .replace(/\s+/g, " ")
    .trim();
}

bank.forEach(q => {
  q.question = unglue(q.question);
  q.options = q.options.map(unglue);
});

fs.writeFileSync(
  file,
  "/* Cleaned on " + new Date().toISOString() + " */\n" +
  "const questionBank = " + JSON.stringify(bank, null, 2) + ";\n"
);

console.log("Cleaned " + bank.length + " questions");