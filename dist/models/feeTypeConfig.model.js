"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeTypeConfigModel = exports.FeeType = void 0;
const mongoose_1 = require("mongoose");
const feeType_enum_1 = require("../enums/feeType.enum");
Object.defineProperty(exports, "FeeType", { enumerable: true, get: function () { return feeType_enum_1.FeeType; } });
const formFieldType_enum_1 = require("../enums/formFieldType.enum");
// FormField sub-schema
const formFieldSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(formFieldType_enum_1.FormFieldType),
        required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: null },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    step: { type: Number, default: null },
    options: {
        type: [
            {
                value: { type: mongoose_1.Schema.Types.Mixed },
                label: { type: String, required: true },
            },
        ],
        default: null,
    },
    fields: {
        type: [mongoose_1.Schema.Types.Mixed], // Recursive reference for nested fields
        default: null,
    },
    description: { type: String, default: null },
}, { _id: false });
// FeeTypeConfig schema
const feeTypeConfigSchema = new mongoose_1.Schema({
    fee_type: {
        type: String,
        enum: Object.values(feeType_enum_1.FeeType),
        required: true,
        unique: true,
        index: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    formFields: { type: [formFieldSchema], required: true },
    validationRules: { type: mongoose_1.Schema.Types.Mixed, default: null },
    is_active: { type: Boolean, default: true, index: true },
    is_deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result._id?.toString();
            delete result._id;
            delete result.__v;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result._id?.toString();
            delete result._id;
            delete result.__v;
        },
    },
});
// Indexes
feeTypeConfigSchema.index({ fee_type: 1, is_active: 1, is_deleted: 1 });
exports.FeeTypeConfigModel = (0, mongoose_1.model)('FeeTypeConfig', feeTypeConfigSchema);
//# sourceMappingURL=feeTypeConfig.model.js.map