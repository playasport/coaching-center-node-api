# Notification System Documentation

## Overview

The notification system provides a comprehensive solution for sending and managing notifications across multiple channels (SMS, Email, WhatsApp, and Push notifications) to both users and academies. All notifications are persisted in the database for tracking and management purposes.

## Features

- **Multi-channel Support**: Send notifications through SMS, Email, WhatsApp, and Push notifications
- **Database Persistence**: All notifications are saved in the database for tracking and history
- **Read/Unread Tracking**: Track notification read status with timestamps
- **Pagination**: Efficient listing of notifications with pagination support
- **Admin Panel Integration**: Send notifications from admin panel to users and academies
- **Test Endpoint**: Test notification channels to verify configuration
- **Priority Levels**: Support for high, medium, and low priority notifications
- **Rich Data Support**: Include additional data and metadata with notifications

## Architecture

### Components

1. **Notification Model** (`src/models/notification.model.ts`)
   - Stores notification data in MongoDB
   - Tracks recipient type (user/academy), read status, sent status, and channels

2. **Notification Service** (`src/services/common/notification.service.ts`)
   - Handles notification creation, sending, and management
   - Integrates with notification queue service for multi-channel delivery

3. **Notification Queue Service** (`src/services/common/notificationQueue.service.ts`)
   - Manages priority-based queue for notification delivery
   - Handles retry logic and channel enablement

4. **Controllers**
   - Admin Controller: Send notifications from admin panel
   - User Controller: Manage user notifications
   - Academy Controller: Manage academy notifications

## API Endpoints

### Admin Endpoints

#### Send Notification
```
POST /api/v1/admin/notifications/send
```

Send a notification to a user or academy through multiple channels.

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "recipientType": "user",  // Required: "user" or "academy"
  "recipientId": "user-uuid-here",  // Required: User ID or Academy ID (custom string ID)
  "title": "New Booking Confirmed",  // Required: Max 200 characters
  "body": "Your booking for Cricket Batch has been confirmed.",  // Required: Max 1000 characters
  "channels": ["push", "email"],  // Optional: ["sms", "email", "whatsapp", "push"], defaults to ["push"]
  "priority": "medium",  // Optional: "high", "medium", or "low", defaults to "medium"
  "data": {  // Optional: Additional data for push notifications (values can be any type)
    "bookingId": "BK-2024-0001",
    "type": "booking",
    "batchId": "batch-uuid-123",
    "amount": 5000
  },
  "imageUrl": "https://bucket.s3.region.amazonaws.com/notifications/image.png",  // Optional: Image URL for push notifications (can be null)
  "metadata": {  // Optional: Additional metadata (source and adminId are auto-populated)
    "customField": "custom-value"  // Any additional metadata fields
  }
}
```

**Minimal Request Body** (using defaults):
```json
{
  "recipientType": "user",
  "recipientId": "user-uuid-here",
  "title": "New Booking Confirmed",
  "body": "Your booking for Cricket Batch has been confirmed."
}
```

**Note**: The `metadata` field is automatically populated with:
- `source: "admin_panel"` - Automatically set
- `adminId: "<admin-user-id>"` - Automatically set from authenticated admin user

You can provide additional metadata fields in the request, which will be merged with the auto-populated ones.

**Response**:
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "recipientType": "user",
    "recipientId": "507f1f77bcf86cd799439011",
    "title": "New Booking Confirmed",
    "body": "Your booking for Cricket Batch has been confirmed.",
    "channels": ["push", "email"],
    "priority": "medium",
    "data": {
      "bookingId": "BK-2024-0001",
      "type": "booking",
      "batchId": "batch-uuid-123",
      "amount": 5000
    },
    "imageUrl": "https://bucket.s3.region.amazonaws.com/notifications/image.png",
    "isRead": false,
    "readAt": null,
    "sent": true,
    "sentAt": "2024-01-15T10:00:00.000Z",
    "error": null,
    "metadata": {
      "source": "admin_panel",
      "adminId": "admin-uuid-123"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### Test Notification
```
POST /api/v1/admin/notifications/test
```

Send a test notification to verify notification channels are working.

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "recipientType": "user",  // Required: "user" or "academy"
  "recipientId": "user-uuid-here",  // Required: User ID or Academy ID (custom string ID)
  "channels": ["push", "email"]  // Optional: ["sms", "email", "whatsapp", "push"], defaults to ["push"]
}
```

**Response**: Same as Send Notification endpoint (returns a test notification with title "Test Notification" and body "This is a test notification sent from the admin panel.")

### User Endpoints

#### Get Notifications
```
GET /api/v1/user/notifications?page=1&limit=10&isRead=false
```

Get paginated list of notifications for the authenticated user.

**Authentication**: Required (User role)

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of records per page (default: 10, max: 100)
- `isRead` (optional): Filter by read status (true/false)

**Response**:
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "recipientType": "user",
        "recipientId": "507f1f77bcf86cd799439011",
        "title": "New Booking Confirmed",
        "body": "Your booking for Cricket Batch has been confirmed.",
        "channels": ["push", "email"],
        "priority": "medium",
        "data": {
          "bookingId": "BK-2024-0001",
          "type": "booking"
        },
        "imageUrl": "https://bucket.s3.region.amazonaws.com/notifications/image.png",
        "isRead": false,
        "readAt": null,
        "sent": true,
        "sentAt": "2024-01-15T10:00:00.000Z",
        "error": null,
        "metadata": {
          "source": "admin_panel"
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "unreadCount": 15
  }
}
```

#### Get Unread Count
```
GET /api/v1/user/notifications/unread-count
```

Get count of unread notifications for the authenticated user.

**Authentication**: Required (User role)

**Response**:
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 15
  }
}
```

#### Mark Notification as Read
```
PATCH /api/v1/user/notifications/:id/read
```

Mark a specific notification as read.

**Authentication**: Required (User role)

**Response**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "recipientType": "user",
    "recipientId": "507f1f77bcf86cd799439011",
    "title": "New Booking Confirmed",
    "body": "Your booking for Cricket Batch has been confirmed.",
    "channels": ["push", "email"],
    "priority": "medium",
    "data": {
      "bookingId": "BK-2024-0001",
      "type": "booking"
    },
    "imageUrl": "https://bucket.s3.region.amazonaws.com/notifications/image.png",
    "isRead": true,
    "readAt": "2024-01-15T10:30:00.000Z",
    "sent": true,
    "sentAt": "2024-01-15T10:00:00.000Z",
    "error": null,
    "metadata": {
      "source": "admin_panel"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Mark Notification as Unread
```
PATCH /api/v1/user/notifications/:id/unread
```

Mark a specific notification as unread.

**Authentication**: Required (User role)

#### Mark All Notifications as Read
```
PATCH /api/v1/user/notifications/read-all
```

Mark all notifications as read for the authenticated user.

**Authentication**: Required (User role)

**Response**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "count": 15
  }
}
```

#### Delete Notification
```
DELETE /api/v1/user/notifications/:id
```

Delete a specific notification.

**Authentication**: Required (User role)

**Response**:
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": null
}
```

### Academy Endpoints

All academy endpoints follow the same pattern as user endpoints, but are prefixed with `/api/v1/academy/notifications` instead of `/api/v1/user/notifications`.

- `GET /api/v1/academy/notifications` - Get notifications
- `GET /api/v1/academy/notifications/unread-count` - Get unread count
- `PATCH /api/v1/academy/notifications/:id/read` - Mark as read
- `PATCH /api/v1/academy/notifications/:id/unread` - Mark as unread
- `PATCH /api/v1/academy/notifications/read-all` - Mark all as read
- `DELETE /api/v1/academy/notifications/:id` - Delete notification

## Notification Channels

### Push Notifications
- Uses Firebase Cloud Messaging (FCM)
- Requires device tokens to be registered
- Supports rich notifications with images and data payloads

### Email
- Uses configured email service (SMTP)
- Supports HTML and plain text formats
- Can use email templates

### SMS
- Uses Twilio service
- Requires Twilio credentials to be configured
- Supports international phone numbers

### WhatsApp
- Uses Twilio WhatsApp API
- Requires Twilio WhatsApp-enabled account
- Same configuration as SMS

## Configuration

### Environment Variables

The notification system uses the following environment variables (configured in `src/config/env.ts`):

```env
# Notification Service
NOTIFICATION_ENABLED=true
NOTIFICATION_MAX_RETRIES=3

# SMS (Twilio)
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# Email
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password

# WhatsApp (uses Twilio)
WHATSAPP_ENABLED=true

# Push Notifications (Firebase)
PUSH_NOTIFICATION_ENABLED=true
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## Database Schema

### Notification Model

```typescript
{
  id: string;                    // UUID
  recipientType: 'user' | 'academy';
  recipientId: ObjectId;         // Reference to User
  title: string;
  body: string;
  channels: NotificationChannel[]; // ['sms', 'email', 'whatsapp', 'push']
  priority: 'high' | 'medium' | 'low';
  data?: Record<string, unknown>; // Additional data for push
  imageUrl?: string;             // Image URL for push
  isRead: boolean;
  readAt?: Date;
  sent: boolean;
  sentAt?: Date;
  error?: string;                // Error message if sending failed
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes

The notification model includes the following indexes for efficient querying:

- `{ recipientType: 1, recipientId: 1, isRead: 1 }` - Compound index for filtering
- `{ recipientType: 1, recipientId: 1, createdAt: -1 }` - For sorted listings
- `{ recipientType: 1, recipientId: 1, sent: 1 }` - For sent status queries
- `{ createdAt: -1 }` - For general sorting

## Usage Examples

### Sending a Notification from Admin Panel

```typescript
// Example: Send booking confirmation notification
POST /api/v1/admin/notifications/send
{
  "recipientType": "user",
  "recipientId": "user-uuid-123",
  "title": "Booking Confirmed",
  "body": "Your booking for Cricket Batch - Morning Session has been confirmed.",
  "channels": ["push", "email", "sms"],  // Optional, defaults to ["push"]
  "priority": "high",  // Optional, defaults to "medium"
  "data": {  // Optional: Can contain any type of values
    "bookingId": "BK-2024-0001",
    "batchId": "batch-uuid-123",
    "type": "booking_confirmation",
    "amount": 5000,
    "date": "2024-01-20"
  },
  "imageUrl": "https://example.com/booking-confirmed.jpg",  // Optional, can be null
  "metadata": {  // Optional: Additional metadata (source and adminId are auto-populated)
    "customField": "custom-value"  // Any additional metadata fields you want to add
  }
}

// Minimal example (using defaults)
POST /api/v1/admin/notifications/send
{
  "recipientType": "user",
  "recipientId": "user-uuid-123",
  "title": "Booking Confirmed",
  "body": "Your booking has been confirmed."
}
```

### Testing Notification Channels

```typescript
// Test all channels
POST /api/v1/admin/notifications/test
{
  "recipientType": "user",  // Required
  "recipientId": "user-uuid-123",  // Required
  "channels": ["push", "email", "sms", "whatsapp"]  // Optional, defaults to ["push"]
}

// Minimal test (uses default channel)
POST /api/v1/admin/notifications/test
{
  "recipientType": "user",
  "recipientId": "user-uuid-123"
}
```

### Getting User Notifications

```typescript
// Get unread notifications
GET /api/v1/user/notifications?page=1&limit=20&isRead=false

// Get all notifications
GET /api/v1/user/notifications?page=1&limit=20

// Get read notifications
GET /api/v1/user/notifications?page=1&limit=20&isRead=true
```

## Error Handling

The notification system handles errors gracefully:

- **Recipient Not Found**: Returns 404 error if recipient doesn't exist
- **Channel Disabled**: Notification is still saved but marked with error
- **Sending Failure**: Notification is saved with error message, can be retried
- **Invalid Input**: Returns 400 validation error

## Best Practices

1. **Use Appropriate Channels**: Not all notifications need all channels. Use push for real-time, email for important updates, SMS for critical alerts.

2. **Set Priority Correctly**: Use high priority for urgent notifications, medium for normal, low for informational.

3. **Include Rich Data**: For push notifications, include relevant data in the `data` field for deep linking and context.

4. **Test Before Production**: Always use the test endpoint to verify channels are working before sending to real users.

5. **Monitor Unread Counts**: Use the unread count endpoint to show badges in your UI.

6. **Clean Up Old Notifications**: Consider implementing a cleanup job for old notifications to maintain database performance.

## Integration with Frontend

### Push Notification Setup

1. Register device token when user logs in:
   ```
   POST /api/v1/user/auth/verify-otp
   {
     "mobile": "9876543210",
     "otp": "123456",
     "fcmToken": "firebase-token-here",
     "deviceType": "android"
   }
   ```

2. Listen for push notifications in your app
3. Mark notifications as read when user views them
4. Show unread count badge in UI

### Notification List UI

```typescript
// Fetch notifications
const response = await fetch('/api/v1/user/notifications?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { notifications, pagination, unreadCount } = response.data;

// Mark as read when user views
await fetch(`/api/v1/user/notifications/${notificationId}/read`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Troubleshooting

### Notifications Not Sending

1. Check channel enablement in environment variables
2. Verify credentials (Twilio, SMTP, Firebase) are correct
3. Check notification queue status
4. Review error messages in notification records

### Push Notifications Not Working

1. Verify FCM tokens are registered
2. Check Firebase configuration
3. Ensure device tokens are active
4. Test with test notification endpoint

### Email Not Sending

1. Verify SMTP credentials
2. Check email service logs
3. Ensure email templates exist (if using templates)
4. Verify recipient email is valid

## API Documentation

Full API documentation is available in Swagger UI at:
- Development: `http://localhost:3000/api-docs`
- Production: `https://your-domain.com/api-docs`

## Support

For issues or questions:
1. Check the Swagger documentation
2. Review error messages in notification records
3. Test with the test notification endpoint
4. Check server logs for detailed error information

