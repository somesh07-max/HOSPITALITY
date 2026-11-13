import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(new AppError('Only PDF documents are allowed for upload', 400, 'UNSUPPORTED_FILE_TYPE'));
    return;
  }
  cb(null, true);
};

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE
  },
  fileFilter
});

