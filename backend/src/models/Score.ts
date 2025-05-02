export interface ScoreRule {
  baseScore: number;
  timeBonus: {
    threshold: number; // 时间阈值（秒）
    bonus: number;     // 时间加成分数
  };
  difficultyMultiplier: {
    easy: number;
    medium: number;
    hard: number;
  };
  firstBloodBonus: number;   // 首次完成奖励
  attemptPenalty: number;    // 每次尝试扣分
}

export interface UserScore {
  id: number;
  userId: number;
  challengeId: number;
  score: number;
  completionTime: number;    // 完成时间（秒）
  attempts: number;          // 尝试次数
  isFirstBlood: boolean;     // 是否首次完成
  createdAt: Date;
}

export interface UserProgress {
  userId: number;
  totalScore: number;
  completedChallenges: number;
  ranking: number;
  lastActive: Date;
}