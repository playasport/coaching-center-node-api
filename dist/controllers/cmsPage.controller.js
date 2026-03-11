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
exports.getCmsPageBySlug = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const adminCmsPageService = __importStar(require("../services/admin/cmsPage.service"));
/**
 * Get CMS page by slug (public endpoint)
 */
const getCmsPageBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { platform } = req.query;
        if (!slug) {
            res.status(400).json(new ApiResponse_1.ApiResponse(400, null, 'Slug is required'));
            return;
        }
        const page = await adminCmsPageService.getCmsPageBySlug(slug);
        if (!page) {
            throw new ApiError_1.ApiError(404, 'CMS page not found');
        }
        // Filter by platform if provided
        if (platform && page.platform !== 'both' && page.platform !== platform) {
            throw new ApiError_1.ApiError(404, 'CMS page not found for this platform');
        }
        // Return only required fields: slug, title, content, updatedAt
        const filteredPage = {
            slug: page.slug,
            title: page.title,
            content: page.content,
            updatedAt: page.updatedAt,
        };
        const response = new ApiResponse_1.ApiResponse(200, { ...filteredPage }, 'CMS page retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCmsPageBySlug = getCmsPageBySlug;
//# sourceMappingURL=cmsPage.controller.js.map