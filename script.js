const SELECTORS = {
    questionText: 'question-text',
    choicesContainer: 'choices-container',
    explanation: 'explanation',
    prevBtn: 'prev-btn',
    nextBtn: 'next-btn',
    skipBtn: 'skip-btn',
    timeText: 'time-text',
    summary: 'summary',
    navigator: 'navigator',
    spinner: 'spinner'
};

let questions = [];
let currentIndex = 0;
let userAnswers = {};
let timerDuration = 90 * 60;
let timerStarted = false;
let timerInterval = null;
let loading = false;

function $(id) {
    return document.getElementById(id);
}

function showSpinner(show) {
    loading = show;
    if ($(SELECTORS.spinner)) {
        $(SELECTORS.spinner).style.display = show ? 'block' : 'none';
    }
    setNavButtonsDisabled(show);
}

function setNavButtonsDisabled(disabled) {
    $(SELECTORS.prevBtn).disabled = disabled || currentIndex === 0;
    $(SELECTORS.nextBtn).disabled = disabled || currentIndex === questions.length - 1;
    $(SELECTORS.skipBtn).disabled = disabled;
}

function saveProgress() {
    localStorage.setItem('istqb_progress', JSON.stringify({
        currentIndex,
        userAnswers,
        timerDuration
    }));
}

function loadProgress() {
    const data = localStorage.getItem('istqb_progress');
    if (data) {
        try {
            const obj = JSON.parse(data);
            currentIndex = obj.currentIndex || 0;
            userAnswers = obj.userAnswers || {};
            timerDuration = obj.timerDuration || timerDuration;
        } catch { /* ignore */ }
    }
}

async function loadQuestions() {
    showSpinner(true);
    try {
        const res = await fetch('questions.json');
        if (!res.ok) throw new Error('Failed to load questions');
        questions = await res.json();
        if (!Array.isArray(questions) || questions.length === 0) {
            alert('No questions found.');
            showSpinner(false);
            return;
        }
        loadProgress();
        displayQuestion();
        renderNavigator();
        if (!timerStarted) {
            startTimer();
            timerStarted = true;
        }
    } catch (error) {
        console.error("Failed to load questions:", error);
        alert("Failed to load questions: " + error.message);
    }
    showSpinner(false);
}

function displayQuestion() {
    if (!questions[currentIndex]) return;

    let q = questions[currentIndex];
    let questionText = `${currentIndex + 1}. ${q.question}`;
    if (userAnswers[currentIndex] === "skipped") questionText += " (Skipped)";
    $(SELECTORS.questionText).textContent = questionText;

    const choicesContainer = $(SELECTORS.choicesContainer);
    choicesContainer.innerHTML = '';

    q.choices.forEach((choice, index) => {
        const div = document.createElement('div');
        div.textContent = choice;
        div.classList.add('choice');
        div.setAttribute('tabindex', 0);
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', choice);

        div.addEventListener('click', () => checkAnswer(index));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') checkAnswer(index);
            if (e.key === 'ArrowDown') focusChoice(index + 1);
            if (e.key === 'ArrowUp') focusChoice(index - 1);
        });

        // Restore previous state
        if (userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== "skipped") {
            const isCorrect = index === q.answer;
            if (index === userAnswers[currentIndex]) {
                div.classList.add(isCorrect ? 'correct' : 'wrong');
            }
            div.setAttribute('aria-disabled', 'true');
        }

        choicesContainer.appendChild(div);
    });

    $(SELECTORS.explanation).classList.add('hidden');
    updateButtons();
    updateNavigator();
    updateRemaining();
    saveProgress();
}

function focusChoice(idx) {
    const choices = document.querySelectorAll('.choice');
    if (choices[idx]) choices[idx].focus();
}

function checkAnswer(selectedIndex) {
    if (userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== "skipped") return;

    userAnswers[currentIndex] = selectedIndex;
    const q = questions[currentIndex];
    const choices = document.querySelectorAll('.choice');
    const exp = $(SELECTORS.explanation);

    choices.forEach((c, i) => {
        c.setAttribute('aria-disabled', 'true');
        if (i === q.answer) c.classList.add('correct');
        if (i === selectedIndex && i !== q.answer) c.classList.add('wrong');
    });

    if (q.explanation) {
        exp.textContent = `Explanation: ${q.explanation}`;
        exp.classList.remove('hidden');
        exp.classList.remove('correct', 'wrong');
        exp.classList.add(selectedIndex === q.answer ? 'correct' : 'wrong');
    }
    saveProgress();
    updateNavigator();
    if (isQuizComplete()) showSummary();
}

function updateButtons() {
    setNavButtonsDisabled(loading);
}

function updateRemaining() {
    if (!$(SELECTORS.summary)) return;
    const answered = Object.keys(userAnswers).length;
    $(SELECTORS.summary).textContent = `Answered: ${answered}/${questions.length}`;
}

function renderNavigator() {
    const nav = $(SELECTORS.navigator);
    if (!nav) return;
    nav.innerHTML = '';
    questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.textContent = i + 1;
        btn.className = 'nav-btn';
        btn.setAttribute('tabindex', 0);
        btn.setAttribute('aria-label', `Go to question ${i + 1}`);
        if (i === currentIndex) btn.classList.add('active');
        if (userAnswers[i] !== undefined) btn.classList.add('answered');
        if (userAnswers[i] === "skipped") btn.classList.add('skipped');
        btn.addEventListener('click', () => {
            if (loading) return;
            currentIndex = i;
            displayQuestion();
        });
        btn.addEventListener('keydown', (e) => {
            if (loading) return;
            if (e.key === 'Enter' || e.key === ' ') {
                currentIndex = i;
                displayQuestion();
            }
            if (e.key === 'ArrowRight') focusNavBtn(i + 1);
            if (e.key === 'ArrowLeft') focusNavBtn(i - 1);
        });
        nav.appendChild(btn);
    });
}

function focusNavBtn(idx) {
    const navBtns = document.querySelectorAll('.nav-btn');
    if (navBtns[idx]) navBtns[idx].focus();
}

function updateNavigator() {
    const nav = $(SELECTORS.navigator);
    if (!nav) return;
    Array.from(nav.children).forEach((btn, i) => {
        btn.classList.toggle('active', i === currentIndex);
        btn.classList.toggle('answered', userAnswers[i] !== undefined);
        btn.classList.toggle('skipped', userAnswers[i] === "skipped");
    });
}

function isQuizComplete() {
    return Object.keys(userAnswers).length === questions.length;
}

function showSummary() {
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q, i) => {
        if (userAnswers[i] === "skipped") skipped++;
        else if (userAnswers[i] === q.answer) correct++;
        else if (userAnswers[i] !== undefined) wrong++;
    });
    alert(`Quiz Complete!\nCorrect: ${correct}\nWrong: ${wrong}\nSkipped: ${skipped}`);
}

$(SELECTORS.nextBtn).addEventListener('click', () => {
    if (loading) return;
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    }
});

$(SELECTORS.prevBtn).addEventListener('click', () => {
    if (loading) return;
    if (currentIndex > 0) {
        currentIndex--;
        displayQuestion();
    }
});

$(SELECTORS.skipBtn).addEventListener('click', () => {
    if (loading) return;
    userAnswers[currentIndex] = "skipped";
    saveProgress();
    updateNavigator();
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    } else if (isQuizComplete()) {
        showSummary();
    }
});

function startTimer() {
    const timerEl = $(SELECTORS.timeText);
    timerInterval = setInterval(() => {
        if (timerDuration < 0) {
            clearInterval(timerInterval);
            timerEl.textContent = "00:00:00";
            alert('Time is up!');
            showSummary();
            return;
        }
        let hours = Math.floor(timerDuration / 3600);
        let minutes = Math.floor((timerDuration % 3600) / 60);
        let seconds = timerDuration % 60;

        timerEl.textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        timerDuration--;
        saveProgress();
    }, 1000);
}

window.addEventListener('beforeunload', saveProgress);

loadQuestions();
