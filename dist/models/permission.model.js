"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionModel = void 0;
const mongoose_1 = require("mongoose");
const section_enum_1 = require("../enums/section.enum");
const section_enum_2 = require("../enums/section.enum");
const permissionSchema = new mongoose_1.Schema({
    role: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
        index: true,
    },
    section: {
        type: String,
        enum: Object.values(section_enum_1.Section),
        required: true,
        index: true,
    },
    actions: {
        type: [String],
        enum: Object.values(section_enum_2.Action),
        required: true,
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
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
// Compound index for efficient permission lookups
permissionSchema.index({ role: 1, section: 1, isActive: 1 });
permissionSchema.index({ role: 1, isActive: 1 });
// Prevent duplicate permissions for same role and section
permissionSchema.index({ role: 1, section: 1 }, { unique: true });
exports.PermissionModel = (0, mongoose_1.model)('Permission', permissionSchema);
//# sourceMappingURL=permission.model.js.map