import { Types } from 'mongoose';
import { AuditTrail, ActionType, ActionScale } from '../../models/auditTrail.model';
/**
 * Create an audit trail entry
 */
export declare const createAuditTrail: (action: ActionType, scale: ActionScale, label: string, entityType: string, entityId: Types.ObjectId | string, options?: {
    userId?: Types.ObjectId | string | null;
    academyId?: Types.ObjectId | string | null;
    bookingId?: Types.ObjectId | string | null;
    metadata?: Record<string, any> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<AuditTrail>;
/**
 * Get audit trail entries for an entity
 */
export declare const getAuditTrailByEntity: (entityType: string, entityId: Types.ObjectId | string, limit?: number) => Promise<AuditTrail[]>;
/**
 * Get audit trail entries for a booking
 */
export declare const getBookingAuditTrail: (bookingId: Types.ObjectId | string, limit?: number) => Promise<AuditTrail[]>;
//# sourceMappingURL=auditTrail.service.d.ts.map