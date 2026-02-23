import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const isExcel =
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    file.originalname.endsWith('.xlsx') ||
    file.originalname.endsWith('.xls');
  if (isExcel) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only Excel files (.xlsx, .xls) are allowed') as any);
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
}).single('file');

export const uploadBatchImportFile = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size must be less than 10 MB'));
        }
        return next(new ApiError(400, err.message));
      }
      return next(err);
    }
    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded. Use field name: file'));
    }
    next();
  });
};
