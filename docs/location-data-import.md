# Location Data Import Guide

This guide explains how to import country, state, and city data from the MongoDB dump files.

## Prerequisites

1. MongoDB must be installed and running
2. `mongorestore` tool must be available in your PATH
3. MongoDB connection string must be configured in `.env` file

## Import Methods

### Method 1: Using mongorestore directly (Recommended)

Run the following command from the project root:

```bash
mongorestore --dir=mongodb_dump/world --uri="<YOUR_MONGO_URI>" --drop
```

Replace `<YOUR_MONGO_URI>` with your actual MongoDB connection string from `.env` file.

**Example:**
```bash
mongorestore --dir=mongodb_dump/world --uri="mongodb://localhost:27017/coaching-center" --drop
```

The `--drop` flag will drop existing collections before importing, ensuring a clean import.

### Method 2: Using npm script

If your MongoDB URI is set in environment variables:

```bash
npm run import:locations
```

**Note:** This script extracts the database name from `MONGO_URI` environment variable.

### Method 3: Manual import for specific collections

If you want to import collections individually:

```bash
# Import countries only
mongorestore --db=your-database-name --collection=countries mongodb_dump/world/countries.bson --uri="<YOUR_MONGO_URI>" --drop

# Import states only
mongorestore --db=your-database-name --collection=states mongodb_dump/world/states.bson --uri="<YOUR_MONGO_URI>" --drop

# Import cities only
mongorestore --db=your-database-name --collection=cities mongodb_dump/world/cities.bson --uri="<YOUR_MONGO_URI>" --drop
```

## Verify Import

After importing, you can verify the data by:

1. **Using MongoDB Compass or MongoDB Shell:**
   ```javascript
   use your-database-name
   db.countries.count()
   db.states.count()
   db.cities.count()
   ```

2. **Using the API endpoints:**
   - `GET /api/v1/location/countries` - Should return list of countries
   - `GET /api/v1/location/states?countryCode=IN` - Should return states for India
   - `GET /api/v1/location/cities?stateName=Delhi` - Should return cities for Delhi

## Data Structure

The imported data includes:

- **Countries**: Name, ISO codes, phone codes, currency, region, etc.
- **States**: Name, country reference, state codes, coordinates
- **Cities**: Name, state reference, country reference, coordinates

## Troubleshooting

### Error: "mongorestore: command not found"
- Install MongoDB Database Tools
- On macOS: `brew install mongodb-database-tools`
- On Ubuntu: `sudo apt-get install mongodb-database-tools`
- On Windows: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/database-tools)

### Error: "Authentication failed"
- Check your MongoDB connection string
- Ensure the user has read/write permissions
- Verify the database name is correct

### Error: "Collection already exists"
- Use the `--drop` flag to replace existing collections
- Or manually drop collections before importing:
  ```javascript
  db.countries.drop()
  db.states.drop()
  db.cities.drop()
  ```

## API Endpoints

After successful import, you can use these endpoints:

1. **Get All Countries**
   ```
   GET /api/v1/location/countries
   ```

2. **Get States by Country**
   ```
   GET /api/v1/location/states?countryCode=IN
   ```

3. **Get Cities by State**
   ```
   GET /api/v1/location/cities?stateName=Delhi&countryCode=IN
   ```
   or
   ```
   GET /api/v1/location/cities?stateId=<state-id>
   ```

For detailed API documentation, visit `/api-docs` when the server is running.

