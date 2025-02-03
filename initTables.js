const db = require('./db');

async function initTables() {
 try {
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
    tags JSONB
   );
  `);

  await db.query(`
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
}

module.exports = initTables;