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
exports.ReelModel = exports.ReelStatus = void 0;
const mongoose_1 = require("mongoose");
const streamHighlight_model_1 = require("./streamHighlight.model");
var ReelStatus;
(function (ReelStatus) {
    ReelStatus["APPROVED"] = "approved";
    ReelStatus["REJECTED"] = "rejected";
    ReelStatus["BLOCKED"] = "blocked";
    ReelStatus["PENDING"] = "pending";
})(ReelStatus || (exports.ReelStatus = ReelStatus = {}));
const reelSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    sportIds: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'Sport',
        required: true,
        default: [],
    },
    originalPath: { type: String, required: true },
    folderPath: { type: String, default: null },
    thumbnailPath: { type: String, default: null },
    masterM3u8Url: { type: String, default: null },
    previewUrl: { type: String, default: null },
    hlsUrls: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    status: {
        type: String,
        enum: Object.values(ReelStatus),
        required: true,
    },
    videoProcessingStatus: {
        type: String,
        enum: Object.values(streamHighlight_model_1.VideoProcessingStatus),
        required: false,
        default: streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED,
    },
    viewsCount: { type: Number, required: true, default: 0 },
    likesCount: { type: Number, required: true, default: 0 },
    commentsCount: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date, default: null },
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
// Indexes for common queries
reelSchema.index({ userId: 1, deletedAt: 1 });
reelSchema.index({ status: 1, deletedAt: 1 });
reelSchema.index({ videoProcessingStatus: 1 });
reelSchema.index({ createdAt: -1 });
reelSchema.index({ sportIds: 1, deletedAt: 1 });
// Meilisearch indexing hooks - using queue for non-blocking indexing
reelSchema.post('save', async function (doc) {
    try {
        if (doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.INDEX_REEL, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
reelSchema.post('findOneAndUpdate', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_REEL, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
reelSchema.post('findOneAndDelete', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.DELETE_REEL, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
exports.ReelModel = (0, mongoose_1.model)('Reel', reelSchema);
//# sourceMappingURL=reel.model.js.map