import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { fileService } from '../services/FileService';
import { validateRequest } from '../utils/validator';
import config from '../config/app';

// Multer配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (config.allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

export class UploadController {
  /**
   * 上传单个文件
   */
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new Error('没有上传文件');
      }

      const options = await validateRequest(req.body, {
        generateThumbnail: { type: 'boolean', required: false },
        preserveExif: { type: 'boolean', required: false },
        resize: {
          type: 'object',
          required: false,
          properties: {
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            fit: {
              type: 'enum',
              values: ['cover', 'contain', 'fill', 'inside', 'outside'],
              required: false,
            },
          },
        },
        compress: {
          type: 'object',
          required: false,
          properties: {
            quality: { type: 'number', min: 1, max: 100, required: false },
            lossless: { type: 'boolean', required: false },
          },
        },
      });

      const file = await fileService.uploadFile(
        req.file,
        req.user!.id,
        options
      );
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        throw new Error('没有上传文件');
      }

      const options = await validateRequest(req.body, {
        generateThumbnail: { type: 'boolean', required: false },
        preserveExif: { type: 'boolean', required: false },
        resize: {
          type: 'object',
          required: false,
          properties: {
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            fit: {
              type: 'enum',
              values: ['cover', 'contain', 'fill', 'inside', 'outside'],
              required: false,
            },
          },
        },
        compress: {
          type: 'object',
          required: false,
          properties: {
            quality: { type: 'number', min: 1, max: 100, required: false },
            lossless: { type: 'boolean', required: false },
          },
        },
      });

      const files = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) =>
          fileService.uploadFile(file, req.user!.id, options)
        )
      );

      res.status(201).json(files);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await fileService.deleteFile(id, req.user!.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取文件信息
   */
  async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const file = await fileService.getFile(id);
      res.json(file);
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();

// 导出中间件
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);