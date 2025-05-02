import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/SearchService';
import { validateRequest } from '../utils/validator';

export class SearchController {
  /**
   * 搜索讨论
   */
  async searchDiscussions(req: Request, res: Response, next: NextFunction) {
    try {
      const params = await validateRequest(req.query, {
        query: { type: 'string', required: true },
        category: { type: 'string', required: false },
        author: { type: 'string', required: false },
        tags: { type: 'array', required: false },
        startDate: { type: 'date', required: false },
        endDate: { type: 'date', required: false },
        page: { type: 'number', required: false },
        pageSize: { type: 'number', required: false },
        sortField: { type: 'string', required: false },
        sortOrder: { type: 'enum', values: ['asc', 'desc'], required: false },
      });

      const result = await searchService.searchDiscussions({
        query: params.query,
        filters: {
          category: params.category,
          author: params.author,
          tags: params.tags,
          timeRange: params.startDate && params.endDate
            ? {
                start: new Date(params.startDate),
                end: new Date(params.endDate),
              }
            : undefined,
        },
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sortField
          ? {
              field: params.sortField,
              order: params.sortOrder || 'desc',
            }
          : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取搜索建议
   */
  async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, size } = await validateRequest(req.query, {
        query: { type: 'string', required: true },
        size: { type: 'number', required: false },
      });

      const suggestions = await searchService.getSuggestions(
        query,
        size
      );
      res.json(suggestions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取相关内容
   */
  async getRelatedContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, size } = await validateRequest(req.params, {
        id: { type: 'string', required: true },
        size: { type: 'number', required: false },
      });

      const related = await searchService.getRelatedContent(id, size);
      res.json(related);
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();