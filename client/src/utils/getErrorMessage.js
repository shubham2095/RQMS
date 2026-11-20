// API error se user ko dikhane layak message. Validation fail (400) mein field-wise details aate hain.
function getErrorMessage(err, fallback = 'Something went wrong') {
  if (!err.response) return 'Cannot reach the server. Please try again.';

  const data = err.response.data || {};
  if (data.details && data.details.length > 0) {
    return data.details
      .map((detail) => (detail.field ? `${detail.field}: ${detail.message}` : detail.message))
      .join(' | ');
  }
  return data.error || fallback;
}

export default getErrorMessage;
