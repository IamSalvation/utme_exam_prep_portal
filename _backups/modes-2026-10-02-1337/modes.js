/* =========================================================
   Quickie Prep — Exam Modes
   Defines the 3 exam configurations.
   ========================================================= */

const EXAM_MODES = {
    full: {
        key: 'full',
        label: 'Full Mock',
        questions: 180,
        minutes: 120,
        maxScore: 400,
        description: '180 questions · 2 hours · 400 marks',
        english: 60,
        elective: 40
    },
    half: {
        key: 'half',
        label: 'Half Mock',
        questions: 90,
        minutes: 60,
        maxScore: 200,
        description: '90 questions · 1 hour · 200 marks',
        english: 30,
        elective: 20
    },
    quick: {
        key: 'quick',
        label: 'Quick Mock',
        questions: 45,
        minutes: 30,
        maxScore: 100,
        description: '45 questions · 30 minutes · 100 marks',
        english: 15,
        elective: 10
    }
};

function getExamMode(key) {
    return EXAM_MODES[key] || EXAM_MODES.full;
}

window.EXAM_MODES = EXAM_MODES;
window.getExamMode = getExamMode;