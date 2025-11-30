const express = require('express'); // Mengimpor modul express
const app = express(); // Membuat aplikasi express
const port = 3000; // Menentukan port untuk server

// Menentukan rute dasar (root)
app.use((req, res, next) => {
    console.log('Time:', Date.now());
    next();
});

app.get('/', (req, res) => { 
    res.send('Selamat Datang');
});

app.get('/home', (req, res) => { 
    res.send('Halaman Beranda');
});

app.get('/profil', (req, res) => { 
    res.send('Halaman Profil');
});

app.get('/api/users/snack', (req, res) => { 
    res.send('Halaman Produk Snack');
});

app.get('/api/users/drink', (req, res) => { 
    res.send('Halaman Produk Soft Drink');
});

app.get('/api/users/snack/id', (req, res) => { 
    res.send('Halaman Produk Snack (id = 1234)');
});

app.get('/api/users/drink/id', (req, res) => { 
    res.send('Halaman Produk Soft Drink (id = 5678)');
});

app.get('/api/users/userId', (req, res) => {
    const userId = req.params.userId; 
    res.send(`Detail untuk pengguna ID: ${userId}`);
});

// Memulai server untuk mendengarkan permintaan di port yang di tentukan
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:3000`);
});