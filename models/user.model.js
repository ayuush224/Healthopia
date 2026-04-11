const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String, 
    default: ''
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  posts: [{
    type: Schema.Types.ObjectId,
    ref: 'Post' 
  }],
  communitiesJoined: [{
    type: Schema.Types.ObjectId,
    ref: 'Community'
  }]
});

module.exports = mongoose.model('User', userSchema);