/* =========================================================
   Quickie Prep — Review Answers Engine
   Loads latest attempt, shows each question with:
   - Student answer (green if correct, red if wrong)
   - Correct answer
   - Filter: All / Wrong / Correct / Skipped / Flagged
   ========================================================= */

(function () {

    // ---------- 1. GET LATEST ATTEMPT ----------
    const lastEmail = localStorage.getItem('quickiePrep_last_email');
    const candidate = lastEmail ? Storage.getCandidate(lastEmail) : null;

    if (!candidate) {
        alert('No candidate found. Redirecting to home.');
        window.location.href = 'index.html';
        return;
    }

    const attempts = candidate.attempts || [];
    const attempt = attempts[attempts.length - 1];

    if (!attempt) {
        alert('No exam attempt found. Please take a mock exam first.');
        window.location.href = 'index.html';
        return;
    }

    // ---------- 2. HELPERS ----------
    function correctIndexFor(q) {
        if (q.correctAnswer === null || q.correctAnswer === undefined) return -1;
        if (typeof q.correctAnswer === 'number') return q.correctAnswer;
        const s = String(q.correctAnswer).trim().toUpperCase();
        // "A" → 0, "B" → 1, etc.
        if (s.length === 1 && s >= 'A' && s <= 'Z') return s.charCodeAt(0) - 65;
        // "0"/"1"/"2" → number
        const n = parseInt(s, 10);
        if (!isNaN(n) && n >= 0 && n <= 5) return n;
        return -1;
    }

    function letterFor(idx) {
        return String.fromCharCode(65 + idx);
    }

    // ---------- 3. CLASSIFY EACH QUESTION ----------
    const reviewed = attempt.questions.map((q, idx) => {
        const studentIdx = attempt.answers && attempt.answers[idx] !== undefined
            ? attempt.answers[idx]
            : -1;
        const correctIdx = correctIndexFor(q);
        const isFlagged = !!(attempt.flags && attempt.flags[idx]);

        let status = 'skipped';
        if (studentIdx === -1) {
            status = 'skipped';
        } else if (correctIdx === -1) {
            status = 'unknown'; // no correct answer stored
        } else if (studentIdx === correctIdx) {
            status = 'correct';
        } else {
            status = 'wrong';
        }

        return {
            index: idx,
            question: q,
            studentIdx,
            correctIdx,
            status,
            isFlagged
        };
    });

    // ---------- 4. SUMMARY COUNTS ----------
    const counts = {
        all: reviewed.length,
        correct: reviewed.filter(r => r.status === 'correct').length,
        wrong: reviewed.filter(r => r.status === 'wrong').length,
        skipped: reviewed.filter(r => r.status === 'skipped').length,
        flagged: reviewed.filter(r => r.isFlagged).length
    };

    document.getElementById('reviewMeta').innerHTML =
        `<strong>${attempt.candidateName}</strong> · Attempt on ${new Date(attempt.submittedAt).toLocaleDateString()}`;

    document.getElementById('reviewSummary').innerHTML = `
    <span class="stat-badge">✓ ${counts.correct} Correct</span>
    <span class="stat-badge" style="background:rgba(239,83,80,0.15); color:var(--color-danger);">✗ ${counts.wrong} Wrong</span>
    <span class="stat-badge" style="background:rgba(176,190,197,0.15); color:var(--color-muted);">○ ${counts.skipped} Skipped</span>
    <span class="stat-badge" style="background:rgba(255,183,77,0.15); color:var(--color-warning);">⚑ ${counts.flagged} Flagged</span>
  `;

    // ---------- 5. FILTER STATE ----------
    let activeFilter = 'all';
    const filterButtons = document.querySelectorAll('.filter-btn');
    const reviewList = document.getElementById('reviewList');
    const reviewCount = document.getElementById('reviewCount');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            render();
        });
    });

    // ---------- 6. RENDER ----------
    function render() {
        let list = reviewed;
        if (activeFilter === 'wrong') list = reviewed.filter(r => r.status === 'wrong');
        if (activeFilter === 'correct') list = reviewed.filter(r => r.status === 'correct');
        if (activeFilter === 'skipped') list = reviewed.filter(r => r.status === 'skipped');
        if (activeFilter === 'flagged') list = reviewed.filter(r => r.isFlagged);

        reviewCount.textContent = `Showing ${list.length} of ${reviewed.length}`;
        reviewList.innerHTML = '';

        if (list.length === 0) {
            reviewList.innerHTML = '<p class="text-muted" style="padding:24px; text-align:center;">No questions match this filter.</p>';
            return;
        }

        list.forEach(r => {
            const card = document.createElement('div');
            card.className = 'review-card';

            const statusClass = 'status-' + r.status;
            const statusLabel = {
                correct: '✓ Correct',
                wrong: '✗ Wrong',
                skipped: '○ Skipped',
                unknown: '⚠ Unknown'
            }[r.status] || '—';

            // Build options
            const optionsHtml = r.question.options.map((optText, i) => {
                const letter = letterFor(i);
                let cls = 'review-option';
                if (i === r.correctIdx) cls += ' is-correct';
                if (i === r.studentIdx && r.studentIdx !== r.correctIdx) cls += ' is-wrong';
                if (i === r.studentIdx && r.studentIdx === r.correctIdx) cls += ' is-correct';

                let suffix = '';
                if (i === r.studentIdx && i === r.correctIdx) suffix = ' <span class="tag">Your answer ✓</span>';
                else if (i === r.studentIdx) suffix = ' <span class="tag tag-wrong">Your answer ✗</span>';
                else if (i === r.correctIdx) suffix = ' <span class="tag tag-correct">Correct answer</span>';

                return `<div class="${cls}"><strong>${letter}.</strong> ${optText}${suffix}</div>`;
            }).join('');

            card.innerHTML = `
        <div class="review-header">
          <span class="q-badge">Q${r.index + 1}</span>
          <span class="q-subject">${r.question.subject || ''}</span>
          ${r.isFlagged ? '<span class="review-flag">⚑ Flagged</span>' : ''}
          <span class="review-status ${statusClass}">${statusLabel}</span>
        </div>
        <p class="review-question">${r.question.question}</p>
        <div class="review-options">${optionsHtml}</div>
        ${r.correctIdx === -1 ? '<p class="text-muted" style="margin-top:10px; font-size:0.85rem;">⚠ Correct answer not stored for this question.</p>' : ''}
      `;
            reviewList.appendChild(card);
        });
    }

    render();

    console.log(`Review loaded: ${counts.correct} correct, ${counts.wrong} wrong, ${counts.skipped} skipped`);

})();