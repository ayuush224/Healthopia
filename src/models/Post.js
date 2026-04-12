const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photo: {
    type: String,
    default: '',
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    description: {
      type: String,
      required: [true, 'Comment description is required']
    }
  }],
  tags: [{
    type: String
  }],
  communityId: {
    type: Schema.Types.ObjectId,
    ref: 'Community'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
