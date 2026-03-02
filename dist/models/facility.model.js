"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacilityModel = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const facilitySchema = new mongoose_1.Schema({
    custom_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    description: {
        type: String,
        default: null,
    },
    icon: {
        type: String,
        default: null,
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
// Ensure custom_id is generated if not provided
facilitySchema.pre('save', function (next) {
    if (!this.custom_id) {
        this.custom_id = (0, uuid_1.v4)();
    }
    next();
});
exports.FacilityModel = (0, mongoose_1.model)('Facility', facilitySchema);
//# sourceMappingURL=facility.model.js.map