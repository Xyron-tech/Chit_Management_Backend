class ApiError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    Object.assign(this, extra); // allows flags like { trialExpired: true }
  }
}

module.exports = ApiError;