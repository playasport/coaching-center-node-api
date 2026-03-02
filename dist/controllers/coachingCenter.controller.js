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
exports.removeMedia = exports.getMyCoachingCenters = exports.deleteCoachingCenter = exports.toggleCoachingCenterStatus = exports.updateCoachingCenter = exports.getCoachingCenter = exports.createCoachingCenter = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const coachingCenterService = __importStar(require("../services/coachingCenter.service"));
const createCoachingCenter = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const coachingCenter = await coachingCenterService.createCoachingCenter(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(201, { coachingCenter }, (0, i18n_1.t)('coachingCenter.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCoachingCenter = createCoachingCenter;
const getCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        const coachingCenter = await coachingCenterService.getCoachingCenterById(id);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('coachingCenter.get.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoachingCenter = getCoachingCenter;
const updateCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        const data = req.body;
        const coachingCenter = await coachingCenterService.updateCoachingCenter(id, data);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, (0, i18n_1.t)('coachingCenter.update.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCoachingCenter = updateCoachingCenter;
const toggleCoachingCenterStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        const coachingCenter = await coachingCenterService.toggleCoachingCenterStatus(id);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const statusMessage = coachingCenter.is_active
            ? (0, i18n_1.t)('coachingCenter.toggleStatus.active')
            : (0, i18n_1.t)('coachingCenter.toggleStatus.inactive');
        const response = new ApiResponse_1.ApiResponse(200, { coachingCenter }, statusMessage);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleCoachingCenterStatus = toggleCoachingCenterStatus;
const deleteCoachingCenter = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        await coachingCenterService.deleteCoachingCenter(id);
        const response = new ApiResponse_1.ApiResponse(200, {}, (0, i18n_1.t)('coachingCenter.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCoachingCenter = deleteCoachingCenter;
const getMyCoachingCenters = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await coachingCenterService.getCoachingCentersByUser(req.user.id, page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('coachingCenter.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyCoachingCenters = getMyCoachingCenters;
/**
 * Remove media from coaching center (soft delete)
 */
const removeMedia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { mediaType, uniqueId, sportId } = req.body;
        if (!mediaType || !uniqueId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.missingParams'));
        }
        // Validate mediaType
        if (!['logo', 'document', 'image', 'video'].includes(mediaType)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.invalidType'));
        }
        // sportId is required for image/video
        if ((mediaType === 'image' || mediaType === 'video') && !sportId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.sportIdRequired'));
        }
        await coachingCenterService.removeMediaFromCoachingCenter(id, mediaType, uniqueId, sportId);
        const response = new ApiResponse_1.ApiResponse(200, { success: true }, (0, i18n_1.t)('coachingCenter.media.removeSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.removeMedia = removeMedia;
//# sourceMappingURL=coachingCenter.controller.js.map