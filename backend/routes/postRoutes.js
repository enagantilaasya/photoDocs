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
  downloadPostReport
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPhotos } = require('../middleware/uploadMiddleware');

// Public route for approved gallery posts
router.get('/', getPublicPosts);

// User-specific dashboard stats & posts
router.get('/my-posts', protect, getMyPosts);
router.get('/user-stats', protect, getUserStats);

// Word report download
router.get('/:id/report', downloadPostReport);

// Individual post retrieval
router.get('/:id', getPostById);

// Post creation with multi-photo upload
router.post('/', protect, uploadPhotos, createPost);

// Edit & delete
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

module.exports = router;
