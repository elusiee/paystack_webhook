const crypto = require("crypto");

/**
 * Generates a UUID v4 string using Node's built-in crypto module.
 */
function v4() {
  return crypto.randomUUID();
}

module.exports = { v4 };
