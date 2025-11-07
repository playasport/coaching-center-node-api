import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required())
      .min(6, validationMessages.password.minLength()),
    coachingName: z
      .string({ message: validationMessages.coachingName.required() })
      .min(1, validationMessages.coachingName.required()),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    mobileNumber: z.string().optional(),
    contactEmail: z
      .union([
        z.string().email(validationMessages.contactEmail.invalid()),
        z.literal(''),
      ])
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    contactNumber: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required()),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

