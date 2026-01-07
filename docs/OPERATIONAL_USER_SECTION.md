# Operational User Section Documentation

## Overview

The **Operational User** section is a new admin panel section dedicated to managing users with administrative and operational roles (admin, employee, agent, and any custom roles). This section is separate from the regular **User** section which only manages users with "user" or "academy" roles.

**Password Management:** Passwords are automatically generated (12-character secure random) and sent to users via email. The password field is not required in create requests and is not available in update requests.

## Section Details

- **Section Enum**: `OPERATIONAL_USER = 'operational_user'`
- **Route Prefix**: `/admin/operational-users`
- **RBAC Section**: `operational_user`

## Purpose

This section provides a dedicated interface for managing users with any role that can be created via the role routes, including:
- **Admin users** - Administrative users with elevated permissions
- **Employee users** - Staff members with operational roles
- **Agent users** - Users who can create coaching centers
- **Any custom roles** - Any other roles created through the role management system

It explicitly excludes:
- Regular users (role: "user")
- Academy users (role: "academy")
- Super Admin users (role: "super_admin")

## API Endpoints

### Base URL
```
/api/v1/admin/operational-users
```

### Endpoints

#### 1. Create Operational User
- **Method**: `POST`
- **Path**: `/admin/operational-users`
- **Permission Required**: `operational_user:create`
- **Description**: Create a new user with any role except user, academy, or super_admin. A secure random password will be automatically generated and sent to the user's email address.
- **Allowed Roles**: Any role that can be created via role routes (admin, employee, agent, or any custom roles)
- **Disallowed Roles**: `super_admin`, `user`, `academy`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "mobile": "9876543210",
  "gender": "male",
  "dob": "1990-01-01T00:00:00.000Z",
  "roles": ["admin"],
  "isActive": true,
  "address": {
    "line1": "Street Address",
    "line2": "Area",
    "city": "City",
    "state": "State",
    "country": "India",
    "pincode": "123456"
  }
}
```

**Note:** The password field is not required. A secure random password (12 characters) will be automatically generated and sent to the user's email address along with their login credentials.

**Response:**
```json
{
  "success": true,
  "message": "Operational user created successfully. Credentials have been sent to their email.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "roles": [
        {
          "id": "507f1f77bcf86cd799439011",
          "name": "admin",
          "description": "Administrator"
        }
      ],
      "isActive": true
    }
  }
}
```

**Email Notification:**
After successful user creation, an email will be automatically sent to the user's email address containing:
- Welcome message
- Email address (login username)
- Temporary password (12-character secure random password)
- Security instructions
- Instructions to change password on first login

#### 2. Get All Operational Users
- **Method**: `GET`
- **Path**: `/admin/operational-users`
- **Permission Required**: `operational_user:view`
- **Description**: Retrieve paginated list of operational users

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `search` - Search by name, email, or mobile
- `isActive` - Filter by active status: `true` or `false`
- `role` - Filter by role: `admin`, `employee`, or `agent`

**Example Requests:**
```bash
# Get all operational users
GET /admin/operational-users

# Get all admins
GET /admin/operational-users?role=admin

# Search active employees
GET /admin/operational-users?role=employee&isActive=true&search=john
```

**Response:**
```json
{
  "success": true,
  "message": "Operational users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com",
        "mobile": "9876543210",
        "roles": [
          {
            "id": "507f1f77bcf86cd799439011",
            "name": "admin"
          }
        ],
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### 3. Get Operational User by ID
- **Method**: `GET`
- **Path**: `/admin/operational-users/:id`
- **Permission Required**: `operational_user:view`
- **Description**: Retrieve a specific operational user by ID

**Response:**
```json
{
  "success": true,
  "message": "Operational user retrieved successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com",
      "roles": [...],
      "isActive": true
    }
  }
}
```

#### 4. Update Operational User
- **Method**: `PATCH`
- **Path**: `/admin/operational-users/:id`
- **Permission Required**: `operational_user:update`
- **Description**: Update an operational user
- **Note**: 
  - Email can only be updated by super_admin
  - Password field is not available in update endpoint (use password reset flow instead)

**Request Body:**
```json
{
  "firstName": "Updated Name",
  "roles": ["employee"],
  "isActive": true
}
```

#### 5. Delete Operational User
- **Method**: `DELETE`
- **Path**: `/admin/operational-users/:id`
- **Permission Required**: `operational_user:delete`
- **Description**: Soft delete an operational user

## RBAC (Role-Based Access Control)

### Permission Structure
```
Section: operational_user
Actions: view, create, update, delete
```

### Permission Examples

1. **View Operational Users**
   - Role: Admin
   - Section: `operational_user`
   - Action: `view`
   - Result: Can see list of operational users

2. **Create Operational User**
   - Role: Admin
   - Section: `operational_user`
   - Action: `create`
   - Result: Can create new admin/employee/agent users

3. **Update Operational User**
   - Role: Admin
   - Section: `operational_user`
   - Action: `update`
   - Result: Can update operational user details (except email/password unless super_admin)

4. **Delete Operational User**
   - Role: Admin
   - Section: `operational_user`
   - Action: `delete`
   - Result: Can soft delete operational users

### Super Admin Bypass
- Super Admin has full access to all endpoints without explicit permissions
- Super Admin can update email field
- Password field is not available in update endpoint (use password reset flow instead)

## Password Management

### Automatic Password Generation
When creating a new operational user:
1. A secure random password (12 characters) is automatically generated
2. Password meets all complexity requirements (uppercase, lowercase, number, special char)
3. Password is hashed and stored securely
4. Original password is sent to user via email (never returned in API response)

### Email Template
The account credentials email uses the template: `src/email/templates/account-credentials.html`
- Professional PlayAsport branding with blue gradient header
- Clear display of login credentials (email and password)
- Security warnings and instructions
- Instructions to change password on first login
- Footer with copyright information

### Password Updates
- Password field is **not available** in update endpoints
- Users should use the password reset flow to change their password
- This ensures passwords are only changed through secure, authenticated flows

## Differences from User Section

| Feature | User Section | Operational User Section |
|---------|--------------|--------------------------|
| **Allowed Roles** | `user`, `academy` | Any role except `user`, `academy`, `super_admin` |
| **Disallowed Roles** | `super_admin`, `admin`, `employee`, `agent` | `super_admin`, `user`, `academy` |
| **UserType Filter** | Supports `student`, `guardian`, `academy`, `other` | Not applicable (no userType) |
| **Role Filter** | Removed (auto-filtered to user/academy) | Supports any role except user/academy/super_admin |
| **Section Enum** | `USER` | `OPERATIONAL_USER` |
| **RBAC Section** | `user` | `operational_user` |
| **Password** | Auto-generated, sent via email | Auto-generated, sent via email |

## Files Created/Modified

### New Files
1. `src/validations/operationalUser.validation.ts` - Validation schemas (password field removed)
2. `src/controllers/admin/operationalUser.controller.ts` - Controller logic (auto-generates password, sends email)
3. `src/routes/admin/operationalUser.routes.ts` - Route definitions
4. `src/utils/passwordGenerator.ts` - Secure password generation utility
5. `src/email/templates/account-credentials.html` - Email template for account credentials with PlayAsport branding
6. `docs/OPERATIONAL_USER_SECTION.md` - This documentation

### Modified Files
1. `src/enums/section.enum.ts` - Added `OPERATIONAL_USER` section
2. `src/routes/admin/index.ts` - Registered new routes
3. `src/config/swagger.ts` - Added Swagger tag
4. `src/services/common/email.service.ts` - Added `sendAccountCredentialsEmail` function

## Validation Rules

### Create User
- **Roles**: Can be any role except: `super_admin`, `user`, `academy` (supports admin, employee, agent, and any custom roles)
- **Email**: Must be unique and valid email format (password will be sent to this email)
- **Password**: Automatically generated (12-character secure random password) - not required in request
- **Mobile**: Optional, 10 digits starting with 6-9
- **Address**: Optional, but if provided must include line2, city, state, country, pincode

### Update User
- **Roles**: Can be any role except: `super_admin`, `user`, `academy`
- **Email**: Can only be updated by super_admin
- **Password**: Not available in update endpoint (use password reset flow instead)
- **Mobile**: Optional, 10 digits starting with 6-9
- **Address**: Optional, but if provided must include line2, city, state, country, pincode

### Error Messages
- Attempting to assign `super_admin`, `user`, or `academy` roles:
  ```
  "Roles \"super_admin\", \"user\", and \"academy\" cannot be assigned through this endpoint. All other roles are allowed."
  ```

### Email Delivery
- Account credentials are automatically sent via email after user creation
- Email includes welcome message, login credentials, and security instructions
- If email delivery fails, user creation still succeeds (error is logged)
- Users should check their email (including spam folder) for login credentials

## Setup Instructions

### 1. Set Up Permissions

After deploying, set up permissions for the new section:

1. Login as Super Admin
2. Navigate to Permissions section
3. Create permissions for `operational_user` section:
   - `operational_user:view`
   - `operational_user:create`
   - `operational_user:update`
   - `operational_user:delete`
4. Assign these permissions to desired roles (typically Admin role)

### 2. API Usage

```bash
# Create an admin user (password will be auto-generated and sent via email)
POST /api/v1/admin/operational-users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "firstName": "New",
  "lastName": "Admin",
  "roles": ["admin"]
}

# Get all operational users
GET /api/v1/admin/operational-users?page=1&limit=10
Authorization: Bearer <token>

# Update operational user
PATCH /api/v1/admin/operational-users/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated",
  "isActive": false
}
```

## Security Considerations

1. **Role Restrictions**: Any role except user, academy, and super_admin can be assigned
2. **Super Admin Protection**: Super admin users cannot be created or modified through this endpoint
3. **Password Management**: 
   - Passwords are automatically generated (12-character secure random)
   - Passwords are sent via email (never returned in API responses)
   - Users must change password on first login
   - Password field is not available in update endpoint
4. **Email Updates**: Only super_admin can update email field
5. **Permission Checks**: All endpoints require appropriate RBAC permissions
6. **Soft Delete**: Users are soft deleted, not permanently removed
7. **Email Security**: Credentials are sent via secure email template with security warnings

## Integration with Existing Systems

- Uses the same `UserModel` as the regular user section
- Follows the same authentication and authorization patterns
- Integrates with existing permission system
- Uses the same validation utilities

## Testing

To test the endpoints:

1. Ensure you have `operational_user:view` permission
2. Create a test admin user via POST endpoint
3. Retrieve the list via GET endpoint
4. Update the user via PATCH endpoint
5. Verify role filtering works correctly

## Migration Notes

- This is a new section, no migration needed
- Existing admin/employee/agent users will now be visible through this endpoint
- Regular users (user/academy roles) remain in the `/admin/users` endpoint

