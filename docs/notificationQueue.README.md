# Multichannel Notification Queue Service

A unified notification service that supports multiple channels (SMS, Email, WhatsApp, Firebase Push Notifications) with priority-based queue processing.

## Features

- **Multi-channel support**: SMS, Email, WhatsApp, and Firebase Push Notifications
- **Priority-based queue**: High, Medium, and Low priority levels
- **Automatic retry**: Configurable retry mechanism for failed notifications
- **Channel enablement**: Per-channel enable/disable configuration
- **Unified API**: Single interface for all notification channels

## Configuration

Add these environment variables to your `.env` file:

```env
# Notification Service
NOTIFICATION_ENABLED=true
NOTIFICATION_MAX_RETRIES=3

# WhatsApp (uses Twilio)
WHATSAPP_ENABLED=true

# Push Notifications (Firebase)
PUSH_NOTIFICATION_ENABLED=true
```

## Usage Examples

### SMS Notification

```typescript
import { queueSms } from './services/notificationQueue.service';

// Send SMS with default priority (medium)
queueSms('+1234567890', 'Your OTP is 123456', 'high');

// With metadata
queueSms('+1234567890', 'Your OTP is 123456', 'high', { type: 'otp', userId: '123' });
```

### Email Notification

```typescript
import { queueEmail } from './services/notificationQueue.service';

// Simple email
queueEmail('user@example.com', 'Welcome!', {
  html: '<h1>Welcome to our platform</h1>',
  priority: 'high'
});

// Using template
queueEmail('user@example.com', 'Password Reset', {
  template: 'password-reset.html',
  templateVariables: { name: 'John', otp: '123456' },
  priority: 'high'
});
```

### WhatsApp Notification

```typescript
import { queueWhatsApp } from './services/notificationQueue.service';

queueWhatsApp('+1234567890', 'Your booking is confirmed!', 'high');
```

### Push Notification

```typescript
import { queuePush } from './services/notificationQueue.service';

// Send to all user's devices
queuePush('userId123', 'New Message', 'You have a new message', {
  data: { type: 'message', messageId: 'msg123' },
  priority: 'high'
});

// Send to specific FCM token
queuePush('userId123', 'New Message', 'You have a new message', {
  fcmToken: 'specific-fcm-token',
  data: { type: 'message' },
  priority: 'high'
});
```

### Multi-Channel Notification

Send the same notification through multiple channels:

```typescript
import { queueMultiChannel } from './services/notificationQueue.service';

queueMultiChannel(
  ['sms', 'email', 'push'],
  {
    sms: { to: '+1234567890', body: 'Your OTP is 123456' },
    email: {
      to: 'user@example.com',
      subject: 'Your OTP',
      html: '<p>Your OTP is 123456</p>'
    },
    push: {
      userId: 'userId123',
      title: 'OTP',
      body: 'Your OTP is 123456'
    }
  },
  'high',
  { type: 'otp', userId: '123' }
);
```

### Advanced: Direct Queue Notification

For more control, use the `queueNotification` function directly:

```typescript
import { queueNotification } from './services/notificationQueue.service';
import type { Notification } from './types/notification.types';

const notification: Notification = {
  channel: 'sms',
  to: '+1234567890',
  body: 'Your OTP is 123456',
  priority: 'high',
  metadata: { type: 'otp' },
  maxRetries: 5 // Override default max retries
};

queueNotification(notification);
```

## Queue Status

Check the current queue status:

```typescript
import { getQueueStatus } from './services/notificationQueue.service';

const status = getQueueStatus();
console.log(status);
// {
//   total: 10,
//   high: 3,
//   medium: 5,
//   low: 2,
//   isProcessing: true
// }
```

## Priority Levels

- **high**: Processed first, retried on failure
- **medium**: Processed after high priority items
- **low**: Processed last

## Retry Mechanism

- Default max retries: 3
- Configurable per notification via `maxRetries`
- Only retries if `retryable: true` in the result
- High priority notifications are more likely to be retried

## Migration from Old SMS Service

If you're using the old `sms.service.ts`, you can migrate like this:

**Old way:**
```typescript
import { sendSms } from './services/sms.service';
sendSms('+1234567890', 'Hello', 'high');
```

**New way:**
```typescript
import { queueSms } from './services/notificationQueue.service';
queueSms('+1234567890', 'Hello', 'high');
```

The new service maintains the same priority-based queue behavior but adds support for multiple channels.

## Error Handling

The service automatically handles:
- Invalid tokens (FCM push notifications)
- Unsubscribed numbers (SMS/WhatsApp)
- Network errors
- Service unavailability

Failed notifications are logged and retried based on their priority and retry configuration.
