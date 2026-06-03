// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Проверяем, есть ли готовая строка подключения (например, на Render)
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Будет использоваться на Render
  ...(isProduction
    ? {
        ssl: {
          rejectUnauthorized: false, // Обязательно для Render PostgreSQL
        },
      }
    : {
        // Локальные настройки, если DATABASE_URL не задана
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
      }),
});

// ... остальная часть вашего кода

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.stack);
    } else {
        console.log('✅ Успешно подключено к PostgreSQL');
        release();
    }
});

module.exports = pool;