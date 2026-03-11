import { HydratedDocument, Types } from 'mongoose';
import { VideoProcessingStatus } from './streamHighlight.model';
export declare enum ReelStatus {
    APPROVED = "approved",
    REJECTED = "rejected",
    BLOCKED = "blocked",
    PENDING = "pending"
}
export interface Reel {
    id: string;
    userId: Types.ObjectId;
    title: string;
    description?: string | null;
    sportIds: Types.ObjectId[];
    originalPath: string;
    folderPath?: string | null;
    thumbnailPath?: string | null;
    masterM3u8Url?: string | null;
    previewUrl?: string | null;
    hlsUrls?: {
        '240p'?: string;
        '360p'?: string;
        '480p'?: string;
        '720p'?: string;
        '1080p'?: string;
        [key: string]: string | undefined;
    } | null;
    status: ReelStatus;
    videoProcessingStatus: VideoProcessingStatus;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
export type ReelDocument = HydratedDocument<Reel>;
export declare const ReelModel: import("mongoose").Model<Reel, {}, {}, {}, import("mongoose").Document<unknown, {}, Reel, {}, {}> & Reel & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=reel.model.d.ts.map