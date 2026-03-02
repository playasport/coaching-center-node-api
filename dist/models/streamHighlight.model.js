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
exports.StreamHighlightModel = exports.VideoProcessingStatus = exports.HighlightStatus = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Highlight Status Enum
var HighlightStatus;
(function (HighlightStatus) {
    HighlightStatus["PUBLISHED"] = "published";
    HighlightStatus["ARCHIVED"] = "archived";
    HighlightStatus["BLOCKED"] = "blocked";
    HighlightStatus["DELETED"] = "deleted";
})(HighlightStatus || (exports.HighlightStatus = HighlightStatus = {}));
// Video Processing Status Enum
var VideoProcessingStatus;
(function (VideoProcessingStatus) {
    VideoProcessingStatus["NOT_STARTED"] = "not_started";
    VideoProcessingStatus["PROCESSING"] = "processing";
    VideoProcessingStatus["COMPLETED"] = "completed";
    VideoProcessingStatus["FAILED"] = "failed";
})(VideoProcessingStatus || (exports.VideoProcessingStatus = VideoProcessingStatus = {}));
const streamHighlightSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    streamSessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StreamSession',
        default: null,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    coachingCenterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        default: null,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60,
    },
    description: {
        type: String,
        default: null,
        trim: true,
    },
    thumbnailUrl: {
        type: String,
        default: null,
    },
    videoUrl: {
        type: String,
        required: true,
    },
    hlsUrls: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    masterM3u8Url: {
        type: String,
        default: null,
    },
    previewUrl: {
        type: String,
        default: null,
    },
    duration: {
        type: Number,
        required: true,
        min: 0,
    },
    viewsCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    likesCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    commentsCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: Object.values(HighlightStatus),
        required: true,
        default: HighlightStatus.PUBLISHED,
    },
    videoProcessingStatus: {
        type: String,
        enum: Object.values(VideoProcessingStatus),
        required: true,
        default: VideoProcessingStatus.NOT_STARTED,
    },
    originalStreamStartTime: {
        type: Date,
        default: null,
        index: true,
    },
    originalStreamEndTime: {
        type: Date,
        default: null,
        index: true,
    },
    publishedAt: {
        type: Date,
        default: null,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
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
// Indexes for common queries
streamHighlightSchema.index({ userId: 1, deletedAt: 1 });
streamHighlightSchema.index({ coachingCenterId: 1, deletedAt: 1 });
streamHighlightSchema.index({ status: 1, deletedAt: 1 });
streamHighlightSchema.index({ status: 1, publishedAt: -1 });
streamHighlightSchema.index({ videoProcessingStatus: 1 });
streamHighlightSchema.index({ viewsCount: -1 });
streamHighlightSchema.index({ createdAt: -1 });
streamHighlightSchema.index({ userId: 1, status: 1, deletedAt: 1 });
streamHighlightSchema.index({ streamSessionId: 1 });
streamHighlightSchema.index({ coachingCenterId: 1, status: 1, deletedAt: 1 });
// Meilisearch indexing hooks - using queue for non-blocking indexing
streamHighlightSchema.post('save', async function (doc) {
    try {
        if (doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.INDEX_STREAM_HIGHLIGHT, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
streamHighlightSchema.post('findOneAndUpdate', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_STREAM_HIGHLIGHT, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
streamHighlightSchema.post('findOneAndDelete', async function (doc) {
    try {
        if (doc && doc.id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.DELETE_STREAM_HIGHLIGHT, doc.id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
exports.StreamHighlightModel = (0, mongoose_1.model)('StreamHighlight', streamHighlightSchema);
//# sourceMappingURL=streamHighlight.model.js.map