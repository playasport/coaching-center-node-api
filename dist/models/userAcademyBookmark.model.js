"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAcademyBookmarkModel = void 0;
const mongoose_1 = require("mongoose");
const userAcademyBookmarkSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    academy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        required: true,
        index: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Unique compound index: one bookmark per user per academy
userAcademyBookmarkSchema.index({ user: 1, academy: 1 }, { unique: true });
exports.UserAcademyBookmarkModel = (0, mongoose_1.model)('UserAcademyBookmark', userAcademyBookmarkSchema);
//# sourceMappingURL=userAcademyBookmark.model.js.map