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
exports.cleanQueue = exports.resumeQueue = exports.pauseQueue = exports.removeJob = exports.retryJob = exports.getQueueJob = exports.getQueueJobs = exports.getAllQueues = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const queueService = __importStar(require("../../services/admin/queue.service"));
/**
 * Get all queues with statistics
 */
const getAllQueues = async (_req, res, next) => {
    try {
        const result = await queueService.getAllQueues();
        const response = new ApiResponse_1.ApiResponse(200, result, 'Queues retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQueues = getAllQueues;
/**
 * Get jobs from a specific queue
 */
const getQueueJobs = async (req, res, next) => {
    try {
        const { queueName } = req.params;
        const { status, page, limit } = req.query;
        const result = await queueService.getQueueJobs(queueName, status || 'all', parseInt(page) || 1, parseInt(limit) || 50);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Queue jobs retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getQueueJobs = getQueueJobs;
/**
 * Get a specific job by ID
 */
const getQueueJob = async (req, res, next) => {
    try {
        const { queueName, jobId } = req.params;
        const job = await queueService.getQueueJob(queueName, jobId);
        if (!job) {
            throw new ApiError_1.ApiError(404, 'Job not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { job }, 'Job retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getQueueJob = getQueueJob;
/**
 * Retry a failed job
 */
const retryJob = async (req, res, next) => {
    try {
        const { queueName, jobId } = req.params;
        await queueService.retryJob(queueName, jobId);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Job retried successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.retryJob = retryJob;
/**
 * Remove a job
 */
const removeJob = async (req, res, next) => {
    try {
        const { queueName, jobId } = req.params;
        await queueService.removeJob(queueName, jobId);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Job removed successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.removeJob = removeJob;
/**
 * Pause a queue
 */
const pauseQueue = async (req, res, next) => {
    try {
        const { queueName } = req.params;
        await queueService.pauseQueue(queueName);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Queue paused successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.pauseQueue = pauseQueue;
/**
 * Resume a queue
 */
const resumeQueue = async (req, res, next) => {
    try {
        const { queueName } = req.params;
        await queueService.resumeQueue(queueName);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Queue resumed successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.resumeQueue = resumeQueue;
/**
 * Clean a queue (remove completed/failed jobs)
 */
const cleanQueue = async (req, res, next) => {
    try {
        const { queueName } = req.params;
        const { grace, limit } = req.query;
        const cleaned = await queueService.cleanQueue(queueName, parseInt(grace) || 1000, parseInt(limit) || 1000);
        const response = new ApiResponse_1.ApiResponse(200, { cleaned }, 'Queue cleaned successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cleanQueue = cleanQueue;
//# sourceMappingURL=queue.controller.js.map