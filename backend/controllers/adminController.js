const Post = require('../models/Post');
const User = require('../models/User');
const { deleteImage } = require('../config/cloudinary');

// @desc    Get all posts (all statuses) with filters
// @route   GET /api/admin/posts
// @access  Private (Admin)
const getAllPosts = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'fullName email profileImage role')
      .populate('reviewedBy', 'fullName email');

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('[Admin Get All Posts Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching all posts.'
    });
  }
};

// @desc    Approve a pending post
// @route   PUT /api/admin/posts/:id/approve
// @access  Private (Admin)
const approvePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    post.status = 'APPROVED';
    post.reviewedBy = req.user._id;
    await post.save();

    const updated = await Post.findById(post._id)
      .populate('uploadedBy', 'fullName email profileImage')
      .populate('reviewedBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: `Post "${post.title}" has been approved and is now live in the Public Gallery!`,
      post: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error approving post.'
    });
  }
};

// @desc    Reject a post
// @route   PUT /api/admin/posts/:id/reject
// @access  Private (Admin)
const rejectPost = async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    post.status = 'REJECTED';
    post.reviewedBy = req.user._id;
    if (reviewNote) post.reviewNote = reviewNote;
    await post.save();

    const updated = await Post.findById(post._id)
      .populate('uploadedBy', 'fullName email profileImage')
      .populate('reviewedBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: `Post "${post.title}" was rejected.`,
      post: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error rejecting post.'
    });
  }
};

// @desc    Admin delete inappropriate post
// @route   DELETE /api/admin/posts/:id
// @access  Private (Admin)
const deletePostAdmin = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Delete photos from Cloudinary or local storage
    if (post.photos && post.photos.length > 0) {
      for (const photo of post.photos) {
        if (photo.publicId) {
          await deleteImage(photo.publicId);
        }
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Post and media have been permanently removed by Admin.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting post.'
    });
  }
};

// @desc    Get all registered users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    // Attach post counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const postCount = await Post.countDocuments({ uploadedBy: u._id });
        return {
          ...u.toObject(),
          totalPosts: postCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      users: usersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching users.'
    });
  }
};

// @desc    Get comprehensive admin dashboard metrics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ status: 'PENDING' });
    const approvedPosts = await Post.countDocuments({ status: 'APPROVED' });
    const rejectedPosts = await Post.countDocuments({ status: 'REJECTED' });

    // Aggregate total photos count
    const postsWithPhotos = await Post.find({}, 'photos');
    let totalPhotos = 0;
    postsWithPhotos.forEach((p) => {
      totalPhotos += p.photos ? p.photos.length : 0;
    });

    const latestUploads = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('uploadedBy', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        pendingPosts,
        approvedPosts,
        rejectedPosts,
        totalPhotos,
        latestUploads
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching admin stats.'
    });
  }
};

module.exports = {
  getAllPosts,
  approvePost,
  rejectPost,
  deletePostAdmin,
  getAllUsers,
  getAdminStats
};
