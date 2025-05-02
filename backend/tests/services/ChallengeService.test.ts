import { ChallengeService } from '../../src/services/ChallengeService';
import { Challenge } from '../../src/models/Challenge';
import { UserChallenge } from '../../src/models/UserChallenge';
import { DockerService } from '../../src/services/DockerService';
import { ChallengeError } from '../../src/utils/errors';

// Mock dependencies
jest.mock('../../src/models/Challenge');
jest.mock('../../src/models/UserChallenge');
jest.mock('../../src/services/DockerService');

describe('ChallengeService', () => {
  let challengeService: ChallengeService;

  beforeEach(() => {
    challengeService = new ChallengeService();
  });

  describe('listChallenges', () => {
    it('should return list of challenges with filters', async () => {
      const mockChallenges = [
        { id: 1, title: 'Challenge 1' },
        { id: 2, title: 'Challenge 2' },
      ];

      (Challenge.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: mockChallenges,
        count: 2,
      });

      const result = await challengeService.listChallenges({
        category: 1,
        difficulty: 2,
        page: 1,
        limit: 10,
      });

      expect(result.rows).toEqual(mockChallenges);
      expect(result.count).toBe(2);
    });
  });

  describe('startChallenge', () => {
    it('should start a challenge and create container', async () => {
      const mockChallenge = {
        id: 1,
        title: 'Test Challenge',
        docker_image: 'test-image',
      };

      const mockContainer = {
        id: 'container-123',
        connection_info: {
          host: 'localhost',
          port: 8080,
        },
      };

      (Challenge.findOne as jest.Mock).mockResolvedValue(mockChallenge);
      (DockerService.prototype.startContainer as jest.Mock).mockResolvedValue(
        mockContainer
      );

      const result = await challengeService.startChallenge(1, 1);

      expect(result).toMatchObject({
        ...mockChallenge,
        connection_info: mockContainer.connection_info,
      });
    });

    it('should throw error if challenge not found', async () => {
      (Challenge.findOne as jest.Mock).mockResolvedValue(null);

      await expect(challengeService.startChallenge(1, 999))
        .rejects
        .toThrow(ChallengeError);
    });
  });

  describe('submitFlag', () => {
    it('should verify flag and update progress', async () => {
      const mockChallenge = {
        id: 1,
        points: 100,
        flag_hash: 'test-hash',
      };

      const mockUserChallenge = {
        id: 1,
        attempts: 0,
        update: jest.fn(),
      };

      (Challenge.findOne as jest.Mock).mockResolvedValue(mockChallenge);
      (UserChallenge.findOne as jest.Mock).mockResolvedValue(mockUserChallenge);

      const result = await challengeService.submitFlag(1, 1, 'correct-flag');

      expect(result.correct).toBe(true);
      expect(mockUserChallenge.update).toHaveBeenCalled();
    });
  });
});