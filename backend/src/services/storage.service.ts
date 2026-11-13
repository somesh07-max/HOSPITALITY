import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface StorageResult {
  storedFilename: string;
  filePath: string;
  fileSize: number;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File, subDirectory?: string): Promise<StorageResult>;
  getFilePath(storedPath: string): string;
  deleteFile(storedPath: string): Promise<boolean>;
  fileExists(storedPath: string): Promise<boolean>;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIRECTORY);
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async saveFile(file: Express.Multer.File, subDirectory = ''): Promise<StorageResult> {
    const targetDir = path.join(this.baseDir, subDirectory);
    this.ensureDirectory(targetDir);

    const safeOriginal = this.sanitizeFilename(file.originalname);
    const uniquePrefix = crypto.randomBytes(16).toString('hex');
    const storedFilename = `${uniquePrefix}_${safeOriginal}`;
    const fullDestinationPath = path.join(targetDir, storedFilename);

    if (file.buffer) {
      await fs.promises.writeFile(fullDestinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, fullDestinationPath);
      await fs.promises.unlink(file.path).catch(() => {});
    } else {
      throw new AppError('No file buffer or file path provided', 400, 'INVALID_FILE_PAYLOAD');
    }

    const relativeStoredPath = path.join(subDirectory, storedFilename).replace(/\\/g, '/');

    return {
      storedFilename,
      filePath: relativeStoredPath,
      fileSize: file.size
    };
  }

  getFilePath(storedPath: string): string {
    const resolvedPath = path.resolve(this.baseDir, storedPath);
    // Path traversal security check
    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new AppError('Unauthorized directory traversal attempt', 403, 'DIRECTORY_TRAVERSAL_DETECTED');
    }
    return resolvedPath;
  }

  async fileExists(storedPath: string): Promise<boolean> {
    try {
      const fullPath = this.getFilePath(storedPath);
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(storedPath: string): Promise<boolean> {
    try {
      const fullPath = this.getFilePath(storedPath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Failed to delete file at ${storedPath}: ${error.message}`);
      return false;
    }
  }
}

export const storageService = new LocalStorageService();

