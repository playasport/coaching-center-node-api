import { Schema, model, HydratedDocument } from 'mongoose';

export interface Otp {
  id: string;
  mobile: string;
  otp: string;
  mode: 'login' | 'register';
  expiresAt: Date;
  consumed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OtpDocument = HydratedDocument<Otp>;

const otpSchema = new Schema<Otp>(
  {
    id: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    mode: { type: String, enum: ['login', 'register'], required: true },
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


