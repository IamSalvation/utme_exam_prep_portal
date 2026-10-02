/* =========================================================
   Quickie Prep — Result Page Engine
   Reads latest attempt, displays scores, recommendations.
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
    function formatDuration(sec) {
        if (!sec) return '0m';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function pct(n, d) {
        return d > 0 ? Math.round((n / d) * 100) : 0;
    }

    // ---------- 3. RENDER META ----------
    const submittedDate = new Date(attempt.submittedAt);
    document.getElementById('resultMeta').innerHTML =
        `<strong>${attempt.candidateName}</strong> · ${attempt.course || ''} · Exam Year: ${attempt.examYear || '—'}<br>` +
        `Attempt on ${submittedDate.toLocaleDateString()} at ${submittedDate.toLocaleTimeString()}`;

    // ---------- 4. BIG SCORE ----------
    const totalScaled = attempt.totalScaled || 0;
    const maxScaled = attempt.maxScaled || 400;
    const scorePct = pct(totalScaled, maxScaled);

    document.getElementById('bigScore').textContent = `${totalScaled} / ${maxScaled}`;

    // Verdict
    const badge = document.getElementById('verdictBadge');
    if (scorePct >= 70) {
        badge.textContent = `✓ Excellent — ${scorePct}%`;
        badge.style.background = 'rgba(61,220,132,0.25)';
        badge.style.color = 'var(--color-success)';
    } else if (scorePct >= 50) {
        badge.textContent = `✓ Good — ${scorePct}%`;
        badge.style.background = 'rgba(61,220,132,0.15)';
        badge.style.color = 'var(--color-success)';
    } else if (scorePct >= 40) {
        badge.textContent = `△ Fair — ${scorePct}%`;
        badge.style.background = 'rgba(255,183,77,0.15)';
        badge.style.color = 'var(--color-warning)';
    } else {
        badge.textContent = `⚠ Needs Work — ${scorePct}%`;
        badge.style.background = 'rgba(239,83,80,0.15)';
        badge.style.color = 'var(--color-danger)';
    }

    // ---------- 5. SUBJECT BREAKDOWN ----------
    const resultsGrid = document.getElementById('subjectResults');
    resultsGrid.innerHTML = '';

    (attempt.sections || []).forEach(sec => {
        const subjectPct = pct(sec.correct, sec.total);
        const marks = sec.marks !== undefined
            ? sec.marks
            : (sec.isEnglish
                ? Math.round((sec.correct / 60) * 100)
                : Math.round(sec.correct * 2.5));

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.style.cursor = 'default';

        const status = subjectPct >= 50 ? 'PASS' : 'BELOW PASS';
        const statusColor = subjectPct >= 50 ? 'var(--color-success)' : 'var(--color-danger)';

        card.innerHTML = `
      <h3>${sec.subject}</h3>
      <div class="count">${sec.correct} / ${sec.total} correct</div>
      <div style="margin-top:10px; display:flex; justify-content:space-between; font-size:0.85rem;">
        <span>Marks: <strong style="color:var(--color-primary);">${marks} / 100</strong></span>
        <span style="color:${statusColor}; font-weight:700;">${subjectPct}% ${status}</span>
      </div>
      <div class="progress-bar" style="margin-top:10px;">
        <div style="width:${subjectPct}%; background:var(--color-gradient); height:100%; border-radius:4px;"></div>
      </div>
    `;
        resultsGrid.appendChild(card);
    });

    // ---------- 6. STATS ----------
    document.getElementById('timeUsed').textContent =
        formatDuration(attempt.durationUsedSec || 0);

    document.getElementById('timeRemaining').textContent =
        formatDuration((attempt.durationTotalSec || 0) - (attempt.durationUsedSec || 0));

    const answeredCount = Object.keys(attempt.answers || {}).length;
    document.getElementById('qAnswered').textContent =
        `${answeredCount} / ${attempt.questions.length}`;

    const totalCorrect = (attempt.sections || []).reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = (attempt.sections || []).reduce((sum, s) => sum + s.total, 0);
    document.getElementById('accuracy').textContent =
        `${pct(totalCorrect, totalQuestions)}%`;

    // ---------- 7. RECOMMENDATIONS ----------
    const recs = [];
    (attempt.sections || []).forEach(sec => {
        const subjectPct = pct(sec.correct, sec.total);
        if (subjectPct < 40) {
            recs.push(`⚠ <strong>${sec.subject}</strong>: ${subjectPct}% — needs serious work. Focus on fundamentals.`);
        } else if (subjectPct < 60) {
            recs.push(`△ <strong>${sec.subject}</strong>: ${subjectPct}% — practice more past questions here.`);
        } else if (subjectPct >= 80) {
            recs.push(`✓ <strong>${sec.subject}</strong>: ${subjectPct}% — strong. Keep it up.`);
        }
    });

    // Attempted less than 90%
    if (answeredCount < attempt.questions.length * 0.9) {
        recs.push(`📝 You left <strong>${attempt.questions.length - answeredCount}</strong> questions unattempted. Remember: <strong>no negative marking</strong> — always guess!`);
    }

    // Overall verdict
    if (scorePct >= 70) {
        recs.push(`🎯 Overall ${scorePct}% — you're on track for a competitive score.`);
    } else if (scorePct >= 50) {
        recs.push(`🎯 Overall ${scorePct}% — solid but there's room to improve.`);
    } else {
        recs.push(`🎯 Overall ${scorePct}% — focus on the weak subjects above. Retake and improve.`);
    }

    document.getElementById('recommendationsList').innerHTML =
        recs.map(r => `<div style="margin-bottom:10px;">${r}</div>`).join('');

    // ---------- 8. EXPORT BUTTON ----------
    document.getElementById('exportBtn').addEventListener('click', () => {
        const lines = [];
        lines.push('========================================');
        lines.push('      QUICKIE PREP — MOCK EXAM RESULT');
        lines.push('========================================');
        lines.push('');
        lines.push(`Candidate:   ${attempt.candidateName}`);
        lines.push(`Email:       ${attempt.candidateEmail}`);
        lines.push(`Course:      ${attempt.course || '—'}`);
        lines.push(`Exam Year:   ${attempt.examYear || '—'}`);
        lines.push(`Date:        ${submittedDate.toLocaleString()}`);
        lines.push('');
        lines.push('--------- SUBJECT BREAKDOWN ---------');
        (attempt.sections || []).forEach(sec => {
            const marks = sec.marks !== undefined ? sec.marks : '—';
            const subjectPct = pct(sec.correct, sec.total);
            lines.push(`${sec.subject.padEnd(20)} ${sec.correct}/${sec.total}  (${marks}/100 · ${subjectPct}%)`);
        });
        lines.push('');
        lines.push(`TOTAL SCORE: ${totalScaled} / ${maxScaled} (${scorePct}%)`);
        lines.push('');
        lines.push(`Time Used:    ${formatDuration(attempt.durationUsedSec || 0)}`);
        lines.push(`Answered:     ${answeredCount} / ${attempt.questions.length}`);
        lines.push('');
        lines.push('========================================');

        const text = lines.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quickie-prep-result-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ---------- 9. LOG ----------
    console.log(`Result loaded: ${totalScaled}/${maxScaled} (${scorePct}%) for ${attempt.candidateName}`);

})();