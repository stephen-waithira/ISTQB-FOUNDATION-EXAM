let questions = [];
let currentIndex = 0;
let userAnswers = {};
let timerDuration = 90 * 60; // 1 hour 30 minutes in seconds

async function loadQuestions() {
    const res = await fetch('questions.json');
    questions = await res.json();
    displayQuestion();
    startTimer();
}

function displayQuestion() {
    const q = questions[currentIndex];
    document.getElementById('question-text').textContent = `${currentIndex + 1}. ${q.question}`;

    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';

    q.choices.forEach((choice, index) => {
        const div = document.createElement('div');
        div.textContent = choice;
        div.classList.add('choice');

        div.addEventListener('click', () => checkAnswer(index, div));

        if (userAnswers[currentIndex] !== undefined) {
            const isCorrect = index === q.answer;
            if (index === userAnswers[currentIndex]) {
                div.classList.add(isCorrect ? 'correct' : 'wrong');
            }
        }

        choicesContainer.appendChild(div);
    });

    document.getElementById('explanation').classList.add('hidden');
    updateButtons();
}

function checkAnswer(selectedIndex) {
    if (userAnswers[currentIndex] !== undefined) return;

    userAnswers[currentIndex] = selectedIndex;
    const q = questions[currentIndex];
    const choices = document.querySelectorAll('.choice');
    const exp = document.getElementById('explanation');

    choices.forEach((c, i) => {
        if (i === q.answer) c.classList.add('correct');
        if (i === selectedIndex && i !== q.answer) c.classList.add('wrong');
    });

    if (q.explanation) {
        exp.textContent = `Explanation: ${q.explanation}`;
        exp.classList.remove('hidden');
        exp.classList.remove('correct', 'wrong');
        exp.classList.add(selectedIndex === q.answer ? 'correct' : 'wrong');
    }
}

function updateButtons() {
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').disabled = currentIndex === questions.length - 1;
}

document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    }
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayQuestion();
    }
});

document.getElementById('skip-btn').addEventListener('click', () => {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    }
});

function startTimer() {
    const timerEl = document.getElementById('time-text');
    const interval = setInterval(() => {
        let minutes = Math.floor(timerDuration / 60);
        let seconds = timerDuration % 60;
        timerEl.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerDuration--;

        if (timerDuration < 0) {
            clearInterval(interval);
            alert('Time is up!');
        }
    }, 1000);
}

loadQuestions();
