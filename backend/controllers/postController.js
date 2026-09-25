const Post = require('../models/Post');
const { uploadImageBuffer, deleteImage } = require('../config/cloudinary');
const { generatePostDocx } = require('../utils/docxGenerator');

// @desc    Create a new photo post
// @route   POST /api/posts
// @access  Private (Registered User or Admin)
const createPost = async (req, res) => {
  try {
    const { title, description, eventDate, date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post heading/title is required.'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post description is required.'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one photograph (up to 10 photos).'
      });
    }

    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'A post can contain a maximum of 10 photographs.'
      });
    }

    // Determine base URL for fallback local storage
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Upload images to Cloudinary (or local fallback)
    const uploadPromises = req.files.map((file) =>
      uploadImageBuffer(file.buffer, file, baseUrl)
    );
    const uploadedPhotos = await Promise.all(uploadPromises);

    // Initial status is PENDING (Admin can auto-approve or review)
    // If the creator is an ADMIN, auto-approve for convenience, else PENDING
    const initialStatus = req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

    // If user specified a custom event date/time, set eventDate
    const customDateInput = eventDate || date;
    const resolvedEventDate = customDateInput ? new Date(customDateInput) : new Date();

    const postData = {
      title: title.trim(),
      description: description.trim(),
      photos: uploadedPhotos,
      uploadedBy: req.user._id,
      status: initialStatus,
      eventDate: !isNaN(resolvedEventDate.getTime()) ? resolvedEventDate : new Date()
    };

    if (customDateInput && !isNaN(resolvedEventDate.getTime())) {
      postData.createdAt = resolvedEventDate;
    }

    const post = await Post.create(postData);

    const populatedPost = await Post.findById(post._id).populate(
      'uploadedBy',
      'fullName email profileImage'
    );

    res.status(201).json({
      success: true,
      message:
        initialStatus === 'APPROVED'
          ? 'Post created and published directly by Admin.'
          : 'Post submitted successfully! It is now pending admin approval.',
      post: populatedPost
    });
  } catch (error) {
    console.error('[Create Post Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating post.'
    });
  }
};

// @desc    Get all approved public gallery posts
// @route   GET /api/posts
// @access  Public
const getPublicPosts = async (req, res) => {
  try {
    const { search, fromDate, toDate, sort = 'newest', page = 1, limit = 20 } = req.query;

    const query = { status: 'APPROVED' };

    // Search query on title and description
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Date filtering (using eventDate or createdAt)
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter.$lte = endOfDay;
      }
      query.$or = [{ eventDate: dateFilter }, { createdAt: dateFilter }];
    }

    // Sort order: default newest first
    const sortOrder = sort === 'oldest' ? { eventDate: 1, createdAt: 1 } : { eventDate: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalPosts = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .populate('uploadedBy', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      total: totalPosts,
      page: pageNum,
      totalPages: Math.ceil(totalPosts / limitNum),
      posts
    });
  } catch (error) {
    console.error('[Get Posts Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching gallery posts.'
    });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Public (if Approved) or Private (owner / admin)
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'uploadedBy',
      'fullName email profileImage'
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // If not approved, check if current requester is the owner or an admin
    if (post.status !== 'APPROVED') {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: 'This post is pending approval and cannot be viewed publicly.'
        });
      }
      // Note: If request went through protect middleware or client token is verified
    }

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching post details.'
    });
  }
};

// @desc    Get current user's posts
// @route   GET /api/posts/my-posts
// @access  Private
const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching your posts.'
    });
  }
};

// @desc    Get dashboard metrics for current user
// @route   GET /api/posts/user-stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userPosts = await Post.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });

    const totalPosts = userPosts.length;
    let totalPhotos = 0;
    let approvedPosts = 0;
    let pendingPosts = 0;
    let rejectedPosts = 0;

    userPosts.forEach((post) => {
      totalPhotos += post.photos ? post.photos.length : 0;
      if (post.status === 'APPROVED') approvedPosts++;
      else if (post.status === 'PENDING') pendingPosts++;
      else if (post.status === 'REJECTED') rejectedPosts++;
    });

    const latestUpload = userPosts.length > 0 ? userPosts[0].createdAt : null;

    res.status(200).json({
      success: true,
      stats: {
        totalPosts,
        totalPhotos,
        approvedPosts,
        pendingPosts,
        rejectedPosts,
        latestUpload
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user stats.'
    });
  }
};

// @desc    Update post heading or description
// @route   PUT /api/posts/:id
// @access  Private (Owner or Admin)
const updatePost = async (req, res) => {
  try {
    const { title, description, eventDate, date } = req.body;
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Ownership check: user must be the author or an admin
    const isOwner = post.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this post.'
      });
    }

    const updateFields = {};
    if (title && title.trim()) updateFields.title = title.trim();
    if (description && description.trim()) updateFields.description = description.trim();

    const customDateInput = eventDate || date;
    if (customDateInput) {
      const parsedDate = new Date(customDateInput);
      if (!isNaN(parsedDate.getTime())) {
        updateFields.eventDate = parsedDate;
        updateFields.createdAt = parsedDate;
      }
    }

    // If edited by a regular user, return status to PENDING for re-approval
    if (!isAdmin) {
      updateFields.status = 'PENDING';
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, timestamps: false }
    ).populate('uploadedBy', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      message: !isAdmin
        ? 'Post updated and resubmitted for admin review.'
        : 'Post updated successfully.',
      post: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating post.'
    });
  }
};

// @desc    Delete post & remove associated media
// @route   DELETE /api/posts/:id
// @access  Private (Owner or Admin)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const isOwner = post.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post.'
      });
    }

    // Cleanup images from Cloudinary or local uploads
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
      message: 'Post and its photos have been successfully deleted.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting post.'
    });
  }
};

// @desc    Download Word Document (.docx) report for a post
// @route   GET /api/posts/:id/report
// @access  Public
const downloadPostReport = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'uploadedBy',
      'fullName email profileImage'
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Determine frontend domain from headers or origin
    const clientOrigin = req.headers.origin || req.headers.referer
      ? new URL(req.headers.origin || req.headers.referer).origin
      : 'http://localhost:5173';

    const buffer = await generatePostDocx(post, clientOrigin);

    const safeTitle = post.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const fileName = `Report_${safeTitle}_${Date.now()}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Docx Download Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating Word document report.'
    });
  }
};

module.exports = {
  createPost,
  getPublicPosts,
  getPostById,
  getMyPosts,
  getUserStats,
  updatePost,
  deletePost,
  downloadPostReport
};
