-- Create Database (Optional, depending on your TiDB setup)
-- CREATE DATABASE IF NOT EXISTS trio_account;
-- USE trio_account;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    isadmin BOOLEAN DEFAULT 0
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_mode ENUM('cash', 'online') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    email VARCHAR(255) NOT NULL,
    CONSTRAINT fk_transaction_user 
        FOREIGN KEY (email) 
        REFERENCES users(email) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- 3. Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    CONSTRAINT fk_chat_sender 
        FOREIGN KEY (sender_email) 
        REFERENCES users(email) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- 4. Chat Status Table (Read Receipts)
CREATE TABLE IF NOT EXISTS chat_status (
    chat_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    is_seen BOOLEAN DEFAULT 0,
    PRIMARY KEY (chat_id, user_email),
    CONSTRAINT fk_chatstatus_chat 
        FOREIGN KEY (chat_id) 
        REFERENCES chats(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_chatstatus_user 
        FOREIGN KEY (user_email) 
        REFERENCES users(email) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);
