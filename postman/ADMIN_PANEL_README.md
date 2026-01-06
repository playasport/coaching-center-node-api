# PlayAsport Admin Panel API - Postman Collection

This Postman collection contains all endpoints for the PlayAsport Admin Panel with Role-Based Access Control (RBAC).

## Collection Overview

The Admin Panel API collection includes:

1. **Admin Authentication** - Login, profile management, password change
2. **Permission Management** - Full CRUD operations for permissions (Super Admin only for create/update/delete)
3. **Dashboard** - Statistics and analytics
4. **User Management** - User CRUD operations with permission-based access
5. **Coaching Center Management** - Coaching center management with permission-based access

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `PlayAsport-Admin-Panel-Collection.json`
4. The collection will be imported with all folders and requests

### 2. Configure Environment Variables

The collection uses the following variables:

- `baseUrl` - API base URL (default: `http://localhost:3000/api/v1`)
- `adminAccessToken` - JWT access token (auto-set after login)
- `adminRefreshToken` - JWT refresh token (auto-set after login)
- `roleId` - Role ID for permission operations
- `permissionId` - Permission ID for permission operations
- `userId` - User ID for user operations
- `coachingCenterId` - Coaching Center ID for coaching center operations

**To configure:**

1. Click on the collection name
2. Go to **Variables** tab
3. Update `baseUrl` if your API is running on a different host/port
4. Other variables are auto-populated after making requests

### 3. Authentication Flow

1. **Login as Admin:**
   - Use the **Admin Login** request
   - Enter admin email and password
   - The `adminAccessToken` and `adminRefreshToken` will be automatically saved
   - All subsequent requests will use this token

2. **Token Usage:**
   - All protected endpoints automatically use `{{adminAccessToken}}` from collection variables
   - If token expires, login again to get a new token

## Role-Based Access Control

### Admin Roles

- **Super Admin** - Full access to all endpoints, can manage permissions
- **Admin** - Most permissions except permission management
- **Employee** - Limited permissions (view, create, update on assigned sections)
- **Agent** - View-only on most sections, limited create/update

### Permission Structure

Permissions are structured as:
- **Section** - The resource/module (e.g., `coaching_center`, `user`, `batch`)
- **Action** - The operation (e.g., `view`, `create`, `update`, `delete`)

### Permission Endpoints

- **Get All Permissions** - View all permissions (filtered by role if not Super Admin)
- **Get Available Sections** - List all available sections
- **Get Available Actions** - List all available actions
- **Get Permissions by Role** - View all permissions for a specific role
- **Create Permission** - Create new permission (Super Admin only)
- **Update Permission** - Update existing permission (Super Admin only)
- **Delete Permission** - Delete permission (Super Admin only)
- **Bulk Update Permissions** - Replace all permissions for a role (Super Admin only)

## Endpoint Categories

### Admin Authentication (`/admin/auth`)

- `POST /admin/auth/login` - Admin login
- `GET /admin/auth/profile` - Get admin profile
- `PATCH /admin/auth/profile` - Update admin profile
- `PATCH /admin/auth/profile/image` - Update admin profile image (multipart/form-data with field name 'image')
- `PATCH /admin/auth/password` - Change password

### Permission Management (`/admin/permissions`)

- `GET /admin/permissions` - Get all permissions
- `GET /admin/permissions/sections` - Get available sections
- `GET /admin/permissions/actions` - Get available actions
- `GET /admin/permissions/role/:roleId` - Get permissions by role
- `GET /admin/permissions/:id` - Get permission by ID
- `POST /admin/permissions` - Create permission (Super Admin only)
- `PATCH /admin/permissions/:id` - Update permission (Super Admin only)
- `DELETE /admin/permissions/:id` - Delete permission (Super Admin only)
- `POST /admin/permissions/bulk` - Bulk update permissions (Super Admin only)

### Dashboard (`/admin/dashboard`)

- `GET /admin/dashboard/stats` - Get dashboard statistics

### User Management (`/admin/users`)

- `GET /admin/users` - Get all users (paginated)
- `GET /admin/users/:id` - Get user by ID
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user (soft delete)

### Coaching Center Management (`/admin/coaching-centers`)

- `GET /admin/coaching-centers` - Get all coaching centers (paginated)
- `GET /admin/coaching-centers/:id` - Get coaching center by ID
- `PATCH /admin/coaching-centers/:id` - Update coaching center
- `DELETE /admin/coaching-centers/:id` - Delete coaching center

### Settings Management (`/admin/settings`)

- `GET /admin/settings` - Get all settings (includes sensitive data, decrypted)
- `PUT /admin/settings` - Update settings (supports partial updates)
- `PATCH /admin/settings/basic-info` - Update basic information
- `PATCH /admin/settings/fees` - Update fee configuration (platform fee, GST, currency)
- `PATCH /admin/settings/notifications` - Update notification configuration (SMS, Email, WhatsApp, Push)
- `PATCH /admin/settings/payment` - Update payment gateway configuration
- `PATCH /admin/settings/payment/toggle` - Toggle payment gateway enable/disable
- `POST /admin/settings/reset` - Reset settings to default values

**Note:** Sensitive fields (API keys, passwords, credentials) are automatically encrypted at rest. Admin endpoints require `settings:view` (for GET) or `settings:update` (for POST/PATCH/PUT) permissions.

### Highlights Management (`/admin/highlights`)

- `POST /admin/highlights/upload-video` - Upload video file for highlight
- `POST /admin/highlights/upload-thumbnail` - Upload thumbnail image for highlight
- `POST /admin/highlights/upload-media` - Upload both video and thumbnail in one request
- `GET /admin/highlights` - Get all highlights (paginated, with filters)
- `GET /admin/highlights/:id` - Get highlight by ID
- `POST /admin/highlights` - Create new highlight
- `PATCH /admin/highlights/:id` - Update highlight
- `PATCH /admin/highlights/:id/status` - Update highlight status
- `POST /admin/highlights/:id/process-video` - Manually trigger video processing
- `POST /admin/highlights/:id/upload-preview` - Upload preview video for highlight
- `DELETE /admin/highlights/:id` - Delete highlight (soft delete)

**Note:** Highlights require `highlight:view`, `highlight:create`, `highlight:update`, or `highlight:delete` permissions. Video processing happens automatically in the background when a highlight is created or updated with a new video URL.

## Testing Workflow

### 1. Initial Setup

1. **Login as Super Admin:**
   ```
   POST /admin/auth/login
   Body: {
     "email": "superadmin@example.com",
     "password": "SuperAdmin@123"
   }
   ```

2. **Get Available Sections:**
   ```
   GET /admin/permissions/sections
   ```

3. **Get Available Actions:**
   ```
   GET /admin/permissions/actions
   ```

### 2. Permission Management (Super Admin Only)

1. **Get All Permissions:**
   ```
   GET /admin/permissions
   ```

2. **Get Permissions for a Role:**
   ```
   GET /admin/permissions/role/:roleId
   ```

3. **Create Permission:**
   ```
   POST /admin/permissions
   Body: {
     "role": "roleId",
     "section": "coaching_center",
     "actions": ["view", "create", "update"],
     "isActive": true
   }
   ```

4. **Bulk Update Permissions:**
   ```
   POST /admin/permissions/bulk
   Body: {
     "role": "roleId",
     "permissions": [
       {
         "section": "coaching_center",
         "actions": ["view", "create", "update"],
         "isActive": true
       },
       {
         "section": "employee",
         "actions": ["view"],
         "isActive": true
       }
     ]
   }
   ```

### 3. Dashboard Access

1. **Get Dashboard Statistics:**
   ```
   GET /admin/dashboard/stats
   ```
   Requires `dashboard:view` permission

### 4. User Management

1. **Get All Users:**
   ```
   GET /admin/users?page=1&limit=10
   ```
   Requires `user:view` permission

2. **Update User:**
   ```
   PATCH /admin/users/:id
   Body: {
     "firstName": "Updated Name",
     "isActive": true
   }
   ```
   Requires `user:update` permission

### 5. Coaching Center Management

1. **Get All Coaching Centers:**
   ```
   GET /admin/coaching-centers?page=1&limit=10
   ```
   Requires `coaching_center:view` permission

2. **Update Coaching Center:**
   ```
   PATCH /admin/coaching-centers/:id
   Body: {
     "center_name": "Updated Name",
     "status": "published"
   }
   ```
   Requires `coaching_center:update` permission

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "body.email",
      "message": "Email is required"
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

## Notes

1. **Super Admin Bypass:** Super Admin automatically has access to all endpoints regardless of permissions
2. **Permission Caching:** Permissions are cached in Redis for performance. Cache is invalidated when permissions are updated
3. **Token Expiry:** Access tokens expire after 15 minutes. Use refresh token to get a new access token
4. **Soft Delete:** User deletion is soft delete (sets `isDeleted: true`), data is not permanently removed

## Support

For issues or questions:
- Check Swagger documentation at `/api-docs`
- Review API logs for detailed error messages
- Ensure you have the correct permissions for the endpoint
