const { readData } = require("../services/dataStore");
const { normalizeText } = require("../services/feedService");
const AppError = require("../utils/AppError");

function validateBootstrapQuery(req, res, next) {
  const { category, community, search } = req.query;
  const data = readData();

  if (category && typeof category !== "string") {
    return next(new AppError(400, "Category filter must be a string."));
  }

  if (community && typeof community !== "string") {
    return next(new AppError(400, "Community filter must be a string."));
  }

  if (search && typeof search !== "string") {
    return next(new AppError(400, "Search filter must be a string."));
  }

  if (category && category !== "all" && !data.categories.some((item) => item.id === category)) {
    return next(new AppError(400, "Category filter is not valid."));
  }

  if (community && community !== "all" && !data.communities.some((item) => item.id === community)) {
    return next(new AppError(400, "Community filter is not valid."));
  }

  return next();
}

function validatePostIdParam(req, res, next) {
  const postId = normalizeText(req.params.postId);

  if (!postId) {
    return next(new AppError(400, "A valid post id is required."));
  }

  req.params.postId = postId;
  return next();
}

function validateCreatePost(req, res, next) {
  const content = normalizeText(req.body.content);

  if (content.length < 12) {
    return next(new AppError(400, "Write at least 12 characters to create a post."));
  }

  if (req.body.communityId && typeof req.body.communityId !== "string") {
    return next(new AppError(400, "Community id must be a string."));
  }

  return next();
}

function validateComment(req, res, next) {
  const message = normalizeText(req.body.message);

  if (message.length < 3) {
    return next(new AppError(400, "Comments need at least 3 characters."));
  }

  return next();
}

function validateTracker(req, res, next) {
  const { dailyWaterLiters, waterGoalLiters, dailySteps } = req.body;
  const numericFields = { dailyWaterLiters, waterGoalLiters, dailySteps };

  for (const [name, value] of Object.entries(numericFields)) {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      return next(new AppError(400, `${name} must be a non-negative number.`));
    }
  }

  if (Number(waterGoalLiters) < 0.5) {
    return next(new AppError(400, "Water goal must be at least 0.5 liters."));
  }

  return next();
}

function validateCommunityExists(req, res, next) {
  const data = readData();
  const communityId = normalizeText(req.body.communityId);

  if (communityId && !data.communities.some((community) => community.id === communityId)) {
    return next(new AppError(400, "Choose a valid community before posting."));
  }

  return next();
}

module.exports = {
  validateBootstrapQuery,
  validateComment,
  validateCommunityExists,
  validateCreatePost,
  validatePostIdParam,
  validateTracker
};
