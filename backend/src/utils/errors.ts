// 定义错误类型
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

// 基础错误类
export class AppError extends Error {
  constructor(
    public message: string,
    public type: ErrorType,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      type: this.type,
      details: this.details,
    };
  }
}

// 具体错误类型
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '未登录') {
    super(message, ErrorType.AUTHENTICATION, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '没有权限') {
    super(message, ErrorType.AUTHORIZATION, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, ErrorType.NOT_FOUND, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, ErrorType.RATE_LIMIT, 429);
  }
}

export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误', details?: any) {
    super(message, ErrorType.INTERNAL, 500, details);
  }
}