export interface TerminalSession {
  id: string;
  userId: number;
  challengeId: number;
  containerId: string;
  status: SessionStatus;
  config: {
    cols: number;
    rows: number;
    shell: string;
  };
  metadata: {
    startTime: Date;
    lastActivity: Date;
    commandCount: number;
    bytesTransferred: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export enum SessionStatus {
  CREATING = 'creating',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  TERMINATED = 'terminated'
}