const User = require('../models/User');
const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { attachAuthCookie, clearAuthCookie } = require('../utils/authTokens');
const { ensureString, normalizeUsername } = require('../utils/validation');
const bcrypt = require("bcrypt");

function serializeAuthUser(user) {
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    likedPosts: user.likedPosts || []
  };
}

async function getSaltedPassword(password){
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

const register = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const email = ensureString(req.body.email, 'Email', { min: 5, max: 254 });
  let password = ensureString(req.body.password, 'Password', { min: 6, max: 128 });

  const existingUser = await User.findOne({
    $or: [
      { email },
      { username }
    ]
  });

  if (existingUser) {
    throw new AppError('An account with that email or username already exists.', 409);
  }

  password = await getSaltedPassword(password);

  const user = await User.create({
    name: username,
    username,
    email,
    password,
    posts: [],
    likedPosts: [],
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
    user: serializeAuthUser(user)
  });
});

const login = asyncHandler(async (req, res) => {
  const email = ensureString(req.body.email, 'Email', { min: 5, max: 254 });
  let password = ensureString(req.body.password, 'Password', { min: 6, max: 128 });

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account was found for that email.', 401);
  }
  
  let isMatch = bcrypt.compare(password, user.password);
  if(!isMatch){
    throw new AppError("Please Enter Correct Paswword");
  }

  attachAuthCookie(res, user._id.toString());

  res.json({
    message: 'Login successful.',
    user: serializeAuthUser(user)
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
