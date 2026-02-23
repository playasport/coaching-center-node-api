import ExcelJS from 'exceljs';
import { BatchModel } from '../../models/batch.model';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { BatchStatus } from '../../enums/batchStatus.enum';
import { DurationType } from '../../enums/durationType.enum';
import { OperatingDays } from '../../enums/operatingDays.enum';

export interface BatchImportResult {
  total: number;
  updated: number;
  skipped: number;
  errors: { row: number; _id: string; message: string }[];
}

export interface BatchImportOptions {
  /** For agent role: only allow updates to batches from centers added by this agent */
  agentUserId?: string;
}

const trainingDaysEnum = Object.values(OperatingDays).map((d) => d.toLowerCase());
const durationTypes = Object.values(DurationType);

const parseNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = parseFloat(String(v).trim());
  return isNaN(n) ? null : n;
};

const parseBoolean = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
};

const parseDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const parseJsonArray = (v: any): any[] | null => {
  if (!v || typeof v !== 'string') return null;
  try {
    const arr = JSON.parse(v.trim());
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
};

const parseCommaList = (v: any): string[] => {
  if (!v) return [];
  const s = String(v).trim();
  if (!s) return [];
  return s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
};

const roundPrice = (n: number | null): number | null =>
  n != null ? Math.round(n * 100) / 100 : null;

/** Find or create coach by name for the given center. Returns coach ObjectId or null. */
const findOrCreateCoach = async (
  centerObjectId: Types.ObjectId,
  coachName: string
): Promise<Types.ObjectId | null> => {
  const trimmed = coachName?.trim();
  if (!trimmed) return null;

  const { EmployeeModel } = await import('../../models/employee.model');

  const existing = await EmployeeModel.findOne({
    center: centerObjectId,
    fullName: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    is_deleted: false,
  })
    .select('_id')
    .lean();

  if (existing) return existing._id as Types.ObjectId;

  const centerIdStr = centerObjectId.toString();
  const { createCoachForCoachingCenter } = await import('./adminCoachingCenter.service');
  const created = await createCoachForCoachingCenter(centerIdStr, trimmed);
  return created?.id ? new Types.ObjectId(created.id) : null;
};

/**
 * Parse Excel file and bulk update batches
 * Matches batches by _id column
 */
export const importBatchesFromExcel = async (
  buffer: Buffer,
  options: BatchImportOptions = {}
): Promise<BatchImportResult> => {
  const result: BatchImportResult = { total: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new ApiError(400, 'Excel file has no worksheets');
    }

    // Build column index map from header row (supports both old and new export formats)
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = cell.value?.toString()?.trim()?.toLowerCase();
      if (key && !colMap[key]) colMap[key] = colNumber;
    });

    const getCol = (key: string, fallback: number) => colMap[key] ?? fallback;

    const rows = worksheet.getRows(2, worksheet.rowCount) || [];
    result.total = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const _id = row?.getCell(getCol('_id', 1))?.value?.toString()?.trim();
      if (!_id) {
        result.skipped++;
        continue;
      }

      if (!Types.ObjectId.isValid(_id)) {
        result.errors.push({ row: rowNum, _id, message: 'Invalid _id format' });
        continue;
      }

      const batch = await BatchModel.findById(_id);
      if (!batch) {
        result.errors.push({ row: rowNum, _id, message: 'Batch not found' });
        continue;
      }

      // Agent check: only allow updates to batches from centers added by this agent
      if (options.agentUserId) {
        const { CoachingCenterModel } = await import('../../models/coachingCenter.model');
        const { AdminUserModel } = await import('../../models/adminUser.model');
        const adminUser = await AdminUserModel.findOne({
          id: options.agentUserId,
          isDeleted: false,
        })
          .select('_id')
          .lean();
        if (adminUser?._id) {
          const center = await CoachingCenterModel.findById(batch.center)
            .select('addedBy')
            .lean();
          if (
            !center ||
            !center.addedBy ||
            center.addedBy.toString() !== adminUser._id.toString()
          ) {
            result.errors.push({
              row: rowNum,
              _id,
              message: 'Not authorized to update this batch',
            });
            continue;
          }
        } else {
          result.errors.push({ row: rowNum, _id, message: 'Agent not found' });
          continue;
        }
      }

      try {
        // Blank cell = skip update (preserve existing value)
        const name = row?.getCell(getCol('name', 2))?.value?.toString()?.trim();
        const description = row?.getCell(getCol('description', 3))?.value?.toString()?.trim();
        const coachIdVal = row?.getCell(getCol('coachid', 8))?.value?.toString()?.trim();
        const coachNameVal = row?.getCell(getCol('coachname', 9))?.value?.toString()?.trim();
        const genderStr = row?.getCell(getCol('gender', 10))?.value?.toString();
        const certificateIssued = row?.getCell(getCol('certificate_issued', 11))?.value;
        const startDateVal = row?.getCell(getCol('start_date', 12))?.value;
        const endDateVal = row?.getCell(getCol('end_date', 13))?.value;
        const trainingDaysStr = row?.getCell(getCol('training_days', 14))?.value?.toString();
        const individualTimingsStr = row?.getCell(getCol('individual_timings', 15))?.value?.toString();
        const durationCount = parseNumber(row?.getCell(getCol('duration_count', 16))?.value);
        const durationType = row?.getCell(getCol('duration_type', 17))?.value?.toString()?.trim()?.toLowerCase();
        const capacityMin = parseNumber(row?.getCell(getCol('capacity_min', 18))?.value);
        const capacityMax = parseNumber(row?.getCell(getCol('capacity_max', 19))?.value);
        const ageMin = parseNumber(row?.getCell(getCol('age_min', 20))?.value);
        const ageMax = parseNumber(row?.getCell(getCol('age_max', 21))?.value);
        const admissionFee = parseNumber(row?.getCell(getCol('admission_fee', 22))?.value);
        const basePrice = parseNumber(row?.getCell(getCol('base_price', 23))?.value);
        const discountedPrice = parseNumber(row?.getCell(getCol('discounted_price', 24))?.value);
        const isAllowedDisabled = row?.getCell(getCol('is_allowed_disabled', 25))?.value;
        const statusVal = row?.getCell(getCol('status', 26))?.value?.toString()?.trim()?.toLowerCase();
        const isActiveVal = row?.getCell(getCol('is_active', 27))?.value;

        const updates: Record<string, any> = {};

        // Blank cell = skip (do not overwrite existing value)
        if (name !== undefined && name !== '') updates.name = name;

        if (description !== undefined && description !== '') updates.description = description;

        // Coach: only update when value provided; blank = skip (preserve existing)
        if (coachIdVal && Types.ObjectId.isValid(coachIdVal)) {
          const { EmployeeModel } = await import('../../models/employee.model');
          const coach = await EmployeeModel.findOne({
            _id: new Types.ObjectId(coachIdVal),
            center: batch.center,
            is_deleted: false,
          }).select('_id').lean();
          if (coach) {
            updates.coach = coach._id;
          } else if (coachNameVal) {
            const coachObjId = await findOrCreateCoach(batch.center as Types.ObjectId, coachNameVal);
            updates.coach = coachObjId;
          }
        } else if (coachNameVal) {
          const coachObjId = await findOrCreateCoach(batch.center as Types.ObjectId, coachNameVal);
          updates.coach = coachObjId ?? null;
        }
        // blank coachId + blank coachName = skip (no change)

        if (genderStr !== undefined && genderStr !== '') {
          const genders = parseCommaList(genderStr).filter((g) =>
            ['male', 'female', 'others'].includes(g)
          );
          if (genders.length > 0) updates.gender = genders;
        }

        if (certificateIssued !== undefined && certificateIssued !== '') {
          updates.certificate_issued = parseBoolean(certificateIssued);
        }

        let scheduledModified = false;
        if (startDateVal !== undefined && startDateVal !== '' && startDateVal !== null) {
          const d = parseDate(startDateVal);
          if (d) {
            if (!batch.scheduled) batch.scheduled = {} as any;
            batch.scheduled.start_date = d;
            scheduledModified = true;
          }
        }
        if (endDateVal !== undefined && endDateVal !== '' && endDateVal !== null) {
          const d = parseDate(endDateVal);
          if (!batch.scheduled) batch.scheduled = {} as any;
          batch.scheduled.end_date = d;
          scheduledModified = true;
        }
        if (trainingDaysStr !== undefined && trainingDaysStr !== '') {
          const days = parseCommaList(trainingDaysStr).filter((d) => trainingDaysEnum.includes(d));
          if (days.length > 0) {
            if (!batch.scheduled) batch.scheduled = {} as any;
            batch.scheduled.training_days = days;
            scheduledModified = true;
          }
        }
        if (individualTimingsStr !== undefined && individualTimingsStr !== '') {
          const timings = parseJsonArray(individualTimingsStr);
          if (timings && timings.length > 0) {
            const valid = timings.filter(
              (t: any) =>
                t &&
                typeof t === 'object' &&
                t.day &&
                /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(t.start_time) &&
                /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(t.end_time)
            );
            if (valid.length > 0) {
              if (!batch.scheduled) batch.scheduled = {} as any;
              batch.scheduled.individual_timings = valid;
              scheduledModified = true;
            }
          }
        }
        if (scheduledModified) batch.markModified('scheduled');

        let durationModified = false;
        if (durationCount !== null && durationCount >= 1 && durationCount <= 1000) {
          if (!batch.duration) batch.duration = {} as any;
          batch.duration.count = durationCount;
          durationModified = true;
        }
        if (durationType && durationTypes.includes(durationType as DurationType)) {
          if (!batch.duration) batch.duration = {} as any;
          batch.duration.type = durationType as DurationType;
          durationModified = true;
        }
        if (durationModified) batch.markModified('duration');

        let capacityModified = false;
        if (capacityMin !== null && capacityMin >= 1) {
          if (!batch.capacity) batch.capacity = {} as any;
          batch.capacity.min = capacityMin;
          capacityModified = true;
        }
        if (capacityMax != null && capacityMax >= 1) {
          if (!batch.capacity) batch.capacity = {} as any;
          batch.capacity.max = capacityMax;
          capacityModified = true;
        }
        if (capacityModified) batch.markModified('capacity');

        let ageModified = false;
        if (ageMin !== null && ageMin >= 3 && ageMin <= 18) {
          if (!batch.age) batch.age = {} as any;
          batch.age.min = ageMin;
          ageModified = true;
        }
        if (ageMax !== null && ageMax >= 3 && ageMax <= 18) {
          if (!batch.age) batch.age = {} as any;
          batch.age.max = ageMax;
          ageModified = true;
        }
        if (ageModified) batch.markModified('age');

        // parseNumber returns null for blank cells - skip to preserve existing
        if (admissionFee != null) updates.admission_fee = roundPrice(admissionFee);
        if (basePrice != null && basePrice >= 0) updates.base_price = roundPrice(basePrice)!;
        if (discountedPrice != null) updates.discounted_price = roundPrice(discountedPrice);

        if (isAllowedDisabled !== undefined && isAllowedDisabled !== '') {
          updates.is_allowed_disabled = parseBoolean(isAllowedDisabled);
        }

        if (statusVal && ['published', 'draft'].includes(statusVal)) {
          if (batch.status !== BatchStatus.PUBLISHED || statusVal !== 'draft') {
            updates.status = statusVal;
            updates.is_active = statusVal === 'published';
          }
        } else if (isActiveVal !== undefined && isActiveVal !== '') {
          updates.is_active = parseBoolean(isActiveVal);
        }

        Object.assign(batch, updates);
        await batch.save();
        result.updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Update failed';
        result.errors.push({ row: rowNum, _id, message: msg });
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error('Batch import failed:', err);
    throw new ApiError(500, 'Failed to import batches from file');
  }

  return result;
};
