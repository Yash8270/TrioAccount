# TrioAccount

A full-stack web application to manage daily collections among three friends, including real-time chat.

## Features
- **Daily Balances**: Calculates how much each person owes based on a start date of Aug 13, 2026.
- **Transactions**: Log payments (cash or online).
- **Real-time Chat**: WebSocket-powered chat with typing indicators and read receipts.
- **Admin Panel**: Admins can invite new members.

## Tech Stack
- **Frontend**: React, Vite, Lucide React, Socket.io-client
- **Backend**: Node.js, Express, SQLite, Socket.io, JWT

## Setup Instructions

### 1. Backend Setup (TiDB)
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Configure Database**:
   Create a `.env` file in the `backend` directory and add your TiDB connection string:
   ```env
   TIDB_URL=mysql://username:password@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/trio_account?ssl={"rejectUnauthorized":true}
   ```
4. **Create the First Admin User**:
   Since the app uses `bcrypt` to hash passwords, you cannot insert plain text (e.g. "admin123") directly into TiDB. You must generate a hash first. Run this quick command in your terminal to get a hash for "admin123":
   ```bash
   node -e "require('bcrypt').hash('admin123', 10).then(console.log)"
   ```
   *Copy the output hash and use it in your TiDB SQL Insert command:*
   ```sql
   INSERT INTO users (email, name, password, isadmin) VALUES ('admin@example.com', 'Admin', '<PASTE_YOUR_HASH_HERE>', 1);
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will automatically create the required tables in your TiDB cluster and run on `http://localhost:5000`.

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

### 3. Usage
1. Open the frontend URL in your browser.
2. Log in using `admin@example.com` and password `admin`.
3. Go to the **Admin** tab to add your two friends to the system.
4. For the friend who paid Rs 120 directly, go to **Transactions** and log a ₹120 payment for them. The system will automatically calculate their free days!

## Hosting Note
Since you are using TiDB Cloud, your database is already securely hosted in the cloud. You can host the frontend (Vite/React) on platforms like Vercel or Netlify, and the backend (Node.js) on platforms like Render, Heroku, or DigitalOcean without any issues of data loss upon server restart!
