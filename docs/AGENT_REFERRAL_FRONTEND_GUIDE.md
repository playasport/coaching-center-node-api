# Agent Referral System – Frontend Integration Guide

Guide for frontend developers integrating the **agent referral system**: agent codes in academy auth, referral counts in operational users, and agent code filters in coaching centers.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Auth](#base-url--auth)
3. [Academy Auth – Agent Code (Referral)](#1-academy-auth--agent-code-referral)
4. [Operational User – Referral Count](#2-operational-user--referral-count)
5. [Admin Coaching Centers – Agent Code Filter](#3-admin-coaching-centers--agent-code-filter)
6. [TypeScript / Interface Notes](#typescript--interface-notes)
7. [UI Suggestions](#ui-suggestions)

---

## Overview

| Feature | Description | Audience |
|---------|-------------|----------|
| **Academy Auth – agentCode** | Optional referral code on register/login; links academy user to agent | Academy app |
| **Referral Count** | Time-based counts of academy users referred by an agent | Admin panel |
| **Coaching Centers – agentCode filter** | Filter coaching centers by agent referral code | Admin panel |

**Agent Code Format**: `AG` + 4 digits (e.g. `AG2562`, `AG0001`). Generated when an agent is created.

---

## Base URL & Auth

**Base URL**: `/api/v1`

**Auth**:
- **Academy routes**: Academy JWT in `Authorization: Bearer <token>`
- **Admin routes**: Admin JWT in `Authorization: Bearer <token>`

---

## 1. Academy Auth – Agent Code (Referral)

Academy users can pass an optional `agentCode` on register or login. When valid, the academy user is linked to that agent for referral tracking. The link is set only once and cannot be changed later.

### Supported Routes

| Route | Method | agentCode |
|-------|--------|-----------|
| `/academy/auth/register` | POST | Optional |
| `/academy/auth/login` | POST | Optional |
| `/academy/auth/verify-otp` | POST | Optional (when `mode: "login"`) |

### Request Examples

**Register**
```json
POST /api/v1/academy/auth/register
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

**Login (email/password)**
```json
POST /api/v1/academy/auth/login
{
  "email": "academy@example.com",
  "password": "StrongPass@123",
  "agentCode": "AG2562"
}
```

**Login with OTP (mobile)**
```json
POST /api/v1/academy/auth/verify-otp
{
  "mobile": "9876543210",
  "otp": "123456",
  "mode": "login",
  "agentCode": "AG2562"
}
```

### Validation

- `agentCode`: optional, alphanumeric (A–Z, 0–9), min 1 char when present  
- Case-insensitive; stored uppercase

### UI Integration

- Add an optional “Referral code” field on registration and login forms.
- Pass `agentCode` in the request body when provided; omit it if empty.
- No error if the code is invalid; the request succeeds but no referral link is created.

---

## 2. Operational User – Referral Count

When fetching an operational user who is an **agent**, the response includes `agent_coaching_stats` with a `referral_count` object for time-based referral counts.

**Endpoint**: `GET /api/v1/admin/operational-users/:id`  
**Permission**: `operational_user:view`

### Response (agent user)

```json
{
  "success": true,
  "message": "Operational user retrieved successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "agent@example.com",
      "firstName": "John",
      "lastName": "Agent",
      "agentCode": "AG2562",
      "roles": [{ "name": "agent" }],
      "isActive": true
    },
    "agent_coaching_stats": {
      "coaching_centre_stats": { ... },
      "today_report": { ... },
      "this_week_report": { ... },
      "this_month_report": { ... },
      "all_time_report": { ... },
      "referral_count": {
        "today": 2,
        "this_week": 8,
        "this_month": 15,
        "all_time": 42
      },
      "report_generated_on": "2026-03-09T10:30:00.000Z"
    }
  }
}
```

### `referral_count` Fields

| Field | Description |
|-------|-------------|
| `today` | Academy users referred today |
| `this_week` | Referred this week (Mon–today) |
| `this_month` | Referred this month |
| `all_time` | Total referred ever |

### UI Integration

- Show referral stats in the agent detail view (e.g. “Referral Count” card).
- Use the same time ranges as coaching stats (Today / This Week / This Month / All Time).
- `agent_coaching_stats` is only present for agent users; omit referral section for others.

---

## 3. Admin Coaching Centers – Agent Code Filter

Filter coaching centers by agent referral code so that only centers added by that agent are returned.

**Endpoint**: `GET /api/v1/admin/coaching-centers`  
**Permission**: `coaching_center:view`

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `agentCode` | string | Filter by agent referral code (e.g. `AG2562`). Only centers added by this agent are returned. |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `search` | string | Search by name, email, mobile |
| `status` | string | `draft` \| `published` |
| `approvalStatus` | string | `approved` \| `rejected` \| `pending_approval` |
| `addedById` | string | Filter by admin/agent user ID |
| … | | Other existing filters |

### Example Request

```
GET /api/v1/admin/coaching-centers?agentCode=AG2562&page=1&limit=10
```

### Behavior

- `agentCode` is case-insensitive.
- If no agent has that code, an empty list is returned.
- Can be combined with other filters (search, status, etc.).

### UI Integration

- Add an “Agent code” filter input on the coaching centers list page.
- Pass `agentCode` as a query param when the user enters a value.
- Show a clear “Filter by agent code” label and hint like `AG####`.

---

## TypeScript / Interface Notes

```typescript
// Academy auth request
interface AcademyRegisterBody {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  mobile: string;
  otp: string;
  agentCode?: string;
}

interface AcademyLoginBody {
  email: string;
  password: string;
  agentCode?: string;
}

interface AcademyVerifyOtpBody {
  mobile: string;
  otp: string;
  mode?: 'login' | 'register' | 'profile_update' | 'forgot_password';
  agentCode?: string;
}

// Agent coaching stats (agent user response)
interface ReferralCountReport {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface AgentCoachingStats {
  coaching_centre_stats: { ... };
  today_report: { ... };
  this_week_report: { ... };
  this_month_report: { ... };
  all_time_report: { ... };
  referral_count: ReferralCountReport;
  report_generated_on: string;
}
```

---

## UI Suggestions

### Academy App

- Registration: optional “Referral code (optional)” input.
- Login: same optional field.
- OTP login: same optional field.
- Allow paste (e.g. from referral link or SMS).

### Admin Panel

- **Agent detail**: card for “Referrals” with Today / This Week / This Month / All Time.
- **Coaching centers list**: filter by “Agent code” with placeholder `e.g. AG2562`.
- Show `agentCode` in agent list/detail if available.

---

## Related Docs

- [ACADEMY_AUTH_AGENT_CODE.md](./ACADEMY_AUTH_AGENT_CODE.md) – Detailed academy auth agentCode docs
- [AGENT_COACHING_STATS_FRONTEND_GUIDE.md](./AGENT_COACHING_STATS_FRONTEND_GUIDE.md) – Full agent coaching stats and export
