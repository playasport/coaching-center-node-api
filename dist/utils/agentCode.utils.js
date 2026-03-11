"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueAgentCode = void 0;
const crypto_1 = __importDefault(require("crypto"));
const adminUser_model_1 = require("../models/adminUser.model");
const PREFIX = 'AG';
const RANDOM_DIGITS = 4;
const MAX_RETRIES = 10;
/**
 * Generate agentCode: "AG" + 4 random digits (e.g. AG2562)
 */
const generateAgentCodeWithRandomDigits = () => {
    let suffix = '';
    const randomBytes = crypto_1.default.randomBytes(RANDOM_DIGITS);
    for (let i = 0; i < RANDOM_DIGITS; i++) {
        suffix += randomBytes[i] % 10; // 0-9
    }
    return PREFIX + suffix;
};
/**
 * Generate a unique agentCode for AdminUser (agents).
 * Format: "AG" + 4 random digits (e.g. AG2562)
 * Checks DB for uniqueness; retries on collision.
 */
const generateUniqueAgentCode = async () => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const code = generateAgentCodeWithRandomDigits();
        const exists = await adminUser_model_1.AdminUserModel.exists({ agentCode: code });
        if (!exists) {
            return code;
        }
    }
    throw new Error(`Failed to generate unique agentCode after ${MAX_RETRIES} attempts`);
};
exports.generateUniqueAgentCode = generateUniqueAgentCode;
//# sourceMappingURL=agentCode.utils.js.map