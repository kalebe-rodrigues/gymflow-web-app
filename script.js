// ── Utilitários ──────────────────────────────────────────────────────────────

function sanitizeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ── Sistema de Modal Customizado ──────────────────────────────────────────────
// Substitui alert(), confirm() e prompt() nativos, que bloqueiam a thread
// e quebram a experiência visual em PWAs/webapps modernos.

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalActions = document.getElementById('modal-actions');

// Fecha o modal limpando estado e ocultando o overlay.
// Reseta onclick para evitar que o handler de showConfirm vaze para modais seguintes.
function closeModal() {
    modalOverlay.classList.remove('modal-visible');
    modalOverlay.onclick = null;
    modalInput.style.display = 'none';
    modalInput.value = '';
    modalActions.innerHTML = '';
}

/**
 * Exibe um modal informativo (equivalente a alert()).
 * @param {string} message - Texto exibido no modal.
 * @returns {Promise<void>} Resolve quando o usuário confirma.
 */
function showAlert(message) {
    return new Promise(resolve => {
        modalTitle.textContent = message;

        const btnOk = document.createElement('button');
        btnOk.textContent = 'OK';
        btnOk.className = 'modal-btn-confirm';
        btnOk.addEventListener('click', () => { closeModal(); resolve(); });

        modalActions.appendChild(btnOk);
        modalOverlay.classList.add('modal-visible');
        btnOk.focus();
    });
}

/**
 * Exibe um modal de confirmação (equivalente a confirm()).
 * @param {string} message  - Pergunta exibida ao usuário.
 * @param {string} [confirmStyle='danger'] - Estilo do botão de confirmação: 'danger' | 'confirm'.
 * @returns {Promise<boolean>} Resolve com true (confirmou) ou false (cancelou).
 */
function showConfirm(message, confirmStyle = 'danger') {
    return new Promise(resolve => {
        modalTitle.textContent = message;

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancelar';
        btnCancel.className = 'modal-btn-cancel';
        btnCancel.addEventListener('click', () => { closeModal(); resolve(false); });

        const btnOk = document.createElement('button');
        btnOk.textContent = 'Confirmar';
        btnOk.className = confirmStyle === 'danger' ? 'modal-btn-danger' : 'modal-btn-confirm';
        btnOk.addEventListener('click', () => { closeModal(); resolve(true); });

        modalActions.append(btnCancel, btnOk);
        modalOverlay.classList.add('modal-visible');

        // Fechar ao clicar fora do modal-box
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) { closeModal(); resolve(false); }
        };

        btnOk.focus();
    });
}

// ── Estado da Aplicação ───────────────────────────────────────────────────────

let workouts = JSON.parse(localStorage.getItem('gymFlowData')) || { A: [], B: [], C: [], D: [], E: [] };
let tabStates = JSON.parse(localStorage.getItem('gymFlowTabStates')) || { A: 'finalizar', B: 'finalizar', C: 'finalizar', D: 'finalizar', E: 'finalizar' };
let timerInterval = null;
let currentTab = 'A';
let timer = {
    totalSecondsAtPause: parseInt(localStorage.getItem('timerSeconds')) || 0,
    startTime: localStorage.getItem('timerStartTime') ? parseInt(localStorage.getItem('timerStartTime')) : null,
    isRunning: localStorage.getItem('timerRunning') === 'true'
};

// ── Inicialização ─────────────────────────────────────────────────────────────

window.onload = () => {
    updateDate();
    initTimerLogic();
    renderExercises();
    initEventListeners();
    initSortable();

    const btn = document.getElementById('finish-btn');
    if (btn) btn.dataset.state = tabStates['A'];

    // Ocultar splash após animação
    const splash = document.getElementById('splash-screen');
    setTimeout(() => splash.classList.add('splash-hidden'), 800);
};

function initEventListeners() {
    document.getElementById('start-btn').addEventListener('click', () => startTimer());
    document.getElementById('pause-btn').addEventListener('click', pauseTimer);
    document.getElementById('reset-btn').addEventListener('click', resetTimer);

    document.querySelector('.tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) switchTab(e.target.getAttribute('data-tab'));
    });

    const input = document.getElementById('exerciseInput');
    document.getElementById('add-exercise-btn').addEventListener('click', addExercise);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addExercise(); });

    document.getElementById('finish-btn').addEventListener('click', finishWorkout);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);

    const listContainer = document.getElementById('exerciseList');

    listContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.exercise-card');
        if (!card) return;

        const id = Number(card.dataset.id);

        if (e.target.type === 'checkbox') {
            toggleExercise(id);
        } else if (e.target.classList.contains('exercise-name')) {
            // Edição in-place: clique no nome transforma em input
            startInPlaceEdit(e.target, id);
        } else if (e.target.classList.contains('delete-btn')) {
            const confirmed = await showConfirm('Deseja excluir este exercício?', 'danger');
            if (confirmed) deleteExercise(id);
        }
    });

    listContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('exercise-note')) {
            updateNote(Number(e.target.closest('.exercise-card').dataset.id), e.target.value);
        }
    });
}

// ── Edição In-Place do Nome do Exercício ──────────────────────────────────────
// Transforma o <span> em <input> temporário no próprio card,
// sem abrir modais e sem rerenderizar a lista inteira durante a edição.

function startInPlaceEdit(nameSpan, id) {
    // Se o span já foi removido do DOM (edição já em curso), ignora o clique
    if (!nameSpan.isConnected) return;

    const ex = workouts[currentTab].find(e => e.id === id);
    if (!ex) return;

    const originalText = ex.name;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = originalText;
    editInput.className = 'exercise-name-input';

    let committed = false;

    // Salva e sai da edição — guardado em variável para poder remover o listener
    function commitEdit() {
        if (committed) return;
        committed = true;

        const newName = editInput.value.trim();
        nameSpan.textContent = newName || originalText;

        if (newName && newName !== originalText) {
            ex.name = newName;
            saveWorkouts();
        }

        editInput.replaceWith(nameSpan);
    }

    // Cancela sem salvar
    function cancelEdit() {
        if (committed) return;
        committed = true;

        nameSpan.textContent = originalText;
        editInput.replaceWith(nameSpan);
    }

    editInput.addEventListener('blur', commitEdit);
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
        if (e.key === 'Escape') {
            // Remove blur listener antes de cancelar para não disparar commitEdit
            editInput.removeEventListener('blur', commitEdit);
            cancelEdit();
        }
    });

    nameSpan.replaceWith(editInput);
    editInput.focus();
    editInput.select();
}

// ── Sortable (drag-and-drop para reordenar exercícios) ────────────────────────

function initSortable() {
    const list = document.getElementById('exerciseList');
    Sortable.create(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        delay: 500,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        // Impede conflito com o input de edição in-place
        filter: '.exercise-name-input',
        onEnd: saveNewOrder
    });
}

function saveNewOrder() {
    const listItems = document.querySelectorAll('.exercise-card');
    const newOrder = [];
    listItems.forEach(item => {
        const ex = workouts[currentTab].find(e => e.id === Number(item.dataset.id));
        if (ex) newOrder.push(ex);
    });
    workouts[currentTab] = newOrder;
    saveWorkouts();
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function initTimerLogic() {
    if (timer.isRunning && timer.startTime) {
        startTimer(true);
    } else {
        updateTimerUI();
    }
}

// Retoma contagem ao voltar para a aba após o app ficar em background
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timer.isRunning && timer.startTime) {
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
    localStorage.setItem('timerStartTime', timer.startTime || '');
}

// ── Data ──────────────────────────────────────────────────────────────────────

function updateDate() {
    const options = { weekday: 'short', day: 'numeric', month: 'long' };
    document.getElementById('current-date').innerText =
        new Date().toLocaleDateString('pt-BR', options).toUpperCase();
}

// ── Abas ──────────────────────────────────────────────────────────────────────

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('workout-title-display').innerText = `Treino ${tab}`;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    const btn = document.getElementById('finish-btn');
    const state = tabStates[currentTab];

    if (state === 'reiniciar') {
        btn.dataset.state = 'reiniciar';
        btn.innerText = 'REINICIAR TREINO';
        btn.style.background = 'transparent';
        btn.style.border = '2px solid var(--primary-green)';
        btn.style.color = 'var(--primary-green)';
    } else {
        btn.dataset.state = 'finalizar';
        btn.style.background = '';
        btn.style.border = '';
        btn.style.color = '';
        btn.innerText = 'FINALIZAR TREINO';
    }

    renderExercises();
}

// ── Exercícios ────────────────────────────────────────────────────────────────

function addExercise() {
    const input = document.getElementById('exerciseInput');
    const val = input.value.trim();
    if (!val) return;

    const parts = val.split(';');
    workouts[currentTab].push({
        id: Date.now(),
        name: parts[0].trim(),
        note: parts[1] ? parts[1].trim() : '',
        completed: false
    });

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

        // Classe 'delete-btn' usada no listener de clicks para identificar o botão
        li.innerHTML = `
            <div class="card-main">
                <input type="checkbox" ${ex.completed ? 'checked' : ''}>
                <span class="exercise-name" style="cursor:pointer">${sanitizeHTML(ex.name)}</span>
                <button class="delete-btn" style="background:none; border:none; color:#FF453A; font-size:18px">✕</button>
            </div>
            <input type="text" class="exercise-note" value="${sanitizeHTML(ex.note)}" placeholder="Notas...">
        `;
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

function saveWorkouts() {
    localStorage.setItem('gymFlowData', JSON.stringify(workouts));
}

// ── Progresso ─────────────────────────────────────────────────────────────────

function updateProgressBar() {
    const list = workouts[currentTab];
    const done = list.filter(ex => ex.completed).length;
    const percent = list.length === 0 ? 0 : (done / list.length) * 100;

    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('finish-btn').style.display =
        (list.length > 0 && percent === 100) ? 'block' : 'none';

    // Se o usuário desmarcou itens após finalizar, volta ao estado "finalizar"
    if (percent < 100 && tabStates[currentTab] === 'reiniciar') {
        tabStates[currentTab] = 'finalizar';
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
        const btn = document.getElementById('finish-btn');
        btn.dataset.state = 'finalizar';
        btn.style.background = '';
        btn.style.border = '';
        btn.style.color = '';
        btn.innerText = 'FINALIZAR TREINO';
    }
}

// ── Finalizar / Reiniciar Treino ──────────────────────────────────────────────

async function finishWorkout() {
    const btn = document.getElementById('finish-btn');

    if (btn.dataset.state !== 'reiniciar') {
        await showAlert('TREINO CONCLUÍDO! 💪');
        pauseTimer();
        btn.dataset.state = 'reiniciar';
        btn.innerText = 'REINICIAR TREINO';
        btn.style.background = 'transparent';
        btn.style.border = '2px solid var(--primary-green)';
        btn.style.color = 'var(--primary-green)';
        tabStates[currentTab] = 'reiniciar';
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
    } else {
        const confirmed = await showConfirm('Deseja desmarcar todos os exercícios?', 'confirm');
        if (!confirmed) return;

        workouts[currentTab].forEach(ex => ex.completed = false);
        saveWorkouts();
        btn.dataset.state = 'finalizar';
        btn.style.background = '';
        btn.style.border = '';
        btn.style.color = '';
        btn.innerText = 'FINALIZAR TREINO';
        tabStates[currentTab] = 'finalizar';
        localStorage.setItem('gymFlowTabStates', JSON.stringify(tabStates));
        renderExercises();
    }
}

// ── Exportar / Importar ───────────────────────────────────────────────────────

function exportData() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(workouts)], { type: 'application/json' }));
    a.download = 'gymflow_backup.json';
    a.click();
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            // Validação mínima de schema: espera ao menos a chave "A"
            if (!imported.A) throw new Error('Schema inválido');

            const confirmed = await showConfirm(
                'Isso substituirá todos os seus treinos atuais. Continuar?',
                'danger'
            );
            if (!confirmed) return;

            workouts = imported;
            saveWorkouts();
            renderExercises();
            await showAlert('Dados importados com sucesso!');
        } catch {
            await showAlert('Erro ao importar: arquivo inválido.');
        }
    };
    reader.readAsText(file);
    // Limpa o input para permitir reimportar o mesmo arquivo
    e.target.value = '';
}