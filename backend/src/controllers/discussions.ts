import { Request, Response, NextFunction } from 'express';
import { discussionService } from '../services/DiscussionService';
import { validateRequest } from '../utils/validator';
import {
  CreateDiscussionDTO,
  UpdateDiscussionDTO,
  CreateReplyDTO,
  UpdateReplyDTO,
  CreateDraftDTO,
  UpdateDraftDTO,
  DiscussionFilters,
} from '../models/Discussion';

export class DiscussionController {
  /**
   * 获取讨论列表
   */
  async getDiscussions(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: DiscussionFilters = {
        category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
        author_id: req.query.author_id ? parseInt(req.query.author_id as string) : undefined,
        status: req.query.status as any,
        is_pinned: req.query.is_pinned === 'true',
        tag: req.query.tag as string,
        search: req.query.search as string,
        sort: req.query.sort as any,
      };

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      const discussions = await discussionService.getDiscussions(
        filters,
        page,
        pageSize,
        req.user?.id
      );

      res.json(discussions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取讨论详情
   */
  async getDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const discussion = await discussionService.getDiscussion(
        id,
        req.user?.id
      );
      res.json(discussion);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建讨论
   */
  async createDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await validateRequest<CreateDiscussionDTO>(req.body, {
        title: { type: 'string', required: true, min: 5, max: 200 },
        content: { type: 'string', required: true, min: 20 },
        category_id: { type: 'number', required: false },
        tags: { type: 'array', required: false },
        is_pinned: { type: 'boolean', required: false },
      });

      const discussion = await discussionService.createDiscussion(
        req.user!.id,
        data
      );
      res.status(201).json(discussion);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新讨论
   */
  async updateDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const data = await validateRequest<UpdateDiscussionDTO>(req.body, {
        title: { type: 'string', required: false, min: 5, max: 200 },
        content: { type: 'string', required: false, min: 20 },
        category_id: { type: 'number', required: false },
        tags: { type: 'array', required: false },
        status: { type: 'enum', values: ['open', 'closed', 'locked'], required: false },
        is_pinned: { type: 'boolean', required: false },
      });

      const discussion = await discussionService.updateDiscussion(
        id,
        req.user!.id,
        data
      );
      res.json(discussion);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除讨论
   */
  async deleteDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await discussionService.deleteDiscussion(id, req.user!.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取讨论回复
   */
  async getReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const discussionId = parseInt(req.params.id);
      const parentId = req.query.parent_id
        ? parseInt(req.query.parent_id as string)
        : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      const replies = await discussionService.getReplies(
        discussionId,
        req.user?.id,
        parentId,
        page,
        pageSize
      );
      res.json(replies);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建回复
   */
  async createReply(req: Request, res: Response, next: NextFunction) {
    try {
      const discussionId = parseInt(req.params.id);
      const data = await validateRequest<CreateReplyDTO>(req.body, {
        content: { type: 'string', required: true, min: 1 },
        parent_id: { type: 'number', required: false },
      });

      const reply = await discussionService.createReply(
        discussionId,
        req.user!.id,
        data
      );
      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新回复
   */
  async updateReply(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.replyId);
      const data = await validateRequest<UpdateReplyDTO>(req.body, {
        content: { type: 'string', required: true, min: 1 },
      });

      const reply = await discussionService.updateReply(
        id,
        req.user!.id,
        data
      );
      res.json(reply);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除回复
   */
  async deleteReply(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.replyId);
      await discussionService.deleteReply(id, req.user!.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 标记最佳答案
   */
  async markSolution(req: Request, res: Response, next: NextFunction) {
    try {
      const discussionId = parseInt(req.params.id);
      const replyId = parseInt(req.params.replyId);
      await discussionService.markSolution(
        discussionId,
        replyId,
        req.user!.id
      );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 点赞/取消点赞
   */
  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, id } = await validateRequest(req.params, {
        type: { type: 'enum', values: ['discussion', 'reply'], required: true },
        id: { type: 'number', required: true },
      });

      const isLiked = await discussionService.toggleLike(
        req.user!.id,
        type,
        parseInt(id)
      );
      res.json({ liked: isLiked });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 收藏/取消收藏
   */
  async toggleCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const isCollected = await discussionService.toggleCollection(
        req.user!.id,
        id
      );
      res.json({ collected: isCollected });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取草稿列表
   */
  async getDrafts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      const drafts = await discussionService.getDrafts(
        req.user!.id,
        page,
        pageSize
      );
      res.json(drafts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取草稿详情
   */
  async getDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const draft = await discussionService.getDraft(id, req.user!.id);
      res.json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await validateRequest<CreateDraftDTO>(req.body, {
        title: { type: 'string', required: false },
        content: { type: 'string', required: true },
        category_id: { type: 'number', required: false },
      });

      const draft = await discussionService.saveDraft(req.user!.id, data);
      res.status(201).json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新草稿
   */
  async updateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const data = await validateRequest<UpdateDraftDTO>(req.body, {
        title: { type: 'string', required: false },
        content: { type: 'string', required: false },
        category_id: { type: 'number', required: false },
      });

      const draft = await discussionService.updateDraft(
        id,
        req.user!.id,
        data
      );
      res.json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除草稿
   */
  async deleteDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await discussionService.deleteDraft(id, req.user!.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

export const discussionController = new DiscussionController();