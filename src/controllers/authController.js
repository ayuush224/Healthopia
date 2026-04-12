const User = require('../models/User');
const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { attachAuthCookie, clearAuthCookie } = require('../utils/authTokens');
const { ensureOptionalString, ensureString, normalizeUsername } = require('../utils/validation');

const register = asyncHandler(async (req, res) => {
  const name = ensureString(req.body.name, 'Name', { min: 2, max: 60 });
  const username = normalizeUsername(req.body.username);
  const email = ensureString(req.body.email, 'Email', { min: 5, max: 254 });
  const password = ensureString(req.body.password, 'Password', { min: 8, max: 128 });
  const profilePicture = ensureOptionalString(req.body.profilePicture, { max: 1500 });

  const existingUser = await User.findOne({email, username});
  if (existingUser) {
    throw new AppError('An account with that email or username already exists.', 409);
  }

  const user = await User.create({
    name,
    profilePicture,
    username,
    email,
    password,
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
  const email = ensureString(req.body.email, 'Email', { min: 5, max: 254 });
  const password = ensureString(req.body.password, 'Password', { min: 6, max: 128 });

  const user = await User.findOne({ email, password});
  if (!user) {
    throw new AppError('No account was found for that email and password.', 401);
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
