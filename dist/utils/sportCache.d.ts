import { Types } from 'mongoose';
/**
 * Resolve sport ID (ObjectId or UUID/custom_id) to MongoDB ObjectId
 * @param sportId - Sport ID as string (can be ObjectId or UUID/custom_id)
 * @returns MongoDB ObjectId if sport exists, null otherwise
 */
export declare const getSportObjectId: (sportId: string) => Promise<Types.ObjectId | null>;
/**
 * Resolve multiple sport IDs (ObjectId or UUID/custom_id) to MongoDB ObjectIds
 * @param sportIds - Array of sport IDs as strings (can be ObjectId or UUID/custom_id)
 * @returns Array of MongoDB ObjectIds for existing sports
 */
export declare const getSportObjectIds: (sportIds: string[]) => Promise<Types.ObjectId[]>;
//# sourceMappingURL=sportCache.d.ts.map