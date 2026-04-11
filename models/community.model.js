const mongoose = require('mongoose');
const { Schema } = mongoose;

const communitySchema = new Schema({
  communityName: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, "Description is required"]
  },
  posts: [{
    type: Schema.Types.ObjectId,
    ref: 'Post'
  }],
  noOfActiveMembers: {
    type: Number,
    default: 0
  },
  communityPhoto: {
    type: String 
  }
});

module.exports = mongoose.model('Community', communitySchema);