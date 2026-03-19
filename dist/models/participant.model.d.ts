import { HydratedDocument, Types } from 'mongoose';
import { Address } from './address.model';
import { Gender } from '../enums/gender.enum';
export interface Participant {
    userId: Types.ObjectId;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    gender?: Gender | null;
    disability: number;
    dob?: Date | null;
    schoolName?: string | null;
    contactNumber?: string | null;
    profilePhoto?: string | null;
    address?: Address | null;
    isSelf?: string | null;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type ParticipantDocument = HydratedDocument<Participant>;
export declare const ParticipantModel: import("mongoose").Model<Participant, {}, {}, {}, import("mongoose").Document<unknown, {}, Participant, {}, {}> & Participant & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=participant.model.d.ts.map