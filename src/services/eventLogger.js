const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");
const { v4: uuidv4 } = require("./uuid");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/events.json");

const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// Initialize DB schema
db.defaults({ events: [] }).write();

/**
 * Persists a Paystack event to the local JSON store.
 * @param {object} event - The parsed Paystack event object
 * @param {string} forwardStatus - "success" | "failed" | "skipped"
 * @param {number|null} forwardStatusCode - HTTP status code from Spring Boot
 */
function logEvent(event, forwardStatus = "pending", forwardStatusCode = null) {
  const record = {
    id: uuidv4(),
    event: event.event,
    reference: event?.data?.reference || null,
    amount: event?.data?.amount || null,
    currency: event?.data?.currency || null,
    customer_email: event?.data?.customer?.email || null,
    received_at: new Date().toISOString(),
    forward_status: forwardStatus,
    forward_status_code: forwardStatusCode,
    raw: event,
  };

  db.get("events").push(record).write();
  console.log(`[DB] Logged event: ${record.event} | ref: ${record.reference} | forward: ${forwardStatus}`);
  return record;
}

/**
 * Update the forward status of an already-logged event.
 */
function updateForwardStatus(id, status, statusCode) {
  db.get("events")
    .find({ id })
    .assign({ forward_status: status, forward_status_code: statusCode })
    .write();
}

module.exports = { logEvent, updateForwardStatus };
