const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error encountered:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    error.statusCode = 404;
    error.message = message;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `An account or record with that ${field} already exists.`;
    error.statusCode = 400;
    error.message = message;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error.statusCode = 400;
    error.message = message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token. Please authenticate again.';
  }

  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Session expired. Please log in again.';
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Internal Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
