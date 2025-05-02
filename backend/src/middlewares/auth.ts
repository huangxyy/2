import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/UserService';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

/**
 * 验证用户是否已登录
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('未登录');
    }

    const token = authHeader.split(' ')[1];
    req.user = userService.verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 验证用户角色
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('未登录');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('没有权限');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 验证资源所有者
 */
export const authorizeOwner = (
  getResourceUserId: (req: Request) => Promise<number>
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('未登录');
      }

      // 管理员和版主可以操作所有资源
      if (['admin', 'moderator'].includes(req.user.role)) {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);
      if (req.user.id !== resourceUserId) {
        throw new ForbiddenError('没有权限');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};