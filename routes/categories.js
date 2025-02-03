const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require("path");
const fs = require("fs");

router.get('/', async (req, res) => {
 try {
  const result = await db.query('SELECT * FROM categories');
  res.json(result.rows);
 } catch (err) {
  console.error("Error fetching categories:", err);
  res.status(500).send({ message: 'Error fetching categories.' });
 }
});

router.post('/', async (req, res) => {
 const { name } = req.body;
 if (!name || name.trim() === '') {
  return res.status(400).send({ message: 'Category name is required.' });
 }

 try {
  const result = await db.query(
   'INSERT INTO categories (name) VALUES ($1) RETURNING *',
   [name.trim()]
  );
  res.status(201).send(result.rows[0]);
 } catch (err) {
  console.error("Error adding category:", err);
  res.status(500).send({ message: 'Error adding category.' });
 }
});

router.delete('/:id', async (req, res) => {
 const { id } = req.params;
 
 try {
  const videos = await db.query(
   'SELECT filename FROM videos WHERE category_id = $1', 
   [id]
  );

  const result = await db.query(
   'DELETE FROM categories WHERE id = $1 RETURNING *', 
   [id]
  );

  if (result.rowCount === 0) {
   return res.status(404).json({ message: 'Category not found' });
  }

  for (const video of videos.rows) {
   const filePath = path.join(__dirname, "../uploads", video.filename);
   try {
    await fs.promises.unlink(filePath);
   } catch (fileError) {
    console.error(`Failed to delete file ${video.filename}:`, fileError);
   }
  }

  res.status(200).json({ message: 'Category and associated videos deleted successfully', category: result.rows[0] });
 } catch (err) {
  console.error("Error deleting category:", err);
  res.status(500).json({ message: 'Error deleting category.' });
 }
});

module.exports = router;