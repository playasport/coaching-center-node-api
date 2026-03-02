"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
let isConnecting = false;
const connectDatabase = async () => {
    if (mongoose_1.default.connection.readyState === 1) {
        return mongoose_1.default;
    }
    if (isConnecting) {
        await new Promise((resolve) => {
            mongoose_1.default.connection.once('connected', () => resolve());
        });
        return mongoose_1.default;
    }
    if (!env_1.config.database.mongoUri) {
        throw new Error('MONGO_URI is not defined. Please set it in your environment variables.');
    }
    isConnecting = true;
    mongoose_1.default.set('strictQuery', true);
    try {
        await mongoose_1.default.connect(env_1.config.database.mongoUri);
        const currentState = mongoose_1.default.connection.readyState;
        if (currentState !== mongoose_1.default.ConnectionStates.connected) {
            throw new Error('MongoDB connection not established.');
        }
        logger_1.logger.info('MongoDB connection established');
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.logger.error('MongoDB connection error', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('MongoDB disconnected');
        });
        return mongoose_1.default;
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to MongoDB', error);
        throw error;
    }
    finally {
        isConnecting = false;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.connection.close();
    }
};
exports.disconnectDatabase = disconnectDatabase;
exports.default = mongoose_1.default;
//# sourceMappingURL=database.js.map