# Role Management in Admin Panel

## Overview

Role management APIs have been created for the admin panel, allowing Super Admins to manage roles dynamically.

## Is Managing Roles from Admin Panel Better?

### ✅ **Yes, Managing Roles from Admin Panel is Better**

**Reasons:**

1. **Roles are Business Logic, Not Infrastructure**
   - Roles define WHO can do things (data/business logic)
   - Unlike sections which define WHAT can be done (infrastructure)
   - Roles can change based on business needs

2. **Flexibility**
   - Can add new roles without code deployment
   - Can adjust `visibleToRoles` without code changes
   - Business users can manage role visibility

3. **Practical Use Cases**
   - Adding department-specific roles
   - Creating custom roles for clients
   - Adjusting role visibility rules
   - Managing role descriptions

4. **Safety Features**
   - Default roles are protected (cannot be deleted)
   - Cannot create duplicate default roles
   - Validation prevents invalid role names
   - Checks for users before deletion

## API Endpoints

### Base URL: `/api/v1/admin/roles`

### 1. Get All Roles
**GET** `/admin/roles`
- **Permission Required:** `role:view`
- **Access:** All admins with permission
- **Response:** List of all roles with full details

### 2. Get Role by ID
**GET** `/admin/roles/:id`
- **Permission Required:** `role:view`
- **Access:** All admins with permission
- **Response:** Single role details

### 3. Create Role
**POST** `/admin/roles`
- **Permission Required:** `role:create` + **Super Admin only**
- **Access:** Super Admin only
- **Request Body:**
  ```json
  {
    "name": "manager",
    "description": "Manager role with management permissions",
    "visibleToRoles": ["super_admin", "admin"]
  }
  ```
- **Restrictions:**
  - Role name must be lowercase with numbers and underscores only (e.g., "test_56", "new_role_123")
  - Cannot create default system roles
  - Role name must be unique

### 4. Update Role
**PATCH** `/admin/roles/:id`
- **Permission Required:** `role:update` + **Super Admin only**
- **Access:** Super Admin only
- **Request Body:**
  ```json
  {
    "description": "Updated description",
    "visibleToRoles": ["super_admin", "admin", "academy"]
  }
  ```
- **Restrictions:**
  - For default roles: Only `description` and `visibleToRoles` can be updated
  - For custom roles: All fields can be updated

### 5. Delete Role
**DELETE** `/admin/roles/:id`
- **Permission Required:** `role:delete` + **Super Admin only**
- **Access:** Super Admin only
- **Restrictions:**
  - Cannot delete default system roles
  - Cannot delete if role is assigned to any users

## Security Features

### 1. Default Role Protection
- Default roles (super_admin, admin, user, academy, etc.) cannot be deleted
- Default roles cannot be recreated
- Default role names cannot be changed (only description and visibility)

### 2. Validation
- Role name format: lowercase with numbers and underscores only (e.g., "test_56", "new_role_123")
- Role name uniqueness check
- `visibleToRoles` validation (must be valid role names)
- User assignment check before deletion

### 3. Permission-Based Access
- View: All admins with `role:view` permission
- Create/Update/Delete: Super Admin only (additional check)

## Default Roles

These roles are protected and cannot be deleted:

- `super_admin` - Super Administrator
- `admin` - Administrator
- `user` - Regular user
- `academy` - Academy user
- `student` - Student
- `guardian` - Guardian
- `employee` - Employee
- `agent` - Agent

## Role Model

```typescript
{
  id: string;              // MongoDB ObjectId
  name: string;            // Role name (unique, lowercase with underscores)
  description: string;     // Role description (optional)
  visibleToRoles: string[]; // Array of role names that can view this role
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### Create a New Role

```bash
POST /api/v1/admin/roles
Authorization: Bearer <super_admin_token>

{
  "name": "department_manager",
  "description": "Department manager with department-specific permissions",
  "visibleToRoles": ["super_admin", "admin"]
}
```

### Update Role Visibility

```bash
PATCH /api/v1/admin/roles/:id
Authorization: Bearer <super_admin_token>

{
  "visibleToRoles": ["super_admin", "admin", "academy", "user"]
}
```

### Delete a Custom Role

```bash
DELETE /api/v1/admin/roles/:id
Authorization: Bearer <super_admin_token>
```

**Note:** Will fail if:
- Role is a default system role
- Any users are assigned to this role

## Admin Panel Integration

The admin panel demo includes:
- ✅ Role management page
- ✅ Create role modal
- ✅ Edit role functionality
- ✅ Delete role with confirmation
- ✅ Permission-based UI (buttons show/hide)
- ✅ Default role protection indicators

## Best Practices

1. **Role Naming:**
   - Use lowercase with underscores: `department_manager`
   - Be descriptive: `coaching_center_manager` not `ccm`
   - Keep names consistent

2. **VisibleToRoles:**
   - Set `null` for sensitive roles (only Super Admin/Admin can see)
   - Set array for roles that should be visible to specific roles
   - Consider business needs when setting visibility

3. **Role Descriptions:**
   - Always add clear descriptions
   - Explain what the role is for
   - Document any special permissions

4. **Before Deleting:**
   - Check if any users have this role
   - Consider if role might be needed in future
   - Document why role is being deleted

## Comparison: Code vs Admin Panel

| Aspect | Code-Based | Admin Panel ✅ |
|--------|------------|---------------|
| **Flexibility** | Requires deployment | Instant changes |
| **Business Users** | Need developer | Can manage themselves |
| **Safety** | Code review | Built-in validations |
| **Use Case** | Infrastructure | Business logic |
| **Frequency** | Rare changes | Frequent changes |

## Conclusion

**Managing roles from admin panel is the better option** because:
- ✅ Roles are business logic, not infrastructure
- ✅ Provides flexibility without code deployment
- ✅ Super Admin can manage roles dynamically
- ✅ Built-in safety features protect system integrity
- ✅ Better user experience for business users

The system maintains security by:
- Protecting default roles
- Requiring Super Admin for modifications
- Validating all inputs
- Checking dependencies before deletion
