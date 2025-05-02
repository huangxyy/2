import { db } from '../utils/database';
import { Redis } from 'ioredis';
import { TerminalSession, SessionStatus } from '../models/TerminalSession';
import logger from '../utils/logger';

export class SessionManager {
  private redis: Redis;
  private readonly SESSION_PREFIX = 'terminal:session:';
  private readonly LOCK_PREFIX = 'terminal:lock:';
  private readonly LOCK_TTL = 30; // 锁定30秒

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  /**
   * 创建会话
   */
  async createSession(params: {
    userId: number;
    challengeId: number;
    containerId: string;
  }): Promise<TerminalSession> {
    const session: TerminalSession = {
      id: this.generateSessionId(),
      userId: params.userId,
      challengeId: params.challengeId,
      containerId: params.containerId,
      status: SessionStatus.CREATING,
      config: {
        cols: 80,
        rows: 24,
        shell: '/bin/bash'
      },
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        commandCount: 0,
        bytesTransferred: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.query(
      `INSERT INTO terminal_sessions (
        id, user_id, challenge_id, container_id,
        status, config, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.id,
        session.userId,
        session.challengeId,
        session.containerId,
        session.status,
        session.config,
        session.metadata
      ]
    );

    // 缓存会话信息
    await this.cacheSession(session);

    return session;
  }

  /**
   * 更新会话状态
   */
  async updateSession(
    sessionId: string,
    updates: Partial<TerminalSession>
  ): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${sessionId}`;
    const locked = await this.redis.set(lockKey, '1', 'NX', 'EX', this.LOCK_TTL);

    if (!locked) {
      throw new Error('会话正在被其他操作更新');
    }

    try {
      await db.query(
        `UPDATE terminal_sessions
         SET status = COALESCE($1, status),
             config = COALESCE($2, config),
             metadata = COALESCE($3, metadata)
         WHERE id = $4`,
        [
          updates.status,
          updates.config,
          updates.metadata,
          sessionId
        ]
      );

      // 更新缓存
      const session = await this.getSession(sessionId);
      if (session) {
        await this.cacheSession(session);
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * 记录命令执行
   */
  async recordCommand(params: {
    sessionId: string;
    command: string;
    output?: string;
    exitCode?: number;
  }): Promise<void> {
    await db.query(
      `INSERT INTO terminal_commands (
        session_id, command, output, exit_code
      ) VALUES ($1, $2, $3, $4)`,
      [
        params.sessionId,
        params.command,
        params.output,
        params.exitCode
      ]
    );

    // 更新会话元数据
    await this.updateSession(params.sessionId, {
      metadata: {
        lastActivity: new Date(),
        commandCount: await this.getCommandCount(params.sessionId)
      }
    });
  }

  /**
   * 获取会话信息
   */
  async getSession(sessionId: string): Promise<TerminalSession | null> {
    // 先从缓存获取
    const cached = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库获取
    const result = await db.query<TerminalSession>(
      'SELECT * FROM terminal_sessions WHERE id = $1',
      [sessionId]
    );

    const session = result.rows[0];
    if (session) {
      await this.cacheSession(session);
    }

    return session || null;
  }

  /**
   * 获取用户的活动会话
   */
  async getUserSessions(userId: number): Promise<TerminalSession[]> {
    const result = await db.query<TerminalSession>(
      `SELECT * FROM terminal_sessions
       WHERE user_id = $1
       AND status NOT IN ('terminated', 'error')
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * 获取会话命令历史
   */
  async getCommandHistory(sessionId: string): Promise<{
    command: string;
    output?: string;
    executedAt: Date;
  }[]> {
    const result = await db.query(
      `SELECT command, output, executed_at
       FROM terminal_commands
       WHERE session_id = $1
       ORDER BY executed_at DESC`,
      [sessionId]
    );

    return result.rows;
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: SessionStatus.TERMINATED
    });

    // 清除缓存
    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
  }

  /**
   * 清理过期会话
   */
  async cleanupSessions(): Promise<void> {
    const expiredSessions = await db.query<{ id: string }>(
      `SELECT id FROM terminal_sessions
       WHERE status NOT IN ('terminated', 'error')
       AND updated_at < NOW() - INTERVAL '1 hour'`
    );

    for (const session of expiredSessions.rows) {
      await this.terminateSession(session.id);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async cacheSession(session: TerminalSession): Promise<void> {
    await this.redis.set(
      `${this.SESSION_PREFIX}${session.id}`,
      JSON.stringify(session),
      'EX',
      3600 // 1小时过期
    );
  }

  private async getCommandCount(sessionId: string): Promise<number> {
    const result = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM terminal_commands WHERE session_id = $1',
      [sessionId]
    );
    return result.rows[0].count;
  }
}

export const sessionManager = new SessionManager();