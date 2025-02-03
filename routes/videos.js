const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 200 * 1024 * 1024 // 10MB limit, adjust as needed
  }
});

router.get('/', async (req, res) => {
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
  const result = await db.query(query);
  res.json(result.rows);
 } catch (err) {
  console.error("Error fetching videos:", err);
  res.status(500).json({ message: "Error fetching videos" });
 }
});

router.post('/', upload.single("video"), async (req, res) => {
 if (!req.file) {
  return res.status(400).json({ message: "No video file uploaded" });
 }

 const { title, description, category, tags } = req.body;
 if (!title || !description || !category) {
  return res.status(400).json({ message: "All fields are required" });
 }

 const targetPath = path.join(__dirname, "../uploads", req.file.originalname);

 fs.rename(req.file.path, targetPath, async (err) => {
  if (err) {
   return res.status(500).json({ message: "Error saving video file" });
  }

  try {
   const result = await db.query(
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

router.delete('/:id', async (req, res) => {
 const { id } = req.params;

 try {
  const videoQuery = await db.query('SELECT filename FROM videos WHERE id = $1', [id]);
  const video = videoQuery.rows[0];

  if (!video) {
   return res.status(404).json({ message: "Video not found" });
  }

  const filePath = path.join(__dirname, "../uploads", video.filename);

  await db.query('DELETE FROM videos WHERE id = $1', [id]);
  
  await fs.promises.unlink(filePath);

  res.status(200).json({ message: "Video deleted successfully" });
 } catch (error) {
  console.error("Error deleting video:", error);
  res.status(500).json({ message: "Error deleting video" });
 }
});

module.exports = router;