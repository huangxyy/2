import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { db } from '../utils/database';
import config from '../config/app';
import { BadRequestError } from '../utils/errors';
import { UploadedFile, FileMetadata, UploadOptions } from '../models/File';

export class FileService {
  private static instance: FileService;
  private uploadDir: string;
  private defaultOptions: UploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    generateThumbnail: true,
    preserveExif: false,
    compress: {
      quality: 85,
      lossless: false,
    },
  };

  private constructor() {
    this.uploadDir = path.resolve(config.uploadDir);
    this.ensureUploadDir();
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 生成文件路径
   */
  private generateFilePath(hash: string, ext: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dir = path.join(this.uploadDir, String(year), month, day);
    return {
      dir,
      path: path.join(dir, `${hash}${ext}`),
    };
  }

  /**
   * 计算文件哈希
   */
  private async calculateHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256')
      .update(buffer)
      .digest('hex');
  }

  /**
   * 获取文件元数据
   */
  private async getFileMetadata(buffer: Buffer): Promise<FileMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        exif: metadata.exif,
      };
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return {};
    }
  }

  /**
   * 处理图片
   */
  private async processImage(
    buffer: Buffer,
    options: UploadOptions
  ): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    let image = sharp(buffer);
    const metadata = await image.metadata();

    // 调整大小
    if (options.resize) {
      image = image.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
        withoutEnlargement: true,
      });
    }

    // 压缩
    if (options.compress) {
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        image = image.jpeg({
          quality: options.compress.quality,
          mozjpeg: true,
        });
      } else if (metadata.format === 'png') {
        image = image.png({
          quality: options.compress.quality,
          compressionLevel: 9,
        });
      } else if (metadata.format === 'webp') {
        image = image.webp({
          quality: options.compress.quality,
          lossless: options.compress.lossless,
        });
      }
    }

    // 保留EXIF
    if (!options.preserveExif) {
      image = image.withMetadata({ exif: undefined });
    }

    const processedBuffer = await image.toBuffer();
    const processedMetadata = await this.getFileMetadata(processedBuffer);

    return {
      buffer: processedBuffer,
      metadata: processedMetadata,
    };
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(
    buffer: Buffer,
    format: string
  ): Promise<Buffer> {
    return await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .toFormat(format as keyof sharp.FormatEnum, {
        quality: 60,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId: number,
    options: UploadOptions = {}
  ): Promise<UploadedFile> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 验证文件类型
    if (
      mergedOptions.allowedTypes &&
      !mergedOptions.allowedTypes.includes(file.mimetype)
    ) {
      throw new BadRequestError('不支持的文件类型');
    }

    // 验证文件大小
    if (file.size > mergedOptions.maxSize!) {
      throw new BadRequestError(
        `文件大小不能超过 ${mergedOptions.maxSize! / 1024 / 1024}MB`
      );
    }

    return await db.transaction(async (client) => {
      // 处理图片
      const { buffer, metadata } = await this.processImage(
        file.buffer,
        mergedOptions
      );

      // 计算哈希
      const hash = await this.calculateHash(buffer);
      
      // 检查文件是否已存在
      const existingFile = await client.query<UploadedFile>(
        'SELECT * FROM files WHERE hash = $1',
        [hash]
      );

      if (existingFile.rows.length > 0) {
        return existingFile.rows[0];
      }

      // 生成文件路径
      const ext = path.extname(file.originalname);
      const { dir, path: filePath } = this.generateFilePath(hash, ext);

      // 确保目录存在
      await fs.mkdir(dir, { recursive: true });

      // 保存文件
      await fs.writeFile(filePath, buffer);

      // 生成缩略图
      let thumbnailPath: string | undefined;
      if (
        mergedOptions.generateThumbnail &&
        file.mimetype.startsWith('image/')
      ) {
        const thumbnail = await this.generateThumbnail(
          buffer,
          metadata.format || 'jpeg'
        );
        thumbnailPath = filePath.replace(ext, `_thumb${ext}`);
        await fs.writeFile(thumbnailPath, thumbnail);
      }

      // 保存记录
      const result = await client.query<UploadedFile>(
        `INSERT INTO files (
          filename,
          original_name,
          path,
          mimetype,
          size,
          width,
          height,
          uploader_id,
          hash,
          url,
          thumbnail_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          path.basename(filePath),
          file.originalname,
          filePath,
          file.mimetype,
          buffer.length,
          metadata.width,
          metadata.height,
          uploaderId,
          hash,
          `/uploads/${path.relative(this.uploadDir, filePath)}`,
          thumbnailPath
            ? `/uploads/${path.relative(this.uploadDir, thumbnailPath)}`
            : null,
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(id: number, userId: number): Promise<void> {
    return await db.transaction(async (client) => {
      const file = await client.query<UploadedFile>(
        'SELECT * FROM files WHERE id = $1',
        [id]
      );

      if (file.rows.length === 0) {
        throw new BadRequestError('文件不存在');
      }

      // 检查权限
      if (
        file.rows[0].uploaderId !== userId &&
        !['admin', 'moderator'].includes(userId.toString())
      ) {
        throw new BadRequestError('没有权限删除此文件');
      }

      // 删除物理文件
      const filePath = file.rows[0].path;
      const thumbnailPath = filePath.replace(
        path.extname(filePath),
        `_thumb${path.extname(filePath)}`
      );

      try {
        await fs.unlink(filePath);
        await fs.access(thumbnailPath);
        await fs.unlink(thumbnailPath);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }

      // 删除记录
      await client.query('DELETE FROM files WHERE id = $1', [id]);
    });
  }

  /**
   * 获取文件信息
   */
  async getFile(id: number): Promise<UploadedFile> {
    const result = await db.query<UploadedFile>(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new BadRequestError('文件不存在');
    }

    return result.rows[0];
  }
}

export const fileService = FileService.getInstance();