export interface TerminalSessionConfig {
  challengeId: number;
  userId: number;
  image: string;        // Docker镜像
  workdir: string;      // 工作目录
  timeout: number;      // 会话超时时间
  maxMemory: number;    // 最大内存限制
  networks: string[];   // 允许访问的网络
}

export interface TerminalState {
  id: string;
  status: 'connected' | 'disconnected' | 'busy' | 'error';
  lastCommand: string;
  lastOutput: string;
  startTime: Date;
  lastActivity: Date;
}