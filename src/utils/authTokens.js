const jwt = require('jsonwebtoken');

const { authCookieName, isProduction, jwtSecret } = require('../config/env');

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function signAuthToken(userId) {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
}

function verifyAuthToken(token) {
  return jwt.verify(token, jwtSecret);
}

function attachAuthCookie(res, userId) {
  res.cookie(authCookieName, signAuthToken(userId), getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(authCookieName, getCookieOptions());
}

module.exports = {
  attachAuthCookie,
  clearAuthCookie,
  verifyAuthToken
};
