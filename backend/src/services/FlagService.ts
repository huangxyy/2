import crypto from 'crypto';
import { db } from '../utils/database';
import { Flag, FlagType, FlagSubmission } from '../models/Flag';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class FlagService {
  private readonly MAX_ATTEMPTS = 5;  // 最大尝试次数
  private readonly ATTEMPT_TIMEOUT = 60 * 1000;  // 尝试间隔（毫秒）

  /**
   * 创建flag
   */
  async createFlag(data: Omit<Flag, 'id' | 'createdAt'>): Promise<Flag> {
    // 如果是动态flag，验证flag格式是否包含必要的变量
    if (data.type === FlagType.DYNAMIC && !data.flag.includes('{user}')) {
      throw new ValidationError('动态flag必须包含{user}变量');
    }

    // 对flag进行加密存储
    const encryptedFlag = this.encryptFlag(data.flag);

    const result = await db.query<Flag>(
      `INSERT INTO flags (
        challenge_id, flag, type,
        points, "order", hint
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.challengeId,
        encryptedFlag,
        data.type,
        data.points,
        data.order,
        data.hint
      ]
    );

    return result.rows[0];
  }

  /**
   * 验证flag
   */
  async verifyFlag(params: {
    challengeId: number;
    userId: number;
    flagOrder: number;
    submitted: string;
  }): Promise<{
    correct: boolean;
    points: number;
    message: string;
  }> {
    const { challengeId, userId, flagOrder, submitted } = params;

    return await db.transaction(async (client) => {
      // 获取flag信息
      const flagResult = await client.query<Flag>(
        'SELECT * FROM flags WHERE challenge_id = $1 AND "order" = $2',
        [challengeId, flagOrder]
      );

      const flag = flagResult.rows[0];
      if (!flag) {
        throw new ValidationError('Flag不存在');
      }

      // 检查尝试次数和频率
      const attemptsResult = await client.query<{ count: number, last_attempt: Date }>(
        `SELECT COUNT(*) as count, MAX(created_at) as last_attempt
         FROM flag_submissions
         WHERE user_id = $1 AND flag_id = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId, flag.id]
      );

      const { count, last_attempt } = attemptsResult.rows[0];
      if (count >= this.MAX_ATTEMPTS) {
        throw new ValidationError('尝试次数过多，请稍后再试');
      }

      if (last_attempt && Date.now() - last_attempt.getTime() < this.ATTEMPT_TIMEOUT) {
        throw new ValidationError('提交过于频繁，请稍后再试');
      }

      // 验证flag
      const correct = await this.checkFlag(flag, userId, submitted);

      // 记录提交
      await client.query(
        `INSERT INTO flag_submissions (
          user_id, challenge_id, flag_id,
          submitted, correct, attempt_count
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, challengeId, flag.id, submitted, correct, count + 1]
      );

      // 如果正确，更新用户分数
      if (correct) {
        await client.query(
          `INSERT INTO user_scores (user_id, challenge_id, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, challenge_id)
           DO UPDATE SET score = user_scores.score + $3`,
          [userId, challengeId, flag.points]
        );
      }

      return {
        correct,
        points: correct ? flag.points : 0,
        message: correct ? '恭喜，flag正确！' : '抱歉，flag错误'
      };
    });
  }

  /**
   * 检查flag是否正确
   */
  private async checkFlag(flag: Flag, userId: number, submitted: string): Promise<boolean> {
    const decryptedFlag = this.decryptFlag(flag.flag);

    switch (flag.type) {
      case FlagType.STATIC:
        return submitted === decryptedFlag;

      case FlagType.DYNAMIC:
        const userFlag = decryptedFlag.replace('{user}', userId.toString());
        return submitted === userFlag;

      case FlagType.REGEX:
        const regex = new RegExp(decryptedFlag);
        return regex.test(submitted);

      default:
        throw new Error(`未支持的flag类型: ${flag.type}`);
    }
  }

  /**
   * 加密flag
   */
  private encryptFlag(flag: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.FLAG_SECRET_KEY!);
    return cipher.update(flag, 'utf8', 'hex') + cipher.final('hex');
  }

  /**
   * 解密flag
   */
  private decryptFlag(encryptedFlag: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.FLAG_SECRET_KEY!);
    return decipher.update(encryptedFlag, 'hex', 'utf8') + decipher.final('utf8');
  }

  /**
   * 获取用户提交历史
   */
  async getUserSubmissions(userId: number, challengeId: number): Promise<FlagSubmission[]> {
    const result = await db.query<FlagSubmission>(
      `SELECT fs.*, f.order, f.points
       FROM flag_submissions fs
       JOIN flags f ON fs.flag_id = f.id
       WHERE fs.user_id = $1 AND fs.challenge_id = $2
       ORDER BY fs.created_at DESC`,
      [userId, challengeId]
    );

    return result.rows;
  }

  /**
   * 获取挑战完成情况
   */
  async getChallengeProgress(challengeId: number): Promise<{
    totalFlags: number;
    totalSubmissions: number;
    successRate: number;
    averageAttempts: number;
  }> {
    const result = await db.query(
      `WITH stats AS (
         SELECT 
           COUNT(DISTINCT f.id) as total_flags,
           COUNT(DISTINCT fs.id) as total_submissions,
           AVG(CASE WHEN fs.correct THEN 1 ELSE 0 END) as success_rate,
           AVG(fs.attempt_count) as avg_attempts
         FROM flags f
         LEFT JOIN flag_submissions fs ON f.id = fs.flag_id
         WHERE f.challenge_id = $1
       )
       SELECT 
         total_flags,
         total_submissions,
         COALESCE(success_rate, 0) as success_rate,
         COALESCE(avg_attempts, 0) as average_attempts
       FROM stats`,
      [challengeId]
    );

    const stats = result.rows[0];
    return {
      totalFlags: stats.total_flags,
      totalSubmissions: stats.total_submissions,
      successRate: Math.round(stats.success_rate * 100) / 100,
      averageAttempts: Math.round(stats.average_attempts * 100) / 100
    };
  }
}

export const flagService = new FlagService();