const Post = require('../models/Post');
const ImageFile = require('../models/ImageFile');
const VideoFile = require('../models/VideoFile');
const { uploadImageBuffer, uploadVideoBuffer, deleteImage } = require('../config/cloudinary');
const { generatePostDocx } = require('../utils/docxGenerator');

// Helper to normalize and categorize external video URLs (YouTube, Vimeo, direct MP4)
const parseVideoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  let videoType = 'external';
  let cleanUrl = url;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    videoType = 'youtube';
  } else if (url.includes('vimeo.com')) {
    videoType = 'vimeo';
  }

  return {
    publicId: '',
    url: cleanUrl,
    originalName: 'Video Stream',
    format: videoType,
    bytes: 0,
    videoType
  };
};

// @desc    Create a new photo/video documentation post
// @route   POST /api/posts
// @access  Private (Registered User or Admin)
const createPost = async (req, res) => {
  try {
    const { title, description, eventDate, date, videoUrls, videoUrl } = req.body;

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

    // Determine base URL for persistent storage (always HTTPS in production/Render)
    const host = req.get('host') || 'photodocs.onrender.com';
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || host.includes('onrender.com');
    const protocol = isHttps ? 'https' : req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // Separate photos and videos from uploaded files
    const photoFiles = [];
    const videoFiles = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const mime = (file.mimetype || '').toLowerCase();
        if (mime.startsWith('video/') || file.fieldname === 'videos' || file.fieldname === 'video') {
          videoFiles.push(file);
        } else {
          photoFiles.push(file);
        }
      }
    }

    if (photoFiles.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'A post can contain a maximum of 10 photographs.'
      });
    }

    if (videoFiles.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'A post can contain a maximum of 5 uploaded video clips.'
      });
    }

    // Upload photos (if any)
    const uploadedPhotos = await Promise.all(
      photoFiles.map((file) => uploadImageBuffer(file.buffer, file, baseUrl))
    );

    // Upload video files (if any)
    const uploadedVideos = await Promise.all(
      videoFiles.map((file) => uploadVideoBuffer(file.buffer, file, baseUrl))
    );

    // Parse external video URLs if provided (e.g. YouTube, Vimeo, direct MP4 links)
    const externalUrls = [];
    const rawVideoInputs = [videoUrl, videoUrls].filter(Boolean);

    for (const input of rawVideoInputs) {
      if (Array.isArray(input)) {
        input.forEach((u) => {
          const parsed = parseVideoUrl(u);
          if (parsed) externalUrls.push(parsed);
        });
      } else if (typeof input === 'string') {
        try {
          const parsedJson = JSON.parse(input);
          if (Array.isArray(parsedJson)) {
            parsedJson.forEach((u) => {
              const p = parseVideoUrl(u);
              if (p) externalUrls.push(p);
            });
            continue;
          }
        } catch (_) {}

        input.split(/[\n,]+/).forEach((u) => {
          const parsed = parseVideoUrl(u);
          if (parsed) externalUrls.push(parsed);
        });
      }
    }

    const allVideos = [...uploadedVideos, ...externalUrls].slice(0, 5);

    // All posts are directly published and approved
    const initialStatus = 'APPROVED';

    // If user specified a custom event date/time, set eventDate
    const customDateInput = eventDate || date;
    const resolvedEventDate = customDateInput ? new Date(customDateInput) : new Date();

    const postData = {
      title: title.trim(),
      description: description.trim(),
      photos: uploadedPhotos,
      videos: allVideos,
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
      message: 'Post published successfully to the Public Gallery!',
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

    const query = { status: { $ne: 'REJECTED' } };

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
// @access  Public
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

// @desc    Serve persistent photo image from MongoDB Atlas
// @route   GET /api/posts/images/:id
// @access  Public
const serveImage = async (req, res) => {
  try {
    const image = await ImageFile.findById(req.params.id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found.'
      });
    }

    res.setHeader('Content-Type', image.contentType || 'image/jpeg');
    res.setHeader('Content-Length', image.data.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(image.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error serving photo.'
    });
  }
};

// @desc    Stream persistent video from MongoDB Atlas with HTTP 206 Range support
// @route   GET /api/posts/videos/:id
// @access  Public
const serveVideo = async (req, res) => {
  try {
    const video = await VideoFile.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.'
      });
    }

    const videoSize = video.data.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
      const chunksize = end - start + 1;
      const chunk = video.data.slice(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.contentType || 'video/mp4'
      });
      return res.end(chunk);
    } else {
      res.writeHead(200, {
        'Content-Length': videoSize,
        'Content-Type': video.contentType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
      return res.end(video.data);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error streaming video.'
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

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, timestamps: false }
    ).populate('uploadedBy', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
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

    // Cleanup images & videos from Cloudinary, MongoDB Atlas, or local uploads
    if (post.photos && post.photos.length > 0) {
      for (const photo of post.photos) {
        if (photo.publicId) {
          await deleteImage(photo.publicId);
        }
      }
    }
    if (post.videos && post.videos.length > 0) {
      for (const video of post.videos) {
        if (video.publicId) {
          await deleteImage(video.publicId);
        }
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Post and its media files have been successfully deleted.'
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
  serveImage,
  serveVideo,
  getMyPosts,
  getUserStats,
  updatePost,
  deletePost,
  downloadPostReport
};
