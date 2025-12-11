const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const fs = require('fs');
const session = require ('express-session');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'kunci_rahasia_sesi',
  resave: false,
  saveUninitialized: false,
})
);

//Simulasi database
const users = { Nikeya: 'password234' };

//Middleware untuk memeriksa sesi
function checkAuth (req, res, next) {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect ('/login')
  }
}

app.get ('/login', (req, res) => {
  if (req.session.isLoggedIn) {
    res.redirect ('/');
  } else {
    res.render ('auth/login', {error: null});
  }
});

app.post ('/login', (req, res) => {
  const { username, password }  = req.body;
  if (users[username] && users[username] === password) {
    req.session.isLoggedIn = true;
    req.session.user = {username};
    res.redirect ('/')
  } else {
    res.render ('auth/login', {error: 'Username atau password salah!'});
  }
});

app.get ('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect ('/');
    res.redirect('/login');
  });
});

app.get('/', checkAuth, async (req, res) => {
  try {
    const [[kolamCount]] = await db.query(`SELECT COUNT(*) AS total FROM kolam`);
    const [[karyawanCount]] = await db.query(`SELECT COUNT(*) AS total FROM karyawan`);
    const [[pelangganCount]] = await db.query(`SELECT COUNT(*) AS total FROM pelanggan`);

    res.render('index', {
      kolam: kolamCount.total,
      karyawan: karyawanCount.total,
      pelanggan: pelangganCount.total
    });
  } catch (err) {
    console.error ('Error mengambil data dashboard:', err);
    res.status(500).send ('Gagal mengambil data dashboard');
  }
});

//READ: Menampilkan semua kolam
app.get('/kolam', checkAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const search = (req.query.search || '').trim();
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      `SELECT * FROM kolam
      WHERE id_kolam LIKE ? 
      OR nama_kolam LIKE ? 
      OR nama_barang LIKE ? 
      OR jenis_kolam LIKE ? 
      OR kedalaman LIKE ? 
      OR harga_tiket LIKE ? 
      LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS count FROM kolam
      WHERE id_kolam LIKE ?
      OR nama_kolam LIKE ? 
      OR nama_barang LIKE ? 
      OR jenis_kolam LIKE ? 
      OR kedalaman LIKE ? 
      OR harga_tiket LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    );

    const totalRows = countResult[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    res.render('kolam/index', {
      kolam: rows,
      currentPage: page,
      totalPages,
      search,
    });

  } catch (err) {
    console.error('Error Fetching Data:', err);
    res.status(500).send('Terjadi kesalahan saat mengambil data');
  }
});

//Set up storage engine untuk multer
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, 'uploads'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)), //Nama file unik
});
const upload = multer({ storage });

//CREATE: Form tambah kolam
app.get('/add-kolam', (req, res) => {
  res.render('kolam/add');
});

app.post('/add-kolam', upload.single('file'), async (req, res) => {
  const {id_kolam, nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket} = req.body;
  const fileData = req.file ? {filename: req.file.filename, filePath: req.file.path} : {};

  try {
    await db.query('INSERT INTO kolam SET ?',
      {id_kolam, nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket, ...fileData}
    );
    res.redirect('/kolam');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menambah data kolam');
  }
});

//UPDATE: Form edit kolam
app.get('/edit-kolam/:id_kolam', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM kolam WHERE id_kolam = ?', [req.params.id_kolam]);
    res.render('kolam/edit', { kolam: results[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengedit data kolam');
  }
});

app.post('/edit-kolam/:id_kolam', upload.single('file'), async (req, res) => {
  const { nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket } = req.body;
  const id_kolam = req.params.id_kolam;

  try {
    await db.query(
      'UPDATE kolam SET nama_kolam=?, nama_barang=?, jenis_kolam=?, kedalaman=?, harga_tiket=? WHERE id_kolam=?',
      [nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket, id_kolam]
    );

    if (req.file) {
      const [results] = await db.query('SELECT filePath FROM kolam WHERE id_kolam=?', [id_kolam]);
      const oldFilePath = results[0]?.filePath;

      if (oldFilePath && fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

      await db.query(
        'UPDATE kolam SET filename=?, filePath=? WHERE id_kolam=?',
        [req.file.filename, req.file.path, id_kolam]
      );
    }
    res.redirect('/kolam');

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengupdate data kolam');
  }
});

//DELETE kolam
app.get('/delete-kolam/:id_kolam', async (req, res) => {
  try {
    const [results] = await db.query('SELECT filePath FROM kolam WHERE id_kolam=?', [req.params.id_kolam]);
    const imagePath = results[0]?.filePath;

    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    await db.query('DELETE FROM kolam WHERE id_kolam=?', [req.params.id_kolam]);
    res.redirect('/kolam');

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus data kolam');
  }
});

//READ: Menampilkan semua karyawan
app.get('/karyawan', checkAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const search = (req.query.search || '').trim();
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      `SELECT * FROM karyawan
      WHERE id_karyawan LIKE ?
      OR nama_karyawan LIKE ?
      OR jabatan LIKE ?
      OR alamat_karyawan LIKE ?
      OR no_hp LIKE ?
      LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS count FROM karyawan
      WHERE id_karyawan LIKE ?
      OR nama_karyawan LIKE ?
      OR jabatan LIKE ?
      OR alamat_karyawan LIKE ?
      OR no_hp LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    );

    const totalRows = countResult[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    res.render('karyawan/index', {
      karyawan: rows,
      currentPage: page,
      totalPages,
      search,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengambil data karyawan');
  }
});

//CREATE: Form tambah karyawan
app.get('/add-karyawan', (req, res) => {
  res.render('karyawan/add');
});

app.post('/add-karyawan', upload.single('file'), async (req, res) => {
  const { id_karyawan, nama_karyawan, jabatan, alamat_karyawan, no_hp } = req.body;
  const fileData = req.file ? { filename: req.file.filename, filePath: req.file.path } : {};

  try {
    await db.query('INSERT INTO karyawan SET ?', {
      id_karyawan, nama_karyawan, jabatan, alamat_karyawan, no_hp, ...fileData
    });
    res.redirect('/karyawan');

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menambah karyawan');
  }
});

//UPDATE: Form edit karyawan
app.get('/edit-karyawan/:id_karyawan', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM karyawan WHERE id_karyawan=?', [req.params.id_karyawan]);
    res.render('karyawan/edit', { karyawan: results[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengambil data karyawan');
  }
});

app.post('/edit-karyawan/:id_karyawan', upload.single('file'), async (req, res) => {
  const { nama_karyawan, jabatan, alamat_karyawan, no_hp } = req.body;
  const id_karyawan = req.params.id_karyawan;

  try {
    await db.query(
      'UPDATE karyawan SET nama_karyawan=?, jabatan=?, alamat_karyawan=?, no_hp=? WHERE id_karyawan=?',
      [nama_karyawan, jabatan, alamat_karyawan, no_hp, id_karyawan]
    );

    if (req.file) {
      const [results] = await db.query('SELECT filePath FROM karyawan WHERE id_karyawan=?', [id_karyawan]);
      const oldFilePath = results[0]?.filePath;

      if (oldFilePath && fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

      await db.query(
        'UPDATE karyawan SET filename=?, filePath=? WHERE id_karyawan=?',
        [req.file.filename, req.file.path, id_karyawan]
      );
    }

    res.redirect('/karyawan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengupdate karyawan');
  }
});

//DELETE Karyawan
app.get('/delete-karyawan/:id_karyawan', async (req, res) => {
  try {
    const [results] = await db.query('SELECT filePath FROM karyawan WHERE id_karyawan=?', [req.params.id_karyawan]);
    const imagePath = results[0]?.filePath;

    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await db.query('DELETE FROM karyawan WHERE id_karyawan=?', [req.params.id_karyawan]);
    res.redirect('/karyawan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus karyawan');
  }
});

//READ: Menampilkan semua pelanggan
app.get('/pelanggan', checkAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const search = (req.query.search || '').trim();
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      `SELECT * FROM pelanggan
      WHERE id_pelanggan LIKE ?
      OR nama_pelanggan LIKE ?
      OR alamat_pelanggan LIKE ?
      OR no_hp LIKE ?
      LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS count FROM pelanggan
      WHERE id_pelanggan LIKE ?
      OR nama_pelanggan LIKE ?
      OR alamat_pelanggan LIKE ?
      OR no_hp LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    );

    const totalRows = countResult[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    res.render('pelanggan/index', {
      pelanggan: rows,
      currentPage: page,
      totalPages,
      search,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengambil data pelanggan');
  }
});

//CREATE: Form tambah pelanggan
app.get('/add-pelanggan', (req, res) => {
  res.render('pelanggan/add');
});

app.post('/add-pelanggan', upload.single('file'), async (req, res) => {
  const { id_pelanggan, nama_pelanggan, alamat_pelanggan, no_hp } = req.body;
  const fileData = req.file ? { filename: req.file.filename, filePath: req.file.path } : {};

  try {
    await db.query('INSERT INTO pelanggan SET ?', {id_pelanggan, nama_pelanggan, alamat_pelanggan, no_hp, ...fileData,
    });
    res.redirect('/pelanggan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menambah data pelanggan');
  }
});

// UPDATE: Form edit pelanggan
app.get('/edit-pelanggan/:id_pelanggan', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM pelanggan WHERE id_pelanggan=?',
      [req.params.id_pelanggan]
    );
    res.render('pelanggan/edit', { pelanggan: results[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengedit data pelanggan');
  }
});

app.post('/edit-pelanggan/:id_pelanggan', upload.single('file'), async (req, res) => {
  const { nama_pelanggan, alamat_pelanggan, no_hp } = req.body;
  const id_pelanggan = req.params.id_pelanggan;

  try {
    await db.query(
      'UPDATE pelanggan SET nama_pelanggan=?, alamat_pelanggan=?, no_hp=? WHERE id_pelanggan=?',
      [nama_pelanggan, alamat_pelanggan, no_hp, id_pelanggan]
    );

    if (req.file) {
      const [results] = await db.query(
        'SELECT filePath FROM pelanggan WHERE id_pelanggan=?',
        [id_pelanggan]
      );
      const oldFilePath = results[0]?.filePath;

      if (oldFilePath && fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

      await db.query(
        'UPDATE pelanggan SET filename=?, filePath=? WHERE id_pelanggan=?',
        [req.file.filename, req.file.path, id_pelanggan]
      );
    }

    res.redirect('/pelanggan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengupdate pelanggan');
  }
});

//DELETE pelanggan
app.get('/delete-pelanggan/:id_pelanggan', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT filePath FROM pelanggan WHERE id_pelanggan=?',
      [req.params.id_pelanggan]
    );
    const imagePath = results[0]?.filePath;

    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await db.query('DELETE FROM pelanggan WHERE id_pelanggan=?', [req.params.id_pelanggan]);
    res.redirect('/pelanggan');
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus pelanggan');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});