import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminBatchService from '../../services/admin/adminBatch.service';
import * as batchExportService from '../../services/admin/batchExport.service';
import * as batchImportService from '../../services/admin/batchImport.service';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';

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
 * Create batch (admin)
 */
export const createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as BatchCreateInput;

    // centerId is required for admin batch creation
    if (!data.centerId) {
      throw new ApiError(400, t('admin.batches.centerIdRequired'));
    }

    const batch = await adminBatchService.createBatchByAdmin(data);

    const response = new ApiResponse(201, { batch }, t('admin.batches.created'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all batches (admin view)
 */
export const getAllBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { userId, centerId, sportId, status, isActive, search, sortBy, sortOrder } = req.query;

    const filters: adminBatchService.GetAdminBatchesFilters = {
      userId: userId as string,
      centerId: centerId as string,
      sportId: sportId as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminBatchService.getAllBatches(page, limit, filters, currentUserId, currentUserRole);

    const response = new ApiResponse(200, result, t('admin.batches.listRetrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batch by ID (admin view)
 */
export const getBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;
    
    const batch = await adminBatchService.getBatchById(id, currentUserId, currentUserRole);

    if (!batch) {
      throw new ApiError(404, t('admin.batches.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('admin.batches.retrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batches by user ID (admin view)
 */
export const getBatchesByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminBatchService.getBatchesByUserId(
      userId,
      page,
      limit,
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      currentUserId,
      currentUserRole
    );

    const response = new ApiResponse(200, result, t('admin.batches.listRetrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batches by center ID (admin view)
 */
export const getBatchesByCenterId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { centerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await adminBatchService.getBatchesByCenterId(
      centerId,
      page,
      limit,
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      currentUserId,
      currentUserRole
    );

    const response = new ApiResponse(200, result, t('admin.batches.listRetrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update batch (admin)
 */
export const updateBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as BatchUpdateInput;

    const batch = await adminBatchService.updateBatchByAdmin(id, data);

    if (!batch) {
      throw new ApiError(404, t('admin.batches.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('admin.batches.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete batch (admin)
 */
export const deleteBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await adminBatchService.deleteBatchByAdmin(id);

    const response = new ApiResponse(200, null, t('admin.batches.deleted'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle batch status (admin)
 */
export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const batch = await adminBatchService.toggleBatchStatusByAdmin(id);

    const response = new ApiResponse(200, { batch }, t('admin.batches.statusToggled'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Export all batches to Excel (admin)
 */
export const exportBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, centerId, sportId, status, isActive } = req.query;
    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const filters: batchExportService.BatchExportFilters = {
      userId: userId as string,
      centerId: centerId as string,
      sportId: sportId as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      agentUserId: currentUserRole === 'agent' ? currentUserId : undefined,
    };

    const buffer = await batchExportService.exportBatchesToExcel(filters);
    const filename = `batches-export-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Import batches from Excel and bulk update (admin)
 */
export const importBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      throw new ApiError(400, 'No file uploaded. Use field name: file');
    }

    const currentUserId = req.user?.id;
    const currentUserRole = await getUserRoleFromDatabase(currentUserId) || req.user?.role;

    const result = await batchImportService.importBatchesFromExcel(file.buffer, {
      agentUserId: currentUserRole === 'agent' ? currentUserId : undefined,
    });

    const response = new ApiResponse(200, result, 'Bulk update completed');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
