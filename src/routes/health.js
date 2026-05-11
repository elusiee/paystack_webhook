const express = require("express");
const router = express.Router();

/**
 * GET /health
 * Used by Railway / Render to verify the service is alive.
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "authorengine-paystack-webhook",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
