const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const authCookieName = 'hw_session';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  port,
  mongoUri,
  jwtSecret,
  authCookieName,
  isProduction
};
