"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdatePermissionsSchema = exports.updatePermissionSchema = exports.createPermissionSchema = void 0;
const zod_1 = require("zod");
const section_enum_1 = require("../enums/section.enum");
const section_enum_2 = require("../enums/section.enum");
const sectionEnum = zod_1.z.nativeEnum(section_enum_1.Section);
const actionEnum = zod_1.z.nativeEnum(section_enum_2.Action);
exports.createPermissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.string().min(1, 'Role ID is required'),
        section: sectionEnum,
        actions: zod_1.z.array(actionEnum).min(1, 'At least one action is required'),
        isActive: zod_1.z.boolean().default(true),
    }),
});
exports.updatePermissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        section: sectionEnum.optional(),
        actions: zod_1.z.array(actionEnum).min(1, 'At least one action is required').optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.bulkUpdatePermissionsSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.string().min(1, 'Role ID is required'),
        permissions: zod_1.z.array(zod_1.z.object({
            section: sectionEnum,
            actions: zod_1.z.array(actionEnum).min(1, 'At least one action is required'),
            isActive: zod_1.z.boolean().default(true),
        })).min(1, 'At least one permission is required'),
    }),
});
//# sourceMappingURL=permission.validation.js.map