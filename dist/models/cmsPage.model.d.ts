import { HydratedDocument } from 'mongoose';
export declare enum CmsPagePlatform {
    WEB = "web",
    APP = "app",
    BOTH = "both"
}
export interface CmsPage {
    id: string;
    slug: string;
    title: string;
    content: string;
    platform: CmsPagePlatform;
    isActive: boolean;
    version: number;
    updatedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
export type CmsPageDocument = HydratedDocument<CmsPage>;
export declare const CmsPageModel: import("mongoose").Model<CmsPage, {}, {}, {}, import("mongoose").Document<unknown, {}, CmsPage, {}, {}> & CmsPage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=cmsPage.model.d.ts.map