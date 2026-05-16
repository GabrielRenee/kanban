// State
let token = sessionStorage.getItem('token');
let username = sessionStorage.getItem('username');
let tasks = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const kanbanView = document.getElementById('kanban-view');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerMessage = document.getElementById('register-message');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');

const colTodo = document.getElementById('col-todo');
const colDoing = document.getElementById('col-doing');
const colDone = document.getElementById('col-done');

const countTotal = document.getElementById('count-total');
const countProgress = document.getElementById('count-progress');
const countCompleted = document.getElementById('count-completed');
const countOverdue = document.getElementById('count-overdue');

const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const closeModalBtn = document.getElementById('close-modal');
const addTaskBtn = document.getElementById('add-task-btn');
const modalTitle = document.getElementById('modal-title');

// Initialize
function init() {
    setupEventListeners();

    if (token) {
        showKanbanView();
        fetchTasks();
    } else {
        showAuthView();
    }

    try {
        initDragAndDrop();
    } catch (e) {
        console.error('Falha ao inicializar o Drag and Drop:', e);
    }
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    
    addTaskBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    taskForm.addEventListener('submit', handleSaveTask);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeModal();
        }
    });
}

// Views
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Clear messages and fields
    loginError.textContent = '';
    registerMessage.textContent = '';
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        loginForm.classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        registerForm.classList.add('active');
    }
}

function showAuthView() {
    authView.classList.add('active');
    kanbanView.classList.remove('active');
}

function showKanbanView() {
    authView.classList.remove('active');
    kanbanView.classList.add('active');
    welcomeMessage.textContent = `Bem-vindo(a), ${username}`;
}

// Auth Logic
async function handleLogin(e) {
    e.preventDefault();
    console.log("Login attempted");
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    console.log("Credentials:", { username: user, passwordLength: pass.length });

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        const data = await res.json();
        console.log("Login response:", res.status, data);
        
        if (res.ok) {
            token = data.token;
            username = data.username;
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('username', username);
            showKanbanView();
            fetchTasks();
        } else {
            loginError.textContent = data.message;
        }
    } catch (err) {
        console.error("Login fetch error:", err);
        loginError.textContent = 'Erro de conexão com o servidor';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log("Register attempted");
    const user = document.getElementById('register-username').value;
    const pass = document.getElementById('register-password').value;
    console.log("Register credentials:", { username: user, passwordLength: pass.length });

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        const data = await res.json();
        console.log("Register response:", res.status, data);
        
        if (res.ok) {
            registerMessage.textContent = 'Registrado com sucesso. Por favor, faça o login.';
            registerMessage.style.color = 'var(--pine-green)';
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            registerMessage.textContent = data.message;
            registerMessage.style.color = 'var(--hi-iro-vermilion)';
        }
    } catch (err) {
        console.error("Register fetch error:", err);
        registerMessage.textContent = 'Erro de conexão com o servidor';
        registerMessage.style.color = 'var(--hi-iro-vermilion)';
    }
}

function handleLogout() {
    token = null;
    username = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    tasks = [];
    renderBoard();
    showAuthView();
}

// Tasks API
async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            handleLogout();
            return;
        }
        
        if (res.ok) {
            tasks = await res.json();
            renderBoard();
            updateDashboard();
        }
    } catch (err) {
        console.error('Falha ao buscar tarefas', err);
    }
}

async function saveTaskApi(taskData) {
    const isEdit = !!taskData.id;
    const url = isEdit ? `/api/tasks/${taskData.id}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
        });

        if (res.ok) {
            const savedTask = await res.json();
            if (isEdit) {
                const index = tasks.findIndex(t => t.id === savedTask.id);
                if (index !== -1) tasks[index] = savedTask;
            } else {
                tasks.push(savedTask);
            }
            renderBoard();
            updateDashboard();
            return true;
        }
    } catch (err) {
        console.error('Falha ao salvar tarefa', err);
    }
    return false;
}

async function deleteTaskApi(id) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            tasks = tasks.filter(t => t.id !== id);
            renderBoard();
            updateDashboard();
        }
    } catch (err) {
        console.error('Falha ao excluir tarefa', err);
    }
}

// UI Logic
function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    // add timezone offset workaround
    taskDate.setMinutes(taskDate.getMinutes() + taskDate.getTimezoneOffset());
    return taskDate < today;
}

function renderBoard() {
    colTodo.innerHTML = '';
    colDoing.innerHTML = '';
    colDone.innerHTML = '';

    const template = document.getElementById('task-template');

    tasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.task-card');
        
        card.dataset.id = task.id;
        card.querySelector('.task-title').textContent = task.title;
        card.querySelector('.task-desc').textContent = task.description;
        card.querySelector('.task-date').textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem data';
        
        const toggleBtn = card.querySelector('.complete-toggle-btn');
        if (task.completed) {
            toggleBtn.textContent = 'Concluída ✓';
            toggleBtn.classList.add('completed');
        } else {
            toggleBtn.textContent = 'Marcar Concluída';
        }

        // Overdue check
        if (!task.completed && isOverdue(task.dueDate)) {
            card.classList.add('overdue');
        }

        // Bind events
        card.querySelector('.edit-btn').addEventListener('click', () => openModal(task));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteTaskApi(task.id));
        toggleBtn.addEventListener('click', () => toggleComplete(task));

        // Place in correct column
        let targetCol = colTodo;
        if (task.completed) {
            targetCol = colDone;
            if (task.status !== 'Done') {
                task.status = 'Done';
                saveTaskApi(task);
            }
        } else {
            if (task.status === 'Doing') targetCol = colDoing;
            else if (task.status === 'Done') targetCol = colDone;
        }

        targetCol.appendChild(card);
    });
}

function updateDashboard() {
    countTotal.textContent = tasks.length;
    countProgress.textContent = tasks.filter(t => t.status === 'Doing' && !t.completed).length;
    countCompleted.textContent = tasks.filter(t => t.completed).length;
    countOverdue.textContent = tasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
}

async function toggleComplete(task) {
    const updatedTask = { ...task, completed: !task.completed };
    if (updatedTask.completed) {
        updatedTask.status = 'Done';
    }
    await saveTaskApi(updatedTask);
}

// Modal Logic
function openModal(task = null) {
    taskModal.classList.add('active');
    
    if (task) {
        modalTitle.textContent = 'Editar Tarefa';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.description;
        document.getElementById('task-date').value = task.dueDate;
        document.getElementById('task-status').value = task.status;
    } else {
        modalTitle.textContent = 'Nova Tarefa';
        taskForm.reset();
        document.getElementById('task-id').value = '';
    }
}

function closeModal() {
    taskModal.classList.remove('active');
}

async function handleSaveTask(e) {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const dueDate = document.getElementById('task-date').value;
    const status = document.getElementById('task-status').value;
    
    // Check if moving to done should auto-complete
    const completed = status === 'Done';

    const taskData = {
        id: id || undefined,
        title,
        description,
        dueDate,
        status,
        completed
    };

    const success = await saveTaskApi(taskData);
    if (success) {
        closeModal();
    }
}

// Drag and Drop
function initDragAndDrop() {
    const options = {
        group: 'kanban',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const itemEl = evt.item;
            const toList = evt.to;
            const newStatus = toList.dataset.status;
            const taskId = itemEl.dataset.id;
            
            const task = tasks.find(t => t.id === taskId);
            
            if (task && task.status !== newStatus) {
                task.status = newStatus;
                
                // If moved to Done, mark complete
                if (newStatus === 'Done') {
                    task.completed = true;
                } else if (task.completed && newStatus !== 'Done') {
                    // If moved out of Done, unmark complete
                    task.completed = false;
                }
                
                saveTaskApi(task);
            }
        }
    };

    new Sortable(colTodo, options);
    new Sortable(colDoing, options);
    new Sortable(colDone, options);
}

// Run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
console.log("App.js loaded");
