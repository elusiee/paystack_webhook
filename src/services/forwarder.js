const axios = require("axios");

const SPRING_BOOT_URL = process.env.AUTHORENGINE_WEBHOOK_URL;
const FORWARD_SECRET = process.env.FORWARD_SECRET; // Shared secret between this service and Spring Boot

/**
 * Forwards a Paystack event payload to the Spring Boot authorengine API.
 * Attaches a shared secret header so Spring Boot can verify the source.
 *
 * @param {object} event - Parsed Paystack event
 * @returns {{ status: string, statusCode: number|null }}
 */
async function forwardToAuthorEngine(event) {
  if (!SPRING_BOOT_URL) {
    console.warn("[FORWARDER] AUTHORENGINE_WEBHOOK_URL is not set — skipping forward");
    return { status: "skipped", statusCode: null };
  }

  try {
    const response = await axios.post(SPRING_BOOT_URL, event, {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Source": "paystack-relay",
        // Shared secret so your Spring Boot endpoint knows this came from this service
        "X-Forward-Secret": FORWARD_SECRET || "",
      },
      timeout: 10000, // 10 seconds
    });

    console.log(`[FORWARDER] Forwarded event '${event.event}' → ${response.status}`);
    return { status: "success", statusCode: response.status };
  } catch (err) {
    const code = err.response?.status || null;
    console.error(`[FORWARDER] Failed to forward event '${event.event}' → ${code || err.message}`);
    return { status: "failed", statusCode: code };
  }
}

module.exports = { forwardToAuthorEngine };
