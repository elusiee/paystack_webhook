const express = require("express");
const router = express.Router();
const { verifyPaystackSignature } = require("../middleware/verifySignature");
const { logEvent, updateForwardStatus } = require("../services/eventLogger");
const { forwardToAuthorEngine } = require("../services/forwarder");

/**
 * POST /webhook
 *
 * Paystack sends all events here.
 * Flow:
 *   1. Verify HMAC SHA512 signature
 *   2. Immediately return 200 OK (Paystack requires this within 30s)
 *   3. Log the event to local JSON store
 *   4. Forward the event to Spring Boot authorengine API (async, after 200 is sent)
 */
router.post("/", verifyPaystackSignature, (req, res) => {
  const event = req.paystackEvent;

  console.log(`[WEBHOOK] Received event: ${event.event}`);

  // ✅ Return 200 immediately — Paystack won't retry if we respond fast
  res.status(200).json({ received: true });

  // Async processing — happens after response is sent
  handleEventAsync(event);
});

async function handleEventAsync(event) {
  // Step 1: Log to local store with "pending" forward status
  const record = logEvent(event, "pending", null);

  // Step 2: Forward to Spring Boot
  const { status, statusCode } = await forwardToAuthorEngine(event);

  // Step 3: Update the log record with forward outcome
  updateForwardStatus(record.id, status, statusCode);

  // Step 4: Handle specific event types locally if needed
  handleEventType(event);
}

/**
 * Extend this switch as you add more Paystack event types.
 * This runs locally on this service — your Spring Boot app handles
 * business logic on its own side after receiving the forwarded event.
 */
function handleEventType(event) {
  switch (event.event) {
    case "charge.success":
      console.log(`[EVENT] Payment successful — ref: ${event.data?.reference}, amount: ${event.data?.amount} ${event.data?.currency}`);
      break;

    case "transfer.success":
      console.log(`[EVENT] Transfer successful — ref: ${event.data?.reference}`);
      break;

    case "transfer.failed":
      console.warn(`[EVENT] Transfer failed — ref: ${event.data?.reference}`);
      break;

    case "transfer.reversed":
      console.warn(`[EVENT] Transfer reversed — ref: ${event.data?.reference}`);
      break;

    case "subscription.create":
      console.log(`[EVENT] New subscription — code: ${event.data?.subscription_code}`);
      break;

    case "subscription.disable":
      console.warn(`[EVENT] Subscription disabled — code: ${event.data?.subscription_code}`);
      break;

    case "invoice.payment_failed":
      console.warn(`[EVENT] Invoice payment failed — ref: ${event.data?.reference}`);
      break;

    default:
      console.log(`[EVENT] Unhandled event type: ${event.event}`);
  }
}

module.exports = router;
