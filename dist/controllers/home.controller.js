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
exports.getHomeData = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const searchRadius_1 = require("../utils/searchRadius");
const homeService = __importStar(require("../services/client/home.service"));
/**
 * Get home page data (nearby academies and popular sports)
 * GET /home
 * Query params: latitude, longitude (optional) - location coordinates
 */
const getHomeData = async (req, res, next) => {
    try {
        // Parse location from query parameters
        let userLocation;
        const latitude = req.query.latitude;
        const longitude = req.query.longitude;
        const radius = (0, searchRadius_1.parseRadiusKmFromQuery)(req.query.radius);
        if (latitude !== undefined && longitude !== undefined) {
            const latitudeNum = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
            const longitudeNum = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);
            if (isNaN(latitudeNum) || isNaN(longitudeNum) || latitudeNum < -90 || latitudeNum > 90 || longitudeNum < -180 || longitudeNum > 180) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.validation.invalidLocationCoordinates'));
            }
            userLocation = { latitude: latitudeNum, longitude: longitudeNum };
        }
        (0, searchRadius_1.assertValidRadiusKmIfProvided)(radius, (0, i18n_1.t)('academy.validation.invalidRadius'));
        // Get user ID if authenticated (optional)
        const userId = req.user?.id;
        // Get home data
        const homeData = await homeService.getHomeData(userLocation, userId, radius);
        const response = new ApiResponse_1.ApiResponse(200, homeData, (0, i18n_1.t)('home.getHomeData.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getHomeData = getHomeData;
//# sourceMappingURL=home.controller.js.map