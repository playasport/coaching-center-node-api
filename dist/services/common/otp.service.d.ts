import { Otp } from '../../models/otp.model';
import { OtpMode } from '../../enums/otpMode.enum';
import { OtpChannel } from '../../enums/otpChannel.enum';
export type OtpVerificationStatus = 'valid' | 'expired' | 'invalid' | 'not_found' | 'consumed';
export type OtpTarget = {
    channel: OtpChannel;
    identifier: string;
} | string;
export declare const otpService: {
    createOtp(target: OtpTarget, otp: string, mode: OtpMode): Promise<Otp>;
    verifyOtp(target: OtpTarget, otp: string, mode: OtpMode): Promise<OtpVerificationStatus>;
};
//# sourceMappingURL=otp.service.d.ts.map