# Admin Logout All Devices - Frontend Integration Guide

## Overview

The admin logout all devices endpoint allows administrators to log out from all devices simultaneously. This is useful for security purposes when an admin suspects their account has been compromised or wants to ensure all sessions are terminated.

## API Endpoint

**Endpoint:** `POST /api/v1/admin/auth/logout-all`

**Base URL:** 
- Development: `http://localhost:3001`
- Production: `https://coachapi.playasport.in`

**Full URL:** `https://coachapi.playasport.in/api/v1/admin/auth/logout-all`

## Authentication

- **Required:** Yes
- **Type:** Bearer Token
- **Header:** `Authorization: Bearer {accessToken}`

## Request

### Headers
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Body
No body required (empty request)

## Response

### Success Response (200)
```json
{
  "success": true,
  "message": "Logged out from all devices successfully",
  "data": null
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "statusCode": 401
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions",
  "statusCode": 403
}
```

## Frontend Integration

### JavaScript/TypeScript Example

```typescript
/**
 * Logout admin from all devices
 * This will invalidate all tokens and device sessions for the current user
 */
const logoutAllDevices = async (): Promise<void> => {
  const accessToken = localStorage.getItem('adminAccessToken');
  
  if (!accessToken) {
    throw new Error('No access token found');
  }

  try {
    const response = await fetch('https://coachapi.playasport.in/api/v1/admin/auth/logout-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Logout failed');
    }

    // Success - clear all local storage
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login page
    window.location.href = '/admin/login';
    
    return data;
  } catch (error) {
    console.error('Logout all devices failed:', error);
    
    // Even if the request fails, clear local tokens for security
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login
    window.location.href = '/admin/login';
    
    throw error;
  }
};
```

### React Hook Example

```typescript
import { useState } from 'react';

interface LogoutAllResponse {
  success: boolean;
  message: string;
  data: null;
}

export const useAdminLogoutAll = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoutAllDevices = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const accessToken = localStorage.getItem('adminAccessToken');
    
    if (!accessToken) {
      setError('No access token found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        'https://coachapi.playasport.in/api/v1/admin/auth/logout-all',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data: LogoutAllResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Logout failed');
      }

      // Clear all tokens and user data
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      
      // Redirect to login
      window.location.href = '/admin/login';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      
      // Clear tokens even on error
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      
      // Redirect to login
      window.location.href = '/admin/login';
    } finally {
      setLoading(false);
    }
  };

  return { logoutAllDevices, loading, error };
};
```

### React Component Example

```typescript
import React from 'react';
import { useAdminLogoutAll } from '../hooks/useAdminLogoutAll';

const AdminSettings: React.FC = () => {
  const { logoutAllDevices, loading, error } = useAdminLogoutAll();

  const handleLogoutAll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to log out from all devices? This will invalidate all your active sessions.'
    );

    if (confirmed) {
      await logoutAllDevices();
    }
  };

  return (
    <div className="admin-settings">
      <h2>Security Settings</h2>
      
      <div className="logout-section">
        <h3>Logout from All Devices</h3>
        <p>
          This will log you out from all devices and invalidate all active sessions.
          You will need to log in again on all devices.
        </p>
        
        <button
          onClick={handleLogoutAll}
          disabled={loading}
          className="btn btn-danger"
        >
          {loading ? 'Logging out...' : 'Logout from All Devices'}
        </button>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
```

### Axios Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://coachapi.playasport.in/api/v1';

const logoutAllDevices = async (): Promise<void> => {
  const accessToken = localStorage.getItem('adminAccessToken');
  
  try {
    await axios.post(
      `${API_BASE_URL}/admin/auth/logout-all`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Clear all tokens
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login
    window.location.href = '/admin/login';
  } catch (error) {
    console.error('Logout all devices failed:', error);
    
    // Clear tokens even on error
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login
    window.location.href = '/admin/login';
    
    throw error;
  }
};
```

### Vue.js Example

```vue
<template>
  <div class="admin-settings">
    <h2>Security Settings</h2>
    
    <div class="logout-section">
      <h3>Logout from All Devices</h3>
      <p>
        This will log you out from all devices and invalidate all active sessions.
      </p>
      
      <button
        @click="handleLogoutAll"
        :disabled="loading"
        class="btn btn-danger"
      >
        {{ loading ? 'Logging out...' : 'Logout from All Devices' }}
      </button>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
const error = ref(null);

const logoutAllDevices = async () => {
  loading.value = true;
  error.value = null;

  const accessToken = localStorage.getItem('adminAccessToken');
  
  if (!accessToken) {
    error.value = 'No access token found';
    loading.value = false;
    return;
  }

  try {
    const response = await fetch(
      'https://coachapi.playasport.in/api/v1/admin/auth/logout-all',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Logout failed');
    }

    // Clear all tokens
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login
    window.location.href = '/admin/login';
  } catch (err) {
    error.value = err.message || 'Logout failed';
    
    // Clear tokens even on error
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to login
    window.location.href = '/admin/login';
  } finally {
    loading.value = false;
  }
};

const handleLogoutAll = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to log out from all devices? This will invalidate all your active sessions.'
  );

  if (confirmed) {
    await logoutAllDevices();
  }
};
</script>
```

## Testing with cURL

```bash
curl -X POST "https://coachapi.playasport.in/api/v1/admin/auth/logout-all" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## Important Notes

1. **Security**: After calling this endpoint, all tokens for the user are blacklisted. The user must log in again on all devices.

2. **Token Cleanup**: Always clear local storage tokens after calling this endpoint, even if the request fails. This ensures the frontend state matches the backend state.

3. **User Experience**: Consider showing a confirmation dialog before calling this endpoint, as it will log the user out from all devices.

4. **Error Handling**: Always handle errors gracefully. If the request fails, still clear local tokens and redirect to login for security.

5. **No Body Required**: This endpoint does not require a request body. It only needs the Authorization header.

## Comparison: Logout vs Logout All

| Feature | Logout (Single Device) | Logout All Devices |
|---------|----------------------|-------------------|
| Endpoint | `POST /admin/auth/logout` | `POST /admin/auth/logout-all` |
| Request Body | `{ refreshToken }` (optional) | None |
| Scope | Current device only | All devices |
| Use Case | Normal logout | Security/logout everywhere |

## Related Endpoints

- `POST /api/v1/admin/auth/logout` - Logout from current device
- `POST /api/v1/admin/auth/login` - Login
- `POST /api/v1/admin/auth/refresh` - Refresh access token
- `GET /api/v1/admin/auth/profile` - Get admin profile

## Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Ensure the access token is valid and not expired. If expired, refresh the token first.

### Issue: 403 Forbidden
**Solution**: Ensure the user has admin permissions and the token is for an admin user.

### Issue: Network Error
**Solution**: Check network connectivity and API base URL. Clear tokens locally and redirect to login.

## Security Best Practices

1. **Always clear tokens locally** after calling logout-all, even if the request fails
2. **Show confirmation dialog** before logging out from all devices
3. **Redirect to login** immediately after logout
4. **Handle errors gracefully** - don't leave the user in an inconsistent state
5. **Log security events** - consider logging when users log out from all devices

