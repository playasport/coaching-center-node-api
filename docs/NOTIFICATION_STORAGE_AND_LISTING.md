# Notification Storage and Listing System

## Overview

The notification system has two types of notifications:
1. **Stored Notifications** - Saved in the database via `createAndSendNotification()` - These appear in notification listings
2. **Direct Channel Notifications** - Sent via `queueSms()`, `queueEmail()`, `queueWhatsApp()` - These are NOT stored in the database

## Notification Model Structure

The `Notification` model stores:
- `id` - Unique notification ID (UUID)
- `recipientType` - 'user', 'academy', or 'role'
- `recipientId` - ObjectId reference to User or CoachingCenter
- `roles` - Array of role names (for role-based notifications)
- `title` - Notification title
- `body` - Notification message body
- `channels` - Array of channels: ['sms', 'email', 'whatsapp', 'push']
- `priority` - 'high', 'medium', or 'low'
- `data` - Additional data for push notifications (e.g., bookingId, batchId)
- `imageUrl` - Optional image URL
- `isRead` - Read status
- `readAt` - Timestamp when read
- `sent` - Whether notification was sent
- `sentAt` - Timestamp when sent
- `error` - Error message if sending failed
- `metadata` - Additional metadata
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## When Notifications Are Stored

Notifications are stored in the database **ONLY** when `createAndSendNotification()` is called. This function:
1. Creates a notification record in the database
2. Sends notifications through the specified channels (push, SMS, email, WhatsApp)
3. Marks the notification as sent after queuing

## Booking Flow - Stored Notifications

### 1. Book Slot (Booking Request Created)

**Stored Notifications:**
- ✅ **Academy Owner** - Push notification
  - Title: "New Booking Request"
  - Body: "You have a new booking request for batch "{batchName}" from {userName}. Participants: {participantNames}."
  - Type: `booking_request`
  - Channels: `['push']`
  - Priority: `high`
  - Data: `{ type: 'booking_request', bookingId, batchId, centerId }`

- ✅ **User** - Push notification
  - Title: "Booking Request Sent"
  - Body: "Your booking request for "{batchName}" has been sent to the academy. You will be notified once the academy responds."
  - Type: `booking_request_sent`
  - Channels: `['push']`
  - Priority: `medium`
  - Data: `{ type: 'booking_request_sent', bookingId, batchId }`

- ✅ **Admin** - Role-based push notification
  - Title: "New Booking Request"
  - Body: "New booking request created: {userName} requested booking for "{batchName}" at "{centerName}"."
  - Type: `booking_request_admin`
  - Channels: `['push']`
  - Priority: `medium`
  - RecipientType: `role`
  - Roles: `['admin', 'super_admin']`
  - Data: `{ type: 'booking_request_admin', bookingId, batchId, centerId }`

**Direct Channel Notifications (NOT stored):**
- ❌ Academy Owner - Email (via `queueEmail`)
- ❌ Academy Owner - SMS (via `queueSms`)
- ❌ Academy Owner - WhatsApp (via `queueWhatsApp`)
- ❌ User - Email (via `queueEmail`)
- ❌ User - SMS (via `queueSms`)
- ❌ User - WhatsApp (via `queueWhatsApp`)

### 2. Booking Approved (Academy Action)

**Stored Notifications:**
- ✅ **User** - Push notification
  - Title: "Booking Approved"
  - Body: "Your booking request for "{batchName}" has been approved. Please proceed with payment."
  - Type: `booking_approved`
  - Channels: `['push']`
  - Priority: `high`
  - Data: `{ type: 'booking_approved', bookingId, batchId }`

**Direct Channel Notifications (NOT stored):**
- ❌ User - Email (via `queueEmail`)
- ❌ User - SMS (via `queueSms`)
- ❌ User - WhatsApp (via `queueWhatsApp`)

### 3. Booking Rejected (Academy Action)

**Stored Notifications:**
- ✅ **User** - Push notification
  - Title: "Booking Request Rejected"
  - Body: "Your booking request for "{batchName}" has been rejected.{reason}"
  - Type: `booking_rejected`
  - Channels: `['push']`
  - Priority: `medium`
  - Data: `{ type: 'booking_rejected', bookingId, batchId, reason }`

**Direct Channel Notifications (NOT stored):**
- ❌ User - Email (via `queueEmail`)
- ❌ User - SMS (via `queueSms`)
- ❌ User - WhatsApp (via `queueWhatsApp`)

### 4. Payment Verified (After Payment Success)

**Stored Notifications:**
- ✅ **User** - Push notification
  - Title: "Booking Confirmed"
  - Body: "Your booking {bookingId} for {batchName} ({sportName}) at {centerName} has been confirmed. Participants: {participants}. Start Date: {startDate}, Time: {startTime}-{endTime}. Amount Paid: {currency} {amount}."
  - Type: `payment_verified`
  - Channels: `['push']`
  - Priority: `high`
  - Data: `{ type: 'payment_verified', bookingId, batchId, centerId }`

- ✅ **Academy Owner** - Push notification
  - Title: "New Booking Confirmed"
  - Body: "New booking {bookingId} received for {batchName} ({sportName}). Customer: {userName}. Participants: {participants}. Start Date: {startDate}, Time: {startTime}-{endTime}. Amount: {currency} {amount}."
  - Type: `payment_verified_academy`
  - Channels: `['push']`
  - Priority: `high`
  - Data: `{ type: 'payment_verified_academy', bookingId, batchId, centerId }`

- ✅ **Admin** - Role-based push notification
  - Title: "Booking Confirmed"
  - Body: "Booking {bookingId} has been confirmed. Customer: {userName}, Batch: {batchName}, Amount: {currency} {amount}."
  - Type: `payment_verified_admin`
  - Channels: `['push']`
  - Priority: `medium`
  - RecipientType: `role`
  - Roles: `['admin', 'super_admin']`
  - Data: `{ type: 'payment_verified_admin', bookingId, batchId, centerId }`

**Direct Channel Notifications (NOT stored):**
- ❌ User - Email (via `queueEmail`)
- ❌ User - SMS (via `queueSms`)
- ❌ Academy Owner - Email (via `queueEmail`)
- ❌ Academy Owner - SMS (via `queueSms`)
- ❌ Admin - Email (via `queueEmail`)

### 5. Booking Cancelled

**Stored Notifications:**
- ✅ **User** - Push notification
  - Title: "Booking Cancelled"
  - Body: "Your booking for "{batchName}" has been cancelled.{reason}"
  - Type: `booking_cancelled`
  - Channels: `['push']`
  - Priority: `medium`
  - Data: `{ type: 'booking_cancelled', bookingId, batchId, reason }`

- ✅ **Academy Owner** - Push notification
  - Title: "Booking Cancelled"
  - Body: "Booking {bookingId} for batch "{batchName}" has been cancelled by {userName}.{reason}"
  - Type: `booking_cancelled_academy`
  - Channels: `['push']`
  - Priority: `medium`
  - Data: `{ type: 'booking_cancelled_academy', bookingId, batchId, reason }`

**Direct Channel Notifications (NOT stored):**
- ❌ User - Email (via `queueEmail`)
- ❌ User - SMS (via `queueSms`)
- ❌ User - WhatsApp (via `queueWhatsApp`)
- ❌ Academy Owner - Email (via `queueEmail`)
- ❌ Academy Owner - SMS (via `queueSms`)
- ❌ Academy Owner - WhatsApp (via `queueWhatsApp`)
- ❌ Admin - Email (via `queueEmail`)

## Notification Listing

### User Notifications
Users can see notifications where:
- `recipientType === 'user'` AND `recipientId === userObjectId`
- OR `recipientType === 'role'` AND user's roles match notification's `roles` array

**API Endpoints:**
- `GET /api/v1/user/notifications` - Get paginated list of notifications
- `GET /api/v1/user/notifications/unread-count` - Get unread notification count
- `PATCH /api/v1/user/notifications/:id/read` - Mark notification as read
- `PATCH /api/v1/user/notifications/:id/unread` - Mark notification as unread
- `PATCH /api/v1/user/notifications/read-all` - Mark all notifications as read
- `DELETE /api/v1/user/notifications/:id` - Delete notification

### Academy Notifications
Academy owners can see notifications where:
- `recipientType === 'academy'` AND `recipientId === academyOwnerUserObjectId`
- OR `recipientType === 'role'` AND academy owner's roles match notification's `roles` array

**API Endpoints:**
- `GET /api/v1/academy/notifications` - Get paginated list of notifications
- `GET /api/v1/academy/notifications/unread-count` - Get unread notification count
- `PATCH /api/v1/academy/notifications/:id/read` - Mark notification as read
- `PATCH /api/v1/academy/notifications/:id/unread` - Mark notification as unread
- `PATCH /api/v1/academy/notifications/read-all` - Mark all notifications as read
- `DELETE /api/v1/academy/notifications/:id` - Delete notification

### Admin Notifications
Admins can see notifications where:
- `recipientType === 'role'` AND admin's roles match notification's `roles` array
- OR `recipientType === 'user'` AND `recipientId === adminUserObjectId` (for user-based notifications)

**API Endpoints:**
- `GET /api/v1/admin/notifications` - Get all notifications (requires notification:view permission) - Shows all notifications in the system with filters
- `GET /api/v1/admin/notifications/my` - Get admin's own notifications (role-based and user-based)
- `GET /api/v1/admin/notifications/unread-count` - Get unread notification count for admin
- `PATCH /api/v1/admin/notifications/:id/read` - Mark notification as read

## API Response Format

**Important:** The following fields are **NOT** included in API responses for user, academy, and admin notification listing endpoints:
- `roles` - Removed from response (internal field for role-based notifications)
- `priority` - Removed from response (internal field for notification priority)
- `channels` - Removed from response (internal field for delivery channels)

**Response fields included:**
- `id` - Notification ID
- `recipientType` - 'user', 'academy', or 'role'
- `title` - Notification title
- `body` - Notification message body
- `data` - Additional data for push notifications
- `imageUrl` - Optional image URL
- `isRead` - Read status
- `readAt` - Timestamp when read
- `sent` - Whether notification was sent
- `sentAt` - Timestamp when sent
- `error` - Error message if sending failed
- `metadata` - Additional metadata
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Summary

### Notifications Stored in Database (Appear in Listings):
1. ✅ Booking Request Created (User, Academy Owner, Admin)
2. ✅ Booking Approved (User)
3. ✅ Booking Rejected (User)
4. ✅ Payment Verified (User, Academy Owner, Admin)
5. ✅ Booking Cancelled (User, Academy Owner)

### Notifications NOT Stored (Only Sent):
- All Email notifications (via `queueEmail`)
- All SMS notifications (via `queueSms`)
- All WhatsApp notifications (via `queueWhatsApp`)

**Note:** These direct channel notifications are sent for immediate delivery but are not persisted in the database for listing purposes. Only push notifications created via `createAndSendNotification()` are stored and appear in notification listings.

## Key Functions

### `createAndSendNotification()`
- **Purpose:** Creates notification in database AND sends via specified channels
- **Stores:** ✅ Yes (always creates a database record)
- **Channels:** Can include push, SMS, email, WhatsApp
- **Used for:** Notifications that should appear in notification listings

### `queueSms()`, `queueEmail()`, `queueWhatsApp()`
- **Purpose:** Only sends notifications via specific channels
- **Stores:** ❌ No (does not create database records)
- **Used for:** Direct channel notifications that don't need to appear in listings

## Pattern

The current implementation follows this pattern:
- **Push notifications** = Stored in DB (appear in listings)
- **Email/SMS/WhatsApp** = Not stored (direct delivery only)

This allows users to see important notifications in their app dashboard while also receiving immediate alerts via email/SMS/WhatsApp.
