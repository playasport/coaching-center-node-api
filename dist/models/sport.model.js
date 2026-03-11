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
exports.SportModel = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const sportSchema = new mongoose_1.Schema({
    custom_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    slug: {
        type: String,
        default: null,
        trim: true,
        index: true,
        lowercase: true,
    },
    logo: {
        type: String,
        default: null,
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true,
    },
    is_popular: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
});
// Generate slug from name if not provided
sportSchema.pre('save', function (next) {
    if (!this.custom_id) {
        this.custom_id = (0, uuid_1.v4)();
    }
    // Generate slug from name if not provided
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    next();
});
// Meilisearch indexing hooks - using queue for non-blocking indexing
sportSchema.post('save', async function (doc) {
    try {
        if (doc.custom_id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.INDEX_SPORT, doc.custom_id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
sportSchema.post('findOneAndUpdate', async function (doc) {
    try {
        if (doc && doc.custom_id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_SPORT, doc.custom_id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
sportSchema.post('findOneAndDelete', async function (doc) {
    try {
        if (doc && doc.custom_id) {
            const { enqueueMeilisearchIndexing, IndexingJobType } = await Promise.resolve().then(() => __importStar(require('../queue/meilisearchIndexingQueue')));
            await enqueueMeilisearchIndexing(IndexingJobType.DELETE_SPORT, doc.custom_id);
        }
    }
    catch (error) {
        // Silently fail - Meilisearch indexing is optional
    }
});
exports.SportModel = (0, mongoose_1.model)('Sport', sportSchema);
//# sourceMappingURL=sport.model.js.map