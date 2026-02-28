# User Transaction API - Frontend Integration Guide

This guide explains how to integrate the user transaction API endpoints in the frontend to display payment history, refund records, and transaction details for authenticated users.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Response Examples](#response-examples)
5. [Query Parameters & Filters](#query-parameters--filters)
6. [UI/UX Recommendations](#uiux-recommendations)
7. [Error Handling](#error-handling)

## Overview

The user transaction API allows authenticated users to:
- View a paginated list of their payment and refund transactions
- Filter transactions by status, type, and date range
- View detailed information about a specific transaction, including linked booking, batch, center, sport, and participant data

Base URL: `/api/v1/user/transactions`

## Authentication

All endpoints require a valid JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## API Endpoints

### 1. List User Transactions

**Endpoint:** `GET /api/v1/user/transactions`

**When to Call:**
- When user opens the "My Transactions" or "Payment History" screen
- When user applies filters (status, type, date range)
- When user navigates to next/previous page

**Query Parameters:**

| Parameter   | Type    | Default | Description                                              |
|-------------|---------|---------|----------------------------------------------------------|
| `page`      | integer | 1       | Page number (starts from 1)                              |
| `limit`     | integer | 10      | Records per page (1-100)                                 |
| `status`    | string  | —       | Filter: `pending`, `processing`, `success`, `failed`, `cancelled`, `refunded` |
| `type`      | string  | —       | Filter: `payment`, `refund`, `partial_refund`            |
| `startDate` | string  | —       | From date in `YYYY-MM-DD` format                         |
| `endDate`   | string  | —       | To date in `YYYY-MM-DD` format                           |
| `sortOrder` | string  | `desc`  | Sort by date: `asc` (oldest first) or `desc` (newest first) |

**Example Request:**

```
GET /api/v1/user/transactions?page=1&limit=10&status=success&type=payment
```

```
GET /api/v1/user/transactions?startDate=2026-01-01&endDate=2026-02-28&sortOrder=desc
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "transaction_id": "TXN-20260215-102500-A7B3C1",
        "status": "success",
        "amount": 5000,
        "currency": "INR",
        "payment_method": "upi",
        "rorder_id": "order_ABCD1234567890",
        "payment_id": "pay_EFGH1234567890",
        "failure_reason": null,
        "processed_at": "2026-02-15T10:30:00.000Z",
        "created_at": "2026-02-15T10:25:00.000Z",
        "booking": {
          "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "booking_id": "BK202602001",
          "batch_name": "Morning Cricket Batch",
          "center_name": "Elite Sports Academy",
          "sport_name": "Cricket"
        }
      },
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "transaction_id": "TXN-20260210-141500-D4E5F6",
        "status": "refunded",
        "amount": 3000,
        "currency": "INR",
        "payment_method": "card",
        "rorder_id": "order_IJKL1234567890",
        "payment_id": "pay_MNOP1234567890",
        "failure_reason": null,
        "processed_at": "2026-02-10T14:20:00.000Z",
        "created_at": "2026-02-10T14:15:00.000Z",
        "booking": {
          "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
          "booking_id": "BK202601045",
          "batch_name": "Evening Football Batch",
          "center_name": "City Sports Hub",
          "sport_name": "Football"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2. Get Transaction Details

**Endpoint:** `GET /api/v1/user/transactions/:transactionId`

**When to Call:**
- When user taps/clicks on a transaction in the list to view full details

**Path Parameters:**

| Parameter       | Type   | Description                     |
|-----------------|--------|---------------------------------|
| `transactionId` | string | Transaction ID (UUID)           |

**Example Request:**

```
GET /api/v1/user/transactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "transaction": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "transaction_id": "TXN-20260215-102500-A7B3C1",
      "status": "success",
      "amount": 5000,
      "currency": "INR",
      "payment_method": "upi",
      "rorder_id": "order_ABCD1234567890",
      "payment_id": "pay_EFGH1234567890",
      "refund_id": null,
      "failure_reason": null,
      "processed_at": "2026-02-15T10:30:00.000Z",
      "created_at": "2026-02-15T10:25:00.000Z",
      "booking": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "booking_id": "BK202602001",
        "amount": 5000,
        "currency": "INR",
        "status": "confirmed",
        "payment": {
          "rorder_id": "order_ABCD1234567890",
          "status": "success",
          "payment_method": "upi",
          "paid_at": "2026-02-15T10:30:00.000Z"
        },
        "participants": [
          {
            "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
            "firstName": "Rahul",
            "lastName": "Sharma"
          }
        ],
        "batch": {
          "id": "bt1a2b3c-d5e6-7890-abcd-ef1234567890",
          "name": "Morning Cricket Batch"
        },
        "center": {
          "id": "ct1a2b3c-d5e6-7890-abcd-ef1234567890",
          "center_name": "Elite Sports Academy"
        },
        "sport": {
          "id": "sp1a2b3c-d5e6-7890-abcd-ef1234567890",
          "name": "Cricket"
        }
      }
    }
  }
}
```

## Query Parameters & Filters

### Status Values

| Status       | Description                                   | Suggested Color |
|--------------|-----------------------------------------------|-----------------|
| `pending`    | Transaction is initiated, waiting for gateway  | Orange / Yellow |
| `processing` | Payment is being processed by Razorpay         | Blue            |
| `success`    | Payment completed successfully                 | Green           |
| `failed`     | Payment failed                                 | Red             |
| `cancelled`  | Payment was cancelled by user                  | Grey            |
| `refunded`   | Amount has been refunded                       | Purple          |

### Type Values

| Type              | Description                    | Display Label      |
|-------------------|--------------------------------|--------------------|
| `payment`         | Standard payment for a booking | "Payment"          |
| `refund`          | Full refund                    | "Refund"           |
| `partial_refund`  | Partial refund                 | "Partial Refund"   |

### Date Filtering

- `startDate` and `endDate` use `YYYY-MM-DD` format
- `endDate` is inclusive (includes the full day until 23:59:59)
- Can use either or both together

**Example - Last 30 days:**
```
?startDate=2026-01-29&endDate=2026-02-28
```

**Example - Specific month:**
```
?startDate=2026-02-01&endDate=2026-02-28
```

## UI/UX Recommendations

### Transaction List Screen

```
┌──────────────────────────────────────┐
│  My Transactions                     │
│                                      │
│  ┌─ Filters ───────────────────────┐ │
│  │ [All ▼] [Payment ▼] [Date ▼]   │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ ● Payment     ₹5,000    ✓ Success│
│  │   Morning Cricket Batch          │ │
│  │   Elite Sports Academy           │ │
│  │   15 Feb 2026, 10:30 AM         │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ ● Refund      ₹3,000    ↩ Refund│
│  │   Evening Football Batch         │ │
│  │   City Sports Hub                │ │
│  │   10 Feb 2026, 02:15 PM         │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ ● Payment     ₹2,500    ✗ Failed│
│  │   Swimming Advanced Batch        │ │
│  │   Aqua Sports Center             │ │
│  │   05 Feb 2026, 09:10 AM         │ │
│  └─────────────────────────────────┘ │
│                                      │
│         [Load More / Pagination]     │
└──────────────────────────────────────┘
```

### Transaction Detail Screen

```
┌──────────────────────────────────────┐
│  ← Transaction Details               │
│                                      │
│  ┌─ Status ────────────────────────┐ │
│  │       ✓ Payment Successful       │ │
│  │           ₹5,000 INR             │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Transaction ID                      │
│  TXN-20260215-102500-A7B3C1         │
│                                      │
│  Payment Method                      │
│  UPI                                 │
│                                      │
│  Payment ID                          │
│  pay_EFGH1234567890                  │
│                                      │
│  Date                                │
│  15 Feb 2026, 10:30 AM              │
│                                      │
│  ─── Booking Details ───             │
│                                      │
│  Booking ID: BK202602001             │
│  Sport: Cricket                      │
│  Batch: Morning Cricket Batch        │
│  Center: Elite Sports Academy        │
│  Participants: Rahul Sharma          │
│  Booking Status: Confirmed           │
│                                      │
└──────────────────────────────────────┘
```

### Key Display Logic

1. **Amount formatting:** Always display with currency symbol (e.g., `₹5,000`)
2. **Date formatting:** Convert ISO string to local readable format (e.g., `15 Feb 2026, 10:30 AM`)
3. **Null fields:** Hide fields that are `null` (e.g., don't show "Refund ID" if `refund_id` is null)
4. **Failure reason:** Only show when `status` is `failed` and `failure_reason` is not null
5. **Booking link:** The `booking.id` or `booking.booking_id` can be used to navigate to booking details screen
6. **Empty state:** Show a friendly message when `transactions` array is empty (e.g., "No transactions yet")
7. **Type indicator:** Use different icons/colors for `payment` vs `refund` vs `partial_refund`

## Error Handling

### Common Error Responses

**401 - Unauthorized:**
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized"
}
```
Action: Redirect user to login screen or refresh the access token.

**404 - Transaction Not Found:**
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Transaction not found"
}
```
Action: Show "Transaction not found" message. This also occurs if the user tries to access another user's transaction.

**400 - Validation Error:**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "query.startDate",
      "message": "Start date must be in YYYY-MM-DD format"
    }
  ]
}
```
Action: Show the validation error message near the relevant filter input.

**500 - Server Error:**
```json
{
  "statusCode": 500,
  "success": false,
  "message": "Internal server error"
}
```
Action: Show a generic error message with a retry option.
