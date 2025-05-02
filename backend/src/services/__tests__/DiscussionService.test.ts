import { discussionService } from '../DiscussionService';
import { db } from '../../utils/database';
import { CreateDiscussionDTO } from '../../models/Discussion';

describe('DiscussionService', () => {
  let testUser: any;

  beforeEach(async () => {
    // 创建测试用户
    const result = await db.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['testuser', 'test@example.com', 'password', 'user']
    );
    testUser = result.rows[0];
  });

  describe('createDiscussion', () => {
    it('should create a discussion successfully', async () => {
      const data: CreateDiscussionDTO = {
        title: 'Test Discussion',
        content: 'This is a test discussion content.',
        tags: ['test', 'example'],
      };

      const discussion = await discussionService.createDiscussion(
        testUser.id,
        data
      );

      expect(discussion).toBeDefined();
      expect(discussion.title).toBe(data.title);
      expect(discussion.content).toBe(data.content);
      expect(discussion.author_id).toBe(testUser.id);
      expect(discussion.tags).toEqual(expect.arrayContaining(data.tags));
    });

    it('should throw error if title is empty', async () => {
      const data: CreateDiscussionDTO = {
        title: '',
        content: 'Test content',
        tags: [],
      };

      await expect(
        discussionService.createDiscussion(testUser.id, data)
      ).rejects.toThrow();
    });
  });

  // ... 更多测试用例
});