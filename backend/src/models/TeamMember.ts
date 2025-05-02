import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum MemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export class TeamMember extends Model {
  public id!: number;
  public teamId!: number;
  public userId!: number;
  public role!: TeamRole;
  public status!: MemberStatus;
  public joinedAt?: Date;
  public invitedBy?: number;
  public permissions!: string[];
}

TeamMember.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(TeamRole)),
      allowNull: false,
      defaultValue: TeamRole.MEMBER,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(MemberStatus)),
      allowNull: false,
      defaultValue: MemberStatus.PENDING,
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'team_members',
    indexes: [
      {
        fields: ['teamId', 'userId'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['role'],
      },
    ],
  }
);