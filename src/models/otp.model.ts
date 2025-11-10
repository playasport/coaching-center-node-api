import { Schema, model, HydratedDocument } from 'mongoose';

export type OtpMode = 'login' | 'register' | 'profile_update' | 'forgot_password';
export type OtpChannel = 'mobile' | 'email';

export interface Otp {
  id: string;
  identifier: string;
  channel: OtpChannel;
  mobile?: string | null;
  otp: string;
  mode: OtpMode;
  expiresAt: Date;
  consumed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OtpDocument = HydratedDocument<Otp>;

const otpSchema = new Schema<Otp>(
  {
    id: { type: String, required: true, unique: true, index: true },
    identifier: { type: String, required: true, index: true },
    channel: { type: String, enum: ['mobile', 'email'], required: true },
    mobile: { type: String, default: null, index: true },
    otp: { type: String, required: true },
    mode: {
      type: String,
      enum: ['login', 'register', 'profile_update', 'forgot_password'],
      required: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
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
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        delete result.otp;
      },
    },
  }
);

export const OtpModel = model<Otp>('Otp', otpSchema);


