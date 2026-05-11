# authorengine-paystack-webhook

A lightweight Express service that:
1. Receives Paystack webhook events
2. Verifies the HMAC SHA512 signature
3. Logs every event to a local JSON file (`data/events.json`)
4. Forwards the event to your Spring Boot `authorengine` API

---

## Project Structure

```
src/
├── index.js                   # Entry point
├── routes/
│   ├── webhook.js             # POST /webhook  ← register this URL in Paystack dashboard
│   └── health.js              # GET  /health   ← used by Railway/Render for uptime checks
├── middleware/
│   └── verifySignature.js     # HMAC SHA512 signature verification
└── services/
    ├── eventLogger.js         # Logs events to data/events.json
    ├── forwarder.js           # Forwards events to Spring Boot
    └── uuid.js                # UUID helper
```

---

## Local Development

```bash
cp .env.example .env
# Fill in your PAYSTACK_SECRET_KEY, AUTHORENGINE_WEBHOOK_URL, FORWARD_SECRET

mkdir -p data
npm install
npm run dev
```

---

## Deploying to Railway

1. Push this folder to a GitHub repo (separate from authorengine)
2. In Railway: **New Project → Deploy from GitHub**
3. Set environment variables in Railway dashboard:
   - `PAYSTACK_SECRET_KEY`
   - `AUTHORENGINE_WEBHOOK_URL`
   - `FORWARD_SECRET`
4. Railway auto-detects Node and uses `npm start`
5. Copy the public Railway URL (e.g. `https://your-app.railway.app`)

## Deploying to Render

1. Push to GitHub
2. In Render: **New → Web Service → Connect repo**
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node src/index.js`
5. Add the same environment variables above
6. Copy the Render public URL

---

## Registering the Webhook URL in Paystack

1. Go to **Paystack Dashboard → Settings → API Keys & Webhooks**
2. Under **API Configuration (Test Mode)**, paste your public URL:
   ```
   https://your-app.railway.app/webhook
   ```
3. Save. Paystack will now POST all events to that URL.

---

## Spring Boot — Receiving the Forwarded Event

Add this endpoint to your `authorengine` project:

```java
@RestController
@RequestMapping("/api/payments")
public class PaymentWebhookController {

    @Value("${webhook.forward-secret}")
    private String forwardSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Void> receiveWebhook(
            @RequestBody Map<String, Object> event,
            @RequestHeader("X-Webhook-Source") String source,
            @RequestHeader("X-Forward-Secret") String secret) {

        if (!"paystack-relay".equals(source) || !forwardSecret.equals(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String eventType = (String) event.get("event");
        // Handle event types: charge.success, transfer.success, etc.
        log.info("Received forwarded Paystack event: {}", eventType);

        return ResponseEntity.ok().build();
    }
}
```

Add to `application.properties`:
```properties
webhook.forward-secret=same_value_as_FORWARD_SECRET_env_var
```

And exclude this endpoint from JWT auth in your Security config:
```java
.requestMatchers("/api/payments/webhook").permitAll()
```

---

## Event Log

Events are stored in `data/events.json`. Each record includes:
- `event` — event type (e.g. `charge.success`)
- `reference` — transaction reference
- `amount`, `currency`, `customer_email`
- `received_at` — ISO timestamp
- `forward_status` — `success`, `failed`, or `skipped`
- `forward_status_code` — HTTP status from Spring Boot
- `raw` — full Paystack payload
