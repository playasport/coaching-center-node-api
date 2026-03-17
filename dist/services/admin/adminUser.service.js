"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUserService = void 0;
const adminUser_model_1 = require("../../models/adminUser.model");
const password_1 = require("../../utils/password");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const defaultProjection = {
    _id: 0,
    password: 0,
};
const toPlain = (document) => {
    if (!document) {
        return null;
    }
    const plain = typeof document === 'object' && 'toObject' in document
        ? document.toObject()
        : document;
    const { password: _password, ...rest } = plain;
    return rest;
};
exports.adminUserService = {
    sanitize(document) {
        return toPlain(document);
    },
    async create(data) {
        const hashedPassword = await (0, password_1.hashPassword)(data.password);
        const doc = await adminUser_model_1.AdminUserModel.create({
            id: data.id,
            email: data.email.toLowerCase(),
            firstName: data.firstName,
            middleName: data.middleName ?? null,
            lastName: data.lastName ?? null,
            mobile: data.mobile ?? null,
            gender: data.gender ?? null,
            dob: data.dob ?? null,
            password: hashedPassword,
            roles: data.roles,
            isActive: data.isActive ?? true,
            address: data.address ?? null,
        });
        // Populate roles before returning
        const populatedDoc = await adminUser_model_1.AdminUserModel.findById(doc._id)
            .populate('roles', 'name description')
            .lean();
        const sanitized = this.sanitize(populatedDoc);
        if (!sanitized) {
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
        }
        return sanitized;
    },
    async update(id, data) {
        const update = { ...data };
        if (data.password) {
            update.password = await (0, password_1.hashPassword)(data.password);
        }
        if (data.email) {
            update.email = data.email.toLowerCase();
        }
        // If roles are being updated
        if (data.roles !== undefined) {
            update.roles = data.roles;
        }
        const doc = await adminUser_model_1.AdminUserModel.findOneAndUpdate({ id }, update, {
            new: true,
            projection: defaultProjection,
        })
            .populate('roles', 'name description')
            .lean();
        const sanitized = this.sanitize(doc);
        return sanitized;
    },
    async findByEmail(email) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ email: email.toLowerCase() })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByEmailWithPassword(email) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ email: email.toLowerCase() })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
    async findByMobile(mobile) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ mobile })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByMobileWithPassword(mobile) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ mobile })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
    async findById(id) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ id })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByIdWithPassword(id) {
        const doc = await adminUser_model_1.AdminUserModel.findOne({ id })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
};
//# sourceMappingURL=adminUser.service.js.map