import { WebSocketService } from '../../src/services/WebSocketService';
import { Server } from 'http';
import WebSocket from 'ws';
import { DockerService } from '../../src/services/DockerService';

// Mock dependencies
jest.mock('ws');
jest.mock('../../src/services/DockerService');
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn(),
}));

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockServer: Server;

  beforeEach(() => {
    mockServer = new Server();
    webSocketService = new WebSocketService(mockServer);
  });

  describe('connection handling', () => {
    it('should handle new connections correctly', () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
      };

      const mockReq = {
        url: '/api/terminal/1',
      };

      (WebSocket.Server as jest.Mock).mock.calls[0][0].connection(
        mockWs,
        mockReq
      );

      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should close connection if authentication fails', () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
      };

      const mockReq = {
        url: '/api/terminal/1',
      };

      require('../../src/middleware/auth').authenticate.mockResolvedValue(null);

      (WebSocket.Server as jest.Mock).mock.calls[0][0].connection(
        mockWs,
        mockReq
      );

      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Unauthorized');
    });
  });
});