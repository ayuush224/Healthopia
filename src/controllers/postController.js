const fs = require('fs');

const Community = require('../models/Community');
const Post = require('../models/Post');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { buildPostQuery, decoratePostsForUser } = require('../utils/postQuery');
const { setPostLikeState } = require('../services/postLikeService');
const {
  ensureBoolean,
  ensureObjectId,
  ensureOptionalString,
  ensureString,
  parseTags
} = require('../utils/validation');

function buildCommunityFilter(communityValue) {
  return {
    $or: [
      { community: communityValue },
      { communityId: communityValue }
    ]
  };
}

function buildAuthorFilter(authorValue) {
  return {
    $or: [
      { user: authorValue },
      { createdBy: authorValue }
    ]
  };
}

async function removeUploadedFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup failures for already-removed temp files.
  }
}

const getPosts = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id).select('communitiesJoined');

  const communityId = req.query.communityId ? ensureObjectId(req.query.communityId, 'Community id') : null;
  const authorId = req.query.authorId ? ensureObjectId(req.query.authorId, 'Author id') : null;

  const filter = {};

  if (communityId) {
    Object.assign(filter, buildCommunityFilter(communityId));
  } else if (authorId) {
    Object.assign(filter, buildAuthorFilter(authorId));
  } else {
    const joinedCommunityIds = currentUser?.communitiesJoined || [];
    Object.assign(filter, buildCommunityFilter({ $in: joinedCommunityIds }));
  }

  const posts = await decoratePostsForUser(
    await buildPostQuery(Post.find(filter).sort({ createdAt: -1 })),
    req.user._id
  );

  res.json({
    posts
  });
});

const createPost = asyncHandler(async (req, res) => {
  let postCreated = false;

  try {
    const title = ensureOptionalString(req.body.title, { max: 120 });
    const body = ensureOptionalString(req.body.body, { max: 5000 });
    const communityId = ensureObjectId(req.body.community, 'Community');
    const tags = parseTags(req.body.tags);
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    if (!title && !body) {
      throw new AppError('Add a title or body before posting.', 400);
    }

    const [community, user] = await Promise.all([
      Community.findById(communityId).select('_id posts'),
      User.findById(req.user._id).select('_id communitiesJoined posts')
    ]);

    if (!community) {
      throw new AppError('Community not found.', 404);
    }

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const hasJoinedCommunity = (user.communitiesJoined || [])
      .some((joinedCommunityId) => joinedCommunityId.toString() === communityId);

    if (!hasJoinedCommunity) {
      throw new AppError('Join this community before posting.', 403);
    }

    const post = await Post.create({
      user: req.user._id,
      createdBy: req.user._id,
      title,
      body,
      description: body,
      tags,
      community: communityId,
      communityId,
      image,
      photo: image
    });

    postCreated = true;

    await Promise.all([
      User.updateOne(
        { _id: req.user._id },
        { $addToSet: { posts: post._id } }
      ),
      Community.updateOne(
        { _id: communityId },
        { $addToSet: { posts: post._id } }
      )
    ]);

    const populatedPost = await decoratePostsForUser(
      await buildPostQuery(Post.findById(post._id)),
      req.user._id
    );

    res.status(201).json({
      message: 'Post created successfully.',
      post: populatedPost
    });
  } catch (error) {
    if (!postCreated) {
      await removeUploadedFile(req.file?.path);
    }

    throw error;
  }
});

const getPostById = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');

  const post = await decoratePostsForUser(
    await buildPostQuery(Post.findById(postId)),
    req.user._id
  );

  if (!post) {
    throw new AppError('Post not found.', 404);
  }

  res.json({
    post
  });
});

const likePost = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');
  const liked = ensureBoolean(req.body.liked, 'Liked state');
  const result = await setPostLikeState({
    postId,
    userId: req.user._id,
    liked
  });

  res.json({
    postId: result.postId,
    liked: result.liked,
    likesCount: result.likesCount
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

  const populatedPost = await decoratePostsForUser(
    await buildPostQuery(Post.findById(postId)),
    req.user._id
  );

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
