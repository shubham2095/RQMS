// Service/middleware se throw karne ke liye: throw httpError(401, 'message')
function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

module.exports = httpError;
