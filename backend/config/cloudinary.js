const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const ImageFile = require('../models/ImageFile');
const VideoFile = require('../models/VideoFile');
const { uploadVideoToGridFS, deleteFromGridFS } = require('../utils/gridfs');

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
const savePersistentImage = async (bufferOrFile, fileInfo = {}, baseUrl = '') => {
  let buffer;
  let file = fileInfo;

  if (Buffer.isBuffer(bufferOrFile)) {
    buffer = bufferOrFile;
  } else if (bufferOrFile && bufferOrFile.path) {
    file = bufferOrFile;
    buffer = await fs.promises.readFile(file.path);
  } else if (bufferOrFile && bufferOrFile.buffer) {
    file = bufferOrFile;
    buffer = file.buffer;
  }

  const originalName = file.originalname || 'photo.jpg';
  const fileExt = path.extname(originalName).toLowerCase() || '.jpg';
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
    originalName: originalName,
    format: fileExt.replace('.', '') || 'jpg',
    width: 1200,
    height: 800,
    bytes: buffer.length
  };
};

/**
 * Save a video to MongoDB GridFS (for GB-scale files) or VideoFile (legacy),
 * ensuring guaranteed persistence across restarts.
 */
const savePersistentVideo = async (fileObj, baseUrl = '') => {
  const originalName = fileObj.originalname || 'video.mp4';
  const fileExt = path.extname(originalName).toLowerCase() || '.mp4';
  const uniqueName = `video-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
  const contentType = fileObj.mimetype || 'video/mp4';
  const fileSize = fileObj.size || (fileObj.buffer ? fileObj.buffer.length : 0);

  let gridfsResult = null;

  // 1. Try uploading to MongoDB GridFS (handles GBs seamlessly without BSON 16MB limit)
  try {
    const source = fileObj.path || fileObj.buffer;
    if (source) {
      gridfsResult = await uploadVideoToGridFS(source, {
        filename: uniqueName,
        contentType,
        originalName
      });
    }
  } catch (gridErr) {
    console.warn('[Storage] GridFS upload failed, trying VideoFile fallback:', gridErr.message);
  }

  // 2. Legacy fallback for smaller files if GridFS was unavailable
  let videoDoc = null;
  if (!gridfsResult && fileSize < 15 * 1024 * 1024) {
    try {
      const buffer = fileObj.buffer || (fileObj.path ? await fs.promises.readFile(fileObj.path) : null);
      if (buffer) {
        videoDoc = await VideoFile.create({
          filename: uniqueName,
          contentType,
          data: buffer,
          size: buffer.length
        });
      }
    } catch (dbErr) {
      console.warn('[Storage] Could not save to VideoFile collection:', dbErr.message);
    }
  }

  // 3. Also write to local disk cache if filesystem is writable
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const destPath = path.join(uploadsDir, uniqueName);
    if (fileObj.path && fs.existsSync(fileObj.path)) {
      await fs.promises.copyFile(fileObj.path, destPath);
    } else if (fileObj.buffer) {
      await fs.promises.writeFile(destPath, fileObj.buffer);
    }
  } catch (fsErr) {
    // Ignore read-only container disk errors
  }

  // Normalize base URL
  let cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  if (cleanBase.includes('onrender.com') && cleanBase.startsWith('http://')) {
    cleanBase = cleanBase.replace('http://', 'https://');
  }

  // Return durable video URL
  let url = '';
  let publicId = '';

  if (gridfsResult) {
    publicId = `gridfs/video/${gridfsResult.id}`;
    url = cleanBase ? `${cleanBase}/api/posts/videos/${gridfsResult.id}` : `/api/posts/videos/${gridfsResult.id}`;
  } else if (videoDoc) {
    publicId = `db/video/${videoDoc._id}`;
    url = cleanBase ? `${cleanBase}/api/posts/videos/${videoDoc._id}` : `/api/posts/videos/${videoDoc._id}`;
  } else {
    publicId = `local/${uniqueName}`;
    url = cleanBase ? `${cleanBase}/uploads/${uniqueName}` : `/uploads/${uniqueName}`;
  }

  return {
    publicId,
    url,
    originalName,
    format: fileExt.replace('.', '') || 'mp4',
    bytes: fileSize || (gridfsResult ? gridfsResult.length : 0),
    videoType: 'upload'
  };
};

/**
 * Upload an image to Cloudinary with automatic resilient fallback
 */
const uploadImageBuffer = async (bufferOrFile, fileInfo = {}, baseUrl = '') => {
  let buffer;
  let file = fileInfo;

  if (Buffer.isBuffer(bufferOrFile)) {
    buffer = bufferOrFile;
  } else if (bufferOrFile && bufferOrFile.path) {
    file = bufferOrFile;
    buffer = await fs.promises.readFile(file.path);
  } else if (bufferOrFile && bufferOrFile.buffer) {
    file = bufferOrFile;
    buffer = file.buffer;
  }

  if (isCloudinaryConfigured && buffer) {
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
        originalName: file.originalname || 'photo.jpg',
        format: result.format || path.extname(file.originalname || '').replace('.', '') || 'jpg',
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
 * Upload a video to Cloudinary (using upload_large for GB scale files)
 * with automatic fallback to MongoDB GridFS.
 */
const uploadVideoBuffer = async (bufferOrFile, fileInfo = {}, baseUrl = '') => {
  const file = bufferOrFile && bufferOrFile.path ? bufferOrFile : fileInfo;
  const filePath = bufferOrFile && bufferOrFile.path ? bufferOrFile.path : null;
  const buffer = Buffer.isBuffer(bufferOrFile)
    ? bufferOrFile
    : bufferOrFile && bufferOrFile.buffer
    ? bufferOrFile.buffer
    : null;

  if (isCloudinaryConfigured) {
    try {
      let result;

      if (filePath) {
        // Use upload_large for chunked multi-GB video uploads
        result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            filePath,
            {
              resource_type: 'video',
              folder: 'public_video_gallery',
              chunk_size: 6000000 // 6MB chunks
            },
            (error, res) => {
              if (error) return reject(error);
              resolve(res);
            }
          );
        });
      } else if (buffer) {
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'public_video_gallery',
              resource_type: 'video'
            },
            (error, res) => {
              if (error) return reject(error);
              resolve(res);
            }
          );
          uploadStream.end(buffer);
        });
      }

      if (result) {
        return {
          publicId: result.public_id,
          url: result.secure_url,
          originalName: file.originalname || 'video.mp4',
          format: result.format || path.extname(file.originalname || '').replace('.', '') || 'mp4',
          bytes: result.bytes || (buffer ? buffer.length : 0),
          videoType: 'upload'
        };
      }
    } catch (cloudinaryError) {
      console.warn(
        `[Cloudinary Warning] Cloudinary video upload failed (${cloudinaryError.message || cloudinaryError.http_code}). Using durable MongoDB GridFS storage.`
      );
      return await savePersistentVideo(file, baseUrl);
    }
  }

  // Fallback: Persistent MongoDB GridFS storage
  return await savePersistentVideo(file, baseUrl);
};

/**
 * Delete image/video from Cloudinary, MongoDB GridFS, MongoDB collections, or local storage
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return;

    if (publicId.startsWith('gridfs/video/')) {
      const id = publicId.replace('gridfs/video/', '');
      await deleteFromGridFS(id);
    } else if (publicId.startsWith('db/video/')) {
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
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(() => {});
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    }
  } catch (error) {
    console.error(`[Storage] Failed to delete media ${publicId}:`, error.message);
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  savePersistentImage,
  savePersistentVideo,
  uploadImageBuffer,
  uploadVideoBuffer,
  deleteImage,
  deleteMedia: deleteImage
};

