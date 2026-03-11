"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCoachingCenterBasicDetailsFromExcel = exports.exportForBulkUpdateToExcel = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const adminUser_model_1 = require("../../models/adminUser.model");
const userCache_1 = require("../../utils/userCache");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const gender_enum_1 = require("../../enums/gender.enum");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const coachingCenterCache_1 = require("../../utils/coachingCenterCache");
const VALID_GENDERS = Object.values(gender_enum_1.Gender).map((g) => g.toLowerCase());
const parseBoolean = (v) => {
    if (typeof v === 'boolean')
        return v;
    const s = String(v ?? '').toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes';
};
const parseNumber = (v) => {
    if (v === null || v === undefined || v === '')
        return null;
    if (typeof v === 'number' && !isNaN(v))
        return v;
    const n = parseFloat(String(v).trim());
    return isNaN(n) ? null : n;
};
/**
 * Get coaching centers for bulk update export (basic editable fields only)
 */
const getCoachingCentersForBulkUpdate = async (filters = {}, currentUserId, currentUserRole) => {
    const query = { is_deleted: false };
    if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
        const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
            .select('_id')
            .lean();
        if (adminUser?._id) {
            query.addedBy = adminUser._id;
        }
        else {
            return [];
        }
    }
    if (filters.userId) {
        const userObjectId = await (0, userCache_1.getUserObjectId)(filters.userId);
        if (userObjectId)
            query.user = userObjectId;
    }
    if (filters.status)
        query.status = filters.status;
    if (filters.isActive !== undefined)
        query.is_active = filters.isActive;
    if (filters.approvalStatus)
        query.approval_status = filters.approvalStatus;
    if (filters.sportId)
        query.sports = new mongoose_1.Types.ObjectId(filters.sportId);
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
            query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }
    if (filters.search) {
        query.$or = [
            { center_name: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
            { mobile_number: { $regex: filters.search, $options: 'i' } },
        ];
    }
    return coachingCenter_model_1.CoachingCenterModel.find(query)
        .select('id _id center_name email age allowed_genders allowed_disabled is_only_for_disabled location')
        .sort({ createdAt: -1 })
        .lean();
};
/**
 * Export coaching centers to Excel for bulk update (basic details only)
 * Columns: Center ID, Center Name, Email, Age Min, Age Max, Allowed Genders, Allowed Disabled, Only For Disabled,
 * Address Line1, Address Line2, City, State, Country, Pincode, Latitude, Longitude
 */
const exportForBulkUpdateToExcel = async (filters = {}, currentUserId, currentUserRole) => {
    const centers = await getCoachingCentersForBulkUpdate(filters, currentUserId, currentUserRole);
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet('Basic Details');
    worksheet.columns = [
        { header: 'Center ID', key: 'Center ID', width: 36 },
        { header: 'Center Name', key: 'Center Name', width: 30 },
        { header: 'Email', key: 'Email', width: 30 },
        { header: 'Age Min', key: 'Age Min', width: 10 },
        { header: 'Age Max', key: 'Age Max', width: 10 },
        { header: 'Allowed Genders', key: 'Allowed Genders', width: 20 },
        { header: 'Allowed Disabled', key: 'Allowed Disabled', width: 15 },
        { header: 'Only For Disabled', key: 'Only For Disabled', width: 18 },
        { header: 'Address Line1', key: 'Address Line1', width: 30 },
        { header: 'Address Line2', key: 'Address Line2', width: 30 },
        { header: 'City', key: 'City', width: 20 },
        { header: 'State', key: 'State', width: 20 },
        { header: 'Country', key: 'Country', width: 20 },
        { header: 'Pincode', key: 'Pincode', width: 12 },
        { header: 'Latitude', key: 'Latitude', width: 12 },
        { header: 'Longitude', key: 'Longitude', width: 12 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
    };
    centers.forEach((center) => {
        worksheet.addRow({
            'Center ID': center.id || center._id?.toString() || '',
            'Center Name': center.center_name || '',
            'Email': center.email || '',
            'Age Min': center.age?.min ?? '',
            'Age Max': center.age?.max ?? '',
            'Allowed Genders': Array.isArray(center.allowed_genders)
                ? center.allowed_genders.join(', ')
                : '',
            'Allowed Disabled': center.allowed_disabled ? 'Yes' : 'No',
            'Only For Disabled': center.is_only_for_disabled ? 'Yes' : 'No',
            'Address Line1': center.location?.address?.line1 ?? '',
            'Address Line2': center.location?.address?.line2 ?? '',
            'City': center.location?.address?.city ?? '',
            'State': center.location?.address?.state ?? '',
            'Country': center.location?.address?.country ?? '',
            'Pincode': center.location?.address?.pincode ?? '',
            'Latitude': center.location?.latitude ?? '',
            'Longitude': center.location?.longitude ?? '',
        });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};
exports.exportForBulkUpdateToExcel = exportForBulkUpdateToExcel;
/**
 * Resolve center by ID (MongoDB ObjectId or custom UUID)
 */
const getCenterByImportId = async (centerId) => {
    if (!centerId || !centerId.trim())
        return null;
    const id = centerId.trim();
    if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
        const c = await coachingCenter_model_1.CoachingCenterModel.findById(id).lean();
        if (c)
            return c;
    }
    return coachingCenter_model_1.CoachingCenterModel.findOne({ id, is_deleted: false }).lean();
};
/**
 * Import coaching centers basic details from Excel and bulk update
 * Blank cells = no change. Matches by Center ID (UUID or MongoDB ObjectId).
 */
const importCoachingCenterBasicDetailsFromExcel = async (buffer, options = {}) => {
    const result = {
        total: 0,
        updated: 0,
        skipped: 0,
        errors: [],
    };
    const workbook = new exceljs_1.default.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new ApiError_1.ApiError(400, 'Excel file has no worksheets');
    }
    const headerRow = worksheet.getRow(1);
    const colMap = {};
    headerRow.eachCell((cell, colNumber) => {
        const key = cell.value?.toString()?.trim()?.toLowerCase()?.replace(/\s+/g, ' ');
        if (key && !colMap[key])
            colMap[key] = colNumber;
    });
    const getCol = (keys, fallback) => {
        for (const k of keys) {
            const v = colMap[k];
            if (v != null)
                return v;
        }
        return fallback;
    };
    const rows = worksheet.getRows(2, worksheet.rowCount) || [];
    result.total = rows.length;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const centerIdVal = row?.getCell(getCol(['center id', 'centerid'], 1))?.value?.toString()?.trim();
        if (!centerIdVal) {
            result.skipped++;
            continue;
        }
        const center = await getCenterByImportId(centerIdVal);
        if (!center) {
            result.errors.push({ row: rowNum, centerId: centerIdVal, message: 'Coaching center not found' });
            continue;
        }
        if (options.currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && options.currentUserId) {
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: options.currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (!adminUser?._id) {
                result.errors.push({ row: rowNum, centerId: centerIdVal, message: 'Agent not found' });
                continue;
            }
            const centerDoc = center;
            if (!centerDoc.addedBy ||
                centerDoc.addedBy.toString() !== adminUser._id.toString()) {
                result.errors.push({
                    row: rowNum,
                    centerId: centerIdVal,
                    message: 'Not authorized to update this center',
                });
                continue;
            }
        }
        const centerName = row?.getCell(getCol(['center name', 'centername'], 2))?.value?.toString()?.trim();
        const emailVal = row?.getCell(getCol(['email'], 3))?.value?.toString()?.trim();
        const ageMin = parseNumber(row?.getCell(getCol(['age min', 'agemin'], 4))?.value);
        const ageMax = parseNumber(row?.getCell(getCol(['age max', 'agemax'], 5))?.value);
        const allowedGendersStr = row?.getCell(getCol(['allowed genders', 'allowedgenders'], 6))?.value?.toString();
        const allowedDisabledVal = row?.getCell(getCol(['allowed disabled', 'alloweddisabled'], 7))?.value;
        const onlyForDisabledVal = row?.getCell(getCol(['only for disabled', 'onlyfordisabled'], 8))?.value;
        const addressLine1 = row?.getCell(getCol(['address line1', 'addressline1', 'line1'], 9))?.value?.toString()?.trim();
        const addressLine2 = row?.getCell(getCol(['address line2', 'addressline2', 'line2'], 10))?.value?.toString()?.trim();
        const city = row?.getCell(getCol(['city'], 11))?.value?.toString()?.trim();
        const state = row?.getCell(getCol(['state'], 12))?.value?.toString()?.trim();
        const country = row?.getCell(getCol(['country'], 13))?.value?.toString()?.trim();
        const pincode = row?.getCell(getCol(['pincode'], 14))?.value?.toString()?.trim();
        const lat = parseNumber(row?.getCell(getCol(['latitude', 'lat'], 15))?.value);
        const lng = parseNumber(row?.getCell(getCol(['longitude', 'lng', 'long'], 16))?.value);
        const updates = {};
        if (centerName !== undefined && centerName !== '')
            updates.center_name = centerName;
        if (emailVal !== undefined && emailVal !== '')
            updates.email = emailVal.toLowerCase();
        if (ageMin != null || ageMax != null) {
            const existing = center.age || {};
            updates.age = {
                min: ageMin ?? existing.min ?? 0,
                max: ageMax ?? existing.max ?? 100,
            };
        }
        if (allowedGendersStr !== undefined && allowedGendersStr !== '') {
            const parsed = allowedGendersStr
                .split(/[,;]/)
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
            const valid = parsed.filter((g) => VALID_GENDERS.includes(g));
            if (valid.length > 0)
                updates.allowed_genders = valid;
        }
        if (allowedDisabledVal !== undefined && allowedDisabledVal !== '') {
            updates.allowed_disabled = parseBoolean(allowedDisabledVal);
        }
        if (onlyForDisabledVal !== undefined && onlyForDisabledVal !== '') {
            updates.is_only_for_disabled = parseBoolean(onlyForDisabledVal);
        }
        if (addressLine1 !== undefined && addressLine1 !== '')
            updates['location.address.line1'] = addressLine1;
        if (addressLine2 !== undefined && addressLine2 !== '')
            updates['location.address.line2'] = addressLine2;
        if (city !== undefined && city !== '')
            updates['location.address.city'] = city;
        if (state !== undefined && state !== '')
            updates['location.address.state'] = state;
        if (country !== undefined && country !== '')
            updates['location.address.country'] = country;
        if (pincode !== undefined && pincode !== '')
            updates['location.address.pincode'] = pincode;
        if (lat != null)
            updates['location.latitude'] = lat;
        if (lng != null)
            updates['location.longitude'] = lng;
        if (Object.keys(updates).length === 0) {
            result.skipped++;
            continue;
        }
        try {
            const query = mongoose_1.Types.ObjectId.isValid(centerIdVal) && centerIdVal.length === 24
                ? { _id: new mongoose_1.Types.ObjectId(centerIdVal) }
                : { id: centerIdVal, is_deleted: false };
            await coachingCenter_model_1.CoachingCenterModel.updateOne(query, { $set: updates });
            result.updated++;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push({ row: rowNum, centerId: centerIdVal, message: msg });
        }
    }
    if (result.updated > 0) {
        (0, coachingCenterCache_1.invalidateCoachingCentersListCache)().catch(() => { });
    }
    logger_1.logger.info('Coaching center bulk import completed', {
        total: result.total,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length,
    });
    return result;
};
exports.importCoachingCenterBasicDetailsFromExcel = importCoachingCenterBasicDetailsFromExcel;
//# sourceMappingURL=coachingCenterBulkUpdate.service.js.map