const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const path = require('path');
require('dotenv').config();

const app = express();

const allowedOrigins = ['http://localhost:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Web Push Configuration
let webpush = null;
try {
  webpush = require('web-push');
} catch (e) {
  console.warn('\x1b[33m%s\x1b[0m', 'Warning: web-push module not found. Native push disabled. Please run "npm install web-push" in the backend directory.');
}

if (webpush) {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
      const keys = webpush.generateVAPIDKeys();
      process.env.VAPID_PUBLIC_KEY = keys.publicKey;
      process.env.VAPID_PRIVATE_KEY = keys.privateKey;
      console.log('\n--- GENERATED TEMP VAPID KEYS ---');
      console.log('Add these to your backend .env file:');
      console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
      console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
      console.log('-----------------------------------\n');
    }

    webpush.setVapidDetails(
      'mailto:admin@trioaccount.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error('Failed to configure web-push:', err);
  }
}

// Pass io and webpush to routes
app.use((req, res, next) => {
  req.io = io;
  req.webpush = webpush;
  next();
});

// Import Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io for Real-time Chat
const connectedSockets = new Map(); // socket.id -> email

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  const broadcastOnlineUsers = () => {
    const uniqueUsers = Array.from(new Set(connectedSockets.values()));
    io.emit('online_users', uniqueUsers);
  };

  socket.on('user_connected', (email) => {
    connectedSockets.set(socket.id, email);
    broadcastOnlineUsers();
  });

  socket.on('typing', ({ email, isTyping }) => {
    socket.broadcast.emit('user_typing', { email, isTyping });
  });

  socket.on('send_message', async (data) => {
    // data: { sender_email, content }
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    try {
      const [result] = await db.execute(
        `INSERT INTO chats (sender_email, content, timestamp) VALUES (?, ?, ?)`,
        [data.sender_email, data.content, timestamp]
      );
      
      const message = { id: result.insertId, sender_email: data.sender_email, content: data.content, timestamp, seenBy: [] };
      io.emit('receive_message', message);
    } catch (err) {
      console.error('Error saving chat:', err);
    }
  });

  socket.on('mark_seen', async ({ chat_id, user_email }) => {
    try {
      const seen_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        `INSERT IGNORE INTO chat_status (chat_id, user_email, is_seen, seen_at) VALUES (?, ?, 1, ?)`,
        [chat_id, user_email, seen_at]
      );
      io.emit('message_seen', { chat_id, user_email, seen_at });
    } catch (err) {
      console.error('Error marking seen:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (connectedSockets.has(socket.id)) {
      connectedSockets.delete(socket.id);
      broadcastOnlineUsers();
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
