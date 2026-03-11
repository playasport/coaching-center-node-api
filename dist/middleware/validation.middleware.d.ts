import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare const validate: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validation.middleware.d.ts.map