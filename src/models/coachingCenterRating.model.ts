import { Schema, model, HydratedDocument, Types } from 'mongoose';

export type RatingStatus = 'pending' | 'approved' | 'rejected';

export interface CoachingCenterRating {
  id: string;
  user: Types.ObjectId;
  coachingCenter: Types.ObjectId;
  rating: number; // 1-5
  comment?: string | null;
  status: RatingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CoachingCenterRatingDocument = HydratedDocument<CoachingCenterRating>;

const RATING_MIN = 1;
const RATING_MAX = 5;

const coachingCenterRatingSchema = new Schema<CoachingCenterRating>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coachingCenter: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: RATING_MIN,
      max: RATING_MAX,
    },
    comment: {
      type: String,
      default: null,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
  }
);

// One rating per user per coaching center (upsert for update)
coachingCenterRatingSchema.index({ user: 1, coachingCenter: 1 }, { unique: true });
coachingCenterRatingSchema.index({ coachingCenter: 1, createdAt: -1 });
coachingCenterRatingSchema.index({ coachingCenter: 1, status: 1, createdAt: -1 });

export const RATING_MIN_VALUE = RATING_MIN;
export const RATING_MAX_VALUE = RATING_MAX;
export const CoachingCenterRatingModel = model<CoachingCenterRating>(
  'CoachingCenterRating',
  coachingCenterRatingSchema
);
