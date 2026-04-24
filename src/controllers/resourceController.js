const Resource = require('../models/Resource');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

function normalizeCommunityCategory(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const getWellnessPicks = asyncHandler(async (req, res) => {
  const pageSize = 5;
  const user = await User.findById(req.user._id)
    .select('communitiesJoined')
    .populate('communitiesJoined', 'communityName')
    .lean();

  const joinedCategories = [...new Set(
    (user?.communitiesJoined || [])
      .map((community) => normalizeCommunityCategory(community?.communityName))
      .filter(Boolean)
  )];

  if (!joinedCategories.length) {
    res.json({
      success: true,
      data: [],
      currentPage: 1,
      totalPages: 1
    });
    return;
  }

  const filter = {
    category: { $in: joinedCategories }
  };

  const totalResources = await Resource.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalResources / pageSize));
  const requestedPage = Number.parseInt(req.query.p || req.query.page || '1', 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  if (!totalResources) {
    res.json({
      success: true,
      data: [],
      currentPage: 1,
      totalPages: 1
    });
    return;
  }

  const resources = await Resource.find(filter)
    .sort({ priority: 1, communityTag: 1, title: 1, _id: 1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .select('title description category communityTag source readTime url priority createdAt')
    .lean();

  res.json({
    success: true,
    data: resources,
    currentPage,
    totalPages
  });
});

module.exports = {
  getWellnessPicks
};
