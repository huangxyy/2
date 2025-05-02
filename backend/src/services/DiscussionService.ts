import { db } from '../utils/database';
import {
  Discussion,
  DiscussionWithRelations,
  CreateDiscussionDTO,
  UpdateDiscussionDTO,
  DiscussionFilters,
  DiscussionReply,
  DiscussionReplyWithRelations,
  CreateReplyDTO,
  UpdateReplyDTO,
  DiscussionDraft,
  CreateDraftDTO,
  UpdateDraftDTO,
} from '../models/Discussion';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export class DiscussionService {
  /**
   * 获取讨论列表
   */
  async getDiscussions(
    filters: DiscussionFilters,
    page = 1,
    pageSize = 20,
    userId?: number
  ) {
    let sql = `
      SELECT 
        d.*,
        u.username as author_username,
        u.avatar as author_avatar,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        c.icon as category_icon,
        lu.username as last_reply_username,
        lu.avatar as last_reply_avatar,
        ARRAY_AGG(DISTINCT t.name) as tags,
        ${userId ? `
          EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND target_type = 'discussion' AND target_id = d.id) as is_liked,
          EXISTS(SELECT 1 FROM collections WHERE user_id = $1 AND discussion_id = d.id) as is_collected
        ` : 'false as is_liked, false as is_collected'}
      FROM discussions d
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN users lu ON d.last_reply_user_id = lu.id
      LEFT JOIN discussion_categories c ON d.category_id = c.id
      LEFT JOIN discussion_tag_relations tr ON d.id = tr.discussion_id
      LEFT JOIN discussion_tags t ON tr.tag_id = t.id
      WHERE 1 = 1
    `;

    const params: any[] = userId ? [userId] : [];
    let paramCount = params.length + 1;

    // 应用过滤条件
    if (filters.category_id) {
      sql += ` AND d.category_id = $${paramCount++}`;
      params.push(filters.category_id);
    }

    if (filters.author_id) {
      sql += ` AND d.author_id = $${paramCount++}`;
      params.push(filters.author_id);
    }

    if (filters.status) {
      sql += ` AND d.status = $${paramCount++}`;
      params.push(filters.status);
    }

    if (filters.is_pinned !== undefined) {
      sql += ` AND d.is_pinned = $${paramCount++}`;
      params.push(filters.is_pinned);
    }

    if (filters.tag) {
      sql += ` AND EXISTS (
        SELECT 1 FROM discussion_tag_relations tr
        JOIN discussion_tags t ON tr.tag_id = t.id
        WHERE tr.discussion_id = d.id AND t.name = $${paramCount++}
      )`;
      params.push(filters.tag);
    }

    if (filters.search) {
      sql += ` AND (
        d.title ILIKE $${paramCount} OR
        d.content ILIKE $${paramCount}
      )`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    // 分组
    sql += ` GROUP BY d.id, u.id, c.id, lu.id`;

    // 排序
    switch (filters.sort) {
      case 'popular':
        sql += ` ORDER BY d.is_pinned DESC, d.views DESC, d.created_at DESC`;
        break;
      case 'unanswered':
        sql += ` ORDER BY d.is_pinned DESC, d.replies_count ASC, d.created_at DESC`;
        break;
      default:
        sql += ` ORDER BY d.is_pinned DESC, d.created_at DESC`;
    }

    // 执行分页查询
    const result = await db.paginate<DiscussionWithRelations>(
      sql,
      params,
      page,
      pageSize
    );

    // 处理返回数据
    result.items = result.items.map(item => ({
      ...item,
      tags: item.tags.filter(Boolean), // 移除空值
      is_liked: !!item.is_liked,
      is_collected: !!item.is_collected,
    }));

    return result;
  }

  /**
   * 获取讨论详情
   */
  async getDiscussion(id: number, userId?: number): Promise<DiscussionWithRelations> {
    const sql = `
      SELECT 
        d.*,
        u.username as author_username,
        u.avatar as author_avatar,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        c.icon as category_icon,
        lu.username as last_reply_username,
        lu.avatar as last_reply_avatar,
        ARRAY_AGG(DISTINCT t.name) as tags,
        ${userId ? `
          EXISTS(SELECT 1 FROM likes WHERE user_id = $2 AND target_type = 'discussion' AND target_id = d.id) as is_liked,
          EXISTS(SELECT 1 FROM collections WHERE user_id = $2 AND discussion_id = d.id) as is_collected
        ` : 'false as is_liked, false as is_collected'}
      FROM discussions d
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN users lu ON d.last_reply_user_id = lu.id
      LEFT JOIN discussion_categories c ON d.category_id = c.id
      LEFT JOIN discussion_tag_relations tr ON d.id = tr.discussion_id
      LEFT JOIN discussion_tags t ON tr.tag_id = t.id
      WHERE d.id = $1
      GROUP BY d.id, u.id, c.id, lu.id
    `;

    const result = await db.query<DiscussionWithRelations>(
      sql,
      userId ? [id, userId] : [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('讨论不存在');
    }

    const discussion = result.rows[0];
    discussion.tags = discussion.tags.filter(Boolean);
    discussion.is_liked = !!discussion.is_liked;
    discussion.is_collected = !!discussion.is_collected;

    // 增加浏览量
    await db.query(
      'UPDATE discussions SET views = views + 1 WHERE id = $1',
      [id]
    );

    return discussion;
  }

  /**
   * 创建讨论
   */
  async createDiscussion(
    authorId: number,
    data: CreateDiscussionDTO
  ): Promise<DiscussionWithRelations> {
    return await db.transaction(async (client) => {
      // 创建讨论
      const result = await client.query<Discussion>(
        `INSERT INTO discussions (
          title, content, author_id, category_id, is_pinned
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          data.title,
          data.content,
          authorId,
          data.category_id || null,
          data.is_pinned || false,
        ]
      );

      const discussion = result.rows[0];

      // 添加标签
      if (data.tags && data.tags.length > 0) {
        // 获取或创建标签
        const tagIds = await Promise.all(
          data.tags.map(async (tagName) => {
            const tagResult = await client.query(
              `INSERT INTO discussion_tags (name)
               VALUES ($1)
               ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [tagName]
            );
            return tagResult.rows[0].id;
          })
        );

        // 关联标签
        await Promise.all(
          tagIds.map((tagId) =>
            client.query(
              `INSERT INTO discussion_tag_relations (discussion_id, tag_id)
               VALUES ($1, $2)`,
              [discussion.id, tagId]
            )
          )
        );
      }

      // 返回完整的讨论信息
      return await this.getDiscussion(discussion.id, authorId);
    });
  }

  /**
   * 更新讨论
   */
  async updateDiscussion(
    id: number,
    userId: number,
    data: UpdateDiscussionDTO
  ): Promise<DiscussionWithRelations> {
    return await db.transaction(async (client) => {
      // 检查讨论是否存在
      const discussion = await this.getDiscussion(id);

      // 检查权限
      if (
        discussion.author_id !== userId &&
        !['admin', 'moderator'].includes(discussion.author.role)
      ) {
        throw new ForbiddenError('没有权限修改此讨论');
      }

      // 更新讨论
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(data.title);
        paramCount++;
      }

      if (data.content !== undefined) {
        updates.push(`content = $${paramCount}`);
        values.push(data.content);
        paramCount++;
      }

      if (data.category_id !== undefined) {
        updates.push(`category_id = $${paramCount}`);
        values.push(data.category_id);
        paramCount++;
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(data.status);
        paramCount++;
      }

      if (data.is_pinned !== undefined) {
        updates.push(`is_pinned = $${paramCount}`);
        values.push(data.is_pinned);
        paramCount++;
      }

      if (updates.length > 0) {
        await client.query(
          `UPDATE discussions
           SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramCount}`,
          [...values, id]
        );
      }

      // 更新标签
      if (data.tags !== undefined) {
        // 删除现有标签关联
        await client.query(
          'DELETE FROM discussion_tag_relations WHERE discussion_id = $1',
          [id]
        );

        if (data.tags.length > 0) {
          // 获取或创建新标签
          const tagIds = await Promise.all(
            data.tags.map(async (tagName) => {
              const tagResult = await client.query(
                `INSERT INTO discussion_tags (name)
                 VALUES ($1)
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [tagName]
              );
              return tagResult.rows[0].id;
            })
          );

          // 创建新的标签关联
          await Promise.all(
            tagIds.map((tagId) =>
              client.query(
                `INSERT INTO discussion_tag_relations (discussion_id, tag_id)
                 VALUES ($1, $2)`,
                [id, tagId]
              )
            )
          );
        }
      }

      // 返回更新后的讨论
      return await this.getDiscussion(id, userId);
    });
  }

  /**
   * 删除讨论
   */
  async deleteDiscussion(id: number, userId: number): Promise<void> {
    const discussion = await this.getDiscussion(id);

    // 检查权限
    if (
      discussion.author_id !== userId &&
      !['admin', 'moderator'].includes(discussion.author.role)
    ) {
      throw new ForbiddenError('没有权限删除此讨论');
    }

    await db.query('DELETE FROM discussions WHERE id = $1', [id]);
  }

  // ... 接下来实现回复、点赞、收藏等功能
}

export const discussionService = new DiscussionService();
export class DiscussionService {
  // ... 之前的方法 ...

  /**
   * 获取讨论回复
   */
  async getReplies(
    discussionId: number,
    userId?: number,
    parentId?: number,
    page = 1,
    pageSize = 20
  ) {
    const sql = `
      WITH RECURSIVE reply_tree AS (
        -- 获取根回复或指定父回复的子回复
        SELECT 
          r.*,
          u.username as author_username,
          u.avatar as author_avatar,
          ${userId ? `
            EXISTS(SELECT 1 FROM likes WHERE user_id = $3 AND target_type = 'reply' AND target_id = r.id) as is_liked
          ` : 'false as is_liked'},
          0 as level
        FROM discussion_replies r
        JOIN users u ON r.author_id = u.id
        WHERE r.discussion_id = $1
        AND r.parent_id ${parentId ? '= $2' : 'IS NULL'}
        
        UNION ALL
        
        -- 递归获取子回复
        SELECT 
          r.*,
          u.username as author_username,
          u.avatar as author_avatar,
          ${userId ? `
            EXISTS(SELECT 1 FROM likes WHERE user_id = $3 AND target_type = 'reply' AND target_id = r.id) as is_liked
          ` : 'false as is_liked'},
          rt.level + 1
        FROM discussion_replies r
        JOIN users u ON r.author_id = u.id
        JOIN reply_tree rt ON r.parent_id = rt.id
        WHERE r.discussion_id = $1
        AND rt.level < 3  -- 限制递归深度为3层
      )
      SELECT * FROM reply_tree
      ORDER BY created_at ASC
      LIMIT $${userId ? '4' : '3'} OFFSET $${userId ? '5' : '4'}
    `;

    const params = [
      discussionId,
      parentId,
      userId,
      pageSize,
      (page - 1) * pageSize,
    ].filter(Boolean);

    const result = await db.query<DiscussionReplyWithRelations>(sql, params);

    // 构建回复树
    const replyMap = new Map<number, DiscussionReplyWithRelations>();
    const rootReplies: DiscussionReplyWithRelations[] = [];

    result.rows.forEach(reply => {
      reply.children = [];
      reply.is_liked = !!reply.is_liked;
      replyMap.set(reply.id, reply);

      if (!reply.parent_id) {
        rootReplies.push(reply);
      } else {
        const parent = replyMap.get(reply.parent_id);
        if (parent) {
          parent.children?.push(reply);
        }
      }
    });

    return rootReplies;
  }

  /**
   * 创建回复
   */
  async createReply(
    discussionId: number,
    authorId: number,
    data: CreateReplyDTO
  ): Promise<DiscussionReplyWithRelations> {
    return await db.transaction(async (client) => {
      // 检查讨论是否存在且未锁定
      const discussion = await this.getDiscussion(discussionId);
      if (discussion.status === 'locked') {
        throw new BadRequestError('讨论已锁定，无法回复');
      }

      // 如果有父回复，检查其是否存在
      if (data.parent_id) {
        const parentReply = await client.query<DiscussionReply>(
          'SELECT * FROM discussion_replies WHERE id = $1 AND discussion_id = $2',
          [data.parent_id, discussionId]
        );
        if (parentReply.rows.length === 0) {
          throw new NotFoundError('父回复不存在');
        }
      }

      // 创建回复
      const result = await client.query<DiscussionReply>(
        `INSERT INTO discussion_replies (
          discussion_id, content, author_id, parent_id
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [discussionId, data.content, authorId, data.parent_id || null]
      );

      const reply = result.rows[0];

      // 更新讨论的回复计数和最后回复信息
      await client.query(
        `UPDATE discussions
         SET replies_count = replies_count + 1,
             last_reply_at = CURRENT_TIMESTAMP,
             last_reply_user_id = $1
         WHERE id = $2`,
        [authorId, discussionId]
      );

      // 返回完整的回复信息
      const replyResult = await client.query<DiscussionReplyWithRelations>(
        `SELECT 
          r.*,
          u.username as author_username,
          u.avatar as author_avatar,
          false as is_liked
         FROM discussion_replies r
         JOIN users u ON r.author_id = u.id
         WHERE r.id = $1`,
        [reply.id]
      );

      return replyResult.rows[0];
    });
  }

  /**
   * 更新回复
   */
  async updateReply(
    id: number,
    userId: number,
    data: UpdateReplyDTO
  ): Promise<DiscussionReplyWithRelations> {
    // 获取回复
    const reply = await db.query<DiscussionReply>(
      'SELECT * FROM discussion_replies WHERE id = $1',
      [id]
    );

    if (reply.rows.length === 0) {
      throw new NotFoundError('回复不存在');
    }

    // 检查权限
    if (reply.rows[0].author_id !== userId) {
      throw new ForbiddenError('没有权限修改此回复');
    }

    // 更新回复
    const result = await db.query<DiscussionReplyWithRelations>(
      `UPDATE discussion_replies
       SET content = $1,
           is_edited = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [data.content, id]
    );

    const updatedReply = result.rows[0];

    // 获取作者信息
    const authorResult = await db.query(
      `SELECT username as author_username, avatar as author_avatar
       FROM users WHERE id = $1`,
      [updatedReply.author_id]
    );

    return {
      ...updatedReply,
      author_username: authorResult.rows[0].author_username,
      author_avatar: authorResult.rows[0].author_avatar,
      is_liked: false,
    };
  }

  /**
   * 删除回复
   */
  async deleteReply(id: number, userId: number): Promise<void> {
    return await db.transaction(async (client) => {
      // 获取回复
      const reply = await client.query<DiscussionReply>(
        'SELECT * FROM discussion_replies WHERE id = $1',
        [id]
      );

      if (reply.rows.length === 0) {
        throw new NotFoundError('回复不存在');
      }

      // 检查权限
      if (reply.rows[0].author_id !== userId) {
        throw new ForbiddenError('没有权限删除此回复');
      }

      // 删除回复
      await client.query('DELETE FROM discussion_replies WHERE id = $1', [id]);

      // 更新讨论的回复计数
      await client.query(
        `UPDATE discussions
         SET replies_count = replies_count - 1
         WHERE id = $1`,
        [reply.rows[0].discussion_id]
      );
    });
  }

  /**
   * 标记最佳答案
   */
  async markSolution(
    discussionId: number,
    replyId: number,
    userId: number
  ): Promise<void> {
    // 获取讨论
    const discussion = await this.getDiscussion(discussionId);

    // 检查权限
    if (discussion.author_id !== userId) {
      throw new ForbiddenError('只有讨论作者可以标记最佳答案');
    }

    // 检查回复是否存在
    const reply = await db.query<DiscussionReply>(
      'SELECT * FROM discussion_replies WHERE id = $1 AND discussion_id = $2',
      [replyId, discussionId]
    );

    if (reply.rows.length === 0) {
      throw new NotFoundError('回复不存在');
    }

    // 更新最佳答案
    await db.query(
      'UPDATE discussions SET solution_id = $1 WHERE id = $2',
      [replyId, discussionId]
    );
  }

  /**
   * 点赞
   */
  async toggleLike(
    userId: number,
    targetType: 'discussion' | 'reply',
    targetId: number
  ): Promise<boolean> {
    return await db.transaction(async (client) => {
      // 检查目标是否存在
      const target = await client.query(
        targetType === 'discussion'
          ? 'SELECT id FROM discussions WHERE id = $1'
          : 'SELECT id FROM discussion_replies WHERE id = $1',
        [targetId]
      );

      if (target.rows.length === 0) {
        throw new NotFoundError('目标不存在');
      }

      // 检查是否已点赞
      const like = await client.query(
        `SELECT id FROM likes 
         WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
        [userId, targetType, targetId]
      );

      if (like.rows.length > 0) {
        // 取消点赞
        await client.query(
          'DELETE FROM likes WHERE id = $1',
          [like.rows[0].id]
        );

        // 更新点赞数
        await client.query(
          `UPDATE ${targetType}s 
           SET likes_count = likes_count - 1 
           WHERE id = $1`,
          [targetId]
        );

        return false;
      } else {
        // 添加点赞
        await client.query(
          `INSERT INTO likes (user_id, target_type, target_id)
           VALUES ($1, $2, $3)`,
          [userId, targetType, targetId]
        );

        // 更新点赞数
        await client.query(
          `UPDATE ${targetType}s 
           SET likes_count = likes_count + 1 
           WHERE id = $1`,
          [targetId]
        );

        return true;
      }
    });
  }

  /**
   * 收藏讨论
   */
  async toggleCollection(
    userId: number,
    discussionId: number
  ): Promise<boolean> {
    // 检查讨论是否存在
    const discussion = await this.getDiscussion(discussionId);

    // 检查是否已收藏
    const collection = await db.query(
      `SELECT id FROM collections 
       WHERE user_id = $1 AND discussion_id = $2`,
      [userId, discussionId]
    );

    if (collection.rows.length > 0) {
      // 取消收藏
      await db.query(
        'DELETE FROM collections WHERE id = $1',
        [collection.rows[0].id]
      );
      return false;
    } else {
      // 添加收藏
      await db.query(
        `INSERT INTO collections (user_id, discussion_id)
         VALUES ($1, $2)`,
        [userId, discussionId]
      );
      return true;
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft(
    authorId: number,
    data: CreateDraftDTO
  ): Promise<DiscussionDraft> {
    const result = await db.query<DiscussionDraft>(
      `INSERT INTO discussion_drafts (
        title, content, author_id, category_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [data.title || null, data.content, authorId, data.category_id || null]
    );

    return result.rows[0];
  }

  /**
   * 更新草稿
   */
  async updateDraft(
    id: number,
    authorId: number,
    data: UpdateDraftDTO
  ): Promise<DiscussionDraft> {
    // 检查草稿是否存在
    const draft = await db.query<DiscussionDraft>(
      'SELECT * FROM discussion_drafts WHERE id = $1',
      [id]
    );

    if (draft.rows.length === 0) {
      throw new NotFoundError('草稿不存在');
    }

    // 检查权限
    if (draft.rows[0].author_id !== authorId) {
      throw new ForbiddenError('没有权限修改此草稿');
    }

    // 更新草稿
    const result = await db.query<DiscussionDraft>(
      `UPDATE discussion_drafts
       SET title = $1,
           content = $2,
           category_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        data.title || draft.rows[0].title,
        data.content || draft.rows[0].content,
        data.category_id || draft.rows[0].category_id,
        id,
      ]
    );

    return result.rows[0];
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id: number, authorId: number): Promise<void> {
    // 检查草稿是否存在
    const draft = await db.query<DiscussionDraft>(
      'SELECT * FROM discussion_drafts WHERE id = $1',
      [id]
    );

    if (draft.rows.length === 0) {
      throw new NotFoundError('草稿不存在');
    }

    // 检查权限
    if (draft.rows[0].author_id !== authorId) {
      throw new ForbiddenError('没有权限删除此草稿');
    }

    // 删除草稿
    await db.query('DELETE FROM discussion_drafts WHERE id = $1', [id]);
  }

  /**
   * 获取草稿列表
   */
  async getDrafts(authorId: number, page = 1, pageSize = 20) {
    return await db.paginate<DiscussionDraft>(
      `SELECT * FROM discussion_drafts 
       WHERE author_id = $1 
       ORDER BY updated_at DESC`,
      [authorId],
      page,
      pageSize
    );
  }

  /**
   * 获取草稿详情
   */
  async getDraft(id: number, authorId: number): Promise<DiscussionDraft> {
    const result = await db.query<DiscussionDraft>(
      'SELECT * FROM discussion_drafts WHERE id = $1 AND author_id = $2',
      [id, authorId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('草稿不存在');
    }

    return result.rows[0];
  }
}

export const discussionService = new DiscussionService();