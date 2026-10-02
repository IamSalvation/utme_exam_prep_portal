const fs = require('fs');

console.log('');
console.log('========================================================');
console.log('   QUICKIE PREP — FULL SYSTEM VERIFICATION');
console.log('========================================================');
console.log('');

// ---------- 1. QUESTIONS MASTER ----------
console.log('[1] MASTER QUESTION BANK');
console.log('');

const masterSrc = fs.readFileSync('js/questions.js', 'utf8');
const m = masterSrc.match(/const questionBank\s*=\s*(\[[\s\S]*\]);/);
if (!m) { console.log('   X js/questions.js NOT PARSEABLE'); process.exit(1); }
const master = eval(m[1]);

const total = master.length;
const answered = master.filter(q => q.answer !== null && q.answer !== undefined && !q.needsAnswer).length;
const needsAnswer = master.filter(q => q.answer === null || q.answer === undefined || q.needsAnswer).length;
const emptyStem = master.filter(q => !q.question || q.question.trim() === '').length;
const badOpts = master.filter(q => !q.options || q.options.length < 2).length;
const emptyOpts = master.filter(q => (q.options || []).some(o => !o || String(o).trim() === '')).length;

console.log('   Total questions:     ' + total);
console.log('   Answered:            ' + answered + ' / ' + total);
console.log('   Needs answer:        ' + needsAnswer);
console.log('   Empty stems:         ' + emptyStem);
console.log('   Bad option count:    ' + badOpts);
console.log('   Empty option slots:  ' + emptyOpts);
console.log('');

// ---------- 2. SUBJECT BREAKDOWN ----------
console.log('[2] SUBJECT BREAKDOWN');
console.log('');

const bySub = {};
master.forEach(q => {
  const s = q.subject || 'Unknown';
  if (!bySub[s]) bySub[s] = { t: 0, a: 0 };
  bySub[s].t++;
  if (q.answer !== null && q.answer !== undefined && !q.needsAnswer) bySub[s].a++;
});

Object.keys(bySub).sort().forEach(s => {
  const v = bySub[s];
  const pct = Math.round(v.a / v.t * 100);
  const mark = pct === 100 ? 'OK' : 'WARN';
  console.log('   ' + s.padEnd(28) + ' ' + String(v.a).padStart(5) + '/' + String(v.t).padStart(5) + ' ' + pct + '%  ' + mark);
});

console.log('');
console.log('   Subjects: ' + Object.keys(bySub).length);
console.log('');

// ---------- 3. APP FILES ----------
console.log('[3] APP FILES');
console.log('');

const files = [
  'index.html', 'register.html', 'instructions.html', 'exam.html',
  'result.html', 'review.html', 'dashboard.html', 'study.html',
  'js/questions.js', 'js/modes.js', 'js/storage.js', 'js/register.js',
  'js/instructions.js', 'js/exam-engine.js', 'js/home.js',
  'css/style.css', 'css/exam.css',
  'manifest.json', 'package.json'
];

let fileOk = 0, fileMiss = [];
files.forEach(f => {
  if (fs.existsSync(f)) { fileOk++; } else { fileMiss.push(f); }
});

console.log('   Present: ' + fileOk + ' / ' + files.length);
if (fileMiss.length) {
  console.log('   MISSING:');
  fileMiss.forEach(f => console.log('     - ' + f));
} else {
  console.log('   All app files present.');
}
console.log('');

// ---------- 4. MODES ----------
console.log('[4] EXAM MODES');
console.log('');

if (!fs.existsSync('js/modes.js')) {
  console.log('   X js/modes.js MISSING');
} else {
  const modesSrc = fs.readFileSync('js/modes.js', 'utf8');
  const modeChecks = [
    ['full mode (180/120/400)', /full\s*:[\s\S]{0,200}180[\s\S]{0,200}120[\s\S]{0,200}400/],
    ['half mode (90/60/200)',   /half\s*:[\s\S]{0,200}90[\s\S]{0,200}60[\s\S]{0,200}200/],
    ['quick mode (45/30/100)',  /quick\s*:[\s\S]{0,200}45[\s\S]{0,200}30[\s\S]{0,200}100/],
    ['getExamMode function',    /function getExamMode/],
    ['window.EXAM_MODES',       /window\.EXAM_MODES/],
  ];
  modeChecks.forEach(([label, re]) => {
    console.log('   ' + (re.test(modesSrc) ? 'OK' : 'X ') + ' ' + label);
  });
}
console.log('');

// ---------- 5. MODE WIRING ----------
console.log('[5] MODE WIRING (register > instructions > exam)');
console.log('');

const wiring = [
  ['register.html has mode picker',       () => /class="mode-picker"/.test(fs.readFileSync('register.html','utf8'))],
  ['register.html loads modes.js',        () => /js\/modes\.js/.test(fs.readFileSync('register.html','utf8'))],
  ['register.js saves examMode',          () => /examMode/.test(fs.readFileSync('js/register.js','utf8'))],
  ['instructions.html loads modes.js',    () => /js\/modes\.js/.test(fs.readFileSync('instructions.html','utf8'))],
  ['instructions.js uses getExamMode',    () => /getExamMode/.test(fs.readFileSync('js/instructions.js','utf8'))],
  ['exam.html loads modes.js',            () => /js\/modes\.js/.test(fs.readFileSync('exam.html','utf8'))],
  ['exam.html loads modes before engine', () => {
    const h = fs.readFileSync('exam.html','utf8');
    return h.indexOf('js/modes.js') < h.indexOf('js/exam-engine.js');
  }],
  ['exam-engine.js calls getExamMode',    () => /getExamMode/.test(fs.readFileSync('js/exam-engine.js','utf8'))],
  ['exam-engine.js uses MODE.english',    () => /MODE\.english/.test(fs.readFileSync('js/exam-engine.js','utf8'))],
  ['exam-engine.js uses MODE.elective',   () => /MODE\.elective/.test(fs.readFileSync('js/exam-engine.js','utf8'))],
  ['exam-engine.js uses MODE.maxScore',   () => /MODE\.maxScore/.test(fs.readFileSync('js/exam-engine.js','utf8'))],
];

wiring.forEach(([label, fn]) => {
  let ok = false;
  try { ok = fn(); } catch (e) { ok = false; }
  console.log('   ' + (ok ? 'OK' : 'X ') + ' ' + label);
});
console.log('');

// ---------- 6. ANSWER KEYS ----------
console.log('[6] ANSWER KEYS');
console.log('');

if (fs.existsSync('answer-keys')) {
  const keyFiles = fs.readdirSync('answer-keys').filter(f => f.endsWith('.txt'));
  const bySubject = {};
  keyFiles.forEach(f => {
    const subj = f.split('-')[0];
    bySubject[subj] = (bySubject[subj] || 0) + 1;
  });
  console.log('   Total key files: ' + keyFiles.length);
  Object.keys(bySubject).sort().forEach(s => {
    console.log('     ' + s.padEnd(20) + ' ' + bySubject[s] + ' files');
  });
} else {
  console.log('   (no answer-keys folder)');
}
console.log('');

// ---------- 7. BACKUPS ----------
console.log('[7] BACKUPS');
console.log('');

if (fs.existsSync('_backups')) {
  const backups = fs.readdirSync('_backups');
  const recentFinal = backups.filter(f => /FINAL|TRULY|100PCT/.test(f));
  console.log('   Total backup files: ' + backups.length);
  console.log('   Final-state backups: ' + recentFinal.length);
  recentFinal.slice(0, 5).forEach(f => console.log('     - ' + f));
  const dirs = fs.readdirSync('_backups').filter(f => fs.statSync('_backups/' + f).isDirectory());
  if (dirs.length) {
    console.log('   Snapshot folders:');
    dirs.forEach(d => console.log('     - ' + d));
  }
} else {
  console.log('   (no _backups folder)');
}
console.log('');

// ---------- 8. SOURCE FILES ----------
console.log('[8] SOURCE FILES (PDFs + text)');
console.log('');

['source-pdfs', 'source-text', 'source-text-old'].forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log('   ' + dir + ': ' + files.length + ' files');
  }
});
console.log('');

// ---------- FINAL VERDICT ----------
console.log('========================================================');
const allOk =
  total > 10000 &&
  answered === total &&
  emptyStem === 0 &&
  fileMiss.length === 0;

console.log(allOk
  ? '   ALL SYSTEMS OK — APP IS READY'
  : '   SOME ISSUES FOUND — CHECK ABOVE');
console.log('========================================================');
console.log('');
