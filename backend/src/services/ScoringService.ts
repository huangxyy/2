import { db } from '../utils/database';
import { ScoreRule, UserScore, UserProgress } from '../models/Score';
import { Challenge } from '../models/Challenge';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class ScoringService {
  /**
   * 计算挑战得分
   */
  async calculateScore(params: {
    challengeId: number;
    userId: number;
    completionTime: number;
    attempts: number;
  }): Promise<number> {
    const { challengeId, userId, completionTime, attempts } = params;

    return await db.transaction(async (client) => {
      // 获取评分规则
      const ruleResult = await client.query<ScoreRule>(
        'SELECT * FROM score_rules WHERE challenge_id = $1',
        [challengeId]
      );

      if (!ruleResult.rows[0]) {
        throw new ValidationError('评分规则不存在');
      }

      const rule = ruleResult.rows[0];

      // 获取挑战信息
      const challengeResult = await client.query<Challenge>(
        'SELECT * FROM challenges WHERE id = $1',
        [challengeId]
      );

      const challenge = challengeResult.rows[0];

      // 计算基础分数
      let score = rule.baseScore;

      // 应用难度系数
      score *= rule.difficultyMultiplier[challenge.difficulty];

      // 计算时间加成
      if (completionTime <= rule.timeBonus.threshold) {
        score += rule.timeBonus.bonus;
      }

      // 扣除尝试次数惩罚
      score -= (attempts - 1) * rule.attemptPenalty;

      // 检查是否首次完成
      const firstBloodCheck = await client.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_scores WHERE challenge_id = $1',
        [challengeId]
      );

      const isFirstBlood = firstBloodCheck.rows[0].count === 0;
      if (isFirstBlood) {
        score += rule.firstBloodBonus;
      }

      // 确保分数不为负
      score = Math.max(0, score);

      // 记录得分
      await client.query(
        `INSERT INTO user_scores (
          user_id, challenge_id, score,
          completion_time, attempts, is_first_blood
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, challengeId, score, completionTime, attempts, isFirstBlood]
      );

      return score;
    });
  }

  /**
   * 获取用户进度
   */
  async getUserProgress(userId: number): Promise<UserProgress> {
    const result = await db.query<UserProgress>(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || {
      userId,
      totalScore: 0,
      completedChallenges: 0,
      ranking: null,
      lastActive: new Date()
    };
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(limit: number = 10): Promise<UserProgress[]> {
    const result = await db.query<UserProgress>(
      `SELECT up.*, u.username
       FROM user_progress up
       JOIN users u ON up.user_id = u.id
       ORDER BY total_score DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * 获取挑战统计信息
   */
  async getChallengeStats(challengeId: number): Promise<{
    totalAttempts: number;
    averageScore: number;
    completionRate: number;
    fastestCompletion: number;
  }> {
    const result = await db.query(
      `SELECT 
        COUNT(DISTINCT user_id) as unique_attempts,
        AVG(score) as average_score,
        MIN(completion_time) as fastest_completion,
        (
          SELECT COUNT(*)::float / 
            (SELECT COUNT(DISTINCT user_id) FROM submissions WHERE challenge_id = $1)
          FROM user_scores 
          WHERE challenge_id = $1
        ) as completion_rate
       FROM user_scores
       WHERE challenge_id = $1
       GROUP BY challenge_id`,
      [challengeId]
    );

    const stats = result.rows[0] || {
      unique_attempts: 0,
      average_score: 0,
      fastest_completion: null,
      completion_rate: 0
    };

    return {
      totalAttempts: stats.unique_attempts,
      averageScore: Math.round(stats.average_score * 100) / 100,
      completionRate: Math.round(stats.completion_rate * 100) / 100,
      fastestCompletion: stats.fastest_completion
    };
  }
}

export const scoringService = new ScoringService();