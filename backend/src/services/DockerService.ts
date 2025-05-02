import Docker from 'dockerode';
import { redis } from '../config/database';
import { DockerError } from '../utils/errors';
import { config } from '../config/config';

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({
      socketPath: '/var/run/docker.sock',
    });
  }

  async startContainer(image: string, userId: number, challengeId: number) {
    try {
      // Check existing container
      const existingContainer = await this.getContainer(userId, challengeId);
      if (existingContainer) {
        return existingContainer;
      }

      // Create container
      const container = await this.docker.createContainer({
        Image: image,
        name: `challenge_${challengeId}_user_${userId}`,
        Hostname: `challenge-${challengeId}`,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        Env: [
          `CHALLENGE_ID=${challengeId}`,
          `USER_ID=${userId}`,
        ],
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB
          MemorySwap: 1024 * 1024 * 1024, // 1GB
          NanoCPUs: 1000000000, // 1 CPU
          NetworkMode: config.docker.challengeNetwork,
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          AutoRemove: true,
        },
      });

      await container.start();

      // Store container info
      const containerInfo = await container.inspect();
      await this.saveContainerInfo(userId, challengeId, containerInfo.Id);

      return {
        id: containerInfo.Id,
        connection_info: this.parseConnectionInfo(containerInfo),
      };
    } catch (error) {
      throw new DockerError('Failed to start container');
    }
  }

  async stopContainer(userId: number, challengeId: number) {
    try {
      const container = await this.getContainer(userId, challengeId);
      if (container) {
        await container.stop();
        await container.remove();
        await this.removeContainerInfo(userId, challengeId);
      }
    } catch (error) {
      throw new DockerError('Failed to stop container');
    }
  }

  private async getContainer(userId: number, challengeId: number) {
    const containerId = await redis.get(
      this.getContainerKey(userId, challengeId)
    );
    
    if (!containerId) return null;

    try {
      const container = this.docker.getContainer(containerId);
      await container.inspect();
      return container;
    } catch (error) {
      await this.removeContainerInfo(userId, challengeId);
      return null;
    }
  }

  private getContainerKey(userId: number, challengeId: number) {
    return `container:${userId}:${challengeId}`;
  }

  private async saveContainerInfo(
    userId: number,
    challengeId: number,
    containerId: string
  ) {
    const key = this.getContainerKey(userId, challengeId);
    await redis.set(key, containerId, 'EX', 3600); // 1 hour expiry
  }

  private async removeContainerInfo(userId: number, challengeId: number) {
    const key = this.getContainerKey(userId, challengeId);
    await redis.del(key);
  }

  private parseConnectionInfo(containerInfo: any) {
    const ports = containerInfo.NetworkSettings.Ports;
    const connectionInfo: any = {
      host: process.env.DOCKER_HOST || 'localhost',
    };

    for (const [containerPort, hostBindings] of Object.entries(ports)) {
      if (hostBindings && hostBindings.length > 0) {
        const [hostBinding] = hostBindings;
        connectionInfo[containerPort.split('/')[0]] = hostBinding.HostPort;
      }
    }

    return connectionInfo;
  }
}