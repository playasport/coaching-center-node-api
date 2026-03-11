export interface ImportResult {
    success: boolean;
    countries: {
        imported: number;
        errors: string[];
    };
    states: {
        imported: number;
        errors: string[];
    };
    cities: {
        imported: number;
        errors: string[];
    };
    message: string;
}
/**
 * Import location data from BSON files using Node.js (no mongorestore required)
 * @param options Import options
 * @returns Import result with counts and errors
 */
export declare const importLocationDataFromBSONDirect: (options?: {
    dropExisting?: boolean;
    dumpPath?: string;
}) => Promise<ImportResult>;
/**
 * Import location data from BSON files using mongorestore (fallback method)
 * @param options Import options
 * @returns Import result with counts and errors
 */
export declare const importLocationDataFromBSON: (options?: {
    dropExisting?: boolean;
    dumpPath?: string;
}) => Promise<ImportResult>;
/**
 * Import all location data (wrapper function that handles connection)
 * Tries direct BSON parsing first, falls back to mongorestore if available
 */
export declare const importLocationData: (options?: {
    dropExisting?: boolean;
    dumpPath?: string;
    useMongorestore?: boolean;
}) => Promise<ImportResult>;
/**
 * Get current location data counts
 */
export declare const getLocationDataCounts: () => Promise<{
    countries: number;
    states: number;
    cities: number;
}>;
//# sourceMappingURL=location-import.service.d.ts.map