const User = require('../models/User');
const Post = require('../models/Post');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { ensureOptionalString, normalizeUsername } = require('../utils/validation');
const { buildPostQuery } = require('../utils/postQuery');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'communitiesJoined',
    'communityName description noOfActiveMembers communityPhoto'
  );

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const posts = await buildPostQuery(
    Post.find({ createdBy: user._id }).sort({ createdAt: -1 })
  );

  const commentsCount = posts.reduce((total, post) => total + post.comments.length, 0);
  const likesCount = posts.reduce((total, post) => total + post.likes, 0);

  res.json({
    user,
    posts,
    stats: {
      postsCount: posts.length,
      communitiesCount: user.communitiesJoined.length,
      commentsCount,
      likesCount
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const updates = {};

  if (req.body.name !== undefined) {
    updates.name = ensureOptionalString(req.body.name, { min: 2, max: 60 });
  }

  if (req.body.profilePicture !== undefined) {
    updates.profilePicture = ensureOptionalString(req.body.profilePicture, { max: 1000 });
  }

  if (req.body.username !== undefined) {
    const username = normalizeUsername(req.body.username);
    const existingUser = await User.findOne({
      username,
      _id: { $ne: user._id }
    });

    if (existingUser) {
      throw new AppError('That username is already taken.', 409);
    }

    updates.username = username;
  }

  Object.assign(user, updates);
  await user.save();

  res.json({
    message: 'Profile updated successfully.',
    user
  });
});

module.exports = {
  getProfile,
  updateProfile
};
