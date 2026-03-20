"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SEARCH_RADIUS_KM = exports.DEFAULT_SEARCH_RADIUS_KM = void 0;
exports.parseRadiusKmFromQuery = parseRadiusKmFromQuery;
exports.assertValidRadiusKmIfProvided = assertValidRadiusKmIfProvided;
exports.resolveSearchRadiusKm = resolveSearchRadiusKm;
const env_1 = require("../config/env");
const ApiError_1 = require("./ApiError");
/** Default search radius in km — `DEFAULT_SEARCH_RADIUS_KM` env */
exports.DEFAULT_SEARCH_RADIUS_KM = env_1.config.location.defaultRadius;
/** Max allowed radius in km — `MAX_SEARCH_RADIUS_KM` env */
exports.MAX_SEARCH_RADIUS_KM = env_1.config.location.maxRadius;
function parseRadiusKmFromQuery(raw) {
    if (raw === undefined || raw === null || raw === '')
        return undefined;
    return parseFloat(String(raw).trim());
}
function assertValidRadiusKmIfProvided(radius, errorMessage) {
    if (radius === undefined)
        return;
    if (Number.isNaN(radius) || radius <= 0 || radius > exports.MAX_SEARCH_RADIUS_KM) {
        throw new ApiError_1.ApiError(400, errorMessage);
    }
}
function resolveSearchRadiusKm(radius) {
    if (radius == null || Number.isNaN(radius) || radius <= 0) {
        return exports.DEFAULT_SEARCH_RADIUS_KM;
    }
    return Math.min(radius, exports.MAX_SEARCH_RADIUS_KM);
}
//# sourceMappingURL=searchRadius.js.map