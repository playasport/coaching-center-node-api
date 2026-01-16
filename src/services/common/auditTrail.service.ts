import { Types } from 'mongoose';
import { AuditTrailModel, AuditTrail, ActionType, ActionScale } from '../../models/auditTrail.model';
import { logger } from '../../utils/logger';

/**
 * Create an audit trail entry
 */
export const createAuditTrail = async (
  action: ActionType,
  scale: ActionScale,
  label: string,
  entityType: string,
  entityId: Types.ObjectId | string,
  options?: {
    userId?: Types.ObjectId | string | null;
    academyId?: Types.ObjectId | string | null;
    bookingId?: Types.ObjectId | string | null;
    metadata?: Record<string, any> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<AuditTrail> => {
  try {
    const auditData: any = {
      action,
      scale,
      label,
      entityType,
      entityId,
    };

    if (options?.userId) {
      auditData.userId = typeof options.userId === 'string' 
        ? new Types.ObjectId(options.userId) 
        : options.userId;
    }

    if (options?.academyId) {
      auditData.academyId = typeof options.academyId === 'string'
        ? new Types.ObjectId(options.academyId)
        : options.academyId;
    }

    if (options?.bookingId) {
      auditData.bookingId = typeof options.bookingId === 'string'
        ? new Types.ObjectId(options.bookingId)
        : options.bookingId;
    }

    if (options?.metadata) {
      auditData.metadata = options.metadata;
    }

    if (options?.ipAddress) {
      auditData.ipAddress = options.ipAddress;
    }

    if (options?.userAgent) {
      auditData.userAgent = options.userAgent;
    }

    const auditTrail = new AuditTrailModel(auditData);
    await auditTrail.save();

    return auditTrail.toObject();
  } catch (error) {
    logger.error('Failed to create audit trail:', {
      error: error instanceof Error ? error.message : error,
      action,
      entityType,
      entityId,
    });
    // Don't throw error - audit trail failure shouldn't break the main flow
    throw error;
  }
};

/**
 * Get audit trail entries for an entity
 */
export const getAuditTrailByEntity = async (
  entityType: string,
  entityId: Types.ObjectId | string,
  limit: number = 50
): Promise<AuditTrail[]> => {
  try {
    const auditTrails = await AuditTrailModel.find({
      entityType,
      entityId: typeof entityId === 'string' ? entityId : entityId.toString(),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return auditTrails;
  } catch (error) {
    logger.error('Failed to get audit trail:', {
      error: error instanceof Error ? error.message : error,
      entityType,
      entityId,
    });
    throw error;
  }
};

/**
 * Get audit trail entries for a booking
 */
export const getBookingAuditTrail = async (
  bookingId: Types.ObjectId | string,
  limit: number = 50
): Promise<AuditTrail[]> => {
  try {
    const auditTrails = await AuditTrailModel.find({
      bookingId: typeof bookingId === 'string' ? new Types.ObjectId(bookingId) : bookingId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return auditTrails;
  } catch (error) {
    logger.error('Failed to get booking audit trail:', {
      error: error instanceof Error ? error.message : error,
      bookingId,
    });
    throw error;
  }
};
