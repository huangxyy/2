import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class ChallengeCategory extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
  public parent_id?: number;
  public created_at!: Date;
}

ChallengeCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      references: {
        model: ChallengeCategory,
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'challenge_categories',
    timestamps: false,
  }
);