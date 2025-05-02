import { Request, Response } from 'express';
import { AchievementService } from '../services/AchievementService';

export class AchievementController {
  private achievementService: AchievementService;

  constructor() {
    this.achievementService = new AchievementService();
  }

  // 获取用户成就列表
  async getUserAchievements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const achievements = await this.achievementService.getUserAchievements(userId);
      res.json({ data: achievements });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  }

  // 获取用户成就进度
  async getUserProgress(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const progress = await this.achievementService.getUserProgress(userId);
      res.json({ data: progress });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }
}