const Post = require('../models/Post');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

function normalizeId(value) {
  return typeof value?.toString === 'function' ? value.toString() : String(value);
}

async function setPostLikeState({
  postId,
  userId,
  liked,
  PostModel = Post,
  UserModel = User
}) {
  const normalizedPostId = normalizeId(postId);
  const normalizedUserId = normalizeId(userId);

  const userFilter = liked
    ? { _id: normalizedUserId, likedPosts: { $ne: normalizedPostId } }
    : { _id: normalizedUserId, likedPosts: normalizedPostId };

  const userUpdate = liked
    ? { $addToSet: { likedPosts: normalizedPostId } }
    : { $pull: { likedPosts: normalizedPostId } };

  const postFilter = liked
    ? { _id: normalizedPostId, likedBy: { $ne: normalizedUserId } }
    : { _id: normalizedPostId, likedBy: normalizedUserId };

  const postUpdate = liked
    ? {
        $addToSet: { likedBy: normalizedUserId },
        $inc: { likes: 1 }
      }
    : {
        $pull: { likedBy: normalizedUserId },
        $inc: { likes: -1 }
      };

  const [userResult, updatedPost] = await Promise.all([
    UserModel.updateOne(userFilter, userUpdate),
    PostModel.findOneAndUpdate(
      postFilter,
      postUpdate,
      {
        new: true,
        projection: { _id: 1, likes: 1 }
      }
    )
  ]);

  if (updatedPost) {
    return {
      postId: normalizeId(updatedPost._id),
      liked,
      likesCount: updatedPost.likes || 0
    };
  }

  const existingPost = await PostModel.findById(normalizedPostId, { _id: 1, likes: 1 });

  if (!existingPost) {
    if (liked && userResult?.modifiedCount > 0) {
      await UserModel.updateOne(
        { _id: normalizedUserId },
        { $pull: { likedPosts: normalizedPostId } }
      );
    }

    throw new AppError('Post not found.', 404);
  }

  return {
    postId: normalizeId(existingPost._id),
    liked,
    likesCount: existingPost.likes || 0
  };
}

module.exports = {
  setPostLikeState
};
