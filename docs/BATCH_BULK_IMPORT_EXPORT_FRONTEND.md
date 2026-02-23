# Batch Bulk Import & Export - Frontend Integration Guide

Frontend developers ke liye Batch Export aur Import API ka integration guide. Is doc se aap admin panel mein batch export/import feature easily add kar sakte hain.

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Export Batches](#export-batches)
5. [Import Batches](#import-batches)
6. [Frontend Implementation](#frontend-implementation)
7. [Error Handling](#error-handling)
8. [Column Reference](#column-reference)
9. [Import Rules](#import-rules)

---

## Overview

| Feature | Description |
|---------|-------------|
| **Export** | Saare batches ko Excel (.xlsx) mein download karein. Filters apply kar sakte hain. |
| **Import** | Edited Excel file upload karke multiple batches ek saath update karein (bulk update). |

**Flow:**
1. User "Export" button dabaye → Excel file download hogi
2. User Excel mein values edit kare (prices, names, etc.)
3. User "Import" button dabaye → File select kare → Bulk update ho jayega

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/admin/batches/export` | Export batches to Excel |
| `POST` | `/api/v1/admin/batches/import` | Import Excel & bulk update |

**Base URL:**
- Development: `http://localhost:3000/api/v1` (ya aapka port)
- Production: `https://api.playasport.in/api/v1`

---

## Authentication

Dono endpoints ke liye **Bearer token** required hai.

```
Authorization: Bearer <admin_access_token>
```

**Permissions:**
- Export: `batch:view`
- Import: `batch:update`

---

## Export Batches

### Request

```
GET /api/v1/admin/batches/export
```

### Query Parameters (optional filters)

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Academy owner ID se filter |
| `centerId` | string | Coaching center ID se filter |
| `sportId` | string | Sport ID se filter |
| `status` | string | `published` ya `draft` |
| `isActive` | string | `true` ya `false` |

### Response

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Body:** Excel file binary
- **Headers:** `Content-Disposition: attachment; filename="batches-export-{timestamp}.xlsx"`

### Example

```
GET /api/v1/admin/batches/export?centerId=507f1f77bcf86cd799439011&status=published
```

---

## Import Batches

### Request

```
POST /api/v1/admin/batches/import
Content-Type: multipart/form-data
```

### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Excel file (.xlsx) - export se mile ya edited |

### Response (JSON)

```json
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "total": 50,
    "updated": 48,
    "skipped": 1,
    "errors": [
      {
        "row": 12,
        "_id": "507f1f77bcf86cd799439011",
        "message": "Batch not found"
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `total` | File mein total rows |
| `updated` | Successfully update hue batches |
| `skipped` | Blank _id wale rows (skip) |
| `errors` | Failed rows ki list (row number, _id, message) |

---

## Frontend Implementation

### React / Next.js – Export

```tsx
const exportBatches = async (filters?: {
  userId?: string;
  centerId?: string;
  sportId?: string;
  status?: string;
  isActive?: string;
}) => {
  const token = localStorage.getItem('adminAccessToken'); // ya apna auth store
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.centerId) params.append('centerId', filters.centerId);
  if (filters?.sportId) params.append('sportId', filters.sportId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.isActive) params.append('isActive', filters.isActive);

  const url = `${API_BASE}/admin/batches/export?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || `batches-export-${Date.now()}.xlsx`;

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(downloadUrl);
};
```

### React / Next.js – Import

```tsx
const importBatches = async (file: File) => {
  const token = localStorage.getItem('adminAccessToken');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/admin/batches/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Import failed');
  }

  return result.data; // { total, updated, skipped, errors }
};

// Usage with file input
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    toast.error('Please upload Excel file (.xlsx or .xls)');
    return;
  }

  try {
    const data = await importBatches(file);
    toast.success(`Updated ${data.updated} of ${data.total} batches`);
    if (data.errors?.length) {
      toast.warning(`${data.errors.length} rows had errors`);
      console.table(data.errors);
    }
  } catch (err) {
    toast.error(err.message);
  }

  e.target.value = '';
};
```

### Axios – Export

```ts
import axios from 'axios';

const exportBatches = async (filters = {}) => {
  const { data } = await axios.get(`${API_BASE}/admin/batches/export`, {
    params: filters,
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `batches-export-${Date.now()}.xlsx`);
  link.click();
  window.URL.revokeObjectURL(url);
};
```

### Axios – Import

```ts
const importBatches = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post(
    `${API_BASE}/admin/batches/import`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return data.data;
};
```

---

## Error Handling

| Status | Meaning |
|--------|---------|
| `200` | Success (Export: file download, Import: JSON with result) |
| `400` | Invalid request – Import: no file, wrong format, etc. |
| `401` | Unauthorized – token missing/invalid |
| `403` | Forbidden – permission nahi hai |
| `500` | Server error |

**Import response:**
- `data.errors` check karein – kuch rows fail ho sakte hain
- `errors[].row` – Excel row number
- `errors[].message` – error reason

---

## Column Reference

Export Excel mein ye columns aate hain:

| Column | Type | Editable in Import | Notes |
|--------|------|--------------------|-------|
| `_id` | string | ❌ No | Match ke liye – **mat badlo** |
| `name` | string | ✅ | Batch name |
| `description` | string | ✅ | |
| `sportId` | string | - | Display only |
| `sportName` | string | - | Display only |
| `centerId` | string | - | Display only |
| `Coaching Center Name` | string | - | Display only |
| `coachId` | string | ✅ | Existing coach ID |
| `coachName` | string | ✅ | New name likho to naya coach create hoga |
| `gender` | string | ✅ | `male,female,others` (comma-separated) |
| `certificate_issued` | boolean | ✅ | `true`/`false` |
| `start_date` | date | ✅ | YYYY-MM-DD |
| `end_date` | date | ✅ | YYYY-MM-DD |
| `training_days` | string | ✅ | `monday,tuesday,...` |
| `individual_timings` | JSON | ✅ | `[{"day":"monday","start_time":"09:00","end_time":"11:00"}]` |
| `duration_count` | number | ✅ | 1–1000 |
| `duration_type` | string | ✅ | `day`, `week`, `month`, `year` |
| `capacity_min` | number | ✅ | |
| `capacity_max` | number | ✅ | |
| `age_min` | number | ✅ | 3–18 |
| `age_max` | number | ✅ | 3–18 |
| `admission_fee` | number | ✅ | |
| `base_price` | number | ✅ | |
| `discounted_price` | number | ✅ | |
| `is_allowed_disabled` | boolean | ✅ | `true`/`false` |
| `status` | string | ✅ | `published` / `draft` |
| `is_active` | boolean | ✅ | `true`/`false` |

---

## Import Rules

1. **Blank cell = No update** – Khali cells ko change nahi kiya jata, purani value rehti hai.
2. **`_id` mat badlo** – Batch match isi se hota hai.
3. **coachName:** Naya naam likhne par agar coach nahi milega to create karke assign kar diya jayega.
4. **File format:** Sirf `.xlsx` ya `.xls` allowed.
5. **Max size:** 10 MB.

---

## Sample UI Flow

```
┌─────────────────────────────────────────────────────┐
│  Batches List                                        │
│                                                      │
│  [Export]  [Import]                                  │
│                                                      │
│  Export: Filters select kare (optional) → Download   │
│  Import: File choose → Upload → Success/Error msg    │
└─────────────────────────────────────────────────────┘
```

**Export button:**
- Optional: userId, centerId, sportId, status, isActive filters
- Click → API call → File download

**Import button:**
- File input trigger
- User .xlsx select kare
- Upload → Show: "X batches updated, Y errors" (agar errors hon)

---

## Quick Checklist

- [ ] Bearer token har request ke saath bhejna
- [ ] Export: `responseType: 'blob'` (fetch/axios)
- [ ] Export: Blob se download link create karke file save karni
- [ ] Import: `FormData` use karke `file` field bhejna
- [ ] Import: `.xlsx` / `.xls` validation
- [ ] Import: `data.errors` check karke user ko batana
- [ ] Loading state / error toasts
- [ ] Permission: `batch:view` (export), `batch:update` (import)
