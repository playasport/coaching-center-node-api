import { Types } from 'mongoose';
export interface FacilityListItem {
    _id: string;
    custom_id: string;
    name: string;
    description: string | null;
    icon: string | null;
}
export declare const getAllFacilities: (search?: string) => Promise<FacilityListItem[]>;
/**
 * Find or create facility
 * If facility is a string (ID), find by ID
 * If facility is an object (name, description, icon), find by name or create new
 */
export declare const findOrCreateFacility: (facility: string | {
    name: string;
    description?: string | null;
    icon?: string | null;
} | null | undefined) => Promise<Types.ObjectId | null>;
//# sourceMappingURL=facility.service.d.ts.map