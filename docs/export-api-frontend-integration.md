# Export API - Frontend Integration Guide

This guide explains how to integrate the Coaching Centers Export API in your frontend application.

## Base URL

```
Development: http://localhost:3001/api/v1
Production: https://api.playasport.in/api/v1
```

## Authentication

All export endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Available Endpoints

### 1. Export to Excel
```
GET /admin/coaching-centers/export/excel
```

### 2. Export to PDF
```
GET /admin/coaching-centers/export/pdf
```

### 3. Export to CSV
```
GET /admin/coaching-centers/export/csv
```

### 4. Export All Academies (Convenience Endpoint)
```
GET /admin/coaching-centers/export/academies?format=excel
```

### 5. Batch Export & Import (Admin)

**Export Batches to Excel:**
```
GET /admin/batches/export
```
Query params: `userId`, `centerId`, `sportId`, `status`, `isActive`

**Bulk Update Batches (Import):**
```
POST /admin/batches/import
```
Body: `multipart/form-data` with `file` (Excel .xlsx from export)

Use Export first to get template → edit values → Import to bulk update. Blank cells = no change.

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `userId` | string | Filter by Academy owner ID (UUID) | `f316a86c-2909-4d32-8983-eb225c715bcb` |
| `status` | string | Filter by center status | `published` or `draft` |
| `isActive` | string | Filter by active status | `true` or `false` |
| `sportId` | string | Filter by sport ID | `507f1f77bcf86cd799439011` |
| `search` | string | Search by center name, email, or mobile | `Elite Sports` |
| `startDate` | string (YYYY-MM-DD) | Filter by start date | `2024-01-01` |
| `endDate` | string (YYYY-MM-DD) | Filter by end date | `2024-12-31` |
| `format` | string | Export format (only for `/export/academies`) | `excel`, `pdf`, or `csv` |

## Frontend Implementation Examples

### React/Next.js Example

```typescript
import axios from 'axios';

// Export to Excel
const exportToExcel = async (filters: {
  startDate?: string;
  endDate?: string;
  status?: string;
  isActive?: string;
  sportId?: string;
  search?: string;
}) => {
  try {
    const token = localStorage.getItem('authToken');
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);
    if (filters.isActive) params.append('isActive', filters.isActive);
    if (filters.sportId) params.append('sportId', filters.sportId);
    if (filters.search) params.append('search', filters.search);

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/coaching-centers/export/excel?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file downloads
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `coaching-centers-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

// Export All Academies (Convenience)
const exportAllAcademies = async (format: 'excel' | 'pdf' | 'csv', dateRange?: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const token = localStorage.getItem('authToken');
    const params = new URLSearchParams();
    
    params.append('format', format);
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/coaching-centers/export/academies?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      }
    );

    // Determine file extension
    const extensions = {
      excel: 'xlsx',
      pdf: 'pdf',
      csv: 'csv',
    };

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `academies-${new Date().toISOString().split('T')[0]}.${extensions[format]}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
```

### Vue.js Example

```javascript
// Export utility function
export const exportCoachingCenters = async (format, filters = {}) => {
  try {
    const token = localStorage.getItem('authToken');
    const params = new URLSearchParams();
    
    // Add filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const endpoint = format === 'academies' 
      ? `/admin/coaching-centers/export/academies?format=${filters.format || 'excel'}`
      : `/admin/coaching-centers/export/${format}`;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}${endpoint}${format !== 'academies' ? '?' + params.toString() : '&' + params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const extensions = {
      excel: 'xlsx',
      pdf: 'pdf',
      csv: 'csv',
    };
    
    link.download = `coaching-centers-${new Date().toISOString().split('T')[0]}.${extensions[format] || 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};
```

### Angular Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private apiUrl = 'http://localhost:3001/api/v1';

  constructor(private http: HttpClient) {}

  exportToExcel(filters: any): Observable<Blob> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    const params = this.buildParams(filters);
    
    return this.http.get(
      `${this.apiUrl}/admin/coaching-centers/export/excel?${params}`,
      { headers, responseType: 'blob' }
    ).pipe(
      map(blob => {
        this.downloadFile(blob, 'xlsx');
        return blob;
      })
    );
  }

  exportAllAcademies(format: 'excel' | 'pdf' | 'csv', dateRange?: any): Observable<Blob> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    let params = `format=${format}`;
    if (dateRange?.startDate) params += `&startDate=${dateRange.startDate}`;
    if (dateRange?.endDate) params += `&endDate=${dateRange.endDate}`;

    const extensions = { excel: 'xlsx', pdf: 'pdf', csv: 'csv' };
    
    return this.http.get(
      `${this.apiUrl}/admin/coaching-centers/export/academies?${params}`,
      { headers, responseType: 'blob' }
    ).pipe(
      map(blob => {
        this.downloadFile(blob, extensions[format]);
        return blob;
      })
    );
  }

  private buildParams(filters: any): string {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    return params.toString();
  }

  private downloadFile(blob: Blob, extension: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coaching-centers-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private getToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}
```

## Usage Examples

### Export All Published Academies (Excel)
```javascript
await exportAllAcademies('excel');
```

### Export with Date Range
```javascript
await exportAllAcademies('pdf', {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

### Export with Filters
```javascript
await exportToExcel({
  status: 'published',
  isActive: 'true',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  sportId: '507f1f77bcf86cd799439011'
});
```

## Response Types

- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PDF**: `application/pdf`
- **CSV**: `text/csv`

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)

## Notes

1. **File Naming**: Files are automatically named with the current date (e.g., `coaching-centers-2024-12-29.xlsx`)
2. **Large Exports**: For large datasets, the export may take some time. Consider showing a loading indicator.
3. **Browser Compatibility**: File download works in all modern browsers.
4. **CORS**: Ensure your frontend domain is whitelisted in the API CORS configuration.

## Swagger Documentation

For complete API documentation, refer to:
- Swagger UI: `http://localhost:3001/api-docs`
- OpenAPI Spec: `docs/export-api-swagger.yaml`

