"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpModel = exports.OtpChannel = exports.OtpMode = void 0;
const mongoose_1 = require("mongoose");
const otpMode_enum_1 = require("../enums/otpMode.enum");
Object.defineProperty(exports, "OtpMode", { enumerable: true, get: function () { return otpMode_enum_1.OtpMode; } });
const otpChannel_enum_1 = require("../enums/otpChannel.enum");
Object.defineProperty(exports, "OtpChannel", { enumerable: true, get: function () { return otpChannel_enum_1.OtpChannel; } });
const otpSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    identifier: { type: String, required: true, index: true },
    channel: { type: String, enum: Object.values(otpChannel_enum_1.OtpChannel), required: true },
    mobile: { type: String, default: null, index: true },
    otp: { type: String, required: true },
    mode: {
        type: String,
        enum: Object.values(otpMode_enum_1.OtpMode),
        required: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumed: { type: Boolean, default: false },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.otp;
            if (result.channel !== 'mobile') {
                delete result.mobile;
            }
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.otp;
        },
    },
});
exports.OtpModel = (0, mongoose_1.model)('Otp', otpSchema);
//# sourceMappingURL=otp.model.js.map