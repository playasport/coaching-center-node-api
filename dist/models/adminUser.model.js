"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserModel = void 0;
const mongoose_1 = require("mongoose");
const address_model_1 = require("./address.model");
const gender_enum_1 = require("../enums/gender.enum");
const adminUserSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: null, trim: true },
    lastName: { type: String, default: null, trim: true },
    dob: { type: Date, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: null, trim: true },
    password: { type: String, required: true },
    gender: { type: String, enum: Object.values(gender_enum_1.Gender), default: null },
    profileImage: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    roles: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'Role',
        default: [],
        index: true,
    },
    agentCode: {
        type: String,
        default: null,
        sparse: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
        validate: {
            validator: (v) => !v || /^[A-Z0-9]+$/.test(v),
            message: 'agentCode must be alphanumeric',
        },
    },
    address: { type: address_model_1.addressSchema, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.password;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.password;
        },
    },
});
// Single field indexes (most selective first)
// Note: email already has unique index from schema definition, so we don't need to add it again
adminUserSchema.index({ isDeleted: 1 });
adminUserSchema.index({ mobile: 1 });
adminUserSchema.index({ createdAt: -1 });
// Compound indexes for better query performance
// Note: Order matters - most selective fields first
adminUserSchema.index({ isDeleted: 1, roles: 1, createdAt: -1 });
adminUserSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });
adminUserSchema.index({ isDeleted: 1, roles: 1, isActive: 1, createdAt: -1 });
// Text index for search functionality (correct syntax)
adminUserSchema.index({ firstName: 'text', middleName: 'text', lastName: 'text', email: 'text', mobile: 'text' }, { name: 'adminUser_search_text_index' });
exports.AdminUserModel = (0, mongoose_1.model)('AdminUser', adminUserSchema);
//# sourceMappingURL=adminUser.model.js.map