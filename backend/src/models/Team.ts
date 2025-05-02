import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum TeamStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export class Team extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
  public avatar?: string;
  public status!: TeamStatus;
  public maxMembers!: number;
  public visibility!: 'public' | 'private' | 'invite_only';
  public settings!: any;
  public createdBy!: number;
  public updatedBy!: number;
}

Team.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TeamStatus)),
      allowNull: false,
      defaultValue: TeamStatus.ACTIVE,
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 2,
        max: 1000,
      },
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private', 'invite_only'),
      allowNull: false,
      defaultValue: 'private',
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'teams',
    indexes: [
      {
        fields: ['name'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['visibility'],
      },
      {
        fields: ['createdBy'],
      },
    ],
  }
);