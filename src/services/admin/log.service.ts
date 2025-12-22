import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  raw: string;
}

export interface LogResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const logDirectory = path.resolve(process.cwd(), 'logs');
const applicationLogPath = path.join(logDirectory, 'application.log');

/**
 * Check if log file exists
 */
const logFileExists = (): boolean => {
  return fs.existsSync(applicationLogPath);
};

/**
 * Parse a log line into structured format
 */
const parseLogLine = (line: string): LogEntry | null => {
  try {
    // Format: [timestamp] [LEVEL] message | meta
    const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+?)(?:\s+\|\s+(.+))?$/);
    
    if (!match) {
      return null;
    }

    const [, timestamp, level, message, metaString] = match;
    
    let meta: any = null;
    if (metaString) {
      try {
        meta = JSON.parse(metaString);
      } catch {
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
  } catch (error) {
    return null;
  }
};

/**
 * Read log file with pagination
 */
const readLogFile = (
  filePath: string,
  page: number = 1,
  limit: number = 100,
  filter?: {
    level?: string;
    search?: string;
    queueName?: string;
    jobId?: string;
  }
): LogResponse => {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        logs: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Read entire file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    // Parse and filter logs
    let parsedLogs: LogEntry[] = lines
      .map(parseLogLine)
      .filter((log): log is LogEntry => log !== null);

    // Apply filters
    if (filter) {
      if (filter.level) {
        parsedLogs = parsedLogs.filter((log) => log.level === filter.level?.toLowerCase());
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        parsedLogs = parsedLogs.filter(
          (log) =>
            log.message.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.meta || '').toLowerCase().includes(searchLower)
        );
      }

      if (filter.queueName) {
        parsedLogs = parsedLogs.filter(
          (log) =>
            log.message.toLowerCase().includes(filter.queueName!.toLowerCase()) ||
            JSON.stringify(log.meta || '').toLowerCase().includes(filter.queueName!.toLowerCase())
        );
      }

      if (filter.jobId) {
        parsedLogs = parsedLogs.filter(
          (log) =>
            log.message.includes(filter.jobId!) ||
            JSON.stringify(log.meta || '').includes(filter.jobId!)
        );
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
  } catch (error) {
    logger.error('Failed to read log file', { filePath, error });
    throw new ApiError(500, 'Failed to read log file');
  }
};

/**
 * Get application logs
 */
export const getApplicationLogs = (
  page: number = 1,
  limit: number = 100,
  filter?: {
    level?: string;
    search?: string;
  }
): LogResponse => {
  return readLogFile(applicationLogPath, page, limit, filter);
};

/**
 * Get queue-related logs
 */
export const getQueueLogs = (
  queueName?: string,
  page: number = 1,
  limit: number = 100
): LogResponse => {
  return readLogFile(applicationLogPath, page, limit, {
    queueName,
    search: queueName ? undefined : 'queue',
  });
};

/**
 * Get video processing logs
 */
export const getVideoProcessingLogs = (
  jobId?: string,
  page: number = 1,
  limit: number = 100
): LogResponse => {
  return readLogFile(applicationLogPath, page, limit, {
    search: 'video processing',
    jobId,
  });
};

/**
 * Get logs by job ID
 */
export const getLogsByJobId = (
  jobId: string,
  page: number = 1,
  limit: number = 100
): LogResponse => {
  return readLogFile(applicationLogPath, page, limit, {
    jobId,
  });
};

/**
 * Get log file info
 */
export const getLogFileInfo = (): {
  exists: boolean;
  path: string;
  size?: number;
  lastModified?: Date;
} => {
  const exists = logFileExists();
  const info: any = {
    exists,
    path: applicationLogPath,
  };

  if (exists) {
    try {
      const stats = fs.statSync(applicationLogPath);
      info.size = stats.size;
      info.lastModified = stats.mtime;
    } catch (error) {
      logger.error('Failed to get log file stats', { error });
    }
  }

  return info;
};

