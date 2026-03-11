"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getAllActions = exports.getAllSections = void 0;
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const user_model_1 = require("../../models/user.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const booking_model_1 = require("../../models/booking.model");
const batch_model_1 = require("../../models/batch.model");
const employee_model_1 = require("../../models/employee.model");
const participant_model_1 = require("../../models/participant.model");
const transaction_model_1 = require("../../models/transaction.model");
const role_model_1 = require("../../models/role.model");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
const adminDashboardCache_1 = require("../../utils/adminDashboardCache");
const adminCoachingCenter_service_1 = require("./adminCoachingCenter.service");
/**
 * Get all available sections
 */
const getAllSections = () => {
    return Object.values(section_enum_1.Section).map((section) => ({
        value: section,
        label: section.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    }));
};
exports.getAllSections = getAllSections;
/**
 * Get all available actions
 */
const getAllActions = () => {
    return Object.values(section_enum_2.Action).map((action) => ({
        value: action,
        label: action.charAt(0).toUpperCase() + action.slice(1),
    }));
};
exports.getAllActions = getAllActions;
/**
 * Get dashboard statistics (cached for 5 minutes to avoid DB hit on every request)
 */
const getDashboardStats = async () => {
    try {
        const cached = await (0, adminDashboardCache_1.getCachedAdminDashboardStats)();
        if (cached) {
            logger_1.logger.debug('Returning cached admin dashboard stats');
            return cached;
        }
        // Get role IDs for user and academy roles (parallel queries)
        const [userRole, academyRole] = await Promise.all([
            role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.USER }).lean(),
            role_model_1.RoleModel.findOne({ name: defaultRoles_enum_1.DefaultRoles.ACADEMY }).lean(),
        ]);
        const userRoleId = userRole?._id ? new mongoose_1.Types.ObjectId(userRole._id) : null;
        const academyRoleId = academyRole?._id ? new mongoose_1.Types.ObjectId(academyRole._id) : null;
        // Date calculations for time-based queries
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        // Get date 7 days ago for new registrations
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        // Academy stats (by state, city, sport, only for disabled, allowing disabled, only for female, etc.)
        const academyStatsPromise = (0, adminCoachingCenter_service_1.getCoachingCenterStats)(undefined, undefined, undefined);
        const [totalUsers, activeUsers, totalCoachingCenters, activeCoachingCenters, totalBookings, pendingBookings, completedBookings, totalBatches, activeBatches, totalEmployees, activeEmployees, totalStudents, totalParticipants, 
        // Revenue/Transaction statistics
        totalRevenue, todayRevenue, weekRevenue, monthRevenue, 
        // Status breakdown
        statusBreakdown, 
        // New registrations
        newUserRegistrations, newAcademyRegistrations,] = await Promise.all([
            // Users
            user_model_1.UserModel.countDocuments({ isDeleted: false }),
            user_model_1.UserModel.countDocuments({ isDeleted: false, isActive: true }),
            // Coaching Centers
            coachingCenter_model_1.CoachingCenterModel.countDocuments({}),
            coachingCenter_model_1.CoachingCenterModel.countDocuments({ is_active: true }),
            // Bookings
            booking_model_1.BookingModel.countDocuments({}),
            booking_model_1.BookingModel.countDocuments({ status: 'pending' }),
            booking_model_1.BookingModel.countDocuments({ status: 'completed' }),
            // Batches
            batch_model_1.BatchModel.countDocuments({}),
            batch_model_1.BatchModel.countDocuments({ status: 'active' }),
            // Employees
            employee_model_1.EmployeeModel.countDocuments({}),
            employee_model_1.EmployeeModel.countDocuments({ is_active: true }),
            // Students
            participant_model_1.ParticipantModel.countDocuments({}),
            // Participants
            participant_model_1.ParticipantModel.countDocuments({}),
            // Total revenue from successful transactions
            transaction_model_1.TransactionModel.aggregate([
                {
                    $match: {
                        type: transaction_model_1.TransactionType.PAYMENT,
                        status: transaction_model_1.TransactionStatus.SUCCESS,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]),
            // Today's revenue
            transaction_model_1.TransactionModel.aggregate([
                {
                    $match: {
                        type: transaction_model_1.TransactionType.PAYMENT,
                        status: transaction_model_1.TransactionStatus.SUCCESS,
                        createdAt: { $gte: startOfToday },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]),
            // This week's revenue
            transaction_model_1.TransactionModel.aggregate([
                {
                    $match: {
                        type: transaction_model_1.TransactionType.PAYMENT,
                        status: transaction_model_1.TransactionStatus.SUCCESS,
                        createdAt: { $gte: startOfWeek },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]),
            // This month's revenue
            transaction_model_1.TransactionModel.aggregate([
                {
                    $match: {
                        type: transaction_model_1.TransactionType.PAYMENT,
                        status: transaction_model_1.TransactionStatus.SUCCESS,
                        createdAt: { $gte: startOfMonth },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]),
            // Status breakdown
            transaction_model_1.TransactionModel.aggregate([
                {
                    $match: {
                        type: transaction_model_1.TransactionType.PAYMENT,
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                    },
                },
            ]),
            // New user registrations (last 7 days) with role "user"
            userRoleId
                ? user_model_1.UserModel.countDocuments({
                    isDeleted: false,
                    roles: userRoleId,
                    createdAt: { $gte: sevenDaysAgo },
                })
                : Promise.resolve(0),
            // New academy registrations (last 7 days) with role "academy"
            academyRoleId
                ? user_model_1.UserModel.countDocuments({
                    isDeleted: false,
                    roles: academyRoleId,
                    createdAt: { $gte: sevenDaysAgo },
                })
                : Promise.resolve(0),
        ]);
        const academyStats = await academyStatsPromise;
        // Process revenue aggregates
        const totalRevenueAmount = totalRevenue[0]?.total || 0;
        const todayRevenueAmount = todayRevenue[0]?.total || 0;
        const weekRevenueAmount = weekRevenue[0]?.total || 0;
        const monthRevenueAmount = monthRevenue[0]?.total || 0;
        // Process status breakdown and categorize
        const statusBreakdownMap = new Map();
        statusBreakdown.forEach((item) => {
            statusBreakdownMap.set(item._id, {
                count: item.count,
                totalAmount: item.totalAmount || 0,
            });
        });
        const statusSummary = {
            completed: {
                count: statusBreakdownMap.get(transaction_model_1.TransactionStatus.SUCCESS)?.count || 0,
                totalAmount: statusBreakdownMap.get(transaction_model_1.TransactionStatus.SUCCESS)?.totalAmount || 0,
            },
            pending: {
                count: (statusBreakdownMap.get(transaction_model_1.TransactionStatus.PENDING)?.count || 0) +
                    (statusBreakdownMap.get(transaction_model_1.TransactionStatus.PROCESSING)?.count || 0),
                totalAmount: (statusBreakdownMap.get(transaction_model_1.TransactionStatus.PENDING)?.totalAmount || 0) +
                    (statusBreakdownMap.get(transaction_model_1.TransactionStatus.PROCESSING)?.totalAmount || 0),
            },
            failed: {
                count: (statusBreakdownMap.get(transaction_model_1.TransactionStatus.FAILED)?.count || 0) +
                    (statusBreakdownMap.get(transaction_model_1.TransactionStatus.CANCELLED)?.count || 0),
                totalAmount: (statusBreakdownMap.get(transaction_model_1.TransactionStatus.FAILED)?.totalAmount || 0) +
                    (statusBreakdownMap.get(transaction_model_1.TransactionStatus.CANCELLED)?.totalAmount || 0),
            },
        };
        const stats = {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
            },
            coachingCenters: {
                total: totalCoachingCenters,
                active: activeCoachingCenters,
                inactive: totalCoachingCenters - activeCoachingCenters,
                // Academy stats: by state, city, sport, only for disabled, allowing disabled, only for female, status, approval, etc.
                academyStats: {
                    total: academyStats.total,
                    byStatus: academyStats.byStatus,
                    byActiveStatus: academyStats.byActiveStatus,
                    byApprovalStatus: academyStats.byApprovalStatus,
                    bySport: academyStats.bySport,
                    byCity: academyStats.byCity,
                    byState: academyStats.byState,
                    allowingDisabled: academyStats.allowingDisabled,
                    onlyForDisabled: academyStats.onlyForDisabled,
                    onlyForFemale: academyStats.onlyForFemale,
                },
            },
            bookings: {
                total: totalBookings,
                pending: pendingBookings,
                completed: completedBookings,
            },
            batches: {
                total: totalBatches,
                active: activeBatches,
                inactive: totalBatches - activeBatches,
            },
            employees: {
                total: totalEmployees,
                active: activeEmployees,
                inactive: totalEmployees - activeEmployees,
            },
            students: {
                total: totalStudents,
            },
            participants: {
                total: totalParticipants,
            },
            revenue: {
                total: totalRevenueAmount,
                today: todayRevenueAmount,
                thisWeek: weekRevenueAmount,
                thisMonth: monthRevenueAmount,
            },
            transactions: {
                statusBreakdown: statusSummary,
            },
            newRegistrations: {
                users: newUserRegistrations,
                academies: newAcademyRegistrations,
                period: 'last_7_days',
            },
        };
        await (0, adminDashboardCache_1.cacheAdminDashboardStats)(stats);
        return stats;
    }
    catch (error) {
        logger_1.logger.error('Error getting dashboard stats:', {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=admin.service.js.map