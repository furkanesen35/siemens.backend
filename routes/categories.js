// routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('./auth');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

module.exports = router;