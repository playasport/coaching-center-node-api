"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const env_1 = require("../config/env");
const isProduction = env_1.config.nodeEnv === 'production';
const logDirectory = path_1.default.resolve(process.cwd(), 'logs');
const logFilePath = path_1.default.join(logDirectory, 'application.log');
let fileStream = null;
// if (isProduction) {
try {
    if (!fs_1.default.existsSync(logDirectory)) {
        fs_1.default.mkdirSync(logDirectory, { recursive: true });
    }
    fileStream = fs_1.default.createWriteStream(logFilePath, { flags: 'a' });
    fileStream.on('error', (error) => {
        console.error('Logger stream error', error);
    });
    process.on('exit', () => {
        fileStream?.end();
    });
}
catch (error) {
    console.error('Failed to initialise file logger', error);
    fileStream = null;
}
// }
const consoleWriters = {
    debug: (console.debug ?? console.log).bind(console),
    info: (console.info ?? console.log).bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};
const serializeMeta = (meta) => {
    if (meta === undefined || meta === null) {
        return undefined;
    }
    if (typeof meta === 'string') {
        return meta;
    }
    if (meta instanceof Error) {
        return JSON.stringify({
            name: meta.name,
            message: meta.message,
            stack: meta.stack,
        }, null, 2);
    }
    try {
        return JSON.stringify(meta);
    }
    catch {
        return (0, util_1.inspect)(meta, { depth: null });
    }
};
const log = (level, message, meta) => {
    const timestamp = new Date().toISOString();
    const serializedMeta = serializeMeta(meta);
    const entry = serializedMeta
        ? `[${timestamp}] [${level.toUpperCase()}] ${message} | ${serializedMeta}`
        : `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (isProduction && fileStream) {
        fileStream.write(`${entry}\n`);
        return;
    }
    consoleWriters[level](entry);
};
const buildLoggerMethod = (level) => (message, meta) => {
    log(level, message, meta);
};
const withContext = (context) => {
    const mergeMeta = (meta) => {
        if (meta === undefined || meta === null) {
            return context;
        }
        if (typeof meta === 'object' && !Array.isArray(meta) && meta !== null) {
            return { ...context, ...meta };
        }
        return { ...context, data: meta };
    };
    return {
        debug: (message, meta) => log('debug', message, mergeMeta(meta)),
        info: (message, meta) => log('info', message, mergeMeta(meta)),
        warn: (message, meta) => log('warn', message, mergeMeta(meta)),
        error: (message, meta) => log('error', message, mergeMeta(meta)),
    };
};
exports.logger = {
    debug: buildLoggerMethod('debug'),
    info: buildLoggerMethod('info'),
    warn: buildLoggerMethod('warn'),
    error: buildLoggerMethod('error'),
    withContext,
};
//# sourceMappingURL=logger.js.map