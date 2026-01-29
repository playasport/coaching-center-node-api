# How to Add a New Section to Admin Panel

Simple step-by-step guide to add a new section and manage its permissions.

---

## Step 1: Add Section to Enum

**File:** `src/enums/section.enum.ts`

```typescript
export enum Section {
  // ... existing sections ...
  NEW_SECTION = 'new_section',  // Add your section here
}
```

**Example:**
```typescript
export enum Section {
  COACHING_CENTER = 'coaching_center',
  USER = 'user',
  EMPLOYEE = 'employee',
  BATCH = 'batch',
  NEW_SECTION = 'new_section',  // ← Add this
}
```

---

## Step 2: Create Backend Controller

**File:** `src/controllers/admin/newSection.controller.ts`

```typescript
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

// Get all items
export const getAllItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Your database query here
    const items = [];
    const total = 0;

    const response = new ApiResponse(200, {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Items retrieved successfully');
    
    res.json(response);
  } catch (error) {
    logger.error('Get items error:', error);
    throw new ApiError(500, 'Internal server error');
  }
};

// Get item by ID
export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Your database query here
    const item = {};
    
    const response = new ApiResponse(200, { item }, 'Item retrieved successfully');
    res.json(response);
  } catch (error) {
    logger.error('Get item error:', error);
    throw new ApiError(500, 'Internal server error');
  }
};

// Create item
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    // Your database create logic here
    const item = {};
    
    const response = new ApiResponse(201, { item }, 'Item created successfully');
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create item error:', error);
    throw new ApiError(500, 'Internal server error');
  }
};

// Update item
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    // Your database update logic here
    const item = {};
    
    const response = new ApiResponse(200, { item }, 'Item updated successfully');
    res.json(response);
  } catch (error) {
    logger.error('Update item error:', error);
    throw new ApiError(500, 'Internal server error');
  }
};

// Delete item
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Your database delete logic here
    
    const response = new ApiResponse(200, null, 'Item deleted successfully');
    res.json(response);
  } catch (error) {
    logger.error('Delete item error:', error);
    throw new ApiError(500, 'Internal server error');
  }
};
```

---

## Step 3: Create Backend Routes

**File:** `src/routes/admin/new-section.routes.ts`

```typescript
import { Router } from 'express';
import * as newSectionController from '../../controllers/admin/newSection.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// GET /admin/new-section - List all items (requires VIEW permission)
router.get(
  '/',
  requirePermission(Section.NEW_SECTION, Action.VIEW),
  newSectionController.getAllItems
);

// GET /admin/new-section/:id - Get item by ID (requires VIEW permission)
router.get(
  '/:id',
  requirePermission(Section.NEW_SECTION, Action.VIEW),
  newSectionController.getItemById
);

// POST /admin/new-section - Create item (requires CREATE permission)
router.post(
  '/',
  requirePermission(Section.NEW_SECTION, Action.CREATE),
  newSectionController.createItem
);

// PATCH /admin/new-section/:id - Update item (requires UPDATE permission)
router.patch(
  '/:id',
  requirePermission(Section.NEW_SECTION, Action.UPDATE),
  newSectionController.updateItem
);

// DELETE /admin/new-section/:id - Delete item (requires DELETE permission)
router.delete(
  '/:id',
  requirePermission(Section.NEW_SECTION, Action.DELETE),
  newSectionController.deleteItem
);

export default router;
```

---

## Step 4: Register Route

**File:** `src/routes/admin/index.ts`

```typescript
import { Router } from 'express';
import adminAuthRoutes from './auth.routes';
import permissionRoutes from './permission.routes';
import dashboardRoutes from './dashboard.routes';
import coachingCenterRoutes from './coaching-center.routes';
import userRoutes from './user.routes';
import newSectionRoutes from './new-section.routes';  // ← Add this import

const router = Router();

router.use('/auth', adminAuthRoutes);
router.use('/permissions', permissionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/coaching-centers', coachingCenterRoutes);
router.use('/users', userRoutes);
router.use('/new-section', newSectionRoutes);  // ← Add this line

export default router;
```

---

## Step 5: Add Frontend Menu Item

**File:** `admin-panel-demo/index.html`

Add to sidebar navigation (around line 55):

```html
<a href="#" class="nav-item" data-page="new-section" data-section="new_section">
    <span class="nav-icon">🔧</span>
    <span>New Section</span>
</a>
```

**Important:**
- `data-page` = page identifier (used in JavaScript)
- `data-section` = section enum value (must match enum exactly: `new_section`)

---

## Step 6: Create Frontend Page

**File:** `admin-panel-demo/index.html`

Add page HTML (after other pages):

```html
<!-- New Section Page -->
<div id="new-sectionPage" class="page">
    <div class="page-header">
        <h2>New Section Management</h2>
    </div>
    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="newSectionTableBody">
                <tr><td colspan="4" class="text-center">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>
```

---

## Step 7: Add Frontend JavaScript

**File:** `admin-panel-demo/app.js`

### 7.1 Add to page title mapping:

```javascript
function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'permissions': 'Permission Management',
        'users': 'User Management',
        'coaching-centers': 'Coaching Center Management',
        'new-section': 'New Section Management',  // ← Add this
        'profile': 'My Profile',
    };
    return titles[page] || 'Dashboard';
}
```

### 7.2 Add navigation case:

```javascript
// In navigateToPage() function, add to switch statement:
case 'new-section':
    if (hasPermission('new_section', 'view')) {
        loadNewSection();
    } else {
        showToast('You do not have permission to view this page', 'error');
    }
    break;
```

### 7.3 Add load function:

```javascript
// New Section Management
async function loadNewSection() {
    if (!hasPermission('new_section', 'view')) {
        showToast('You do not have permission to view this page', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest('/admin/new-section');
        const items = response.data.items;

        const tbody = document.getElementById('newSectionTableBody');
        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No items found</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            const canEdit = hasPermission('new_section', 'update');
            const canDelete = hasPermission('new_section', 'delete');
            
            const actionButtons = [];
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editItem('${item.id}')">Edit</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">Delete</button>`);
            }

            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name || 'N/A'}</td>
                <td>${item.status || 'Active'}</td>
                <td class="action-buttons">${actionButtons.join(' ') || '<span class="text-muted">No actions</span>'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showToast(error.message || 'Failed to load items', 'error');
    } finally {
        hideLoading();
    }
}

function editItem(itemId) {
    if (!hasPermission('new_section', 'update')) {
        showToast('You do not have permission to edit', 'error');
        return;
    }
    // Your edit logic here
    showToast(`Edit item ${itemId}`, 'success');
}

async function deleteItem(itemId) {
    if (!hasPermission('new_section', 'delete')) {
        showToast('You do not have permission to delete', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/new-section/${itemId}`, {
            method: 'DELETE',
        });
        showToast('Item deleted successfully!', 'success');
        loadNewSection();
    } catch (error) {
        showToast(error.message || 'Failed to delete item', 'error');
    } finally {
        hideLoading();
    }
}
```

---

## Step 8: Manage Permissions via Admin Panel

### Option 1: Via Admin Panel UI (Recommended)

1. **Login as Super Admin**
   - Email: `admin@playasport.in`
   - Password: `Admin@123`

2. **Go to Permissions Page**
   - Click "Permissions" in sidebar

3. **Click "Add Permission"**

4. **Fill the form:**
   - **Role:** Select role (e.g., Admin, Employee)
   - **Section:** Select your new section (e.g., `new_section`)
   - **Actions:** Check the actions you want to allow:
     - ✅ View (to see the page)
     - ✅ Create (to add new items)
     - ✅ Update (to edit items)
     - ✅ Delete (to remove items)
   - **Active:** ✅ Checked

5. **Click "Save"**

6. **Done!** Users with that role now have the permissions you set.

### Option 2: Via Seed Script

**File:** `scripts/seed-permissions.ts`

Add to default permissions:

```typescript
{
  role: adminRoleId,
  section: Section.NEW_SECTION,
  actions: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
  isActive: true,
}
```

Then run:
```bash
npm run seed:permissions
```

---

## Quick Checklist

- [ ] Added section to `Section` enum
- [ ] Created controller file
- [ ] Created routes file with permission middleware
- [ ] Registered route in `admin/index.ts`
- [ ] Added menu item to HTML with `data-section` attribute
- [ ] Created page HTML
- [ ] Added JavaScript functions
- [ ] Updated page title mapping
- [ ] Added navigation case
- [ ] Set up permissions via Admin Panel

---

## How Permissions Work

### Permission Structure:
```
Role → Section → Actions
```

**Example:**
- **Role:** Admin
- **Section:** `new_section`
- **Actions:** `view`, `create`, `update`, `delete`

This means: Users with "Admin" role can view, create, update, and delete items in the "new_section" section.

### Automatic Features:

1. **Menu Visibility**
   - Menu item automatically shows/hides based on `VIEW` permission
   - No code needed!

2. **Page Access**
   - Page automatically checks permission before loading
   - Shows error if no permission

3. **Action Buttons**
   - Edit button shows only if user has `UPDATE` permission
   - Delete button shows only if user has `DELETE` permission
   - Add button shows only if user has `CREATE` permission

4. **API Protection**
   - Backend routes automatically check permissions
   - Returns 403 Forbidden if no permission

---

## Example: Adding "Employee" Section

### 1. Enum (already exists):
```typescript
EMPLOYEE = 'employee',
```

### 2. Backend:
- Create `src/controllers/admin/employee.controller.ts`
- Create `src/routes/admin/employee.routes.ts`
- Register in `src/routes/admin/index.ts`

### 3. Frontend:
- Add menu item: `data-section="employee"`
- Create page: `id="employeesPage"`
- Add JavaScript: `loadEmployees()` function

### 4. Permissions:
- Login as Super Admin
- Go to Permissions
- Add permission for "employee" section
- Assign to desired roles

---

## Troubleshooting

### Menu item not showing?
- Check `data-section` matches enum value exactly
- Verify user has `VIEW` permission for that section
- Check browser console for errors

### Permission denied errors?
- Verify permission exists in database
- Check permission is active (`isActive: true`)
- Verify user has the correct role
- Check section name matches exactly

### Page not loading?
- Check JavaScript function exists
- Verify API endpoint is correct
- Check browser console for errors
- Verify route is registered

---

## Summary

**To add a new section:**
1. Add to enum (5 seconds)
2. Create controller + routes (5 minutes)
3. Add frontend menu + page (5 minutes)
4. Set permissions via Admin Panel (1 minute)

**Total time: ~10-15 minutes**

**To manage permissions:**
- Login as Super Admin
- Go to Permissions page
- Add/Edit permissions for any role
- Done!

The permission system handles everything else automatically! 🎉
