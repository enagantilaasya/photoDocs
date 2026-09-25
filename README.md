# Public Photo Documentation Gallery

A full-stack digital photo documentation platform, institutional event gallery, and community activity journal built with **React**, **Node.js/Express**, **MongoDB/Mongoose**, **Cloudinary**, and **Word Document (.docx) Automation**.

---

## 🌟 Key Features

1. **Prominent Post Structure**:
   - High-impact highlighted heading/title.
   - Comprehensive event narrative/description.
   - Attractive multi-photo grid gallery with responsive layouts (Desktop: 3–4, Tablet: 2–3, Mobile: 1–2).
   - Interactive full-screen **Lightbox** with previous/next navigation, image counter, and download shortcuts.

2. **Automated Backend Timestamps**:
   - Every post's upload timestamp (`createdAt`) is generated strictly by the backend server via MongoDB timestamps.
   - Tamper-proof: Users cannot manually alter or fake timestamps.
   - Automatically displayed in local user time (e.g., `25 September 2026, 10:35 AM`).

3. **Public Chronological Gallery (`/gallery`)**:
   - Accessible to anyone without logging in.
   - Chronological ordering: Default **Newest First**, toggleable to **Oldest First**.
   - Search by title, event description, or contributor.
   - Date range filtering (`From Date` to `To Date`).

4. **Multi-Role Authentication & Security**:
   - **User Role**: Register, login, view public gallery, upload posts (up to 10 photos, max 10MB each), view personal posts (`/my-posts`), edit, and delete their own uploads.
   - **Admin Role**: Moderate submissions (`/admin`), approve or reject posts with review notes, manage user directory, view platform metrics.
   - Passwords hashed with **bcrypt**; authenticated via **JWT**.
   - Protected against unauthorized API mutations via role-based middleware.

5. **Cloudinary Media Pipeline with Local Fallback**:
   - Uploads are streamed via Multer memory storage directly to Cloudinary CDN.
   - Automatic local storage fallback (`/uploads`) ensures full out-of-the-box functionality even before Cloudinary keys are supplied.

6. **Word Document Report Generation (`.docx`)**:
   - Download official Word documents containing title, contributor, automatic timestamps, description, and embedded photographs with live hyperlinks back to the gallery.

---

## 🚀 Quick Start Guide

### 1. Default Pre-Configured Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@gallery.com` | `Admin@12345` |
| **Contributor** | `laasya@gallery.com` | `User@12345` |

*(Quick-login buttons are also provided directly on the Login page for 1-click convenience)*

---

### 2. Running Locally

Both the backend and frontend servers are already running as background services. If you need to restart them:

#### Backend:
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
# Accessible at http://localhost:5173
```

---

## 📁 Project Architecture

```
PHOTO/
├── backend/
│   ├── config/          # MongoDB connection & Cloudinary storage fallback
│   ├── controllers/     # Auth, Post, and Admin business logic
│   ├── middleware/      # JWT auth, Admin role check, Multer limits
│   ├── models/          # Mongoose User & Post schemas with timestamps
│   ├── routes/          # Express REST endpoints (/api/auth, /api/posts, /api/admin)
│   ├── utils/           # Validation, seeder, docx Word report generator
│   ├── uploads/         # Local file storage fallback
│   ├── .env             # Environment configuration
│   └── server.js        # Express server entry point
│
└── frontend/
    ├── src/
    │   ├── components/  # Navbar, Footer, PostCard, PhotoGallery, Lightbox, ProtectedRoute
    │   ├── context/     # AuthContext (JWT management & session sync)
    │   ├── pages/       # Home, Gallery, PostDetails, CreatePost, MyPosts, EditPost, Dashboard, AdminDashboard, Login, Register, About
    │   ├── services/    # Axios API client
    │   ├── App.jsx      # Router & route definitions
    │   └── index.css    # Tailwind CSS design tokens
    └── package.json
```
