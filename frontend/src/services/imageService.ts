import axios from 'axios';

export interface UploadedImage {
  url: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  mimetype: string;
  hash: string;
}

export interface ImageUploadOptions {
  maxSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的文件类型
  width?: number; // 目标宽度
  height?: number; // 目标高度
  quality?: number; // 压缩质量 (1-100)
  preserveExif?: boolean; // 是否保留 EXIF 数据
}

export class ImageService {
  private static instance: ImageService;
  private baseUrl: string;
  private defaultOptions: ImageUploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    quality: 90,
    preserveExif: false,
  };

  private constructor() {
    this.baseUrl = process.env.VUE_APP_API_URL || '/api';
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  /**
   * 上传图片
   */
  async upload(
    file: File | Blob,
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 验证文件类型
    if (
      file instanceof File &&
      mergedOptions.allowedTypes &&
      !mergedOptions.allowedTypes.includes(file.type)
    ) {
      throw new Error('不支持的文件类型');
    }

    // 验证文件大小
    if (
      mergedOptions.maxSize &&
      file.size > mergedOptions.maxSize
    ) {
      throw new Error(`文件大小不能超过 ${mergedOptions.maxSize / 1024 / 1024}MB`);
    }

    // 如果需要处理图片（压缩/调整大小），先进行处理
    const processedFile = await this.processImage(file, mergedOptions);

    // 准备上传
    const formData = new FormData();
    formData.append('image', processedFile);
    
    // 添加选项参数
    Object.entries(mergedOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    try {
      const { data } = await axios.post<UploadedImage>(
        `${this.baseUrl}/upload/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '上传失败');
    }
  }

  /**
   * 从剪贴板上传图片
   */
  async uploadFromClipboard(items: DataTransferItemList): Promise<UploadedImage | null> {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          return await this.upload(file);
        }
      }
    }
    return null;
  }

  /**
   * 处理图片（压缩/调整大小）
   */
  private async processImage(
    file: File | Blob,
    options: ImageUploadOptions
  ): Promise<Blob> {
    if (!options.width && !options.height && !options.quality) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 计算新尺寸
        if (options.width && options.height) {
          // 固定尺寸
          width = options.width;
          height = options.height;
        } else if (options.width) {
          // 按宽度缩放
          height = (height * options.width) / width;
          width = options.width;
        } else if (options.height) {
          // 按高度缩放
          width = (width * options.height) / height;
          height = options.height;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas 上下文'));
          return;
        }

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('图片处理失败'));
            }
          },
          file.type,
          options.quality ? options.quality / 100 : undefined
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(url: string): Promise<{
    width: number;
    height: number;
    size: number;
    type: string;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: 0, // 需要通过 HEAD 请求获取
          type: '', // 需要通过 HEAD 请求获取
        });
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  }
}

export const imageService = ImageService.getInstance();