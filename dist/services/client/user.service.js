"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const user_model_1 = require("../../models/user.model");
const role_model_1 = require("../../models/role.model");
const password_1 = require("../../utils/password");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const participant_model_1 = require("../../models/participant.model");
const logger_1 = require("../../utils/logger");
const mongoose_1 = require("mongoose");
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
exports.userService = {
    sanitize(document) {
        return toPlain(document);
    },
    async create(data) {
        const hashedPassword = await (0, password_1.hashPassword)(data.password);
        // Find role by name to get ObjectId (default to 'user' if not provided)
        const roleName = data.role || 'user';
        const role = await role_model_1.RoleModel.findOne({ name: roleName });
        if (!role) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('errors.roleNotFound', { role: roleName }));
        }
        const doc = await user_model_1.UserModel.create({
            id: data.id,
            email: data.email.toLowerCase(),
            firstName: data.firstName,
            middleName: data.middleName ?? null,
            lastName: data.lastName ?? null,
            mobile: data.mobile ?? null,
            gender: data.gender ?? null,
            dob: data.dob ?? null,
            password: hashedPassword,
            roles: [role._id], // Use roles array with Role ObjectId
            userType: data.userType ?? null, // Set userType (only applies when role is 'user')
            registrationMethod: data.registrationMethod ?? null, // How the user registered
            isActive: data.isActive ?? true,
        });
        // Populate roles before returning
        const populatedDoc = await user_model_1.UserModel.findById(doc._id)
            .populate('roles', 'name description')
            .lean();
        const sanitized = this.sanitize(populatedDoc);
        if (!sanitized) {
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
        }
        // Create participant record with isSelf = '1'
        try {
            // Map gender from string to number (male=0, female=1, other=2)
            let genderNumber = null;
            if (data.gender) {
                const genderMap = {
                    male: 0,
                    female: 1,
                    other: 2,
                };
                genderNumber = genderMap[data.gender] ?? null;
            }
            const participantData = {
                userId: doc._id,
                firstName: data.firstName || null,
                middleName: data.middleName || null,
                lastName: data.lastName || null,
                gender: genderNumber,
                disability: 0, // Default to no disability
                dob: data.dob || null,
                contactNumber: data.mobile || null,
                profilePhoto: null, // Will be updated when user uploads profile image
                address: null, // Will be updated when user adds address
                isSelf: '1', // Mark as self
                is_active: true,
                is_deleted: false,
            };
            await participant_model_1.ParticipantModel.create(participantData);
            logger_1.logger.info(`Participant record created for user: ${data.id}`, { userId: data.id });
        }
        catch (participantError) {
            // Log error but don't fail user creation
            logger_1.logger.error('Failed to create participant record for user:', {
                userId: data.id,
                error: participantError instanceof Error ? participantError.message : participantError,
            });
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
        // If favoriteSports is being updated, convert string IDs to ObjectIds
        if (data.favoriteSports !== undefined) {
            if (Array.isArray(data.favoriteSports)) {
                // Validate all sport IDs are valid ObjectIds
                const validSportIds = data.favoriteSports
                    .filter((id) => mongoose_1.Types.ObjectId.isValid(id))
                    .map((id) => new mongoose_1.Types.ObjectId(id));
                update.favoriteSports = validSportIds;
            }
            else {
                update.favoriteSports = [];
            }
        }
        // If role is being updated, find role ObjectId by name
        if (data.role) {
            const role = await role_model_1.RoleModel.findOne({ name: data.role });
            if (!role) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('errors.roleNotFound', { role: data.role }));
            }
            if (data.addRole) {
                // Add role to existing roles array instead of replacing
                const existingUser = await user_model_1.UserModel.findOne({ id })
                    .select('roles')
                    .populate('roles', 'name')
                    .lean();
                if (existingUser) {
                    const existingRoles = (existingUser.roles || []);
                    // Check if role already exists by name
                    const roleExists = existingRoles.some((r) => (r.name && r.name === data.role) ||
                        (r.toString() === role._id.toString()) ||
                        (r._id && r._id.toString() === role._id.toString()));
                    if (!roleExists) {
                        // Add the new role to existing roles
                        const existingRoleIds = existingRoles.map((r) => {
                            if (r._id)
                                return r._id;
                            if (typeof r === 'string')
                                return new mongoose_1.Types.ObjectId(r);
                            return r;
                        });
                        update.roles = [...existingRoleIds, role._id];
                    }
                    // If role already exists, don't update roles - remove from update object
                    if (roleExists) {
                        delete update.roles;
                    }
                }
                else {
                    // User doesn't exist, just set the role
                    update.roles = [role._id];
                }
            }
            else {
                // Replace roles array (default behavior)
                update.roles = [role._id];
            }
        }
        // Update userType if provided
        if (data.userType !== undefined) {
            update.userType = data.userType;
        }
        const doc = await user_model_1.UserModel.findOneAndUpdate({ id }, update, {
            new: true,
            projection: defaultProjection,
        })
            .populate('roles', 'name description')
            .lean();
        const sanitized = this.sanitize(doc);
        if (!sanitized) {
            return null;
        }
        // Update participant record with isSelf = '1' if it exists
        try {
            // Get user ObjectId
            const userDoc = await user_model_1.UserModel.findOne({ id }).select('_id').lean();
            if (!userDoc) {
                return sanitized;
            }
            // Find the participant record with isSelf = '1'
            const participant = await participant_model_1.ParticipantModel.findOne({
                userId: userDoc._id,
                isSelf: '1',
                is_deleted: false,
            });
            if (participant) {
                // Prepare update data
                const participantUpdate = {};
                if (data.firstName !== undefined) {
                    participantUpdate.firstName = data.firstName || null;
                }
                if (data.lastName !== undefined) {
                    participantUpdate.lastName = data.lastName ?? null;
                }
                if (data.gender !== undefined) {
                    participantUpdate.gender = data.gender || null;
                }
                if (data.dob !== undefined) {
                    participantUpdate.dob = data.dob || null;
                }
                if (data.mobile !== undefined) {
                    participantUpdate.contactNumber = data.mobile || null;
                }
                if (data.profileImage !== undefined) {
                    participantUpdate.profilePhoto = data.profileImage || null;
                }
                if (data.address !== undefined) {
                    participantUpdate.address = data.address || null;
                }
                // Only update if there are changes
                if (Object.keys(participantUpdate).length > 0) {
                    await participant_model_1.ParticipantModel.findByIdAndUpdate(participant._id, participantUpdate, { new: true });
                    logger_1.logger.info(`Participant record updated for user: ${id}`, { userId: id });
                }
            }
        }
        catch (participantError) {
            // Log error but don't fail user update
            logger_1.logger.error('Failed to update participant record for user:', {
                userId: id,
                error: participantError instanceof Error ? participantError.message : participantError,
            });
        }
        return sanitized;
    },
    async findByEmail(email) {
        const doc = await user_model_1.UserModel.findOne({ email: email.toLowerCase() })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByEmailWithPassword(email) {
        const doc = await user_model_1.UserModel.findOne({ email: email.toLowerCase() })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
    async findByMobile(mobile) {
        const doc = await user_model_1.UserModel.findOne({ mobile })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByMobileWithPassword(mobile) {
        const doc = await user_model_1.UserModel.findOne({ mobile })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
    async findById(id) {
        const doc = await user_model_1.UserModel.findOne({ id })
            .select(defaultProjection)
            .populate('roles', 'name description')
            .lean();
        return this.sanitize(doc);
    },
    async findByIdWithPassword(id) {
        const doc = await user_model_1.UserModel.findOne({ id })
            .populate('roles', 'name description')
            .lean();
        return doc;
    },
};
//# sourceMappingURL=user.service.js.map