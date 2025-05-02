import { Request, Response } from 'express';
import { TeamService } from '../services/TeamService';
import { validate } from '../middleware/validator';
import { body } from 'express-validator';
import { handleError } from '../utils/errors';

export class TeamController {
  private teamService: TeamService;

  constructor() {
    this.teamService = new TeamService();
  }

  // 创建团队
  createTeam = [
    validate([
      body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Team name must be between 2 and 100 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
      body('visibility')
        .isIn(['public', 'private', 'invite_only'])
        .withMessage('Invalid visibility option'),
      body('maxMembers')
        .optional()
        .isInt({ min: 2, max: 1000 })
        .withMessage('Max members must be between 2 and 1000'),
      body('settings')
        .optional()
        .isObject()
        .withMessage('Invalid settings format'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const team = await this.teamService.createTeam(req.user!.id, req.body);
        res.status(201).json({
          success: true,
          data: team,
        });
      } catch (error) {
        handleError(res, error);
      }
    },
  ];

  // 更新团队信息
  updateTeam = [
    validate([
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Team name must be between 2 and 100 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
      body('visibility')
        .optional()
        .isIn(['public', 'private', 'invite_only'])
        .withMessage('Invalid visibility option'),
      body('maxMembers')
        .optional()
        .isInt({ min: 2, max: 1000 })
        .withMessage('Max members must be between 2 and 1000'),
      body('settings')
        .optional()
        .isObject()
        .withMessage('Invalid settings format'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { teamId } = req.params;
        const team = await this.teamService.updateTeam(
          parseInt(teamId),
          req.user!.id,
          req.body
        );
        res.json({
          success: true,
          data: team,
        });
      } catch (error) {
        handleError(res, error);
      }
    },
  ];

  // 获取团队详情
  async getTeamDetails(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const team = await this.teamService.getTeamDetails(parseInt(teamId), req.user!.id);
      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  // 获取用户的团队列表
  async getUserTeams(req: Request, res: Response) {
    try {
      const teams = await this.teamService.getUserTeams(req.user!.id);
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      handleError(res, error);
    }
  }
}