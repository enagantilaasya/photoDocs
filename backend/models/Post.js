const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  publicId: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    default: ''
  },
  format: {
    type: String,
    default: 'jpg'
  },
  width: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  },
  bytes: {
    type: Number,
    default: 0
  }
});

const videoSchema = new mongoose.Schema({
  publicId: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    default: ''
  },
  format: {
    type: String,
    default: 'mp4'
  },
  bytes: {
    type: Number,
    default: 0
  },
  videoType: {
    type: String, // 'upload' | 'youtube' | 'vimeo' | 'external'
    default: 'upload'
  }
});

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title/heading is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
      trim: true
    },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: function (v) {
          return !v || (Array.isArray(v) && v.length <= 10);
        },
        message: 'A post can contain a maximum of 10 photos.'
      }
    },
    videos: {
      type: [videoSchema],
      default: [],
      validate: {
        validator: function (v) {
          return !v || (Array.isArray(v) && v.length <= 5);
        },
        message: 'A post can contain a maximum of 5 videos.'
      }
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNote: {
      type: String,
      default: ''
    },
    eventDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast chronological gallery filtering & status lookups
postSchema.index({ createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
