"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogFileInfo = exports.getLogsByJobId = exports.getVideoProcessingLogs = exports.getQueueLogs = exports.getApplicationLogs = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const logDirectory = path_1.default.resolve(process.cwd(), 'logs');
const applicationLogPath = path_1.default.join(logDirectory, 'application.log');
/**
 * Check if log file exists
 */
const logFileExists = () => {
    return fs_1.default.existsSync(applicationLogPath);
};
/**
 * Parse a log line into structured format
 */
const parseLogLine = (line) => {
    try {
        // Format: [timestamp] [LEVEL] message | meta
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+?)(?:\s+\|\s+(.+))?$/);
        if (!match) {
            return null;
        }
        const [, timestamp, level, message, metaString] = match;
        let meta = null;
        if (metaString) {
            try {
                meta = JSON.parse(metaString);
            }
            catch {
                // If not JSON, keep as string
                meta = metaString;
            }
        }
        return {
            timestamp,
            level: level.toLowerCase(),
            message: message.trim(),
            meta,
            raw: line,
        };
    }
    catch (error) {
        return null;
    }
};
/**
 * Read log file with pagination
 */
const readLogFile = (filePath, page = 1, limit = 100, filter) => {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            return {
                logs: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        // Read entire file
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter((line) => line.trim());
        // Parse and filter logs
        let parsedLogs = lines
            .map(parseLogLine)
            .filter((log) => log !== null);
        // Apply filters
        if (filter) {
            if (filter.level) {
                parsedLogs = parsedLogs.filter((log) => log.level === filter.level?.toLowerCase());
            }
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                parsedLogs = parsedLogs.filter((log) => log.message.toLowerCase().includes(searchLower) ||
                    JSON.stringify(log.meta || '').toLowerCase().includes(searchLower));
            }
            if (filter.queueName) {
                parsedLogs = parsedLogs.filter((log) => log.message.toLowerCase().includes(filter.queueName.toLowerCase()) ||
                    JSON.stringify(log.meta || '').toLowerCase().includes(filter.queueName.toLowerCase()));
            }
            if (filter.jobId) {
                parsedLogs = parsedLogs.filter((log) => log.message.includes(filter.jobId) ||
                    JSON.stringify(log.meta || '').includes(filter.jobId));
            }
        }
        // Reverse to get newest first
        parsedLogs.reverse();
        // Paginate
        const total = parsedLogs.length;
        const pageNumber = Math.max(1, page);
        const pageSize = Math.min(500, Math.max(1, limit));
        const skip = (pageNumber - 1) * pageSize;
        const paginatedLogs = parsedLogs.slice(skip, skip + pageSize);
        return {
            logs: paginatedLogs,
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to read log file', { filePath, error });
        throw new ApiError_1.ApiError(500, 'Failed to read log file');
    }
};
/**
 * Get application logs
 */
const getApplicationLogs = (page = 1, limit = 100, filter) => {
    return readLogFile(applicationLogPath, page, limit, filter);
};
exports.getApplicationLogs = getApplicationLogs;
/**
 * Get queue-related logs
 */
const getQueueLogs = (queueName, page = 1, limit = 100) => {
    return readLogFile(applicationLogPath, page, limit, {
        queueName,
        search: queueName ? undefined : 'queue',
    });
};
exports.getQueueLogs = getQueueLogs;
/**
 * Get video processing logs
 */
const getVideoProcessingLogs = (jobId, page = 1, limit = 100) => {
    return readLogFile(applicationLogPath, page, limit, {
        search: 'video processing',
        jobId,
    });
};
exports.getVideoProcessingLogs = getVideoProcessingLogs;
/**
 * Get logs by job ID
 */
const getLogsByJobId = (jobId, page = 1, limit = 100) => {
    return readLogFile(applicationLogPath, page, limit, {
        jobId,
    });
};
exports.getLogsByJobId = getLogsByJobId;
/**
 * Get log file info
 */
const getLogFileInfo = () => {
    const exists = logFileExists();
    const info = {
        exists,
        path: applicationLogPath,
    };
    if (exists) {
        try {
            const stats = fs_1.default.statSync(applicationLogPath);
            info.size = stats.size;
            info.lastModified = stats.mtime;
        }
        catch (error) {
            logger_1.logger.error('Failed to get log file stats', { error });
        }
    }
    return info;
};
exports.getLogFileInfo = getLogFileInfo;
//# sourceMappingURL=log.service.js.map