# ReWear App

A full-stack clothing swap platform built with React, Node.js, Express, and PostgreSQL.

---

## Table of Contents
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Frontend Routes](#frontend-routes)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Admin User Setup](#admin-user-setup)
- [Development Tips](#development-tips)

---

## Project Structure

```
rewear app/
  rewear app/
    client/      # React frontend
    server/      # Node.js/Express backend
```

---

## API Endpoints

**Auth**
- `POST   /api/auth/register` — Register a new user
- `POST   /api/auth/login` — Login
- `GET    /api/auth/profile` — Get current user profile

**Items**
- `GET    /api/items` — List all approved & available items
- `GET    /api/items/featured` — List featured items
- `GET    /api/items/:id` — Get item details
- `POST   /api/items` — Create new item (auth required)
- `PUT    /api/items/:id` — Update item (auth required)
- `DELETE /api/items/:id` — Delete item (auth required)
- `GET    /api/items/user/me` — Get current user's items

**Swaps**
- `POST   /api/swaps` — Create swap request
- `GET    /api/swaps/my-requests` — My swap requests
- `GET    /api/swaps/my-items` — Requests for my items
- `PUT    /api/swaps/:id/accept` — Accept swap
- `PUT    /api/swaps/:id/reject` — Reject swap
- `PUT    /api/swaps/:id/complete` — Complete swap
- `GET    /api/swaps/stats` — Swap stats

**Users**
- `GET    /api/users/profile` — Get user profile & stats
- `PUT    /api/users/profile` — Update profile
- `GET    /api/users/items` — Get user's items
- `GET    /api/users/swaps` — Get user's swap history
- `GET    /api/users/stats` — Get user stats
- `GET    /api/users/points` — Get user points

**Admin** (admin only)
- `GET    /api/admin/items/pending` — List pending items
- `PUT    /api/admin/items/:id/approve` — Approve item
- `PUT    /api/admin/items/:id/reject` — Reject item
- `GET    /api/admin/items` — List all items
- `GET    /api/admin/users` — List all users
- `PUT    /api/admin/users/:id/admin` — Toggle admin status
- `PUT    /api/admin/users/:id/points` — Adjust user points
- `GET    /api/admin/stats` — Dashboard stats
- `GET    /api/admin/categories` — Category stats

**Public Stats**
- `GET    /api/stats` — Public stats for landing page

---

## Frontend Routes

- `/` — Landing page
- `/login` — Login
- `/register` — Register
- `/browse` — Browse items
- `/item/:id` — Item details
- `/add-item` — List an item (protected)
- `/edit-item/:id` — Edit item (protected)
- `/dashboard` — User dashboard (protected)
- `/admin` — Admin dashboard (admin only)
- `/admin/users` — Admin management (admin only)

---

## Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create the database:**
   ```sql
   CREATE DATABASE rewear2;
   ```
3. **Create tables:**
   - The backend auto-creates tables on startup (see `server/config/database.js`).
   - Or, you can manually run the following DDL (simplified):

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  points INTEGER DEFAULT 100,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  size VARCHAR(50),
  condition VARCHAR(50) NOT NULL,
  tags TEXT[],
  images TEXT[],
  points_value INTEGER DEFAULT 50,
  is_available BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Swaps table
CREATE TABLE IF NOT EXISTS swaps (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  offered_item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  swap_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  points_offered INTEGER DEFAULT 0,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Running the App

### 1. Backend (API server)

```
cd "rewear app/rewear app/server"
npm install
npm run dev
```
- The server runs on [http://localhost:5000](http://localhost:5000)
- **Database and server credentials are hardcoded in `server/config/database.js`.**
- If you need to change the database user, password, or other settings, edit the config at the top of that file:

```js
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rewear2',
  password: 'password',
  port: 5432,
});
```

### 2. Frontend (React app)

```
cd "rewear app/rewear app/client"
npm install
npm start
```
- The app runs on [http://localhost:3000](http://localhost:3000)

---

## Admin User Setup

To make a user an admin:
1. Register a user via the app or API.
2. In PostgreSQL, run:
   ```sql
   UPDATE users SET is_admin = true WHERE email = 'your@email.com';
   ```
3. Log out and log back in to refresh your admin status.

---

## Development Tips
- If you change database structure, restart the backend server.
- If you can't see admin features, make sure your user is marked as admin and you are logged in again.
- Uploaded images are stored in `server/uploads/`.
- For CORS issues, ensure your frontend and backend are running on the correct ports.
- For any issues, check the browser console and backend logs.

---

Happy swapping! 
