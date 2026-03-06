# Booking Payment Expiry, Auto-Cancel & Reminders

This document describes how approved-but-unpaid bookings are handled: configurable payment link expiry, automatic cancellation after expiry, and payment reminder notifications. Settings are manageable via environment variables and the Admin Settings API.

---

## Table of Contents

1. [Overview](#overview)
2. [Payment link expiry window](#payment-link-expiry-window)
3. [Auto-cancel (unpaid after expiry)](#auto-cancel-unpaid-after-expiry)
4. [Payment reminders](#payment-reminders)
5. [Settings (configurable)](#settings-configurable)
6. [Cron job](#cron-job)
7. [Notifications](#notifications)
8. [Related code & docs](#related-code--docs)

---

## Overview

| Feature | Description |
|--------|-------------|
| **Expiry window** | After academy approves a booking, the payment link is valid for a fixed number of hours (default **24**). Same value is used for auto-cancel. |
| **Auto-cancel** | If the user does **not** pay before the expiry time, the booking is **automatically cancelled** by the system. User, academy, and admin get cancellation notifications. |
| **Payment reminders** | Within the expiry window, the user gets **2–3 automatic reminders** (e.g. at 12h, 6h, 2h before expiry). Each reminder is sent once. |
| **Configurable** | Expiry hours and reminder schedule can be changed via **env** or **Admin Settings API**. |

---

## Payment link expiry window

- When the **academy approves** a booking, the backend sets:
  - `payment_token` (for the public pay URL)
  - `payment_token_expires_at` = *now* + **configured hours**
- The configured hours come from **Settings** (if set) or **config/env** (see [Settings](#settings-configurable)).
- Default: **24 hours**. You can set 12, 48, etc.
- The same “expiry hours” value is used for:
  - Setting `payment_token_expires_at` on approve
  - Deciding when to **auto-cancel** (if still unpaid after that time)
  - Deciding when to send **reminders** (e.g. “X hours left”)

---

## Auto-cancel (unpaid after expiry)

### Behaviour

- A **cron job** runs **every 15 minutes**.
- It finds bookings where:
  - `status` = **APPROVED**
  - `payment.status` ≠ **SUCCESS**
  - `payment_token_expires_at` **< now**
  - `is_deleted` = false
- For each such booking it:
  1. **Cancels** the booking: `status` = CANCELLED, `cancelled_by` = **'system'**, `cancellation_reason` = *"Payment not completed within the allowed time. Your booking has been automatically cancelled."*
  2. Updates related **transaction** (if any) to CANCELLED.
  3. Creates an **audit trail** entry.
  4. Sends **cancellation notifications** (same as when a user cancels): user (email, SMS, WhatsApp, push), academy, admin.

### User experience

- User gets the same “Booking cancelled” notifications they would get on manual cancel.
- Reason shown is that payment was not completed within the allowed time.

---

## Payment reminders

### Behaviour

- The **same cron job** (every 15 minutes) also handles reminders.
- It finds bookings where:
  - `status` = **APPROVED**
  - `payment.status` ≠ **SUCCESS**
  - `payment_token_expires_at` **> now**
  - `payment_token` exists
  - `is_deleted` = false
- For each booking it checks the **configured reminder schedule** (e.g. [12, 6, 2] = “send when 12h left, 6h left, 2h left”).
- For each value **H** in that schedule:
  - If **hours left until expiry ≤ H** and a reminder for **H** has **not** been sent yet:
    - Sends reminder on all channels (email, SMS, WhatsApp, push).
    - Records **H** in `payment_reminder_sent_hours` on the booking so that reminder is not sent again.

### Default schedule

- **12, 6, 2** — reminders when 12 hours, 6 hours, and 2 hours are left before the payment link expires.
- Configurable via env or Settings (see below).

### Reminder content

- **Email:** Template `booking-payment-reminder-user.html` with:
  - `userName`, `batchName`, `centerName`, `bookingId`, `hoursLeft`, `paymentUrl`, `year`
- **SMS / WhatsApp / Push:** Short message that payment is pending and “X hours left”, with payment link where applicable.
- `paymentUrl` = main site pay page with token (e.g. `https://yoursite.com/pay?token=...`).

### When reminders stop

- Reminders are sent only for **approved, unpaid** bookings with a **future** expiry.
- They stop when:
  - User **pays** (booking becomes CONFIRMED), or
  - Booking is **cancelled** (by user or by auto-cancel).

---

## Settings (configurable)

Expiry and reminder schedule can be set in two ways. **Settings API overrides env** when both are present.

### 1. Environment variables (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| **BOOKING_PAYMENT_LINK_EXPIRY_HOURS** | Hours after approval before payment link expires and booking is auto-cancelled if unpaid. | `24` |
| **BOOKING_PAYMENT_REMINDER_HOURS** | Comma-separated hours-before-expiry to send a reminder (e.g. `12,6,2`). | `12,6,2` |

Example in `.env`:

```env
BOOKING_PAYMENT_LINK_EXPIRY_HOURS=48
BOOKING_PAYMENT_REMINDER_HOURS=24,12,6,2
```

### 2. Settings API (admin)

Admin can override via the **Settings** update API (e.g. PATCH):

| Key | Type | Description |
|-----|------|-------------|
| **booking.payment_link_expiry_hours** | number | Same as `BOOKING_PAYMENT_LINK_EXPIRY_HOURS`. |
| **booking.payment_reminder_hours_before_expiry** | number[] | Same as reminder schedule, e.g. `[12, 6, 2]` or `[24, 12, 6, 2]`. |

Example request body:

```json
{
  "booking": {
    "payment_link_expiry_hours": 48,
    "payment_reminder_hours_before_expiry": [24, 12, 6, 2]
  }
}
```

- If **Settings** has `booking` set, it is used for:
  - Token expiry on approve
  - Cron auto-cancel threshold
  - Reminder schedule
- Otherwise, **env** (or code defaults) are used.

---

## Cron job

- **File:** `src/jobs/bookingPaymentExpiry.job.ts`
- **Schedule:** Every **15 minutes** (`*/15 * * * *`)
- **Started in:** `src/server.ts` (after DB connect)

### What it does each run

1. **Auto-cancel**  
   Find approved, unpaid bookings with `payment_token_expires_at < now` → cancel each via `cancelBookingBySystem(bookingId)` and send cancellation notifications.

2. **Reminders**  
   Find approved, unpaid bookings with `payment_token_expires_at > now` → for each configured “hours before expiry”, if due and not yet sent, send reminder and add that hour to `payment_reminder_sent_hours`.

### Manual run (e.g. for testing)

You can call the job logic directly:

```ts
import { executeBookingPaymentExpiryJob } from './jobs/bookingPaymentExpiry.job';
await executeBookingPaymentExpiryJob();
```

---

## Notifications

### Auto-cancel (system cancellation)

- **User:** Email (`booking-cancelled-user`), SMS, WhatsApp, push — same as user-initiated cancel; reason = “Payment not completed within the allowed time...”.
- **Academy:** Email, SMS, WhatsApp, push — booking cancelled by system.
- **Admin:** Email — booking cancelled.

### Payment reminder

- **User only:** Email (`booking-payment-reminder-user`), SMS, WhatsApp, push.
- **Content:** Booking details, “X hours left to pay”, and payment link (`paymentUrl`).

### Templates / subjects

- **Email template:** `src/email/templates/booking-payment-reminder-user.html`
- **Subject:** “Complete your payment - Play A Sport”
- **Message helpers:** `notificationMessages.ts` — `getPaymentReminderUserSms`, `getPaymentReminderUserWhatsApp`, `getPaymentReminderUserEmailText`, `getPaymentReminderUserPush`

---

## Related code & docs

| Item | Location / doc |
|------|-----------------|
| Expiry + reminder config (read) | `getBookingPaymentConfig()` in `src/services/common/settings.service.ts` |
| Token expiry on approve | `src/services/academy/booking.service.ts` (approve booking) |
| System cancel | `cancelBookingBySystem()` in `src/services/client/booking.service.ts` |
| Cron job | `src/jobs/bookingPaymentExpiry.job.ts` |
| Booking model fields | `payment_token`, `payment_token_expires_at`, `payment_reminder_sent_hours` in `src/models/booking.model.ts` |
| Settings model | `booking?: BookingPaymentSettings` in `src/models/settings.model.ts` |
| Public pay flow | [PUBLIC_PAYMENT_LINK_GUIDE.md](./PUBLIC_PAYMENT_LINK_GUIDE.md) |
