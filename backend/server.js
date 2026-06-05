const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Функция для получения локального IP адреса
function getLocalIp() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Пропускаем non-IPv4 и internal адреса
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// ========== API для регистрации ==========
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;

    // Валидация
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть минимум 4 символа' });
    }

    try {
        // Проверка, существует ли пользователь
        const userExists = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хеширование пароля
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Создание пользователя
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, passwordHash]
        );

        const user = result.rows[0];

        // Создание JWT токена
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            redirect: '/html/main.html',
            user: { id: user.id, username: user.username }
        });

    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ========== API для входа ==========
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    try {
        // Поиск пользователя
        const result = await pool.query(
            'SELECT id, username, password_hash FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        const user = result.rows[0];

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        // Создание JWT токена
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            redirect: '/html/main.html',
            user: { id: user.id, username: user.username }
        });

    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ========== API для работы с заметками ==========

// Получить все заметки пользователя
app.get('/api/todos', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, text, completed, created_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения заметок:', err);
        res.status(500).json({ error: 'Ошибка получения заметок' });
    }
});

// Создать новую заметку
app.post('/api/todos', authenticateToken, async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Текст заметки не может быть пустым' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO todos (user_id, text) VALUES ($1, $2) RETURNING id, text, completed, created_at',
            [req.user.id, text]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка создания заметки:', err);
        res.status(500).json({ error: 'Ошибка создания заметки' });
    }
});

// Обновить статус заметки (выполнено/не выполнено)
app.put('/api/todos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;

    try {
        // Проверяем, принадлежит ли заметка пользователю
        const checkResult = await pool.query(
            'SELECT id FROM todos WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Заметка не найдена' });
        }

        await pool.query(
            'UPDATE todos SET completed = $1 WHERE id = $2',
            [completed, id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления заметки:', err);
        res.status(500).json({ error: 'Ошибка обновления заметки' });
    }
});

// Удалить заметку
app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Проверяем, принадлежит ли заметка пользователю
        const checkResult = await pool.query(
            'SELECT id FROM todos WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Заметка не найдена' });
        }

        await pool.query('DELETE FROM todos WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления заметки:', err);
        res.status(500).json({ error: 'Ошибка удаления заметки' });
    }
});

// Запуск сервера
// app.listen(PORT, () => {
//     console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
//     console.log(`📝 Страницы доступны по адресу: http://localhost:${PORT}/html/index.html`);
// });
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Доступно в сети по адресу: http://${getLocalIp()}:${PORT}`);
});