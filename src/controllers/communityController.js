const Community = require('../models/Community');
const Post = require('../models/Post');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { buildPostQuery, decoratePostsForUser } = require('../utils/postQuery');
const { ensureObjectId } = require('../utils/validation');

const getCommunities = asyncHandler(async (req, res) => {
  const [communities, currentUser] = await Promise.all([
    Community.find().sort({ noOfActiveMembers: -1, communityName: 1 }),
    User.findById(req.user._id).select('communitiesJoined')
  ]);

  const joinedIds = new Set(
    (currentUser?.communitiesJoined || []).map((communityId) => communityId.toString())
  );

  const result = communities.map((community) => ({
    ...community.toObject(),
    isJoined: joinedIds.has(community._id.toString())
  }));

  res.json({
    communities: result
  });
});

const getCommunityById = asyncHandler(async (req, res) => {
  const communityId = ensureObjectId(req.params.id, 'Community id');

  const [community, currentUser, rawPosts] = await Promise.all([
    Community.findById(communityId),
    User.findById(req.user._id).select('communitiesJoined'),
    buildPostQuery(Post.find({
      $or: [
        { community: communityId },
        { communityId }
      ]
    }).sort({ createdAt: -1 }))
  ]);

  if (!community) {
    throw new AppError('Community not found.', 404);
  }

  const joinedIds = new Set(
    (currentUser?.communitiesJoined || []).map((item) => item.toString())
  );

  const normalizedCommunity = {
    ...community.toObject(),
    isJoined: joinedIds.has(community._id.toString())
  };

  const posts = await decoratePostsForUser(rawPosts, req.user._id);

  res.json({
    community: normalizedCommunity,
    posts
  });
});

const joinCommunity = asyncHandler(async (req, res) => {
  const communityId = ensureObjectId(req.params.id, 'Community id');

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

  const alreadyJoined = user.communitiesJoined.some(
    (joinedId) => joinedId.toString() === community._id.toString()
  );

  if (!alreadyJoined) {
    user.communitiesJoined.push(community._id);
    community.noOfActiveMembers += 1;

    await Promise.all([user.save(), community.save()]);
  }

  res.json({
    message: alreadyJoined ? 'You are already part of this community.' : 'Community joined successfully.',
    community: {
      ...community.toObject(),
      isJoined: true
    }
  });
});

module.exports = {
  getCommunities,
  getCommunityById,
  joinCommunity
};
