const jwt = require('jsonwebtoken');

const { authCookieName, jwtSecret } = require('../config/env');

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'Strict',
    secure: true,
    maxAge: 24 * 60 * 60 * 1000
  };
}

function signAuthToken(userId) {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' });
}

function verifyAuthToken(token) {
  return jwt.verify(token, jwtSecret);
}

function attachAuthCookie(res, userId) {
  res.cookie(authCookieName, signAuthToken(userId), getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(authCookieName , { ...getCookieOptions(), maxAge: 0 });
}

module.exports = {
  attachAuthCookie,
  clearAuthCookie,
  verifyAuthToken
};
