import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Achievement extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public icon!: string;
  public category!: string;
  public points!: number;
  public requirements!: object;
  public isHidden!: boolean;
}

Achievement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    requirements: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'achievements',
  }
);