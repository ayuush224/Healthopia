const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const authCookieName = process.env.AUTH_COOKIE_NAME || 'hw_session';
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || '';

module.exports = {
  port,
  mongoUri,
  jwtSecret,
  authCookieName,
  isProduction,
  frontendUrl
};
