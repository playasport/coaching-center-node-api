import { HydratedDocument } from 'mongoose';
import { FeeType } from '../enums/feeType.enum';
import { FormFieldType } from '../enums/formFieldType.enum';
export { FeeType };
export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{
        value: string | number;
        label: string;
    }>;
    fields?: FormField[];
    description?: string;
}
export interface FeeTypeConfig {
    fee_type: FeeType;
    label: string;
    description: string;
    formFields: FormField[];
    validationRules?: Record<string, any>;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type FeeTypeConfigDocument = HydratedDocument<FeeTypeConfig>;
export declare const FeeTypeConfigModel: import("mongoose").Model<FeeTypeConfig, {}, {}, {}, import("mongoose").Document<unknown, {}, FeeTypeConfig, {}, {}> & FeeTypeConfig & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=feeTypeConfig.model.d.ts.map