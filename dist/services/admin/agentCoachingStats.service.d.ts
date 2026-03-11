import { Types } from 'mongoose';
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
export interface ReferralCountReport {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
}
export interface AgentCoachingStats {
    coaching_centre_stats: CoachingCentreStats;
    today_report: TimeReport;
    this_week_report: TimeReport;
    this_month_report: TimeReport;
    all_time_report: TimeReport;
    referral_count: ReferralCountReport;
    report_generated_on: string;
}
/**
 * Get agent coaching stats for a given agent (AdminUser _id).
 * Used when returning getOperationalUser and the user role is agent.
 */
export declare const getAgentCoachingStats: (agentAdminUserObjectId: Types.ObjectId) => Promise<AgentCoachingStats>;
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
export declare const exportAgentCoachingToExcel: (agentAdminUserObjectId: Types.ObjectId, options: ExportAgentCoachingOptions) => Promise<Buffer>;
//# sourceMappingURL=agentCoachingStats.service.d.ts.map