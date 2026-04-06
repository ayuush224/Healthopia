function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Unexpected server error.";

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).json({
    error: message
  });
}

module.exports = errorHandler;
