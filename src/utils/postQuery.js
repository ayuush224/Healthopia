function buildPostQuery(query) {
  return query
    .populate('user', 'name username')
    .populate('createdBy', 'name username')
    .populate('community', 'communityName description communityPhoto noOfActiveMembers')
    .populate('communityId', 'communityName description communityPhoto noOfActiveMembers')
    .populate('comments.userId', 'name username');
}

function normalizePostForClient(post, userId) {
  if (!post) {
    return post;
  }

  const normalizedPost = typeof post.toObject === 'function' ? post.toObject() : { ...post };
  const likedBy = normalizedPost.likedBy || [];
  const author = normalizedPost.user || normalizedPost.createdBy || null;
  const community = normalizedPost.community || normalizedPost.communityId || null;
  const body = String(normalizedPost.body || normalizedPost.description || '').trim();
  const title = String(normalizedPost.title || body.slice(0, 80)).trim();
  const image = normalizedPost.image || normalizedPost.photo || '';

  return {
    ...normalizedPost,
    user: author,
    createdBy: author,
    community,
    communityId: community,
    title,
    body,
    description: body,
    image,
    photo: image,
    likedByCurrentUser: likedBy.some((likedUserId) => likedUserId.toString() === userId.toString()),
    likedBy: undefined
  };
}

async function decoratePostsForUser(posts, userId) {
  if (!posts) {
    return posts;
  }

  const postList = Array.isArray(posts) ? posts : [posts];
  if (!postList.filter(Boolean).length) {
    return Array.isArray(posts) ? [] : null;
  }

  const normalizedPosts = postList.map((post) => normalizePostForClient(post, userId));

  return Array.isArray(posts) ? normalizedPosts : normalizedPosts[0];
}

module.exports = {
  buildPostQuery,
  decoratePostsForUser,
  normalizePostForClient
};
