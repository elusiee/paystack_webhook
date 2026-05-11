const express = require("express");
const router = express.Router();

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

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

router.get("/events", (req, res) => {
  const adapter = new FileSync(path.join(__dirname, "../../data/events.json"));
  const db = low(adapter);
  res.status(200).json(db.get("events").value());
});

module.exports = router;
