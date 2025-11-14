import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { BSON } from 'bson';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { connectDatabase } from '../config/database';
import { CountryModel, StateModel, CityModel } from '../models/location.model';

const execAsync = promisify(exec);

export interface ImportResult {
  success: boolean;
  countries: { imported: number; errors: string[] };
  states: { imported: number; errors: string[] };
  cities: { imported: number; errors: string[] };
  message: string;
}

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
        logger.warn(`Failed to deserialize document at offset ${offset}:`, err);
      }

      offset += docLength;
    }

    return documents;
  } catch (error) {
    logger.error(`Error reading BSON file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Import location data from BSON files using Node.js (no mongorestore required)
 * @param options Import options
 * @returns Import result with counts and errors
 */
export const importLocationDataFromBSONDirect = async (options?: {
  dropExisting?: boolean;
  dumpPath?: string;
}): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    countries: { imported: 0, errors: [] },
    states: { imported: 0, errors: [] },
    cities: { imported: 0, errors: [] },
    message: '',
  };

  const dumpPath = options?.dumpPath || path.resolve(process.cwd(), 'mongodb_dump', 'world');

  logger.info('Starting location data import (direct BSON parsing)...', { dumpPath });

  try {
    // Drop existing collections if requested
    if (options?.dropExisting !== false) {
      logger.info('Dropping existing collections...');
      await Promise.all([
        CountryModel.collection.drop().catch(() => {}),
        StateModel.collection.drop().catch(() => {}),
        CityModel.collection.drop().catch(() => {}),
      ]);
    }

    // Import countries
    logger.info('Importing countries...');
    try {
      const countriesPath = path.join(dumpPath, 'countries.bson');
      const documents = readBSONFile(countriesPath);
      
      if (documents.length > 0) {
        // Remove _id field if present (Mongoose will generate new ones)
        const cleanDocuments = documents.map((doc: any) => {
          const { _id, ...rest } = doc;
          return rest;
        });
        
        await CountryModel.insertMany(cleanDocuments, { ordered: false });
        const count = await CountryModel.countDocuments();
        result.countries.imported = count;
        logger.info(`Countries imported successfully: ${count} documents`);
      } else {
        result.countries.errors.push('No documents found in BSON file');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.countries.errors.push(errorMsg);
      logger.error('Error importing countries:', errorMsg);
    }

    // Import states
    logger.info('Importing states...');
    try {
      const statesPath = path.join(dumpPath, 'states.bson');
      const documents = readBSONFile(statesPath);
      
      if (documents.length > 0) {
        const cleanDocuments = documents.map((doc: any) => {
          const { _id, ...rest } = doc;
          return rest;
        });
        
        await StateModel.insertMany(cleanDocuments, { ordered: false });
        const count = await StateModel.countDocuments();
        result.states.imported = count;
        logger.info(`States imported successfully: ${count} documents`);
      } else {
        result.states.errors.push('No documents found in BSON file');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.states.errors.push(errorMsg);
      logger.error('Error importing states:', errorMsg);
    }

    // Import cities
    logger.info('Importing cities...');
    try {
      const citiesPath = path.join(dumpPath, 'cities.bson');
      const documents = readBSONFile(citiesPath);
      
      if (documents.length > 0) {
        const cleanDocuments = documents.map((doc: any) => {
          const { _id, ...rest } = doc;
          return rest;
        });
        
        // Insert in batches to avoid memory issues with large files
        const batchSize = 1000;
        for (let i = 0; i < cleanDocuments.length; i += batchSize) {
          const batch = cleanDocuments.slice(i, i + batchSize);
          await CityModel.insertMany(batch, { ordered: false });
        }
        
        const count = await CityModel.countDocuments();
        result.cities.imported = count;
        logger.info(`Cities imported successfully: ${count} documents`);
      } else {
        result.cities.errors.push('No documents found in BSON file');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.cities.errors.push(errorMsg);
      logger.error('Error importing cities:', errorMsg);
    }

    // Determine overall success
    const hasErrors =
      result.countries.errors.length > 0 ||
      result.states.errors.length > 0 ||
      result.cities.errors.length > 0;

    result.success = !hasErrors && result.countries.imported > 0;

    if (result.success) {
      result.message = `Successfully imported ${result.countries.imported} countries, ${result.states.imported} states, and ${result.cities.imported} cities.`;
    } else {
      const errorCount =
        result.countries.errors.length + result.states.errors.length + result.cities.errors.length;
      result.message = `Import completed with ${errorCount} error(s). Countries: ${result.countries.imported}, States: ${result.states.imported}, Cities: ${result.cities.imported}.`;
    }

    logger.info('Location data import completed', result);
    return result;
  } catch (error) {
    logger.error('Failed to import location data:', error);
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return result;
  }
};

/**
 * Import location data from BSON files using mongorestore (fallback method)
 * @param options Import options
 * @returns Import result with counts and errors
 */
export const importLocationDataFromBSON = async (options?: {
  dropExisting?: boolean;
  dumpPath?: string;
}): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    countries: { imported: 0, errors: [] },
    states: { imported: 0, errors: [] },
    cities: { imported: 0, errors: [] },
    message: '',
  };

  const dropFlag = options?.dropExisting !== false ? '--drop' : '';
  const dumpPath = options?.dumpPath || path.resolve(process.cwd(), 'mongodb_dump', 'world');
  const dbName = config.database.mongoUri.split('/').pop()?.split('?')[0] || 'test';

  logger.info('Starting location data import...', { dumpPath, dbName });

  try {
    // Import countries
    logger.info('Importing countries...');
    try {
      const command = `mongorestore --db=${dbName} --collection=countries "${dumpPath}/countries.bson" --uri="${config.database.mongoUri}" ${dropFlag}`.trim();
      const { stdout, stderr } = await execAsync(command);
      if (stdout) logger.info('Countries import output:', stdout);
      if (stderr && !stderr.includes('warning')) logger.warn('Countries import warnings:', stderr);

      // Count imported documents
      const count = await CountryModel.countDocuments();
      result.countries.imported = count;
      logger.info(`Countries imported successfully: ${count} documents`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.countries.errors.push(errorMsg);
      logger.error('Error importing countries:', errorMsg);
    }

    // Import states
    logger.info('Importing states...');
    try {
      const command = `mongorestore --db=${dbName} --collection=states "${dumpPath}/states.bson" --uri="${config.database.mongoUri}" ${dropFlag}`.trim();
      const { stdout, stderr } = await execAsync(command);
      if (stdout) logger.info('States import output:', stdout);
      if (stderr && !stderr.includes('warning')) logger.warn('States import warnings:', stderr);

      // Count imported documents
      const count = await StateModel.countDocuments();
      result.states.imported = count;
      logger.info(`States imported successfully: ${count} documents`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.states.errors.push(errorMsg);
      logger.error('Error importing states:', errorMsg);
    }

    // Import cities
    logger.info('Importing cities...');
    try {
      const command = `mongorestore --db=${dbName} --collection=cities "${dumpPath}/cities.bson" --uri="${config.database.mongoUri}" ${dropFlag}`.trim();
      const { stdout, stderr } = await execAsync(command);
      if (stdout) logger.info('Cities import output:', stdout);
      if (stderr && !stderr.includes('warning')) logger.warn('Cities import warnings:', stderr);

      // Count imported documents
      const count = await CityModel.countDocuments();
      result.cities.imported = count;
      logger.info(`Cities imported successfully: ${count} documents`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      result.cities.errors.push(errorMsg);
      logger.error('Error importing cities:', errorMsg);
    }

    // Determine overall success
    const hasErrors =
      result.countries.errors.length > 0 ||
      result.states.errors.length > 0 ||
      result.cities.errors.length > 0;

    result.success = !hasErrors && result.countries.imported > 0;

    if (result.success) {
      result.message = `Successfully imported ${result.countries.imported} countries, ${result.states.imported} states, and ${result.cities.imported} cities.`;
    } else {
      const errorCount =
        result.countries.errors.length + result.states.errors.length + result.cities.errors.length;
      result.message = `Import completed with ${errorCount} error(s). Countries: ${result.countries.imported}, States: ${result.states.imported}, Cities: ${result.cities.imported}.`;
    }

    logger.info('Location data import completed', result);
    return result;
  } catch (error) {
    logger.error('Failed to import location data:', error);
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return result;
  }
};

/**
 * Import all location data (wrapper function that handles connection)
 * Tries direct BSON parsing first, falls back to mongorestore if available
 */
export const importLocationData = async (options?: {
  dropExisting?: boolean;
  dumpPath?: string;
  useMongorestore?: boolean;
}): Promise<ImportResult> => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Connected to MongoDB for data import');

    // Try direct BSON parsing first (no external dependencies)
    if (options?.useMongorestore !== true) {
      try {
        logger.info('Attempting direct BSON file parsing...');
        return await importLocationDataFromBSONDirect(options);
      } catch (error) {
        logger.warn('Direct BSON parsing failed, trying mongorestore...', error);
        // Fall through to mongorestore method
      }
    }

    // Fallback to mongorestore if direct parsing failed or was requested
    logger.info('Attempting import using mongorestore...');
    return await importLocationDataFromBSON(options);
  } catch (error) {
    logger.error('Failed to import location data:', error);
    return {
      success: false,
      countries: { imported: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] },
      states: { imported: 0, errors: [] },
      cities: { imported: 0, errors: [] },
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Get current location data counts
 */
export const getLocationDataCounts = async (): Promise<{
  countries: number;
  states: number;
  cities: number;
}> => {
  try {
    await connectDatabase();
    const [countries, states, cities] = await Promise.all([
      CountryModel.countDocuments(),
      StateModel.countDocuments(),
      CityModel.countDocuments(),
    ]);

    return { countries, states, cities };
  } catch (error) {
    logger.error('Failed to get location data counts:', error);
    throw error;
  }
};

