"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachingCenterRatingModel = exports.RATING_MAX_VALUE = exports.RATING_MIN_VALUE = void 0;
const mongoose_1 = require("mongoose");
const RATING_MIN = 1;
const RATING_MAX = 5;
const coachingCenterRatingSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    coachingCenter: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        required: true,
        index: true,
    },
    rating: {
        type: Number,
        required: true,
        min: RATING_MIN,
        max: RATING_MAX,
    },
    comment: {
        type: String,
        default: null,
        maxlength: 500,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
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
// One rating per user per coaching center (upsert for update)
coachingCenterRatingSchema.index({ user: 1, coachingCenter: 1 }, { unique: true });
coachingCenterRatingSchema.index({ coachingCenter: 1, createdAt: -1 });
coachingCenterRatingSchema.index({ coachingCenter: 1, status: 1, createdAt: -1 });
exports.RATING_MIN_VALUE = RATING_MIN;
exports.RATING_MAX_VALUE = RATING_MAX;
exports.CoachingCenterRatingModel = (0, mongoose_1.model)('CoachingCenterRating', coachingCenterRatingSchema);
//# sourceMappingURL=coachingCenterRating.model.js.map