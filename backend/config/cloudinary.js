const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary if credentials are provided
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log('[Cloudinary] Configured with cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.log('[Storage] Cloudinary credentials not detected or using placeholder; local upload active.');
}

/**
 * Save an image to local uploads directory
 */
const saveLocalImage = async (buffer, file, baseUrl = '') => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueName = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
  const filePath = path.join(uploadsDir, uniqueName);

  await fs.promises.writeFile(filePath, buffer);

  // If baseUrl is provided, use it; otherwise use relative path /uploads/... which works via Vite proxy
  const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  const url = cleanBase ? `${cleanBase}/uploads/${uniqueName}` : `/uploads/${uniqueName}`;

  return {
    publicId: `local/${uniqueName}`,
    url: url,
    originalName: file.originalname,
    format: fileExt.replace('.', '') || 'jpg',
    width: 1200,
    height: 800,
    bytes: buffer.length
  };
};

/**
 * Upload an image buffer to Cloudinary with automatic resilient fallback
 * @param {Buffer} buffer File buffer
 * @param {Object} file File info from Multer
 * @param {string} baseUrl Express base URL for fallback paths
 * @returns {Promise<Object>} Photo metadata object
 */
const uploadImageBuffer = async (buffer, file, baseUrl = '') => {
  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'public_photo_gallery',
            resource_type: 'image'
          },
          (error, res) => {
            if (error) {
              return reject(error);
            }
            resolve(res);
          }
        );
        uploadStream.end(buffer);
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        originalName: file.originalname,
        format: result.format || path.extname(file.originalname).replace('.', '') || 'jpg',
        width: result.width || 0,
        height: result.height || 0,
        bytes: result.bytes || buffer.length
      };
    } catch (cloudinaryError) {
      console.warn(
        `[Cloudinary Warning] Cloudinary upload returned error (${cloudinaryError.message || cloudinaryError.http_code}). Falling back to local storage to ensure upload succeeds.`
      );
      // Resilient fallback to local storage
      return await saveLocalImage(buffer, file, baseUrl);
    }
  }

  // Fallback: Local storage in /uploads directory
  return await saveLocalImage(buffer, file, baseUrl);
};

/**
 * Delete image from Cloudinary or local storage
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    if (isCloudinaryConfigured && !publicId.startsWith('local/')) {
      await cloudinary.uploader.destroy(publicId);
    } else if (publicId.startsWith('local/')) {
      const fileName = publicId.replace('local/', '');
      const filePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (error) {
    console.error(`[Storage] Failed to delete image ${publicId}:`, error.message);
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImageBuffer,
  deleteImage
};
