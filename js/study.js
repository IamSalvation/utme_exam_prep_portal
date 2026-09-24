/* =========================================================
   Study Mode — Controller
   ========================================================= */

let studyIndex = 0;

function renderStudy() {
    const q = questionBank[studyIndex];
    const area = document.getElementById("study-area");

    const optionsHtml = q.options.map((opt, i) => {
        const cls = i === q.answer ? "option-label correct" : "option-label";
        return '<div class="' + cls + '">' +
            String.fromCharCode(65 + i) + '. ' + opt +
            '</div>';
    }).join("");

    area.innerHTML =
        '<h3>Question ' + (studyIndex + 1) + ' of ' + questionBank.length + '</h3>' +
        '<p class="text-muted">Subject: ' + q.subject + ' - ' + q.section + '</p>' +
        '<p style="font-size: 18px; margin: 14px 0;"><strong>' + q.question + '</strong></p>' +
        '<div class="options-group">' + optionsHtml + '</div>' +
        '<div class="explanation"><strong>Explanation:</strong> ' + q.explanation + '</div>';

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