import { HydratedDocument, Types } from 'mongoose';
import { CoachingCenterStatus } from '../enums/coachingCenterStatus.enum';
import { Gender } from '../enums/gender.enum';
export interface MediaItem {
    unique_id: string;
    url: string;
    is_active: boolean;
    is_deleted: boolean;
    is_banner?: boolean;
    deletedAt?: Date | null;
}
export interface VideoItem {
    unique_id: string;
    url: string;
    thumbnail?: string | null;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
}
export interface AgeRange {
    min: number;
    max: number;
}
export interface CenterAddress {
    line1?: string | null;
    line2: string;
    city: string;
    state: string;
    country?: string | null;
    pincode: string;
}
export interface CenterLocation {
    latitude: number;
    longitude: number;
    address: CenterAddress;
}
export interface OperationalTiming {
    operating_days: string[];
    opening_time: string;
    closing_time: string;
}
export interface CallTiming {
    start_time: string;
    end_time: string;
}
export interface TrainingTimingDay {
    day: string;
    start_time: string;
    end_time: string;
}
export interface TrainingTiming {
    timings: TrainingTimingDay[];
}
export interface SportDetail {
    sport_id: Types.ObjectId;
    description: string;
    images: MediaItem[];
    videos: VideoItem[];
}
export interface BankInformation {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    gst_number?: string | null;
}
export interface CoachingCenter {
    id: string;
    user: Types.ObjectId;
    addedBy?: Types.ObjectId | null;
    center_name: string;
    mobile_number: string;
    email: string;
    rules_regulation?: string[] | null;
    logo?: string | null;
    sports: Types.ObjectId[];
    sport_details: SportDetail[];
    age: AgeRange;
    location: CenterLocation;
    facility: Types.ObjectId[];
    operational_timing: OperationalTiming;
    call_timing?: CallTiming | null;
    training_timing?: TrainingTiming | null;
    documents: MediaItem[];
    bank_information: BankInformation;
    status: CoachingCenterStatus;
    allowed_genders: Gender[];
    allowed_disabled: boolean;
    is_only_for_disabled: boolean;
    experience: number;
    is_active: boolean;
    approval_status: 'approved' | 'rejected' | 'pending_approval';
    reject_reason?: string | null;
    is_deleted: boolean;
    deletedAt?: Date | null;
    averageRating: number;
    totalRatings: number;
    ratings: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export type CoachingCenterDocument = HydratedDocument<CoachingCenter>;
export declare const CoachingCenterModel: import("mongoose").Model<CoachingCenter, {}, {}, {}, import("mongoose").Document<unknown, {}, CoachingCenter, {}, {}> & CoachingCenter & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=coachingCenter.model.d.ts.map