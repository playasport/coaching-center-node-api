# Admin User Routes - Role Restrictions Documentation

## Overview

The `/admin/users` routes have been updated to restrict operations to only "user" and "academy" roles. Users with other roles (super_admin, admin, employee, agent) cannot be created, updated, or viewed through these endpoints.

## Changes Made

### 1. Role Restrictions

#### Create User Endpoint (`POST /admin/users`)
- **Before:** Could create users with any role except `super_admin`
- **After:** Can only create users with `user` or `academy` roles
- **Validation:** Attempting to assign other roles (super_admin, admin, employee, agent) will result in a validation error

#### Update User Endpoint (`PATCH /admin/users/:id`)
- **Before:** Could update users with any role except `super_admin`, password could be updated by super_admin
- **After:** Can only update users with `user` or `academy` roles, password field is not available
- **Validation:** Attempting to assign other roles (super_admin, admin, employee, agent) will result in a validation error
- **Password:** Not available in update endpoint (use password reset flow instead)

#### Get All Users Endpoint (`GET /admin/users`)
- **Before:** Could filter by any role and return all users
- **After:** 
  - Role filter parameter has been removed
  - Only returns users with `user` or `academy` roles
  - Users with other roles are automatically excluded from results

#### Get User by ID Endpoint (`GET /admin/users/:id`)
- **Before:** Could retrieve any user
- **After:** Only returns users with `user` or `academy` roles
- **Behavior:** If a user with another role is requested, a 404 error is returned

### 2. UserType Filter Enhancement

The `userType` filter in the GET endpoint now supports:
- `student` - Users with userType = "student"
- `guardian` - Users with userType = "guardian"
- `academy` - Users with userType = "academy" (NEW)
- `other` - Users with null or undefined userType

### 3. Files Modified

#### `src/validations/adminUser.validation.ts`
- Updated `createAdminUserSchema`:
  - Added validation to only allow "user" and "academy" roles
  - Rejected roles: super_admin, admin, employee, agent
  - Updated `userType` enum to include "academy"
  - **Removed password field** - password is now auto-generated
- Updated `updateAdminUserSchema`:
  - Added validation to only allow "user" and "academy" roles
  - Rejected roles: super_admin, admin, employee, agent
  - Updated `userType` enum to include "academy"
  - **Removed password field** - password updates not available through this endpoint

#### `src/controllers/admin/user.controller.ts`
- **`createUser` function:**
  - Automatically generates secure random password (12 characters)
  - Sends account credentials email to user after creation
  - Password field removed from request validation
- **`getAllUsers` function:**
  - Removed role filter query parameter handling
  - Added automatic filtering to only include users with "user" or "academy" roles
  - Updated userType filter to support "academy" option
- **`getUser` function:**
  - Added filtering to only return users with "user" or "academy" roles
- **`updateUser` function:**
  - Validation is handled by schema (no additional changes needed)

#### `src/routes/admin/user.routes.ts`
- Updated Swagger documentation:
  - Removed `role` query parameter from GET endpoint
  - Updated descriptions to reflect role restrictions
  - Added "academy" to userType enum examples
  - Updated endpoint descriptions to clarify restrictions
  - Removed password field from request examples
  - Updated descriptions to mention auto-generated passwords and email delivery

#### New Files Created
1. `src/utils/passwordGenerator.ts` - Secure password generation utility
2. `src/email/templates/account-credentials.html` - Email template for account credentials

#### Modified Files
1. `src/services/common/email.service.ts` - Added `sendAccountCredentialsEmail` function

## API Changes Summary

### POST /admin/users

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["user"],  // ✅ Allowed: "user", "academy"
  "userType": "student"  // ✅ Allowed: "student", "guardian", "academy"
}
```

**Note:** 
- Password field is **NOT required** - a secure random password (12 characters) will be automatically generated
- The password will be sent to the user's email address along with login credentials
- User will receive a welcome email with their temporary password and instructions to change it on first login

**Validation Errors:**
- ❌ `roles: ["admin"]` → Error: Only "user" and "academy" roles are allowed
- ❌ `roles: ["super_admin"]` → Error: Only "user" and "academy" roles are allowed
- ❌ `roles: ["employee"]` → Error: Only "user" and "academy" roles are allowed
- ❌ `roles: ["agent"]` → Error: Only "user" and "academy" roles are allowed

### GET /admin/users

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by name, email, or mobile
- `userType` - Filter by userType: `student`, `guardian`, `academy`, or `other`
- `isActive` - Filter by active status: `true` or `false`
- ~~`role`~~ - **REMOVED** - No longer supported

**Example Requests:**
```bash
# Get all users (only user/academy roles)
GET /admin/users

# Get academy users
GET /admin/users?userType=academy

# Search active students
GET /admin/users?userType=student&isActive=true&search=john
```

**Response:** Only includes users with "user" or "academy" roles

### PATCH /admin/users/:id

**Request Body:**
```json
{
  "firstName": "Updated Name",
  "roles": ["academy"],  // ✅ Allowed: "user", "academy"
  "userType": "academy"  // ✅ Allowed: "student", "guardian", "academy"
}
```

**Note:**
- Password field is **NOT available** in update endpoint - use password reset flow instead
- Email can only be updated by super_admin

**Validation Errors:**
- ❌ `roles: ["admin"]` → Error: Only "user" and "academy" roles are allowed
- ❌ `roles: ["super_admin"]` → Error: Only "user" and "academy" roles are allowed

### GET /admin/users/:id

**Behavior:**
- Only returns users with "user" or "academy" roles
- If user has another role, returns 404 Not Found

## Error Messages

When attempting to assign disallowed roles:
```
"Only \"user\" and \"academy\" roles are allowed. Other roles (super_admin, admin, employee, agent) cannot be assigned through this endpoint."
```

## Password Management

### Automatic Password Generation
- **Password field removed** from create and update endpoints
- Passwords are **automatically generated** (12-character secure random password)
- Generated passwords meet all complexity requirements:
  - Minimum 8 characters (generated as 12)
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&#)

### Email Delivery
- Account credentials are **automatically sent via email** after user creation
- Email template: `src/email/templates/account-credentials.html`
- Email includes:
  - Welcome message with PlayAsport branding
  - Email address (login username)
  - Temporary password
  - Security instructions
  - Instructions to change password on first login
- If email delivery fails, user creation still succeeds (error is logged)

### Password Updates
- Password field is **not available** in update endpoints
- Users should use the password reset flow to change their password
- Super admin cannot update passwords through this endpoint (use dedicated password management if needed)

## Rationale

This change ensures:
1. **Security:** Admin users, employees, and agents can only be managed through dedicated admin interfaces with appropriate permissions
2. **Clarity:** Clear separation between regular users/academies and administrative accounts
3. **Data Integrity:** Prevents accidental assignment of privileged roles through user management endpoints
4. **Password Security:** Automatic generation ensures strong passwords, and email delivery prevents password exposure in API responses

## Password Management Changes

### Automatic Password Generation
- **Password field removed** from create and update endpoints
- Passwords are **automatically generated** (12-character secure random)
- Generated passwords meet complexity requirements:
  - Minimum 8 characters (generated as 12)
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&#)

### Email Delivery
- Account credentials are **automatically sent via email** after user creation
- Email includes:
  - Welcome message with PlayAsport branding
  - Email address (login username)
  - Temporary password
  - Security instructions
  - Instructions to change password on first login
- Email template: `src/email/templates/account-credentials.html`
- If email delivery fails, user creation still succeeds (error is logged)

### Password Updates
- Password field is **not available** in update endpoints
- Users should use the password reset flow to change their password
- Super admin can still manage passwords through dedicated password management endpoints (if available)

## Migration Notes

If you have existing code that uses the `role` query parameter:
- **Action Required:** Remove the `role` parameter from GET requests
- The endpoint will automatically filter to show only "user" and "academy" roles

If you have existing code that sends passwords in create requests:
- **Action Required:** Remove the `password` field from POST requests
- Passwords will be automatically generated and sent via email
- Update your frontend to inform users to check their email for credentials

If you need to manage users with other roles:
- Use dedicated admin interfaces or role-specific endpoints
- Ensure proper permissions are in place

## Backward Compatibility

- **Breaking Change:** The `role` query parameter has been removed from GET endpoint
- **Breaking Change:** Users with roles other than "user" or "academy" are no longer visible through these endpoints
- **Breaking Change:** The `password` field has been removed from create and update endpoints
- **Non-Breaking:** Create and update endpoints maintain the same structure for other fields, but with stricter validation

