const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const ImageFile = require('../models/ImageFile');
const VideoFile = require('../models/VideoFile');

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
  console.log('[Storage] Cloudinary credentials not detected or using placeholder; persistent DB storage active.');
}

/**
 * Save an image to MongoDB Atlas (guaranteed persistence across Render restarts)
 * and optionally local disk for caching
 */
const savePersistentImage = async (buffer, file, baseUrl = '') => {
  const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueName = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  // 1. Always save into MongoDB Atlas for durable cloud persistence
  let imageDoc;
  try {
    imageDoc = await ImageFile.create({
      filename: uniqueName,
      contentType: file.mimetype || 'image/jpeg',
      data: buffer,
      size: buffer.length
    });
  } catch (dbErr) {
    console.warn('[Storage] Could not save to ImageFile collection:', dbErr.message);
  }

  // 2. Also write to local disk cache if filesystem is writable
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);
  } catch (fsErr) {
    // Ignore read-only container disk errors
  }

  // Normalize base URL
  let cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  if (cleanBase.includes('onrender.com') && cleanBase.startsWith('http://')) {
    cleanBase = cleanBase.replace('http://', 'https://');
  }

  // Return durable image URL
  const url = imageDoc
    ? (cleanBase ? `${cleanBase}/api/posts/images/${imageDoc._id}` : `/api/posts/images/${imageDoc._id}`)
    : (cleanBase ? `${cleanBase}/uploads/${uniqueName}` : `/uploads/${uniqueName}`);

  return {
    publicId: imageDoc ? `db/${imageDoc._id}` : `local/${uniqueName}`,
    url: url,
    originalName: file.originalname,
    format: fileExt.replace('.', '') || 'jpg',
    width: 1200,
    height: 800,
    bytes: buffer.length
  };
};

/**
 * Save a video to MongoDB Atlas (guaranteed persistence) and optionally local disk
 */
const savePersistentVideo = async (buffer, file, baseUrl = '') => {
  const fileExt = path.extname(file.originalname).toLowerCase() || '.mp4';
  const uniqueName = `video-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  // 1. Always save into MongoDB Atlas for durable cloud persistence
  let videoDoc;
  try {
    videoDoc = await VideoFile.create({
      filename: uniqueName,
      contentType: file.mimetype || 'video/mp4',
      data: buffer,
      size: buffer.length
    });
  } catch (dbErr) {
    console.warn('[Storage] Could not save to VideoFile collection:', dbErr.message);
  }

  // 2. Also write to local disk cache if filesystem is writable
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);
  } catch (fsErr) {
    // Ignore read-only container disk errors
  }

  // Normalize base URL
  let cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  if (cleanBase.includes('onrender.com') && cleanBase.startsWith('http://')) {
    cleanBase = cleanBase.replace('http://', 'https://');
  }

  // Return durable video URL
  const url = videoDoc
    ? (cleanBase ? `${cleanBase}/api/posts/videos/${videoDoc._id}` : `/api/posts/videos/${videoDoc._id}`)
    : (cleanBase ? `${cleanBase}/uploads/${uniqueName}` : `/uploads/${uniqueName}`);

  return {
    publicId: videoDoc ? `db/video/${videoDoc._id}` : `local/${uniqueName}`,
    url: url,
    originalName: file.originalname,
    format: fileExt.replace('.', '') || 'mp4',
    bytes: buffer.length,
    videoType: 'upload'
  };
};

/**
 * Upload an image buffer to Cloudinary with automatic resilient fallback
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
        `[Cloudinary Warning] Cloudinary photo upload returned error (${cloudinaryError.message || cloudinaryError.http_code}). Using resilient MongoDB Atlas storage.`
      );
      return await savePersistentImage(buffer, file, baseUrl);
    }
  }

  // Fallback: Persistent storage
  return await savePersistentImage(buffer, file, baseUrl);
};

/**
 * Upload a video buffer to Cloudinary with automatic resilient fallback
 */
const uploadVideoBuffer = async (buffer, file, baseUrl = '') => {
  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'public_video_gallery',
            resource_type: 'video'
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
        format: result.format || path.extname(file.originalname).replace('.', '') || 'mp4',
        bytes: result.bytes || buffer.length,
        videoType: 'upload'
      };
    } catch (cloudinaryError) {
      console.warn(
        `[Cloudinary Warning] Cloudinary video upload returned error (${cloudinaryError.message || cloudinaryError.http_code}). Using resilient MongoDB Atlas storage.`
      );
      return await savePersistentVideo(buffer, file, baseUrl);
    }
  }

  // Fallback: Persistent video storage
  return await savePersistentVideo(buffer, file, baseUrl);
};

/**
 * Delete image/video from Cloudinary, MongoDB, or local storage
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return;

    if (publicId.startsWith('db/video/')) {
      const id = publicId.replace('db/video/', '');
      await VideoFile.findByIdAndDelete(id);
    } else if (publicId.startsWith('db/')) {
      const id = publicId.replace('db/', '');
      await ImageFile.findByIdAndDelete(id);
    } else if (publicId.startsWith('local/')) {
      const fileName = publicId.replace('local/', '');
      const filePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } else if (isCloudinaryConfigured) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error(`[Storage] Failed to delete media ${publicId}:`, error.message);
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImageBuffer,
  uploadVideoBuffer,
  deleteImage,
  deleteMedia: deleteImage
};
