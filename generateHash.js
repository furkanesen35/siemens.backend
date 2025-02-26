// generateHash.js
const bcrypt = require('bcrypt');

bcrypt.hash('thereisspoon35', 10, (err, hash) => {
  if (err) console.error('Error:', err);
  console.log('Hashed Password:', hash);
});