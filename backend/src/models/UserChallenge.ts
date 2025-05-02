import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';
import { Challenge } from './Challenge';

export class UserChallenge extends Model {
  public id!: number;
  public user_id!: number;
  public challenge_id!: number;
  public status!: string;
  public start_time!: Date;
  public completion_time?: Date;
  public attempts!: number;
  public points_earned!: number;
}

UserChallenge.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    challenge_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Challenge,
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'in_progress',
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completion_time: {
      type: DataTypes.DATE,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'user_challenges',
    timestamps: false,
  }
);