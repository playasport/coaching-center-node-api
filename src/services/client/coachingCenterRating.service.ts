import { Types } from 'mongoose';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import {
  CoachingCenterRatingModel,
  RATING_MIN_VALUE,
  RATING_MAX_VALUE,
  type RatingStatus,
} from '../../models/coachingCenterRating.model';
import { UserModel } from '../../models/user.model';
import { getUserObjectId } from '../../utils/userCache';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { t } from '../../utils/i18n';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { getSettings } from '../common/settings.service';

export interface SubmitRatingInput {
  rating: number;
  comment?: string | null;
}

export interface RatingListItem {
  id: string;
  rating: number;
  comment?: string | null;
  status?: RatingStatus;
  isOwn?: boolean;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    profileImage?: string | null;
  } | null;
}

export interface RatingsListResponse {
  ratings: RatingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating: number;
  totalRatings: number;
}

/**
 * Recalculate and update coaching center's averageRating, totalRatings, and ratings array.
 */
export const recalcCoachingCenterRatingStats = async (
  coachingCenterObjectId: Types.ObjectId
): Promise<void> => {
  const ratings = await CoachingCenterRatingModel.find({
    coachingCenter: coachingCenterObjectId,
    status: 'approved',
  })
    .select('_id rating')
    .lean();

  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10
      : 0;
  const ratingIds = ratings.map((r) => r._id);

  await CoachingCenterModel.findByIdAndUpdate(coachingCenterObjectId, {
    averageRating,
    totalRatings,
    ratings: ratingIds,
  });

  logger.debug('Recalculated coaching center rating stats', {
    coachingCenterId: coachingCenterObjectId.toString(),
    averageRating,
    totalRatings,
  });
};

/**
 * Submit or update a user's rating for a coaching center. One rating per user per center.
 * Rejects if settings.general.ratings_enabled is false.
 */
export const submitOrUpdateRating = async (
  userId: string,
  coachingCenterId: string,
  input: SubmitRatingInput
): Promise<{ id: string; rating: number; comment?: string | null; isUpdate: boolean }> => {
  const { rating, comment } = input;

  const settings = await getSettings(false);
  if (settings.general?.ratings_enabled === false) {
    throw new ApiError(403, t('coachingCenterRating.ratingsDisabled'));
  }

  if (
    typeof rating !== 'number' ||
    rating < RATING_MIN_VALUE ||
    rating > RATING_MAX_VALUE
  ) {
    throw new ApiError(
      400,
      t('coachingCenterRating.invalidRating', { min: RATING_MIN_VALUE, max: RATING_MAX_VALUE })
    );
  }

  const [userObjectId, center] = await Promise.all([
    getUserObjectId(userId),
    CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
      .select('_id')
      .lean(),
  ]);

  if (!userObjectId) {
    throw new ApiError(404, t('errors.userNotFound'));
  }
  if (!center) {
    throw new ApiError(404, t('coachingCenterRating.centerNotFound'));
  }

  const centerObjectId = center._id as Types.ObjectId;

  const existing = await CoachingCenterRatingModel.findOne({
    user: userObjectId,
    coachingCenter: centerObjectId,
  }).lean();

  let ratingDoc: { _id: Types.ObjectId; rating: number; comment?: string | null };
  let isUpdate: boolean;

  if (existing) {
    ratingDoc = await CoachingCenterRatingModel.findByIdAndUpdate(
      existing._id,
      { rating, comment: comment ?? existing.comment ?? null, status: 'pending' },
      { new: true }
    ).lean() as any;
    isUpdate = true;
  } else {
    const created = await CoachingCenterRatingModel.create({
      user: userObjectId,
      coachingCenter: centerObjectId,
      rating,
      comment: comment ?? null,
    });
    ratingDoc = created.toObject();
    isUpdate = false;
  }

  await recalcCoachingCenterRatingStats(centerObjectId);

  const id = (ratingDoc as any).id ?? (ratingDoc._id as Types.ObjectId).toString();
  const result = {
    id,
    rating: ratingDoc.rating,
    comment: ratingDoc.comment ?? null,
    isUpdate,
  };

  // Non-blocking: send push notification to admins
  setImmediate(() => {
    (async () => {
      try {
        const [centerDoc, userDoc] = await Promise.all([
          CoachingCenterModel.findById(centerObjectId).select('center_name id').lean(),
          UserModel.findById(userObjectId).select('firstName lastName').lean(),
        ]);
        if (!centerDoc) return;
        const centerName = (centerDoc as any).center_name || 'An academy';
        const userName =
          userDoc && (userDoc.firstName || userDoc.lastName)
            ? [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()
            : 'A user';
        const { createAndSendNotification } = await import('../common/notification.service');
        await createAndSendNotification({
          recipientType: 'role',
          roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
          title: isUpdate ? 'Academy rating updated' : 'New academy rating',
          body: `${userName} ${isUpdate ? 'updated their rating to' : 'rated'} "${centerName}" ${rating} star(s).`,
          channels: ['push'],
          priority: 'medium',
          data: {
            type: 'academy_rated',
            coachingCenterId: coachingCenterId,
            centerName: centerName,
            rating: String(rating),
            isUpdate: String(isUpdate),
          },
        });
      } catch (err) {
        logger.warn('Failed to send admin notification for academy rating (non-blocking)', {
          error: err instanceof Error ? err.message : err,
          coachingCenterId,
        });
      }
    })();
  });

  return result;
};

export interface UserRatingListItem {
  id: string;
  rating: number;
  comment: string | null;
  status: RatingStatus;
  created_at: Date;
  updated_at: Date;
  coaching_center: {
    id: string;
    center_name: string;
    logo: string | null;
  } | null;
}

export interface UserRatingsListResponse {
  ratings: UserRatingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const getUserRatings = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<UserRatingsListResponse> => {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(404, t('errors.userNotFound'));
  }

  const pageNumber = Math.max(1, page);
  const pageSize = Math.min(100, Math.max(1, limit));
  const skip = (pageNumber - 1) * pageSize;

  const [ratings, total] = await Promise.all([
    CoachingCenterRatingModel.find({ user: userObjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('coachingCenter', 'id center_name logo')
      .lean(),
    CoachingCenterRatingModel.countDocuments({ user: userObjectId }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const transformedRatings: UserRatingListItem[] = ratings.map((r: any) => ({
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    coaching_center: r.coachingCenter
      ? {
          id: r.coachingCenter.id ?? r.coachingCenter._id?.toString(),
          center_name: r.coachingCenter.center_name || 'N/A',
          logo: r.coachingCenter.logo ?? null,
        }
      : null,
  }));

  return {
    ratings: transformedRatings,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
    },
  };
};

/** When user is not logged in, only this many ratings are returned. */
const GUEST_RATINGS_LIMIT = 5;

/**
 * Get paginated ratings for a coaching center. Optionally populate user info.
 * When userId is not provided (guest), returns only the first 5 ratings (page and limit ignored).
 */
export const getRatingsByCoachingCenterId = async (
  coachingCenterId: string,
  page: number = 1,
  limit: number = 20,
  userId?: string | null
): Promise<RatingsListResponse> => {
  const center = await CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
    .select('_id averageRating totalRatings')
    .lean();

  if (!center) {
    throw new ApiError(404, t('coachingCenterRating.centerNotFound'));
  }

  const centerObjectId = center._id as Types.ObjectId;
  const isGuest = !userId;
  const pageNumber = isGuest ? 1 : Math.max(1, page);
  const pageSize = isGuest ? GUEST_RATINGS_LIMIT : Math.min(100, Math.max(1, limit));
  const skip = (pageNumber - 1) * pageSize;

  const approvedFilter = { status: 'approved' };
  const [ratings, total] = await Promise.all([
    CoachingCenterRatingModel.find({
      coachingCenter: centerObjectId,
      ...approvedFilter,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'id firstName lastName profileImage')
      .lean(),
    CoachingCenterRatingModel.countDocuments({
      coachingCenter: centerObjectId,
      ...approvedFilter,
    }),
  ]);

  const ratingList: RatingListItem[] = ratings.map((r: any) => ({
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.createdAt,
    user: r.user
      ? {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName ?? null,
          profileImage: r.user.profileImage ?? null,
        }
      : null,
  }));

  return {
    ratings: ratingList,
    total,
    page: pageNumber,
    limit: pageSize,
    totalPages: isGuest ? 1 : Math.ceil(total / pageSize),
    averageRating: center.averageRating ?? 0,
    totalRatings: center.totalRatings ?? 0,
  };
};

export interface LatestRatingsForCenterResult {
  ratings: RatingListItem[];
  averageRating: number;
  totalRatings: number;
  isAlreadyRated: boolean;
  canUpdateRating: boolean;
}

/**
 * Get latest N ratings for a coaching center. If userId provided, put that user's rating first and set isAlreadyRated/canUpdateRating.
 */
export const getLatestRatingsForCenter = async (
  coachingCenterId: string,
  limit: number = 5,
  userId?: string | null
): Promise<LatestRatingsForCenterResult> => {
  const center = await CoachingCenterModel.findOne({
    id: coachingCenterId,
    is_deleted: false,
  })
    .select('_id averageRating totalRatings')
    .lean();

  if (!center) {
    return {
      ratings: [],
      averageRating: 0,
      totalRatings: 0,
      isAlreadyRated: false,
      canUpdateRating: false,
    };
  }

  const centerObjectId = center._id as Types.ObjectId;
  const averageRating = center.averageRating ?? 0;
  const totalRatings = center.totalRatings ?? 0;

  let isAlreadyRated = false;
  let canUpdateRating = false;
  let myRatingDoc: any = null;

  if (userId) {
    const userObjectId = await getUserObjectId(userId);
    if (userObjectId) {
      myRatingDoc = await CoachingCenterRatingModel.findOne({
        user: userObjectId,
        coachingCenter: centerObjectId,
      })
        .populate('user', 'id firstName lastName profileImage')
        .lean();
      if (myRatingDoc) {
        isAlreadyRated = true;
        canUpdateRating = true;
      }
    }
  }

  // Client: only show approved ratings
  const latestRatings = await CoachingCenterRatingModel.find({
    coachingCenter: centerObjectId,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .limit(
      limit +
        (myRatingDoc &&
        (myRatingDoc as any).status === 'approved'
          ? 1
          : 0)
    )
    .populate('user', 'id firstName lastName profileImage')
    .lean();

  const toListItem = (r: any, isOwn = false): RatingListItem => ({
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    status: isOwn ? r.status : undefined,
    isOwn: isOwn || undefined,
    createdAt: r.createdAt,
    user: r.user
      ? {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName ?? null,
          profileImage: r.user.profileImage ?? null,
        }
      : null,
  });

  let ratings: RatingListItem[] = latestRatings.map((r) => toListItem(r));

  if (myRatingDoc) {
    const myId = (myRatingDoc as any).id ?? myRatingDoc._id?.toString();
    const existingIndex = ratings.findIndex((r) => r.id === myId);
    if (existingIndex >= 0) {
      ratings.splice(existingIndex, 1);
      ratings = [toListItem(myRatingDoc, true), ...ratings].slice(0, limit);
    } else {
      ratings = [toListItem(myRatingDoc, true), ...ratings].slice(0, limit);
    }
  } else {
    ratings = ratings.slice(0, limit);
  }

  return {
    ratings,
    averageRating,
    totalRatings,
    isAlreadyRated,
    canUpdateRating,
  };
};
