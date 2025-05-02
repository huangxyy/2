export interface Challenge {
  // ... 现有字段 ...
  flag?: string;
  scoreRules: {
    baseScore: number;
    timeBonus: number;
    difficultyMultiplier: number;
    firstBloodBonus: number;
  };
}