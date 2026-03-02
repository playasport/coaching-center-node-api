"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTempRegistrationToken = exports.generateTempRegistrationToken = exports.verifyToken = exports.generateToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokenPair = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
/**
 * Generate access token (short-lived, 15 minutes)
 */
const generateAccessToken = (payload) => {
    const { jti, type, ...tokenPayload } = payload;
    return jsonwebtoken_1.default.sign({
        ...tokenPayload,
        type: 'access',
        jti: jti || `${payload.id}-${Date.now()}`,
    }, env_1.config.jwt.secret, {
        expiresIn: env_1.config.jwt.accessTokenExpiresIn,
    });
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate refresh token (long-lived)
 * For mobile apps (android/ios), uses longer expiry (default 90 days)
 * For web, uses standard expiry (default 7 days)
 */
const generateRefreshToken = (payload, deviceType) => {
    const { jti, type, ...tokenPayload } = payload;
    // Use longer expiry for mobile apps
    const expiresIn = deviceType === 'android' || deviceType === 'ios'
        ? env_1.config.jwt.mobileRefreshTokenExpiresIn
        : env_1.config.jwt.refreshTokenExpiresIn;
    return jsonwebtoken_1.default.sign({
        ...tokenPayload,
        type: 'refresh',
        jti: jti || `${payload.id}-${Date.now()}-refresh`,
        deviceType: deviceType || 'web',
        deviceId: payload.deviceId,
    }, env_1.config.jwt.refreshSecret, {
        expiresIn: expiresIn,
    });
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate both access and refresh tokens
 * @param payload - Token payload
 * @param deviceType - Device type for determining refresh token expiry (web uses 7d, mobile uses 90d)
 * @param deviceId - Optional device ID for device-specific tokens
 */
const generateTokenPair = (payload, deviceType, deviceId) => {
    const jti = `${payload.id}-${Date.now()}`;
    return {
        accessToken: (0, exports.generateAccessToken)({ ...payload, jti }),
        refreshToken: (0, exports.generateRefreshToken)({ ...payload, jti, deviceId, deviceType }, deviceType),
    };
};
exports.generateTokenPair = generateTokenPair;
/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwt.secret);
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwt.refreshSecret);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Legacy function for backward compatibility
 * @deprecated Use generateTokenPair instead
 */
const generateToken = (payload) => {
    return (0, exports.generateAccessToken)(payload);
};
exports.generateToken = generateToken;
/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
const verifyToken = (token) => {
    return (0, exports.verifyAccessToken)(token);
};
exports.verifyToken = verifyToken;
/**
 * Generate temporary registration token (30 minutes expiry)
 * Used when user verifies OTP but doesn't exist yet
 */
const generateTempRegistrationToken = (mobile) => {
    return jsonwebtoken_1.default.sign({
        mobile,
        type: 'registration',
    }, env_1.config.jwt.secret, {
        expiresIn: '30m', // 30 minutes
    });
};
exports.generateTempRegistrationToken = generateTempRegistrationToken;
/**
 * Verify temporary registration token
 */
const verifyTempRegistrationToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwt.secret);
        if (decoded.type !== 'registration') {
            throw new Error('Invalid token type');
        }
        if (!decoded.mobile) {
            throw new Error('Mobile number missing in token');
        }
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired temporary registration token');
    }
};
exports.verifyTempRegistrationToken = verifyTempRegistrationToken;
//# sourceMappingURL=jwt.js.map