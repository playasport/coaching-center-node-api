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
exports.updateHighlightView = exports.getHighlightById = exports.getHighlightsList = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const highlightService = __importStar(require("../services/client/highlight.service"));
/**
 * Get paginated list of highlights
 * GET /highlights?page=1&limit=10
 */
const getHighlightsList = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await highlightService.getHighlightsList(page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Highlights retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getHighlightsList = getHighlightsList;
/**
 * Get highlight details by ID
 * GET /highlights/:id
 */
const getHighlightById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await highlightService.getHighlightById(id);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Highlight retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getHighlightById = getHighlightById;
/**
 * Update highlight view count
 * PUT /highlights/:id/view
 */
const updateHighlightView = async (req, res, next) => {
    try {
        const { id } = req.params;
        const viewCount = await highlightService.updateHighlightView(id);
        const response = new ApiResponse_1.ApiResponse(200, { views: viewCount }, 'Highlight view updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateHighlightView = updateHighlightView;
//# sourceMappingURL=highlight.controller.js.map