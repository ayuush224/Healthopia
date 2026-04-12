const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  body: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  community: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  communityId: {
    type: Schema.Types.ObjectId,
    ref: 'Community'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

postSchema.pre('validate', function syncLegacyFields(next) {
  if (!this.user && this.createdBy) {
    this.user = this.createdBy;
  }

  if (!this.createdBy && this.user) {
    this.createdBy = this.user;
  }

  if (!this.community && this.communityId) {
    this.community = this.communityId;
  }

  if (!this.communityId && this.community) {
    this.communityId = this.community;
  }

  if (!this.body && this.description) {
    this.body = this.description;
  }

  if (!this.description && this.body) {
    this.description = this.body;
  }

  if (!this.title) {
    this.title = String(this.body || this.description || '').trim().slice(0, 80);
  }

  if (!this.image && this.photo) {
    this.image = this.photo;
  }

  if (!this.photo && this.image) {
    this.photo = this.image;
  }

  next();
});

module.exports = mongoose.model('Post', postSchema);
