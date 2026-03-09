# Academy Auth - Agent Code (Referral) Documentation

## Overview

The optional `agentCode` parameter allows academy users to be linked to an **agent** (AdminUser with agent role) at registration or login. When provided and valid, the academy user is associated with that agent for referral tracking. Once linked, the association cannot be changed.

---

## Supported Routes

| Route | Method | agentCode |
|-------|--------|-----------|
| `/api/v1/academy/auth/register` | POST | Optional |
| `/api/v1/academy/auth/login` | POST | Optional |
| `/api/v1/academy/auth/verify-otp` | POST | Optional (only when `mode: "login"`) |

---

## Request Format

### Register

**POST** `/api/v1/academy/auth/register`

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "academy@example.com",
  "password": "StrongPass@123",
  "mobile": "9876543210",
  "otp": "123456",
  "agentCode": "AG2562"
}
```

### Login

**POST** `/api/v1/academy/auth/login`

```json
{
  "email": "academy@example.com",
  "password": "StrongPass@123",
  "agentCode": "AG2562"
}
```

### Login with OTP (mobile)

**POST** `/api/v1/academy/auth/verify-otp`

```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "mode": "login",
  "agentCode": "AG2562"
}
```

---

## Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentCode` | string | No | Alphanumeric referral code of the agent (e.g. `AG2562`). Case-insensitive; stored uppercase. |

### Validation

- **Format**: Alphanumeric only (letters A–Z, digits 0–9)
- **Length**: Min 1 character when provided
- Empty string or omitted: treated as no referral

---

## Behaviour

| Scenario | Result |
|----------|--------|
| First register/login with valid `agentCode` | Academy user linked to agent; `referredByAgent` and `referredByAgentAt` set |
| Academy user already linked to an agent | No change; existing link kept |
| Valid `agentCode` but academy user already has an agent | No change; existing link kept |
| Different `agentCode` when academy user already has an agent | No change; new code ignored |
| Login without `agentCode` | No change |
| Invalid or non-existent `agentCode` | No error; request succeeds but no link is created |

---

## Example Requests

### With cURL

**Register with agent code**
```bash
curl -X POST "https://your-api.com/api/v1/academy/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "academy@example.com",
    "password": "StrongPass@123",
    "mobile": "9876543210",
    "otp": "123456",
    "agentCode": "AG2562"
  }'
```

**Login with agent code**
```bash
curl -X POST "https://your-api.com/api/v1/academy/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "academy@example.com",
    "password": "StrongPass@123",
    "agentCode": "AG2562"
  }'
```

**Login with OTP (mobile) and agent code**
```bash
curl -X POST "https://your-api.com/api/v1/academy/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "123456",
    "mode": "login",
    "agentCode": "AG2562"
  }'
```

### With JavaScript / fetch

```javascript
// Register with agent code
const register = async (data) => {
  const res = await fetch('/api/v1/academy/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      mobile: data.mobile,
      otp: data.otp,
      agentCode: data.agentCode || undefined,  // optional
    }),
  });
  return res.json();
};

// Login with agent code
const login = async (email, password, agentCode) => {
  const res = await fetch('/api/v1/academy/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      ...(agentCode && { agentCode }),
    }),
  });
  return res.json();
};

// Login with OTP (mobile) and agent code
const loginWithOtp = async (mobile, otp, agentCode) => {
  const res = await fetch('/api/v1/academy/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile,
      otp,
      mode: 'login',
      ...(agentCode && { agentCode }),
    }),
  });
  return res.json();
};
```

---

## Agent Code Format

Agent codes follow the pattern **AG** + 4 digits, for example:

- `AG2562`
- `AG0001`
- `AG9876`

Codes are generated when an agent is created and can be viewed in the admin panel.
