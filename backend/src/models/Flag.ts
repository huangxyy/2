import { Challenge } from './Challenge';

export interface Flag {
  id: number;
  challengeId: number;
  flag: string;              // 加密后的flag
  type: FlagType;           // flag类型
  points: number;           // 该flag的分值
  order: number;           // 多个flag的顺序
  hint?: string;           // flag提示
  createdAt: Date;
}

export enum FlagType {
  STATIC = 'static',        // 静态flag
  DYNAMIC = 'dynamic',      // 动态flag（每个用户不同）
  REGEX = 'regex'          // 正则匹配flag
}

export interface FlagSubmission {
  id: number;
  userId: number;
  challengeId: number;
  flagId: number;
  submitted: string;        // 用户提交的flag
  correct: boolean;         // 是否正确
  attemptCount: number;     // 尝试次数
  createdAt: Date;
}