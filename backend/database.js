const mysql = require('mysql2/promise');
require('dotenv').config();

const dbUrl = process.env.TIDB_URL || 'mysql://root:@localhost:4000/test';
const isTiDBCloud = dbUrl.includes('tidbcloud.com');

// Default TiDB / MySQL Connection Pool
const pool = mysql.createPool({
  uri: dbUrl,
  ssl: isTiDBCloud ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  } : undefined
});

const initializeDB = async () => {
  try {
    const connection = await pool.getConnection();

    // Users Table
    // await connection.execute(`
    //   CREATE TABLE IF NOT EXISTS users (
    //     email VARCHAR(255) PRIMARY KEY,
    //     name VARCHAR(255) NOT NULL,
    //     password VARCHAR(255) NOT NULL,
    //     isadmin BOOLEAN DEFAULT 0
    //   )
    // `);

    // // Transactions Table
    // await connection.execute(`
    //   CREATE TABLE IF NOT EXISTS transactions (
    //     transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    //     transaction_mode ENUM('cash', 'online') NOT NULL,
    //     amount DECIMAL(10, 2) NOT NULL,
    //     date DATE NOT NULL,
    //     email VARCHAR(255) NOT NULL,
    //     FOREIGN KEY (email) REFERENCES users(email)
    //   )
    // `);

    // // Chats Table
    // await connection.execute(`
    //   CREATE TABLE IF NOT EXISTS chats (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     sender_email VARCHAR(255) NOT NULL,
    //     content TEXT NOT NULL,
    //     timestamp DATETIME NOT NULL,
    //     FOREIGN KEY (sender_email) REFERENCES users(email)
    //   )
    // `);

    // // Chat Status Table (for seen status)
    // await connection.execute(`
    //   CREATE TABLE IF NOT EXISTS chat_status (
    //     chat_id INT NOT NULL,
    //     user_email VARCHAR(255) NOT NULL,
    //     is_seen BOOLEAN DEFAULT 0,
    //     PRIMARY KEY (chat_id, user_email),
    //     FOREIGN KEY (chat_id) REFERENCES chats(id),
    //     FOREIGN KEY (user_email) REFERENCES users(email)
    //   )
    // `);

    try {
      await connection.execute(`ALTER TABLE chat_status ADD COLUMN seen_at DATETIME`);
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN last_active DATETIME`);
    } catch (e) {
      // Column might already exist
    }

    // Push Subscriptions Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        endpoint VARCHAR(1000) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email) REFERENCES users(email),
        UNIQUE KEY unique_endpoint (endpoint(255))
      )
    `);

    console.log("TiDB schema initialized successfully");
    connection.release();
  } catch (error) {
    console.error("Failed to initialize TiDB schema:", error);
  }
};

initializeDB();

module.exports = pool;
