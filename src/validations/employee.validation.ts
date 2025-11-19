import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

// Certification schema
const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required').max(100, 'Certification name must be less than 100 characters'),
  fileUrl: z.string().url('Certification file URL must be a valid URL'),
});

// Employee create schema
export const employeeCreateSchema = z.object({
  body: z
    .object({
      userId: z.string().optional(), // Optional - automatically set from logged-in user, any provided value will be ignored
      fullName: z
        .string()
        .min(1, 'Full name is required')
        .max(100, 'Full name must be less than 100 characters')
        .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, 'Full name must contain only letters and spaces (no numbers or special characters)'),
      role: z.string().min(1, 'Role is required'),
      mobileNo: z
        .string()
        .min(1, 'Mobile number is required')
        .regex(/^\d+$/, 'Mobile number must contain only digits')
        .min(10, 'Mobile number must be at least 10 digits')
        .max(15, 'Mobile number must be less than 15 digits'),
      email: z.string().email('Please provide a valid email address').optional().nullable(),
      sport: z.string().optional().nullable(),
      center: z.string().optional().nullable(),
      experience: z.number().min(0, 'Experience cannot be negative').optional().nullable(),
      workingHours: z.string().min(1, 'Working hours is required').max(50, 'Working hours must be less than 50 characters'),
      extraHours: z.string().max(50, 'Extra hours must be less than 50 characters').optional().nullable(),
      certification: z.array(certificationSchema).optional().nullable(),
      salary: z.number().min(0, 'Salary cannot be negative').optional().nullable(),
    })
    .refine(
      (data) => {
        // Validate mobile number format (Indian format: 10 digits starting with 6-9)
        if (data.mobileNo && !/^[6-9]\d{9}$/.test(data.mobileNo)) {
          return false;
        }
        return true;
      },
      {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
        path: ['mobileNo'],
      }
    ),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>['body'];

// Employee update schema - all fields optional
export const employeeUpdateSchema = z.object({
  body: z
    .object({
      fullName: z
        .string()
        .min(1, 'Full name is required')
        .max(100, 'Full name must be less than 100 characters')
        .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, 'Full name must contain only letters and spaces (no numbers or special characters)')
        .optional(),
      role: z.string().min(1, 'Role is required').optional(),
      mobileNo: z
        .string()
        .min(1, 'Mobile number is required')
        .regex(/^\d+$/, 'Mobile number must contain only digits')
        .min(10, 'Mobile number must be at least 10 digits')
        .max(15, 'Mobile number must be less than 15 digits')
        .optional(),
      email: z.string().email('Please provide a valid email address').optional().nullable(),
      sport: z.string().optional().nullable(),
      center: z.string().optional().nullable(),
      experience: z.number().min(0, 'Experience cannot be negative').optional().nullable(),
      workingHours: z.string().min(1, 'Working hours is required').max(50, 'Working hours must be less than 50 characters').optional(),
      extraHours: z.string().max(50, 'Extra hours must be less than 50 characters').optional().nullable(),
      certification: z.array(certificationSchema).optional().nullable(),
      salary: z.number().min(0, 'Salary cannot be negative').optional().nullable(),
    })
    .refine(
      (data) => {
        // At least one field should be provided for update
        if (Object.keys(data).length === 0) {
          return false;
        }
        return true;
      },
      {
        message: 'At least one field is required for update',
        path: [],
      }
    )
    .refine(
      (data) => {
        // Validate mobile number format if provided
        if (data.mobileNo && !/^[6-9]\d{9}$/.test(data.mobileNo)) {
          return false;
        }
        return true;
      },
      {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
        path: ['mobileNo'],
      }
    ),
});

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>['body'];

