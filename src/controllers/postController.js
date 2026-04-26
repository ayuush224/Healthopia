const fs = require('fs');
const path = require('path');

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

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

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

function getUploadedImagePath(imagePath) {
  if (!imagePath || !String(imagePath).startsWith('/uploads/')) {
    return '';
  }

  return path.join(uploadsDir, path.basename(imagePath));
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
    const image = req.cloudinary?.secure_url || '';
    const public_id = req.cloudinary?.public_id || '';

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
      photo: image,
      public_id
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

const deleteComment = asyncHandler(async (req, res) => {
  const commentId = ensureObjectId(req.params.id, 'Comment id');
  const post = await Post.findOne({ 'comments._id': commentId });

  if (!post) {
    throw new AppError('Comment not found.', 404);
  }

  const comment = post.comments.id(commentId);

  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  if (!comment.userId || comment.userId.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  comment.deleteOne();
  await post.save();

  const populatedPost = await decoratePostsForUser(
    await buildPostQuery(Post.findById(post._id)),
    req.user._id
  );

  res.json({
    message: 'Comment deleted.',
    commentId,
    postId: post._id,
    post: populatedPost
  });
});

const deletePost = asyncHandler(async (req, res) => {
  const postId = ensureObjectId(req.params.id, 'Post id');
  const post = await Post.findById(postId).select('user createdBy community communityId image photo');

  if (!post) {
    throw new AppError('Post not found.', 404);
  }

  const ownerId = post.user || post.createdBy;

  if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
    throw new AppError('You can delete only your own posts.', 403);
  }

  const communityIds = [post.community, post.communityId].filter(Boolean);

  await Promise.all([
    Post.deleteOne({ _id: post._id }),
    User.updateMany(
      {
        $or: [
          { posts: post._id },
          { likedPosts: post._id }
        ]
      },
      {
        $pull: {
          posts: post._id,
          likedPosts: post._id
        }
      }
    ),
    communityIds.length
      ? Community.updateMany(
          { _id: { $in: communityIds } },
          { $pull: { posts: post._id } }
        )
      : Promise.resolve()
  ]);

  await removeUploadedFile(getUploadedImagePath(post.image || post.photo));

  res.json({
    message: 'Post deleted.',
    postId: post._id
  });
});

module.exports = {
  getPosts,
  createPost,
  deletePost,
  deleteComment,
  getPostById,
  likePost,
  addComment
};
