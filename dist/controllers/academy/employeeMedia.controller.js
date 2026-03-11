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
exports.uploadCertifications = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const mediaService = __importStar(require("../../services/academy/employeeMedia.service"));
/**
 * Upload certification documents
 */
const uploadCertifications = async (req, res, next) => {
    try {
        const files = req.files;
        const result = {};
        // Upload certifications if provided
        if (files.certifications && files.certifications.length > 0) {
            const certificationUrls = await mediaService.uploadMultipleCertificationFiles(files.certifications);
            result.certifications = {
                urls: certificationUrls,
                count: certificationUrls.length,
                type: 'certification',
            };
        }
        // Check if at least one file was uploaded
        if (Object.keys(result).length === 0) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.media.fileRequired'));
        }
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('employee.media.uploadSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadCertifications = uploadCertifications;
//# sourceMappingURL=employeeMedia.controller.js.map