function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong.';

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      message
    });
  }

  return res.status(statusCode).send(message);
}

module.exports = {
  errorHandler
};
