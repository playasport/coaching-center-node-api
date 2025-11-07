import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { t } from '../utils/i18n';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: t('validation.failed'),
          errors,
        });
        return;
      }

      next(error);
    }
  };
};
