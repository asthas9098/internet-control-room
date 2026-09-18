const MAX_RETRIES = 3;

async function recover(task, error, retryCount = 0) {
  const message = error?.message || String(error || "Unknown error");

  // Retry if retry limit has not been reached
  if (retryCount < MAX_RETRIES) {
    return {
      action: "retry",
      retryCount: retryCount + 1,
      message: `Retrying task (${retryCount + 1}/${MAX_RETRIES})`,
      error: message
    };
  }

  // Retry limit reached
  return {
    action: "failed",
    retryCount,
    message: "Maximum retry attempts reached",
    error: message
  };
}

module.exports = {
  recover,
  MAX_RETRIES
};