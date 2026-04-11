const { AppError } = require('../utils/errors');

function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

module.exports = {
  notFound
};
