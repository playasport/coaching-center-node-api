# Academy Payout Account System - Complete Guide

This document provides comprehensive documentation for the Academy Payout Account system, which allows academy users to create and manage Razorpay Route Linked Accounts for receiving payouts.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [API Endpoints](#api-endpoints)
4. [Workflow](#workflow)
5. [Data Models](#data-models)
6. [Notifications](#notifications)
7. [Audit Trails](#audit-trails)
8. [Error Handling](#error-handling)
9. [Integration Guide](#integration-guide)
10. [Best Practices](#best-practices)

---

## Overview

The Academy Payout Account system enables academy users to:
- Create a Razorpay Route Linked Account with KYC details
- Store bank account information for receiving payouts
- Track account activation status
- Receive notifications for status changes
- Maintain audit trails for all operations

**Key Constraint:** Each academy user can create only **one** payout account at a time.

---

## Features

### 1. Account Creation
- Create Linked Account in Razorpay Route
- Submit KYC details (business information, address; PAN/GST required based on business type)
- Optionally create stakeholder during account creation
- Request Route product configuration automatically (tracks ready_for_payout status)
- Store account details in database

### 2. Bank Details Management
- Add or update bank account information
- Update bank details in Razorpay Route
- Track bank verification status

### 3. Status Tracking
- Monitor activation status (pending, needs_clarification, activated, rejected)
- View activation requirements if clarification is needed
- Sync status from Razorpay manually or via webhooks

### 4. Notifications
- Push notifications for all status changes
- Email notifications for important events
- SMS notifications for critical updates
- WhatsApp notifications for user-friendly messages

### 5. Audit Trails
- Track all payout account operations
- Record status changes with metadata
- Maintain compliance and debugging history

---

## API Endpoints

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.playasport.in/api/v1
```

### Authentication
All endpoints require:
- **JWT Token** in Authorization header
- **ACADEMY Role** authorization

```javascript
headers: {
  'Authorization': `Bearer ${academyToken}`
}
```

---

### 1. Get Payout Account

**Endpoint:** `GET /academy/payout-account`

**Description:** Retrieve the payout account details for the authenticated academy user.

**Response:**
```json
{
  "success": true,
  "message": "Payout account retrieved successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "razorpay_account_id": "acc_GRWKk7qQsLnDjX",
    "kyc_details": {
      "legal_business_name": "Elite Sports Academy",
      "business_type": "partnership", // PAN required for partnership
      "contact_name": "John Doe",
      "email": "contact@elitesportsacademy.com",
      "phone": "9876543210",
      "pan": "ABCDE1234F",
      "gst": "29ABCDE1234F1Z5",
      "address": {
        "street1": "123 MG Road",
        "street2": "Near Metro Station",
        "city": "Bengaluru",
        "state": "KARNATAKA",
        "postal_code": "560001",
        "country": "IN"
      }
    },
    "bank_information": {
      "account_number": "****1234",
      "ifsc_code": "SBIN0001234",
      "account_holder_name": "Elite Sports Academy",
      "bank_name": "State Bank of India"
    },
    "activation_status": "pending",
    "activation_requirements": null,
    "stakeholder_id": "stk_1234567890",
    "ready_for_payout": "pending",
    "bank_details_status": "pending",
    "rejection_reason": null,
    "is_active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Payout account not found
- `401` - Unauthorized
- `403` - Forbidden (not ACADEMY role)

---

### 2. Create Payout Account

**Endpoint:** `POST /academy/payout-account`

**Description:** Create a new payout account (Linked Account) in Razorpay Route.

**Request Body Examples:**

**Example 1: Partnership/Company (PAN Required)**
```json
{
  "kyc_details": {
    "legal_business_name": "Elite Sports Academy",
    "business_type": "partnership",
    "contact_name": "John Doe",
    "email": "contact@elitesportsacademy.com",
    "phone": "9876543210",
    "pan": "ABCDE1234F",
    "gst": "29ABCDE1234F1Z5",
    "address": {
      "street1": "123 MG Road",
      "street2": "Near Metro Station",
      "city": "Bengaluru",
      "state": "KARNATAKA",
      "postal_code": "560001",
      "country": "IN"
    }
  },
  "bank_information": {
    "account_number": "1234567890123456",
    "ifsc_code": "SBIN0001234",
    "account_holder_name": "Elite Sports Academy",
    "bank_name": "State Bank of India"
  },
  "stakeholder": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "relationship": "director",
    "kyc": {
      "pan": "ABCDE1234F",
      "aadhaar": "123456789012"
    }
  }
}
```

**Example 2: Individual (PAN and GST Not Required)**
```json
{
  "kyc_details": {
    "legal_business_name": "Indal Kumar Singh",
    "business_type": "individual",
    "contact_name": "Indal Kumar Singh",
    "email": "indal@example.com",
    "phone": "9876543210",
    "address": {
      "street1": "BD-357, sector-1, saltlake city",
      "street2": "Kolkata, West Bengal",
      "city": "Kolkata",
      "state": "West Bengal",
      "postal_code": "700064",
      "country": "IN"
    }
  },
  "bank_information": {
    "account_number": "30058100006235",
    "ifsc_code": "BARB0GAMHAR",
    "account_holder_name": "Indal Kumar Singh",
    "bank_name": "Bank of Baroda"
  }
}
```

**Note:** For `individual` business type:
- `pan` field is **optional** (can be omitted)
- `gst` field is **optional** (can be omitted)
- `legal_business_name` should be the person's name, not a business name
- `stakeholder` is optional (not automatically created)

**Field Requirements:**

**KYC Details (Required):**
- `legal_business_name` - Legal business name (max 255 chars)
  - For `individual` type: Person's legal name
  - For other types: Business/company name
- `business_type` - One of: `individual`, `partnership`, `private_limited`, `public_limited`, `llp`, `ngo`, `trust`, `society`, `huf`
- `contact_name` - Contact person name (max 100 chars)
- `email` - Valid email address
- `phone` - 10-digit Indian mobile number (pattern: `^[6-9]\d{9}$`)
- `pan` - PAN number (format: `ABCDE1234F`)
  - **Required** for: `partnership`, `private_limited`, `public_limited`, `llp`, `ngo`, `trust`, `society`, `huf`
  - **Optional** for: `individual` (not required for individual business type)
- `gst` - GST number (optional, format: `29ABCDE1234F1Z5`)
  - Optional for all business types (only if GST registered)
- `address` - Registered address
  - `street1` - Required (max 100 chars)
  - `street2` - Optional (max 100 chars)
  - `city` - Required (max 100 chars)
  - `state` - Required (max 100 chars)
  - `postal_code` - Required (6-10 chars)
  - `country` - Required (2 chars, default: "IN")

**Bank Information (Optional):**
- `account_number` - 9-18 digits
- `ifsc_code` - IFSC code (format: `SBIN0001234`)
- `account_holder_name` - Account holder name (max 100 chars)
- `bank_name` - Bank name (optional, max 100 chars)

**Stakeholder (Optional):**
- `name` - Stakeholder name (max 100 chars)
- `email` - Valid email address
- `phone` - 10-digit Indian mobile number
- `relationship` - One of: `director`, `proprietor`, `partner`, `authorised_signatory`
- `kyc.pan` - PAN number (optional)
- `kyc.aadhaar` - Aadhaar number (optional, 12 digits)

**Response:**
```json
{
  "success": true,
  "message": "Payout account created successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "razorpay_account_id": "acc_GRWKk7qQsLnDjX",
    "activation_status": "pending",
    ...
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error or account already exists
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Razorpay API error or internal server error

**Notifications Sent:**
- Push notification: "Payout Account Created"
- Email notification with account details
- SMS notification
- WhatsApp notification

---

### 3. Update Bank Details

**Endpoint:** `PUT /academy/payout-account/bank-details`

**Description:** Update bank account details for the payout account.

**Request Body:**
```json
{
  "account_number": "1234567890123456",
  "ifsc_code": "SBIN0001234",
  "account_holder_name": "Elite Sports Academy",
  "bank_name": "State Bank of India"
}
```

**Field Requirements:**
- `account_number` - Required, 9-18 digits
- `ifsc_code` - Required, valid IFSC format
- `account_holder_name` - Required, max 100 chars
- `bank_name` - Optional, max 100 chars

**Response:**
```json
{
  "success": true,
  "message": "Bank details updated successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "bank_information": {
      "account_number": "****1234",
      "ifsc_code": "SBIN0001234",
      "account_holder_name": "Elite Sports Academy",
      "bank_name": "State Bank of India"
    },
    "bank_details_status": "submitted",
    ...
  }
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `404` - Payout account not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Razorpay API error

**Notifications Sent:**
- Push notification: "Bank Details Updated"
- Email notification
- SMS notification
- WhatsApp notification

---

### 4. Sync Account Status

**Endpoint:** `POST /academy/payout-account/sync-status`

**Description:** Manually sync the payout account status from Razorpay.

**Response:**
```json
{
  "success": true,
  "message": "Account status synced successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "activation_status": "activated",
    "activation_requirements": null,
    ...
  }
}
```

**Status Codes:**
- `200` - Synced successfully
- `404` - Payout account not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Razorpay API error

**Notifications Sent (if status changed):**
- Push notification based on new status
- Email notification
- SMS notification
- WhatsApp notification

---

## Workflow

### Account Creation Flow

```
1. Academy User Submits KYC Details
   ↓
2. Create Linked Account in Razorpay Route
   ↓
3. Create Stakeholder (if provided)
   ↓
4. Request Route Product Configuration (sets ready_for_payout: 'pending')
   ↓
5. Store Account in Database
   ↓
6. Send Notifications (Push, Email, SMS, WhatsApp)
   ↓
7. Create Audit Trail
   ↓
8. Update Bank Details (if provided)
   ↓
9. Account Status: PENDING
```

### Activation Flow

```
Account Status: PENDING
   ↓
Razorpay Reviews KYC
   ↓
┌─────────────────────────┐
│ Status: ACTIVATED       │ → Send activation notifications
│ Status: NEEDS_CLARIFICATION │ → Send clarification request
│ Status: REJECTED        │ → Send rejection notification
└─────────────────────────┘
```

---

## Data Models

### AcademyPayoutAccount

```typescript
{
  id: string; // UUID
  user: ObjectId; // Reference to User (unique - one per user)
  razorpay_account_id: string; // Razorpay Linked Account ID
  kyc_details: {
    legal_business_name: string;
    business_type: BusinessType;
    contact_name: string;
    email: string;
    phone: string;
    pan?: string | null; // Required for all business types except 'individual'
    gst?: string | null; // Optional for all business types
    address: {
      street1: string;
      street2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  bank_information?: {
    account_number: string; // Masked in responses
    ifsc_code: string;
    account_holder_name: string;
    bank_name?: string | null;
  } | null;
  activation_status: 'pending' | 'needs_clarification' | 'activated' | 'rejected';
  activation_requirements?: string[] | null;
  stakeholder_id?: string | null;
  ready_for_payout?: 'pending' | 'ready' | null; // Route product configuration status - ready for payouts
  bank_details_status?: 'pending' | 'submitted' | 'verified' | null;
  rejection_reason?: string | null;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Types

- `individual` - Individual/Proprietor (PAN and GST not required)
- `partnership` - Partnership Firm
- `private_limited` - Private Limited Company
- `public_limited` - Public Limited Company
- `llp` - Limited Liability Partnership
- `ngo` - Non-Governmental Organization
- `trust` - Trust
- `society` - Society
- `huf` - Hindu Undivided Family

---

## Notifications

### Notification Events

1. **Account Created**
   - Channels: Push, Email, SMS, WhatsApp
   - Priority: High
   - Message: Account created, status pending

2. **Account Activated**
   - Channels: Push, Email, SMS, WhatsApp
   - Priority: High
   - Message: Account activated, can receive payouts

3. **Needs Clarification**
   - Channels: Push, Email, SMS, WhatsApp
   - Priority: High
   - Message: Additional information required

4. **Account Rejected**
   - Channels: Push, Email, SMS, WhatsApp
   - Priority: High
   - Message: Account rejected with reason

5. **Bank Details Updated**
   - Channels: Push, Email, SMS, WhatsApp
   - Priority: High
   - Message: Bank details updated, under verification

### Notification Templates

All notification messages are defined in `src/services/common/notificationMessages.ts`:
- `getPayoutAccountCreatedAcademySms()`
- `getPayoutAccountCreatedAcademyWhatsApp()`
- `getPayoutAccountActivatedAcademySms()`
- `getPayoutAccountActivatedAcademyWhatsApp()`
- `getPayoutAccountNeedsClarificationAcademySms()`
- `getPayoutAccountNeedsClarificationAcademyWhatsApp()`
- `getPayoutAccountRejectedAcademySms()`
- `getPayoutAccountRejectedAcademyWhatsApp()`
- `getBankDetailsUpdatedAcademySms()`
- `getBankDetailsUpdatedAcademyWhatsApp()`

---

## Audit Trails

All payout account operations are tracked with audit trails:

### Action Types

- `PAYOUT_ACCOUNT_CREATED` - Account created (CRITICAL)
- `PAYOUT_ACCOUNT_UPDATED` - KYC details updated (HIGH)
- `PAYOUT_ACCOUNT_BANK_DETAILS_UPDATED` - Bank details updated (HIGH)
- `PAYOUT_ACCOUNT_ACTIVATED` - Account activated (CRITICAL)
- `PAYOUT_ACCOUNT_STATUS_CHANGED` - Status changed (HIGH)

### Audit Trail Metadata

Each audit trail includes:
- Action type and scale
- Entity type: "PayoutAccount"
- Entity ID
- User ID (academy user)
- Metadata (Razorpay account ID, status, etc.)
- IP address and user agent (when available)

---

## Error Handling

### Common Errors

1. **Account Already Exists**
   - Status: `400 Bad Request`
   - Message: "Payout account already exists. Each academy user can have only one payout account."

2. **Validation Errors**
   - Status: `400 Bad Request`
   - Message: Validation error details

3. **Razorpay API Errors**
   - Status: `500 Internal Server Error`
   - Message: Error from Razorpay API

4. **Account Not Found**
   - Status: `404 Not Found`
   - Message: "Payout account not found. Please create a payout account first."

---

## Integration Guide

### Frontend Integration

1. **Check if Account Exists**
   ```javascript
   GET /academy/payout-account
   // If 404, show "Create Account" form
   // If 200, show account details and status
   ```

2. **Create Account**
   ```javascript
   POST /academy/payout-account
   // Show loading state
   // On success, show success message and account details
   // Listen for push notifications for status updates
   ```

3. **Update Bank Details**
   ```javascript
   PUT /academy/payout-account/bank-details
   // Show loading state
   // On success, show success message
   ```

4. **Sync Status**
   ```javascript
   POST /academy/payout-account/sync-status
   // Call this periodically or on user request
   // Update UI with latest status
   ```

### Status Display

```javascript
const getStatusMessage = (status) => {
  switch(status) {
    case 'pending':
      return 'Your account is under review. You will be notified once activated.';
    case 'needs_clarification':
      return 'Additional information is required. Please check your account.';
    case 'activated':
      return 'Your account is activated. You can now receive payouts.';
    case 'rejected':
      return 'Your account has been rejected. Please contact support.';
    default:
      return 'Unknown status';
  }
};
```

---

## Best Practices

1. **Account Creation**
   - Validate all KYC details on frontend before submission
   - Show clear error messages for validation failures
   - Provide helpful hints for PAN (if required), GST, and IFSC formats
   - Show clear indication when PAN is optional (for individual business type)

2. **Status Monitoring**
   - Poll status periodically or use webhooks
   - Show clear status messages to users
   - Display activation requirements if clarification is needed

3. **Bank Details**
   - Validate IFSC code format before submission
   - Mask account numbers in UI (show only last 4 digits)
   - Verify account holder name matches business name

4. **Error Handling**
   - Handle Razorpay API errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

5. **Security**
   - Never log sensitive information (PAN, account numbers)
   - Mask sensitive data in responses
   - Use HTTPS for all API calls

---

## Related Documentation

- [Razorpay Route API Documentation](https://razorpay.com/docs/payments/route/apis/)
- [Notification System Guide](./NOTIFICATION_SYSTEM.md)
- [Audit Trail System](./BOOKING_FLOW_AND_AUDIT_TRAIL.md)

---

## Support

For issues or questions:
- Check Razorpay Route API documentation
- Review error logs in the application
- Contact support with account ID and error details

---

**Last Updated:** 2024-01-15
