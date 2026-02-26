import { Types } from 'mongoose';
import { UserAcademyBookmarkModel } from '../../models/userAcademyBookmark.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import type { AcademyListItem } from './academy.service';

/**
 * Resolve academy identifier (UUID or ObjectId) to CoachingCenter document and ObjectId
 */
async function resolveAcademy(
  academyId: string
): Promise<{ _id: Types.ObjectId; id: string } | null> {
  if (!academyId || typeof academyId !== 'string') return null;

  // Try by CoachingCenter id (UUID) first
  let doc = await CoachingCenterModel.findOne({
    id: academyId.trim(),
    status: CoachingCenterStatus.PUBLISHED,
    is_active: true,
    approval_status: 'approved',
    is_deleted: false,
  })
    .select('_id id')
    .lean();

  if (doc) {
    return { _id: doc._id, id: doc.id };
  }

  // Try by ObjectId
  if (Types.ObjectId.isValid(academyId) && academyId.length === 24) {
    doc = await CoachingCenterModel.findOne({
      _id: new Types.ObjectId(academyId),
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      approval_status: 'approved',
      is_deleted: false,
    })
      .select('_id id')
      .lean();
  }

  return doc ? { _id: doc._id, id: doc.id } : null;
}

/**
 * Map a populated CoachingCenter document to AcademyListItem
 */
function mapToAcademyListItem(academy: any): AcademyListItem {
  let image: string | null = null;
  if (academy.sport_details && Array.isArray(academy.sport_details)) {
    for (const sportDetail of academy.sport_details) {
      if (sportDetail.images && Array.isArray(sportDetail.images)) {
        const sortedImages = [...sportDetail.images].sort((a: any, b: any) => {
          if (a.is_banner && !b.is_banner) return -1;
          if (!a.is_banner && b.is_banner) return 1;
          return 0;
        });
        const activeImage = sortedImages.find(
          (img: any) => img.is_active && !img.is_deleted && img.url
        );
        if (activeImage) {
          image = activeImage.url;
          break;
        }
      }
    }
  }

  return {
    id: academy.id || academy._id?.toString(),
    center_name: academy.center_name,
    logo: academy.logo ?? null,
    image: image,
    location: academy.location,
    sports: (academy.sports || []).map((sport: any) => ({
      id: sport.custom_id || sport._id?.toString(),
      name: sport.name,
      logo: sport.logo ?? null,
      is_popular: sport.is_popular ?? false,
    })),
    allowed_genders: academy.allowed_genders || [],
    age: academy.age ? { min: academy.age.min, max: academy.age.max } : undefined,
    allowed_disabled: academy.allowed_disabled === true,
    is_only_for_disabled: academy.is_only_for_disabled === true,
    distance: academy.distance,
    averageRating: (academy as any).averageRating ?? 0,
    totalRatings: (academy as any).totalRatings ?? 0,
  };
}

/**
 * Fetch bookmarked academies for a user and return as AcademyListItem[]
 */
export async function getBookmarkedAcademies(userId: string): Promise<AcademyListItem[]> {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(401, t('auth.authorization.unauthorized'));
  }

  const bookmarks = await UserAcademyBookmarkModel.find({ user: userObjectId })
    .sort({ createdAt: -1 })
    .select('academy')
    .lean();

  if (bookmarks.length === 0) {
    return [];
  }

  const academyIds = bookmarks
    .map((b) => b.academy)
    .filter((id): id is Types.ObjectId => id != null);

  const academies = await CoachingCenterModel.find({
    _id: { $in: academyIds },
    status: CoachingCenterStatus.PUBLISHED,
    is_active: true,
    approval_status: 'approved',
    is_deleted: false,
  })
    .populate('sports', 'custom_id name logo is_popular')
    .select(
      'id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings'
    )
    .lean();

  // Preserve bookmark order (most recent first) and filter out deleted/inactive academies
  const academyMap = new Map(
    academies.map((a: any) => [a._id.toString(), a])
  );

  const ordered: AcademyListItem[] = [];
  for (const oid of academyIds) {
    const key = oid.toString();
    const academy = academyMap.get(key);
    if (academy) {
      ordered.push(mapToAcademyListItem(academy));
    }
  }

  return ordered;
}

/**
 * Add academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export async function addBookmark(
  userId: string,
  academyId: string
): Promise<{ bookmarks: AcademyListItem[]; added: boolean }> {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(401, t('auth.authorization.unauthorized'));
  }

  const resolved = await resolveAcademy(academyId);
  if (!resolved) {
    throw new ApiError(404, t('academy.getById.notFound'));
  }

  const existing = await UserAcademyBookmarkModel.findOne({
    user: userObjectId,
    academy: resolved._id,
  });

  if (existing) {
    // Already bookmarked - return current list
    const bookmarks = await getBookmarkedAcademies(userId);
    return { bookmarks, added: false };
  }

  await UserAcademyBookmarkModel.create({
    user: userObjectId,
    academy: resolved._id,
  });

  const bookmarks = await getBookmarkedAcademies(userId);
  return { bookmarks, added: true };
}

/**
 * Remove academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export async function removeBookmark(
  userId: string,
  academyId: string
): Promise<{ bookmarks: AcademyListItem[]; removed: boolean }> {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(401, t('auth.authorization.unauthorized'));
  }

  const resolved = await resolveAcademy(academyId);
  if (!resolved) {
    // Academy not found - try by raw ObjectId in case user stored deleted academy
    let deleted = null;
    if (Types.ObjectId.isValid(academyId) && academyId.length === 24) {
      deleted = await UserAcademyBookmarkModel.findOneAndDelete({
        user: userObjectId,
        academy: new Types.ObjectId(academyId),
      });
    }
    const bookmarks = await getBookmarkedAcademies(userId);
    return { bookmarks, removed: !!deleted };
  }

  const deleted = await UserAcademyBookmarkModel.findOneAndDelete({
    user: userObjectId,
    academy: resolved._id,
  });

  const bookmarks = await getBookmarkedAcademies(userId);
  return { bookmarks, removed: !!deleted };
}

/**
 * Toggle academy bookmark for user. Returns updated list of bookmarked academies (populated).
 */
export async function toggleBookmark(
  userId: string,
  academyId: string
): Promise<{ bookmarks: AcademyListItem[]; isBookmarked: boolean }> {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(401, t('auth.authorization.unauthorized'));
  }

  const resolved = await resolveAcademy(academyId);
  if (!resolved) {
    throw new ApiError(404, t('academy.getById.notFound'));
  }

  const existing = await UserAcademyBookmarkModel.findOne({
    user: userObjectId,
    academy: resolved._id,
  });

  if (existing) {
    await UserAcademyBookmarkModel.deleteOne({ _id: existing._id });
    const bookmarks = await getBookmarkedAcademies(userId);
    return { bookmarks, isBookmarked: false };
  }

  await UserAcademyBookmarkModel.create({
    user: userObjectId,
    academy: resolved._id,
  });
  const bookmarks = await getBookmarkedAcademies(userId);
  return { bookmarks, isBookmarked: true };
}
