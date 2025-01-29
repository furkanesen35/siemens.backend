const express = require('express');
const multer = require("multer");
const cors = require('cors');
const path = require("path");
const fs = require("fs");
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 4000;
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// PostgreSQL connection configuration
const pool = new Pool({
 user: 'postgres',
 host: 'localhost',
 database: 'postgres',
 password: 'thereisspoon35',
 port: 5432,
});

// Ensure tables are created on server start
(async () => {
 try {
  await pool.query(`
   CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
   );
  `);

  await pool.query(`
   CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER,
    filename TEXT NOT NULL,
    tags JSONB
   );
  `);

  // Adding CASCADE to the foreign key relationship
  await pool.query(`
   ALTER TABLE videos
   DROP CONSTRAINT IF EXISTS videos_category_id_fkey;

   ALTER TABLE videos
   ADD CONSTRAINT videos_category_id_fkey
   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
  `);

  console.log("Tables created successfully!");
 } catch (err) {
  console.error("Error creating tables:", err);
 }
})();

app.get('/categories', async (req, res) => {
 try {
  const result = await pool.query('SELECT * FROM categories');
  res.json(result.rows);
 } catch (err) {
  console.error("Error fetching categories:", err);
  res.status(500).send({ message: 'Error fetching categories.' });
 }
});

app.post('/categories', async (req, res) => {
 const { name } = req.body;
 if (!name || name.trim() === '') {
  return res.status(400).send({ message: 'Category name is required.' });
 }

 try {
  const result = await pool.query(
   'INSERT INTO categories (name) VALUES ($1) RETURNING *',
   [name.trim()]
  );
  res.status(201).send(result.rows[0]);
 } catch (err) {
  console.error("Error adding category:", err);
  res.status(500).send({ message: 'Error adding category.' });
 }
});

app.get("/videos", async (req, res) => {
 const query = `
  SELECT 
   videos.id, 
   videos.title, 
   videos.description, 
   videos.filename,
   videos.tags,
   categories.name AS category
  FROM 
   videos
  LEFT JOIN 
   categories 
  ON 
   videos.category_id = categories.id
 `;

 try {
  const result = await pool.query(query);
  res.json(result.rows);
 } catch (err) {
  console.error("Error fetching videos:", err);
  res.status(500).json({ message: "Error fetching videos" });
 }
});

app.post("/upload", upload.single("video"), async (req, res) => {
 if (!req.file) {
  return res.status(400).json({ message: "No video file uploaded" });
 }

 const { title, description, category, tags } = req.body;
 if (!title || !description || !category) {
  return res.status(400).json({ message: "All fields are required" });
 }

 const targetPath = path.join(__dirname, "uploads", req.file.originalname);

 fs.rename(req.file.path, targetPath, async (err) => {
  if (err) {
   return res.status(500).json({ message: "Error saving video file" });
  }

  try {
   const result = await pool.query(
    "INSERT INTO videos (title, description, category_id, filename, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [title, description, category, req.file.originalname, tags]
   );
   res.json({ message: "Video uploaded successfully!", id: result.rows[0].id });
  } catch (dbErr) {
   console.error("Error saving video metadata:", dbErr);
   res.status(500).json({ message: "Error saving video metadata" });
  }
 });
});

// Backend: Add DELETE endpoint for videos
app.delete('/videos/:id', async (req, res) => {
 const { id } = req.params;

 try {
  // Fetch the video details to get the filename
  const videoQuery = await pool.query('SELECT filename FROM videos WHERE id = $1', [id]);
  const video = videoQuery.rows[0];

  if (!video) {
   return res.status(404).json({ message: "Video not found" });
  }

  const filePath = path.join(__dirname, "uploads", video.filename);

  // Delete the video record from the database
  await pool.query('DELETE FROM videos WHERE id = $1', [id]);
  
  // Remove the video file from the filesystem
  await fs.promises.unlink(filePath);

  res.status(200).json({ message: "Video deleted successfully" });
 } catch (error) {
  console.error("Error deleting video:", error);
  res.status(500).json({ message: "Error deleting video" });
 }
});

// New DELETE endpoint for categories with CASCADE and file deletion
app.delete('/categories/:id', async (req, res) => {
 const { id } = req.params;
 
 try {
  // Fetch videos linked to this category to delete their files
  const videos = await pool.query(
   'SELECT filename FROM videos WHERE category_id = $1', 
   [id]
  );

  // Delete category (this will cascade to videos in the database)
  const result = await pool.query(
   'DELETE FROM categories WHERE id = $1 RETURNING *', 
   [id]
  );

  if (result.rowCount === 0) {
   return res.status(404).json({ message: 'Category not found' });
  }

  // Delete video files from the filesystem
  for (const video of videos.rows) {
   const filePath = path.join(__dirname, "uploads", video.filename);
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

app.listen(PORT, () => {
 console.log(`Server is running on port ${PORT}`);
});