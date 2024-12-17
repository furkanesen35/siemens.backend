const express = require('express');
const multer = require("multer")
const cors = require('cors');
const path = require("path");
const fs = require("fs");
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 4000;
const upload = multer({ dest: "uploads/" })

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
 db.run("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT)");
 db.run(`
  CREATE TABLE IF NOT EXISTS videos (
   id INTEGER PRIMARY KEY, 
   title TEXT, 
   description TEXT, 
   category_id INTEGER, 
   filename TEXT, 
   tags TEXT, 
   FOREIGN KEY(category_id) REFERENCES categories(id)
  )`
 );
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/categories', (req, res) => {
 db.all('SELECT * FROM categories', [], (err, rows) => {
  if (err) {
   return res.status(500).send({ message: 'Error fetching categories.' });
  }
  res.send(rows);
 });
});

app.post('/categories', (req, res) => {
 const { name } = req.body;
 if (!name || name.trim() === '') {
  return res.status(400).send({ message: 'Category name is required.' });
 }
 db.run('INSERT INTO categories (name) VALUES (?)', [name.trim()], function (err) {
  if (err) {
   return res.status(500).send({ message: 'Error adding category.' });
  }
  res.status(201).send({ id: this.lastID, name: name.trim() });
 });
});

app.get("/videos", (req, res) => {
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

 db.all(query, (err, rows) => {
  if (err) {
   return res.status(500).json({ message: "Error fetching videos" });
  }
  res.json(rows);
 });
});

app.post("/upload", upload.single("video"), (req, res) => {
 if (!req.file) {
  return res.status(400).json({ message: "No video file uploaded" });
 }

 const { title, description, category, tags } = req.body;
 if (!title || !description || !category) {
  return res.status(400).json({ message: "All fields are required" });
 }

 const targetPath = path.join(__dirname, "uploads", req.file.originalname);

 fs.rename(req.file.path, targetPath, (err) => {
  if (err) {
   return res.status(500).json({ message: "Error saving video file" });
  }
  const parsedTags = tags ? JSON.stringify(JSON.parse(tags)) : "[]"
  db.run(
   "INSERT INTO videos (title, description, category_id, filename, tags) VALUES (?, ?, ?, ?, ?)",
   [title, description, category, req.file.originalname, parsedTags],
   function (err) {
    if (err) {
     return res.status(500).json({ message: "Error saving video metadata" });
    }
    res.json({ message: "Video uploaded successfully!", id: this.lastID });
   }
  );
 });
});

app.listen(PORT, () => {
 console.log(`Server is running on port ${PORT}`);
});