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
  const getISTDateString = (date) => {
    return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  
  const startDateStr = '08/13/2026';
  const todayStr = getISTDateString(new Date());
  
  const startDate = new Date(startDateStr);
  const todayDate = new Date(todayStr);
  
  const diffTime = todayDate - startDate;
  const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1); // inclusive of start date
  const expectedAmount = diffDays * 20;

  try {
    const [paidRows] = await db.execute('SELECT users.name, SUM(transactions.amount) as total_paid FROM transactions JOIN users ON transactions.email = users.email GROUP BY users.name');
    const [users] = await db.execute('SELECT email, name, isadmin, last_active FROM users');

    const balances = users.map(user => {
      const paidRow = paidRows.find(r => r.name === user.name);
      const totalPaid = paidRow ? parseFloat(paidRow.total_paid) : 0;
      
      let balance = totalPaid - expectedAmount;

      let pending = 0;
      let owed = 0;

      if (balance < 0) {
        const deficit = Math.abs(balance);
        pending = Math.min(deficit, 20); // Today's 20 is pending
        owed = deficit - pending; // Anything older than today is owed
      }

      return {
        email: user.email,
        name: user.name,
        total_paid: totalPaid,
        expected_amount: expectedAmount,
        balance: balance,
        pending: pending,
        owed: owed,
        isadmin: user.isadmin,
        last_active: user.last_active
      };
    });

    res.json({ expectedAmount, balances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
