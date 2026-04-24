const User = require('../models/User');
const Post = require('../models/Post');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { buildPostQuery, decoratePostsForUser } = require('../utils/postQuery');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('name email username avatar posts likedPosts communitiesJoined')
    .populate(
    'communitiesJoined',
    'communityName description noOfActiveMembers communityPhoto'
    );

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const rawPosts = await buildPostQuery(
    Post.find({
      $or: [
        { user: user._id },
        { createdBy: user._id }
      ]
    }).sort({ createdAt: -1 })
  );
  const rawLikedPosts = user.likedPosts?.length
    ? await buildPostQuery(
        Post.find({ _id: { $in: user.likedPosts } }).sort({ createdAt: -1 })
      )
    : [];

  const posts = await decoratePostsForUser(rawPosts, req.user._id);
  const likedPosts = await decoratePostsForUser(rawLikedPosts, req.user._id);

  const commentsCount = posts.reduce((total, post) => total + post.comments.length, 0);
  const likesCount = posts.reduce((total, post) => total + post.likes, 0);

  res.json({
    user,
    posts,
    likedPosts,
    stats: {
      postsCount: posts.length,
      communitiesCount: user.communitiesJoined.length,
      commentsCount,
      likesCount
    }
  });
});

module.exports = {
  getProfile
};
