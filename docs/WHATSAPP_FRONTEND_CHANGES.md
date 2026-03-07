# WhatsApp Chat – Frontend Changes (Admin Panel)

Backend ab WhatsApp messages ke liye **message status**, **media URLs**, **reactions** aur **button clicks** store karta hai. Admin panel (Next.js) mein in changes ko support karne ke liye yeh updates karein.

---

## 1. Message type (TypeScript)

**Pehle:** `text | image | audio | video | document | unknown`  
**Ab:** iske saath `reaction` aur `interactive` add karein.

```ts
type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'reaction'    // new
  | 'interactive' // new
  | 'unknown';
```

---

## 2. Message interface (API response)

Backend se aane wale message object mein yeh fields ho sakti hain:

```ts
interface WhatsAppMessage {
  _id: string;
  conversation: string;
  direction: 'in' | 'out';
  type: WhatsAppMessageType;
  content: string;
  waMessageId: string;
  waTimestamp: number;
  fromAdmin: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional – ab use ho rahe hain
  status?: 'sent' | 'delivered' | 'read' | 'failed' | null;  // sirf outbound
  mediaUrl?: string | null;
  repliedToWaMessageId?: string | null;  // reactions ke liye
  rawPayload?: {
    media_id?: string;
    button_reply_id?: string;
    list_reply_id?: string;
    reaction_message_id?: string;
    button_payload?: string;
  } | null;
}
```

Frontend types/interfaces mein `status`, `mediaUrl`, `repliedToWaMessageId`, `rawPayload` optional add karein.

---

## 3. UI changes

### 3.1 Naye message types dikhana

| Type | Kaise dikhayen |
|------|-----------------|
| **reaction** | Emoji (`content`) chhota bubble ya message ke upar. Optional: "Replied to message" link (agar `repliedToWaMessageId` use karna ho). |
| **interactive** | Button/list reply ka text (`content`) normal message ki tarah; label "Button reply" ya icon optional. |

**Example (reaction):**
```tsx
{msg.type === 'reaction' && (
  <span className="reaction" title={msg.repliedToWaMessageId ? 'Reaction to message' : ''}>
    {msg.content}
  </span>
)}
```

**Example (interactive):**
```tsx
{msg.type === 'interactive' && (
  <div className="interactive-reply">
    <span className="label">Button reply</span>
    <span>{msg.content}</span>
  </div>
)}
```

### 3.2 Media messages – URL use karna

- **Image / Video / Document / Audio** ke liye `mediaUrl` use karein.
- Agar `mediaUrl` **null** ya **expired** ho to fallback message dikhayen (e.g. "Media unavailable or expired").
- Meta ka media URL ~5 minute baad expire ho sakta hai.

**Example:**
```tsx
{['image', 'video', 'document', 'audio'].includes(msg.type) && (
  msg.mediaUrl ? (
    msg.type === 'image' && <img src={msg.mediaUrl} alt={msg.content} />
    // video: <video src={msg.mediaUrl} />
    // document/audio: <a href={msg.mediaUrl} download>Download</a>
  ) : (
    <span className="media-unavailable">{msg.content || 'Media unavailable or expired'}</span>
  )
)}
```

### 3.3 Outbound message – delivery status (ticks)

- Sirf **outbound** messages (`direction === 'out'`) pe `status` dikhayen.
- **sent** → single tick  
- **delivered** → double tick  
- **read** → double tick (blue)  
- **failed** → red / error icon

**Example:**
```tsx
{msg.direction === 'out' && (
  <span className="message-status" title={msg.status}>
    {msg.status === 'read' && <DoubleTickBlue />}
    {msg.status === 'delivered' && <DoubleTick />}
    {msg.status === 'sent' && <SingleTick />}
    {msg.status === 'failed' && <FailedIcon />}
  </span>
)}
```

### 3.4 Reaction – "replied to" link (optional)

- Agar thread view hai to `repliedToWaMessageId` se us message tak scroll/link kar sakte hain.
- Optional: "Replied to message" click pe `repliedToWaMessageId` wali message highlight karein.

---

## 4. Checklist

- [ ] `WhatsAppMessageType` mein `reaction` aur `interactive` add kiye
- [ ] Message interface mein `status`, `mediaUrl`, `repliedToWaMessageId`, `rawPayload` optional add kiye
- [ ] `type === 'reaction'` ke liye emoji + optional "replied to" UI
- [ ] `type === 'interactive'` ke liye button/list reply text
- [ ] Media messages pe `mediaUrl` use; null pe "Media unavailable or expired"
- [ ] Outbound messages pe `status` se ticks/status icon

---

## 5. Breaking change?

Nahi. Naye fields optional hain; purana UI bina in fields ke bhi chal sakta hai. Naye behaviour ke liye upar wale points implement karein.

---

## 6. Messages API – mediaUrl in response

GET `/admin/whatsapp-chat/conversations/:id/messages` ab har message ke saath **mediaUrl** aur **repliedToWaMessageId** bhi return karta hai (jab ho).

- **mediaUrl** – Image/video/document/audio ke liye **hamare S3 ka public URL** (incoming media webhook pe download karke S3 pe upload hota hai). Frontend is URL ko directly use karke media dikhaye. Null ho to "Media unavailable" (e.g. S3 not configured ya download fail).
- **repliedToWaMessageId** – Reactions ke liye; kis message pe reaction hai.

---

## 7. Send message – text + image

POST `/admin/whatsapp-chat/conversations/:conversationId/send` ab **text** ya **image** dono support karta hai.

- **Text:** `{ "text": "Hello" }`
- **Image:** `{ "type": "image", "imageUrl": "https://example.com/photo.jpg", "caption": "Optional" }`  
  imageUrl = public HTTPS URL; caption optional, max 1024 chars.

