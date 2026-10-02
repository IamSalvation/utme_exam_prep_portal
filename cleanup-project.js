const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--run');

// ============ WHITELIST ROOT FILES ============
const KEEP_ROOT = new Set([
  'index.html', 'register.html', 'instructions.html', 'exam.html',
  'result.html', 'review.html', 'dashboard.html', 'study.html',
  'manifest.json', 'package.json', 'package-lock.json',
  'verify-modes.js', 'gaps-answers.json', 'math-replacements.json',
  'cleanup-project.js'
]);

const KEEP_DIRS = new Set([
  'js', 'css', 'assets', 'node_modules',
  '_backups', 'answer-keys', 'source-text', 'source-pdfs',
  'answers', '.git', '.vscode'
]);

// ============ DELETE PATTERNS (root) ============
const patterns = [
  /^questions-.*\.(js|json)$/,
  /^questions\..*\.js$/,
  /^\d{4}-.*-questions\.txt$/,
  /^\d{4}-questions\.txt$/,
  /^\d{4}-maths\.txt$/,
  /^maths-\d+.*-dump\.txt$/,
  /^\d{4}-physics-questions\.txt$/,
  /^\d{4}-chemistry-questions\.txt$/,
  /^\d{4}-biology-questions\.txt$/,
  /^\d{4}-government-questions\.txt$/,
  /^20\d\d-20\d\d-biology-questions\.txt$/,
  /^physics-2020-2024-questions\.txt$/,
  /^JAMB-.*\.(json|txt)$/,
  /^biology-.*\.(json|js)$/,
  /^english-.*\.(js|json|txt)$/,
  /^math-raw\.txt$/,
  /^package \(2\)\.json$/,
  /^(convert|patch|merge|apply|dump|fix|clean|split|diagnose|compare|probe|census|depaginate|stamp|list|check|diag|verify)[0-9A-Za-z-]*\.js$/,
  /^patch[A-Za-z0-9]+\.js$/,
  /^merge\.js$/, /^example\.js$/, /^index\.js$/,
];

let toDelete = [];
let toKeep = [];

fs.readdirSync('.').forEach(name => {
  const full = path.join('.', name);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    if (!KEEP_DIRS.has(name)) {
      toDelete.push({ path: full, size: 0, isDir: true });
    }
    return;
  }
  if (KEEP_ROOT.has(name)) { toKeep.push(name); return; }
  const matches = patterns.some(re => re.test(name));
  if (matches) {
    toDelete.push({ path: full, size: stat.size, isDir: false });
  } else {
    toKeep.push(name);
  }
});

// ============ DELETE INSIDE js/ ============
const jsKill = [];
fs.readdirSync('js').forEach(name => {
  if (name === 'questions.js') return;
  if (name.startsWith('questions.') && name.endsWith('.js')) {
    const full = path.join('js', name);
    jsKill.push({ path: full, size: fs.statSync(full).size, isDir: false });
  } else if (name.match(/^questions-.*\.(js|json)$/)) {
    const full = path.join('js', name);
    jsKill.push({ path: full, size: fs.statSync(full).size, isDir: false });
  }
});

toDelete = toDelete.concat(jsKill);

// ============ _backups ============
const BACKUP_KEEP = new Set([
  'questions-TRULY-FINAL-100PCT-20261002-1237.js',
  'questions-BEFORE-PATH-B-20261002-1234.js',
  'questions-10071-5-SUBJECTS-VERIFIED.js',
  'questions.BEFORE-MATH-MERGE.js',
  'questions.BEFORE-BIOLOGY-V2-MERGE.js',
  'JAMB-Physics-1983-2004-FINAL-CLEANED.json',
  'JAMB-GOVERNMENT-2010-2018-FINAL-ANSWERED.json',
]);

const backupDel = [];
if (fs.existsSync('_backups')) {
  fs.readdirSync('_backups').forEach(name => {
    const full = path.join('_backups', name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return;
    if (BACKUP_KEEP.has(name)) return;
    backupDel.push({ path: full, size: stat.size, isDir: false });
  });
}

// ============ REPORT ============
const allDel = toDelete.concat(backupDel);
const totalSize = allDel.reduce((s, f) => s + f.size, 0);

console.log('');
console.log('=== CLEANUP ' + (DRY_RUN ? 'DRY RUN' : 'LIVE') + ' ===');
console.log('');
console.log('Will DELETE: ' + allDel.length + ' files (' + (totalSize / 1024 / 1024).toFixed(1) + ' MB)');
console.log('Will KEEP (root): ' + toKeep.length + ' files');
console.log('');
console.log('Root deletions:  ' + toDelete.length);
console.log('js/ old backups: ' + jsKill.length);
console.log('_backups/ del:   ' + backupDel.length);
console.log('');

if (DRY_RUN) {
  console.log('--- Files to KEEP in root ---');
  toKeep.forEach(f => console.log('  KEEP  ' + f));
  console.log('');
  console.log('--- First 30 files to delete ---');
  allDel.slice(0, 30).forEach(f => console.log('  DEL   ' + f.path + '  (' + (f.size/1024).toFixed(1) + ' KB)'));
  if (allDel.length > 30) console.log('  ... and ' + (allDel.length - 30) + ' more');
  console.log('');
  console.log('Run with --run to actually delete:');
  console.log('  node cleanup-project.js --run');
} else {
  let deleted = 0;
  let errors = 0;
  allDel.forEach(f => {
    try {
      if (f.isDir) { fs.rmdirSync(f.path); } else { fs.unlinkSync(f.path); }
      deleted++;
    } catch (e) {
      errors++;
      console.log('  FAILED: ' + f.path + ' -- ' + e.message);
    }
  });
  console.log('OK Deleted ' + deleted + ' files (' + (totalSize/1024/1024).toFixed(1) + ' MB freed)');
  if (errors) console.log('   ' + errors + ' errors');
}
