/* =========================================================
   Mock Exam — Engine
   ========================================================= */

const EXAM_DURATION = 10800;
const PASS_THRESHOLD = 50;   // percent

let currentQuestionIndex = 0;
let userAnswers = {};
let timeLeft = EXAM_DURATION;
let timerInterval;

document.getElementById("duration-label").textContent =
    Math.floor(EXAM_DURATION / 60) + " minutes";
document.getElementById("total-questions").textContent = questionBank.length;

function startExam() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("exam-screen").style.display = "block";
    startTimer();
    loadQuestion(0);
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(function () {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time is up. Your exam will now be submitted.");
            submitExam(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById("timer").textContent = m + ":" + (s < 10 ? "0" : "") + s;
}

function loadQuestion(index) {
    currentQuestionIndex = index;
    const q = questionBank[index];
    const container = document.getElementById("question-container");

    const optionsHtml = q.options.map(function (opt, i) {
        const checked = userAnswers[index] === i ? "checked" : "";
        return '<label class="option-label">' +
            '<input type="radio" name="q-' + q.id + '" value="' + i + '" ' +
            checked + ' onchange="saveAnswer(' + index + ', ' + i + ')">' +
            opt +
            '</label>';
    }).join("");

    container.innerHTML =
        '<h3>Question ' + (index + 1) + ' of ' + questionBank.length + '</h3>' +
        '<p class="text-muted">' + q.subject + ' - ' + q.section + '</p>' +
        '<p><strong>' + q.question + '</strong></p>' +
        '<div class="options-group">' + optionsHtml + '</div>';

    document.getElementById("progress").style.width =
        ((index + 1) / questionBank.length) * 100 + "%";
}

function saveAnswer(qIndex, optIndex) { userAnswers[qIndex] = optIndex; }

function nextQuestion() {
    if (currentQuestionIndex < questionBank.length - 1) loadQuestion(currentQuestionIndex + 1);
}

function prevQuestion() {
    if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
}

function submitExam(auto) {
    if (auto === undefined) auto = false;
    if (!auto && !confirm("Submit your exam? You cannot change answers afterward.")) return;

    clearInterval(timerInterval);
    document.getElementById("exam-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "block";

    let score = 0;
    questionBank.forEach(function (q, i) { if (userAnswers[i] === q.answer) score++; });

    const pct = ((score / questionBank.length) * 100).toFixed(1);
    const passed = pct >= PASS_THRESHOLD;

    document.getElementById("score-display").innerHTML =
        '<h2>' + (passed ? "Passed" : "Keep Practicing") + '</h2>' +
        '<p class="big">' + score + ' / ' + questionBank.length + '</p>' +
        '<p>Score: <strong>' + pct + '%</strong></p>';

    renderReview();
}

function renderReview() {
    const reviewHtml = questionBank.map(function (q, i) {
        const user = userAnswers[i];
        const correct = q.answer;

        const optsHtml = q.options.map(function (opt, j) {
            let cls = "option-label";
            if (j === correct) cls += " correct";
            else if (j === user) cls += " incorrect";

            const mark = j === correct ? " [correct]" : (j === user ? " [your answer]" : "");
            return '<div class="' + cls + '">' + opt + mark + '</div>';
        }).join("");

        const omitted = user === undefined
            ? '<p style="color:#dc3545;"><em>Not answered</em></p>'
            : "";

        return '<div style="margin-bottom: 20px; padding: 16px; border:1px solid #eee; border-radius:8px;">' +
            '<p class="text-muted">Q' + (i + 1) + ' - ' + q.subject + ' - ' + q.section + '</p>' +
            '<p><strong>' + q.question + '</strong></p>' +
            '<div class="options-group">' + optsHtml + '</div>' +
            omitted +
            '<div class="explanation">' + q.explanation + '</div>' +
            '</div>';
    }).join("");

    document.getElementById("review-container").innerHTML =
        '<h3>Detailed Review</h3>' + reviewHtml;
}