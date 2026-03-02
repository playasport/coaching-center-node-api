"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingAuditTrail = exports.getAuditTrailByEntity = exports.createAuditTrail = void 0;
const mongoose_1 = require("mongoose");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const logger_1 = require("../../utils/logger");
/**
 * Create an audit trail entry
 */
const createAuditTrail = async (action, scale, label, entityType, entityId, options) => {
    try {
        const auditData = {
            action,
            scale,
            label,
            entityType,
            entityId,
        };
        if (options?.userId) {
            auditData.userId = typeof options.userId === 'string'
                ? new mongoose_1.Types.ObjectId(options.userId)
                : options.userId;
        }
        if (options?.academyId) {
            auditData.academyId = typeof options.academyId === 'string'
                ? new mongoose_1.Types.ObjectId(options.academyId)
                : options.academyId;
        }
        if (options?.bookingId) {
            auditData.bookingId = typeof options.bookingId === 'string'
                ? new mongoose_1.Types.ObjectId(options.bookingId)
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
        const auditTrail = new auditTrail_model_1.AuditTrailModel(auditData);
        await auditTrail.save();
        return auditTrail.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to create audit trail:', {
            error: error instanceof Error ? error.message : error,
            action,
            entityType,
            entityId,
        });
        // Don't throw error - audit trail failure shouldn't break the main flow
        throw error;
    }
};
exports.createAuditTrail = createAuditTrail;
/**
 * Get audit trail entries for an entity
 */
const getAuditTrailByEntity = async (entityType, entityId, limit = 50) => {
    try {
        const auditTrails = await auditTrail_model_1.AuditTrailModel.find({
            entityType,
            entityId: typeof entityId === 'string' ? entityId : entityId.toString(),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return auditTrails;
    }
    catch (error) {
        logger_1.logger.error('Failed to get audit trail:', {
            error: error instanceof Error ? error.message : error,
            entityType,
            entityId,
        });
        throw error;
    }
};
exports.getAuditTrailByEntity = getAuditTrailByEntity;
/**
 * Get audit trail entries for a booking
 */
const getBookingAuditTrail = async (bookingId, limit = 50) => {
    try {
        const auditTrails = await auditTrail_model_1.AuditTrailModel.find({
            bookingId: typeof bookingId === 'string' ? new mongoose_1.Types.ObjectId(bookingId) : bookingId,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return auditTrails;
    }
    catch (error) {
        logger_1.logger.error('Failed to get booking audit trail:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
        });
        throw error;
    }
};
exports.getBookingAuditTrail = getBookingAuditTrail;
//# sourceMappingURL=auditTrail.service.js.map