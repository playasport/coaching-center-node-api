import { z } from 'zod';
export declare const batchCreateSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sportId: z.ZodString;
        centerId: z.ZodString;
        coach: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodArray<z.ZodEnum<{
            [x: string]: string;
        }>>;
        certificate_issued: z.ZodBoolean;
        scheduled: z.ZodObject<{
            start_date: z.ZodCoercedDate<unknown>;
            end_date: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
            start_time: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            end_time: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            individual_timings: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
                day: z.ZodEnum<{
                    monday: "monday";
                    tuesday: "tuesday";
                    wednesday: "wednesday";
                    thursday: "thursday";
                    friday: "friday";
                    saturday: "saturday";
                    sunday: "sunday";
                }>;
                start_time: z.ZodString;
                end_time: z.ZodString;
            }, z.core.$strip>>>>;
            training_days: z.ZodArray<z.ZodEnum<{
                monday: "monday";
                tuesday: "tuesday";
                wednesday: "wednesday";
                thursday: "thursday";
                friday: "friday";
                saturday: "saturday";
                sunday: "sunday";
            }>>;
        }, z.core.$strip>;
        duration: z.ZodObject<{
            count: z.ZodNumber;
            type: z.ZodEnum<{
                year: "year";
                week: "week";
                day: "day";
                month: "month";
            }>;
        }, z.core.$strip>;
        capacity: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>;
        age: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        admission_fee: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        base_price: z.ZodNumber;
        discounted_price: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        is_allowed_disabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        status: z.ZodDefault<z.ZodEnum<{
            draft: "draft";
            published: "published";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BatchCreateInput = z.infer<typeof batchCreateSchema>['body'];
export type AdminBatchCreateInput = BatchCreateInput;
export declare const batchUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sportId: z.ZodOptional<z.ZodString>;
        centerId: z.ZodOptional<z.ZodString>;
        coach: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            [x: string]: string;
        }>>>;
        certificate_issued: z.ZodOptional<z.ZodBoolean>;
        scheduled: z.ZodOptional<z.ZodObject<{
            start_date: z.ZodCoercedDate<unknown>;
            end_date: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
            start_time: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            end_time: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            individual_timings: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
                day: z.ZodEnum<{
                    monday: "monday";
                    tuesday: "tuesday";
                    wednesday: "wednesday";
                    thursday: "thursday";
                    friday: "friday";
                    saturday: "saturday";
                    sunday: "sunday";
                }>;
                start_time: z.ZodString;
                end_time: z.ZodString;
            }, z.core.$strip>>>>;
            training_days: z.ZodArray<z.ZodEnum<{
                monday: "monday";
                tuesday: "tuesday";
                wednesday: "wednesday";
                thursday: "thursday";
                friday: "friday";
                saturday: "saturday";
                sunday: "sunday";
            }>>;
        }, z.core.$strip>>;
        duration: z.ZodOptional<z.ZodObject<{
            count: z.ZodNumber;
            type: z.ZodEnum<{
                year: "year";
                week: "week";
                day: "day";
                month: "month";
            }>;
        }, z.core.$strip>>;
        capacity: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>>;
        age: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>>;
        admission_fee: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        base_price: z.ZodOptional<z.ZodNumber>;
        discounted_price: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        is_allowed_disabled: z.ZodOptional<z.ZodBoolean>;
        status: z.ZodOptional<z.ZodEnum<{
            draft: "draft";
            published: "published";
        }>>;
        is_active: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>['body'];
export type AdminBatchUpdateInput = BatchUpdateInput;
//# sourceMappingURL=batch.validation.d.ts.map