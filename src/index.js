require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const webhookRouter = require("./routes/webhook");
const healthRouter = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3000;

// Use raw body parser ONLY for the webhook route so we can verify the signature.
// express.json() would parse and re-stringify, which can mismatch the original payload.
app.use("/webhook", express.raw({ type: "application/json" }));

// Normal JSON parsing for everything else
app.use(express.json());

app.use(morgan("combined"));

// Routes
app.use("/webhook", webhookRouter);
app.use("/health", healthRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[authorengine-webhook] Listening on port ${PORT}`);
});
