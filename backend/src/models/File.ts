export interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
  uploaderId: number;
  hash: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  format?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: any;
}

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  preserveExif?: boolean;
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  compress?: {
    quality?: number;
    lossless?: boolean;
  };
}