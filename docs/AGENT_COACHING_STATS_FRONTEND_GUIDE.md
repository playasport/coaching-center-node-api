# Agent Coaching Stats – Frontend Integration Guide

This guide describes how to integrate **agent coaching statistics** and **agent coaching Excel export** in the admin frontend. These features are available only for operational users with the **agent** role.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Auth](#base-url--auth)
3. [Get Operational User (with Agent Stats)](#1-get-operational-user-with-agent-stats)
4. [Export Agent Coaching Centres to Excel](#2-export-agent-coaching-centres-to-excel)
5. [TypeScript Types](#typescript-types)
6. [UI Examples](#ui-examples)
7. [Error Handling](#error-handling)

---

## Overview

- **Agent role**: Users who can create coaching centres via the admin panel. Centres they add are linked via `addedBy`.
- **Agent stats**: When you fetch an operational user by ID and they are an **agent**, the API includes `agent_coaching_stats` in the response.
- **Export**: A separate endpoint returns an Excel file of coaching centres added by that agent, optionally filtered by time period (today, this week, this month, last month, all time, or custom range).

**Permissions**: Both endpoints use `operational_user:view`. The caller must be an authenticated admin user with that permission.

---

## Base URL & Auth

**Base URL** (prepend your API host):

```
/api/v1/admin/operational-users
```

**Auth**: Send the admin JWT in the `Authorization` header:

```
Authorization: Bearer <adminAccessToken>
```

---

## 1. Get Operational User (with Agent Stats)

**Endpoint**: `GET /admin/operational-users/:id`

**Permission**: `operational_user:view`

**Path params**:

| Param | Type   | Description                                      |
|-------|--------|--------------------------------------------------|
| `id`  | string | Operational user ID (UUID or MongoDB ObjectId)   |

### When the user is an **agent**

The response includes `agent_coaching_stats`. For non‑agent users, this field is **omitted**.

### Response shape (agent)

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
      "roles": [{ "name": "agent", "description": "Agent" }],
      "isActive": true
    },
    "agent_coaching_stats": {
      "coaching_centre_stats": {
        "total_centres": 120,
        "pending_for_approval": 5,
        "rejected": 2,
        "active": 110,
        "inactive": 10
      },
      "today_report": {
        "total": 3,
        "pending": 1,
        "approved": 2,
        "rejected": 0
      },
      "this_week_report": {
        "total": 12,
        "pending": 2,
        "approved": 9,
        "rejected": 1
      },
      "this_month_report": {
        "total": 28,
        "pending": 4,
        "approved": 22,
        "rejected": 2
      },
      "all_time_report": {
        "total": 120,
        "pending": 5,
        "approved": 113,
        "rejected": 2
      },
      "report_generated_on": "2026-01-27T10:30:00.000Z"
    }
  }
}
```

### Field meanings

| Field | Description |
|-------|-------------|
| `coaching_centre_stats` | **All‑time** counts for centres added by this agent |
| `coaching_centre_stats.total_centres` | Total centres added by agent |
| `coaching_centre_stats.pending_for_approval` | Centres awaiting approval |
| `coaching_centre_stats.rejected` | Rejected centres |
| `coaching_centre_stats.active` | Active centres |
| `coaching_centre_stats.inactive` | Inactive centres |
| `today_report` | Centres **created today** (total, pending, approved, rejected) |
| `this_week_report` | Centres created **this week** (Mon–today) |
| `this_month_report` | Centres created **this month** (1st–today) |
| `all_time_report` | All centres added by agent, by approval status |
| `report_generated_on` | ISO timestamp when stats were computed |

### Example request (fetch)

```typescript
const getOperationalUser = async (id: string) => {
  const { data } = await axios.get(
    `${API_BASE}/admin/operational-users/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data.data; // { user, agent_coaching_stats? }
};
```

### Showing stats in the UI

- Use `data.agent_coaching_stats` only when present (i.e. user is an agent).
- You can drive a “Total Coaching Centres” dashboard (e.g. Total, Approved, Rejected, Pending Approval) from `coaching_centre_stats`.
- Use `today_report`, `this_week_report`, `this_month_report`, `all_time_report` for “Today / This Week / This Month / All Time” tabs or sections.

---

## 2. Export Agent Coaching Centres to Excel

**Endpoint**: `GET /admin/operational-users/:id/agent-coaching-export`

**Permission**: `operational_user:view`

**Path params**:

| Param | Type   | Description                    |
|-------|--------|--------------------------------|
| `id`  | string | Operational user ID (agent)   |

**Query params**:

| Param       | Type   | Required | Description |
|------------|--------|----------|-------------|
| `period`   | string | No       | `today` \| `this_week` \| `this_month` \| `last_month` \| `all_time` \| `custom`. Default: `all_time` |
| `startDate`| string | Yes if `period=custom` | Start date `YYYY-MM-DD` |
| `endDate`  | string | Yes if `period=custom` | End date `YYYY-MM-DD` |

### Period behaviour

| Period      | Description |
|-------------|-------------|
| `today`     | Centres created today (UTC) |
| `this_week` | From Monday 00:00 UTC to end of today |
| `this_month`| From 1st of month 00:00 UTC to end of today |
| `last_month`| Full previous month |
| `all_time`  | No date filter |
| `custom`    | From `startDate` to `endDate` (inclusive) |

### Response

- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Body**: Binary Excel (`.xlsx`) file
- **Content-Disposition**: `attachment; filename="agent-coaching-centres-{id}-{date}.xlsx"`

The Excel file contains:

1. **Summary**: Report Generated On, Report Period, **Agent Name**, **Agent Email**, **Agent Mobile** (when available), Total Coaching Centres, Approved, Rejected, Pending Approval  
2. **Data table**: Centre ID, Center Name, Email, Mobile, Owner, Status, Approval Status, Active, Sports, City, State, Country, Pincode, Experience, Created Date, Updated Date  

### Errors

| Status | Meaning |
|--------|---------|
| `400`  | Invalid `period` or `period=custom` without both `startDate` and `endDate`; or user is **not** an agent |
| `404`  | Operational user not found |

### Example: trigger download (React)

```typescript
const exportAgentCoachingExcel = async (
  agentId: string,
  period: 'today' | 'this_week' | 'this_month' | 'last_month' | 'all_time' | 'custom' = 'all_time',
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams({ period });
  if (period === 'custom' && startDate && endDate) {
    params.set('startDate', startDate);
    params.set('endDate', endDate);
  }

  const response = await fetch(
    `${API_BASE}/admin/operational-users/${agentId}/agent-coaching-export?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || 'Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agent-coaching-centres-${agentId}-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

### Example: with axios

```typescript
const exportAgentCoachingExcel = async (
  agentId: string,
  period: string = 'all_time',
  startDate?: string,
  endDate?: string
) => {
  const params: Record<string, string> = { period };
  if (period === 'custom' && startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  }

  const { data } = await axios.get(
    `${API_BASE}/admin/operational-users/${agentId}/agent-coaching-export`,
    {
      params,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    }
  );

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `agent-coaching-centres-${agentId}-${new Date().toISOString().split('T')[0]}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
```

---

## TypeScript Types

```typescript
interface TimeReport {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface CoachingCentreStats {
  total_centres: number;
  pending_for_approval: number;
  rejected: number;
  active: number;
  inactive: number;
}

interface AgentCoachingStats {
  coaching_centre_stats: CoachingCentreStats;
  today_report: TimeReport;
  this_week_report: TimeReport;
  this_month_report: TimeReport;
  all_time_report: TimeReport;
  report_generated_on: string; // ISO string
}

type ReportPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all_time' | 'custom';

interface GetOperationalUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    roles: Array<{ name: string; description?: string }>;
    isActive: boolean;
    // ... other user fields
  };
  agent_coaching_stats?: AgentCoachingStats;
}
```

---

## UI Examples

### 1. Agent detail page: “Total Coaching Centres” panel

Use `coaching_centre_stats` when `agent_coaching_stats` exists:

```
Total Coaching Centres    [value]
Approved                  [value]
Rejected                  [value]
Pending Approval          [value]
```

Optionally also show Active / Inactive from `coaching_centre_stats`.

### 2. Time-based reports (tabs or cards)

Use `today_report`, `this_week_report`, `this_month_report`, `all_time_report`:

```
Today          This Week       This Month      All Time
Total: 3       Total: 12       Total: 28       Total: 120
Pending: 1     Pending: 2      Pending: 4      Pending: 5
Approved: 2    Approved: 9     Approved: 22    Approved: 113
Rejected: 0    Rejected: 1     Rejected: 2     Rejected: 2
```

### 3. Export button + period selector

- **Button**: “Export to Excel” (or similar).
- **Period dropdown**: Today, This Week, This Month, Last Month, All Time, Custom.
- **If Custom**: show `startDate` and `endDate` (e.g. date pickers, `YYYY-MM-DD`).
- On submit, call `GET .../agent-coaching-export` with `period` (and `startDate`/`endDate` for custom), then trigger file download as in the examples above.

### 4. Hiding export and stats for non‑agents

- Only show the “Total Coaching Centres” stats panel and “Export to Excel” when `data.agent_coaching_stats` is present for the fetched user.

---

## Error Handling

- **401**: Missing or invalid token → re-auth or redirect to login.
- **403**: No `operational_user:view` → show “You don’t have permission.”
- **404**: User not found → “Operational user not found.”
- **400** (export): Invalid `period`, missing custom dates, or user not an agent → show the API error message.

Use the same error handling patterns as for other admin APIs (e.g. `operational_user` list/detail, coaching centre export).

---

## Summary

| Feature | Endpoint | When to use |
|--------|----------|-------------|
| Agent stats | `GET /admin/operational-users/:id` | Agent detail page; check `data.agent_coaching_stats` |
| Excel export | `GET /admin/operational-users/:id/agent-coaching-export?period=...` | “Export to Excel” with period (and optional custom range) |

Both require admin auth and `operational_user:view`. Stats and export apply only to **agents**; for other roles, stats are omitted and export returns 400.
