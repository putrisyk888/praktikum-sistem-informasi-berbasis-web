const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const fs = require('fs');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
//app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({extended: false}));

//READ: Menampilkan semua kolam
app.get('/', (req, res) => {
    db.query('SELECT * FROM kolam', (err, results) => {
        if (err) throw err;
        res.render('kolam/index', { kolam: results});
        console.log(results); //Mengecek hasil query
    });
});


//Set up storage engine untuk multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); //Nama file unik
    },
});

const upload = multer({storage});

//CREATE: Form tambah kolam
app.get('/add-kolam', (req, res) => {
    res.render('kolam/add');
});

app.post('/add-kolam', upload.single('file'), (req, res) => {
    const {id_kolam, nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket} = req.body;
    const {filename, path: filePath} = req.file;
    db.query('INSERT INTO kolam SET ?', {id_kolam, nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket, filename, filePath}, (err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

//UPDATE: Form kolam
app.get('/edit-kolam/:id_kolam', (req, res) => {
    const id_kolam = req.params.id_kolam;
    db.query('SELECT * FROM kolam WHERE id_kolam = ?', [id_kolam], (err, results) => {
        if (err) throw err;
        res.render('kolam/edit', {kolam: results[0]});
    });
});

app.post('/edit-kolam/:id_kolam', upload.single('file'), (req, res) => {
    const {nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket} = req.body;
    const id_kolam = req.params.id_kolam;
    const {filename, path: filePath} = req.file;
    db.query('UPDATE kolam SET nama_kolam = ?, nama_barang = ?, jenis_kolam = ?, kedalaman = ?, harga_tiket = ? WHERE id_kolam = ?',
        [nama_kolam, nama_barang, jenis_kolam, kedalaman, harga_tiket, id_kolam], (err, results) => {
        if (err) throw err;

        db.query('SELECT filepath FROM kolam WHERE id_kolam = ?', [id_kolam], (err, results) => {
            if (err) throw err;
            const oldFilePath = results[0]?.filepath;

            if (oldFilePath && fs.existsSync(oldFilePath)) {
                fs.unlink(oldFilePath, (err) => {
                    if (err)  {
                        console.error('Gagal hapus file lama:', err);
                    };

                    //Update gambar baru
                    db.query('UPDATE kolam SET filename = ?, filepath = ? WHERE id_kolam = ?', [filename, filePath, id_kolam], (err) => {
                        if (err) throw err;
                        res.redirect('/');
                    });
                });
            } else {
                //Jika tidak ada file lama, langsung update
                db.query('UPDATE kolam SET filename = ?, filepath = ? WHERE id_kolam = ?', [filename, filePath, id_kolam], (err) => {
                    if (err) throw err;
                    res.redirect('/');
                });
            }
    });
    });
});

//DELETE kolam
app.get('/delete-kolam/:id_kolam', (req, res) => {
    const id_kolam = req.params.id_kolam;

    db.query('SELECT filepath FROM kolam WHERE id_kolam = ?', [id_kolam], (err, results) => {
        if (err) throw err;
        const imagePath = results[0]?.filePath;

        if (imagePath) {
            //Menghapus gambar dari server
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Gagal hapus file:', err);
                }

            //Menghapus gambar dari database
            db.query('DELETE FROM kolam WHERE id_kolam = ?', [id_kolam], (err) => {
        if (err) throw err;
        res.redirect('/');    
            });
        });
    } else {
        //Jika filepath tidak ada, langsung hapus dari database
        db.query('DELETE FROM kolam WHERE id_kolam = ?', [id_kolam], (err) => {
            if (err) throw err;
            res.redirect('/');
        });
    }
    });
});

//READ: Menampilkan semua karyawan
app.get('/karyawan', (req, res) => {
    db.query('SELECT * FROM karyawan', (err, results) => {
        if (err) throw err;
        res.render('karyawan/index', { karyawan: results});
        console.log(results); //Mengecek hasil query
    });
});

//CREATE: Form tambah karyawan
app.get('/add-karyawan', (req, res) => {
    res.render('karyawan/add');
});

app.post('/add-karyawan', upload.single('file'), (req, res) => {
    const {id_karyawan, nama_karyawan, jabatan, alamat_karyawan, no_hp} = req.body;
    const {filename, path: filePath} = req.file;
    db.query('INSERT INTO karyawan SET ?', {id_karyawan, nama_karyawan, jabatan, alamat_karyawan, no_hp, filename, filePath}, (err) => {
        if (err) throw err;
        res.redirect('/karyawan');
    });
});

//UPDATE: Form edit karyawan
app.get('/edit-karyawan/:id_karyawan', (req, res) => {
    const id_karyawan = req.params.id_karyawan;
    db.query('SELECT * FROM karyawan WHERE id_karyawan = ?', [id_karyawan], (err, results) => {
        if (err) throw err;
        res.render('karyawan/edit', {karyawan: results[0]});
    });
});

app.post('/edit-karyawan/:id_karyawan', upload.single('file'), (req, res) => {
    const { nama_karyawan, jabatan, alamat_karyawan, no_hp } = req.body;
    const id_karyawan = req.params.id_karyawan;
    const { filename, path: filePath } = req.file;
    db.query('UPDATE karyawan SET nama_karyawan = ?, jabatan = ?, alamat_karyawan = ?, no_hp = ? WHERE id_karyawan = ?',
        [nama_karyawan, jabatan, alamat_karyawan, no_hp, id_karyawan],
        (err, results) => {
            if (err) throw err;

            db.query('SELECT filePath FROM karyawan WHERE id_karyawan = ?', [id_karyawan], (err, results) => {
                if (err) throw err;
                const oldFilePath = results[0]?.filePath;

                if (oldFilePath && fs.existsSync(oldFilePath)) {
                    fs.unlink(oldFilePath, (err) => {
                        if (err) {
                            console.error('Gagal hapus file lama:', err);
                    }

                    //Update gambar baru
                db.query('UPDATE karyawan SET filename = ?, filePath = ? WHERE id_karyawan = ?',
                    [filename, filePath, id_karyawan], (err) => {
                        if (err) throw err;
                        res.redirect('/karyawan');
                    });
            });
        } else {
                //Jika tidak ada file lama, langsung update
                db.query('UPDATE karyawan SET filename = ?, filePath = ? WHERE id_karyawan = ?',
                    [filename, filePath, id_karyawan], (err) => {
                        if (err) throw err;
                        res.redirect('/karyawan');
                    });
            }
        });
        }
    );
});

//DELETE karyawan
app.get('/delete-karyawan/:id_karyawan', (req, res) => {
    const id_karyawan = req.params.id_karyawan;

    db.query('SELECT filepath FROM karyawan WHERE id_karyawan = ?', [id_karyawan], (err, results) => {
        if (err) throw err;
        const imagePath = results[0]?.filePath;

        if (imagePath) {
            //Menghapus gambar dari server
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Gagal hapus file:', err);
                }

            //Menghapus gambar dari database
            db.query('DELETE FROM karyawan WHERE id_karyawan = ?', [id_karyawan], (err) => {
        if (err) throw err;
        res.redirect('/karyawan');    
            });
        });
    } else {
        //Jika filepath tidak ada, langsung hapus dari database
        db.query('DELETE FROM karyawan WHERE id_karyawan = ?', [id_karyawan], (err) => {
            if (err) throw err;
            res.redirect('/karyawan');
        });
    }
    });
});

//READ: Menampilkan semua pelanggan
app.get('/pelanggan', (req, res) => {
    db.query('SELECT * FROM pelanggan', (err, results) => {
        if (err) throw err;
        res.render('pelanggan/index', { pelanggan: results});
        console.log(results); //Mengecek hasil query
    });
});

//CREATE: Form tambah pelanggan
app.get('/add-pelanggan', (req, res) => {
    res.render('pelanggan/add');
});

app.post('/add-pelanggan', upload.single('file'), (req, res) => {
    const {id_pelanggan, nama_pelanggan, alamat_pelanggan, no_hp} = req.body;
    const {filename, path: filePath} = req.file;
    db.query('INSERT INTO pelanggan SET ?', {id_pelanggan, nama_pelanggan, alamat_pelanggan, no_hp, filename, filePath}, (err) => {
        if (err) throw err;
        res.redirect('/pelanggan');
    });
});

//UPDATE: Form pelanggan
app.get('/edit-pelanggan/:id_pelanggan', (req, res) => {
    const id_pelanggan = req.params.id_pelanggan;
    db.query('SELECT * FROM pelanggan WHERE id_pelanggan = ?', [id_pelanggan], (err, results) => {
        if (err) throw err;
        res.render('pelanggan/edit', {pelanggan: results[0]});
    });
});

app.post('/edit-pelanggan/:id_pelanggan', upload.single('file'), (req, res) => {
    const { nama_pelanggan, alamat_pelanggan, no_hp } = req.body;
    const id_pelanggan = req.params.id_pelanggan;
    const { filename, path: filePath } = req.file;

    db.query('UPDATE pelanggan SET nama_pelanggan = ?, alamat_pelanggan = ?, no_hp = ? WHERE id_pelanggan = ?',
        [nama_pelanggan, alamat_pelanggan, no_hp, id_pelanggan],
        (err, results) => {
            if (err) throw err;

            db.query('SELECT filePath FROM pelanggan WHERE id_pelanggan = ?', [id_pelanggan], (err, results) => {
                if (err) throw err;
                const oldFilePath = results[0]?.filePath;

                if (oldFilePath && fs.existsSync(oldFilePath)) {
                    fs.unlink(oldFilePath, (err) => {
                        if (err) {
                            console.error('Gagal hapus file lama:', err);
                        }

                    //Update gambar baru
                db.query('UPDATE pelanggan SET filename = ?, filePath = ? WHERE id_pelanggan = ?',
                    [filename, filePath, id_pelanggan], (err) => {
                        if (err) throw err;
                        res.redirect('/pelanggan');
                    });
            });
        } else {
                //Jika tidak ada file lama, langsung update
                db.query('UPDATE pelanggan SET filename = ?, filePath = ? WHERE id_pelanggan = ?',
                    [filename, filePath, id_pelanggan], (err) => {
                        if (err) throw err;
                        res.redirect('/pelanggan');
                    });
        }
        });
    });
});

//DELETE pelanggan
app.get('/delete-pelanggan/:id_pelanggan', (req, res) => {
    const id_pelanggan = req.params.id_pelanggan;
db.query('SELECT filepath FROM pelanggan WHERE id_pelanggan = ?', [id_pelanggan], (err, results) => {
        if (err) throw err;
        const imagePath = results[0]?.filePath;

        if (imagePath) {
            //Menghapus gambar dari server
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Gagal hapus file:', err);
                }

            //Menghapus gambar dari database
             db.query('DELETE FROM pelanggan WHERE id_pelanggan = ?', [id_pelanggan], (err) => {
        if (err) throw err;
        res.redirect('/pelanggan');
            });
        });
        } else {
        //Jika filepath tidak ada, langsung hapus dari database
        db.query('DELETE FROM pelanggan WHERE id_pelanggan = ?', [id_pelanggan], (err) => {
            if (err) throw err;
            res.redirect('/pelanggan');
        });
        }
    });

    });


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});