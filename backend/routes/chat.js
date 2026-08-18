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

// Get all chats with seen status
router.get('/', authenticate, async (req, res) => {
  try {
    const [chats] = await db.execute('SELECT * FROM chats ORDER BY timestamp ASC');
    const [seenStatus] = await db.execute('SELECT chat_id, user_email, seen_at FROM chat_status WHERE is_seen = 1');

    const formattedChats = chats.map(chat => {
      // Find all emails that have seen this chat
      const seenBy = seenStatus
        .filter(status => status.chat_id === chat.id)
        .map(status => ({ email: status.user_email, seenAt: status.seen_at }));

      return {
        ...chat,
        seenBy
      };
    });

    res.json(formattedChats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
