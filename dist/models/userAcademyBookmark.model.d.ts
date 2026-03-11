import { HydratedDocument, Types } from 'mongoose';
export interface UserAcademyBookmark {
    user: Types.ObjectId;
    academy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export type UserAcademyBookmarkDocument = HydratedDocument<UserAcademyBookmark>;
export declare const UserAcademyBookmarkModel: import("mongoose").Model<UserAcademyBookmark, {}, {}, {}, import("mongoose").Document<unknown, {}, UserAcademyBookmark, {}, {}> & UserAcademyBookmark & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=userAcademyBookmark.model.d.ts.map