/* =========================================================
   Quickie Prep — Storage Layer
   Handles all localStorage: candidates, attempts, session.
   Key format: quickiePrep_candidate_<email>
   ========================================================= */

const Storage = (function () {
    const CANDIDATE_PREFIX = 'quickiePrep_candidate_';
    const SESSION_KEY = 'quickiePrep_session';
    const SPLASH_KEY = 'quickiePrep_splash_shown';

    // ---------- Helpers ----------
    function safeParse(json) {
        try { return JSON.parse(json); } catch { return null; }
    }

    function normalizeEmail(email) {
        return (email || '').trim().toLowerCase();
    }

    function candidateKey(email) {
        return CANDIDATE_PREFIX + normalizeEmail(email);
    }

    // ---------- Candidate ----------
    function getCandidate(email) {
        const raw = localStorage.getItem(candidateKey(email));
        return raw ? safeParse(raw) : null;
    }

    function saveCandidate(candidate) {
        if (!candidate || !candidate.email) {
            throw new Error('Candidate must have an email');
        }
        const key = candidateKey(candidate.email);
        const existing = getCandidate(candidate.email) || {};
        const merged = {
            ...existing,
            ...candidate,
            attempts: existing.attempts || [],
            createdAt: existing.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
    }

    function deleteCandidate(email) {
        localStorage.removeItem(candidateKey(email));
    }

    function listAllCandidates() {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CANDIDATE_PREFIX)) {
                const c = safeParse(localStorage.getItem(k));
                if (c) out.push(c);
            }
        }
        return out;
    }

    // ---------- Attempts ----------
    function saveAttempt(email, attempt) {
        const candidate = getCandidate(email);
        if (!candidate) throw new Error('Candidate not found: ' + email);
        candidate.attempts = candidate.attempts || [];
        candidate.attempts.push({
            ...attempt,
            id: 'attempt_' + Date.now(),
            completedAt: new Date().toISOString()
        });
        candidate.updatedAt = new Date().toISOString();
        localStorage.setItem(candidateKey(email), JSON.stringify(candidate));
        return candidate.attempts[candidate.attempts.length - 1];
    }

    function getAttempts(email) {
        const c = getCandidate(email);
        return (c && c.attempts) ? c.attempts : [];
    }

    function getLatestAttempt(email) {
        const a = getAttempts(email);
        return a.length ? a[a.length - 1] : null;
    }

    function getBestAttempt(email) {
        const a = getAttempts(email);
        if (!a.length) return null;
        return a.reduce((best, curr) =>
            (curr.totalScaled || 0) > (best.totalScaled || 0) ? curr : best
        );
    }

    // ---------- Session (in-progress exam) ----------
    function saveSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...session,
            updatedAt: new Date().toISOString()
        }));
    }

    function getSession() {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? safeParse(raw) : null;
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function hasActiveSession() {
        const s = getSession();
        return !!(s && s.questions && s.questions.length && !s.submitted);
    }

    // ---------- Splash ----------
    function hasSeenSplash() {
        return sessionStorage.getItem(SPLASH_KEY) === '1';
    }

    function markSplashShown() {
        sessionStorage.setItem(SPLASH_KEY, '1');
    }

    // ---------- Public API ----------
    return {
        getCandidate,
        saveCandidate,
        deleteCandidate,
        listAllCandidates,
        saveAttempt,
        getAttempts,
        getLatestAttempt,
        getBestAttempt,
        saveSession,
        getSession,
        clearSession,
        hasActiveSession,
        hasSeenSplash,
        markSplashShown
    };
})();

window.Storage = Storage;