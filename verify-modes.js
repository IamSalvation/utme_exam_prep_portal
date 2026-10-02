const fs = require('fs');

console.log('');
console.log('=== QUICKIE PREP — MODE UPDATE VERIFICATION ===');
console.log('');

function check(file, tests) {
  if (!fs.existsSync(file)) {
    console.log('X ' + file + ' MISSING');
    return;
  }
  const h = fs.readFileSync(file, 'utf8');
  const fails = tests.filter(t => !t[1](h)).map(t => t[0]);
  if (fails.length) {
    console.log('X ' + file + ' — missing: ' + fails.join(', '));
  } else {
    console.log('OK ' + file);
  }
}

// 1. js/modes.js
check('js/modes.js', [
  ['full mode defined', h => /full\s*:/.test(h)],
  ['half mode defined', h => /half\s*:/.test(h)],
  ['quick mode defined', h => /quick\s*:/.test(h)],
  ['180 questions', h => /180/.test(h)],
  ['90 questions', h => /90/.test(h)],
  ['45 questions', h => /45/.test(h)],
  ['400 marks', h => /400/.test(h)],
  ['200 marks', h => /200/.test(h)],
  ['100 marks', h => /100/.test(h)],
  ['120 minutes', h => /120/.test(h)],
  ['60 minutes', h => /60/.test(h)],
  ['30 minutes', h => /30/.test(h)],
  ['getExamMode fn', h => /function getExamMode/.test(h)],
  ['window.getExamMode', h => /window\.getExamMode/.test(h)]
]);

// 2. register.html
check('register.html', [
  ['mode-picker div', h => /class="mode-picker"/.test(h)],
  ['Full Mock radio', h => /value="full"/.test(h)],
  ['Half Mock radio', h => /value="half"/.test(h)],
  ['Quick Mock radio', h => /value="quick"/.test(h)],
  ['modes.js script tag', h => /js\/modes\.js/.test(h)]
]);

// 3. js/register.js
check('js/register.js', [
  ['reads examMode', h => /examMode/.test(h)],
  ['saves lastMode', h => /lastMode/.test(h)],
  ['saves session', h => /Storage\.saveSession/.test(h)],
  ['subjects array saved', h => /subjects:\s*\[/.test(h)]
]);

// 4. exam.html script order
check('exam.html', [
  ['modes.js present', h => h.indexOf('js/modes.js') > -1],
  ['exam-engine.js present', h => h.indexOf('js/exam-engine.js') > -1],
  ['modes.js before exam-engine.js', h => {
    const a = h.indexOf('js/modes.js');
    const b = h.indexOf('js/exam-engine.js');
    return a > -1 && b > -1 && a < b;
  }]
]);

// 5. js/exam-engine.js
check('js/exam-engine.js', [
  ['reads examMode', h => /examMode/.test(h)],
  ['calls getExamMode', h => /getExamMode/.test(h)],
  ['uses MODE.minutes', h => /MODE\.minutes/.test(h)],
  ['uses MODE.english', h => /MODE\.english/.test(h)],
  ['uses MODE.elective', h => /MODE\.elective/.test(h)],
  ['uses MODE.maxScore', h => /MODE\.maxScore/.test(h)],
  ['perSubjectMax scaling', h => /perSubjectMax/.test(h)],
  ['saves examMode in session', h => /examMode:\s*MODE_KEY/.test(h)],
  ['keeps section tabs', h => /sectionTabs/.test(h)],
  ['keeps keyboard shortcuts', h => /ArrowLeft|ArrowRight/.test(h)],
  ['keeps beforeunload warning', h => /beforeunload/.test(h)],
  ['keeps auto-save', h => /% 15 === 0/.test(h)],
  ['keeps resume', h => /isResume/.test(h)]
]);

// 6. css/style.css
check('css/style.css', [
  ['mode-picker class', h => /\.mode-picker/.test(h)],
  ['mode-card class', h => /\.mode-card/.test(h)],
  ['checked state style', h => /:checked|:has\(input/.test(h)]
]);

console.log('');
console.log('=== IF ALL OK — YOU ARE READY TO TEST ===');
console.log('');
