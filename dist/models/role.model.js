"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleModel = exports.DefaultRoles = void 0;
const mongoose_1 = require("mongoose");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
Object.defineProperty(exports, "DefaultRoles", { enumerable: true, get: function () { return defaultRoles_enum_1.DefaultRoles; } });
const roleSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: null },
    visibleToRoles: {
        type: [String],
        default: null,
        index: true, // Index for better query performance
        description: 'Array of multiple role names that can view/list this role. One role can be visible to multiple roles. If null or empty, only SUPER_ADMIN and ADMIN can view it.'
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result._id?.toString();
            delete result._id;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result._id?.toString();
            delete result._id;
        },
    },
});
exports.RoleModel = (0, mongoose_1.model)('Role', roleSchema);
//# sourceMappingURL=role.model.js.map