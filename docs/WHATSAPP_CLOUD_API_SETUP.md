# Meta WhatsApp Cloud API – Setup & Admin Chat

This doc covers **Meta WhatsApp Cloud API** integration: webhook for receiving messages, storing chats, and admin panel APIs to list conversations, view messages, and send replies.

---

## Overview

- **Webhook:** Meta sends incoming messages to your server. You verify the webhook (GET) and process payloads (POST).
- **Storage:** Incoming (and outgoing) messages are stored in MongoDB (`WhatsAppConversation`, `WhatsAppMessage`).
- **Admin panel:** Admins with notification permissions can list conversations, open a chat, and send text replies.

**Note:** WhatsApp (admin chat and notification messages like booking approved) uses **only** the Meta WhatsApp Cloud API. Twilio is used for **SMS** only. Notification WhatsApp templates are currently **disabled** until Meta approves them; see **`docs/WHATSAPP_TEMPLATES.md`** for the list and how to enable after approval.

---

## 1. Meta / Facebook Developer Setup

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create or select an **App** → add **WhatsApp** product.
3. In **WhatsApp → API Setup** you will see:
   - **Phone number ID**
   - **WhatsApp Business Account ID**
   - **Temporary access token** (for testing); for production use a **System User** token with `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Note your **App Secret** (App Settings → Basic) for webhook signature verification.

---

## 2. Configuration (Env + Admin Panel)

You can configure WhatsApp Cloud via **environment variables** and/or **Admin Panel Settings**. Settings (stored in DB) override env. Use Admin → Settings and update the `notifications.whatsapp` block to enable/disable and set credentials without redeploying.

### Environment variables

Add to `.env` (optional if you configure entirely from Admin Panel):

```env
# Meta WhatsApp Cloud API (admin chat + stored conversations)
WHATSAPP_CLOUD_ENABLED=true
WHATSAPP_CLOUD_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_CLOUD_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=choose_a_random_secret_string
WHATSAPP_CLOUD_APP_SECRET=your_app_secret
WHATSAPP_CLOUD_API_VERSION=v21.0
```

| Variable | Description |
|----------|-------------|
| `WHATSAPP_CLOUD_ENABLED` | Set to `true` to enable Cloud API and admin chat APIs. |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | From WhatsApp → API Setup (numeric ID). |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Permanent token (System User) for production. |
| `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN` | Any string you choose; you’ll enter the **same** value in Meta App when subscribing the webhook. |
| `WHATSAPP_CLOUD_APP_SECRET` | App Secret from App Settings → Basic (used to verify `X-Hub-Signature-256`). |
| `WHATSAPP_CLOUD_API_VERSION` | Optional; default `v21.0`. |

---

## 3. Webhook URL and Subscription

1. Your webhook URL must be **HTTPS** and publicly reachable (e.g. `https://your-domain.com/api/v1/webhook/whatsapp`).
2. In Meta App: **WhatsApp → Configuration**.
3. Under **Webhook**:
   - **Callback URL:** `https://your-domain.com/api/v1/webhook/whatsapp`
   - **Verify token:** Same string as `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN`
4. Click **Verify and Save**.
   - Meta sends: `GET .../webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM`
   - The server responds with the `hub.challenge` value; verification succeeds.
5. Subscribe to **messages** (and optionally **message_deliveries**, **message_reads** if you want status updates later).

---

## 4. Backend Behaviour

- **GET `/api/v1/webhook/whatsapp`**  
  Verifies the webhook using `hub.mode`, `hub.verify_token`, and `hub.challenge`; responds with the challenge.

- **POST `/api/v1/webhook/whatsapp`**  
  Receives incoming message notifications. If `X-Hub-Signature-256` is present, it is verified using `WHATSAPP_CLOUD_APP_SECRET`. Incoming messages are parsed and stored:
  - Creates or updates **WhatsAppConversation** (by phone, display name, last message preview, unread count).
  - Creates **WhatsAppMessage** (direction `in`, type, content, `wa_message_id`, etc.).

Outgoing messages sent from the admin panel are sent via the Cloud API and stored as **WhatsAppMessage** with direction `out` and `fromAdmin: true`.

---

## 5. Admin Panel APIs

All under **`/api/v1/admin/whatsapp-chat`**. Require **admin auth** and **notification** permissions (view for list/read, create for send).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conversations` | List conversations (paginated). Query: `page`, `limit`, `search` (phone or display name). |
| GET | `/conversations/:conversationId/messages` | Get messages in a conversation (paginated). Query: `page`, `limit`. Marks conversation as read (unread = 0). |
| POST | `/conversations/:conversationId/send` | Send a text message. Body: `{ "text": "..." }`. |
| POST | `/conversations/:conversationId/read` | Mark conversation as read. |

### Example: List conversations

```http
GET /api/v1/admin/whatsapp-chat/conversations?page=1&limit=20
Authorization: Bearer <admin_token>
```

Response:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "...",
        "phone": "919876543210",
        "displayName": "John",
        "lastMessageAt": "2025-03-06T...",
        "lastMessagePreview": "Hello",
        "lastMessageFromUs": false,
        "unreadCount": 1,
        "createdAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNextPage": false
    }
  }
}
```

### Example: Send message

```http
POST /api/v1/admin/whatsapp-chat/conversations/<conversationId>/send
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "text": "Hi, how can we help?" }
```

---

## 6. Flow Summary

1. **User sends a message** to your WhatsApp Business number → Meta sends a webhook POST → backend stores it and creates/updates the conversation.
2. **Admin** opens the chat section in the panel → frontend calls `GET /conversations` and then `GET /conversations/:id/messages` → messages are shown.
3. **Admin** sends a reply → frontend calls `POST /conversations/:id/send` with `{ "text": "..." }` → backend calls Meta Cloud API to send the message and stores it as an outgoing message.

Conversations appear **only after at least one incoming message** from that phone number. To initiate a chat to a new number you must use an approved **template message** (Meta policy); free-form text is allowed within the 24-hour session after the user has messaged.

---

## 7. Related Code

| Item | Location |
|------|----------|
| Config | `config/env.ts` → `whatsappCloud` (env fallback) |
| Settings | `models/settings.model.ts` → `notifications.whatsapp`; `services/common/settings.service.ts` → `getWhatsAppCloudConfig()` |
| Models | `models/whatsappConversation.model.ts`, `models/whatsappMessage.model.ts` |
| Meta API + webhook parsing | `services/common/metaWhatsApp.service.ts` |
| Webhook controller | `controllers/webhook.controller.ts` → `handleWhatsAppWebhookVerify`, `handleWhatsAppWebhook` |
| Webhook routes | `routes/webhook.routes.ts` → GET/POST `/webhook/whatsapp` |
| Admin chat service | `services/admin/whatsappChat.service.ts` |
| Admin chat controller | `controllers/admin/whatsappChat.controller.ts` |
| Admin chat routes | `routes/admin/whatsappChat.routes.ts` → mounted at `/admin/whatsapp-chat` |
