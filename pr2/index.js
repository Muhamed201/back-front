const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

let products = [
    { id: 1, name: 'Ноутбук Asus ROG', price: 120000 },
    { id: 2, name: 'Смартфон Samsung S23', price: 80000 },
    { id: 3, name: 'Наушники Sony WH-1000XM5', price: 35000 },
    { id: 4, name: 'Клавиатура Logitech MX Keys', price: 12000 },
    { id: 5, name: 'Мышь Razer DeathAdder', price: 6000 }
];

app.get('/products', (req, res) => {
    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

app.get('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: `Товар с ID ${id} не найден`
        });
    }

    res.status(200).json({
        success: true,
        data: product
    });
});

app.post('/products', (req, res) => {
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({
            success: false,
            message: 'Пожалуйста, укажите название и стоимость товара'
        });
    }

    if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Стоимость должна быть положительным числом'
        });
    }

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price
    };

    products.push(newProduct);

    res.status(201).json({
        success: true,
        message: 'Товар успешно добавлен',
        data: newProduct
    });
});

app.put('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, price } = req.body;
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            success: false,
            message: `Товар с ID ${id} не найден`
        });
    }

    if (!name || !price) {
        return res.status(400).json({
            success: false,
            message: 'Пожалуйста, укажите название и стоимость товара'
        });
    }

    if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Стоимость должна быть положительным числом'
        });
    }

    products[productIndex] = {
        id: id,
        name: name,
        price: price
    };

    res.status(200).json({
        success: true,
        message: 'Товар успешно обновлен',
        data: products[productIndex]
    });
});

app.patch('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, price } = req.body;
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: `Товар с ID ${id} не найден`
        });
    }

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Название должно быть непустой строкой'
            });
        }
        product.name = name;
    }

    if (price !== undefined) {
        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Стоимость должна быть положительным числом'
            });
        }
        product.price = price;
    }

    res.status(200).json({
        success: true,
        message: 'Товар успешно обновлен',
        data: product
    });
});

app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            success: false,
            message: `Товар с ID ${id} не найден`
        });
    }

    const deletedProduct = products[productIndex];
    products = products.filter(p => p.id !== id);

    res.status(200).json({
        success: true,
        message: 'Товар успешно удален',
        data: deletedProduct
    });
});

app.get('/products/search', (req, res) => {
    const query = req.query.q?.toLowerCase();
    
    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Укажите поисковый запрос (параметр q)'
        });
    }

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(query)
    );

    res.status(200).json({
        success: true,
        count: filteredProducts.length,
        data: filteredProducts
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>API управления товарами</h1>
        <p>Доступные эндпоинты:</p>
        <ul>
            <li><strong>GET /products</strong> - получить все товары</li>
            <li><strong>GET /products/:id</strong> - получить товар по ID</li>
            <li><strong>POST /products</strong> - создать товар (body: {name, price})</li>
            <li><strong>PUT /products/:id</strong> - полностью обновить товар</li>
            <li><strong>PATCH /products/:id</strong> - частично обновить товар</li>
            <li><strong>DELETE /products/:id</strong> - удалить товар</li>
            <li><strong>GET /products/search?q=...</strong> - поиск товаров</li>
        </ul>
    `);
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Что-то пошло не так на сервере'
    });
});

app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
    console.log(`📦 Доступные эндпоинты:`);
    console.log(`   GET    http://localhost:${port}/products`);
    console.log(`   GET    http://localhost:${port}/products/1`);
    console.log(`   POST   http://localhost:${port}/products`);
    console.log(`   PUT    http://localhost:${port}/products/1`);
    console.log(`   PATCH  http://localhost:${port}/products/1`);
    console.log(`   DELETE http://localhost:${port}/products/1`);
    console.log(`   GET    http://localhost:${port}/products/search?q=ноут`);
});