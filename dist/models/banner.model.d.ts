import { HydratedDocument } from 'mongoose';
export declare enum BannerPosition {
    HOMEPAGE_TOP = "homepage_top",
    HOMEPAGE_MIDDLE = "homepage_middle",
    HOMEPAGE_BOTTOM = "homepage_bottom",
    CATEGORY_TOP = "category_top",
    CATEGORY_SIDEBAR = "category_sidebar",
    SPORT_PAGE = "sport_page",
    CENTER_PAGE = "center_page",
    SEARCH_RESULTS = "search_results",
    MOBILE_APP_HOME = "mobile_app_home",
    MOBILE_APP_CATEGORY = "mobile_app_category"
}
export declare enum BannerStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SCHEDULED = "scheduled",
    EXPIRED = "expired",
    DRAFT = "draft"
}
export declare enum BannerTargetAudience {
    ALL = "all",
    NEW_USERS = "new_users",
    EXISTING_USERS = "existing_users",
    PREMIUM_USERS = "premium_users",
    MOBILE_USERS = "mobile_users",
    WEB_USERS = "web_users"
}
export interface Banner {
    id: string;
    title: string;
    description?: string | null;
    imageUrl: string;
    mobileImageUrl?: string | null;
    linkUrl?: string | null;
    linkType?: 'internal' | 'external' | null;
    position: BannerPosition;
    priority: number;
    status: BannerStatus;
    targetAudience: BannerTargetAudience;
    isActive: boolean;
    isOnlyForAcademy: boolean;
    clickCount: number;
    viewCount: number;
    sportIds?: string[] | null;
    centerIds?: string[] | null;
    metadata?: Record<string, any> | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
export type BannerDocument = HydratedDocument<Banner>;
export declare const BannerModel: import("mongoose").Model<Banner, {}, {}, {}, import("mongoose").Document<unknown, {}, Banner, {}, {}> & Banner & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=banner.model.d.ts.map