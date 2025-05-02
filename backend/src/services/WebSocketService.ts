import WebSocket from 'ws';
import { Server } from 'http';
import { DockerService } from './DockerService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

export class WebSocketService {
  private wss: WebSocket.Server;
  private dockerService: DockerService;

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server, path: '/api/terminal' });
    this.dockerService = new DockerService();
    this.init();
  }

  private init() {
    this.wss.on('connection', async (ws: WebSocket, req: any) => {
      try {
        // Authenticate WebSocket connection
        const user = await authenticate(req);
        if (!user) {
          ws.close(1008, 'Unauthorized');
          return;
        }

        // Get challenge ID from URL
        const challengeId = this.getChallengeId(req.url);
        if (!challengeId) {
          ws.close(1008, 'Invalid challenge ID');
          return;
        }

        // Get container connection
        const container = await this.dockerService.getContainer(
          user.id,
          challengeId
        );

        if (!container) {
          ws.close(1008, 'Container not found');
          return;
        }

        // Create terminal session
        const stream = await container.attach({
          stream: true,
          stdin: true,
          stdout: true,
          stderr: true,
        });

        // Handle WebSocket messages
        ws.on('message', (data: Buffer) => {
          stream.write(data);
        });

        // Handle container output
        stream.on('data', (chunk: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        });

        // Clean up
        ws.on('close', () => {
          stream.end();
        });

        stream.on('end', () => {
          ws.close();
        });

      } catch (error) {
        logger.error('WebSocket connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  private getChallengeId(url: string): number | null {
    const match = url.match(/\/api\/terminal\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}