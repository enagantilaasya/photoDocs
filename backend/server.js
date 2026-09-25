const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const seedData = require('./utils/seeder');

// Route imports
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust reverse proxy (essential for Render HTTPS detection)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB().then(() => {
  seedData();
});

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration: Allow all origins (LAN IPs, phones, public tunnels)
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Generous limit for mobile browsing and testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', apiLimiter);

// Body parsers with generous limit for media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve local upload files statically with CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Resilient fallback for /uploads/:filename if ephemeral container disk was recycled
const ImageFile = require('./models/ImageFile');
const VideoFile = require('./models/VideoFile');
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Check ImageFile first
    const imageDoc = await ImageFile.findOne({ filename });
    if (imageDoc) {
      res.setHeader('Content-Type', imageDoc.contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(imageDoc.data);
    }
    // Check VideoFile
    const videoDoc = await VideoFile.findOne({ filename });
    if (videoDoc) {
      res.setHeader('Content-Type', videoDoc.contentType || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(videoDoc.data);
    }
  } catch (e) {
    // proceed to redirect
  }
  // Graceful redirect to clean photography fallback if ephemeral file was erased
  res.redirect('https://images.unsplash.com/photo-1516542076529-1ea3854896f2?w=1200&auto=format&fit=crop&q=80');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'Public Photo Documentation Gallery API',
    timestamp: new Date().toISOString()
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Public Photo Gallery API running on port ${PORT}`);
  console.log(`[Server] Local URL: http://localhost:${PORT}`);
  console.log(`[Server] Network URL: http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${PORT} is already in use by another instance.`);
    console.error(`If a previous process is still running, please stop it or set PORT in .env`);
  } else {
    console.error('[Server Error]', err);
  }
});
