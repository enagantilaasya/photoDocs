const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure temp upload directory exists
const tempUploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  } catch (err) {
    // Ignore in read-only environment
  }
}

// Disk storage streams incoming files directly to disk, avoiding RAM explosion for multi-GB uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(tempUploadDir)) {
      try {
        fs.mkdirSync(tempUploadDir, { recursive: true });
      } catch (e) {}
    }
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

// Supported image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/svg+xml'
];

// Supported video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
  'video/avi',
  'video/x-msvideo',
  'video/x-flv'
];

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isVideoExt = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.3gp', '.flv', '.m4v'].includes(ext);
  const isImageExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext);

  if (ALLOWED_IMAGE_TYPES.includes(mime) || ALLOWED_VIDEO_TYPES.includes(mime) || isVideoExt || isImageExt) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type (${file.mimetype || ext}). Please upload valid image files (JPG, PNG, WEBP, GIF) or video files (MP4, WEBM, MOV, MKV, OGG).`),
      false
    );
  }
};

// Limit 2GB (2,147,483,648 bytes) per file, max 15 files
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2 Gigabytes

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
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
          message: 'One or more files exceed the 2GB file size limit. Please upload files under 2GB.'
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
  uploadMedia,
  MAX_UPLOAD_SIZE
};

