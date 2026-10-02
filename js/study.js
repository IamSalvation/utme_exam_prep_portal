/* =========================================================
   Study Mode — Controller
   ========================================================= */

let studyIndex = 0;

function renderStudy() {
    const q = questionBank[studyIndex];
    const area = document.getElementById("study-area");

    const hasAnswer = q.answer !== null && q.answer !== undefined && !q.needsAnswer;

    const optionsHtml = q.options.map((opt, i) => {
        let cls = "option-label";
        let marker = "";
        if (hasAnswer && i === q.answer) {
            cls += " correct";
            marker = " ✅";
        }
        return '<div class="' + cls + '">' +
            String.fromCharCode(65 + i) + '. ' + opt + marker +
            '</div>';
    }).join("");

    const answerNote = hasAnswer
        ? '<div class="explanation"><strong>Explanation:</strong> ' + q.explanation + '</div>'
        : '<div class="explanation" style="background:#fff4e1; border-left-color:#ff9800;">' +
        '<strong>Answer not yet verified.</strong> Review the question and choose the correct option yourself.</div>';

    area.innerHTML =
        '<h3>Question ' + (studyIndex + 1) + ' of ' + questionBank.length + '</h3>' +
        '<p class="text-muted">Subject: ' + q.subject + ' · ' + q.section + '</p>' +
        '<p style="font-size: 18px; margin: 14px 0;"><strong>' + q.question + '</strong></p>' +
        '<div class="options-group">' + optionsHtml + '</div>' +
        answerNote;

    document.getElementById("progress").style.width =
        ((studyIndex + 1) / questionBank.length) * 100 + "%";

    document.getElementById("prevBtn").disabled = studyIndex === 0;
    document.getElementById("nextBtn").disabled = studyIndex === questionBank.length - 1;
}

function nextQuestion() {
    if (studyIndex < questionBank.length - 1) { studyIndex++; renderStudy(); }
}

function prevQuestion() {
    if (studyIndex > 0) { studyIndex--; renderStudy(); }
}

renderStudy();