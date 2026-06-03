// Получаем токен из localStorage
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Проверяем авторизацию
if (!token) {
    alert('Пожалуйста, войдите в систему');
    window.location.href = '../html/index.html';
}

// Отображаем имя пользователя
document.querySelector('h1').innerHTML = `Заметки ${user.username || ''}`;

// Загружаем заметки при загрузке страницы
document.addEventListener('DOMContentLoaded', loadTodos);

// Добавление заметки
document.getElementById('addBtn').addEventListener('click', addTodo);
document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

// Функция загрузки заметок
async function loadTodos() {
    try {
        const response = await fetch('http://localhost:3000/api/todos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            // Токен недействителен
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../html/index.html';
            return;
        }
        
        const todos = await response.json();
        renderTodos(todos);
    } catch (err) {
        console.error('Ошибка загрузки заметок:', err);
        alert('Ошибка загрузки заметок');
    }
}

// Функция добавления заметки
async function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (!text) {
        alert('Введите текст заметки');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            input.value = '';
            loadTodos(); // Перезагружаем список
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка создания заметки');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка создания заметки');
    }
}

// Функция переключения статуса заметки
async function toggleTodo(id, completed) {
    try {
        const response = await fetch(`http://localhost:3000/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: !completed })
        });
        
        if (response.ok) {
            loadTodos();
        } else {
            alert('Ошибка обновления статуса');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка обновления статуса');
    }
}

// Функция удаления заметки
async function deleteTodo(id) {
    if (!confirm('Вы уверены, что хотите удалить эту заметку?')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/todos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadTodos();
        } else {
            alert('Ошибка удаления заметки');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка удаления заметки');
    }
}

// Функция отображения заметок
function renderTodos(todos) {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    if (todos.length === 0) {
        todoList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Нет заметок. Создайте первую!</div>';
        return;
    }
    
    todos.forEach(todo => {
        const todoDiv = document.createElement('div');
        todoDiv.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        
        todoDiv.innerHTML = `
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <div class="todo-actions">
                <button class="complete-btn" onclick="toggleTodo(${todo.id}, ${todo.completed})">
                    ${todo.completed ? '↩️ Вернуть' : '✅ Выполнить'}
                </button>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑️ Удалить</button>
            </div>
        `;
        
        todoList.appendChild(todoDiv);
    });
}

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавляем кнопку выхода
const logoutBtn = document.createElement('button');
logoutBtn.textContent = 'Выйти';
logoutBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
`;
logoutBtn.onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../html/index.html';
};
document.body.appendChild(logoutBtn);