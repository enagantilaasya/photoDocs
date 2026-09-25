const mongoose = require('mongoose');

const videoFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  contentType: {
    type: String,
    required: true,
    default: 'video/mp4'
  },
  data: {
    type: Buffer,
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('VideoFile', videoFileSchema);
