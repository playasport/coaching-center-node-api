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
exports.getBatchesByCenter = exports.getMyBatches = exports.deleteBatch = exports.toggleBatchStatus = exports.updateBatch = exports.getBatch = exports.createBatch = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const batchService = __importStar(require("../../services/academy/batch.service"));
const createBatch = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Always set userId from logged-in user (userId in request body is ignored)
        data.userId = req.user.id;
        const batch = await batchService.createBatch(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(201, { batch }, (0, i18n_1.t)('batch.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createBatch = createBatch;
const getBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.idRequired'));
        }
        const batch = await batchService.getBatchById(id);
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { batch }, (0, i18n_1.t)('batch.get.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBatch = getBatch;
const updateBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        const batch = await batchService.updateBatch(id, data, req.user.id);
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { batch }, (0, i18n_1.t)('batch.update.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBatch = updateBatch;
const toggleBatchStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const batch = await batchService.toggleBatchStatus(id, req.user.id);
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        const statusMessage = batch.is_active ? (0, i18n_1.t)('batch.toggleStatus.active') : (0, i18n_1.t)('batch.toggleStatus.inactive');
        const response = new ApiResponse_1.ApiResponse(200, { batch }, statusMessage);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleBatchStatus = toggleBatchStatus;
const deleteBatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        await batchService.deleteBatch(id, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, {}, (0, i18n_1.t)('batch.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBatch = deleteBatch;
const getMyBatches = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await batchService.getBatchesByUser(req.user.id, page, limit);
        // Transform response to match expected structure: { batches: [...], pagination: {...} }
        const response = new ApiResponse_1.ApiResponse(200, {
            batches: result.data,
            pagination: result.pagination,
        }, (0, i18n_1.t)('batch.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyBatches = getMyBatches;
const getBatchesByCenter = async (req, res, next) => {
    try {
        const { centerId } = req.params;
        if (!centerId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.centerIdRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await batchService.getBatchesByCenter(centerId, req.user.id, page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('batch.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBatchesByCenter = getBatchesByCenter;
//# sourceMappingURL=batch.controller.js.map