const mongoose = require('mongoose');
const fs = require('fs');
const { Readable } = require('stream');

let gridfsBucket = null;

const getGridFSBucket = () => {
  if (!gridfsBucket && mongoose.connection && mongoose.connection.db) {
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'videos'
    });
  }
  return gridfsBucket;
};

/**
 * Upload a video to MongoDB GridFS from either a file path or a buffer
 * Supports files up to multiple gigabytes without memory overflow.
 */
const uploadVideoToGridFS = async (source, metadata = {}) => {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS Bucket is not available. Ensure MongoDB is connected.');
  }

  const filename = metadata.filename || `video-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`;
  const contentType = metadata.contentType || 'video/mp4';

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        originalName: metadata.originalName || filename,
        format: metadata.format || 'mp4',
        uploadedAt: new Date(),
        ...metadata.custom
      }
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });

    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id ? uploadStream.id.toString() : '',
        filename,
        contentType
      });
    });

    if (typeof source === 'string') {
      // source is a file path
      const readStream = fs.createReadStream(source);
      readStream.on('error', reject);
      readStream.pipe(uploadStream);
    } else if (Buffer.isBuffer(source)) {
      const readStream = Readable.from(source);
      readStream.pipe(uploadStream);
    } else if (source && typeof source.pipe === 'function') {
      source.pipe(uploadStream);
    } else {
      reject(new Error('Invalid source provided for GridFS upload.'));
    }
  });
};

/**
 * Check if a file exists in GridFS
 */
const getGridFSFileInfo = async (id) => {
  try {
    const bucket = getGridFSBucket();
    if (!bucket) return null;
    const objectId = new mongoose.Types.ObjectId(id);
    const files = await bucket.find({ _id: objectId }).toArray();
    return files && files.length > 0 ? files[0] : null;
  } catch (err) {
    return null;
  }
};

/**
 * Create a download stream for a GridFS file with optional range support
 */
const openGridFSDownloadStream = (id, options = {}) => {
  const bucket = getGridFSBucket();
  if (!bucket) return null;
  const objectId = new mongoose.Types.ObjectId(id);
  return bucket.openDownloadStream(objectId, options);
};

/**
 * Delete a file from GridFS
 */
const deleteFromGridFS = async (id) => {
  try {
    const bucket = getGridFSBucket();
    if (!bucket) return;
    const objectId = new mongoose.Types.ObjectId(id);
    await bucket.delete(objectId);
  } catch (err) {
    console.warn(`[GridFS] Could not delete file ${id}:`, err.message);
  }
};

module.exports = {
  getGridFSBucket,
  uploadVideoToGridFS,
  getGridFSFileInfo,
  openGridFSDownloadStream,
  deleteFromGridFS
};
