import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminHighlightService from '../../services/admin/highlight.service';
import { HighlightStatus } from '../../models/streamHighlight.model';
import { uploadMediaFile } from '../../services/common/coachingCenterMedia.service';

/**
 * Get all highlights for admin
 */
export const getAllHighlights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, videoProcessingStatus, coachingCenterId, userId, search, sortBy, sortOrder } = req.query;

    const params: adminHighlightService.GetAdminHighlightsParams = {
      page,
      limit,
      status: status as HighlightStatus,
      videoProcessingStatus: videoProcessingStatus as any,
      coachingCenterId: coachingCenterId as string,
      userId: userId as string,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminHighlightService.getAllHighlights(params);

    const response = new ApiResponse(200, result, 'Highlights retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get highlight by ID for admin
 */
export const getHighlightById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const highlight = await adminHighlightService.getHighlightById(id);

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    const response = new ApiResponse(200, { highlight }, 'Highlight retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new highlight
 */
export const createHighlight = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const data: adminHighlightService.CreateHighlightInput = req.body;

    // Validate required fields
    if (!data.title || !data.videoUrl || !data.userId) {
      throw new ApiError(400, 'Title, videoUrl, and userId are required');
    }

    const highlight = await adminHighlightService.createHighlight(data, adminId || '');

    const response = new ApiResponse(201, { highlight }, 'Highlight created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload video for highlight
 */
export const uploadHighlightVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Video file is required');
    }

    const videoUrl = await uploadMediaFile({
      file: req.file,
      mediaType: 'video',
    });

    const response = new ApiResponse(200, { videoUrl }, 'Video uploaded successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload thumbnail for highlight
 */
export const uploadHighlightThumbnail = async (
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
 */
export const uploadHighlightMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.video || files.video.length === 0) {
      throw new ApiError(400, 'Video file is required');
    }

    const videoUrl = await uploadMediaFile({
      file: files.video[0],
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
      { videoUrl, thumbnailUrl },
      'Media files uploaded successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload preview video for a specific highlight
 */
export const uploadHighlightPreview = async (
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

    // Update the highlight with the preview URL
    const highlight = await adminHighlightService.updateHighlightPreview(id, previewUrl, adminId || '');

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    const response = new ApiResponse(
      200,
      { previewUrl, highlight },
      'Preview video uploaded and updated successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update highlight by admin
 */
export const updateHighlight = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const data: adminHighlightService.UpdateHighlightInput = req.body;

    const highlight = await adminHighlightService.updateHighlight(id, data, adminId || '');

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    const response = new ApiResponse(200, { highlight }, 'Highlight updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete highlight (soft delete)
 */
export const deleteHighlight = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const deleted = await adminHighlightService.deleteHighlight(id, adminId || '');

    if (!deleted) {
      throw new ApiError(404, 'Highlight not found');
    }

    const response = new ApiResponse(200, null, 'Highlight deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update highlight status
 */
export const updateHighlightStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const { status } = req.body;

    if (!status || !Object.values(HighlightStatus).includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const highlight = await adminHighlightService.updateHighlightStatus(
      id,
      status as HighlightStatus,
      adminId || ''
    );

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    const response = new ApiResponse(200, { highlight }, 'Highlight status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reprocess video for a highlight
 */
export const reprocessHighlightVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const result = await adminHighlightService.reprocessHighlightVideo(id, adminId || '');

    const response = new ApiResponse(200, result, result.message);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

