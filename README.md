# 🛠️ FoundIt – Lost & Found Platform (Backend)

This is the **backend** for **FoundIt**, a web application that allows students and faculty of Riphah University to report, discover, and manage lost and found items securely.

Built using **Node.js**, **Express**, and **MongoDB Atlas**, and deployed on **Railway**.

---

## 🌐 Live Backend

- 📡 Base API: `https://your-railway-backend-url.up.railway.app`

---

## 🚀 Features

- 🔒 Secure User & Admin Authentication (JWT)
- 👥 Role-Based Access Control
- 📤 Image Upload via Multer
- 🧾 CRUD APIs for Posts and Claims
- 📩 Notification System for Users
- 📊 Admin Stats Dashboard
- 🌍 CORS Configured for Netlify Frontend

---

## 📦 Tech Stack

| Technology   | Usage                       |
|--------------|-----------------------------|
| 🟢 Node.js    | Runtime Environment         |
| 🚂 Express.js | Backend Framework           |
| 🍃 MongoDB    | Cloud NoSQL Database        |
| 🔐 JWT        | Authentication Tokens       |
| 🧂 bcryptjs   | Password Hashing            |
| 🎒 Multer     | Image Upload Handling       |
| 🔄 CORS       | Cross-Origin Resource Sharing |
| ☁️ Railway    | Cloud Deployment Platform   |

---

## 📁 Folder Structure

```
backend/
│
├── uploads/               # Stores uploaded images
├── server.js              # Main Express server
├── .env                   # Environment variables
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root of your backend with the following:

```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_key
```

---

## 📦 Installation & Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/foundit-backend.git
cd foundit-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
node server.js
```

Server will run at `http://localhost:5000`

---

## 📡 API Endpoints

### 🔐 Auth

- `POST /api/signup` – Register (User or Admin)
- `POST /api/login` – Login (returns JWT)

### 📝 Posts

- `GET /api/posts` – Fetch all posts
- `POST /api/posts` – Create post (Requires JWT)
- `GET /api/posts/:id` – Fetch specific post

### 🧾 Claims

- `POST /api/posts/:id/claim` – Claim an item
- `GET /api/claims` – Admin: view all claims
- `POST /api/claims/:id/approve` – Admin approve
- `POST /api/claims/:id/deny` – Admin deny
- `GET /api/claims/stats` – Admin dashboard stats

### 👤 Profile

- `GET /api/profile` – Get current user's profile
- `GET /api/profile/posts` – Get user's posts
- `POST /api/notifications/clear` – Clear user notifications

---

## 🌐 CORS Configuration

CORS allows requests from these origins:

```js
[
  "https://comfy-mooncake-4ae766.netlify.app",
  "https://courageous-frangipane-94c341.netlify.app",
  "http://localhost:3000"
]
```

---

## 🙋‍♀️ Author

**Alina Asif Khan** 

---

## 📄 License

This project is for academic, learning, and demo purposes.
