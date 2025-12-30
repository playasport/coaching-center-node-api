# Academy Approval Workflow Documentation

## Overview

The Academy Approval Workflow is a system that ensures quality control for coaching centers (academies) added to the platform. When an agent role creates an academy, it requires approval from a super_admin or admin before it becomes visible to end users.

## Key Features

1. **Automatic Approval Status**: When an agent creates an academy, `approval_status` is automatically set to `'pending_approval'`
2. **Approval/Rejection**: Only super_admin and admin roles can approve or reject academies
3. **Reject Reason**: When rejecting an academy, a reason can be provided and stored
4. **User Visibility**: Only approved academies (`approval_status: 'approved'`) are visible to end users
5. **Admin Filtering**: Admins can filter academies by approval status using `approvalStatus` or `rejectionStatus` query parameters

## Database Schema

### Coaching Center Model

Two new fields have been added to the Coaching Center model:

```typescript
{
  approval_status: {
    type: String,
    enum: ['approved', 'rejected', 'pending_approval'],
    default: 'approved',
    index: true,
  },
  reject_reason: {
    type: String,
    default: null,
    maxlength: 500,
  }
}
```

- **`approval_status`**: Enum field indicating the approval status of the academy
  - Values: `'approved'`, `'rejected'`, `'pending_approval'`
  - Default: `'approved'` (for academies created by super_admin, admin, or academy users)
  - Set to `'pending_approval'` automatically when created by an agent
  - Indexed for efficient querying
  - This is the single source of truth for approval state

- **`reject_reason`**: Optional string field storing the reason for rejection
  - Maximum length: 500 characters
  - Cleared when academy is approved
  - Required when rejecting an academy (recommended)

## Workflow

### 1. Academy Creation by Agent

When an agent creates an academy:

```javascript
// Automatically set in createCoachingCenterByAdmin service
if (adminUserRole === 'agent') {
  approval_status = 'pending_approval'; // Requires approval
}
```

**Result**: Academy is created with `approval_status: 'pending_approval'` and is not visible to end users.

### 2. Academy Creation by Other Roles

When super_admin, admin, or academy users create academies:

- `approval_status` defaults to `'approved'`
- Academy is immediately visible to end users (if also published and active)

### 3. Approval Process

**Who can approve/reject:**
- `super_admin` role
- `admin` role

**Who cannot approve/reject:**
- `agent` role
- `academy` role
- `employee` role
- Other roles

### 4. Approval Endpoint

**Endpoint**: `PATCH /admin/coaching-centers/:id/approval`

**Request Body**:
```json
{
  "isApproved": true,  // boolean, required
  "rejectReason": "Incomplete documentation"  // string, optional (max 500 chars)
}
```

**Response**:
```json
{
  "success": true,
  "message": "Academy approved successfully",
  "data": {
    "coachingCenter": {
      "id": "...",
      "center_name": "...",
      "approval_status": "approved",
      "reject_reason": null,
      ...
    }
  }
}
```

### 5. Rejection Process

When rejecting an academy:

```json
{
  "isApproved": false,
  "rejectReason": "Missing required documents or incomplete information"
}
```

**Result**:
- `approval_status` is set to `'rejected'`
- `reject_reason` is stored
- Academy remains hidden from end users

## API Endpoints

### Approve/Reject Academy

**Endpoint**: `PATCH /admin/coaching-centers/:id/approval`

**Authentication**: Required (Bearer token)

**Permissions**: `coaching_center:update`

**Role Restrictions**: Only `super_admin` and `admin` can access this endpoint

**Request Body**:
```json
{
  "isApproved": true,  // boolean, required
  "rejectReason": ""   // string, optional, max 500 characters
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Academy approved successfully",
  "data": {
    "coachingCenter": { ... }
  }
}
```

**Error Responses**:
- `400`: Invalid request (missing isApproved or invalid value)
- `403`: Forbidden - Only super admin and admin can approve/reject
- `404`: Coaching center not found

### Filter by Approval Status

All admin endpoints that list coaching centers and statistics now support filtering by approval status:

**Query Parameter**:
- `approvalStatus`: Filter with values `"approved"`, `"rejected"`, or `"pending_approval"`

**Examples**:
```
# Filter by approval status
GET /admin/coaching-centers?approvalStatus=pending_approval&page=1&limit=10
GET /admin/coaching-centers?approvalStatus=rejected&page=1&limit=10
GET /admin/coaching-centers?approvalStatus=approved&page=1&limit=10

# Statistics endpoint with approval status filter
GET /admin/coaching-centers/stats?approvalStatus=pending_approval
GET /admin/coaching-centers/stats?approvalStatus=rejected
GET /admin/coaching-centers/stats?approvalStatus=approved
```

**Note**: The `approvalStatus` parameter is available on both the list endpoint (`GET /admin/coaching-centers`) and the statistics endpoint (`GET /admin/coaching-centers/stats`).

## Tracking Rejected Academies

### How to Identify Rejected Academies

Rejected academies are tracked using the `approval_status` field:

1. **`approval_status: 'rejected'`** - Academy was reviewed and rejected
2. **`reject_reason: "reason text"`** - Rejection reason is stored (optional but recommended)

### Status Distinction

| Status | `approval_status` | `reject_reason` | Description |
|--------|-------------------|-----------------|-------------|
| **Pending Approval** | `'pending_approval'` | `null` | Created by agent, not yet reviewed |
| **Rejected** | `'rejected'` | `"reason text"` | Reviewed and rejected by admin |
| **Approved** | `'approved'` | `null` | Approved and visible to users |

### Querying Rejected Academies

**Option 1: Using `approvalStatus` filter (Recommended)**
```
GET /admin/coaching-centers?approvalStatus=rejected
```

**Option 2: Using `rejectionStatus` filter (Convenience)**
```
GET /admin/coaching-centers?rejectionStatus=rejected
```

**Option 3: Using MongoDB query**
```javascript
{
  approval_status: 'rejected'
}
```

**Option 4: Using `isApproved` filter (Backward compatibility)**
```
GET /admin/coaching-centers?isApproved=false
```
Then filter client-side by checking `approval_status === 'rejected'`.

### Querying Pending Approval Academies

**Option 1: Using `approvalStatus` filter (Recommended)**
```
GET /admin/coaching-centers?approvalStatus=pending_approval
```

**Option 2: Using `rejectionStatus` filter (Convenience)**
```
GET /admin/coaching-centers?rejectionStatus=pending
```

**Option 3: Using MongoDB query**
```javascript
{
  approval_status: 'pending_approval'
}
```

## User-Side Visibility

### End User Academy Listing

All user-facing academy endpoints automatically filter to show only approved academies:

- `GET /api/v1/academies` - List all academies
- `GET /api/v1/academies/:id` - Get academy by ID
- `GET /api/v1/academies/city/:cityName` - Get academies by city
- `GET /api/v1/academies/sport/:sportSlug` - Get academies by sport

**Query Applied**:
```javascript
{
  status: 'published',
  is_active: true,
  approval_status: 'approved',  // Only approved academies
  is_deleted: false
}
```

**Result**: Unapproved academies are completely hidden from end users, even if they are published and active.

## Admin Filtering

### List Coaching Centers with Approval Filter

**Endpoint**: `GET /admin/coaching-centers`

**Query Parameters**:
- `approvalStatus` (optional): Filter by approval status
  - `"approved"`: Only approved academies
  - `"rejected"`: Only rejected academies
  - `"pending_approval"`: Only pending approval academies
  - Omitted: All academies (regardless of approval status)
- `rejectionStatus` (optional): Convenience filter
  - `"rejected"`: Only rejected academies
  - `"pending"`: Only pending approval academies
- `isApproved` (optional, backward compatibility): Filter by approval status
  - `"true"`: Only approved academies
  - `"false"`: Only unapproved academies (rejected or pending)
  - Omitted: All academies (regardless of approval status)

**Example**:
```
GET /admin/coaching-centers?approvalStatus=pending_approval&status=published
GET /admin/coaching-centers?rejectionStatus=pending&status=published
```

Returns all published academies that are pending approval.

### Statistics with Approval Filter

**Endpoint**: `GET /admin/coaching-centers/stats`

**Query Parameters**:
- `approvalStatus` (optional): Filter statistics by approval status
  - `"approved"`, `"rejected"`, or `"pending_approval"`
- `isApproved` (optional, backward compatibility): Filter statistics by approval status

**Example**:
```
GET /admin/coaching-centers/stats?approvalStatus=pending_approval
GET /admin/coaching-centers/stats?isApproved=false
```

Returns statistics for unapproved academies only.

### Export with Approval Filter

All export endpoints support approval status filtering:

- `GET /admin/coaching-centers/export/excel?approvalStatus=pending_approval`
- `GET /admin/coaching-centers/export/pdf?approvalStatus=rejected`
- `GET /admin/coaching-centers/export/csv?isApproved=false` (backward compatible)

## Use Cases

### Use Case 1: Agent Creates Academy

1. Agent creates academy via admin panel
2. Academy is saved with `approval_status: 'pending_approval'`
3. Academy is not visible to end users
4. Admin/super_admin reviews the academy
5. Admin approves or rejects with reason
6. If approved, `approval_status` is set to `'approved'` and academy becomes visible to end users

### Use Case 2: Bulk Approval

1. Admin filters academies: `GET /admin/coaching-centers?approvalStatus=pending_approval`
2. Reviews list of pending academies
3. Approves each academy individually via approval endpoint
4. Approved academies (`approval_status: 'approved'`) become visible to end users

### Use Case 3: Rejection with Feedback

1. Admin reviews academy and finds issues
2. Rejects academy with detailed reason:
   ```json
   {
     "isApproved": false,
     "rejectReason": "Missing required documents: Registration certificate and tax ID. Please upload and resubmit."
   }
   ```
3. Academy `approval_status` is set to `'rejected'` and `reject_reason` is stored
4. Academy owner can see rejection reason (if exposed via API)
5. Owner can update academy and request re-approval (admin can change status back to `'pending_approval'` or `'approved'`)

## Best Practices

1. **Always provide reject reason**: When rejecting an academy, provide a clear, actionable reason
2. **Review before approval**: Ensure all required information and documents are present
3. **Monitor pending approvals**: Regularly check for academies pending approval
4. **Use filters effectively**: Use `isApproved=false` filter to find academies needing review
5. **Document rejection reasons**: Clear rejection reasons help academy owners improve their submissions

## Security Considerations

1. **Role-based access**: Only super_admin and admin can approve/reject
2. **Permission check**: Requires `coaching_center:update` permission
3. **Validation**: Request body is validated (isApproved must be boolean)
4. **Audit trail**: Approval/rejection actions are logged

## Integration Notes

### Frontend Integration

When displaying academies to end users:
- No changes needed - unapproved academies are automatically filtered out
- All existing academy listing endpoints work as before

When building admin panel:
- Add approval status filter to coaching center list
- Show approval badge/indicator in coaching center cards
- Add "Approve" and "Reject" action buttons (only for super_admin/admin)
- Display rejection reason if academy is rejected

### Backend Integration

No breaking changes to existing APIs. The approval workflow is additive:
- Existing endpoints continue to work
- New `approval_status` and `reject_reason` fields are included in responses
- Filtering by approval status is optional
- `isApproved` query parameter is supported for backward compatibility (converts to `approval_status` internally)

## Migration Notes

For existing academies in the database:
- All existing academies will have `approval_status: 'approved'` (default value)
- If you're migrating from a system that used `is_approved` boolean field, you'll need to:
  1. Set `approval_status: 'approved'` for all academies where `is_approved: true`
  2. Set `approval_status: 'pending_approval'` for all academies where `is_approved: false` and `reject_reason: null`
  3. Set `approval_status: 'rejected'` for all academies where `is_approved: false` and `reject_reason` exists
  4. Remove the `is_approved` field from the schema
- New academies created by agents will have `approval_status: 'pending_approval'`

## Related Documentation

- [Coaching Center API Documentation](./export-api-swagger.yaml)
- [Admin Panel API Collection](../postman/PlayAsport-Admin-Panel-Collection.json)
- [Export API Integration Guide](./export-api-frontend-integration.md)

