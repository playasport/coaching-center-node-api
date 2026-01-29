# Rules and Regulations Payload Examples

## Overview

The `rules_regulation` field is an optional array of strings that allows coaching centers to specify their rules and regulations. Each string in the array can be up to 500 characters long.

## Field Specification

- **Field Name**: `rules_regulation`
- **Type**: `array` of `string`
- **Required**: No (optional)
- **Max Length per Item**: 500 characters
- **Nullable**: Yes (can be `null` or omitted)

## Example Payloads

### 1. Admin Create Coaching Center

```json
{
  "academy_owner": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "academy.owner@example.com",
    "mobile": "9876543210"
  },
  "center_name": "Elite Sports Academy",
  "mobile_number": "9876543210",
  "email": "info@elitesportsacademy.com",
  "rules_regulation": [
    "All students must wear proper sports attire during training sessions",
    "Punctuality is mandatory - students arriving late may not be allowed to join the session",
    "Regular attendance is required - minimum 80% attendance is necessary",
    "Students must bring their own equipment as specified for each sport",
    "Respectful behavior towards coaches and fellow students is expected at all times"
  ],
  "logo": "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png",
  "sports": ["507f1f77bcf86cd799439011"],
  "sport_details": [
    {
      "sport_id": "507f1f77bcf86cd799439011",
      "description": "Professional cricket coaching with international level facilities.",
      "images": [],
      "videos": []
    }
  ],
  "age": {
    "min": 5,
    "max": 18
  },
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "address": {
      "line1": "123 Sports Complex",
      "line2": "Near Metro Station",
      "city": "New Delhi",
      "state": "Delhi",
      "country": "India",
      "pincode": "110001"
    }
  },
  "operational_timing": {
    "operating_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "opening_time": "09:00",
    "closing_time": "18:00"
  },
  "allowed_genders": ["male", "female"],
  "allowed_disabled": false,
  "is_only_for_disabled": false,
  "experience": 5,
  "status": "published"
}
```

### 2. Admin Update Coaching Center

```json
{
  "center_name": "Updated Elite Sports Academy",
  "mobile_number": "9876543211",
  "rules_regulation": [
    "All students must wear proper sports attire during training sessions",
    "Punctuality is mandatory - students arriving late may not be allowed to join the session",
    "Regular attendance is required - minimum 80% attendance is necessary",
    "Students must bring their own equipment as specified for each sport",
    "Respectful behavior towards coaches and fellow students is expected at all times",
    "Mobile phones are not allowed during training sessions"
  ],
  "location": {
    "address": {
      "line2": "Updated Metro Station Area"
    }
  },
  "operational_timing": {
    "operating_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    "opening_time": "08:00",
    "closing_time": "19:00"
  },
  "status": "published"
}
```

### 3. Academy Create Coaching Center

```json
{
  "center_name": "ABC Sports Academy",
  "mobile_number": "9876543210",
  "email": "academy@example.com",
  "rules_regulation": [
    "All students must wear proper sports attire during training sessions",
    "Punctuality is mandatory - students arriving late may not be allowed to join the session",
    "Regular attendance is required - minimum 80% attendance is necessary",
    "Students must bring their own equipment as specified for each sport",
    "Respectful behavior towards coaches and fellow students is expected at all times"
  ],
  "sports": ["507f1f77bcf86cd799439011"],
  "age": {
    "min": 5,
    "max": 18
  },
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "address": {
      "line1": "123 Sports Complex",
      "line2": "Near Metro Station",
      "city": "New Delhi",
      "state": "Delhi",
      "country": "India",
      "pincode": "110001"
    }
  },
  "operational_timing": {
    "operating_days": ["monday", "tuesday", "wednesday"],
    "opening_time": "09:00",
    "closing_time": "18:00"
  },
  "allowed_genders": ["male", "female"],
  "allowed_disabled": false,
  "is_only_for_disabled": false,
  "experience": 5
}
```

### 4. Academy Update Coaching Center

```json
{
  "center_name": "Updated Academy Name",
  "rules_regulation": [
    "All students must wear proper sports attire during training sessions",
    "Punctuality is mandatory - students arriving late may not be allowed to join the session",
    "Regular attendance is required - minimum 80% attendance is necessary",
    "Students must bring their own equipment as specified for each sport",
    "Respectful behavior towards coaches and fellow students is expected at all times",
    "Mobile phones are not allowed during training sessions"
  ],
  "allowed_genders": ["male", "female"],
  "allowed_disabled": false,
  "is_only_for_disabled": false,
  "experience": 5
}
```

### 5. Empty Array (Clear Rules)

```json
{
  "rules_regulation": []
}
```

### 6. Null Value (Remove Rules)

```json
{
  "rules_regulation": null
}
```

### 7. Omitted Field (No Change)

If `rules_regulation` is not included in the update payload, the existing rules will remain unchanged.

## Validation Rules

1. **Array Type**: Must be an array of strings
2. **String Length**: Each string in the array must be 500 characters or less
3. **Optional**: The field can be omitted, set to `null`, or an empty array `[]`
4. **No Duplicates**: While not enforced by validation, it's recommended to avoid duplicate rules

## Common Use Cases

### Use Case 1: Setting Initial Rules During Creation

When creating a coaching center, include `rules_regulation` with an array of rules:

```json
{
  "rules_regulation": [
    "All students must wear proper sports attire",
    "Punctuality is mandatory",
    "Regular attendance is required"
  ]
}
```

### Use Case 2: Updating Rules

To update rules, include the complete array with all rules (both old and new):

```json
{
  "rules_regulation": [
    "All students must wear proper sports attire",
    "Punctuality is mandatory",
    "Regular attendance is required",
    "New rule added here"
  ]
}
```

### Use Case 3: Removing All Rules

To remove all rules, set the field to an empty array or `null`:

```json
{
  "rules_regulation": []
}
```

or

```json
{
  "rules_regulation": null
}
```

## API Endpoints

### Admin Endpoints

- **POST** `/api/v1/admin/coaching-centers` - Create coaching center
- **PATCH** `/api/v1/admin/coaching-centers/:id` - Update coaching center

### Academy Endpoints

- **POST** `/api/v1/academy/coaching-center` - Create coaching center
- **PATCH** `/api/v1/academy/coaching-center/:id` - Update coaching center

**Note:** Academy create and update do **not** accept `bank_information`. Bank details are managed separately (e.g. via payout account).

## Response Format

When a coaching center is retrieved, `rules_regulation` will be included in the response:

```json
{
  "statusCode": 200,
  "data": {
    "coachingCenter": {
      "_id": "69522e6c7402200e599edb1c",
      "center_name": "Elite Sports Academy",
      "rules_regulation": [
        "All students must wear proper sports attire during training sessions",
        "Punctuality is mandatory - students arriving late may not be allowed to join the session",
        "Regular attendance is required - minimum 80% attendance is necessary"
      ],
      // ... other fields
    }
  }
}
```

## Notes

1. **Character Limit**: Each rule string has a maximum length of 500 characters. If a rule exceeds this limit, the validation will fail.

2. **Order**: The order of rules in the array is preserved and will be displayed in the same order.

3. **Special Characters**: Rules can contain any valid string characters, including special characters, numbers, and emojis (though emojis are not recommended for professional use).

4. **Best Practices**:
   - Keep each rule concise and clear
   - Use proper grammar and punctuation
   - Avoid overly long rules (consider splitting into multiple rules if needed)
   - Make rules actionable and specific

5. **Frontend Display**: When displaying rules in the frontend, consider:
   - Numbered or bulleted lists
   - Proper line breaks between rules
   - Text wrapping for long rules
   - Responsive design for mobile devices

