# Admin Notification API Documentation

## Overview

The Admin Notification API provides comprehensive notification management for the admin panel. It supports sending notifications to individual users, academies, or role-based groups (admin, super_admin, etc.). Admins can also view their own notifications, get unread counts, and mark notifications as read.

## Table of Contents

1. [Features](#features)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Notification Types](#notification-types)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

## Features

- **Send Notifications**: Send notifications to users, academies, or role-based groups
- **Role-Based Notifications**: Support for single or multiple roles (admin, super_admin, etc.)
- **Multiple Channels**: Send via SMS, Email, WhatsApp, and Push notifications
- **View Own Notifications**: Admins can view notifications filtered by their roles
- **Unread Count**: Get count of unread notifications
- **Mark as Read**: Mark individual notifications as read
- **Comprehensive Filtering**: Filter notifications by various criteria
- **Automatic Notifications**: System automatically creates notifications for user/academy registrations

## Authentication

All endpoints require:
- **Bearer Token**: Admin access token in the Authorization header
- **Admin Role**: User must have admin, super_admin, employee, or agent role
- **Permissions**: Some endpoints require specific permissions (notification:create, notification:view)

## API Endpoints

### 1. Get Admin's Own Notifications

**GET** `/admin/notifications/my`

Get paginated list of notifications for the authenticated admin user. Notifications are automatically filtered based on the admin's roles.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Number of records per page (default: 10, max: 100)
- `isRead` (boolean, optional): Filter by read status (true/false)

**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "recipientType": "role",
        "roles": ["admin", "super_admin"],
        "title": "New User Registration",
        "body": "John Doe (john@example.com) has registered as a student.",
        "channels": ["push"],
        "priority": "medium",
        "data": {
          "type": "user_registration",
          "userId": "user-id-123",
          "email": "john@example.com",
          "userType": "student"
        },
        "imageUrl": null,
        "isRead": false,
        "readAt": null,
        "sent": true,
        "sentAt": "2024-01-15T10:30:00.000Z",
        "error": null,
        "metadata": {
          "source": "user_registration",
          "registrationDate": "2024-01-15T10:30:00.000Z"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
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

### 2. Get Unread Notification Count

**GET** `/admin/notifications/unread-count`

Get count of unread notifications for the authenticated admin user.

**Response:**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

### 3. Mark Notification as Read

**PATCH** `/admin/notifications/:id/read`

Mark a specific notification as read for the authenticated admin user.

**Path Parameters:**
- `id` (string, required): Notification ID

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "recipientType": "role",
    "roles": ["admin", "super_admin"],
    "title": "New User Registration",
    "body": "John Doe (john@example.com) has registered as a student.",
    "channels": ["push"],
    "priority": "medium",
    "isRead": true,
    "readAt": "2024-01-15T10:35:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 4. Send Notification

**POST** `/admin/notifications/send`

Send a notification to a user, academy, or role-based group. Requires `notification:create` permission.

**Request Body:**
```json
{
  "recipientType": "role",
  "roles": ["admin", "super_admin"],
  "title": "System Maintenance",
  "body": "Scheduled maintenance will occur on January 20, 2024 from 2:00 AM to 4:00 AM.",
  "channels": ["push", "email"],
  "priority": "high",
  "data": {
    "type": "system_maintenance",
    "startDate": "2024-01-20T02:00:00.000Z",
    "endDate": "2024-01-20T04:00:00.000Z"
  },
  "imageUrl": "https://bucket.s3.region.amazonaws.com/notifications/maintenance.png"
}
```

**For User/Academy Notifications:**
```json
{
  "recipientType": "user",
  "recipientId": "user-uuid-here",
  "title": "New Booking Confirmed",
  "body": "Your booking for Cricket Batch has been confirmed.",
  "channels": ["push", "email"],
  "priority": "medium",
  "data": {
    "bookingId": "BK-2024-0001",
    "type": "booking",
    "batchId": "batch-uuid-123",
    "amount": 5000
  }
}
```

### 5. Test Notification

**POST** `/admin/notifications/test`

Send a test notification to verify notification channels are working. Requires `notification:create` permission.

**Request Body:**
```json
{
  "recipientType": "role",
  "roles": ["admin", "super_admin"],
  "channels": ["push", "email", "sms", "whatsapp"]
}
```

### 6. Get All Notifications (Admin View)

**GET** `/admin/notifications`

Get a paginated list of all sent notifications with filters. Requires `notification:view` permission.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Number of items per page (default: 10)
- `recipientType` (string, optional): Filter by recipient type (user, academy, role)
- `recipientId` (string, optional): Filter by recipient ID
- `channels` (array, optional): Filter by notification channels
- `priority` (string, optional): Filter by priority (high, medium, low)
- `sent` (boolean, optional): Filter by sent status
- `isRead` (boolean, optional): Filter by read status
- `search` (string, optional): Search by title or body
- `sortBy` (string, optional): Field to sort by (default: createdAt)
- `sortOrder` (string, optional): Sort order (asc, desc, default: desc)

## Notification Types

### 1. User Notifications
- **recipientType**: `"user"`
- **recipientId**: User ID (required)
- Sent to a specific user

### 2. Academy Notifications
- **recipientType**: `"academy"`
- **recipientId**: Academy ID (required)
- Sent to the academy owner

### 3. Role-Based Notifications
- **recipientType**: `"role"`
- **roles**: Array of role names (required)
- **recipientId**: Not required
- Sent to all users with matching roles
- Supports single or multiple roles

**Available Roles:**
- `super_admin`
- `admin`
- `user`
- `academy`
- `employee`
- `agent`

## Request/Response Examples

### Example 1: Send Role-Based Notification

**Request:**
```bash
curl -X POST "http://localhost:3001/api/v1/admin/notifications/send" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientType": "role",
    "roles": ["admin", "super_admin"],
    "title": "New Academy Registration",
    "body": "Elite Sports Academy has registered on the platform.",
    "channels": ["push"],
    "priority": "medium",
    "data": {
      "type": "academy_registration",
      "userId": "academy-owner-id",
      "email": "academy@example.com"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "recipientType": "role",
    "roles": ["admin", "super_admin"],
    "title": "New Academy Registration",
    "body": "Elite Sports Academy has registered on the platform.",
    "channels": ["push"],
    "priority": "medium",
    "isRead": false,
    "sent": true,
    "sentAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Example 2: Get My Notifications

**Request:**
```bash
curl -X GET "http://localhost:3001/api/v1/admin/notifications/my?page=1&limit=10&isRead=false" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 3: Mark Notification as Read

**Request:**
```bash
curl -X PATCH "http://localhost:3001/api/v1/admin/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions",
  "data": null
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Notification not found",
  "data": null
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error: roles are required when recipientType is 'role'",
  "data": null
}
```

## Best Practices

1. **Use Role-Based Notifications**: For system-wide announcements, use role-based notifications instead of sending to individual users
2. **Set Appropriate Priority**: Use `high` for urgent notifications, `medium` for normal, and `low` for informational
3. **Include Relevant Data**: Add structured data in the `data` field for better handling in frontend
4. **Handle Errors Gracefully**: Notification failures don't break the main flow, but log errors for debugging
5. **Poll for Unread Count**: Use the unread count endpoint to show badge counts in the UI
6. **Mark as Read on View**: Mark notifications as read when the user views them in detail

## Automatic Notifications

The system automatically creates notifications for:
- **User Registration**: When a new user registers, admin and super_admin receive notifications
- **Academy Registration**: When an academy registers, admin and super_admin receive notifications

These notifications are created with:
- `recipientType`: `"role"`
- `roles`: `["admin", "super_admin"]`
- `channels`: `["push"]`
- `priority`: `"medium"`

