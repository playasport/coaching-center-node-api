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
exports.getRoles = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const roleService = __importStar(require("../services/admin/role.service"));
/**
 * Get list of roles visible to the logged-in user
 */
const getRoles = async (req, res, next) => {
    try {
        if (!req.user || !req.user.role) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const roles = await roleService.getRolesByUser(req.user.role);
        const response = new ApiResponse_1.ApiResponse(200, { roles, count: roles.length }, (0, i18n_1.t)('role.list.success') || 'Roles retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRoles = getRoles;
//# sourceMappingURL=role.controller.js.map