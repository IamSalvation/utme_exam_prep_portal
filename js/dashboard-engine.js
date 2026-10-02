/* =========================================================
   Quickie Prep — Dashboard Engine
   - Overview stats (best, latest, avg, attempts)
   - Trend chart (line chart via <canvas>)
   - Subject performance (avg per subject)
   - Weak areas + recommendations
   - Attempt history table
   - Export / clear data
   ========================================================= */

(function () {

    // ---------- 1. GET CANDIDATE ----------
    const lastEmail = localStorage.getItem('quickiePrep_last_email');
    const candidate = lastEmail ? Storage.getCandidate(lastEmail) : null;

    if (!candidate || !candidate.attempts || candidate.attempts.length === 0) {
        document.getElementById('noAttempts').style.display = 'block';
        document.getElementById('dashMeta').textContent = 'No candidate data found on this device.';
        return;
    }

    const attempts = candidate.attempts;
    document.getElementById('overviewSection').style.display = 'block';
    document.getElementById('dashMeta').innerHTML =
        `<strong>${candidate.name}</strong> · ${candidate.email} · ${attempts.length} attempt${attempts.length === 1 ? '' : 's'} on record`;

    // ---------- 2. HELPERS ----------
    function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

    function formatDuration(sec) {
        if (!sec) return '0m';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function shortDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    // ---------- 3. OVERVIEW CARDS ----------
    const scores = attempts.map(a => a.totalScaled || 0);
    const bestScore = Math.max(...scores);
    const latestScore = scores[scores.length - 1];
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const firstScore = scores[0];
    const improvement = latestScore - firstScore;

    const overview = document.getElementById('overviewCards');
    const cards = [
        { label: 'Latest Score', value: `${latestScore}/400`, pct: pct(latestScore, 400) },
        { label: 'Best Score', value: `${bestScore}/400`, pct: pct(bestScore, 400) },
        { label: 'Average Score', value: `${avgScore}/400`, pct: pct(avgScore, 400) },
        { label: 'Total Attempts', value: `${attempts.length}`, pct: null },
        { label: 'Improvement', value: (improvement >= 0 ? '+' : '') + improvement + ' marks', pct: null }
    ];

    cards.forEach(c => {
        const card = document.createElement('div');
        card.className = 'overview-card';
        card.innerHTML = `
      <div class="ov-label">${c.label}</div>
      <div class="ov-value">${c.value}</div>
      ${c.pct !== null ? `<div class="ov-bar"><div style="width:${c.pct}%"></div></div>` : ''}
    `;
        overview.appendChild(card);
    });

    // ---------- 4. TREND CHART (canvas) ----------
    const canvas = document.getElementById('trendChart');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const PAD = 40;

    // Background
    ctx.fillStyle = '#0F1E18';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(61, 220, 132, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = PAD + (H - 2 * PAD) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(W - PAD, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#B0BEC5';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'right';
        const label = 400 - (400 / 4) * i;
        ctx.fillText(String(label), PAD - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#B0BEC5';
    const n = scores.length;
    const xStep = n > 1 ? (W - 2 * PAD) / (n - 1) : 0;
    attempts.forEach((a, i) => {
        const x = n > 1 ? PAD + xStep * i : W / 2;
        ctx.fillText(shortDate(a.submittedAt), x, H - PAD + 18);
    });

    // Plot line
    if (n > 0) {
        const points = scores.map((s, i) => {
            const x = n > 1 ? PAD + xStep * i : W / 2;
            const y = H - PAD - (s / 400) * (H - 2 * PAD);
            return { x, y };
        });

        // Area fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, H - PAD);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, H - PAD);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, PAD, 0, H - PAD);
        gradient.addColorStop(0, 'rgba(61, 220, 132, 0.3)');
        gradient.addColorStop(1, 'rgba(61, 220, 132, 0.02)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = '#3DDC84';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Points
        points.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#3DDC84';
            ctx.fill();
            ctx.strokeStyle = '#0F1E18';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Score labels
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(scores[i], p.x, p.y - 12);
        });
    }

    // ---------- 5. SUBJECT PERFORMANCE (avg per subject) ----------
    const subjectStats = {};

    attempts.forEach(a => {
        (a.sections || []).forEach(s => {
            if (!subjectStats[s.subject]) {
                subjectStats[s.subject] = { totalCorrect: 0, totalQuestions: 0, attempts: 0 };
            }
            subjectStats[s.subject].totalCorrect += s.correct;
            subjectStats[s.subject].totalQuestions += s.total;
            subjectStats[s.subject].attempts++;
        });
    });

    const subjectPerf = Object.entries(subjectStats).map(([name, s]) => ({
        name,
        correct: s.totalCorrect,
        total: s.totalQuestions,
        pct: pct(s.totalCorrect, s.totalQuestions)
    })).sort((a, b) => b.pct - a.pct);

    const perfGrid = document.getElementById('subjectPerformance');
    subjectPerf.forEach(s => {
        const card = document.createElement('div');
        card.className = 'subject-perf-card';
        const status = s.pct >= 70 ? 'strong' : s.pct >= 50 ? 'ok' : 'weak';
        card.innerHTML = `
      <div class="sp-header">
        <h3>${s.name}</h3>
        <span class="sp-badge sp-${status}">${s.pct}%</span>
      </div>
      <div class="ov-bar"><div style="width:${s.pct}%"></div></div>
      <div class="text-muted" style="font-size:0.8rem; margin-top:6px;">${s.correct} / ${s.total} correct (avg)</div>
    `;
        perfGrid.appendChild(card);
    });

    // ---------- 6. WEAK AREAS + RECOMMENDATIONS ----------
    const weakAreas = document.getElementById('weakAreas');
    const recs = [];

    const weak = subjectPerf.filter(s => s.pct < 50);
    const medium = subjectPerf.filter(s => s.pct >= 50 && s.pct < 70);
    const strong = subjectPerf.filter(s => s.pct >= 70);

    weak.forEach(s => {
        recs.push({
            icon: '⚠',
            color: 'var(--color-danger)',
            text: `<strong>${s.name}</strong> is your weakest subject (avg ${s.pct}%). Focus here first — do at least 40 questions per session.`
        });
    });

    medium.forEach(s => {
        recs.push({
            icon: '△',
            color: 'var(--color-warning)',
            text: `<strong>${s.name}</strong> is on the edge (avg ${s.pct}%). A little more practice will push it into the strong zone.`
        });
    });

    if (strong.length > 0) {
        recs.push({
            icon: '✓',
            color: 'var(--color-success)',
            text: `Strong in <strong>${strong.map(s => s.name).join(', ')}</strong>. Keep them fresh with regular light practice.`
        });
    }

    if (improvement >= 20) {
        recs.push({
            icon: '📈',
            color: 'var(--color-primary)',
            text: `Great improvement — up <strong>${improvement} marks</strong> from your first attempt. Keep the momentum.`
        });
    } else if (improvement < -20) {
        recs.push({
            icon: '📉',
            color: 'var(--color-danger)',
            text: `Your score dropped <strong>${Math.abs(improvement)} marks</strong> from your first attempt. Review your weakest subject and retake.`
        });
    }

    if (recs.length === 0) {
        weakAreas.innerHTML = '<p class="text-muted">Take more attempts to get personalized recommendations.</p>';
    } else {
        weakAreas.innerHTML = recs.map(r => `
      <div class="rec-item" style="border-left-color:${r.color};">
        <span class="rec-icon" style="color:${r.color};">${r.icon}</span>
        <span>${r.text}</span>
      </div>
    `).join('');
    }

    // ---------- 7. ATTEMPT HISTORY TABLE ----------
    const tbody = document.getElementById('attemptBody');
    tbody.innerHTML = '';

    attempts.slice().reverse().forEach((a, i) => {
        const totalQ = (a.sections || []).reduce((s, sec) => s + sec.total, 0);
        const answered = Object.keys(a.answers || {}).length;
        const p = pct(a.totalScaled || 0, 400);

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${attempts.length - i}</td>
      <td>${new Date(a.submittedAt).toLocaleDateString()} ${new Date(a.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td><strong>${a.totalScaled || 0}</strong> / 400</td>
      <td><span class="pct-badge ${p >= 50 ? 'pass' : 'fail'}">${p}%</span></td>
      <td>${formatDuration(a.durationUsedSec || 0)}</td>
      <td>${answered} / ${totalQ}</td>
      <td>
        <button class="btn-mini" data-attempt-index="${attempts.length - 1 - i}">View</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // View attempt (loads into result/review)
    tbody.querySelectorAll('.btn-mini').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.attemptIndex, 10);
            // Store view index so result page can show that attempt
            sessionStorage.setItem('quickiePrep_view_attempt', String(idx));
            window.location.href = 'result.html';
        });
    });

    // ---------- 8. EXPORT ALL ----------
    document.getElementById('exportAllBtn').addEventListener('click', () => {
        const lines = [];
        lines.push('========================================');
        lines.push('      QUICKIE PREP — PROGRESS REPORT');
        lines.push('========================================');
        lines.push('');
        lines.push(`Candidate:  ${candidate.name}`);
        lines.push(`Email:      ${candidate.email}`);
        lines.push(`Course:     ${candidate.course || '—'}`);
        lines.push(`Exam Year:  ${candidate.examYear || '—'}`);
        lines.push(`Attempts:   ${attempts.length}`);
        lines.push('');
        lines.push('--- SCORES ---');
        lines.push(`Latest:     ${latestScore}/400`);
        lines.push(`Best:       ${bestScore}/400`);
        lines.push(`Average:    ${avgScore}/400`);
        lines.push(`Improvement: ${improvement >= 0 ? '+' : ''}${improvement}`);
        lines.push('');
        lines.push('--- ALL ATTEMPTS ---');
        attempts.forEach((a, i) => {
            lines.push(`${i + 1}. ${new Date(a.submittedAt).toLocaleString()} — ${a.totalScaled || 0}/400 (${pct(a.totalScaled || 0, 400)}%)`);
        });
        lines.push('');
        lines.push('--- SUBJECT AVERAGES ---');
        subjectPerf.forEach(s => {
            lines.push(`${s.name.padEnd(22)} ${s.pct}% (${s.correct}/${s.total})`);
        });
        lines.push('');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quickie-prep-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ---------- 9. CLEAR DATA ----------
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        const confirm1 = confirm('Delete ALL attempts for ' + candidate.email + '? This cannot be undone.');
        if (!confirm1) return;
        const confirm2 = confirm('Really sure? All progress will be erased.');
        if (!confirm2) return;

        Storage.deleteCandidate(candidate.email);
        localStorage.removeItem('quickiePrep_last_email');
        window.location.href = 'index.html';
    });

    console.log(`Dashboard loaded: ${attempts.length} attempts, avg ${avgScore}/400`);

})();