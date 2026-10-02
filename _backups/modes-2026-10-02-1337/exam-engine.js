/* =========================================================
   Quickie Prep — Exam Engine (mode-aware)
   Full Mock:  180 q · 120 min · 400 marks
   Half Mock:   90 q ·  60 min · 200 marks
   Quick Mock:  45 q ·  30 min · 100 marks
   Auto-save · free navigation · flag for review
   ========================================================= */

(function () {

    // ======================================================
    // LOAD SESSION + MODE
    // ======================================================
    const activeSession = Storage.getSession();
    const MODE_KEY = (activeSession && activeSession.examMode) ? activeSession.examMode : 'full';
    const MODE = getExamMode(MODE_KEY);

    const EXAM_DURATION_SEC = MODE.minutes * 60;
    const ENGLISH_QUESTIONS = MODE.english;
    const ELECTIVE_QUESTIONS = MODE.elective;
    const MAX_SCORE = MODE.maxScore;

    // Warning thresholds scale with duration
    const WARN_30 = Math.floor(EXAM_DURATION_SEC * 0.25);  // 25% left
    const WARN_10 = Math.floor(EXAM_DURATION_SEC * 0.08);  // 8% left
    const WARN_5 = Math.floor(EXAM_DURATION_SEC * 0.04);  // 4% left

    // ======================================================
    // NORMALIZE SUBJECT
    // ======================================================
    function normalizeSubject(raw) {
        const s = (raw || '').trim().toLowerCase();
        if (s === 'english' || s === 'use of english' || s === 'english language') return 'Use of English';
        if (s === 'crk' || s === 'christian religious knowledge') return 'CRK';
        if (s === 'irk' || s === 'islamic religious knowledge') return 'IRK';
        if (s === 'religious studies') return 'Religious Studies';
        if (s === 'literature' || s === 'literature-in-english') return 'Literature-in-English';
        if (s === 'accounts' || s === 'principles of accounts') return 'Principles of Accounts';
        if (s === 'mathematics' || s === 'math' || s === 'maths') return 'Mathematics';
        if (s === 'biology') return 'Biology';
        if (s === 'chemistry') return 'Chemistry';
        if (s === 'physics') return 'Physics';
        if (s === 'economics') return 'Economics';
        if (s === 'government') return 'Government';
        if (s === 'commerce') return 'Commerce';
        if (s === 'history') return 'History';
        if (s === 'geology' || s === 'geography') return 'Geology';
        if (s === 'yoruba') return 'Yoruba';
        if (s === 'current affairs') return 'Current Affairs';
        return (raw || '').trim().replace(/\b\w/g, c => c.toUpperCase());
    }

    // ======================================================
    // LOAD CANDIDATE
    // ======================================================
    const lastEmail = localStorage.getItem('quickiePrep_last_email');
    const candidate = lastEmail ? Storage.getCandidate(lastEmail) : null;

    if (!candidate) {
        alert('No candidate found. Redirecting to registration.');
        window.location.href = 'register.html';
        return;
    }

    // ======================================================
    // STATE
    // ======================================================
    let session = null;
    let currentIndex = 0;
    let timerInterval = null;

    const urlParams = new URLSearchParams(window.location.search);
    const isResume = urlParams.get('resume') === '1';

    // ======================================================
    // PICK QUESTIONS FOR ONE SUBJECT
    // ======================================================
    function pickQuestions(subject, count) {
        const pool = questionBank.filter(q =>
            normalizeSubject(q.subject) === subject &&
            q.options && q.options.length >= 2 &&
            q.answer !== null && q.answer !== undefined && !q.needsAnswer
        );
        if (pool.length === 0) return [];
        const shuffled = pool.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // ======================================================
    // BUILD SESSION
    // ======================================================
    function buildSession() {
        const subjects = candidate.subjects || [];
        if (subjects.length !== 4) {
            alert('Candidate must have 4 subjects. Redirecting.');
            window.location.href = 'register.html';
            return null;
        }

        const sections = [];
        let allQuestions = [];

        subjects.forEach((subj, i) => {
            const isEnglish = /english/i.test(subj);
            const needed = isEnglish ? ENGLISH_QUESTIONS : ELECTIVE_QUESTIONS;
            const picked = pickQuestions(subj, needed);

            if (picked.length < needed * 0.5) {
                console.warn(`Only ${picked.length}/${needed} questions available for ${subj}`);
            }

            const startIdx = allQuestions.length;
            picked.forEach(q => allQuestions.push({
                id: q.id || `q_${allQuestions.length}`,
                subject: subj,
                question: q.question,
                options: q.options,
                correctAnswer: q.answer
            }));

            sections.push({
                index: i,
                subject: subj,
                start: startIdx,
                end: startIdx + picked.length,
                count: picked.length,
                isEnglish
            });
        });

        if (allQuestions.length === 0) {
            alert('No questions available. Please check your question bank.');
            return null;
        }

        return {
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            examMode: MODE_KEY,
            modeLabel: MODE.label,
            maxScore: MAX_SCORE,
            sections,
            questions: allQuestions,
            answers: {},
            flags: {},
            currentIndex: 0,
            startedAt: new Date().toISOString(),
            remainingSec: EXAM_DURATION_SEC,
            durationSec: EXAM_DURATION_SEC,
            submitted: false
        };
    }

    // ======================================================
    // INIT SESSION
    // ======================================================
    function initSession() {
        if (isResume && Storage.hasActiveSession()) {
            const saved = Storage.getSession();
            if (saved && saved.questions && saved.questions.length) {
                session = saved;
                currentIndex = saved.currentIndex || 0;
                console.log('Resumed session with', session.questions.length, 'questions');
                return;
            }
        }

        session = buildSession();
        if (!session) return;
        Storage.saveSession(session);
        console.log('New session created (' + MODE.label + '):', session.questions.length, 'questions');
    }

    initSession();
    if (!session) return;

    // ======================================================
    // DOM REFS
    // ======================================================
    const $ = id => document.getElementById(id);
    const timerDisplay = $('timerDisplay');
    const sectionLabel = $('sectionLabel');
    const subjectLabel = $('subjectLabel');
    const qIndexLabel = $('qIndexLabel');
    const qTotalLabel = $('qTotalLabel');
    const answeredLabel = $('answeredLabel');
    const progressFill = $('progressFill');
    const qBadge = $('qBadge');
    const qSubject = $('qSubject');
    const qText = $('qText');
    const optionsGroup = $('optionsGroup');
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');
    const flagBtn = $('flagBtn');
    const qGrid = $('qGrid');
    const sectionTabs = $('sectionTabs');
    const submitBtn = $('submitBtn');
    const submitModal = $('submitModal');
    const submitSummary = $('submitSummary');
    const confirmSubmit = $('confirmSubmit');
    const cancelSubmit = $('cancelSubmit');
    const timeUpModal = $('timeUpModal');
    const timeUpContinue = $('timeUpContinue');

    qTotalLabel.textContent = session.questions.length;
    document.title = MODE.label + ' — Quickie Prep';

    // ======================================================
    // GET SECTION FOR INDEX
    // ======================================================
    function getSectionForIndex(idx) {
        return session.sections.find(s => idx >= s.start && idx < s.end) || session.sections[0];
    }

    // ======================================================
    // RENDER QUESTION
    // ======================================================
    function renderQuestion() {
        const q = session.questions[currentIndex];
        if (!q) return;

        const sec = getSectionForIndex(currentIndex);
        const secIdx = session.sections.indexOf(sec);

        sectionLabel.textContent = `Section ${secIdx + 1} of ${session.sections.length}`;
        subjectLabel.textContent = sec.subject;
        qIndexLabel.textContent = currentIndex + 1;

        qBadge.textContent = `Q${currentIndex + 1}`;
        qSubject.textContent = q.subject;

        qText.textContent = q.question;

        optionsGroup.innerHTML = '';
        q.options.forEach((optText, i) => {
            const letter = String.fromCharCode(65 + i);
            const label = document.createElement('label');
            label.className = 'option-label';
            const isSelected = session.answers[currentIndex] === i;
            if (isSelected) label.classList.add('selected');
            label.innerHTML = `
        <input type="radio" name="q_${currentIndex}" value="${i}" ${isSelected ? 'checked' : ''}>
        <strong>${letter}.</strong> ${optText}
      `;
            label.querySelector('input').addEventListener('change', () => {
                session.answers[currentIndex] = i;
                session.currentIndex = currentIndex;
                Storage.saveSession(session);
                updateSidebar();
                updateProgress();
                renderQuestion();
            });
            optionsGroup.appendChild(label);
        });

        if (session.flags[currentIndex]) {
            flagBtn.classList.add('danger');
            flagBtn.textContent = '⚑ Flagged';
        } else {
            flagBtn.classList.remove('danger');
            flagBtn.textContent = '⚑ Flag for Review';
        }

        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === session.questions.length - 1;

        updateSidebar();
        updateProgress();
    }

    // ======================================================
    // RENDER SIDEBAR
    // ======================================================
    function updateSidebar() {
        sectionTabs.innerHTML = '';
        session.sections.forEach((sec, i) => {
            const tab = document.createElement('button');
            tab.className = 'section-tab';
            const active = currentIndex >= sec.start && currentIndex < sec.end;
            if (active) tab.classList.add('active');
            tab.textContent = `${sec.subject} (${sec.count})`;
            tab.addEventListener('click', () => {
                currentIndex = sec.start;
                session.currentIndex = currentIndex;
                Storage.saveSession(session);
                renderQuestion();
            });
            sectionTabs.appendChild(tab);
        });

        qGrid.innerHTML = '';
        session.questions.forEach((q, idx) => {
            const btn = document.createElement('button');
            btn.className = 'q-cell';
            btn.textContent = idx + 1;
            if (session.answers[idx] !== undefined) btn.classList.add('answered');
            if (session.flags[idx]) btn.classList.add('flagged');
            if (idx === currentIndex) btn.classList.add('current');
            btn.addEventListener('click', () => {
                currentIndex = idx;
                session.currentIndex = currentIndex;
                Storage.saveSession(session);
                renderQuestion();
            });
            qGrid.appendChild(btn);
        });
    }

    // ======================================================
    // PROGRESS
    // ======================================================
    function updateProgress() {
        const answered = Object.keys(session.answers).length;
        const flagged = Object.keys(session.flags).length;
        answeredLabel.textContent = `${answered} answered · ${flagged} flagged`;
        const pct = (answered / session.questions.length) * 100;
        progressFill.style.width = pct + '%';
    }

    // ======================================================
    // NAVIGATION
    // ======================================================
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            session.currentIndex = currentIndex;
            Storage.saveSession(session);
            renderQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < session.questions.length - 1) {
            currentIndex++;
            session.currentIndex = currentIndex;
            Storage.saveSession(session);
            renderQuestion();
        }
    });

    flagBtn.addEventListener('click', () => {
        session.flags[currentIndex] = !session.flags[currentIndex];
        if (!session.flags[currentIndex]) delete session.flags[currentIndex];
        Storage.saveSession(session);
        renderQuestion();
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowLeft') prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn.click();
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
            const radio = optionsGroup.querySelector(`input[value="${num - 1}"]`);
            if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
        }
    });

    // ======================================================
    // TIMER
    // ======================================================
    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function tick() {
        if (session.remainingSec <= 0) {
            clearInterval(timerInterval);
            autoSubmit();
            return;
        }
        session.remainingSec--;
        timerDisplay.textContent = formatTime(session.remainingSec);

        timerDisplay.classList.remove('warn', 'danger');
        if (session.remainingSec <= WARN_5) timerDisplay.classList.add('danger');
        else if (session.remainingSec <= WARN_10) timerDisplay.classList.add('danger');
        else if (session.remainingSec <= WARN_30) timerDisplay.classList.add('warn');

        if (session.remainingSec % 15 === 0) {
            Storage.saveSession(session);
        }
    }

    timerDisplay.textContent = formatTime(session.remainingSec);
    timerInterval = setInterval(tick, 1000);

    // ======================================================
    // SUBMIT
    // ======================================================
    function openSubmitModal() {
        const answered = Object.keys(session.answers).length;
        const total = session.questions.length;
        submitSummary.textContent = `You've answered ${answered} of ${total} questions.`;
        submitModal.classList.add('visible');
    }

    function closeSubmitModal() {
        submitModal.classList.remove('visible');
    }

    submitBtn.addEventListener('click', openSubmitModal);
    cancelSubmit.addEventListener('click', closeSubmitModal);
    confirmSubmit.addEventListener('click', submitExam);

    function submitExam() {
        clearInterval(timerInterval);

        const result = {
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            subjects: candidate.subjects,
            examYear: candidate.examYear,
            course: candidate.course,
            examMode: MODE_KEY,
            modeLabel: MODE.label,
            maxScore: MAX_SCORE,
            sections: session.sections.map(s => {
                let correct = 0, attempted = 0;
                for (let i = s.start; i < s.end; i++) {
                    if (session.answers[i] !== undefined) {
                        attempted++;
                        const q = session.questions[i];
                        if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
                            const correctIdx = typeof q.correctAnswer === 'number'
                                ? q.correctAnswer
                                : String(q.correctAnswer).charCodeAt(0) - 65;
                            if (session.answers[i] === correctIdx) correct++;
                        }
                    }
                }
                return {
                    subject: s.subject,
                    total: s.count,
                    attempted,
                    correct,
                    isEnglish: s.isEnglish
                };
            }),
            answers: session.answers,
            questions: session.questions,
            flags: session.flags,
            startedAt: session.startedAt,
            submittedAt: new Date().toISOString(),
            durationUsedSec: EXAM_DURATION_SEC - session.remainingSec,
            durationTotalSec: EXAM_DURATION_SEC
        };

        // ======================================================
        // SCORE SCALING (Option B)
        // Full Mock:  180 q -> 400 marks (100 per subject)
        // Half Mock:   90 q -> 200 marks ( 50 per subject)
        // Quick Mock:  45 q -> 100 marks ( 25 per subject)
        // ======================================================
        const perSubjectMax = MAX_SCORE / 4;
        let totalScaled = 0;
        result.sections.forEach(s => {
            const marks = s.total > 0
                ? Math.round((s.correct / s.total) * perSubjectMax)
                : 0;
            s.marks = marks;
            s.perSubjectMax = perSubjectMax;
            totalScaled += marks;
        });
        result.totalScaled = totalScaled;
        result.maxScaled = MAX_SCORE;

        // Save attempt
        Storage.saveAttempt(candidate.email, result);
        Storage.clearSession();

        window.location.href = 'result.html';
    }

    function autoSubmit() {
        timeUpModal.classList.add('visible');
        timeUpContinue.addEventListener('click', () => {
            submitExam();
        });
    }

    // ======================================================
    // INITIAL RENDER
    // ======================================================
    renderQuestion();

    window.addEventListener('beforeunload', (e) => {
        if (!session.submitted) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

})();