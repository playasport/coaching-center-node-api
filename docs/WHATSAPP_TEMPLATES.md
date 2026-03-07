# WhatsApp Notification Templates

This doc lists all **in-app WhatsApp message templates** used for notifications. These are **plain-text templates** with `{{variable}}` placeholders defined in code. They are **not** Meta Business Manager approved templates yet.

---

## Important: Meta template approval

- **Current state:** WhatsApp notification sends for these templates are **commented out** in code. Even if WhatsApp (Meta Cloud API) is enabled in Settings, these messages will **not** be sent until you:
  1. Create and submit each message as a **template** in [Meta Business Manager](https://business.facebook.com) → WhatsApp → Message templates.
  2. Get each template **approved** by Meta.
  3. **Uncomment** the corresponding `queueWhatsApp(...)` / WhatsApp block in code and, if needed, switch to Meta’s template message API (template name + parameters) instead of free-form text.

- **Why:** Sending marketing/utility messages to users who haven’t messaged you in 24 hours requires **approved templates**. Free-form text is only allowed within the 24-hour session. To avoid rejections and failed sends, we keep these disabled until templates are approved.

- **Admin chat:** Unaffected. Admin panel WhatsApp chat (conversations, send reply) uses free-form text within the session and does **not** use these templates.

---

## Where templates are defined

| File | Description |
|------|-------------|
| `src/services/common/notificationMessages.ts` | All `get*WhatsApp(...)` functions. Each returns a string with `{{variable}}` placeholders. |

Variables are replaced by `replaceVariables(template, variables)` in the same file. Recipients get the final string (today sent as a normal text message via Meta Cloud API when the code is enabled).

---

## Template list and where they are used

| # | Template function | Trigger / use case | Used in (file: area) |
|---|-------------------|--------------------|----------------------|
| 1 | `getBookingRequestAcademyWhatsApp` | New booking request → academy owner | `src/services/client/booking.service.ts`: after slot book |
| 2 | `getBookingRequestSentUserWhatsApp` | Booking request sent → user | `src/services/client/booking.service.ts`: after slot book |
| 3 | **Meta template `payment_request`** (booking approved) | Booking approved → user (pay now) with CTA | `src/services/academy/booking.service.ts`: approve booking — sends template via `sendWhatsAppCloudPaymentRequestTemplate` (header image, body params, URL button). |
| 3b | `getBookingApprovedUserWhatsApp` | (Legacy in-app text; not used when template is sent.) | — |
| 4 | `getBookingRejectedUserWhatsApp` | Booking rejected → user | `src/services/academy/booking.service.ts`: reject booking |
| 5 | `getBookingCancelledUserWhatsApp` | Booking cancelled → user | `src/services/client/booking.service.ts`: cancel (user + academy flow) |
| 6 | `getBookingCancelledAcademyWhatsApp` | Booking cancelled → academy | `src/services/client/booking.service.ts`: cancel (both flows) |
| 7 | `getPaymentVerifiedUserWhatsApp` | Payment success → user | `src/services/client/booking.service.ts`: after payment verify |
| 8 | `getPaymentVerifiedAcademyWhatsApp` | Payment success → academy | `src/services/client/booking.service.ts`: after payment verify |
| 9 | `getPaymentReminderUserWhatsApp` | Payment reminder (X hours left) | `src/jobs/bookingPaymentExpiry.job.ts`: reminder job |
| 10 | `getPayoutAccountCreatedAcademyWhatsApp` | Payout account created → academy | `src/services/academy/payoutAccount.service.ts`: create account |
| 11 | `getBankDetailsUpdatedAcademyWhatsApp` | Bank details updated → academy | `src/services/academy/payoutAccount.service.ts`: update bank details |
| 12 | `getPayoutAccountActivatedAcademyWhatsApp` | Payout account activated → academy | `src/services/academy/payoutAccount.service.ts`: activation webhook |
| 13 | `getPayoutAccountNeedsClarificationAcademyWhatsApp` | Payout needs clarification → academy | `src/services/academy/payoutAccount.service.ts`: needs clarification |
| 14 | `getPayoutAccountRejectedAcademyWhatsApp` | Payout account rejected → academy | `src/services/academy/payoutAccount.service.ts`: rejection |
| 15 | `getPayoutTransferInitiatedAcademyWhatsApp` | Payout transfer initiated → academy | `src/queue/payoutTransferWorker.ts`: transfer job |
| 16 | `getPayoutTransferCompletedAcademyWhatsApp` | Payout transfer completed → academy | `src/services/common/webhook.service.ts`: transfer webhook |
| 17 | `getPayoutTransferFailedAcademyWhatsApp` | Payout transfer failed → academy | Defined in `notificationMessages.ts` only; no send call yet |

---

## How to enable after approval

1. In **Meta Business Manager** → WhatsApp → Message templates, create a template for each message type (name, body, optional buttons/variables). Use the text from the corresponding `get*WhatsApp` in `notificationMessages.ts` as the body; replace `{{var}}` with Meta’s variable format (e.g. `{{1}}`, `{{2}}`).
2. After each template is **approved**, either:
   - **Option A:** Uncomment the corresponding WhatsApp block in the “Used in” file and keep sending as **text** (only valid inside 24-hour window), or  
   - **Option B:** Change that flow to use Meta’s **template message** API (template name + parameters) so you can send outside the 24-hour window.
3. Search the repo for `TODO(WhatsApp)` or “Enable after Meta template approved” to find every commented WhatsApp send.

---

## Related

- **Meta Cloud API setup:** `docs/WHATSAPP_CLOUD_API_SETUP.md`
- **Template text and variables:** `src/services/common/notificationMessages.ts`
