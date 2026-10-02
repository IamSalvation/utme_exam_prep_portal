/* =========================================================
   Quickie Prep — Instructions Page Logic (mode-aware)
   - Loads candidate summary
   - Reads examMode from session
   - Shows subject breakdown scaled to mode
   - Pre-flight checks
   - Clears any old session on start
   ========================================================= */

(function () {

    // ---------- 1. GET CANDIDATE + SESSION + MODE ----------
    const lastEmail = localStorage.getItem('quickiePrep_last_email');
    const candidate = lastEmail ? Storage.getCandidate(lastEmail) : null;

    if (!candidate) {
        alert('Please register first before starting the exam.');
        window.location.href = 'register.html';
        return;
    }

    // Read mode from session (set at registration)
    const session = Storage.getSession();
    const MODE_KEY = (session && session.examMode) ? session.examMode : 'full';
    const MODE = getExamMode(MODE_KEY);

    const englishCount = MODE.english;
    const electiveCount = MODE.elective;
    const totalQuestions = MODE.questions;
    const minutes = MODE.minutes;
    const maxMarks = MODE.maxScore;
    const perSubjectMarks = Math.round(maxMarks / 4);

    // ---------- 2. RENDER CANDIDATE SUMMARY ----------
    document.getElementById('candName').textContent = candidate.name;
    document.getElementById('candDetails').innerHTML =
        `${candidate.email} · ${candidate.course} · Exam Year: ${candidate.examYear || '—'}`;

    // ---------- 3. UPDATE MODE-DEPENDENT TEXT ----------
    document.getElementById('modeTitle').textContent = MODE.label;
    document.title = MODE.label + ' Instructions — Quickie Prep';
    document.getElementById('modeLabel').textContent = MODE.label;
    document.getElementById('modeDescription').textContent = ' · ' + MODE.description;

    document.getElementById('timeLimit').textContent = minutes;
    document.getElementById('qTotal').textContent = totalQuestions;
    document.getElementById('qEnglish').textContent = englishCount;
    document.getElementById('qElective').textContent = electiveCount;
    document.getElementById('maxMarks').textContent = maxMarks;
    document.getElementById('perSubjectMarks').textContent = perSubjectMarks;

    // Warning thresholds scale with duration
    const warn30 = Math.round(minutes * 0.25);
    const warn10 = Math.round(minutes * 0.08);
    const warn5 = Math.round(minutes * 0.04);
    document.getElementById('warn30').textContent = warn30;
    document.getElementById('warn10').textContent = warn10;
    document.getElementById('warn5').textContent = warn5;

    document.getElementById('warnMinutes').textContent = minutes;

    // ---------- 4. SUBJECT BREAKDOWN ----------
    const breakdown = document.getElementById('subjectBreakdown');
    breakdown.innerHTML = '';

    const subjects = candidate.subjects || [];
    subjects.forEach((subj) => {
        const isEnglish = /english/i.test(subj);
        const needed = isEnglish ? englishCount : electiveCount;

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.style.cursor = 'default';
        card.innerHTML = `
      <h3>${subj}</h3>
      <div class="count">${needed} questions · ${perSubjectMarks} marks</div>
    `;
        breakdown.appendChild(card);
    });

    // ---------- 5. PRE-FLIGHT CHECKS ----------
    const preflight = document.getElementById('preflight');
    preflight.innerHTML = '';

    const checks = [
        { label: 'Candidate details saved', ok: !!(candidate.name && candidate.email) },
        { label: `4 subjects selected (English + 3 electives)`, ok: subjects.length === 4 },
        { label: `Question bank loaded (${questionBank.length.toLocaleString()} questions)`, ok: questionBank.length > 1000 },
        { label: `${MODE.label} mode active`, ok: true },
        { label: 'Ready to begin', ok: true }
    ];

    checks.forEach(c => {
        const li = document.createElement('li');
        li.innerHTML = `${c.ok ? '✓' : '✗'} ${c.label}`;
        li.style.color = c.ok ? 'var(--color-success)' : 'var(--color-danger)';
        preflight.appendChild(li);
    });

    // ---------- 6. START BUTTON ----------
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', (e) => {
        if (Storage.hasActiveSession && Storage.hasActiveSession()) {
            const s = Storage.getSession();
            const resume = confirm(
                `You have an unfinished exam with ${s.questions.length} questions.\n\n` +
                `Click OK to RESUME it, or Cancel to START FRESH (this will discard the old session).`
            );
            if (resume) {
                e.preventDefault();
                window.location.href = 'exam.html?resume=1';
                return;
            }
        }
        // Start fresh — keep mode + subjects, clear old question set
        const keepMode = session ? session.examMode : MODE_KEY;
        const keepSubjects = session ? session.subjects : candidate.subjects;
        const keepEmail = session ? session.email : candidate.email;

        Storage.clearSession();
        Storage.saveSession({
            email: keepEmail,
            name: candidate.name,
            examMode: keepMode,
            subjects: keepSubjects,
            startedAt: new Date().toISOString(),
            submitted: false,
            userAnswers: {},
            currentIndex: 0
        });
    });

})();