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
exports.restoreFacility = exports.deleteFacility = exports.updateFacility = exports.createFacility = exports.getFacilityById = exports.getAllFacilities = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminFacilityService = __importStar(require("../../services/admin/facility.service"));
/**
 * Get all facilities for admin
 */
const getAllFacilities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { search, isActive, includeDeleted, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            includeDeleted: includeDeleted === 'true',
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminFacilityService.getAllFacilities(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Facilities retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllFacilities = getAllFacilities;
/**
 * Get facility by ID for admin
 */
const getFacilityById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await adminFacilityService.getFacilityById(id);
        if (!facility) {
            throw new ApiError_1.ApiError(404, 'Facility not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { facility }, 'Facility retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getFacilityById = getFacilityById;
/**
 * Create new facility
 */
const createFacility = async (req, res, next) => {
    try {
        const data = req.body;
        const facility = await adminFacilityService.createFacility(data);
        const response = new ApiResponse_1.ApiResponse(201, { facility }, 'Facility created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createFacility = createFacility;
/**
 * Update facility by admin
 */
const updateFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const facility = await adminFacilityService.updateFacility(id, data);
        if (!facility) {
            throw new ApiError_1.ApiError(404, 'Facility not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { facility }, 'Facility updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateFacility = updateFacility;
/**
 * Delete facility (soft delete)
 */
const deleteFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminFacilityService.deleteFacility(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Facility deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFacility = deleteFacility;
/**
 * Restore soft-deleted facility
 */
const restoreFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await adminFacilityService.restoreFacility(id);
        const response = new ApiResponse_1.ApiResponse(200, { facility }, 'Facility restored successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.restoreFacility = restoreFacility;
//# sourceMappingURL=facility.controller.js.map