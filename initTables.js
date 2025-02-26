const db = require("./db");

async function initTables() {
 try {
  await db.query(`
   CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
  `);

  await db.query(`
   CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
   );
  `);

  await db.query(`
   CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER,
    filename TEXT NOT NULL,
    subtitle_filename TEXT,  -- New column for subtitle file
    tags JSONB,
    uploaded_by INTEGER REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
   );
  `);

  console.log("Tables created successfully!");
 } catch (err) {
  console.error("Error creating tables:", err);
 }
}

module.exports = initTables;