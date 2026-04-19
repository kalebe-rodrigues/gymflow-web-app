function sanitizeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

let workouts = JSON.parse(localStorage.getItem('gymFlowData')) || { A: [], B: [], C: [], D: [], E: [] };
let tabStates = JSON.parse(localStorage.getItem('gymFlowTabStates')) || { A: 'finalizar', B: 'finalizar', C: 'finalizar', D: 'finalizar', E: 'finalizar' };
let timerInterval = null;
let currentTab = 'A';
let timer = {
    totalSecondsAtPause: parseInt(localStorage.getItem('timerSeconds')) || 0,
    startTime: localStorage.getItem('timerStartTime') ? parseInt(localStorage.getItem('timerStartTime')) : null,
    isRunning: localStorage.getItem('timerRunning') === 'true'
};

window.onload = () => {
    updateDate();
    initTimerLogic();
    renderExercises();
    initEventListeners();
    initSortable();
    const btn = document.getElementById('finish-btn');
    if (btn) btn.dataset.state = tabStates['A'];
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.classList.add('splash-hidden');
    }, 800);
};

function initEventListeners() {
    document.getElementById('start-btn').addEventListener('click', () => startTimer());
    document.getElementById('pause-btn').addEventListener('click', pauseTimer);
    document.getElementById('reset-btn').addEventListener('click', resetTimer);
    document.querySelector('.tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            switchTab(e.target.getAttribute('data-tab'));
        }
    });
    const input = document.getElementById('exerciseInput');
    const addBtn = document.getElementById('add-exercise-btn');
    addBtn.addEventListener('click', addExercise);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addExercise(); });
    document.getElementById('finish-btn').addEventListener('click', finishWorkout);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);
    const listContainer = document.getElementById('exerciseList');
    listContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.exercise-card');
        if (!card) return;
        const id = Number(card.dataset.id);
        if (e.target.type === 'checkbox') {
            toggleExercise(id);
        } else if (e.target.classList.contains('exercise-name')) {
            editExerciseName(id);
        } else if (e.target.tagName === 'BUTTON') {
            if (confirm("Deseja excluir este exercício?")) {
                deleteExercise(id);
            }
        }
    });
    listContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('exercise-note')) {
            updateNote(Number(e.target.closest('.exercise-card').dataset.id), e.target.value);
        }
    });
}

function editExerciseName(id) {
    const ex = workouts[currentTab].find(e => e.id === id);
    const newName = prompt("Editar nome do exercício:", ex.name);
    if (newName !== null && newName.trim() !== "") {
        ex.name = newName.trim();
        saveWorkouts();
        renderExercises();
    }
}

function initSortable() {
    const list = document.getElementById('exerciseList');
    Sortable.create(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        delay: 500,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        onEnd: saveNewOrder
    });
}

function saveNewOrder() {
    const listItems = document.querySelectorAll('.exercise-card');
    const newOrder = [];
    listItems.forEach(item => {
        const id = Number(item.dataset.id);
        const exercise = workouts[currentTab].find(ex => ex.id === id);
        if (exercise) newOrder.push(exercise);
    });
    workouts[currentTab] = newOrder;
    saveWorkouts();
}

function initTimerLogic() {
    if (timer.isRunning && timer.startTime) {
        startTimer(true);
    } else {
        updateTimerUI();
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && timer.isRunning && timer.startTime) {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        updateTimerUI(elapsed);
    }
});

function startTimer(isResuming = false) {
    if (!isResuming) {
        timer.startTime = Date.now() - (timer.totalSecondsAtPause * 1000);
        timer.isRunning = true;
        saveTimerState();
    }
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        updateTimerUI(elapsed);
    }, 1000);
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'inline-block';
}

function pauseTimer() {
    clearInterval(timerInterval);
    if (timer.startTime) {
        timer.totalSecondsAtPause = Math.floor((Date.now() - timer.startTime) / 1000);
    }
    timer.isRunning = false;
    timer.startTime = null;
    saveTimerState();
    document.getElementById('start-btn').style.display = 'inline-block';
    document.getElementById('pause-btn').style.display = 'none';
}

function resetTimer() {
    clearInterval(timerInterval);
    timer.totalSecondsAtPause = 0;
    timer.startTime = null;
    timer.isRunning = false;
    saveTimerState();
    updateTimerUI(0);
    document.getElementById('start-btn').style.display = 'inline-block';
    document.getElementById('pause-btn').style.display = 'none';
}

function updateTimerUI(secondsOverride) {
    let s = (secondsOverride !== undefined) ? secondsOverride : timer.totalSecondsAtPause;
    const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
    const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${hrs}:${mins}:${secs}`;
}

function saveTimerState() {
    localStorage.setItem('timerSeconds', timer.totalSecondsAtPause);
    localStorage.setItem('timerRunning', timer.isRunning);
    localStorage.setItem('timerStartTime', timer.startTime || "");
}

function updateDate() {
    const options = { weekday: 'short', day: 'numeric', month: 'long' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', options).toUpperCase();
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('workout-title-display').innerText = `Treino ${tab}`;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    const btn = document.getElementById('finish-btn');
    const state = tabStates[currentTab];
    if (state === "reiniciar") {
        btn.dataset.state = "reiniciar";
        btn.innerText = "REINICIAR TREINO";
        btn.style.background = "transparent";
        btn.style.border = "2px solid var(--primary-green)";
        btn.style.color = "var(--primary-green)";
    } else {
        btn.dataset.state = "finalizar";
        btn.style.background = "";
        btn.style.border = "";
        btn.style.color = "";
        btn.innerText = "FINALIZAR TREINO";
    }
    renderExercises();
}

function addExercise() {
    const input = document.getElementById('exerciseInput');
    const val = input.value.trim();
    if (!val) return;
    const parts = val.split(';');
    workouts[currentTab].push({ id: Date.now(), name: parts[0].trim(), note: parts[1] ? parts[1].trim() : '', completed: false });
    saveWorkouts();
    input.value = '';
    renderExercises();
}

function renderExercises() {
    const container = document.getElementById('exerciseList');
    container.innerHTML = '';
    const list = workouts[currentTab];
    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">A sua lista de exercícios está vazia.</div>`;
        updateProgressBar();
        return;
    }
    list.forEach(ex => {
        const li = document.createElement('li');
        li.className = 'exercise-card';
        li.dataset.id = ex.id;
        if (ex.completed) li.style.opacity = '0.4';
        li.innerHTML = `<div class="card-main"><input type="checkbox" ${ex.completed ? 'checked' : ''}><span class="exercise-name" style="cursor:pointer">${sanitizeHTML(ex.name)}</span><button style="background:none; border:none; color:#FF453A; font-size:18px">✕</button></div><input type="text" class="exercise-note" value="${sanitizeHTML(ex.note)}" placeholder="Notas...">`;
        container.appendChild(li);
    });
    updateProgressBar();
}

function toggleExercise(id) {
    const ex = workouts[currentTab].find(e => e.id === id);
    if (ex) { ex.completed = !ex.completed; saveWorkouts(); renderExercises(); }
}

function deleteExercise(id) {
    workouts[currentTab] = workouts[currentTab].filter(e => e.id !== id);
    saveWorkouts();
    renderExercises();
}

function updateNote(id, noteValue) {
    const ex = workouts[currentTab].find(e => e.id === id);
    if (ex) { ex.note = noteValue; saveWorkouts(); }
}

function saveWorkouts() { localStorage.setItem('gymFlowData', JSON.stringify(workouts)); }

function updateProgressBar() {
    const list = workouts[currentTab];
    const done = list.filter(ex => ex.completed).length;
    const percent = list.length === 0 ? 0 : (done / list.length) * 100;
    document.getElementById('progress-bar').style.width = percent + "%";
    document.getElementById('finish-btn').style.display = (list.length > 0 && percent === 100) ? 'block' : "none";
    if (percent < 100 && tabStates[currentTab] === "reiniciar") {
        tabStates[currentTab] = "finalizar";
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
        const btn = document.getElementById('finish-btn');
        btn.dataset.state = "finalizar";
        btn.style.background = ""; btn.style.border = ""; btn.style.color = ""; btn.innerText = "FINALIZAR TREINO";
    }
}

function finishWorkout() {
    const btn = document.getElementById('finish-btn');
    if (btn.dataset.state !== "reiniciar") {
        alert("TREINO CONCLUÍDO!");
        pauseTimer();
        btn.dataset.state = "reiniciar";
        btn.innerText = "REINICIAR TREINO";
        btn.style.background = "transparent"; btn.style.border = "2px solid var(--primary-green)"; btn.style.color = "var(--primary-green)";
        tabStates[currentTab] = "reiniciar";
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
    } else if (confirm("Deseja desmarcar todos os exercícios?")) {
        workouts[currentTab].forEach(ex => ex.completed = false);
        saveWorkouts();
        btn.dataset.state = "finalizar";
        btn.style.background = ""; btn.style.border = ""; btn.style.color = ""; btn.innerText = "FINALIZAR TREINO";
        tabStates[currentTab] = "finalizar";
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
        renderExercises();
    }
}

function exportData() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(workouts)], { type: "application/json" }));
    a.download = `gymflow_backup.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.A) { workouts = imported; saveWorkouts(); renderExercises(); alert('Sucesso!'); }
        } catch (err) { alert('Erro!'); }
    };
    if (e.target.files[0]) { reader.readAsText(e.target.files[0]); e.target.value = ''; }
}