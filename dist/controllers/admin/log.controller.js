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
exports.getLogFileInfo = exports.getLogsByJobId = exports.getVideoProcessingLogs = exports.getQueueLogs = exports.getApplicationLogs = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const logService = __importStar(require("../../services/admin/log.service"));
/**
 * Get application logs
 */
const getApplicationLogs = async (req, res, next) => {
    try {
        const { page, limit, level, search } = req.query;
        const result = logService.getApplicationLogs(parseInt(page) || 1, parseInt(limit) || 100, {
            level: level,
            search: search,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Application logs retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getApplicationLogs = getApplicationLogs;
/**
 * Get queue logs
 */
const getQueueLogs = async (req, res, next) => {
    try {
        const { queueName, page, limit } = req.query;
        const result = logService.getQueueLogs(queueName, parseInt(page) || 1, parseInt(limit) || 100);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Queue logs retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getQueueLogs = getQueueLogs;
/**
 * Get video processing logs
 */
const getVideoProcessingLogs = async (req, res, next) => {
    try {
        const { jobId, page, limit } = req.query;
        const result = logService.getVideoProcessingLogs(jobId, parseInt(page) || 1, parseInt(limit) || 100);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Video processing logs retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getVideoProcessingLogs = getVideoProcessingLogs;
/**
 * Get logs by job ID
 */
const getLogsByJobId = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const { page, limit } = req.query;
        const result = logService.getLogsByJobId(jobId, parseInt(page) || 1, parseInt(limit) || 100);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Job logs retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getLogsByJobId = getLogsByJobId;
/**
 * Get log file info
 */
const getLogFileInfo = async (_req, res, next) => {
    try {
        const info = logService.getLogFileInfo();
        const response = new ApiResponse_1.ApiResponse(200, info, 'Log file info retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getLogFileInfo = getLogFileInfo;
//# sourceMappingURL=log.controller.js.map