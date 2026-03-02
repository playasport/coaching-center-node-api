"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseAuth = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const logger_1 = require("../utils/logger");
const credentialPaths = [
    path_1.default.resolve(process.cwd(), 'firebase-credentials.json'),
    path_1.default.resolve(process.cwd(), 'src', 'config', 'firebase-credentials.json'),
];
let cachedAuth = null;
let cachedCredentials = null;
const locateCredentialsFile = () => {
    for (const candidate of credentialPaths) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
};
const loadCredentials = () => {
    if (cachedCredentials) {
        return cachedCredentials;
    }
    const credentialsPath = locateCredentialsFile();
    if (!credentialsPath) {
        throw new Error(`Firebase credentials file not found. Provide it at one of the following locations:\n${credentialPaths
            .map((p) => ` - ${p}`)
            .join('\n')}`);
    }
    try {
        const raw = fs_1.default.readFileSync(credentialsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const projectId = parsed.projectId || parsed.project_id;
        const clientEmail = parsed.clientEmail || parsed.client_email;
        const privateKey = parsed.privateKey || parsed.private_key;
        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Firebase credentials file is missing required fields (projectId/clientEmail/privateKey).');
        }
        cachedCredentials = {
            projectId,
            clientEmail,
            privateKey: String(privateKey).replace(/\\n/g, '\n'),
        };
        return cachedCredentials;
    }
    catch (error) {
        logger_1.logger.error('Failed to read Firebase credentials file', error);
        throw error;
    }
};
const getFirebaseAuth = () => {
    if (cachedAuth) {
        return cachedAuth;
    }
    const credentials = loadCredentials();
    if (!(0, app_1.getApps)().length) {
        try {
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId: credentials.projectId,
                    clientEmail: credentials.clientEmail,
                    privateKey: credentials.privateKey,
                }),
            });
            logger_1.logger.info('Firebase app initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Firebase app', error);
            throw error;
        }
    }
    cachedAuth = (0, auth_1.getAuth)();
    return cachedAuth;
};
exports.getFirebaseAuth = getFirebaseAuth;
//# sourceMappingURL=firebase.js.map