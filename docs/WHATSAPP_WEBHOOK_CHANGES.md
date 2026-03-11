# WhatsApp Webhook – Recent Changes

Short summary of backend updates for WhatsApp Cloud API webhook processing and message model.

---

## 1. Message model (`whatsappMessage.model`)

| Change | Details |
|--------|--------|
| **New types** | `reaction`, `interactive` added to `WhatsAppMessageType`. |
| **New field** | `repliedToWaMessageId` (string, optional) – for reactions, the message ID this reaction refers to. |
| **Existing** | `status`, `mediaUrl`, `rawPayload` already present; now used by webhook. |

---

## 2. Webhook processing (`processWhatsAppWebhookPayload`)

### Message status (incl. template tracking)
- Processes `value.statuses[]` when `change.field === 'messages'`.
- For each status (`sent`, `delivered`, `read`, `failed`), finds message by `waMessageId` and updates `status`.
- Applies to both normal and template messages we send (template tracking).

### Media URLs
- Incoming image, video, document, audio can include media `id`.
- Helper `getMediaUrlFromMeta(mediaId)` calls Graph API and returns media URL.
- Stored in `mediaUrl`; `media_id` kept in `rawPayload` (Meta URL can expire in ~5 min).

### Reactions
- `msg.type === 'reaction'`: type saved as `reaction`, content = emoji, `repliedToWaMessageId` = reacted message ID.
- `reaction_message_id` also in `rawPayload`.

### Button clicks
- **Quick reply:** `msg.type === 'button'` → stored as type `interactive`, content = button text/payload; `button_payload` in `rawPayload`.
- **Interactive:** `msg.type === 'interactive'` with `button_reply` / `list_reply` → type `interactive`, content = title; `button_reply_id` or `list_reply_id` in `rawPayload`.

---

## 3. API response shape (for frontend)

Messages returned by conversation/message APIs may now include:

| Field | Type | Notes |
|-------|------|--------|
| `type` | string | `text`, `image`, `audio`, `video`, `document`, `reaction`, `interactive`, `unknown` |
| `status` | string \| null | For **outbound**: `sent`, `delivered`, `read`, `failed` |
| `mediaUrl` | string \| null | Media URL for image/video/document/audio (may expire) |
| `repliedToWaMessageId` | string \| null | For reactions – ID of message that was reacted to |
| `rawPayload` | object \| null | Optional: `media_id`, `button_reply_id`, `list_reply_id`, `reaction_message_id` |

---

## 4. Frontend impact

- **Display:** Handle `reaction` (emoji + optional “replied to” via `repliedToWaMessageId`) and `interactive` (button/list reply text).
- **Media:** Use `mediaUrl` when present; show fallback if null (e.g. “Media unavailable or expired”).
- **Outbound:** Show delivery/read status using `status` (e.g. ticks or status label).
- **Types:** Extend shared `WhatsAppMessage` type with new `type` values and optional fields above.

No breaking changes: new fields are optional; existing behaviour unchanged.

---

## 5. How message status is stored and how to view it

### How the webhook stores status

1. **Meta sends status updates** in the same webhook payload as messages. When `change.field === 'messages'`, the payload can contain **`value.statuses`** (array).
2. **Each status item** has:
   - `id` – WhatsApp message ID (`wamid`, same as `waMessageId` in our DB)
   - `status` – one of `sent` | `delivered` | `read` | `failed`
3. **Backend** runs for each status:
   ```text
   WhatsAppMessageModel.updateOne(
     { waMessageId: st.id },
     { $set: { status: st.status } }
   )
   ```
   So any **existing** message in our DB with that `waMessageId` gets its `status` field updated.

### Which messages get status updated

| Message source | Stored in DB? | Status updated by webhook? |
|----------------|----------------|----------------------------|
| **Admin chat – sent from panel** | Yes (we create a row when admin sends) | Yes – `sent` → `delivered` → `read` (or `failed`) |
| **Incoming messages** (user to business) | Yes (we create from webhook) | No – status is for outbound only |
| **Template messages** (e.g. payment_request, payment_reminder from backend) | No – we don’t create a chat message row for these | Webhook runs but no row matches, so nothing to update |

So **message status is stored and updated only for messages that exist in `WhatsAppMessage` collection** – in practice, **outbound messages sent from the admin chat** (and any future flow that creates a message with `waMessageId` when sending).

### How to view message status

- **API:** `GET /api/v1/admin/whatsapp-chat/conversations/:conversationId/messages`  
  Each message in the response has a **`status`** field: `"sent"` | `"delivered"` | `"read"` | `"failed"` | `null`.
- **Frontend:** For **outbound** messages (`direction === 'out'`), show delivery state using `status`, e.g.:
  - `sent` – single tick
  - `delivered` – double tick
  - `read` – double tick (e.g. blue)
  - `failed` – error icon
  - `null` – pending or not applicable (e.g. inbound messages)
