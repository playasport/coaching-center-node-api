"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachingCenterModel = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const coachingCenterStatus_enum_1 = require("../enums/coachingCenterStatus.enum");
const operatingDays_enum_1 = require("../enums/operatingDays.enum");
const gender_enum_1 = require("../enums/gender.enum");
// Sub-schemas
const mediaItemSchema = new mongoose_1.Schema({
    unique_id: {
        type: String,
        required: true,
        default: () => (0, uuid_1.v4)(),
    },
    url: {
        type: String,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
    is_banner: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, { _id: false });
const ageRangeSchema = new mongoose_1.Schema({
    min: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: true,
    },
}, { _id: false });
const centerAddressSchema = new mongoose_1.Schema({
    line1: {
        type: String,
        default: null,
    },
    line2: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        default: null,
    },
    pincode: {
        type: String,
        required: true,
    },
}, { _id: false });
// GeoJSON Point for 2dsphere index (coordinates: [longitude, latitude])
const geoPointSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
}, { _id: false });
const centerLocationSchema = new mongoose_1.Schema({
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    address: {
        type: centerAddressSchema,
        required: true,
    },
    geo: {
        type: geoPointSchema,
        default: null,
    },
}, { _id: false });
const operationalTimingSchema = new mongoose_1.Schema({
    operating_days: {
        type: [String],
        required: true,
        enum: Object.values(operatingDays_enum_1.OperatingDays),
    },
    opening_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    closing_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
}, { _id: false });
// Call timing schema
const callTimingSchema = new mongoose_1.Schema({
    start_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    end_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
}, { _id: false });
// Training timing day schema
const trainingTimingDaySchema = new mongoose_1.Schema({
    day: {
        type: String,
        required: true,
        enum: Object.values(operatingDays_enum_1.OperatingDays),
    },
    start_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    end_time: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
}, { _id: false });
// Training timing schema
const trainingTimingSchema = new mongoose_1.Schema({
    timings: {
        type: [trainingTimingDaySchema],
        required: true,
        default: [],
    },
}, { _id: false });
// Video item schema (with thumbnail)
const videoItemSchema = new mongoose_1.Schema({
    unique_id: {
        type: String,
        required: true,
        default: () => (0, uuid_1.v4)(),
    },
    url: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        default: null,
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
}, { _id: false });
// Sport detail schema
const sportDetailSchema = new mongoose_1.Schema({
    sport_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Sport',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    images: {
        type: [mediaItemSchema],
        default: [],
    },
    videos: {
        type: [videoItemSchema],
        default: [],
    },
}, { _id: false });
const bankInformationSchema = new mongoose_1.Schema({
    bank_name: {
        type: String,
        required: false,
        default: null,
    },
    account_number: {
        type: String,
        required: false,
        default: null,
    },
    ifsc_code: {
        type: String,
        required: false,
        uppercase: true,
        default: null,
    },
    account_holder_name: {
        type: String,
        required: false,
        default: null,
    },
    gst_number: {
        type: String,
        default: null,
    },
}, { _id: false });
// Main schema
const coachingCenterSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    addedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null,
    },
    center_name: {
        type: String,
        required: true,
        trim: true,
    },
    mobile_number: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    rules_regulation: {
        type: [String],
        default: null,
    },
    logo: {
        type: String,
        default: null,
    },
    sports: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'Sport',
        required: true,
        default: [],
    },
    sport_details: {
        type: [sportDetailSchema],
        required: true,
        default: [],
    },
    age: {
        type: ageRangeSchema,
        required: true,
    },
    location: {
        type: centerLocationSchema,
        required: true,
    },
    facility: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'Facility',
        default: [],
    },
    operational_timing: {
        type: operationalTimingSchema,
        required: true,
    },
    call_timing: {
        type: callTimingSchema,
        required: false,
        default: null,
    },
    training_timing: {
        type: trainingTimingSchema,
        required: false,
        default: null,
    },
    documents: {
        type: [mediaItemSchema],
        default: [],
    },
    bank_information: {
        type: bankInformationSchema,
        required: false,
        default: null,
    },
    status: {
        type: String,
        enum: Object.values(coachingCenterStatus_enum_1.CoachingCenterStatus),
        default: coachingCenterStatus_enum_1.CoachingCenterStatus.DRAFT,
    },
    allowed_genders: {
        type: [String],
        enum: Object.values(gender_enum_1.Gender),
        required: true,
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'At least one gender must be selected',
        },
    },
    allowed_disabled: {
        type: Boolean,
        required: true,
    },
    is_only_for_disabled: {
        type: Boolean,
        required: true,
    },
    experience: {
        type: Number,
        required: true,
        min: 0,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    approval_status: {
        type: String,
        enum: ['approved', 'rejected', 'pending_approval'],
        default: 'approved',
    },
    reject_reason: {
        type: String,
        default: null,
        maxlength: 500,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    totalRatings: {
        type: Number,
        default: 0,
        min: 0,
    },
    ratings: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'CoachingCenterRating',
        default: [],
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
// Pre-save: populate location.geo from latitude/longitude for 2dsphere queries
coachingCenterSchema.pre('save', function (next) {
    if (this.location?.latitude != null && this.location?.longitude != null) {
        this.location.geo = {
            type: 'Point',
            coordinates: [this.location.longitude, this.location.latitude],
        };
    }
    next();
});
// Note: findOneAndUpdate with location changes won't auto-set geo. Use save() or run migrate:coaching-center-geo after bulk updates.
// Indexes
coachingCenterSchema.index({ user: 1 });
coachingCenterSchema.index({ addedBy: 1 });
coachingCenterSchema.index({ center_name: 1 });
coachingCenterSchema.index({ email: 1 });
coachingCenterSchema.index({ mobile_number: 1 });
coachingCenterSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
coachingCenterSchema.index({ 'location.geo': '2dsphere' });
coachingCenterSchema.index({ sports: 1 });
coachingCenterSchema.index({ 'sport_details.sport_id': 1 });
coachingCenterSchema.index({ facility: 1 });
coachingCenterSchema.index({ status: 1 });
coachingCenterSchema.index({ is_active: 1, is_deleted: 1 });
coachingCenterSchema.index({ status: 1, is_active: 1, is_deleted: 1 });
coachingCenterSchema.index({ status: 1, is_active: 1, approval_status: 1, is_deleted: 1 }); // Compound index for getAllAcademies query
coachingCenterSchema.index({ user: 1, is_deleted: 1 });
coachingCenterSchema.index({ user: 1, status: 1, is_deleted: 1 });
// Meilisearch indexing hooks - using queue for non-blocking indexing
coachingCenterSchema.post('save', async function (doc) {
    try {
        if (doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.INDEX_COACHING_CENTER, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
coachingCenterSchema.post('findOneAndUpdate', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_COACHING_CENTER, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
coachingCenterSchema.post('findOneAndDelete', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.DELETE_COACHING_CENTER, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
exports.CoachingCenterModel = (0, mongoose_1.model)('CoachingCenter', coachingCenterSchema);
//# sourceMappingURL=coachingCenter.model.js.map