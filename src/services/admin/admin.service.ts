import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';
import { UserModel } from '../../models/user.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BookingModel } from '../../models/booking.model';
import { BatchModel } from '../../models/batch.model';
import { EmployeeModel } from '../../models/employee.model';
import { ParticipantModel } from '../../models/participant.model';
import { TransactionModel, TransactionStatus, TransactionType } from '../../models/transaction.model';
import { RoleModel } from '../../models/role.model';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';

/**
 * Get all available sections
 */
export const getAllSections = (): Array<{ value: string; label: string }> => {
  return Object.values(Section).map((section) => ({
    value: section,
    label: section.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  }));
};

/**
 * Get all available actions
 */
export const getAllActions = (): Array<{ value: string; label: string }> => {
  return Object.values(Action).map((action) => ({
    value: action,
    label: action.charAt(0).toUpperCase() + action.slice(1),
  }));
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    // Get role IDs for user and academy roles (parallel queries)
    const [userRole, academyRole] = await Promise.all([
      RoleModel.findOne({ name: DefaultRoles.USER }).lean(),
      RoleModel.findOne({ name: DefaultRoles.ACADEMY }).lean(),
    ]);
    const userRoleId = userRole?._id ? new Types.ObjectId(userRole._id) : null;
    const academyRoleId = academyRole?._id ? new Types.ObjectId(academyRole._id) : null;

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

    const [
      totalUsers,
      activeUsers,
      totalCoachingCenters,
      activeCoachingCenters,
      totalBookings,
      pendingBookings,
      completedBookings,
      totalBatches,
      activeBatches,
      totalEmployees,
      activeEmployees,
      totalStudents,
      totalParticipants,
      // Revenue/Transaction statistics
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      // Status breakdown
      statusBreakdown,
      // New registrations
      newUserRegistrations,
      newAcademyRegistrations,
    ] = await Promise.all([
      // Users
      UserModel.countDocuments({ isDeleted: false }),
      UserModel.countDocuments({ isDeleted: false, isActive: true }),

      // Coaching Centers
      CoachingCenterModel.countDocuments({}),
      CoachingCenterModel.countDocuments({ is_active: true }),

      // Bookings
      BookingModel.countDocuments({}),
      BookingModel.countDocuments({ status: 'pending' }),
      BookingModel.countDocuments({ status: 'completed' }),

      // Batches
      BatchModel.countDocuments({}),
      BatchModel.countDocuments({ status: 'active' }),

      // Employees
      EmployeeModel.countDocuments({}),
      EmployeeModel.countDocuments({ is_active: true }),

      // Students
      ParticipantModel.countDocuments({}),

      // Participants
      ParticipantModel.countDocuments({}),

      // Total revenue from successful transactions
      TransactionModel.aggregate([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
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
      TransactionModel.aggregate([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
            created_at: { $gte: startOfToday },
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
      TransactionModel.aggregate([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
            created_at: { $gte: startOfWeek },
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
      TransactionModel.aggregate([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
            created_at: { $gte: startOfMonth },
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
      TransactionModel.aggregate([
        {
          $match: {
            type: TransactionType.PAYMENT,
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
        ? UserModel.countDocuments({
            isDeleted: false,
            roles: userRoleId,
            createdAt: { $gte: sevenDaysAgo },
          })
        : Promise.resolve(0),

      // New academy registrations (last 7 days) with role "academy"
      academyRoleId
        ? UserModel.countDocuments({
            isDeleted: false,
            roles: academyRoleId,
            createdAt: { $gte: sevenDaysAgo },
          })
        : Promise.resolve(0),
    ]);

    // Process revenue aggregates
    const totalRevenueAmount = totalRevenue[0]?.total || 0;
    const todayRevenueAmount = todayRevenue[0]?.total || 0;
    const weekRevenueAmount = weekRevenue[0]?.total || 0;
    const monthRevenueAmount = monthRevenue[0]?.total || 0;

    // Process status breakdown and categorize
    const statusBreakdownMap = new Map<string, { count: number; totalAmount: number }>();
    statusBreakdown.forEach((item: any) => {
      statusBreakdownMap.set(item._id, {
        count: item.count,
        totalAmount: item.totalAmount || 0,
      });
    });

    const statusSummary = {
      completed: {
        count: statusBreakdownMap.get(TransactionStatus.SUCCESS)?.count || 0,
        totalAmount: statusBreakdownMap.get(TransactionStatus.SUCCESS)?.totalAmount || 0,
      },
      pending: {
        count:
          (statusBreakdownMap.get(TransactionStatus.PENDING)?.count || 0) +
          (statusBreakdownMap.get(TransactionStatus.PROCESSING)?.count || 0),
        totalAmount:
          (statusBreakdownMap.get(TransactionStatus.PENDING)?.totalAmount || 0) +
          (statusBreakdownMap.get(TransactionStatus.PROCESSING)?.totalAmount || 0),
      },
      failed: {
        count:
          (statusBreakdownMap.get(TransactionStatus.FAILED)?.count || 0) +
          (statusBreakdownMap.get(TransactionStatus.CANCELLED)?.count || 0),
        totalAmount:
          (statusBreakdownMap.get(TransactionStatus.FAILED)?.totalAmount || 0) +
          (statusBreakdownMap.get(TransactionStatus.CANCELLED)?.totalAmount || 0),
      },
    };

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      coachingCenters: {
        total: totalCoachingCenters,
        active: activeCoachingCenters,
        inactive: totalCoachingCenters - activeCoachingCenters,
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
  } catch (error) {
    logger.error('Error getting dashboard stats:', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

