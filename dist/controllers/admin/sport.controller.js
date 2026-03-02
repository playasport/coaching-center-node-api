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
exports.exportToCSV = exports.exportToPDF = exports.exportToExcel = exports.deleteSportImage = exports.toggleSportActiveStatus = exports.deleteSport = exports.updateSport = exports.createSport = exports.getSportById = exports.getAllSports = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
const sportService = __importStar(require("../../services/admin/sport.service"));
const sportImageService = __importStar(require("../../services/admin/sportImage.service"));
const exportService = __importStar(require("../../services/admin/sportExport.service"));
/**
 * Get all sports for admin
 */
const getAllSports = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { search, isActive, isPopular } = req.query;
        const filters = {
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : undefined,
        };
        const result = await sportService.getAllSports(page, limit, filters);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('sport.getAll.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllSports = getAllSports;
/**
 * Get sport by ID for admin
 */
const getSportById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sport = await sportService.getSportById(id);
        if (!sport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { sport }, (0, i18n_1.t)('sport.getById.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getSportById = getSportById;
/**
 * Create a new sport (admin only)
 * Supports image upload via multipart/form-data
 */
const createSport = async (req, res, next) => {
    try {
        // Parse body data - handle both JSON and multipart/form-data
        let sportData = { ...req.body };
        // If it's multipart/form-data, parse boolean strings
        if (req.body.is_active !== undefined) {
            if (typeof req.body.is_active === 'string') {
                sportData.is_active = req.body.is_active === 'true' || req.body.is_active === '1';
            }
        }
        if (req.body.is_popular !== undefined) {
            if (typeof req.body.is_popular === 'string') {
                sportData.is_popular = req.body.is_popular === 'true' || req.body.is_popular === '1';
            }
        }
        // If image file is provided, don't include logo URL (image file takes precedence)
        if (req.file) {
            delete sportData.logo; // Remove logo URL if image file is provided
        }
        // Create sport first
        const sport = await sportService.createSport(sportData);
        // If image file is provided, upload it
        if (req.file) {
            try {
                // Use custom_id to identify the sport
                const sportId = sport.custom_id;
                const imageUrl = await sportImageService.uploadSportImage(sportId, req.file);
                // Update sport with image URL
                const updatedSport = await sportService.updateSport(sportId, { logo: imageUrl });
                const response = new ApiResponse_1.ApiResponse(201, { sport: updatedSport }, (0, i18n_1.t)('sport.create.success'));
                res.status(201).json(response);
                return;
            }
            catch (imageError) {
                // If image upload fails, log but don't fail the sport creation
                logger_1.logger.warn('Failed to upload image during sport creation, sport created without image', {
                    sportId: sport.custom_id,
                    error: imageError,
                });
            }
        }
        const response = new ApiResponse_1.ApiResponse(201, { sport }, (0, i18n_1.t)('sport.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createSport = createSport;
/**
 * Update sport (admin only)
 * Supports image upload via multipart/form-data
 */
const updateSport = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Parse body data - handle both JSON and multipart/form-data
        let sportData = { ...req.body };
        // If it's multipart/form-data, parse boolean strings
        if (req.body.is_active !== undefined) {
            if (typeof req.body.is_active === 'string') {
                sportData.is_active = req.body.is_active === 'true' || req.body.is_active === '1';
            }
        }
        if (req.body.is_popular !== undefined) {
            if (typeof req.body.is_popular === 'string') {
                sportData.is_popular = req.body.is_popular === 'true' || req.body.is_popular === '1';
            }
        }
        // If image file is provided, don't include logo URL (image file takes precedence)
        if (req.file) {
            delete sportData.logo; // Remove logo URL if image file is provided
        }
        // Update sport first
        const sport = await sportService.updateSport(id, sportData);
        if (!sport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        // If image file is provided, upload it
        if (req.file) {
            try {
                // Use custom_id to identify the sport
                const sportId = sport.custom_id;
                const imageUrl = await sportImageService.uploadSportImage(sportId, req.file);
                // Update sport with image URL
                const updatedSport = await sportService.updateSport(sportId, { logo: imageUrl });
                const response = new ApiResponse_1.ApiResponse(200, { sport: updatedSport }, (0, i18n_1.t)('sport.update.success'));
                res.json(response);
                return;
            }
            catch (imageError) {
                // If image upload fails, log but don't fail the sport update
                logger_1.logger.warn('Failed to upload image during sport update, sport updated without image', {
                    sportId: sport.custom_id,
                    error: imageError,
                });
            }
        }
        const response = new ApiResponse_1.ApiResponse(200, { sport }, (0, i18n_1.t)('sport.update.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSport = updateSport;
/**
 * Delete sport (admin only)
 */
const deleteSport = async (req, res, next) => {
    try {
        const { id } = req.params;
        await sportService.deleteSport(id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('sport.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSport = deleteSport;
/**
 * Toggle sport active status (admin only)
 */
const toggleSportActiveStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sport = await sportService.toggleSportActiveStatus(id);
        if (!sport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        const statusMessage = sport.is_active
            ? (0, i18n_1.t)('sport.toggleStatus.active')
            : (0, i18n_1.t)('sport.toggleStatus.inactive');
        const response = new ApiResponse_1.ApiResponse(200, { sport }, statusMessage);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleSportActiveStatus = toggleSportActiveStatus;
/**
 * Delete sport image (admin only)
 */
const deleteSportImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        await sportImageService.deleteSportImage(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Sport image deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSportImage = deleteSportImage;
/**
 * Export sports to Excel
 */
const exportToExcel = async (req, res, next) => {
    try {
        const { search, isActive, isPopular, startDate, endDate } = req.query;
        const filters = {
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToExcel(filters);
        const filename = `sports-${new Date().toISOString().split('T')[0]}.xlsx`;
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
 * Export sports to PDF
 */
const exportToPDF = async (req, res, next) => {
    try {
        const { search, isActive, isPopular, startDate, endDate } = req.query;
        const filters = {
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToPDF(filters);
        const filename = `sports-${new Date().toISOString().split('T')[0]}.pdf`;
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
 * Export sports to CSV
 */
const exportToCSV = async (req, res, next) => {
    try {
        const { search, isActive, isPopular, startDate, endDate } = req.query;
        const filters = {
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : undefined,
            startDate: startDate,
            endDate: endDate,
        };
        const csvContent = await exportService.exportToCSV(filters);
        const filename = `sports-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToCSV = exportToCSV;
//# sourceMappingURL=sport.controller.js.map