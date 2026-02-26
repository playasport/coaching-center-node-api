import { Schema, model, HydratedDocument, Types } from 'mongoose';

export interface UserAcademyBookmark {
  user: Types.ObjectId; // Reference to User model
  academy: Types.ObjectId; // Reference to CoachingCenter model
  createdAt: Date;
  updatedAt: Date;
}

export type UserAcademyBookmarkDocument = HydratedDocument<UserAcademyBookmark>;

const userAcademyBookmarkSchema = new Schema<UserAcademyBookmark>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    academy: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Unique compound index: one bookmark per user per academy
userAcademyBookmarkSchema.index({ user: 1, academy: 1 }, { unique: true });

export const UserAcademyBookmarkModel = model<UserAcademyBookmark>(
  'UserAcademyBookmark',
  userAcademyBookmarkSchema
);
