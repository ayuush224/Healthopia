const Community = require('../models/Community');
const Post = require('../models/Post');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { buildPostQuery } = require('../utils/postQuery');
const {
  ensureObjectId,
  ensureOptionalString,
  ensureString,
  parseTags
} = require('../utils/validation');

const getPosts = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id).select('communitiesJoined');

  const communityId = req.query.communityId ? ensureObjectId(req.query.communityId, 'Community id') : null;
  const authorId = req.query.authorId ? ensureObjectId(req.query.authorId, 'Author id') : null;

  const filter = {};

  if (communityId) {
    filter.communityId = communityId;
  } else if (authorId) {
    filter.createdBy = authorId;
  } else {
    const joinedCommunityIds = currentUser?.communitiesJoined || [];
    filter.communityId = { $in: joinedCommunityIds };
  }

  const posts = await buildPostQuery(Post.find(filter).sort({ createdAt: -1 }));

  res.json({
    posts
  });
});

const createPost = asyncHandler(async (req, res) => {
  const description = ensureString(req.body.description, 'Post description', { min: 3, max: 1200 });
  const photo = ensureOptionalString(req.body.photo, { max: 1000 });
  const communityId = ensureObjectId(req.body.communityId, 'Community');
  const tags = parseTags(req.body.tags);

  const [community, user] = await Promise.all([
    Community.findById(communityId),
    User.findById(req.user._id)
  ]);

  if (!community) {
    throw new AppError('Community not found.', 404);
  }

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const hasJoinedCommunity = user.communitiesJoined.some(
    (joinedId) => joinedId.toString() === communityId.toString()
  );

  if (!hasJoinedCommunity) {
    throw new AppError('Join the community before creating a post in it.', 403);
  }

  const post = await Post.create({
    createdBy: user._id,
    photo,
    description,
    likes: 0,
    comments: [],
    tags,
    communityId
  });

  user.posts.push(post._id);
  community.posts.push(post._id);

  await Promise.all([user.save(), community.save()]);

  const populatedPost = await buildPostQuery(Post.findById(post._id));

  res.status(201).json({
    message: 'Post created successfully.',
    post: populatedPost
  });
});

const getPostById = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');

  const post = await buildPostQuery(Post.findById(postId));

  if (!post) {
    throw new AppError('Post not found.', 404);
  }

  res.json({
    post
  });
});

const likePost = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');

  const post = await buildPostQuery(
    Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } }, { new: true, runValidators: true })
  );

  if (!post) {
    throw new AppError('Post not found.', 404);
  }

  res.json({
    message: 'Post liked.',
    post
  });
});

const addComment = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');
  const description = ensureString(req.body.description, 'Comment', { min: 1, max: 400 });

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found.', 404);
  }

  post.comments.push({
    userId: req.user._id,
    description
  });

  await post.save();

  const populatedPost = await buildPostQuery(Post.findById(postId));

  res.json({
    message: 'Comment added.',
    post: populatedPost
  });
});

module.exports = {
  getPosts,
  createPost,
  getPostById,
  likePost,
  addComment
};
