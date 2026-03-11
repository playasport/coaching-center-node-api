import { z } from 'zod';
export declare const employeeCreateSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
        fullName: z.ZodString;
        role: z.ZodString;
        mobileNo: z.ZodString;
        email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sport: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        center: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        experience: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        workingHours: z.ZodString;
        extraHours: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        certification: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            fileUrl: z.ZodString;
        }, z.core.$strip>>>>;
        salary: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>['body'];
export declare const employeeUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        fullName: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        mobileNo: z.ZodOptional<z.ZodString>;
        email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sport: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        center: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        experience: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        workingHours: z.ZodOptional<z.ZodString>;
        extraHours: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        certification: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            fileUrl: z.ZodString;
        }, z.core.$strip>>>>;
        salary: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>['body'];
//# sourceMappingURL=employee.validation.d.ts.map