# Changelog: Middle Name & Name Formatting

**Date:** March 2025  
**Summary:** Added optional `middleName` field across user flows and replaced strict name validation with automatic title-case conversion for `firstName`, `middleName`, and `lastName`.

---

## 1. Middle Name Support

### User Model (`src/models/user.model.ts`)

- **User interface:** Added `middleName?: string | null`
- **Schema:** Added `middleName` field (optional, default `null`, trimmed)
- **Search index:** Included `middleName` in text search index

### AdminUser Model (`src/models/adminUser.model.ts`)

- **AdminUser interface:** Added `middleName?: string | null`
- **Schema:** Added `middleName` field (optional, default `null`, trimmed)
- **Search index:** Included `middleName` in text search index

---

## 2. Name Formatting (Title Case)

Names are no longer validated via regex. Instead, values are normalized to **title case** before storage (e.g. `"john"` → `"John"`, `"JOHN DOE"` → `"John Doe"`).

### Utility (`src/utils/string.ts`)

- Added `toTitleCase(str: string): string`
  - Trims whitespace
  - Collapses multiple spaces
  - Capitalizes first letter of each word, lowercases the rest

### User Auth (`src/validations/auth.validation.ts`)

| Schema               | Fields                       | Change                                   |
|----------------------|------------------------------|------------------------------------------|
| `userRegisterSchema` | `firstName`, `middleName`, `lastName` | Transform to title case; no regex check  |
| `userProfileUpdateSchema` | `firstName`, `middleName`, `lastName` | Same transform applied                   |

### Admin Auth (`src/validations/adminAuth.validation.ts`)

| Schema                   | Fields  | Change                      |
|--------------------------|---------|-----------------------------|
| `adminUpdateProfileSchema` | `firstName`, `middleName`, `lastName` | Title case transform       |

### Admin User Management (`src/validations/adminUser.validation.ts`)

| Schema                  | Fields  | Change                      |
|-------------------------|---------|-----------------------------|
| `createAdminUserSchema` | `firstName`, `middleName`, `lastName` | Title case transform       |
| `updateAdminUserSchema` | `firstName`, `middleName`, `lastName` | Same                       |

### Coaching Center – Academy Owner (`src/validations/coachingCenter.validation.ts`)

| Schema                      | Fields  | Change                      |
|-----------------------------|---------|-----------------------------|
| `adminCoachingCenterCreateSchema` | `academy_owner.firstName`, `academy_owner.middleName`, `academy_owner.lastName` | Added `middleName`; title case transform |

### Operational User (`src/validations/operationalUser.validation.ts`)

| Schema                       | Fields  | Change                      |
|------------------------------|---------|-----------------------------|
| `createOperationalUserSchema` | `firstName`, `middleName`, `lastName` | Title case transform       |
| `updateOperationalUserSchema` | `firstName`, `middleName`, `lastName` | Same                       |

---

## 3. Service & Controller Changes

### User Auth (`src/services/client/auth.service.ts`)

- **registerUser:** Accepts `middleName`, passes to `userService.create`, includes in `fullName` for notifications
- **updateUserProfile:** Reads and persists `middleName` updates

### User Service (`src/services/client/user.service.ts`)

- **CreateUserData:** Added `middleName?: string | null`
- **UpdateUserData:** Added `middleName?: string | null`
- **create:** Stores `middleName` when creating a user

### Admin Auth (`src/controllers/admin/adminAuth.controller.ts`)

- **updateAdminProfile:** Persists `middleName` in profile updates

### Admin User Controller (`src/controllers/admin/user.controller.ts`)

- **createUser:** Sends `middleName` when creating a user
- **updateUser:** Applies `middleName` updates
- **userName:** Computed from `[firstName, middleName, lastName]` for emails

### Operational User Controller (`src/controllers/admin/operationalUser.controller.ts`)

- **createOperationalUser:** Sends `middleName` when creating an operational user
- **updateOperationalUser:** Applies `middleName` updates
- **userName:** Computed from `[firstName, middleName, lastName]` for emails

### Admin Coaching Center Service (`src/services/admin/adminCoachingCenter.service.ts`)

- **createCoachingCenterByAdmin:** When creating a new Academy user from `academy_owner`, includes `middleName`

### Admin User Service (`src/services/admin/adminUser.service.ts`)

- **CreateAdminUserData:** Added `middleName?: string | null`
- **UpdateAdminUserData:** Added `middleName?: string | null`
- **create:** Persists `middleName` when creating an admin user

---

## 4. API Usage

### User Registration

```json
POST /user/auth/register
{
  "firstName": "john",
  "middleName": "robert",
  "lastName": "doe",
  "email": "john@example.com",
  ...
}
```

Stored as: `firstName: "John"`, `middleName: "Robert"`, `lastName: "Doe"`

### User Profile Update

```json
PATCH /user/auth/profile
{
  "middleName": "robert"
}
```

### Admin Update Profile

```json
PATCH /admin/auth/profile
{
  "firstName": "John",
  "middleName": "Robert",
  "lastName": "Doe"
}
```

### Admin Create/Update User

```json
POST /admin/users
{
  "firstName": "john",
  "middleName": "robert",
  "lastName": "doe",
  "email": "john@example.com",
  ...
}
```

### Admin Create Coaching Center (with academy_owner)

```json
POST /admin/coaching-centers
{
  "center_name": "Elite Sports Academy",
  "academy_owner": {
    "firstName": "john",
    "middleName": "robert",
    "lastName": "doe",
    "email": "john@example.com",
    "mobile": "9876543210"
  },
  ...
}
```

### Admin Create/Update Operational User

```json
POST /admin/operational-users
{
  "firstName": "jane",
  "middleName": "marie",
  "lastName": "smith",
  ...
}
```

---

## 5. Notes

- **Participant model:** Unchanged; no `middleName` field. Participant names continue to use `firstName` and `lastName` only.
- **Optional fields:** `middleName` and `lastName` are optional; empty strings are normalized to `null`/`undefined` where appropriate.
- **Indexing:** `middleName` is included in text indexes for both User and AdminUser models.
