import { DockerService } from '../../src/services/DockerService';
import { DockerError } from '../../src/utils/errors';
import Docker from 'dockerode';
import { redis } from '../../src/config/database';

// Mock dependencies
jest.mock('dockerode');
jest.mock('../../src/config/database', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('DockerService', () => {
  let dockerService: DockerService;

  beforeEach(() => {
    dockerService = new DockerService();
  });

  describe('startContainer', () => {
    it('should create and start a container successfully', async () => {
      const mockContainer = {
        id: 'container-123',
        start: jest.fn().mockResolvedValue(undefined),
        inspect: jest.fn().mockResolvedValue({
          Id: 'container-123',
          NetworkSettings: {
            Ports: {
              '80/tcp': [{ HostPort: '8080' }],
            },
          },
        }),
      };

      (Docker.prototype.createContainer as jest.Mock).mockResolvedValue(
        mockContainer
      );

      const result = await dockerService.startContainer(
        'test-image',
        1,
        1
      );

      expect(result.id).toBe('container-123');
      expect(result.connection_info).toBeDefined();
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should throw error if container creation fails', async () => {
      (Docker.prototype.createContainer as jest.Mock).mockRejectedValue(
        new Error('Creation failed')
      );

      await expect(dockerService.startContainer('test-image', 1, 1))
        .rejects
        .toThrow(DockerError);
    });
  });

  describe('stopContainer', () => {
    it('should stop and remove container successfully', async () => {
      const mockContainer = {
        stop: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (redis.get as jest.Mock).mockResolvedValue('container-123');
      (Docker.prototype.getContainer as jest.Mock).mockReturnValue(mockContainer);

      await dockerService.stopContainer(1, 1);

      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });
  });
});