import * as fs from 'fs';
import * as path from 'path';

interface CountryData {
  id: number;
  name: string;
  phone_code?: string;
  iso2?: string;
  iso3?: string;
  region?: string;
  subregion?: string;
  flag_png?: string;
  flag_svg?: string;
  flag_emoji?: string;
  created_at?: string;
  updated_at?: string;
}

interface StateData {
  id: number;
  country_id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface CityData {
  id: number;
  country_id: number;
  state_id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

function parseSQLValue(value: string): string | null {
  if (!value || value.trim() === 'NULL') {
    return null;
  }
  // Remove quotes and unescape
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '').replace(/''/g, "'");
  return cleaned || null;
}

function parseRowValues(rowStr: string): any[] {
  const values: any[] = [];
  let currentValue = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenDepth = 0;
  
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    
    if (!inQuotes && char === '(') {
      parenDepth++;
      currentValue += char;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      currentValue += char;
    } else if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentValue += char;
    } else if (inQuotes && char === quoteChar) {
      // Check if it's an escaped quote
      if (i + 1 < rowStr.length && rowStr[i + 1] === quoteChar) {
        currentValue += char + char;
        i++; // Skip next quote
      } else {
        inQuotes = false;
        currentValue += char;
      }
    } else if (!inQuotes && parenDepth === 0 && char === ',') {
      // End of value
      const trimmed = currentValue.trim();
      if (trimmed === 'NULL' || trimmed === '') {
        values.push(null);
      } else {
        values.push(parseSQLValue(trimmed));
      }
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add last value
  if (currentValue.trim()) {
    const trimmed = currentValue.trim();
    if (trimmed === 'NULL' || trimmed === '') {
      values.push(null);
    } else {
      values.push(parseSQLValue(trimmed));
    }
  }
  
  return values;
}

function extractInsertData(sqlContent: string, tableName: string): any[] {
  const rows: any[] = [];
  
  // Find all INSERT statements for this table
  const insertRegex = new RegExp(
    `INSERT INTO \\\`${tableName}\\\`[^;]+;`,
    'gis'
  );
  
  const matches = sqlContent.matchAll(insertRegex);
  
  for (const match of matches) {
    const insertStatement = match[0];
    
    // Extract VALUES part
    const valuesMatch = insertStatement.match(/VALUES\s+(.+?);?$/is);
    if (!valuesMatch) continue;
    
    const valuesStr = valuesMatch[1].trim();
    
    // Find all row tuples - handle nested parentheses
    let parenCount = 0;
    let currentRow = '';
    
    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      
      if (char === '(') {
        if (parenCount === 0) {
          currentRow = '';
        } else {
          currentRow += char;
        }
        parenCount++;
      } else if (char === ')') {
        parenCount--;
        if (parenCount === 0) {
          // Complete row found
          const rowValues = parseRowValues(currentRow);
          if (rowValues.length > 0) {
            rows.push(rowValues);
          }
          currentRow = '';
        } else {
          currentRow += char;
        }
      } else {
        if (parenCount > 0) {
          currentRow += char;
        }
      }
    }
  }
  
  return rows;
}

function parseSQLFile(sqlFilePath: string) {
  console.log('📖 Reading SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  console.log('🔍 Extracting countries...');
  const countryRows = extractInsertData(sqlContent, 'countries');
  const countries: Map<number, CountryData> = new Map();
  
  for (const row of countryRows) {
    if (row.length >= 11) {
      countries.set(Number(row[0]), {
        id: Number(row[0]),
        name: row[1] || '',
        phone_code: row[2] || undefined,
        iso2: row[3] || undefined,
        iso3: row[4] || undefined,
        region: row[5] || undefined,
        subregion: row[6] || undefined,
        flag_png: row[7] || undefined,
        flag_svg: row[8] || undefined,
        flag_emoji: row[9] || undefined,
        created_at: row[10] || undefined,
        updated_at: row[11] || undefined,
      });
    }
  }
  
  console.log('🔍 Extracting states...');
  const stateRows = extractInsertData(sqlContent, 'states');
  const states: Map<number, StateData> = new Map();
  
  for (const row of stateRows) {
    if (row.length >= 3) {
      states.set(Number(row[0]), {
        id: Number(row[0]),
        country_id: Number(row[1]),
        name: row[2] || '',
        created_at: row[3] || undefined,
        updated_at: row[4] || undefined,
      });
    }
  }
  
  console.log('🔍 Extracting cities...');
  const cityRows = extractInsertData(sqlContent, 'cities');
  const cities: CityData[] = [];
  
  for (const row of cityRows) {
    if (row.length >= 4) {
      cities.push({
        id: Number(row[0]),
        country_id: Number(row[1]),
        state_id: Number(row[2]),
        name: row[3] || '',
        created_at: row[4] || undefined,
        updated_at: row[5] || undefined,
      });
    }
  }
  
  // Convert to MongoDB format
  console.log('🔄 Converting to MongoDB format...');
  const countryMap = new Map<number, string>(); // id -> MongoDB _id
  const stateMap = new Map<number, string>(); // id -> MongoDB _id
  
  const mongoCountries = Array.from(countries.values()).map((country) => {
    const mongoId = `country_${country.id}`;
    countryMap.set(country.id, mongoId);
    
    const doc: any = {
      name: country.name,
      code: country.iso2 || undefined,
      iso2: country.iso2 || undefined,
      iso3: country.iso3 || undefined,
      phoneCode: country.phone_code || undefined,
      region: country.region || undefined,
      subregion: country.subregion || undefined,
    };
    
    // Only add timestamps if they exist
    if (country.created_at) {
      doc.createdAt = new Date(country.created_at);
    }
    if (country.updated_at) {
      doc.updatedAt = new Date(country.updated_at);
    }
    
    // Remove undefined fields
    Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key]);
    
    return doc;
  });
  
  const mongoStates = Array.from(states.values()).map((state) => {
    const country = countries.get(state.country_id);
    const mongoId = `state_${state.id}`;
    stateMap.set(state.id, mongoId);
    
    const doc: any = {
      name: state.name,
      countryId: country ? countryMap.get(state.country_id) : undefined,
      countryCode: country?.iso2 || undefined,
      countryName: country?.name || undefined,
    };
    
    if (state.created_at) {
      doc.createdAt = new Date(state.created_at);
    }
    if (state.updated_at) {
      doc.updatedAt = new Date(state.updated_at);
    }
    
    Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key]);
    
    return doc;
  });
  
  const mongoCities = cities.map((city) => {
    const state = states.get(city.state_id);
    const country = countries.get(city.country_id);
    
    const doc: any = {
      name: city.name,
      stateId: state ? stateMap.get(city.state_id) : undefined,
      stateName: state?.name || undefined,
      countryId: country ? countryMap.get(city.country_id) : undefined,
      countryCode: country?.iso2 || undefined,
      countryName: country?.name || undefined,
    };
    
    if (city.created_at) {
      doc.createdAt = new Date(city.created_at);
    }
    if (city.updated_at) {
      doc.updatedAt = new Date(city.updated_at);
    }
    
    Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key]);
    
    return doc;
  });
  
  return {
    countries: mongoCountries,
    states: mongoStates,
    cities: mongoCities,
  };
}

// Main execution
const sqlFilePath = path.join(__dirname, '../data/playasport_laravel.sql');
const outputDir = path.join(__dirname, '../data');

console.log('🚀 Starting SQL to MongoDB JSON conversion...\n');

const mongoData = parseSQLFile(sqlFilePath);

console.log(`\n✅ Parsed ${mongoData.countries.length} countries`);
console.log(`✅ Parsed ${mongoData.states.length} states`);
console.log(`✅ Parsed ${mongoData.cities.length} cities`);

// Write separate files for each collection
console.log('\n💾 Writing JSON files...');

const countriesFile = path.join(outputDir, 'countries-mongodb.json');
const statesFile = path.join(outputDir, 'states-mongodb.json');
const citiesFile = path.join(outputDir, 'cities-mongodb.json');
const combinedFile = path.join(outputDir, 'location-data-mongodb.json');

fs.writeFileSync(countriesFile, JSON.stringify(mongoData.countries, null, 2), 'utf-8');
fs.writeFileSync(statesFile, JSON.stringify(mongoData.states, null, 2), 'utf-8');
fs.writeFileSync(citiesFile, JSON.stringify(mongoData.cities, null, 2), 'utf-8');
fs.writeFileSync(combinedFile, JSON.stringify(mongoData, null, 2), 'utf-8');

console.log(`\n✅ Successfully created MongoDB import files:`);
console.log(`   - ${countriesFile}`);
console.log(`   - ${statesFile}`);
console.log(`   - ${citiesFile}`);
console.log(`   - ${combinedFile} (all collections)`);

console.log('\n📝 To import into MongoDB, you can use:');
console.log(`   mongoimport --db your_database --collection countries --file ${countriesFile} --jsonArray`);
console.log(`   mongoimport --db your_database --collection states --file ${statesFile} --jsonArray`);
console.log(`   mongoimport --db your_database --collection cities --file ${citiesFile} --jsonArray`);
console.log('\n   Or use MongoDB Compass to import the JSON files directly.');

