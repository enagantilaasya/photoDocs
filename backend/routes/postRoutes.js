const express = require('express');
const router = express.Router();
const {
  createPost,
  getPublicPosts,
  getPostById,
  getMyPosts,
  getUserStats,
  updatePost,
  deletePost,
  downloadPostReport,
  serveImage,
  serveVideo,
  exportUserPostsPdf,
  downloadPostPdf
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadMedia } = require('../middleware/uploadMiddleware');

// Public route for approved gallery posts
router.get('/', getPublicPosts);

// User-specific dashboard stats & posts
router.get('/my-posts', protect, getMyPosts);
router.get('/my-posts/pdf', protect, exportUserPostsPdf);
router.get('/user-stats', protect, getUserStats);

// Word report & PDF document download for individual post
router.get('/:id/report', downloadPostReport);
router.get('/:id/pdf', downloadPostPdf);

// Persistent photo retrieval by ImageFile ID
router.get('/images/:id', serveImage);

// Persistent video streaming by VideoFile ID
router.get('/videos/:id', serveVideo);

// Individual post retrieval
router.get('/:id', getPostById);

// Post creation with optional photo and video upload
router.post('/', protect, uploadMedia, createPost);

// Edit & delete
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

module.exports = router;
