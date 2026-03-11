"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressSchema = void 0;
const mongoose_1 = require("mongoose");
exports.addressSchema = new mongoose_1.Schema({
    line1: { type: String, default: null },
    line2: { type: String, required: true },
    area: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    pincode: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
    _id: false,
});
//# sourceMappingURL=address.model.js.map