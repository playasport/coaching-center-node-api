import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
import { UserModel } from '../models/user.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { BookingModel } from '../models/booking.model';
import { BatchModel } from '../models/batch.model';
import { EmployeeModel } from '../models/employee.model';
import { ParticipantModel } from '../models/participant.model';
import { logger } from '../utils/logger';

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
    ]);

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
    };
  } catch (error) {
    logger.error('Error getting dashboard stats:', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};
