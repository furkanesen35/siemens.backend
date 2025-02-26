// server.js
const express = require('express');
const cors = require('cors');
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;
const { router: authRouter } = require('./routes/auth');

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Load routes
app.use('/auth', authRouter);
app.use('/categories', require('./routes/categories'));
app.use('/videos', require('./routes/videos'));

module.exports = () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};