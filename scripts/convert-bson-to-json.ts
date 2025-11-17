import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { BSON } from 'bson';
import { ObjectId } from 'bson';

/**
 * Read and parse BSON file directly using Node.js
 */
const readBSONFile = (filePath: string): any[] => {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const buffer = readFileSync(filePath);
    const documents: any[] = [];
    let offset = 0;

    // BSON files contain multiple documents concatenated together
    // Each document starts with a 4-byte length prefix
    while (offset < buffer.length) {
      if (offset + 4 > buffer.length) break;

      // Read document length (first 4 bytes)
      const docLength = buffer.readInt32LE(offset);
      
      if (docLength <= 0 || offset + docLength > buffer.length) {
        break;
      }

      // Extract document bytes
      const docBuffer = buffer.subarray(offset, offset + docLength);
      
      try {
        // Deserialize BSON document
        const document = BSON.deserialize(docBuffer);
        documents.push(document);
      } catch (err) {
        console.warn(`Failed to deserialize document at offset ${offset}:`, err);
      }

      offset += docLength;
    }

    return documents;
  } catch (error) {
    console.error(`Error reading BSON file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Convert ObjectId and Date objects to JSON-serializable format
 */
const convertToJSON = (doc: any): any => {
  if (doc === null || doc === undefined) {
    return doc;
  }

  if (doc instanceof ObjectId) {
    return doc.toString();
  }

  if (doc instanceof Date) {
    return doc.toISOString();
  }

  if (Array.isArray(doc)) {
    return doc.map(item => convertToJSON(item));
  }

  if (typeof doc === 'object') {
    const converted: any = {};
    for (const key in doc) {
      if (doc.hasOwnProperty(key)) {
        converted[key] = convertToJSON(doc[key]);
      }
    }
    return converted;
  }

  return doc;
};

/**
 * Format document according to schema
 */
const formatCountry = (doc: any): any => {
  return {
    _id: doc._id ? (doc._id instanceof ObjectId ? doc._id.toString() : doc._id) : undefined,
    name: doc.name || '',
    code: doc.code || undefined,
    iso2: doc.iso2 || undefined,
    iso3: doc.iso3 || undefined,
    phoneCode: doc.phoneCode || undefined,
    currency: doc.currency || undefined,
    currencySymbol: doc.currencySymbol || undefined,
    region: doc.region || undefined,
    subregion: doc.subregion || undefined,
    latitude: doc.latitude || undefined,
    longitude: doc.longitude || undefined,
    createdAt: doc.createdAt ? (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt) : undefined,
  };
};

const formatState = (doc: any): any => {
  return {
    _id: doc._id ? (doc._id instanceof ObjectId ? doc._id.toString() : doc._id) : undefined,
    name: doc.name || '',
    countryId: doc.countryId ? (doc.countryId instanceof ObjectId ? doc.countryId.toString() : doc.countryId) : undefined,
    countryCode: doc.countryCode || undefined,
    countryName: doc.countryName || undefined,
    stateCode: doc.stateCode || undefined,
    latitude: doc.latitude || undefined,
    longitude: doc.longitude || undefined,
    createdAt: doc.createdAt ? (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt) : undefined,
  };
};

const formatCity = (doc: any): any => {
  return {
    _id: doc._id ? (doc._id instanceof ObjectId ? doc._id.toString() : doc._id) : undefined,
    name: doc.name || '',
    stateId: doc.stateId ? (doc.stateId instanceof ObjectId ? doc.stateId.toString() : doc.stateId) : undefined,
    stateName: doc.stateName || undefined,
    stateCode: doc.stateCode || undefined,
    countryId: doc.countryId ? (doc.countryId instanceof ObjectId ? doc.countryId.toString() : doc.countryId) : undefined,
    countryCode: doc.countryCode || undefined,
    countryName: doc.countryName || undefined,
    latitude: doc.latitude || undefined,
    longitude: doc.longitude || undefined,
    createdAt: doc.createdAt ? (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt) : undefined,
  };
};

/**
 * Main function to convert BSON files to JSON
 */
const convertBSONToJSON = () => {
  const dumpPath = path.resolve(process.cwd(), 'mongodb_dump', 'world');
  const outputPath = path.resolve(process.cwd(), 'mongodb_dump', 'world', 'json');

  // Create output directory if it doesn't exist
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  console.log('🚀 Starting BSON to JSON conversion...\n');
  console.log(`📁 Input path: ${dumpPath}`);
  console.log(`📁 Output path: ${outputPath}\n`);

  // Convert Countries
  try {
    console.log('📖 Reading countries.bson...');
    const countriesPath = path.join(dumpPath, 'countries.bson');
    const countries = readBSONFile(countriesPath);
    console.log(`   Found ${countries.length} countries`);

    const formattedCountries = countries.map(formatCountry);
    const countriesJSON = JSON.stringify(formattedCountries, null, 2);
    const countriesOutputPath = path.join(outputPath, 'countries.json');
    writeFileSync(countriesOutputPath, countriesJSON, 'utf-8');
    console.log(`   ✅ Saved to ${countriesOutputPath}\n`);
  } catch (error) {
    console.error('   ❌ Error converting countries:', error);
  }

  // Convert States
  try {
    console.log('📖 Reading states.bson...');
    const statesPath = path.join(dumpPath, 'states.bson');
    const states = readBSONFile(statesPath);
    console.log(`   Found ${states.length} states`);

    const formattedStates = states.map(formatState);
    const statesJSON = JSON.stringify(formattedStates, null, 2);
    const statesOutputPath = path.join(outputPath, 'states.json');
    writeFileSync(statesOutputPath, statesJSON, 'utf-8');
    console.log(`   ✅ Saved to ${statesOutputPath}\n`);
  } catch (error) {
    console.error('   ❌ Error converting states:', error);
  }

  // Convert Cities
  try {
    console.log('📖 Reading cities.bson...');
    const citiesPath = path.join(dumpPath, 'cities.bson');
    const cities = readBSONFile(citiesPath);
    console.log(`   Found ${cities.length} cities`);

    const formattedCities = cities.map(formatCity);
    const citiesJSON = JSON.stringify(formattedCities, null, 2);
    const citiesOutputPath = path.join(outputPath, 'cities.json');
    writeFileSync(citiesOutputPath, citiesJSON, 'utf-8');
    console.log(`   ✅ Saved to ${citiesOutputPath}\n`);
  } catch (error) {
    console.error('   ❌ Error converting cities:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Conversion completed!');
  console.log('📁 JSON files are ready for MongoDB Compass import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Run the conversion
convertBSONToJSON();

