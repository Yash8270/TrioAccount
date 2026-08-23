const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all notifications globally (for admin view)
router.get('/all', async (req, res) => {
  try {
    const [notifications] = await db.execute(`
      SELECT n.*, u.name as member_name 
      FROM notifications n 
      LEFT JOIN users u ON n.email = u.email 
      ORDER BY n.created_at DESC
    `);
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching all notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get VAPID Public Key
router.get('/vapid-public-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ success: false, error: 'VAPID keys not configured' });
  }
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Get all notifications for a specific user
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const [notifications] = await db.execute(
      'SELECT * FROM notifications WHERE email = ? ORDER BY created_at DESC',
      [email]
    );
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new notification
router.post('/', async (req, res) => {
  try {
    const { email, admin_email, message } = req.body;
    
    if (!email || !admin_email || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const [result] = await db.execute(
      'INSERT INTO notifications (email, admin_email, message) VALUES (?, ?, ?)',
      [email, admin_email, message]
    );

    const newNotification = {
      id: result.insertId,
      email,
      admin_email,
      message,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // Broadcast the new notification to sockets
    if (req.io) {
      req.io.emit('receive_alert', newNotification);
    }

    // Send Native Web Push Notification if configured
    if (req.webpush) {
      try {
        const [subs] = await db.execute('SELECT * FROM push_subscriptions WHERE email = ?', [email]);
        const payload = JSON.stringify({
          title: 'TrioAccount Alert',
          body: message,
          icon: '/vite.svg',
          url: '/notifications'
        });

        const pushPromises = subs.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          try {
            await req.webpush.sendNotification(pushSubscription, payload);
          } catch (e) {
            // if gone (410), delete subscription
            if (e.statusCode === 410 || e.statusCode === 404) {
              await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
            } else {
              console.error('Error sending push:', e);
            }
          }
        });
        await Promise.all(pushPromises);
      } catch (err) {
        console.error('Error fetching push subscriptions:', err);
      }
    }

    res.status(201).json({ success: true, notification: newNotification });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark notification as read
router.post('/read', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing notification ID' });
    }

    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark all notifications as read for a user
router.post('/read-all', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing email' });
    }

    await db.execute('UPDATE notifications SET is_read = 1 WHERE email = ? AND is_read = 0', [email]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Save Push Subscription
router.post('/subscribe', async (req, res) => {
  try {
    const { email, subscription } = req.body;
    if (!email || !subscription) {
      return res.status(400).json({ success: false, error: 'Missing email or subscription' });
    }

    await db.execute(
      `INSERT INTO push_subscriptions (email, endpoint, p256dh, auth) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth), email=VALUES(email)`,
      [email, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
