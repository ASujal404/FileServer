function errorHandler(err, req, res, next) {
  console.error('[Global Error Handler]', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum allowed limit (500 MB).'
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An internal server error occurred.'
  });
}

module.exports = errorHandler;
