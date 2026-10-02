/* =========================================================
   Quickie Prep — Homepage Logic
   Handles: splash, welcome-back, subject grid, stats
   ========================================================= */

(function () {

    // ---------- 1. SPLASH SCREEN ----------
    const splash = document.getElementById('splash');
    if (splash) {
        if (Storage.hasSeenSplash()) {
            splash.remove();
        } else {
            setTimeout(() => {
                splash.classList.add('hidden');
                Storage.markSplashShown();
                setTimeout(() => splash.remove(), 600);
            }, 2000);
        }
    }

    // ---------- 2. NORMALIZE SUBJECT NAME ----------
    function normalizeSubject(raw) {
        const s = (raw || '').trim().toLowerCase();

        // Use of English
        if (s === 'english' || s === 'use of english' || s === 'english language') return 'Use of English';

        // Religious
        if (s === 'crk' || s === 'christian religious knowledge') return 'CRK';
        if (s === 'irk' || s === 'islamic religious knowledge') return 'IRK';
        if (s === 'religious studies') return 'Religious Studies';

        // Literature
        if (s === 'literature' || s === 'literature-in-english' || s === 'literature in english') return 'Literature';

        // Accounts
        if (s === 'accounts' || s === 'principles of accounts' || s === 'accounting') return 'Accounts';

        // Math
        if (s === 'mathematics' || s === 'math' || s === 'maths') return 'Mathematics';

        // Others
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

        // Fallback — capitalize words
        return (raw || '').trim().replace(/\b\w/g, c => c.toUpperCase());
    }

    // ---------- 3. AGGREGATE SUBJECTS ----------
    const subjectMap = new Map();

    questionBank.forEach(q => {
        const name = normalizeSubject(q.subject || 'Other');
        if (!subjectMap.has(name)) {
            subjectMap.set(name, { name, total: 0, verified: 0 });
        }
        const s = subjectMap.get(name);
        s.total++;
        if (!q.needsAnswer) s.verified++;
    });

    const subjects = [...subjectMap.values()].sort((a, b) => b.total - a.total);

    // ---------- 4. RENDER SUBJECT GRID (TOP 8, EXPAND TO ALL) ----------
    const grid = document.getElementById('subjectGrid');
    const showAllBtn = document.getElementById('showAllSubjects');
    let showingAll = false;

    function renderGrid() {
        grid.innerHTML = '';
        const list = showingAll ? subjects : subjects.slice(0, 8);
        list.forEach(s => {
            const card = document.createElement('a');
            card.className = 'subject-card';
            card.href = 'study.html?subject=' + encodeURIComponent(s.name);
            card.innerHTML = `
        <h3>${s.name}</h3>
        <div class="count">${s.verified} / ${s.total} verified</div>
      `;
            grid.appendChild(card);
        });
        showAllBtn.textContent = showingAll
            ? 'Show Top 8 Only'
            : `Show All ${subjects.length} Subjects`;
    }

    renderGrid();

    showAllBtn.addEventListener('click', () => {
        showingAll = !showingAll;
        renderGrid();
    });

    // ---------- 5. STATS ----------
    const totalVerified = questionBank.filter(q => !q.needsAnswer).length;
    const totalQuestions = questionBank.length;
    const pct = Math.round((totalVerified / totalQuestions) * 100);

    document.getElementById('statVerified').textContent = totalVerified.toLocaleString();
    document.getElementById('statSubjects').textContent = subjects.length;
    document.getElementById('statAccuracy').textContent = pct + '%';

    // ---------- 6. WELCOME BACK ----------
    const lastEmail = localStorage.getItem('quickiePrep_last_email');
    if (lastEmail) {
        const candidate = Storage.getCandidate(lastEmail);
        if (candidate && candidate.attempts && candidate.attempts.length) {
            const latest = candidate.attempts[candidate.attempts.length - 1];
            const best = Storage.getBestAttempt(lastEmail);

            document.getElementById('welcomeName').textContent = `Welcome back, ${candidate.name || 'candidate'}!`;
            document.getElementById('welcomeLast').innerHTML =
                `Last attempt: ${new Date(latest.completedAt).toLocaleDateString()} · ` +
                `<strong>${latest.totalScaled || 0}/400</strong> · ` +
                `Best: <strong>${best ? best.totalScaled : 0}/400</strong>`;
            document.getElementById('welcomeSection').style.display = 'block';
            document.getElementById('navDashboard').style.display = 'inline-block';
        }
    }

    // ---------- 7. RESUME WARNING ----------
    if (Storage.hasActiveSession && Storage.hasActiveSession()) {
        const s = Storage.getSession();
        const resume = confirm(
            `You have an unfinished exam (${s.questions.length} questions, started ${new Date(s.startedAt).toLocaleTimeString()}).\n\n` +
            `Resume it? Click OK to resume, or Cancel to start fresh.`
        );
        if (resume) {
            window.location.href = 'exam.html?resume=1';
        } else {
            Storage.clearSession();
        }
    }

    // ---------- 8. LOG ----------
    console.log(
        `Quickie Prep · ${totalVerified.toLocaleString()} verified · ${subjects.length} subjects · ${pct}%`
    );

})();