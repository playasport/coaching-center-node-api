"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getAllActions = exports.getAllSections = void 0;
const section_enum_1 = require("../enums/section.enum");
const section_enum_2 = require("../enums/section.enum");
const user_model_1 = require("../models/user.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const booking_model_1 = require("../models/booking.model");
const batch_model_1 = require("../models/batch.model");
const employee_model_1 = require("../models/employee.model");
const participant_model_1 = require("../models/participant.model");
const logger_1 = require("../utils/logger");
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
 * Get dashboard statistics
 */
const getDashboardStats = async () => {
    try {
        const [totalUsers, activeUsers, totalCoachingCenters, activeCoachingCenters, totalBookings, pendingBookings, completedBookings, totalBatches, activeBatches, totalEmployees, activeEmployees, totalStudents, totalParticipants,] = await Promise.all([
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