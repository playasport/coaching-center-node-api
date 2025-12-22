import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as logService from '../../services/admin/log.service';

/**
 * Get application logs
 */
export const getApplicationLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, level, search } = req.query;

    const result = logService.getApplicationLogs(
      parseInt(page as string) || 1,
      parseInt(limit as string) || 100,
      {
        level: level as string,
        search: search as string,
      }
    );

    const response = new ApiResponse(200, result, 'Application logs retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get queue logs
 */
export const getQueueLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName, page, limit } = req.query;

    const result = logService.getQueueLogs(
      queueName as string,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 100
    );

    const response = new ApiResponse(200, result, 'Queue logs retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get video processing logs
 */
export const getVideoProcessingLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId, page, limit } = req.query;

    const result = logService.getVideoProcessingLogs(
      jobId as string,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 100
    );

    const response = new ApiResponse(200, result, 'Video processing logs retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs by job ID
 */
export const getLogsByJobId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { page, limit } = req.query;

    const result = logService.getLogsByJobId(
      jobId,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 100
    );

    const response = new ApiResponse(200, result, 'Job logs retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get log file info
 */
export const getLogFileInfo = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const info = logService.getLogFileInfo();
    const response = new ApiResponse(200, info, 'Log file info retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

