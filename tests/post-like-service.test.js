const test = require('node:test');
const assert = require('node:assert/strict');

const { setPostLikeState } = require('../src/services/postLikeService');

test('like request returns minimal liked payload with incremented count', async () => {
  const UserModel = {
    updateOne: async () => ({ modifiedCount: 1 })
  };

  const PostModel = {
    findOneAndUpdate: async () => ({ _id: 'post-1', likes: 11 }),
    findById: async () => {
      throw new Error('fallback should not run for a successful like');
    }
  };

  const result = await setPostLikeState({
    postId: 'post-1',
    userId: 'user-1',
    liked: true,
    UserModel,
    PostModel
  });

  assert.deepEqual(result, {
    postId: 'post-1',
    liked: true,
    likesCount: 11
  });
});

test('unlike request returns minimal payload with decremented count', async () => {
  const UserModel = {
    updateOne: async () => ({ modifiedCount: 1 })
  };

  const PostModel = {
    findOneAndUpdate: async () => ({ _id: 'post-1', likes: 4 }),
    findById: async () => {
      throw new Error('fallback should not run for a successful unlike');
    }
  };

  const result = await setPostLikeState({
    postId: 'post-1',
    userId: 'user-1',
    liked: false,
    UserModel,
    PostModel
  });

  assert.deepEqual(result, {
    postId: 'post-1',
    liked: false,
    likesCount: 4
  });
});

test('repeated like request is idempotent', async () => {
  const UserModel = {
    updateOne: async () => ({ modifiedCount: 0 })
  };

  const PostModel = {
    findOneAndUpdate: async () => null,
    findById: async () => ({ _id: 'post-1', likes: 11 })
  };

  const result = await setPostLikeState({
    postId: 'post-1',
    userId: 'user-1',
    liked: true,
    UserModel,
    PostModel
  });

  assert.deepEqual(result, {
    postId: 'post-1',
    liked: true,
    likesCount: 11
  });
});

test('repeated unlike request is idempotent', async () => {
  const UserModel = {
    updateOne: async () => ({ modifiedCount: 0 })
  };

  const PostModel = {
    findOneAndUpdate: async () => null,
    findById: async () => ({ _id: 'post-1', likes: 4 })
  };

  const result = await setPostLikeState({
    postId: 'post-1',
    userId: 'user-1',
    liked: false,
    UserModel,
    PostModel
  });

  assert.deepEqual(result, {
    postId: 'post-1',
    liked: false,
    likesCount: 4
  });
});

test('like request rolls back the user side if the post does not exist', async () => {
  const userCalls = [];

  const UserModel = {
    updateOne: async (...args) => {
      userCalls.push(args);
      return { modifiedCount: userCalls.length === 1 ? 1 : 0 };
    }
  };

  const PostModel = {
    findOneAndUpdate: async () => null,
    findById: async () => null
  };

  await assert.rejects(
    () => setPostLikeState({
      postId: 'post-404',
      userId: 'user-1',
      liked: true,
      UserModel,
      PostModel
    }),
    (error) => error?.statusCode === 404
  );

  assert.equal(userCalls.length, 2);
  assert.deepEqual(userCalls[1][1], {
    $pull: { likedPosts: 'post-404' }
  });
});
