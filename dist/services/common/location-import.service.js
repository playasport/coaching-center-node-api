"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationDataCounts = exports.importLocationData = exports.importLocationDataFromBSON = exports.importLocationDataFromBSONDirect = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const bson_1 = require("bson");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const database_1 = require("../../config/database");
const location_model_1 = require("../../models/location.model");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Read and parse BSON file directly using Node.js
 */
const readBSONFile = (filePath) => {
    try {
        if (!(0, fs_1.existsSync)(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const buffer = (0, fs_1.readFileSync)(filePath);
        const documents = [];
        let offset = 0;
        // BSON files contain multiple documents concatenated together
        // Each document starts with a 4-byte length prefix
        while (offset < buffer.length) {
            if (offset + 4 > buffer.length)
                break;
            // Read document length (first 4 bytes)
            const docLength = buffer.readInt32LE(offset);
            if (docLength <= 0 || offset + docLength > buffer.length) {
                break;
            }
            // Extract document bytes
            const docBuffer = buffer.subarray(offset, offset + docLength);
            try {
                // Deserialize BSON document
                const document = bson_1.BSON.deserialize(docBuffer);
                documents.push(document);
            }
            catch (err) {
                logger_1.logger.warn(`Failed to deserialize document at offset ${offset}:`, err);
            }
            offset += docLength;
        }
        return documents;
    }
    catch (error) {
        logger_1.logger.error(`Error reading BSON file ${filePath}:`, error);
        throw error;
    }
};
/**
 * Import location data from BSON files using Node.js (no mongorestore required)
 * @param options Import options
 * @returns Import result with counts and errors
 */
const importLocationDataFromBSONDirect = async (options) => {
    const result = {
        success: false,
        countries: { imported: 0, errors: [] },
        states: { imported: 0, errors: [] },
        cities: { imported: 0, errors: [] },
        message: '',
    };
    const dumpPath = options?.dumpPath || path_1.default.resolve(process.cwd(), 'mongodb_dump', 'world');
    logger_1.logger.info('Starting location data import (direct BSON parsing)...', { dumpPath });
    try {
        // Drop existing collections if requested
        if (options?.dropExisting !== false) {
            logger_1.logger.info('Dropping existing collections...');
            await Promise.all([
                location_model_1.CountryModel.collection.drop().catch(() => { }),
                location_model_1.StateModel.collection.drop().catch(() => { }),
                location_model_1.CityModel.collection.drop().catch(() => { }),
            ]);
        }
        // Import countries
        logger_1.logger.info('Importing countries...');
        try {
            const countriesPath = path_1.default.join(dumpPath, 'countries.bson');
            const documents = readBSONFile(countriesPath);
            if (documents.length > 0) {
                // Remove _id field if present (Mongoose will generate new ones)
                const cleanDocuments = documents.map((doc) => {
                    const { _id, ...rest } = doc;
                    return rest;
                });
                await location_model_1.CountryModel.insertMany(cleanDocuments, { ordered: false });
                const count = await location_model_1.CountryModel.countDocuments();
                result.countries.imported = count;
                logger_1.logger.info(`Countries imported successfully: ${count} documents`);
            }
            else {
                result.countries.errors.push('No documents found in BSON file');
            }
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.countries.errors.push(errorMsg);
            logger_1.logger.error('Error importing countries:', errorMsg);
        }
        // Import states
        logger_1.logger.info('Importing states...');
        try {
            const statesPath = path_1.default.join(dumpPath, 'states.bson');
            const documents = readBSONFile(statesPath);
            if (documents.length > 0) {
                const cleanDocuments = documents.map((doc) => {
                    const { _id, ...rest } = doc;
                    return rest;
                });
                await location_model_1.StateModel.insertMany(cleanDocuments, { ordered: false });
                const count = await location_model_1.StateModel.countDocuments();
                result.states.imported = count;
                logger_1.logger.info(`States imported successfully: ${count} documents`);
            }
            else {
                result.states.errors.push('No documents found in BSON file');
            }
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.states.errors.push(errorMsg);
            logger_1.logger.error('Error importing states:', errorMsg);
        }
        // Import cities
        logger_1.logger.info('Importing cities...');
        try {
            const citiesPath = path_1.default.join(dumpPath, 'cities.bson');
            const documents = readBSONFile(citiesPath);
            if (documents.length > 0) {
                const cleanDocuments = documents.map((doc) => {
                    const { _id, ...rest } = doc;
                    return rest;
                });
                // Insert in batches to avoid memory issues with large files
                const batchSize = 1000;
                for (let i = 0; i < cleanDocuments.length; i += batchSize) {
                    const batch = cleanDocuments.slice(i, i + batchSize);
                    await location_model_1.CityModel.insertMany(batch, { ordered: false });
                }
                const count = await location_model_1.CityModel.countDocuments();
                result.cities.imported = count;
                logger_1.logger.info(`Cities imported successfully: ${count} documents`);
            }
            else {
                result.cities.errors.push('No documents found in BSON file');
            }
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.cities.errors.push(errorMsg);
            logger_1.logger.error('Error importing cities:', errorMsg);
        }
        // Determine overall success
        const hasErrors = result.countries.errors.length > 0 ||
            result.states.errors.length > 0 ||
            result.cities.errors.length > 0;
        result.success = !hasErrors && result.countries.imported > 0;
        if (result.success) {
            result.message = `Successfully imported ${result.countries.imported} countries, ${result.states.imported} states, and ${result.cities.imported} cities.`;
        }
        else {
            const errorCount = result.countries.errors.length + result.states.errors.length + result.cities.errors.length;
            result.message = `Import completed with ${errorCount} error(s). Countries: ${result.countries.imported}, States: ${result.states.imported}, Cities: ${result.cities.imported}.`;
        }
        logger_1.logger.info('Location data import completed', result);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to import location data:', error);
        result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        return result;
    }
};
exports.importLocationDataFromBSONDirect = importLocationDataFromBSONDirect;
/**
 * Import location data from BSON files using mongorestore (fallback method)
 * @param options Import options
 * @returns Import result with counts and errors
 */
const importLocationDataFromBSON = async (options) => {
    const result = {
        success: false,
        countries: { imported: 0, errors: [] },
        states: { imported: 0, errors: [] },
        cities: { imported: 0, errors: [] },
        message: '',
    };
    const dropFlag = options?.dropExisting !== false ? '--drop' : '';
    const dumpPath = options?.dumpPath || path_1.default.resolve(process.cwd(), 'mongodb_dump', 'world');
    const dbName = env_1.config.database.mongoUri.split('/').pop()?.split('?')[0] || 'test';
    logger_1.logger.info('Starting location data import...', { dumpPath, dbName });
    try {
        // Import countries
        logger_1.logger.info('Importing countries...');
        try {
            const command = `mongorestore --db=${dbName} --collection=countries "${dumpPath}/countries.bson" --uri="${env_1.config.database.mongoUri}" ${dropFlag}`.trim();
            const { stdout, stderr } = await execAsync(command);
            if (stdout)
                logger_1.logger.info('Countries import output:', stdout);
            if (stderr && !stderr.includes('warning'))
                logger_1.logger.warn('Countries import warnings:', stderr);
            // Count imported documents
            const count = await location_model_1.CountryModel.countDocuments();
            result.countries.imported = count;
            logger_1.logger.info(`Countries imported successfully: ${count} documents`);
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.countries.errors.push(errorMsg);
            logger_1.logger.error('Error importing countries:', errorMsg);
        }
        // Import states
        logger_1.logger.info('Importing states...');
        try {
            const command = `mongorestore --db=${dbName} --collection=states "${dumpPath}/states.bson" --uri="${env_1.config.database.mongoUri}" ${dropFlag}`.trim();
            const { stdout, stderr } = await execAsync(command);
            if (stdout)
                logger_1.logger.info('States import output:', stdout);
            if (stderr && !stderr.includes('warning'))
                logger_1.logger.warn('States import warnings:', stderr);
            // Count imported documents
            const count = await location_model_1.StateModel.countDocuments();
            result.states.imported = count;
            logger_1.logger.info(`States imported successfully: ${count} documents`);
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.states.errors.push(errorMsg);
            logger_1.logger.error('Error importing states:', errorMsg);
        }
        // Import cities
        logger_1.logger.info('Importing cities...');
        try {
            const command = `mongorestore --db=${dbName} --collection=cities "${dumpPath}/cities.bson" --uri="${env_1.config.database.mongoUri}" ${dropFlag}`.trim();
            const { stdout, stderr } = await execAsync(command);
            if (stdout)
                logger_1.logger.info('Cities import output:', stdout);
            if (stderr && !stderr.includes('warning'))
                logger_1.logger.warn('Cities import warnings:', stderr);
            // Count imported documents
            const count = await location_model_1.CityModel.countDocuments();
            result.cities.imported = count;
            logger_1.logger.info(`Cities imported successfully: ${count} documents`);
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            result.cities.errors.push(errorMsg);
            logger_1.logger.error('Error importing cities:', errorMsg);
        }
        // Determine overall success
        const hasErrors = result.countries.errors.length > 0 ||
            result.states.errors.length > 0 ||
            result.cities.errors.length > 0;
        result.success = !hasErrors && result.countries.imported > 0;
        if (result.success) {
            result.message = `Successfully imported ${result.countries.imported} countries, ${result.states.imported} states, and ${result.cities.imported} cities.`;
        }
        else {
            const errorCount = result.countries.errors.length + result.states.errors.length + result.cities.errors.length;
            result.message = `Import completed with ${errorCount} error(s). Countries: ${result.countries.imported}, States: ${result.states.imported}, Cities: ${result.cities.imported}.`;
        }
        logger_1.logger.info('Location data import completed', result);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to import location data:', error);
        result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        return result;
    }
};
exports.importLocationDataFromBSON = importLocationDataFromBSON;
/**
 * Import all location data (wrapper function that handles connection)
 * Tries direct BSON parsing first, falls back to mongorestore if available
 */
const importLocationData = async (options) => {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('Connected to MongoDB for data import');
        // Try direct BSON parsing first (no external dependencies)
        if (options?.useMongorestore !== true) {
            try {
                logger_1.logger.info('Attempting direct BSON file parsing...');
                return await (0, exports.importLocationDataFromBSONDirect)(options);
            }
            catch (error) {
                logger_1.logger.warn('Direct BSON parsing failed, trying mongorestore...', error);
                // Fall through to mongorestore method
            }
        }
        // Fallback to mongorestore if direct parsing failed or was requested
        logger_1.logger.info('Attempting import using mongorestore...');
        return await (0, exports.importLocationDataFromBSON)(options);
    }
    catch (error) {
        logger_1.logger.error('Failed to import location data:', error);
        return {
            success: false,
            countries: { imported: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] },
            states: { imported: 0, errors: [] },
            cities: { imported: 0, errors: [] },
            message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};
exports.importLocationData = importLocationData;
/**
 * Get current location data counts
 */
const getLocationDataCounts = async () => {
    try {
        await (0, database_1.connectDatabase)();
        const [countries, states, cities] = await Promise.all([
            location_model_1.CountryModel.countDocuments(),
            location_model_1.StateModel.countDocuments(),
            location_model_1.CityModel.countDocuments(),
        ]);
        return { countries, states, cities };
    }
    catch (error) {
        logger_1.logger.error('Failed to get location data counts:', error);
        throw error;
    }
};
exports.getLocationDataCounts = getLocationDataCounts;
//# sourceMappingURL=location-import.service.js.map