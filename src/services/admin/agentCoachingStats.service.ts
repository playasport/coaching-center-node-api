import { Types } from 'mongoose';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import ExcelJS from 'exceljs';

export type ReportPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all_time' | 'custom';

export interface TimeReport {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface CoachingCentreStats {
  total_centres: number;
  pending_for_approval: number;
  rejected: number;
  active: number;
  inactive: number;
}

export interface AgentCoachingStats {
  coaching_centre_stats: CoachingCentreStats;
  today_report: TimeReport;
  this_week_report: TimeReport;
  this_month_report: TimeReport;
  all_time_report: TimeReport;
  report_generated_on: string;
}

function startOfTodayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0));
}

function endOfTodayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 23, 59, 59, 999));
}

function startOfThisWeekUTC(): Date {
  const n = new Date();
  const day = n.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(n);
  monday.setUTCDate(n.getUTCDate() - daysSinceMonday);
  return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0));
}

function startOfThisMonthUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfLastMonthUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1, 0, 0, 0, 0));
}

function endOfLastMonthUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0, 23, 59, 59, 999));
}

function getDateRangeForPeriod(
  period: ReportPeriod,
  startDate?: string,
  endDate?: string
): { $gte?: Date; $lte?: Date } | null {
  const endOfToday = endOfTodayUTC();

  switch (period) {
    case 'today': {
      return { $gte: startOfTodayUTC(), $lte: endOfToday };
    }
    case 'this_week': {
      return { $gte: startOfThisWeekUTC(), $lte: endOfToday };
    }
    case 'this_month': {
      return { $gte: startOfThisMonthUTC(), $lte: endOfToday };
    }
    case 'last_month': {
      return { $gte: startOfLastMonthUTC(), $lte: endOfLastMonthUTC() };
    }
    case 'all_time':
      return null;
    case 'custom': {
      if (!startDate && !endDate) return null;
      const range: { $gte?: Date; $lte?: Date } = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      return Object.keys(range).length ? range : null;
    }
    default:
      return null;
  }
}

function getReportPeriodLabel(
  period: ReportPeriod,
  startDate?: string,
  endDate?: string
): string {
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (period) {
    case 'today':
      return `Daily (${fmt(new Date())})`;
    case 'this_week':
      return `This Week (${fmt(startOfThisWeekUTC())} to ${fmt(endOfTodayUTC())})`;
    case 'this_month':
      return `This Month (${fmt(startOfThisMonthUTC())} to ${fmt(endOfTodayUTC())})`;
    case 'last_month':
      return `Last Month (${fmt(startOfLastMonthUTC())} to ${fmt(endOfLastMonthUTC())})`;
    case 'all_time':
      return 'All Time';
    case 'custom':
      return startDate || endDate
        ? `Custom (${startDate || '…'} to ${endDate || '…'})`
        : 'Custom';
    default:
      return String(period);
  }
}

async function getTimeReport(
  agentObjectId: Types.ObjectId,
  dateRange: { $gte?: Date; $lte?: Date } | null
): Promise<TimeReport> {
  const base: any = { addedBy: agentObjectId, is_deleted: false };
  if (dateRange) base.createdAt = dateRange;

  const counts = await CoachingCenterModel.aggregate([
    { $match: base },
    {
      $group: {
        _id: '$approval_status',
        count: { $sum: 1 },
      },
    },
  ]);

  const approved = counts.find((c: any) => c._id === 'approved')?.count ?? 0;
  const rejected = counts.find((c: any) => c._id === 'rejected')?.count ?? 0;
  const pending = counts.find((c: any) => c._id === 'pending_approval')?.count ?? 0;
  const total = approved + rejected + pending;

  return { total, pending, approved, rejected };
}

/**
 * Get agent coaching stats for a given agent (AdminUser _id).
 * Used when returning getOperationalUser and the user role is agent.
 */
export const getAgentCoachingStats = async (
  agentAdminUserObjectId: Types.ObjectId
): Promise<AgentCoachingStats> => {
  try {
    const base = { addedBy: agentAdminUserObjectId, is_deleted: false };
    const [coachingCentreStats, todayReport, thisWeekReport, thisMonthReport, allTimeReport] = await Promise.all([
      (async (): Promise<CoachingCentreStats> => {
        const [total, approvalAgg, activeAgg] = await Promise.all([
          CoachingCenterModel.countDocuments(base),
          CoachingCenterModel.aggregate([
            { $match: base },
            { $group: { _id: '$approval_status', count: { $sum: 1 } } },
          ]),
          CoachingCenterModel.aggregate([
            { $match: base },
            { $group: { _id: '$is_active', count: { $sum: 1 } } },
          ]),
        ]);
        const pending_for_approval = approvalAgg.find((a: any) => a._id === 'pending_approval')?.count ?? 0;
        const rejected = approvalAgg.find((a: any) => a._id === 'rejected')?.count ?? 0;
        const active = activeAgg.find((a: any) => a._id === true)?.count ?? 0;
        const inactive = activeAgg.find((a: any) => a._id === false)?.count ?? 0;
        return {
          total_centres: total,
          pending_for_approval,
          rejected,
          active,
          inactive,
        };
      })(),
      getTimeReport(agentAdminUserObjectId, getDateRangeForPeriod('today')),
      getTimeReport(agentAdminUserObjectId, getDateRangeForPeriod('this_week')),
      getTimeReport(agentAdminUserObjectId, getDateRangeForPeriod('this_month')),
      getTimeReport(agentAdminUserObjectId, null),
    ]);

    return {
      coaching_centre_stats: coachingCentreStats,
      today_report: todayReport,
      this_week_report: thisWeekReport,
      this_month_report: thisMonthReport,
      all_time_report: allTimeReport,
      report_generated_on: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get agent coaching stats', { agentId: agentAdminUserObjectId?.toString(), error });
    throw error;
  }
};

export interface ExportAgentCoachingOptions {
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  agentName?: string;
  agentEmail?: string;
  agentMobile?: string;
}

/**
 * Export agent coaching centers to Excel with stats.
 * period: today | this_week | this_month | last_month | all_time | custom
 * For custom, provide startDate and endDate (YYYY-MM-DD).
 */
export const exportAgentCoachingToExcel = async (
  agentAdminUserObjectId: Types.ObjectId,
  options: ExportAgentCoachingOptions
): Promise<Buffer> => {
  const { period, startDate, endDate, agentName, agentEmail, agentMobile } = options;
  const dateRange = getDateRangeForPeriod(period, startDate, endDate);

  const query: any = { addedBy: agentAdminUserObjectId, is_deleted: false };
  if (dateRange) query.createdAt = dateRange;

  const [centers, timeReport] = await Promise.all([
    CoachingCenterModel.find(query)
      .populate('user', 'firstName lastName email mobile')
      .populate('sports', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    getTimeReport(agentAdminUserObjectId, dateRange),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Agent Coaching Centres');

  const reportGeneratedOn = new Date().toLocaleString();
  const reportPeriodLabel = getReportPeriodLabel(period, startDate, endDate);

  // Summary section
  sheet.addRow(['Report Generated On:', reportGeneratedOn]);
  sheet.addRow(['Report Period:', reportPeriodLabel]);
  if (agentName != null && agentName !== '') sheet.addRow(['Agent Name:', agentName]);
  if (agentEmail != null && agentEmail !== '') sheet.addRow(['Agent Email:', agentEmail]);
  if (agentMobile != null && agentMobile !== '') sheet.addRow(['Agent Mobile:', agentMobile]);
  sheet.addRow([]);
  sheet.addRow(['Total Coaching Centres', timeReport.total]);
  sheet.addRow(['Approved', timeReport.approved]);
  sheet.addRow(['Rejected', timeReport.rejected]);
  sheet.addRow(['Pending Approval', timeReport.pending]);
  sheet.addRow([]);

  // Data table headers
  const headers = [
    'Center ID',
    'Center Name',
    'Email',
    'Mobile Number',
    'Owner Name',
    'Owner Email',
    'Owner Mobile',
    'Status',
    'Approval Status',
    'Active',
    'Sports',
    'City',
    'State',
    'Country',
    'Pincode',
    'Experience (Years)',
    'Created Date',
    'Updated Date',
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE0E0E0' } };

  // Data rows
  for (const c of centers as any[]) {
    sheet.addRow([
      c.id || c._id?.toString() || '',
      c.center_name || '',
      c.email || '',
      c.mobile_number || '',
      c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : '',
      c.user?.email || '',
      c.user?.mobile || '',
      c.status || '',
      c.approval_status || '',
      c.is_active ? 'Yes' : 'No',
      c.sports?.map((s: any) => s.name || '').join(', ') || '',
      c.location?.address?.city || '',
      c.location?.address?.state || '',
      c.location?.address?.country || '',
      c.location?.address?.pincode || '',
      c.experience ?? 0,
      c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '',
    ]);
  }

  sheet.columns = [
    { width: 30 },
    { width: 30 },
    { width: 28 },
    { width: 16 },
    { width: 24 },
    { width: 28 },
    { width: 16 },
    { width: 12 },
    { width: 18 },
    { width: 10 },
    { width: 28 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 10 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
