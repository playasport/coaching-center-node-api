"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.t = exports.getLocale = exports.setLocale = void 0;
const en_json_1 = __importDefault(require("../locales/en.json"));
const hi_json_1 = __importDefault(require("../locales/hi.json"));
const admin_en_json_1 = __importDefault(require("../locales/admin.en.json"));
const admin_hi_json_1 = __importDefault(require("../locales/admin.hi.json"));
let currentLocale = 'en';
// Merge admin locale files into main locale files
const locales = {
    en: {
        ...en_json_1.default,
        admin: admin_en_json_1.default,
    },
    hi: {
        ...hi_json_1.default,
        admin: admin_hi_json_1.default,
    },
};
/**
 * Set the current locale
 */
const setLocale = (locale) => {
    currentLocale = locale;
};
exports.setLocale = setLocale;
/**
 * Get the current locale
 */
const getLocale = () => {
    return currentLocale;
};
exports.getLocale = getLocale;
/**
 * Get a translated message by key
 * Supports nested keys like "auth.register.success"
 */
const t = (key, params) => {
    const keys = key.split('.');
    let message = locales[currentLocale];
    // Navigate through nested object
    for (const k of keys) {
        if (message && typeof message === 'object' && k in message) {
            message = message[k];
        }
        else {
            // Key not found, return the key itself
            return key;
        }
    }
    // If message is a string, replace placeholders
    if (typeof message === 'string' && params) {
        return message.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey]?.toString() || match;
        });
    }
    return typeof message === 'string' ? message : key;
};
exports.t = t;
/**
 * Get all messages for a specific namespace
 */
const getMessages = (namespace) => {
    if (!namespace) {
        return locales[currentLocale];
    }
    const keys = namespace.split('.');
    let messages = locales[currentLocale];
    for (const k of keys) {
        if (messages && typeof messages === 'object' && k in messages) {
            messages = messages[k];
        }
        else {
            return {};
        }
    }
    return messages || {};
};
exports.getMessages = getMessages;
exports.default = { t: exports.t, setLocale: exports.setLocale, getLocale: exports.getLocale, getMessages: exports.getMessages };
//# sourceMappingURL=i18n.js.map