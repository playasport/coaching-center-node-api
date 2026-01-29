---
name: Admin Panel RBAC System
overview: Create a comprehensive Role-Based Access Control (RBAC) system for an admin panel with all routes under "/admin" prefix. The system will allow Super Admin to dynamically manage granular permissions (view, create, update, delete) for each section and role.
todos:
  - id: "1"
    content: Create Permission model with role, section, actions, and isActive fields
    status: completed
  - id: "2"
    content: Create Section enum with all application sections (coaching_center, employee, batch, etc.)
    status: completed
  - id: "3"
    content: Create permission middleware (requirePermission, requireAnyPermission, requireAllPermissions) with Super Admin bypass
    status: completed
  - id: "4"
    content: Create admin middleware (requireAdmin) to validate admin roles
    status: completed
  - id: "5"
    content: Create permission service with checkPermission, getUserPermissions, and caching logic
    status: completed
  - id: "6"
    content: Create admin service with dashboard stats and section/action helpers
    status: completed
  - id: "7"
    content: Create admin routes structure (/admin prefix) with auth, permission, dashboard, and section routes
    status: completed
  - id: "8"
    content: Create admin auth controller (login, profile, password change)
    status: completed
  - id: "9"
    content: Create permission controller (CRUD operations, bulk updates, get by role)
    status: completed
  - id: "10"
    content: Create admin dashboard controller with statistics
    status: completed
  - id: "11"
    content: Create admin section controllers (coaching center, employee, batch, booking, student, user, etc.)
    status: completed
  - id: "12"
    content: Create permission validations (create, update, bulk update schemas)
    status: completed
  - id: "13"
    content: Create admin auth validations (login, profile, password schemas)
    status: completed
  - id: "14"
    content: Create seed script for default permissions (Super Admin, Admin, Employee, Agent)
    status: completed
  - id: "15"
    content: Integrate admin routes into main routes index
    status: completed
  - id: "16"
    content: Update Swagger documentation with admin routes and permission management APIs
    status: completed
---

# Admin Panel RBAC System Implementation Plan

## Overview

Build a comprehensive Role-Based Access Control (RBAC) system where Super Admin can dynamically manage permissions for different roles (Super Admin, Admin, Employee, Agent, etc.) across all sections of the application. All admin routes will be prefixed with `/admin`.

## Architecture

### Permission System Design

The system will use a **Permission** model that stores:

- **Role** reference (which role has the permission)
- **Section** (e.g., `coaching_center`, `employee`, `batch`, `booking`, `student`, etc.)
- **Actions** (array: `view`, `create`, `update`, `delete`)
- **Is Active** flag

Super Admin will have full access by default (bypassed in middleware). All other roles will be checked against stored permissions.

## Implementation Steps

### 1. Database Models

#### 1.1 Permission Model (`src/models/permission.model.ts`)

Create a new Permission model with:

- `role`: ObjectId reference to Role
- `section`: String (enum of all sections)
- `actions`: Array of strings (`['view', 'create', 'update', 'delete']`)
- `isActive`: Boolean
- Indexes on `role` and `section` for fast lookups

#### 1.2 Section Enum (`src/enums/section.enum.ts`)

Create enum for all sections:

- `COACHING_CENTER`, `EMPLOYEE`, `BATCH`, `BOOKING`, `STUDENT`, `PARTICIPANT`, `FEE_TYPE_CONFIG`, `SPORT`, `FACILITY`, `LOCATION`, `SETTINGS`, `REEL`, `ROLE`, `USER`, `ACADEMY_AUTH`, `USER_AUTH`

### 2. Admin Routes Structure

All admin routes will be under `/api/v1/admin` prefix:

#### 2.1 Admin Routes Index (`src/routes/admin/index.ts`)

- Main router that combines all admin sub-routes
- All routes require authentication + admin role check

#### 2.2 Admin Sub-Routes

- `src/routes/admin/auth.routes.ts` - Admin authentication (login, profile)
- `src/routes/admin/permission.routes.ts` - Permission management (CRUD)
- `src/routes/admin/role.routes.ts` - Role management (extend existing)
- `src/routes/admin/dashboard.routes.ts` - Admin dashboard stats
- `src/routes/admin/coaching-center.routes.ts` - Coaching center management
- `src/routes/admin/employee.routes.ts` - Employee management
- `src/routes/admin/batch.routes.ts` - Batch management
- `src/routes/admin/booking.routes.ts` - Booking management
- `src/routes/admin/student.routes.ts` - Student management
- `src/routes/admin/user.routes.ts` - User management
- `src/routes/admin/settings.routes.ts` - Settings management
- (Add more as needed)

### 3. Middleware

#### 3.1 Permission Middleware (`src/middleware/permission.middleware.ts`)

Create middleware functions:

- `requirePermission(section: string, action: string)` - Checks if user has specific permission
- `requireAnyPermission(section: string, actions: string[])` - Checks if user has any of the actions
- `requireAllPermissions(section: string, actions: string[])` - Checks if user has all actions
- Super Admin bypass: Automatically allows if user role is `super_admin`

#### 3.2 Admin Middleware (`src/middleware/admin.middleware.ts`)

- `requireAdmin()` - Ensures user is authenticated and has admin role (super_admin, admin, employee, agent, etc.)
- Validates user is active and not deleted

### 4. Services

#### 4.1 Permission Service (`src/services/permission.service.ts`)

- `checkPermission(userId: string, section: string, action: string): Promise<boolean>`
- `getUserPermissions(userId: string): Promise<Permission[]>`
- `getRolePermissions(roleId: string): Promise<Permission[]>`
- `hasPermission(roleId: string, section: string, action: string): Promise<boolean>`
- Uses caching (Redis) for performance

#### 4.2 Admin Service (`src/services/admin.service.ts`)

- `getDashboardStats()` - Get admin dashboard statistics
- `getAllSections()` - Get list of all available sections
- `getAllActions()` - Get list of all available actions

### 5. Controllers

#### 5.1 Admin Auth Controller (`src/controllers/admin/adminAuth.controller.ts`)

- `loginAdmin` - Admin login (separate from regular auth)
- `getAdminProfile` - Get admin profile
- `updateAdminProfile` - Update admin profile
- `changePassword` - Change admin password

#### 5.2 Permission Controller (`src/controllers/admin/permission.controller.ts`)

- `getPermissions` - Get all permissions (filtered by role if not super_admin)
- `getPermissionById` - Get single permission
- `createPermission` - Create new permission (super_admin only)
- `updatePermission` - Update permission (super_admin only)
- `deletePermission` - Delete permission (super_admin only)
- `getPermissionsByRole` - Get all permissions for a specific role
- `bulkUpdatePermissions` - Bulk update permissions for a role (super_admin only)
- `getAvailableSections` - Get list of all sections
- `getAvailableActions` - Get list of all actions

#### 5.3 Admin Dashboard Controller (`src/controllers/admin/dashboard.controller.ts`)

- `getDashboardStats` - Get dashboard statistics (users, coaching centers, bookings, etc.)

#### 5.4 Admin Section Controllers

Create admin versions of existing controllers for each section:

- `src/controllers/admin/coachingCenter.controller.ts`
- `src/controllers/admin/employee.controller.ts`
- `src/controllers/admin/batch.controller.ts`
- `src/controllers/admin/booking.controller.ts`
- `src/controllers/admin/student.controller.ts`
- `src/controllers/admin/user.controller.ts`
- (Each uses permission middleware)

### 6. Validations

#### 6.1 Permission Validations (`src/validations/permission.validation.ts`)

- Create permission schema
- Update permission schema
- Bulk update permissions schema

#### 6.2 Admin Auth Validations (`src/validations/adminAuth.validation.ts`)

- Admin login schema
- Update profile schema
- Change password schema

### 7. Seed Scripts

#### 7.1 Seed Default Permissions (`scripts/seed-permissions.ts`)

- Create default permissions for existing roles
- Super Admin gets all permissions
- Admin gets most permissions (except permission management)
- Employee and Agent get limited permissions

### 8. Integration

#### 8.1 Update Main Routes (`src/routes/index.ts`)

- Add admin routes: `router.use('/admin', adminRoutes)`

#### 8.2 Update App (`src/app.ts`)

- Ensure admin routes are registered

### 9. Documentation

#### 9.1 Update Swagger (`src/config/swagger.ts`)

- Add admin routes documentation
- Add permission management endpoints
- Add section and action enums to schemas

## Permission Flow

```
Request → Authenticate → Check Admin Role → Check Permission → Controller
```

1. User makes request to `/admin/*`
2. `authenticate` middleware validates JWT token
3. `requireAdmin` middleware checks if user has admin role
4. `requirePermission` middleware checks specific permission
5. If Super Admin, bypass permission check
6. If permission exists and is active, allow access
7. Otherwise, return 403 Forbidden

## Default Permissions Structure

- **Super Admin**: All permissions (bypassed in middleware)
- **Admin**: Most permissions except permission management
- **Employee**: Limited view/create/update on assigned sections
- **Agent**: View-only on most sections, limited create/update

## Key Files to Create/Modify

### New Files:

- `src/models/permission.model.ts`
- `src/enums/section.enum.ts`
- `src/middleware/permission.middleware.ts`
- `src/middleware/admin.middleware.ts`
- `src/services/permission.service.ts`
- `src/services/admin.service.ts`
- `src/routes/admin/index.ts`
- `src/routes/admin/auth.routes.ts`
- `src/routes/admin/permission.routes.ts`
- `src/routes/admin/dashboard.routes.ts`
- `src/routes/admin/*.routes.ts` (for each section)
- `src/controllers/admin/*.controller.ts` (for each admin feature)
- `src/validations/permission.validation.ts`
- `src/validations/adminAuth.validation.ts`
- `scripts/seed-permissions.ts`

### Modified Files:

- `src/routes/index.ts` - Add admin routes
- `src/models/role.model.ts` - May need to add admin-specific fields
- `src/enums/defaultRoles.enum.ts` - Add EMPLOYEE, AGENT if not present
- `src/config/swagger.ts` - Add admin API documentation

## Security Considerations

1. **Super Admin Protection**: Super Admin permissions cannot be modified through API
2. **Permission Validation**: All permission checks validate role exists and is active
3. **Audit Logging**: Log all permission changes for audit trail
4. **Caching**: Cache permissions in Redis for performance, invalidate on updates
5. **Input Validation**: Validate all section and action names against enums

## Testing Strategy

1. Test Super Admin has full access
2. Test permission creation/update/deletion
3. Test permission checking for each role
4. Test admin routes are protected
5. Test permission middleware works correctly
6. Test bulk permission updates