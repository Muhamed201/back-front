import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useParams } from 'react-router-dom';
import api from './api';

// --- СТРАНИЦЫ АУТЕНТИФИКАЦИИ ---
const Register = () => {
    const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '' });
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', form);
            alert("Успешно! Вы зарегистрированы как 'user'. Войдите в систему.");
            navigate('/login');
        } catch (err) { alert("Ошибка регистрации"); }
    };

    return (
        <form onSubmit={handleRegister} style={{ padding: '20px' }}>
            <h2>Регистрация (Гость)</h2>
            <div><input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><input placeholder="Имя" onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
            <div><input placeholder="Фамилия" onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
            <div><input type="password" placeholder="Пароль" onChange={e => setForm({...form, password: e.target.value})} required /></div>
            <button type="submit">Создать аккаунт</button>
            <p><Link to="/login">Уже есть аккаунт?</Link></p>
        </form>
    );
};

const Login = ({ setAuth, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            
            // Сразу получаем данные профиля (роль)
            const meRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.accessToken}` }});
            setUser(meRes.data);
            setAuth(true);
            navigate('/products');
        } catch (err) { alert(err.response?.data?.error || "Ошибка входа"); }
    };

    return (
        <form onSubmit={handleLogin} style={{ padding: '20px' }}>
            <h2>Вход (Гость)</h2>
            <p><i>Тестовый админ: admin@test.com / admin123</i></p>
            <div><input placeholder="Email" onChange={e => setEmail(e.target.value)} required /></div>
            <div><input type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} required /></div>
            <button type="submit">Войти</button>
            <p><Link to="/register">Зарегистрироваться</Link></p>
        </form>
    );
};

// --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (ТОЛЬКО АДМИН) ---
const UsersList = () => {
    const [users, setUsers] = useState([]);

    const loadUsers = () => api.get('/users').then(res => setUsers(res.data));
    
    const handleBlock = async (id) => {
        if (window.confirm("Заблокировать пользователя?")) {
            await api.delete(`/users/${id}`);
            loadUsers();
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        await api.put(`/users/${id}`, { role: newRole });
        loadUsers();
    };

    useEffect(() => { loadUsers(); }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Пользователи системы (Администратор)</h2>
            <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr><th>Email</th><th>Имя</th><th>Роль</th><th>Статус</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} style={{ background: u.isBlocked ? '#ffdddd' : 'white' }}>
                            <td>{u.email}</td>
                            <td>{u.first_name} {u.last_name}</td>
                            <td>
                                <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value)}>
                                    <option value="user">User</option>
                                    <option value="seller">Seller</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                            <td>{u.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                            <td>
                                {!u.isBlocked && <button onClick={() => handleBlock(u.id)}>Заблокировать</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- ТОВАРЫ (С УЧЕТОМ РОЛЕЙ) ---
const ProductList = ({ role }) => {
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ title: '', price: '', category: '', description: '' });

    // Проверка прав для отображения кнопок
    const canCreate = role === 'seller' || role === 'admin';
    const canDelete = role === 'admin';

    const loadProducts = () => api.get('/products').then(res => setProducts(res.data));

    const handleCreate = async (e) => {
        e.preventDefault();
        await api.post('/products', { ...newProduct, price: Number(newProduct.price) });
        setNewProduct({ title: '', price: '', category: '', description: '' });
        loadProducts();
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить товар навсегда?")) {
            await api.delete(`/products/${id}`);
            loadProducts();
        }
    };

    useEffect(() => { loadProducts(); }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Каталог товаров</h2>
            
            {/* Форма видна только Продавцу и Админу */}
            {canCreate && (
                <form onSubmit={handleCreate} style={{ border: '2px solid green', padding: '15px', marginBottom: '20px' }}>
                    <h4>Добавить новый товар (Только Seller и Admin)</h4>
                    <input placeholder="Название" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} required />
                    <input placeholder="Цена" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                    <input placeholder="Категория" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                    <button type="submit">Добавить</button>
                </form>
            )}

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {products.map(p => (
                    <div key={p.id} style={{ border: '1px solid black', padding: '15px', width: '250px' }}>
                        <h3>{p.title}</h3>
                        <p>Цена: <b>{p.price} руб.</b></p>
                        <p><Link to={`/products/${p.id}`}><button>Подробнее / Редактировать</button></Link></p>
                        
                        {/* Удаление только для Админа */}
                        {canDelete && <button onClick={() => handleDelete(p.id)} style={{ color: 'red', width: '100%' }}>Удалить (Только Admin)</button>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- ДЕТАЛЬНАЯ ИНФОРМАЦИЯ И РЕДАКТИРОВАНИЕ ТОВАРА ---
const ProductDetail = ({ role }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const canEdit = role === 'seller' || role === 'admin';

    useEffect(() => {
        api.get(`/products/${id}`).then(res => setProduct(res.data));
    }, [id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        await api.put(`/products/${id}`, product);
        setIsEditing(false);
    };

    if (!product) return <div>Загрузка...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <button onClick={() => navigate('/products')}>&larr; Назад к каталогу</button>
            <hr/>
            {isEditing ? (
                <form onSubmit={handleUpdate} style={{ border: '1px solid blue', padding: '15px' }}>
                    <h2>Редактирование (Только Seller и Admin)</h2>
                    <div>Название: <input value={product.title} onChange={e => setProduct({...product, title: e.target.value})} /></div>
                    <div>Цена: <input value={product.price} type="number" onChange={e => setProduct({...product, price: Number(e.target.value)})} /></div>
                    <div>Категория: <input value={product.category} onChange={e => setProduct({...product, category: e.target.value})} /></div>
                    <div>Описание: <textarea value={product.description} onChange={e => setProduct({...product, description: e.target.value})} /></div>
                    <button type="submit" style={{ marginTop: '10px' }}>Сохранить</button>
                    <button type="button" onClick={() => setIsEditing(false)}>Отмена</button>
                </form>
            ) : (
                <div>
                    <h2>{product.title}</h2>
                    <p><b>Категория:</b> {product.category}</p>
                    <p><b>Цена:</b> {product.price} руб.</p>
                    <p><b>Описание:</b> {product.description}</p>
                    
                    {/* Кнопка редактирования только для Seller и Admin */}
                    {canEdit && <button onClick={() => setIsEditing(true)}>Редактировать товар</button>}
                </div>
            )}
        </div>
    );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export default function App() {
    const [isAuth, setIsAuth] = useState(!!localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);

    // При загрузке страницы подтягиваем профиль по токену
    useEffect(() => {
        if (isAuth) {
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => {
                    setIsAuth(false);
                    setUser(null);
                });
        }
    }, [isAuth]);

    const logout = () => {
        localStorage.clear();
        setIsAuth(false);
        setUser(null);
    };

    // Компонент-обертка для защиты роутов
    const ProtectedRoute = ({ children, allowedRoles }) => {
        if (!isAuth) return <Navigate to="/login" />;
        if (allowedRoles && user && !allowedRoles.includes(user.role)) return <div>У вас нет доступа к этой странице.</div>;
        return children;
    };

    return (
        <BrowserRouter>
            <nav style={{ padding: '15px', background: '#333', color: 'white' }}>
                <Link to="/products" style={{ color: 'white', marginRight: '15px' }}>Товары</Link>
                {user?.role === 'admin' && (
                    <Link to="/users" style={{ color: 'white', marginRight: '15px' }}>Управление пользователями</Link>
                )}
                
                <div style={{ float: 'right' }}>
                    {isAuth ? (
                        <span>
                            <b>{user?.first_name}</b> (Роль: {user?.role}) | 
                            <button onClick={logout} style={{ marginLeft: '10px' }}>Выйти</button>
                        </span>
                    ) : (
                        <span><Link to="/login" style={{ color: 'white' }}>Вход</Link> | <Link to="/register" style={{ color: 'white' }}>Регистрация</Link></span>
                    )}
                </div>
            </nav>

            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login setAuth={setIsAuth} setUser={setUser} />} />
                
                <Route path="/products" element={<ProtectedRoute><ProductList role={user?.role} /></ProtectedRoute>} />
                <Route path="/products/:id" element={<ProtectedRoute><ProductDetail role={user?.role} /></ProtectedRoute>} />
                
                <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersList /></ProtectedRoute>} />
                
                <Route path="*" element={<Navigate to={isAuth ? "/products" : "/login"} />} />
            </Routes>
        </BrowserRouter>
    );
}