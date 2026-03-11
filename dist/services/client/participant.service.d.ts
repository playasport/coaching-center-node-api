import { Participant } from '../../models/participant.model';
import type { ParticipantCreateInput, ParticipantUpdateInput } from '../../validations/participant.validation';
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare const createParticipant: (data: ParticipantCreateInput, userId: string, file?: Express.Multer.File) => Promise<Participant>;
export declare const getParticipantById: (id: string, userId: string) => Promise<Participant | null>;
export declare const getParticipantsByUser: (userId: string, page?: number, limit?: number) => Promise<PaginatedResult<Participant>>;
export declare const updateParticipant: (id: string, data: ParticipantUpdateInput, userId: string, file?: Express.Multer.File) => Promise<Participant | null>;
export declare const deleteParticipant: (id: string, userId: string) => Promise<void>;
//# sourceMappingURL=participant.service.d.ts.map