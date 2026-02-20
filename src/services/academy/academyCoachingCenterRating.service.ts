import { Types } from 'mongoose';
import { CoachingCenterRatingModel } from '../../models/coachingCenterRating.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { recalcCoachingCenterRatingStats } from '../client/coachingCenterRating.service';
import type { RatingStatus } from '../../models/coachingCenterRating.model';
import type {
  AdminRatingListItem,
  AdminRatingsListResult,
} from '../admin/adminCoachingCenterRating.service';

export interface AcademyRatingFilters {
  status?: RatingStatus;
  coachingCenterId?: string;
  page?: number;
  limit?: number;
}

/**
 * Get coaching center ObjectIds owned by the academy user.
 */
const getAcademyCoachingCenterIds = async (
  academyUserId: string
): Promise<Types.ObjectId[]> => {
  const userObjectId = await getUserObjectId(academyUserId);
  if (!userObjectId) {
    return [];
  }
  const centers = await CoachingCenterModel.find({
    user: userObjectId,
    is_deleted: false,
  })
    .select('_id')
    .lean();
  return (centers as { _id: Types.ObjectId }[]).map((c) => c._id);
};

/**
 * Get paginated list of ratings for the academy's coaching centers only.
 */
export const getRatings = async (
  academyUserId: string,
  filters: AcademyRatingFilters = {}
): Promise<AdminRatingsListResult> => {
  const centerIds = await getAcademyCoachingCenterIds(academyUserId);
  if (centerIds.length === 0) {
    return {
      ratings: [],
      pagination: {
        page: 1,
        limit: Math.min(100, Math.max(1, filters.limit ?? 20)),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    coachingCenter: { $in: centerIds },
  };
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.coachingCenterId) {
    const isValid =
      Types.ObjectId.isValid(filters.coachingCenterId) &&
      filters.coachingCenterId.length === 24;
    const requestedId = isValid
      ? new Types.ObjectId(filters.coachingCenterId)
      : null;
    if (!requestedId || !centerIds.some((id) => id.equals(requestedId))) {
      return {
        ratings: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
    query.coachingCenter = requestedId;
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
 * Get a single rating by id. Returns null if not found or not owned by academy's centers.
 */
export const getRatingById = async (
  academyUserId: string,
  ratingId: string
): Promise<AdminRatingListItem | null> => {
  const centerIds = await getAcademyCoachingCenterIds(academyUserId);
  if (centerIds.length === 0) return null;

  if (!Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
    return null;
  }

  const rating = await CoachingCenterRatingModel.findOne({
    _id: ratingId,
    coachingCenter: { $in: centerIds },
  })
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
 * Update rating status (approved / rejected / pending). Only for ratings belonging to academy's centers.
 */
export const updateRatingStatus = async (
  academyUserId: string,
  ratingId: string,
  status: RatingStatus
): Promise<AdminRatingListItem> => {
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, t('coachingCenterRating.invalidStatus'));
  }

  const centerIds = await getAcademyCoachingCenterIds(academyUserId);
  if (centerIds.length === 0) {
    throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
  }

  if (!Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
    throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
  }

  const ratingDoc = await CoachingCenterRatingModel.findOne({
    _id: ratingId,
    coachingCenter: { $in: centerIds },
  })
    .populate('coachingCenter', '_id')
    .lean();

  if (!ratingDoc) {
    throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
  }

  const centerObjectId = (ratingDoc as any).coachingCenter?._id ?? (ratingDoc as any).coachingCenter;
  const docId = (ratingDoc as any)._id;

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
