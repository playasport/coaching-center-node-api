"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBatches = exports.exportBatches = exports.toggleStatus = exports.deleteBatch = exports.updateBatch = exports.getBatchesByCenterId = exports.getBatchesByUserId = exports.getBatch = exports.getAllBatches = exports.createBatch = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const adminBatchService = __importStar(require("../../services/admin/adminBatch.service"));
const batchExportService = __importStar(require("../../services/admin/batchExport.service"));
const batchImportService = __importStar(require("../../services/admin/batchImport.service"));
/**
 * Helper function to get user role from database (more reliable than JWT token)
 */
const getUserRoleFromDatabase = async (userId) => {
    if (!userId)
        return undefined;
    try {
        const { AdminUserModel } = await Promise.resolve().then(() => __importStar(require('../../models/adminUser.model')));
        const { DefaultRoles } = await Promise.resolve().then(() => __importStar(require('../../enums/defaultRoles.enum')));
        const adminUser = await AdminUserModel.findOne({ id: userId })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (adminUser && adminUser.roles) {
            const userRoles = adminUser.roles;
            // Get the highest priority role (super_admin > admin > employee > agent)
            if (userRoles.some((r) => r?.name === DefaultRoles.SUPER_ADMIN)) {
                return DefaultRoles.SUPER_ADMIN;
            }
            else if (userRoles.some((r) => r?.name === DefaultRoles.ADMIN)) {
                return DefaultRoles.ADMIN;
            }
            else if (userRoles.some((r) => r?.name === DefaultRoles.EMPLOYEE)) {
                return DefaultRoles.EMPLOYEE;
            }
            else if (userRoles.some((r) => r?.name === DefaultRoles.AGENT)) {
                return DefaultRoles.AGENT;
            }
        }
    }
    catch (error) {
        // If error, fallback to undefined
    }
    return undefined;
};
/**
 * Create batch (admin)
 */
const createBatch = async (req, res, next) => {
    try {
        const data = req.body;
        // centerId is required for admin batch creation
        if (!data.centerId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.batches.centerIdRequired'));
        }
        const batch = await adminBatchService.createBatchByAdmin(data);
        const response = new ApiResponse_1.ApiResponse(201, { batch }, (0, i18n_1.t)('admin.batches.created'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createBatch = createBatch;
/**
 * Get all batches (admin view)
 */
const getAllBatches = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, centerId, sportId, status, isActive, search, sortBy, sortOrder } = req.query;
        const filters = {
            userId: userId,
            centerId: centerId,
            sportId: sportId,
            status: status,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminBatchService.getAllBatches(page, limit, filters, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('admin.batches.listRetrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBatches = getAllBatches;
/**
 * Get batch by ID (admin view)
 */
const getBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const batch = await adminBatchService.getBatchById(id, currentUserId, currentUserRole);
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.batches.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { batch }, (0, i18n_1.t)('admin.batches.retrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBatch = getBatch;
/**
 * Get batches by user ID (admin view)
 */
const getBatchesByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { sortBy, sortOrder } = req.query;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminBatchService.getBatchesByUserId(userId, page, limit, sortBy, sortOrder, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('admin.batches.listRetrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBatchesByUserId = getBatchesByUserId;
/**
 * Get batches by center ID (admin view)
 */
const getBatchesByCenterId = async (req, res, next) => {
    try {
        const { centerId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { sortBy, sortOrder } = req.query;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminBatchService.getBatchesByCenterId(centerId, page, limit, sortBy, sortOrder, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('admin.batches.listRetrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBatchesByCenterId = getBatchesByCenterId;
/**
 * Update batch (admin)
 */
const updateBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const batch = await adminBatchService.updateBatchByAdmin(id, data);
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('admin.batches.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { batch }, (0, i18n_1.t)('admin.batches.updated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBatch = updateBatch;
/**
 * Delete batch (admin)
 */
const deleteBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminBatchService.deleteBatchByAdmin(id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('admin.batches.deleted'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBatch = deleteBatch;
/**
 * Toggle batch status (admin)
 */
const toggleStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const batch = await adminBatchService.toggleBatchStatusByAdmin(id);
        const response = new ApiResponse_1.ApiResponse(200, { batch }, (0, i18n_1.t)('admin.batches.statusToggled'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleStatus = toggleStatus;
/**
 * Export all batches to Excel (admin)
 */
const exportBatches = async (req, res, next) => {
    try {
        const { userId, centerId, sportId, status, isActive } = req.query;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const filters = {
            userId: userId,
            centerId: centerId,
            sportId: sportId,
            status: status,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            agentUserId: currentUserRole === 'agent' ? currentUserId : undefined,
        };
        const buffer = await batchExportService.exportBatchesToExcel(filters);
        const filename = `batches-export-${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length.toString());
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportBatches = exportBatches;
/**
 * Import batches from Excel and bulk update (admin)
 */
const importBatches = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            throw new ApiError_1.ApiError(400, 'No file uploaded. Use field name: file');
        }
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await batchImportService.importBatchesFromExcel(file.buffer, {
            agentUserId: currentUserRole === 'agent' ? currentUserId : undefined,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Bulk update completed');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.importBatches = importBatches;
//# sourceMappingURL=batch.controller.js.map