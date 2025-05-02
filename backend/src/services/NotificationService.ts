import WebSocket from 'ws';
import { Server } from 'http';
import { db } from '../utils/database';
import { cacheService } from './CacheService';
import { emailService } from './EmailService';
import config from '../config/app';

interface WebSocketClient extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private wss: WebSocket.Server;
  private clients: Map<number, Set<WebSocketClient>>;
  private pingInterval: NodeJS.Timeout;

  private constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // 保持连接活跃
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((client: WebSocketClient) => {
        if (client.isAlive === false) {
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(this.pingInterval);
    });
  }

  public static getInstance(server?: Server): NotificationService {
    if (!NotificationService.instance && server) {
      NotificationService.instance = new NotificationService(server);
    }
    return NotificationService.instance;
  }

  /**
   * 处理新连接
   */
  private handleConnection(ws: WebSocketClient, req: any) {
    const token = req.url.split('?token=')[1];
    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    try {
      // 验证token并获取用户ID
      const userId = this.verifyToken(token);
      ws.userId = userId;
      ws.isAlive = true;

      // 添加到客户端列表
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);

      // 处理ping
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // 处理关闭
      ws.on('close', () => {
        if (ws.userId) {
          const userClients = this.clients.get(ws.userId);
          if (userClients) {
            userClients.delete(ws);
            if (userClients.size === 0) {
              this.clients.delete(ws.userId);
            }
          }
        }
      });
    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  }

  /**
   * 验证token
   */
  private verifyToken(token: string): number {
    // 实现token验证逻辑
    // 返回用户ID
    return 0;
  }

  /**
   * 发送通知
   */
  async sendNotification(
    userId: number,
    type: string,
    data: any,
    options: {
      email?: boolean;
      push?: boolean;
      save?: boolean;
    } = { save: true }
  ): Promise<void> {
    const notification = {
      type,
      data,
      timestamp: new Date(),
    };

    // 发送WebSocket通知
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message = JSON.stringify(notification);
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }

    // 保存到数据库
    if (options.save) {
      await db.query(
        `INSERT INTO notifications (
          user_id, type, content, is_read
        ) VALUES ($1, $2, $3, false)`,
        [userId, type, JSON.stringify(data)]
      );

      // 更新未读计数缓存
      await cacheService.incr(`unread_notifications:${userId}`);
    }

    // 发送邮件通知
    if (options.email) {
      try {
        const user = await db.query(
          'SELECT email FROM users WHERE id = $1',
          [userId]
        );
        if (user.rows[0]?.email) {
          await emailService.sendNotificationEmail(
            user.rows[0].email,
            type,
            data
          );
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    // 发送推送通知
    if (options.push) {
      try {
        await this.sendPushNotification(userId, type, data);
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }

  /**
   * 发送推送通知
   */
  private async sendPushNotification(
    userId: number,
    type: string,
    data: any
  ): Promise<void> {
    // 实现推送通知逻辑
    // 可以使用FCM、WebPush等服务
  }

  /**
   * 获取用户通知
   */
  async getNotifications(
    userId: number,
    page = 1,
    pageSize = 20
  ) {
    return await db.paginate(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId],
      page,
      pageSize
    );
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
    await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND id = ANY($2)`,
      [userId, notificationIds]
    );

    // 更新未读计数缓存
    const unreadCount = await db.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    await cacheService.set(
      `unread_notifications:${userId}`,
      unreadCount.rows[0].count
    );
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    // 先从缓存获取
    const cached = await cacheService.get<number>(
      `unread_notifications:${userId}`
    );
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，从数据库获取
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    const count = result.rows[0].count;
    
    // 更新缓存
    await cacheService.set(
      `unread_notifications:${userId}`,
      count,
      3600
    );

    return count;
  }
}

export const notificationService = NotificationService.getInstance();