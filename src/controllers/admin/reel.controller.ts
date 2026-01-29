import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminReelService from '../../services/admin/reel.service';
import { ReelStatus } from '../../models/reel.model';
import { uploadMediaFile } from '../../services/common/coachingCenterMedia.service';
import { validateVideoDurationFromBuffer } from '../../services/common/videoDurationValidation.service';

/**
 * Get all reels for admin
 */
export const getAllReels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, videoProcessingStatus, userId, sportId, search, sortBy, sortOrder } = req.query;

    const params: adminReelService.GetAdminReelsParams = {
      page,
      limit,
      status: status as ReelStatus,
      videoProcessingStatus: videoProcessingStatus as any,
      userId: userId as string,
      sportId: sportId as string,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminReelService.getAllReels(params);

    const response = new ApiResponse(200, result, 'Reels retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reel by ID for admin
 */
export const getReelById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const reel = await adminReelService.getReelById(id);

    if (!reel) {
      throw new ApiError(404, 'Reel not found');
    }

    const response = new ApiResponse(200, { reel }, 'Reel retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload video for reel
 * Validates video duration (max 90 seconds) during upload
 */
export const uploadReelVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Video file is required');
    }

    // Validate video duration from buffer (max 90 seconds for reels)
    // This is faster than downloading from S3 later
    const duration = await validateVideoDurationFromBuffer(
      req.file.buffer,
      90,
      req.file.originalname
    );

    // Upload to S3
    const videoUrl = await uploadMediaFile({
      file: req.file,
      mediaType: 'video',
    });

    const response = new ApiResponse(
      200,
      { videoUrl, duration: Math.round(duration) },
      'Video uploaded successfully. Duration validated.'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload thumbnail for reel
 */
export const uploadReelThumbnail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Thumbnail file is required');
    }

    const thumbnailUrl = await uploadMediaFile({
      file: req.file,
      mediaType: 'image',
    });

    const response = new ApiResponse(200, { thumbnailUrl }, 'Thumbnail uploaded successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload both video and thumbnail
 * Validates video duration (max 90 seconds) during upload
 */
export const uploadReelMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.video || files.video.length === 0) {
      throw new ApiError(400, 'Video file is required');
    }

    const videoFile = files.video[0];

    // Validate video duration from buffer (max 90 seconds for reels)
    // This is faster than downloading from S3 later
    const duration = await validateVideoDurationFromBuffer(
      videoFile.buffer,
      90,
      videoFile.originalname
    );

    const videoUrl = await uploadMediaFile({
      file: videoFile,
      mediaType: 'video',
    });

    let thumbnailUrl: string | undefined;
    if (files.thumbnail && files.thumbnail.length > 0) {
      thumbnailUrl = await uploadMediaFile({
        file: files.thumbnail[0],
        mediaType: 'image',
      });
    }

    const response = new ApiResponse(
      200,
      { videoUrl, thumbnailUrl, duration: Math.round(duration) },
      'Media files uploaded successfully. Duration validated.'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create reel by admin
 */
export const createReel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const data: adminReelService.CreateReelInput = req.body;

    const reel = await adminReelService.createReel(data, adminId || '');

    const response = new ApiResponse(201, { reel }, 'Reel created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel by admin
 */
export const updateReel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const data: adminReelService.UpdateReelInput = req.body;

    const reel = await adminReelService.updateReel(id, data, adminId || '');

    if (!reel) {
      throw new ApiError(404, 'Reel not found');
    }

    const response = new ApiResponse(200, { reel }, 'Reel updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reel (soft delete)
 */
export const deleteReel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const deleted = await adminReelService.deleteReel(id, adminId || '');

    if (!deleted) {
      throw new ApiError(404, 'Reel not found');
    }

    const response = new ApiResponse(200, null, 'Reel deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel status
 */
export const updateReelStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id;

    const reel = await adminReelService.updateReelStatus(id, status, adminId || '');

    if (!reel) {
      throw new ApiError(404, 'Reel not found');
    }

    const response = new ApiResponse(200, { reel }, 'Reel status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reprocess video for a reel
 */
export const reprocessReelVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const result = await adminReelService.reprocessReelVideo(id, adminId || '');

    const response = new ApiResponse(200, result, result.message);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload preview video for a specific reel
 */
export const uploadReelPreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!req.file) {
      throw new ApiError(400, 'Preview video file is required');
    }

    const previewUrl = await uploadMediaFile({
      file: req.file,
      mediaType: 'video',
    });

    // Update the reel with the preview URL
    const reel = await adminReelService.updateReelPreview(id, previewUrl, adminId || '');

    if (!reel) {
      throw new ApiError(404, 'Reel not found');
    }

    const response = new ApiResponse(
      200,
      { previewUrl, reel },
      'Preview video uploaded and updated successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

