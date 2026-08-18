const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'trio_account_secret';

// Middleware to authenticate
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};

// Get all transactions
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.*, u.name 
      FROM transactions t 
      JOIN users u ON t.email = u.email 
      ORDER BY t.date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a transaction
router.post('/', authenticate, async (req, res) => {
  const { transaction_mode, amount, date, email } = req.body;
  if (!['cash', 'online'].includes(transaction_mode) || !amount || !date || !email) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO transactions (transaction_mode, amount, date, email) VALUES (?, ?, ?, ?)',
      [transaction_mode, amount, date, email]
    );
    res.json({ transaction_id: result.insertId, transaction_mode, amount, date, email });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get balances
router.get('/balances', authenticate, async (req, res) => {
  // Start date is August 13, 2026
  const startDate = new Date('2026-08-13T00:00:00');
  const today = new Date();
  
  // Calculate difference in days (inclusive of start date)
  const diffTime = Math.abs(today - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const expectedAmount = diffDays * 20;

  try {
    const [paidRows] = await db.execute('SELECT users.name, SUM(transactions.amount) as total_paid FROM transactions JOIN users ON transactions.email = users.email GROUP BY users.name');
    const [users] = await db.execute('SELECT email, name, isadmin FROM users');

    const balances = users.map(user => {
      const paidRow = paidRows.find(r => r.name === user.name);
      // Ensure we treat the value as a number (DECIMAL returns as string in mysql2 by default sometimes)
      const totalPaid = paidRow ? parseFloat(paidRow.total_paid) : 0;
      
      let balance = totalPaid - expectedAmount;
      if (user.isadmin) {
         balance = 0; // Admin doesn't owe
      }

      return {
        email: user.email,
        name: user.name,
        total_paid: totalPaid,
        expected_amount: user.isadmin ? totalPaid : expectedAmount,
        balance: balance,
        isadmin: user.isadmin
      };
    });

    res.json({ expectedAmount, balances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
