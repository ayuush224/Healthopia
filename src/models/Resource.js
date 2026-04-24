const mongoose = require('mongoose');
const { Schema } = mongoose;

const resourceSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  communityTag: {
    type: String,
    required: true,
    trim: true
  },
  readTime: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    default: '',
    trim: true
  },
  priority: {
    type: Number,
    required: true
  }
}, { timestamps: true });

resourceSchema.index({ category: 1, priority: 1, communityTag: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
