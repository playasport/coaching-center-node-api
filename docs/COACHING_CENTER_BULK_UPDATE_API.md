# Coaching Center Bulk Update API – Frontend Guide

Export and import coaching center basic details via Excel. Use **Export** to get a template, edit values, then **Import** to bulk update.

---

## Overview

| Action | Method | Endpoint |
|--------|--------|----------|
| Export | `GET` | `/api/v1/admin/coaching-centers/export/basic-details` |
| Import | `POST` | `/api/v1/admin/coaching-centers/import` |

Both require admin authentication and appropriate permissions.

---

## 1. Export Basic Details

Downloads an Excel file (`.xlsx`) with editable basic fields for bulk update.

**Endpoint:** `GET /api/v1/admin/coaching-centers/export/basic-details`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Filter by Academy owner ID |
| `status` | string | No | `draft` or `published` |
| `search` | string | No | Search by center name, email, mobile |
| `sportId` | string | No | Filter by sport ID |
| `isActive` | string | No | `true` or `false` |
| `approvalStatus` | string | No | `approved`, `rejected`, `pending_approval` |
| `startDate` | string | No | YYYY-MM-DD |
| `endDate` | string | No | YYYY-MM-DD |

### Response

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Body:** Binary Excel file
- **Suggested filename:** `coaching-centers-basic-details-{date}.xlsx`

### Excel Columns (Do not change header names)

| Column | Editable | Format | Example |
|--------|----------|--------|---------|
| Center ID | No | UUID or ObjectId | Used for matching – do not edit |
| Center Name | Yes | Text | "Elite Sports Academy" |
| Email | Yes | Text | "academy@example.com" |
| Age Min | Yes | Number | 5 |
| Age Max | Yes | Number | 18 |
| Allowed Genders | Yes | Comma-separated | `male, female` or `male, female, other` |
| Allowed Disabled | Yes | Yes/No | `Yes` or `No` |
| Only For Disabled | Yes | Yes/No | `Yes` or `No` |
| Address Line1 | Yes | Text | "123 Main Street" |
| Address Line2 | Yes | Text | "Building A" |
| City | Yes | Text | "Mumbai" |
| State | Yes | Text | "Maharashtra" |
| Country | Yes | Text | "India" |
| Pincode | Yes | Text | "400001" |
| Latitude | Yes | Number | 19.0760 |
| Longitude | Yes | Number | 72.8777 |

---

## 2. Import Basic Details

Uploads an edited Excel file and applies bulk updates. Blank cells keep existing values.

**Endpoint:** `POST /api/v1/admin/coaching-centers/import`

### Request

- **Content-Type:** `multipart/form-data`
- **Field name:** `file`
- **File type:** `.xlsx` or `.xls`
- **Max size:** 10 MB

### Response

```json
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "total": 50,
    "updated": 45,
    "skipped": 3,
    "errors": [
      {
        "row": 12,
        "centerId": "abc-123-uuid",
        "message": "Coaching center not found"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total rows processed |
| `updated` | number | Centers updated successfully |
| `skipped` | number | Rows skipped (empty Center ID or no changes) |
| `errors` | array | Failed rows with row number, centerId, and message |

---

## Frontend Implementation

### Export (Download Excel)

```javascript
// Build query string from filters
const params = new URLSearchParams({
  status: filters.status || '',
  isActive: filters.isActive ?? '',
  // ... other filters
});

const response = await fetch(
  `${API_BASE}/admin/coaching-centers/export/basic-details?${params}`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `coaching-centers-basic-details-${new Date().toISOString().split('T')[0]}.xlsx`;
a.click();
window.URL.revokeObjectURL(url);
```

### Import (Upload Excel)

```javascript
const formData = new FormData();
formData.append('file', file); // File from <input type="file" accept=".xlsx,.xls" />

const response = await fetch(
  `${API_BASE}/admin/coaching-centers/import`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }
);

const result = await response.json();
// result.data: { total, updated, skipped, errors[] }
if (result.data.errors?.length) {
  // Show errors to user
  result.data.errors.forEach((e) => {
    console.warn(`Row ${e.row}: ${e.message}`);
  });
}
```

### React Example (File Input)

```jsx
const [file, setFile] = useState(null);
const [importResult, setImportResult] = useState(null);

const handleImport = async () => {
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/v1/admin/coaching-centers/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  setImportResult(data.data);
};

return (
  <>
    <input
      type="file"
      accept=".xlsx,.xls"
      onChange={(e) => setFile(e.target.files?.[0])}
    />
    <button onClick={handleImport}>Import</button>
    {importResult && (
      <p>
        Updated: {importResult.updated} / {importResult.total}
        {importResult.errors?.length > 0 && (
          <span> Errors: {importResult.errors.length}</span>
        )}
      </p>
    )}
  </>
);
```

---

## Permissions

| Action | Required Permission |
|--------|---------------------|
| Export | `coaching_center:view` |
| Import | `coaching_center:update` |

---

## Notes

- **Blank cells** in import = no change; existing values are preserved.
- **Center ID** is the row identifier; do not change it when editing.
- **Email** is stored in lowercase.
- **Allowed Genders** must be one or more of: `male`, `female`, `other` (comma-separated).
- **Yes/No** fields: use `Yes`, `No`, `true`, `false`, `1`, `0`.
- Agents can only update centers they added.
- Export uses the same filters as the main coaching centers list (date range, status, sport, etc.).
