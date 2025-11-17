# Frontend Authentication Guide

## Overview

This guide explains how to implement authentication using **Access Tokens** and **Refresh Tokens** in your frontend application. The API uses a dual-token system for enhanced security.

### Token Types

- **Access Token**: Short-lived (15 minutes). Used for API requests.
- **Refresh Token**: Long-lived (7 days). Used to obtain new access tokens.

### Why Two Tokens?

- **Security**: Short-lived access tokens limit damage if compromised
- **Performance**: Refresh tokens allow seamless re-authentication
- **Revocation**: Tokens can be blacklisted on logout

---

## Authentication Flow

```
1. User Login/Register
   ↓
2. Receive: { accessToken, refreshToken }
   ↓
3. Store tokens securely
   ↓
4. Use accessToken for API requests
   ↓
5. If accessToken expires (401)
   ↓
6. Use refreshToken to get new tokens
   ↓
7. Retry original request with new accessToken
```

---

## Step 1: Login/Register

### Login Request

```javascript
// POST /api/v1/academy/auth/login
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/v1/academy/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    
    // Store user info (optional)
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    return data.data;
  } else {
    throw new Error(data.message);
  }
};
```

### Register Request

```javascript
// POST /api/v1/academy/auth/register
const register = async (userData) => {
  const response = await fetch('http://localhost:3000/api/v1/academy/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      mobile: userData.mobile,
      gender: userData.gender,
      otp: userData.otp, // OTP received via SMS
    }),
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    return data.data;
  } else {
    throw new Error(data.message);
  }
};
```

### Response Format

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Step 2: Store Tokens Securely

### Option 1: localStorage (Simpler, Less Secure)

```javascript
// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Retrieve tokens
const accessToken = localStorage.getItem('accessToken');
const refreshToken = localStorage.getItem('refreshToken');
```

**Pros**: Easy to implement, persists across sessions  
**Cons**: Vulnerable to XSS attacks

### Option 2: httpOnly Cookies (Most Secure)

**Note**: This requires backend configuration to set httpOnly cookies. Currently, the API returns tokens in response body, so you'll need to store them client-side or implement cookie-based authentication.

### Option 3: Memory Storage (Most Secure for Sensitive Apps)

```javascript
// Store in memory (session-only)
let accessToken = null;
let refreshToken = null;

const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
};

const getAccessToken = () => accessToken;
const getRefreshToken = () => refreshToken;
```

**Pros**: Not accessible via JavaScript, cleared on page close  
**Cons**: Lost on page refresh

### Recommended: Hybrid Approach

```javascript
// Store accessToken in memory (short-lived)
let accessToken = null;

// Store refreshToken in localStorage (long-lived, less frequent access)
const setTokens = (access, refresh) => {
  accessToken = access; // Memory
  localStorage.setItem('refreshToken', refresh); // localStorage
};

const getAccessToken = () => accessToken;
const getRefreshToken = () => localStorage.getItem('refreshToken');
```

---

## Step 3: Making Authenticated API Requests

### Basic Request with Access Token

```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  return response;
};
```

### Example: Fetch User Profile

```javascript
const getUserProfile = async () => {
  const response = await makeAuthenticatedRequest(
    'http://localhost:3000/api/v1/academy/auth/me'
  );
  
  if (response.ok) {
    const data = await response.json();
    return data.data;
  } else {
    throw new Error('Failed to fetch profile');
  }
};
```

---

## Step 4: Handle Token Expiration & Refresh

### Detect Token Expiration

When access token expires, the API returns `401 Unauthorized`.

```javascript
const isTokenExpired = (response) => {
  return response.status === 401;
};
```

### Refresh Token Function

```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    // No refresh token, redirect to login
    window.location.href = '/login';
    return null;
  }

  try {
    const response = await fetch('http://localhost:3000/api/v1/academy/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Update tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      return data.data.accessToken;
    } else {
      // Refresh token expired or invalid, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return null;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    window.location.href = '/login';
    return null;
  }
};
```

### Automatic Token Refresh on API Requests

```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  let accessToken = localStorage.getItem('accessToken');
  
  // First attempt
  let response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  // If token expired, refresh and retry
  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      // Retry with new token
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAccessToken}`,
          ...options.headers,
        },
      });
    } else {
      // Refresh failed, redirect to login
      throw new Error('Authentication failed');
    }
  }

  return response;
};
```

---

## Step 5: Logout

### Logout (Single Device)

```javascript
const logout = async () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    await fetch('http://localhost:3000/api/v1/academy/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refreshToken: refreshToken, // Optional, but recommended
      }),
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    // Always clear local tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
  }
};
```

### Logout All Devices

```javascript
const logoutAll = async () => {
  const accessToken = localStorage.getItem('accessToken');

  try {
    await fetch('http://localhost:3000/api/v1/academy/auth/logout-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error('Logout all failed:', error);
  } finally {
    // Clear local tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
  }
};
```

---

## React Example: Complete Authentication Hook

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user and token on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedToken);
    }
    
    setLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/academy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        setAccessToken(data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return { success: true, user: data.data.user };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    if (!storedRefreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/academy/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        setAccessToken(data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        return data.data.accessToken;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      logout();
      return null;
    }
  };

  // Logout function
  const logout = async () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    try {
      if (storedAccessToken) {
        await fetch('http://localhost:3000/api/v1/academy/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedAccessToken}`,
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  };

  // Authenticated fetch function
  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    let token = accessToken || localStorage.getItem('accessToken');

    let response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    // If 401, try to refresh token
    if (response.status === 401) {
      const newToken = await refreshToken();
      
      if (newToken) {
        // Retry with new token
        response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
            ...options.headers,
          },
        });
      } else {
        throw new Error('Authentication failed');
      }
    }

    return response;
  }, [accessToken]);

  return {
    user,
    accessToken,
    loading,
    login,
    logout,
    refreshToken,
    authenticatedFetch,
    isAuthenticated: !!user && !!accessToken,
  };
};
```

### Using the Auth Hook

```tsx
// components/Login.tsx
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    
    if (result.success) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

```tsx
// components/ProtectedRoute.tsx
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

```tsx
// components/UserProfile.tsx
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

export const UserProfile = () => {
  const { authenticatedFetch, user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await authenticatedFetch(
        'http://localhost:3000/api/v1/academy/auth/me'
      );
      const data = await response.json();
      setProfile(data.data);
    };

    fetchProfile();
  }, [authenticatedFetch]);

  return (
    <div>
      <h1>Profile</h1>
      {profile && (
        <div>
          <p>Name: {profile.firstName} {profile.lastName}</p>
          <p>Email: {profile.email}</p>
        </div>
      )}
    </div>
  );
};
```

---

## Axios Interceptor Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// Request interceptor - Add access token to requests
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/academy/auth/refresh', {
          refreshToken: refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Best Practices

### 1. **Token Storage**

- ✅ **Do**: Use httpOnly cookies (if backend supports) or memory storage for sensitive apps
- ✅ **Do**: Use localStorage for development/simple apps (with XSS protection)
- ❌ **Don't**: Store tokens in URL or sessionStorage for sensitive data
- ❌ **Don't**: Log tokens to console

### 2. **Token Refresh**

- ✅ **Do**: Automatically refresh on 401 errors
- ✅ **Do**: Retry failed requests after refresh
- ❌ **Don't**: Refresh on every request
- ❌ **Don't**: Retry indefinitely (limit retry attempts)

### 3. **Error Handling**

```javascript
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Token expired, refresh or redirect
    refreshToken();
  } else if (error.response?.status === 403) {
    // Forbidden, show error message
    alert('You do not have permission to perform this action');
  } else if (error.response?.status === 429) {
    // Rate limited
    alert('Too many requests. Please try again later.');
  } else {
    // Generic error
    alert('An error occurred. Please try again.');
  }
};
```

### 4. **Security Considerations**

- ✅ Always use HTTPS in production
- ✅ Implement CSRF protection if using cookies
- ✅ Validate and sanitize user input
- ✅ Implement rate limiting on frontend (secondary to backend)
- ✅ Clear tokens on logout
- ✅ Handle token expiration gracefully

### 5. **User Experience**

- ✅ Show loading states during authentication
- ✅ Provide clear error messages
- ✅ Auto-refresh tokens silently (don't interrupt user)
- ✅ Remember user session (don't require re-login on page refresh)
- ✅ Show "Session expired" message if refresh fails

---

## Common Issues & Solutions

### Issue 1: Token Refresh Loop

**Problem**: Infinite loop of refresh attempts

**Solution**: Add retry flag to prevent multiple refresh attempts

```javascript
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// In interceptor
if (error.response?.status === 401 && !originalRequest._retry) {
  if (isRefreshing) {
    // Queue the request
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(token => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    });
  }
  
  originalRequest._retry = true;
  isRefreshing = true;
  
  // ... refresh logic ...
  isRefreshing = false;
}
```

### Issue 2: Race Conditions

**Problem**: Multiple requests trigger refresh simultaneously

**Solution**: Use a refresh promise that all requests wait for

```javascript
let refreshTokenPromise = null;

const getRefreshedToken = async () => {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }
  
  refreshTokenPromise = refreshAccessToken();
  const token = await refreshTokenPromise;
  refreshTokenPromise = null;
  return token;
};
```

### Issue 3: Token Not Clearing on Logout

**Problem**: Tokens remain in storage after logout

**Solution**: Always clear tokens in finally block

```javascript
const logout = async () => {
  try {
    await api.post('/academy/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens, even if logout request fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};
```

---

## API Endpoints Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/academy/auth/login` | POST | Login with email/password | No |
| `/academy/auth/register` | POST | Register new user | No |
| `/academy/auth/refresh` | POST | Refresh access token | No (but needs refreshToken) |
| `/academy/auth/logout` | POST | Logout (blacklist tokens) | Yes (accessToken) |
| `/academy/auth/logout-all` | POST | Logout all devices | Yes (accessToken) |
| `/academy/auth/me` | GET | Get current user profile | Yes (accessToken) |

---

## Testing

### Test Login Flow

```javascript
// 1. Login
const loginResponse = await login('user@example.com', 'password');
console.log('Login successful:', loginResponse);

// 2. Make authenticated request
const profileResponse = await makeAuthenticatedRequest('/academy/auth/me');
console.log('Profile:', await profileResponse.json());

// 3. Wait for access token to expire (15 minutes)
// Then make another request - should auto-refresh

// 4. Logout
await logout();
```

---

## Conclusion

Implementing the access/refresh token pattern provides:

- ✅ Enhanced security with short-lived access tokens
- ✅ Better user experience with automatic token refresh
- ✅ Ability to revoke access via logout
- ✅ Scalable authentication system

For questions or issues, refer to the [API Documentation](../src/config/swagger.ts) or contact the backend team.

