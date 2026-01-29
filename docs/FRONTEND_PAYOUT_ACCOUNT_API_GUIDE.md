# Frontend Developer Guide: Payout Account API

## Overview

This guide provides comprehensive documentation for frontend developers to integrate the Payout Account API in the Academy Panel. The API allows academy owners to create and manage their payout accounts to receive payments from student bookings.

## Table of Contents

1. [Base URL & Authentication](#base-url--authentication)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Status Flow](#status-flow)
5. [Error Handling](#error-handling)
6. [Frontend Integration Examples](#frontend-integration-examples)
7. [Common Use Cases](#common-use-cases)

---

## Base URL & Authentication

### Base URL
```
Production: https://api.playasport.in/api/v1
Development: http://localhost:3001/api/v1
```

### Authentication

All endpoints require authentication using Bearer token in the Authorization header.

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

**Required Role:** `ACADEMY` (Only academy users can access these endpoints)

---

## API Endpoints

### 1. Get Payout Account

Retrieve the payout account details for the authenticated academy user.

**Endpoint:** `GET /academy/payout-account`

**Headers:**
```javascript
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payout account retrieved successfully",
  "data": {
    "id": "10459277-ed5e-4ed8-94f3-efdcd2d9b50b",
    "kyc_details": {
      "legal_business_name": "Indal Kumar Singh",
      "business_type": "individual",
      "contact_name": "Indal Kumar Singh",
      "email": "indalkuma@playasport.in",
      "phone": "9546576177",
      "pan": "OHXPS8345Q",
      "gst": null,
      "address": {
        "street1": "BD-357, sector-1, saltlake city",
        "street2": "Kolkata, West Bengal, India, 700064",
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
    },
    "activation_status": "activated",
    "activation_requirements": null,
    "ready_for_payout": "ready",
    "bank_details_status": "verified",
    "rejection_reason": null,
    "is_active": true,
    "createdAt": "2026-01-20T10:13:15.428Z",
    "updatedAt": "2026-01-20T10:14:01.949Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Payout account not found",
  "data": null,
  "statusCode": 404
}
```

**Note:** This endpoint automatically syncs the account status from the payment gateway. The status is updated in real-time.

---

### 2. Create Payout Account

Create a new payout account for the authenticated academy user.

**Endpoint:** `POST /academy/payout-account`

**Headers:**
```javascript
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

**Request Body:**
```json
{
  "kyc_details": {
    "legal_business_name": "Indal Kumar Singh",
    "business_type": "individual",
    "contact_name": "Indal Kumar Singh",
    "email": "indalkuma@playasport.in",
    "phone": "9546576177",
    "pan": "OHXPS8345Q",
    "gst": null,
    "address": {
      "street1": "BD-357, sector-1, saltlake city",
      "street2": "Kolkata, West Bengal, India, 700064",
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

**Field Requirements:**

### kyc_details (Required)

All fields in `kyc_details` are **required**:

- **legal_business_name** (Required)
  - Type: `string`
  - Min length: 1 character
  - Max length: 100 characters
  - Validation: Cannot be empty

- **business_type** (Required)
  - Type: `enum`
  - Valid values: `individual`
  - Note: Currently only `individual` is supported in frontend

- **contact_name** (Required)
  - Type: `string`
  - Min length: 1 character
  - Max length: 100 characters
  - Validation: Cannot be empty

- **email** (Required)
  - Type: `string`
  - Format: Valid email address
  - Validation: Must match email regex pattern

- **phone** (Required)
  - Type: `string`
  - Format: 10-digit Indian mobile number
  - Validation: Must start with 6-9, exactly 10 digits
  - Example: `9546576177`

- **pan** (Required)
  - Type: `string`
  - Format: Valid PAN format
  - Pattern: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
  - Example: `ABCDE1234F`
  - Validation: Automatically converted to uppercase

- **gst** (Optional)
  - Type: `string | null`
  - Format: Valid GST format (15 characters)
  - Pattern: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
  - Example: `18AABCU9603R1ZM`
  - Validation: Automatically converted to uppercase if provided

- **address** (Required Object)
  - **street1** (Required)
    - Type: `string`
    - Min length: 1 character
    - Max length: 100 characters
    - Validation: Cannot be empty
  
  - **street2** (Optional)
    - Type: `string | null`
    - Max length: 100 characters
  
  - **city** (Required)
    - Type: `string`
    - Min length: 1 character
    - Max length: 100 characters
    - Validation: Cannot be empty
  
  - **state** (Required)
    - Type: `string`
    - Min length: 1 character
    - Max length: 100 characters
    - Validation: Cannot be empty
  
  - **postal_code** (Required)
    - Type: `string`
    - Min length: 6 characters
    - Max length: 10 characters
    - Validation: Must be 6-10 characters
  
  - **country** (Required)
    - Type: `string`
    - Length: Exactly 2 characters
    - Default: `"IN"`
    - Validation: Must be valid country code (ISO 3166-1 alpha-2)

### bank_information (Optional)

All fields in `bank_information` are **required** if the object is provided:

- **account_number** (Required if bank_information provided)
  - Type: `string`
  - Min length: 9 digits
  - Max length: 18 digits
  - Validation: Must contain only digits (0-9)
  - Example: `30058100006235`

- **ifsc_code** (Required if bank_information provided)
  - Type: `string`
  - Format: Valid IFSC code format
  - Pattern: `^[A-Z]{4}0[A-Z0-9]{6}$`
  - Example: `SBIN0001234`, `BARB0GAMHAR`
  - Validation: Automatically converted to uppercase

- **account_holder_name** (Required if bank_information provided)
  - Type: `string`
  - Min length: 1 character
  - Max length: 100 characters
  - Validation: Cannot be empty

  - **bank_name** (Optional)
    - Type: `string | null`
    - Max length: 100 characters
    - Validation: Can be null or empty string

### Quick Validation Reference

| Field | Required | Type | Format/Pattern | Min | Max | Example |
|-------|----------|------|----------------|-----|-----|---------|
| **kyc_details** | ✅ | object | - | - | - | - |
| legal_business_name | ✅ | string | - | 1 | 255 | "Indal Kumar Singh" |
| business_type | ✅ | enum | individual, partnership, etc. | - | - | "individual" |
| contact_name | ✅ | string | - | 1 | 100 | "Indal Kumar Singh" |
| email | ✅ | string | email format | - | - | "user@example.com" |
| phone | ✅ | string | `^[6-9]\d{9}$` | 10 | 10 | "9546576177" |
| pan | ✅ | string | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` | 10 | 10 | "ABCDE1234F" |
| gst | ❌ | string\|null | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` | 15 | 15 | "18AABCU9603R1ZM" |
| address | ✅ | object | - | - | - | - |
| address.street1 | ✅ | string | - | 1 | 100 | "BD-357, sector-1" |
| address.street2 | ❌ | string\|null | - | - | 100 | "Kolkata, West Bengal" |
| address.city | ✅ | string | - | 1 | 100 | "Kolkata" |
| address.state | ✅ | string | - | 1 | 100 | "West Bengal" |
| address.postal_code | ✅ | string | - | 6 | 10 | "700064" |
| address.country | ✅ | string | ISO 3166-1 alpha-2 | 2 | 2 | "IN" |
| **bank_information** | ❌ | object | - | - | - | - |
| account_number | ✅* | string | `^\d+$` | 9 | 18 | "30058100006235" |
| ifsc_code | ✅* | string | `^[A-Z]{4}0[A-Z0-9]{6}$` | 11 | 11 | "BARB0GAMHAR" |
| account_holder_name | ✅* | string | - | 1 | 100 | "Indal Kumar Singh" |
| bank_name | ❌ | string\|null | - | - | 100 | "Bank of Baroda" |

*Required if `bank_information` object is provided

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payout account created successfully",
  "data": {
    "id": "10459277-ed5e-4ed8-94f3-efdcd2d9b50b",
    "kyc_details": { /* ... */ },
    "bank_information": { /* ... */ },
    "activation_status": "pending",
    "activation_requirements": null,
    "ready_for_payout": "pending",
    "bank_details_status": "pending",
    "is_active": true,
    "createdAt": "2026-01-20T10:13:15.428Z",
    "updatedAt": "2026-01-20T10:13:15.428Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "message": "Validation error: PAN is required",
  "data": null,
  "statusCode": 400
}
```

- **400 Bad Request** - Account already exists:
```json
{
  "success": false,
  "message": "Payout account already exists. You can only have one payout account.",
  "data": null,
  "statusCode": 400
}
```

- **500 Internal Server Error** - Payment gateway error:
```json
{
  "success": false,
  "message": "Failed to create payout account: Route feature not enabled for the merchant",
  "data": null,
  "statusCode": 500
}
```

**Important Notes:**
- Each academy user can create only **one** payout account
- PAN is **mandatory** for all business types
- Bank details can be provided during creation or updated later
- Account creation is asynchronous - status will be updated via notifications

---

### 3. Update Bank Details

Update bank account details for the payout account.

**Endpoint:** `PUT /academy/payout-account/bank-details`

**Headers:**
```javascript
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

**Request Body:**
```json
{
  "account_number": "30058100006235",
  "ifsc_code": "BARB0GAMHAR",
  "account_holder_name": "Indal Kumar Singh",
  "bank_name": "Bank of Baroda"
}
```

**Field Requirements:**
- `account_number`: Required, 9-18 digits
- `ifsc_code`: Required, valid IFSC format (e.g., SBIN0001234)
- `account_holder_name`: Required, 1-100 characters
- `bank_name`: Optional, max 100 characters

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bank details updated successfully",
  "data": {
    "id": "10459277-ed5e-4ed8-94f3-efdcd2d9b50b",
    "bank_information": {
      "account_number": "30058100006235",
      "ifsc_code": "BARB0GAMHAR",
      "account_holder_name": "Indal Kumar Singh",
      "bank_name": "Bank of Baroda"
    },
    "bank_details_status": "pending",
    "activation_status": "needs_clarification",
    "activation_requirements": [
      "Entered bank details are incorrect, please share signatory personal account details"
    ],
    "updatedAt": "2026-01-20T10:14:01.949Z"
  }
}
```

**Error Responses:**

- **404 Not Found:**
```json
{
  "success": false,
  "message": "Payout account not found. Please create a payout account first.",
  "data": null,
  "statusCode": 404
}
```

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "message": "Validation error: IFSC code must be in valid format",
  "data": null,
  "statusCode": 400
}
```

**Important Notes:**
- Bank details update is processed asynchronously
- Status will change to `submitted` after processing
- If account needs clarification, `activation_requirements` will contain details
- Bank details are verified by the payment gateway

---

## Data Models

### Activation Status

```typescript
enum ActivationStatus {
  PENDING = 'pending',
  NEEDS_CLARIFICATION = 'needs_clarification',
  ACTIVATED = 'activated',
  REJECTED = 'rejected'
}
```

### Business Type

```typescript
enum BusinessType {
  INDIVIDUAL = 'individual',
}
```

### Bank Details Status

```typescript
enum BankDetailsStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified'
}
```

### Ready for Payout Status

```typescript
type ReadyForPayout = 'pending' | 'ready' | null;
```

### Payout Account Response

```typescript
interface PayoutAccount {
  id: string;
  kyc_details: {
    legal_business_name: string;
    business_type: BusinessType;
    contact_name: string;
    email: string;
    phone: string;
    pan: string;
    gst: string | null;
    address: {
      street1: string;
      street2: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  bank_information: {
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    bank_name: string | null;
  } | null;
  activation_status: ActivationStatus;
  activation_requirements: string[] | null;
  ready_for_payout: ReadyForPayout;
  bank_details_status: BankDetailsStatus | null;
  rejection_reason: string | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Status Flow

### Account Activation Flow

```
1. CREATE ACCOUNT
   ↓
   activation_status: "pending"
   ready_for_payout: "pending"
   ↓
2. BANK DETAILS SUBMITTED
   ↓
   bank_details_status: "submitted"
   ↓
3. VERIFICATION PROCESS
   ↓
   [Option A] activation_status: "activated"
              ready_for_payout: "ready"
              bank_details_status: "verified"
   ↓
   [Option B] activation_status: "needs_clarification"
              activation_requirements: ["..."]
   ↓
   [Option C] activation_status: "rejected"
              rejection_reason: "..."
```

### Status Meanings

- **pending**: Account is being reviewed (typically 3-4 business days)
- **needs_clarification**: Additional information required (check `activation_requirements`)
- **activated**: Account is active and ready to receive payouts
- **rejected**: Account has been rejected (check `rejection_reason`)

### Ready for Payout

- **pending**: Account is not ready for payouts yet
- **ready**: Account is ready to receive payouts

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "data": null,
  "statusCode": 400
}
```

### Common Error Codes

- **400 Bad Request**: Validation error or business logic error
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User doesn't have ACADEMY role
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error or payment gateway error

---

## Best Practices

1. **Always validate on frontend** before submitting to API
2. **Show loading states** during API calls
3. **Handle errors gracefully** with user-friendly messages
4. **Auto-sync status** when account is in pending state
5. **Display requirements clearly** when status is `needs_clarification`
6. **Use TypeScript** for type safety
7. **Cache account data** to reduce API calls
8. **Poll for updates** when status is pending (with reasonable intervals)

---

## Support

For issues or questions:
- Email: support@playasport.in
- Check API documentation: `/docs` endpoint
- Review error messages for specific guidance

---

**Last Updated:** January 2026
**API Version:** v1
