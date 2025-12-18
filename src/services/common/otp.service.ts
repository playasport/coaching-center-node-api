import { v4 as uuidv4 } from 'uuid';
import { OtpModel, Otp } from '../../models/otp.model';
import { OtpMode } from '../../enums/otpMode.enum';
import { OtpChannel } from '../../enums/otpChannel.enum';

const OTP_EXPIRY_MINUTES = 5;

export type OtpVerificationStatus = 'valid' | 'expired' | 'invalid' | 'not_found' | 'consumed';

export type OtpTarget =
  | {
      channel: OtpChannel;
      identifier: string;
    }
  | string;

const normalizeTarget = (target: OtpTarget): { channel: OtpChannel; identifier: string } => {
  if (typeof target === 'string') {
    return { channel: OtpChannel.MOBILE, identifier: target };
  }
  return target;
};

export const otpService = {
  async createOtp(target: OtpTarget, otp: string, mode: OtpMode): Promise<Otp> {
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const { channel, identifier } = normalizeTarget(target);

    const doc = await OtpModel.findOneAndUpdate(
      { identifier, channel, mode },
      {
        $set: {
          otp,
          expiresAt,
          consumed: false,
          identifier,
          channel,
          mobile: channel === 'mobile' ? identifier : null,
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
    target: OtpTarget,
    otp: string,
    mode: OtpMode
  ): Promise<OtpVerificationStatus> {
    const { channel, identifier } = normalizeTarget(target);

    const record =
      (await OtpModel.findOne({ identifier, channel, mode }).lean<Otp | null>()) ??
      (channel === 'mobile'
        ? await OtpModel.findOne({ mobile: identifier, mode }).lean<Otp | null>()
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

    await OtpModel.deleteOne({ id: record.id });

    return 'valid';
  },
};



