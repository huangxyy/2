import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/UserService';
import { validateRequest } from '../utils/validator';
import { CreateUserDTO, UpdateUserDTO } from '../models/User';

export class UserController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await validateRequest<CreateUserDTO>(req.body, {
        username: { type: 'string', required: true, min: 3, max: 20 },
        email: { type: 'email', required: true },
        password: { type: 'string', required: true, min: 6 },
        avatar: { type: 'string', required: false },
      });

      const user = await userService.createUser(data);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = await validateRequest(req.body, {
        username: { type: 'string', required: true },
        password: { type: 'string', required: true },
      });

      const result = await userService.login(username, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未登录');
      }

      const user = await userService.getUserProfile(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未登录');
      }

      const data = await validateRequest<UpdateUserDTO>(req.body, {
        email: { type: 'email', required: false },
        avatar: { type: 'string', required: false },
        role: { type: 'enum', values: ['user', 'moderator', 'admin'], required: false },
        status: { type: 'enum', values: ['active', 'inactive', 'banned'], required: false },
      });

      const user = await userService.updateUser(req.user.id, data);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未登录');
      }

      const { currentPassword, newPassword } = await validateRequest(req.body, {
        currentPassword: { type: 'string', required: true },
        newPassword: { type: 'string', required: true, min: 6 },
      });

      await userService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      res.json({ message: '密码修改成功' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();