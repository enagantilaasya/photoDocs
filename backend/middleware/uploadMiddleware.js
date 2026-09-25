const multer = require('multer');

// Memory storage keeps file buffers in memory for direct Cloudinary upload
const storage = multer.memoryStorage();

// Supported image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file format. Only JPG, JPEG, PNG, and WEBP are supported.'),
      false
    );
  }
};

// Limit 10MB per file, max 10 files
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10 // Max 10 files
  },
  fileFilter
});

// Middleware wrapper to provide clear JSON error messages on upload limits
const uploadPhotos = (req, res, next) => {
  const uploadHandler = upload.array('photos', 10);

  uploadHandler(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more files exceed the 10MB file size limit.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Exceeded maximum allowed files. You can upload up to 10 photos per post.'
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
  uploadPhotos
};
