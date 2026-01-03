# Batch API Documentation

## Overview
This document describes the API endpoints and data structures for creating and updating batches in the PlayASport admin system.

## Base URL
```
/api/batches
```

---

## Create Batch

### Endpoint
```
POST /api/batches
```

### Request Body

#### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `name` | `string` | - Max length: 50 characters<br>- Required<br>- Cannot be empty | Batch name (e.g., "Morning Batch") |
| `sportId` | `string` | - Required<br>- Must be a valid sport ID from the selected center | Sport ID for the batch |
| `centerId` | `string` | - Required<br>- Must be a valid coaching center ID | Coaching center ID where the batch will be conducted |
| `gender` | `string[]` | - Required<br>- At least one gender must be selected<br>- Valid values: `["male"]`, `["female"]`, `["others"]`, or combinations | Array of allowed genders for the batch |
| `certificate_issued` | `boolean` | - Required<br>- Default: `false` | Whether a certificate will be issued upon completion |
| `scheduled.start_date` | `string` (YYYY-MM-DD) | - Required<br>- Must be today or a future date<br>- Cannot be in the past | Start date of the batch |
| `scheduled.training_days` | `string[]` | - Required<br>- At least one day must be selected<br>- Valid values: `["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]`<br>- If `duration.type === "day"`, must select exactly `duration.count` days | Array of training days |
| `duration.count` | `number` | - Required<br>- Minimum: 1<br>- Maximum: 1000<br>- Must be a positive integer | Duration count (number of days/weeks/months/years) |
| `duration.type` | `string` | - Required<br>- Valid values: `"day"`, `"week"`, `"month"`, `"year"`<br>- Default: `"month"` | Duration type unit |
| `capacity.min` | `number` | - Required<br>- Minimum: 1<br>- Maximum: 1000<br>- Must be a positive integer | Minimum number of students required |
| `age.min` | `number` | - Required<br>- Minimum: 3<br>- Maximum: 18<br>- Must respect center's age range if available | Minimum age for students |
| `age.max` | `number` | - Required<br>- Minimum: 3<br>- Maximum: 18<br>- Must be >= `age.min`<br>- Must respect center's age range if available | Maximum age for students |
| `base_price` | `number` | - Required<br>- Must be >= 0<br>- Maximum: 10,000,000 (₹1 crore) | Base price for the batch |

#### Optional Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `description` | `string` | - Max length: 1000 characters<br>- Optional | Detailed description of the batch |
| `coach` | `string` | - Optional<br>- Must be a valid coach ID if provided | Coach ID assigned to the batch |
| `scheduled.end_date` | `string` (YYYY-MM-DD) | - Optional<br>- Must be >= `start_date`<br>- Should match calculated end date based on duration (±1 day tolerance)<br>- Calculated as: `start_date + duration.count * duration.type - 1 day` | Optional end date for the batch |
| `capacity.max` | `number` | - Optional<br>- Must be >= `capacity.min` if provided<br>- Maximum: 1000 | Maximum number of students allowed |
| `admission_fee` | `number` | - Optional<br>- Must be >= 0<br>- Maximum: 10,000,000 (₹1 crore) | One-time admission fee |
| `discounted_price` | `number` | - Optional<br>- Must be >= 0<br>- Must be <= `base_price`<br>- Maximum: 10,000,000 (₹1 crore) | Discounted price (must be less than or equal to base price) |
| `status` | `string` | - Optional (only for new batches)<br>- Valid values: `"draft"`, `"published"`, `"inactive"`<br>- Default: `"draft"` | Initial status of the batch |

#### Timing Configuration

The batch supports two timing modes:

##### 1. Common Timing (Same time for all days)

When using common timing, provide:
```json
{
  "scheduled": {
    "start_time": "09:00",  // Required, format: HH:mm (24-hour)
    "end_time": "10:00",     // Required, format: HH:mm (24-hour)
    "end_time" must be after "start_time"
  }
}
```

##### 2. Individual Timing (Different time for each day)

When using individual timing, provide:
```json
{
  "scheduled": {
    "individual_timings": [
      {
        "day": "monday",      // Required, must be one of the selected training_days
        "start_time": "09:00", // Required, format: HH:mm (24-hour)
        "end_time": "10:00"    // Required, format: HH:mm (24-hour), must be after start_time
      },
      {
        "day": "wednesday",
        "start_time": "14:00",
        "end_time": "15:00"
      }
      // ... one entry for each selected training day
    ]
  }
}
```

**Note:** When using individual timing, do NOT include `start_time` and `end_time` at the root level of `scheduled`.

---

### Request Body Schema

#### Create Batch Request
```json
{
  "name": "Morning Batch",
  "description": "Early morning training session for beginners",
  "sportId": "sport-uuid-123",
  "centerId": "center-uuid-456",
  "coach": "coach-uuid-789",  // Optional
  "gender": ["male", "female"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-03-01",
    "end_date": "2024-03-31",  // Optional
    "start_time": "09:00",      // Required for common timing
    "end_time": "10:00",        // Required for common timing
    // OR use individual_timings for per-day timing
    "individual_timings": [     // Required for individual timing
      {
        "day": "monday",
        "start_time": "09:00",
        "end_time": "10:00"
      },
      {
        "day": "wednesday",
        "start_time": "14:00",
        "end_time": "15:00"
      }
    ],
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 3,
    "type": "month"
  },
  "capacity": {
    "min": 10,
    "max": 30  // Optional
  },
  "age": {
    "min": 8,
    "max": 16
  },
  "admission_fee": 500,      // Optional
  "base_price": 5000,
  "discounted_price": 4500,  // Optional
  "status": "published"       // Optional, only for new batches
}
```

---

## Update Batch

### Endpoint
```
PUT /api/batches/:batchId
```

### Request Body

Same structure as Create Batch, but:
- `status` field is **NOT** included in update requests (status cannot be changed via update)
- All other fields follow the same validation rules as Create Batch

---

## Validation Rules Summary

### Field-Specific Validations

#### 1. Batch Name
- **Type:** `string`
- **Required:** Yes
- **Max Length:** 50 characters
- **Pattern:** Any valid string

#### 2. Description
- **Type:** `string`
- **Required:** No
- **Max Length:** 1000 characters

#### 3. Sport ID
- **Type:** `string` (UUID)
- **Required:** Yes
- **Validation:** Must be a valid sport ID from the selected center's available sports

#### 4. Center ID
- **Type:** `string` (UUID)
- **Required:** Yes
- **Validation:** Must be a valid coaching center ID

#### 5. Coach ID
- **Type:** `string` (UUID)
- **Required:** No
- **Validation:** Must be a valid coach ID if provided

#### 6. Gender
- **Type:** `string[]`
- **Required:** Yes
- **Valid Values:** `"male"`, `"female"`, `"others"`
- **Validation:** At least one gender must be selected
- **Example:** `["male", "female"]` or `["male"]` or `["female", "others"]`

#### 7. Certificate Issued
- **Type:** `boolean`
- **Required:** Yes
- **Default:** `false`
- **Values:** `true` or `false`

#### 8. Start Date
- **Type:** `string` (ISO date format: YYYY-MM-DD)
- **Required:** Yes
- **Validation:** 
  - Must be today or a future date
  - Cannot be in the past

#### 9. End Date
- **Type:** `string` (ISO date format: YYYY-MM-DD)
- **Required:** No
- **Validation:**
  - Must be >= `start_date`
  - Should match calculated end date based on duration (±1 day tolerance)
  - Calculated formula:
    - `day`: `start_date + (count - 1) days`
    - `week`: `start_date + count weeks - 1 day`
    - `month`: `start_date + count months - 1 day`
    - `year`: `start_date + count years - 1 day`

#### 10. Training Days
- **Type:** `string[]`
- **Required:** Yes
- **Valid Values:** `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`, `"saturday"`, `"sunday"`
- **Validation:**
  - At least one day must be selected
  - If `duration.type === "day"`, must select exactly `duration.count` days
  - Example: If duration is 2 days, must select exactly 2 training days

#### 11. Timing Configuration

##### Common Timing
- **start_time:** `string` (HH:mm format, 24-hour)
- **end_time:** `string` (HH:mm format, 24-hour)
- **Validation:** `end_time` must be after `start_time`

##### Individual Timing
- **individual_timings:** `array` of objects
- **Each object contains:**
  - `day`: `string` (must be one of the selected training_days)
  - `start_time`: `string` (HH:mm format, 24-hour)
  - `end_time`: `string` (HH:mm format, 24-hour)
- **Validation:**
  - Each `day` must be in `training_days`
  - Each `end_time` must be after corresponding `start_time`
  - All selected training days must have timing entries

#### 12. Duration Count
- **Type:** `number` (integer)
- **Required:** Yes
- **Range:** 1 to 1000
- **Validation:** Must be a positive integer

#### 13. Duration Type
- **Type:** `string`
- **Required:** Yes
- **Valid Values:** `"day"`, `"week"`, `"month"`, `"year"`
- **Default:** `"month"`

#### 14. Capacity Min
- **Type:** `number` (integer)
- **Required:** Yes
- **Range:** 1 to 1000
- **Validation:** Must be a positive integer

#### 15. Capacity Max
- **Type:** `number` (integer)
- **Required:** No
- **Range:** 1 to 1000
- **Validation:** 
  - Must be >= `capacity.min` if provided
  - Must be a positive integer

#### 16. Age Min
- **Type:** `number` (integer)
- **Required:** Yes
- **Range:** 3 to 18
- **Validation:**
  - Must be >= 3
  - Must be <= 18
  - Must respect center's age range if available
  - Must be <= `age.max`

#### 17. Age Max
- **Type:** `number` (integer)
- **Required:** Yes
- **Range:** 3 to 18
- **Validation:**
  - Must be >= 3
  - Must be <= 18
  - Must respect center's age range if available
  - Must be >= `age.min`

#### 18. Base Price
- **Type:** `number` (decimal)
- **Required:** Yes
- **Range:** 0 to 10,000,000 (₹1 crore)
- **Validation:** Must be a positive number

#### 19. Discounted Price
- **Type:** `number` (decimal)
- **Required:** No
- **Range:** 0 to 10,000,000 (₹1 crore)
- **Validation:**
  - Must be >= 0
  - Must be <= `base_price`
  - Must be a positive number

#### 20. Admission Fee
- **Type:** `number` (decimal)
- **Required:** No
- **Range:** 0 to 10,000,000 (₹1 crore)
- **Validation:** Must be a positive number

#### 21. Status
- **Type:** `string`
- **Required:** No (only for new batches)
- **Valid Values:** `"draft"`, `"published"`, `"inactive"`
- **Default:** `"draft"`
- **Note:** Cannot be updated via update endpoint

---

## Special Validation Rules

### 1. Training Days and Duration Type "day"
When `duration.type === "day"`:
- The number of selected training days must **exactly match** `duration.count`
- Example: If `duration.count = 2` and `duration.type = "day"`, then exactly 2 training days must be selected

### 2. End Date Calculation
The end date is calculated based on:
- Start date
- Duration count
- Duration type

**Calculation Rules:**
- **Day:** `start_date + (count - 1) days` (start date is day 1)
- **Week:** `start_date + count weeks - 1 day`
- **Month:** `start_date + count months - 1 day`
- **Year:** `start_date + count years - 1 day`

The provided `end_date` should match the calculated date within ±1 day tolerance.

### 3. Age Range Validation
- Age range must respect the center's age range if available
- `age.min` must be <= `age.max`
- Both must be between 3 and 18 years

### 4. Price Validation
- `discounted_price` must be <= `base_price`
- All prices must be >= 0
- Maximum value: ₹1 crore (10,000,000)

### 5. Timing Validation
- For common timing: `end_time` must be after `start_time`
- For individual timing: Each day's `end_time` must be after its `start_time`
- All selected training days must have timing entries when using individual timing

---

## Response Format

### Success Response

#### Create Batch
```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "id": "batch-uuid-123",
    "name": "Morning Batch",
    // ... other batch fields
  }
}
```

#### Update Batch
```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "id": "batch-uuid-123",
    "name": "Morning Batch",
    // ... updated batch fields
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Batch name is required",
    "sportId": "Sport is required",
    "base_price": "Base price must be a valid positive number"
  }
}
```

---

## Example Requests

### Example 1: Create Batch with Common Timing
```json
POST /api/batches
{
  "name": "Morning Yoga Batch",
  "description": "Early morning yoga sessions for all levels",
  "sportId": "yoga-sport-id",
  "centerId": "center-id-123",
  "coach": "coach-id-456",
  "gender": ["male", "female"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-04-01",
    "end_date": "2024-06-30",
    "start_time": "07:00",
    "end_time": "08:30",
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 3,
    "type": "month"
  },
  "capacity": {
    "min": 10,
    "max": 25
  },
  "age": {
    "min": 12,
    "max": 18
  },
  "base_price": 3000,
  "discounted_price": 2500,
  "admission_fee": 500,
  "status": "published"
}
```

### Example 2: Create Batch with Individual Timing
```json
POST /api/batches
{
  "name": "Flexible Training Batch",
  "description": "Training with different timings for each day",
  "sportId": "cricket-sport-id",
  "centerId": "center-id-123",
  "gender": ["male", "female"],
  "certificate_issued": false,
  "scheduled": {
    "start_date": "2024-04-01",
    "individual_timings": [
      {
        "day": "monday",
        "start_time": "09:00",
        "end_time": "11:00"
      },
      {
        "day": "wednesday",
        "start_time": "14:00",
        "end_time": "16:00"
      },
      {
        "day": "friday",
        "start_time": "17:00",
        "end_time": "19:00"
      }
    ],
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 2,
    "type": "month"
  },
  "capacity": {
    "min": 15,
    "max": 30
  },
  "age": {
    "min": 10,
    "max": 16
  },
  "base_price": 5000,
  "status": "draft"
}
```

### Example 3: Create Batch with Day-based Duration
```json
POST /api/batches
{
  "name": "Weekend Special",
  "description": "2-day weekend training program",
  "sportId": "tennis-sport-id",
  "centerId": "center-id-123",
  "gender": ["male", "female", "others"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-04-06",
    "start_time": "10:00",
    "end_time": "12:00",
    "training_days": ["saturday", "sunday"]  // Exactly 2 days as per duration.count
  },
  "duration": {
    "count": 2,
    "type": "day"  // Must select exactly 2 training days
  },
  "capacity": {
    "min": 8,
    "max": 16
  },
  "age": {
    "min": 8,
    "max": 14
  },
  "base_price": 2000,
  "status": "published"
}
```

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | One or more validation rules failed |
| `INVALID_SPORT_ID` | Sport ID is not valid or not available for the selected center |
| `INVALID_CENTER_ID` | Center ID is not valid |
| `INVALID_COACH_ID` | Coach ID is not valid |
| `INVALID_DATE` | Date validation failed (past date, invalid format, etc.) |
| `INVALID_TIMING` | Time validation failed (end time before start time, etc.) |
| `INVALID_DURATION` | Duration validation failed (training days count mismatch, etc.) |
| `INVALID_AGE_RANGE` | Age range validation failed |
| `INVALID_PRICE` | Price validation failed (negative, exceeds limit, etc.) |

---

## Notes

1. **Date Format:** All dates must be in `YYYY-MM-DD` format (ISO 8601)
2. **Time Format:** All times must be in `HH:mm` format (24-hour)
3. **Training Days:** Day names must be lowercase (e.g., `"monday"`, not `"Monday"`)
4. **Price Limits:** All price fields have a maximum limit of ₹1 crore (10,000,000)
5. **Character Limits:** 
   - Batch name: 50 characters
   - Description: 1000 characters
6. **Duration Count:** Maximum value is 1000
7. **Capacity:** Maximum value is 1000
8. **Age Range:** Must be between 3 and 18 years, and must respect center's age range if available
9. **Status:** Can only be set during batch creation, not during update

---

## Testing Checklist

When testing the API, ensure:

- [ ] All required fields are validated
- [ ] Character limits are enforced (name: 50, description: 1000)
- [ ] Price limits are enforced (max ₹1 crore)
- [ ] Date validation (start date not in past, end date >= start date)
- [ ] Time validation (end time after start time)
- [ ] Training days validation (at least one, exact count for day type)
- [ ] Age range validation (3-18, min <= max, respects center range)
- [ ] Capacity validation (min <= max, 1-1000 range)
- [ ] Duration validation (1-1000 range)
- [ ] Gender validation (at least one selected)
- [ ] Certificate issued validation (required boolean)
- [ ] Common timing vs individual timing validation
- [ ] End date calculation validation (±1 day tolerance)
- [ ] Discounted price <= base price validation

