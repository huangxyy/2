import { Request, Response } from 'express';
import { ChallengeService } from '../services/ChallengeService';
import { validateChallenge } from '../utils/validators';
import { ChallengeError, DockerError } from '../utils/errors';

export class ChallengeController {
  private challengeService: ChallengeService;

  constructor() {
    this.challengeService = new ChallengeService();
  }

  async listChallenges(req: Request, res: Response) {
    try {
      const filters = {
        category: parseInt(req.query.category as string),
        difficulty: parseInt(req.query.difficulty as string),
        status: req.query.status as string,
        page: parseInt(req.query.page as string),
        limit: parseInt(req.query.limit as string),
      };

      const result = await this.challengeService.listChallenges(filters);
      
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to list challenges',
      });
    }
  }

  async getChallenge(req: Request, res: Response) {
    try {
      const challengeId = parseInt(req.params.id);
      const userId = req.user?.id;

      const challenge = await this.challengeService.getChallenge(
        challengeId,
        userId
      );
      
      return res.json({
        success: true,
        data: challenge,
      });
    } catch (error) {
      if (error instanceof ChallengeError) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to get challenge',
      });
    }
  }

  async startChallenge(req: Request, res: Response) {
    try {
      const challengeId = parseInt(req.params.id);
      const userId = req.user!.id;

      const result = await this.challengeService.startChallenge(
        userId,
        challengeId
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof DockerError) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to start challenge',
      });
    }
  }

  async submitFlag(req: Request, res: Response) {
    try {
      const challengeId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { flag } = req.body;

      if (!flag) {
        return res.status(400).json({
          success: false,
          error: 'Flag is required',
        });
      }

      const result = await this.challengeService.submitFlag(
        userId,
        challengeId,
        flag
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ChallengeError) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to submit flag',
      });
    }
  }
}