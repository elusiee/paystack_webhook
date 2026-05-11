const crypto = require("crypto");

/**
 * Verifies the x-paystack-signature header using HMAC SHA512.
 * Paystack signs the raw request body with your secret key.
 * The raw body must NOT be parsed before this runs — use express.raw() on the route.
 */
function verifyPaystackSignature(req, res, next) {
  const signature = req.headers["x-paystack-signature"];

  if (!signature) {
    console.warn("[WEBHOOK] Missing x-paystack-signature header");
    return res.status(401).json({ error: "Missing signature" });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[WEBHOOK] PAYSTACK_SECRET_KEY is not set in environment");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const computed = crypto
    .createHmac("sha512", secret)
    .update(req.body) // req.body is a Buffer here (express.raw)
    .digest("hex");

  if (computed !== signature) {
    console.warn("[WEBHOOK] Signature mismatch — possible unauthorized request");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Attach parsed body for downstream handlers
  try {
    req.paystackEvent = JSON.parse(req.body.toString("utf8"));
  } catch (err) {
    console.error("[WEBHOOK] Failed to parse payload:", err.message);
    return res.status(400).json({ error: "Malformed JSON payload" });
  }

  next();
}

module.exports = { verifyPaystackSignature };
