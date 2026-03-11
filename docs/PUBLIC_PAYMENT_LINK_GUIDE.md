# Public Payment Link Guide (Pay Without Login)

This guide documents the **token-based public payment flow**: a payment URL that works without user login. The link is sent after the academy approves a booking and expires in **24 hours**. Payment is verified by the Razorpay webhook.

---

## Table of Contents

1. [Overview](#overview)
2. [Flow Summary](#flow-summary)
3. [Token Generation](#token-generation)
4. [API Endpoints](#api-endpoints)
5. [Response Shapes](#response-shapes)
6. [Frontend Integration (Next.js)](#frontend-integration-nextjs)
7. [Email Variable](#email-variable)
8. [Status & Error Handling](#status--error-handling)
9. [Security Notes](#security-notes)

---

## Overview

| Feature | Description |
|--------|-------------|
| **Purpose** | Let users pay for an approved booking via a link, without logging in |
| **When link is created** | When academy **approves** the booking |
| **Link expiry** | 24 hours from approval |
| **Auth required** | No — all public pay APIs are unauthenticated |
| **Payment verification** | Razorpay webhook (no need to call verify-payment from pay page) |

**Base URL for APIs:** `GET/POST /api/v1/public/booking/...`

---

## Flow Summary

```
Academy approves booking
        │
        ▼
Backend sets payment_token + payment_token_expires_at (now + 24h)
        │
        ▼
User receives email with paymentUrl = https://yoursite.com/pay?token=xxx
        │
        ▼
User opens /pay?token=xxx (no login)
        │
        ▼
Frontend: GET /api/v1/public/booking/pay?token=xxx
        │
        ├── Invalid/expired token → Show error
        ├── status cancelled / already paid → Show message, hide Pay button
        └── payment_enabled: true → Show booking details + "Pay Now"
        │
        ▼
User clicks "Pay Now"
        │
        ▼
Frontend: POST /api/v1/public/booking/create-order { "token": "xxx" }
        │
        ▼
Backend creates Razorpay order, returns razorpayOrder
        │
        ▼
Frontend opens Razorpay Checkout (order_id, amount, key from response)
        │
        ▼
User completes payment on Razorpay
        │
        ▼
Razorpay webhook (payment.captured) → Backend updates booking CONFIRMED + payment SUCCESS
        │
        ▼
Frontend shows success (e.g. success_url or poll pay API for status)
```

---

## Token Generation

- **When:** Academy approves a booking (in `academy/booking.service.ts`).
- **What:** A secure random token (`payment_token`) and expiry (`payment_token_expires_at = now + 24h`) are stored on the booking.
- **Where stored:** `Booking` model fields: `payment_token`, `payment_token_expires_at`.
- **Sent to user:** In the approval email template variable `paymentUrl` (e.g. `https://front.playasport.in/pay?token=<token>`).

---

## API Endpoints

### 1. Get booking by payment token (for pay page load)

**Endpoint:** `GET /api/v1/public/booking/pay`  
**Auth:** None  
**Query:**

| Parameter | Type   | Required | Description        |
|----------|--------|----------|--------------------|
| `token`  | string | Yes      | Payment token from URL |

**Success (200):** Booking details for the pay page (see [Response Shapes](#response-shapes)).

**Errors:**

| Status | Description |
|--------|-------------|
| 400    | Invalid or missing token; or link expired |
| 404    | Payment link invalid or expired |

---

### 2. Create Razorpay order by token (when user clicks Pay)

**Endpoint:** `POST /api/v1/public/booking/create-order`  
**Auth:** None  
**Body:**

```json
{
  "token": "<payment_token_from_url>"
}
```

**Success (201):** Booking summary + Razorpay order to open Checkout (see [Response Shapes](#response-shapes)).

**Errors:**

| Status | Description |
|--------|-------------|
| 400    | Invalid/missing token; link expired; or booking already paid |
| 404    | Booking not found or payment not available for this link |

---

## Response Shapes

### GET `/public/booking/pay?token=xxx` — Success (200)

```json
{
  "success": true,
  "message": "Booking details retrieved",
  "data": {
    "id": "booking-uuid",
    "booking_id": "PS-2024-0001",
    "batch": {
      "id": "batch-id",
      "name": "Batch name",
      "scheduled": {
        "start_date": "2024-01-15T00:00:00.000Z",
        "start_time": "09:00",
        "end_time": "10:00",
        "training_days": ["mon", "wed", "fri"]
      },
      "duration": { "count": 3, "type": "month" }
    },
    "participants": [
      { "id": "p1", "firstName": "John", "lastName": "Doe", "age": 10, "profilePhoto": null }
    ],
    "center": { "id": "c1", "center_name": "Academy Name", "logo": null },
    "sport": { "id": "s1", "name": "Cricket", "logo": null },
    "amount": 5000,
    "currency": "INR",
    "status": "approved",
    "status_message": "Your booking has been approved. Please proceed with payment to confirm your booking.",
    "payment_status": "not_initiated",
    "payment_enabled": true,
    "can_download_invoice": false,
    "rejection_reason": null,
    "cancellation_reason": null,
    "token_expires_at": "2024-01-16T12:00:00.000Z",
    "razorpay_key_id": "rzp_test_xxxx"
  }
}
```

**Fields to use on pay page:**

- **`payment_enabled`** — `true` → show “Pay Now”; `false` → show status message only (already paid, cancelled, etc.).
- **`status`** — e.g. `approved`, `confirmed`, `cancelled`, `rejected`.
- **`payment_status`** — e.g. `not_initiated`, `paid`, `success`, `cancelled`, `failed`.
- **`status_message`** — User-facing message.
- **`token_expires_at`** — Show “Link expires at …” if needed.
- **`razorpay_key_id`** — Use with Razorpay Checkout (along with order from create-order).

---

### POST `/public/booking/create-order` — Success (201)

```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "booking": {
      "id": "booking-uuid",
      "booking_id": "PS-2024-0001",
      "status": "approved",
      "amount": 5000,
      "currency": "INR",
      "payment": {
        "razorpay_order_id": "order_xxxx",
        "status": "initiated"
      }
    },
    "razorpayOrder": {
      "id": "order_xxxx",
      "amount": 500000,
      "currency": "INR",
      "receipt": "booking_xxx",
      "status": "created",
      "created_at": 1705312800
    }
  }
}
```

Use `data.razorpayOrder` and `data.razorpay_key_id` (from the pay response) to open Razorpay Checkout. After payment, the backend updates the booking via webhook; no verify-payment call is required from the pay page.

---

## Frontend Integration (Next.js)

### 1. Pay page route

- Example: `app/pay/page.tsx` (or `pages/pay.tsx`).
- Read token from query: `searchParams.token` (App Router) or `router.query.token` (Pages Router).

### 2. On page load

- Call: `GET /api/v1/public/booking/pay?token=${token}`.
- **4xx:** Show “Invalid or expired payment link”.
- **200:**
  - If `payment_enabled === false` and already paid → “Payment already done”.
  - If `status === 'cancelled'` → “Booking cancelled”.
  - If `payment_enabled === true` → Render booking details and “Pay Now”.

### 3. Pay Now click

- Call: `POST /api/v1/public/booking/create-order` with body `{ token }`.
- On success, open Razorpay Checkout with:
  - `key`: from earlier pay response `razorpay_key_id`
  - `order_id`: `data.razorpayOrder.id`
  - `amount`, `currency`, etc. from `data.razorpayOrder`
- On Razorpay success: show “Payment successful” (webhook will confirm; optional: poll GET pay again to show updated status).

### 4. Razorpay key

- Use `razorpay_key_id` from GET `/public/booking/pay` response so the frontend does not need to hardcode the key.

---

## Email Variable

When the academy approves a booking, the approval email receives:

| Variable    | Description |
|------------|-------------|
| `paymentUrl` | Full pay page URL with token, e.g. `https://front.playasport.in/pay?token=abc123...` |

**Example (in email template):**

```html
<a href="{{paymentUrl}}">Pay now</a>
```

`MAIN_SITE_URL` in env is used to build this URL. If `MAIN_SITE_URL` is not set, `paymentUrl` may be empty.

---

## Status & Error Handling

### Booking / payment states on pay page

| Scenario              | `status`   | `payment_status` | `payment_enabled` | Frontend action        |
|-----------------------|------------|------------------|-------------------|------------------------|
| Approved, not paid    | approved   | not_initiated    | true              | Show details + Pay     |
| Payment initiated     | approved   | initiated        | true              | Show details + Pay     |
| Already paid          | confirmed  | paid/success     | false             | Show “Already paid”    |
| Booking cancelled     | cancelled  | —                | false             | Show “Booking cancelled” |
| Rejected              | rejected   | —                | false             | Show “Booking rejected” |
| Link expired          | —          | —                | —                 | 400 from API; show “Link expired” |

### API error messages (examples)

- `Payment link is invalid or has expired` (404)
- `This payment link has expired. Please request a new link or log in to pay.` (400)
- `This booking has already been paid.` (400)
- `Booking not found or payment is not available for this link` (404)

---

## Auto-cancel and payment reminders

- **Full detail:** See **[BOOKING_PAYMENT_EXPIRY_AND_REMINDERS.md](./BOOKING_PAYMENT_EXPIRY_AND_REMINDERS.md)** for expiry window, auto-cancel, reminders, and settings.
- **Expiry window:** Configurable in hours (default 24). Same window is used for auto-cancel.
- **Auto-cancel:** A cron job runs every 15 minutes. If an approved booking has **not** been paid and `payment_token_expires_at` has passed, the booking is **automatically cancelled** (`cancelled_by: 'system'`) and the user receives the same cancellation notifications (email, SMS, WhatsApp, push). Academy and admin are also notified.
- **Payment reminders:** Within the expiry window, the user receives **2–3 automatic reminders** (configurable). Default: at **12 hours**, **6 hours**, and **2 hours** before the link expires. Each reminder is sent once (tracked per booking). Channels: email, SMS, WhatsApp, push. The reminder includes the payment link and “X hours left”.

---

## Security Notes

- **No auth:** Public pay and create-order do not require login. Security relies on:
  - Unguessable token (32-byte random hex).
  - 24-hour expiry.
- **Token in URL:** Avoid logging or exposing the full URL in client-side analytics; treat the token as sensitive.
- **Webhook:** Payment confirmation is done only via Razorpay webhook; the pay page does not call verify-payment.
- **Old bookings:** Bookings approved before this feature have no `payment_token`; their old approval emails will not contain a valid pay link. New approvals get the link automatically.

---

## Related Docs

- [BOOKING_PAYMENT_EXPIRY_AND_REMINDERS.md](./BOOKING_PAYMENT_EXPIRY_AND_REMINDERS.md) — Payment link expiry, auto-cancel, reminders, and settings
- [FRONTEND_BOOKING_FLOW_GUIDE.md](./FRONTEND_BOOKING_FLOW_GUIDE.md) — Authenticated booking and payment flow
- [razorpay-webhook-setup.md](./razorpay-webhook-setup.md) — Webhook configuration for payment verification
