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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTwilioClient = exports.getTwilioClient = void 0;
const twilio_1 = __importDefault(require("twilio"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
let client = null;
let clientInitializationPromise = null;
/**
 * Get Twilio client with settings priority (Settings first, then ENV fallback)
 */
const getTwilioClient = async () => {
    // If client already exists, return it
    if (client) {
        return client;
    }
    // If initialization is in progress, wait for it
    if (clientInitializationPromise) {
        return clientInitializationPromise;
    }
    // Initialize client with settings priority
    clientInitializationPromise = (async () => {
        try {
            const { getSmsCredentials } = await Promise.resolve().then(() => __importStar(require('../services/common/settings.service')));
            const credentials = await getSmsCredentials();
            if (!credentials.accountSid || !credentials.authToken || !credentials.fromPhone) {
                logger_1.logger.warn('Twilio credentials missing from settings, checking env fallback', {
                    hasAccountSid: !!credentials.accountSid,
                    hasAuthToken: !!credentials.authToken,
                    hasFromPhone: !!credentials.fromPhone,
                });
                // Fallback to env if settings credentials are missing
                if (!env_1.config.twilio.accountSid || !env_1.config.twilio.authToken || !env_1.config.twilio.fromPhone) {
                    logger_1.logger.error('Twilio credentials missing from both settings and environment variables');
                    return null;
                }
                // Trim credentials to remove any whitespace
                const accountSid = env_1.config.twilio.accountSid.trim();
                const authToken = env_1.config.twilio.authToken.trim();
                client = (0, twilio_1.default)(accountSid, authToken);
                logger_1.logger.info('Twilio client initialized with environment credentials');
                return client;
            }
            // Trim credentials to remove any whitespace
            const accountSid = credentials.accountSid.trim();
            const authToken = credentials.authToken.trim();
            client = (0, twilio_1.default)(accountSid, authToken);
            logger_1.logger.info('Twilio client initialized with settings credentials', {
                accountSidLength: accountSid.length,
                authTokenLength: authToken.length,
            });
            return client;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Twilio client from settings, trying env fallback', error);
            // Fallback to env if settings fail
            if (!env_1.config.twilio.accountSid || !env_1.config.twilio.authToken || !env_1.config.twilio.fromPhone) {
                logger_1.logger.error('Twilio credentials missing from environment variables');
                return null;
            }
            // Trim credentials to remove any whitespace
            const accountSid = env_1.config.twilio.accountSid.trim();
            const authToken = env_1.config.twilio.authToken.trim();
            client = (0, twilio_1.default)(accountSid, authToken);
            logger_1.logger.info('Twilio client initialized with environment credentials (after settings error)');
            return client;
        }
        finally {
            clientInitializationPromise = null;
        }
    })();
    return clientInitializationPromise;
};
exports.getTwilioClient = getTwilioClient;
/**
 * Reset Twilio client (useful when credentials are updated)
 */
const resetTwilioClient = () => {
    client = null;
    clientInitializationPromise = null;
};
exports.resetTwilioClient = resetTwilioClient;
//# sourceMappingURL=twilio.js.map