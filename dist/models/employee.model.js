"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModel = void 0;
const mongoose_1 = require("mongoose");
// Certification sub-schema
const certificationSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    fileUrl: {
        type: String,
        required: true,
        trim: true,
    },
}, { _id: false });
// Validation function for full name (only letters and spaces)
const validateFullName = (value) => {
    // Only letters (including accented characters) and spaces allowed
    const nameRegex = /^[a-zA-Z\s\u00C0-\u017F]+$/;
    return nameRegex.test(value);
};
// Validation function for mobile number (only digits)
const validateMobileNo = (value) => {
    // Only digits allowed
    const mobileRegex = /^\d+$/;
    return mobileRegex.test(value);
};
const employeeSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        validate: {
            validator: validateFullName,
            message: 'Full name must contain only letters and spaces (no numbers or special characters)',
        },
    },
    role: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role',
        required: [true, 'Role is required'],
    },
    mobileNo: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: validateMobileNo,
            message: 'Mobile number must contain only digits',
        },
    },
    email: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (value) {
                // If email is provided, validate it; if null/undefined, it's optional
                if (!value)
                    return true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: 'Please provide a valid email address',
        },
    },
    sport: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Sport',
        default: null,
    },
    center: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        default: null,
    },
    experience: {
        type: Number,
        default: null,
        min: [0, 'Experience cannot be negative'],
    },
    workingHours: {
        type: String,
        default: null,
        trim: true,
    },
    extraHours: {
        type: String,
        default: null,
        trim: true,
    },
    certification: {
        type: [certificationSchema],
        default: null,
    },
    salary: {
        type: Number,
        default: null,
        min: [0, 'Salary cannot be negative'],
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes for better query performance
employeeSchema.index({ userId: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ center: 1 });
employeeSchema.index({ sport: 1 });
employeeSchema.index({ mobileNo: 1 });
employeeSchema.index({ email: 1 });
// Compound indexes for common queries
employeeSchema.index({ center: 1, role: 1 });
employeeSchema.index({ sport: 1, center: 1 });
exports.EmployeeModel = (0, mongoose_1.model)('Employee', employeeSchema);
//# sourceMappingURL=employee.model.js.map