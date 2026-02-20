import { Types } from 'mongoose';
import { CoachingCenterRatingModel } from '../../models/coachingCenterRating.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { recalcCoachingCenterRatingStats } from '../client/coachingCenterRating.service';
import type { RatingStatus } from '../../models/coachingCenterRating.model';

export interface AdminRatingFilters {
  status?: RatingStatus;
  coachingCenterId?: string;
  page?: number;
  limit?: number;
}

export interface AdminRatingListItem {
  id: string;
  rating: number;
  comment: string | null;
  status: RatingStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email?: string;
    profileImage?: string | null;
  } | null;
  coachingCenter: {
    id: string;
    center_name: string;
  } | null;
}

export interface AdminRatingsListResult {
  ratings: AdminRatingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get paginated list of coaching center ratings for admin with filters.
 */
export const getRatings = async (
  filters: AdminRatingFilters = {}
): Promise<AdminRatingsListResult> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.coachingCenterId) {
    const isObjectId = Types.ObjectId.isValid(filters.coachingCenterId) && filters.coachingCenterId.length === 24;
    const center = await CoachingCenterModel.findOne(
      isObjectId
        ? { _id: filters.coachingCenterId, is_deleted: false }
        : { id: filters.coachingCenterId, is_deleted: false }
    )
      .select('_id')
      .lean();
    if (center) {
      query.coachingCenter = center._id;
    } else {
      return {
        ratings: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  const [ratings, total] = await Promise.all([
    CoachingCenterRatingModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'id firstName lastName email profileImage')
      .populate('coachingCenter', 'id center_name')
      .lean(),
    CoachingCenterRatingModel.countDocuments(query),
  ]);

  const ratingList: AdminRatingListItem[] = (ratings as any[]).map((r) => ({
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user
      ? {
          id: String(r.user.id ?? r.user._id),
          firstName: r.user.firstName,
          lastName: r.user.lastName ?? null,
          email: r.user.email,
          profileImage: r.user.profileImage ?? null,
        }
      : null,
    coachingCenter: r.coachingCenter
      ? {
          id: String(r.coachingCenter.id ?? r.coachingCenter._id),
          center_name: r.coachingCenter.center_name,
        }
      : null,
  }));

  return {
    ratings: ratingList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single rating by id (Mongo _id).
 */
export const getRatingById = async (ratingId: string): Promise<AdminRatingListItem | null> => {
  if (!Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
    return null;
  }
  const rating = await CoachingCenterRatingModel.findById(ratingId)
    .populate('user', 'id firstName lastName email profileImage')
    .populate('coachingCenter', 'id center_name')
    .lean();
  if (!rating) return null;

  const r = rating as any;
  return {
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user
      ? {
          id: String(r.user.id ?? r.user._id),
          firstName: r.user.firstName,
          lastName: r.user.lastName ?? null,
          email: r.user.email,
          profileImage: r.user.profileImage ?? null,
        }
      : null,
    coachingCenter: r.coachingCenter
      ? {
          id: String(r.coachingCenter.id ?? r.coachingCenter._id),
          center_name: r.coachingCenter.center_name,
        }
      : null,
  };
};

/**
 * Update rating status (approve or reject). Recalculates coaching center stats when approved/rejected.
 */
export const updateRatingStatus = async (
  ratingId: string,
  status: RatingStatus
): Promise<AdminRatingListItem> => {
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, t('coachingCenterRating.invalidStatus'));
  }

  if (!Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
    throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
  }
  const ratingDoc = await CoachingCenterRatingModel.findById(ratingId)
    .populate('coachingCenter', '_id')
    .lean();
  if (!ratingDoc) {
    throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
  }

  const centerObjectId = ratingDoc.coachingCenter?._id ?? ratingDoc.coachingCenter;
  const docId = ratingDoc._id;

  const updated = await CoachingCenterRatingModel.findByIdAndUpdate(
    docId,
    { status },
    { new: true }
  )
    .populate('user', 'id firstName lastName email profileImage')
    .populate('coachingCenter', 'id center_name')
    .lean();

  if (centerObjectId) {
    await recalcCoachingCenterRatingStats(centerObjectId as Types.ObjectId);
  }

  const r = updated as any;
  return {
    id: r.id ?? r._id?.toString(),
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user
      ? {
          id: String(r.user.id ?? r.user._id),
          firstName: r.user.firstName,
          lastName: r.user.lastName ?? null,
          email: r.user.email,
          profileImage: r.user.profileImage ?? null,
        }
      : null,
    coachingCenter: r.coachingCenter
      ? {
          id: String(r.coachingCenter.id ?? r.coachingCenter._id),
          center_name: r.coachingCenter.center_name,
        }
      : null,
  };
};
