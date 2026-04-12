const User = require('../models/User');
const { authCookieName } = require('../config/env');
const { AppError } = require('../utils/errors');
const { clearAuthCookie, verifyAuthToken } = require('../utils/authTokens');

//corect
function getTokenFromRequest(req) {
  const cookieToken = req.cookies[authCookieName];
  const authHeader = req.headers.authorization;

  if (cookieToken) {
    return cookieToken;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

async function loadUserFromToken(token) {
  const payload = verifyAuthToken(token);

  if (!payload?.userId) {
    throw new AppError('Authentication required.', 401);
  }

  let user = await User.findById(payload.userId).select('_id name username profilePicture email');

  if (!user) {
    throw new AppError('Authentication required.', 401);
  }

  return user;
}

async function requireApiAuth(req, _res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new AppError('Authentication required.', 401);
    }

    req.user = await loadUserFromToken(token);
    next();
  } catch (error) {
    next(new AppError('Authentication required.', 401));
  }
}

async function requirePageAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.redirect('/sign-in');
    }

    req.user = await loadUserFromToken(token);
    return next();
  } catch (_error) {
    clearAuthCookie(res);
    return res.redirect('/sign-in');
  }
}

function redirectIfAuthenticated(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    verifyAuthToken(token);
    return res.redirect('/');
  } catch (_error) {
    clearAuthCookie(res);
    return next();
  }
}

module.exports = {
  requireApiAuth,
  requirePageAuth,
  redirectIfAuthenticated
};
