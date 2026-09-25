const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  publicId: {
    type: String,
    required: true
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
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 1 && v.length <= 10;
        },
        message: 'A post must contain between 1 and 10 photos.'
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
