import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminCoachingCenterService from '../../services/admin/adminCoachingCenter.service';
import * as commonService from '../../services/common/coachingCenterCommon.service';
import * as exportService from '../../services/admin/coachingCenterExport.service';

/**
 * Helper function to get user role from database (more reliable than JWT token)
 */
const getUserRoleFromDatabase = async (userId?: string): Promise<string | undefined> => {
  if (!userId) return undefined;
  
  try {
    const { AdminUserModel } = await import('../../models/adminUser.model');
    const { DefaultRoles } = await import('../../enums/defaultRoles.enum');
    const adminUser = await AdminUserModel.findOne({ id: userId })
      .select('roles')
      .populate('roles', 'name')
      .lean();
    
    if (adminUser && adminUser.roles) {
      const userRoles = adminUser.roles as any[];
      // Get the highest priority role (super_admin > admin > employee > agent)
      if (userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN)) {
        return DefaultRoles.SUPER_ADMIN;
      } else if (userRoles.some((r: any) => r?.name === DefaultRoles.ADMIN)) {
        return DefaultRoles.ADMIN;
      } else if (userRoles.some((r: any) => r?.name === DefaultRoles.EMPLOYEE)) {
        return DefaultRoles.EMPLOYEE;
      } else if (userRoles.some((r: any) => r?.name === DefaultRoles.AGENT)) {
        return DefaultRoles.AGENT;
      }
    }
  } catch (error) {
    // If error, fallback to undefined
  }
  
  return undefined;
};

/**
 * Get all coaching centers (admin view)
 */
export const getAllCoachingCenters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { userId, status, search, sportId, isActive, approvalStatus, sortBy, sortOrder } = req.query;

    const filters = {
      userId: userId as string,
      status: status as string,
      search: search as string,
      sportId: sportId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      approvalStatus: approvalStatus as 'approved' | 'rejected' | 'pending_approval' | undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminCoachingCenterService.getAllCoachingCenters(
      page,
      limit,
      filters,
      currentUserId,
      currentUserRole
    );

    const response = new ApiResponse(
      200,
      result,
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching center by ID (admin view)
 */
export const getCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
    
    const coachingCenter = await adminCoachingCenterService.getCoachingCenterByIdForAdmin(
      id,
      currentUserId,
      currentUserRole
    );

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.retrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching centers by user ID (admin view)
 */
export const getCoachingCentersByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminCoachingCenterService.getCoachingCentersByUserId(
      userId, 
      page, 
      limit, 
      sortBy as string, 
      sortOrder as 'asc' | 'desc',
      currentUserId,
      currentUserRole
    );

    const response = new ApiResponse(
      200,
      result,
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only) - no role permission required
 */
export const listCoachingCentersSimple = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get pagination and filter parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const centerId = req.query.centerId as string | undefined;

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminCoachingCenterService.listCoachingCentersSimple(
      page,
      limit,
      search,
      status,
      isActive,
      centerId,
      currentUserId,
      currentUserRole
    );

    const response = new ApiResponse(
      200,
      result,
      t('coachingCenter.list.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create coaching center by admin
 * Allows admin to create center by providing academy owner details
 */
export const createCoachingCenterByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bank_information, ...data } = req.body;
    
    // Get admin user ID from request (if authenticated)
    const adminUserId = req.user?.id;
    
    const coachingCenter = await adminCoachingCenterService.createCoachingCenterByAdmin(data, adminUserId);

    const response = new ApiResponse(201, { coachingCenter }, t('coachingCenter.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update coaching center (admin)
 */
export const updateCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { bank_information, ...data } = req.body;

    // Use admin update logic which supports userId change
    const coachingCenter = await adminCoachingCenterService.updateCoachingCenterByAdmin(id, data);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update coaching center added_by (agent/admin who added the center). Requires coaching_center:update.
 */
export const updateCoachingCenterAddedBy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { addedById } = req.body as { addedById?: string | null };
    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const coachingCenter = await adminCoachingCenterService.updateCoachingCenterAddedBy(
      id,
      addedById ?? null,
      currentUserId,
      currentUserRole
    );

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete coaching center (admin)
 */
export const deleteCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await commonService.deleteCoachingCenter(id);

    const response = new ApiResponse(200, null, t('admin.coachingCenters.deleted'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle coaching center status (admin)
 */
export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await commonService.toggleCoachingCenterStatus(id);

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove media from coaching center (admin)
 */
export const removeMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { mediaType, uniqueId, sportId } = req.body;

    if (!mediaType || !uniqueId) {
      throw new ApiError(400, t('coachingCenter.media.missingParams'));
    }

    await commonService.removeMediaFromCoachingCenter(
      id,
      mediaType as 'logo' | 'document' | 'image' | 'video',
      uniqueId,
      sportId
    );

    const response = new ApiResponse(200, { success: true }, t('coachingCenter.media.removeSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching center statistics for admin dashboard
 */
export const getCoachingCenterStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, userId, status, isActive, isApproved, approvalStatus, sportId, search } = req.query;

    const params = {
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      approvalStatus: approvalStatus as 'approved' | 'rejected' | 'pending_approval' | undefined,
      sportId: sportId as string,
      search: search as string,
    };

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const stats = await adminCoachingCenterService.getCoachingCenterStats(params, currentUserId, currentUserRole);

    const response = new ApiResponse(200, { stats }, t('admin.coachingCenters.statsRetrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Set image as banner for coaching center
 */
export const setBannerImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { sportId, imageUniqueId } = req.body;

    if (!sportId || !imageUniqueId) {
      throw new ApiError(400, t('admin.coachingCenters.sportIdAndImageUniqueIdRequired'));
    }

    const coachingCenter = await commonService.setBannerImage(id, sportId, imageUniqueId);

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.bannerImageSet'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload video thumbnail
 */
export const uploadVideoThumbnail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { sportId, videoUniqueId } = req.body;
    const thumbnailFile = req.file;

    if (!sportId || !videoUniqueId) {
      throw new ApiError(400, t('admin.coachingCenters.sportIdAndVideoUniqueIdRequired'));
    }

    if (!thumbnailFile) {
      throw new ApiError(400, t('admin.coachingCenters.thumbnailFileRequired'));
    }

    // Upload thumbnail file to S3
    const thumbnailUrl = await commonService.uploadThumbnailFile(thumbnailFile);

    const coachingCenter = await commonService.uploadVideoThumbnail(id, sportId, videoUniqueId, thumbnailUrl);

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.videoThumbnailUploaded'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Export coaching centers to Excel
 */
export const exportToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;

    const filters = {
      userId: userId as string,
      status: status as string,
      search: search as string,
      sportId: sportId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    const buffer = await exportService.exportToExcel(filters, currentUserId, currentUserRole);

    const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export coaching centers to PDF
 */
export const exportToPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;

    const filters = {
      userId: userId as string,
      status: status as string,
      search: search as string,
      sportId: sportId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    const buffer = await exportService.exportToPDF(filters, currentUserId, currentUserRole);

    const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export coaching centers to CSV
 */
export const exportToCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, status, search, sportId, isActive, isApproved, startDate, endDate } = req.query;

    const filters = {
      userId: userId as string,
      status: status as string,
      search: search as string,
      sportId: sportId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    const csvContent = await exportService.exportToCSV(filters, currentUserId, currentUserRole);

    const filename = `coaching-centers-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject coaching center
 */
export const updateApprovalStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isApproved, rejectReason } = req.body;
    const currentUserRole = req.user?.role;

    if (typeof isApproved !== 'boolean') {
      throw new ApiError(400, t('admin.coachingCenters.isApprovedRequired'));
    }

    const coachingCenter = await adminCoachingCenterService.updateApprovalStatus(
      id,
      isApproved,
      rejectReason,
      currentUserRole
    );

    const response = new ApiResponse(
      200,
      { coachingCenter },
      isApproved ? t('admin.coachingCenters.approved') : t('admin.coachingCenters.rejected')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaches (id and name only) for a coaching center.
 * GET /admin/coaching-centers/:id/coach?search=...&page=1&limit=100 (default limit 100)
 */
export const getCoaches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: coachingCenterId } = req.params;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    const result = await adminCoachingCenterService.getCoachesListByCoachingCenterId(
      coachingCenterId,
      search,
      page,
      limit
    );

    const response = new ApiResponse(200, result, 'Coaches retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a coach (employee) for a coaching center.
 * POST /admin/coaching-centers/:id/coach with body { name: string }
 */
export const createCoach = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: coachingCenterId } = req.params;
    const name = req.body?.name;

    const coach = await adminCoachingCenterService.createCoachForCoachingCenter(coachingCenterId, name);

    const response = new ApiResponse(201, { coach }, 'Coach created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees (coaches) by coaching center ID
 */
export const getEmployeesByCoachingCenterId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params; // coaching center ID
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const roleName = req.query.roleName as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await adminCoachingCenterService.getEmployeesByCoachingCenterId(
      id,
      page,
      limit,
      roleName,
      search
    );

    const response = new ApiResponse(
      200,
      {
        employees: result.coachingCenters, // Rename for clarity
        pagination: result.pagination,
      },
      t('admin.coachingCenters.employeesRetrieved')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};
