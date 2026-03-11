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
exports.getMyParticipants = exports.deleteParticipant = exports.updateParticipant = exports.getParticipant = exports.createParticipant = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const participantService = __importStar(require("../services/client/participant.service"));
const createParticipant = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Always set userId from logged-in user (userId in request body is ignored)
        // Pass file if uploaded
        const participant = await participantService.createParticipant(data, req.user.id, req.file);
        const response = new ApiResponse_1.ApiResponse(201, { participant }, (0, i18n_1.t)('participant.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createParticipant = createParticipant;
const getParticipant = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const participant = await participantService.getParticipantById(id, req.user.id);
        if (!participant) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('participant.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { ...participant }, (0, i18n_1.t)('participant.get.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getParticipant = getParticipant;
const updateParticipant = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        // Pass file if uploaded
        const participant = await participantService.updateParticipant(id, data, req.user.id, req.file);
        if (!participant) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('participant.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { participant }, (0, i18n_1.t)('participant.update.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateParticipant = updateParticipant;
const deleteParticipant = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        await participantService.deleteParticipant(id, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, {}, (0, i18n_1.t)('participant.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteParticipant = deleteParticipant;
const getMyParticipants = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await participantService.getParticipantsByUser(req.user.id, page, limit);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('participant.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyParticipants = getMyParticipants;
//# sourceMappingURL=participant.controller.js.map