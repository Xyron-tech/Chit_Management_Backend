const ApiError = require('./Apierror');

// Wraps an async controller fn: ApiError -> its statusCode, anything else -> 500.
// Avoids repeating try/catch in every controller action.
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof ApiError) {
      const { statusCode, message, ...extra } = err;
      return res.status(statusCode).json({ message, ...extra });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = handleAsync;