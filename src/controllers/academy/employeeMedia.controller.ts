import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as mediaService from '../../services/academy/employeeMedia.service';

/**
 * Upload certification documents
 */
export const uploadCertifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: any = {};

    // Upload certifications if provided
    if (files.certifications && files.certifications.length > 0) {
      const certificationUrls = await mediaService.uploadMultipleCertificationFiles(
        files.certifications
      );
      result.certifications = {
        urls: certificationUrls,
        count: certificationUrls.length,
        type: 'certification',
      };
    }

    // Check if at least one file was uploaded
    if (Object.keys(result).length === 0) {
      throw new ApiError(400, t('employee.media.fileRequired'));
    }

    const response = new ApiResponse(
      200,
      result,
      t('employee.media.uploadSuccess')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

