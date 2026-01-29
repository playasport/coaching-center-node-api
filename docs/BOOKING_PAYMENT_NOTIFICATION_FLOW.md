# Booking and Payment Notification Flow

This document describes all notifications sent during the booking and payment flow, including when they are sent, which channels are used, and who receives them.

## Overview

The notification system uses multiple channels:
- **Push Notifications**: Real-time in-app notifications
- **Email**: HTML email templates with booking details
- **SMS**: Text messages with booking information
- **WhatsApp**: Formatted messages via WhatsApp (uses Twilio/SMS provider)

## Notification Flow Diagram

```
User Books Slot
    ↓
┌─────────────────────────────────────┐
│ 1. BOOKING REQUEST CREATED          │
│    - Academy Owner: Push + Email + SMS + WhatsApp │
│    - User: Push + Email + SMS + WhatsApp │
│    - Admin: Push (role-based)       │
└─────────────────────────────────────┘
    ↓
Academy Reviews
    ↓
┌─────────────────────────────────────┐
│ 2a. BOOKING APPROVED                │
│    - User: Push + Email + SMS + WhatsApp │
└─────────────────────────────────────┘
    OR
┌─────────────────────────────────────┐
│ 2b. BOOKING REJECTED                │
│    - User: Push + Email + SMS + WhatsApp │
└─────────────────────────────────────┘
    ↓
User Creates Payment Order (if approved)
    ↓
User Completes Payment & Verifies
    ↓
┌─────────────────────────────────────┐
│ 3. PAYMENT VERIFIED                 │
│    - User: Email + SMS              │
│    - Academy: Email + SMS           │
│    - Admin: Email                   │
└─────────────────────────────────────┘
    ↓
User Cancels Booking (if not paid)
    ↓
┌─────────────────────────────────────┐
│ 4. BOOKING CANCELLED                │
│    - User: Push + Email + SMS + WhatsApp │
│    - Academy: Push + Email + SMS + WhatsApp │
│    - Admin: Email                   │
└─────────────────────────────────────┘
```

## Detailed Notification Breakdown

### 1. Booking Request Created (`bookSlot`)

**Trigger**: User books a slot (creates booking with `SLOT_BOOKED` status)

**Function**: `src/services/client/booking.service.ts::bookSlot()`

#### 1.1. Notification to Academy Owner

- **Recipient**: Academy owner (user who owns the coaching center)
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: High
- **Title**: "New Booking Request"
- **Body**: `You have a new booking request for batch "{batchName}" from {userName}. Participants: {participantNames}.`
- **Push Data**:
  ```json
  {
    "type": "booking_request",
    "bookingId": "booking_id",
    "batchId": "batch_id",
    "centerId": "center_id"
  }
  ```
- **Email**: Template `booking-request-academy.html` with booking details
- **SMS**: `New booking request for batch "{batchName}" from {userName}. Participants: {participantNames}. Booking ID: {bookingId}. - PlayAsport`
- **WhatsApp**: Formatted message with booking details
- **When**: 
  - Push: Sent immediately (synchronous)
  - Email/SMS/WhatsApp: Sent asynchronously (queued)
- **Condition**: Only if academy owner exists and contact info available

#### 1.2. Notification to User

- **Recipient**: User who created the booking
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: Medium
- **Title**: "Booking Request Sent"
- **Body**: `Your booking request for "{batchName}" has been sent to the academy. You will be notified once the academy responds.`
- **Push Data**:
  ```json
  {
    "type": "booking_request_sent",
    "bookingId": "booking_id",
    "batchId": "batch_id"
  }
  ```
- **Email**: Template `booking-request-sent-user.html` with booking details
- **SMS**: `Your booking request for "{batchName}" at "{centerName}" has been sent. You will be notified once the academy responds. Booking ID: {bookingId}. - PlayAsport`
- **WhatsApp**: Formatted message with booking details
- **When**: 
  - Push: Sent immediately (synchronous)
  - Email/SMS/WhatsApp: Sent asynchronously (queued)
- **Condition**: Only if user contact info available

#### 1.3. Notification to Admin

- **Recipient**: All users with ADMIN or SUPER_ADMIN roles (role-based)
- **Channel**: Push notification only
- **Priority**: Medium
- **Title**: "New Booking Request"
- **Body**: `New booking request created: {userName} requested booking for "{batchName}" at "{centerName}".`
- **Data**:
  ```json
  {
    "type": "booking_request_admin",
    "bookingId": "booking_id",
    "batchId": "batch_id"
  }
  ```
- **When**: Sent immediately after booking is created
- **Note**: Role-based notifications are stored and available for admin users to fetch

---

### 2. Booking Approved (`approveBookingRequest`)

**Trigger**: Academy approves the booking request

**Function**: `src/services/academy/booking.service.ts::approveBookingRequest()`

#### 2.1. Notification to User

- **Recipient**: User who created the booking
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: High
- **Title**: "Booking Approved"
- **Body**: `Your booking request for "{batchName}" has been approved. Please proceed with payment.`
- **Push Data**:
  ```json
  {
    "type": "booking_approved",
    "bookingId": "booking_id",
    "batchId": "batch_id"
  }
  ```
- **Email**: Template `booking-approved-user.html` with booking details
- **SMS**: `Great news! Your booking request for "{batchName}" at "{centerName}" has been approved. Please proceed with payment. Booking ID: {bookingId}. - PlayAsport`
- **WhatsApp**: Formatted message with approval details
- **When**: 
  - Push: Sent immediately (synchronous)
  - Email/SMS/WhatsApp: Sent asynchronously (queued)
- **Condition**: Only if user exists and contact info available

---

### 3. Booking Rejected (`rejectBookingRequest`)

**Trigger**: Academy rejects the booking request

**Function**: `src/services/academy/booking.service.ts::rejectBookingRequest()`

#### 3.1. Notification to User

- **Recipient**: User who created the booking
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: Medium
- **Title**: "Booking Request Rejected"
- **Body**: `Your booking request for "{batchName}" has been rejected.{reason ? " Reason: {reason}" : ""}`
- **Push Data**:
  ```json
  {
    "type": "booking_rejected",
    "bookingId": "booking_id",
    "batchId": "batch_id",
    "reason": "rejection_reason_or_null"
  }
  ```
- **Email**: Template `booking-rejected-user.html` with rejection details
- **SMS**: `Your booking request for "{batchName}" at "{centerName}" has been rejected.{reason ? " Reason: {reason}" : ""} Booking ID: {bookingId}. - PlayAsport`
- **WhatsApp**: Formatted message with rejection details
- **When**: 
  - Push: Sent immediately (synchronous)
  - Email/SMS/WhatsApp: Sent asynchronously (queued)
- **Condition**: Only if user exists and contact info available

---

### 4. Payment Verified (`verifyPayment`)

**Trigger**: User completes payment and payment is verified successfully

**Function**: `src/services/client/booking.service.ts::verifyPayment()`

**Note**: All notifications are sent asynchronously (non-blocking) in the background after payment verification completes.

#### 4.1. Email to User

- **Recipient**: User's email address
- **Channel**: Email only
- **Priority**: High
- **Subject**: "Booking Confirmed - PlayAsport"
- **Template**: `booking-confirmation-user.html`
- **Template Variables**:
  ```json
  {
    "userName": "User Name",
    "bookingId": "booking_id",
    "batchName": "Batch Name",
    "sportName": "Sport Name",
    "centerName": "Center Name",
    "participants": "Participant Names",
    "startDate": "Formatted Date",
    "startTime": "Start Time",
    "endTime": "End Time",
    "trainingDays": "Days",
    "amount": "Amount",
    "currency": "INR",
    "paymentId": "razorpay_payment_id",
    "year": 2024
  }
  ```
- **When**: Sent asynchronously after payment verification
- **Condition**: Only if user email exists

#### 4.2. Email to Academy (Coaching Center)

- **Recipient**: Coaching center's email address
- **Channel**: Email only
- **Priority**: High
- **Subject**: "New Booking Received - PlayAsport"
- **Template**: `booking-confirmation-center.html`
- **Template Variables**: Same as user email + `userEmail`
- **When**: Sent asynchronously after payment verification
- **Condition**: Only if center email exists

#### 4.3. Email to Admin

- **Recipient**: Admin email (from config)
- **Channel**: Email only
- **Priority**: High
- **Subject**: "New Booking Notification - PlayAsport"
- **Template**: `booking-confirmation-admin.html`
- **Template Variables**: Same as user email + `userEmail`
- **When**: Sent asynchronously after payment verification
- **Condition**: Only if `config.admin.email` is configured

#### 4.4. SMS to User

- **Recipient**: User's mobile number
- **Channel**: SMS only
- **Priority**: High
- **Message**: `Dear {userName}, your booking {bookingId} for {batchName} ({sportName}) at {centerName} has been confirmed. Participants: {participantNames}. Start Date: {startDate}, Time: {startTime}-{endTime}. Amount Paid: {currency} {amount}. Thank you for choosing PlayAsport!`
- **When**: Sent asynchronously after payment verification
- **Condition**: Only if user mobile number exists
- **Metadata**:
  ```json
  {
    "type": "booking_confirmation",
    "bookingId": "booking_id",
    "recipient": "user"
  }
  ```

#### 4.5. SMS to Academy (Coaching Center)

- **Recipient**: Coaching center's mobile number
- **Channel**: SMS only
- **Priority**: High
- **Message**: `New booking {bookingId} received for {batchName} ({sportName}). Customer: {userName}. Participants: {participantNames}. Start Date: {startDate}, Time: {startTime}-{endTime}. Amount: {currency} {amount}. - PlayAsport`
- **When**: Sent asynchronously after payment verification
- **Condition**: Only if center mobile number exists
- **Metadata**:
  ```json
  {
    "type": "booking_confirmation",
    "bookingId": "booking_id",
    "recipient": "coaching_center"
  }
  ```

---

### 5. Create Payment Order (`createPaymentOrder`)

**Trigger**: User creates payment order after academy approval

**Function**: `src/services/client/booking.service.ts::createPaymentOrder()`

**Notifications**: None
- This function only creates the Razorpay payment order
- No notifications are sent at this stage
- User will receive notifications after payment verification

---

### 6. Cancel Booking (`cancelBooking`)

**Trigger**: User cancels a booking with reason

**Function**: `src/services/client/booking.service.ts::cancelBooking()`

**Note**: All notifications are sent asynchronously (non-blocking) in the background after cancellation completes.

#### 6.1. Notification to User

- **Recipient**: User who cancelled the booking
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: Medium
- **Title**: "Booking Cancelled"
- **Body**: `Your booking for "{batchName}" has been cancelled.{reason ? " Reason: {reason}" : ""}`
- **Push Data**:
  ```json
  {
    "type": "booking_cancelled",
    "bookingId": "booking_id",
    "batchId": "batch_id",
    "reason": "cancellation_reason_or_null"
  }
  ```
- **Email**: Template `booking-cancelled-user.html` with cancellation details
- **SMS**: `Your booking for "{batchName}" at "{centerName}" has been cancelled.{reason ? " Reason: {reason}" : ""} Booking ID: {bookingId}. - PlayAsport`
- **WhatsApp**: Formatted message with cancellation details
- **When**: Sent asynchronously after cancellation
- **Condition**: Only if user contact info available

#### 6.2. Notification to Academy Owner

- **Recipient**: Academy owner (user who owns the coaching center)
- **Channels**: Push + Email + SMS + WhatsApp
- **Priority**: Medium
- **Title**: "Booking Cancelled"
- **Body**: `Booking {bookingId} for batch "{batchName}" has been cancelled by {userName}.{reason ? " Reason: {reason}" : ""}`
- **Push Data**:
  ```json
  {
    "type": "booking_cancelled_academy",
    "bookingId": "booking_id",
    "batchId": "batch_id",
    "reason": "cancellation_reason_or_null"
  }
  ```
- **Email**: Template `booking-cancelled-academy.html` with cancellation details
- **SMS**: `Booking {bookingId} for batch "{batchName}" has been cancelled by {userName}.{reason ? " Reason: {reason}" : ""} - PlayAsport`
- **WhatsApp**: Formatted message with cancellation details
- **When**: Sent asynchronously after cancellation
- **Condition**: Only if academy owner exists and contact info available

#### 6.3. Notification to Admin

- **Recipient**: Admin email (from config)
- **Channel**: Email only
- **Priority**: Medium
- **Subject**: "Booking Cancelled - PlayAsport"
- **Template**: `booking-cancelled-admin.html`
- **Template Variables**: Same as user email + `userEmail`
- **When**: Sent asynchronously after cancellation
- **Condition**: Only if `config.admin.email` is configured

---

### 7. Delete Order (`deleteOrder`)

**Trigger**: User deletes/cancels an order (legacy function)

**Function**: `src/services/client/booking.service.ts::deleteOrder()`

**Notifications**: None
- Currently, no notifications are sent when an order is deleted
- This is a legacy function for old flow

---

## Notification Channel Summary

### Push Notifications
- **Used in**: Booking request created, booking approved, booking rejected, booking cancelled
- **Recipients**: User, Academy Owner, Admin (role-based)
- **Priority**: High (booking request, approval) or Medium (request sent, rejection, cancellation, admin)
- **Delivery**: Immediate (synchronous)
- **Storage**: Stored in notifications collection

### Email Notifications
- **Used in**: Booking request created, booking approved, booking rejected, payment verification, booking cancelled
- **Recipients**: User, Academy, Admin
- **Priority**: High (payment verification, booking request, approval) or Medium (rejection, cancellation)
- **Delivery**: Asynchronous (queued, non-blocking)
- **Templates**: HTML email templates with booking details
- **Queue**: Processed by notification queue service

### SMS Notifications
- **Used in**: Booking request created, booking approved, booking rejected, payment verification, booking cancelled
- **Recipients**: User, Academy
- **Priority**: High (payment verification, booking request, approval) or Medium (rejection, cancellation)
- **Delivery**: Asynchronous (queued, non-blocking)
- **Content**: Plain text with booking details
- **Queue**: Processed by notification queue service

### WhatsApp Notifications
- **Used in**: Booking request created, booking approved, booking rejected, booking cancelled
- **Recipients**: User, Academy
- **Priority**: High (booking request, approval) or Medium (request sent, rejection, cancellation)
- **Delivery**: Asynchronous (queued, non-blocking)
- **Content**: Formatted text messages with booking details
- **Queue**: Processed by notification queue service
- **Note**: WhatsApp uses Twilio/SMS provider, requires SMS to be enabled

---

## Notification Priority Levels

- **High**: Critical notifications that require immediate attention
  - Booking requests (academy)
  - Booking approvals
  - Payment confirmations
  
- **Medium**: Important but not urgent notifications
  - Booking request sent (user)
  - Booking rejections
  - Admin notifications

---

## Notification Data Structure

All push notifications include a `data` object with:
- `type`: Notification type identifier
- `bookingId`: Booking ID
- `batchId`: Batch ID (when applicable)
- `centerId`: Center ID (when applicable)
- Additional fields specific to notification type

---

## Error Handling

- **Push Notifications**: If sending fails, notification is still stored in database
- **Email/SMS**: If sending fails, notification is queued for retry (max 3 retries)
- **Non-blocking**: Email and SMS failures do not affect the main booking/payment flow
- **Logging**: All notification errors are logged but do not throw exceptions

---

## Configuration

Notifications can be enabled/disabled via settings:
- Global: `notifications.enabled`
- SMS: `notifications.sms.enabled`
- Email: `notifications.email.enabled`
- Push: `notifications.push.enabled`

If a channel is disabled, notifications for that channel are skipped silently.

---

## Summary Table

| Event | User | Academy | Admin | Channels | Priority |
|-------|------|---------|-------|----------|----------|
| **Booking Request Created** | ✅ Push + Email + SMS + WhatsApp | ✅ Push + Email + SMS + WhatsApp | ✅ Push (role) | Multi-channel | High/Medium |
| **Booking Approved** | ✅ Push + Email + SMS + WhatsApp | ❌ | ❌ | Multi-channel | High |
| **Booking Rejected** | ✅ Push + Email + SMS + WhatsApp | ❌ | ❌ | Multi-channel | Medium |
| **Payment Verified** | ✅ Email + SMS | ✅ Email + SMS | ✅ Email | Email + SMS | High |
| **Payment Order Created** | ❌ | ❌ | ❌ | None | - |
| **Booking Cancelled** | ✅ Push + Email + SMS + WhatsApp | ✅ Push + Email + SMS + WhatsApp | ✅ Email | Multi-channel | Medium |

---

## Notes

1. **Asynchronous Processing**: Email and SMS notifications for payment verification are sent asynchronously and do not block the payment verification response.

2. **Role-based Notifications**: Admin notifications are role-based and stored in the database. Admin users fetch these notifications when they query their notification list.

3. **Conditional Sending**: Notifications are only sent if:
   - Recipient exists
   - Required contact information is available (email/mobile)
   - Channel is enabled in settings

4. **No Duplicate Notifications**: Each notification event sends one notification per recipient per channel.

5. **Audit Trail**: All booking actions (including notifications) are logged in the audit trail system.
