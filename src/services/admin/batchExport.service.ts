import { BatchModel } from '../../models/batch.model';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';

export interface BatchExportFilters {
  userId?: string;
  centerId?: string;
  sportId?: string;
  status?: string;
  isActive?: boolean;
  /** For agent role: only export batches from centers added by this agent */
  agentUserId?: string;
}

const getCenterObjectId = async (centerId: string): Promise<Types.ObjectId | null> => {
  try {
    const { CoachingCenterModel } = await import('../../models/coachingCenter.model');
    if (Types.ObjectId.isValid(centerId) && centerId.length === 24) {
      const center = await CoachingCenterModel.findById(centerId).select('_id').lean();
      return center ? (center._id as Types.ObjectId) : null;
    }
    const center = await CoachingCenterModel.findOne({ id: centerId, is_deleted: false })
      .select('_id')
      .lean();
    return center ? (center._id as Types.ObjectId) : null;
  } catch {
    return null;
  }
};

const getSportObjectId = async (sportId: string): Promise<Types.ObjectId | null> => {
  try {
    const { getSportObjectId } = await import('../../utils/sportCache');
    return getSportObjectId(sportId);
  } catch {
    return null;
  }
};

const getUserObjectId = async (userId: string): Promise<Types.ObjectId | null> => {
  try {
    const { getUserObjectId } = await import('../../utils/userCache');
    return getUserObjectId(userId);
  } catch {
    return null;
  }
};

/**
 * Get all batches for export (no pagination, with filters)
 */
const getBatchesForExport = async (filters: BatchExportFilters = {}): Promise<any[]> => {
  const { CoachingCenterModel } = await import('../../models/coachingCenter.model');
  const { AdminUserModel } = await import('../../models/adminUser.model');

  const query: any = { is_deleted: false };

  // Agent filtering: only batches from centers added by this agent
  if (filters.agentUserId) {
    const adminUser = await AdminUserModel.findOne({ id: filters.agentUserId, isDeleted: false })
      .select('_id')
      .lean();
    if (adminUser?._id) {
      const centers = await CoachingCenterModel.find({
        addedBy: adminUser._id,
        is_deleted: false,
      })
        .select('_id')
        .lean();
      const agentCenterIds = centers.map((c: any) => c._id as Types.ObjectId);
      if (agentCenterIds.length === 0) return [];
      query.center = { $in: agentCenterIds };
    } else {
      return [];
    }
  }

  if (filters.userId) {
    const userObjectId = await getUserObjectId(filters.userId);
    if (userObjectId) query.user = userObjectId;
  }
  if (filters.centerId) {
    const centerObjectId = await getCenterObjectId(filters.centerId);
    if (centerObjectId) query.center = centerObjectId;
  }
  if (filters.sportId) {
    const sportObjectId = await getSportObjectId(filters.sportId);
    if (sportObjectId) query.sport = sportObjectId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.isActive !== undefined) query.is_active = filters.isActive;

  const batches = await BatchModel.find(query)
    .populate('user', 'id firstName lastName email mobile')
    .populate('sport', '_id custom_id name')
    .populate('center', '_id id center_name')
    .populate('coach', '_id fullName')
    .sort({ createdAt: -1 })
    .lean();

  return batches;
};

/**
 * Transform batch to flat row for Excel export
 */
const batchToExportRow = (batch: any): Record<string, string | number | boolean | null> => {
  const sport = batch.sport as any;
  const center = batch.center as any;
  const coach = batch.coach as any;

  const individualTimings =
    batch.scheduled?.individual_timings && batch.scheduled.individual_timings.length > 0
      ? JSON.stringify(batch.scheduled.individual_timings)
      : '';

  const trainingDays = Array.isArray(batch.scheduled?.training_days)
    ? batch.scheduled.training_days.join(',')
    : '';

  const gender = Array.isArray(batch.gender) ? batch.gender.join(',') : '';

  return {
    _id: batch._id?.toString() ?? '',
    name: batch.name ?? '',
    description: batch.description ?? '',
    sportId: sport?._id?.toString() ?? '',
    sportName: sport?.name ?? '',
    centerId: center?.id ?? center?._id?.toString() ?? '',
    centerName: center?.center_name ?? '',
    coachId: coach?._id?.toString() ?? '',
    coachName: coach?.fullName ?? '',
    gender,
    certificate_issued: batch.certificate_issued ?? false,
    start_date: batch.scheduled?.start_date
      ? new Date(batch.scheduled.start_date).toISOString().split('T')[0]
      : '',
    end_date:
      batch.scheduled?.end_date ?
        new Date(batch.scheduled.end_date).toISOString().split('T')[0]
      : '',
    training_days: trainingDays,
    individual_timings: individualTimings,
    duration_count: batch.duration?.count ?? 1,
    duration_type: batch.duration?.type ?? 'month',
    capacity_min: batch.capacity?.min ?? 1,
    capacity_max: batch.capacity?.max ?? null,
    age_min: batch.age?.min ?? 3,
    age_max: batch.age?.max ?? 18,
    admission_fee: batch.admission_fee ?? null,
    base_price: batch.base_price ?? 0,
    discounted_price: batch.discounted_price ?? null,
    is_allowed_disabled: batch.is_allowed_disabled ?? false,
    status: batch.status ?? 'draft',
    is_active: batch.is_active ?? false,
  };
};

/**
 * Export all batches to Excel with full details
 */
export const exportBatchesToExcel = async (
  filters: BatchExportFilters = {}
): Promise<Buffer> => {
  try {
    const batches = await getBatchesForExport(filters);
    const rows = batches.map(batchToExportRow);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Batches', { views: [{ state: 'frozen', ySplit: 1 }] });

    const columns: Partial<ExcelJS.Column>[] = [
      { header: '_id', key: '_id', width: 26 },
      { header: 'name', key: 'name', width: 25 },
      { header: 'description', key: 'description', width: 40 },
      { header: 'sportId', key: 'sportId', width: 26 },
      { header: 'sportName', key: 'sportName', width: 20 },
      { header: 'centerId', key: 'centerId', width: 36 },
      { header: 'Coaching Center Name', key: 'centerName', width: 35 },
      { header: 'coachId', key: 'coachId', width: 26 },
      { header: 'coachName', key: 'coachName', width: 25 },
      { header: 'gender', key: 'gender', width: 20 },
      { header: 'certificate_issued', key: 'certificate_issued', width: 18 },
      { header: 'start_date', key: 'start_date', width: 12 },
      { header: 'end_date', key: 'end_date', width: 12 },
      { header: 'training_days', key: 'training_days', width: 40 },
      { header: 'individual_timings', key: 'individual_timings', width: 60 },
      { header: 'duration_count', key: 'duration_count', width: 14 },
      { header: 'duration_type', key: 'duration_type', width: 14 },
      { header: 'capacity_min', key: 'capacity_min', width: 12 },
      { header: 'capacity_max', key: 'capacity_max', width: 12 },
      { header: 'age_min', key: 'age_min', width: 10 },
      { header: 'age_max', key: 'age_max', width: 10 },
      { header: 'admission_fee', key: 'admission_fee', width: 14 },
      { header: 'base_price', key: 'base_price', width: 12 },
      { header: 'discounted_price', key: 'discounted_price', width: 16 },
      { header: 'is_allowed_disabled', key: 'is_allowed_disabled', width: 18 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'is_active', key: 'is_active', width: 12 },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    rows.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    logger.error('Failed to export batches to Excel:', error);
    throw new ApiError(500, 'Failed to export batches');
  }
};
