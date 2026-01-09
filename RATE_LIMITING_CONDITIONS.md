# Backend Rate Limiting Conditions

## Overview
The backend uses Redis-based rate limiting to prevent brute force attacks and API abuse. Rate limiting is implemented using a sliding window approach.

## Rate Limiting Types

### 1. **General API Rate Limiting** (`generalRateLimit`)

**Configuration:**
- **Window:** 15 minutes (900,000 ms)
- **Max Requests:** 100 requests per window
- **Key:** Based on IP address
- **Storage:** Redis DB 3

**Default Values (Environment Variables):**
- `RATE_LIMIT_WINDOW_MS` - Default: `900000` (15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Default: `100` requests

**Where Applied:**
- `POST /admin/auth/refresh` - Token refresh endpoint
- `POST /user/auth/refresh` - User token refresh endpoint
- `POST /academy/auth/refresh` - Academy token refresh endpoint

**Key Generation:**
```typescript
`ratelimit:general:${req.ip || 'unknown'}`
```

**Behavior:**
- Tracks requests per IP address
- Resets after 15 minutes
- Returns HTTP 429 (Too Many Requests) when exceeded
- Includes rate limit headers in response

---

### 2. **Login Rate Limiting** (`loginRateLimit`)

**Configuration:**
- **Window:** 15 minutes (900,000 ms)
- **Max Attempts:** 5 login attempts per window
- **Key:** Based on IP address + email/mobile
- **Storage:** Redis DB 3

**Default Values (Environment Variables):**
- `RATE_LIMIT_WINDOW_MS` - Default: `900000` (15 minutes)
- `RATE_LIMIT_LOGIN_MAX` - Default: `5` attempts

**Where Applied:**
- `POST /academy/auth/login` - Academy login endpoint

**Key Generation:**
```typescript
`ratelimit:login:${req.ip || 'unknown'}:${email || mobile || 'unknown'}`
```

**Behavior:**
- Tracks login attempts per IP + email/mobile combination
- More restrictive than general rate limiting (5 vs 100)
- Prevents brute force attacks on login
- Returns HTTP 429 (Too Many Requests) when exceeded

---

## Rate Limit Response

### When Limit Exceeded (HTTP 429):

**Response Body:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "data": {
    "retryAfter": 450,  // Seconds until reset
    "resetTime": "2024-01-01T12:00:00.000Z"  // ISO timestamp
  }
}
```

### Rate Limit Headers (Always Included):

- `X-RateLimit-Limit`: Maximum requests allowed (e.g., "100")
- `X-RateLimit-Remaining`: Remaining requests in current window (e.g., "45")
- `X-RateLimit-Reset`: ISO timestamp when the limit resets

**Example Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-01T12:15:00.000Z
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Time window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests per window for general API |
| `RATE_LIMIT_LOGIN_MAX` | `5` | Maximum login attempts per window |

### Redis Configuration

- **Database:** Redis DB 3 (configurable via `REDIS_DB_RATE_LIMIT`)
- **Connection:** Uses same Redis instance as other services
- **Key Prefix:** `ratelimit:`

---

## How It Works

### 1. Request Tracking
1. Request arrives at protected route
2. Rate limit middleware generates a unique key (IP-based or IP+email)
3. Redis increments counter for that key
4. If first request, sets expiration time (15 minutes)

### 2. Limit Check
1. Compares current count with maximum allowed
2. If exceeded → Returns 429 error
3. If not exceeded → Allows request to proceed

### 3. Window Reset
- Counter automatically expires after window duration
- New window starts when counter expires
- No manual reset needed

---

## Rate Limiting Rules Summary

| Type | Window | Max Requests | Key Based On | Applied To |
|------|--------|--------------|--------------|------------|
| **General** | 15 minutes | 100 | IP Address | Token refresh endpoints |
| **Login** | 15 minutes | 5 | IP + Email/Mobile | Academy login endpoint |

---

## Customization Options

The rate limit middleware supports:

1. **Custom Key Generator:** Generate keys based on any request property
2. **Skip Successful Requests:** Don't count successful (2xx) responses
3. **Custom Error Messages:** Override default error messages
4. **Custom Windows:** Different time windows per route

**Example Custom Rate Limit:**
```typescript
const customRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  keyGenerator: (req) => `ratelimit:custom:${req.user?.id || req.ip}`,
  skipSuccessfulRequests: true, // Don't count 2xx responses
  message: 'Custom rate limit exceeded',
});
```

---

## Error Handling

- **Redis Connection Failure:** Rate limiting fails open (allows requests)
- **Redis Errors:** Logged but doesn't block requests
- **Missing IP:** Uses 'unknown' as fallback

---

## Monitoring

Rate limit violations are logged with:
- Rate limit key
- IP address
- Request path
- Current count

**Log Example:**
```
Rate limit exceeded: {
  key: "ratelimit:general:192.168.1.1",
  ip: "192.168.1.1",
  path: "/api/v1/admin/auth/refresh",
  count: 101
}
```

---

## Best Practices

1. **Monitor Rate Limit Violations:** Check logs for patterns
2. **Adjust Limits:** Tune based on actual usage patterns
3. **Use Appropriate Limits:** Different limits for different endpoints
4. **Handle 429 Errors:** Frontend should show user-friendly messages
5. **Respect Headers:** Use `X-RateLimit-Remaining` to show users their quota

---

## Current Implementation Status

✅ **Implemented:**
- General API rate limiting (100/15min)
- Login rate limiting (5/15min)
- Redis-based storage
- Rate limit headers
- Error handling

⚠️ **Not Applied Everywhere:**
- Most API routes don't have rate limiting yet
- Only token refresh and login endpoints are protected
- Consider adding to other sensitive endpoints

---

## Recommendations

1. **Add to More Endpoints:**
   - Password reset endpoints
   - OTP verification endpoints
   - File upload endpoints
   - Search endpoints

2. **Different Limits for Different Routes:**
   - Heavy operations: Lower limits
   - Light operations: Higher limits
   - Public endpoints: Stricter limits

3. **User-Based Rate Limiting:**
   - Authenticated users: Higher limits
   - Anonymous users: Lower limits
