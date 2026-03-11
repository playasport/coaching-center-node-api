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
exports.getMyEmployees = exports.deleteEmployee = exports.toggleEmployeeStatus = exports.updateEmployee = exports.getEmployee = exports.createEmployee = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const employeeService = __importStar(require("../../services/academy/employee.service"));
const createEmployee = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Always set userId from logged-in user (userId in request body is ignored)
        data.userId = req.user.id;
        const employee = await employeeService.createEmployee(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(201, { employee }, (0, i18n_1.t)('employee.create.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createEmployee = createEmployee;
const getEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.idRequired'));
        }
        const employee = await employeeService.getEmployeeById(id);
        if (!employee) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('employee.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { employee }, (0, i18n_1.t)('employee.get.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployee = getEmployee;
const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        const employee = await employeeService.updateEmployee(id, data, req.user.id);
        if (!employee) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('employee.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { employee }, (0, i18n_1.t)('employee.update.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateEmployee = updateEmployee;
const toggleEmployeeStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const employee = await employeeService.toggleEmployeeStatus(id, req.user.id);
        if (!employee) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('employee.notFound'));
        }
        const statusMessage = employee.is_active
            ? (0, i18n_1.t)('employee.toggleStatus.active')
            : (0, i18n_1.t)('employee.toggleStatus.inactive');
        const response = new ApiResponse_1.ApiResponse(200, { employee }, statusMessage);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleEmployeeStatus = toggleEmployeeStatus;
const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('employee.idRequired'));
        }
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        await employeeService.deleteEmployee(id, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, {}, (0, i18n_1.t)('employee.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEmployee = deleteEmployee;
const getMyEmployees = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const roleName = req.query.roleName;
        const result = await employeeService.getEmployeesByUser(req.user.id, page, limit, roleName);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('employee.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyEmployees = getMyEmployees;
//# sourceMappingURL=employee.controller.js.map