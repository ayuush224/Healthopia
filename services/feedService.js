const AppError = require("../utils/AppError");

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 4);
}

function validatePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function findCommunity(data, communityId) {
  return data.communities.find((community) => community.id === communityId) || null;
}

function getPostById(data, postId) {
  return data.posts.find((post) => post.id === postId) || null;
}

function deriveMediaTheme(category) {
  const themeByCategory = {
    fitness: "trail",
    yoga: "zen",
    nutrition: "citrus",
    "mental-health": "bloom"
  };

  return themeByCategory[category] || "trail";
}

function filterPosts(data, filters = {}) {
  const search = normalizeText(filters.search).toLowerCase();
  const activeCategory = filters.category || "all";
  const activeCommunity = filters.community || "all";

  return data.posts
    .filter((post) => {
      if (activeCategory !== "all" && post.category !== activeCategory) {
        return false;
      }

      if (activeCommunity !== "all" && post.communityId !== activeCommunity) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        post.authorName,
        post.communityName,
        post.content,
        ...(post.tags || []),
        post.tip?.title,
        post.tip?.body
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function buildBootstrapPayload(data, filters = {}) {
  const posts = filterPosts(data, filters);

  return {
    app: data.app,
    currentUser: data.currentUser,
    categories: data.categories,
    communities: data.communities,
    trendingCommunities: data.trendingCommunities,
    tracker: data.tracker,
    posts,
    feedSummary: {
      totalPosts: posts.length,
      search: normalizeText(filters.search),
      category: filters.category || "all",
      community: filters.community || "all"
    }
  };
}

function createPost(data, payload) {
  const content = normalizeText(payload.content);
  const communityId = normalizeText(payload.communityId) || data.communities[0]?.id;
  const tipTitle = normalizeText(payload.tipTitle);
  const tipBody = normalizeText(payload.tipBody);
  const tags = buildTags(payload.tags);
  const community = findCommunity(data, communityId);

  if (!community) {
    throw new AppError(400, "Choose a valid community before posting.");
  }

  const post = {
    id: `post-${Date.now()}`,
    authorId: data.currentUser.id,
    authorName: data.currentUser.name,
    authorInitials: data.currentUser.initials,
    authorRole: data.currentUser.role,
    authorAccent: data.currentUser.accent,
    authorTone: data.currentUser.tone || "forest",
    communityId: community.id,
    communityName: community.name,
    category: community.category,
    createdAt: new Date().toISOString(),
    content,
    tags,
    likes: 0,
    commentsCount: 0,
    shares: 0,
    likedByCurrentUser: false,
    bookmarked: false,
    mediaTheme: deriveMediaTheme(community.category),
    comments: [],
    tip:
      tipTitle || tipBody
        ? {
            title: tipTitle || "Wellness tip",
            body: tipBody || "Keep showing up for your routine in a way that feels sustainable."
          }
        : null
  };

  data.posts.unshift(post);
  data.currentUser.posts += 1;

  return post;
}

function toggleLike(data, postId) {
  const post = getPostById(data, postId);
  if (!post) {
    throw new AppError(404, "Post not found.");
  }

  post.likedByCurrentUser = !post.likedByCurrentUser;
  post.likes = Math.max(0, post.likes + (post.likedByCurrentUser ? 1 : -1));

  return {
    liked: post.likedByCurrentUser,
    likes: post.likes
  };
}

function toggleBookmark(data, postId) {
  const post = getPostById(data, postId);
  if (!post) {
    throw new AppError(404, "Post not found.");
  }

  post.bookmarked = !post.bookmarked;

  return {
    bookmarked: post.bookmarked
  };
}

function incrementShare(data, postId) {
  const post = getPostById(data, postId);
  if (!post) {
    throw new AppError(404, "Post not found.");
  }

  post.shares += 1;

  return {
    shares: post.shares
  };
}

function addComment(data, postId, payload) {
  const post = getPostById(data, postId);
  const message = normalizeText(payload.message);

  if (!post) {
    throw new AppError(404, "Post not found.");
  }

  const comment = {
    id: `comment-${Date.now()}`,
    authorName: data.currentUser.name,
    authorInitials: data.currentUser.initials,
    authorAccent: data.currentUser.accent,
    authorTone: data.currentUser.tone || "forest",
    body: message,
    createdAt: new Date().toISOString()
  };

  post.comments.push(comment);
  post.commentsCount = (post.commentsCount || 0) + 1;

  return {
    comment,
    commentsCount: post.commentsCount
  };
}

function updateTracker(data, payload) {
  data.tracker.dailyWaterLiters = validatePositiveNumber(
    payload.dailyWaterLiters,
    data.tracker.dailyWaterLiters
  );
  data.tracker.waterGoalLiters = Math.max(
    0.5,
    validatePositiveNumber(payload.waterGoalLiters, data.tracker.waterGoalLiters)
  );
  data.tracker.dailySteps = Math.round(
    validatePositiveNumber(payload.dailySteps, data.tracker.dailySteps)
  );

  const baseline = Math.max(data.tracker.stepTrendBaseline, 1);
  data.tracker.stepTrendPercent = Math.round(
    ((data.tracker.dailySteps - baseline) / baseline) * 100
  );

  return data.tracker;
}

module.exports = {
  addComment,
  buildBootstrapPayload,
  buildTags,
  createPost,
  filterPosts,
  findCommunity,
  getPostById,
  incrementShare,
  normalizeText,
  toggleBookmark,
  toggleLike,
  updateTracker,
  validatePositiveNumber
};
