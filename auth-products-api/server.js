const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const ACCESS_SECRET = 'access_secret_key_777';
const REFRESH_SECRET = 'refresh_secret_key_888';

// --- ИМИТАЦИЯ БАЗЫ ДАННЫХ ---
let users = [];
let products = [];
let refreshTokens = [];

// Автоматически создаем администратора при старте сервера
(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  users.push({
    id: 'admin-id-1',
    email: 'admin@test.com',
    first_name: 'Главный',
    last_name: 'Админ',
    password: hashedPassword,
    role: 'admin', // Роли: 'user', 'seller', 'admin'
    isBlocked: false
  });
})();

// --- ПОЛНАЯ КОНФИГУРАЦИЯ SWAGGER ---
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Практическая №11 (RBAC)',
    version: '1.0.0',
    description: 'Система с ролями (user, seller, admin), авторизацией и полным CRUD'
  },
  servers: [{ url: `http://localhost:${port}` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'Регистрация пользователя (Гость)' } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Вход (получение токенов) (Гость)' } },
    '/api/auth/refresh': { post: { tags: ['Auth'], summary: 'Обновление токенов (Гость)' } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Данные текущего пользователя (Пользователь)', security: [{ bearerAuth: [] }] } },
    '/api/users': { get: { tags: ['Users'], summary: 'Список пользователей (Администратор)', security: [{ bearerAuth: [] }] } },
    '/api/users/{id}': {
      get: { tags: ['Users'], summary: 'Пользователь по id (Администратор)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] },
      put: { tags: ['Users'], summary: 'Обновить пользователя (Администратор)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] },
      delete: { tags: ['Users'], summary: 'Заблокировать пользователя (Администратор)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] }
    },
    '/api/products': {
      get: { tags: ['Products'], summary: 'Получить список товаров (Пользователь)', security: [{ bearerAuth: [] }] },
      post: { tags: ['Products'], summary: 'Создать товар (Продавец)', security: [{ bearerAuth: [] }] }
    },
    '/api/products/{id}': {
      get: { tags: ['Products'], summary: 'Товар по ID (Пользователь)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] },
      put: { tags: ['Products'], summary: 'Обновить товар (Продавец)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] },
      delete: { tags: ['Products'], summary: 'Удалить товар (Администратор)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] }
    }
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- МИДЛВАРЫ (JWT и РОЛИ) ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access Token отсутствует" });

  jwt.verify(token, ACCESS_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Access Token недействителен" });
    req.user = decoded;
    next();
  });
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Недостаточно прав для выполнения действия" });
    }
    next();
  };
};

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role, first_name: user.first_name };
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// --- МАРШРУТЫ AUTH ---

app.get('/', (req, res) => res.redirect('/api-docs'));

app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Заполните данные" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { 
    id: nanoid(), email, first_name, last_name, password: hashedPassword, 
    role: 'user', // По умолчанию все новые - пользователи
    isBlocked: false 
  };
  users.push(newUser);
  res.status(201).json({ id: newUser.id, email: newUser.email, role: newUser.role });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }
  if (user.isBlocked) {
    return res.status(403).json({ error: "Ваш аккаунт заблокирован администратором" });
  }

  const tokens = generateTokens(user);
  refreshTokens.push(tokens.refreshToken);
  res.json(tokens);
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.includes(refreshToken)) return res.status(403).json({ error: "Неверный токен" });

  jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Токен просрочен" });
    refreshTokens = refreshTokens.filter(t => t !== refreshToken);
    
    // Подтягиваем актуальную роль пользователя из базы на случай если его повысили/заблокировали
    const dbUser = users.find(u => u.id === user.id);
    if (!dbUser || dbUser.isBlocked) return res.status(403).json({ error: "Пользователь заблокирован" });

    const newTokens = generateTokens(dbUser);
    refreshTokens.push(newTokens.refreshToken);
    res.json(newTokens);
  });
});

app.get("/api/auth/me", authenticateToken, (req, res) => res.json(req.user));

// --- МАРШРУТЫ USERS (Только Админ) ---

app.get("/api/users", authenticateToken, checkRole(['admin']), (req, res) => {
  // Отдаем список пользователей без паролей
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.get("/api/users/:id", authenticateToken, checkRole(['admin']), (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.put("/api/users/:id", authenticateToken, checkRole(['admin']), (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Пользователь не найден" });
  users[index] = { ...users[index], ...req.body, id: req.params.id };
  const { password, ...safeUser } = users[index];
  res.json(safeUser);
});

app.delete("/api/users/:id", authenticateToken, checkRole(['admin']), (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  user.isBlocked = true; // Блокировка вместо полного удаления
  res.status(204).send();
});

// --- МАРШРУТЫ PRODUCTS (CRUD с ролями) ---

// Просмотр доступен user, seller и admin
app.get("/api/products", authenticateToken, checkRole(['user', 'seller', 'admin']), (req, res) => res.json(products));
app.get("/api/products/:id", authenticateToken, checkRole(['user', 'seller', 'admin']), (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  product ? res.json(product) : res.status(404).json({ error: "Товар не найден" });
});

// Создание и обновление доступно seller и admin
app.post("/api/products", authenticateToken, checkRole(['seller', 'admin']), (req, res) => {
  const product = { id: nanoid(), ...req.body };
  products.push(product);
  res.status(201).json(product);
});
app.put("/api/products/:id", authenticateToken, checkRole(['seller', 'admin']), (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Товар не найден" });
  products[index] = { ...products[index], ...req.body, id: req.params.id };
  res.json(products[index]);
});

// Удаление доступно ТОЛЬКО admin
app.delete("/api/products/:id", authenticateToken, checkRole(['admin']), (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Товар не найден" });
  products.splice(index, 1);
  res.status(204).send();
});

app.listen(port, () => console.log(`Сервер запущен на http://localhost:${port}`));