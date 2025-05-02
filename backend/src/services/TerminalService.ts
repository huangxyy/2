import { WebSocket } from 'ws';
import { Docker } from 'dockerode';
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { TerminalSessionConfig, TerminalState } from './TerminalSession';
import { challengeService } from './ChallengeService';
import logger from '../utils/logger';

export class TerminalService {
  private sessions: Map<string, {
    state: TerminalState;
    terminal: any;
    container: Docker.Container;
  }> = new Map();

  private docker = new Docker();
  private readonly DEFAULT_SHELL = '/bin/bash';
  private readonly INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30分钟无操作自动断开

  /**
   * 创建新的终端会话
   */
  async createSession(config: TerminalSessionConfig): Promise<string> {
    const sessionId = uuidv4();

    try {
      // 创建Docker容器
      const container = await this.docker.createContainer({
        Image: config.image,
        Cmd: [this.DEFAULT_SHELL],
        WorkingDir: config.workdir,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        HostConfig: {
          Memory: config.maxMemory * 1024 * 1024,
          NetworkMode: 'none',
          AutoRemove: true,
          SecurityOpt: ['no-new-privileges'],
          ReadonlyRootfs: true,
        },
      });

      await container.start();

      // 创建伪终端
      const terminal = pty.spawn(this.DEFAULT_SHELL, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: config.workdir,
        env: process.env,
      });

      // 初始化会话状态
      const state: TerminalState = {
        id: sessionId,
        status: 'connected',
        lastCommand: '',
        lastOutput: '',
        startTime: new Date(),
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, {
        state,
        terminal,
        container,
      });

      // 设置超时清理
      setTimeout(() => this.cleanupSession(sessionId), config.timeout);

      return sessionId;
    } catch (error) {
      logger.error('Failed to create terminal session:', error);
      throw error;
    }
  }

  /**
   * 处理WebSocket连接
   */
  handleConnection(ws: WebSocket, sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      ws.close(1008, 'Session not found');
      return;
    }

    // 更新活动时间
    session.state.lastActivity = new Date();

    // 终端输出转发到WebSocket
    session.terminal.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        session.state.lastOutput = data;
        ws.send(JSON.stringify({
          type: 'output',
          data: data
        }));
      }
    });

    // WebSocket输入转发到终端
    ws.on('message', (message: string) => {
      try {
        const { type, data } = JSON.parse(message);
        switch (type) {
          case 'input':
            session.state.lastCommand = data;
            session.state.lastActivity = new Date();
            session.terminal.write(data);
            break;

          case 'resize':
            session.terminal.resize(data.cols, data.rows);
            break;

          default:
            logger.warn('Unknown message type:', type);
        }
      } catch (error) {
        logger.error('Failed to handle terminal message:', error);
      }
    });

    // 处理连接关闭
    ws.on('close', () => {
      session.state.status = 'disconnected';
      this.checkInactivity(sessionId);
    });
  }

  /**
   * 执行命令并返回结果
   */
  async executeCommand(sessionId: string, command: string): Promise<{
    output: string;
    exitCode: number;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return new Promise((resolve, reject) => {
      let output = '';
      session.state.lastCommand = command;

      session.terminal.onData((data: string) => {
        output += data;
      });

      session.terminal.write(`${command}\n`);

      // 等待命令执行完成
      setTimeout(() => {
        resolve({
          output,
          exitCode: 0, // 简化处理，实际应该从容器中获取
        });
      }, 100);
    });
  }

  /**
   * 清理过期会话
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // 停止终端
      session.terminal.kill();

      // 停止并删除容器
      await session.container.stop();
      await session.container.remove();

      // 删除会话
      this.sessions.delete(sessionId);

      logger.info('Cleaned up terminal session:', { sessionId });
    } catch (error) {
      logger.error('Failed to cleanup terminal session:', error);
    }
  }

  /**
   * 检查会话活跃状态
   */
  private checkInactivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const inactiveTime = Date.now() - session.state.lastActivity.getTime();
    if (inactiveTime > this.INACTIVE_TIMEOUT) {
      this.cleanupSession(sessionId);
    }
  }

  /**
   * 获取会话状态
   */
  getSessionState(sessionId: string): TerminalState | null {
    const session = this.sessions.get(sessionId);
    return session ? session.state : null;
  }

  /**
   * 获取命令历史
   */
  getCommandHistory(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    // 从数据库或内存中获取命令历史
    // 这里简化处理，只返回最后一条命令
    return [session.state.lastCommand].filter(Boolean);
  }
}

export const terminalService = new TerminalService();