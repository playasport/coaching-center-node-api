# Admin Settings Management

This document describes the Admin Settings Management system that allows administrators to manage application settings through the admin panel, including fees, notifications, payment gateway, and basic information.

## Overview

The Admin Settings Management system provides a centralized way to manage application-wide settings that were previously configured via environment variables. Key features include:

- **Fee Configuration**: Manage platform fees, GST percentage, and currency
- **Notification Settings**: Configure SMS, Email, WhatsApp, and Push notification credentials
- **Payment Gateway**: Manage payment gateway settings and enable/disable payments
- **Basic Information**: Update app name, logo, contact details, and SEO information
- **Security**: Sensitive credentials are encrypted at rest in the database
- **Access Control**: Public endpoint returns only essential data (app_name, app_logo, contact); admin endpoints require authentication and permissions and return full settings including sensitive data

## Table of Contents

1. [Architecture](#architecture)
2. [Settings Structure](#settings-structure)
3. [API Endpoints](#api-endpoints)
4. [Security](#security)
5. [Usage Examples](#usage-examples)
6. [Migration from Environment Variables](#migration-from-environment-variables)

## Architecture

### Data Storage

Settings are stored in a single MongoDB document with the following characteristics:
- **Single Document**: Only one settings document exists in the database
- **Dynamic Schema**: Uses MongoDB's flexible schema to allow additional fields
- **Encryption**: Sensitive fields are encrypted using AES-256-GCM encryption
- **Default Values**: Default settings are created from environment variables if no settings exist

### Encryption

Sensitive fields are automatically encrypted before storage and decrypted when retrieved by admin users:

- **Encryption Algorithm**: AES-256-GCM
- **Key Management**: Uses `SETTINGS_ENCRYPTION_KEY` environment variable or falls back to JWT secret
- **Encrypted Fields**:
  - SMS: `api_key`, `api_secret`
  - Email: `username`, `password`
  - WhatsApp: `api_key`, `api_secret`, `account_sid`, `auth_token`
  - Payment: `razorpay.key_id`, `razorpay.key_secret`, `stripe.api_key`, `stripe.secret_key`

## Settings Structure

```typescript
interface Settings {
  // Basic Information
  app_name?: string | null;
  app_logo?: string | null;
  contact?: ContactInfo | null;
  basic_info?: {
    about_us?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
  } | null;
  
  // Fee Configuration
  fees?: {
    platform_fee?: number | null;      // Default: 200
    gst_percentage?: number | null;     // Default: 18
    gst_enabled?: boolean | null;       // Default: true
    currency?: string | null;           // Default: 'INR'
  } | null;
  
  // Notification Configuration
  notifications?: {
    enabled?: boolean | null;
    sms?: {
      enabled?: boolean | null;
      provider?: string | null;         // e.g., 'twilio'
      api_key?: string | null;          // ENCRYPTED
      api_secret?: string | null;       // ENCRYPTED
      from_number?: string | null;
      sender_id?: string | null;
    } | null;
    email?: {
      enabled?: boolean | null;
      host?: string | null;             // e.g., 'smtp.gmail.com'
      port?: number | null;             // e.g., 587
      username?: string | null;         // ENCRYPTED
      password?: string | null;         // ENCRYPTED
      from?: string | null;
      from_name?: string | null;
      secure?: boolean | null;
    } | null;
    whatsapp?: {
      enabled?: boolean | null;
      provider?: string | null;         // e.g., 'twilio'
      account_sid?: string | null;      // ENCRYPTED (for Twilio)
      auth_token?: string | null;       // ENCRYPTED (for Twilio)
      from_number?: string | null;
      api_key?: string | null;          // ENCRYPTED
      api_secret?: string | null;       // ENCRYPTED
    } | null;
    push?: {
      enabled?: boolean | null;
    } | null;
  } | null;
  
  // Payment Configuration
  payment?: {
    enabled?: boolean | null;           // Enable/disable payment gateway
    gateway?: string | null;            // 'razorpay' | 'stripe' | 'payu' | 'cashfree'
    razorpay?: {
      key_id?: string | null;           // ENCRYPTED
      key_secret?: string | null;       // ENCRYPTED
      enabled?: boolean | null;
    } | null;
    stripe?: {
      api_key?: string | null;          // ENCRYPTED
      secret_key?: string | null;       // ENCRYPTED
      enabled?: boolean | null;
    } | null;
  } | null;
}
```

## API Endpoints

### Public Endpoints

#### Get Settings (Public)
```
GET /api/v1/settings
```

Returns limited public settings - only essential public-facing data (app name, logo, and contact information). This endpoint requires no authentication.

**Response:**
```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "app_name": "Play A Sport",
    "app_logo": "https://testplayasport.s3.ap-south-1.amazonaws.com/images/logo/afa40028-96af-45af-ad94-4c8fb33f8100.png",
    "contact": {
      "number": ["+919230981848", "+919230981845", "+919546576177"],
      "email": "info@playasport.com",
      "address": {
        "office": "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064",
        "registered": "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
      },
      "whatsapp": "+919230981848",
      "instagram": "https://www.instagram.com/playasport.in/",
      "facebook": "https://www.facebook.com/PlayASportIndia",
      "youtube": "https://www.youtube.com/@PlayASport_in"
    }
  }
}
```

**Note:** 
- This endpoint returns only `app_name`, `app_logo`, and `contact` information.
- All other settings (fees, basic_info, notifications, payment, etc.) are excluded and available only through admin endpoints.
- No authentication required.

### Admin Endpoints

All admin endpoints require:
- **Authentication**: Bearer token (JWT)
- **Authorization**: Admin role (super_admin, admin, employee, or agent)
- **Permissions**: `settings:view` for GET, `settings:update` for POST/PATCH/PUT

#### Get All Settings (Admin)
```
GET /api/v1/admin/settings
```

Returns all settings including sensitive data (decrypted for admin users).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response:** Same structure as public endpoint but includes decrypted sensitive fields.

#### Update Settings (Admin)
```
PUT /api/v1/admin/settings
```

Update any settings fields. Supports partial updates.

**Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "app_name": "Updated App Name",
  "fees": {
    "platform_fee": 250,
    "gst_percentage": 18
  },
  "notifications": {
    "sms": {
      "enabled": true,
      "api_key": "your-api-key",
      "api_secret": "your-api-secret"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": { /* updated settings */ }
  }
}
```

#### Update Basic Information
```
PATCH /api/v1/admin/settings/basic-info
```

Update basic information fields.

**Request Body:**
```json
{
  "app_name": "Play A Sport",
  "app_logo": "https://example.com/logo.png",
  "about_us": "About our platform...",
  "support_email": "support@playasport.in",
  "support_phone": "+91-9876543210",
  "meta_description": "Meta description for SEO",
  "meta_keywords": "sports, coaching, academy"
}
```

#### Update Fee Configuration
```
PATCH /api/v1/admin/settings/fees
```

Update fee-related settings.

**Request Body:**
```json
{
  "platform_fee": 250,
  "gst_percentage": 18,
  "gst_enabled": true,
  "currency": "INR"
}
```

#### Update Notification Configuration
```
PATCH /api/v1/admin/settings/notifications
```

Update notification settings including credentials.

**Request Body:**
```json
{
  "notifications": {
    "enabled": true,
    "sms": {
      "enabled": true,
      "provider": "twilio",
      "api_key": "your-api-key",
      "api_secret": "your-api-secret",
      "from_number": "+1234567890"
    },
    "email": {
      "enabled": true,
      "host": "smtp.gmail.com",
      "port": 587,
      "username": "your-email@gmail.com",
      "password": "your-password",
      "from": "noreply@playasport.in",
      "from_name": "PlayAsport",
      "secure": false
    },
    "whatsapp": {
      "enabled": true,
      "provider": "twilio",
      "account_sid": "your-account-sid",
      "auth_token": "your-auth-token",
      "from_number": "+1234567890"
    },
    "push": {
      "enabled": true
    }
  }
}
```

**Note:** All sensitive fields (api_key, api_secret, username, password, etc.) are automatically encrypted before storage.

#### Update Payment Configuration
```
PATCH /api/v1/admin/settings/payment
```

Update payment gateway settings.

**Request Body:**
```json
{
  "payment": {
    "enabled": true,
    "gateway": "razorpay",
    "razorpay": {
      "key_id": "your-razorpay-key-id",
      "key_secret": "your-razorpay-key-secret",
      "enabled": true
    }
  }
}
```

**Note:** Payment credentials are automatically encrypted before storage.

#### Toggle Payment Gateway
```
PATCH /api/v1/admin/settings/payment/toggle
```

Enable or disable the payment gateway.

**Request Body:**
```json
{
  "enabled": false
}
```

When disabled, all payment order creation attempts will fail with: "Payment gateway is currently disabled. Please contact support."

#### Reset Settings to Default
```
POST /api/v1/admin/settings/reset
```

Reset all settings to default values (populated from environment variables).

**Warning:** This will delete all existing settings and recreate defaults. Use with caution.

## Security

### Encryption

All sensitive credentials are encrypted using AES-256-GCM encryption:

- **Algorithm**: AES-256-GCM
- **Key Source**: Environment variable `SETTINGS_ENCRYPTION_KEY` or JWT secret as fallback
- **Salt**: Random salt per encryption
- **IV**: Random initialization vector per encryption

### Access Control

1. **Public Endpoints**: Exclude all sensitive fields (API keys, passwords, credentials)
2. **Admin Endpoints**: Require authentication and `settings:view` or `settings:update` permissions
3. **Super Admin**: Has full access regardless of permissions

### Best Practices

1. **Environment Variables**: Keep `SETTINGS_ENCRYPTION_KEY` secure and never commit it to version control
2. **Key Rotation**: If encryption key is compromised, re-encrypt all sensitive fields
3. **Access Logging**: Monitor admin access to settings endpoints
4. **Backup**: Regular backups of settings collection recommended

## Usage Examples

### 1. Update Platform Fee

```bash
curl -X PATCH https://api.example.com/api/v1/admin/settings/fees \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_fee": 300,
    "gst_percentage": 18
  }'
```

### 2. Configure SMS Provider

```bash
curl -X PATCH https://api.example.com/api/v1/admin/settings/notifications \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notifications": {
      "sms": {
        "enabled": true,
        "provider": "twilio",
        "api_key": "your-api-key",
        "api_secret": "your-api-secret",
        "from_number": "+1234567890"
      }
    }
  }'
```

### 3. Disable Payment Gateway

```bash
curl -X PATCH https://api.example.com/api/v1/admin/settings/payment/toggle \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

### 4. Update Basic Information

```bash
curl -X PATCH https://api.example.com/api/v1/admin/settings/basic-info \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "My Sports Academy",
    "support_email": "support@mysports.com",
    "support_phone": "+91-9876543210",
    "meta_description": "Best sports coaching platform",
    "meta_keywords": "sports, coaching, training"
  }'
```

## Migration from Environment Variables

The system automatically migrates default values from environment variables when settings are first created:

### Fee Settings
- `PLATFORM_FEE` → `fees.platform_fee`
- `GST_PERCENTAGE` → `fees.gst_percentage`

### Notification Settings
- `SMS_ENABLED` → `notifications.sms.enabled`
- `EMAIL_ENABLED` → `notifications.email.enabled`
- `EMAIL_HOST` → `notifications.email.host`
- `EMAIL_PORT` → `notifications.email.port`
- `EMAIL_USERNAME` → `notifications.email.username` (encrypted)
- `EMAIL_PASSWORD` → `notifications.email.password` (encrypted)
- `EMAIL_FROM` → `notifications.email.from`
- `WHATSAPP_ENABLED` → `notifications.whatsapp.enabled`
- `TWILIO_ACCOUNT_SID` → `notifications.whatsapp.account_sid` (encrypted)
- `TWILIO_AUTH_TOKEN` → `notifications.whatsapp.auth_token` (encrypted)
- `TWILIO_FROM_PHONE` → `notifications.whatsapp.from_number`

### Payment Settings
- `PAYMENT_GATEWAY` → `payment.gateway`
- `RAZORPAY_KEY_ID` → `payment.razorpay.key_id` (encrypted)
- `RAZORPAY_KEY_SECRET` → `payment.razorpay.key_secret` (encrypted)

### Backward Compatibility

The system maintains backward compatibility:
- If a setting is not found in the database, it falls back to environment variables
- This ensures existing code continues to work during migration
- Gradually migrate settings to the admin panel for easier management

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "body.fees.platform_fee",
      "message": "Platform fee must be a positive number"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Integration with Application Services

### Booking Service

The booking service reads fee configuration from settings:

```typescript
// Before: config.booking.platformFee
// After: settings.fees.platform_fee (with fallback to config)

const platformFee = await getSettingValue<number>('fees.platform_fee') ?? config.booking.platformFee;
const gstPercentage = await getSettingValue<number>('fees.gst_percentage') ?? config.booking.gstPercentage;
```

### Payment Service

The payment service checks if payment is enabled:

```typescript
// Payment service checks settings.payment.enabled before processing orders
const isEnabled = await paymentService.isPaymentEnabled();
if (!isEnabled) {
  throw new Error('Payment gateway is currently disabled');
}
```

### Notification Services

Notification services read configuration from settings instead of environment variables, allowing dynamic updates without redeployment.

## Support

For issues or questions:
- Check Swagger documentation at `/api-docs`
- Review API logs for detailed error messages
- Ensure you have the correct permissions (`settings:view` or `settings:update`)
- Verify encryption key is properly configured

