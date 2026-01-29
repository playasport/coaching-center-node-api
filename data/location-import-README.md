# Location Data MongoDB Import Guide

This directory contains JSON files generated from the SQL dump (`playasport_laravel.sql`) that can be directly imported into MongoDB.

## Generated Files

1. **countries-mongodb.json** - Country data (1 country)
2. **states-mongodb.json** - State/Province data (36 states)
3. **cities-mongodb.json** - City data (4,239 cities)
4. **location-data-mongodb.json** - Combined file with all collections

## Data Structure

The JSON files are formatted according to your MongoDB location models:

### Country Document
```json
{
  "name": "India",
  "code": "IN",
  "iso2": "IN",
  "iso3": "IND",
  "phoneCode": "91",
  "region": "Asia",
  "subregion": "Southern Asia",
  "createdAt": "2024-02-13T06:45:01.000Z",
  "updatedAt": "2024-02-13T06:45:01.000Z"
}
```

### State Document
```json
{
  "name": "Andhra Pradesh",
  "countryId": "country_103",
  "countryCode": "IN",
  "countryName": "India",
  "createdAt": "2024-02-13T07:09:50.000Z",
  "updatedAt": "2024-02-13T07:09:50.000Z"
}
```

### City Document
```json
{
  "name": "Vijayawada",
  "stateId": "state_1592",
  "stateName": "Andhra Pradesh",
  "countryId": "country_103",
  "countryCode": "IN",
  "countryName": "India",
  "createdAt": "2024-02-13T19:08:57.000Z",
  "updatedAt": "2024-02-13T19:08:57.000Z"
}
```

## Import Methods

### Method 1: Using mongoimport (Command Line)

```bash
# Import countries first
mongoimport --db your_database_name --collection countries --file data/countries-mongodb.json --jsonArray

# Import states
mongoimport --db your_database_name --collection states --file data/states-mongodb.json --jsonArray

# Import cities
mongoimport --db your_database_name --collection cities --file data/cities-mongodb.json --jsonArray
```

### Method 2: Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Select your database
4. Click "Add Data" → "Import File"
5. Select the JSON file (countries-mongodb.json, states-mongodb.json, or cities-mongodb.json)
6. Choose the collection name (countries, states, or cities)
7. Click "Import"

### Method 3: Using MongoDB Shell (mongosh)

```javascript
// Connect to your database
use your_database_name

// Load and import countries
const countries = JSON.parse(cat('data/countries-mongodb.json'))
db.countries.insertMany(countries)

// Load and import states
const states = JSON.parse(cat('data/states-mongodb.json'))
db.states.insertMany(states)

// Load and import cities
const cities = JSON.parse(cat('data/cities-mongodb.json'))
db.cities.insertMany(cities)
```

### Method 4: Using Node.js Script

You can use the existing import script:

```bash
npx ts-node scripts/import-location-data.ts
```

This script uses the `location-import.service.ts` which handles the import process.

## Important Notes

1. **Import Order**: Import countries first, then states, then cities (due to references)

2. **ID References**: The current JSON files use string IDs like `"country_103"` and `"state_1591"` for references. After import, MongoDB will generate ObjectIds. If you need proper ObjectId references, you'll need to:
   - Import countries first
   - Update state documents with actual country ObjectIds
   - Update city documents with actual state and country ObjectIds

3. **Denormalized Data**: The documents include denormalized fields (countryName, stateName, countryCode, etc.) which makes queries easier without joins.

4. **Timestamps**: The `createdAt` and `updatedAt` fields are preserved from the original SQL data.

## Verification

After import, verify the data:

```javascript
// In MongoDB shell
db.countries.countDocuments()  // Should return 1
db.states.countDocuments()      // Should return 36
db.cities.countDocuments()      // Should return 4239
```

## Regenerating the JSON Files

If you need to regenerate the JSON files from the SQL dump:

```bash
npx ts-node scripts/parse-sql-to-json.ts
```

This will parse `data/playasport_laravel.sql` and generate the MongoDB JSON files.

