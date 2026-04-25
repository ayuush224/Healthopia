const jwt = require('jsonwebtoken');

const { authCookieName, frontendUrl, jwtSecret, isProduction } = require('../config/env');

function getCookieOptions() {
  const isCrossOrigin = Boolean(frontendUrl);
  const usesHttpsFrontend = frontendUrl.startsWith('https://');
  const shouldUseCrossSiteCookie = isCrossOrigin && usesHttpsFrontend;

  return {
    httpOnly: true,
    sameSite: shouldUseCrossSiteCookie ? 'None' : 'Lax',
    secure: isProduction || usesHttpsFrontend,
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
