const multer = require('multer');

// Memory storage keeps file buffers in memory for direct storage
const storage = multer.memoryStorage();

// Supported image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif'
];

// Supported video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp'
];

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(mime) || ALLOWED_VIDEO_TYPES.includes(mime)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type (${file.mimetype}). Please upload valid image files (JPG, PNG, WEBP, GIF) or video files (MP4, WEBM, MOV, OGG).`),
      false
    );
  }
};

// Limit 50MB per file, max 15 files
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per file
    files: 15
  },
  fileFilter
});

// Middleware wrapper to provide clear JSON error messages on upload limits
const uploadMedia = (req, res, next) => {
  // Use upload.any() so frontend can send photos, videos, or mixed media fields seamlessly
  const uploadHandler = upload.any();

  uploadHandler(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more files exceed the 50MB file size limit.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Exceeded maximum allowed files. You can upload up to 10 photos and 5 videos per post.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }
    next();
  });
};

module.exports = {
  uploadPhotos: uploadMedia,
  uploadMedia
};
