import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../utils/database';
import config from '../config/app';
import { User, CreateUserDTO, UpdateUserDTO, UserProfile } from '../models/User';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

export class UserService {
  /**
   * 创建用户
   */
  async createUser(data: CreateUserDTO): Promise<UserProfile> {
    // 检查用户名和邮箱是否已存在
    const existingUser = await db.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [data.username, data.email]
    );

    if (existingUser.rows.length > 0) {
      if (existingUser.rows[0].username === data.username) {
        throw new BadRequestError('用户名已存在');
      }
      throw new BadRequestError('邮箱已被使用');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 创建用户
    const result = await db.query<User>(
      `INSERT INTO users (username, email, password, avatar, role, status)
       VALUES ($1, $2, $3, $4, 'user', 'active')
       RETURNING id, username, email, avatar, role, created_at`,
      [data.username, data.email, hashedPassword, data.avatar]
    );

    return result.rows[0];
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<{
    token: string;
    user: UserProfile;
  }> {
    // 查找用户
    const result = await db.query<User>(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const user = result.rows[0];

    // 检查用户状态
    if (user.status !== 'active') {
      throw new UnauthorizedError('账号已被禁用');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
      }
    );

    // 返回用户信息和token
    const { password: _, ...userProfile } = user;
    return { token, user: userProfile };
  }

  /**
   * 获取用户信息
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    const result = await db.query<User>(
      `SELECT id, username, email, avatar, role, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('用户不存在');
    }

    return result.rows[0];
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: number, data: UpdateUserDTO): Promise<UserProfile> {
    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email) {
      updates.push(`email = $${paramCount}`);
      values.push(data.email);
      paramCount++;
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push(`password = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }

    if (data.avatar) {
      updates.push(`avatar = $${paramCount}`);
      values.push(data.avatar);
      paramCount++;
    }

    if (data.role) {
      updates.push(`role = $${paramCount}`);
      values.push(data.role);
      paramCount++;
    }

    if (data.status) {
      updates.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new BadRequestError('没有要更新的数据');
    }

    // 执行更新
    const result = await db.query<User>(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, username, email, avatar, role, created_at`,
      [...values, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('用户不存在');
    }

    return result.rows[0];
  }

  /**
   * 更改密码
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // 查找用户
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('用户不存在');
    }

    const user = result.rows[0];

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('当前密码错误');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
  }

  /**
   * 验证 Token
   */
  verifyToken(token: string): {
    id: number;
    username: string;
    role: string;
  } {
    try {
      return jwt.verify(token, config.jwtSecret) as {
        id: number;
        username: string;
        role: string;
      };
    } catch (error) {
      throw new UnauthorizedError('无效的 token');
    }
  }
}

export const userService = new UserService();