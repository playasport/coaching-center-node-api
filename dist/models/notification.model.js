"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const notificationSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    recipientType: {
        type: String,
        enum: ['user', 'academy', 'role'],
        required: true,
        index: true,
    },
    recipientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: function () {
            return this.recipientType !== 'role';
        },
        refPath: 'recipientTypeRef',
        index: true,
        default: null,
    },
    recipientTypeRef: {
        type: String,
        enum: ['User', 'CoachingCenter'],
        required: function () {
            return this.recipientType === 'user' ? 'User' : this.recipientType === 'academy' ? 'CoachingCenter' : false;
        },
    },
    roles: {
        type: [String],
        required: function () {
            return this.recipientType === 'role';
        },
        index: true,
        default: null,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    body: {
        type: String,
        required: true,
        trim: true,
    },
    channels: {
        type: [String],
        enum: ['sms', 'email', 'whatsapp', 'push'],
        required: true,
        default: ['push'],
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
        index: true,
    },
    data: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    imageUrl: {
        type: String,
        default: null,
        trim: true,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
        default: null,
    },
    sent: {
        type: Boolean,
        default: false,
        index: true,
    },
    sentAt: {
        type: Date,
        default: null,
    },
    error: {
        type: String,
        default: null,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.recipientTypeRef;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.recipientTypeRef;
        },
    },
});
// Compound indexes for efficient querying
notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, sent: 1 });
notificationSchema.index({ recipientType: 1, roles: 1, isRead: 1 }); // For role-based notifications
notificationSchema.index({ recipientType: 1, roles: 1, createdAt: -1 }); // For role-based notifications
notificationSchema.index({ createdAt: -1 });
exports.NotificationModel = (0, mongoose_1.model)('Notification', notificationSchema);
//# sourceMappingURL=notification.model.js.map