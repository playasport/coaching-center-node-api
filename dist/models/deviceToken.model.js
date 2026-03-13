"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTokenModel = void 0;
const mongoose_1 = require("mongoose");
const deviceType_enum_1 = require("../enums/deviceType.enum");
const deviceTokenSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    appContext: {
        type: String,
        enum: ['user', 'academy'],
        default: 'user',
        index: true,
    },
    fcmToken: {
        type: String,
        default: null,
        trim: true,
        index: true,
        sparse: true,
    },
    deviceType: {
        type: String,
        enum: Object.values(deviceType_enum_1.DeviceType),
        required: true,
        index: true,
    },
    deviceId: {
        type: String,
        default: null,
        trim: true,
        index: true,
    },
    deviceName: {
        type: String,
        default: null,
        trim: true,
    },
    appVersion: {
        type: String,
        default: null,
        trim: true,
    },
    refreshToken: {
        type: String,
        default: null,
        trim: true,
        index: true,
        sparse: true,
    },
    refreshTokenExpiresAt: {
        type: Date,
        default: null,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
        },
    },
});
// Ensure only one ACTIVE token per user-device-appContext (same device can have user + academy tokens)
deviceTokenSchema.index({ userId: 1, deviceId: 1, appContext: 1 }, { unique: true, partialFilterExpression: { isActive: true, deviceId: { $type: 'string' } } });
// Index for efficient querying of active tokens by user
deviceTokenSchema.index({ userId: 1, isActive: 1 });
exports.DeviceTokenModel = (0, mongoose_1.model)('DeviceToken', deviceTokenSchema);
//# sourceMappingURL=deviceToken.model.js.map