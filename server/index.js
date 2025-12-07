const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3001;

// middleware
app.use(cors());
app.use(express.json());

// init DB
const db = new sqlite3.Database('./reviews.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produkId TEXT NOT NULL,
      userName TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
});

// GET semua review / per produk
app.get('/api/reviews', (req, res) => {
  const { produkId } = req.query;
  let sql = 'SELECT * FROM reviews';
  const params = [];

  if (produkId && produkId !== 'all') {
    sql += ' WHERE produkId = ?';
    params.push(produkId);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// POST tambah review
app.post('/api/reviews', (req, res) => {
  const { produkId, userName, rating, text } = req.body;
  if (!produkId || !userName || !rating || !text) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const createdAt = new Date().toISOString();
  const sql = `
    INSERT INTO reviews (produkId, userName, rating, text, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(sql, [produkId, userName, rating, text, createdAt], function (err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.status(201).json({
      id: this.lastID,
      produkId,
      userName,
      rating,
      text,
      createdAt
    });
  });
});

// (opsional) DELETE review
app.delete('/api/reviews/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM reviews WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log('Review API running on http://localhost:' + PORT);
});