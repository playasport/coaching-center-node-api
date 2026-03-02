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
exports.updateReelView = exports.getReelsListWithIdFirst = exports.getReelsList = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const reelService = __importStar(require("../services/client/reel.service"));
/**
 * Get paginated list of reels
 * GET /reels?page=1&limit=3
 */
const getReelsList = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const result = await reelService.getReelsList(page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Reels retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReelsList = getReelsList;
/**
 * Get reels list with a specific reel first (by ID)
 * GET /reels/:id?page=1&limit=3
 */
const getReelsListWithIdFirst = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const result = await reelService.getReelsListWithIdFirst(id, page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Reels retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getReelsListWithIdFirst = getReelsListWithIdFirst;
/**
 * Update reel view count
 * PUT /reels/:id/view
 */
const updateReelView = async (req, res, next) => {
    try {
        const { id } = req.params;
        const viewCount = await reelService.updateReelView(id);
        const response = new ApiResponse_1.ApiResponse(200, { views: viewCount }, 'Reel view updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateReelView = updateReelView;
//# sourceMappingURL=reel.controller.js.map