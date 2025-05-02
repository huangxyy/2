import Docker from 'dockerode';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class ContainerService {
  private docker: Docker;
  private readonly defaultTimeout = 10000; // 10 seconds

  constructor() {
    this.docker = new Docker({
      socketPath: '/var/run/docker.sock'
    });
  }

  /**
   * 创建并运行代码执行容器
   */
  async createContainer(params: {
    image: string;
    code: string;
    language: string;
    input: string;
    timeLimit: number;
    memoryLimit: number;
  }): Promise<{
    containerId: string;
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage: number;
  }> {
    const { image, code, language, input, timeLimit, memoryLimit } = params;
    const containerId = `code-exec-${uuidv4()}`;

    try {
      // 创建容器
      const container = await this.docker.createContainer({
        Image: image,
        name: containerId,
        Cmd: [language, code, input],
        HostConfig: {
          AutoRemove: true,
          Memory: memoryLimit * 1024 * 1024, // Convert MB to bytes
          MemorySwap: -1, // Disable swap
          CPUQuota: timeLimit * 1000, // Convert seconds to microseconds
          NetworkMode: 'none', // 禁用网络
          SecurityOpt: ['no-new-privileges'],
          ReadonlyRootfs: true,
        },
      });

      // 启动容器
      await container.start();

      // 等待容器执行完成
      const startTime = Date.now();
      const stats = await container.stats({ stream: false });
      const execTime = (Date.now() - startTime) / 1000;

      // 获取输出
      const logs = await container.logs({
        stdout: true,
        stderr: true,
      });

      // 解析输出
      const output = logs.toString('utf8');
      const error = output.includes('Error:') ? output : undefined;

      return {
        containerId,
        output,
        error,
        executionTime: execTime,
        memoryUsage: stats.memory_stats.usage / (1024 * 1024), // Convert to MB
      };
    } catch (error) {
      logger.error('Container execution failed:', {
        containerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 停止并删除容器
   */
  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await container.remove();
    } catch (error) {
      logger.error('Container removal failed:', {
        containerId,
        error: error.message,
      });
    }
  }

  /**
   * 获取容器状态
   */
  async getContainerStatus(containerId: string): Promise<{
    running: boolean;
    exitCode?: number;
    error?: string;
  }> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return {
        running: info.State.Running,
        exitCode: info.State.ExitCode,
        error: info.State.Error,
      };
    } catch (error) {
      logger.error('Get container status failed:', {
        containerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 清理僵尸容器
   */
  async cleanupStuckContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: ['code-exec-'],
        },
      });

      const stuckContainers = containers.filter(
        (c) => Date.now() - new Date(c.Created * 1000).getTime() > this.defaultTimeout
      );

      await Promise.all(
        stuckContainers.map((c) => this.removeContainer(c.Id))
      );

      if (stuckContainers.length > 0) {
        logger.info('Cleaned up stuck containers:', {
          count: stuckContainers.length,
        });
      }
    } catch (error) {
      logger.error('Container cleanup failed:', error);
    }
  }
}

export const containerService = new ContainerService();