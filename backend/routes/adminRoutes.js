const express = require('express');
const router = express.Router();
const {
  getAllPosts,
  approvePost,
  rejectPost,
  deletePostAdmin,
  getAllUsers,
  getAdminStats
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/adminMiddleware');

// All admin routes require authentication and ADMIN role
router.use(protect);
router.use(authorizeAdmin);

router.get('/stats', getAdminStats);
router.get('/posts', getAllPosts);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);
router.delete('/posts/:id', deletePostAdmin);
router.get('/users', getAllUsers);

module.exports = router;
