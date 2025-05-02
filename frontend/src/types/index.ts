export interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  solved: boolean;
  createdAt: string;
}

export interface TerminalSession {
  id: string;
  status: 'creating' | 'active' | 'paused' | 'disconnected' | 'error' | 'terminated';
  config: {
    cols: number;
    rows: number;
  };
  metadata: {
    startTime: string;
    lastActivity: string;
    commandCount: number;
  };
}

export interface User {
  id: number;
  username: string;
  avatar: string;
  score: number;
  rank: number;
  solvedChallenges: number;
}