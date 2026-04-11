const User = require('../models/User');
const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { attachAuthCookie, clearAuthCookie } = require('../utils/authTokens');
const { ensureOptionalString, ensureString, normalizeUsername } = require('../utils/validation');

const register = asyncHandler(async (req, res) => {
  const name = ensureString(req.body.name, 'Name', { min: 2, max: 60 });
  const username = normalizeUsername(req.body.username);
  const profilePicture = ensureOptionalString(req.body.profilePicture, { max: 500 });

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new AppError('That username is already taken.', 409);
  }

  const user = await User.create({
    name,
    profilePicture,
    username,
    posts: [],
    communitiesJoined: []
  });

  await HealthTracker.create({
    userId: user._id,
    waterIntake: 0,
    waterGoal: 2500,
    steps: 0
  });

  attachAuthCookie(res, user._id.toString());

  res.status(201).json({
    message: 'Registration successful.',
    user
  });
});

const login = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);

  const user = await User.findOne({ username });
  if (!user) {
    throw new AppError('No account was found for that username.', 401);
  }

  attachAuthCookie(res, user._id.toString());

  res.json({
    message: 'Login successful.',
    user
  });
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);

  res.json({
    message: 'Signed out successfully.'
  });
});

module.exports = {
  register,
  login,
  logout
};
