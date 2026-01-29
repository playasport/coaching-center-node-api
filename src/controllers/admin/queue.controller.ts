import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as queueService from '../../services/admin/queue.service';

/**
 * Get all queues with statistics
 */
export const getAllQueues = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await queueService.getAllQueues();
    const response = new ApiResponse(200, result, 'Queues retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get jobs from a specific queue
 */
export const getQueueJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName } = req.params;
    const { status, page, limit } = req.query;

    const result = await queueService.getQueueJobs(
      queueName,
      (status as any) || 'all',
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );

    const response = new ApiResponse(200, result, 'Queue jobs retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific job by ID
 */
export const getQueueJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName, jobId } = req.params;
    const job = await queueService.getQueueJob(queueName, jobId);

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    const response = new ApiResponse(200, { job }, 'Job retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Retry a failed job
 */
export const retryJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName, jobId } = req.params;
    await queueService.retryJob(queueName, jobId);

    const response = new ApiResponse(200, null, 'Job retried successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a job
 */
export const removeJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName, jobId } = req.params;
    await queueService.removeJob(queueName, jobId);

    const response = new ApiResponse(200, null, 'Job removed successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Pause a queue
 */
export const pauseQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName } = req.params;
    await queueService.pauseQueue(queueName);

    const response = new ApiResponse(200, null, 'Queue paused successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Resume a queue
 */
export const resumeQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName } = req.params;
    await queueService.resumeQueue(queueName);

    const response = new ApiResponse(200, null, 'Queue resumed successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Clean a queue (remove completed/failed jobs)
 */
export const cleanQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { queueName } = req.params;
    const { grace, limit } = req.query;

    const cleaned = await queueService.cleanQueue(
      queueName,
      parseInt(grace as string) || 1000,
      parseInt(limit as string) || 1000
    );

    const response = new ApiResponse(200, { cleaned }, 'Queue cleaned successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

