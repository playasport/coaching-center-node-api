import { HydratedDocument, Types } from 'mongoose';
export type RatingStatus = 'pending' | 'approved' | 'rejected';
export interface CoachingCenterRating {
    id: string;
    user: Types.ObjectId;
    coachingCenter: Types.ObjectId;
    rating: number;
    comment?: string | null;
    status: RatingStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type CoachingCenterRatingDocument = HydratedDocument<CoachingCenterRating>;
export declare const RATING_MIN_VALUE = 1;
export declare const RATING_MAX_VALUE = 5;
export declare const CoachingCenterRatingModel: import("mongoose").Model<CoachingCenterRating, {}, {}, {}, import("mongoose").Document<unknown, {}, CoachingCenterRating, {}, {}> & CoachingCenterRating & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=coachingCenterRating.model.d.ts.map