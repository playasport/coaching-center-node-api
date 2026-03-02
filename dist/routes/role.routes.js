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
const express_1 = require("express");
const roleController = __importStar(require("../controllers/role.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /role:
 *   get:
 *     summary: Get list of roles visible to logged-in user
 *     tags: [Role]
 *     description: |
 *       Retrieve a list of roles that the logged-in user can view based on their role.
 *       - SUPER_ADMIN and ADMIN can see all roles
 *       - Other roles can only see roles where their role is included in the `visibleToRoles` array
 *
 *       **Response includes:** `id`, `name`, `description`, `isSystemDefined`, and `userCount` fields.
 *       - `isSystemDefined`: Indicates if the role is a system-defined role (cannot be deleted or have name changed)
 *       - `userCount`: Number of active users assigned to this role
 *       - `visibleToRoles`, `createdAt`, and `updatedAt` are excluded from the response.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Roles retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     count:
 *                       type: number
 *                       example: 2
 *             example:
 *               success: true
 *               message: "Roles retrieved successfully"
 *               data:
 *                 roles:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     name: "super_admin"
 *                     description: "Super Administrator with full system access"
 *                     isSystemDefined: true
 *                     userCount: 1
 *                   - id: "507f1f77bcf86cd799439012"
 *                     name: "academy"
 *                     description: "Academy user with coaching center management permissions"
 *                     isSystemDefined: true
 *                     userCount: 15
 *                   - id: "507f1f77bcf86cd799439013"
 *                     name: "custom_role"
 *                     description: "Custom role created by admin"
 *                     isSystemDefined: false
 *                     userCount: 3
 *                 count: 3
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', auth_middleware_1.authenticate, roleController.getRoles);
exports.default = router;
//# sourceMappingURL=role.routes.js.map