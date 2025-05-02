import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';
import { Achievement } from './Achievement';

export class UserAchievement extends Model {
  public userId!: number;
  public achievementId!: number;
  public unlockedAt!: Date;
  public progress!: number;
}

UserAchievement.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    achievementId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Achievement,
        key: 'id',
      },
    },
    unlockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    progress: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'user_achievements',
  }
);