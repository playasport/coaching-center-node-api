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
