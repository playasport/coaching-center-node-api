import { HydratedDocument, Types } from 'mongoose';
import { BatchStatus } from '../enums/batchStatus.enum';
import { DurationType } from '../enums/durationType.enum';
import { Gender } from '../enums/gender.enum';
export interface IndividualTiming {
    day: string;
    start_time: string;
    end_time: string;
}
export interface Scheduled {
    start_date: Date;
    end_date?: Date | null;
    start_time?: string | null;
    end_time?: string | null;
    individual_timings?: IndividualTiming[] | null;
    training_days: string[];
}
export interface Duration {
    count: number;
    type: DurationType;
}
export interface Capacity {
    min: number;
    max?: number | null;
}
export interface AgeRange {
    min: number;
    max: number;
}
export interface Batch {
    user: Types.ObjectId;
    name: string;
    description?: string | null;
    sport: Types.ObjectId;
    center: Types.ObjectId;
    coach?: Types.ObjectId | null;
    gender: Gender[];
    certificate_issued: boolean;
    scheduled: Scheduled;
    duration: Duration;
    capacity: Capacity;
    age: AgeRange;
    admission_fee?: number | null;
    base_price: number;
    discounted_price?: number | null;
    is_allowed_disabled: boolean;
    status: BatchStatus;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type BatchDocument = HydratedDocument<Batch>;
export declare const BatchModel: import("mongoose").Model<Batch, {}, {}, {}, import("mongoose").Document<unknown, {}, Batch, {}, {}> & Batch & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=batch.model.d.ts.map