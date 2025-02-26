// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const SECRET_KEY = 'your-secret-key'; // Use environment variables in production

// Login route
router.post('/login', async (req, res) => {
 const { username, password } = req.body;
  
 try {
  const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user || !await bcrypt.compare(password, user.password)) {
   return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
   expiresIn: '1h'
  });

  res.json({ token, userId: user.id, username: user.username });
 } catch (err) {
  console.error('Login error:', err);
  res.status(500).json({ message: 'Server error' });
 }
});

// Verify token middleware (optional, for protected routes if needed later)
const verifyToken = async (req, res, next) => {
 const token = req.headers.authorization?.split(' ')[1];

 if (!token) {
  req.user = null; // No user if no token
  return next();
 }

 try {
  const decoded = jwt.verify(token, SECRET_KEY);
  req.user = decoded;
  next();
 } catch (err) {
  req.user = null; // Invalid token treated as not logged in
  next();
 }
};

module.exports = { router, verifyToken };