"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantModel = void 0;
const mongoose_1 = require("mongoose");
const address_model_1 = require("./address.model");
const gender_enum_1 = require("../enums/gender.enum");
const participantSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    firstName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 191,
    },
    lastName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 191,
    },
    gender: {
        type: String,
        enum: Object.values(gender_enum_1.Gender),
        default: null,
    },
    disability: {
        type: Number,
        default: 0,
        enum: [0, 1], // 0 = no, 1 = yes
    },
    dob: {
        type: Date,
        default: null,
    },
    schoolName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 191,
    },
    contactNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 255,
    },
    profilePhoto: {
        type: String,
        default: null,
        trim: true,
        maxlength: 191,
    },
    address: {
        type: address_model_1.addressSchema,
        default: null,
    },
    isSelf: {
        type: String,
        default: null,
        trim: true,
        maxlength: 191,
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
participantSchema.index({ userId: 1 });
participantSchema.index({ userId: 1, is_deleted: 1 });
participantSchema.index({ contactNumber: 1 });
participantSchema.index({ is_deleted: 1, userId: 1 }); // For distinct userId queries
exports.ParticipantModel = (0, mongoose_1.model)('Participant', participantSchema);
//# sourceMappingURL=participant.model.js.map