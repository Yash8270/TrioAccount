const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'trio_account_secret';

// Middleware to authenticate and check admin
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    if (!decoded.isadmin) return res.status(403).json({ error: 'Forbidden. Admins only.' });
    req.user = decoded;
    next();
  });
};

// Add a new member
router.post('/add-member', authenticateAdmin, async (req, res) => {
  const { name, email, password, isadmin } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminFlag = isadmin ? 1 : 0;

    await db.execute(
      'INSERT INTO users (email, name, password, isadmin) VALUES (?, ?, ?, ?)',
      [email, name, hashedPassword, adminFlag]
    );
    res.json({ message: 'User created successfully', email, name, isadmin: adminFlag });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all members
router.get('/members', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT email, name, isadmin FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update member role
router.put('/role', authenticateAdmin, async (req, res) => {
  const { email, isadmin } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Prevent user from removing their own admin status (safety check)
  if (email === req.user.email && !isadmin) {
    return res.status(400).json({ error: 'Cannot remove your own admin status' });
  }

  try {
    const adminFlag = isadmin ? 1 : 0;
    await db.execute(
      'UPDATE users SET isadmin = ? WHERE email = ?',
      [adminFlag, email]
    );
    res.json({ message: 'Role updated successfully', email, isadmin: adminFlag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Change member password
router.put('/change-password', authenticateAdmin, async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required' });

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );
    res.json({ message: 'Password updated successfully', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
