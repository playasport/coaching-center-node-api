"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = void 0;
const uuid_1 = require("uuid");
const otp_model_1 = require("../models/otp.model");
const otpChannel_enum_1 = require("../enums/otpChannel.enum");
const OTP_EXPIRY_MINUTES = 5;
const normalizeTarget = (target) => {
    if (typeof target === 'string') {
        return { channel: otpChannel_enum_1.OtpChannel.MOBILE, identifier: target };
    }
    return target;
};
exports.otpService = {
    async createOtp(target, otp, mode) {
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const { channel, identifier } = normalizeTarget(target);
        const doc = await otp_model_1.OtpModel.findOneAndUpdate({ identifier, channel, mode }, {
            $set: {
                otp,
                expiresAt,
                consumed: false,
                identifier,
                channel,
                mobile: channel === 'mobile' ? identifier : null,
            },
            $setOnInsert: {
                id: (0, uuid_1.v4)(),
            },
        }, { new: true, upsert: true }).lean();
        if (!doc) {
            throw new Error('Failed to create OTP');
        }
        return doc;
    },
    async verifyOtp(target, otp, mode) {
        const { channel, identifier } = normalizeTarget(target);
        const record = (await otp_model_1.OtpModel.findOne({ identifier, channel, mode }).lean()) ??
            (channel === 'mobile'
                ? await otp_model_1.OtpModel.findOne({ mobile: identifier, mode }).lean()
                : null);
        if (!record) {
            return 'not_found';
        }
        if (record.consumed) {
            return 'consumed';
        }
        if (record.expiresAt.getTime() < Date.now()) {
            return 'expired';
        }
        if (record.otp !== otp) {
            return 'invalid';
        }
        await otp_model_1.OtpModel.deleteOne({ id: record.id });
        return 'valid';
    },
};
//# sourceMappingURL=otp.service.js.map