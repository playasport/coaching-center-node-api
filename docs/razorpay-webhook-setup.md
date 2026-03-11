# Razorpay Webhook Integration Guide

## Overview

Webhooks are HTTP callbacks that Razorpay sends to your server when payment events occur (payment captured, failed, refunded, etc.). They act as a **backup to client-side payment verification** — if the user's app crashes or network drops after payment, the webhook still updates your booking/transaction records.

---

## 1. Environment Variable

Add the webhook secret to your `.env` file:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

> **Important:** This is NOT the same as `RAZORPAY_KEY_SECRET`. This is a separate secret you create when configuring the webhook in the Razorpay Dashboard. If left empty, the system falls back to `RAZORPAY_KEY_SECRET` for signature verification.

---

## 2. Razorpay Dashboard Configuration

### Step-by-step

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Account & Settings** → **Webhooks**
3. Click **+ Add New Webhook**
4. Fill in the following:

| Field | Value |
|---|---|
| **Webhook URL** | `https://your-api-domain.com/api/v1/webhook/razorpay` |
| **Secret** | Create a strong random string (this goes into `RAZORPAY_WEBHOOK_SECRET`) |
| **Alert Email** | Your admin email for failure alerts |
| **Active Events** | Select the events listed below |

### Required Events to Subscribe

| Event | Purpose |
|---|---|
| `payment.captured` | Confirms booking when payment is captured (primary) |
| `payment.failed` | Marks payment as failed with error reason |
| `order.paid` | Backup confirmation — ensures booking is confirmed if `payment.captured` was missed |
| `transfer.processed` | Updates payout status to COMPLETED when academy payout transfer succeeds |
| `transfer.failed` | Marks payout as FAILED with failure reason |
| `refund.processed` | Handles full/partial refund — cancels booking or adjusts payout |
| `refund.failed` | Logs refund failure for manual follow-up |

5. Click **Create Webhook**
6. Copy the **Secret** and paste it into your `.env` as `RAZORPAY_WEBHOOK_SECRET`

---

## 3. How It Works (Architecture)

```
Razorpay Server
     │
     │  POST /api/v1/webhook/razorpay
     │  Header: x-razorpay-signature
     │
     ▼
┌─────────────────────────────────┐
│  express.json() with verify()   │  ← Captures raw body for signature check
│  (src/app.ts)                   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  verifyWebhookSignature         │  ← HMAC-SHA256 verification using RAZORPAY_WEBHOOK_SECRET
│  (src/middleware/webhook.       │
│   middleware.ts)                │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  handleRazorpayWebhook          │  ← Responds 200 immediately, processes async
│  (src/controllers/webhook.      │
│   controller.ts)                │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  webhookService.handleWebhook   │  ← Routes to event-specific handler
│  (src/services/common/          │
│   webhook.service.ts)           │
└─────────────────────────────────┘
```

### Key Files

| File | Responsibility |
|---|---|
| `src/config/env.ts` | Reads `RAZORPAY_WEBHOOK_SECRET` from environment |
| `src/app.ts` | Captures raw body via `express.json({ verify })` for webhook paths |
| `src/middleware/webhook.middleware.ts` | Verifies `x-razorpay-signature` header against raw body |
| `src/controllers/webhook.controller.ts` | Responds 200 immediately, delegates to service async |
| `src/services/common/webhook.service.ts` | Event routing and all business logic handlers |
| `src/routes/webhook.routes.ts` | Mounts `POST /razorpay` with signature verification |
| `src/services/common/payment/gateways/RazorpayGateway.ts` | HMAC-SHA256 signature computation |
| `src/services/common/settings.service.ts` | Fetches webhook secret (DB settings > env fallback) |

---

## 4. Event Handling Details

### `payment.captured`
- Finds booking by `payment.razorpay_order_id`
- Skips if already `SUCCESS` (idempotent)
- Verifies amount matches
- Updates booking: `status → CONFIRMED`, `payment.status → SUCCESS`
- Creates/updates transaction record with `source: WEBHOOK`
- Creates payout record for academy (if commission > 0)

### `payment.failed`
- Finds booking by `payment.razorpay_order_id`
- Updates `payment.status → FAILED` with error description
- Creates/updates transaction with failure reason

### `order.paid`
- Backup for `payment.captured`
- If booking isn't already `CONFIRMED`, updates it

### `transfer.processed`
- Finds payout by `razorpay_transfer_id`
- Updates payout `status → COMPLETED`
- Updates booking `payout_status → COMPLETED`
- Sends push/SMS/WhatsApp notifications to academy

### `transfer.failed`
- Finds payout by `razorpay_transfer_id`
- Updates payout `status → FAILED` with failure reason
- Updates booking `payout_status → FAILED`
- Creates audit trail

### `refund.processed`
- Finds booking by `payment.razorpay_payment_id`
- Full refund: cancels booking, sets `payment.status → REFUNDED`
- Partial refund: adjusts payout amount proportionally
- Creates/updates refund transaction
- Cancels or adjusts pending payouts

### `refund.failed`
- Logs failure with reason
- Creates failed refund transaction for audit

---

## 5. Security

- **Signature Verification**: Every webhook is verified using HMAC-SHA256 with your webhook secret. Invalid signatures return `400`.
- **Timing-Safe Comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks.
- **Raw Body**: Signature is computed on the raw request body (not parsed JSON) to avoid serialization differences.
- **Always 200**: Controller responds `200` even on processing errors to prevent Razorpay retries flooding the server. Errors are logged internally.
- **Idempotent**: All handlers check existing state before updating (e.g., skip if payment already `SUCCESS`).

---

## 6. Testing Locally

### Using ngrok

```bash
# Start your server
npm run dev

# In another terminal, expose it via ngrok
ngrok http 3001
```

Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`) and set it as the webhook URL in Razorpay Dashboard:

```
https://abc123.ngrok.io/api/v1/webhook/razorpay
```

### Using Razorpay Test Mode

1. Use **Test Mode** keys in Razorpay Dashboard
2. Make a test payment through your app
3. Razorpay will send webhook events to your configured URL
4. Check server logs for webhook processing output

---

## 7. Credential Priority & Admin Panel

The system supports two sources for the webhook secret (checked in this order):

1. **Admin Panel (Database Settings)** — key: `payment.razorpay.webhook_secret`  
   - **PUT** `/admin/settings` with body `{ "payment": { "razorpay": { "webhook_secret": "your-secret" } } }` to set or update.  
   - **GET** `/admin/settings` returns decrypted settings (admin only), including `payment.razorpay.webhook_secret` when present.
2. **Environment Variable** — `RAZORPAY_WEBHOOK_SECRET` in `.env`

If both are empty, the webhook uses `RAZORPAY_KEY_SECRET` (not recommended for production).  
You can manage the webhook secret entirely from the admin panel; no server restart is needed when you change it there.

---

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| `400 Missing webhook signature` | Razorpay isn't sending the `x-razorpay-signature` header. Check webhook URL is correct. |
| `400 Invalid webhook signature` | `RAZORPAY_WEBHOOK_SECRET` doesn't match the secret in Razorpay Dashboard. Update `.env` and restart. |
| `400 Unable to verify webhook signature` | Raw body not captured. Ensure `express.json({ verify })` is configured in `app.ts`. |
| Webhook not received at all | Check webhook URL is publicly accessible. Verify in Razorpay Dashboard → Webhooks → Recent Deliveries. |
| Booking not updating | Check logs for "Booking not found for order". Ensure `payment.razorpay_order_id` is set during order creation. |
| Duplicate processing | Handlers are idempotent — this is safe. Duplicate events are logged and skipped. |
