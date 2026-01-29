# Settings MongoDB Import Guide

This file contains the default settings JSON that can be imported into MongoDB.

## File

- **settings-mongodb.json** - Default application settings

## Data Structure

The JSON file follows the Settings model structure:

```json
{
  "app_name": "Play A Sport",
  "app_logo": null,
  "contact": {
    "number": [],
    "email": null,
    "address": {
      "office": null,
      "registered": null
    },
    "whatsapp": null,
    "instagram": null,
    "facebook": null,
    "youtube": null
  }
}
```

## Import Methods

### Method 1: Using mongoimport (Command Line)

```bash
# Import settings
mongoimport --uri="mongodb://localhost:27017/your-database-name" \
  --collection=settings \
  --file=data/settings-mongodb.json \
  --jsonArray
```

**For MongoDB Atlas:**
```bash
mongoimport --uri="mongodb+srv://username:password@cluster.mongodb.net/database-name" \
  --collection=settings \
  --file=data/settings-mongodb.json \
  --jsonArray
```

### Method 2: Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Select your database
4. Click on the `settings` collection (or create it if it doesn't exist)
5. Click "Add Data" → "Import File"
6. Select `settings-mongodb.json`
7. Choose "JSON or CSV file"
8. Click "Import"

### Method 3: Using mongosh (MongoDB Shell)

```javascript
// Connect to your database
use your-database-name

// Import the settings
db.settings.insertMany([
  {
    "app_name": "Play A Sport",
    "app_logo": null,
    "contact": {
      "number": [],
      "email": null,
      "address": {
        "office": null,
        "registered": null
      },
      "whatsapp": null,
      "instagram": null,
      "facebook": null,
      "youtube": null
    }
  }
])
```

### Method 4: Using Node.js Script

You can also use the application's service to create default settings:

```javascript
const { SettingsModel } = require('./src/models/settings.model');

async function importSettings() {
  try {
    // Check if settings already exist
    const existing = await SettingsModel.findOne();
    if (existing) {
      console.log('Settings already exist. Use update endpoint to modify.');
      return;
    }

    // Create default settings
    const settings = await SettingsModel.create({
      app_name: 'Play A Sport',
      app_logo: null,
      contact: {
        number: [],
        email: null,
        address: {
          office: null,
          registered: null,
        },
        whatsapp: null,
        instagram: null,
        facebook: null,
        youtube: null,
      },
    });

    console.log('Settings imported successfully:', settings);
  } catch (error) {
    console.error('Error importing settings:', error);
  }
}

importSettings();
```

## Important Notes

1. **Single Document**: The settings collection should only contain one document. The model enforces this with a unique index.

2. **Auto-Generated Fields**: MongoDB will automatically add:
   - `_id`: MongoDB ObjectId
   - `createdAt`: Timestamp (if timestamps are enabled)
   - `updatedAt`: Timestamp (if timestamps are enabled)

3. **Update After Import**: After importing, you can update the settings using the API:
   ```bash
   PATCH /api/v1/settings
   ```

4. **Flexible Structure**: The model supports additional dynamic fields. You can add more fields to the JSON file as needed, and they will be stored in MongoDB.

## Example: Updating Settings After Import

```bash
# Update settings via API
curl -X PATCH http://localhost:3001/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Play A Sport",
    "app_logo": "https://example.com/logo.png",
    "contact": {
      "number": ["+91-9876543210"],
      "email": "contact@playasport.in",
      "address": {
        "office": "123 Main Street, Kolkata",
        "registered": "456 Corporate Avenue, Mumbai"
      },
      "whatsapp": "+91-9876543210",
      "instagram": "https://instagram.com/playasport",
      "facebook": "https://facebook.com/playasport",
      "youtube": "https://youtube.com/playasport"
    }
  }'
```

## Verification

After importing, verify the settings:

```bash
# Get settings via API
curl http://localhost:3001/api/v1/settings
```

Or using mongosh:

```javascript
use your-database-name
db.settings.findOne()
```

