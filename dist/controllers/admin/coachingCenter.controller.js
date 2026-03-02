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
exports.getEmployeesByCoachingCenterId = exports.createCoach = exports.getCoaches = exports.updateApprovalStatus = exports.importBasicDetails = exports.exportForBulkUpdate = exports.exportToCSV = exports.exportToPDF = exports.exportToExcel = exports.uploadVideoThumbnail = exports.setBannerImage = exports.getCoachingCenterStats = exports.removeMedia = exports.toggleStatus = exports.deleteCoachingCenter = exports.updateCoachingCenterAddedBy = exports.updateCoachingCenter = exports.createCoachingCenterByAdmin = exports.listCoachingCentersSimple = exports.getCoachingCentersByUserId = exports.getCoachingCenter = exports.getAllCoachingCenters = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const adminCoachingCenterService = __importStar(require("../../services/admin/adminCoachingCenter.service"));
const commonService = __importStar(require("../../services/common/coachingCenterCommon.service"));
const exportService = __importStar(require("../../services/admin/coachingCenterExport.service"));
const bulkUpdateService = __importStar(require("../../services/admin/coachingCenterBulkUpdate.service"));
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
 * Get all coaching centers (admin view)
 */
const getAllCoachingCenters = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, status, search, sportId, isActive, approvalStatus, addedById, onlyForFemale, allowingDisabled, onlyForDisabled, sortBy, sortOrder, dateRange } = req.query;
        const parseBool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);
        const validDateRangeKeys = ['today', 'yesterday', 'this_week', 'this_month', 'last_7_days', 'last_30_days'];
        const filters = {
            userId: userId,
            status: status,
            search: search,
            sportId: sportId,
            isActive: parseBool(isActive),
            approvalStatus: approvalStatus,
            addedById: addedById,
            onlyForFemale: parseBool(onlyForFemale),
            allowingDisabled: parseBool(allowingDisabled),
            onlyForDisabled: parseBool(onlyForDisabled),
            sortBy: sortBy,
            sortOrder: sortOrder,
            dateRange: typeof dateRange === 'string' && validDateRangeKeys.includes(dateRange) ? dateRange : undefined,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminCoachingCenterService.getAllCoachingCenters(page, limit, filters, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('admin.coachingCenters.retrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCoachingCenters = getAllCoachingCenters;
/**
 * Get coaching center by ID (admin view)
 */
const getCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const coachingCenter = await adminCoachingCenterService.getCoachingCenterByIdForAdmin(id, currentUserId, currentUserRole);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.retrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoachingCenter = getCoachingCenter;
/**
 * Get coaching centers by user ID (admin view)
 */
const getCoachingCentersByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { sortBy, sortOrder } = req.query;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminCoachingCenterService.getCoachingCentersByUserId(userId, page, limit, sortBy, sortOrder, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('admin.coachingCenters.retrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoachingCentersByUserId = getCoachingCentersByUserId;
/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only) - no role permission required
 */
const listCoachingCentersSimple = async (req, res, next) => {
    try {
        // Get pagination and filter parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const status = req.query.status;
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
        const centerId = req.query.centerId;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await adminCoachingCenterService.listCoachingCentersSimple(page, limit, search, status, isActive, centerId, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('coachingCenter.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.listCoachingCentersSimple = listCoachingCentersSimple;
/**
 * Create coaching center by admin
 * Allows admin to create center by providing academy owner details
 */
const createCoachingCenterByAdmin = async (req, res, next) => {
    try {
        const { bank_information, ...data } = req.body;
        // Get admin user ID from request (if authenticated)
        const adminUserId = req.user?.id;
        const coachingCenter = await adminCoachingCenterService.createCoachingCenterByAdmin(data, adminUserId);
        const response = new ApiResponse_1.ApiResponse(201, { coachingCenter }, (0, i18n_1.t)('coachingCenter.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCoachingCenterByAdmin = createCoachingCenterByAdmin;
/**
 * Update coaching center (admin)
 */
const updateCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bank_information, ...data } = req.body;
        // Use admin update logic which supports userId change
        const coachingCenter = await adminCoachingCenterService.updateCoachingCenterByAdmin(id, data);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.updated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCoachingCenter = updateCoachingCenter;
/**
 * Update coaching center added_by (agent/admin who added the center). Requires coaching_center:update.
 */
const updateCoachingCenterAddedBy = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { addedById } = req.body;
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const coachingCenter = await adminCoachingCenterService.updateCoachingCenterAddedBy(id, addedById ?? null, currentUserId, currentUserRole);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.updated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCoachingCenterAddedBy = updateCoachingCenterAddedBy;
/**
 * Delete coaching center (admin)
 */
const deleteCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        await commonService.deleteCoachingCenter(id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('admin.coachingCenters.deleted'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCoachingCenter = deleteCoachingCenter;
/**
 * Toggle coaching center status (admin)
 */
const toggleStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const coachingCenter = await commonService.toggleCoachingCenterStatus(id);
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.updated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleStatus = toggleStatus;
/**
 * Remove media from coaching center (admin)
 */
const removeMedia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { mediaType, uniqueId, sportId } = req.body;
        if (!mediaType || !uniqueId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.missingParams'));
        }
        await commonService.removeMediaFromCoachingCenter(id, mediaType, uniqueId, sportId);
        const response = new ApiResponse_1.ApiResponse(200, { success: true }, (0, i18n_1.t)('coachingCenter.media.removeSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.removeMedia = removeMedia;
/**
 * Get coaching center statistics for admin dashboard
 */
const getCoachingCenterStats = async (req, res, next) => {
    try {
        const { startDate, endDate, userId, status, isActive, isApproved, approvalStatus, sportId, search } = req.query;
        const params = {
            startDate: startDate,
            endDate: endDate,
            userId: userId,
            status: status,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
            approvalStatus: approvalStatus,
            sportId: sportId,
            search: search,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const stats = await adminCoachingCenterService.getCoachingCenterStats(params, currentUserId, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, { stats }, (0, i18n_1.t)('admin.coachingCenters.statsRetrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoachingCenterStats = getCoachingCenterStats;
/**
 * Set image as banner for coaching center
 */
const setBannerImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sportId, imageUniqueId } = req.body;
        if (!sportId || !imageUniqueId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.coachingCenters.sportIdAndImageUniqueIdRequired'));
        }
        const coachingCenter = await commonService.setBannerImage(id, sportId, imageUniqueId);
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.bannerImageSet'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.setBannerImage = setBannerImage;
/**
 * Upload video thumbnail
 */
const uploadVideoThumbnail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sportId, videoUniqueId } = req.body;
        const thumbnailFile = req.file;
        if (!sportId || !videoUniqueId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.coachingCenters.sportIdAndVideoUniqueIdRequired'));
        }
        if (!thumbnailFile) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.coachingCenters.thumbnailFileRequired'));
        }
        // Upload thumbnail file to S3
        const thumbnailUrl = await commonService.uploadThumbnailFile(thumbnailFile);
        const coachingCenter = await commonService.uploadVideoThumbnail(id, sportId, videoUniqueId, thumbnailUrl);
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('admin.coachingCenters.videoThumbnailUploaded'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadVideoThumbnail = uploadVideoThumbnail;
/**
 * Export coaching centers to Excel
 */
const exportToExcel = async (req, res, next) => {
    try {
        const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;
        const filters = {
            userId: userId,
            status: status,
            search: search,
            sportId: sportId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;
        const buffer = await exportService.exportToExcel(filters, currentUserId, currentUserRole);
        const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToExcel = exportToExcel;
/**
 * Export coaching centers to PDF
 */
const exportToPDF = async (req, res, next) => {
    try {
        const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;
        const filters = {
            userId: userId,
            status: status,
            search: search,
            sportId: sportId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;
        const buffer = await exportService.exportToPDF(filters, currentUserId, currentUserRole);
        const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToPDF = exportToPDF;
/**
 * Export coaching centers to CSV
 */
const exportToCSV = async (req, res, next) => {
    try {
        const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;
        const filters = {
            userId: userId,
            status: status,
            search: search,
            sportId: sportId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;
        const csvContent = await exportService.exportToCSV(filters, currentUserId, currentUserRole);
        const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToCSV = exportToCSV;
/**
 * Export coaching centers basic details to Excel for bulk update (editable fields only)
 * Use this template to edit and re-import via POST /admin/coaching-centers/import
 */
const exportForBulkUpdate = async (req, res, next) => {
    try {
        const { userId, status, search, sportId, isActive, approvalStatus, startDate, endDate } = req.query;
        const filters = {
            userId: userId,
            status: status,
            search: search,
            sportId: sportId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            approvalStatus: approvalStatus,
            startDate: startDate,
            endDate: endDate,
        };
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const buffer = await bulkUpdateService.exportForBulkUpdateToExcel(filters, currentUserId, currentUserRole);
        const filename = `coaching-centers-basic-details-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportForBulkUpdate = exportForBulkUpdate;
/**
 * Import coaching centers basic details from Excel (bulk update)
 * Use export from GET /admin/coaching-centers/export/basic-details first, edit, then upload here.
 * Blank cells = no change.
 */
const importBasicDetails = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            throw new ApiError_1.ApiError(400, 'No file uploaded. Use field name: file');
        }
        const currentUserId = req.user?.id;
        const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
        const result = await bulkUpdateService.importCoachingCenterBasicDetailsFromExcel(file.buffer, {
            currentUserId,
            currentUserRole,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Bulk update completed');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.importBasicDetails = importBasicDetails;
/**
 * Approve or reject coaching center
 */
const updateApprovalStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isApproved, rejectReason } = req.body;
        const currentUserRole = req.user?.role;
        if (typeof isApproved !== 'boolean') {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('admin.coachingCenters.isApprovedRequired'));
        }
        const coachingCenter = await adminCoachingCenterService.updateApprovalStatus(id, isApproved, rejectReason, currentUserRole);
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, isApproved ? (0, i18n_1.t)('admin.coachingCenters.approved') : (0, i18n_1.t)('admin.coachingCenters.rejected'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateApprovalStatus = updateApprovalStatus;
/**
 * Get coaches (id and name only) for a coaching center.
 * GET /admin/coaching-centers/:id/coach?search=...&page=1&limit=100 (default limit 100)
 */
const getCoaches = async (req, res, next) => {
    try {
        const { id: coachingCenterId } = req.params;
        const search = req.query.search;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const result = await adminCoachingCenterService.getCoachesListByCoachingCenterId(coachingCenterId, search, page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Coaches retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoaches = getCoaches;
/**
 * Create a coach (employee) for a coaching center.
 * POST /admin/coaching-centers/:id/coach with body { name: string }
 */
const createCoach = async (req, res, next) => {
    try {
        const { id: coachingCenterId } = req.params;
        const name = req.body?.name;
        const coach = await adminCoachingCenterService.createCoachForCoachingCenter(coachingCenterId, name);
        const response = new ApiResponse_1.ApiResponse(201, { coach }, 'Coach created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCoach = createCoach;
/**
 * Get employees (coaches) by coaching center ID
 */
const getEmployeesByCoachingCenterId = async (req, res, next) => {
    try {
        const { id } = req.params; // coaching center ID
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const roleName = req.query.roleName;
        const search = req.query.search;
        const result = await adminCoachingCenterService.getEmployeesByCoachingCenterId(id, page, limit, roleName, search);
        const response = new ApiResponse_1.ApiResponse(200, {
            employees: result.coachingCenters, // Rename for clarity
            pagination: result.pagination,
        }, (0, i18n_1.t)('admin.coachingCenters.employeesRetrieved'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployeesByCoachingCenterId = getEmployeesByCoachingCenterId;
//# sourceMappingURL=coachingCenter.controller.js.map