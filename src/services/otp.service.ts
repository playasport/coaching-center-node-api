import { v4 as uuidv4 } from 'uuid';
import { OtpModel, Otp } from '../models/otp.model';

const OTP_EXPIRY_MINUTES = 5;

export type OtpVerificationStatus = 'valid' | 'expired' | 'invalid' | 'not_found' | 'consumed';

export const otpService = {
  async createOtp(mobile: string, otp: string, mode: 'login' | 'register'): Promise<Otp> {
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const doc = await OtpModel.findOneAndUpdate(
      { mobile, mode },
      {
        $set: {
          otp,
          expiresAt,
          consumed: false,
        },
        $setOnInsert: {
          id: uuidv4(),
        },
      },
      { new: true, upsert: true }
    ).lean<Otp | null>();

    if (!doc) {
      throw new Error('Failed to create OTP');
    }

    return doc;
  },

  async verifyOtp(
    mobile: string,
    otp: string,
    mode: 'login' | 'register'
  ): Promise<OtpVerificationStatus> {
    const record = await OtpModel.findOne({ mobile, mode }).lean<Otp | null>();

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

    await OtpModel.deleteOne({ id: record.id });

    return 'valid';
  },
};


