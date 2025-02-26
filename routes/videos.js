const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken } = require("./auth");

const upload = multer({
 dest: "uploads/",
 limits: {
  fileSize: 200 * 1024 * 1024,
 },
}).fields([
 { name: "video", maxCount: 1 },
 { name: "subtitle", maxCount: 1 }, // New field for subtitle
]);

router.get("/", async (req, res) => {
 const query = `
  SELECT 
   videos.id, 
   videos.title, 
   videos.description, 
   videos.filename,
   videos.subtitle_filename,  -- Return subtitle filename
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

router.post("/", verifyToken, upload, async (req, res) => {
 if (!req.files || !req.files["video"]) {
  return res.status(400).json({ message: "No video file uploaded" });
 }

 const { title, description, category, tags } = req.body;
 if (!title || !description || !category) {
  return res.status(400).json({ message: "All fields are required" });
 }

 const videoFile = req.files["video"][0];
 const subtitleFile = req.files["subtitle"] ? req.files["subtitle"][0] : null;

 const videoTargetPath = path.join(__dirname, "../uploads", videoFile.originalname);
 let subtitleTargetPath = null;

 if (subtitleFile) {
  subtitleTargetPath = path.join(__dirname, "../uploads", subtitleFile.originalname);
 }

 fs.rename(videoFile.path, videoTargetPath, async (err) => {
  if (err) {
   return res.status(500).json({ message: "Error saving video file" });
  }

  if (subtitleFile) {
   fs.rename(subtitleFile.path, subtitleTargetPath, async (err) => {
    if (err) {
     return res.status(500).json({ message: "Error saving subtitle file" });
    }
   });
  }

  try {
   const result = await db.query(
    "INSERT INTO videos (title, description, category_id, filename, subtitle_filename, tags, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
     title,
     description,
     category,
     videoFile.originalname,
     subtitleFile ? subtitleFile.originalname : null,
     tags,
     req.user?.id || null,
    ]
   );
   res.json({ message: "Video uploaded successfully!", id: result.rows[0].id });
  } catch (dbErr) {
   console.error("Error saving video metadata:", dbErr);
   res.status(500).json({ message: "Error saving video metadata" });
  }
 });
});

router.delete("/:id", verifyToken, async (req, res) => {
 const { id } = req.params;

 try {
  const videoQuery = await db.query("SELECT filename, subtitle_filename FROM videos WHERE id = $1", [id]);
  const video = videoQuery.rows[0];

  if (!video) {
   return res.status(404).json({ message: "Video not found" });
  }

  const videoFilePath = path.join(__dirname, "../uploads", video.filename);
  const subtitleFilePath = video.subtitle_filename ? path.join(__dirname, "../uploads", video.subtitle_filename) : null;

  await db.query("DELETE FROM videos WHERE id = $1", [id]);
  await fs.promises.unlink(videoFilePath);
  if (subtitleFilePath) await fs.promises.unlink(subtitleFilePath);

  res.status(200).json({ message: "Video deleted successfully" });
 } catch (error) {
  console.error("Error deleting video:", error);
  res.status(500).json({ message: "Error deleting video" });
 }
});

module.exports = router;