"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerModel = exports.BannerTargetAudience = exports.BannerStatus = exports.BannerPosition = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Banner position enum
var BannerPosition;
(function (BannerPosition) {
    BannerPosition["HOMEPAGE_TOP"] = "homepage_top";
    BannerPosition["HOMEPAGE_MIDDLE"] = "homepage_middle";
    BannerPosition["HOMEPAGE_BOTTOM"] = "homepage_bottom";
    BannerPosition["CATEGORY_TOP"] = "category_top";
    BannerPosition["CATEGORY_SIDEBAR"] = "category_sidebar";
    BannerPosition["SPORT_PAGE"] = "sport_page";
    BannerPosition["CENTER_PAGE"] = "center_page";
    BannerPosition["SEARCH_RESULTS"] = "search_results";
    BannerPosition["MOBILE_APP_HOME"] = "mobile_app_home";
    BannerPosition["MOBILE_APP_CATEGORY"] = "mobile_app_category";
})(BannerPosition || (exports.BannerPosition = BannerPosition = {}));
// Banner status enum
var BannerStatus;
(function (BannerStatus) {
    BannerStatus["ACTIVE"] = "active";
    BannerStatus["INACTIVE"] = "inactive";
    BannerStatus["SCHEDULED"] = "scheduled";
    BannerStatus["EXPIRED"] = "expired";
    BannerStatus["DRAFT"] = "draft";
})(BannerStatus || (exports.BannerStatus = BannerStatus = {}));
// Banner target audience enum
var BannerTargetAudience;
(function (BannerTargetAudience) {
    BannerTargetAudience["ALL"] = "all";
    BannerTargetAudience["NEW_USERS"] = "new_users";
    BannerTargetAudience["EXISTING_USERS"] = "existing_users";
    BannerTargetAudience["PREMIUM_USERS"] = "premium_users";
    BannerTargetAudience["MOBILE_USERS"] = "mobile_users";
    BannerTargetAudience["WEB_USERS"] = "web_users";
})(BannerTargetAudience || (exports.BannerTargetAudience = BannerTargetAudience = {}));
// Main banner schema
const bannerSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        default: null,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true,
    },
    mobileImageUrl: {
        type: String,
        default: null,
        trim: true,
    },
    linkUrl: {
        type: String,
        default: null,
        trim: true,
    },
    linkType: {
        type: String,
        enum: ['internal', 'external', null],
        default: null,
    },
    position: {
        type: String,
        enum: Object.values(BannerPosition),
        required: true,
        index: true,
    },
    priority: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Priority cannot be negative'],
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(BannerStatus),
        required: true,
        default: BannerStatus.DRAFT,
        index: true,
    },
    targetAudience: {
        type: String,
        enum: Object.values(BannerTargetAudience),
        required: true,
        default: BannerTargetAudience.ALL,
        index: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
    isOnlyForAcademy: {
        type: Boolean,
        required: true,
        default: false,
        index: true,
    },
    clickCount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Click count cannot be negative'],
    },
    viewCount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'View count cannot be negative'],
    },
    sportIds: {
        type: [String],
        default: null,
        index: true,
    },
    centerIds: {
        type: [String],
        default: null,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    createdBy: {
        type: String,
        default: null,
        index: true,
    },
    updatedBy: {
        type: String,
        default: null,
    },
    deletedAt: {
        type: Date,
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
// Indexes for better query performance
bannerSchema.index({ position: 1, status: 1, isActive: 1 });
bannerSchema.index({ position: 1, priority: -1 });
bannerSchema.index({ status: 1, isActive: 1 });
bannerSchema.index({ createdAt: -1 });
bannerSchema.index({ deletedAt: 1 });
// Compound index for active banners by position
bannerSchema.index({ position: 1, isActive: 1, status: 1, priority: -1 });
exports.BannerModel = (0, mongoose_1.model)('Banner', bannerSchema);
//# sourceMappingURL=banner.model.js.map