"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmsPageModel = exports.CmsPagePlatform = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// CMS Page Platform enum
var CmsPagePlatform;
(function (CmsPagePlatform) {
    CmsPagePlatform["WEB"] = "web";
    CmsPagePlatform["APP"] = "app";
    CmsPagePlatform["BOTH"] = "both";
})(CmsPagePlatform || (exports.CmsPagePlatform = CmsPagePlatform = {}));
// CMS Page schema
const cmsPageSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        enum: Object.values(CmsPagePlatform),
        required: true,
        default: CmsPagePlatform.BOTH,
        index: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
    version: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Version must be at least 1'],
    },
    updatedBy: {
        type: String,
        default: null,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
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
// Indexes for better query performance
cmsPageSchema.index({ slug: 1, deletedAt: 1 });
cmsPageSchema.index({ platform: 1, isActive: 1 });
cmsPageSchema.index({ isActive: 1, deletedAt: 1 });
cmsPageSchema.index({ createdAt: -1 });
exports.CmsPageModel = (0, mongoose_1.model)('CmsPage', cmsPageSchema);
//# sourceMappingURL=cmsPage.model.js.map