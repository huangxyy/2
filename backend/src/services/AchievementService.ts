import { Achievement } from '../models/Achievement';
import { UserAchievement } from '../models/UserAchievement';
import { User } from '../models/User';
import { EventEmitter } from 'events';
import { redis } from '../config/database';

export const achievementEvents = new EventEmitter();

export class AchievementService {
  // 检查并更新用户成就
  async checkAchievements(userId: number, eventType: string, eventData: any) {
    const achievements = await Achievement.findAll({
      where: {
        category: eventType,
      },
    });

    for (const achievement of achievements) {
      await this.checkSingleAchievement(userId, achievement, eventData);
    }
  }

  // 检查单个成就
  private async checkSingleAchievement(
    userId: number,
    achievement: Achievement,
    eventData: any
  ) {
    const userAchievement = await UserAchievement.findOne({
      where: {
        userId,
        achievementId: achievement.id,
      },
    });

    if (userAchievement?.unlockedAt) {
      return; // 已解锁的成就不再检查
    }

    const progress = await this.calculateProgress(
      userId,
      achievement,
      eventData
    );

    if (!userAchievement) {
      await UserAchievement.create({
        userId,
        achievementId: achievement.id,
        progress,
      });
    } else {
      userAchievement.progress = progress;
      await userAchievement.save();
    }

    if (progress >= 1) {
      await this.unlockAchievement(userId, achievement.id);
    }
  }

  // 计算成就进度
  private async calculateProgress(
    userId: number,
    achievement: Achievement,
    eventData: any
  ): Promise<number> {
    const requirements = achievement.requirements;

    switch (requirements.type) {
      case 'challenge_count':
        return await this.calculateChallengeProgress(
          userId,
          requirements.count
        );
      case 'points_total':
        return await this.calculatePointsProgress(
          userId,
          requirements.points
        );
      case 'streak_days':
        return await this.calculateStreakProgress(
          userId,
          requirements.days
        );
      default:
        return 0;
    }
  }

  // 解锁成就
  private async unlockAchievement(userId: number, achievementId: number) {
    const userAchievement = await UserAchievement.findOne({
      where: {
        userId,
        achievementId,
      },
    });

    if (userAchievement && !userAchievement.unlockedAt) {
      userAchievement.unlockedAt = new Date();
      userAchievement.progress = 1;
      await userAchievement.save();

      const achievement = await Achievement.findByPk(achievementId);
      if (achievement) {
        // 更新用户积分
        await User.increment('points', {
          by: achievement.points,
          where: { id: userId },
        });

        // 发送成就解锁事件
        achievementEvents.emit('achievement_unlocked', {
          userId,
          achievement,
        });

        // 更新排行榜
        await this.updateLeaderboard(userId);
      }
    }
  }

  // 更新排行榜
  private async updateLeaderboard(userId: number) {
    const user = await User.findByPk(userId);
    if (user) {
      await redis.zadd('leaderboard', user.points, userId);
    }
  }

  // 获取用户成就
  async getUserAchievements(userId: number) {
    const achievements = await UserAchievement.findAll({
      where: { userId },
      include: [
        {
          model: Achievement,
          where: {
            isHidden: false,
          },
        },
      ],
    });

    return achievements;
  }

  // 获取用户成就进度
  async getUserProgress(userId: number) {
    const total = await Achievement.count({
      where: { isHidden: false },
    });
    const unlocked = await UserAchievement.count({
      where: {
        userId,
        unlockedAt: {
          [Op.not]: null,
        },
      },
    });

    return {
      total,
      unlocked,
      percentage: (unlocked / total) * 100,
    };
  }
}