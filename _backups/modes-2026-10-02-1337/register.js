/* =========================================================
   Quickie Prep — Registration Logic
   ========================================================= */

(function () {

    // ---------- 1. NORMALIZE SUBJECT NAME ----------
    function normalizeSubject(raw) {
        const s = (raw || '').trim().toLowerCase();
        if (s === 'english' || s === 'use of english' || s === 'english language') return 'Use of English';
        if (s === 'crk' || s === 'christian religious knowledge') return 'CRK';
        if (s === 'irk' || s === 'islamic religious knowledge') return 'IRK';
        if (s === 'religious studies') return 'Religious Studies';
        if (s === 'literature' || s === 'literature-in-english' || s === 'literature in english') return 'Literature';
        if (s === 'accounts' || s === 'principles of accounts' || s === 'accounting') return 'Accounts';
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

    // ---------- 2. BUILD AVAILABLE ELECTIVE LIST ----------
    const subjectSet = new Map();
    questionBank.forEach(q => {
        const name = normalizeSubject(q.subject || 'Other');
        if (name === 'Use of English') return;
        if (!subjectSet.has(name)) subjectSet.set(name, { name, count: 0 });
        subjectSet.get(name).count++;
    });

    const electives = [...subjectSet.values()]
        .filter(s => s.count >= 20)
        .sort((a, b) => a.name.localeCompare(b.name));

    // ---------- 3. POPULATE DROPDOWNS ----------
    const selects = document.querySelectorAll('.elective-select');
    selects.forEach(sel => {
        sel.innerHTML = '<option value="">— Select subject —</option>';
        electives.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = `${s.name}  (${s.count} questions)`;
            sel.appendChild(opt);
        });
    });

    // ---------- 4. POPULATE EXAM YEAR ----------
    const yearSelect = document.getElementById('examYear');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y <= currentYear + 3; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear + 1) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // ---------- 5. CHECK FOR EXISTING PROFILE ----------
    const emailInput = document.getElementById('emailInput');
    const existingProfile = document.getElementById('existingProfile');

    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim().toLowerCase();
        if (!email) {
            existingProfile.style.display = 'none';
            return;
        }
        const candidate = Storage.getCandidate(email);
        if (candidate) {
            const attempts = (candidate.attempts || []).length;
            existingProfile.style.display = 'block';
            existingProfile.innerHTML = `✓ Profile found for <strong>${candidate.name}</strong> · ${attempts} past attempt${attempts === 1 ? '' : 's'}. Details pre-filled.`;

            document.querySelector('input[name="name"]').value = candidate.name || '';
            document.querySelector('input[name="phone"]').value = candidate.phone || '';
            document.querySelector('input[name="course"]').value = candidate.course || '';
            if (candidate.examYear) yearSelect.value = candidate.examYear;

            if (candidate.subjects) {
                const elec = candidate.subjects.filter(s => !/english/i.test(s));
                selects.forEach((sel, i) => {
                    if (elec[i]) sel.value = elec[i];
                });
            }

            // Restore last mode
            if (candidate.lastMode) {
                const radio = document.querySelector(`input[name="examMode"][value="${candidate.lastMode}"]`);
                if (radio) radio.checked = true;
            }
        } else {
            existingProfile.style.display = 'none';
        }
    });

    // ---------- 6. FORM SUBMIT ----------
    const form = document.getElementById('regForm');
    const formError = document.getElementById('formError');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        formError.style.display = 'none';

        const data = Object.fromEntries(new FormData(form).entries());

        const name = (data.name || '').trim();
        const email = (data.email || '').trim().toLowerCase();
        const course = (data.course || '').trim();
        const examYear = data.examYear;
        const electivesChosen = [data.elective1, data.elective2, data.elective3].filter(Boolean);
        const examMode = data.examMode || 'full';

        if (!name) { showError('Please enter your full name.'); return; }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showError('Please enter a valid email address.'); return; }
        if (!course) { showError('Please enter your target course.'); return; }
        if (!examYear) { showError('Please choose your exam year.'); return; }
        if (electivesChosen.length !== 3) { showError('Please choose 3 electives.'); return; }

        const unique = new Set(electivesChosen);
        if (unique.size < 3) { showError('Please choose 3 DIFFERENT electives.'); return; }

        // Electives need at least 40 questions
        for (const subj of electivesChosen) {
            const s = subjectSet.get(subj);
            if (!s || s.count < 40) {
                showError(`"${subj}" doesn't have enough questions (needs 40, has ${s ? s.count : 0}).`);
                return;
            }
        }

        // Save candidate
        const candidate = {
            name,
            email,
            phone: (data.phone || '').trim(),
            course,
            examYear,
            subjects: ['Use of English', ...electivesChosen],
            lastMode: examMode,
            registeredAt: new Date().toISOString()
        };

        try {
            Storage.saveCandidate(candidate);
            localStorage.setItem('quickiePrep_last_email', email);
        } catch (err) {
            showError('Could not save: ' + err.message);
            return;
        }

        // Save a fresh session with exam mode + subjects
        if (Storage.clearSession) Storage.clearSession();

        Storage.saveSession({
            email,
            name,
            examMode,
            subjects: ['Use of English', ...electivesChosen],
            startedAt: new Date().toISOString(),
            submitted: false,
            userAnswers: {},
            currentIndex: 0
        });

        window.location.href = 'instructions.html';
    });

    function showError(msg) {
        formError.textContent = msg;
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

})();